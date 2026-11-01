import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProduct} from '../src/server/supabase-catalog.mjs';
import {productMedia} from '../src/components/product-media.mjs';

const url=n=>`https://media.example.com/product/${n}.webp`;
const variants=[320,640,960,1600].map(width=>({src:url(width),width,height:width*1.25,bytes:width*100}));
const image={src:url(1600),width:1600,height:2000,variants};
const row={id:'id-1',slug:'piece',reference:'REF-1',brand_slug:'brand',category_slug:'watches',collection_slug:'collection',collection_ar:'مجموعة',collection_en:'Collection',name_ar:'ساعة',name_en:'Watch',description_ar:'حقائق',description_en:'Facts',images:[url(1600)],image_variants:[image],media_state:'approved_media',published_at:'2026-10-21T00:00:00Z'};

test('cards use bounded actual derivatives while detail retains its larger view',()=>{
 const p=publicProduct(row);
 const card=productMedia(p,0,'card');
 assert.equal(card.src,url(640));assert.equal(card.width,640);assert.equal(card.height,800);
 assert.equal(card.srcset,`${url(320)} 320w, ${url(640)} 640w, ${url(960)} 960w`);
 assert.ok(!card.srcset.includes('1600'));assert.match(card.sizes,/56rem/);
 assert.match(productMedia(p,0,'card',3).sizes,/329px/);assert.ok(!productMedia(p,0,'card',3).sizes.includes('80rem'));
 const detail=productMedia(p,0,'detail');assert.equal(detail.src,url(1600));assert.equal(detail.width,1600);assert.match(detail.srcset,/1600w/);
 const gallery={...p,images:[...p.images,...p.images],imageVariants:[...p.imageVariants,...p.imageVariants]};
 const secondary=productMedia(gallery,1,'detail');
 assert.match(detail.sizes,/54vw/);assert.match(secondary.sizes,/27vw/);
 assert.ok(!secondary.sizes.includes('54vw'));
 // On a phone a contained 4:5 photograph is bounded by the 30svh frame's height, not its 86% column (decision 0021).
 assert.match(secondary.sizes,/, calc\(24vh\)$/);
 assert.deepEqual(productMedia({...p,imageVariants:[]},0,'card'),{src:url(1600),width:800,height:1000});
 const small={...row,images:[url(240)],image_variants:[{src:url(240),width:240,height:300,variants:[{src:url(240),width:240,height:300,bytes:10000}]}]};
 assert.equal(productMedia(publicProduct(small),0,'card').width,240);
});

test('responsive metadata rejects a foreign gallery, fake geometry and private fields',()=>{
 for(const change of [
  [{...image,src:url('foreign')}],
  [{...image,width:0}],
  [{...image,variants:[...variants].reverse()}],
  [{...image,variants:[{...variants[0],height:999},...variants.slice(1)]}],
  [{...image,variants:[...variants,{src:url(2000),width:2000,height:2500,bytes:1000}]}],
  [{...image,variants:[{...variants[0],src:'https://media.example.com/a?secret=private'},...variants.slice(1)]}],
  [{...image,media_permission_reference:'private grant'}],
  [{...image,variants:[{...variants[0],source_file:'/private/file'},...variants.slice(1)]}],
 ])assert.throws(()=>publicProduct({...row,image_variants:change}),/responsive/i);
 assert.throws(()=>publicProduct({...row,images:[],media_state:'facts_only'}),/responsive/i);
 const p=publicProduct({...row,images:[],image_variants:[],media_state:'facts_only'});assert.deepEqual(p.imageVariants,[]);
 assert.throws(()=>productMedia(p,0,'card'),/image/i);
});

