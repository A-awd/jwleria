import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {privateRoot} from './source-queue.mjs';
import {evaluateMediaGrant,keepOwnerOriginal,acquireOriginal,prepareGrantedMedia,requireVerification,approvalBundle} from './media-pipeline.mjs';
import {uploadThroughFunction,verifyPublishedDerivatives} from './media.mjs';
import {mediaApprovalSql} from './supabase.mjs';

const hash=/^[a-f0-9]{64}$/;
const save=async(path,value)=>{await writeFile(path+'.tmp',JSON.stringify(value,null,2),{mode:0o600});await rename(path+'.tmp',path);};

/** A fresh connector row ({candidate_id, source_id, external_id, revision_hash, content}) as the media helpers expect it. */
export function currentCandidate(row){
  if(!hash.test(row?.candidate_id??'')||!hash.test(row?.revision_hash??'')||!row.external_id||!row.source_id||!Array.isArray(row.content?.image_urls)||typeof row.content?.source_url!=='string')throw Error('Fresh current candidate row required');
  return {candidate_id:row.candidate_id,revision_hash:row.revision_hash,source_id:row.source_id,external_id:row.external_id,source_url:row.content.source_url,image_urls:row.content.image_urls};
}

/**
 * Exact media pilot, in separately reviewable phases. Nothing here records, uploads or publishes without
 * the previous phase's private output and the approvals between phases:
 * - originals: checks the recorded grant and preserves each untouched original by checksum (owner file or granted URL)
 * - bundle: requires a complete visual verification per original, prepares bounded responsive derivatives and
 *   writes the approval bundle plus the exact connector statement that records it (run only after approval)
 * - upload: after the database receipt, uploads through the approval-bound function and verifies every public file
 */
export async function mediaRun(phase,input,{fetcher=fetch,pacer}={}){
  const out=await privateRoot(input.output_directory);
  const candidate=currentCandidate(input.candidate);
  const grant=input.grant;
  if(phase==='originals'){
    const decision=evaluateMediaGrant(grant,{candidate,asset_url:input.originals?.[0]?.asset_url});
    if(decision.state!=='permitted')throw Error('Recorded grant does not permit this exact product: '+decision.reasons.join(','));
    if(!Array.isArray(input.originals)||!input.originals.length||input.originals.length>20)throw Error('Between one and twenty originals required');
    const kept=[];
    for(const item of input.originals){
      kept.push(grant.kind==='owner_original'
        ?await keepOwnerOriginal({candidate,grant,local_path:item.local_path,output_directory:out})
        :await acquireOriginal({candidate,asset_url:item.asset_url,grant,output_directory:out},{fetcher,...(pacer?{pacer}:{})}));
    }
    await save(join(out,'originals.json'),{candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,grant_reference:grant.grant_reference,originals:kept});
    // The reviewer now inspects each original by checksum and writes one verification record per original.
    return {phase,originals:kept.map(o=>({sha256:o.sha256,path:o.path,source_url:o.source_url})),verification_required:kept.length};
  }
  if(phase==='bundle'){
    const recorded=JSON.parse(await readFile(join(out,'originals.json'),'utf8'));
    if(recorded.candidate_id!==candidate.candidate_id||recorded.revision_hash!==candidate.revision_hash||recorded.grant_reference!==grant.grant_reference)throw Error('Originals belong to another candidate revision or grant');
    const verifications=new Map((input.verifications??[]).map(v=>[v.asset_sha256,v]));
    const items=[];
    for(const original of recorded.originals){
      const asset={path:original.path,source_url:original.source_url,sha256:original.sha256};
      const verification=requireVerification(verifications.get(original.sha256),{candidate,asset});
      const prepared=await prepareGrantedMedia({source:input.source,candidate,asset,grant,output_directory:out});
      items.push({asset,manifest:prepared.manifest,verification,performance_review_accepted:input.performance_review_accepted===true});
    }
    const bundle=approvalBundle({candidate,grant,items,public_base_url:input.public_base_url});
    await save(join(out,'approval-bundle.json'),bundle);
    await writeFile(join(out,'record-approval.sql'),mediaApprovalSql(bundle)+'\n',{mode:0o600});
    return {phase,files:bundle.uploads.length,evidence_rows:bundle.evidence.length,approved_images:bundle.approval.approved_images.length,uploaded:0,published:0};
  }
  if(phase==='upload'){
    const bundle=JSON.parse(await readFile(join(out,'approval-bundle.json'),'utf8'));
    if(bundle.approval?.candidate_id!==candidate.candidate_id||bundle.approval?.revision_hash!==candidate.revision_hash)throw Error('Bundle belongs to another candidate revision');
    const uploaded=await uploadThroughFunction(bundle,{output_directory:out,approval_receipt:input.approval_receipt,function_url:input.function_url,public_base_url:input.public_base_url,headers:input.function_headers??{}},fetcher);
    const verified=await verifyPublishedDerivatives(bundle,fetcher);
    const report={phase,uploaded:uploaded.length,verified:verified.length,files:verified,published:0};
    await save(join(out,'upload-report.json'),report);
    return report;
  }
  throw Error('Unknown phase');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [phase,inputPath]=process.argv.slice(2);
  if(!['originals','bundle','upload'].includes(phase)||!inputPath)throw Error('Usage: node media-run.mjs originals|bundle|upload PRIVATE_MEDIA_INPUT.json');
  console.log(JSON.stringify(await mediaRun(phase,JSON.parse(await readFile(inputPath,'utf8')))));
}
