import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const proposed=new URL('../supabase/proposed/jwleria_intake_runner.sql',import.meta.url);
const record=ref=>normalizeBatch([{source_id:'rolex-official',external_id:ref,source_url:'https://www.rolex.com/en-gb/watches/datejust/'+ref,brand:'Rolex',collection:'datejust',
  product_name:'Rolex Datejust 41 watch - '+ref,name_ar:'ساعة رولكس ديت جست، 41 مم',translation_state:'provided',image_urls:['https://media.example.test/'+ref+'.png'],facts:[{key:'diameter',value:'41 mm'}]}])[0];

async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec(await readFile(proposed,'utf8'));
  await db.exec(`insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled,min_interval_seconds) values
    ('rolex-official','https://www.rolex.com','permitted-page','synthetic acquisition review',true,false,true,2),
    ('iwc-schaffhausen-official','https://www.iwc.com','permitted-page','synthetic acquisition review',true,false,true,60),
    ('cartier-official','https://www.cartier.com','permitted-page','synthetic acquisition review',false,false,true,60)`);
  return db;
}
const runner=async(db,sql,params)=>{await db.exec('set role jwl_intake_runner');try{return (await db.query(sql,params)).rows[0];}finally{await db.exec('reset role');}};
const begin=(db,source,run)=>runner(db,'select jwl_internal.runner_begin($1,$2) g',[source,run]).then(r=>r.g);
const finish=(db,run,status,code=null)=>runner(db,'select jwl_internal.runner_finish($1,$2,$3) f',[run,status,code]).then(r=>r.f);

test('the runner role holds no table privilege and can act only through the runner functions',async()=>{
  const db=await database();
  try{
    await assert.rejects(runner(db,'select count(*) from jwl_internal.candidates'),/permission denied/);
    await assert.rejects(runner(db,'select count(*) from public.jwl_catalog where not active'),/permission denied/);
    await assert.rejects(runner(db,"update jwl_internal.sources set acquisition_allowed=true where id='cartier-official'"),/permission denied/);
    await assert.rejects(runner(db,'select public.jwl_publish_factual_batch($1::jsonb,$2)',['[]','x']),/permission denied/);
    assert.deepEqual(await begin(db,'cartier-official','run-0001:cartier'),{granted:false,reason:'registry_acquisition_not_allowed'});
  }finally{await db.close();}
});

test('per-origin locks, abandoned locks, review blocks and rate-limit deferrals are persisted and fail closed',async()=>{
  const db=await database();
  try{
    const first=await begin(db,'rolex-official','run-0001:rolex');
    assert.deepEqual(first,{granted:true,run_id:'run-0001:rolex',source_id:'rolex-official',origin:'https://www.rolex.com',min_interval_seconds:2});
    assert.equal((await begin(db,'rolex-official','run-0002:rolex')).reason,'origin_queue_already_running');
    assert.equal((await begin(db,'iwc-schaffhausen-official','run-0002:iwc')).granted,true,'another origin is independent');
    await assert.rejects(begin(db,'rolex-official','bad id'),/Invalid run id/);
    // A lock older than its window is closed as abandoned before a new run may start.
    await db.exec("update jwl_internal.intake_runs set started_at=now()-interval '3 hours' where run_id='run-0001:rolex'");
    assert.equal((await begin(db,'rolex-official','run-0003:rolex')).granted,true);
    assert.equal((await db.query("select status,error_code from jwl_internal.intake_runs where run_id='run-0001:rolex'")).rows[0].error_code,'abandoned_lock');
    assert.equal((await begin(db,'rolex-official','run-0003:rolex')).reason,'origin_queue_already_running');
    // A refusal blocks the origin until a reviewer records a clearance row.
    assert.equal((await finish(db,'run-0003:rolex','blocked','source_refused_access')).status,'blocked');
    assert.deepEqual(await finish(db,'run-0003:rolex','success'),{finished:false,reason:'run_not_running'});
    const blocked=await begin(db,'rolex-official','run-0004:rolex');
    assert.deepEqual([blocked.reason,blocked.blocked_reason],['source_review_required','source_refused_access']);
    await db.exec("insert into jwl_internal.intake_runs(run_id,source_id,status,finished_at,error_code) values('review-0001:rolex','rolex-official','success',now(),'review_cleared')");
    assert.equal((await begin(db,'rolex-official','run-0005:rolex')).granted,true);
    // A rate limit defers until the later of its not-before and fifteen minutes.
    const later=new Date(Date.now()+2*3600_000).toISOString();
    await finish(db,'run-0005:rolex','error','source_rate_limited@'+later);
    const deferred=await begin(db,'rolex-official','run-0006:rolex');
    assert.equal(deferred.reason,'source_rate_limited');assert.equal(new Date(deferred.not_before).toISOString(),later);
    await assert.rejects(finish(db,'run-0002:iwc','error','Bad Code!'),/Invalid run error code/);
    await assert.rejects(finish(db,'run-0002:iwc','blocked'),/needs its reason/);
    assert.deepEqual(await runner(db,'select jwl_internal.runner_close($1) c',['run-0002:iwc']).then(r=>r.c),{closed:1});
    assert.equal((await db.query("select error_code from jwl_internal.intake_runs where run_id='run-0002:iwc'")).rows[0].error_code,'incomplete_run');
    assert.equal((await begin(db,'rolex-official','run-0005:rolex')).reason,'run_id_reused');
  }finally{await db.close();}
});

