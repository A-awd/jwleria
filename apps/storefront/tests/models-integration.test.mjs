import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixtures,jubilee,modelsDatabase,oyster,postgrest,postgrestFetch,postgrestServer,slugOf,slugify,WITHDRAWN_AFTER,WITHDRAWN_BEFORE} from './models-postgrest.mjs';
import {listCollections,listPublishedBrands,productModel,publicModelRow,queryModels,readBrandModelsPage,readProductModel} from '../src/server/supabase-catalog.mjs';
import {closestVariant,optionAxes,optionKey,optionSignature,selectorAxes} from '../src/components/variant-selection.mjs';
import {optionCounts} from '../src/i18n/ui.ts';

// End to end before any migration is applied: PGlite runs every migration plus the PROPOSED
// supabase/migrations/*_jwleria_product_models.sql, publishes synthetic facts-only fixtures, runs
// jwl_internal.apply_product_variants() as service_role, and a PostgREST stand-in answers the storefront
// adapter's own requests as anon. The adapter and the selection helper then parse exactly those bodies.
//
// Private local preview (opt-in, synthetic data, 127.0.0.1 only): the last test builds nothing itself.
//   pnpm build
//   JWL_MODELS_PREVIEW=1 [JWL_SCREENSHOT_DIR=/absolute/dir] NODE_PATH=/opt/node-tools/node_modules \
//     node --test tests/models-integration.test.mjs
// It serves the same database over a local mock PostgREST, starts dist/server/entry.mjs (node adapter)
// with tests/models-preview-fetch.mjs preloaded so the configured catalog origin resolves to that mock and
// every other non-loopback request is refused, then drives Chromium at 390x844 in Arabic and English.
// Without JWL_MODELS_PREVIEW, or without a resolvable Playwright, the browser test skips.

const KEY='sb_publishable_local_preview';
let configs=0;
// A fresh catalog URL per read keeps the adapter's per-configuration "feature missing" memory out of it.
const config=()=>({url:`https://models-integration-${++configs}.supabase.co`,key:KEY});
let shared;
const setup=()=>shared??=(async()=>{
  const {db,applied}=await modelsDatabase();
  const handle=postgrest(db,{key:KEY});
  return {db,applied,handle,log:[],body:async(path,headers={})=>JSON.parse((await handle(new URL(path,'http://127.0.0.1'),{apikey:KEY,...headers})).body)};
})();
after(async()=>{if(shared)await (await shared).db.close();});
const read=async(fn)=>{const s=await setup(),log=[];const result=await fn(postgrestFetch(s.handle,log));return {result,log};};
const refs=items=>items.map(i=>i.reference);
const MODEL={ar:'ساعة رولكس ديت جست، 36 مم',en:'Rolex Datejust 36 watch: Oystersteel'};
const TOTE={ar:'حقيبة كتف Le Pliage Original، مقاس كبير',en:'Le Pliage Original L Tote bag'};
const DIAL=['silver','bright-blue','candy-pink'],BRACELET=[slugify(jubilee),slugify(oyster)];

test('the mapping run maps every active row once and nothing withdrawn before it',async()=>{
  const {applied,db}=await setup();
  assert.equal(applied.variants,fixtures.length-1,'the row withdrawn before the run is not mapped');
  assert.deepEqual({models:applied.models,grouped:applied.grouped_models,single:applied.single_models},{models:7,grouped:3,single:4});
  assert.deepEqual(applied.rules,{'rolex-model-number':5,'loewe-style-code':2,'longchamp-model-code':3,'single:ambiguous-options':2,'single:only-variant':1,'single:no-linking-evidence':1});
  const mapped=(await db.query('select c.reference from public.jwl_product_variants v join public.jwl_catalog c on c.id=v.product_id')).rows.map(r=>r.reference);
  assert.ok(!mapped.includes(WITHDRAWN_BEFORE)&&mapped.includes(WITHDRAWN_AFTER),'one withdrawn row was never mapped, the other was mapped and then withdrawn');
});

