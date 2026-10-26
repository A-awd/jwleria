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
import {handleUpload,approvalQuery,webpSize,derivativeCacheSeconds} from '../supabase/functions/jwl-media-upload/handler.js';
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
    approved:async(...args)=>(await db.query(approvalQuery,args)).rows.length===1,
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
  let writes=0;const asked=[];
  const deps={public_base:base+'/',digest:async bytes=>sha(bytes),approved:async(url,h,...rest)=>{asked.push([url,h,...rest]);return approvedUrls.has(url+'#'+h);},
    put:async(p,bytes)=>{writes++;if(objects.has(p))return 'exists';objects.set(p,Buffer.from(bytes));return 'uploaded';},get:async p=>objects.get(p),max_bytes:1024*1024};
  const put=(body,{p=path,type='image/webp',method='PUT'}={})=>handleUpload(new Request(functionUrl,{method,headers:{'content-type':type,'x-jwl-path':p},body:method==='PUT'?body:undefined,duplex:'half'}),deps);
  assert.equal((await put(webp,{method:'POST'})).status,405);
  assert.equal((await put(webp,{p:'v1/../secret.webp'})).status,400);
  assert.equal((await put(webp,{type:'image/png'})).status,415);
  assert.equal((await put(Buffer.alloc(2*1024*1024))).status,413);
  assert.deepEqual(await (await put(Buffer.from('RIFF0000NOPE0000'))).json(),{error:'not_a_webp_file'});
  // A WebP header without a readable canvas is refused even when its checksum names the path.
  const headless=Buffer.concat([Buffer.from('RIFF\x16\0\0\0WEBPVP8L','latin1'),Buffer.alloc(18)]);
  assert.deepEqual(await (await put(headless,{p:`v1/${'a'.repeat(64)}/${'b'.repeat(64)}/320w-${sha(headless)}.webp`})).json(),{error:'not_a_webp_file'});
  const other=await sharp({create:{width:320,height:400,channels:3,background:'#444'}}).webp({lossless:true}).toBuffer();
  assert.deepEqual(await (await put(other)).json(),{error:'checksum_mismatch'});
  assert.equal((await put(webp)).status,403,'no recorded approval, no write');
  assert.deepEqual(asked.at(-1),[base+'/'+path,hash,webp.length,320,400],'the approval check sees the exact size and canvas');
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
    const first=bundle.approval.approved_image_variants[0].variants.find(v=>v.src===bundle.evidence[0].public_url);
    assert.equal((await db.query(approvalQuery,[first.src,bundle.evidence[0].public_sha256,first.bytes,first.width,first.height])).rows.length,0);
    assert.match(productMediaBucketSql,/'jwl-product-media',true,15728640,array\['image\/webp'\]/);
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

test('the bucket statement creates the public WebP bucket once and fails on an existing bucket with other settings',async()=>{
  const db=new PGlite();
  try{
    // The columns of Supabase's storage.buckets that the statement reads and writes.
    await db.exec('create schema storage; create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[])');
    const run=async()=>(await db.exec(productMediaBucketSql)).at(-1).rows;
    const expected=[{id:'jwl-product-media',public:true,file_size_limit:15728640,allowed_mime_types:['image/webp']}];
    const normal=rows=>rows.map(r=>({...r,file_size_limit:Number(r.file_size_limit)}));
    assert.deepEqual(normal(await run()),expected,'created');
    assert.deepEqual(normal(await run()),expected,'an identical bucket is accepted as is');
    for(const change of ['public=false','file_size_limit=52428800','file_size_limit=null',"allowed_mime_types=array['image/webp','image/png']",'allowed_mime_types=null']){
      await db.exec(`update storage.buckets set ${change}`);
      await assert.rejects(run(),/bucket settings differ/,change);
      await db.exec("update storage.buckets set public=true,file_size_limit=15728640,allowed_mime_types=array['image/webp']");
    }
    assert.equal((await db.query('select count(*)::integer n from storage.buckets')).rows[0].n,1);
  }finally{await db.close();}
});

