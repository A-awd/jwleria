import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const sha=c=>c.repeat(64);
const images=['https://media.example.test/a/1600w.webp'];
const manifest=[{src:images[0],width:1600,height:2000,variants:[
  {src:'https://media.example.test/a/640w.webp',width:640,height:800,bytes:50000},
  {src:images[0],width:1600,height:2000,bytes:300000},
]}];
const row=(external_id,overrides={})=>normalizeBatch([{source_id:'test',external_id,source_url:'https://example.test/p/'+external_id,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+external_id,name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+external_id+'.png'],facts:[{key:'diameter',value:'41 mm'}],...overrides}])[0];

async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic-acquisition-review',true,false,true),('other','https://other.test','permitted-page','synthetic-acquisition-review',true,false,true)");
  return db;
}
const asService=async(db,fn)=>{await db.exec('set role service_role');try{return await fn();}finally{await db.exec('reset role');}};

test('missing-only intake inserts new candidates and never overwrites an existing revision',async()=>{
  const db=await database();
  try{
    const original=row('REF-1'),changed=row('REF-1',{facts:[{key:'diameter',value:'39 mm'}]}),fresh=row('REF-2');
    const ingest=records=>asService(db,()=>db.query('select public.jwl_ingest_missing_batch($1::jsonb) r',[JSON.stringify(records)])).then(x=>x.rows[0].r);
    assert.deepEqual(await ingest([original]),{received:1,inserted_ids:[original.candidate_id],skipped_existing_ids:[],published:0});
    const before=(await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[original.candidate_id])).rows[0];
    assert.deepEqual(await ingest([changed,fresh,fresh]),{received:3,inserted_ids:[fresh.candidate_id],skipped_existing_ids:[original.candidate_id,fresh.candidate_id],published:0});
    assert.deepEqual((await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[original.candidate_id])).rows[0],before);
    assert.equal((await db.query('select count(*)::int n from jwl_internal.candidate_revisions where candidate_id=$1',[original.candidate_id])).rows[0].n,1);
    await assert.rejects(ingest([{...row('REF-3'),source_id:'missing'}]),/acquisition not approved/);
    await assert.rejects(ingest([{...row('REF-4'),source_url:'https://other.test/p/REF-4'}]),/origin mismatch/);
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      await assert.rejects(db.query('select public.jwl_ingest_missing_batch($1::jsonb)',['[]']),/permission denied/);
      await db.exec('reset role');
    }
  }finally{await db.close();}
});

