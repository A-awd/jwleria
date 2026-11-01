import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fragmentPath,variantPath,variantSwapper} from '../src/components/variant-swap.mjs';
import {galleryView} from '../src/components/gallery-view.mjs';
import {productMedia} from '../src/components/product-media.mjs';
import {configurator} from '../src/components/variant-selection.mjs';

// The owner's failed phone acceptance of 2026-11-01 (decision 0019):
// - a vertical swipe on the photograph did not scroll the page;
// - option changes were heavy;
// - a photograph of another dial stayed on screen for the selected one.
// These tests cover what can be proven without a phone. Real iPhone touch stays an owner-observed check.
const css=await readFile(new URL('../src/styles/global.css',import.meta.url),'utf8');
const page=await readFile(new URL('../src/pages/[locale]/products/[slug].astro',import.meta.url),'utf8');
// Rules as [selector, declarations], top level and inside media queries; no declaration block holds a brace.
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].flatMap(m=>m[1].split(',').map(s=>[s.trim(),m[2]]));
const of=selector=>rules.filter(([s])=>s===selector).map(([,d])=>d).join(';');

test('one photograph is no scroll container, several scroll only horizontally, and no horizontal scroller scrolls vertically',()=>{
  assert.doesNotMatch(of('.pdp__gallery'),/overflow|scroll-snap-type/,'a one-image gallery is a plain figure');
  const many=of('.pdp__gallery--many');
  assert.match(many,/overflow-x:\s*auto/);assert.match(many,/overflow-y:\s*hidden/);assert.match(many,/scroll-snap-type:\s*x\b/);
  // overflow-x: auto alone makes overflow-y compute to auto: the cause of the trapped vertical swipe.
  for(const [selector,body] of rules.filter(([,d])=>/overflow-x:\s*(auto|scroll)/.test(d))){
    assert.match(of(selector.split(':')[0]),/overflow-y:\s*hidden/,`${selector} scrolls horizontally only`);
  }
  const vertical=rules.filter(([,d])=>/overflow(-y)?:\s*(auto|scroll)/.test(d)).map(([s])=>s);
  assert.deepEqual(vertical,['.menu__panel'],'the only vertical inner scroller is the site menu panel');
  assert.ok(!rules.some(([,d])=>/touch-action:\s*none|overscroll-behavior(-y)?:\s*(none|contain)/.test(d)),'no rule blocks the page\'s own gestures');
});

test('the option lists flow with the page: no nested scroller, no capped height, and nothing on the product page is sticky',()=>{
  assert.doesNotMatch(of('.picker__panel'),/max-height|overflow/);
  const product=rules.filter(([s])=>/^(\.pdp|\.picker|\.config|\.segment|\.fold|\.facts|\.size-table|\.photo-missing)/.test(s));
  assert.ok(product.length>30);
  for(const [selector,body] of product)assert.doesNotMatch(body,/position:\s*(sticky|fixed)|max-height/,selector);
  assert.deepEqual(rules.filter(([,d])=>/position:\s*sticky/.test(d)).map(([s])=>s),['.site-header']);
});

