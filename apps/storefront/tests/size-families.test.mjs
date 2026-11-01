import test from 'node:test';
import assert from 'node:assert/strict';
import {productModelIndex,readProductModel} from '../src/server/supabase-catalog.mjs';
import {sizeTable,selectorAxes} from '../src/components/variant-selection.mjs';

let n=0;
const config=()=>({url:`https://sizes-${++n}.supabase.co`,key:'sb_publishable_TEST'});
const row={id:'id-m278240-0001',slug:'rolex-m278240-0001',reference:'m278240-0001',brand_slug:'rolex',category_slug:'watches',collection_slug:'datejust',collection_kind:'collection',
  collection_ar:'datejust',collection_en:'datejust',name_ar:'ساعة رولكس ديت جست 31',name_en:'Rolex Datejust 31 watch: Oystersteel - m278240-0001',description_ar:'حقائق',description_en:'Facts',
  images:[],image_variants:[],media_state:'facts_only',published_at:'2026-10-26T00:00:00Z'};
const size=(dia,ar)=>({kind:'case_size',label:{ar:'قطر العلبة',en:'Case diameter'},value:{ar,en:dia},key:dia.replace(' ','-')});
const dial=(en,ar)=>({kind:'dial',label:{ar:'الميناء',en:'Dial'},value:{ar,en},key:en.toLowerCase().replace(/ /g,'-')});
const s31=size('31 mm','31 مم'),s36=size('36 mm','36 مم'),silver=dial('Silver','فضي'),pink=dial('Pink','وردي'),blue=dial('Bright blue','أزرق لامع');
const link=(ref,position,options,has_image=false)=>({id:`id-${ref}`,slug:`rolex-${ref}`,reference:ref,options,position,is_primary:position===0,has_image});
const links=[link('m278240-0001',0,[s31,silver]),link('m278240-0002',1,[s31,pink]),link('m126200-0002',2,[s36,silver]),link('m126200-0006',3,[s36,blue],true)];
const spec=(kind,en,ar=en)=>({kind,label:{ar:kind,en:kind},value:{ar,en}});
const image='https://media.example.supabase.co/storage/v1/object/public/jwl-product-media/v1/a/b/640w-c.webp';
const envelope=(over={})=>({
  product:{...row,options:[s31,silver],specs:[spec('diameter','31 mm','31 مم'),spec('power_reserve','Approximately 55 hours')],position:0,is_primary:true},
  model_key:'rolex-official:size:0123456789abcdef',model_name:{ar:'ساعة رولكس ديت جست',en:'Rolex Datejust watch: Oystersteel'},variant_count:4,variants:links,
  sizes:[{key:'31-mm',option:s31,variant_count:2,facts:[spec('diameter','31 mm','31 مم'),spec('power_reserve','Approximately 55 hours')],options:{dial:2}},
    {key:'36-mm',option:s36,variant_count:2,facts:[spec('diameter','36 mm','36 مم'),spec('power_reserve','Approximately 70 hours')],options:{dial:2}}],
  representative:{slug:'rolex-m126200-0006',reference:'m126200-0006',size_option:s36,images:[image],
    image_variants:[{src:image,width:640,height:675,variants:[{src:image,width:640,height:675,bytes:58690}],attribution:{creator:'Remi Mathis',license:'CC BY-SA 4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',source_url:'https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_126200-0006.jpg',changes:'background removed, resized and converted to WebP'}}],same_size:false},
  ...over});

test('the v2 read lists every variant as a link, the selected one in full, its real sizes and the named representative photograph',async()=>{
  const calls=[];
  const model=await readProductModel(config(),row.slug,async url=>{calls.push(url.pathname);return Response.json(envelope());});
  assert.deepEqual(calls,['/rest/v1/rpc/jwl_product_model_v2'],'one round trip');
  assert.equal(model.selected.reference,'m278240-0001');assert.equal(model.variants.length,4);assert.equal(model.variantCount,4);
  assert.equal(model.variants[0],model.selected,'the full selected variant replaces its own link');
  assert.deepEqual(model.variants.map(v=>v.hasImage),[undefined,false,false,true]);
  assert.deepEqual(model.sizes.map(s=>[s.key,s.variantCount,s.options]),[['31-mm',2,[{kind:'dial',count:2}]],['36-mm',2,[{kind:'dial',count:2}]]]);
  assert.equal(model.representative.reference,'m126200-0006');assert.equal(model.representative.sameSize,false);
  assert.equal(model.representative.sizeOption.value.en,'36 mm');
  assert.equal(model.representative.imageVariants[0].attribution.creator,'Remi Mathis','the photograph keeps its own credit');
  assert.equal(model.selected.images.length,0,'the selected variant is not given another variant\'s images');
});

