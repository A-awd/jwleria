import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeBatch} from './normalize.mjs';
import {installedImageEngine} from './responsive-media.mjs';
import {requireVerification,identityDeterminationProblem,performanceExceptionRecord,prepareGrantedMedia} from './media-pipeline.mjs';
import {mediaRun} from './media-run.mjs';
import {publicationProduct,lanePublicationProduct,laneMediaPublicationSql} from './supabase.mjs';

// Synthetic fixtures only: no request leaves the process and no real file, person or licence record is named.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=normalizeBatch([{source_id:'synthetic-official',external_id:'m126234-0015',source_url:'https://brand.example.test/watches/m126234-0015',brand:'Synthetic',collection:'Datejust',product_name:'Synthetic Datejust',
  name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://media.example.test/m126234-0015.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
const asset={sha256:'a'.repeat(64)};
const visualReason='SYNTHETIC: size and bezel metal cannot be confirmed from pixels.';
const determination={reviewer:'synthetic identity reviewer',asset_sha256:asset.sha256,identity_established:true,creator_stated_reference:'126234',reason:'SYNTHETIC: the creator states ref. 126234, 36 mm.'};
const quoted=(d=determination)=>`SYNTHETIC visual record by synthetic visual reviewer: exact_reference uncertain: ${visualReason} Identity determination by ${d.reviewer}: ${d.reason} Creator-stated reference ${d.creator_stated_reference}; size and bezel material come from it, not from the pixels.`;
const verified=(over={})=>({asset_sha256:asset.sha256,verified_reference:candidate.external_id,reviewer:'synthetic visual reviewer + synthetic identity reviewer',verification_reference:quoted(),
  checks:{exact_reference:'uncertain',color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true},identity_determination:determination,...over});

test('exact_reference may stay "uncertain" only with an independent identity determination from a creator-stated reference',()=>{
  assert.equal(requireVerification(verified(),{candidate,asset}).checks.exact_reference,'uncertain','the uncertain value is kept, never rounded up');
  assert.equal(identityDeterminationProblem(verified(),{candidate,asset}),null);
  const refuse=(over,pattern,label)=>assert.throws(()=>requireVerification(verified(over),{candidate,asset}),pattern,label);
  refuse({checks:{...verified().checks,exact_reference:false}},/exact_reference \(not true or uncertain\)/,'false is never settled by a determination');
  refuse({checks:{...verified().checks,exact_reference:'unknown'}},/exact_reference/,'only the literal "uncertain"');
  refuse({identity_determination:undefined},/no identity determination/);
  for(const value of [false,'uncertain','true',null])refuse({identity_determination:{...determination,identity_established:value}},/identity_established is not true/,String(value));
  for(const value of [null,'',' ','12'])refuse({identity_determination:{...determination,creator_stated_reference:value}},/no creator-stated reference/,String(value));
  refuse({identity_determination:{...determination,creator_stated_reference:'126334'},verification_reference:quoted({...determination,creator_stated_reference:'126334'})},/not this catalogue reference/,'a sibling reference');
  refuse({identity_determination:{...determination,asset_sha256:'b'.repeat(64)}},/names other bytes/);
  refuse({verification_reference:'SYNTHETIC record that does not quote the determination'},/does not quote/);
  refuse({identity_determination:{...determination,reviewer:''}},/reviewer and reason/);
  // Every other check must still be literally true; a determination settles only the reference.
  for(const check of ['color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'])
    for(const value of ['uncertain',false])refuse({checks:{...verified().checks,[check]:value}},new RegExp(check),check+'='+value);
  // The route with exact_reference literally true is unchanged.
  assert.ok(requireVerification(verified({checks:{...verified().checks,exact_reference:true},identity_determination:undefined}),{candidate,asset}));
});

