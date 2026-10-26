import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const proposed=new URL('../supabase/proposed/jwleria_product_models.sql',import.meta.url);
const rollback=new URL('../supabase/proposed/jwleria_product_models.rollback.sql',import.meta.url);
const slugify=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const sources={
  'rolex-official':{origin:'https://www.rolex.com',brand:'Rolex',category:'watches'},
  'loewe-official':{origin:'https://www.loewe.com',brand:'LOEWE',category:'bags'},
  'longchamp-official':{origin:'https://www.longchamp.com',brand:'Longchamp',category:'bags'},
  'bottega-veneta-official':{origin:'https://www.bottegaveneta.com',brand:'Bottega Veneta',category:'bags'},
  'prada-official':{origin:'https://www.prada.com',brand:'Prada',category:'bags'},
  'cartier-official':{origin:'https://www.cartier.com',brand:'Cartier',category:'jewellery'},
};
// Synthetic rows shaped like the captured data: Rolex m<model>-NNNN with dial/bracelet facts, LOEWE
// <style>-NNNN, Longchamp <model><colour> with "Name — Colour" names, Bottega style+material+colour.
const datejust=(ref,color,bracelet,extra={})=>({source:'rolex-official',ref,collection:'datejust',name_en:`Rolex Datejust 36 watch: Oystersteel - ${ref}`,name_ar:'ساعة رولكس ديت جست، 36 مم',
  facts:{diameter:'36 mm',material:'Oystersteel',movement:'Perpetual, mechanical, self-winding',water_resistance:'Waterproof to 100 metres / 330 feet',power_reserve:'Approximately 55 hours',
    bracelet_material:'Oystersteel',color,bracelet_type:bracelet,...extra}});
const jubilee='Jubilee, five-piece links',oyster='Oyster, three-piece solid links';
const tote=(code,color,ar,extra={})=>({source:'longchamp-official',ref:'L1899089'+code,collection:'Le Pliage Original',name_en:`Le Pliage Original L Tote bag — ${color}`,
  name_ar:`حقيبة كتف Le Pliage Original، مقاس كبير، ${ar}`,facts:{color,dimensions:'31 x 30 x 19 cm',material:'Recycled canvas',weight:'0.2 kg',...extra}});
const puzzle=(code,color,extra={})=>({source:'loewe-official',ref:'328.24.W10-'+code,collection:'Puzzle',name_en:'Small Puzzle bag in classic calfskin',name_ar:'حقيبة Puzzle، مقاس صغير، من جلد عجل كلاسيكي',
  facts:{color,dimensions:'24 x 16.5 x 10.5 cm',material:'Classic calfskin',...extra}});
const fold=(ref,color,ar)=>({source:'loewe-official',ref,collection:'Puzzle',name_en:'Puzzle Fold tote in shiny calfskin - '+ref,name_ar:ar+' - '+ref,
  facts:{color,dimensions:'34 x 30 x 12 cm',material:'Shiny calfskin'}});
