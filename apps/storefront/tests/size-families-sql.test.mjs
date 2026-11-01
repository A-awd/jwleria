import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {postgrest,postgrestFetch} from './models-postgrest.mjs';
import {readProductModel} from '../src/server/supabase-catalog.mjs';
import {sizeTable} from '../src/components/variant-selection.mjs';

// Synthetic rows only, shaped like the captured data; the size layer (applied as 20261101133722) runs in memory here.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const SIZE='20261101133722_jwleria_size_families.sql';
const proposed=new URL(SIZE,migrations);
const rollback=new URL('../supabase/proposed/jwleria_size_families.rollback.sql',import.meta.url);
const slugify=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const sources={
  'rolex-official':{origin:'https://www.rolex.com',brand:'Rolex',category:'watches'},
  'loewe-official':{origin:'https://www.loewe.com',brand:'LOEWE',category:'handbags'},
  'longchamp-official':{origin:'https://www.longchamp.com',brand:'Longchamp',category:'handbags'},
  'prada-official':{origin:'https://www.prada.com',brand:'Prada',category:'handbags'},
  'cartier-official':{origin:'https://www.cartier.com',brand:'Cartier',category:'bracelets'},
  'van-cleef-and-arpels-official':{origin:'https://www.vancleefarpels.com',brand:'Van Cleef & Arpels',category:'bracelets'},
  'jaeger-lecoultre-official':{origin:'https://www.jaeger-lecoultre.com',brand:'Jaeger-LeCoultre',category:'watches'},
  'bottega-veneta-official':{origin:'https://www.bottegaveneta.com',brand:'Bottega Veneta',category:'handbags'},
};
const oyster='Oyster, three-piece solid links',jubilee='Jubilee, five-piece links';
// Rolex: the description states the case material and bezel; the Arabic name is in either captured form.
const rolex=(ref,dia,{line='Datejust',collection='datejust',material='Oystersteel',caseIn='Oystersteel',bezel='Domed',color='Silver',bracelet=oyster,ar}={})=>({
  source:'rolex-official',ref,collection,name_en:`Rolex ${line} ${dia} watch: ${caseIn} - ${ref}`,name_ar:ar??`ساعة رولكس ديت جست، ${dia} مم`,
  description:`Discover the ${line} ${dia} ref. ${ref} on Rolex.com. ${dia} mm Oyster case in ${caseIn}, ${bezel} bezel, ${color} dial. ${bracelet} bracelet in ${material}`,
  facts:{diameter:`${dia} mm`,material,movement:'Perpetual, mechanical, self-winding',water_resistance:'Waterproof to 100 metres / 330 feet',
    power_reserve:dia===31?'Approximately 55 hours':'Approximately 70 hours',bracelet_material:material,color,bracelet_type:bracelet}});
const rolesor='White Rolesor - combination of Oystersteel and white gold',rolesorCase='Oystersteel and white gold';
const loewe=(ref,size,{rest='Puzzle bag in classic calfskin',material='Classic calfskin',color='Black',dims,ar}={})=>({source:'loewe-official',ref,collection:'Puzzle',
  name_en:`${size} ${rest}`,name_ar:ar??`حقيبة بازِل ${{Small:'صغيرة',Medium:'متوسطة',Mini:'ميني'}[size]}`,facts:{color,dimensions:dims??{Small:'24 x 16.5 x 10.5 cm',Medium:'29 x 18.5 x 12 cm',Mini:'18 x 12.5 x 8 cm'}[size],material}});
const longchamp=(ref,size,color,ar,colourAr)=>({source:'longchamp-official',ref,collection:'Le Pliage Original',name_en:`Le Pliage Original ${size} Handbag — ${color}`,
  name_ar:`حقيبة يد Le Pliage Original، مقاس ${ar}، ${colourAr}`,facts:{color,dimensions:size==='S'?'23 x 22 x 14 cm':'30 x 30 x 20 cm',material:'Recycled canvas'}});
