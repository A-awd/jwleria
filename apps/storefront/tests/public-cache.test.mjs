import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPageResponse } from '../src/server/public-cache.mjs';

const unhandled=[],warnings=[];process.on('unhandledRejection',error=>unhandled.push(error));console.warn=message=>warnings.push(message);
// A real Response store substitutes only the remote Cloudflare cache service. Like it, put reads the whole body and
// every call settles on a later macrotask, so work deferred behind an awaited cache call is not hidden by microtasks.
const io=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const entries=new Map();let renders=0,waits=0,time=100000,gate=Promise.resolve();const pending=[];
 const cache={async match(key){await io();return entries.get(key.url)?.clone();},async put(key,response){const body=await response.arrayBuffer();await io();entries.set(key.url,new Response(body,{status:response.status,headers:response.headers}));},async delete(key){await io();return entries.delete(key.url);}};
 const options={cache,waitUntil:p=>{waits++;pending.push(p);},build:'test-release',now:()=>time};
 const render=async()=>{const n=++renders;await gate;return new Response('real catalog '+n,{headers:{'Content-Type':'text/html; charset=utf-8'}});};
 const flush=async()=>{while(pending.length)await Promise.all(pending.splice(0));};
 // A held render opens by itself after a second, so a foreground-render regression fails instead of hanging.
 const hold=()=>{let release;gate=new Promise(resolve=>{release=resolve;});const timer=setTimeout(release,1000);return ()=>{clearTimeout(timer);gate=Promise.resolve();release();};};
 const entry=()=>{assert.equal(entries.size,1);return [...entries.values()][0].clone();};
 // True once the most recent waitUntil task has settled; checked after other ready callbacks have run.
 const settled=()=>Promise.race([pending.at(-1).then(()=>true),new Promise(resolve=>setImmediate(()=>resolve(false)))]);
 return {options,render,flush,hold,entry,entries,settled,at:ms=>{time=ms;},renders:()=>renders,waits:()=>waits};
}
const html=(body,init={})=>new Response(body,{...init,headers:{'Content-Type':'text/html',...init.headers}});

