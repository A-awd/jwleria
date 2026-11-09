import {createHash} from 'node:crypto';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {privateOutputRoot} from './responsive-media.mjs';

// Batch manifests and lifecycle ledgers for bulk original photos (gap G5; docs/architecture/BULK-ORIGINAL-IMAGES.md
// sections 10 and 13). A manifest is a deterministic, read-only plan built from a private export of recorded
// candidates: it holds source metadata and gallery bindings, never images, rights or approvals. The ledger is an
// append-only NDJSON record of lifecycle transitions keyed per variant and revision. Both stay outside Git.

export const lifecycle=Object.freeze({
  discovered:['matched','quarantined'],
  matched:['rights_ready','acquired','quarantined'],
  rights_ready:['acquired','quarantined'],
  acquired:['processed','quarantined'],
  processed:['reviewed','quarantined'],
  reviewed:['approved','quarantined'],
  approved:['uploaded','withdrawn'],
  uploaded:['published','withdrawn'],
  published:['visitor_verified','withdrawn'],
  visitor_verified:['withdrawn'],
  quarantined:['matched'],
  withdrawn:['matched'],
});
export const quarantineReasons=Object.freeze(['source_refused','rights_missing','rights_scope_mismatch','identity_reference_mismatch','identity_suffix_unestablished',
  'colour_mismatch','size_unestablished','gallery_unbound','shared_file_conflict','low_resolution','not_whole_product','clipped_by_source','cutout_failed','edge_defect',
  'generated_or_altered','over_budget','below_fidelity_floor','visual_rejected','owner_rejected','duplicate_of','changed_after_review',
  // A format the image readers do not support is its own reason, never a resolution problem; an unrecognised processing
  // failure is recorded as such rather than guessed.
  'unsupported_image_format','processing_failed',
  // One declared file that is gone (404/410); unlike source_refused it never stops the source's run.
  'source_file_missing']);
const sizeKinds=['bag_size','size'];
const sha=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
/** JSON with sorted keys, so equal content always hashes the same. */
export function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
const names=(file,ref)=>new RegExp('(^|[^a-z0-9])'+ref.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])').test(file.toLowerCase());

/**
 * Builds the batch manifest from an export {source_id, read_at, snapshot_md5, rows:[{ref, cid16, rev16, model, primary,
 * pos, opts, name, cat, page, n, files}], non_public:[...]}. A variant is eligible when its recorded gallery is non-empty
 * and every file names its exact reference, and no file is shared with another reference outside the G1 size rule.
 * Models rank: every variant eligible first, then more eligible variants, then model_key. Wave 1 is one variant per
 * selected model (its primary when eligible); wave 2 the other eligible variants of selected models.
 */
