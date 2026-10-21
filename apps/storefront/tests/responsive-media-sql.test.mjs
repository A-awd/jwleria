import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const images=['https://media.example.test/front.webp','https://media.example.test/side.webp'];
const manifest=[
 {src:images[0],width:1200,height:1600,variants:[
  {src:'https://media.example.test/front-400.webp',width:400,height:533,bytes:24000},
  {src:'https://media.example.test/front-800.webp',width:800,height:1067,bytes:62000},
  {src:images[0],width:1200,height:1600,bytes:130000},
 ]},
 {src:images[1],width:1000,height:1000,variants:[
  {src:'https://media.example.test/side-500.webp',width:500,height:500,bytes:21000},
  {src:images[1],width:1000,height:1000,bytes:81000},
 ]},
];
const clone=value=>JSON.parse(JSON.stringify(value));
const changed=mutate=>{const value=clone(manifest);mutate(value);return value;};

test('draft preserves publication gates while exposing only approved responsive image metadata',async t=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role outsider;');
  for(const file of ['20261004102822_jwleria_catalog_foundation.sql','20261004133914_jwleria_candidate_enrichment.sql','20261004144941_jwleria_factual_publication.sql','20261021090207_jwleria_public_brand_page.sql']){
   await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  }
  await db.exec("insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,media_state,search_text) values('existing-factual','existing-factual','OLD-01','old-brand','Old brand','luxury','watches','old-collection','مجموعة','Old collection','ساعة','Watch','حقائق','Facts','[]','facts_only','watch')");
  const beforeDraft=(await db.query("select to_jsonb(c) data from public.jwl_catalog c where id='existing-factual'")).rows[0].data;
  const draft=await readFile(new URL('../supabase/migrations/20261021092208_jwleria_responsive_media_contract.sql',import.meta.url),'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
  if(draft)await db.exec(draft);
  const columns=(await db.query("select table_schema,table_name,column_name from information_schema.columns where column_name in ('image_variants','approved_image_variants')")).rows;
  assert(columns.some(row=>row.table_schema==='public'&&row.table_name==='jwl_catalog'&&row.column_name==='image_variants'),'public responsive metadata column is missing');
  assert(columns.some(row=>row.table_schema==='jwl_internal'&&row.table_name==='publication_approvals'&&row.column_name==='approved_image_variants'),'private exact-image metadata approval column is missing');
  const existing=(await db.query("select to_jsonb(c) data from public.jwl_catalog c where id='existing-factual'")).rows[0].data;
  assert.deepEqual(existing.image_variants,[]);delete existing.image_variants;assert.deepEqual(existing,beforeDraft,'draft must preserve every existing factual field');
  await db.exec("delete from public.jwl_catalog where id='existing-factual'");

  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','owner-export','synthetic-source-permission',true,true,true)");
  const candidate=normalizeBatch([{source_id:'test',external_id:'REF-01',source_url:'https://example.test/product',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:images,source_description:'Private source marketing copy',facts:[{key:'diameter',value:'41 mm'}]}])[0];
  await db.query('select public.jwl_ingest_batch($1::jsonb)',[JSON.stringify([candidate])]);
  const product={slug:'test-watch',reference:'REF-01',brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة اختبار',collection_en:'Test collection',name_ar:candidate.name_ar,name_en:candidate.name_en,description_ar:candidate.description_ar,description_en:candidate.description_en,images,image_variants:manifest,search_text:'test watch'};
  const publish=(value=product,revision=candidate.revision_hash)=>db.query('select public.jwl_publish_candidate($1,$2,$3::jsonb)',[candidate.candidate_id,revision,JSON.stringify(value)]);
  const validate=(value,canonical=images)=>db.query('select jwl_internal.valid_image_variants($1::jsonb,$2::jsonb) ok',[JSON.stringify(canonical),JSON.stringify(value)]).then(result=>result.rows[0].ok);

  await t.test('metadata needs exact private approval and anonymous reads reveal no private grant or source copy',async()=>{
   await assert.rejects(publish(),/approval missing/i);
   await db.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',[candidate.candidate_id,candidate.revision_hash,'private-synthetic-media-permission',JSON.stringify(images),JSON.stringify(manifest)]);
   await db.exec('set role service_role');await publish();await db.exec('reset role');
   const saved=(await db.query('select images,image_variants,media_state from public.jwl_catalog')).rows[0];
   assert.deepEqual(saved,{images,image_variants:manifest,media_state:'approved_media'});
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    assert.deepEqual((await db.query('select image_variants from public.jwl_catalog')).rows[0].image_variants,manifest);
    const response=(await db.query("select public.jwl_brand_page('test-brand',1,12) data")).rows[0].data;
    assert.deepEqual(response.items[0].image_variants,manifest);
    assert(!JSON.stringify(response).includes('private-synthetic-media-permission'));
    assert(!JSON.stringify(response).includes('Private source marketing copy'));
    await assert.rejects(db.query('select * from jwl_internal.publication_approvals'),/permission denied/i);
    await assert.rejects(publish(),/permission denied/i);
    await assert.rejects(validate(manifest),/permission denied/i);
    await db.exec('reset role');
   }
   await db.exec('set role outsider');await assert.rejects(db.query("select public.jwl_brand_page('test-brand',1,12)"),/permission denied/i);await db.exec('reset role');
   await db.exec('update public.jwl_catalog set active=false;set role anon');
   assert.equal((await db.query('select count(*)::integer n from public.jwl_catalog')).rows[0].n,0);
   assert.deepEqual((await db.query("select public.jwl_brand_page('test-brand',1,12) data")).rows[0].data.items,[]);
   await db.exec('reset role;update public.jwl_catalog set active=true');
  });

  await t.test('strict shape, gallery identity, dimensions, aspect ratio, URLs and byte bounds reject forged metadata',async()=>{
   assert.equal(await validate(manifest),true);
   assert.equal(await validate([]),true);
   const invalid=[
    ['object instead of array',{}],['null',null],['partial gallery',manifest.slice(0,1)],['gallery order',clone(manifest).reverse()],
    ['private entry field',changed(m=>m[0].grant_reference='private')],['private variant field',changed(m=>m[0].variants[0].original_file='/private/source')],
    ['missing canonical key',changed(m=>delete m[0].height)],['string dimensions',changed(m=>m[0].width='1200')],
    ['fractional dimensions',changed(m=>m[0].width=1200.5)],['zero dimensions',changed(m=>m[0].height=0)],
    ['oversize width',changed(m=>m[0].width=4097)],['oversize height',changed(m=>m[0].height=8193)],
    ['empty variants',changed(m=>m[0].variants=[])],['too many variants',changed(m=>m[0].variants=Array.from({length:9},(_,i)=>({src:'https://media.example.test/v'+i+'.webp',width:i+1,height:i+1,bytes:1})))],
    ['no card-size derivative',changed(m=>m[0].variants=[m[0].variants[2]])],
    ['missing canonical variant',changed(m=>m[0].variants.pop())],['canonical dimensions mismatch',changed(m=>m[0].variants[2].height=1599)],
    ['descending widths',changed(m=>m[0].variants.reverse())],['duplicate widths',changed(m=>m[0].variants[1].width=400)],
    ['duplicate variant URL',changed(m=>m[0].variants[1].src=m[0].variants[0].src)],
    ['cross-gallery URL reuse',changed(m=>m[1].variants[0].src=m[0].variants[0].src)],
    ['variant wider than canonical',changed(m=>m[0].variants[0].width=1201)],['variant taller than canonical',changed(m=>m[0].variants[0].height=1601)],
    ['aspect ratio mismatch',changed(m=>m[0].variants[0].height=530)],['fractional variant dimensions',changed(m=>m[0].variants[0].height=533.1)],
    ['zero bytes',changed(m=>m[0].variants[0].bytes=0)],['oversize bytes',changed(m=>m[0].variants[0].bytes=15728641)],
    ['fractional bytes',changed(m=>m[0].variants[0].bytes=4.5)],['string bytes',changed(m=>m[0].variants[0].bytes='24000')],
    ['HTTP URL',changed(m=>m[0].variants[0].src='http://media.example.test/400.webp')],
    ['URL userinfo',changed(m=>m[0].variants[0].src='https://name:secret@media.example.test/400.webp')],
    ['URL query',changed(m=>m[0].variants[0].src='https://media.example.test/400.webp?token=secret')],
    ['URL fragment',changed(m=>m[0].variants[0].src='https://media.example.test/400.webp#private')],
    ['URL whitespace',changed(m=>m[0].variants[0].src='https://media.example.test/a b.webp')],
    ['srcset comma',changed(m=>m[0].variants[0].src='https://media.example.test/a,b.webp')],
    ['noncanonical hostname',changed(m=>m[0].variants[0].src='https://MEDIA.example.test/400.webp')],
    ['noncanonical default port',changed(m=>m[0].variants[0].src='https://media.example.test:443/400.webp')],
    ['noncanonical dot segment',changed(m=>m[0].variants[0].src='https://media.example.test/path/../400.webp')],
    ['noncanonical numeric hostname',changed(m=>m[0].variants[0].src='https://0x7f.0.0.1/400.webp')],
    ['oversize URL',changed(m=>m[0].variants[0].src='https://media.example.test/'+('x'.repeat(2048))+'.webp')],
   ];
   for(const [label,value]of invalid)assert.equal(await validate(value),false,label);
   assert.equal(await validate(manifest,[images[0],images[0]]),false,'duplicate canonical URLs');
   const badCanonical=changed(m=>{m[0].src+='?token=secret';m[0].variants[2].src=m[0].src;});
   assert.equal(await validate(badCanonical,[badCanonical[0].src,images[1]]),false,'canonical URL query');
   const boundarySrc='https://media.example.test/boundary.webp';
   assert.equal(await validate([{src:boundarySrc,width:4096,height:8192,variants:[{src:'https://media.example.test/boundary-960.webp',width:960,height:1920,bytes:15728640},{src:boundarySrc,width:4096,height:8192,bytes:15728640}]}],[boundarySrc]),true,'inclusive dimension and byte maxima');
   const gallery=Array.from({length:21},(_,i)=>({src:'https://media.example.test/gallery-'+i+'.webp',width:320,height:320,variants:[{src:'https://media.example.test/gallery-'+i+'.webp',width:320,height:320,bytes:1}]}));
   assert.equal(await validate(gallery.slice(0,20),gallery.slice(0,20).map(entry=>entry.src)),true,'twenty-image gallery');
   assert.equal(await validate(gallery,gallery.map(entry=>entry.src)),false,'oversize gallery');
   await assert.rejects(db.query('update jwl_internal.publication_approvals set approved_image_variants=$1::jsonb',[JSON.stringify(invalid[4][1])]),/check constraint/i);
   await assert.rejects(db.query('update public.jwl_catalog set image_variants=$1::jsonb',[JSON.stringify(manifest.slice(0,1))]),/check constraint/i);
  });

  await t.test('forged manifest, stale revision, changed summaries and revoked media still cannot publish',async()=>{
   await assert.rejects(publish({...product,image_variants:changed(m=>m[0].variants[0].bytes=24001)}),/variants differ/i);
   const withoutMetadata={...product};delete withoutMetadata.image_variants;
   await assert.rejects(publish(withoutMetadata),/variants differ/i);
   await assert.rejects(publish(product,'f'.repeat(64)),/revision changed/i);
   for(const value of [{...product,reference:'WRONG-REF'},{...product,brand_name:'Wrong brand'},{...product,collection_en:'Wrong collection'},{...product,name_ar:'اسم آخر'},{...product,name_en:'Wrong name'}])await assert.rejects(publish(value),/identity differs/i);
   await assert.rejects(publish({...product,description_en:'Unreviewed marketing'}),/Descriptions differ/i);
   await assert.rejects(publish({...product,images:[images[1]]}),/Images differ/i);
   await db.exec('update jwl_internal.publication_approvals set image_verified=false');await assert.rejects(publish(),/approval missing/i);
   await db.exec('update jwl_internal.publication_approvals set image_verified=true,revoked_at=now()');await assert.rejects(publish(),/approval missing/i);
   await db.exec('update jwl_internal.publication_approvals set revoked_at=null');
   await db.exec('update jwl_internal.sources set publication_allowed=false');await assert.rejects(publish(),/Source publication not approved/i);
   await db.exec('update jwl_internal.sources set publication_allowed=true,enabled=false');await assert.rejects(publish(),/Source publication not approved/i);
   await db.exec('update jwl_internal.sources set enabled=true');await publish();
  });

  await t.test('facts-only republishing clears prior manifests and legacy image approvals default to no responsive metadata',async()=>{
   const factual={...product,candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,images:[]};delete factual.image_variants;
   await db.query('select public.jwl_publish_factual_batch($1::jsonb,$2)',[JSON.stringify([factual]),'Synthetic factual publication test']);
   assert.deepEqual((await db.query('select images,image_variants,media_state from public.jwl_catalog')).rows[0],{images:[],image_variants:[],media_state:'facts_only'});
   await assert.rejects(db.query('select public.jwl_publish_factual_batch($1::jsonb,$2)',[JSON.stringify([{...factual,image_variants:manifest}]),'Synthetic test']),/Media excluded/i);
   await db.exec("update jwl_internal.publication_approvals set approved_image_variants='[]'");
   const legacy={...product};delete legacy.image_variants;await publish(legacy);
   assert.deepEqual((await db.query('select image_variants from public.jwl_catalog')).rows[0].image_variants,[]);
   const security=(await db.query("select prosecdef from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='jwl_internal' and p.proname='valid_image_variants'")).rows[0];
   assert.equal(security.prosecdef,false);
  });
 }finally{await db.close();}
});
