import test from 'node:test';
import assert from 'node:assert/strict';
import {queryCatalog,publicProduct,readProduct} from '../src/server/supabase-catalog.mjs';
import {extractProducts} from '../../../scripts/catalog-intake/extract.mjs';
const row={id:'id-1',slug:'test-piece',reference:'REF-1',brand_slug:'test-brand',category_slug:'watches',collection_slug:'test-collection',collection_ar:'اختبار',collection_en:'Test',name_ar:'قطعة',name_en:'Piece',images:['https://example.com/image.webp'],published_at:'2026-10-04T00:00:00Z',price:900,secret:'private'};
const config={url:'https://test.supabase.co',key:'sb_publishable_TEST'};
test('Server query is bounded and filtered without requesting private fields',async()=>{
  let requested;
  const result=await queryCatalog(config,{brand:'test-brand',collection:'test-collection',search:'سَاعة',page:2,pageSize:100},async(url,opts)=>{
    requested=url;assert.equal(opts.headers.apikey,config.key);assert.equal(opts.headers.Authorization,undefined);
    return new Response(JSON.stringify([row]),{status:200,headers:{'Content-Range':'48-48/80'}});
  });
  assert.equal(requested.searchParams.get('limit'),'48');assert.equal(requested.searchParams.get('offset'),'48');
  assert.equal(requested.searchParams.get('brand_slug'),'eq.test-brand');assert.equal(requested.searchParams.get('collection_slug'),'eq.test-collection');
  assert.ok(!requested.searchParams.get('select').includes('price'));
  assert.equal(result.pages,2);assert.equal(result.items[0].isPreview,false);assert.ok(!('price' in result.items[0])&&!('secret' in result.items[0]));
});
test('Catalog failures stay failures and invalid image URLs are rejected',async()=>{
  await assert.rejects(queryCatalog(config,{},async()=>new Response('denied',{status:403})),/403/);
  assert.throws(()=>publicProduct({...row,images:['javascript:alert(1)']}),/images/);
  assert.equal(await readProduct(config,'not/a/slug',()=>{throw Error('must not fetch')}),undefined);
});
test('Source extraction requires variant identity and collection; offers never enter candidates',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Product',sku:'variant-1',mpn:'model-1',name:'Piece',image:'https://example.com/image.webp',offers:{price:900}}]})+'</script>';
  const source={id:'source',brand:'Brand',page_url:'https://example.com/product',collection_slug:'collection',collections:{collection:'Collection'}};
  const result=extractProducts(html,source);assert.equal(result.length,1);assert.equal(result[0].external_id,'variant-1');assert.ok(!('offers' in result[0])&&!('price' in result[0]));
  assert.throws(()=>extractProducts(html,{...source,collections:{}}),/mapping/);
});
