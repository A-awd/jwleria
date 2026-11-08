import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {openLicenseDecisions} from '../../../scripts/catalog-intake/media-pipeline.mjs';

// Synthetic fixtures only; the batch migration (applied as 20261101112338) runs in memory here and is applied nowhere by
// this test.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const BATCH='20261101112338_jwleria_verified_photo_batch_1.sql';
const batch=new URL(BATCH,migrations);
const rollback=new URL('../supabase/proposed/jwleria_verified_photo_batch_1.rollback.sql',import.meta.url);
const D16='decisions/0016-verified-open-licence-photo-batches.md';
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&!f.endsWith('_jwleria_bulk_media_contract.sql')&&f!==BATCH&&f!=='20261101181522_jwleria_white_square_media.sql').sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
const row=ref=>normalizeBatch([{source_id:'test',external_id:ref,source_url:'https://example.test/p/'+ref,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+ref,
  name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+ref+'.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
const md5=name=>import('node:crypto').then(({createHash})=>createHash('md5').update(name).digest('hex'));
const LICENCES={'CC-BY-SA-4.0':['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],'CC-BY-2.0':['CC BY 2.0','https://creativecommons.org/licenses/by/2.0/']};
const fileOf=async c=>{const name='Synthetic_batch_watch_'+c.external_id+'.jpg',h=await md5(name);
  return {source_page_url:'https://commons.wikimedia.org/wiki/File:'+name,file_url:`https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0,2)}/${name}`,file_kind:'original',rendition_width:null,title:null};};
async function grant(db,c,reference,{license='CC-BY-SA-4.0',review=null}={}){
  const columns='grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference';
  const values=`$1,'open_license','test',$2,'[]'::jsonb,true,true,true,'synthetic licence review',$5,$6,'Synthetic Photographer',$3::jsonb,'Synthetic Photographer via Wikimedia Commons',$4`;
  const params=[reference,c.candidate_id,JSON.stringify([await fileOf(c)]),D16,license,LICENCES[license][1]];
  return review===null?service(db,`insert into jwl_internal.media_grants(${columns}) values(${values})`,params)
    :service(db,`insert into jwl_internal.media_grants(${columns},share_alike_review) values(${values},$7)`,[...params,review]);
}
const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'columns',(select jsonb_agg(table_name||'.'||column_name||':'||data_type||':'||ordinal_position order by table_name,ordinal_position) from information_schema.columns where table_schema in ('jwl_internal','public')),
  'triggers',(select jsonb_agg(tgrelid::regclass::text||'.'||tgname order by tgrelid::regclass::text,tgname) from pg_trigger where not tgisinternal)) s`).then(r=>r.rows[0].s);

test('batch 1 pins decision 0016 for m126200-0006 alone, exactly as the pipeline does, and its rollback is exact',async()=>{
  const db=await database();
  try{
    const exact=row('m126200-0006'),sibling=row('m126200-0005');await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([exact,sibling])]);
    const before=await snapshot(db);
    await assert.rejects(grant(db,exact,'grant-before'),/check constraint/,'before the batch migration, decision 0016 cannot be cited');
    await db.exec(await readFile(batch,'utf8'));
    assert.deepEqual((await service(db,'select jwl_internal.open_license_decisions() d')).rows[0].d,JSON.parse(JSON.stringify(openLicenseDecisions)),'the SQL and JS lists are the same');
    await assert.rejects(grant(db,sibling,'grant-sibling'),/does not cover this reference/,'a sibling reference is not covered');
    await db.exec(await readFile(rollback,'utf8'));
    assert.deepEqual(await snapshot(db),before,'the rollback restores every function, privilege, constraint, column and trigger');
    await db.exec(await readFile(batch,'utf8'));
    await grant(db,exact,'grant-exact');
    await assert.rejects(db.exec(await readFile(rollback,'utf8')),/rollback refused/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from jwl_internal.media_grants where owner_decision_reference=$1',[D16])).rows[0].n,1,'a refused rollback changes nothing');
  }finally{await db.close();}
});

test('a CC BY-SA cutout needs the grant\'s recorded ShareAlike review; a review is refused on any other grant',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(batch,'utf8'));
    const c=row('m126200-0006');await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
    await assert.rejects(grant(db,c,'grant-by-review',{license:'CC-BY-2.0',review:'synthetic review'}),/jwl_media_grant_share_alike_review_check/,'only a CC BY-SA grant records one');
    await assert.rejects(grant(db,c,'grant-blank-review',{review:'\u00a0'}),/jwl_media_grant_share_alike_review_check/,'a blank review is refused');
    // Without a review: a cutout approval is refused, with the same licence.
    await grant(db,c,'grant-no-review');
    const file=await fileOf(c),sha=ch=>ch.repeat(64);
    const src=(w,ch)=>`https://media.example.test/v1/${sha('d')}/${sha('a')}/${w}w-${sha(ch)}.webp`;
    const entry=(chars,ref)=>({src:src(960,chars[2]),width:960,height:720,variants:[320,640,960].map((w,i)=>({src:src(w,chars[i]),width:w,height:w*3/4,bytes:40000+i})),
      attribution:{creator:'Synthetic Photographer',license:'CC BY-SA 4.0',license_url:LICENCES['CC-BY-SA-4.0'][1],source_url:file.source_page_url,changes:'background removed, resized and converted to WebP'}});
    const evidence=async(e,ref)=>{for(const v of e.variants)await service(db,`insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference,treatment,treatment_version,cutout_master_sha256,treatment_reference)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'synthetic identity check','background_removal',1,$11,'synthetic cutout review')`,[c.candidate_id,c.revision_hash,v.src,v.src.match(/-([a-f0-9]{64})\.webp$/)[1],v.width,v.height,file.file_url,sha('a'),ref,c.external_id,sha('f')]);};
    const approve=(e,ref)=>service(db,'insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',[c.candidate_id,c.revision_hash,ref,JSON.stringify([e.src]),JSON.stringify([e])]);
    const plainGrantCut=entry('123');await evidence(plainGrantCut,'grant-no-review');
    await assert.rejects(approve(plainGrantCut,'grant-no-review'),/needs a licence review first/);
    // With the recorded review the same kind of cutout is accepted.
    const d=row('m126200-0005');await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([d])]);
    await db.exec(`create or replace function jwl_internal.open_license_decisions() returns jsonb language sql immutable security invoker set search_path='' as $$ select '{"decisions/0013-open-licence-exact-product-photos.md":{"references":["m126234-0015"]},"${D16}":{"references":["m126200-0006"]}}'::jsonb $$`);
    await service(db,'update jwl_internal.media_grants set revoked_at=now() where grant_reference=$1',['grant-no-review']);
    await grant(db,c,'grant-with-review',{review:'synthetic ShareAlike review: the cutout is offered under CC BY-SA 4.0, linked in its credit'});
    const reviewed=entry('456');await evidence(reviewed,'grant-with-review');
    await approve(reviewed,'grant-with-review');
    assert.equal((await db.query("select count(*)::int n from jwl_internal.publication_approvals where media_reference='grant-with-review' and image_verified and revoked_at is null")).rows[0].n,1);
  }finally{await db.close();}
});