test('a second anonymous navigation reuses HTML without another origin render',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/categories/watches/');
 const first=await publicPageResponse(r,h.render,h.options);assert.equal(await first.text(),'real catalog 1');assert.equal(first.headers.get('X-JWL-Cache'),'MISS');await h.flush();
 h.at(130000);
 const second=await publicPageResponse(r,h.render,h.options);assert.equal(await second.text(),'real catalog 1');assert.equal(second.headers.get('X-JWL-Cache'),'HIT');assert.equal(h.renders(),1);
 assert.equal(second.headers.get('Age'),'30');assert.match(second.headers.get('Server-Timing'),/desc="HIT"/);assert.equal(second.headers.get('Cache-Control'),'public, max-age=0, must-revalidate');assert.equal(second.headers.has('X-JWL-Stored-At'),false);
});
test('pages, languages and deployments never share the wrong cached document',async()=>{
 const h=harness();
 for(const [url,build] of [['https://jwleria.com/ar/catalog/?page=1','release-a'],['https://jwleria.com/ar/catalog/?page=2','release-a'],['https://jwleria.com/en/catalog/?page=1','release-a'],['https://jwleria.com/ar/catalog/?page=1','release-b']]){
  const response=await publicPageResponse(new Request(url),h.render,{...h.options,build});assert.equal(response.headers.get('X-JWL-Cache'),'MISS');await h.flush();
 }
 assert.equal(h.renders(),4);
});
test('the stored copy outlives the whole window while browsers always revalidate',async()=>{
 const h=harness();
 const response=await publicPageResponse(new Request('https://jwleria.com/ar/'),h.render,h.options);await h.flush();
 assert.equal(response.headers.get('Cache-Control'),'public, max-age=0, must-revalidate');assert.equal(response.headers.has('Age'),false);
 const entry=h.entry();assert.equal(entry.headers.get('Cache-Control'),'public, max-age=600');assert.equal(entry.headers.get('X-JWL-Stored-At'),'100000');
});
test('freshness comes from the recorded store time, never from the stored max-age alone',async()=>{
 for(const storedAt of [undefined,'0','not-a-time','200000']){
  const h=harness(),r=new Request('https://jwleria.com/ar/about/');
  await publicPageResponse(r,h.render,h.options);await h.flush();
  const [key]=h.entries.keys();const headers={'Content-Type':'text/html','Cache-Control':'public, max-age=600'};if(storedAt)headers['X-JWL-Stored-At']=storedAt;
  h.entries.set(key,new Response('unverifiable copy',{headers}));
  const response=await publicPageResponse(r,h.render,h.options);assert.equal(response.headers.get('X-JWL-Cache'),'MISS');assert.equal(await response.text(),'real catalog 2');await h.flush();
 }
});
test('after the fresh minute the copy is served while exactly one background render per page replaces it',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/categories/watches/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 h.at(161000);const release=h.hold(),waits=h.waits();
 const stale=await publicPageResponse(r,h.render,h.options);
 // Checked before anything else is awaited: the refresh render has already started and is owned by waitUntil when the
 // stale copy is returned, so next() was never deferred behind cache I/O until after the middleware had answered.
 assert.equal(h.renders(),2);assert.equal(h.waits(),waits+1);
 assert.equal(stale.headers.get('X-JWL-Cache'),'STALE');assert.equal(await stale.text(),'real catalog 1');assert.equal(stale.headers.get('Age'),'61');assert.match(stale.headers.get('Server-Timing'),/desc="STALE"/);assert.equal(stale.headers.get('Cache-Control'),'public, max-age=0, must-revalidate');assert.equal(stale.headers.has('X-JWL-Stored-At'),false);
 // ...and it is still running.
 assert.equal(await h.settled(),false);
 for(let i=0;i<3;i++){const again=await publicPageResponse(r,h.render,h.options);assert.equal(again.headers.get('X-JWL-Cache'),'STALE');assert.equal(await again.text(),'real catalog 1');}
 assert.equal(h.renders(),2);assert.equal(h.waits(),waits+1);
 release();await h.flush();h.at(162000);
 const fresh=await publicPageResponse(r,h.render,h.options);assert.equal(fresh.headers.get('X-JWL-Cache'),'HIT');assert.equal(await fresh.text(),'real catalog 2');assert.equal(fresh.headers.get('Age'),'1');assert.equal(h.renders(),2);
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'161000');
});
test('the fresh window ends at exactly sixty seconds after the recorded store time',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/en/categories/watches/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 h.at(159999);assert.equal((await publicPageResponse(r,h.render,h.options)).headers.get('X-JWL-Cache'),'HIT');assert.equal(h.renders(),1);
 h.at(160000);const stale=await publicPageResponse(r,h.render,h.options);assert.equal(stale.headers.get('X-JWL-Cache'),'STALE');assert.equal(stale.headers.get('Age'),'60');assert.equal(h.renders(),2);await h.flush();
});
test('a new deployment never serves the previous release copy, fresh or stale',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/catalog/');
 await publicPageResponse(r,h.render,{...h.options,build:'release-a'});await h.flush();h.at(161000);
 const next=await publicPageResponse(r,h.render,{...h.options,build:'release-b'});assert.equal(next.headers.get('X-JWL-Cache'),'MISS');assert.equal(await next.text(),'real catalog 2');await h.flush();
});
test('failed background renders never replace, extend or remove the cached copy and release the page for a retry',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/catalog/?page=2');
 await publicPageResponse(r,h.render,h.options);await h.flush();h.at(161000);
 const broken=()=>html(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('<p>partial'));c.error(new Error('render failed'));}}));
 let attempts=0;
 for(const failure of [async()=>{throw new Error('catalog unavailable');},async()=>broken(),async()=>html('unavailable',{status:503}),async()=>html('error',{status:500})]){
  const response=await publicPageResponse(r,async()=>{attempts++;return failure();},h.options);
  assert.equal(response.headers.get('X-JWL-Cache'),'STALE');assert.equal(await response.text(),'real catalog 1');await h.flush();
  const entry=h.entry();assert.equal(entry.headers.get('X-JWL-Stored-At'),'100000');assert.equal(await entry.text(),'real catalog 1');
 }
 assert.equal(attempts,4);assert.deepEqual(unhandled,[]);
 assert.deepEqual(warnings.splice(0),['catalog unavailable','render failed','status 503','status 500'].map(reason=>`Background page refresh failed for /ar/catalog/: ${reason}`));
});
test('a cache write or delete that fails during a refresh keeps the copy and releases the page',async()=>{
 for(const [method,result] of [['put',null],['delete',html('missing',{status:404})]]){
  const h=harness(),r=new Request('https://jwleria.com/ar/brands/test-brand/');
  await publicPageResponse(r,h.render,h.options);await h.flush();h.at(161000);
  const working=h.options.cache[method];h.options.cache[method]=async()=>{throw new Error('cache unavailable');};
  const stale=await publicPageResponse(r,async()=>result??h.render(),h.options);assert.equal(stale.headers.get('X-JWL-Cache'),'STALE');await h.flush();
  assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'100000');
  h.options.cache[method]=working;
  const retry=await publicPageResponse(r,h.render,h.options);assert.equal(retry.headers.get('X-JWL-Cache'),'STALE');await h.flush();
  assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'161000');
 }
 assert.deepEqual(unhandled,[]);assert.equal(warnings.splice(0).length,2);
});
test('a withdrawn, redirected or personalized refresh stops the stale copy and is never cached',async()=>{
 for(const result of [new Response(null,{status:302,headers:{Location:'/404/'}}),html('missing',{status:404}),html('private',{headers:{'Cache-Control':'private'}}),html('cookie',{headers:{'Set-Cookie':'session=private'}})]){
  const h=harness(),r=new Request('https://jwleria.com/ar/products/test-piece/');
  await publicPageResponse(r,h.render,h.options);await h.flush();h.at(161000);
  const stale=await publicPageResponse(r,async()=>result,h.options);assert.equal(stale.headers.get('X-JWL-Cache'),'STALE');await h.flush();
  assert.equal(h.entries.size,0);
  const next=await publicPageResponse(r,h.render,h.options);assert.equal(next.headers.get('X-JWL-Cache'),'MISS');assert.equal(h.renders(),2);await h.flush();
 }
});
test('a page withdrawn right after its copy was stored can be served until 600 s after the store time even when its refresh succeeds',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/products/test-piece/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 // The piece is withdrawn at once; the next visitor to this colo arrives 599.999 s after the store time.
 h.at(699999);let refreshes=0,finish;const withdrawn=()=>{refreshes++;return new Promise(resolve=>{finish=()=>resolve(new Response(null,{status:302,headers:{Location:'/404/'}}));});};
 const first=await publicPageResponse(r,withdrawn,h.options);assert.equal(first.headers.get('X-JWL-Cache'),'STALE');assert.equal(first.headers.get('Age'),'599');assert.equal(await first.text(),'real catalog 1');
 // Every request that arrives while that refresh runs still receives the withdrawn copy.
 const during=await publicPageResponse(r,withdrawn,h.options);assert.equal(during.headers.get('X-JWL-Cache'),'STALE');assert.equal(await during.text(),'real catalog 1');assert.equal(refreshes,1);
 finish();await h.flush();assert.equal(h.entries.size,0);
 const after=await publicPageResponse(r,async()=>new Response(null,{status:302,headers:{Location:'/404/'}}),h.options);assert.equal(after.status,302);assert.equal(after.headers.has('X-JWL-Cache'),false);await h.flush();assert.equal(h.entries.size,0);
});
test('Astro\'s error render of a failed request never serves, refreshes or removes the page copy',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/catalog/');
 await publicPageResponse(r,h.render,h.options);await h.flush();h.at(161000);
 // Main pass: the cache lookup fails, so the page renders in the foreground and throws (an upstream outage).
 const locals={},working=h.options.cache.match;h.options.cache.match=async()=>{throw new Error('cache unavailable');};
 await assert.rejects(publicPageResponse(r,async()=>{throw new Error('catalog unavailable');},{...h.options,scope:locals}),/catalog unavailable/);
 h.options.cache.match=working;
 // Astro then renders its error route through the middleware again with the same Request and locals.
 let errorRenders=0;const errorRoute=async()=>{errorRenders++;return new Response('Not found',{status:404});};
 const waits=h.waits(),error=await publicPageResponse(r,errorRoute,{...h.options,scope:locals});
 assert.equal(error.status,404);assert.equal(error.headers.has('X-JWL-Cache'),false);assert.equal(errorRenders,1);assert.equal(h.waits(),waits);await h.flush();
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'100000');assert.equal(await h.entry().text(),'real catalog 1');
 // The next visitor request has its own locals and is served from the untouched copy.
 const next=await publicPageResponse(r,h.render,{...h.options,scope:{}});assert.equal(next.headers.get('X-JWL-Cache'),'STALE');assert.equal(await next.text(),'real catalog 1');await h.flush();
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'161000');
});
test('beyond the ten-minute window the old copy is never served',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/en/brands/test-brand/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 h.at(699999);const last=await publicPageResponse(r,h.render,h.options);assert.equal(last.headers.get('X-JWL-Cache'),'STALE');await h.flush();
 h.entries.set([...h.entries.keys()][0],html('real catalog 1',{headers:{'Cache-Control':'public, max-age=600','X-JWL-Stored-At':'100000'}}));
 h.at(700000);const expired=await publicPageResponse(r,h.render,h.options);assert.equal(expired.headers.get('X-JWL-Cache'),'MISS');assert.equal(await expired.text(),'real catalog 3');await h.flush();
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'700000');
});
test('without waitUntil a stale copy is never served because nothing could finish its refresh',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/ar/categories/watches/'),{waitUntil,...options}=h.options;
 await publicPageResponse(r,h.render,options);
 h.at(161000);
 const response=await publicPageResponse(r,h.render,options);assert.equal(response.headers.get('X-JWL-Cache'),'MISS');assert.equal(await response.text(),'real catalog 2');
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'161000');
});
test('background renders are bounded per isolate and a full table serves the copy without another render',async()=>{
 const h=harness(),pages=Array.from({length:17},(_,i)=>new Request(`https://jwleria.com/ar/catalog/?page=${i+1}`));
 for(const r of pages){await publicPageResponse(r,h.render,h.options);}await h.flush();
 h.at(161000);const release=h.hold();
 for(const r of pages){const response=await publicPageResponse(r,h.render,h.options);assert.equal(response.headers.get('X-JWL-Cache'),'STALE');}
 assert.equal(h.renders(),17+16);
 release();await h.flush();
 const retry=await publicPageResponse(pages[16],h.render,h.options);assert.equal(retry.headers.get('X-JWL-Cache'),'STALE');assert.equal(h.renders(),34);await h.flush();
 assert.equal((await publicPageResponse(pages[16],h.render,h.options)).headers.get('X-JWL-Cache'),'HIT');
});
test('a refresh cut off with its waitUntil never settles, yet frees its page and its table slot after thirty seconds',async()=>{
 const h=harness(),pages=Array.from({length:17},(_,i)=>new Request(`https://jwleria.com/en/catalog/?page=${i+1}`));
 for(const r of pages){await publicPageResponse(r,h.render,h.options);}await h.flush();
 h.at(161000);let cut=0;const lost={...h.options,waitUntil:()=>{}},never=()=>{cut++;return new Promise(()=>{});};
 for(const r of pages.slice(0,16)){assert.equal((await publicPageResponse(r,never,lost)).headers.get('X-JWL-Cache'),'STALE');}
 assert.equal(cut,16);
 h.at(190999);
 for(const r of [pages[0],pages[16]]){assert.equal((await publicPageResponse(r,h.render,h.options)).headers.get('X-JWL-Cache'),'STALE');}
 assert.equal(h.renders(),17);
 h.at(191000);
 for(const r of [pages[0],pages[16]]){assert.equal((await publicPageResponse(r,h.render,h.options)).headers.get('X-JWL-Cache'),'STALE');}
 assert.equal(h.renders(),19);await h.flush();
 assert.equal((await publicPageResponse(pages[0],h.render,h.options)).headers.get('X-JWL-Cache'),'HIT');
 // The remaining cut-off entries are dropped by the next refresh of any page, so no later test inherits them.
 assert.equal((await publicPageResponse(pages[1],h.render,h.options)).headers.get('X-JWL-Cache'),'STALE');await h.flush();assert.equal(h.renders(),20);
});
test('a dropped refresh that settles late never frees the page from the refresh that replaced it',async()=>{
 const h=harness(),r=new Request('https://jwleria.com/en/categories/rings/');
 await publicPageResponse(r,h.render,h.options);await h.flush();
 h.at(161000);let late;
 await publicPageResponse(r,()=>new Promise(resolve=>{late=()=>resolve(html('unavailable',{status:503}));}),h.options);
 h.at(191000);const release=h.hold();
 assert.equal((await publicPageResponse(r,h.render,h.options)).headers.get('X-JWL-Cache'),'STALE');assert.equal(h.renders(),2);
 late();await new Promise(resolve=>setImmediate(resolve));
 assert.equal((await publicPageResponse(r,h.render,h.options)).headers.get('X-JWL-Cache'),'STALE');assert.equal(h.renders(),2);
 release();await h.flush();
 assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'191000');
 assert.deepEqual(warnings.splice(0),['Background page refresh failed for /en/categories/rings/: status 503']);
});
test('authenticated requests, search, APIs, writes and unexpected query variants always stay uncached',async()=>{
 const h=harness();
 const requests=[new Request('https://jwleria.com/ar/catalog/',{headers:{Cookie:'session=private'}}),new Request('https://jwleria.com/ar/catalog/',{headers:{Authorization:'Bearer private'}}),new Request('https://jwleria.com/ar/catalog/?q=private-search'),new Request('https://jwleria.com/api/catalog.json'),new Request('https://jwleria.com/ar/catalog/',{method:'POST'}),new Request('https://jwleria.com/ar/?font=amiri'),new Request('https://jwleria.com/ar/catalog/?page=1&page=2'),new Request('https://jwleria.com/ar/catalog/?brand=Bad_Slug'),new Request('https://jwleria.com/ar/font-preview/')];
 for(const r of requests){await publicPageResponse(r,h.render,h.options);await h.flush();await publicPageResponse(r,h.render,h.options);}
 assert.equal(h.renders(),requests.length*2);assert.equal(h.entries.size,0);
});
test('a stale copy is never served to a request that could not have been cached',async()=>{
 const h=harness();
 await publicPageResponse(new Request('https://jwleria.com/ar/catalog/'),h.render,h.options);await h.flush();h.at(161000);
 for(const headers of [{Cookie:'session=private'},{Authorization:'Bearer private'}]){
  const response=await publicPageResponse(new Request('https://jwleria.com/ar/catalog/',{headers}),h.render,h.options);assert.equal(response.headers.has('X-JWL-Cache'),false);
 }
 await h.flush();assert.equal(h.renders(),3);assert.equal(h.entry().headers.get('X-JWL-Stored-At'),'100000');
});
test('personalized responses, application errors and no-store responses cannot enter the public cache',async()=>{
 for(const params of [{status:503},{status:404},{headers:{'Set-Cookie':'session=private'}},{headers:{'Cache-Control':'private'}},{headers:{'Cache-Control':'no-store'}},{headers:{'Cache-Control':'no-cache'}},{headers:{Vary:'*'}},{headers:{Vary:'Accept-Language'}},{headers:{'Content-Type':'application/json'}}]){
  const h=harness();let renders=0;const next=async()=>{renders++;return new Response('uncached',{...params,headers:{'Content-Type':'text/html',...params.headers}});};
  await publicPageResponse(new Request('https://jwleria.com/ar/'),next,h.options);await h.flush();await publicPageResponse(new Request('https://jwleria.com/ar/'),next,h.options);assert.equal(renders,2);assert.equal(h.entries.size,0);
 }
});
test('cache outages do not break the working origin response',async()=>{
 const response=await publicPageResponse(new Request('https://jwleria.com/ar/'),async()=>new Response('available'),{build:'test-release',cache:{async match(){throw new Error('cache unavailable');}},now:()=>100000});assert.equal(await response.text(),'available');
});
test('no background refresh left an unhandled rejection behind',async()=>{
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(unhandled,[]);assert.deepEqual(warnings,[]);
});
