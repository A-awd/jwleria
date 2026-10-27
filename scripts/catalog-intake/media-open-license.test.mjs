import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeBatch} from './normalize.mjs';
import {installedImageEngine} from './responsive-media.mjs';
import {openLicenses,commonsOriginal,commonsRendition,commonsFile,evaluateMediaGrant,mediaReadiness,acquireOriginal,keepOpenLicenseFile,createMediaPacer,prepareGrantedMedia,approvalBundle} from './media-pipeline.mjs';
import {mediaRun} from './media-run.mjs';

// Synthetic fixtures only: no request leaves the process and no real file, person or licence record is named.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const commons=name=>{const md5=createHash('md5').update(decodeURIComponent(name)).digest('hex');return [`https://commons.wikimedia.org/wiki/File:${name}`,`https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${name}`];};
const thumb=(name,width)=>{const [p,o]=commons(name);return [p,o.replace('/wikipedia/commons/','/wikipedia/commons/thumb/')+`/${width}px-${name}`];};
const renditionFile=(name,width)=>{const [p,t]=thumb(name,width);return {source_page_url:p,file_url:t,file_kind:'rendition',rendition_width:width};};
const [page,original]=commons('Synthetic_test_watch_m126610ln-0001.jpg');
const gallery='https://media.example.test/watches/m126610ln-0001_front.png';
const record=(source_id,external_id)=>normalizeBatch([{source_id,external_id,source_url:'https://brand.example.test/watches/'+external_id,brand:'Synthetic',collection:'Submariner',product_name:'Synthetic Submariner Date',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:[gallery],facts:[{key:'diameter',value:'41 mm'}]}])[0];
const candidate=record('synthetic-official','m126610ln-0001');
const open={grant_reference:'synthetic-open-01',kind:'open_license',source_id:'synthetic-official',candidate_id:candidate.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,
  evidence_reference:'synthetic licence review record',license_code:'CC-BY-SA-4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',creator:'Synthetic Photographer',
  licensed_files:[{source_page_url:page,file_url:original,file_kind:'original',rendition_width:null}],attribution_text:'Synthetic Photographer, CC BY-SA 4.0, via Wikimedia Commons',owner_decision_reference:'decisions/0099-synthetic-open-licence-decision.md'};
const source={id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true};
const base='https://project.supabase.co/storage/v1/object/public/jwl-product-media';
const now=Date.parse('2026-10-26T00:00:00Z');
const decide=(grant,extra={})=>evaluateMediaGrant(grant,{candidate,asset_url:original,now,...extra});
const verification=asset=>({asset_sha256:asset.sha256,verified_reference:candidate.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check record',
  checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}});
const commonsFetcher=(bytes,calls=[])=>async(url,init)=>{calls.push({url,agent:init?.headers?.['User-Agent']});
  if(!String(url).startsWith('https://upload.wikimedia.org/'))throw Error('unexpected origin '+url);
  return url.endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(bytes,{headers:{'content-type':'image/jpeg'}});};