export function buildBatchManifest(doc,{limit=100}={}){
  const rows=[...doc.rows].sort((a,b)=>a.ref<b.ref?-1:1);
  if(new Set(rows.map(r=>r.ref)).size!==rows.length)throw Error('Duplicate reference in export');
  const owners=new Map();
  for(const r of rows)for(const f of r.files??[]){if(!owners.has(f))owners.set(f,new Set());owners.get(f).add(r.ref);}
  const variants=rows.map(r=>{
    const reasons=[],colour=r.opts?.colour??(String(r.name??'').split(' — ')[1]??null),size=sizeKinds.map(k=>r.opts?.[k]).find(Boolean)??null;
    if(!(r.n>0)||!(r.files?.length))reasons.push('empty_gallery');
    else if(!r.files.every(f=>names(f,r.ref)))reasons.push('gallery_unbound');
    if(r.named!==undefined&&r.n>0&&(r.named===r.n)!==r.files.every(f=>names(f,r.ref)))reasons.push('binding_mismatch');
    const shared=(r.files??[]).flatMap(f=>[...owners.get(f)].filter(o=>o!==r.ref));
    if(shared.length)reasons.push('shared_file_conflict');
    return {key:`${doc.source_id}:${r.ref}:${r.rev16}`,ref:r.ref,model:r.model,primary:r.primary===true,pos:r.pos??0,colour,size,category:r.cat??null,page:r.page??null,
      cid16:r.cid16,rev16:r.rev16,gallery:{files:r.n??0,first_file:r.files?.[0]??null,png_hint:(r.files??[]).length>0&&r.files.every(f=>/\.png$/i.test(f))},
      eligible:reasons.length===0,reasons,...(shared.length?{shared_with:[...new Set(shared)].sort()}:{})};
  });
  const byModel=new Map();
  for(const v of variants){if(!byModel.has(v.model))byModel.set(v.model,[]);byModel.get(v.model).push(v);}
  const models=[...byModel.entries()].map(([model,vs])=>{
    const ok=vs.filter(v=>v.eligible);
    return {model,variants:vs.length,eligible_variants:ok.length,all_eligible:ok.length===vs.length,colours:[...new Set(vs.map(v=>v.colour).filter(Boolean))].sort(),
      sizes:[...new Set(vs.map(v=>v.size).filter(Boolean))].sort(),eligible:ok.length>0,reasons:ok.length?[]:['no_eligible_variant']};
  }).sort((a,b)=>(b.all_eligible-a.all_eligible)||(b.eligible_variants-a.eligible_variants)||(a.model<b.model?-1:1));
  const selected=models.filter(m=>m.eligible).slice(0,limit).map(m=>m.model),chosen=new Set(selected);
  for(const m of models)if(m.eligible&&!chosen.has(m.model))m.reasons.push('beyond_batch_limit');
  const items=[];
  for(const model of selected){
    const ok=byModel.get(model).filter(v=>v.eligible).sort((a,b)=>(b.primary-a.primary)||(a.pos-b.pos)||(a.ref<b.ref?-1:1));
    ok.forEach((v,i)=>items.push({key:v.key,ref:v.ref,model,wave:i===0?1:2,colour:v.colour,size:v.size,first_file:v.gallery.first_file,status:'matched'}));
  }
  const pairs=new Set(variants.map(v=>v.model+'|'+v.colour)),selPairs=new Set(items.map(i=>i.model+'|'+i.colour));
  const counts={variants:variants.length,models:models.length,colour_pairs:pairs.size,eligible_variants:variants.filter(v=>v.eligible).length,
    models_all_eligible:models.filter(m=>m.all_eligible).length,eligible_models:models.filter(m=>m.eligible).length,selected_models:selected.length,
    wave1_variants:items.filter(i=>i.wave===1).length,wave2_variants:items.filter(i=>i.wave===2).length,selected_colour_pairs:selPairs.size,
    excluded_variants:Object.fromEntries(['empty_gallery','gallery_unbound','shared_file_conflict','binding_mismatch'].map(r=>[r,variants.filter(v=>v.reasons.includes(r)).length])),
    non_public_candidates:(doc.non_public??[]).length,
    // Nothing below exists yet for this batch; they are counted from the ledger once real work happens.
    originals_held:0,derivative_files:0,approved_variants:0,published_variants:0};
  const manifest={schema:'jwl-batch-manifest/1',source_id:doc.source_id,read_at:doc.read_at,snapshot_md5:doc.snapshot_md5??null,
    policy:{limit,ranking:'all variants eligible, then eligible variant count, then model_key',hold_before_rights:false,
      eligibility:'non-empty recorded gallery whose every file names the exact reference; no file shared outside the G1 size rule'},
    blocked_by:['rights_missing: no written permission recorded; source publication_allowed=false','transparency_unknown: .png is a format hint only until bytes are held',
      'identity_visual_pending: one recorded visual check per file','acquisition_not_started: no file of this batch is downloaded'],
    counts,selection:selected,items,models,variants};
  return {...manifest,manifest_sha256:sha(manifest)};
}

