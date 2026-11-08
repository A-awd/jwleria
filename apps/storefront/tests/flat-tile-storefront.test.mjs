import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {responsiveImages} from '../src/server/responsive-media.mjs';
import {productMedia,shareImage} from '../src/components/product-media.mjs';

// Gaps G2 and G3 in the Worker: backward-compatible parsing (legacy entries unchanged), a flat tile filling its tile,
// and a written-permission credit shown verbatim. Synthetic URLs only.
const src=w=>`https://media.example.test/v1/${'9'.repeat(64)}/${'a'.repeat(64)}/${w}w-${String(w).padStart(64,'0')}.webp`;
const entry=(over={})=>({src:src(1200),width:1200,height:1200,variants:[320,640,1200].map((w,i)=>({src:src(w),width:w,height:w,bytes:3000+i})),...over});
const product=image=>({images:[image.src],image:image.src,imageVariants:[image]});

test('a flat tile is a square canvas that fills the whole tile; legacy and white-square entries are unchanged',()=>{
  const [flat]=responsiveImages([entry({canvas:'flat_tile'})],[src(1200)],false);
  assert.equal(flat.canvas,'flat_tile');
  assert.throws(()=>responsiveImages([entry({canvas:'flat_tile',height:1100})],[src(1200)],false),/Invalid responsive image/,'a flat tile is square');
  assert.throws(()=>responsiveImages([entry({canvas:'grey'})],[src(1200)],false),/Invalid responsive image manifest/,'unknown canvas values still fail closed');
  assert.equal(responsiveImages([entry({canvas:'white_square'})],[src(1200)],false)[0].canvas,'white_square');
  assert.equal(responsiveImages([entry()],[src(1200)],false)[0].canvas,undefined);
  const flatSizes=productMedia(product(flat),0,'card').sizes,plain=productMedia(product(responsiveImages([entry()],[src(1200)],false)[0]),0,'card').sizes;
  assert.match(flatSizes,/^\(min-width: 100rem\) 344px, /,'full column, not 0.7 of it');
  assert.match(plain,/^\(min-width: 100rem\) 241px, /,'other photographs keep the padded tile hint');
  assert.match(productMedia(product(flat),0,'card',3).sizes,/^\(min-width: 100rem\) 470px, /);
});

test('a required written-permission credit is projected verbatim, never beside a licence credit, and suppresses the share image',async()=>{
  const [credited]=responsiveImages([entry({permission_credit:{text:'Synthetic Brand photograph',url:'https://example.test/press'}})],[src(1200)],false);
  assert.deepEqual(credited.permissionCredit,{text:'Synthetic Brand photograph',url:'https://example.test/press'});
  assert.equal(shareImage(product(credited)),null);
  assert.throws(()=>responsiveImages([entry({permission_credit:{text:' '}})],[src(1200)],false),/Invalid image credit/);
  assert.throws(()=>responsiveImages([entry({permission_credit:{text:'x',licence:'y'}})],[src(1200)],false),/Invalid image credit/);
  const attribution={creator:'A',license:'CC BY 4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',source_url:'https://commons.wikimedia.org/wiki/File:A.jpg',changes:'converted to WebP'};
  assert.throws(()=>responsiveImages([entry({attribution,permission_credit:{text:'x'}})],[src(1200)],false),/Invalid responsive image manifest/);
  const css=await readFile(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.card \.media--tile\.media--flat \{ padding: 0; \}/);
  const creditMarkup=await readFile(new URL('../src/components/ImageCredit.astro',import.meta.url),'utf8');
  assert.match(creditMarkup,/<bdi>\{permission\.text\}<\/bdi>\{permission\.url && <> · <a href=\{permission\.url\} rel="nofollow">/,'no licence link for a permission credit');
});
