import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

// Synthetic fixtures only. Decision 0025: the owner_directed_official grant kind (proposed migration) runs in memory
// after every applied migration; nothing reaches a real database.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const FORWARD=new URL('../supabase/proposed/jwleria_owner_directed_official.sql',import.meta.url);
const ROLLBACK=new URL('../supabase/proposed/jwleria_owner_directed_official.rollback.sql',import.meta.url);
const OLD_REF='Owner instruction 2026-10-04 to collect official public product facts privately; robots checked 2026-10-04 allows these product paths. This is not a brand media license.';
const sha=c=>c.repeat(64);
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&!f.endsWith('_jwleria_owner_directed_official.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('longchamp-official','https://www.longchamp.com','permitted-page',$1,true,false,true)",[OLD_REF]);
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('cartier-official','https://www.cartier.com','permitted-page','synthetic',false,false,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'sources',(select jsonb_agg(to_jsonb(s) order by id) from jwl_internal.sources s),
  'grants',(select coalesce(jsonb_agg(to_jsonb(g) order by grant_reference),'[]') from jwl_internal.media_grants g)) s`).then(r=>r.rows[0].s);
let n=0;
async function product(db){
  const ref='10'+(100+(++n))+'HSR001';
  const c=normalizeBatch([{source_id:'longchamp-official',external_id:ref,source_url:'https://www.longchamp.com/p/'+ref+'.html',brand:'Longchamp',collection:'Test bag',product_name:'Test bag '+ref,
    name_ar:'حقيبة اختبار',translation_state:'provided',image_urls:['https://www.longchamp.com/img/'+ref+'_HCS.png'],facts:[{key:'color',value:'Black'}]}])[0];
  await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
  return c;
}
const GRANT='owner-directed-longchamp-0025';
function image(c,{chars='def',master=null,original=null}={}){
  const variants=[320,640,1200].map((w,i)=>({src:`https://media.example.test/v1/${sha('9')}/${sha('a')}/${w}w-${sha(chars[i])}.webp`,width:w,height:w,bytes:30000+i}));
  const entry={src:variants[2].src,width:1200,height:1200,variants,canvas:'flat_tile'};
  const evidence=variants.map(v=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,
    original_source:original??c.image_urls[0],original_sha256:sha('a'),grant_reference:GRANT,verified_reference:c.external_id,verification_reference:'synthetic identity check',
    treatment:'flat_tile',treatment_version:1,cutout_master_sha256:master,treatment_reference:'synthetic flat tile review',square_sha256:sha('c'),source_clipped:false}));
  return {entry,evidence};
}
const approve=(db,c,img)=>service(db,'select public.jwl_record_presentation_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(img.evidence),
  JSON.stringify({candidate_id:c.candidate_id,revision_hash:c.revision_hash,media_reference:GRANT,image_verified:true,approved_images:[img.entry.src],approved_image_variants:[img.entry]})]);

test('decision 0025: the migration applies, scopes only Longchamp, and its rollback restores the schema and rows exactly',async()=>{
  const db=await database();
  try{
    const before=await snapshot(db);
    await db.exec(await readFile(FORWARD,'utf8'));
    const after=await snapshot(db);
    assert.equal(after.sources.find(s=>s.id==='longchamp-official').publication_allowed,true);
    assert.equal(after.sources.find(s=>s.id==='cartier-official').publication_allowed,false,'no other source changes');
    assert.deepEqual(after.grants.map(g=>[g.grant_reference,g.kind,g.evidence_reference,g.candidate_id]),[[GRANT,'owner_directed_official','decision-0025',null]]);
    await db.exec(await readFile(ROLLBACK,'utf8'));
    assert.deepEqual(await snapshot(db),before);
  }finally{await db.close();}
});

test('decision 0025: a drifted Longchamp source row refuses the migration',async()=>{
  const db=await database();
  try{
    await db.exec("update jwl_internal.sources set permission_reference='changed' where id='longchamp-official'");
    await assert.rejects(db.exec(await readFile(FORWARD,'utf8')),/differs from the reviewed state/);
  }finally{await db.close();}
});

test('decision 0025: an exact official gallery file is approved as a native-alpha flat tile; other files, sources and labels are refused',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);
    assert.equal((await approve(db,c,image(c))).rows[0].r.evidence_rows,3);
    const d=await product(db);
    await assert.rejects(approve(db,d,image(d,{chars:'123',original:'https://www.longchamp.com/img/other.png'})),/exact candidate gallery/);
    await assert.rejects(service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference)
      values('odo-cartier','owner_directed_official','cartier-official','["https://www.cartier.com"]'::jsonb,true,true,true,'decision-0025')`),/owner_directed_official_check/,'closed lanes stay closed');
    await assert.rejects(service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference)
      values('odo-other','owner_directed_official','longchamp-official','["https://www.longchamp.com"]'::jsonb,true,true,true,'brand licence')`),/owner_directed_official_check/,'only decision 0025 is its basis');
    await assert.rejects(service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference,background_removal)
      values('owner-bg','owner_original','longchamp-official','[]'::jsonb,true,true,true,'x',true)`),/background_removal_check|violates/);
    await assert.rejects(db.exec(await readFile(ROLLBACK,'utf8')),/in use/,'rollback refuses while approvals cite the kind');
  }finally{await db.close();}
});

test('decision 0025: the batch publish statement puts each approval onto its existing facts row, server side',async()=>{
  const {batchPublishSql}=await import('../../../scripts/catalog-intake/batch-official.mjs');
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);
    await service(db,'select public.jwl_publish_factual_batch($1::jsonb,$2) r',[JSON.stringify([{candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,
      brand_slug:'longchamp',brand_name:c.brand,brand_tier:'luxury',category_slug:'handbags',collection_slug:'test-bag',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,
      description_ar:c.description_ar,description_en:c.description_en,search_text:c.external_id.toLowerCase()}]),'synthetic facts-only instruction']);
    const img=image(c,{chars:'ef1'});await approve(db,c,img);
    const rows=(await service(db,batchPublishSql([c.candidate_id]))).rows;
    assert.deepEqual(rows.map(r=>r.published),[c.candidate_id]);
    const k=(await db.query('select images,image_variants,media_state,active,search_text from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0];
    assert.deepEqual(k.images,[img.entry.src]);assert.equal(k.media_state,'approved_media');assert.equal(k.active,true);assert.equal(k.search_text,c.external_id.toLowerCase());
  }finally{await db.close();}
});

test('decision 0025: a cutout master needs the recorded background-only extraction',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    await db.exec(`update jwl_internal.media_grants set background_removal=false where grant_reference='${GRANT}'`);
    const c=await product(db);
    await assert.rejects(approve(db,c,image(c,{chars:'456',master:sha('b')})),/does not record background removal/);
    assert.ok(await approve(db,c,image(c,{chars:'789'})),'a native-alpha tile needs no extraction');
  }finally{await db.close();}
});