const fixtures=[
  // As in the captured data, one variant's Arabic name omits the shared case diameter.
  {...datejust('m126200-0001','Silver',jubilee),name_ar:'ساعة رولكس ديت جست'},datejust('m126200-0002','Silver',oyster),datejust('m126200-0005','Bright blue',jubilee),
  datejust('m126200-0006','Bright blue',oyster),datejust('m126200-0029','Bright blue',jubilee),datejust('m126200-0010','Candy pink',oyster),
  {...datejust('m126334-0001','Blue',jubilee),name_en:'Rolex Datejust 41 watch: Oystersteel and white gold - m126334-0001',facts:{...datejust('','Blue',jubilee).facts,diameter:'41 mm',material:'White Rolesor - combination of Oystersteel and white gold'}},
  {...datejust('m126334-0003','White',jubilee),name_en:'Rolex Datejust 41 watch: Oystersteel and white gold - m126334-0003',facts:{...datejust('','White',jubilee).facts,diameter:'41 mm',material:'White Rolesor - combination of Oystersteel and white gold'}},
  {...datejust('m126300-0001','Slate',oyster),name_en:'Rolex Datejust 41 watch: Oystersteel - m126300-0001',facts:{...datejust('','Slate',oyster).facts,diameter:'41 mm'}},
  {...datejust('m126300-0002','White',oyster),name_en:'Rolex Datejust 41 watch: Oystersteel - m126300-0002'},
  datejust('m278274-0001','Silver',jubilee,{bracelet_material:'Oystersteel'}),datejust('m278274-0002','Silver',jubilee,{bracelet_material:'18 ct white gold'}),
  {source:'rolex-official',ref:'m126610ln-0001',collection:'submariner',name_en:'Rolex Submariner Date watch: Oystersteel - m126610ln-0001',name_ar:'ساعة رولكس صب مارينر ديت، 41 مم',
    facts:{diameter:'41 mm',material:'Oystersteel',color:'Black',bracelet_type:oyster,water_resistance:'Waterproof to 300 metres / 1,000 feet',power_reserve:'Approximately 70 hours'}},
  {source:'rolex-official',ref:'m126610lv-0002',collection:'submariner',name_en:'Rolex Submariner Date watch: Oystersteel - m126610lv-0002',name_ar:'ساعة رولكس صب مارينر ديت، 41 مم',
    facts:{diameter:'41 mm',material:'Oystersteel',color:'Black',bracelet_type:oyster,water_resistance:'Waterproof to 300 metres / 1,000 feet',power_reserve:'Approximately 70 hours'}},
  puzzle('2435','Tan'),puzzle('1100','Black'),
  {...puzzle('A510S72X02-1100','Black'),ref:'A510S72X02-1100',name_en:'Hammock bag in classic calfskin',facts:{color:'Black',dimensions:'29 x 21 x 13 cm',material:'Classic calfskin'}},
  {...puzzle('A510S72X02-2530','Tan'),ref:'A510S72X02-2530',name_en:'Hammock bag in classic calfskin',facts:{color:'Tan',dimensions:'33 x 25 x 15 cm',material:'Classic calfskin'}},
  tote('001','Black','أسود'),tote('556','Navy','كحلي'),tote('P59','Paper','ورقي'),
  {...tote('001','Black','أسود'),ref:'L2605089001',name_en:'Le Pliage Original M Handbag — Black',name_ar:'حقيبة يد Le Pliage Original، مقاس متوسط، أسود'},
  {...tote('545','Cognac','كونياك'),ref:'L2605089545',name_en:'Le Pliage Original M Handbag — Cognac',name_ar:'حقيبة يد Le Pliage Original، مقاس متوسط، لون آخر'},
  // Arabic names that end in their own reference: identical without it, and otherwise different.
  fold('328.25.A11-1100','Black','حقيبة Puzzle Fold'),fold('328.25.A11-2100','White','حقيبة Puzzle Fold'),
  fold('328.26.B12-1100','Black','حقيبة Puzzle Fold صغيرة'),fold('328.26.B12-2435','Tan','حقيبة Puzzle Fold، مقاس صغير'),
  {source:'bottega-veneta-official',ref:'498478VG0HH2725',collection:'Andiamo',name_en:'Small Andiamo',name_ar:'حقيبة Andiamo صغيرة',facts:{color:'Black',material:'leather',leather_type:'Intrecciato'}},
  {source:'bottega-veneta-official',ref:'498478VG0HH8803',collection:'Andiamo',name_en:'Small Andiamo',name_ar:'حقيبة Andiamo صغيرة',facts:{color:'Fondant',material:'leather',leather_type:'Intrecciato'}},
  {source:'bottega-veneta-official',ref:'498478VG0HH9041',collection:'Andiamo',name_en:'Small Andiamo',name_ar:'حقيبة Andiamo صغيرة',facts:{material:'leather',leather_type:'Intrecciato'}},
  {source:'prada-official',ref:'1BA038_2CX9_F0018_V_8OM',collection:'Galleria',name_en:'Prada Galleria Saffiano leather bag',name_ar:'حقيبة Prada Galleria من جلد سافيانو',facts:{material:'Saffiano leather',dimensions:'34 x 24 x 15 cm (width x height x length)'}},
  {source:'cartier-official',ref:'B4084600',collection:'Love',name_en:'Love ring',name_ar:'خاتم Love',facts:{material:'Yellow gold'}},
  {source:'cartier-official',ref:'B4084700',collection:'Love',name_en:'Love ring',name_ar:'خاتم Love',facts:{material:'Yellow gold'}},
];
const large=Array.from({length:62},(_,i)=>({source:'loewe-official',ref:`A000X01-${1001+i}`,collection:'Flamenco',name_en:'Flamenco clutch in nappa calfskin',name_ar:'حقيبة Flamenco من جلد عجل نابا',
  facts:{color:`Shade ${String(i+1).padStart(2,'0')}`,dimensions:'30 x 20 x 10 cm',material:'Nappa calfskin'}}));