const prada=(ref,size,ar)=>({source:'prada-official',ref,collection:'Prada Galleria',name_en:`Prada Galleria ${size} Saffiano leather bag`,name_ar:`حقيبة Prada Galleria ${ar}`,
  facts:{material:'Saffiano leather',dimensions:size==='small'?'24 x 18 x 11 cm (width x height x length)':'30 x 22 x 14 cm (width x height x length)'}});
const cartier=(ref,size,ar,metal)=>({source:'cartier-official',ref,collection:'LOVE',name_en:`LOVE bracelet, ${size} model`,name_ar:`سوار لوف، الموديل ${ar}`,
  description:metal,facts:{material:metal.toLowerCase()}});
const perlee=(ref,size,ar)=>({source:'van-cleef-and-arpels-official',ref,collection:'Perlée',name_en:`Perlée clovers bracelet, ${size} model`,name_ar:`سوار بيرليه كلوفر، الموديل ${ar}`,
  description:`Perlée clovers bracelet, ${size} model, 18K yellow gold.`,facts:{material:'yellow gold'}});
const arpels=(ref,dia)=>({source:'van-cleef-and-arpels-official',ref,collection:'Pierre Arpels',name_en:`Pierre Arpels watch, ${dia} mm`,name_ar:`ساعة بيير آربلز، ${dia} مم`,
  description:`Pierre Arpels watch, ${dia} mm. ${dia} mm 18K rose gold case; white lacquer dial.`,facts:{material:'rose gold'}});
