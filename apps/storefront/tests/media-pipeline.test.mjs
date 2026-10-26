import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {galleryBinding,evaluateMediaGrant,mediaReadiness,acquireOriginal,createMediaPacer,keepOwnerOriginal,prepareGrantedMedia,requireVerification,approvalBundle} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {uploadDerivatives} from '../../../scripts/catalog-intake/media.mjs';
import {recordMediaApproval,publish} from '../../../scripts/catalog-intake/supabase.mjs';

const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const asset='https://media.example.test/watches/m126610ln-0001_front.png';
const candidate=normalizeBatch([{source_id:'synthetic-official',external_id:'m126610ln-0001',source_url:'https://brand.example.test/watches/submariner/m126610ln-0001',brand:'Synthetic',collection:'Submariner',product_name:'Synthetic Submariner Date',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:[asset],facts:[{key:'diameter',value:'41 mm'},{key:'color',value:'black'}]}])[0];
const written={grant_reference:'synthetic-written-01',kind:'written_permission',source_id:'synthetic-official',media_origins:['https://media.example.test'],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic private permission record'};
const source={id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true};
const verification=original=>({asset_sha256:original.sha256,verified_reference:candidate.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check record',
  checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}});
const base='https://project.supabase.co/storage/v1/object/public/jwl-product-media';

test('gallery binding requires the exact bounded reference; a URL alone is never permission',()=>{
  assert.equal(galleryBinding(candidate).exact_gallery,true);
  const near={...candidate,image_urls:['https://media.example.test/m126610ln-00011.png','https://media.example.test/xm126610ln-0001.png']};
  assert.deepEqual(galleryBinding(near).images.map(i=>i.binding),['unbound_requires_visual_verification','unbound_requires_visual_verification']);
  assert.deepEqual(evaluateMediaGrant(undefined,{candidate,asset_url:asset}),{state:'awaiting_permission',reasons:['no_media_grant']});
  const readiness=mediaReadiness([candidate,{...candidate,candidate_id:'f'.repeat(64),source_id:'cartier-official',external_id:'CRWTEST',image_urls:['https://img.example.test/a.png']}]);
  assert.equal(readiness.approved_photo_library,false);
  assert.equal(readiness.sources['synthetic-official'].exact_reference_gallery,1);assert.equal(readiness.sources['cartier-official'].unbound_gallery,1);
  assert.equal(readiness.sources['synthetic-official'].awaiting_permission,1);
});

test('grant evaluation rejects open licenses, wrong scope, restricted sources and incomplete or lapsed rights',()=>{
  const decide=(grant,extra={})=>evaluateMediaGrant(grant,{candidate,asset_url:asset,now:Date.parse('2026-10-26T00:00:00Z'),...extra});
  assert.equal(decide(written).state,'permitted');
  assert.deepEqual(decide({...written,kind:'open_license'}).reasons,['open_license_requires_attribution_support_and_owner_decision']);
  assert(decide({...written,media_origins:['https://other.test']}).reasons.includes('asset_origin_not_granted'));
  assert(decide(written,{asset_url:'https://media.example.test/other.png'}).reasons.includes('asset_not_in_exact_candidate_gallery'));
  assert(decide({...written,resize:false}).reasons.includes('usage_rights_incomplete'));
  assert(decide({...written,expires_at:'2026-01-01T00:00:00Z'}).reasons.includes('grant_expired'));
  assert(decide({...written,revoked_at:'2026-10-01T00:00:00Z'}).reasons.includes('grant_revoked'));
  assert(decide({...written,candidate_id:'e'.repeat(64)}).reasons.includes('grant_covers_another_product'));
  assert(decide({...written,evidence_reference:' '}).reasons.includes('permission_evidence_missing'));
  const cartier={...candidate,source_id:'cartier-official'};
  assert(evaluateMediaGrant({...written,source_id:'cartier-official'},{candidate:cartier,asset_url:asset}).reasons.includes('source_acquisition_restricted'));
  const owner={grant_reference:'synthetic-owner-01',kind:'owner_original',candidate_id:candidate.candidate_id,declared_reference:'m126610ln-0001',website_publication:true,resize:true,webp_encode:true,evidence_reference:'owner photo session record'};
  assert.equal(evaluateMediaGrant(owner,{candidate}).state,'permitted');
  assert(evaluateMediaGrant({...owner,declared_reference:'m126610ln-0002'},{candidate}).reasons.includes('declared_reference_mismatch'));
});

