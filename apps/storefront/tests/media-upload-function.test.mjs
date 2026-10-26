import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {keepOwnerOriginal,prepareGrantedMedia,approvalBundle} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {uploadThroughFunction,verifyPublishedDerivatives} from '../../../scripts/catalog-intake/media.mjs';
import {mediaApprovalSql,mediaPublicationSql,productMediaBucketSql} from '../../../scripts/catalog-intake/supabase.mjs';
import {handleUpload,approvalQuery} from '../supabase/functions/jwl-media-upload/handler.js';
import {mediaRun} from '../../../scripts/catalog-intake/media-run.mjs';

const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const project='https://project.supabase.co';
const base=project+'/storage/v1/object/public/jwl-product-media';
const functionUrl=project+'/functions/v1/jwl-media-upload';
const candidate=normalizeBatch([{source_id:'synthetic-official',external_id:'m126610ln-0001',source_url:'https://brand.example.test/watches/submariner/m126610ln-0001',brand:'Synthetic',collection:'Submariner',
  product_name:'Synthetic Submariner Date',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://media.example.test/m126610ln-0001.png'],facts:[{key:'diameter',value:'41 mm'}]}])[0];
const grant={grant_reference:'synthetic-owner-01',kind:'owner_original',source_id:'synthetic-official',candidate_id:candidate.candidate_id,declared_reference:candidate.external_id,website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic private owner photo record'};
const verification=original=>({asset_sha256:original.sha256,verified_reference:candidate.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check record',
  checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}});

async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir=new URL('../supabase/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('synthetic-official','https://brand.example.test','permitted-page','synthetic acquisition review',true,false,true)");
  return db;
}
// The function exactly as deployed, wired to the replayed schema and an in-memory bucket.
function deployed(db,objects){
  const deps={public_base:base+'/',digest:async bytes=>sha(bytes),
    approved:async(url,hash)=>(await db.query(approvalQuery,[url,hash])).rows.length===1,
    put:async(path,bytes)=>{if(objects.has(path))return 'exists';objects.set(path,Buffer.from(bytes));return 'uploaded';},
    get:async path=>objects.get(path)};
  const calls=[];
  const fetcher=async(url,init={})=>{
    const href=String(url);calls.push({href,method:init.method??'GET'});
    if(href===functionUrl)return handleUpload(new Request(href,{method:init.method,headers:init.headers,body:init.body,duplex:'half'}),deps);
    const path=href.startsWith(base+'/')?href.slice(base.length+1):null;
    return path&&objects.has(path)?new Response(objects.get(path),{headers:{'content-type':'image/webp'}}):new Response('',{status:404});
  };
  return {deps,fetcher,calls};
}

test('the upload function writes only bytes whose checksum is the path and whose exact URL has live recorded approval',async()=>{
  const objects=new Map(),approvedUrls=new Set();
  const webp=await sharp({create:{width:320,height:400,channels:3,background:'#333'}}).webp({lossless:true}).toBuffer();
  const hash=sha(webp),path=`v1/${'a'.repeat(64)}/${'b'.repeat(64)}/320w-${hash}.webp`;
  let writes=0;
  const deps={public_base:base+'/',digest:async bytes=>sha(bytes),approved:async(url,h)=>approvedUrls.has(url+'#'+h),
    put:async(p,bytes)=>{writes++;if(objects.has(p))return 'exists';objects.set(p,Buffer.from(bytes));return 'uploaded';},get:async p=>objects.get(p),max_bytes:1024*1024};
  const put=(body,{p=path,type='image/webp',method='PUT'}={})=>handleUpload(new Request(functionUrl,{method,headers:{'content-type':type,'x-jwl-path':p},body:method==='PUT'?body:undefined,duplex:'half'}),deps);
  assert.equal((await put(webp,{method:'POST'})).status,405);
  assert.equal((await put(webp,{p:'v1/../secret.webp'})).status,400);
  assert.equal((await put(webp,{type:'image/png'})).status,415);
  assert.equal((await put(Buffer.alloc(2*1024*1024))).status,413);
  assert.equal((await put(Buffer.from('RIFF0000NOPE0000'))).status,422);
  const other=await sharp({create:{width:320,height:400,channels:3,background:'#444'}}).webp({lossless:true}).toBuffer();
  assert.deepEqual(await (await put(other)).json(),{error:'checksum_mismatch'});
  assert.equal((await put(webp)).status,403,'no recorded approval, no write');
  assert.equal(writes,0);
  approvedUrls.add(base+'/'+path+'#'+hash);
  const first=await put(webp);assert.equal(first.status,201);assert.equal((await first.json()).state,'uploaded');
  const again=await put(webp);assert.equal(again.status,200);assert.equal((await again.json()).state,'already_present');
  objects.set(path,Buffer.from(other));
  assert.equal((await put(webp)).status,409,'an existing different object is reported, never overwritten');
});

test('owner original → derivatives → recorded approval → approval-bound upload → downloaded files verified → gated publication',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-upload-'));
  const db=await database();
  try{
    const photo=join(root,'owner-photo.jpg');
    await sharp({create:{width:1200,height:1500,channels:3,background:'#d0c8b8'}}).jpeg().toFile(photo);
    const original=await keepOwnerOriginal({candidate,grant,local_path:photo,output_directory:join(root,'private')});
    const asset={path:original.path,source_url:original.source_url,sha256:original.sha256};
    const prepared=await prepareGrantedMedia({source:{id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true},candidate,asset,grant,output_directory:join(root,'private')});
    const bundle=approvalBundle({candidate,grant,items:[{asset,manifest:prepared.manifest,verification:verification(original)}],public_base_url:base});
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([candidate])]);
    await db.query("insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values($1,'owner_original','synthetic-official',$2,'[]'::jsonb,true,true,true,'synthetic private owner photo record')",[grant.grant_reference,candidate.candidate_id]);
    const objects=new Map(),{fetcher,calls}=deployed(db,objects);
    const options={output_directory:join(root,'private'),function_url:functionUrl,public_base_url:base};

    // Before the approval is recorded the function refuses, so nothing can become public first.
    await assert.rejects(uploadThroughFunction(bundle,{...options,approval_receipt:{candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,evidence_rows:bundle.evidence.length}},fetcher),/403 no_live_recorded_approval/);
    assert.equal(objects.size,0);
    await assert.rejects(uploadThroughFunction(bundle,options,fetcher),/Recorded approval receipt required/);

    const receipt=(await db.query(mediaApprovalSql(bundle))).rows[0].receipt;
    assert.deepEqual(receipt,{candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,evidence_rows:bundle.evidence.length,published:0});
    const uploaded=await uploadThroughFunction(bundle,{...options,approval_receipt:receipt},fetcher);
    assert.deepEqual(uploaded.map(u=>u.state),bundle.uploads.map(()=>'uploaded'));
    assert.equal(calls.filter(c=>c.href===functionUrl).length,1+bundle.uploads.length,'the refused attempt stopped at its first file; then one request per file');
    const verified=await verifyPublishedDerivatives(bundle,fetcher);
    assert.deepEqual(verified.map(v=>v.sha256).sort(),bundle.evidence.map(e=>e.public_sha256).sort());

    const review={candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,slug:'synthetic-m126610ln-0001',reference:candidate.external_id,brand_slug:'synthetic',brand_name:candidate.brand,brand_tier:'luxury',
      category_slug:'watches',collection_slug:'submariner',collection_ar:'سابمارينر',collection_en:candidate.collection,name_ar:candidate.name_ar,name_en:candidate.name_en,description_ar:candidate.description_ar,description_en:candidate.description_en,
      images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    // The source's own publication flag is a separate owner decision: without it nothing is published.
    await assert.rejects(db.query(mediaPublicationSql(review)),/Source publication not approved/);
    await db.exec("update jwl_internal.sources set publication_allowed=true where id='synthetic-official'");
    assert.equal((await db.query(mediaPublicationSql(review))).rows[0].published,candidate.candidate_id);
    const live=(await db.query('select media_state,images from public.jwl_catalog')).rows[0];
    assert.deepEqual(live,{media_state:'approved_media',images:bundle.approval.approved_images});

    // A tampered public object fails verification; a revoked grant closes the function for every file.
    const [firstPath]=[...objects.keys()];objects.set(firstPath,Buffer.from('RIFF0000WEBPtampered'));
    await assert.rejects(verifyPublishedDerivatives(bundle,fetcher),/differs from approved evidence/);
    await db.exec('update jwl_internal.media_grants set revoked_at=now()');
    assert.equal((await db.query(approvalQuery,[bundle.evidence[0].public_url,bundle.evidence[0].public_sha256])).rows.length,0);
    assert.match(productMediaBucketSql,/'jwl-product-media',true,15728640,array\['image\/webp'\]/);
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

test('the phased media runner needs a visual verification per original and a database receipt before any upload',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-media-run-'));
  const db=await database();
  try{
    const photo=join(root,'owner-photo.jpg');
    await sharp({create:{width:900,height:1100,channels:3,background:'#c8c0b0'}}).jpeg().toFile(photo);
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([candidate])]);
    await db.query("insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values($1,'owner_original','synthetic-official',$2,'[]'::jsonb,true,true,true,'synthetic private owner photo record')",[grant.grant_reference,candidate.candidate_id]);
    const row=(await db.query('select candidate_id,source_id,external_id,revision_hash,content from jwl_internal.candidates')).rows[0];
    const input={output_directory:join(root,'private'),candidate:row,grant,source:{id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true},
      originals:[{local_path:photo}],public_base_url:base,function_url:functionUrl};
    const kept=await mediaRun('originals',input);
    assert.equal(kept.verification_required,1);
    await assert.rejects(mediaRun('bundle',input),/exact original/,'no verification record, no derivatives');
    const partial={...verification({sha256:kept.originals[0].sha256}),checks:{exact_reference:true,color_and_variant:false,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
    await assert.rejects(mediaRun('bundle',{...input,verifications:[partial]}),/color_and_variant/);
    const bundled=await mediaRun('bundle',{...input,verifications:[verification({sha256:kept.originals[0].sha256})]});
    assert.equal(bundled.uploaded,0);assert(bundled.files>=2);
    const objects=new Map(),{fetcher}=deployed(db,objects);
    await assert.rejects(mediaRun('upload',{...input,approval_receipt:null},{fetcher}),/Recorded approval receipt required/);
    const receipt=(await db.query(await readFile(join(root,'private','record-approval.sql'),'utf8'))).rows[0].receipt;
    const report=await mediaRun('upload',{...input,approval_receipt:receipt},{fetcher});
    assert.equal(report.uploaded,bundled.files);assert.equal(report.verified,bundled.evidence_rows);assert.equal(report.published,0);
    assert.equal(objects.size,bundled.files);
    const other=normalizeBatch([{...candidate,external_id:'m999999-0001',source_url:'https://brand.example.test/watches/submariner/m999999-0001'}])[0];
    await assert.rejects(mediaRun('upload',{...input,candidate:{...row,candidate_id:other.candidate_id},approval_receipt:receipt},{fetcher}),/another candidate revision/);
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});