const fixtures=[
  // One domed Oystersteel Datejust at 31 and 36 mm (the 31 mm Arabic name carries the bare number, as captured).
  rolex('m278240-0001',31,{ar:'ساعة رولكس ديت جست 31'}),rolex('m278240-0002',31,{color:'Pink',ar:'ساعة رولكس ديت جست 31'}),
  rolex('m126200-0001',36,{bracelet:jubilee}),rolex('m126200-0002',36),rolex('m126200-0006',36,{color:'Bright blue'}),
  // The 41 mm Oystersteel Datejust has a smooth bezel: another design, never merged with the domed one.
  rolex('m126300-0001',41,{bezel:'Smooth',color:'Bright blue'}),rolex('m126300-0002',41,{bezel:'Smooth',color:'Slate'}),
  // Fluted White Rolesor at 36 and 41 mm.
  rolex('m126234-0001',36,{material:rolesor,caseIn:rolesorCase,bezel:'Fluted',color:'Blue',bracelet:jubilee}),
  rolex('m126234-0002',36,{material:rolesor,caseIn:rolesorCase,bezel:'Fluted',color:'White',bracelet:jubilee}),
  rolex('m126334-0001',41,{material:rolesor,caseIn:rolesorCase,bezel:'Fluted',color:'Blue',bracelet:jubilee}),
  // Two model numbers share one 36 mm diamond-set design: which one a 31 mm belongs to is unknown, so none is merged.
  rolex('m126284rbr-0001',36,{material:rolesor,caseIn:rolesorCase,bezel:'Diamond-set'}),rolex('m126294rbr-0001',36,{material:rolesor,caseIn:rolesorCase,bezel:'Diamond-set'}),
  rolex('m278384rbr-0001',31,{material:rolesor,caseIn:rolesorCase,bezel:'Diamond-set',ar:'ساعة رولكس ديت جست 31'}),
  // Same material and bezel in another collection: never merged across collections.
  rolex('m124270-0001',36,{line:'Explorer',collection:'explorer',bezel:'Smooth',color:'Black',ar:'ساعة رولكس إكسبلورر، 36 مم'}),
  loewe('328.24.W10-1100','Small'),loewe('328.24.W10-2435','Small',{color:'Tan'}),loewe('328.25.W11-1100','Medium'),
  loewe('328.26.S12-1100','Small',{rest:'Puzzle bag in shiny calfskin',material:'Shiny calfskin'}),
  loewe('328.27.M13-1100','Medium',{rest:'Puzzle bag in suede',material:'Suede'}),loewe('328.28.M14-1100','Medium',{rest:'Puzzle bag in suede',material:'Suede'}),
  loewe('328.29.S15-1100','Small',{rest:'Puzzle bag in suede',material:'Suede'}),
  longchamp('L1621089001','S','Black','صغير','أسود'),longchamp('L1621089556','S','Navy','صغير','كحلي'),longchamp('L1899089001','L','Black','كبير','أسود'),
  prada('1BA896_NZV_F0002_V_OOO','small','صغيرة'),prada('1BA863_NZV_F0002_V_OOO','medium','متوسطة'),prada('1BA863_NZV_F0009_V_OOO','medium','متوسطة'),
  cartier('B6047517','small','الصغير','Yellow gold'),cartier('B6067517','classic','الكلاسيكي','Yellow gold'),cartier('B6067417','classic','الكلاسيكي','White gold'),
  perlee('VCARN9E000','small','الصغير'),perlee('VCARN9E100','medium','المتوسط'),arpels('VCARO3GN00',38),arpels('VCARO3GO00',42),
  // Words that are not sizes: a complication and a design name.
  {source:'jaeger-lecoultre-official',ref:'Q3858520',collection:'Reverso',name_en:'Reverso Classic Monoface Small Seconds',name_ar:'ريفيرسو كلاسيك مونوفيس سمول سيكوندز',facts:{material:'Stainless steel'}},
  {source:'jaeger-lecoultre-official',ref:'Q3858521',collection:'Reverso',name_en:'Reverso Classic Monoface Large Seconds',name_ar:'ريفيرسو كلاسيك مونوفيس',facts:{material:'Stainless steel'}},
  {source:'bottega-veneta-official',ref:'607668VMAY39041',collection:'Intreccio',name_en:'Maxi Intreccio Tote in White/black',name_ar:'حقيبة إنتريتشيو ماكسي',facts:{color:'White/black',material:'leather'}},
];
// More than 60 real combinations in one family: 31 colours at each of two sizes.
const shades=Array.from({length:31},(_,i)=>`Shade ${String(i+1).padStart(2,'0')}`);
const many=['Mini','Medium'].flatMap((size,s)=>shades.map((color,i)=>loewe(`A0${s+1}0X01-${1001+i}`,size,{rest:'Flamenco clutch in nappa calfskin',material:'Nappa calfskin',color,
  dims:s?'30 x 20 x 10 cm':'20 x 13 x 6 cm',ar:`حقيبة كلاتش Flamenco، مقاس ${s?'متوسط':'ميني'}، من جلد عجل نابا`})));

const record=f=>{const s=sources[f.source];return normalizeBatch([{source_id:f.source,external_id:f.ref,source_url:`${s.origin}/p/${encodeURIComponent(f.ref)}`,brand:s.brand,collection:f.collection,
  product_name:f.name_en,name_en:f.name_en,name_ar:f.name_ar,translation_state:'provided',image_urls:[`${s.origin}/img/${encodeURIComponent(f.ref)}.png`],
  ...(f.description?{source_description:f.description}:{}),facts:Object.entries(f.facts).filter(([,v])=>v).map(([key,value])=>({key,value}))}])[0];};
const product=(f,r)=>({candidate_id:r.candidate_id,revision_hash:r.revision_hash,slug:slugify(sources[f.source].brand+'-'+f.ref),reference:f.ref,brand_slug:slugify(sources[f.source].brand),
  brand_name:sources[f.source].brand,brand_tier:'luxury',category_slug:sources[f.source].category,collection_slug:slugify(f.collection),collection_ar:f.collection,collection_en:f.collection,
  name_ar:r.name_ar,name_en:r.name_en,description_ar:r.description_ar,description_en:r.description_en,images:[],search_text:(f.ref+' '+f.name_en).toLowerCase()});
