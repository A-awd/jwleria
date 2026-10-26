import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const sha=c=>c.repeat(64);
const file=(width,c)=>`https://media.example.test/v1/${sha('d')}/${sha('a')}/${width}w-${sha(c)}.webp`;
const images=[file(1600,'e')];
const manifest=[{src:images[0],width:1600,height:2000,variants:[
  {src:file(640,'b'),width:640,height:800,bytes:50000},
  {src:images[0],width:1600,height:2000,bytes:300000},
]}];
const row=(external_id,overrides={})=>normalizeBatch([{source_id:'test',external_id,source_url:'https://example.test/p/'+external_id,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+external_id,name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+external_id+'.png'],facts:[{key:'diameter',value:'41 mm'}],...overrides}])[0];

async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic-acquisition-review',true,false,true),('cartier-official','https://www.cartier.com','permitted-page','synthetic',false,false,true)");
  return db;
}
const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};
const service=(db,sql,params)=>as(db,'service_role',()=>db.query(sql,params));
const grant=(db,reference,{kind='written_permission',source='test',candidate=null,origins='["https://example.test"]',expires=null}={})=>service(db,
  'insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,expires_at) values($1,$2,$3,$4,$5::jsonb,true,true,true,$6,$7)',
  [reference,kind,source,candidate,origins,'synthetic private evidence id',expires]);
const asset=(db,c,url,width,height,extra={})=>{
  const v={public_sha256:url.match(/-([a-f0-9]{64})\.webp$/)?.[1]??sha('f'),original_source:'https://example.test/img/'+c.external_id+'.png',original_sha256:sha('a'),grant_reference:'grant-test-01',verified_reference:c.external_id,verification_reference:'synthetic visual check',...extra};
  return service(db,'insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [c.candidate_id,c.revision_hash,url,v.public_sha256,width,height,v.original_source,v.original_sha256,v.grant_reference,v.verified_reference,v.verification_reference]);
};
const approve=(db,c,reference='grant-test-01',variants=manifest)=>service(db,'insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',
  [c.candidate_id,c.revision_hash,reference,JSON.stringify(variants.map(e=>e.src)),JSON.stringify(variants)]);
const ingest=(db,records)=>service(db,'select public.jwl_ingest_missing_batch($1::jsonb) r',[JSON.stringify(records)]).then(x=>x.rows[0].r);

test('missing-only intake inserts new candidates and never overwrites an existing revision',async()=>{
  const db=await database();
  try{
    const original=row('REF-1'),changed=row('REF-1',{facts:[{key:'diameter',value:'39 mm'}]}),fresh=row('REF-2');
    assert.deepEqual(await ingest(db,[original]),{received:1,inserted_ids:[original.candidate_id],skipped_existing_ids:[],published:0});
    const before=(await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[original.candidate_id])).rows[0];
    assert.deepEqual(await ingest(db,[changed,fresh,fresh]),{received:3,inserted_ids:[fresh.candidate_id],skipped_existing_ids:[original.candidate_id,fresh.candidate_id],published:0});
    assert.deepEqual((await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[original.candidate_id])).rows[0],before);
    assert.equal((await db.query('select count(*)::int n from jwl_internal.candidate_revisions where candidate_id=$1',[original.candidate_id])).rows[0].n,1);
    await assert.rejects(ingest(db,[{...row('REF-3'),source_id:'missing'}]),/acquisition not approved/);
    await assert.rejects(ingest(db,[{...row('REF-4'),source_url:'https://other.test/p/REF-4'}]),/origin mismatch/);
    const registry=(await service(db,'select public.jwl_source_registry() r')).rows[0].r;
    assert.deepEqual(registry.test,{origin:'https://example.test',enabled:true,acquisition_allowed:true,min_interval_seconds:60});
    assert.equal(registry['cartier-official'].acquisition_allowed,false);assert(!JSON.stringify(registry).includes('synthetic-acquisition-review'));
    for(const role of ['anon','authenticated'])for(const sql of ["select public.jwl_ingest_missing_batch('[]')",'select public.jwl_source_registry()','select public.jwl_revoked_media_files()'])
      await assert.rejects(as(db,role,()=>db.query(sql)),/permission denied/);
  }finally{await db.close();}
});

