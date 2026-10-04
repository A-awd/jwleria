import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLongchamp} from './extract-longchamp.mjs';
const url='https://www.longchamp.com/us/en/products/tote-bag-l-L1899089001.html';
function page({collection='Le Pliage Original',sku='L1899089001'}={}){
 return `<script>var dataLayer = ${JSON.stringify([{pageCategory:'product',product:{itno:'L1899089001',line:collection,color:'Black',material:'Canvas'},pageLevel2:'bags'}])};</script>
 <script type="application/ld+json">${JSON.stringify([{ '@type':'Product',sku,name:'Le Pliage Original L Tote bag',image:'https://www.longchamp.com/images/L1899089001.png',description:'Private source copy',offers:{description:'Reference: L1899089001 | Material: Recycled canvas | Dimensions: 31 x 30 x 19 cm'}}])}</script>
 <img src="https://www.longchamp.com/gallery/images/DIS/L1899089001_1.png?sw=2000&sh=2000">
 <img src="https://www.longchamp.com/gallery/images/DIS/OTHERREF_1.png?sw=2000&sh=2000">`;
}
test('exact variant gallery excludes other products and copy stays original',()=>{
 const c=extractLongchamp(page(),{page_url:url});
 assert.equal(c.collection,'Le Pliage Original');assert.equal(c.image_urls.length,2);
 assert.ok(c.image_urls.every(u=>!u.includes('OTHERREF')));
 assert.ok(c.description_en.includes('31 x 30 x 19 cm'));
 assert.ok(!c.description_en.includes('Private source copy'));
 assert.equal(c.media_rights_state,'unverified');
});
test('mismatched SKU cannot substitute a recommendation for the requested product',()=>{
 assert.throws(()=>extractLongchamp(page({sku:'OTHERREF'}),{page_url:url}),/Matching product identity missing/);
});
test('missing official collection cannot be filled with a guessed collection',()=>{
 assert.throws(()=>extractLongchamp(page({collection:''}),{page_url:url}),/Official variant and collection missing/);
});
