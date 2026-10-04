import {mkdir,readFile,writeFile,rename,open,unlink,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {extractBagPage,bagSourceProfile,sitemapLocations} from './extract-bags.mjs';
const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
const robotsParser=require('robots-parser'),agent='JwleriaCatalog/1.0';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class BagSourceBlocked extends Error{constructor(code){super(code);this.code=code;}}
export const sourceChallenge=html=>/sec-if-cpt-container|<title[^>]*>[^<]*(captcha|access denied|just a moment|robot check)|verify you are (human|a human)/i.test(html);
async function boundedText(response,limit){
  if(Number(response.headers.get('content-length')??0)>limit)throw Error('Source response too large');
  let size=0,chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('Source response too large');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');
}

/** Private, resumable acquisition only; no database/media download/publication/schedule. */
export async function collectBagInventory(config,{fetcher=fetch,sleeper=sleep,now=Date.now,progress=()=>{}}={}){
  const {brand,origin,source_id,output_dir}=config;
  if(!config.acquisition_allowed||!config.permission_reference)throw Error('Source acquisition authorization required');
  const base=new URL(origin);if(base.protocol!=='https:'||base.origin!==origin||base.username||base.password)throw Error('Invalid source origin');
  if(origin!=={prada:'https://www.prada.com','bottega-veneta':'https://www.bottegaveneta.com',loewe:'https://www.loewe.com'}[brand])throw Error('Official brand origin mismatch');
  const out=resolve(output_dir);await mkdir(out,{recursive:true,mode:0o700});
  const lockPath=join(out,'collector.lock');
  // Recover only an interrupted collector whose recorded process is no longer alive.
  try{const previous=JSON.parse(await readFile(lockPath,'utf8'));if(!Number.isSafeInteger(previous.pid)||previous.pid<1)throw Error('Invalid collector lock requires review');try{process.kill(previous.pid,0);throw Error('Collector already running');}catch(e){if(e.code!=='ESRCH')throw e;await unlink(lockPath);}}catch(e){if(e.code!=='ENOENT')throw e;}
  const lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,started_at:new Date().toISOString()}));await lock.close();
  const atomic=async(name,data)=>{const temp=join(out,name+'.tmp');await writeFile(temp,JSON.stringify(data,null,2),{mode:0o600});await rename(temp,join(out,name));};
  await mkdir(join(out,'records'),{recursive:true,mode:0o700});
  const exportRecords=async()=>{
    const records=await Promise.all((await readdir(join(out,'records'))).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).sort().map(async n=>JSON.parse(await readFile(join(out,'records',n),'utf8'))));
    for(const [name,key] of [['source-records.ndjson','raw'],['candidates.ndjson','candidate'],['evidence.ndjson','evidence']]){
      const temp=join(out,name+'.tmp');await writeFile(temp,records.map(r=>JSON.stringify(r[key])).join('\n')+(records.length?'\n':''),{mode:0o600});await rename(temp,join(out,name));
    }
    return records;
  };
  let state;
  try{
    try{state=JSON.parse(await readFile(join(out,'state.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={brand,origin,source_id,visited_sitemaps:[],sitemap_graph:{},inventory:[],processed:{},candidate_ids:[],discovery_errors:[],request_count:0};}
    if(state.brand!==brand||state.origin!==origin||state.source_id!==source_id)throw Error('Checkpoint source mismatch');
    if(state.status==='blocked')throw new BagSourceBlocked(state.stop_code??'Source remains blocked; review checkpoint before retrying');
    const recovered=await exportRecords();state.candidate_ids=recovered.map(r=>r.candidate.candidate_id);
    let last=0,delay=Math.max(2,config.min_interval_seconds??2)*1000,policy;
    const request=async(url,limit=8*1024*1024,robots=false)=>{
      const target=new URL(url);if(target.origin!==origin)throw Error('Source origin mismatch');
      if(!robots&&policy.isAllowed(target.href,agent)!==true)throw new BagSourceBlocked('robots_refused');
      const wait=delay-(now()-last);if(wait>0)await sleeper(wait);last=now();
      const response=await fetcher(target.href,{headers:{'User-Agent':agent},redirect:'manual',signal:AbortSignal.timeout(15000)});state.request_count++;
      if([401,403,429].includes(response.status)){state.retry_after=response.headers.get('retry-after');throw new BagSourceBlocked(`http_${response.status}`);}
      if(response.status>=300&&response.status<400){const loc=response.headers.get('location');return {redirect:loc?new URL(loc,target).href:null};}
      if(!response.ok)throw Error(`source_http_${response.status}`);
      const text=await boundedText(response,limit);if(sourceChallenge(text))throw new BagSourceBlocked('source_challenge');
      return {text};
    };
    const robotsResult=await request(origin+'/robots.txt',512*1024,true);if(!robotsResult.text)throw new BagSourceBlocked('robots_redirect_requires_review');
    await writeFile(join(out,'robots.txt'),robotsResult.text,{mode:0o600});policy=robotsParser(origin+'/robots.txt',robotsResult.text);delay=Math.max(delay,(policy.getCrawlDelay(agent)??0)*1000);
    const profile=bagSourceProfile(brand,origin,robotsResult.text);if(!profile.roots.length)throw Error('Advertised regional sitemap root missing');state.coverage_scope=profile.scope;
    state.status='discovering';state.pid=process.pid;await atomic('state.json',state);
    const queue=[...profile.roots],traversed=new Set();let sitemapCalls=0;
    while(queue.length){
      const url=queue.shift();if(traversed.has(url))continue;traversed.add(url);
      if(state.visited_sitemaps.includes(url)){queue.push(...(state.sitemap_graph?.[url]??[]));continue;}
      if(++sitemapCalls>(config.max_sitemaps??30))throw Error('Sitemap discovery bound reached; inventory incomplete');
      try{
        const r=await request(url,16*1024*1024);if(!r.text)throw Error('Sitemap redirect requires review');
        const urls=sitemapLocations(r.text);
        if(/<sitemapindex\b/.test(r.text)){state.sitemap_graph??={};state.sitemap_graph[url]=urls.filter(profile.follow);queue.push(...state.sitemap_graph[url]);}
        else state.inventory=[...new Set([...state.inventory,...urls.filter(profile.product)])];
        state.visited_sitemaps.push(url);await atomic('state.json',state);
      }catch(e){if(e instanceof BagSourceBlocked)throw e;state.discovery_errors.push({url,error:e.message});await atomic('state.json',state);}
    }
    state.discovery_complete=state.discovery_errors.length===0;await atomic('inventory.json',{scope:state.coverage_scope,discovery_complete:state.discovery_complete,urls:state.inventory,visited_sitemaps:state.visited_sitemaps,errors:state.discovery_errors,worldwide_brand_complete:false});
    if(!state.inventory.length)throw Error('No eligible products found; declared inventory coverage unproven');
    state.status='collecting';await atomic('state.json',state);
    let acquired=0;
    for(const url of state.inventory){
      if(state.processed[url])continue;if(acquired>=(config.max_products??Infinity))break;
      try{await readFile(join(out,'pause.request'));break;}catch(e){if(e.code!=='ENOENT')throw e;}
      try{
        let target=url,result=await request(target);
        // Only a normal same-origin redirect is followed; refusals/challenges terminate the source.
        if(result.redirect&&new URL(result.redirect).origin===origin){target=result.redirect;result=await request(target);}
        if(!result.text)throw Error('Product redirect requires review');
        const extracted=extractBagPage(result.text,{brand,source_id,page_url:target});
        if(!state.candidate_ids.includes(extracted.candidate.candidate_id)){
          await atomic(`records/${extracted.candidate.candidate_id}.json`,extracted);
          state.candidate_ids.push(extracted.candidate.candidate_id);acquired++;
        }
        state.processed[url]={status:'acquired',candidate_id:extracted.candidate.candidate_id};
      }catch(e){if(e instanceof BagSourceBlocked)throw e;state.processed[url]={status:'incomplete',error:e.message};}
      state.updated_at=new Date().toISOString();await atomic('state.json',state);
      if(Object.keys(state.processed).length%10===0){await exportRecords();progress({brand,status:state.status,discovered:state.inventory.length,processed:Object.keys(state.processed).length,candidates:state.candidate_ids.length});}
    }
    state.status=Object.keys(state.processed).length===state.inventory.length?'exhausted':'bounded_pause';
    state.inventory_acquisition_complete=state.discovery_complete&&state.status==='exhausted'&&Object.values(state.processed).every(r=>r.status==='acquired');
    state.worldwide_brand_complete=false;state.finished_at=new Date().toISOString();delete state.pid;await exportRecords();await atomic('state.json',state);progress({brand,status:state.status,discovered:state.inventory.length,processed:Object.keys(state.processed).length,candidates:state.candidate_ids.length});return state;
  }catch(e){
    if(state){state.status=e instanceof BagSourceBlocked?'blocked':'error';state.stop_code=e.code??e.message;state.finished_at=new Date().toISOString();delete state.pid;await exportRecords();await atomic('state.json',state);progress({brand,status:state.status,reason:state.stop_code,candidates:state.candidate_ids.length});}
    throw e;
  }finally{await unlink(lockPath);}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const config=JSON.parse(await readFile(process.argv[2],'utf8'));
  await collectBagInventory(config,{progress:row=>console.log(JSON.stringify(row))});
}
