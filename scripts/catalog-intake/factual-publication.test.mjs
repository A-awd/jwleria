import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFactualPublication,publicMapping,factualSearchText,factualPublicationSql,missingIntakeSql} from './factual-publication.mjs';
import {normalizeBatch} from './normalize.mjs';

const page=ref=>'https://www.rolex.com/en-gb/watches/datejust/'+ref;
const record=(ref,overrides={})=>normalizeBatch([{source_id:'rolex-official',external_id:ref,source_url:page(ref),brand:'Rolex',collection:'datejust',
  product_name:'Rolex Datejust 41 watch: Oystersteel - '+ref,name_ar:'ساعة رولكس ديت جست، 41 مم',name_en:'Rolex Datejust 41 watch: Oystersteel - '+ref,translation_state:'provided',
  image_urls:['https://media.example.test/'+ref+'.png'],facts:[{key:'diameter',value:'41 mm'}],...overrides}])[0];
// A database row as the connector exports it: identity, current revision and stored content.
const row=r=>({candidate_id:r.candidate_id,source_id:r.source_id,external_id:r.external_id,revision_hash:r.revision_hash,
  content:{brand:r.brand,collection:r.collection,...(r.collection_kind?{collection_kind:r.collection_kind}:{}),product_name:r.product_name,facts:r.facts,name_ar:r.name_ar,name_en:r.name_en,
    description_ar:r.description_ar,description_en:r.description_en,translation_state:r.translation_state}});
const evidence=(r,category='watches')=>({candidate_id:r.candidate_id,revision_hash:r.revision_hash,category_slug:category,category_mapping_state:'source_path'});
const live=[{source_id:'rolex-official',brand_name:'Rolex',brand_slug:'rolex',brand_tier:'luxury',collection:'datejust',collection_kind:'collection',collection_slug:'datejust',collection_ar:'datejust',collection_en:'datejust',category_slug:'watches'}];

test('maps brand, collection and category only from exact live rows and copies the candidate\'s own facts',()=>{
  const r=record('m126334-0011');
  const {products,held,summary}=buildFactualPublication({candidates:[row(r)],evidence:[evidence(r)],mapping:publicMapping(live)});
  assert.deepEqual(held,[]);assert.equal(summary.ready,1);
  const [p]=products;
  assert.deepEqual(Object.keys(p).sort(),['brand_name','brand_slug','brand_tier','candidate_id','category_slug','collection_ar','collection_en','collection_kind','collection_slug',
    'description_ar','description_en','image_variants','images','name_ar','name_en','reference','revision_hash','search_text','slug'],'no price, availability or media field');
  assert.deepEqual([p.images,p.image_variants],[[],[]]);
  assert.equal(p.slug,'rolex-m126334-0011-'+r.candidate_id.slice(0,8));
  assert.equal(p.description_en,r.description_en);assert.equal(p.name_ar,r.name_ar);assert.equal(p.collection_en,'datejust');assert.equal(p.reference,'m126334-0011');
  // Same composition as the recent live Rolex rows (observed: "m126334-0011 rolex datejust ساعة رولكس ديت جست، 41 مم rolex datejust 41 watch: …").
  assert.equal(factualSearchText({reference:'m126334-0011',brand_slug:'rolex',collection_ar:'datejust',collection_en:'datejust',name_ar:'ساعة رولكس ديت جست، 41 مم',
    name_en:'Rolex Datejust 41 watch: Oystersteel and white gold - m126334-0011'}),'m126334-0011 rolex datejust ساعة رولكس ديت جست، 41 مم rolex datejust 41 watch: oystersteel and white gold - m126334-0011');
});

