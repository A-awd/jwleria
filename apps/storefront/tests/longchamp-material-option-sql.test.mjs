import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

// Synthetic rows shaped like the captured Longchamp data: one design whose colours carry two official material
// wordings (the proposed grouping repair), a design with other dimensions, and a LOEWE control that must not change.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const FORWARD=new URL('../supabase/proposed/jwleria_longchamp_material_option.sql',import.meta.url);
const ROLLBACK=new URL('../supabase/proposed/jwleria_longchamp_material_option.rollback.sql',import.meta.url);
const A='Recycled polyamide canvas with inside coating',B='Polyamide fabric with a minimum of 70% recycled fibers, with interior coating';
const lc=(ref,color,colourAr,material,dims='23 x 22 x 14 cm')=>({source:'longchamp-official',origin:'https://www.longchamp.com',brand:'Longchamp',ref,collection:'Le Pliage Original',
  name_en:`Le Pliage Original S Handbag — ${color}`,name_ar:`حقيبة يد Le Pliage Original، مقاس صغير، ${colourAr}`,facts:{color,dimensions:dims,material}});
const loewe=(ref,color,material)=>({source:'loewe-official',origin:'https://www.loewe.com',brand:'LOEWE',ref,collection:'Puzzle',name_en:'Small Puzzle bag',name_ar:'حقيبة بازِل صغيرة',
  facts:{color,dimensions:'24 x 16.5 x 10.5 cm',material}});
const fixtures=[lc('L1621089001','Black','أسود',A),lc('L1621089P68','Navy','كحلي',A),lc('L1621089218','Strawberry','فراولة',B),lc('L1621089349','Pebble','حصوي',B),
  lc('L1899089001','Black','أسود',A,'30 x 30 x 20 cm'),lc('L1899089002','Mocha','موكا',A,'31 x 30 x 20 cm'),
  loewe('328.24.W10-1100','Black','Classic calfskin'),loewe('328.24.W10-2435','Tan','Shiny calfskin')];
const slug=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&!f.endsWith('_jwleria_longchamp_material_option.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  for(const s of ['longchamp-official','loewe-official'])await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values($1,$2,'permitted-page','synthetic review',true,false,true)",
    [s,fixtures.find(f=>f.source===s).origin]);
  const records=fixtures.map(f=>normalizeBatch([{source_id:f.source,external_id:f.ref,source_url:`${f.origin}/p/${f.ref}`,brand:f.brand,collection:f.collection,product_name:f.name_en,name_en:f.name_en,
    name_ar:f.name_ar,translation_state:'provided',image_urls:[`${f.origin}/img/${f.ref}.png`],facts:Object.entries(f.facts).map(([key,value])=>({key,value}))}])[0]);
  await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify(records)]);
  await db.query("select public.jwl_publish_factual_batch($1::jsonb,'synthetic owner instruction')",[JSON.stringify(fixtures.map((f,i)=>({candidate_id:records[i].candidate_id,revision_hash:records[i].revision_hash,
    slug:slug(f.brand+'-'+f.ref),reference:f.ref,brand_slug:slug(f.brand),brand_name:f.brand,brand_tier:'luxury',category_slug:'handbags',collection_slug:slug(f.collection),collection_ar:f.collection,
    collection_en:f.collection,name_ar:records[i].name_ar,name_en:records[i].name_en,description_ar:records[i].description_ar,description_en:records[i].description_en,images:[],search_text:f.ref.toLowerCase()})))]);
  await db.query('select jwl_internal.apply_product_variants()');
  return db;
}
const models=async db=>new Map((await db.query('select c.reference,v.model_key,v.rule,v.options from public.jwl_product_variants v join public.jwl_catalog c on c.id=v.product_id')).rows.map(r=>[r.reference,r]));
const state=async db=>(await db.query(`select (select md5(string_agg((to_jsonb(v)-'mapped_at')::text,',' order by product_id)) from public.jwl_product_variants v) v,
  (select md5(string_agg(to_jsonb(c)::text,',' order by candidate_id)) from jwl_internal.candidates c) c,
  (select md5(pg_get_functiondef('jwl_internal.derive_base_variants()'::regprocedure))) f`)).rows[0];

test('Longchamp grouping repair: one design with two official material wordings becomes one model; each variant keeps its own material',async()=>{
  const db=await database();
  try{
    const before=await models(db);
    assert.equal(before.get('L1621089001').rule,'single:inconsistent','the captured failure reproduces');
    const pre=await state(db);
    await db.exec(await readFile(FORWARD,'utf8'));
    const after=await models(db),family=['L1621089001','L1621089P68','L1621089218','L1621089349'].map(r=>after.get(r));
    assert.equal(new Set(family.map(m=>m.model_key)).size,1);
    assert.equal(family[0].rule,'longchamp-model-code');
    const material=m=>m.options.find(o=>o.kind==='material')?.value.en;
    assert.deepEqual(family.map(material),[A,A,B,B],'each variant shows its own exact material');
    assert.notEqual(after.get('L1899089001').model_key,after.get('L1899089002').model_key,'different dimensions still never merge');
    assert.deepEqual([after.get('328.24.W10-1100'),after.get('328.24.W10-2435')].map(m=>m.rule),[before.get('328.24.W10-1100').rule,before.get('328.24.W10-2435').rule],'other brands are unchanged');
    assert.equal((await state(db)).c,pre.c,'candidate revisions are untouched');
    await db.exec(await readFile(ROLLBACK,'utf8'));
    assert.deepEqual(await state(db),pre,'the rollback restores the derivation and the derived tables exactly');
  }finally{await db.close();}
});