const slugOf=ref=>{const f=[...fixtures,...many].find(x=>x.ref===ref);return slugify(sources[f.source].brand+'-'+f.ref);};

async function database(rows=fixtures,{sized=true}={}){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&f!==SIZE).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  for(const [id,s] of Object.entries(sources))await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values($1,$2,'permitted-page','synthetic review',true,false,true)",[id,s.origin]);
  for(let i=0;i<rows.length;i+=50){
    const batch=rows.slice(i,i+50),records=batch.map(record);
    await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify(records)]);
    await db.query("select public.jwl_publish_factual_batch($1::jsonb,'synthetic owner instruction')",[JSON.stringify(batch.map((f,j)=>product(f,records[j])))]);
  }
  if(sized)await db.exec(await readFile(proposed,'utf8'));
  return db;
}
const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};
const derive=async db=>(await as(db,'service_role',()=>db.query('select * from jwl_internal.derive_product_variants() order by product_id'))).rows;
const apply=async db=>(await as(db,'service_role',()=>db.query('select jwl_internal.apply_product_variants() r'))).rows[0].r;
const byRef=async db=>{
  const refs=new Map((await db.query('select id,reference from public.jwl_catalog')).rows.map(r=>[r.id,r.reference]));
  return new Map((await derive(db)).map(r=>[refs.get(r.product_id),r]));
};
const anon=(db,sql,p)=>as(db,'anon',()=>db.query(sql,p)).then(r=>r.rows);
const v2=async(db,ref)=>(await anon(db,'select public.jwl_product_model_v2($1) m',[slugOf(ref)]))[0].m;
const snapshot=async db=>(await db.query(`select (select md5(coalesce(string_agg(to_jsonb(c)::text,',' order by id),'')) from public.jwl_catalog c) catalog,
  (select md5(coalesce(string_agg((to_jsonb(v)-'mapped_at')::text,',' order by product_id),'')) from public.jwl_product_variants v) variants,
  (select md5(coalesce(string_agg((to_jsonb(e)-'recorded_at')::text,',' order by product_id),'')) from jwl_internal.variant_evidence e) evidence`)).rows[0];
// A synthetic photograph on one row, bypassing the media evidence triggers (this file tests the model reads only).
const photograph=async(db,ref)=>{await db.exec('set session_replication_role=replica');
  await db.query("update public.jwl_catalog set images='[\"https://media.example.test/a.webp\"]'::jsonb,media_state='approved_media' where reference=$1",[ref]);
  await db.exec('set session_replication_role=origin');};