test('the allowlist holds only CC0 and CC BY / BY-SA 4.0, 3.0 and 2.0 with their canonical deeds',()=>{
  assert.deepEqual(Object.keys(openLicenses),['CC0-1.0','CC-BY-4.0','CC-BY-3.0','CC-BY-2.0','CC-BY-SA-4.0','CC-BY-SA-3.0','CC-BY-SA-2.0']);
  for(const [code,{label,url}] of Object.entries(openLicenses)){
    assert.doesNotMatch(code+label+url,/NC|ND|nc-|nd\//i);
    assert.match(url,/^https:\/\/creativecommons\.org\/(licenses\/by(-sa)?|publicdomain\/zero)\/[0-9.]+\/$/);
  }
  assert(Object.isFrozen(openLicenses)&&Object.isFrozen(openLicenses['CC-BY-4.0']));
});

test('an open-licence grant is permitted only with the owner decision, an allowlisted licence, a Commons original and complete attribution',()=>{
  assert.deepEqual(decide(open),{state:'permitted',reasons:[],grant_reference:open.grant_reference});
  for(const code of ['CC-BY-NC-4.0','CC-BY-ND-4.0','CC-BY-NC-SA-4.0','CC-BY-NC-ND-4.0','cc-by-4.0','toString'])
    assert.deepEqual(decide({...open,license_code:code}).reasons,['license_not_allowed'],code);
  assert.deepEqual(decide({...open,license_code:'CC-BY-4.0'}).reasons,['license_url_mismatch']);
  assert.deepEqual(decide({...open,license_url:'https://creativecommons.org/licenses/by-sa/3.0/de/'}).reasons,['license_url_mismatch'],'ported versions need review');
  const gaps=[
    [{owner_decision_reference:undefined},'owner_decision_reference_missing'],
    [{owner_decision_reference:'  '},'owner_decision_reference_missing'],
    [{owner_decision_reference:'synthetic-owner-decision'},'owner_decision_reference_missing'],
    // A dated sentence is not a decision record, however plausible.
    [{owner_decision_reference:'owner continuation instruction 2026-10-27 relayed: complete the sample path'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'synthetic owner decision 2026-10-26'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'decisions/0013-open-licence-exact-product-photos.md '},'owner_decision_reference_missing'],
    [{owner_decision_reference:'decisions/13-open-licence.md'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'decisions/0013-Open-Licence.md'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'decisions/0013-open-licence.md\n'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'../decisions/0013-open-licence.md'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'decisions/0013-open--licence.md'},'owner_decision_reference_missing'],
    [{owner_decision_reference:'https://example.test/decisions/0013-open-licence.md'},'owner_decision_reference_missing'],
    [{licensed_files:[]},'licensed_file_not_an_allowlisted_commons_file'],
    [{licensed_files:[{...open.licensed_files[0],rendition_width:960}]},'licensed_file_not_an_allowlisted_commons_file'],
    [{creator:''},'attribution_creator_missing'],
    [{creator:'Synthetic\u0007Photographer'},'attribution_creator_missing'],
    [{attribution_text:undefined},'attribution_text_missing'],
    [{attribution_text:'Via Wikimedia Commons'},'attribution_text_missing'],
    [{media_origins:['https://upload.wikimedia.org']},'open_license_names_one_file_not_origins'],
  ];
  for(const [change,reason] of gaps)assert(decide({...open,...change}).reasons.includes(reason),reason);
  assert(decide({...open,candidate_id:undefined}).reasons.includes('open_license_must_name_exact_product'));
  assert(decide({...open,candidate_id:'e'.repeat(64)}).reasons.includes('grant_covers_another_product'));
  assert(decide({...open,source_id:'other-official'}).reasons.includes('grant_covers_another_source'));
  assert(decide({...open,revoked_at:'2026-10-01T00:00:00Z'}).reasons.includes('grant_revoked'));
  assert(decide({...open,resize:false}).reasons.includes('usage_rights_incomplete'));
  assert.deepEqual(decide(open,{asset_url:gallery}).reasons,['asset_not_a_granted_file'],'the brand gallery is never an open-licence download');
  for(const source_id of ['cartier-official','van-cleef-and-arpels-official','celine-official','rimowa-official','piaget-official','panerai-official']){
    const closed=record(source_id,'CLOSED-1');
    assert(evaluateMediaGrant({...open,source_id,candidate_id:closed.candidate_id},{candidate:closed,asset_url:original,now}).reasons.includes('source_acquisition_restricted'),source_id);
  }
});

test('only the canonical Commons original of the same file page qualifies, never a brand, local-wiki or thumbnail file',()=>{
  assert.equal(commonsOriginal(page,original),true);
  assert.equal(commonsOriginal(...commons('Example.jpg')),true);
  assert.equal(commonsOriginal('https://commons.wikimedia.org/wiki/File:Example.jpg','https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg'),true,'MediaWiki md5 hash directories');
  const [otherPage]=commons('Other_watch.jpg'),name=original.split('/').pop();
  const refused=[
    [otherPage,original],
    [page,gallery],
    [page,original.replace('upload.wikimedia.org','upload.wikimedia.org.example.test')],
    [page,original.replace('/wikipedia/commons/','/wikipedia/en/')],
    [page,original.replace(/\/([0-9a-f])\/([0-9a-f]{2})\//,'/thumb/$1/$2/')+'/640px-'+name],
    [page,original.replace(/\/[0-9a-f]\/([0-9a-f]{2})\//,(m,dir)=>`/${dir[0]}/${dir[0]==='0'?'1':'0'}${dir[1]}/`)],
    [page,original+'?download'],
    [page,original.replace('https:','http:')],
    [page.replace('commons.wikimedia.org','en.wikipedia.org'),original],
    [page.replace('/wiki/File:','/w/index.php?title=File:'),original],
    ...['Synthetic.tif','Synthetic.svg','Synthetic.gif'].map(file=>commons(file)),
    commons('Synthetic watch.jpg'),
  ];
  for(const [p,o] of refused)assert.equal(commonsOriginal(p,o),false,o);
  const encoded=commons('Montre_%C3%A9t%C3%A9.jpg');
  assert.equal(commonsOriginal(...encoded),true,'percent-encoded names hash by their decoded name');
  assert.equal(commonsOriginal(...encoded.map(u=>u.replace('Montre_%C3%A9t%C3%A9.jpg','Montre_été.jpg'))),false,'non-canonical unencoded URLs are refused');
  const readiness=mediaReadiness([candidate],{grants:[open]});
  assert.equal(readiness.sources['synthetic-official'].permitted,1);assert.equal(readiness.approved_photo_library,false);
});

test('the Commons original is downloaded alone under robots and pacing and kept untouched by checksum',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-original-'));
  try{
    const jpeg=await sharp({create:{width:40,height:50,channels:3,background:'#223'}}).jpeg().toBuffer();
    const calls=[],pacer=createMediaPacer({sleep:async()=>{}});
    const refuse=async()=>{throw Error('must not fetch');};
    await assert.rejects(acquireOriginal({candidate,asset_url:gallery,grant:open,output_directory:root},{fetcher:refuse,pacer}),/asset_not_a_granted_file/);
    await assert.rejects(acquireOriginal({candidate,asset_url:original,grant:{...open,owner_decision_reference:undefined},output_directory:root},{fetcher:refuse,pacer}),/owner_decision_reference_missing/);
    await assert.rejects(acquireOriginal({candidate,asset_url:original,grant:{...open,license_code:'CC-BY-NC-4.0'},output_directory:root},{fetcher:refuse,pacer}),/license_not_allowed/);
    const kept=await acquireOriginal({candidate,asset_url:original,grant:open,output_directory:root},{fetcher:commonsFetcher(jpeg,calls),pacer});
    assert.deepEqual([kept.source_url,kept.sha256,kept.mime_type,kept.grant_reference],[original,sha(jpeg),'image/jpeg',open.grant_reference]);
    assert.equal(sha(await readFile(kept.path)),sha(jpeg),'the untouched original is kept privately');
    assert.deepEqual(calls.map(c=>c.url),['https://upload.wikimedia.org/robots.txt',original]);
    assert(calls.every(c=>c.agent==='JwleriaCatalog/1.0 (+https://jwleria.com)'),'requests identify the client and its site');
    const redirect=async url=>url.endsWith('/robots.txt')?new Response('',{status:404}):new Response(null,{status:301,headers:{location:'https://elsewhere.example.test/a.jpg'}});
    await assert.rejects(acquireOriginal({candidate,asset_url:original,grant:open,output_directory:root},{fetcher:redirect,pacer:createMediaPacer({sleep:async()=>{}})}),/redirect requires review/);
    const robots=async url=>url.endsWith('/robots.txt')?new Response('User-agent: *\nDisallow: /wikipedia/'):new Response(jpeg,{headers:{'content-type':'image/jpeg'}});
    await assert.rejects(acquireOriginal({candidate,asset_url:original,grant:open,output_directory:root},{fetcher:robots,pacer:createMediaPacer({sleep:async()=>{}})}),/robots refused/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('derivatives stay uncropped resizes and the approval bundle carries the exact visible attribution',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-bundle-'));
  try{
    const bundleFor=async(width,height,grant=open)=>{
      const bytes=await sharp({create:{width,height,channels:3,background:'#5a5048'}}).jpeg().toBuffer();
      const kept=await acquireOriginal({candidate,asset_url:original,grant,output_directory:root},{fetcher:commonsFetcher(bytes),pacer:createMediaPacer({sleep:async()=>{}})});
      const asset={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
      const prepared=await prepareGrantedMedia({source,candidate,asset,grant,output_directory:root});
      return {asset,manifest:prepared.manifest,bundle:()=>approvalBundle({candidate,grant,items:[{asset,manifest:prepared.manifest,verification:verification(asset)}],public_base_url:base})};
    };
    const large=await bundleFor(1200,1500);
    assert.equal(large.manifest.binding.asset_source_url,original);assert.equal(large.manifest.processing.crop,false);assert.equal(large.manifest.processing.upscale,false);
    const bundle=large.bundle();
    assert.deepEqual(bundle.approval.approved_image_variants.map(e=>e.attribution),[{creator:'Synthetic Photographer',license:'CC BY-SA 4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',source_url:page,changes:'resized and converted to WebP'}]);
    assert.deepEqual(bundle.approval.approved_image_variants[0].variants.map(v=>v.width),[320,640,960,1200]);
    assert(bundle.evidence.every(e=>e.original_source===original&&e.grant_reference===open.grant_reference&&e.verified_reference===candidate.external_id));
    assert.equal(bundle.publication_state,'verified-not-uploaded');
    assert.throws(()=>approvalBundle({candidate,grant:open,items:[{asset:large.asset,manifest:large.manifest,verification:undefined}],public_base_url:base}),/exact original/,'visual verification stays required');
    assert.throws(()=>approvalBundle({candidate,grant:open,items:[{asset:large.asset,manifest:{...large.manifest,processing:{...large.manifest.processing,crop:true}},verification:verification(large.asset)}],public_base_url:base}),/uncropped resizes/);
    assert.throws(()=>approvalBundle({candidate,grant:{...open,creator:''},items:[{asset:large.asset,manifest:large.manifest,verification:verification(large.asset)}],public_base_url:base}),/attribution_creator_missing/);
    const small=await bundleFor(300,400);
    assert.equal(small.bundle().approval.approved_image_variants[0].attribution.changes,'converted to WebP','a file already at its own size is only converted');
    const cc0=await bundleFor(700,700,{...open,license_code:'CC0-1.0',license_url:'https://creativecommons.org/publicdomain/zero/1.0/'});
    assert.equal(cc0.bundle().approval.approved_image_variants[0].attribution.license,'CC0 1.0','CC0 images are credited too');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('the phased runner takes each Commons original of an open-licence grant once and still waits for verification',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-run-'));
  try{
    const jpeg=await sharp({create:{width:1000,height:1250,channels:3,background:'#48403a'}}).jpeg().toBuffer();
    const row={candidate_id:candidate.candidate_id,source_id:candidate.source_id,external_id:candidate.external_id,revision_hash:candidate.revision_hash,content:{image_urls:candidate.image_urls,source_url:candidate.source_url}};
    const input={output_directory:join(root,'private'),candidate:row,grant:open,source,originals:[{asset_url:original}],public_base_url:base};
    const options={fetcher:commonsFetcher(jpeg),pacer:createMediaPacer({sleep:async()=>{}})};
    await assert.rejects(mediaRun('originals',{...input,originals:[{asset_url:original},{asset_url:original}]},options),/distinct granted file/);
    await assert.rejects(mediaRun('originals',{...input,grant:{...open,attribution_text:''}},options),/attribution_text_missing/);
    const kept=await mediaRun('originals',input,options);
    assert.deepEqual([kept.verification_required,kept.originals[0].source_url,kept.originals[0].sha256],[1,original,sha(jpeg)]);
    await assert.rejects(mediaRun('bundle',input),/exact original/,'no verification record, no derivatives');
    const bundled=await mediaRun('bundle',{...input,verifications:[verification({sha256:sha(jpeg)})]});
    assert.deepEqual([bundled.approved_images,bundled.attributed_images,bundled.uploaded,bundled.published],[1,1,0,0]);
    const bundle=JSON.parse(await readFile(join(root,'private','approval-bundle.json'),'utf8'));
    assert.equal(bundle.approval.approved_image_variants[0].attribution.source_url,page);
    assert.match(await readFile(join(root,'private','record-approval.sql'),'utf8'),/"attribution":\{"creator":"Synthetic Photographer"/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('a Wikimedia rendition qualifies only as the same file at its recorded width, and is recorded as a rendition',()=>{
  const name='Synthetic_dial_%2850826887656%29.jpg',[p,t]=thumb(name,960);
  assert.equal(commonsRendition(p,t,960),true);
  assert.equal(commonsOriginal(p,t),false,'a rendition is never an original');
  assert.equal(commonsRendition(...commons(name),960),false,'an original is never a rendition');
  const [otherPage]=commons('Other_dial.jpg');
  const refused=[
    [p,t,640,'a width other than the URL names'],[p,t,undefined,'missing width'],[p,t,'960','text width'],
    [otherPage,t,960,'another page'],
    [p,t.replace(/\/960px-.*$/,'/960px-Other_dial.jpg'),960,'mismatched name after the width'],
    [p,t.replace(/\/thumb\/([0-9a-f])\//,(m,a)=>`/thumb/${a==='0'?'1':'0'}/`),960,'wrong hash directory'],
    [p.replace('%28','(').replace('%29',')'),t,960,'the page spells the name differently'],
    [...thumb(name,99),99,'below 100 px'],[...thumb(name,4001),4001,'above 4000 px'],
    [p,t+'?x',960,'a query'],[p,t.replace('/wikipedia/commons/','/wikipedia/en/'),960,'another wiki'],
  ];
  for(const [pp,tt,w,label] of refused)assert.equal(commonsRendition(pp,tt,w),false,label);
  const file=renditionFile(name,960);
  assert.equal(commonsFile(file),true);
  assert.equal(commonsFile({...file,file_kind:'original'}),false);
  const {rendition_width,...missing}=file;
  assert.equal(commonsFile(missing),false,'rendition_width is required');
  assert.equal(commonsFile({...file,rendition_width:null}),false);
  const grant={...open,licensed_files:[file,open.licensed_files[0]]};
  assert.deepEqual(decide(grant,{asset_url:file.file_url}),{state:'permitted',reasons:[],grant_reference:open.grant_reference});
  assert.deepEqual(decide(grant,{asset_url:t.replace('960px-','640px-')}).reasons,['asset_not_a_granted_file'],'only the recorded width is granted');
  assert(decide({...open,licensed_files:[missing]}).reasons.includes('licensed_file_not_an_allowlisted_commons_file'));
  assert(decide({...open,licensed_files:[file,file]}).reasons.includes('licensed_file_not_an_allowlisted_commons_file'));
});

test('a held rendition is kept without any request, must decode to its recorded width and never yields wider derivatives',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-rendition-'));
  try{
    const files=[renditionFile('Synthetic_front_(1).jpg',960),renditionFile('Synthetic_box_(2).jpg',300)];
    const grant={...open,licensed_files:files};
    const held=async(width,height,name)=>{const bytes=await sharp({create:{width,height,channels:3,background:'#4a423b'}}).jpeg().toBuffer();const path=join(root,name);await writeFile(path,bytes);return {path,bytes};};
    const front=await held(960,720,'front.jpg'),box=await held(300,225,'box.jpg'),wrong=await held(1200,900,'wrong.jpg');
    const out=join(root,'private');
    await assert.rejects(keepOpenLicenseFile({candidate,grant,file_url:files[0].file_url,local_path:wrong.path,expected_sha256:sha(wrong.bytes),output_directory:out}),/recorded rendition width/,'decoded width must equal rendition_width');
    await assert.rejects(keepOpenLicenseFile({candidate,grant,file_url:files[0].file_url,local_path:front.path,expected_sha256:'0'.repeat(64),output_directory:out}),/recorded checksum/);
    for(const missing of [undefined,null,'',sha(front.bytes).toUpperCase(),sha(front.bytes).slice(1)])
      await assert.rejects(keepOpenLicenseFile({candidate,grant,file_url:files[0].file_url,local_path:front.path,expected_sha256:missing,output_directory:out}),/needs its recorded sha256/,'a held copy always needs its sha256: '+missing);
    await assert.rejects(keepOpenLicenseFile({candidate,grant,file_url:original,local_path:front.path,expected_sha256:sha(front.bytes),output_directory:out}),/asset_not_a_granted_file/);
    // A held copy can never be recorded as an original, whatever bytes it holds: originals are downloaded and checked.
    const withOriginal={...grant,licensed_files:[...files,open.licensed_files[0]]};
    await assert.rejects(keepOpenLicenseFile({candidate,grant:withOriginal,file_url:original,local_path:front.path,expected_sha256:sha(front.bytes),output_directory:out}),/only for a recorded rendition/);
    await assert.rejects(keepOpenLicenseFile({candidate,grant:{...grant,owner_decision_reference:undefined},file_url:files[0].file_url,local_path:front.path,expected_sha256:sha(front.bytes),output_directory:out}),/owner_decision_reference_missing/);
    const prepare=async(file,local)=>{
      const kept=await keepOpenLicenseFile({candidate,grant,file_url:file.file_url,local_path:local.path,expected_sha256:sha(local.bytes),output_directory:out});
      assert.deepEqual([kept.source_url,kept.sha256,kept.file_kind,kept.rendition_width,kept.width],[file.file_url,sha(local.bytes),'rendition',file.rendition_width,file.rendition_width]);
      const asset={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
      return {asset,manifest:(await prepareGrantedMedia({source,candidate,asset,grant,output_directory:out})).manifest,verification:verification(asset),performance_review_accepted:true};
    };
    const items=[await prepare(files[0],front),await prepare(files[1],box)];
    const bundle=approvalBundle({candidate,grant,items,public_base_url:base});
    assert.deepEqual(bundle.approval.approved_image_variants.map(e=>e.variants.map(v=>v.width)),[[320,640,960],[300]],'derivatives never exceed the rendition');
    assert.deepEqual(bundle.approval.approved_image_variants.map(e=>[e.attribution.source_url,e.attribution.changes]),[[files[0].source_page_url,'resized and converted to WebP'],[files[1].source_page_url,'resized and converted to WebP']],
      'a rendition is credited as resized even when it is published at its own width');
    assert(bundle.evidence.every(e=>files.some(f=>f.file_url===e.original_source)));
    const upscaled=structuredClone(items[0]);upscaled.manifest.detail={...upscaled.manifest.detail,width:1200,height:900};
    assert.throws(()=>approvalBundle({candidate,grant,items:[upscaled],public_base_url:base}),/wider than their source rendition/);
    const misrecorded=structuredClone(items[0]);misrecorded.manifest.original.visual_width=1200;
    assert.throws(()=>approvalBundle({candidate,grant,items:[misrecorded],public_base_url:base}),/recorded rendition width/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('the phased runner keeps several held renditions of one grant without any request and still waits for verification',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-run-renditions-'));
  try{
    const files=[renditionFile('Synthetic_front_(1).jpg',960),renditionFile('Synthetic_angle_(2).jpg',960)];
    const grant={...open,licensed_files:files};
    const originals=[];
    for(const [i,f] of files.entries()){const bytes=await sharp({create:{width:960,height:i?540:720,channels:3,background:'#504840'}}).jpeg().toBuffer();const local_path=join(root,`held-${i}.jpg`);await writeFile(local_path,bytes);originals.push({asset_url:f.file_url,local_path,sha256:sha(bytes)});}
    const row={candidate_id:candidate.candidate_id,source_id:candidate.source_id,external_id:candidate.external_id,revision_hash:candidate.revision_hash,content:{image_urls:candidate.image_urls,source_url:candidate.source_url}};
    const input={output_directory:join(root,'private'),candidate:row,grant,source,originals,public_base_url:base,performance_review_accepted:true};
    const refuse={fetcher:async()=>{throw Error('must not fetch');}};
    const kept=await mediaRun('originals',input,refuse);
    assert.deepEqual(kept.originals.map(o=>o.source_url),files.map(f=>f.file_url));
    await assert.rejects(mediaRun('bundle',input),/exact original/,'no verification record, no derivatives');
    const bundled=await mediaRun('bundle',{...input,verifications:kept.originals.map(o=>verification({sha256:o.sha256}))});
    assert.deepEqual([bundled.approved_images,bundled.attributed_images,bundled.uploaded,bundled.published],[2,2,0,0]);
  }finally{await rm(root,{recursive:true,force:true});}
});
