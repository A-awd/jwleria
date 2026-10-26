import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {queryModels,readProductModel,readBrandModelsPage,productModel,publicProduct} from '../src/server/supabase-catalog.mjs';

// Each test uses its own project URL: the "feature missing" memory is per isolate and per configuration.
let n=0;
const config=()=>({url:`https://models-${++n}.supabase.co`,key:'sb_publishable_TEST'});
const row={id:'id-1',slug:'m126334-0001',reference:'m126334-0001',brand_slug:'rolex',category_slug:'watches',collection_slug:'datejust',collection_ar:'ديت جست',collection_en:'Datejust',name_ar:'ديت جست 41، ميناء أزرق',name_en:'Datejust 41, blue dial',description_ar:'حقائق',description_en:'Facts',images:[],image_variants:[],media_state:'facts_only',published_at:'2026-10-26T00:00:00Z'};
const modelRow={...row,model_key:'rolex:126334',model_name:{ar:'ديت جست 41',en:'Datejust 41'},variant_count:30,options_summary:{bracelet:2,dial:26}};
const missing=(code,name)=>Response.json({code,message:code==='PGRST205'?`Could not find the table 'public.${name}' in the schema cache`:`Could not find the function public.${name}(slug) in the schema cache`,details:null,hint:null},{status:404});
const page=(rows,total)=>new Response(JSON.stringify(rows),{status:200,headers:{'Content-Range':`0-${rows.length-1}/${total}`}});
const params=url=>Object.fromEntries(url.searchParams);
const option=(kind,key,ar,en)=>({kind,key,label:kind==='dial'?{ar:'لون الميناء',en:'Dial'}:{ar:'السوار',en:'Bracelet'},value:{ar,en}});
const variant=(slug,position,options,extra={})=>({...row,id:`id-${slug}`,slug,reference:slug,position,is_primary:position===0,options,specs:[{kind:'case_diameter',label:{ar:'قطر العلبة',en:'Case diameter'},value:{ar:'41 مم',en:'41 mm'}},{kind:'movement',label:{ar:'الحركة',en:'Movement'},value:{ar:'Calibre 3235',en:'Calibre 3235'},value_lang:'en'}],...extra});
const variants=[
 variant('m126334-0001',0,[option('dial','blue','أزرق','Blue'),option('bracelet','jubilee','جوبيلي','Jubilee')]),
 variant('m126334-0002',1,[option('dial','blue','أزرق','Blue'),option('bracelet','oyster','أويستر','Oyster')]),
 variant('m126334-0003',2,[option('dial','green','أخضر','Green'),option('bracelet','oyster','أويستر','Oyster')]),
];
const envelope=(slug='m126334-0002')=>({product:{...row,slug,reference:slug,id:`id-${slug}`},model_key:'rolex:126334',model_name:{ar:'ديت جست 41',en:'Datejust 41'},variants});

test('listings read one bounded, counted model page with the same filters and search',async()=>{
 let requested,headers;
 const result=await queryModels(config(),{brand:'rolex',collection:'datejust',category:'watches',search:'ديت',page:1,pageSize:100},async(url,options)=>{requested=url;headers=options.headers;return page([modelRow],80);});
 assert.equal(requested.pathname,'/rest/v1/jwl_catalog_models');assert.equal(headers.Prefer,'count=exact');assert.equal(params(requested).limit,'48');
 for(const [k,v] of [['brand_slug','eq.rolex'],['collection_slug','eq.datejust'],['category_slug','eq.watches'],['collection_kind','eq.collection'],['search_text','ilike.*ديت*']])assert.equal(requested.searchParams.get(k),v);
 assert.match(requested.searchParams.get('select'),/model_key,model_name,variant_count,options_summary$/);assert.ok(!requested.searchParams.get('select').includes('price'));
 assert.equal(result.unit,'models');assert.equal(result.total,80);
 const [item]=result.items;assert.equal(item.model.name.en,'Datejust 41');assert.equal(item.model.variantCount,30);
 assert.deepEqual(item.model.options,[{kind:'dial',count:26},{kind:'bracelet',count:2}],'known option kinds keep their display order');
 const single=(await queryModels(config(),{},async()=>page([{...row,model_key:null,model_name:null,variant_count:null,options_summary:null}],1))).items[0];
 assert.equal(single.model,undefined,'an ungrouped row is listed exactly as today');
 for(const bad of [{model_name:{ar:'',en:'x'}},{variant_count:0},{options_summary:{dial:31}},{options_summary:{'Bad Kind':2}},{options_summary:[]}])
  await assert.rejects(queryModels(config(),{},async()=>page([{...modelRow,...bad}],1)),/model/i);
});