test('sizes of one genuine design join one model; other designs, collections, materials and colour codes do not',async()=>{
  const db=await database();
  try{
    const m=await byRef(db);
    const family=ref=>[...m].filter(([,r])=>r.model_key===m.get(ref).model_key).map(([k])=>k).sort();
    assert.deepEqual(family('m126200-0006'),['m126200-0001','m126200-0002','m126200-0006','m278240-0001','m278240-0002']);
    assert.equal(m.get('m126200-0006').rule,'rolex-size-family');
    assert.match(m.get('m126200-0006').model_key,/^rolex-official:size:[0-9a-f]{16}$/);
    assert.deepEqual(m.get('m126200-0006').model_name,{ar:'ساعة رولكس ديت جست',en:'Rolex Datejust watch: Oystersteel'},'no size in the model name, in either language');
    assert.deepEqual(family('m126300-0001'),['m126300-0001','m126300-0002'],'a smooth bezel is another design');
    assert.equal(m.get('m126300-0001').rule,'rolex-model-number');assert.equal(m.get('m126300-0001').basis.size_check,'one-size');
    assert.deepEqual(family('m126334-0001'),['m126234-0001','m126234-0002','m126334-0001']);
    for(const ref of ['m126284rbr-0001','m126294rbr-0001','m278384rbr-0001']){
      assert.ok(m.get(ref).rule.startsWith('single:'),ref);assert.equal(m.get(ref).basis.size_check,'several-models-per-size',ref);
    }
    assert.deepEqual(family('m124270-0001'),['m124270-0001'],'another collection is never merged');
    assert.deepEqual(family('328.25.W11-1100'),['328.24.W10-1100','328.24.W10-2435','328.25.W11-1100']);
    assert.deepEqual(m.get('328.25.W11-1100').model_name,{ar:'حقيبة بازِل',en:'Puzzle bag in classic calfskin'});
    assert.deepEqual(family('328.26.S12-1100'),['328.26.S12-1100'],'another material is another design');
    for(const ref of ['328.27.M13-1100','328.28.M14-1100','328.29.S15-1100'])assert.equal(m.get(ref).basis.size_check,'several-models-per-size',ref);
    assert.deepEqual(family('L1899089001'),['L1621089001','L1621089556','L1899089001']);
    assert.deepEqual(m.get('L1899089001').model_name,{ar:'حقيبة يد Le Pliage Original',en:'Le Pliage Original Handbag'});
    assert.deepEqual(family('1BA896_NZV_F0002_V_OOO'),['1BA863_NZV_F0002_V_OOO','1BA896_NZV_F0002_V_OOO'],'Prada sizes join only with the same material and colour codes');
    assert.deepEqual(family('1BA863_NZV_F0009_V_OOO'),['1BA863_NZV_F0009_V_OOO']);
    assert.deepEqual(m.get('1BA896_NZV_F0002_V_OOO').model_name,{ar:'حقيبة Prada Galleria',en:'Prada Galleria Saffiano leather bag'});
    assert.deepEqual(family('B6047517'),['B6047517','B6067517']);assert.deepEqual(family('B6067417'),['B6067417'],'another metal is another design');
    assert.deepEqual(m.get('B6047517').model_name,{ar:'سوار لوف',en:'LOVE bracelet'});
    assert.deepEqual(family('VCARN9E000'),['VCARN9E000','VCARN9E100']);assert.deepEqual(family('VCARO3GN00'),['VCARO3GN00','VCARO3GO00']);
    assert.deepEqual(m.get('VCARO3GO00').model_name,{ar:'ساعة بيير آربلز',en:'Pierre Arpels watch'});
    for(const ref of ['Q3858520','Q3858521','607668VMAY39041']){
      assert.ok(m.get(ref).rule.startsWith('single:'),ref+': not a size word for that source');assert.match(m.get(ref).model_key,/:ref:/,ref);
    }
    // Brand never mixes: every member of a model shares its source.
    const source=new Map((await db.query('select candidate_id,source_id from jwl_internal.candidates')).rows.map(r=>[r.candidate_id,r.source_id]));
    for(const [key,list] of Map.groupBy(await derive(db),r=>r.model_key))assert.equal(new Set(list.map(r=>source.get(r.product_id))).size,1,key);
    assert.equal(m.size,fixtures.length,'every active row is mapped');
  }finally{await db.close();}
});