test('the v2 envelope is validated and never trusted to invent, drop or mix variants',()=>{
  assert.equal(productModelIndex(null,row.slug),undefined);
  const lone=productModelIndex(envelope({model_key:null,variants:[],sizes:[],representative:null,variant_count:0}),row.slug);
  assert.equal(lone.variants.length,1);assert.equal(lone.key,null);
  assert.throws(()=>productModelIndex(envelope(),'rolex-m278240-0002'),/identity/);
  assert.throws(()=>productModelIndex(envelope({variant_count:3}),row.slug),/Invalid product model/,'a count below the listed variants is refused');
  assert.throws(()=>productModelIndex(envelope({variants:[...links,links[1]],variant_count:5}),row.slug),/variants/);
  assert.throws(()=>productModelIndex(envelope({variants:links.map(v=>({...v,has_image:'yes'}))}),row.slug),/variant link/);
  assert.throws(()=>productModelIndex(envelope({variants:links.map(v=>({...v,is_primary:true}))}),row.slug),/primary/);
  assert.throws(()=>productModelIndex(envelope({sizes:[{...envelope().sizes[0],option:silver,key:'silver'}]}),row.slug),/sizes/,'a size row must be a size option');
  assert.throws(()=>productModelIndex(envelope({sizes:[envelope().sizes[0],envelope().sizes[0]]}),row.slug),/sizes/);
  assert.throws(()=>productModelIndex(envelope({representative:{...envelope().representative,images:['http://insecure.example/a.webp']}}),row.slug),/images/);
  assert.throws(()=>productModelIndex(envelope({representative:{...envelope().representative,same_size:'no'}}),row.slug),/representative/);
  const ambiguous=productModelIndex(envelope({variants:links.map(v=>({...v,options:[s31]}))}),row.slug);
  assert.equal(ambiguous.variants.length,1,'options that cannot tell variants apart leave the variant as its own model');
  const late=productModelIndex(envelope({variants:links.slice(1),variant_count:4}),row.slug);
  assert.ok(late.variants.some(v=>v.slug===row.slug),'the addressed variant is always offered');
  const leak=productModelIndex(envelope({variants:links.map(v=>({...v,price:900,source_copy:'private'}))}),row.slug);
  assert.ok(!JSON.stringify(leak).includes('900')&&!JSON.stringify(leak).includes('private'));
});

test('the size table lists only real sizes, links the closest real variant and names any forced change',()=>{
  const model=productModelIndex(envelope(),row.slug);
  const table=sizeTable(model);
  assert.equal(table.kind,'case_size');
  assert.deepEqual(table.rows.map(r=>[r.option.value.en,r.reference,r.current,r.changes.map(c=>c.value.en)]),
    [['31 mm','m278240-0001',true,[]],['36 mm','m126200-0002',false,[]]],'silver exists at 36 mm, so the dial is kept');
  assert.deepEqual(table.rows.map(r=>r.facts.map(f=>f.kind)),[['power_reserve'],['power_reserve']],'the size itself is not repeated as a fact');
  const fromPink=sizeTable({...model,selected:{...model.selected,...links[1],options:[s31,pink]},variants:model.variants.map((v,i)=>i===1?{...model.selected,...links[1],options:[s31,pink]}:v)});
  const row36=fromPink.rows.find(r=>r.key==='36-mm');
  assert.ok(['m126200-0002','m126200-0006'].includes(row36.reference));
  assert.deepEqual(row36.changes.map(c=>c.kind),['dial'],'pink does not exist at 36 mm, and the row says the dial changes');
  for(const r of table.rows)assert.ok(model.variants.some(v=>v.slug===r.slug),'every row links an existing variant');
  assert.equal(sizeTable({...model,sizes:[model.sizes[0]]}),undefined,'one size is no table');
  assert.equal(sizeTable({...model,sizes:[]}),undefined);
  // Without a size axis (a colour-only model) there is no table.
  assert.equal(sizeTable({...model,variants:[model.selected],sizes:model.sizes}),undefined);
  assert.equal(selectorAxes(model.variants,model.selected)[0].kind,'case_size','the size is offered first');
});
