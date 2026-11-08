import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {acquireOriginal,recheckOriginal,createMediaPacer,keepOwnerOriginal,requireVerification,galleryListingProblem} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {backgroundComposite,runJob,sharedFileProblem} from '../../../scripts/catalog-intake/background-composite.mjs';

// Synthetic fixtures only (gaps G1 and G6): no request leaves the process; no real brand file, person or grant is named.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const file='https://media.example.test/bags/SYN100M_front.png';
const candidate=normalizeBatch([{source_id:'synthetic-official',external_id:'SYN100S001',source_url:'https://brand.example.test/bags/SYN100S001',brand:'Synthetic',collection:'Tote',product_name:'Synthetic Tote S — Black',
  name_ar:'حقيبة اختبار',translation_state:'provided',image_urls:[file],facts:[{key:'color',value:'Black'}]}])[0];
const written={grant_reference:'synthetic-written-02',kind:'written_permission',source_id:'synthetic-official',media_origins:['https://media.example.test'],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic private permission record'};
const asset={sha256:'b'.repeat(64),source_url:file};
const listing={basis:'official_gallery_listing',reviewer:'synthetic identity reviewer',asset_sha256:asset.sha256,identity_established:true,reference:candidate.external_id,revision_hash:candidate.revision_hash,gallery_url:file,
  reason:'SYNTHETIC: the source lists this exact file in this size reference gallery.'};
const verified=(d=listing,over={})=>({asset_sha256:asset.sha256,verified_reference:candidate.external_id,reviewer:'synthetic visual reviewer',
  verification_reference:`SYNTHETIC visual record: size uncertain from pixels. Gallery listing by ${d.reviewer}: ${d.reason} ${d.gallery_url} ${d.asset_sha256}`,
  checks:{exact_reference:'uncertain',color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true},identity_determination:d,...over});

test('an official gallery listing settles an uncertain size only for this file, revision, gallery and colour, under written permission',()=>{
  assert.equal(requireVerification(verified(),{candidate,asset,grant:written}).checks.exact_reference,'uncertain','never rounded up');
  const refuse=(v,grant,pattern,label)=>assert.throws(()=>requireVerification(v,{candidate,asset,grant}),pattern,label);
  refuse(verified(),undefined,/only for an official-gallery grant/,'no grant');
  refuse(verified(),{...written,kind:'owner_original'},/only for an official-gallery grant/,'another grant kind');
  refuse(verified({...listing,revision_hash:'c'.repeat(64)}),written,/another candidate revision/,'stale evidence');
  refuse(verified({...listing,reference:'SYN100M001'}),written,/another reference/,'another size reference');
  refuse(verified({...listing,gallery_url:'https://media.example.test/bags/SYN100M_side.png'}),written,/own current gallery/,'a file not in this gallery');
  refuse(verified({...listing,asset_sha256:'d'.repeat(64)}),written,/other bytes/,'other bytes');
  refuse(verified({...listing,reviewer:'synthetic visual reviewer'}),written,/other than the visual reviewer/,'self-review');
  refuse(verified({...listing,basis:'similar_looking'}),written,/unknown identity basis/,'unknown basis');
  refuse(verified(listing,{checks:{...verified().checks,color_and_variant:'uncertain'}}),written,/color_and_variant/,'a colour is never settled by a listing');
  refuse(verified(listing,{verification_reference:'SYNTHETIC visual record without quotes'}),written,/does not quote/,'unquoted');
  assert.equal(galleryListingProblem(verified(),{candidate,asset,grant:written}),null);
});

test('size variants of one design and colour may share one source file; other colours, designs or stale evidence may not',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'jwl-shared-TEST-ONLY-'));
  try{
    const w=120,h=90,d=Buffer.alloc(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)d.set(x>=30&&x<90&&y>=10&&y<80?[20,20,20,255]:[0,0,0,0],(y*w+x)*4);
    const png=await sharp(d,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
    await writeFile(join(dir,'p.png'),png);
    const rev={S:'1'.repeat(64),M:'2'.repeat(64)};
    const evidence=size=>({reference:`SYN100${size}001`,revision_hash:rev[size],gallery_url:file,sha256:sha(png)});
    const item=size=>({reference:`SYN100${size}001`,colour:'Black',model_key:'synthetic-official:SYN100',options:{colour:'Black',bag_size:size},revision_hash:rev[size],
      shared_with:['SYN100S001','SYN100M001'],gallery_evidence:[evidence('S'),evidence('M')],product_path:join(dir,'p.png'),product_sha256:sha(png),background_colour:'#f0f0f0',binding:{size}});
    const small={...backgroundComposite,minSide:64};
    const records=await runJob({items:[item('S'),item('M')],out_directory:join(dir,'out')},sharp,small);
    assert.equal(records[0].kind,'background_composite');
    assert.equal(records[1].duplicate_of,'SYN100S001','processed once');
    assert.deepEqual(records[1].binding,{size:'M'},'each size keeps its own binding');
    assert.equal(records[1].master_sha256,records[0].master_sha256);
    assert.equal(records[1].gallery_evidence.reference,'SYN100M001');
    const refuse=async(items,pattern,label)=>assert.rejects(runJob({items,out_directory:join(dir,'refused')},sharp,small),pattern,label);
    await refuse([{...item('S'),shared_with:undefined},{...item('M'),shared_with:undefined}],/cannot be bound to two references/,'no declaration keeps the default refusal');
    await refuse([item('S'),{...item('M'),colour:'Cocoa',options:{colour:'Cocoa',bag_size:'M'}}],/another colour/,'wrong colour');
    await refuse([item('S'),{...item('M'),model_key:'synthetic-official:SYN200'}],/another model/,'wrong model');
    await refuse([item('S'),{...item('M'),options:{colour:'Black',bag_size:'M',material:'Leather'}}],/differs in material/,'another material');
    await refuse([item('S'),{...item('M'),revision_hash:'3'.repeat(64)}],/stale or missing gallery evidence for SYN100M001/,'stale evidence');
    await refuse([item('S'),{...item('M'),gallery_evidence:[evidence('S')]}],/stale or missing gallery evidence/,'one gallery only');
    await refuse([item('S'),{...item('M'),shared_with:['SYN100M001']}],/must list exactly/,'one-sided declaration');
    assert.match(sharedFileProblem([item('S'),{...item('M'),options:{colour:'Black',bag_size:'S'}}]),/distinct sizes/);
    await assert.rejects(runJob({items:[item('S')],out_directory:join(process.cwd(),'tmp-must-not-exist')},sharp,small),/outside the repository/,'outputs stay outside the repository');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('acquisition records full provenance and a conditional re-check never overwrites an original',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-provenance-TEST-ONLY-'));
  try{
    const png=await sharp({create:{width:40,height:30,channels:4,background:{r:1,g:2,b:3,alpha:0.5}}}).png().toBuffer();
    const other=await sharp({create:{width:40,height:30,channels:4,background:{r:9,g:9,b:9,alpha:0.5}}}).png().toBuffer();
    const headers={'content-type':'image/png',etag:'"v1"','last-modified':'Mon, 02 Nov 2026 10:00:00 GMT'};
    const pacer=createMediaPacer({sleep:async()=>{}}),seen=[];
    const route=body=>async(url,init)=>{seen.push(init?.headers??{});return url.endsWith('robots.txt')?new Response('',{status:404}):body(init?.headers??{});};
    const original=await acquireOriginal({candidate,asset_url:file,grant:written,output_directory:root},{pacer,fetcher:route(()=>new Response(png,{headers}))});
    assert.deepEqual({w:original.width,h:original.height,a:original.has_alpha,f:original.format,o:original.orientation,e:original.etag,l:original.last_modified,k:original.acquisition,s:original.http_status},
      {w:40,h:30,a:true,f:'png',o:1,e:'"v1"',l:headers['last-modified'],k:'download',s:200});
    const not=await recheckOriginal({candidate,asset_url:file,grant:written,output_directory:root,recorded:original},{pacer,fetcher:route(h=>h['If-None-Match']==='"v1"'?new Response(null,{status:304}):new Response(png,{headers}))});
    assert.equal(not.state,'not_modified');assert.equal(not.sha256,original.sha256);
    const same=await recheckOriginal({candidate,asset_url:file,grant:written,output_directory:root,recorded:{...original,etag:null,last_modified:null}},{pacer,fetcher:route(()=>new Response(png,{headers}))});
    assert.equal(same.state,'unchanged');
    const changed=await recheckOriginal({candidate,asset_url:file,grant:written,output_directory:root,recorded:original},{pacer,fetcher:route(()=>new Response(other,{headers:{...headers,etag:'"v2"'}}))});
    assert.equal(changed.state,'changed');assert.equal(changed.previous_sha256,original.sha256);assert.notEqual(changed.original.path,original.path);
    assert.equal(sha(await readFile(original.path)),original.sha256,'the old original is unchanged');
    await assert.rejects(acquireOriginal({candidate,asset_url:file,grant:written,output_directory:root},{pacer,fetcher:route(()=>new Response(null,{status:304}))}),/redirect requires review/,'an unconditional 304 is refused');
    await assert.rejects(recheckOriginal({candidate,asset_url:file,grant:written,output_directory:root,recorded:{...original,acquisition:'owner_file'}},{pacer}),/recorded download/);
    const owner={grant_reference:'synthetic-owner-02',kind:'owner_original',candidate_id:candidate.candidate_id,declared_reference:candidate.external_id,website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic owner record'};
    await writeFile(join(root,'owner.png'),png);
    const kept=await keepOwnerOriginal({candidate,grant:owner,local_path:join(root,'owner.png'),output_directory:root});
    assert.deepEqual([kept.acquisition,kept.width,kept.height,kept.has_alpha],['owner_file',40,30,true]);
  }finally{await rm(root,{recursive:true,force:true});}
});
