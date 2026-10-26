import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {runSources,runOrigin,sourceGate,recordedSourceStops,sourceAdapters} from './source-queue.mjs';
import {createIncrementalSink,assessCandidate} from './incremental.mjs';
import {ingestMissing} from './supabase.mjs';
import {normalizeBatch} from './normalize.mjs';

const allow='User-agent: *\nAllow: /\n';
const ld=(sku,name,image)=>'<html><title>'+name+'</title><script type="application/ld+json">'+JSON.stringify({'@type':'Product',sku,name,image,material:'Oystersteel',size:{value:41,unitText:'mm'}})+'</script></html>';
const html=body=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}});
const xml=urls=>new Response('<urlset>'+urls.map(u=>'<url><loc>'+u+'</loc></url>').join('')+'</urlset>',{headers:{'content-type':'application/xml'}});
const rolex=['https://www.rolex.com/en-us/watches/submariner/m126610ln-0001','https://www.rolex.com/en-us/watches/datejust/m126334-0001','https://www.rolex.com/en-us/watches/explorer/m224270-0001'];
const iwc=['https://www.iwc.com/en/watches/portugieser/iw371605-portugieser-chronograph','https://www.iwc.com/en/watches/pilot/iw328201-pilot-watch'];
const piaget=['https://www.piaget.com/us-en/watches/polo/polo-watch-g0a41002'];
const productPage=url=>{const ref=url.match(/(m[a-z0-9]+-\d+|iw\d+|g[a-z0-9]+)(?:-[^/]*)?$/i)[1];return ld(ref,'Synthetic '+ref,'https://media.example.test/'+ref+'.png');};
// Stands in for the database registry (jwl_source_registry); restricted sources stay closed in code regardless.
const registry=Object.fromEntries(Object.entries(sourceAdapters).map(([id,a])=>[id,{origin:a.origin,enabled:true,acquisition_allowed:true,min_interval_seconds:2}]));
const source=(source_id,extra={})=>({source_id,enabled:true,acquisition_allowed:true,permission_reference:'synthetic reviewed test permission',min_interval_seconds:2,...extra});
function harness(routes){
  let t=1_000_000;const calls=[],sleeps=[];
  const fetcher=async url=>{calls.push({url,at:t});const route=routes(url,calls.filter(c=>c.url===url).length);if(!route)throw Error('unexpected request '+url);return route();};
  return {calls,sleeps,fetcher,now:()=>t,sleep:async ms=>{sleeps.push(ms);t+=ms;},advance:ms=>{t+=ms;}};
}
const privateDir=()=>mkdtemp(join(tmpdir(),'jwl-queue-'));
// Virtual time advances only to the earliest pending timer, so one origin's waits never pad another's gaps.
function scheduledHarness(routes){
  let t=1_000_000,armed=false;const timers=[],calls=[];
  const fire=()=>{armed=false;if(!timers.length)return;timers.sort((a,b)=>a.at-b.at);const next=timers.shift();t=Math.max(t,next.at);next.resolve();arm();};
  const arm=()=>{if(!armed&&timers.length){armed=true;setTimeout(fire,0);}};
  return {calls,now:()=>t,sleep:ms=>new Promise(resolve=>{timers.push({at:t+ms,resolve});arm();}),
    fetcher:async url=>{calls.push({url,at:t});const route=routes(url,calls.filter(c=>c.url===url).length);if(!route)throw Error('unexpected request '+url);return route();}};
}