test('the page adds no touch, wheel or scroll listener; its pointer listener is passive and only a variant link click is cancelled',()=>{
  const script=page.slice(page.indexOf('<script>'));
  assert.doesNotMatch(script,/addEventListener\(\s*'(touchstart|touchmove|touchend|wheel|scroll|gesture\w*)'/);
  assert.match(script,/addEventListener\('pointerdown', intent, \{ passive: true \}\)/);
  assert.equal(script.match(/preventDefault\(\)/g)?.length,1);
  assert.match(script,/closest<HTMLAnchorElement>\('a\[data-variant-link\]'\);\n\s+if \(!link \|\| event\.defaultPrevented[^\n]+\n\s+event\.preventDefault\(\);/);
  assert.match(script,/focus\(\{ preventScroll: true \}\)/,'focus never scrolls the page');
  assert.match(script,/addEventListener\('popstate'/,'back and forward are handled');
  assert.match(script,/window\.history\.pushState\(/);assert.doesNotMatch(script,/replaceState/,'a choice is a history entry, never a replacement');
});

// A controllable fetch: each load waits until the test resolves or rejects it.
function io(){
  const loads=[],shown=[],failed=[],pending=[];
  const load=path=>new Promise((resolve,reject)=>loads.push({path,resolve,reject}));
  return {loads,shown,failed,pending,options:{load,prepare:html=>html,show:(html,path,choice)=>shown.push([path,html,choice]),pending:(path)=>pending.push(path),fail:path=>failed.push(path)}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('the latest choice wins: a slower earlier response is never shown over a later one, nor written to history',async()=>{
  const t=io(),entries=[],swap=variantSwapper({...t.options,history:{push:p=>entries.push(p)}});
  const first=swap.choose('/ar/products/a/'),second=swap.choose('/ar/products/b/');
  assert.deepEqual(t.pending,['/ar/products/a/','/ar/products/b/'],'each choice shows at once, before any network answer');
  t.loads[1].resolve('B');assert.equal(await second,'shown');
  t.loads[0].resolve('A');assert.equal(await first,'stale');
  assert.deepEqual(t.shown.map(([p])=>p),['/ar/products/b/']);
  assert.deepEqual(entries,['/ar/products/b/'],'only the shown choice becomes a history entry');
});

test('each variant is fetched once: an intent prefetch and the choice share it, and a revisit is instant',async()=>{
  const t=io(),swap=variantSwapper(t.options);
  swap.prefetch('/ar/products/a/');const chosen=swap.choose('/ar/products/a/');
  assert.equal(t.loads.length,1,'the tap reuses the request its pointerdown started');
  t.loads[0].resolve('A');assert.equal(await chosen,'shown');
  assert.equal(await swap.choose('/ar/products/a/'),'shown');assert.equal(t.loads.length,1,'a revisited variant needs no request');
});

test('a failed latest choice falls back to the real page; a failed stale one is ignored; a failure is not cached',async()=>{
  const t=io(),swap=variantSwapper(t.options);
  const stale=swap.choose('/ar/products/a/'),latest=swap.choose('/ar/products/b/');
  t.loads[0].reject(new Error('offline'));assert.equal(await stale,'failed');assert.deepEqual(t.failed,[]);
  t.loads[1].reject(new Error('HTTP 503'));assert.equal(await latest,'failed');assert.deepEqual(t.failed,['/ar/products/b/'],'the link navigates normally');
  assert.equal(swap.has('/ar/products/b/'),false);
  const retry=swap.choose('/ar/products/b/');assert.equal(t.loads.length,3);t.loads[2].resolve('B');assert.equal(await retry,'shown');
});

test('the cache is bounded and keeps the most recently used variants',async()=>{
  const t=io(),swap=variantSwapper({...t.options,limit:3});
  for(const p of ['a','b','c','d'])swap.prefetch(`/ar/products/${p}/`);
  assert.equal(swap.size,3);assert.equal(swap.has('/ar/products/a/'),false);
  swap.prefetch('/ar/products/b/');swap.prefetch('/ar/products/e/');
  assert.deepEqual(['b','c','d','e'].map(p=>swap.has(`/ar/products/${p}/`)),[true,false,true,true],'b was used again, so c went');
  t.loads.forEach(l=>l.resolve('x'));await tick();
});

test('a slow photograph decode of an earlier choice never replaces the later choice',async()=>{
  const shown=[];let release;
  const swap=variantSwapper({load:async p=>p,prepare:html=>html==='/ar/products/a/'?new Promise(r=>{release=()=>r(html);}):html,show:p=>shown.push(p),fail:()=>assert.fail('no failure')});
  const first=swap.choose('/ar/products/a/');await tick();
  assert.equal(await swap.choose('/ar/products/b/'),'shown');release();assert.equal(await first,'stale');
  assert.deepEqual(shown,['/ar/products/b/']);
});

// A browser's session history as the page uses it: pushState after a shown choice, popstate on Back and Forward.
function browser(start){
  const entries=[start],listeners=[];let index=0;
  const pop=()=>listeners.forEach(listener=>listener());
  return {get path(){return entries[index];},get entries(){return [...entries];},
    push(path){entries.splice(index+1,Infinity,path);index=entries.length-1;},
    back(){if(index>0){index--;pop();}},forward(){if(index<entries.length-1){index++;pop();}},onpop:listener=>listeners.push(listener)};
}

test('Back and Forward step through the chosen variants and show the variant of each restored address, without a request',async()=>{
  const nav=browser('/ar/products/a/'),loads=[];let shown='/ar/products/a/';
  const swap=variantSwapper({load:async p=>{loads.push(p);return p;},prepare:html=>html,show:(html,path)=>{shown=path;},fail:()=>assert.fail('no failure'),history:{push:p=>nav.push(p)}});
  swap.seed('/ar/products/a/','A');
  // The page's popstate listener: show the restored address unless it is already shown.
  nav.onpop(()=>{if(nav.path!==shown)void swap.choose(nav.path,{history:true});});
  await swap.choose('/ar/products/b/');await swap.choose('/ar/products/c/');
  assert.deepEqual(nav.entries,['/ar/products/a/','/ar/products/b/','/ar/products/c/'],'each shown choice is one entry');
  nav.back();await tick();assert.equal(shown,'/ar/products/b/');
  nav.back();await tick();assert.equal(shown,'/ar/products/a/','Back reaches the variant the page opened on');
  nav.forward();await tick();assert.equal(shown,'/ar/products/b/');
  assert.deepEqual(loads,['/ar/products/b/','/ar/products/c/'],'the opened block is seeded and visited ones are cached');
  assert.deepEqual(nav.entries,['/ar/products/a/','/ar/products/b/','/ar/products/c/'],'a restored address writes no entry');
  await swap.choose('/ar/products/d/');
  assert.deepEqual(nav.entries,['/ar/products/a/','/ar/products/b/','/ar/products/d/'],'a choice after Back drops the forward entries, as a browser does');
  nav.back();nav.back();await tick();assert.equal(shown,'/ar/products/a/','several quick Backs settle on the last restored address');
});

test('product and fragment paths',()=>{
  assert.deepEqual(variantPath('/ar/products/rolex-m126334-0028-abc12345/'),{locale:'ar',slug:'rolex-m126334-0028-abc12345'});
  assert.equal(variantPath('/ar/catalog/'),undefined);assert.equal(variantPath('/ar/products/a/variant/'),undefined);
  assert.equal(fragmentPath('/ar/products/a/'),'/ar/products/a/variant/');
});

const option=(kind,key,en,ar=en)=>({kind,key,label:{en:kind,ar:kind},value:{en,ar}});
const s36=option('case_size','36-mm','36 mm','36 مم'),s41=option('case_size','41-mm','41 mm','41 مم');
const black=option('dial','black','Bright black','أسود لامع'),green=option('dial','green','Mint green','أخضر نعناعي');
const image='https://media.example/v1/a/b/640w-c.webp';
const credit={creator:'A. Photographer',license:'CC BY 2.0',license_url:'https://creativecommons.org/licenses/by/2.0/',source_url:'https://commons.wikimedia.org/wiki/File:X.jpg',changes:'resized and converted to WebP'};
const photo={src:image,width:640,height:800,variants:[320,640,960].map(w=>({src:image.replace('640w',`${w}w`),width:w,height:w*1.25,bytes:w*40})),attribution:credit};
const links=[
  {id:'1',slug:'dj-36-black',reference:'m126234-0015',position:0,isPrimary:true,hasImage:true,options:[s36,black]},
  {id:'2',slug:'dj-41-black',reference:'m126334-0018',position:1,isPrimary:false,hasImage:false,options:[s41,black]},
  {id:'3',slug:'dj-41-green',reference:'m126334-0028',position:2,isPrimary:false,hasImage:false,options:[s41,green]},
];
const product=(slug,images=[])=>({...links.find(v=>v.slug===slug),images,imageVariants:images.length?[photo]:[],name:{en:'Rolex Datejust',ar:'رولكس ديت جست'},specs:[]});
const representative={slug:'dj-36-black',reference:'m126234-0015',images:[image],imageVariants:[photo],sizeOption:s36,sameSize:false};

test('a variant with its own photograph shows it; without one the gallery says so and names the other reference it shows',()=>{
  assert.deepEqual(galleryView(product('dj-36-black',[image]),undefined,links),{mode:'own'});
  const green41=product('dj-41-green');
  const view=galleryView(green41,representative,links);
  assert.equal(view.mode,'missing');
  assert.deepEqual(view.details.map(o=>o.value.en),['36 mm','Bright black'],'the photographed size and dial are named, so black is never read as green');
  assert.equal(green41.images.length,0,'another variant\'s photograph never becomes this variant\'s');
  assert.deepEqual(galleryView(green41,undefined,links),{mode:'none'});
  assert.deepEqual(galleryView(green41,{...representative,images:[]},links),{mode:'none'});
  // Each option link says whether its variant has its own photograph, so a tap can say so before any request.
  const dial=configurator(links,{...product('dj-41-black'),hasImage:false}).find(c=>c.kind==='dial');
  assert.deepEqual(dial.values.map(v=>[v.reference,v.photo]),[['m126334-0018',false],['m126334-0028',false]]);
  assert.deepEqual(dial.elsewhere,[]);
  const size=configurator(links,{...product('dj-41-green'),hasImage:false}).find(c=>c.size);
  assert.deepEqual(size.values.map(v=>[v.reference,v.photo]),[['m126234-0015',true],['m126334-0028',false]]);
});

test('the secondary photograph loads a small rendition, and a single photograph is sized to the content width',()=>{
  const shown={...product('dj-41-green'),images:[image],imageVariants:[photo]};
  const thumb=productMedia(shown,0,'thumb');
  assert.equal(thumb.sizes,'7.5rem');assert.doesNotMatch(thumb.srcset,/960w/);assert.match(thumb.src,/320w/);
  assert.equal(productMedia(shown,0,'single').sizes,'(min-width: 100rem) 840px, (min-width: 60rem) 54vw, calc(100vw - 2.5rem)');
  assert.match(productMedia(shown,0,'detail').sizes,/86vw$/,'a carousel keeps its 86% columns');
});

test('the product page is compact on a phone: the name, a screen-sized photograph and the options together (decision 0020)',async()=>{
  const article=await readFile(new URL('../src/components/ProductArticle.astro',import.meta.url),'utf8');
  const selector=await readFile(new URL('../src/components/VariantSelector.astro',import.meta.url),'utf8');
  const order=['<header class="pdp__head">','<ProductGallery','<VariantSelector','<div class="pdp__cta">','<div class="folds">'].map(m=>article.indexOf(m));
  assert.ok(order.every((at,i)=>at>0&&(i===0||at>order[i-1])),'name, photograph, options, inquiry, then the details, in reading order');
  assert.match(of('.pdp'),/grid-template-areas:\s*"head" "gallery" "info"/);
  const frame=of('.pdp__gallery .media');
  assert.match(frame,/aspect-ratio:\s*auto;\s*height:\s*clamp\(13rem,\s*40svh,\s*26rem\)/,'the photograph frame follows the screen height, bounded, instead of a tall 4:5 column');
  assert.match(frame,/aspect-ratio:\s*4 \/ 5;\s*height:\s*auto/,'the two-column desktop gallery keeps its 4:5 frame');
  assert.match(css,/:is\(\.pdp__gallery, \.card\) \.media > img\.art\[srcset\] \{ object-fit: contain;/,'the whole product, never cropped');
  assert.match(of('.pdp__head h1'),/font-size:\s*var\(--s2\)/,'a smaller title on a phone');
  assert.match(selector,/<details class="picker__elsewhere">/,'values made only in other sizes stay one row until opened');
  for(const target of ['.segment','.picker__option','.picker__heading','.picker__size'])assert.match(of(target),/min-height:\s*2\.75rem/,`${target} stays at least 44px`);
  assert.match(of('.picker__summary'),/min-height:\s*3rem/);
  assert.match(page,/fresh\.querySelector\('\.pdp__gallery'\)\?\.getBoundingClientRect\(\)/,'after a choice the photograph is brought back on screen with the control when both fit');
});