test('a size is a separate option kind with source units, and the existing options and positions stay real',async()=>{
  const db=await database();
  try{
    const m=await byRef(db);
    assert.deepEqual(m.get('m278240-0002').options,[
      {kind:'case_size',label:{ar:'قطر العلبة',en:'Case diameter'},value:{ar:'31 مم',en:'31 mm'},key:'31-mm'},
      {kind:'dial',label:{ar:'الميناء',en:'Dial'},value:{ar:'وردي',en:'Pink'},key:'pink'},
      {kind:'bracelet',label:{ar:'السوار',en:'Bracelet'},value:{ar:'Oyster، حلقات صلبة من ثلاث قطع',en:oyster},key:'oyster-three-piece-solid-links'}]);
    assert.deepEqual(['m278240-0001','m278240-0002','m126200-0001','m126200-0002','m126200-0006'].map(r=>m.get(r).position),[0,1,2,3,4],'by size, then the base order');
    assert.equal(m.get('m278240-0001').is_primary,true);
    assert.deepEqual(m.get('328.25.W11-1100').options[0],{kind:'bag_size',label:{ar:'مقاس الحقيبة',en:'Bag size'},value:{ar:'متوسط',en:'Medium'},key:'medium'});
    assert.deepEqual(m.get('L1899089001').options[0],{kind:'bag_size',label:{ar:'مقاس الحقيبة',en:'Bag size'},value:{ar:'L',en:'L'},key:'l',value_lang:'en'},'a size letter stays as the source writes it');
    assert.deepEqual(m.get('B6067517').options,[{kind:'model_size',label:{ar:'حجم الموديل',en:'Model size'},value:{ar:'الموديل الكلاسيكي',en:'Classic model'},key:'classic-model'}],
      'the maker\'s model size, not a wrist size');
    assert.deepEqual(m.get('VCARO3GO00').options,[{kind:'case_size',label:{ar:'قطر العلبة',en:'Case diameter'},value:{ar:'42 مم',en:'42 mm'},key:'42-mm'}]);
    assert.deepEqual(m.get('m126200-0006').specs,m.get('m126200-0006').specs,'specs come unchanged from the exact revision');
    for(const [key,list] of Map.groupBy(await derive(db),r=>r.model_key)){
      assert.equal(list.filter(r=>r.is_primary).length,1,key);
      assert.deepEqual(list.map(r=>r.position).sort((a,b)=>a-b),list.map((_,i)=>i),key);
      assert.equal(new Set(list.map(r=>JSON.stringify(r.model_name))).size,1,key);
      if(list.length>1)assert.equal(new Set(list.map(r=>r.options.map(o=>o.kind+'='+o.key).join('|'))).size,list.length,key+': every variant is a distinct real combination');
    }
    const strip=r=>({...r,candidate_id:undefined,revision_hash:undefined});
    const reversed=await database([...fixtures].reverse());
    try{assert.deepEqual((await derive(reversed)).map(strip),(await derive(db)).map(strip),'insertion order does not change the mapping');}finally{await reversed.close();}
  }finally{await db.close();}
});

test('the v2 read keeps every variant, every old URL and a compact table of real sizes',async()=>{
  const db=await database([...fixtures,...many]);
  try{
    const result=await apply(db);
    assert.equal(result.variants,fixtures.length+many.length);
    for(const f of [...fixtures,...many]){
      const model=await v2(db,f.ref);
      assert.equal(model.product.reference,f.ref,'every existing variant URL still resolves to itself');
      assert.ok(model.variants.length===0||model.variants.some(v=>v.reference===f.ref));
    }
    const big=await v2(db,'A010X01-1001');
    assert.equal(big.variant_count,62);assert.equal(big.variants.length,62,'no size or colour is cut off');
    assert.deepEqual(Object.keys(big.variants[0]).sort(),['has_image','id','is_primary','options','position','reference','slug']);
    const v1=(await anon(db,'select public.jwl_product_model($1) m',[slugOf('A020X01-1031')]))[0].m;
    assert.equal(v1.variants.length,60,'the older read keeps its bound');
    const dj=await v2(db,'m126200-0006');
    assert.deepEqual(dj.sizes.map(s=>[s.option.value.en,s.variant_count,s.options]),[['31 mm',2,{dial:2,bracelet:1}],['36 mm',3,{dial:2,bracelet:2}]],'only real sizes, with the options each really has (31 mm comes on one bracelet only)');
    assert.deepEqual(dj.sizes.map(s=>s.facts.map(f=>[f.kind,f.value.en])),[[['diameter','31 mm'],['power_reserve','Approximately 55 hours']],[['diameter','36 mm'],['power_reserve','Approximately 70 hours']]],
      'facts that differ by size; shared facts are not repeated');
    assert.deepEqual((await v2(db,'328.25.W11-1100')).sizes.map(s=>[s.option.value.en,s.facts.map(f=>f.value.en)]),[['Small',['24 x 16.5 x 10.5 cm']],['Medium',['29 x 18.5 x 12 cm']]]);
    assert.deepEqual((await v2(db,'Q3858520')).sizes,[]);
    assert.equal(await anon(db,'select public.jwl_product_model_v2($1) m',['no-such-product']).then(r=>r[0].m),null);
    const cards=await anon(db,"select reference,model_key,variant_count,options_summary from public.jwl_catalog_models where model_key=$1",[dj.model_key]);
    assert.deepEqual(cards,[{reference:'m278240-0001',model_key:dj.model_key,variant_count:5,options_summary:{case_size:2,dial:3,bracelet:2}}],'one card for the whole design');
  }finally{await db.close();}
});