test('independent origins run concurrently with their own pacing; one refusal or rate limit never stops the others',async()=>{
  const root=await privateDir();
  const h=scheduledHarness(url=>{
    if(url.endsWith('/robots.txt'))return()=>new Response(allow);
    if(url.endsWith('/sitemap.xml'))return()=>xml(url.includes('rolex')?rolex:url.includes('iwc')?iwc:piaget);
    if(url===rolex[1])return()=>new Response('denied',{status:403});
    if(url.includes('piaget')&&url!=='https://www.piaget.com/robots.txt')return()=>new Response('slow down',{status:429,headers:{'retry-after':'7200'}});
    return()=>html(productPage(url));
  });
  const received=[];
  const result=await runSources({output_root:root,sources:[
    source('rolex-official',{sitemap_urls:['https://www.rolex.com/sitemap.xml']}),
    source('iwc-schaffhausen-official',{sitemap_urls:['https://www.iwc.com/sitemap.xml'],min_interval_seconds:5}),
    source('piaget-official',{sitemap_urls:['https://www.piaget.com/sitemap.xml']}),
    source('cartier-official',{sitemap_urls:['https://www.cartier.com/sitemap.xml']}),
  ]},{registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord:async(row,meta)=>{received.push(meta.source_id+':'+row.external_id);}});
  const by=Object.fromEntries(result.origins.map(r=>[r.source_id,r]));
  assert.equal(by['rolex-official'].status,'blocked');assert.equal(by['rolex-official'].blocked,'source_refused_access');
  assert.equal(by['iwc-schaffhausen-official'].status,'completed');assert.equal(by['iwc-schaffhausen-official'].candidates,2);
  assert.equal(by['piaget-official'].status,'rate_limited');
  // Retry-After is honored from the response time (the shared virtual clock moves with other origins).
  const limitedAt=h.calls.find(c=>c.url.includes('piaget')&&c.url.endsWith('sitemap.xml')).at,notBefore=Date.parse(by['piaget-official'].not_before);
  assert(notBefore>=limitedAt+7_200_000&&notBefore<=limitedAt+7_200_000+60_000,'not-before follows Retry-After');
  assert.deepEqual(by['cartier-official'],{source_id:'cartier-official',status:'skipped',reason:'acquisition_permission_restricted',requests:0});
  assert(!h.calls.some(c=>c.url.includes('cartier')),'restricted source must not be contacted');
  assert(!h.calls.some(c=>c.url===rolex[2]),'refused origin stops before later products');
  assert.deepEqual(received.sort(),['iwc-schaffhausen-official:iw328201','iwc-schaffhausen-official:iw371605','rolex-official:m126610ln-0001'].sort());
  // Each origin keeps its own minimum spacing; origins interleave instead of waiting for each other.
  for(const [host,gap] of [['rolex',2000],['iwc',5000],['piaget',2000]]){
    const times=h.calls.filter(c=>c.url.includes(host)).map(c=>c.at);
    for(let i=1;i<times.length;i++)assert(times[i]-times[i-1]>=gap,`${host} request spacing ${times[i]-times[i-1]} < ${gap}`);
  }
  const order=h.calls.map(c=>new URL(c.url).hostname);
  assert(order.indexOf('www.iwc.com')<order.lastIndexOf('www.rolex.com'),'IWC started before Rolex finished');
  assert.equal(result.published,0);assert.equal(result.image_downloads,0);
  assert(!h.calls.some(c=>c.url.includes('media.example.test')),'no image bytes are fetched');
  await rm(root,{recursive:true});
});

test('transient failures back off and retry within bounds, persist for the next run, then fail explicitly',async()=>{
  const root=await privateDir();
  const flaky=iwc[0],dead=iwc[1];
  const h=harness((url,count)=>{
    if(url.endsWith('/robots.txt'))return()=>new Response(allow);
    if(url===flaky&&count<=2)return()=>new Response('busy',{status:503});
    if(url===dead)return()=>new Response('busy',{status:502});
    return()=>html(productPage(url));
  });
  const config=source('iwc-schaffhausen-official',{inventory_urls:iwc,max_attempts:3,max_total_attempts:6,backoff_base_seconds:10,unhealthy_stop_after:20});
  const first=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(first.status,'incomplete_retry_pending');assert.deepEqual(first.url_states,{acquired:1,pending_retry:1});assert.equal(first.retried,4);
  // Backoff is exponential and never shorter than the origin interval.
  assert(h.sleeps.some(ms=>ms>=10_000)&&h.sleeps.some(ms=>ms>=20_000),'exponential backoff waits');
  const second=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.deepEqual(second.url_states,{acquired:1,failed:1});
  const state=JSON.parse(await readFile(join(root,'iwc-schaffhausen-official','state.json'),'utf8'));
  assert.deepEqual({status:state.urls[dead].status,reason:state.urls[dead].reason,attempts:state.urls[dead].attempts},{status:'failed',reason:'transient_exhausted',attempts:6});
  assert.equal(h.calls.filter(c=>c.url===flaky).length,3,'the acquired page is not requested again');
  await rm(root,{recursive:true});
});