test('a missing model view falls back to today\'s catalog read and is remembered briefly',async()=>{
 const c=config();const calls=[];
 const fetcher=async url=>{calls.push(url.pathname);return url.pathname.endsWith('jwl_catalog_models')?missing('PGRST205','jwl_catalog_models'):page([row],1);};
 const first=await queryModels(c,{brand:'rolex'},fetcher);
 assert.deepEqual(calls,['/rest/v1/jwl_catalog_models','/rest/v1/jwl_catalog']);assert.equal(first.unit,'products');assert.equal(first.items[0].slug,row.slug);
 await queryModels(c,{brand:'rolex'},fetcher);
 assert.deepEqual(calls.slice(2),['/rest/v1/jwl_catalog'],'the next request skips the known-missing view');
 // Older PostgREST reports the same miss as 42P01 (still a 404 naming the view).
 const legacy=await queryModels(config(),{},async url=>url.pathname.endsWith('jwl_catalog_models')?Response.json({code:'42P01',message:'relation "public.jwl_catalog_models" does not exist'},{status:404}):page([row],1));
 assert.equal(legacy.unit,'products');
});

test('only the specific missing relation falls back; every other failure stays an error',async()=>{
 for(const response of [
  ()=>new Response('boom',{status:500}),
  ()=>Response.json({code:'PGRST205',message:"Could not find the table 'public.jwl_other' in the schema cache"},{status:404}),
  ()=>Response.json({code:'42501',message:'permission denied for view jwl_catalog_models'},{status:401}),
  ()=>new Response('not json',{status:404}),
  ()=>Response.json({code:'PGRST205',message:"Could not find the table 'public.jwl_catalog_models_v2' in the schema cache"},{status:404}),
  ()=>Response.json({code:'42P01',message:'relation "jwl_internal.term_translations" does not exist'},{status:404}),
  ()=>Response.json({code:'PGRST205',message:"Could not find the table 'public.jwl_catalog_models' in the schema cache"},{status:400}),
 ]){
  let fallback=false;
  await assert.rejects(queryModels(config(),{},async url=>{if(url.pathname==='/rest/v1/jwl_catalog')fallback=true;return response();}),/failed|Catalog/);
  assert.equal(fallback,false);
 }
 await assert.rejects(queryModels(config(),{},async()=>{throw new DOMException('The operation timed out.','TimeoutError');}),/timed out/);
});

test('a product page reads its whole model in one round trip and selects the addressed variant',async()=>{
 const calls=[];
 const model=await readProductModel(config(),'m126334-0002',async(url,opts)=>{calls.push(url);assert.equal(opts.redirect,'manual');return Response.json(envelope());});
 assert.equal(calls.length,1);assert.equal(calls[0].pathname,'/rest/v1/rpc/jwl_product_model');assert.deepEqual(params(calls[0]),{p_slug:'m126334-0002'});
 assert.equal(model.selected.reference,'m126334-0002');assert.equal(model.primary.slug,'m126334-0001');assert.equal(model.variants.length,3);assert.equal(model.name.ar,'ديت جست 41');
 assert.deepEqual(model.selected.specs[1],{kind:'movement',label:{ar:'الحركة',en:'Movement'},value:{ar:'Calibre 3235',en:'Calibre 3235'},valueLang:'en'});
 assert.equal(await readProductModel(config(),'unknown-slug',async()=>Response.json(null)),undefined);
 assert.equal(await readProductModel(config(),'not/a/slug',()=>{throw new Error('must not fetch');}),undefined);
 await assert.rejects(readProductModel(config(),'m126334-0002',async()=>new Response('unavailable',{status:503})),/503/);
 await assert.rejects(readProductModel(config(),'m126334-0002',async()=>{throw new DOMException('The operation timed out.','TimeoutError');}),/timed out/);
});