const record=f=>{const s=sources[f.source];return normalizeBatch([{source_id:f.source,external_id:f.ref,source_url:`${s.origin}/p/${encodeURIComponent(f.ref)}`,brand:s.brand,collection:f.collection,
  product_name:f.name_en,name_en:f.name_en,name_ar:f.name_ar,translation_state:'provided',image_urls:[`${s.origin}/img/${encodeURIComponent(f.ref)}.png`],
  facts:Object.entries(f.facts).filter(([,v])=>v).map(([key,value])=>({key,value}))}])[0];};
const product=(f,r)=>({candidate_id:r.candidate_id,revision_hash:r.revision_hash,slug:slugify(sources[f.source].brand+'-'+f.ref),reference:f.ref,brand_slug:slugify(sources[f.source].brand),
  brand_name:sources[f.source].brand,brand_tier:'luxury',category_slug:sources[f.source].category,collection_slug:slugify(f.collection),collection_ar:f.collection,collection_en:f.collection,
  name_ar:r.name_ar,name_en:r.name_en,description_ar:r.description_ar,description_en:r.description_en,images:[],search_text:(f.ref+' '+f.name_en).toLowerCase()});
const slugOf=ref=>{const f=[...fixtures,...large].find(x=>x.ref===ref);return slugify(sources[f.source].brand+'-'+f.ref);};

async function database(rows=fixtures){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec(await readFile(proposed,'utf8'));
  for(const [id,s] of Object.entries(sources))await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values($1,$2,'permitted-page','synthetic review',true,false,true)",[id,s.origin]);
  for(let i=0;i<rows.length;i+=50){
    const batch=rows.slice(i,i+50),records=batch.map(record);
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify(records)]);
    await db.query("select public.jwl_publish_factual_batch($1::jsonb,'synthetic owner instruction')",[JSON.stringify(batch.map((f,j)=>product(f,records[j])))]);
  }
  return db;
}
const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};
const derive=async db=>(await as(db,'service_role',()=>db.query('select * from jwl_internal.derive_product_variants() order by product_id'))).rows;
const apply=async db=>(await as(db,'service_role',()=>db.query('select jwl_internal.apply_product_variants() r'))).rows[0].r;
const byRef=async db=>{
  const refs=new Map((await db.query('select id,reference from public.jwl_catalog')).rows.map(r=>[r.id,r.reference]));
  return new Map((await derive(db)).map(r=>[refs.get(r.product_id),r]));
};
const snapshot=async db=>(await db.query(`select (select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by id),'')) from public.jwl_catalog c) catalog,
  (select md5(coalesce(string_agg((to_jsonb(v)-'mapped_at')::text,',' order by product_id),'')) from public.jwl_product_variants v) variants,
  (select count(*) from jwl_internal.variant_evidence) evidence,(select md5(string_agg(to_jsonb(c)::text,',' order by candidate_id)) from jwl_internal.candidates c) candidates`)).rows[0];

