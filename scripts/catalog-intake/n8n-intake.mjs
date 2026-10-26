// Scheduled-runner steps for n8n Code nodes: pure functions over n8n HTTP/Postgres results, bundled
// verbatim into the workflow by build-n8n-intake.mjs. HTTP happens only in n8n's HTTP Request nodes.
import {robotsParser} from './robots.mjs';
import {agent,sourceChallenge,environmentDenial,sitemapLocations,officialIdentity,pickInventory,identityKey} from './intake-core.mjs';
import {finishFor} from './n8n-plan.mjs';
export {originPlan,finishFor,collect} from './n8n-plan.mjs';

const header=(response,name)=>{const headers=response?.headers??{};const key=Object.keys(headers).find(k=>k.toLowerCase()===name);const value=key?headers[key]:null;return Array.isArray(value)?value[0]:value??null;};
const bodyText=response=>typeof response?.body==='string'?response.body:response?.body==null?'':JSON.stringify(response.body);


/** The same response rules as the local queue, over an n8n full response ({statusCode, headers, body}) or error item. */
export function classify(response,{now=Date.now(),limit=6*1024*1024}={}){
  if(!response||response.error||!Number.isInteger(response.statusCode))return {failure:{reason:'network_error',transient:true}};
  const status=response.statusCode,body=bodyText(response);
  const evidence={http_status:status,server:String(header(response,'server')??'').slice(0,60)||null,title:(body.match(/<title[^>]*>([^<]{0,200})/i)?.[1]??'').replace(/\s+/g,' ').trim().slice(0,120)||null};
  if(status===401||status===403)return environmentDenial(body)?{stop:{status:'error',reason:'environment_egress_denied',...evidence}}:{stop:{status:'blocked',reason:'source_refused_access',...evidence}};
  if(status===429||status>=500){
    if(sourceChallenge(body))return {stop:{status:'blocked',reason:'source_challenge',...evidence}};
    const raw=header(response,'retry-after'),seconds=Number(raw),at=raw==null?null:Number.isFinite(seconds)&&String(raw).trim()!==''?now+seconds*1000:Date.parse(raw);
    if(status===429||Number.isFinite(at))return {stop:{status:'error',reason:'source_rate_limited',not_before:new Date(Math.max(Number.isFinite(at)?at:0,now+15*60000)).toISOString(),...evidence}};
    return {failure:{reason:`source_http_${status}`,transient:true}};
  }
  if(status>=300&&status<400)return {failure:{reason:'redirect_requires_review',location:header(response,'location')}};
  if(status===404||status===410)return {failure:{reason:'source_gone'}};
  if(status<200||status>=300)return {failure:{reason:`source_http_${status}`}};
  if(body.length>limit)return {failure:{reason:'source_response_too_large'}};
  if(sourceChallenge(body))return {stop:{status:'blocked',reason:'source_challenge',...evidence}};
  return {ok:true,body,type:String(header(response,'content-type')??'').toLowerCase()};
}


/** Fresh robots for this run; the crawl-delay can only lengthen the pacing, and the reviewed sitemap must be allowed. */
export function robotsStep(plan,response,{now=Date.now()}={}){
  const result=classify(response,{now,limit:512*1024});
  if(result.stop)return {finish:finishFor(plan,{stop:result.stop}),evidence:result.stop};
  if(!result.ok)return {finish:finishFor(plan,{error:'robots_unavailable'}),evidence:result.failure};
  const policy=robotsParser(plan.origin+'/robots.txt',result.body);
  const delay=Number(policy.getCrawlDelay(agent)??0);
  const next={...plan,robots:result.body,interval_seconds:Math.max(plan.interval_seconds,Number.isFinite(delay)?Math.min(delay,3600):0)};
  if(policy.isAllowed(plan.sitemap_url,agent)!==true)return {finish:finishFor(plan,{error:'sitemap_robots_refused'})};
  return {plan:next};
}

/** Reads the reviewed sitemap and selects at most max_pages product URLs whose identity the database lacks. */
export function sitemapStep(plan,response,known,{now=Date.now()}={}){
  const result=classify(response,{now,limit:32*1024*1024});
  if(result.stop)return {finish:finishFor(plan,{stop:result.stop}),evidence:result.stop};
  if(!result.ok)return {finish:finishFor(plan,{error:'sitemap_unavailable_'+result.failure.reason})};
  if(!/<urlset\b/.test(result.body))return {finish:finishFor(plan,{error:/<sitemapindex\b/.test(result.body)?'sitemap_index_requires_review':'sitemap_format_changed'})};
  if(known?.source_id!==plan.source_id||!Array.isArray(known.ids)||known.ids.length!==Number(known.count))return {finish:finishFor(plan,{error:'identity_export_incomplete'})};
  const policy=robotsParser(plan.origin+'/robots.txt',plan.robots);
  const narrow=plan.product_url_selector?new RegExp(plan.product_url_selector):null;
  const urls=sitemapLocations(result.body).filter(url=>officialIdentity(plan.source_id,url)&&(!narrow||narrow.test(url))&&policy.isAllowed(url,agent)===true);
  const pick=pickInventory(urls,{identity:url=>officialIdentity(plan.source_id,url),known_external_ids:new Set(known.ids),max_missing:plan.max_pages});
  if(!pick.selected.length)return {finish:finishFor(plan),counts:pick.counts};
  return {pages:pick.selected,counts:pick.counts};
}

/** Before each page request: same origin, robots-allowed, and no stop recorded earlier in this run. */
export function pageAllowed(plan,url,stopped){
  if(stopped)return {skip:'origin_stopped_this_run'};
  let target;try{target=new URL(url);}catch{return {skip:'invalid_url'};}
  if(target.origin!==plan.origin||target.username||target.password)return {skip:'unexpected_acquisition_origin'};
  if(robotsParser(plan.origin+'/robots.txt',plan.robots).isAllowed(target.href,agent)!==true)return {skip:'robots_refused'};
  return {allowed:true};
}


/** The identities a run's records are compared against, as the shared assessment expects them. */
export const identitySet=(sourceId,ids)=>new Set((ids??[]).map(id=>identityKey(sourceId,id)));
