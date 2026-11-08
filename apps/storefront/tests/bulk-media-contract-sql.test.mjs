import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

// Synthetic fixtures only. The proposed bulk media contract (gaps G2, G3, G4) runs in memory after every applied
// migration; nothing reaches a real database and nothing is scheduled.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const FORWARD=new URL('../supabase/proposed/jwleria_bulk_media_contract.sql',import.meta.url);
const ROLLBACK=new URL('../supabase/proposed/jwleria_bulk_media_contract.rollback.sql',import.meta.url);
const sha=c=>c.repeat(64);
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'columns',(select jsonb_agg(table_name||'.'||column_name||':'||data_type||':'||ordinal_position order by table_name,ordinal_position) from information_schema.columns where table_schema in ('jwl_internal','public'))) s`).then(r=>r.rows[0].s);
let n=0;
async function product(db){
  const ref='SYN'+(++n)+'00S001';
  const c=normalizeBatch([{source_id:'test',external_id:ref,source_url:'https://example.test/p/'+ref,brand:'Test brand',collection:'Test bag',product_name:'Test bag '+ref,
    name_ar:'حقيبة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+ref+'.png'],facts:[{key:'color',value:'Black'}]}])[0];
  await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
  return c;
}
const grant=(db,reference,{credit=null,url=null,expires=null,removal=false}={})=>service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference,background_removal,required_credit,required_credit_url,expires_at)
  values($1,'written_permission','test','["https://example.test"]'::jsonb,true,true,true,'synthetic permission record',$2,$3,$4,$5)`,[reference,removal,credit,url,expires]);
function image(c,reference,{chars='def',tile=false,extra={}}){
  const side=1200;
  const variants=[320,640,side].map((w,i)=>({src:`https://media.example.test/v1/${sha('9')}/${sha('a')}/${w}w-${sha(chars[i])}.webp`,width:w,height:w,bytes:30000+i}));
  const entry={src:variants[2].src,width:side,height:side,variants,...(tile?{canvas:'flat_tile'}:{}),...extra};
  const evidence=variants.map(v=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,
    original_source:c.image_urls[0],original_sha256:sha('a'),grant_reference:reference,verified_reference:c.external_id,verification_reference:'synthetic identity check',
    ...(tile?{treatment:'flat_tile',treatment_version:1,cutout_master_sha256:null,treatment_reference:'synthetic flat tile review',square_sha256:sha('c'),source_clipped:false}:{})}));
  return {entry,evidence};
}
const approve=(db,c,reference,img)=>service(db,'select public.jwl_record_presentation_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(img.evidence),
  JSON.stringify({candidate_id:c.candidate_id,revision_hash:c.revision_hash,media_reference:reference,image_verified:true,approved_images:[img.entry.src],approved_image_variants:[img.entry]})]);

test('the contract applies over the live schema and its rollback restores it exactly, refusing while anything depends on it',async()=>{
  const db=await database();
  try{
    const before=await snapshot(db);
    await db.exec(await readFile(FORWARD,'utf8'));
    await db.exec(await readFile(ROLLBACK,'utf8'));
    assert.deepEqual(await snapshot(db),before);
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);await grant(db,'grant-rb');await approve(db,c,'grant-rb',image(c,'grant-rb',{tile:true}));
    await assert.rejects(db.exec(await readFile(ROLLBACK,'utf8')),/rollback refused/);
  }finally{await db.close();}
});

test('G2: a native-alpha flat tile is recorded under written permission; clipped, mislabelled or open-licence tiles are refused',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);await grant(db,'grant-tile');
    assert.equal((await approve(db,c,'grant-tile',image(c,'grant-tile',{tile:true}))).rows[0].r.evidence_rows,3,'no cutout master and no background-removal permission are needed');
    const d=await product(db);await grant(db,'grant-tile-2');
    await assert.rejects(approve(db,d,'grant-tile-2',image(d,'grant-tile-2',{tile:true,chars:'456',extra:{source_clipped:true}})),/never clipped/);
    await assert.rejects(approve(db,d,'grant-tile-2',image(d,'grant-tile-2',{tile:true,chars:'789',extra:{canvas:'white_square'}})),/white square canvas/);
    const e=image(d,'grant-tile-2',{tile:true,chars:'123'});e.evidence=e.evidence.map(x=>({...x,source_clipped:true}));
    await assert.rejects(approve(db,d,'grant-tile-2',e),/treatment_check/);
  }finally{await db.close();}
});

test('G3: a required written-permission credit is carried verbatim on every image and nowhere else',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    await assert.rejects(service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,required_credit)
      values('grant-owner-credit','owner_original','test',null,'[]'::jsonb,true,true,true,'x','Photo credit')`),/required_credit_check|violates/);
    const c=await product(db);await grant(db,'grant-credit',{credit:'Synthetic Brand photograph',url:'https://example.test/p/press'});
    await assert.rejects(approve(db,c,'grant-credit',image(c,'grant-credit',{})),/requires its credit/);
    await assert.rejects(approve(db,c,'grant-credit',image(c,'grant-credit',{chars:'234',extra:{permission_credit:{text:'Another credit',url:'https://example.test/p/press'}}})),/exactly the credit/);
    assert.ok(await approve(db,c,'grant-credit',image(c,'grant-credit',{chars:'567',extra:{permission_credit:{text:'Synthetic Brand photograph',url:'https://example.test/p/press'}}})));
    const d=await product(db);await grant(db,'grant-plain');
    await assert.rejects(approve(db,d,'grant-plain',image(d,'grant-plain',{chars:'89a',extra:{permission_credit:{text:'Unrequired'}}})),/exactly the credit/);
  }finally{await db.close();}
});

test('G4: an expiring grant stays refused without a scheduled sweep; with one it is usable until the lead, and the sweep withdraws it',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);await grant(db,'grant-exp',{expires:new Date(Date.now()+30*86400e3).toISOString()});
    await assert.rejects(approve(db,c,'grant-exp',image(c,'grant-exp',{})),/scheduled expiry sweep/,'fail closed while nothing is scheduled');
    // A stand-in for pg_cron's job table, as the operator's approved schedule would create it.
    await db.exec("create schema cron; create table cron.job(jobid serial, schedule text, command text, active boolean); insert into cron.job(schedule,command,active) values('*/15 * * * *','select public.jwl_expire_media_grants()',true)");
    assert.ok(await approve(db,c,'grant-exp',image(c,'grant-exp',{chars:'bcd'})));
    const d=await product(db);await grant(db,'grant-soon',{expires:new Date(Date.now()+3600e3).toISOString()});
    await assert.rejects(approve(db,d,'grant-soon',image(d,'grant-soon',{chars:'cde'})),/scheduled expiry sweep/,'within the 25-hour lead');
    const swept=(await service(db,'select public.jwl_expire_media_grants() s')).rows[0].s;
    assert.deepEqual(swept.revoked,['grant-soon']);
    const later=(await service(db,"select public.jwl_expire_media_grants(now()+interval '40 days') s")).rows[0].s;
    assert.deepEqual(later.revoked,['grant-exp']);
    assert.equal((await db.query("select count(*)::int n from jwl_internal.publication_approvals where media_reference='grant-exp' and revoked_at is null")).rows[0].n,0,'revocation cascades to its approval');
  }finally{await db.close();}
});