test('consecutive transient failures pause an unhealthy origin instead of hammering it',async()=>{
  const root=await privateDir();
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>{throw new TypeError('fetch failed');});
  const config=source('rolex-official',{inventory_urls:rolex,max_attempts:3,unhealthy_stop_after:4,unhealthy_defer_seconds:600});
  const result=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(result.status,'paused');assert.equal(result.reason,'origin_unhealthy');
  assert.equal(h.calls.filter(c=>!c.url.endsWith('robots.txt')).length,4);
  const count=h.calls.length;
  const cooling=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.deepEqual([cooling.status,cooling.reason,h.calls.length],['deferred','origin_unhealthy',count],'no request during the cool-down');
  await rm(root,{recursive:true});
});

test('resumable bounded runs skip finished pages, deduplicate identities and only journal changed revisions',async()=>{
  const root=await privateDir();
  const alias='https://www.rolex.com/en-gb/watches/submariner/m126610ln-0001';
  let revision='Oystersteel';
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>html(productPage(url).replace('Oystersteel',revision)));
  const records=[];const onRecord=async row=>{records.push(row.external_id);};
  const config=source('rolex-official',{inventory_urls:[rolex[0],alias,rolex[2]],max_products:1});
  assert.equal((await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord})).status,'bounded_pause');
  const rest=await runOrigin({...config,max_products:10},{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord});
  assert.equal(rest.status,'completed');assert.deepEqual(rest.url_states,{acquired:2,duplicate:1});assert.equal(rest.inventory_complete,true);
  assert.equal(h.calls.filter(c=>c.url===rolex[0]).length,1,'finished page is not requested again');
  assert.deepEqual(records,['m126610ln-0001','m224270-0001']);
  const state=JSON.parse(await readFile(join(root,'rolex-official','state.json'),'utf8'));
  assert.deepEqual(state.urls[alias].duplicate_of,[rolex[0]]);
  const journal=(await readFile(join(root,'rolex-official','candidates.ndjson'),'utf8')).trim().split('\n');
  assert.equal(journal.length,2);assert.equal(rest.worldwide_brand_complete,false);
  await rm(root,{recursive:true});
});

test('robots refusals, unreviewed redirects and challenges stay explicit; a block needs a review token to resume',async()=>{
  const root=await privateDir();
  const robots='User-agent: *\nDisallow: /en-us/watches/datejust/\n';
  let challenge=true;
  const h=harness(url=>{
    if(url.endsWith('/robots.txt'))return()=>new Response(robots);
    if(url===rolex[0])return()=>new Response(null,{status:302,headers:{location:'https://www.rolex.com/login'}});
    if(url===rolex[2]&&challenge)return()=>html('<title>Just a moment...</title>');
    return()=>html(productPage(url));
  });
  const config=source('rolex-official',{inventory_urls:rolex});
  const blocked=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(blocked.status,'blocked');assert.equal(blocked.reason,'source_challenge');
  assert(!h.calls.some(c=>c.url===rolex[1]),'robots-refused page is never requested');
  assert(!h.calls.some(c=>c.url==='https://www.rolex.com/login'),'redirect is not followed');
  const state=JSON.parse(await readFile(join(root,'rolex-official','state.json'),'utf8'));
  assert.equal(state.urls[rolex[0]].reason,'redirect_requires_review');assert.equal(state.urls[rolex[1]].reason,'robots_refused');
  const before=h.calls.length;
  const again=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(again.status,'blocked');assert.equal(again.detail,'source_review_required');assert.equal(h.calls.length,before);
  challenge=false;
  // A hand-edited state without its review token fails closed instead of resuming.
  const edited={...state,blocked:{reason:'source_challenge'}};
  await writeFile(join(root,'rolex-official','state.json'),JSON.stringify(edited));
  assert.equal((await runOrigin({...config,resume_after_review:undefined},{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now})).status,'blocked');
  await writeFile(join(root,'rolex-official','state.json'),JSON.stringify(state));
  const resumed=await runOrigin({...config,resume_after_review:state.blocked.review_token},{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(resumed.status,'completed');assert.deepEqual(resumed.url_states,{failed:2,acquired:1});assert.equal(resumed.inventory_complete,false);
  await rm(root,{recursive:true});
});

test('repeated redirects block the origin for review',async()=>{
  const root=await privateDir();
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>new Response(null,{status:301,headers:{location:'https://www.rolex.com/'}}));
  const result=await runOrigin(source('rolex-official',{inventory_urls:rolex,redirect_stop_after:3}),{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(result.status,'blocked');assert.equal(result.reason,'repeated_redirects_require_review');
  await rm(root,{recursive:true});
});

test('a rate-limited origin is deferred without any request until its not-before time',async()=>{
  const root=await privateDir();
  let limited=true;
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):limited?()=>new Response('',{status:429,headers:{'retry-after':'60'}}):()=>html(productPage(url)));
  const config=source('rolex-official',{inventory_urls:rolex,rate_limit_min_seconds:900});
  assert.equal((await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now})).status,'rate_limited');
  const count=h.calls.length;limited=false;
  const deferred=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(deferred.status,'deferred');assert.equal(h.calls.length,count);
  h.advance(901_000);
  assert.equal((await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now})).status,'completed');
  await rm(root,{recursive:true});
});