test('a media approval cites only files with exact private evidence; revoking the grant withdraws the product',async()=>{
  const db=await database();
  try{
    const c=row('REF-9');
    await asService(db,()=>db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]));
    const approve=(reference='grant-test-01',variants=manifest)=>asService(db,()=>db.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',[c.candidate_id,c.revision_hash,reference,JSON.stringify(images),JSON.stringify(variants)]));
    const grant=reference=>asService(db,()=>db.query(`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values($1,'written_permission','test','["https://example.test"]',true,true,true,'synthetic private evidence id')`,[reference]));
    const asset=(url,width,height,overrides={})=>{const v={candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:url,public_sha256:sha('b'),width,height,original_source:'https://example.test/img/REF-9.png',original_sha256:sha('a'),grant_reference:'grant-test-01',verified_reference:'REF-9',verification_reference:'synthetic visual check',...overrides};
      return asService(db,()=>db.query('insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',Object.values(v)));};

    await assert.rejects(approve(),/grant missing/i);
    await assert.rejects(asService(db,()=>db.exec("insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('no-resize','written_permission','test','[\"https://example.test\"]',true,false,true,'x')")),/check constraint/);
    await grant('grant-test-01');
    await assert.rejects(approve(),/lacks exact private evidence/);
    await asset('https://media.example.test/a/640w.webp',640,800);
    await assert.rejects(approve(),/lacks exact private evidence/,'every variant needs its own evidence');
    await asset(images[0],1600,2001);
    await assert.rejects(approve(),/dimensions differ/);
    await assert.rejects(approve('grant-test-01',[]),/Responsive variants required/);
    await grant('grant-other');
    await assert.rejects(approve('grant-other'),/lacks exact private evidence/,'evidence must cite the approving grant');

    // A clean second revision proves the exact-reference and dimension checks with full evidence.
    const db2=await database();
    try{
      await asService(db2,()=>db2.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]));
      await asService(db2,()=>db2.exec(`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('grant-test-01','written_permission','test','["https://example.test"]',true,true,true,'synthetic private evidence id')`));
      const add=(url,w,h,ref='REF-9')=>asService(db2,()=>db2.query('insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[c.candidate_id,c.revision_hash,url,sha('b'),w,h,'https://example.test/img/REF-9.png',sha('a'),'grant-test-01',ref,'synthetic visual check']));
      await add('https://media.example.test/a/640w.webp',640,800,'REF-OTHER');
      await add(images[0],1600,2000);
      const insertApproval=()=>asService(db2,()=>db2.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',[c.candidate_id,c.revision_hash,'grant-test-01',JSON.stringify(images),JSON.stringify(manifest)]));
      await assert.rejects(insertApproval(),/lacks exact private evidence/,'a different verified reference is rejected');
      await assert.rejects(asService(db2,()=>db2.exec("update jwl_internal.media_assets set verified_reference='REF-9'")),/permission denied/,'evidence is append-only');
      await assert.rejects(asService(db2,()=>db2.exec('delete from jwl_internal.media_assets')),/permission denied/);
      await asService(db2,()=>db2.query("insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,'https://media.example.test/a/640w-v2.webp',$3,640,800,$4,$5,'grant-test-01','REF-9','synthetic visual check')",[c.candidate_id,c.revision_hash,sha('c'),'https://example.test/img/REF-9.png',sha('a')]));
      const exact=[{...manifest[0],variants:[{...manifest[0].variants[0],src:'https://media.example.test/a/640w-v2.webp'},manifest[0].variants[1]]}];
      await asService(db2,()=>db2.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',[c.candidate_id,c.revision_hash,'grant-test-01',JSON.stringify(images),JSON.stringify(exact)]));
      // Source publication permission is still a separate gate.
      const product={slug:'test-watch-ref-9',reference:'REF-9',brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images,image_variants:exact,search_text:'ref-9'};
      const publish=()=>asService(db2,()=>db2.query('select public.jwl_publish_candidate($1,$2,$3::jsonb)',[c.candidate_id,c.revision_hash,JSON.stringify(product)]));
      await assert.rejects(publish(),/Source publication not approved/);
      await db2.exec("update jwl_internal.sources set publication_allowed=true where id='test'");
      await publish();
      assert.equal((await db2.query("select active,media_state from public.jwl_catalog where id=$1",[c.candidate_id])).rows[0].active,true);
      await assert.rejects(asService(db2,()=>db2.exec("update jwl_internal.media_grants set evidence_reference='changed'")),/permission denied/,'a grant cannot be rewritten');
      await asService(db2,()=>db2.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-test-01'"));
      assert.notEqual((await db2.query('select revoked_at from jwl_internal.publication_approvals')).rows[0].revoked_at,null);
      assert.equal((await db2.query("select active from public.jwl_catalog where id=$1",[c.candidate_id])).rows[0].active,false,'revocation withdraws the public product');
      for(const role of ['anon','authenticated']){
        await db2.exec('set role '+role);
        await assert.rejects(db2.query('select * from jwl_internal.media_assets'),/permission denied/);
        await assert.rejects(db2.query('select * from jwl_internal.media_grants'),/permission denied/);
        await db2.exec('reset role');
      }
    }finally{await db2.close();}
  }finally{await db.close();}
});

test('expired grants are swept and revoke dependent approvals',async()=>{
  const db=await database();
  try{
    await asService(db,()=>db.exec("insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference,expires_at) values('grant-expiring','written_permission','test','[\"https://example.test\"]',true,true,true,'synthetic',now()-interval '1 minute'),('grant-current','written_permission','test','[\"https://example.test\"]',true,true,true,'synthetic',null)"));
    assert.equal((await asService(db,()=>db.query('select public.jwl_expire_media_grants() n'))).rows[0].n,1);
    assert.deepEqual((await db.query('select grant_reference from jwl_internal.media_grants where revoked_at is not null')).rows,[{grant_reference:'grant-expiring'}]);
  }finally{await db.close();}
});