test('approvals cite only exact, content-addressed evidence permitted by the grant kind and origin',async()=>{
  const db=await database();
  try{
    const c=row('REF-9');await ingest(db,[c]);
    await assert.rejects(approve(db,c),/grant missing/i);
    await assert.rejects(service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('no-resize','written_permission','test','[\"https://example.test\"]',true,false,true,'x')"),/check constraint/);
    await assert.rejects(grant(db,'cartier-written',{source:'cartier-official',origins:'["https://www.cartier.com"]'}),/check constraint/,'restricted sources cannot receive written permission');
    await grant(db,'grant-test-01');
    await assert.rejects(approve(db,c),/lacks exact private evidence/);
    await assert.rejects(asset(db,c,'https://media.example.test/a/640w.webp',640,800),/check constraint/,'public URL must contain its checksum');
    await asset(db,c,manifest[0].variants[0].src,640,800);
    await assert.rejects(approve(db,c),/lacks exact private evidence/,'every variant needs its own evidence');
    await asset(db,c,images[0],1600,2001);
    await assert.rejects(approve(db,c),/dimensions differ/);
    await assert.rejects(approve(db,c,'grant-test-01',[]),/Responsive variants required/);
    await grant(db,'grant-other');
    await assert.rejects(approve(db,c,'grant-other'),/lacks exact private evidence/,'evidence must cite the approving grant');
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.media_assets set width=1600")),/permission denied/,'evidence is append-only');
    await assert.rejects(as(db,'service_role',()=>db.exec('delete from jwl_internal.media_assets')),/permission denied/);
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set evidence_reference='changed'")),/permission denied/,'a grant cannot be rewritten');
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set expires_at=now()")),/permission denied/);
    for(const role of ['anon','authenticated']){
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.media_assets')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.media_grants')),/permission denied/);
    }
  }finally{await db.close();}
});

test('grant kind binds the original: owner grants need owner originals, written grants need the exact gallery and origin',async()=>{
  const db=await database();
  try{
    const c=row('REF-7');await ingest(db,[c]);
    const owner='grant-owner-01',written='grant-written-02',narrow='grant-narrow-03';
    await grant(db,owner,{kind:'owner_original',source:null,candidate:c.candidate_id,origins:'[]'});
    await grant(db,written);
    await grant(db,narrow,{origins:'["https://cdn.example.test"]'});
    const cases=[
      [owner,'https://example.test/img/REF-7.png',/Owner grant requires an owner original/],
      [written,'https://example.test/img/OTHER.png',/not in the exact candidate gallery/],
      [narrow,'https://example.test/img/REF-7.png',/origin is not granted/],
    ];
    for(const [i,[reference,original,error]] of cases.entries()){
      const variants=[{src:file(1600,String(i)),width:1600,height:2000,variants:[{src:file(640,String(i+3)),width:640,height:800,bytes:1},{src:file(1600,String(i)),width:1600,height:2000,bytes:2}]}];
      for(const v of variants[0].variants)await asset(db,c,v.src,v.width,v.height,{grant_reference:reference,original_source:original});
      await assert.rejects(approve(db,c,reference,variants),error);
    }
    const ownerVariants=[{src:file(1600,'6'),width:1600,height:2000,variants:[{src:file(640,'7'),width:640,height:800,bytes:1},{src:file(1600,'6'),width:1600,height:2000,bytes:2}]}];
    for(const v of ownerVariants[0].variants)await asset(db,c,v.src,v.width,v.height,{grant_reference:owner,original_source:'owner-original:'+sha('a')});
    await approve(db,c,owner,ownerVariants);
    await grant(db,'grant-expiring',{expires:'2099-01-01T00:00:00Z'});
    await assert.rejects(approve(db,c,'grant-expiring'),/expiring media grant/,'expiring grants fail closed without a scheduled sweep');
  }finally{await db.close();}
});

test('revocation is final, withdraws the product and lists its public files for storage cleanup',async()=>{
  const db=await database();
  try{
    const c=row('REF-9');await ingest(db,[c]);await grant(db,'grant-test-01');
    for(const v of manifest[0].variants)await asset(db,c,v.src,v.width,v.height);
    const record=(evidence,approval)=>service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(evidence),JSON.stringify(approval)]);
    const evidence=manifest[0].variants.map(v=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,original_source:'https://example.test/img/REF-9.png',original_sha256:sha('a'),grant_reference:'grant-test-01',verified_reference:'REF-9',verification_reference:'synthetic visual check'}));
    const approval={candidate_id:c.candidate_id,revision_hash:c.revision_hash,media_reference:'grant-test-01',image_verified:true,approved_images:images,approved_image_variants:manifest};
    assert.equal((await record(evidence,approval)).rows[0].r.evidence_rows,2);
    await assert.rejects(record(evidence.map(e=>({...e,verification_reference:'another check'})),approval),/differs/,'replay must match the stored verification record');
    const product={slug:'test-watch-ref-9',reference:'REF-9',brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images,image_variants:manifest,search_text:'ref-9'};
    const publish=()=>service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb)',[c.candidate_id,c.revision_hash,JSON.stringify(product)]);
    await assert.rejects(publish(),/Source publication not approved/,'source publication stays a separate owner decision');
    await db.exec("update jwl_internal.sources set publication_allowed=true where id='test'");
    await publish();
    assert.equal((await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0].active,true);
    await as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-test-01'"));
    assert.equal((await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0].active,false,'revocation withdraws the public product');
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=null")),/cannot be restored/);
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.publication_approvals set revoked_at=null")),/grant missing or revoked/,'an approval cannot be revived under a revoked grant');
    await assert.rejects(publish(),/approval missing or revoked/i);
    assert.deepEqual((await service(db,'select public.jwl_revoked_media_files() r')).rows[0].r.sort(),manifest[0].variants.map(v=>v.src).sort());
  }finally{await db.close();}
});