/** Reads an append-only ledger and returns each key's latest state and the entries. */
export async function openLedger(path){
  let text='';try{text=await readFile(path,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  const entries=text.split('\n').filter(Boolean).map(l=>JSON.parse(l)),state=new Map();
  for(const e of entries){if((state.get(e.key)?.to??null)!==e.from)throw Error(`Ledger chain broken at ${e.key} (${e.seq})`);state.set(e.key,e);}
  return {path,entries,state};
}

/**
 * Appends one transition when it is allowed from the key's current state. The identical transition again is a no-op
 * (idempotent replay). A run stops (throws) once it has quarantined max_quarantined items or on a source refusal.
 */
export async function record(ledger,{key,to,reason,evidence={},run_id='manual',at},limits={max_quarantined:10}){
  const current=ledger.state.get(key)??null,from=current?.to??null;
  const evidence_sha256=sha(evidence);
  if(current&&current.to===to&&current.evidence_sha256===evidence_sha256)return {recorded:false,duplicate:true};
  const allowed=from===null?['discovered']:lifecycle[from]??[];
  // Acquisition before rights is allowed only where the source's own policy permits holding first (owner originals,
  // licensed feeds); official brand media waits for rights_ready.
  if(!allowed.includes(to)||(from==='matched'&&to==='acquired'&&limits.hold_before_rights!==true))throw Error(`Transition ${from??'(new)'} -> ${to} is not allowed for ${key}`);
  if(to==='quarantined'&&!quarantineReasons.includes(reason))throw Error('A quarantine needs a recorded reason code');
  if(to==='quarantined'){
    const inRun=ledger.entries.filter(e=>e.run_id===run_id&&e.to==='quarantined').length;
    if(reason==='source_refused'||inRun+1>limits.max_quarantined){await append(ledger,{key,from,to,reason,evidence,evidence_sha256,run_id,at});throw Error(`Batch run ${run_id} stopped: ${reason==='source_refused'?'source refused':'quarantine limit reached'}`);}
  }
  await append(ledger,{key,from,to,...(reason?{reason}:{}),evidence,evidence_sha256,run_id,at});
  return {recorded:true};
}
async function append(ledger,entry){
  const line={seq:ledger.entries.length+1,at:entry.at??new Date().toISOString(),...entry};
  await appendFile(ledger.path,JSON.stringify(line)+'\n',{mode:0o600});
  ledger.entries.push(line);ledger.state.set(line.key,line);
}

/**
 * Distinct counts from the manifest and ledger. Units never mix: one original yields several derivative files and one
 * photographed variant; a model counts once whatever its photographed variants.
 */
export function ledgerCounters(manifest,ledger){
  const itemOf=new Map(manifest.items.map(i=>[i.key,i])),reached=stage=>{
    const order=['matched','rights_ready','acquired','processed','reviewed','approved','uploaded','published','visitor_verified'];
    return [...ledger.state.values()].filter(e=>order.indexOf(e.to)>=order.indexOf(stage)&&e.to!=='quarantined'&&e.to!=='withdrawn').map(e=>e.key);
  };
  const distinct=(keys,f)=>new Set(keys.map(k=>f(itemOf.get(k)??{model:k,ref:k}))).size;
  const all=ledger.entries;
  return {planned:{models:manifest.counts.selected_models,variants:manifest.items.length},
    originals:new Set(all.filter(e=>e.to==='acquired').map(e=>e.evidence.original_sha256).filter(Boolean)).size,
    derivative_files:new Set(all.filter(e=>e.to==='processed').flatMap(e=>e.evidence.derivative_sha256??[])).size,
    approved:{variants:distinct(reached('approved'),i=>i.ref),models:distinct(reached('approved'),i=>i.model)},
    published:{variants:distinct(reached('published'),i=>i.ref),models:distinct(reached('published'),i=>i.model)},
    visitor_verified:{variants:distinct(reached('visitor_verified'),i=>i.ref)},
    quarantined:Object.fromEntries(quarantineReasons.map(r=>[r,[...ledger.state.values()].filter(e=>e.to==='quarantined'&&e.reason===r).length]).filter(([,n])=>n))};
}

/** Writes manifest.json and seeds the ledger (discovered -> matched per planned item); re-running is a no-op. */
export async function writeStage0(exportPath,outDir,{limit=100}={}){
  const out=await privateOutputRoot(outDir);await mkdir(out,{recursive:true,mode:0o700});
  const manifest=buildBatchManifest(JSON.parse(await readFile(exportPath,'utf8')),{limit});
  await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n',{mode:0o600});
  const ledger=await openLedger(join(out,'ledger.ndjson'));
  for(const item of manifest.items){
    const page={manifest_sha256:manifest.manifest_sha256,first_file:item.first_file};
    if(!ledger.state.has(item.key))await record(ledger,{key:item.key,to:'discovered',evidence:{read_at:manifest.read_at},run_id:'stage0',at:manifest.read_at});
    if(ledger.state.get(item.key).to==='discovered')await record(ledger,{key:item.key,to:'matched',evidence:{basis:'recorded gallery names the exact reference',...page},run_id:'stage0',at:manifest.read_at});
  }
  const summary={manifest_sha256:manifest.manifest_sha256,counts:manifest.counts,ledger:ledgerCounters(manifest,ledger),blocked_by:manifest.blocked_by};
  await writeFile(join(out,'summary.json'),JSON.stringify(summary,null,1)+'\n',{mode:0o600});
  return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,a,b,limit]=process.argv.slice(2);
  if(command==='stage0'&&a&&b)console.log(JSON.stringify(await writeStage0(a,b,{limit:Number(limit??100)})));
  else if(command==='status'&&a&&b){const m=JSON.parse(await readFile(a,'utf8'));console.log(JSON.stringify(ledgerCounters(m,await openLedger(b))));}
  else throw Error('Usage: node batch-ledger.mjs stage0 PRIVATE_EXPORT.json PRIVATE_OUT_DIR [limit] | status MANIFEST.json LEDGER.ndjson');
}