test('the function caches public derivatives for one day, never a year, so revoked files stop being served soon',async()=>{
  assert.equal(derivativeCacheSeconds,86400);
  const entry=await readFile(new URL('../supabase/functions/jwl-media-upload/index.ts',import.meta.url),'utf8');
  assert.match(entry,/cacheControl:String\(derivativeCacheSeconds\)/);
  assert.doesNotMatch(entry,/31536000/);
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

test('the canvas size is read from every WebP container sharp writes, and anything else is refused',async()=>{
  const jpeg=await sharp({create:{width:1203,height:1501,channels:3,background:'#d0c8b8'}}).jpeg().toBuffer();
  const files=[
    await sharp(jpeg).resize({width:641}).webp({lossless:true}).toBuffer(),
    await sharp(jpeg).webp().toBuffer(),
    await sharp(await sharp(jpeg).withIccProfile('srgb').jpeg().toBuffer()).resize({width:333}).keepIccProfile().webp({lossless:true}).toBuffer(),
    await sharp({create:{width:16383,height:3,channels:3,background:'#000'}}).webp({lossless:true}).toBuffer(),
  ];
  assert.deepEqual(files.map(b=>b.subarray(12,16).toString('latin1')),['VP8L','VP8 ','VP8X','VP8L']);
  for(const bytes of files){const m=await sharp(bytes).metadata();assert.deepEqual(webpSize(bytes),{width:m.width,height:m.height});}
  const vp8l=Buffer.from(files[0]);
  for(const bad of [Buffer.from('RIFF0000WEBPVP8L'),Buffer.concat([vp8l.subarray(0,12),Buffer.from('ALPH'),vp8l.subarray(16)]),Buffer.concat([vp8l.subarray(0,20),Buffer.from([0]),vp8l.subarray(21)]),Buffer.concat([Buffer.from('RIFX'),vp8l.subarray(4)])])
    assert.equal(webpSize(bad),null);
});

test('an upload is open only for a file the current revision\'s live approval cites with its exact size and canvas under its own grant',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-upload-bind-'));
  const db=await database();
  try{
    const photo=join(root,'owner-photo.jpg');
    await sharp({create:{width:1000,height:1250,channels:3,background:'#b8b0a0'}}).jpeg().toFile(photo);
    const original=await keepOwnerOriginal({candidate,grant,local_path:photo,output_directory:join(root,'private')});
    const asset={path:original.path,source_url:original.source_url,sha256:original.sha256};
    const prepared=await prepareGrantedMedia({source:{id:'synthetic-official',origin:'https://brand.example.test',publication_allowed:true},candidate,asset,grant,output_directory:join(root,'private')});
    const bundle=approvalBundle({candidate,grant,items:[{asset,manifest:prepared.manifest,verification:verification(original)}],public_base_url:base});
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([candidate])]);
    const recordGrant=reference=>db.query("insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values($1,'owner_original','synthetic-official',$2,'[]'::jsonb,true,true,true,'synthetic private owner photo record')",[reference,candidate.candidate_id]);
    await recordGrant(grant.grant_reference);await recordGrant('synthetic-owner-02');
    const files=bundle.approval.approved_image_variants[0].variants;
    const open=(url,hash,bytes,width,height)=>db.query(approvalQuery,[url,hash,bytes,width,height]).then(r=>r.rows.length===1);
    const cited=v=>[v.src,bundle.evidence.find(e=>e.public_url===v.src).public_sha256,v.bytes,v.width,v.height];
    assert.equal(await open(...cited(files[0])),false,'nothing is open before the approval is recorded');

    // Recording the approval together with one extra evidence row the approval never cites.
    const sneaked=`${base}/v1/${'c'.repeat(64)}/${'d'.repeat(64)}/400w-${'e'.repeat(64)}.webp`;
    const extra={...bundle.evidence[0],public_url:sneaked,public_sha256:'e'.repeat(64),width:400,height:10};
    await db.query('select public.jwl_record_media_approval($1::jsonb,$2::jsonb)',[JSON.stringify([...bundle.evidence,extra]),JSON.stringify(bundle.approval)]);
    for(const v of files)assert.equal(await open(...cited(v)),true,v.src);
    const [url,hash,bytes,width,height]=cited(files[0]);
    assert.equal(await open(url,hash,bytes+1,width,height),false,'byte size must match the approval');
    assert.equal(await open(url,hash,bytes,width+1,height),false,'width must match the evidence and approval');
    assert.equal(await open(url,hash,bytes,width,height-1),false,'height must match the evidence and approval');
    assert.equal(await open(url,'0'.repeat(64),bytes,width,height),false);
    assert.equal(await open(sneaked,'e'.repeat(64),1,400,10),false,'uncited evidence never opens an upload');

    // Evidence under another live grant, cited by this approval: a state the triggers refuse, built here as only a
    // superuser could. A control file under the approval's own grant in the same state stays open.
    const slot=(i,grantReference,c)=>{const v=files[i],src=`${base}/v1/${'c'.repeat(64)}/${'d'.repeat(64)}/${v.width}w-${c.repeat(64)}.webp`;
      return {src,hash:c.repeat(64),width:v.width,height:v.height,bytes:9,grantReference,index:i};};
    const foreign=slot(0,'synthetic-owner-02','f'),own=slot(1,grant.grant_reference,'a');
    await db.exec('set session_replication_role=replica');
    for(const f of [foreign,own]){
      await db.query('insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [candidate.candidate_id,candidate.revision_hash,f.src,f.hash,f.width,f.height,original.source_url,original.sha256,f.grantReference,candidate.external_id,'synthetic visual check record']);
      await db.query('update jwl_internal.publication_approvals set approved_image_variants=jsonb_set(approved_image_variants,$1::text[],$2::jsonb)',[['0','variants',String(f.index)],JSON.stringify({src:f.src,width:f.width,height:f.height,bytes:f.bytes})]);
    }
    await db.exec('set session_replication_role=origin');
    assert.equal(await open(own.src,own.hash,own.bytes,own.width,own.height),true,'control: same state, the approval\'s own grant');
    assert.equal(await open(foreign.src,foreign.hash,foreign.bytes,foreign.width,foreign.height),false,'a file recorded under another grant is not opened by this approval');

    // The grant itself must be live, even where its approval row was left unrevoked (the cascade bypassed as above).
    const kept=cited(files[2]);
    const grantState=async change=>{await db.exec('set session_replication_role=replica');await db.query(`update jwl_internal.media_grants set ${change} where grant_reference=$1`,[grant.grant_reference]);await db.exec('set session_replication_role=origin');};
    await grantState('revoked_at=now()');
    assert.equal((await db.query('select count(*)::integer as live from jwl_internal.publication_approvals where revoked_at is null')).rows[0].live,1);
    assert.equal(await open(...kept),false,'a revoked grant closes uploads even while its approval row is unrevoked');
    await grantState("revoked_at=null,expires_at=now()+interval '30 days'");
    assert.equal(await open(...kept),false,'an expiring grant stays refused until a reviewed expiry sweep exists');
    await grantState("expires_at=now()-interval '1 day'");
    assert.equal(await open(...kept),false,'an expired grant');
    await grantState('expires_at=null');
    assert.equal(await open(...kept),true,'control: the same grant, live again');

    // The grant must still cover this product and source, and the evidence must name this exact reference.
    const sibling=normalizeBatch([{...candidate,external_id:'m126610ln-0002',source_url:'https://brand.example.test/watches/submariner/m126610ln-0002'}])[0];
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([sibling])]);
    await grantState(`candidate_id='${sibling.candidate_id}'`);
    assert.equal(await open(...kept),false,'a grant scoped to another product');
    await grantState(`candidate_id='${candidate.candidate_id}',source_id=null`);
    assert.equal(await open(...kept),true,'control: a grant without a source scope that names this exact product');
    await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('synthetic-other','https://other.example.test','permitted-page','synthetic acquisition review',true,false,true)");
    await grantState("source_id='synthetic-other'");
    assert.equal(await open(...kept),false,'a grant scoped to another source');
    await grantState("source_id='synthetic-official'");
    await db.query('update jwl_internal.media_assets set verified_reference=$2 where public_url=$1',[kept[0],sibling.external_id]);
    assert.equal(await open(...kept),false,'evidence verified against another reference');
    await db.query('update jwl_internal.media_assets set verified_reference=$2 where public_url=$1',[kept[0],candidate.external_id]);
    assert.equal(await open(...kept),true,'control: the exact reference again');
    await db.query('update jwl_internal.media_assets set width=width+1 where public_url=$1',[kept[0]]);
    assert.equal(await open(...kept),false,'evidence whose recorded canvas differs from the approval');
    await db.query('update jwl_internal.media_assets set width=width-1 where public_url=$1',[kept[0]]);
    assert.equal(await open(...kept),true,'control: the recorded canvas again');

    // The handler passes the uploaded file's own size and canvas; a superseded revision closes every file.
    const objects=new Map(),{deps}=deployed(db,objects);
    const prepared0=bundle.uploads.find(u=>u.path===files[2].src.slice(base.length+1));
    const body=await readFile(join(root,'private',prepared0.path));
    const put=()=>handleUpload(new Request(functionUrl,{method:'PUT',headers:{'content-type':'image/webp','x-jwl-path':prepared0.path},body,duplex:'half'}),deps);
    assert.equal((await put()).status,201);
    const next=normalizeBatch([{...candidate,facts:[{key:'diameter',value:'40 mm'}]}])[0];
    assert.notEqual(next.revision_hash,candidate.revision_hash);
    await db.query('insert into jwl_internal.candidate_revisions(candidate_id,revision_hash,content) select candidate_id,$2,content from jwl_internal.candidates where candidate_id=$1',[candidate.candidate_id,next.revision_hash]);
    await db.query('update jwl_internal.candidates set revision_hash=$2 where candidate_id=$1',[candidate.candidate_id,next.revision_hash]);
    assert.equal((await db.query('select revoked_at from jwl_internal.publication_approvals')).rows[0].revoked_at,null,'the old approval itself stays unrevoked');
    for(const v of files)assert.equal(await open(...cited(v)),false,'superseded revision: '+v.src);
    objects.clear();
    assert.deepEqual([(await put()).status,objects.size],[403,0]);
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});