test('the model envelope is validated, bounded and never trusted to invent or mix variants',()=>{
 const ok=productModel(envelope(),'m126334-0002');assert.equal(ok.selected.slug,'m126334-0002');
 assert.equal(productModel({...envelope('m126334-0003'),model_key:null,variants:[]},'m126334-0003').variants.length,1,'an ungrouped row is a single-variant model');
 assert.throws(()=>productModel(envelope(),'m126334-0001'),/identity/,'the product must be the addressed slug');
 assert.throws(()=>productModel({...envelope(),variants:Array.from({length:61},(_,i)=>variant(`v-${i}`,i,[]))},'m126334-0002'),/Invalid product model/);
 assert.throws(()=>productModel({...envelope(),variants:[...variants,{...variants[0]}]},'m126334-0002'),/variants/);
 assert.throws(()=>productModel({...envelope(),variants:[...variants,variant('other-brand',3,[option('dial','red','أحمر','Red')],{brand_slug:'omega'})]},'m126334-0002'),/variants/);
 assert.throws(()=>productModel({...envelope(),variants:variants.map(v=>({...v,is_primary:true}))},'m126334-0002'),/primary/);
 assert.throws(()=>productModel({...envelope(),variants:[{...variants[0],options:[{kind:'dial',key:'x',label:{ar:'',en:'Dial'},value:{ar:'a',en:'a'}}]},...variants.slice(1)]},'m126334-0002'),/options/);
 assert.throws(()=>productModel({...envelope(),variants:[{...variants[0],specs:[{kind:'x',label:{ar:'a',en:'a'},value:{ar:'a',en:'a'},value_lang:'fr'}]},...variants.slice(1)]},'m126334-0002'),/specs/);
 assert.throws(()=>productModel({...envelope(),variants:[{...variants[0],images:['https://example.com/unapproved.webp']},...variants.slice(1)]},'m126334-0002'),/images/);
 const ambiguous=productModel({...envelope(),variants:variants.map(v=>({...v,options:[option('dial','blue','أزرق','Blue')]}))},'m126334-0002');
 assert.equal(ambiguous.variants.length,1,'options that cannot tell variants apart leave the variant as its own model');
 const late=productModel({...envelope('m126334-0099'),variants},'m126334-0099');
 assert.equal(late.selected.slug,'m126334-0099','a variant beyond the bounded list still renders its own page');
 const leak=productModel({...envelope(),variants:variants.map(v=>({...v,price:900,source_copy:'private'}))},'m126334-0002');
 assert.ok(!JSON.stringify(leak).includes('900')&&!JSON.stringify(leak).includes('private'));
});

test('a missing product-model function falls back to today\'s single-row read',async()=>{
 const c=config();const calls=[];
 const fetcher=async url=>{calls.push(url.pathname);return url.pathname.endsWith('jwl_product_model')?missing('PGRST202','jwl_product_model'):page([row],1);};
 const model=await readProductModel(c,row.slug,fetcher);
 assert.deepEqual(calls,['/rest/v1/rpc/jwl_product_model','/rest/v1/jwl_catalog']);
 assert.equal(model.key,null);assert.equal(model.variants.length,1);assert.equal(model.selected.slug,row.slug);assert.equal(model.primary,model.selected);assert.deepEqual(model.selected.options,[]);
 await readProductModel(c,row.slug,fetcher);assert.deepEqual(calls.slice(2),['/rest/v1/jwl_catalog']);
});

