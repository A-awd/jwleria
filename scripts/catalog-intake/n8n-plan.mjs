// Robots-free runner steps (plan, outcome, fold), so their n8n nodes stay small. See n8n-intake.mjs.
import {recordedSourceStops} from './intake-core.mjs';
import {officialAdapters} from './official-adapters.mjs';

const runId=/^[A-Za-z0-9:._-]{8,120}$/;
const clamp=(value,fallback,min,max)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};

/**
 * One scheduled origin: the reviewed config narrowed by recorded stops and the database gate (runner_begin).
 * Only official adapters with URL identity and exactly one reviewed same-origin sitemap are scheduled.
 */
export function originPlan(config,gate){
  const id=config?.source_id,adapter=officialAdapters[id];
  if(!adapter)return {halt:'unsupported_scheduled_source'};
  if(recordedSourceStops[id])return {halt:recordedSourceStops[id]};
  if(gate?.granted!==true)return {halt:gate?.reason??'runner_gate_refused',not_before:gate?.not_before??null};
  if(!runId.test(gate.run_id??'')||gate.origin!==adapter.origin)return {halt:'runner_gate_mismatch'};
  let sitemap=null;try{const url=new URL(config.sitemap_url);sitemap=url.protocol==='https:'&&url.origin===adapter.origin&&!url.username&&!url.password&&!url.hash?url.href:null;}catch{}
  if(!sitemap)return {halt:'reviewed_sitemap_missing',finish:{run_id:gate.run_id,status:'error',error_code:'reviewed_sitemap_missing'}};
  return {plan:{source_id:id,brand:adapter.brand,origin:adapter.origin,run_id:gate.run_id,sitemap_url:sitemap,
    product_url_selector:typeof config.product_url_selector==='string'?config.product_url_selector:null,
    max_pages:clamp(config.max_pages,10,1,20),interval_seconds:Math.max(2,clamp(config.interval_seconds,2,2,3600),clamp(gate.min_interval_seconds,2,2,3600))}};
}

const stopCode=stop=>stop.reason+(stop.not_before?'@'+stop.not_before:'');
/** Finish arguments for runner_finish: blocked needs a recorded review before the origin is contacted again. */
export function finishFor(plan,{stop=null,error=null}={}){
  return {run_id:plan.run_id,status:stop?(stop.status==='blocked'?'blocked':'error'):error?'error':'success',error_code:stop?stopCode(stop):error};
}

/** Folds the per-page results into one bounded missing-only batch and the run's outcome. */
export function collect(plan,results){
  const records=new Map(),reasons={};let stop=null,redirects=0;
  for(const result of results??[]){
    if(result.stop&&!stop)stop=result.stop;
    const reason=result.failure?.reason??result.skip??null;
    if(reason){reasons[reason]=(reasons[reason]??0)+1;redirects=reason==='redirect_requires_review'?redirects+1:0;}
    if(redirects>=3&&!stop)stop={status:'blocked',reason:'repeated_redirects_require_review'};
    for(const record of result.records??[])if(record.source_id===plan.source_id&&!records.has(record.candidate_id))records.set(record.candidate_id,record);
  }
  const batch=[...records.values()].slice(0,100);
  return {records:batch,counts:{pages:(results??[]).length,missing_records:batch.length,failures:reasons},finish:finishFor(plan,{stop})};
}
