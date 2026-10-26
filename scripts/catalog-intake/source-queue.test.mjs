import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {runSources,runOrigin,sourceGate,recordedSourceStops} from './source-queue.mjs';
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
const source=(source_id,extra={})=>({source_id,enabled:true,acquisition_allowed:true,permission_reference:'synthetic reviewed test permission',min_interval_seconds:2,...extra});
function harness(routes){
  let t=1_000_000;const calls=[],sleeps=[];
  const fetcher=async url=>{calls.push({url,at:t});const route=routes(url,calls.filter(c=>c.url===url).length);if(!route)throw Error('unexpected request '+url);return route();};
  return {calls,sleeps,fetcher,now:()=>t,sleep:async ms=>{sleeps.push(ms);t+=ms;},advance:ms=>{t+=ms;}};
}
const privateDir=()=>mkdtemp(join(tmpdir(),'jwl-queue-'));

test('independent origins run concurrently with their own pacing; one refusal or rate limit never stops the others',async()=>{
  const root=await privateDir();
  const h=harness(url=>{
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
  ]},{fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord:async(row,meta)=>{received.push(meta.source_id+':'+row.external_id);}});
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
  const first=await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(first.status,'incomplete_retry_pending');assert.deepEqual(first.url_states,{acquired:1,pending_retry:1});assert.equal(first.retried,4);
  // Backoff is exponential and never shorter than the origin interval.
  assert(h.sleeps.some(ms=>ms>=10_000)&&h.sleeps.some(ms=>ms>=20_000),'exponential backoff waits');
  const second=await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.deepEqual(second.url_states,{acquired:1,failed:1});
  const state=JSON.parse(await readFile(join(root,'iwc-schaffhausen-official','state.json'),'utf8'));
  assert.deepEqual({status:state.urls[dead].status,reason:state.urls[dead].reason,attempts:state.urls[dead].attempts},{status:'failed',reason:'transient_exhausted',attempts:6});
  assert.equal(h.calls.filter(c=>c.url===flaky).length,3,'the acquired page is not requested again');
  await rm(root,{recursive:true});
});

test('consecutive transient failures pause an unhealthy origin instead of hammering it',async()=>{
  const root=await privateDir();
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>{throw new TypeError('fetch failed');});
  const result=await runOrigin(source('rolex-official',{inventory_urls:rolex,max_attempts:3,unhealthy_stop_after:4}),{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(result.status,'paused');assert.equal(result.reason,'origin_unhealthy');
  assert.equal(h.calls.filter(c=>!c.url.endsWith('robots.txt')).length,4);
  await rm(root,{recursive:true});
});

test('resumable bounded runs skip finished pages, deduplicate identities and only journal changed revisions',async()=>{
  const root=await privateDir();
  const alias='https://www.rolex.com/en-gb/watches/submariner/m126610ln-0001';
  let revision='Oystersteel';
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>html(productPage(url).replace('Oystersteel',revision)));
  const records=[];const onRecord=async row=>{records.push(row.external_id);};
  const config=source('rolex-official',{inventory_urls:[rolex[0],alias,rolex[2]],max_products:1});
  assert.equal((await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord})).status,'bounded_pause');
  const rest=await runOrigin({...config,max_products:10},{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now,onRecord});
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
  const blocked=await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(blocked.status,'blocked');assert.equal(blocked.reason,'source_challenge');
  assert(!h.calls.some(c=>c.url===rolex[1]),'robots-refused page is never requested');
  assert(!h.calls.some(c=>c.url==='https://www.rolex.com/login'),'redirect is not followed');
  const state=JSON.parse(await readFile(join(root,'rolex-official','state.json'),'utf8'));
  assert.equal(state.urls[rolex[0]].reason,'redirect_requires_review');assert.equal(state.urls[rolex[1]].reason,'robots_refused');
  const before=h.calls.length;
  const again=await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(again.status,'blocked');assert.equal(again.detail,'source_review_required');assert.equal(h.calls.length,before);
  challenge=false;
  const resumed=await runOrigin({...config,resume_after_review:state.blocked.review_token},{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(resumed.status,'completed');assert.deepEqual(resumed.url_states,{failed:2,acquired:1});assert.equal(resumed.inventory_complete,false);
  await rm(root,{recursive:true});
});

test('repeated redirects block the origin for review',async()=>{
  const root=await privateDir();
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):()=>new Response(null,{status:301,headers:{location:'https://www.rolex.com/'}}));
  const result=await runOrigin(source('rolex-official',{inventory_urls:rolex,redirect_stop_after:3}),{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(result.status,'blocked');assert.equal(result.reason,'repeated_redirects_require_review');
  await rm(root,{recursive:true});
});

test('a rate-limited origin is deferred without any request until its not-before time',async()=>{
  const root=await privateDir();
  let limited=true;
  const h=harness(url=>url.endsWith('/robots.txt')?()=>new Response(allow):limited?()=>new Response('',{status:429,headers:{'retry-after':'60'}}):()=>html(productPage(url)));
  const config=source('rolex-official',{inventory_urls:rolex,rate_limit_min_seconds:900});
  assert.equal((await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now})).status,'rate_limited');
  const count=h.calls.length;limited=false;
  const deferred=await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now});
  assert.equal(deferred.status,'deferred');assert.equal(h.calls.length,count);
  h.advance(901_000);
  assert.equal((await runOrigin(config,{root,fetcher:h.fetcher,sleep:h.sleep,now:h.now})).status,'completed');
  await rm(root,{recursive:true});
});

test('gates: registry narrows local config, restricted and unsupported sources never run, origins are unique, state stays private',async()=>{
  assert.equal(sourceGate(source('rolex-official'),{'rolex-official':{origin:'https://www.rolex.com',enabled:true,acquisition_allowed:false}}).reason,'registry_acquisition_not_allowed');
  assert.equal(sourceGate(source('rolex-official'),{'rolex-official':{origin:'https://www.rolex.com',enabled:true,acquisition_allowed:true,min_interval_seconds:60}}).interval_seconds,60);
  assert.equal(sourceGate(source('rolex-official',{permission_reference:' '})).reason,'reviewed_acquisition_authorization_missing');
  assert.equal(sourceGate(source('longchamp-official')).reason,'reviewed_inventory_required');
  assert.equal(sourceGate(source('unknown-official')).reason,'unsupported_source_adapter');
  for(const id of Object.keys(recordedSourceStops))assert.equal(sourceGate(source(id,{sitemap_urls:['https://example.test/x.xml']})).allowed,false);
  const root=await privateDir();
  await assert.rejects(runSources({output_root:root,sources:[source('rolex-official'),source('rolex-official')]},{fetcher:async()=>{throw Error('no request');}}),/exactly one queue/);
  const repoPath=join(fileURLToPath(new URL('../..',import.meta.url)),'private-queue-output');
  await assert.rejects(runSources({output_root:repoPath,sources:[]}),/inside the tracked repository/);
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
  await assert.rejects(sink.onRecord(candidate()),/exact batch/);
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