test('the listing reads one card per model from jwl_catalog_models and the adapter accepts every row',async()=>{
  const s=await setup();
  const {result,log}=await read(f=>queryModels(config(),{},f));
  assert.deepEqual(log.map(u=>u.pathname),['/rest/v1/jwl_catalog_models'],'the model view exists, so no fallback read');
  const url=log[0],fields=url.searchParams.get('select').split(',');
  assert.deepEqual(Object.fromEntries([...url.searchParams].filter(([k])=>k!=='select')),{order:'published_at.desc,id.asc',limit:'12',offset:'0'});
  assert.deepEqual(fields.slice(-4),['model_key','model_name','variant_count','options_summary']);
  const raw=await s.body(url.pathname+url.search,{Prefer:'count=exact'});
  for(const row of raw)assert.deepEqual(Object.keys(row).sort(),[...fields].sort(),'PostgREST returns exactly the selected fields');
  assert.deepEqual(result.items,raw.map(publicModelRow),'the adapter result is the SQL rows, parsed');
  assert.equal(result.unit,'models');assert.equal(result.total,7);assert.equal(result.items.length,7);assert.equal(result.pages,1);
  assert.deepEqual(refs(result.items).sort(),['328.24.W10-1100','B4084600','L1899089001','m126200-0001','m126200-0005','m126200-0029','m126610ln-0001'],
    'each model is listed once, by its primary variant; withdrawn rows and non-primary variants are not cards');
  const card=ref=>result.items.find(i=>i.reference===ref);
  assert.deepEqual(card('m126200-0001').model,{key:'rolex-official:126200',name:MODEL,variantCount:4,options:[{kind:'dial',count:3},{kind:'bracelet',count:2}]},
    'the withdrawn olive green dial is neither counted as a variant nor as a dial');
  assert.deepEqual(card('L1899089001').model,{key:'longchamp-official:L1899089',name:TOTE,variantCount:3,options:[{kind:'colour',count:3}]},'the colour tail is not in the model name');
  assert.deepEqual(card('328.24.W10-1100').model,{key:'loewe-official:328.24.W10',name:{ar:'حقيبة Puzzle، مقاس صغير، من جلد عجل كلاسيكي',en:'Small Puzzle bag in classic calfskin'},variantCount:2,options:[{kind:'colour',count:2}]});
  for(const ref of ['m126200-0005','m126200-0029','m126610ln-0001','B4084600']){
    const {model,name}=card(ref);
    assert.deepEqual([model.key.endsWith(':ref:'+ref),model.variantCount,model.options],[true,1,[]],ref);
    assert.deepEqual(model.name,name,ref+' keeps its own names');
  }
  assert.equal(card('m126200-0005').model.name.en,'Rolex Datejust 36 watch: Oystersteel - m126200-0005');
  for(const item of result.items)assert.deepEqual([item.mediaKind,item.image,item.images],['facts-only',null,[]],'no image is invented');
  // The card's neutral option count, exactly as ProductCard renders it.
  assert.deepEqual(['ar','en'].map(l=>optionCounts(l,card('m126200-0001').model)),['3 خيارات ميناء · سواران','3 dials · 2 bracelets']);
  assert.deepEqual(['ar','en'].map(l=>optionCounts(l,card('L1899089001').model)),['3 ألوان','3 colours']);
  assert.deepEqual(['ar','en'].map(l=>optionCounts(l,card('B4084600').model)),['','']);
});

test('listing filters, search and pagination give the same model cards as SQL',async()=>{
  const list=async query=>(await read(f=>queryModels(config(),query,f))).result;
  assert.deepEqual(refs((await list({category:'bags'})).items).sort(),['328.24.W10-1100','L1899089001']);
  assert.deepEqual(refs((await list({brand:'rolex'})).items).sort(),['m126200-0001','m126200-0005','m126200-0029','m126610ln-0001']);
  const datejust=await read(f=>queryModels(config(),{brand:'rolex',collection:'datejust'},f));
  assert.equal(datejust.log[0].searchParams.get('collection_kind'),'eq.collection');
  assert.deepEqual(refs(datejust.result.items).sort(),['m126200-0001','m126200-0005','m126200-0029']);
  assert.deepEqual(refs((await list({search:'le pliage'})).items),['L1899089001'],'a model is found once, not once per variant, by its primary when every variant matches');
  for(const search of [WITHDRAWN_AFTER,WITHDRAWN_BEFORE])assert.equal((await list({search})).total,0,`a withdrawn reference (${search}) finds nothing`);
  const page=await list({pageSize:2,page:4});
  assert.deepEqual([page.total,page.pages,page.page,page.items.length],[7,4,4,1]);
  const beyond=await read(f=>queryModels(config(),{pageSize:2,page:9},f));
  assert.deepEqual([beyond.result.page,beyond.result.items.length,beyond.log.length],[4,1,2],'a page past the end is re-read as the last page');
  const all=new Set();
  for(let p=1;p<=4;p++)for(const item of (await list({pageSize:2,page:p})).items)all.add(item.model.key);
  assert.equal(all.size,7,'pages neither repeat nor skip a model');
});