test('original acquisition stops on robots, refusal, redirect or wrong type and preserves bytes privately by checksum',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-media-'));
  try{
    const png=await sharp({create:{width:40,height:40,channels:3,background:'#123'}}).png().toBuffer();
    const run=(routes)=>{const calls=[],pacer=createMediaPacer({sleep:async()=>{}});return {calls,go:()=>acquireOriginal({candidate,asset_url:asset,grant:written,output_directory:root},{pacer,fetcher:async url=>{calls.push(url);return routes(url);}})};};
    let h=run(url=>url.endsWith('robots.txt')?new Response('User-agent: *\nDisallow: /watches/'):new Response(png,{headers:{'content-type':'image/png'}}));
    await assert.rejects(h.go(),/robots refused/);assert.equal(h.calls.length,1);
    h=run(url=>url.endsWith('robots.txt')?new Response('',{status:404}):new Response('no',{status:403}));
    await assert.rejects(h.go(),/refused access \(403\)/);
    h=run(url=>url.endsWith('robots.txt')?new Response('',{status:404}):new Response(null,{status:302,headers:{location:'https://elsewhere.test/a.png'}}));
    await assert.rejects(h.go(),/redirect requires review/);
    h=run(url=>url.endsWith('robots.txt')?new Response('',{status:404}):new Response('<html>',{headers:{'content-type':'text/html'}}));
    await assert.rejects(h.go(),/Unsupported source image type/);
    h=run(url=>url.endsWith('robots.txt')?new Response('',{status:500}):new Response(png,{headers:{'content-type':'image/png'}}));
    await assert.rejects(h.go(),/robots unavailable/);
    h=run(url=>url.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(png,{headers:{'content-type':'image/png'}}));
    const original=await h.go();
    assert.equal(original.sha256,sha(png));assert.equal(sha(await readFile(original.path)),sha(png));
    assert.equal((await h.go()).path,original.path,'replay is idempotent');
    assert.equal(h.calls.filter(url=>url.endsWith('robots.txt')).length,1,'robots policy is cached per origin');
    await assert.rejects(acquireOriginal({candidate,asset_url:asset,grant:undefined,output_directory:root},{fetcher:async()=>{throw Error('must not fetch');}}),/no_media_grant/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('verification is explicit and complete; derivative bundles need the exact binding and a card size',async()=>{
  const original={sha256:'a'.repeat(64)};
  assert.throws(()=>requireVerification(undefined,{candidate,asset:original}),/exact original/);
  const partial=verification(original);partial.checks.color_and_variant=false;
  assert.throws(()=>requireVerification(partial,{candidate,asset:original}),/color_and_variant/);
  assert.throws(()=>requireVerification({...verification(original),verified_reference:'m126610ln-0002'},{candidate,asset:original}),/exact original/);
  assert.throws(()=>approvalBundle({candidate,grant:written,items:[{asset:original,manifest:{},verification:verification(original)}],public_base_url:'https://cdn.example.test/x'}),/bucket URL/);
});

async function catalogDatabase(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir=new URL('../supabase/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('synthetic-official','https://brand.example.test','permitted-page','synthetic acquisition review',true,true,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
function rpcThrough(db){
  return async(url,init)=>{
    const name=String(url).split('/rpc/')[1];const args=JSON.parse(init.body);
    if(name==='jwl_record_media_approval')return new Response(JSON.stringify((await service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(args.evidence),JSON.stringify(args.approval)])).rows[0].r));
    if(name==='jwl_publish_candidate')return new Response(JSON.stringify((await service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[args.candidate,args.revision,JSON.stringify(args.product)])).rows[0].r));
    throw Error('unexpected rpc '+name);
  };
}

test('end to end: permitted original → private derivatives → verification → exact evidence → publish → revocation withdraws',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-media-e2e-'));
  const db=await catalogDatabase();
  try{
    const png=await sharp({create:{width:1200,height:1500,channels:3,background:{r:40,g:40,b:44}}}).png().toBuffer();
    const original=await acquireOriginal({candidate,asset_url:asset,grant:written,output_directory:root},{pacer:createMediaPacer({sleep:async()=>{}}),fetcher:async url=>url.endsWith('robots.txt')?new Response('',{status:404}):new Response(png,{headers:{'content-type':'image/png'}})});
    await assert.rejects(prepareGrantedMedia({source:{...source,publication_allowed:false},candidate,asset:{...original,path:original.path},grant:written,output_directory:root}),/Explicit media grant required/,'source publication stays an owner decision');
    const prepared=await prepareGrantedMedia({source,candidate,asset:{path:original.path,source_url:original.source_url,sha256:original.sha256},grant:written,output_directory:root});
    assert.deepEqual(prepared.manifest.variants.map(v=>v.width),[320,640,960]);assert.equal(prepared.manifest.detail.width,1200);
    const bundle=approvalBundle({candidate,grant:written,items:[{asset:original,manifest:prepared.manifest,verification:verification(original)}],public_base_url:base});
    assert.equal(bundle.publication_state,'verified-not-uploaded');assert.equal(bundle.evidence.length,4);
    assert.deepEqual(bundle.approval.approved_image_variants[0].variants.map(v=>v.width),[320,640,960,1200]);

    const stored=new Map();
    const storage=async(url,init={})=>{
      const href=String(url);
      if(init.method==='POST'){const key=href.split('/object/jwl-product-media/')[1];if(stored.has(key))return new Response('{"error":"Duplicate"}',{status:400});stored.set(key,Buffer.from(init.body));return new Response('{}');}
      const key=href.split('/object/public/jwl-product-media/')[1];return stored.has(key)?new Response(stored.get(key)):new Response('',{status:404});
    };
    const config={url:'https://project.supabase.co',key:'synthetic-test-key'};
    const uploaded=await uploadDerivatives(bundle,{output_directory:root,storage:config},storage);
    assert.deepEqual(uploaded.sort(),bundle.evidence.map(e=>e.public_url).sort());
    assert.deepEqual((await uploadDerivatives(bundle,{output_directory:root,storage:config},storage)).length,4,'re-upload verifies identical existing objects');
    await assert.rejects(uploadDerivatives({...bundle,evidence:bundle.evidence.slice(1)},{output_directory:root,storage:config},storage),/differs from approved evidence/);

    await service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('synthetic-written-01','written_permission','synthetic-official','[\"https://media.example.test\"]',true,true,true,'synthetic private permission record')");
    await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([candidate])]);
    const rpc=rpcThrough(db);
    assert.deepEqual(await recordMediaApproval(bundle,config,rpc),{candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,evidence_rows:4,published:0});
    assert.equal((await recordMediaApproval(bundle,config,rpc)).evidence_rows,4,'identical replay is idempotent');
    const tampered=structuredClone(bundle);tampered.evidence[0].public_sha256='0'.repeat(64);
    await assert.rejects(recordMediaApproval(tampered,config,rpc),/differs/);
    const review={candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,slug:'synthetic-submariner',reference:candidate.external_id,brand_slug:'synthetic',brand_name:'Synthetic',brand_tier:'luxury',category_slug:'watches',collection_slug:'submariner',collection_ar:'سابمارينر',collection_en:'Submariner',name_ar:candidate.name_ar,name_en:candidate.name_en,description_ar:candidate.description_ar,description_en:candidate.description_en,images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    await assert.rejects(publish({...review,image_variants:[]},config,rpc),/differ from approved media/);
    await publish(review,config,rpc);
    const live=(await db.query('select active,media_state,images,image_variants from public.jwl_catalog')).rows[0];
    assert.deepEqual(live,{active:true,media_state:'approved_media',images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants});
    await service(db,"update jwl_internal.media_grants set revoked_at=now()");
    assert.equal((await db.query('select active from public.jwl_catalog')).rows[0].active,false);
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

test('owner originals bind to checksum and one exact product without any network request',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-owner-'));
  try{
    const jpeg=await sharp({create:{width:800,height:1000,channels:3,background:'#d0c8b8'}}).jpeg().toBuffer();
    const local=join(root,'owner-photo.jpg');await writeFile(local,jpeg);
    const owner={grant_reference:'synthetic-owner-01',kind:'owner_original',candidate_id:candidate.candidate_id,declared_reference:candidate.external_id,website_publication:true,resize:true,webp_encode:true,evidence_reference:'owner photo session record'};
    const kept=await keepOwnerOriginal({candidate,grant:owner,local_path:local,output_directory:join(root,'private')});
    assert.equal(kept.source_url,'owner-original:'+sha(jpeg));
    const prepared=await prepareGrantedMedia({source,candidate,asset:{path:kept.path,source_url:kept.source_url,sha256:kept.sha256},grant:owner,output_directory:join(root,'private')});
    assert.equal(prepared.manifest.binding.asset_source_url,kept.source_url);
    const bundle=approvalBundle({candidate,grant:owner,items:[{asset:kept,manifest:prepared.manifest,verification:verification(kept)}],public_base_url:base});
    assert(bundle.evidence.every(e=>e.original_source===kept.source_url&&e.verified_reference===candidate.external_id));
    await assert.rejects(keepOwnerOriginal({candidate,grant:{...owner,declared_reference:'other'},local_path:local,output_directory:join(root,'private')}),/declared_reference_mismatch/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('one pacer spaces every request to a media origin even across many assets',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-media-pace-'));
  try{
    let t=0;const at=[];
    const pacer=createMediaPacer({min_interval_seconds:3,sleep:async ms=>{t+=ms;},now:()=>t});
    const png=await sharp({create:{width:20,height:20,channels:3,background:'#456'}}).png().toBuffer();
    const gallery=['https://media.example.test/watches/m126610ln-0001_a.png','https://media.example.test/watches/m126610ln-0001_b.png'];
    const c={...candidate,image_urls:gallery};
    const fetcher=async url=>{at.push(t);return url.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(png,{headers:{'content-type':'image/png'}});};
    for(const url of gallery)await acquireOriginal({candidate:c,asset_url:url,grant:written,output_directory:root},{fetcher,pacer});
    assert.equal(at.length,3,'robots once, then two assets');
    for(let i=1;i<at.length;i++)assert(at[i]-at[i-1]>=3000,'requests to one origin stay spaced');
  }finally{await rm(root,{recursive:true,force:true});}
});