test('identities and missing-only ingestion exist only inside a live run of the same source, and nothing is overwritten',async()=>{
  const db=await database();
  try{
    const existing=record('m100000-0001');
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([existing])]);
    const before=(await db.query('select revision_hash,content from jwl_internal.candidates')).rows;
    await begin(db,'rolex-official','run-0101:rolex');
    assert.deepEqual(await runner(db,'select jwl_internal.runner_identities($1) k',['run-0101:rolex']).then(r=>r.k),{source_id:'rolex-official',count:1,ids:['m100000-0001']});
    assert.equal(await runner(db,'select jwl_internal.runner_identities($1) k',['run-9999:none']).then(r=>r.k),null);
    const fresh=record('m200000-0001'),changed={...record('m100000-0001'),name_ar:'تغيير'};
    const receipt=await runner(db,'select jwl_internal.runner_ingest_missing($1,$2::jsonb) r',['run-0101:rolex',JSON.stringify([fresh,changed])]).then(r=>r.r);
    assert.deepEqual([receipt.inserted_ids,receipt.skipped_existing_ids],[[fresh.candidate_id],[existing.candidate_id]]);
    assert.deepEqual((await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[existing.candidate_id])).rows,before,'the existing revision is untouched');
    await assert.rejects(runner(db,'select jwl_internal.runner_ingest_missing($1,$2::jsonb)',['run-0101:rolex',JSON.stringify([{...fresh,source_id:'iwc-schaffhausen-official'}])]),/another source/);
    const done=await finish(db,'run-0101:rolex','success');
    assert.deepEqual([done.received,done.changed],[2,1]);
    await assert.rejects(runner(db,'select jwl_internal.runner_ingest_missing($1,$2::jsonb)',['run-0101:rolex',JSON.stringify([record('m300000-0001')])]),/live lock/);
    assert.equal((await db.query('select count(*)::int n from public.jwl_catalog')).rows[0].n,0,'the runner never publishes');
  }finally{await db.close();}
});

test('the expiry sweep revokes only lapsed grants and lists their files for cleanup',async()=>{
  const db=await database();
  try{
    await db.exec("insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference,expires_at) values('synthetic-lapsed','written_permission','rolex-official','[\"https://media.example.test\"]',true,true,true,'synthetic private record',now()-interval '1 day'),('synthetic-live','written_permission','rolex-official','[\"https://media.example.test\"]',true,true,true,'synthetic private record',null)");
    const sweep=await runner(db,'select jwl_internal.runner_expire_grants() s').then(r=>r.s);
    assert.deepEqual(sweep,{expired_grants:1,revoked_files:[]});
    const rows=(await db.query('select grant_reference,revoked_at is not null revoked from jwl_internal.media_grants order by 1')).rows;
    assert.deepEqual(rows,[{grant_reference:'synthetic-lapsed',revoked:true},{grant_reference:'synthetic-live',revoked:false}]);
    assert.equal((await runner(db,'select jwl_internal.runner_expire_grants() s').then(r=>r.s)).expired_grants,0,'idempotent');
  }finally{await db.close();}
});
