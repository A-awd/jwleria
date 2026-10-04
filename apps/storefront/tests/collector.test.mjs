import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSource} from '../src/server/collector.mjs';
const source={id:'test',brand:'Brand',origin:'https://example.com',enabled:true,acquisition_allowed:true,permission_reference:'test-permission',min_interval_seconds:2,pages:[{url:'https://example.com/piece',collection_slug:'edit'}],collections:{edit:'Edit'}};
const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',sku:'variant-1',name:'Piece',image:'https://example.com/image.webp'})+'</script>';
test('Permitted source honors robots delay and produces candidate facts only',async()=>{
  const delays=[];const result=await collectSource(source,{sleep:async ms=>delays.push(ms),fetcher:async url=>new Response(String(url).endsWith('/robots.txt')?'User-agent: *\nAllow: /\nCrawl-delay: 3':html,{headers:{'content-type':String(url).endsWith('/robots.txt')?'text/plain':'text/html'}})});
  assert.deepEqual(delays,[3000]);assert.equal(result.length,1);assert.equal(result[0].publication_state,'candidate');
});
test('Refusal is not retried or bypassed',async()=>{
  let calls=0;await assert.rejects(collectSource(source,{sleep:async()=>{},fetcher:async()=>{calls++;return new Response('',{status:403})}}),e=>e.code==='source_access_refused');assert.equal(calls,1);
  await assert.rejects(collectSource({...source,acquisition_allowed:false},{fetcher:()=>{throw Error('must not fetch')}}),e=>e.code==='source_permission_missing');
  await assert.rejects(collectSource(source,{sleep:async()=>{},fetcher:async()=>new Response('User-agent: *\nDisallow: /')}),e=>e.code==='source_robots_refused');
});