test('searching a variant\'s exact reference shows and links that variant on its one model card',async()=>{
  const s=await setup();
  for(const [search,ref,key,count] of [['M126200-0010','m126200-0010','rolex-official:126200',4],['m126200-0006','m126200-0006','rolex-official:126200',4],
    ['l1899089556','L1899089556','longchamp-official:L1899089',3],['navy','L1899089556','longchamp-official:L1899089',3],['m126200-0001','m126200-0001','rolex-official:126200',4]]){
    const {result,log}=await read(f=>queryModels(config(),{search},f));
    assert.deepEqual(log.map(u=>u.pathname),['/rest/v1/rpc/jwl_catalog_models_search'],search);
    assert.equal(log[0].searchParams.get('p_term'),search.toLowerCase());assert.equal(log[0].searchParams.has('search_text'),false);
    assert.deepEqual([result.unit,result.total,refs(result.items)],['models',1,[ref]],search);
    const [card]=result.items;
    assert.deepEqual([card.slug,card.model.key,card.model.variantCount],[slugOf(ref),key,count],`${search}: the card names and opens the reference that was searched`);
    assert.deepEqual(result.items,(await s.body(log[0].pathname+log[0].search,{Prefer:'count=exact'})).map(publicModelRow),'the adapter result is the SQL rows, parsed');
  }
  // The searched variant replaces its model's card in place: same filters, still one card per model.
  assert.deepEqual(refs((await read(f=>queryModels(config(),{brand:'rolex',collection:'datejust',search:'m126200-0006'},f))).result.items),['m126200-0006']);
  assert.equal((await read(f=>queryModels(config(),{brand:'loewe',search:'m126200-0006'},f))).result.total,0);
  const rolex=(await read(f=>queryModels(config(),{search:'rolex datejust'},f))).result;
  assert.deepEqual(refs(rolex.items).sort(),['m126200-0001','m126200-0005','m126200-0029'],'a term every variant shares keeps each model\'s primary');
  for(const search of [WITHDRAWN_AFTER,WITHDRAWN_BEFORE])assert.equal((await read(f=>queryModels(config(),{search},f))).result.total,0,`a withdrawn reference (${search}) is never shown`);
});