test('brand pages read the collapsed RPC, falling back to today\'s brand page only when it is missing',async()=>{
 const body={items:[modelRow],total:1,page:1,pageSize:12,pages:1,collections:[],brands:[],brand:{brand_slug:'rolex',brand_name:'Rolex',brand_tier:'luxury'}};
 let path;
 const data=await readBrandModelsPage(config(),'rolex',{page:1},async url=>{path=url.pathname;return Response.json(body);});
 assert.equal(path,'/rest/v1/rpc/jwl_brand_models_page');assert.equal(data.result.unit,'models');assert.equal(data.result.items[0].model.variantCount,30);
 const paths=[];
 const old=await readBrandModelsPage(config(),'rolex',{},async url=>{paths.push(url.pathname);return url.pathname.endsWith('jwl_brand_models_page')?missing('PGRST202','jwl_brand_models_page'):Response.json({...body,items:[row]});});
 assert.deepEqual(paths,['/rest/v1/rpc/jwl_brand_models_page','/rest/v1/rpc/jwl_brand_page']);assert.equal(old.result.unit,'products');
 let fellBack=false;
 await assert.rejects(readBrandModelsPage(config(),'rolex',{},async url=>{if(url.pathname.endsWith('jwl_brand_page'))fellBack=true;return new Response('down',{status:500});}),/500/);
 assert.equal(fellBack,false);
});

test('open-licence attribution is carried only as a validated credit on its own image',()=>{
 const src='https://media.example.com/a/1600.webp';
 const image={src,width:1600,height:2000,variants:[{src:'https://media.example.com/a/640.webp',width:640,height:800,bytes:1000},{src,width:1600,height:2000,bytes:9000}]};
 const approved={...row,images:[src],media_state:'approved_media'};
 assert.equal(publicProduct({...approved,image_variants:[image]}).imageVariants[0].attribution,undefined);
 const credit={creator:'A. Photographer',license:'CC BY 4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',source_url:'https://commons.example.org/file/1',changes:'Resized and encoded as WebP'};
 assert.deepEqual(publicProduct({...approved,image_variants:[{...image,attribution:credit}]}).imageVariants[0].attribution,{creator:'A. Photographer',license:'CC BY 4.0',licenseUrl:credit.license_url,sourceUrl:credit.source_url,changes:'Resized and encoded as WebP'});
 for(const bad of [{...credit,creator:''},{...credit,license_url:'javascript:alert(1)'},{...credit,source_url:'http://insecure.example.org/'},{...credit,grant_reference:'private'},null])
  assert.throws(()=>publicProduct({...approved,image_variants:[{...image,attribution:bad}]}),/attribution/);
});

// After the prepared migration is merged, its signatures must match what this adapter sends; a mismatch
// would read as a missing function and silently keep the fallback forever.
const migration=sqlFile();
test('the adapter calls the prepared models migration with its exact names and arguments',{skip:!migration&&'the models migration is not in this tree yet'},async()=>{
 const sql=String(readFileSync(/** @type {URL} */(migration),'utf8'));
 const calls=[];
 await readProductModel(config(),'m126334-0002',async url=>{calls.push(url);return Response.json(envelope());});
 await readBrandModelsPage(config(),'rolex',{page:2,pageSize:12},async url=>{calls.push(url);return Response.json({items:[],total:13,page:2,pageSize:12,pages:2,collections:[],brands:[],brand:null});});
 await queryModels(config(),{},async url=>{calls.push(url);return page([modelRow],1);});
 for(const call of calls.slice(0,2)){
  const fn=call.pathname.split('/').at(-1);
  const signature=sql.match(new RegExp(`create function public\\.${fn}\\(([^)]*)\\)`));
  assert.ok(signature,`${fn} is defined`);
  const names=signature[1].split(',').map(a=>a.trim().split(/\s+/)[0]);
  for(const name of call.searchParams.keys())assert.ok(names.includes(name),`${fn} takes ${name}`);
 }
 const view=sql.slice(sql.indexOf('create view public.jwl_catalog_models'),sql.indexOf('create function public.jwl_product_model'));
 for(const column of calls[2].searchParams.get('select').split(','))assert.match(view,new RegExp(`[ .,]${column}(?:[,\\s]|$)`),`the model view exposes ${column}`);
});
function sqlFile(){
 const proposed=new URL('../supabase/proposed/jwleria_product_models.sql',import.meta.url);
 if(existsSync(proposed))return proposed;
 const dir=new URL('../supabase/migrations/',import.meta.url);
 const applied=readdirSync(dir).find(f=>/_jwleria_product_models\.sql$/.test(f));
 return applied?new URL(applied,dir):undefined;
}