test('a card shows the photographed variant; a page without its own photograph names the representative one',async()=>{
  const db=await database();
  try{
    await apply(db);await photograph(db,'m126200-0006');
    const key=(await v2(db,'m126200-0006')).model_key;
    assert.deepEqual(await anon(db,'select reference from public.jwl_catalog_models where model_key=$1',[key]),[{reference:'m126200-0006'}],'the card image is that variant\'s own photograph');
    const own=await v2(db,'m126200-0006');assert.equal(own.representative,null,'a variant with its own photograph needs no representative');
    const sameSize=await v2(db,'m126200-0001');
    assert.equal(sameSize.representative.reference,'m126200-0006');assert.equal(sameSize.representative.same_size,true);
    assert.equal(sameSize.representative.size_option.value.en,'36 mm');
    const other=await v2(db,'m278240-0001');
    assert.equal(other.representative.reference,'m126200-0006');assert.equal(other.representative.same_size,false,'a 31 mm page is told the photograph is of 36 mm');
    assert.equal(other.product.images.length,0,'the selected variant keeps no image of its own');
    assert.deepEqual(own.variants.find(v=>v.reference==='m126200-0006').has_image,true);
    const search=await anon(db,"select reference,model_key from public.jwl_catalog_models_search('m278240-0002')");
    assert.deepEqual(search,[{reference:'m278240-0002',model_key:key}],'search still opens the reference it found');
  }finally{await db.close();}
});

test('the storefront adapter reads the v2 function as PostgREST serves it and builds the size table from it',async()=>{
  const db=await database([...fixtures,...many]);
  try{
    await apply(db);await photograph(db,'m126200-0006');
    const key='sb_publishable_sizes',handle=postgrest(db,{key,functions:{jwl_product_model_v2:{p_slug:'text'}}});
    let configs=0;
    const read=async ref=>{const log=[];const model=await readProductModel({url:`https://sizes-e2e-${++configs}.supabase.co`,key},slugOf(ref),postgrestFetch(handle,log));return {model,log};};
    const {model,log}=await read('m278240-0002');
    assert.deepEqual(log.map(u=>u.pathname),['/rest/v1/rpc/jwl_product_model_v2'],'one round trip');
    assert.deepEqual(model.variants.map(v=>v.reference),['m278240-0001','m278240-0002','m126200-0001','m126200-0002','m126200-0006']);
    assert.equal(model.selected.reference,'m278240-0002');assert.equal(model.primary.reference,'m278240-0001');
    assert.deepEqual(model.name,{ar:'ساعة رولكس ديت جست',en:'Rolex Datejust watch: Oystersteel'});
    assert.equal(model.representative.reference,'m126200-0006');assert.equal(model.representative.sameSize,false);
    const table=sizeTable(model);
    assert.deepEqual(table.rows.map(r=>[r.option.value.en,r.reference,r.current,r.changes.map(c=>c.value.en)]),[['31 mm','m278240-0002',true,[]],['36 mm','m126200-0002',false,['Silver']]],
      'pink does not exist at 36 mm: the row links silver and says so');
    const big=(await read('A020X01-1031')).model;
    assert.equal(big.variants.length,62);assert.equal(big.variantCount,62,'a family above 60 variants loses nothing');
    assert.deepEqual(sizeTable(big).rows.map(r=>[r.option.value.en,r.reference,r.changes.length]),[['Mini','A010X01-1031',0],['Medium','A020X01-1031',0]]);
    const lone=(await read('Q3858520')).model;
    assert.equal(lone.variants.length,1);assert.equal(sizeTable(lone),undefined);
  }finally{await db.close();}
});