test('jwl_product_model gives the adapter one model for any variant slug and nothing for an unknown one',async()=>{
  const s=await setup();
  const rpc=slug=>s.body('/rest/v1/rpc/jwl_product_model?'+new URLSearchParams({p_slug:slug}));
  const load=async slug=>{
    const {result,log}=await read(f=>readProductModel(config(),slug,f));
    assert.deepEqual(log.map(u=>[u.pathname,Object.fromEntries(u.searchParams)]),[['/rest/v1/rpc/jwl_product_model',{p_slug:slug}]]);
    const raw=await rpc(slug);
    assert.deepEqual(result,productModel(raw,slug),'readProductModel parses the RPC body unchanged');
    return {model:result,raw};
  };
  const primary=slugOf('m126200-0001');
  for(const ref of ['m126200-0006','m126200-0001']){
    const {model,raw}=await load(slugOf(ref));
    assert.equal(model.key,'rolex-official:126200');assert.deepEqual(model.name,MODEL);
    assert.deepEqual(refs(model.variants),['m126200-0001','m126200-0002','m126200-0006','m126200-0010'],'the withdrawn variant is not in its model');
    assert.deepEqual(model.variants.map(v=>v.position),[0,1,3,4]);
    assert.equal(model.selected.reference,ref);assert.equal(model.selected.slug,slugOf(ref));
    assert.equal(model.primary.slug,primary,'the canonical twin is the primary variant');
    assert.deepEqual(model.variants.map(v=>v.isPrimary),[true,false,false,false]);
    // Every variant carries its own mapped options and specs; value_lang 'en' becomes valueLang 'en', and so
    // does an Arabic value that is Latin text only (a trademark kept in Latin script, such as Oystersteel).
    for(const v of raw.variants){
      const parsed=model.variants.find(x=>x.slug===v.slug);
      const latin=t=>/[A-Za-z]/.test(t)&&!/[\u0600-\u06ff]/.test(t);
      const lang=({value_lang,...o})=>({...o,...(value_lang==='en'||latin(o.value.ar)?{valueLang:'en'}:{})});
      assert.deepEqual(parsed.options,v.options.map(lang),v.reference);assert.deepEqual(parsed.specs,v.specs.map(lang),v.reference);
      assert.deepEqual([parsed.name.en,parsed.reference],[v.name_en,v.reference]);
    }
  }
  const {model}=await load(slugOf('m126200-0006'));
  const variant=ref=>model.variants.find(v=>v.reference===ref);
  assert.deepEqual(model.selected.options,[
    {kind:'dial',key:'bright-blue',label:{ar:'الميناء',en:'Dial'},value:{ar:'أزرق لامع',en:'Bright blue'}},
    {kind:'bracelet',key:BRACELET[1],label:{ar:'السوار',en:'Bracelet'},value:{ar:'Oyster، حلقات صلبة من ثلاث قطع',en:oyster}}]);
  assert.deepEqual(variant('m126200-0010').options[0],{kind:'dial',key:'candy-pink',label:{ar:'الميناء',en:'Dial'},value:{ar:'Candy pink',en:'Candy pink'},valueLang:'en'});
  assert.deepEqual(model.selected.specs.map(s=>s.kind),['diameter','material','dial','bracelet','bracelet_material','movement','power_reserve','water_resistance']);
  assert.deepEqual(model.selected.specs[0],{kind:'diameter',label:{ar:'القطر',en:'Diameter'},value:{ar:'36 مم',en:'36 mm'}});
  assert.deepEqual(model.selected.specs[1],{kind:'material',label:{ar:'المادة',en:'Material'},value:{ar:'Oystersteel',en:'Oystersteel'},valueLang:'en'},'a Latin trademark is marked on the Arabic page');
  assert.deepEqual([model.selected.mediaKind,model.selected.images],['facts-only',[]]);

  const tote=(await load(slugOf('L1899089556'))).model;
  assert.deepEqual([tote.key,tote.name,tote.selected.reference,tote.primary.reference],['longchamp-official:L1899089',TOTE,'L1899089556','L1899089001']);
  assert.deepEqual(optionAxes(tote.variants).map(a=>[a.kind,a.values.map(v=>[v.key,v.value.ar])]),[['colour',[['black','أسود'],['navy','كحلي'],['paper','ورقي']]]]);
  for(const ref of ['B4084600','m126200-0005']){
    const lone=(await load(slugOf(ref))).model;
    assert.deepEqual([lone.key,lone.variants.length,lone.primary.slug,selectorAxes(lone.variants,lone.selected)],[`${ref.startsWith('B')?'cartier':'rolex'}-official:ref:${ref}`,1,slugOf(ref),[]],ref);
    assert.ok(lone.selected.specs.length>0,ref+' still shows its own specs');
  }
  for(const slug of ['rolex-m999999-0001',slugOf(WITHDRAWN_AFTER),slugOf(WITHDRAWN_BEFORE)]){
    assert.equal(await rpc(slug),null,slug);
    assert.equal(productModel(null,slug),undefined);
    assert.equal((await load(slug)).model,undefined,slug+' is not served');
  }
  const invalid=await read(f=>readProductModel(config(),'Invalid Slug',f));
  assert.deepEqual([invalid.result,invalid.log.length],[undefined,0]);
});

