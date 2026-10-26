// The page step of the scheduled runner: exact-variant extraction, captured-inventory preparation and
// missing-only assessment, with the same normalization drift check as the local missing-only client.
import {classify,identitySet} from './n8n-intake.mjs';
import {assessCandidate} from './intake-core.mjs';
import {extractOfficialProducts,prepareOfficialCandidates} from './extract-official-brands.mjs';
import {normalizeBatch} from './normalize.mjs';

/** One fetched product page → missing records only; a refusal or challenge stops the origin for this run. */
export function pageStep(plan,url,response,known,{now=Date.now()}={}){
  const result=classify(response,{now});
  if(result.stop)return {url,stop:result.stop};
  if(!result.ok)return {url,failure:result.failure};
  if(result.type&&!result.type.includes('text/html'))return {url,failure:{reason:'source_format_changed'}};
  let records;
  try{records=prepareOfficialCandidates(extractOfficialProducts(result.body,{id:plan.source_id,brand:plan.brand,page_url:url,language:'en'}));}
  catch(error){return {url,failure:{reason:'extraction_failed',message:String(error?.message??error).slice(0,200)}};}
  const identities=identitySet(plan.source_id,known?.ids),missing=[],decisions=[];
  for(const record of records){
    const decision=assessCandidate(record,new Map(),identities);
    decisions.push({external_id:record.external_id,ingest:decision.ingest,publication:decision.publication,reasons:decision.reasons});
    if(decision.ingest!=='missing')continue;
    // Re-normalizing must reproduce the exact identity and revision, exactly as the local client requires.
    const [clean]=normalizeBatch([record]);
    if(clean?.candidate_id!==record.candidate_id||clean.revision_hash!==record.revision_hash)return {url,failure:{reason:'record_changed_during_normalization'}};
    missing.push(clean);
  }
  return {url,records:missing,decisions};
}
