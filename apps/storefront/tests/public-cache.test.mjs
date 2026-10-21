import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPageResponse } from '../src/server/public-cache.mjs';

// A real Response store substitutes only the remote Cloudflare cache service.
function harness(){
 const entries=new Map();let renders=0;const pending=[];
 const cache={async match(key){return entries.get(key.url)?.clone();},async put(key,response){entries.set(key.url,response.clone());}};
 const options={cache,waitUntil:p=>pending.push(p),build:'test-release',now:()=>100000};
 const render=async()=>new Response('real catalog '+(++renders),{headers:{'Content-Type':'text/html; charset=utf-8'}});
 return {options,render,flush:()=>Promise.all(pending),renders:()=>renders};
}
test('a second anonymous navigation reuses HTML without another origin render',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/categories/watches/');
 const first=await publicPageResponse(r,h.render,h.options);assert.equal(await first.text(),'real catalog 1');await h.flush();
 const second=await publicPageResponse(r,h.render,h.options);assert.equal(await second.text(),'real catalog 1');assert.equal(second.headers.get('X-JWL-Cache'),'HIT');assert.equal(h.renders(),1);
});
test('pages, languages and deployments never share the wrong cached document',async()=>{
 const h=harness();
 for(const [url,build] of [['https://jwleria.com/ar/catalog/?page=1','release-a'],['https://jwleria.com/ar/catalog/?page=2','release-a'],['https://jwleria.com/en/catalog/?page=1','release-a'],['https://jwleria.com/ar/catalog/?page=1','release-b']]){
  const response=await publicPageResponse(new Request(url),h.render,{...h.options,build});assert.equal(response.headers.get('X-JWL-Cache'),'MISS');await h.flush();
 }
 assert.equal(h.renders(),4);
});
test('changed or withdrawn catalog content replaces the cached page at the freshness boundary',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/categories/watches/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 const response=await publicPageResponse(r,h.render,{...h.options,now:()=>161000});assert.equal(await response.text(),'real catalog 2');assert.equal(h.renders(),2);
});
test('authenticated requests, search, APIs, writes and unexpected query variants always stay uncached',async()=>{
 const h=harness();
 const requests=[new Request('https://jwleria.com/ar/catalog/',{headers:{Cookie:'session=private'}}),new Request('https://jwleria.com/ar/catalog/',{headers:{Authorization:'Bearer private'}}),new Request('https://jwleria.com/ar/catalog/?q=private-search'),new Request('https://jwleria.com/api/catalog.json'),new Request('https://jwleria.com/ar/catalog/',{method:'POST'}),new Request('https://jwleria.com/ar/?font=amiri')];
 for(const r of requests){await publicPageResponse(r,h.render,h.options);await h.flush();await publicPageResponse(r,h.render,h.options);}
 assert.equal(h.renders(),12);
});
test('personalized responses, application errors and no-store responses cannot enter the public cache',async()=>{
 for(const params of [{status:503},{headers:{'Set-Cookie':'session=private'}},{headers:{'Cache-Control':'private'}},{headers:{'Cache-Control':'no-store'}},{headers:{Vary:'*'}}]){
  const h=harness();let renders=0;const next=async()=>{renders++;return new Response('uncached',{...params,headers:{'Content-Type':'text/html',...params.headers}});};
  await publicPageResponse(new Request('https://jwleria.com/ar/'),next,h.options);await h.flush();await publicPageResponse(new Request('https://jwleria.com/ar/'),next,h.options);assert.equal(renders,2);
 }
});
test('cache outages do not break the working origin response',async()=>{
 const response=await publicPageResponse(new Request('https://jwleria.com/ar/'),async()=>new Response('available'),{build:'test-release',cache:{async match(){throw new Error('cache unavailable');}},now:()=>100000});assert.equal(await response.text(),'available');
});
