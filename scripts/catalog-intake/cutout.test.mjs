import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine,prepareResponsiveMedia} from './responsive-media.mjs';
import {validateCutoutMaster,iccDescription,frameBackground,cutoutReviewChecks,cutoutLimits} from './cutout.mjs';
import {cutoutBasisProblem,creditChanges,approvalBundle} from './media-pipeline.mjs';

// Synthetic fixtures only: a drawn ellipse on a drawn backdrop, made in memory. No product photograph is read, masked or
// edited, and nothing leaves the process.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const W=600,H=450;
const distance=(x,y,cx=300,cy=225,rx=150,ry=120)=>Math.hypot((x-cx)/rx,(y-cy)/ry);
// Opaque inside 0.98, a soft edge to 1.0 (about three pixels), transparent outside.
const ellipseAlpha=(x,y,d=distance(x,y))=>d<0.98?255:d>=1?0:Math.round((1-d)/0.02*255);
function sceneRaw({inside=(x,y)=>distance(x,y)<1.02}={}){
  const raw=Buffer.alloc(W*H*3);let state=7;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const o=(y*W+x)*3;
    if(inside(x,y)){state=(Math.imul(state,1103515245)+12345)>>>0;const n=(state>>>24)&31;raw[o]=60+n+((x>>3)&1)*40;raw[o+1]=50+n;raw[o+2]=40+((y>>2)&1)*30;}
    else{raw[o]=225-(y>>4);raw[o+1]=222-(x>>5);raw[o+2]=215;}
  }
  return raw;
}
async function fixture({profile,inside,alphaAt=ellipseAlpha,rgb=(value)=>value,encode=image=>image.png()}={}){
  const root=await mkdtemp(join(tmpdir(),'jwl-cutout-TEST-ONLY-'));
  let original=sharp(sceneRaw({inside}),{raw:{width:W,height:H,channels:3}});
  if(profile)original=original.withIccProfile(profile);
  const originalBytes=await original.png().toBuffer();
  // The master copies the original's stored values, as a background-only removal must; only its alpha is new.
  const {data}=await sharp(originalBytes,{ignoreIcc:true}).raw().toBuffer({resolveWithObject:true});
  const rgba=Buffer.alloc(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=y*W+x,a=alphaAt(x,y);
    for(let k=0;k<3;k++)rgba[p*4+k]=a===255?rgb(data[p*3+k],x,y):data[p*3+k];
    rgba[p*4+3]=a;
  }
  const cutoutBytes=await encode(sharp(rgba,{raw:{width:W,height:H,channels:4}})).toBuffer();
  const originalPath=join(root,'TEST-ONLY-original.png'),cutoutPath=join(root,'TEST-ONLY-cutout.png');
  await writeFile(originalPath,originalBytes);await writeFile(cutoutPath,cutoutBytes);
  return {root,original:{path:originalPath,sha256:sha(originalBytes)},cutout:{path:cutoutPath,sha256:sha(cutoutBytes),producer:'TEST-ONLY synthetic mask'},originalBytes};
}
const check=async(options)=>{const f=await fixture(options);try{return await validateCutoutMaster(f,sharp);}finally{await rm(f.root,{recursive:true,force:true});}};