test('gates: registry narrows local config, restricted and unsupported sources never run, origins are unique, state stays private',async()=>{
  assert.equal(sourceGate(source('rolex-official')).reason,'source_registry_required','no database registry fails closed');
  assert.equal(sourceGate(source('rolex-official'),{'rolex-official':{origin:'https://www.rolex.com',enabled:true,acquisition_allowed:false}}).reason,'registry_acquisition_not_allowed');
  assert.equal(sourceGate(source('rolex-official'),{'rolex-official':{origin:'https://www.rolex.com',enabled:true,acquisition_allowed:true,min_interval_seconds:60}}).interval_seconds,60);
  assert.equal(sourceGate(source('rolex-official',{permission_reference:' '})).reason,'reviewed_acquisition_authorization_missing');
  assert.equal(sourceGate(source('longchamp-official'),registry).reason,'reviewed_inventory_required');
  assert.equal(sourceGate(source('unknown-official')).reason,'unsupported_source_adapter');
  for(const id of Object.keys(recordedSourceStops))assert.equal(sourceGate(source(id,{sitemap_urls:['https://example.test/x.xml']}),registry).allowed,false);
  const root=await privateDir();
  await assert.rejects(runSources({output_root:root,sources:[source('rolex-official')],registry},{fetcher:async()=>{throw Error('no request');}}),/fresh database source registry/,'a registry inside the local config is ignored');
  await assert.rejects(runSources({output_root:root,sources:[source('rolex-official'),source('rolex-official')]},{registry,fetcher:async()=>{throw Error('no request');}}),/exactly one queue/);
  const repoPath=join(fileURLToPath(new URL('../..',import.meta.url)),'private-queue-output');
  await assert.rejects(runSources({output_root:repoPath,sources:[]},{registry}),/inside the tracked repository/);
  await rm(root,{recursive:true});
});

const candidate=(overrides={})=>normalizeBatch([{source_id:'rolex-official',external_id:'m126610ln-0001',source_url:'https://www.rolex.com/en-us/watches/submariner/m126610ln-0001',brand:'Rolex',collection:'submariner',product_name:'Submariner Date',name_ar:'ساعة سابمارينر ديت',translation_state:'provided',image_urls:['https://media.example.test/m126610ln-0001.png'],facts:[{key:'diameter',value:'41 mm'}],...overrides}])[0];