test('apply is atomic and repeatable; rollback restores the base mapping and card rule exactly',async()=>{
  const db=await database(fixtures,{sized:false});
  try{
    await apply(db);
    const before=await snapshot(db);
    await db.exec(await readFile(proposed,'utf8'));
    assert.deepEqual(await snapshot(db),before,'the migration itself regroups nothing');
    const first=await apply(db);
    assert.equal(first.rules['rolex-size-family'],8);assert.equal(first.rules['loewe-size-family'],3);
    const mapped=await snapshot(db);
    assert.deepEqual(await apply(db),first,'a replay recomputes the same mapping');assert.deepEqual(await snapshot(db),mapped);
    assert.notDeepEqual(mapped.variants,before.variants);
    for(const role of ['anon','authenticated']){
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.derive_product_variants()')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query('select * from jwl_internal.derive_base_variants()')),/permission denied/);
      await assert.rejects(as(db,role,()=>db.query('select jwl_internal.apply_product_variants()')),/permission denied/);
    }
    for(const p of (await db.query("select proname,prosecdef,provolatile from pg_proc where proname in ('jwl_product_model_v2','derive_product_variants','derive_base_variants')")).rows){
      assert.equal(p.prosecdef,false,p.proname);assert.equal(p.provolatile,'s',p.proname);
    }
    await photograph(db,'m126200-0006');
    await db.exec(await readFile(rollback,'utf8'));
    await db.exec('set session_replication_role=replica');
    await db.query("update public.jwl_catalog set images='[]'::jsonb,media_state='facts_only' where reference='m126200-0006'");
    await db.exec('set session_replication_role=origin');
    assert.deepEqual(await snapshot(db),before,'the base mapping and evidence are restored exactly');
    assert.equal((await db.query("select to_regprocedure('public.jwl_product_model_v2(text)') r")).rows[0].r,null);
    assert.equal((await db.query("select to_regprocedure('jwl_internal.derive_base_variants()') r")).rows[0].r,null);
    assert.equal((await db.query("select count(*)::int n from jwl_internal.term_translations where kind='size'")).rows[0].n,0);
    const card=await anon(db,"select reference from public.jwl_catalog_models where model_key='rolex-official:126200'");
    assert.deepEqual(card,[{reference:'m126200-0001'}],'the card is again the first variant by position');
    await db.exec(await readFile(proposed,'utf8'));
    assert.deepEqual(await apply(db),first,'the proposal can be re-applied after a rollback');
  }finally{await db.close();}
});

test('the size layer stays linear on a catalogue the size of the live one',async()=>{
  const rows=Array.from({length:1200},(_,i)=>{
    const model=Math.floor(i/12),size=model%2?36:31;
    return rolex(`m${size===36?1262:2782}${String(model).padStart(2,'0')}-${String(1+i%12).padStart(4,'0')}`,size,
      {color:`Shade ${i%12}`,collection:'datejust',bezel:`Bezel ${Math.floor(model/2)}`,ar:size===31?'ساعة رولكس ديت جست 31':undefined});
  });
  const db=await database(rows);
  try{
    const started=Date.now(),derived=await derive(db),elapsed=Date.now()-started;
    assert.equal(derived.length,rows.length);
    assert.equal(new Set(derived.map(r=>r.model_key)).size,50,'one family per design, each with its two sizes');
    assert.ok(elapsed<15000,`derivation took ${elapsed} ms`);
  }finally{await db.close();}
});
