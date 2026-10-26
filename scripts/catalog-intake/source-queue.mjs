import {mkdir,readFile,writeFile,rename,open,unlink,appendFile,realpath} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {officialAdapters,officialVariantIdentity,extractOfficialProducts,prepareOfficialCandidates} from './extract-official-brands.mjs';
import {extractBagPage,bagSourceProfile} from './extract-bags.mjs';
import {extractLongchamp} from './extract-longchamp.mjs';
import {agent,recordedSourceStops,sourceChallenge,environmentDenial,sitemapLocations,declaredSitemaps,pickInventory,officialIdentity} from './intake-core.mjs';
export {agent,recordedSourceStops,sourceChallenge,environmentDenial,sitemapLocations,declaredSitemaps};

const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
const robotsParser=require('robots-parser');
const repository=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// Invalid numeric config must never disable pacing or bounds; it falls back to the safe default.
const number=(value,fallback,min,max)=>{if(value==null)return fallback;const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
const within=(root,path)=>{const tail=relative(root,path);return !tail||(!tail.startsWith('..'+sep)&&tail!=='..'&&!isAbsolute(tail));};


// Records pass through the same preparation as the existing captured inventory (e.g. Rolex Arabic names),
// so an unchanged source page reproduces the stored revision instead of looking changed.
const official=id=>{const a=officialAdapters[id];return {origin:a.origin,brand:a.brand,
  product:url=>{try{return Boolean(officialVariantIdentity(id,url));}catch{return false;}},
  identity:url=>officialIdentity(id,url),
  extract:(html,url)=>prepareOfficialCandidates(extractOfficialProducts(html,{id,brand:a.brand,page_url:url,language:'en'}))};};
const bag=(id,brand,origin)=>({origin,brand,profile:robots=>bagSourceProfile(brand,origin,robots),
  extract:(html,url)=>{
    const page=extractBagPage(html,{brand,source_id:id,page_url:url});
    // Only an exact source-name/material rule may assign a category; everything else waits for review.
    const hint=page.evidence.product_category??page.evidence.case_category;
    return [hint?{...page.candidate,category_slug:hint.category_slug,category_mapping_state:hint.method}:page.candidate];
  }});
/** Each adapter binds one official origin to an existing exact-variant extractor. */
export const sourceAdapters=Object.freeze({
  ...Object.fromEntries(Object.keys(officialAdapters).map(id=>[id,official(id)])),
  'prada-official':bag('prada-official','prada','https://www.prada.com'),
  'bottega-veneta-official':bag('bottega-veneta-official','bottega-veneta','https://www.bottegaveneta.com'),
  'loewe-official':bag('loewe-official','loewe','https://www.loewe.com'),
  // Longchamp product URLs come only from a reviewed private inventory.
  'longchamp-official':{origin:'https://www.longchamp.com',brand:'Longchamp',inventoryOnly:true,extract:(html,url)=>[extractLongchamp(html,{page_url:url})]},
});

class OriginStop extends Error{constructor(status,reason,detail={}){super(reason);this.status=status;this.reason=reason;this.detail=detail;}}
class UrlFailure extends Error{constructor(reason,{transient=false,detail={}}={}){super(reason);this.reason=reason;this.transient=transient;this.detail=detail;}}
/** Missing-first bounded selection over this adapter's URL identity (see pickInventory). */
export function selectInventory(urls,{source_id,known_external_ids,max_missing=20,controls=0}={}){
  const adapter=sourceAdapters[source_id];
  if(!adapter?.identity)throw Error('Inventory selection needs an adapter with URL identity');
  return pickInventory(urls,{identity:adapter.identity,known_external_ids,max_missing,controls});
}

export async function privateRoot(path){
  if(!isAbsolute(path??''))throw Error('Absolute private output root required');
  await mkdir(path,{recursive:true,mode:0o700});
  const real=await realpath(path);
  if(within(repository,resolve(path))||within(repository,real))throw Error('Private queue state cannot be written inside the tracked repository');
  return real;
}
async function boundedText(response,limit){
  if(Number(response.headers.get('content-length')??0)>limit)throw new UrlFailure('source_response_too_large');
  let size=0;const chunks=[];
  for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw new UrlFailure('source_response_too_large');chunks.push(chunk);}
  return Buffer.concat(chunks).toString('utf8');
}
function retryAfter(value,now){
  if(value==null)return null;
  const seconds=Number(value);
  const at=Number.isFinite(seconds)&&String(value).trim()!==''?now+seconds*1000:Date.parse(value);
  return Number.isFinite(at)?at:null;
}