test('incremental sink ingests only missing records, holds changed revisions for review and processes each record as it arrives',async()=>{
  const dir=await privateDir();
  const existing=candidate();const changed=candidate({facts:[{key:'diameter',value:'40 mm'}]});
  const fresh={...candidate({external_id:'m126334-0001',source_url:'https://www.rolex.com/en-us/watches/datejust/m126334-0001'}),category_slug:'watches'};
  const outside={...candidate({external_id:'FRAG-1',source_url:'https://www.rolex.com/en-us/watches/x/m1-1'}),category_slug:'fragrances'};
  const batches=[];
  const sink=await createIncrementalSink({output_directory:dir,known:{[existing.candidate_id]:existing.revision_hash},batch_size:2,
    ingest:async batch=>{batches.push(batch.map(r=>r.external_id));return {inserted_ids:batch.map(r=>r.candidate_id),skipped_existing_ids:[]};}});
  await sink.onRecord({...existing,category_slug:'watches'});
  await sink.onRecord({...changed,category_slug:'watches'});
  await sink.onRecord(fresh);
  await sink.onRecord(fresh);
  await sink.onRecord(outside);
  assert.deepEqual(batches,[['m126334-0001','FRAG-1']],'a full batch is ingested before the run ends');
  const summary=await sink.close();
  assert.deepEqual(summary.ingest,{unchanged:1,changed_requires_review:1,missing:2});
  assert.equal(summary.replayed,1);assert.equal(summary.inserted,2);assert.equal(summary.reasons.category_outside_approved_set,1);
  const review=(await readFile(join(dir,'review-required.ndjson'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(review.length,1);assert.equal(review[0].known_revision,existing.revision_hash);
  await rm(dir,{recursive:true});
});

test('incremental sink refuses ingestion without a fresh baseline and rejects an unaccounted receipt',async()=>{
  const dir=await privateDir();
  await assert.rejects(createIncrementalSink({output_directory:dir,ingest:async()=>({})}),/known-revision export/);
  const noBaseline=await createIncrementalSink({output_directory:dir});
  await noBaseline.onRecord(candidate());
  assert.deepEqual((await noBaseline.close()).ingest,{baseline_unknown:1});
  const sink=await createIncrementalSink({output_directory:dir,known:{},batch_size:1,ingest:async()=>({inserted_ids:[],skipped_existing_ids:[]})});
  await sink.onRecord(candidate());
  const unaccounted=await sink.close();
  assert.deepEqual([unaccounted.ingest_errors,unaccounted.pending_ingestion,unaccounted.last_ingest_error],[2,1,'Ingestion receipt does not account for the exact batch']);
  assert.deepEqual(assessCandidate({...candidate(),translation_state:'name_pending',name_ar:null},new Map()).reasons,['arabic_name_pending','category_requires_review']);
  await rm(dir,{recursive:true});
});

test('missing-only client calls only the guarded RPC and refuses records that drift during normalization',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init.body)});const ids=JSON.parse(init.body).records.map(r=>r.candidate_id);return new Response(JSON.stringify({received:ids.length,inserted_ids:ids.slice(1),skipped_existing_ids:ids.slice(0,1),published:0}));};
  const config={url:'https://example.supabase.co',key:'synthetic-test-key'};
  const rows=[candidate(),candidate({external_id:'m126334-0001'})];
  const result=await ingestMissing(rows,config,fetcher);
  assert.equal(calls[0].url,'https://example.supabase.co/rest/v1/rpc/jwl_ingest_missing_batch');
  assert.deepEqual(result,{inserted_ids:[rows[1].candidate_id],skipped_existing_ids:[rows[0].candidate_id]});
  await assert.rejects(ingestMissing([{...rows[0],revision_hash:'0'.repeat(64)}],config,fetcher),/changed during normalization/);
});

test('a failed ingestion batch stays in the durable outbox and is replayed by the next run',async()=>{
  const dir=await privateDir();
  const a=candidate(),b=candidate({external_id:'m126334-0001',source_url:'https://www.rolex.com/en-us/watches/datejust/m126334-0001'});
  let up=false;const received=[];
  const ingest=async batch=>{if(!up)throw Error('database unavailable');received.push(...batch.map(r=>r.external_id));return {inserted_ids:batch.map(r=>r.candidate_id),skipped_existing_ids:[]};};
  const first=await createIncrementalSink({output_directory:dir,known:{},batch_size:1,ingest});
  await first.onRecord(a);await first.onRecord(b);
  const failed=await first.close();
  assert.deepEqual([failed.ingest_errors,failed.pending_ingestion,failed.inserted],[2,2,0],'errors never reach the queue; nothing is acknowledged');
  up=true;
  const second=await createIncrementalSink({output_directory:dir,known:{},batch_size:1,ingest});
  const replayed=await second.close();
  assert.deepEqual([replayed.outbox_replayed,replayed.inserted,replayed.pending_ingestion],[2,2,0]);
  assert.deepEqual(received.sort(),['m126334-0001','m126610ln-0001']);
  const third=await createIncrementalSink({output_directory:dir,known:{},batch_size:1,ingest});
  assert.equal((await third.close()).outbox_replayed,0,'acknowledged records are never re-sent');
  await rm(dir,{recursive:true});
});