test('grouping follows official model codes, consistency and distinguishable options only',async()=>{
  const db=await database();
  try{
    const m=await byRef(db);
    const members=key=>[...m].filter(([,r])=>r.model_key===key).map(([ref])=>ref).sort();
    assert.deepEqual(members('rolex-official:126200'),['m126200-0001','m126200-0002','m126200-0006','m126200-0010']);
    for(const ref of ['m126200-0005','m126200-0029'])assert.equal(m.get(ref).rule,'single:ambiguous-options',ref+' shares dial and bracelet with another variant');
    assert.equal(m.get('m126200-0005').model_key,'rolex-official:m126200-0005');
    assert.deepEqual(members('rolex-official:126334'),['m126334-0001','m126334-0003']);
    for(const ref of ['m126300-0001','m126300-0002']){assert.equal(m.get(ref).rule,'single:inconsistent');assert.deepEqual(m.get(ref).basis.mismatched,['diameter']);}
    assert.deepEqual(members('rolex-official:278274'),['m278274-0001','m278274-0002'],'another recorded fact tells identical dial/bracelet apart');
    assert.deepEqual(m.get('m278274-0001').options.map(o=>o.kind),['bracelet_material']);
    for(const ref of ['m126610ln-0001','m126610lv-0002']){assert.equal(m.get(ref).rule,'single:only-variant');assert.equal(m.get(ref).model_key,'rolex-official:'+ref);}
    assert.deepEqual(members('loewe-official:328.24.W10'),['328.24.W10-1100','328.24.W10-2435']);
    for(const ref of ['A510S72X02-1100','A510S72X02-2530'])assert.deepEqual(m.get(ref).basis.mismatched,['dimensions']);
    assert.deepEqual(members('longchamp-official:L1899089'),['L1899089001','L1899089556','L1899089P59']);
    assert.deepEqual(members('loewe-official:328.25.A11'),['328.25.A11-1100','328.25.A11-2100']);
    for(const ref of ['L2605089001','L2605089545','328.26.B12-1100','328.26.B12-2435']){
      assert.equal(m.get(ref).rule,'single:arabic-name-mismatch',ref+': its Arabic name differs in a way no reviewed rule explains');
      assert.equal(m.get(ref).model_key,`${m.get(ref).model_key.split(':')[0]}:${ref}`);
      assert.equal(m.get(ref).basis.arabic_name,'unresolved');assert.deepEqual(m.get(ref).options,[]);
    }
    assert.deepEqual(members('bottega-veneta-official:498478VG0HH'),['498478VG0HH2725','498478VG0HH8803']);
    assert.equal(m.get('498478VG0HH9041').rule,'single:missing-option','a variant without a colour fact is not guessed into the colour options');
    for(const ref of ['1BA038_2CX9_F0018_V_8OM','B4084600','B4084700']){assert.equal(m.get(ref).rule,'single:no-linking-evidence');assert.deepEqual(m.get(ref).options,[]);}
    assert.equal(m.size,fixtures.length,'every active public row is mapped');
  }finally{await db.close();}
});

test('positions, primaries and model names are deterministic and never invented',async()=>{
  const db=await database(),reversed=await database([...fixtures].reverse());
  try{
    const rows=await derive(db),strip=r=>({...r,candidate_id:undefined,revision_hash:undefined});
    assert.deepEqual(rows.map(strip),(await derive(db)).map(strip),'a second derivation is identical');
    assert.deepEqual((await derive(reversed)).map(strip),rows.map(strip),'insertion order does not change the mapping');
    const models=Map.groupBy(rows,r=>r.model_key);
    for(const [key,list] of models){
      assert.equal(list.filter(r=>r.is_primary).length,1,key);
      assert.deepEqual(list.map(r=>r.position).sort((a,b)=>a-b),list.map((_,i)=>i),key);
      assert.equal(new Set(list.map(r=>JSON.stringify(r.model_name))).size,1,key);
      for(const r of list)assert.equal(r.is_primary,r.position===0);
    }
    const m=await byRef(db);
    assert.deepEqual(['m126200-0001','m126200-0002','m126200-0006','m126200-0010'].map(r=>m.get(r).position),[0,1,2,3],'ordered by reference');
    assert.deepEqual(m.get('m126200-0006').model_name,{ar:'ساعة رولكس ديت جست، 36 مم',en:'Rolex Datejust 36 watch: Oystersteel'},
      'the Arabic model name keeps the diameter every member shares, even when the primary variant name omits it');
    assert.equal(m.get('m126200-0006').basis.arabic_name,'shared_size');
    assert.deepEqual(m.get('L1899089556').model_name,{ar:'حقيبة كتف Le Pliage Original، مقاس كبير',en:'Le Pliage Original L Tote bag'});
    assert.deepEqual(m.get('L2605089545').model_name,{ar:'حقيبة يد Le Pliage Original، مقاس متوسط، لون آخر',en:'Le Pliage Original M Handbag — Cognac'},
      'an Arabic tail that is not the recorded colour leaves each row its own names, never another variant\'s colour');
    assert.deepEqual(m.get('328.25.A11-2100').model_name,{ar:'حقيبة Puzzle Fold',en:'Puzzle Fold tote in shiny calfskin'},'the reference is removed from both names');
    assert.deepEqual(m.get('328.26.B12-2435').model_name,{ar:'حقيبة Puzzle Fold، مقاس صغير - 328.26.B12-2435',en:'Puzzle Fold tote in shiny calfskin - 328.26.B12-2435'},
      'a single keeps its own reference and never another variant\'s');
    for(const [key,list] of models){
      if(list.length<2)continue;
      const {ar,en}=list[0].model_name,refs=[...m].filter(([,r])=>r.model_key===key).map(([ref])=>ref);
      for(const ref of refs)assert.ok(!ar.includes(ref)&&!en.includes(ref),`${key} names no variant reference`);
      for(const o of list.flatMap(r=>r.options).filter(o=>['dial','colour'].includes(o.kind)))
        assert.ok(!ar.includes(o.value.ar)&&!ar.includes(o.value.en),`${key} Arabic name carries no ${o.kind} value (${o.value.en})`);
    }
    assert.deepEqual(m.get('328.24.W10-2435').model_name,{ar:'حقيبة Puzzle، مقاس صغير، من جلد عجل كلاسيكي',en:'Small Puzzle bag in classic calfskin'});
    assert.deepEqual(m.get('m126200-0005').model_name,{ar:'ساعة رولكس ديت جست، 36 مم',en:'Rolex Datejust 36 watch: Oystersteel - m126200-0005'},'a single keeps its existing names');
  }finally{await db.close();await reversed.close();}
});