/** Validates one reviewed source config against its adapter, recorded stops and the live source registry. */
export function sourceGate(source,registry){
  const adapter=sourceAdapters[source?.source_id];
  if(recordedSourceStops[source?.source_id])return {allowed:false,reason:recordedSourceStops[source.source_id]};
  if(!adapter)return {allowed:false,reason:'unsupported_source_adapter'};
  if(source.origin&&source.origin!==adapter.origin)return {allowed:false,reason:'official_origin_mismatch'};
  if(source.enabled!==true||source.acquisition_allowed!==true||typeof source.permission_reference!=='string'||!source.permission_reference.trim())return {allowed:false,reason:'reviewed_acquisition_authorization_missing'};
  // The database registry is authoritative and required: a local config can narrow it but never widen it.
  if(!registry||typeof registry!=='object')return {allowed:false,reason:'source_registry_required'};
  const row=registry[source.source_id];
  if(!row||row.enabled!==true||row.acquisition_allowed!==true||row.origin!==adapter.origin)return {allowed:false,reason:'registry_acquisition_not_allowed'};
  if(adapter.inventoryOnly&&!(Array.isArray(source.inventory_urls)&&source.inventory_urls.length))return {allowed:false,reason:'reviewed_inventory_required'};
  const interval=Math.max(2,number(source.min_interval_seconds,2,2,86400),number(row.min_interval_seconds,2,2,86400));
  return {allowed:true,adapter,interval_seconds:interval};
}

/**
 * Runs one origin's queue: fresh robots, per-origin pacing, resumable state, deduplication,
 * bounded transient retry with backoff, and explicit stops. Never downloads images or publishes.
 */
