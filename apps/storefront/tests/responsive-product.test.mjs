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
 assert.match(productMedia(p,0,'card',3).sizes,/470px/);assert.ok(!productMedia(p,0,'card',3).sizes.includes('80rem'));
 const detail=productMedia(p,0,'detail');assert.equal(detail.src,url(1600));assert.equal(detail.width,1600);assert.match(detail.srcset,/1600w/);
 const gallery={...p,images:[...p.images,...p.images],imageVariants:[...p.imageVariants,...p.imageVariants]};
 const secondary=productMedia(gallery,1,'detail');
 assert.match(detail.sizes,/54vw/);assert.match(secondary.sizes,/27vw/);
 assert.ok(!secondary.sizes.includes('54vw'));assert.match(secondary.sizes,/86vw$/);
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