test('a challenge or Retry-After on a 5xx response stops the origin instead of being retried',async()=>{
  for(const [response,status,reason] of [
    [()=>new Response('<title>Just a moment...</title>',{status:503}),'blocked','source_challenge'],
    [()=>new Response('busy',{status:503,headers:{'retry-after':'3600'}}),'rate_limited','source_rate_limited'],
  ]){
    const root=await privateDir();
    const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):response);
    const result=await runOrigin(source('rolex-official',{inventory_urls:rolex}),{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
    assert.deepEqual([result.status,result.reason],[status,reason]);
    assert.equal(h.calls.filter(c=>!c.url.endsWith('robots.txt')).length,1,'exactly one product request');
    await rm(root,{recursive:true});
  }
});

test('pacing survives runs, applies robots crawl-delay immediately and ignores invalid numeric config',async()=>{
  const root=await privateDir();
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response('User-agent: *\nCrawl-delay: 30\nAllow: /\n'):()=>html(productPage(url)));
  const config=source('rolex-official',{inventory_urls:rolex,max_products:1,backoff_base_seconds:'5s',max_attempts:'many',unhealthy_stop_after:'x'});
  await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  const times=h.calls.map(c=>c.at);
  assert.equal(h.calls.length,4,'robots and one product per bounded run');
  assert(times[1]-times[0]>=30_000,'crawl-delay applies to the first product request');
  assert(times[2]-times[1]>=2_000,'a new run waits for the previous run\'s last request');
  assert(times[3]-times[2]>=30_000);
  await rm(root,{recursive:true});
});

test('an unhealthy pause still counts the URL attempts; body read errors are transient, not origin failures',async()=>{
  const root=await privateDir();
  const h=harness((url,count)=>{
    if(url.endsWith('/robots.txt'))return()=>new Response(allow);
    if(url===rolex[0])return()=>new Response('err',{status:500});
    if(url===rolex[1]&&count===1)return()=>new Response(new ReadableStream({start(c){c.error(new Error('connection reset'));}}),{headers:{'content-type':'text/html'}});
    return()=>html(productPage(url));
  });
  const config=source('rolex-official',{inventory_urls:rolex,max_attempts:3,max_total_attempts:4,unhealthy_stop_after:2,unhealthy_defer_seconds:60,backoff_base_seconds:2});
  const first=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.deepEqual([first.status,first.url_states],['paused',{pending_retry:1}]);
  h.advance(61_000);
  const second=await runOrigin(config,{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  const state=JSON.parse(await readFile(join(root,'rolex-official','state.json'),'utf8'));
  assert.deepEqual([state.urls[rolex[0]].status,state.urls[rolex[0]].attempts],['failed',4],'the failing URL reaches its total attempt bound');
  assert.equal(second.status,'paused','the second run also cools down after the same unhealthy page');
  h.advance(61_000);
  const third=await runOrigin({...config,max_attempts:1},{root,registry,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.notEqual(third.status,'failed');
  assert.equal(JSON.parse(await readFile(join(root,'rolex-official','state.json'),'utf8')).urls[rolex[1]].reason,'body_read_error');
  await rm(root,{recursive:true});
});

test('a record the queue re-emits after a crash is not ingested twice and cannot stall the outbox',async()=>{
  const dir=await privateDir();
  const a=candidate();let calls=0;
  const failing=await createIncrementalSink({output_directory:dir,known:{},batch_size:2,ingest:async()=>{throw Error('down');}});
  await failing.onRecord(a);await failing.close();
  const ingest=async batch=>{calls++;return ingestMissing(batch,{url:'https://example.supabase.co',key:'synthetic-test-key'},async(url,init)=>{const ids=JSON.parse(init.body).records.map(r=>r.candidate_id);return new Response(JSON.stringify({inserted_ids:ids,skipped_existing_ids:[]}));});};
  const next=await createIncrementalSink({output_directory:dir,known:{},batch_size:2,ingest});
  await next.onRecord(a);
  const summary=await next.close();
  assert.deepEqual([summary.outbox_replayed,summary.replayed,summary.inserted,summary.pending_ingestion,summary.ingest_errors],[1,1,1,0,0]);
  assert.equal(calls,1);
  await rm(dir,{recursive:true});
});