test('options and specs carry reviewed Arabic, source units and an explicit English fallback',async()=>{
  const db=await database();
  try{
    const m=await byRef(db);
    assert.deepEqual(m.get('m126200-0006').options,[
      {kind:'dial',label:{ar:'الميناء',en:'Dial'},value:{ar:'أزرق لامع',en:'Bright blue'},key:'bright-blue'},
      {kind:'bracelet',label:{ar:'السوار',en:'Bracelet'},value:{ar:'Oyster، حلقات صلبة من ثلاث قطع',en:oyster},key:'oyster-three-piece-solid-links'}]);
    assert.deepEqual(m.get('m126200-0010').options[0],{kind:'dial',label:{ar:'الميناء',en:'Dial'},value:{ar:'Candy pink',en:'Candy pink'},key:'candy-pink',value_lang:'en'});
    assert.deepEqual(m.get('m126334-0001').options.map(o=>o.kind),['dial'],'a constant bracelet is not an option');
    const specs=Object.fromEntries(m.get('m126200-0006').specs.map(s=>[s.kind,s]));
    assert.deepEqual(m.get('m126200-0006').specs.map(s=>s.kind),['diameter','material','dial','bracelet','bracelet_material','movement','power_reserve','water_resistance']);
    assert.deepEqual(specs.diameter,{kind:'diameter',label:{ar:'القطر',en:'Diameter'},value:{ar:'36 مم',en:'36 mm'}});
    assert.equal(specs.power_reserve.value.ar,'حوالي 55 ساعة');
    assert.equal(specs.water_resistance.value.ar,'مقاومة للماء حتى عمق 100 متر / 330 قدم');
    assert.equal(specs.movement.value.ar,'Perpetual، ميكانيكية، ذاتية التعبئة');
    assert.equal(m.get('m126334-0001').specs.find(s=>s.kind==='material').value.ar,'White Rolesor - مزيج من Oystersteel والذهب الأبيض');
    const tote=Object.fromEntries(m.get('L1899089556').specs.map(s=>[s.kind,s]));
    assert.deepEqual(tote.colour,{kind:'colour',label:{ar:'اللون',en:'Colour'},value:{ar:'كحلي',en:'Navy'}});
    assert.deepEqual(tote.dimensions.value,{ar:'31 x 30 x 19 سم',en:'31 x 30 x 19 cm'});
    assert.deepEqual(tote.material,{kind:'material',label:{ar:'المادة',en:'Material'},value:{ar:'Recycled canvas',en:'Recycled canvas'},value_lang:'en'});
    assert.equal(m.get('1BA038_2CX9_F0018_V_8OM').specs.find(s=>s.kind==='dimensions').value_lang,'en','an unreviewed measure phrase is not partly translated');
    assert.ok(m.get('B4084600').specs.every(s=>!['source_url','platform_sku'].includes(s.kind)));
    assert.ok(!JSON.stringify(await derive(db)).includes('https://'),'no source URL reaches the mapping or its evidence');
    const measure=async v=>(await db.query('select jwl_internal.arabic_measure($1) a',[v])).rows[0].a;
    assert.equal(await measure('41 mm'),'41 مم');assert.equal(await measure('12.5 x 8 in'),'12.5 x 8 إنش');
    assert.equal(await measure('Waterproof to 3,900 metres / 12,800 feet, helium escape valve'),'مقاومة للماء حتى عمق 3,900 متر / 12,800 قدم، مع صمام لتصريف الهيليوم');
    for(const v of ['Approximately 5 hours','Approximately 100 hours','41mm','41 mm wide','about 3 cm'])assert.equal(await measure(v),null,v);
  }finally{await db.close();}
});

