import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {buildFactualPublication,publicMapping,factualPublicationSql,missingIntakeSql} from '../../../scripts/catalog-intake/factual-publication.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const record=(ref,overrides={})=>normalizeBatch([{source_id:'rolex-official',external_id:ref,source_url:'https://www.rolex.com/en-gb/watches/datejust/'+ref,brand:'Rolex',collection:'datejust',
  product_name:'Rolex Datejust 41 watch: Oystersteel - '+ref,name_ar:'ساعة رولكس ديت جست، 41 مم',name_en:'Rolex Datejust 41 watch: Oystersteel - '+ref,translation_state:'provided',
  image_urls:['https://media.example.test/'+ref+'.png'],facts:[{key:'diameter',value:'41 mm'}],...overrides}])[0];
// The exact read-only connector exports the pilot uses: live mapping rows and current candidate rows.
const mappingSql=`select c.source_id,p.brand_name,p.brand_slug,p.brand_tier,c.content->>'collection' as collection,p.collection_kind,p.collection_slug,p.collection_ar,p.collection_en,p.category_slug
 from public.jwl_catalog p join jwl_internal.candidates c on c.candidate_id=p.id where p.active and c.source_id=$1 group by 1,2,3,4,5,6,7,8,9,10`;
const candidateSql='select candidate_id,source_id,external_id,revision_hash,content from jwl_internal.candidates where candidate_id=any($1::text[])';
const evidence=r=>({candidate_id:r.candidate_id,revision_hash:r.revision_hash,category_slug:'watches',category_mapping_state:'source_path'});

test('built factual payloads pass the live publisher guard, add only missing products and never overwrite a public row',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
    await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled,min_interval_seconds) values('rolex-official','https://www.rolex.com','permitted-page','synthetic-acquisition-review',true,false,true,2)");
    // One already-published product provides the only mapping the builder may use.
    const legacy=record('m100000-0001');
    await db.query(missingIntakeSql([legacy]));
    await db.query(`select public.jwl_publish_factual_batch($1::jsonb,'Synthetic earlier instruction')`,[JSON.stringify([{candidate_id:legacy.candidate_id,revision_hash:legacy.revision_hash,
      slug:'rolex-m100000-0001',reference:legacy.external_id,brand_slug:'rolex',brand_name:'Rolex',brand_tier:'luxury',category_slug:'watches',collection_slug:'datejust',collection_ar:'datejust',collection_en:'datejust',
      name_ar:legacy.name_ar,name_en:legacy.name_en,description_ar:legacy.description_ar,description_en:legacy.description_en,images:[],search_text:'legacy'}])]);
    const snapshot=async()=>(await db.query("select md5(string_agg(to_jsonb(c)::text,',' order by id)) h,count(*) n from public.jwl_catalog c")).rows[0];
    const legacyRow=(await db.query('select to_jsonb(c) data from public.jwl_catalog c where id=$1',[legacy.candidate_id])).rows[0].data;

    const fresh=[record('m200000-0001'),record('m200000-0002'),record('m200000-0003',{collection:'land dweller'})];
    const receipt=(await db.query(missingIntakeSql([...fresh,legacy]))).rows[0].receipt;
    assert.deepEqual(receipt.inserted_ids.sort(),fresh.map(r=>r.candidate_id).sort());assert.deepEqual(receipt.skipped_existing_ids,[legacy.candidate_id]);

    const mapping=publicMapping((await db.query(mappingSql,['rolex-official'])).rows);
    const ids=[...fresh,legacy].map(r=>r.candidate_id);
    const candidates=(await db.query(candidateSql,[ids])).rows;
    const existing=(await db.query('select id,slug from public.jwl_catalog where id=any($1::text[])',[ids])).rows;
    const built=buildFactualPublication({candidates,evidence:[...fresh,legacy].map(evidence),mapping,existing:{ids:existing.map(r=>r.id),slugs:existing.map(r=>r.slug)}});
    assert.deepEqual(built.products.map(p=>p.reference).sort(),['m200000-0001','m200000-0002']);
    assert.deepEqual(Object.fromEntries(built.held.map(h=>[h.external_id,h.reasons])),{'m200000-0003':['collection_mapping_unknown'],'m100000-0001':['already_public']});

    const before=await snapshot();
    const sql=factualPublicationSql(built.products,'Synthetic owner instruction for a bounded facts-only pilot');
    assert.deepEqual((await db.query(sql)).rows[0].result,{published_factual_records:2,published_images:0});
    const published=(await db.query("select reference,media_state,images,image_variants,collection_kind from public.jwl_catalog where reference like 'm2%' order by reference")).rows;
    assert.deepEqual(published,[{reference:'m200000-0001',media_state:'facts_only',images:[],image_variants:[],collection_kind:'collection'},{reference:'m200000-0002',media_state:'facts_only',images:[],image_variants:[],collection_kind:'collection'}]);
    assert.deepEqual((await db.query('select to_jsonb(c) data from public.jwl_catalog c where id=$1',[legacy.candidate_id])).rows[0].data,legacyRow,'the existing public row is untouched');
    assert.equal((await snapshot()).n,before.n+2);

    // Replaying the same approved statement writes nothing: it refuses because the targets now exist.
    const afterFirst=await snapshot();
    assert.deepEqual((await db.query(sql)).rows[0].result,{refused:'existing_public_rows',count:2});
    assert.deepEqual(await snapshot(),afterFirst);
    // A payload aimed at an existing row is refused as a whole, so the upsert can never overwrite it.
    const sneaky=factualPublicationSql([{...built.products[0],candidate_id:legacy.candidate_id,revision_hash:legacy.revision_hash}],'Synthetic instruction');
    assert.equal((await db.query(sneaky)).rows[0].result.refused,'existing_public_rows');
    assert.deepEqual(await snapshot(),afterFirst);
    const instructions=(await db.query("select count(*)::int n from jwl_internal.factual_publications where owner_instruction like 'Synthetic owner instruction%'")).rows[0].n;
    assert.equal(instructions,2);
  }finally{await db.close();}
});