test('a performance exception is an independent reviewer record, never self-granted and never default',()=>{
  const entry={asset_sha256:'a'.repeat(64),width:960,sha256:'c'.repeat(64),bytes:232558,accepted:['byte_budget'],reason:'SYNTHETIC'};
  const record={reviewer:'synthetic performance reviewer',reviewed_at:'2026-10-27',independent_of_batch_writer:true,basis:'SYNTHETIC basis',exceptions:[entry]};
  assert.equal(performanceExceptionRecord(record,{prepared_by:'synthetic batch writer'}),record);
  assert.throws(()=>performanceExceptionRecord(record,{}),/prepared_by/,'the writer must be named so self-granting is detectable');
  assert.throws(()=>performanceExceptionRecord(record,{prepared_by:' Synthetic Performance Reviewer '}),/self-granted/);
  for(const value of [undefined,false,'true'])assert.throws(()=>performanceExceptionRecord({...record,independent_of_batch_writer:value},{prepared_by:'w'}),/independent/);
  for(const field of ['reviewer','reviewed_at','basis'])assert.throws(()=>performanceExceptionRecord({...record,[field]:''},{prepared_by:'w'}),/reviewer, reviewed_at and basis/);
  assert.throws(()=>performanceExceptionRecord({...record,exceptions:[]},{prepared_by:'w'}),/one entry per excepted derivative/);
  for(const accepted of [[],['everything'],['byte_budget','byte_budget']])
    assert.throws(()=>performanceExceptionRecord({...record,exceptions:[{...entry,accepted}]},{prepared_by:'w'}),/byte_budget and\/or fidelity_floor/);
  assert.throws(()=>performanceExceptionRecord({...record,exceptions:[entry,entry]},{prepared_by:'w'}),/Duplicate/);
});

