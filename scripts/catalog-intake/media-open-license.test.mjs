import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeBatch} from './normalize.mjs';
import {installedImageEngine} from './responsive-media.mjs';
import {openLicenses,commonsOriginal,evaluateMediaGrant,mediaReadiness,acquireOriginal,createMediaPacer,prepareGrantedMedia,approvalBundle} from './media-pipeline.mjs';
import {mediaRun} from './media-run.mjs';

// Synthetic fixtures only: no request leaves the process and no real file, person or licence record is named.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const commons=name=>{const md5=createHash('md5').update(decodeURIComponent(name)).digest('hex');return [`https://commons.wikimedia.org/wiki/File:${name}`,`https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${name}`];};
const [page,original]=commons('Synthetic_test_watch_m126610ln-0001.jpg');
const gallery='https://media.example.test/watches/m126610ln-0001_front.png';
const record=(source_id,external_id)=>normalizeBatch([{source_id,external_id,source_url:'https://brand.example.test/watches/'+external_id,brand:'Synthetic',collection:'Submariner',product_name:'Synthetic Submariner Date',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:[gallery],facts:[{key:'diameter',value:'41 mm'}]}])[0];
const candidate=record('synthetic-official','m126610ln-0001');
const open={grant_reference:'synthetic-open-01',kind:'open_license',source_id:'synthetic-official',candidate_id:candidate.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,
  evidence_reference:'synthetic licence review record',license_code:'CC-BY-SA-4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',creator:'Synthetic Photographer',
  source_page_url:page,original_url:original,attribution_text:'Synthetic Photographer, CC BY-SA 4.0, via Wikimedia Commons',owner_decision_reference:'synthetic-owner-decision'};
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
  assert.deepEqual(decide(open,{asset_url:gallery}).reasons,['asset_not_the_granted_original'],'the brand gallery is never an open-licence download');
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
    await assert.rejects(acquireOriginal({candidate,asset_url:gallery,grant:open,output_directory:root},{fetcher:refuse,pacer}),/asset_not_the_granted_original/);
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

test('the phased runner takes exactly one Commons original per open-licence grant and still waits for verification',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-run-'));
  try{
    const jpeg=await sharp({create:{width:1000,height:1250,channels:3,background:'#48403a'}}).jpeg().toBuffer();
    const row={candidate_id:candidate.candidate_id,source_id:candidate.source_id,external_id:candidate.external_id,revision_hash:candidate.revision_hash,content:{image_urls:candidate.image_urls,source_url:candidate.source_url}};
    const input={output_directory:join(root,'private'),candidate:row,grant:open,source,originals:[{asset_url:original}],public_base_url:base};
    const options={fetcher:commonsFetcher(jpeg),pacer:createMediaPacer({sleep:async()=>{}})};
    await assert.rejects(mediaRun('originals',{...input,originals:[{asset_url:original},{asset_url:original}]},options),/exactly one original/);
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