test('every option value links to the closest real variant and no combination is constructed',async()=>{
  const {model}=await read(f=>readProductModel(config(),slugOf('m126200-0006'),f)).then(r=>({model:r.result}));
  const axes=optionAxes(model.variants);
  assert.deepEqual(axes.map(a=>[a.kind,a.values.map(v=>v.key)]),[['dial',DIAL],['bracelet',BRACELET]]);
  const signatures=new Set(model.variants.map(optionSignature));
  assert.equal(signatures.size,model.variants.length,'each real variant has its own options');
  assert.ok(model.variants.length<DIAL.length*BRACELET.length,'only 4 of the 6 combinations exist');
  const real=new Map(model.variants.map(v=>[v.slug,v]));
  for(const selected of model.variants){
    for(const axis of selectorAxes(model.variants,selected)){
      assert.equal(axis.current.key,optionKey(selected,axis.kind));
      for(const value of axis.values){
        const target=real.get(value.slug);
        assert.ok(target,`${selected.reference} ${axis.kind}=${value.key} links to a real variant`);
        assert.equal(optionKey(target,axis.kind),value.key);assert.equal(value.reference,target.reference);
        assert.equal(value.current,target===selected);
        const kept=v=>axes.filter(a=>a.kind!==axis.kind&&optionKey(v,a.kind)===optionKey(selected,a.kind)).length;
        for(const other of model.variants.filter(v=>optionKey(v,axis.kind)===value.key))assert.ok(kept(other)<=kept(target),'no real variant keeps more of the selection');
        assert.deepEqual(value.changes.map(c=>c.key),axes.filter(a=>a.kind!==axis.kind&&optionKey(target,a.kind)!==optionKey(selected,a.kind)).map(a=>optionKey(target,a.kind)));
      }
    }
  }
  const from=ref=>selectorAxes(model.variants,model.variants.find(v=>v.reference===ref));
  const link=(ref,kind,key)=>from(ref).find(a=>a.kind===kind).values.find(v=>v.key===key);
  assert.deepEqual([link('m126200-0006','dial','silver').reference,link('m126200-0006','dial','silver').changes],['m126200-0002',[]],'silver keeps the Oyster bracelet');
  const jubileeLink=link('m126200-0006','bracelet',BRACELET[0]);
  assert.equal(jubileeLink.reference,'m126200-0001','bright blue on Jubilee is a separate single, so Jubilee moves to the silver dial');
  assert.deepEqual(jubileeLink.changes.map(c=>[c.kind,c.key,c.value.ar]),[['dial','silver','فضي']]);
  assert.deepEqual([link('m126200-0001','dial','candy-pink').reference,link('m126200-0001','dial','candy-pink').changes.map(c=>c.key)],['m126200-0010',[BRACELET[1]]]);
  assert.equal(closestVariant(model.variants,model.variants[0],'dial','olive-green'),undefined,'a withdrawn value has no variant to move to');
});

test('jwl_brand_models_page gives the adapter the brand page envelope with model cards',async()=>{
  const s=await setup();
  const {result:page,log}=await read(f=>readBrandModelsPage(config(),'rolex',{},f));
  assert.deepEqual(log.map(u=>[u.pathname,Object.fromEntries(u.searchParams)]),[['/rest/v1/rpc/jwl_brand_models_page',{p_brand:'rolex',p_page:'1',p_page_size:'12'}]]);
  const raw=await s.body(log[0].pathname+log[0].search);
  assert.deepEqual(page.result.items,raw.items.map(publicModelRow));
  assert.deepEqual([page.result.unit,page.result.total,page.result.pages],['models',4,1]);
  const listed=(await read(f=>queryModels(config(),{brand:'rolex'},f))).result.items;
  assert.deepEqual(page.result.items,listed,'the brand page and the brand-filtered listing show the same cards');
  assert.deepEqual(page.collections,[{slug:'datejust',name:{ar:'datejust',en:'datejust'}},{slug:'submariner',name:{ar:'submariner',en:'submariner'}}]);
  assert.deepEqual(page.brands.map(b=>b.slug),['cartier','loewe','longchamp','rolex']);
  assert.deepEqual([page.brand.slug,page.brand.name],['rolex','Rolex']);
  const cartier=(await read(f=>readBrandModelsPage(config(),'cartier',{},f))).result;
  assert.deepEqual(refs(cartier.result.items),['B4084600'],'the withdrawn ring is not on its brand page');
  const second=(await read(f=>readBrandModelsPage(config(),'rolex',{page:2,pageSize:3},f))).result.result;
  assert.deepEqual([second.page,second.pages,second.items.length],[2,2,1]);
  const none=(await read(f=>readBrandModelsPage(config(),'missing-brand',{},f))).result;
  assert.deepEqual([none.result.total,none.result.items,none.brand],[0,[],undefined]);
});

test('the brand directory and collection reads the pages also make match the published rows',async()=>{
  const brands=await read(f=>listPublishedBrands(config(),f));
  assert.deepEqual(brands.log.map(u=>u.pathname),['/rest/v1/jwl_brands']);
  assert.deepEqual(brands.result.map(b=>[b.slug,b.name,b.tier]),[['cartier','Cartier','luxury'],['loewe','LOEWE','luxury'],['longchamp','Longchamp','luxury'],['rolex','Rolex','luxury']]);
  const collections=await read(f=>listCollections(config(),'longchamp',f));
  assert.deepEqual(collections.result,[{slug:'le-pliage-original',name:{ar:'Le Pliage Original',en:'Le Pliage Original'}}]);
});