test('the models view collapses each model to one card and the RPC returns the bounded model in one read',async()=>{
  const db=await database([...fixtures,...large]);
  try{
    const result=await apply(db);
    assert.equal(result.variants,fixtures.length+large.length);
    assert.equal(result.models,result.single_models+result.grouped_models);
    assert.equal(result.evidence_rows,result.variants);
    const anon=(sql,p)=>as(db,'anon',()=>db.query(sql,p)).then(r=>r.rows);
    const cards=await anon('select reference,model_key,model_name,variant_count,options_summary,search_text from public.jwl_catalog_models order by reference');
    assert.equal(cards.length,result.models);
    const card=key=>cards.find(c=>c.model_key===key);
    assert.deepEqual({...card('rolex-official:126200'),search_text:undefined},{reference:'m126200-0001',model_key:'rolex-official:126200',model_name:{ar:'ساعة رولكس ديت جست، 36 مم',en:'Rolex Datejust 36 watch: Oystersteel'},
      variant_count:4,options_summary:{dial:3,bracelet:2},search_text:undefined});
    assert.ok(card('rolex-official:126200').search_text.includes('m126200-0010'),'searching any variant reference finds its model card');
    assert.deepEqual(card('loewe-official:A000X01').options_summary,{colour:62});
    const single=cards.find(c=>c.reference==='B4084600');assert.equal(single.variant_count,1);assert.deepEqual(single.options_summary,{});
    const rpc=async slug=>(await anon('select public.jwl_product_model($1) m',[slug]))[0].m;
    const model=await rpc(slugOf('m126200-0006'));
    assert.deepEqual(Object.keys(model).sort(),['model_key','model_name','product','variant_count','variants']);
    assert.equal(model.product.reference,'m126200-0006');assert.equal(model.product.is_primary,false);
    assert.deepEqual(model.variants.map(v=>v.reference),['m126200-0001','m126200-0002','m126200-0006','m126200-0010']);
    assert.deepEqual(model.variants.map(v=>v.is_primary),[true,false,false,false]);
    assert.deepEqual(Object.keys(model.variants[0]).sort(),['brand_slug','category_slug','collection_ar','collection_en','collection_kind','collection_slug','description_ar','description_en','id','image_variants','images','is_primary','media_state','name_ar','name_en','options','position','published_at','reference','slug','specs']);
    assert.ok(!JSON.stringify(model).includes('search_text'));
    const big=await rpc(slugOf('A000X01-1062'));
    assert.equal(big.variants.length,60);assert.equal(big.variant_count,62);
    assert.ok(big.variants.some(v=>v.reference==='A000X01-1062'),'the requested variant is always included');
    assert.deepEqual(big.variants.map(v=>v.position),[...big.variants.map(v=>v.position)].sort((a,b)=>a-b));
    const lone=await rpc(slugOf('B4084600'));
    assert.equal(lone.model_key,'cartier-official:B4084600');assert.deepEqual(lone.variants.map(v=>v.reference),['B4084600']);
    assert.equal(await rpc('no-such-product'),null);assert.equal(await rpc('Invalid Slug'),null);
  }finally{await db.close();}
});