test('holds anything not provably mapped, current or new, and never targets an existing public row',()=>{
  const ok=record('m100000-0001'),pending=record('m100000-0002',{translation_state:'name_pending'}),fresh=record('m100000-0003',{collection:'land dweller'});
  const stale=record('m100000-0004'),publicRow=record('m100000-0005'),wrongCategory=record('m100000-0006'),unapproved=record('m100000-0007');
  const group=record('m100000-0008',{collection:'datejust',collection_kind:'source_group'}),collide=record('m100000-0009');
  const result=buildFactualPublication({mapping:publicMapping(live),
    candidates:[ok,pending,fresh,stale,publicRow,wrongCategory,unapproved,group,collide,ok].map(row),
    evidence:[ok,pending,fresh,publicRow,group,collide].map(r=>evidence(r)).concat([{...evidence(stale),revision_hash:'f'.repeat(64)},evidence(wrongCategory,'jewelry'),evidence(unapproved,'perfume')]),
    existing:{ids:[publicRow.candidate_id],slugs:['rolex-m100000-0009-'+collide.candidate_id.slice(0,8)]}});
  assert.deepEqual(result.products.map(p=>p.reference),['m100000-0001']);
  const why=Object.fromEntries(result.held.map(h=>[h.external_id??h.candidate_id,h.reasons]));
  assert.deepEqual(why['m100000-0002'],['arabic_name_pending']);
  assert.deepEqual(why['m100000-0003'],['collection_mapping_unknown']);
  assert.deepEqual(why['m100000-0004'],['current_revision_evidence_missing','category_requires_review']);
  assert.deepEqual(why['m100000-0005'],['already_public']);
  assert.deepEqual(why['m100000-0006'],['category_unconfirmed_for_collection']);
  assert.deepEqual(why['m100000-0007'],['category_outside_approved_set']);
  assert.deepEqual(why['m100000-0008'],['collection_mapping_unknown'],'a source grouping never borrows a named collection');
  assert.deepEqual(why['m100000-0009'],['slug_collision']);
  assert.deepEqual(why[ok.candidate_id],['duplicate_in_batch']);
});

test('ambiguous live mappings and the batch cap hold records instead of guessing',()=>{
  const a=record('m200000-0001'),b=record('m200000-0002');
  const ambiguous=publicMapping([...live,{...live[0],collection_slug:'datejust-2',collection_ar:'datejust'}]);
  assert.deepEqual(buildFactualPublication({candidates:[row(a)],evidence:[evidence(a)],mapping:ambiguous}).held[0].reasons,['collection_mapping_ambiguous']);
  const twoBrands=publicMapping([...live,{...live[0],brand_slug:'rolex-geneve'}]);
  assert.deepEqual(buildFactualPublication({candidates:[row(a)],evidence:[evidence(a)],mapping:twoBrands}).held[0].reasons,['brand_mapping_ambiguous']);
  const capped=buildFactualPublication({candidates:[row(a),row(b)],evidence:[evidence(a),evidence(b)],mapping:publicMapping(live),max:1});
  assert.equal(capped.products.length,1);assert.deepEqual(capped.held[0].reasons,['batch_cap_reached']);
  assert.throws(()=>buildFactualPublication({candidates:[]}),/Exact public mapping/);
});

test('rendered statements are bounded, facts-only and refuse to overwrite existing public rows',()=>{
  const r=record('m300000-0001');
  const {products}=buildFactualPublication({candidates:[row(r)],evidence:[evidence(r)],mapping:publicMapping(live)});
  const sql=factualPublicationSql(products,'Synthetic owner instruction');
  assert.match(sql,/count\(\*\) n from public\.jwl_catalog c join target t on t\.id=c\.id/);
  assert.match(sql,/then public\.jwl_publish_factual_batch\(\$jwl[a-f0-9]{12}\$\[/);
  assert.match(sql,/'refused','existing_public_rows'/);
  assert.throws(()=>factualPublicationSql([{...products[0],images:['https://x.test/a.webp']}],'x'),/Facts-only/);
  assert.throws(()=>factualPublicationSql(products,' '),/owner instruction/);
  assert.throws(()=>factualPublicationSql([],'x'),/Bounded/);
  assert.match(missingIntakeSql([r]),/^select public\.jwl_ingest_missing_batch\(\$jwl[a-f0-9]{12}\$\[/);
  assert.throws(()=>missingIntakeSql(Array.from({length:101},()=>r)),/Bounded/);
});