test('a row without a mapping is listed and served as its own model and hands its model card on',async()=>{
  // As for a row published after the last mapping run: here the primary variant loses its mapping.
  const s=await setup();
  await s.db.exec('begin');
  try{
    await s.db.query('delete from public.jwl_product_variants where product_id=(select id from public.jwl_catalog where reference=$1)',['m126200-0001']);
    const listed=(await read(f=>queryModels(config(),{brand:'rolex',collection:'datejust'},f))).result;
    assert.deepEqual(refs(listed.items).sort(),['m126200-0001','m126200-0002','m126200-0005','m126200-0029']);
    const own=listed.items.find(i=>i.reference==='m126200-0001'),card=listed.items.find(i=>i.reference==='m126200-0002');
    assert.equal(own.model,undefined,'an unmapped row is listed exactly as today');
    assert.deepEqual(card.model,{key:'rolex-official:126200',name:MODEL,variantCount:3,options:[{kind:'dial',count:3}]},'a bracelet left with one value is no longer an option');
    const lone=(await read(f=>readProductModel(config(),slugOf('m126200-0001'),f))).result;
    assert.deepEqual([lone.key,lone.variants.length,lone.selected.specs,lone.primary.slug],[null,1,[],slugOf('m126200-0001')]);
    const rest=(await read(f=>readProductModel(config(),slugOf('m126200-0006'),f))).result;
    assert.deepEqual([refs(rest.variants),rest.primary.reference,rest.variants.filter(v=>v.isPrimary).length],[['m126200-0002','m126200-0006','m126200-0010'],'m126200-0002',1],'the next visible variant becomes the canonical primary');
    assert.deepEqual(optionAxes(rest.variants).map(a=>a.kind),['dial']);
  }finally{await s.db.exec('rollback');}
  assert.equal((await read(f=>readProductModel(config(),slugOf('m126200-0001'),f))).result.key,'rolex-official:126200','the mapping is restored for the other tests');
});

