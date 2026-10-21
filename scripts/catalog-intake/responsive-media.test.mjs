import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,symlink,mkdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {installedImageEngine,prepareResponsiveMedia} from './responsive-media.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sharp=installedImageEngine();
async function inputFor(root,bytes){
 const path=join(root,'TEST-ONLY-editorial-original.png');await writeFile(path,bytes);
 const candidate_id='a'.repeat(64),revision_hash='b'.repeat(64),source_url='https://example.test/editorial/TEST-ONLY.png',checksum=sha(bytes);
 return {purpose:'test-editorial',output_directory:join(root,'private-output'),source:{id:'TEST-ONLY-editorial',origin:'https://example.test',publication_allowed:true,media_permission_reference:'TEST-ONLY-no-product-publication',media_origins:['https://example.test']},candidate:{candidate_id,revision_hash,source_id:'TEST-ONLY-editorial',source_url:'https://example.test/editorial',image_urls:[source_url]},asset:{path,source_url,sha256:checksum},grant:{media_permission_reference:'TEST-ONLY-no-product-publication',source_id:'TEST-ONLY-editorial',candidate_id,revision_hash,asset_source_url:source_url,asset_sha256:checksum,website_publication:true,resize:true,webp_encode:true}};
}
test('private derivative files have actual geometry/digests, preserve the original and never upscale',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const bytes=await sharp({create:{width:1100,height:825,channels:4,background:{r:180,g:160,b:120,alpha:.7}}}).png().toBuffer();
  const input=await inputFor(root,bytes);const prepared=await prepareResponsiveMedia(input);const m=prepared.manifest;
  assert.equal(m.purpose,'test-editorial');assert.equal(m.publication_state,'private-prepared');assert.equal(m.image_verification_state,'pending');assert.equal(m.performance_review_required,false);
  assert.deepEqual(m.variants.map(v=>v.width),[320,640,960]);assert.equal(m.detail.width,1100);assert.equal(m.detail.height,825);
  for(const record of [...m.variants,m.detail]){
   const file=await readFile(join(input.output_directory,record.path));const actual=await sharp(file).metadata();
   assert.equal(file.length,record.bytes);assert.equal(sha(file),record.sha256);assert.equal(actual.width,record.width);assert.equal(actual.height,record.height);assert.equal(actual.format,'webp');assert.equal(actual.exif,undefined);assert.equal(record.over_budget,false);assert.ok(record.path.includes(record.sha256));
  }
  assert.equal(sha(await readFile(input.asset.path)),sha(bytes));assert.deepEqual((await prepareResponsiveMedia(input)).manifest,m);
  const small=await inputFor(root,await sharp({create:{width:500,height:300,channels:3,background:'#abc'}}).png().toBuffer());
  const smallM=(await prepareResponsiveMedia(small)).manifest;assert.deepEqual(smallM.variants.map(v=>v.width),[320]);assert.equal(smallM.detail.width,500);assert.equal(smallM.detail.height,300);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('missing or mismatched exact grants, source/candidate revisions and original bytes are rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const input=await inputFor(root,await sharp({create:{width:64,height:64,channels:3,background:'#fff'}}).png().toBuffer());
  const cases=[{...input,grant:undefined},{...input,source:{...input.source,publication_allowed:false}},{...input,grant:{...input.grant,resize:false}},{...input,grant:{...input.grant,revision_hash:'c'.repeat(64)}},{...input,grant:{...input.grant,asset_sha256:'c'.repeat(64)}},{...input,candidate:{...input.candidate,source_id:'wrong-source'}},{...input,candidate:{...input.candidate,image_urls:[]}},{...input,asset:{...input.asset,sha256:'c'.repeat(64)},grant:{...input.grant,asset_sha256:'c'.repeat(64)}}];
  for(const bad of cases)await assert.rejects(prepareResponsiveMedia(bad),/grant|asset|candidate|checksum/i);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('lossless noisy editorial derivatives report actual over-budget review flags',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const raw=Buffer.alloc(1024*768*3);let state=12345;for(let n=0;n<raw.length;n++){state=(Math.imul(state,1664525)+1013904223)>>>0;raw[n]=state>>>24;}
  const bytes=await sharp(raw,{raw:{width:1024,height:768,channels:3}}).png().toBuffer();
  const input=await inputFor(root,bytes);const m=(await prepareResponsiveMedia(input)).manifest;
  assert.equal(m.performance_review_required,true);assert.equal(m.detail.budget_limit_bytes,600*1024);assert.equal(m.detail.over_budget,true);
  assert.ok(m.variants.some(v=>v.over_budget&&v.budget_limit_bytes===150*1024));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('public geometry limits reject unsuitable images and sub-320 originals produce detail only',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const tiny=await inputFor(root,await sharp({create:{width:240,height:180,channels:3,background:'#def'}}).png().toBuffer());
  const m=(await prepareResponsiveMedia(tiny)).manifest;
  assert.deepEqual(m.variants,[]);assert.equal(m.detail.width,240);assert.equal(m.detail.height,180);
  const promotionVariants=[...m.variants,m.detail];assert.equal(promotionVariants.length,1);assert.ok(promotionVariants[0].width<=960);assert.equal(m.purpose,'test-editorial');
  const tall=await inputFor(root,await sharp({create:{width:64,height:9000,channels:3,background:'#fff'}}).png().toBuffer());
  await assert.rejects(prepareResponsiveMedia(tall),/geometry exceeds public manifest limits/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('orientation 6 phone JPEG is decoded upright with independently expected corner colors and original preserved',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  // Raw image: red/green top row, blue/yellow bottom row. EXIF 6 means 90 degrees clockwise.
  const width=400,height=200,raw=Buffer.alloc(width*height*3);
  const red=[230,20,20],green=[20,210,20],blue=[20,20,230],yellow=[230,210,20];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const color=y<height/2?(x<width/2?red:green):(x<width/2?blue:yellow);
   raw.set(color,(y*width+x)*3);
  }
  const bytes=await sharp(raw,{raw:{width,height,channels:3}}).withMetadata({orientation:6}).jpeg({quality:100,chromaSubsampling:'4:4:4'}).toBuffer();
  const input=await inputFor(root,bytes);const m=(await prepareResponsiveMedia(input)).manifest;
  assert.equal(m.original.orientation,6);assert.equal(m.original.width,400);assert.equal(m.original.height,200);
  assert.equal(m.original.visual_width,200);assert.equal(m.original.visual_height,400);assert.equal(m.processing.orientation_applied,6);assert.equal(m.processing.orientation_normalized,true);
  assert.equal(m.detail.width,200);assert.equal(m.detail.height,400);assert.deepEqual(m.variants,[]);
  const derivative=await readFile(join(input.output_directory,m.detail.path));const decoded=await sharp(derivative).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const samples=[[20,20,blue],[180,20,red],[20,380,yellow],[180,380,green]];
  for(const [x,y,expected]of samples){
   const offset=(y*decoded.info.width+x)*decoded.info.channels;
   for(let channel=0;channel<3;channel++)assert.ok(Math.abs(decoded.data[offset+channel]-expected[channel])<=8,`upright corner (${x},${y}) color channel ${channel}`);
  }
  assert.equal((await sharp(derivative).metadata()).orientation,undefined);
  assert.equal(sha(await readFile(input.asset.path)),sha(bytes));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('private output rejects repository, served roots and symlink ancestry before creating missing children',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const input=await inputFor(root,await sharp({create:{width:64,height:64,channels:3,background:'#abc'}}).png().toBuffer());
  const repository=fileURLToPath(new URL('../..',import.meta.url));
  const forbidden=join(repository,'apps/storefront/public',`TEST-ONLY-MUST-NOT-EXIST-${process.pid}`);
  await assert.rejects(prepareResponsiveMedia({...input,output_directory:forbidden}),/outside the repository/);
  await assert.rejects(access(forbidden),{code:'ENOENT'});
  await assert.rejects(prepareResponsiveMedia({...input,output_directory:join(repository,'private-output',`TEST-ONLY-${process.pid}`)}),/outside the repository/);
  await assert.rejects(prepareResponsiveMedia({...input,output_directory:'/var/www/TEST-ONLY-MUST-NOT-EXIST'}),/known served web roots/);
  const alias=join(root,'served-link');await symlink(join(repository,'apps/storefront/public'),alias,'dir');
  await assert.rejects(prepareResponsiveMedia({...input,output_directory:join(alias,`TEST-ONLY-MUST-NOT-EXIST-${process.pid}`,'new-child')}),/outside the repository/);
  await assert.rejects(access(forbidden),{code:'ENOENT'});
  const broken=join(root,'dangling-link');await symlink(join(root,'not-present'),broken,'dir');
  await assert.rejects(prepareResponsiveMedia({...input,output_directory:join(broken,'new-child')}),/Unsafe output symlink ancestry/);
  await mkdir(input.output_directory);await symlink(join(repository,'apps/storefront/public'),join(input.output_directory,'v1'),'dir');
  await assert.rejects(prepareResponsiveMedia(input),/outside the repository|Unsafe output/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('an existing derivative symlink is rejected without changing original bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jwl-responsive-TEST-ONLY-'));
 try{
  const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#def'}}).png().toBuffer();
  const input=await inputFor(root,bytes);const first=await prepareResponsiveMedia(input);
  const derivative=join(input.output_directory,first.manifest.detail.path);await rm(derivative);await symlink(input.asset.path,derivative);
  await assert.rejects(prepareResponsiveMedia(input),/Existing immutable output differs/);
  assert.equal(sha(await readFile(input.asset.path)),sha(bytes));
 }finally{await rm(root,{recursive:true,force:true});}
});
