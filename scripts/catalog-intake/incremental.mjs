import {readFile,appendFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {privateRoot} from './source-queue.mjs';

export const approvedCategories=Object.freeze(['watches','handbags','bracelets','jewelry','leather-goods','luggage','shoes','accessories','clothing']);
const hash=/^[a-f0-9]{64}$/;

/**
 * Private ingestion and public factual readiness are separate decisions. A known candidate with a
 * different revision is never overwritten here: guarded private repairs and live rows depend on it.
 */
export function assessCandidate(record,known){
  if(!hash.test(record?.candidate_id??'')||!hash.test(record?.revision_hash??''))return {ingest:'rejected',publication:'held',reasons:['invalid_identity']};
  const missing=['source_id','external_id','brand','collection','product_name','source_url'].filter(f=>typeof record[f]!=='string'||!record[f].trim()).map(f=>'missing_'+f);
  if(!Array.isArray(record.image_urls)||!record.image_urls.length)missing.push('gallery_reference_missing');
  if(missing.length)return {ingest:'rejected',publication:'held',reasons:missing};
  const previous=known?.get(record.candidate_id);
  const ingest=!known?'baseline_unknown':previous===undefined?'missing':previous===record.revision_hash?'unchanged':'changed_requires_review';
  const held=[];
  if(!Array.isArray(record.facts)||!record.facts.length)held.push('facts_missing');
  if(record.translation_state!=='provided'||!record.name_ar)held.push('arabic_name_pending');
  if(!record.description_ar||!record.description_en)held.push('factual_summary_missing');
  if(!record.category_slug)held.push('category_requires_review');
  else if(!approvedCategories.includes(record.category_slug))held.push('category_outside_approved_set');
  // Readiness is only for review: publication still needs the current-revision factual guard.
  return {ingest,publication:held.length?'held':'factual_review_ready',reasons:held};
}

/**
 * Processes each validated record as it arrives instead of waiting for every brand.
 * `known` is a fresh candidate_id→revision export; without it nothing is ingested.
 * `ingest` (optional) must be the database missing-only RPC, which re-checks existence itself.
 */
export async function createIncrementalSink({output_directory,known_revisions_path,known,ingest,batch_size=100,now=Date.now}={}){
  const dir=await privateRoot(output_directory);
  let baseline=known instanceof Map?known:known?new Map(Object.entries(known)):null;
  if(!baseline&&known_revisions_path){
    const exported=JSON.parse(await readFile(known_revisions_path,'utf8'));
    if(!exported||typeof exported!=='object'||Array.isArray(exported))throw Error('Known revision export must map candidate_id to revision_hash');
    baseline=new Map(Object.entries(exported));
  }
  if(baseline)for(const [id,revision] of baseline)if(!hash.test(id)||!hash.test(revision))throw Error('Invalid known revision export');
  if(ingest&&!baseline)throw Error('Missing-only ingestion needs a fresh known-revision export');
  const size=Math.max(1,Math.min(100,batch_size));
  const seen=new Map(),counts={received:0,replayed:0,ingest:{},publication:{},reasons:{},inserted:0,skipped_existing:0};
  let pending=[];const receipts=[];
  const bump=(group,key)=>{group[key]=(group[key]??0)+1;};
  const flush=async()=>{
    if(!ingest||!pending.length)return;
    const batch=pending;pending=[];
    const receipt=await ingest(batch);
    const inserted=receipt?.inserted_ids??[],skipped=receipt?.skipped_existing_ids??[];
    if(inserted.length+skipped.length!==batch.length||[...inserted,...skipped].some(id=>!batch.some(r=>r.candidate_id===id)))throw Error('Ingestion receipt does not account for the exact batch');
    for(const record of batch)if(inserted.includes(record.candidate_id))baseline.set(record.candidate_id,record.revision_hash);
    counts.inserted+=inserted.length;counts.skipped_existing+=skipped.length;
    receipts.push({at:new Date(now()).toISOString(),inserted:inserted.length,skipped_existing:skipped.length});
    await appendFile(join(dir,'ingestion-receipts.ndjson'),JSON.stringify({...receipts.at(-1),inserted_ids:inserted,skipped_existing_ids:skipped})+'\n',{mode:0o600});
  };
  const onRecord=async(record,meta={})=>{
    counts.received++;
    if(seen.get(record.candidate_id)===record.revision_hash){counts.replayed++;return;}
    seen.set(record.candidate_id,record.revision_hash);
    const decision=assessCandidate(record,baseline);
    bump(counts.ingest,decision.ingest);bump(counts.publication,decision.publication);for(const r of decision.reasons)bump(counts.reasons,r);
    const row={observed_at:new Date(now()).toISOString(),source_id:record.source_id,external_id:record.external_id,candidate_id:record.candidate_id,revision_hash:record.revision_hash,source_url:meta.url??record.source_url,...decision};
    await appendFile(join(dir,'decisions.ndjson'),JSON.stringify(row)+'\n',{mode:0o600});
    if(decision.ingest==='missing'){
      await appendFile(join(dir,'ingest-ready.ndjson'),JSON.stringify(record)+'\n',{mode:0o600});
      if(ingest){pending.push(record);if(pending.length>=size)await flush();}
    }
    if(decision.ingest==='changed_requires_review')await appendFile(join(dir,'review-required.ndjson'),JSON.stringify({...row,known_revision:baseline.get(record.candidate_id),record})+'\n',{mode:0o600});
  };
  const close=async()=>{
    await flush();
    const summary={...counts,baseline:baseline?'known_revision_export':'none',ingestion:ingest?'missing_only':'disabled',published:0,image_downloads:0};
    await writeFile(join(dir,'summary.json.tmp'),JSON.stringify(summary,null,2),{mode:0o600});await rename(join(dir,'summary.json.tmp'),join(dir,'summary.json'));
    return summary;
  };
  return {onRecord,flush,close};
}