test('the runner approves a flagged derivative only with an exact entry in a reviewed exception file it reads',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-performance-exception-'));
  try{
    const sharp=installedImageEngine();
    const name='Synthetic_noise_(1).jpg',md5=createHash('md5').update(decodeURIComponent(name)).digest('hex');
    const file={source_page_url:`https://commons.wikimedia.org/wiki/File:${name}`,file_url:`https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0,2)}/${name}/640px-${name}`,file_kind:'rendition',rendition_width:640};
    const grant={grant_reference:'synthetic-open-perf',kind:'open_license',source_id:'synthetic-official',candidate_id:candidate.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,
      evidence_reference:'synthetic licence review record',license_code:'CC-BY-2.0',license_url:'https://creativecommons.org/licenses/by/2.0/',creator:'Synthetic Photographer',licensed_files:[file],
      attribution_text:'Synthetic Photographer, CC BY 2.0, via Wikimedia Commons',owner_decision_reference:'decisions/0013-open-licence-exact-product-photos.md'};
    // TEST ONLY noise: no ladder step fits budget and floor for some files, so those files are flagged.
    const raw=Buffer.alloc(640*480*3);let state=777;for(let n=0;n<raw.length;n++){state=(Math.imul(state,1664525)+1013904223)>>>0;raw[n]=state>>>24;}
    const bytes=await sharp(raw,{raw:{width:640,height:480,channels:3}}).jpeg({quality:95}).toBuffer();
    const local_path=join(root,'held.jpg');await writeFile(local_path,bytes);
    const row={candidate_id:candidate.candidate_id,source_id:candidate.source_id,external_id:candidate.external_id,revision_hash:candidate.revision_hash,content:{image_urls:candidate.image_urls,source_url:candidate.source_url}};
    const out=join(root,'private');
    const input={output_directory:out,candidate:row,grant,source:{id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true},originals:[{asset_url:file.file_url,local_path,sha256:sha(bytes)}],
      public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media',prepared_by:'synthetic batch writer'};
    const kept=(await mediaRun('originals',input,{fetcher:async()=>{throw Error('must not fetch');}})).originals[0];
    const verification={...verified(),asset_sha256:kept.sha256,identity_determination:{...determination,asset_sha256:kept.sha256}};
    const withVerification={...input,verifications:[verification]};
    await assert.rejects(mediaRun('bundle',withVerification),/needs review before approval: no independent performance exception/,'no default exception');
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_review_accepted:true}),/performance_review_accepted is not accepted/,'the old self-set flag is refused');
    const {manifest}=await prepareGrantedMedia({source:input.source,candidate:{...candidate},asset:{path:kept.path,source_url:kept.source_url,sha256:kept.sha256},grant,output_directory:out});
    const files=[...manifest.variants,manifest.detail].filter((f,i,all)=>all.findIndex(o=>o.width===f.width)===i);
    const flagged=files.filter(f=>f.over_budget||!f.fidelity_floor_met);
    assert.ok(flagged.length>0&&manifest.performance_review_required,'the fixture is flagged');
    const accepted=f=>[...(f.over_budget?['byte_budget']:[]),...(f.fidelity_floor_met?[]:['fidelity_floor'])];
    const exact={reviewer:'synthetic performance reviewer',reviewed_at:'2026-10-27',independent_of_batch_writer:true,basis:'SYNTHETIC: reviewed exception rather than destructive compression',
      exceptions:flagged.map(f=>({asset_sha256:kept.sha256,width:f.width,sha256:f.sha256,bytes:f.bytes,accepted:accepted(f),reason:'SYNTHETIC'}))};
    const reviewDir=join(root,'review');await mkdir(reviewDir);
    const save=async(nameOf,value)=>{const path=join(reviewDir,nameOf);await writeFile(path,JSON.stringify(value));return path;};
    // The record is read from a file outside the output directory, never from it, and never from the writer.
    const insideOut=join(out,'exception.json');await writeFile(insideOut,JSON.stringify(exact));
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:insideOut}),/must not be inside the output directory/);
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:'exception.json'}),/absolute path/);
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('self.json',{...exact,reviewer:'synthetic batch writer'})}),/self-granted/);
    await assert.rejects(mediaRun('bundle',{...withVerification,prepared_by:undefined,performance_exception_file:await save('anon.json',exact)}),/prepared_by/);
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('dependent.json',{...exact,independent_of_batch_writer:false})}),/independent/);
    const wrongBytes={...exact,exceptions:exact.exceptions.map((e,i)=>i?e:{...e,bytes:e.bytes+1})};
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('bytes.json',wrongBytes)}),/no exact exception/);
    if(exact.exceptions.length>1)await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('partial.json',{...exact,exceptions:exact.exceptions.slice(1)})}),/no exact exception/,'every flagged file needs its own entry');
    const unflagged=files.find(f=>!flagged.includes(f));
    if(unflagged)await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('extra.json',{...exact,exceptions:[...exact.exceptions,{asset_sha256:kept.sha256,width:unflagged.width,sha256:unflagged.sha256,bytes:unflagged.bytes,accepted:['byte_budget'],reason:'SYNTHETIC'}]})}),/needs none/);
    await assert.rejects(mediaRun('bundle',{...withVerification,performance_exception_file:await save('stray.json',{...exact,exceptions:[...exact.exceptions,{asset_sha256:'d'.repeat(64),width:960,sha256:'e'.repeat(64),bytes:1,accepted:['byte_budget'],reason:'SYNTHETIC'}]})}),/not in this bundle/);
    const bundled=await mediaRun('bundle',{...withVerification,performance_exception_file:await save('exact.json',exact)});
    assert.equal(bundled.approved_images,1);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('the lane publish path uses the stored search_text of a fresh public row, or refuses with a clear error',()=>{
  const review={candidate_id:'1'.repeat(64),revision_hash:'2'.repeat(64),slug:'synthetic-m126234-0015',reference:'m126234-0015',brand_slug:'synthetic',brand_name:'Synthetic',brand_tier:'luxury',category_slug:'watches',
    collection_slug:'datejust',collection_ar:'ديت جست',collection_en:'datejust',name_ar:'ساعة اختبار',name_en:'Synthetic Datejust',description_ar:'وصف',description_en:'Description',
    images:['https://project.supabase.co/storage/v1/object/public/jwl-product-media/v1/x.webp'],image_variants:[]};
  const fresh={id:review.candidate_id,active:true,collection_kind:'collection',search_text:'stored search text kept as published',...Object.fromEntries(['slug','reference','brand_slug','brand_name','brand_tier','category_slug','collection_slug','collection_ar','collection_en','name_ar','name_en','description_ar','description_en'].map(k=>[k,review[k]]))};
  const lane=lanePublicationProduct(review,fresh);
  assert.equal(lane.product.search_text,fresh.search_text,'the stored value is sent');
  assert.notEqual(publicationProduct(review).product.search_text,fresh.search_text,'not the recomputed one');
  assert.ok(laneMediaPublicationSql(review,fresh).includes(JSON.stringify(fresh.search_text)));
  assert.throws(()=>lanePublicationProduct(review),/needs the public row from a fresh read/);
  for(const value of [undefined,null,''])assert.throws(()=>lanePublicationProduct(review,{...fresh,search_text:value}),/no stored search_text/,String(value));
  assert.throws(()=>lanePublicationProduct(review,{...fresh,id:'3'.repeat(64)}),/another product/);
  assert.throws(()=>lanePublicationProduct(review,{...fresh,active:false}),/not active/);
  for(const field of ['slug','brand_tier','collection_ar','name_en','description_ar'])
    assert.throws(()=>lanePublicationProduct(review,{...fresh,[field]:fresh[field]==='luxury'?'accessible':fresh[field]+'-x'}),new RegExp(field+' differs'),field);
  assert.throws(()=>lanePublicationProduct(review,{...fresh,collection_kind:'source_group'}),/collection_kind differs/);
});