test('the collapsed brand page keeps the brand page envelope and matches it exactly for ungrouped data',async()=>{
  const db=await database();
  try{
    const page=(fn,brand,p=1,size=12)=>as(db,'anon',()=>db.query(`select public.${fn}($1,$2,$3) d`,[brand,p,size])).then(r=>r.rows[0].d);
    const plain=p=>({...p,items:p.items.map(({model_key,model_name,variant_count,options_summary,...rest})=>rest)});
    for(const brand of ['rolex','cartier','prada','missing-brand'])assert.deepEqual(plain(await page('jwl_brand_models_page',brand)),await page('jwl_brand_page',brand),'unmapped '+brand);
    await apply(db);
    for(const brand of ['cartier','prada'])assert.deepEqual(plain(await page('jwl_brand_models_page',brand)),await page('jwl_brand_page',brand),'singles '+brand);
    const rows=await page('jwl_brand_page','rolex',1,48),models=await page('jwl_brand_models_page','rolex',1,48);
    assert.equal(rows.total,14);assert.equal(models.total,9);
    assert.deepEqual(models.collections,rows.collections);assert.deepEqual(models.brands,rows.brands);assert.deepEqual(models.brand,rows.brand);
    assert.equal(models.items.find(i=>i.model_key==='rolex-official:126200').variant_count,4);
    assert.equal((await page('jwl_brand_models_page','rolex',1,999)).pageSize,48);
    assert.equal((await page('jwl_brand_models_page','rolex',99,4)).page,3);
    for(const p of (await db.query("select proname,prosecdef,provolatile from pg_proc where proname in ('jwl_brand_models_page','jwl_product_model','derive_product_variants')")).rows){assert.equal(p.prosecdef,false,p.proname);assert.equal(p.provolatile,'s',p.proname);}
  }finally{await db.close();}
});

test('anonymous readers see only active variants and a withdrawn primary hands the card on',async()=>{
  const db=await database();
  try{
    await apply(db);
    const anon=(sql,p)=>as(db,'anon',()=>db.query(sql,p)).then(r=>r.rows);
    const id=async ref=>(await db.query('select id from public.jwl_catalog where reference=$1',[ref])).rows[0].id;
    const before=(await anon('select count(*)::int n from public.jwl_product_variants'))[0].n;
    await db.query('update public.jwl_catalog set active=false where reference=$1',['m126200-0001']);
    assert.equal((await anon('select count(*)::int n from public.jwl_product_variants'))[0].n,before-1);
    assert.deepEqual(await anon('select * from public.jwl_product_variants where product_id=$1',[await id('m126200-0001')]),[]);
    const card=(await anon("select reference,variant_count,options_summary from public.jwl_catalog_models where model_key='rolex-official:126200'"));
    assert.deepEqual(card,[{reference:'m126200-0002',variant_count:3,options_summary:{dial:3}}],'a bracelet left with one value is no longer counted');
    assert.equal((await anon('select public.jwl_product_model($1) m',[slugOf('m126200-0001')]))[0].m,null,'a withdrawn variant URL is not served');
    const model=(await anon('select public.jwl_product_model($1) m',[slugOf('m126200-0010')]))[0].m;
    assert.deepEqual(model.variants.map(v=>[v.reference,v.is_primary]),[['m126200-0002',true],['m126200-0006',false],['m126200-0010',false]]);
    for(const role of ['anon','authenticated']){
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.variant_evidence')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.term_translations')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.derive_product_variants()')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query("insert into public.jwl_product_variants(product_id,model_key,is_primary,position,model_name,rule) values('x','a:b',true,0,'{\"ar\":\"x\",\"en\":\"x\"}','single:x')")),/permission denied/);
    }
  }finally{await db.close();}
});