test('a background-only cutout passes: same geometry, real transparency, opaque pixels unchanged; never called identical to the original',async()=>{
  const f=await fixture();
  try{
    const r=await validateCutoutMaster(f,sharp);
    assert.equal(r.passed,true,r.failures.join());assert.deepEqual(r.failures,[]);assert.deepEqual(r.review_flags,[]);
    assert.deepEqual([r.product_pixels.changed_opaque_pixels,r.product_pixels.opaque_max_channel_delta,r.product_pixels.opaque_identical_to_original],[0,0,true]);
    assert.equal(r.identical_to_original,false,'the alpha channel always differs from the original');
    assert.ok(r.alpha.transparent_fraction>0.4&&r.alpha.opaque_fraction>0.15&&r.alpha.partial_fraction>0);
    assert.deepEqual([r.framing.border_visible_pixels,r.components.significant],[0,1]);
    assert.ok(r.edge_pixels.partial_alpha_pixels>0,'the soft edge is measured');
    assert.deepEqual(r.visual_review_required,[...cutoutReviewChecks]);
    assert.match(r.statement,/differs from the original by design/);assert.match(r.statement,/not an approval/);
    assert.equal(sha(await readFile(f.original.path)),f.original.sha256,'the original is untouched');
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('rounding is accepted and reported as not identical; a larger change to the product is refused',async()=>{
  const rounded=await check({rgb:value=>Math.min(255,value+1)});
  assert.equal(rounded.passed,true);assert.equal(rounded.product_pixels.opaque_identical_to_original,false);assert.equal(rounded.product_pixels.opaque_max_channel_delta,1);
  assert.match(rounded.statement,/not identical/);
  // A redrawn patch on the product (as a generative editor does to a dial) is refused even though the background is gone.
  const redrawn=await check({rgb:(value,x,y)=>x>280&&x<320&&y>200&&y<250?Math.min(255,value+cutoutLimits.rgb_tolerance+10):value});
  assert.equal(redrawn.passed,false);assert.ok(redrawn.failures.includes('product_pixels_changed'));assert.match(redrawn.statement,/cannot be used/);
});

test('a solid image, a missing alpha channel, a resized or cropped master and a product at the edge are refused',async()=>{
  const refused=async(options,failure)=>{const r=await check(options);assert.equal(r.passed,false,failure);assert.ok(r.failures.includes(failure),`${failure}: ${r.failures}`);};
  await refused({alphaAt:()=>255},'no_transparent_background');
  await refused({alphaAt:()=>0},'no_opaque_product');
  // Without its alpha the master would be the original's own bytes (refused below as no separate file), so encode it differently.
  await refused({encode:image=>image.removeAlpha().png({compressionLevel:1})},'cutout_not_8bit_rgba_png');
  await refused({encode:image=>image.jpeg()},'cutout_not_8bit_rgba_png');
  // An enlarged re-render (the rejected editor trial was 1.5x its original) and a crop both change the geometry.
  await refused({encode:image=>image.resize({width:Math.round(W*1.5)}).png()},'geometry_changed');
  await refused({encode:image=>image.extract({left:0,top:0,width:W-10,height:H}).png()},'geometry_changed');
  await refused({inside:()=>true,alphaAt:(x,y)=>x<200&&y>100&&y<300?255:ellipseAlpha(x,y)},'product_touches_canvas_edge');
  const f=await fixture();
  try{
    await assert.rejects(validateCutoutMaster({original:f.original,cutout:{...f.cutout,sha256:'c'.repeat(64)}},sharp),/differs from its recorded sha256/);
    await assert.rejects(validateCutoutMaster({original:f.original,cutout:f.original},sharp),/separate file/);
    await assert.rejects(validateCutoutMaster({original:f.original,cutout:{...f.cutout,path:'relative.png'}},sharp),/absolute path/);
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('colour profiles: a dropped sRGB profile is flagged, any other profile change is refused',async()=>{
  const srgb=await check({profile:'srgb'});
  assert.match(iccDescription((await sharp(await sharp({create:{width:2,height:2,channels:3,background:'#888'}}).withIccProfile('srgb').png().toBuffer()).metadata()).icc)??'',/srgb/i);
  assert.equal(srgb.passed,true,srgb.failures.join());assert.deepEqual(srgb.review_flags,['srgb_profile_not_carried']);
  const p3=await check({profile:'p3'});
  assert.equal(p3.passed,false);assert.ok(p3.failures.includes('colour_profile_changed'));
});

test('two separate visible pieces are flagged for the visual comparison, not refused',async()=>{
  const pair=(x,y)=>Math.min(distance(x,y,170,225,90,90),distance(x,y,430,225,90,90));
  const r=await check({inside:(x,y)=>pair(x,y)<1.02,alphaAt:(x,y)=>ellipseAlpha(x,y,pair(x,y))});
  assert.equal(r.passed,true,r.failures.join());assert.equal(r.components.significant,2);assert.deepEqual(r.review_flags,['multiple_visible_components']);
});

function derivativeInput(root,f){
  const candidate_id='a'.repeat(64),revision_hash='b'.repeat(64),source_url='https://example.test/editorial/TEST-ONLY.png';
  return {purpose:'test-editorial',output_directory:join(root,'private-output'),
    source:{id:'TEST-ONLY-editorial',origin:'https://example.test',publication_allowed:true,media_permission_reference:'TEST-ONLY-no-product-publication',media_origins:['https://example.test']},
    candidate:{candidate_id,revision_hash,source_id:'TEST-ONLY-editorial',source_url:'https://example.test/editorial',image_urls:[source_url]},
    asset:{path:f.original.path,source_url,sha256:f.original.sha256},
    grant:{media_permission_reference:'TEST-ONLY-no-product-publication',source_id:'TEST-ONLY-editorial',candidate_id,revision_hash,asset_source_url:source_url,asset_sha256:f.original.sha256,website_publication:true,resize:true,webp_encode:true}};
}

test('derivatives of a checked cutout keep alpha losslessly, record both files and never share the original\'s directory',async()=>{
  const f=await fixture();
  try{
    const input=derivativeInput(f.root,f);
    const plain=(await prepareResponsiveMedia(input)).manifest;
    const treated={...input,treatment:{kind:'background_removal',cutout:f.cutout},grant:{...input.grant,background_removal:true}};
    const m=(await prepareResponsiveMedia(treated)).manifest;
    assert.equal(m.schema_version,4);assert.equal(plain.schema_version,3);assert.equal(plain.treatment,undefined);
    assert.deepEqual(m.binding.treatment,{kind:'background_removal',version:1,cutout_sha256:f.cutout.sha256});
    assert.equal(m.original.sha256,f.original.sha256,'the original stays identified by its own checksum');
    assert.deepEqual([m.pixel_source,m.cutout_master.sha256,m.cutout_master.check.passed,m.processing.background_removed,m.processing.metric_background],['cutout_master',f.cutout.sha256,true,true,frameBackground]);
    assert.deepEqual([m.processing.orientation_applied,m.processing.orientation_normalized,m.original.orientation],[1,false,1]);
    assert.deepEqual(m.cutout_review_required,[...cutoutReviewChecks]);assert.equal(m.visual_comparison_required,true);assert.equal(m.performance_review_required,false);
    const directory=record=>record.path.split('/').slice(0,2).join('/');
    for(const record of [...m.variants,m.detail]){
      const file=await readFile(join(input.output_directory,record.path)),meta=await sharp(file).metadata();
      assert.deepEqual([meta.format,meta.hasAlpha,record.alpha_max_delta,record.over_budget,record.fidelity_floor_met],['webp',true,0,false,true]);
      assert.equal(sha(file),record.sha256);assert.notEqual(directory(record),directory(plain.detail),'a cutout never shares the original\'s derivative directory');
    }
    for(const record of [...plain.variants,plain.detail])assert.equal(record.alpha_max_delta,undefined,'an opaque original records no alpha check');
    assert.deepEqual((await prepareResponsiveMedia(treated)).manifest,m,'deterministic');
    assert.equal(sha(await readFile(f.original.path)),f.original.sha256);
    await assert.rejects(prepareResponsiveMedia({...treated,grant:input.grant}),/not covered by the grant/);
    await assert.rejects(prepareResponsiveMedia({...treated,treatment:{kind:'background_removal',cutout:{path:f.cutout.path}}}),/cutout master path and sha256/);
  }finally{await rm(f.root,{recursive:true,force:true});}
  const solid=await fixture({alphaAt:()=>255});
  try{
    const input=derivativeInput(solid.root,solid);
    await assert.rejects(prepareResponsiveMedia({...input,treatment:{kind:'background_removal',cutout:solid.cutout},grant:{...input.grant,background_removal:true}}),/failed its check: no_transparent_background/);
  }finally{await rm(solid.root,{recursive:true,force:true});}
});

test('grant basis, credit text and the publication guard',()=>{
  assert.equal(cutoutBasisProblem({kind:'owner_original'}),null);
  for(const code of ['CC0-1.0','CC-BY-2.0','CC-BY-3.0','CC-BY-4.0'])assert.equal(cutoutBasisProblem({kind:'open_license',license_code:code}),null,code);
  for(const code of ['CC-BY-SA-2.0','CC-BY-SA-4.0'])assert.equal(cutoutBasisProblem({kind:'open_license',license_code:code}),'share_alike_adaptation_needs_licence_review',code);
  for(const code of ['CC-BY-NC-4.0','CC-BY-ND-4.0',undefined])assert.equal(cutoutBasisProblem({kind:'open_license',license_code:code}),'license_not_allowed',String(code));
  assert.equal(cutoutBasisProblem({kind:'written_permission',resize:true,webp_encode:true}),'written_permission_does_not_cover_background_removal');
  assert.equal(cutoutBasisProblem({kind:'written_permission',background_removal:true}),null);
  assert.equal(cutoutBasisProblem(undefined),'unsupported_grant_kind');
  assert.deepEqual([creditChanges({resized:true}),creditChanges({resized:false}),creditChanges({resized:true,background_removed:true}),creditChanges({resized:false,background_removed:true})],
    ['resized and converted to WebP','converted to WebP','background removed, resized and converted to WebP','background removed and converted to WebP']);
  assert.throws(()=>approvalBundle({candidate:{},grant:{},items:[{manifest:{treatment:{kind:'background_removal'}}}],public_base_url:'https://project.example.test/storage/v1/object/public/jwl-product-media'}),/cannot be recorded yet/);
});

test('the metric background is the storefront\'s product frame colour',async()=>{
  const css=await readFile(new URL('../../apps/storefront/src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.media \{[^}]*background: var\(--sand\)/);
  assert.equal(css.match(/--sand: (#[0-9a-f]{6})/)[1],frameBackground);
});