test('a white square (decision 0022) is projected as a square canvas, sized from its real phone geometry, and a source-clipped image says so',async()=>{
 const sq=[320,640,960,1414].map(width=>({src:url('sq'+width),width,height:width,bytes:width*50}));
 const white={src:url('sq1414'),width:1414,height:1414,variants:sq,canvas:'white_square'};
 const p=publicProduct({...row,images:[white.src],image_variants:[white]});
 assert.equal(p.imageVariants[0].canvas,'white_square');assert.equal(p.imageVariants[0].sourceClipped,undefined);
 // A square in the 30svh phone frame is as wide as the frame is high: the size hint names that, not the column.
 assert.match(productMedia(p,0,'single').sizes,/, calc\(30vh\)$/);
 assert.equal(productMedia(p,0,'card').src,url('sq640'));
 const clipped=publicProduct({...row,image_variants:[{...image,source_clipped:true}]});
 assert.equal(clipped.imageVariants[0].sourceClipped,true);assert.equal(clipped.imageVariants[0].canvas,undefined);
 for(const change of [{...white,canvas:'sand'},{...image,canvas:'white_square'},{...white,source_clipped:false},{...white,canvas:true}])
  assert.throws(()=>publicProduct({...row,images:[change.src],image_variants:[change]}),/responsive/i,'only a square may claim the white canvas; source_clipped only discloses');
 // The components mark the frame and the notice from these two fields alone.
 const {readFile}=await import('node:fs/promises');
 const gallery=await readFile(new URL('../src/components/ProductGallery.astro',import.meta.url),'utf8'),card=await readFile(new URL('../src/components/ProductCard.astro',import.meta.url),'utf8');
 assert.match(gallery,/white: product\.imageVariants\?\.\[i\]\?\.canvas === 'white_square', clipped: product\.imageVariants\?\.\[i\]\?\.sourceClipped === true/);
 assert.match(gallery,/\{v\.clipped && <> · <span class="source-clipped">\{s\.product\.sourceClipped\}<\/span><\/>\}/);
 assert.match(card,/p\.imageVariants\?\.\[0\]\?\.sourceClipped && <p class="source-clipped source-clipped--card">/);
 const css=await readFile(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.media--white \{ background: #fff; \}/);
 assert.match(css,/\.pdp__gallery \.media--white \{ aspect-ratio: 1; width: auto; height: clamp\(10rem, 30svh, 20rem\); margin-inline: auto; \}/,'the phone frame of a white square is the square itself, as high as the compact frame');
});

test('a photograph card is a square pale tile with the product held to 70% (owner-selected reference, 2026-11-01)',async()=>{
 const {readFile}=await import('node:fs/promises');
 const css=await readFile(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/--tile: #f0f0f0;/,'the measured reference grey');
 assert.match(css,/\.card \.media--tile \{ aspect-ratio: 1; background: var\(--tile\); padding: 15%; \}/,'square tile, no outline, the photograph inside 70%');
 assert.match(css,/\.card \.media--tile > img\.art \{ width: 100%; height: 100%; object-fit: contain;/,'whole product, never cropped');
 assert.doesNotMatch(css,/\.card \.media--white/,'the grid no longer uses the white frame');
 const card=await readFile(new URL('../src/components/ProductCard.astro',import.meta.url),'utf8');
 assert.match(card,/class:list=\{\['media', 'media--tile',/);
 const {TILE_FILL}=await import('../src/components/product-media.mjs');
 assert.equal(TILE_FILL,0.7);
 const p=publicProduct(row);
 assert.match(productMedia(p,0,'card').sizes,/, calc\(0\.7 \* \(\(100vw - clamp\(2\.5rem, 9vw, 8rem\) - clamp\(1rem, 2\.5vw, 2rem\)\) \/ 2\)\)$/,'a phone card names its in-tile width');
 assert.match(productMedia(p,0,'card').sizes,/^\(min-width: 100rem\) 241px, /);
 assert.match(css,/body:has\(\.grid > \.card\):not\(:has\(\.pdp\)\) \{ background: #fff; \}/,'a listing page (not a product page) is white');
 assert.match(css,/@media \(max-width: 55\.99rem\) \{ body:has\(\.grid > \.card\):not\(:has\(\.pdp\)\) \.grid \{ margin-inline: calc\(12px - var\(--gutter\)\); column-gap: 18px; \} \}/,'a phone listing has a 12px outer margin and an 18px gap');
});