export async function runOrigin(source,{root,registry,fetcher=fetch,sleep=wait,now=Date.now,onRecord=async()=>{},log=()=>{}}={}){
  const gate=sourceGate(source,registry);
  if(!gate.allowed)return {source_id:source?.source_id??null,status:'skipped',reason:gate.reason,requests:0};
  const {adapter}=gate,id=source.source_id,origin=adapter.origin;
  const dir=join(root,id);await mkdir(dir,{recursive:true,mode:0o700});
  const statePath=join(dir,'state.json'),journal=join(dir,'candidates.ndjson'),lockPath=join(dir,'queue.lock');
  const running={source_id:id,status:'skipped',reason:'origin_queue_already_running',requests:0};
  try{
    const raw=await readFile(lockPath,'utf8'),prior=JSON.parse(raw);
    if(!Number.isSafeInteger(prior.pid)||prior.pid<1)throw Error('Invalid queue lock requires review');
    try{process.kill(prior.pid,0);return running;}catch(e){if(e.code!=='ESRCH')throw e;}
    // Remove only the stale lock that was read; a lock another runner just took is left alone.
    if(await readFile(lockPath,'utf8').catch(()=>null)===raw)await unlink(lockPath).catch(()=>{});
  }catch(e){if(e.code!=='ENOENT')throw e;}
  let lock;
  try{lock=await open(lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')return running;throw e;}
  await lock.writeFile(JSON.stringify({pid:process.pid,started_at:new Date(now()).toISOString()}));await lock.close();
  let state;
  const save=async()=>{state.updated_at=new Date(now()).toISOString();await writeFile(statePath+'.tmp',JSON.stringify(state,null,2),{mode:0o600});await rename(statePath+'.tmp',statePath);};
  try{
    try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={schema_version:1,source_id:id,origin,inventory:[],discovery:{complete:false,visited:[],errors:[]},urls:{},candidates:{},candidate_urls:{},requests:0};}
    if(state.source_id!==id||state.origin!==origin)throw Error('Queue state belongs to another source');
    state.candidate_urls??={};
    // Fail closed: a blocked origin without a recorded review token can never resume by config.
    if(state.status==='blocked'&&(!state.blocked?.review_token||source.resume_after_review!==state.blocked.review_token))return {source_id:id,status:'blocked',reason:state.blocked?.reason,requests:0,detail:'source_review_required'};
    if(state.not_before&&now()<state.not_before)return {source_id:id,status:'deferred',reason:state.status==='paused'?'origin_unhealthy':'source_rate_limited',not_before:new Date(state.not_before).toISOString(),requests:0};
    delete state.not_before;delete state.blocked;
    state.status='running';state.run_started_at=new Date(now()).toISOString();state.run={requests:0,requests_by_kind:{robots:0,sitemap:0,page:0},acquired:0,new_revisions:0,failed:0,retried:0};await save();

    let interval=gate.interval_seconds*1000;
    const maxAttempts=number(source.max_attempts,3,1,5),maxTotalAttempts=Math.max(maxAttempts,number(source.max_total_attempts,6,1,20));
    const backoffBase=Math.max(interval,number(source.backoff_base_seconds,5,1,3600)*1000),backoffMax=Math.max(backoffBase,number(source.backoff_max_seconds,300,1,86400)*1000);
    const unhealthyAfter=number(source.unhealthy_stop_after,5,1,50),redirectStop=number(source.redirect_stop_after,5,1,50),maxProducts=number(source.max_products,Infinity,1,1e6);
    // Pacing survives restarts: the first request of a run still waits for the previous run's last one.
    let lastRequest=Number.isFinite(state.last_request_at)?state.last_request_at:0,nextAllowed=lastRequest+interval;
    let consecutiveTransient=0,consecutiveRedirects=0,policy=null;
    // Robots, sitemap and product-page requests are counted separately so discovery is never hidden in page totals.
    const sent=kind=>{lastRequest=now();state.last_request_at=lastRequest;nextAllowed=lastRequest+interval;state.requests++;state.run.requests++;
      state.run.requests_by_kind[kind]++;state.requests_by_kind??={robots:0,sitemap:0,page:0};state.requests_by_kind[kind]=(state.requests_by_kind[kind]??0)+1;};
    // One origin never waits on another: every request passes this origin's own pacing gate.
    const request=async(url,limit,{robots=false,kind=robots?'robots':'page'}={})=>{
      const target=new URL(url);
      if(target.origin!==origin||target.username||target.password)throw new OriginStop('failed','unexpected_acquisition_origin');
      if(!robots&&policy.isAllowed(target.href,agent)!==true)throw new UrlFailure('robots_refused');
      const delay=nextAllowed-now();if(delay>0)await sleep(delay);
      let response;
      try{response=await fetcher(target.href,{headers:{'User-Agent':agent},redirect:'manual',signal:AbortSignal.timeout(20000)});}
      catch(error){sent(kind);throw new UrlFailure('network_error',{transient:true,detail:{message:String(error?.message??error).slice(0,200)}});}
      sent(kind);
      if([401,403].includes(response.status)){
        // Keep just enough evidence for the reviewer: who answered and the page title, never the page itself.
        const page=await boundedText(response,16*1024).catch(()=>'');
        const evidence={url:target.href,http_status:response.status,server:(response.headers.get('server')??'').slice(0,60)||null,
          title:(page.match(/<title[^>]*>([^<]{0,200})/i)?.[1]??'').replace(/\s+/g,' ').trim().slice(0,120)||null};
        // The runner's own network policy, not the source, refused this host: nothing was sent to the origin.
        if(environmentDenial(page))throw new OriginStop('failed','environment_egress_denied',evidence);
        throw new OriginStop('blocked','source_refused_access',evidence);
      }
      if(response.status===429||response.status>=500){
        // A challenge or Retry-After is an instruction from the source, never a transient error to retry through.
        const page=await boundedText(response,256*1024).catch(()=>'');
        if(sourceChallenge(page))throw new OriginStop('blocked','source_challenge',{url:target.href,http_status:response.status});
        const after=retryAfter(response.headers.get('retry-after'),now());
        if(response.status===429||after!==null)throw new OriginStop('rate_limited','source_rate_limited',{url:target.href,http_status:response.status,not_before:after});
        throw new UrlFailure(`source_http_${response.status}`,{transient:true});
      }
      if(response.status>=300&&response.status<400){
        if(++consecutiveRedirects>=redirectStop)throw new OriginStop('blocked','repeated_redirects_require_review',{url:target.href});
        throw new UrlFailure('redirect_requires_review',{detail:{location:response.headers.get('location')}});
      }
      consecutiveRedirects=0;
      if(response.status===404||response.status===410)throw new UrlFailure('source_gone');
      if(!response.ok)throw new UrlFailure(`source_http_${response.status}`);
      const body=await boundedText(response,limit).catch(error=>{
        if(error instanceof UrlFailure)throw error;
        throw new UrlFailure('body_read_error',{transient:true,detail:{message:String(error?.message??error).slice(0,200)}});});
      if(sourceChallenge(body))throw new OriginStop('blocked','source_challenge',{url:target.href});
      return {body,type:(response.headers.get('content-type')??'').toLowerCase()};
    };
    // Transient errors back off exponentially within this run; anything else is final for the attempt.
    const withRetry=async(url,limit,options)=>{
      for(let attempt=1;;attempt++){
        try{const result=await request(url,limit,options);consecutiveTransient=0;return result;}
        catch(error){
          if(!(error instanceof UrlFailure)||!error.transient)throw error;
          if(++consecutiveTransient>=unhealthyAfter)throw new OriginStop('paused','origin_unhealthy',{url,last_error:error.reason,attempts:attempt});
          if(attempt>=maxAttempts){error.attempts=attempt;throw error;}
          state.run.retried++;
          nextAllowed=Math.max(nextAllowed,now()+Math.min(backoffMax,backoffBase*2**(attempt-1)));
        }
      }
    };

    const robots=await withRetry(origin+'/robots.txt',512*1024,{robots:true,kind:'robots'}).catch(error=>{
      if(error instanceof UrlFailure)throw new OriginStop('failed','robots_unavailable',{reason:error.reason});throw error;});
    policy=robotsParser(origin+'/robots.txt',robots.body);
    const crawlDelay=(policy.getCrawlDelay(agent)??0)*1000;
    if(crawlDelay>interval){interval=crawlDelay;nextAllowed=Math.max(nextAllowed,lastRequest+interval);log({source_id:id,event:'robots_crawl_delay',seconds:crawlDelay/1000});}

    // Bounded sitemap discovery. Roots are a bag profile, reviewed config URLs, or (sitemap_roots:'robots_declared')
    // only the same-origin sitemaps this run's fresh robots file declares; a selector narrows them to an approved scope.
    const discover=async()=>{
      const profile=adapter.profile?.(robots.body);
      const declared=source.sitemap_roots==='robots_declared';
      const rootSelector=source.sitemap_root_selector?new RegExp(source.sitemap_root_selector):null;
      const roots=profile?profile.roots:declared
        ?declaredSitemaps(policy.getSitemaps(),origin).filter(url=>!rootSelector||rootSelector.test(url))
        :(source.sitemap_urls??[]);
      if(!roots.length)throw new OriginStop('failed',declared?'no_robots_declared_sitemaps':'no_reviewed_sitemap_roots');
      const follow=profile?profile.follow:url=>new URL(url).origin===origin&&(!source.sitemap_child_selector||new RegExp(source.sitemap_child_selector).test(url));
      // An optional product selector keeps discovery inside the approved scope (e.g. the captured locale).
      const narrow=source.product_url_selector?new RegExp(source.product_url_selector):null;
      const product=url=>(profile?profile.product:adapter.product)(url)&&(!narrow||narrow.test(url));
      const maxMaps=number(source.max_sitemaps,30,1,200),maxUrls=number(source.max_discovered_urls,50000,1,200000);
      const queue=roots.map(url=>({url,depth:0})),seen=new Set(),errors=[];let maps=0,found=new Set();
      while(queue.length){
        const {url,depth}=queue.shift();if(seen.has(url))continue;seen.add(url);
        if(depth>3||++maps>maxMaps){errors.push({url,reason:'sitemap_bound_reached'});break;}
        try{
          const {body}=await withRetry(url,32*1024*1024,{kind:'sitemap'});const locs=sitemapLocations(body);
          if(/<sitemapindex\b/.test(body))for(const child of locs.filter(follow))queue.push({url:child,depth:depth+1});
          else if(/<urlset\b/.test(body)){
            for(const loc of locs.filter(product)){if(found.size>=maxUrls){errors.push({url,reason:'discovered_url_bound_reached'});break;}found.add(loc);}
            if(found.size>=maxUrls)break;
          }
          else errors.push({url,reason:'sitemap_format_changed'});
        }catch(error){if(!(error instanceof UrlFailure))throw error;errors.push({url,reason:error.reason});}
      }
      return {urls:[...found],complete:errors.length===0,visited:[...seen],errors,
        scope:profile?.scope??(declared?'robots-declared official sitemaps':'reviewed official sitemap roots'),checked_at:new Date(now()).toISOString()};
    };
    if(source.discover_only===true){
      // Discovery alone fetches no product page; the URLs wait for a separately selected, bounded inventory.
      const found=await discover();
      state.discovered=found;state.status='discovered';await save();
      return {...summary(state),discovered_urls:found.urls.length,discovery_complete:found.complete,discovery_errors:found.errors};
    }
    if(Array.isArray(source.inventory_urls)&&source.inventory_urls.length){
      const reviewed=source.inventory_urls.filter(u=>{try{return new URL(u).origin===origin;}catch{return false;}});
      state.inventory=[...new Set([...state.inventory,...reviewed])];state.discovery={...state.discovery,complete:true,scope:'reviewed_private_inventory'};
    }else if(!state.discovery.complete||source.refresh_inventory===true){
      const {urls,...found}=await discover();
      state.inventory=[...new Set([...state.inventory,...urls])];state.discovery=found;
      await save();
    }
    if(!state.inventory.length)throw new OriginStop('failed','no_supported_products_discovered');

    let processedThisRun=0;
    for(const url of state.inventory){
      const entry=state.urls[url];
      if(entry&&entry.status!=='pending_retry')continue;
      if(entry?.status==='pending_retry'&&entry.attempts>=maxTotalAttempts){entry.status='failed';entry.reason='transient_exhausted';await save();continue;}
      if(processedThisRun>=maxProducts){state.status='bounded_pause';break;}
      try{await readFile(join(dir,'pause.request'));state.status='paused_by_request';break;}catch(e){if(e.code!=='ENOENT')throw e;}
      processedThisRun++;
      const attempts=(entry?.attempts??0);
      try{
        const {body,type}=await withRetry(url,6*1024*1024);
        if(type&&!type.includes('text/html'))throw new UrlFailure('source_format_changed');
        let records;
        try{records=adapter.extract(body,url);}catch(error){throw new UrlFailure('extraction_failed',{detail:{message:String(error.message).slice(0,200)}});}
        const html_sha256=createHash('sha256').update(body).digest('hex'),ids=[],duplicateOf=[];
        for(const record of records){
          ids.push(record.candidate_id);
          // Another URL already yielded this exact identity: keep the first source page, record the alias.
          const owner=state.candidate_urls[record.candidate_id];
          if(owner&&owner!==url){duplicateOf.push(owner);continue;}
          if(state.candidates[record.candidate_id]===record.revision_hash)continue;
          const row={...record,acquired_at:new Date(now()).toISOString(),source_html_sha256:html_sha256};
          // Journal, then hand on, then mark seen: a crash in between replays the record instead of losing it.
          await appendFile(journal,JSON.stringify(row)+'\n',{mode:0o600});
          await onRecord(row,{source_id:id,url});
          state.candidates[record.candidate_id]=record.revision_hash;state.candidate_urls[record.candidate_id]=url;state.run.new_revisions++;
        }
        state.urls[url]=ids.length&&duplicateOf.length===ids.length
          ?{status:'duplicate',candidate_ids:ids,duplicate_of:[...new Set(duplicateOf)],attempts:attempts+1}
          :{status:'acquired',candidate_ids:ids,attempts:attempts+1};
        state.run.acquired++;
      }catch(error){
        if(error instanceof OriginStop&&error.status==='paused'&&error.detail.url===url){
          // The pause still counts this URL's attempts, so a failing page cannot pause the origin forever.
          const tries=attempts+(error.detail.attempts??1);
          state.urls[url]=tries>=maxTotalAttempts?{status:'failed',reason:'transient_exhausted',attempts:tries}:{status:'pending_retry',reason:error.detail.last_error,attempts:tries,last_attempt_at:new Date(now()).toISOString()};
        }
        if(!(error instanceof UrlFailure))throw error;
        const tries=attempts+(error.attempts??1);
        state.urls[url]=error.transient&&tries<maxTotalAttempts
          ?{status:'pending_retry',reason:error.reason,attempts:tries,last_attempt_at:new Date(now()).toISOString()}
          :{status:'failed',reason:error.transient?'transient_exhausted':error.reason,attempts:tries,...error.detail};
        state.run.failed++;
      }
      await save();
    }
    const values=Object.values(state.urls);
    if(state.status==='running')state.status=state.inventory.every(u=>state.urls[u]&&state.urls[u].status!=='pending_retry')?'completed':'incomplete_retry_pending';
    state.inventory_complete=state.status==='completed'&&state.discovery.complete===true&&values.every(r=>r.status==='acquired'||r.status==='duplicate');
    state.worldwide_brand_complete=false;
    await save();
    return summary(state);
  }catch(error){
    if(!state)throw error;
    if(error instanceof OriginStop){
      state.status=error.status;
      if(error.status==='rate_limited'){
        // Honor the source's Retry-After, but never resume sooner than the conservative minimum.
        state.not_before=Math.max(error.detail.not_before??0,now()+number(source.rate_limit_min_seconds,900,60,86400)*1000);
        state.rate_limit={url:error.detail.url,observed_at:new Date(now()).toISOString()};
      }else if(error.status==='blocked'){
        // A refusal or challenge needs a human review token before this origin is ever retried.
        state.blocked={reason:error.reason,...error.detail,observed_at:new Date(now()).toISOString(),review_token:createHash('sha256').update(id+error.reason+now()).digest('hex').slice(0,16)};
      }else{
        state.stop={reason:error.reason,...error.detail,observed_at:new Date(now()).toISOString()};
        // An unhealthy origin cools down before any later run may contact it again.
        if(error.status==='paused')state.not_before=now()+number(source.unhealthy_defer_seconds,900,60,86400)*1000;
      }
      await save();
      return {...summary(state),reason:error.reason};
    }
    state.status='failed';state.stop={reason:'unexpected_error',message:String(error?.message??error).slice(0,200)};await save();
    return {...summary(state),reason:'unexpected_error'};
  }finally{await unlink(lockPath).catch(()=>{});}
}
function summary(state){
  const counts={};for(const row of Object.values(state.urls))counts[row.status]=(counts[row.status]??0)+1;
  return {source_id:state.source_id,status:state.status,requests:state.run?.requests??0,
    requests_by_kind:{robots:0,sitemap:0,page:0,...state.run?.requests_by_kind},discovered:state.inventory.length,url_states:counts,
    candidates:Object.keys(state.candidates).length,new_revisions:state.run?.new_revisions??0,retried:state.run?.retried??0,
    discovery_complete:state.discovery?.complete===true,inventory_complete:state.inventory_complete===true,worldwide_brand_complete:false,
    ...(state.not_before?{not_before:new Date(state.not_before).toISOString()}:{}),...(state.blocked?{blocked:state.blocked.reason}:{})};
}

/** Runs independent origin queues concurrently; one stopped origin never halts the others. */
export async function runSources(config,{fetcher=fetch,sleep=wait,now=Date.now,onRecord,log=()=>{},registry}={}){
  // The registry must come from the database, never from the local config being checked against it.
  if(!registry||typeof registry!=='object'||Array.isArray(registry))throw Error('A fresh database source registry is required');
  const root=await privateRoot(config.output_root);
  const sources=config.sources??[];
  const origins=sources.map(s=>sourceAdapters[s.source_id]?.origin).filter(Boolean);
  if(new Set(origins).size!==origins.length)throw Error('Each origin needs exactly one queue so its pacing cannot be bypassed');
  const limit=Math.max(1,Math.min(config.max_concurrent_origins??sources.length,8));
  const results=new Array(sources.length);let next=0;
  const worker=async()=>{for(let i=next++;i<sources.length;i=next++){
    try{results[i]=await runOrigin(sources[i],{root,registry,fetcher,sleep,now,onRecord,log});}
    catch(error){results[i]={source_id:sources[i]?.source_id??null,status:'failed',reason:String(error?.message??error).slice(0,200)};}
    log({event:'origin_finished',...results[i]});
  }};
  await Promise.all(Array.from({length:Math.min(limit,sources.length)},worker));
  return {finished_at:new Date(now()).toISOString(),origins:results,published:0,image_downloads:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [configPath]=process.argv.slice(2);
  if(!configPath)throw Error('Usage: node source-queue.mjs PRIVATE_QUEUE_CONFIG.json');
  const {createIncrementalSink}=await import('./incremental.mjs');
  const config=JSON.parse(await readFile(configPath,'utf8'));
  // Server-side credentials come only from the process environment, never from the config file.
  const {ingestMissing,sourceRegistry}=await import('./supabase.mjs');
  const db={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  const registry=await sourceRegistry(db);
  const ingest=config.ingest_missing===true?batch=>ingestMissing(batch,db):undefined;
  const sink=await createIncrementalSink({output_directory:join(config.output_root,'incremental'),known_revisions_path:config.known_revisions_path,ingest});
  const result=await runSources(config,{registry,onRecord:sink.onRecord,log:row=>console.error(JSON.stringify(row))});
  console.log(JSON.stringify({...result,incremental:await sink.close()}));
}