// ---- Private local preview (opt-in) ----
let playwright;
try{playwright=createRequire(import.meta.url)('playwright');}catch{}
const PREVIEW=process.env.JWL_MODELS_PREVIEW==='1';
const skip=!PREVIEW?'set JWL_MODELS_PREVIEW=1 to run the private local preview':!playwright?'playwright is not installed':false;
const MOBILE={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
const SITE='https://preview.invalid/';
const freePort=()=>new Promise((resolve,reject)=>{const s=createServer().once('error',reject).listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});

test('private local preview: a non-primary variant URL, tap and keyboard selection, one card per model',{skip,timeout:300000},async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url));
  const entry=join(root,'dist/server/entry.mjs');
  assert.ok(existsSync(entry),'run pnpm build (node adapter) before the preview test');
  const s=await setup();
  const mockLog=[];
  const mock=await postgrestServer(s.handle,mockLog);
  const port=await freePort(),base=`http://127.0.0.1:${port}`;
  const shots=process.env.JWL_SCREENSHOT_DIR;
  if(shots)mkdirSync(shots,{recursive:true});
  // A live-release configuration so the canonical link is emitted. Synthetic only: the catalog origin is
  // redirected to the local mock by the preload, the site origin is a reserved .invalid name and the
  // number is a reserved fictional one (555-01xx); nothing is published or contacted.
  const server=spawn(process.execPath,['--import',new URL('./models-preview-fetch.mjs',import.meta.url).href,entry],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,
    HOST:'127.0.0.1',PORT:String(port),CATALOG_MODE:'',SUPABASE_URL:'https://local-preview.supabase.co',SUPABASE_PUBLISHABLE_KEY:KEY,JWL_MOCK_POSTGREST:mock.origin,
    PUBLIC_RELEASE:'live',PUBLIC_SITE_ORIGIN:SITE,PUBLIC_INQUIRY_MODE:'live',PUBLIC_WHATSAPP_E164:'+12025550100'}});
  let output='';server.stdout.on('data',d=>{output+=d;});server.stderr.on('data',d=>{output+=d;});
  const browser=await playwright.chromium.launch();
  try{
    for(let i=0;;i++){
      try{if((await fetch(base+'/ar/')).status<500)break;}catch{}
      if(i>100||server.exitCode!==null)throw new Error('The preview server did not start:\n'+output);
      await new Promise(r=>setTimeout(r,200));
    }
    const model=(await read(f=>readProductModel(config(),slugOf('m126200-0006'),f))).result;
    const value=(ref,kind,l)=>model.variants.find(v=>v.reference===ref).options.find(o=>o.kind===kind).value[l];
    for(const locale of ['ar','en']){
      const context=await browser.newContext({...MOBILE,locale:locale==='ar'?'ar-SA':'en-GB'});
      const blocked=[];
      await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();blocked.push(u.origin);return route.abort();});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const shot=async name=>{if(shots)await page.screenshot({path:join(shots,`models-${locale}-${name}.png`),fullPage:true});};
      const state=()=>page.evaluate(()=>({
        path:location.pathname,
        reference:document.querySelector('[data-variant-reference]')?.textContent,
        canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        specs:document.querySelector('[data-variant-specs]')?.textContent??'',
        current:[...document.querySelectorAll('a[data-variant-link][aria-current="true"]')].map(a=>`${a.dataset.optionKind}=${a.dataset.optionKey}`),
        values:[...document.querySelectorAll('a[data-variant-link]')].map(a=>`${a.dataset.optionKind}=${a.dataset.optionKey}`),
        active:document.activeElement?.matches('a[data-variant-link]')?`${document.activeElement.dataset.optionKind}=${document.activeElement.dataset.optionKey}`:null,
        images:document.querySelectorAll('.pdp__gallery img').length,
        facts:document.querySelectorAll('.pdp--facts').length,
        marker:window.__variantMarker,
        overflow:document.documentElement.scrollWidth-window.innerWidth,
      }));
      const shown=reference=>page.waitForFunction(r=>document.querySelector('[data-variant-reference]')?.textContent===r,reference,{timeout:10000});
      const link=(kind,key)=>page.locator(`a[data-variant-link][data-option-kind="${kind}"][data-option-key="${key}"]`);
      const tabTo=async target=>{for(let i=0;i<120;i++){await page.keyboard.press('Tab');if((await state()).active===target)return;}assert.fail(`${target} is not reachable by keyboard`);};
      const canonical=`${SITE}${locale}/products/${slugOf('m126200-0001')}/`;
      const at=(ref,dial,bracelet)=>({path:`/${locale}/products/${slugOf(ref)}/`,reference:ref,current:[`dial=${dial}`,`bracelet=${bracelet}`],canonical});

      // The listing: one card per model, with the neutral count of real option values.
      await page.goto(`${base}/${locale}/catalog/`);
      const hrefs=await page.locator('article.card .card__name a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
      assert.deepEqual(hrefs.map(h=>h.split('/')[3]).sort(),['B4084600','m126200-0001','m126200-0005','m126200-0029','m126610ln-0001','328.24.W10-1100','L1899089001'].map(slugOf).sort());
      const card=ref=>page.locator('article.card',{has:page.locator(`.card__name a[href="/${locale}/products/${slugOf(ref)}/"]`)});
      assert.equal(await card('m126200-0001').locator('.card__name').textContent(),MODEL[locale]);
      assert.equal(await card('m126200-0001').locator('.variant-count').textContent(),locale==='ar'?'3 خيارات ميناء · سواران':'3 dials · 2 bracelets');
      assert.equal(await card('L1899089001').locator('.card__name').textContent(),TOTE[locale]);
      assert.equal(await card('L1899089001').locator('.variant-count').textContent(),locale==='ar'?'3 ألوان':'3 colours');
      assert.equal(await card('B4084600').locator('.variant-count').count(),0,'a single shows no option count');
      assert.ok((await state()).overflow<=0,`${locale}: the listing has no horizontal overflow`);
      await shot('0a-catalog');

      // The brand page lists the same model cards.
      await page.goto(`${base}/${locale}/brands/rolex/`);
      assert.deepEqual((await page.locator('article.card .card__name a').evaluateAll(as=>as.map(a=>a.getAttribute('href').split('/')[3]))).sort(),['m126200-0001','m126200-0005','m126200-0029','m126610ln-0001'].map(slugOf).sort());
      assert.ok((await state()).overflow<=0,`${locale}: the brand page has no horizontal overflow`);
      await shot('0b-brand');

      // A non-primary variant URL opens its model with that variant selected; canonical names the primary.
      await page.goto(`${base}/${locale}/products/${slugOf('m126200-0006')}/`);
      await page.evaluate(()=>{window.__variantMarker='same-document';});
      let st=await state();
      assert.deepEqual({path:st.path,reference:st.reference,current:st.current,canonical:st.canonical},at('m126200-0006','bright-blue',BRACELET[1]));
      assert.equal(await page.locator('h1').textContent(),MODEL[locale]);
      assert.match(await page.title(),/m126200-0006/);
      assert.deepEqual(st.values,[...DIAL.map(k=>'dial='+k),...BRACELET.map(k=>'bracelet='+k)],'only real values; the withdrawn dial is not offered');
      assert.deepEqual([st.facts,st.images],[1,0],'the honest facts-only state: no image is borrowed or invented');
      assert.equal((await page.locator('.pdp__info .note').first().textContent()).trim(),locale==='ar'?'لا توجد صورة معتمدة لهذا المرجع بعد.':'No approved photograph of this reference yet.');
      assert.ok(st.specs.includes(value('m126200-0006','dial',locale)));
      assert.ok(st.overflow<=0,`${locale}: no horizontal overflow`);
      await shot('1-non-primary');

      // Tap: silver keeps the Oyster bracelet.
      await link('dial','silver').tap();
      await shown('m126200-0002');
      st=await state();
      assert.deepEqual({path:st.path,reference:st.reference,current:st.current,canonical:st.canonical},at('m126200-0002','silver',BRACELET[1]));
      assert.equal(st.marker,'same-document','swapped without a reload');
      assert.ok(st.specs.includes(value('m126200-0002','dial',locale))&&!st.specs.includes(value('m126200-0006','dial',locale)),'specs follow the real variant');
      await shot('2-tap-silver');

      // Keyboard: Jubilee from silver on Oyster is the primary itself.
      await tabTo('bracelet='+BRACELET[0]);
      assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none','visible focus ring');
      await page.keyboard.press('Enter');
      await shown('m126200-0001');
      st=await state();
      assert.deepEqual({path:st.path,reference:st.reference,current:st.current,canonical:st.canonical},at('m126200-0001','silver',BRACELET[0]));
      assert.equal(st.active,'bracelet='+BRACELET[0],'focus stays on the chosen value');
      await shot('3-keyboard-jubilee');

      // Keyboard: candy pink exists only on Oyster; its value says so and moves to that real variant.
      const pink=link('dial','candy-pink');
      assert.ok((await page.locator(`[id="${await pink.getAttribute('aria-describedby')}"]`).textContent()).includes(value('m126200-0010','bracelet',locale)));
      if(locale==='ar')assert.equal(await pink.locator('bdi[lang="en"][dir="ltr"]').textContent(),'Candy pink','a value kept in English is marked as English');
      await tabTo('dial=candy-pink');
      await page.keyboard.press('Enter');
      await shown('m126200-0010');
      st=await state();
      assert.deepEqual({path:st.path,reference:st.reference,current:st.current,canonical:st.canonical},at('m126200-0010','candy-pink',BRACELET[1]));
      assert.ok(st.specs.includes(value('m126200-0010','bracelet',locale)));
      await shot('4-keyboard-candy-pink');

      // Tap: Jubilee from candy pink can only be the silver primary; never an invented pink Jubilee.
      await link('bracelet',BRACELET[0]).tap();
      await shown('m126200-0001');
      st=await state();
      assert.deepEqual({path:st.path,reference:st.reference,current:st.current,canonical:st.canonical},at('m126200-0001','silver',BRACELET[0]));
      assert.deepEqual([st.marker,st.facts,st.images],['same-document',1,0]);
      assert.ok(st.overflow<=0);
      await shot('5-tap-jubilee');

      // Each variant URL, served fresh, names the primary as canonical.
      for(const ref of ['m126200-0002','m126200-0006','m126200-0010']){
        const html=await (await fetch(`${base}/${locale}/products/${slugOf(ref)}/`)).text();
        assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`),ref);
      }
      // A colour model reached by its non-primary URL.
      await page.goto(`${base}/${locale}/products/${slugOf('L1899089556')}/`);
      assert.equal(await page.locator('h1').textContent(),TOTE[locale]);
      await link('colour','paper').tap();
      await shown('L1899089P59');
      assert.equal((await state()).canonical,`${SITE}${locale}/products/${slugOf('L1899089001')}/`);
      await shot('6-tote-paper');
      assert.deepEqual(errors,[],'no page errors');
      assert.deepEqual(blocked,[],'the pages request nothing beyond the local preview');
      await context.close();
    }
    const paths=new Set(mockLog.map(u=>u.pathname));
    assert.ok(['/rest/v1/jwl_catalog_models','/rest/v1/rpc/jwl_product_model','/rest/v1/rpc/jwl_brand_models_page'].every(p=>paths.has(p)),[...paths].join(' '));
    assert.ok(!paths.has('/rest/v1/jwl_catalog')&&!paths.has('/rest/v1/rpc/jwl_brand_page'),'the storefront never fell back to the pre-model reads');
  }finally{
    await browser.close();server.kill();mock.server.close();
  }
});