test('derivation writes nothing; only service_role applies it, atomically and repeatably',async()=>{
  const db=await database();
  try{
    const start=await snapshot(db);
    await derive(db);await derive(db);
    assert.deepEqual(await snapshot(db),start,'derive_product_variants changes no table');
    for(const role of ['anon','authenticated'])await assert.rejects(as(db,role,()=>db.query('select jwl_internal.apply_product_variants()')),/permission denied/);
    assert.deepEqual(await snapshot(db),start);
    const first=await apply(db);
    assert.equal(first.rules['rolex-model-number'],8);assert.equal(first.rules['single:ambiguous-options'],2);assert.equal(first.rules['single:arabic-name-mismatch'],4);
    const mapped=await snapshot(db);
    assert.deepEqual(await apply(db),first,'a replay recomputes the same mapping');
    assert.deepEqual(await snapshot(db),mapped);
    const evidence=(await db.query("select e.rule,e.compared,e.basis,e.revision_hash=c.revision_hash bound from jwl_internal.variant_evidence e join jwl_internal.candidates c using(candidate_id) join public.jwl_catalog p on p.id=e.product_id where p.reference='m126200-0006'")).rows[0];
    assert.equal(evidence.bound,true);assert.equal(evidence.compared.diameter,'36 mm');assert.deepEqual(evidence.basis.option_facts,['color','bracelet_type']);
    // A direct write that breaks a model is refused by the table itself.
    await assert.rejects(as(db,'service_role',()=>db.query("update public.jwl_product_variants set position=0 where model_key='rolex-official:126200'")),/duplicate key|check constraint/);
    // A new candidate revision unmaps that row until the next run.
    const target=(await db.query("select id from public.jwl_catalog where reference='m126200-0006'")).rows[0].id;
    await db.query("update jwl_internal.candidates set revision_hash=repeat('e',64) where candidate_id=$1",[target]);
    assert.equal((await db.query('select count(*)::int n from public.jwl_product_variants where product_id=$1',[target])).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int n from jwl_internal.variant_evidence where product_id=$1',[target])).rows[0].n,0);
  }finally{await db.close();}
});

test('rollback drops only the proposed objects and leaves the catalog and its functions intact',async()=>{
  const db=await database();
  try{
    await apply(db);
    const catalog=(await db.query('select md5(string_agg(to_jsonb(c)::text,\',\' order by id)) h,count(*)::int n from public.jwl_catalog c')).rows[0];
    const page=await db.query("select public.jwl_brand_page('rolex',1,12) d");
    await db.exec(await readFile(rollback,'utf8'));
    for(const name of ['public.jwl_product_variants','public.jwl_catalog_models','jwl_internal.variant_evidence','jwl_internal.term_translations'])
      assert.equal((await db.query('select to_regclass($1) r',[name])).rows[0].r,null,name);
    assert.equal((await db.query("select count(*)::int n from pg_proc where proname in ('jwl_product_model','jwl_brand_models_page','derive_product_variants','apply_product_variants','arabic_measure','unmap_changed_variant')")).rows[0].n,0);
    assert.equal((await db.query("select count(*)::int n from pg_trigger where tgname='jwl_variant_revision_unmap'")).rows[0].n,0);
    assert.deepEqual((await db.query('select md5(string_agg(to_jsonb(c)::text,\',\' order by id)) h,count(*)::int n from public.jwl_catalog c')).rows[0],catalog);
    assert.deepEqual((await db.query("select public.jwl_brand_page('rolex',1,12) d")).rows,page.rows);
    for(const name of ['jwl_brand_page','jwl_publish_factual_batch','jwl_ingest_missing_batch','withdraw_revoked'])assert.equal((await db.query('select count(*)::int n from pg_proc where proname=$1',[name])).rows[0].n,1,name);
    await db.exec(await readFile(proposed,'utf8'));
    assert.equal((await apply(db)).variants,fixtures.length,'the proposal can be re-applied after a rollback');
  }finally{await db.close();}
});

test('derivation stays linear on a catalog the size of the live one',async()=>{
  // Synthetic rows only: 12 dials x 2 bracelets per Rolex model number and 10 colours per LOEWE style.
  const dials=['Silver','White','Blue','Green','Pink','Slate','Olive green','Bright blue','Bright black','Champagne-colour','Sundust','Chocolate'];
  const rows=Array.from({length:1200},(_,i)=>i%3
    ?datejust(`m9${String(10000+Math.floor(i/24)).slice(1)}-${String(1+i%24).padStart(4,'0')}`,dials[i%12],i%24<12?jubilee:oyster)
    :{...puzzle('',i%10?`Shade ${i%10}`:'Black',{lining:'Calfskin'}),ref:`Z${1000+Math.floor(i/30)}.W10-${1000+i%10}`});
  const db=await database(rows);
  try{
    const started=Date.now(),derived=await derive(db),elapsed=Date.now()-started;
    assert.equal(derived.length,rows.length);
    assert.equal(new Set(derived.map(r=>r.model_key)).size,1200/24+1200/30,'50 Rolex models of 16 variants and 40 LOEWE models of 10');
    assert.ok(derived.every(r=>!r.rule.startsWith('single:')));
    // The earlier quadratic per-row fact lookup took about 18 s here; the linear derivation takes about 1 s.
    assert.ok(elapsed<10000,`derivation took ${elapsed} ms`);
  }finally{await db.close();}
});
