import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const baseMigrations=['20261004102822_jwleria_catalog_foundation.sql','20261004133914_jwleria_candidate_enrichment.sql','20261004144941_jwleria_factual_publication.sql','20261021090207_jwleria_public_brand_page.sql','20261021092208_jwleria_responsive_media_contract.sql'];
const candidate=(reference,collection)=>normalizeBatch([{source_id:'test',external_id:reference,source_url:'https://example.test/'+reference,brand:'Test brand',collection,product_name:'Test piece '+reference,name_ar:'قطعة اختبار '+reference,translation_state:'provided',image_urls:['https://media.example.test/'+reference+'.webp'],facts:[{key:'material',value:'leather'}],source_description:'Private source copy'}])[0];
const product=c=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'piece-'+c.external_id.toLowerCase(),reference:c.external_id,brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'handbags',collection_slug:c.collection.toLowerCase().replaceAll(' ','-'),collection_ar:c.collection,collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images:[],image_variants:[],search_text:'test piece'});

test('collection-kind contract preserves legacy content and gates source groups without inventing collections',async t=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create role outsider;');
  for(const file of baseMigrations)await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','owner-export','synthetic-source-permission',true,false,true)");
  const legacy=candidate('LEGACY-01','Named family');
  const ingest=value=>db.query('select public.jwl_ingest_batch($1::jsonb) data',[JSON.stringify([value])]).then(result=>result.rows[0].data);
  const factual=value=>db.query('select public.jwl_publish_factual_batch($1::jsonb,$2) data',[JSON.stringify([value]),'Synthetic owner factual-display instruction']);
  const media=value=>db.query('select public.jwl_publish_candidate($1,$2,$3::jsonb)',[value.candidate_id,value.revision_hash,JSON.stringify(value)]);
  await ingest(legacy);await factual(product(legacy));
  const legacyBefore=(await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[legacy.candidate_id])).rows[0];
  const publicBefore=(await db.query('select to_jsonb(c) data from public.jwl_catalog c')).rows[0].data;

  // The temporary draft path is supplied only by the local caller, never committed.
  // After promotion, load the actual registered collection-kind migration instead.
  let sql='';
  if(process.env.JWL_COLLECTION_KIND_SQL_PATH)sql=await readFile(process.env.JWL_COLLECTION_KIND_SQL_PATH,'utf8');
  else for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql')&&!baseMigrations.includes(file)).sort()){
   const migration=await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
   if(/add\s+column\s+(?:if\s+not\s+exists\s+)?collection_kind\b/i.test(migration)){sql=migration;break;}
  }
  if(sql)await db.exec(sql);
  assert((await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='jwl_catalog' and column_name='collection_kind'")).rows.length,'collection_kind contract is missing');

  await t.test('existing public products and private candidate hashes remain unchanged except the additive public kind',async()=>{
   const after=(await db.query('select to_jsonb(c) data from public.jwl_catalog c')).rows[0].data;
   assert.equal(after.collection_kind,'collection');delete after.collection_kind;assert.deepEqual(after,publicBefore);
   assert.equal((await ingest(legacy)).changed,0);
   const saved=(await db.query('select revision_hash,content from jwl_internal.candidates where candidate_id=$1',[legacy.candidate_id])).rows[0];
   assert.deepEqual(saved,legacyBefore);assert.equal(Object.hasOwn(saved.content,'collection_kind'),false);
   assert.equal(saved.revision_hash,legacy.revision_hash);
  });

  const group={...candidate('GROUP-01','Handbags'),collection_kind:'source_group',revision_hash:'e'.repeat(64),description_ar:'قطعة اختبار. المرجع GROUP-01. المادة: جلد.',description_en:'Test piece. Reference GROUP-01. Material: leather.'};
  const groupProduct={...product(group),collection_kind:'source_group'};
  await t.test('validated source-group metadata survives ingestion and only factual display becomes eligible',async()=>{
   for(const kind of [null,{},[],true,'invented'])await assert.rejects(ingest({...group,collection_kind:kind}),/collection kind/i);
   await ingest(group);
   const saved=(await db.query('select content from jwl_internal.candidates where candidate_id=$1',[group.candidate_id])).rows[0].content;
   assert.equal(saved.collection_kind,'source_group');assert.equal(saved.collection,'Handbags');
   assert.equal(saved.description_en,'Test piece. Reference GROUP-01. Material: leather.');
   await factual(groupProduct);
   assert.equal((await db.query('select collection_kind from public.jwl_catalog where id=$1',[group.candidate_id])).rows[0].collection_kind,'source_group');
   assert.equal((await db.query('select count(*)::integer n from jwl_internal.publication_approvals')).rows[0].n,0);
   await assert.rejects(media({...groupProduct,images:group.image_urls}),/approval missing/i);
  });

  await t.test('both publication lanes reject forged grouping and preserve current revision and description gates',async()=>{
   await assert.rejects(factual({...groupProduct,collection_kind:'collection'}),/collection kind/i);
   const omitted={...groupProduct};delete omitted.collection_kind;await assert.rejects(factual(omitted),/collection kind/i);
   await assert.rejects(factual({...product(legacy),collection_kind:'source_group'}),/collection kind/i);
   await assert.rejects(factual({...groupProduct,revision_hash:'f'.repeat(64)}),/revision changed/i);
   await assert.rejects(factual({...groupProduct,description_en:'Unreviewed collection claim'}),/Factual content mismatch/i);
   await db.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images) values($1,$2,$3,true,$4::jsonb)',[group.candidate_id,group.revision_hash,'private-synthetic-photo-permission',JSON.stringify(group.image_urls)]);
   const photo={...groupProduct,images:group.image_urls};
   await assert.rejects(media(photo),/Source publication not approved/i);
   await db.exec('update jwl_internal.sources set publication_allowed=true');
   await assert.rejects(media({...photo,collection_kind:'collection'}),/collection kind/i);
   await assert.rejects(media({...photo,reference:'WRONG'}),/identity differs/i);
   await assert.rejects(media({...photo,description_en:'Unreviewed'}),/Descriptions differ/i);
   await assert.rejects(media({...photo,images:['https://media.example.test/forged.webp']}),/Images differ/i);
   await assert.rejects(media({...photo,image_variants:[{}]}),/variants differ/i);
   await media(photo);
   await db.exec('update jwl_internal.publication_approvals set revoked_at=now()');await assert.rejects(media(photo),/approval missing/i);
   await db.exec('update jwl_internal.publication_approvals set revoked_at=null');
   await factual(groupProduct);
   assert.deepEqual((await db.query('select images,image_variants,media_state from public.jwl_catalog where id=$1',[group.candidate_id])).rows[0],{images:[],image_variants:[],media_state:'facts_only'});
  });

  await t.test('anonymous brand items include source groups but named-collection chips exclude them and private data stays restricted',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    const collections=(await db.query('select collection_en from public.jwl_collections order by collection_en')).rows;
    assert.deepEqual(collections,[{collection_en:'Named family'}]);
    const page=(await db.query("select public.jwl_brand_page('test-brand',1,12) data")).rows[0].data;
    assert.equal(page.total,2);assert.equal(page.items.length,2);
    assert.equal(page.items.find(row=>row.reference==='GROUP-01').collection_kind,'source_group');
    assert.equal(page.items.find(row=>row.reference==='LEGACY-01').collection_kind,'collection');
    assert.deepEqual(page.collections,[{collection_slug:'named-family',collection_ar:'Named family',collection_en:'Named family'}]);
    assert(!JSON.stringify(page).includes('Private source copy'));assert(!JSON.stringify(page).includes('private-synthetic-photo-permission'));
    await assert.rejects(db.query('select * from jwl_internal.candidates'),/permission denied/i);
    await assert.rejects(factual(groupProduct),/permission denied/i);
    await assert.rejects(db.exec("update public.jwl_catalog set collection_kind='collection'"),/permission denied/i);
    await db.exec('reset role');
   }
   await db.exec('update public.jwl_catalog set active=false where reference=\'GROUP-01\';set role anon');
   assert.equal((await db.query("select public.jwl_brand_page('test-brand',1,12) data")).rows[0].data.total,1);
   await db.exec('reset role;set role outsider');await assert.rejects(db.query("select public.jwl_brand_page('test-brand',1,12)"),/permission denied/i);await db.exec('reset role');
   const privileges=(await db.query("select p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('jwl_ingest_batch','jwl_publish_factual_batch','jwl_publish_candidate','jwl_brand_page')")).rows;
   assert.equal(privileges.length,4);assert(privileges.every(row=>row.prosecdef===false));
  });
 }finally{await db.close();}
});
