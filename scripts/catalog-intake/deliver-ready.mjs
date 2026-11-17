// Ready-only delivery of prepared approval bundles through the existing route (decision 0026).
//
// Existing, reused unchanged: each batch's bundle-report.json and approval-bundle.json files, their prepared
// record-approvals SQL lines (the operator runs them), batchPublishSql (the operator runs its output) and the deployed
// jwl-media-upload function, which accepts a file only when a live recorded approval cites its exact URL, checksum,
// size and canvas, and writes each content-addressed object once.
// New here: `manifest` points at those immutable files where they lie (nothing is copied, re-encoded, renamed or
// regenerated) and `upload` sends each derivative once with bounded concurrency. Every actual response is appended to
// a private receipt, so a stopped run resumes at the next unconfirmed file. A model group whose files are all
// confirmed gets its publish statement while the other uploads continue. Any refusal stops new requests.
// The upload credential comes only from the environment at run time and is never written anywhere.
// Completion (optional): with JWL_COMPLETION_HOOK set, each written publish group is also announced, with metadata
// only (its exact candidate ids), to the operator's n8n webhook, which asks the same function to complete those
// recorded approvals. The function itself verifies every stored file before the existing publication call. Replies go
// to publish/activation.ndjson; `activate` re-announces the groups not yet activated. The publish statements stay
// written as the operator's fallback. Approval recording stays a separate operator step.
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {batchPublishSql} from './batch-official.mjs';

// The upload function's own path rule: v1/<binding>/<original sha256>/<width>w-<file sha256>.webp.
const uploadPath=/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-([a-f0-9]{64})\.webp$/;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const accepted=r=>(r.status===201&&r.state==='uploaded')||(r.status===200&&r.state==='already_present');
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const completedState=s=>s==='published'||s==='already_published';
const httpsHook=hook=>/^https:\/\/[^/@\s]+\/\S+$/.test(hook??'');

/**
 * Metadata-only notice of one written publish group to the completion webhook: the group's file name, refs and exact
 * candidate ids, never a file, credential or local path. The reply is the function's own per-candidate result; the
 * group counts as activated only when every one of its candidates is reported published or already published.
 */
export async function announce({hook,group,fetcher=fetch}){
  const row={at:new Date().toISOString(),n:group.n,file:group.file,refs:group.refs,candidate_ids:group.candidate_ids};
  try{
    const response=await fetcher(hook,{method:'POST',signal:AbortSignal.timeout(120000),headers:{'content-type':'application/json'},
      body:JSON.stringify({group:group.file,candidate_ids:group.candidate_ids,refs:group.refs})});
    const text=await response.text();let body={};try{body=JSON.parse(text);}catch{body={raw:text.slice(0,200)};}
    const results=(Array.isArray(body?.results)?body.results:[]).map(r=>({candidate_id:r.candidate_id,external_id:r.external_id??null,state:r.state??null,error:r.error??null}));
    const done=new Set(results.filter(r=>completedState(r.state)).map(r=>r.candidate_id));
    Object.assign(row,{status:response.status,activated:response.status===200&&group.candidate_ids.every(id=>done.has(id)),results,error:body?.error??body?.message??body?.raw??null});
  }catch(error){Object.assign(row,{status:null,activated:false,results:[],error:'network: '+(error.name==='TimeoutError'?'timeout':error.message)});}
  return row;
}

/** Re-announces, one at a time, each written publish group whose latest notice was not activated. No file is sent. */
export async function activatePending({dir,hook,fetcher=fetch,log=m=>console.error(m)}){
  if(!httpsHook(hook))throw Error('JWL_COMPLETION_HOOK (an https URL) is required in the environment');
  const publishDir=join(dir,'publish'),activationLog=join(publishDir,'activation.ndjson');
  const rows=async file=>existsSync(file)?(await readFile(file,'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
  const done=new Set((await rows(activationLog)).filter(r=>r.activated).map(r=>r.n));
  const counts={announced:0,activated:0,not_activated:0};
  for(const group of (await rows(join(publishDir,'index.ndjson'))).filter(g=>!done.has(g.n))){
    const row=await announce({hook,group,fetcher});
    await appendFile(activationLog,JSON.stringify(row)+'\n',{mode:0o600});
    counts.announced++;counts[row.activated?'activated':'not_activated']++;
    log(`${row.activated?'activated':'not activated'}: ${group.file} (${row.status??row.error})`);
  }
  return counts;
}

/** Reads a reference list: a JSON array of strings or {external_id|ref|candidate_id} rows, or one reference per line. */
export async function readRefs(file){
  if(!file)return null;
  const text=(await readFile(file,'utf8')).trim();
  if(!text)return new Set();
  const rows=text.startsWith('[')?JSON.parse(text):text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  return new Set(rows.flatMap(r=>typeof r==='string'?[r]:[r.external_id,r.ref,r.candidate_id].filter(Boolean)));
}
const named=(set,item)=>!!set&&(set.has(item.ref)||set.has(item.candidate_id));

/**
 * One private manifest for the bundled items of each batch directory, in the bundler's own order. Each item names its
 * prepared record statement (file, line, sha256) and its upload files in place. An item that names another grant,
 * product or revision, or whose live revision differs, is refused with its reason and never listed as ready.
 */
export async function buildManifest({batches,grant_reference,live=null,recorded=null,delivered=null}){
  if(!/^[a-z0-9][a-z0-9._-]{2,80}$/.test(grant_reference??''))throw Error('The live grant reference is required');
  const liveRevision=live?new Map(live.map(r=>[r.candidate_id,r.revision_hash])):null;
  const items=[],refused=[];let public_base=null;
  for(const dir of batches.map(d=>resolve(d))){
    const report=JSON.parse(await readFile(join(dir,'bundle-report.json'),'utf8'));
    const chunks=new Map();
    const linesOf=async file=>{if(!chunks.has(file))chunks.set(file,(await readFile(join(dir,file),'utf8')).split('\n').filter(Boolean));return chunks.get(file);};
    for(const [i,entry] of report.bundled.entries()){
      try{
        const bundle=JSON.parse(await readFile(join(dir,entry.ref,'approval-bundle.json'),'utf8'));
        const {approval,evidence}=bundle;
        if(approval?.candidate_id!==entry.candidate_id||approval.image_verified!==true)throw Error('bundle names another candidate');
        if(approval.media_reference!==grant_reference||evidence.some(e=>e.grant_reference!==grant_reference))throw Error('bundle names another grant');
        if(evidence.some(e=>e.candidate_id!==entry.candidate_id||e.revision_hash!==approval.revision_hash||e.verified_reference!==entry.ref))throw Error('evidence binds another product or revision');
        if(liveRevision&&liveRevision.get(entry.candidate_id)!==approval.revision_hash)throw Error(liveRevision.has(entry.candidate_id)?'live revision differs':'candidate absent from the live read');
        // The bundler writes one statement per line, ten per file, in this report's order.
        const file=`record-approvals-${String(Math.floor(i/10)+1).padStart(3,'0')}.sql`;
        const hits=(await linesOf(file)).map((text,n)=>({text,n})).filter(l=>l.text.includes(`"candidate_id":"${entry.candidate_id}"`));
        if(hits.length!==1)throw Error('prepared record statement not found exactly once');
        const uploads=bundle.uploads.map(u=>{
          const match=uploadPath.exec(u.path);
          if(!match||match[1]!==u.sha256||u.mime_type!=='image/webp')throw Error('upload is not a content-addressed WebP');
          const e=evidence.find(x=>x.public_url.endsWith('/'+u.path)&&x.public_sha256===u.sha256);
          if(!e)throw Error('upload has no matching evidence');
          const base=e.public_url.slice(0,-u.path.length);
          if(public_base&&base!==public_base)throw Error('bundles name different public bases');
          public_base=base;
          return {x_jwl_path:u.path,file:join(dir,entry.ref,u.path),sha256:u.sha256,bytes:u.bytes,width:e.width,height:e.height,public_url:e.public_url};
        });
        if(!uploads.length||uploads.length!==evidence.length)throw Error('uploads and evidence differ');
        items.push({ref:entry.ref,model:entry.ref.slice(0,8),batch_dir:dir,candidate_id:entry.candidate_id,revision_hash:approval.revision_hash,
          record_sql:{file:join(dir,file),line:hits[0].n+1,sha256:sha256(hits[0].text)},
          state:named(delivered,{ref:entry.ref,candidate_id:entry.candidate_id})?'delivered':named(recorded,{ref:entry.ref,candidate_id:entry.candidate_id})?'recorded':'prepared',uploads});
      }catch(error){refused.push({ref:entry.ref,candidate_id:entry.candidate_id,batch_dir:dir,reason:error.message});}
    }
  }
  if(!public_base)throw Error('No bundle could be listed');
  if(!/^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/jwl-product-media\/$/.test(public_base))throw Error('Unexpected public base');
  return {generated_at:new Date().toISOString(),grant_reference,public_base,upload_endpoint:new URL('/functions/v1/jwl-media-upload',public_base).href,
    counts:{items:items.length,files:items.reduce((n,x)=>n+x.uploads.length,0),bytes:items.reduce((n,x)=>n+x.uploads.reduce((m,u)=>m+u.bytes,0),0),refused:refused.length,
      delivered:items.filter(x=>x.state==='delivered').length,recorded:items.filter(x=>x.state==='recorded').length},items,refused};
}

/**
 * Sends every unconfirmed file of each recorded item through the existing function, `concurrency` items at a time,
 * one file after another within an item. Only 201 uploaded or 200 already_present confirms a file. Any other answer,
 * a network failure or local bytes that differ from the manifest stops new requests; nothing is retried in the run.
 * Publish statements are written as model groups complete, and at the end for every other confirmed item.
 */
export async function deliver({dir,manifest,jwt,recordedFile=null,concurrency=4,group=10,watch=0,idle_limit=900,hook=null,fetcher=fetch,log=m=>console.error(m)}){
  if(!jwt)throw Error('JWL_UPLOAD_JWT is required in the environment for an actual upload');
  if(!(concurrency>=1&&concurrency<=8))throw Error('Concurrency must be between 1 and 8');
  if(hook&&!httpsHook(hook))throw Error('JWL_COMPLETION_HOOK must be an https URL');
  if(hook&&!(group>=1&&group<=25))throw Error('A completion group holds 1 to 25 products');
  const receipts=join(dir,'receipts.ndjson'),publishDir=join(dir,'publish'),publishIndex=join(publishDir,'index.ndjson'),activationLog=join(publishDir,'activation.ndjson');
  await mkdir(publishDir,{recursive:true,mode:0o700});
  const confirmed=new Set(),published=new Set();
  if(existsSync(receipts))for(const line of (await readFile(receipts,'utf8')).split('\n').filter(Boolean)){const r=JSON.parse(line);if(accepted(r))confirmed.add(r.x_jwl_path);}
  let publishFiles=0;
  if(existsSync(publishIndex))for(const line of (await readFile(publishIndex,'utf8')).split('\n').filter(Boolean)){const r=JSON.parse(line);publishFiles=Math.max(publishFiles,r.n);r.refs.forEach(ref=>published.add(ref));}
  let writing=Promise.resolve();
  const append=(file,row)=>(writing=writing.then(()=>appendFile(file,JSON.stringify(row)+'\n',{mode:0o600})));
  const items=manifest.items.filter(x=>x.state!=='delivered');
  const complete=x=>x.uploads.every(u=>confirmed.has(u.x_jwl_path));
  const byModel=new Map();for(const x of items){if(!byModel.has(x.model))byModel.set(x.model,[]);byModel.get(x.model).push(x);}
  let pending=[],notifying=Promise.resolve();const activation={announced:0,activated:0,not_activated:0};
  // A model is published together once all its listed variants are confirmed. `drain` also writes a short group (when
  // nothing is left to send); `all` adds every other confirmed item, whose model still waits for a recording.
  const flush=async({drain=false,all=false}={})=>{
    for(const [model,members] of byModel){
      const whole=members.every(complete);
      if(whole||all)for(const x of members)if(complete(x)&&!published.has(x.ref)&&!pending.includes(x))pending.push(x);
      if(whole)byModel.delete(model);
    }
    while(pending.length>=group||(drain&&pending.length)){
      const batch=pending.splice(0,group),n=++publishFiles,name=`publish-${String(n).padStart(3,'0')}.sql`;
      await writeFile(join(publishDir,name),batchPublishSql(batch.map(x=>x.candidate_id))+'\n',{mode:0o600,flag:'wx'});
      batch.forEach(x=>published.add(x.ref));
      await append(publishIndex,{n,file:name,refs:batch.map(x=>x.ref),candidate_ids:batch.map(x=>x.candidate_id),written_at:new Date().toISOString()});
      log(`publish ready: ${name} (${batch.length}: ${batch.map(x=>x.ref).join(' ')})`);
      if(hook){
        const written={n,file:name,refs:batch.map(x=>x.ref),candidate_ids:batch.map(x=>x.candidate_id)};
        // Announced in order without holding up the uploads; the run waits for every reply before it ends.
        notifying=notifying.then(async()=>{
          const row=await announce({hook,group:written,fetcher});await append(activationLog,row);
          activation.announced++;activation[row.activated?'activated':'not_activated']++;
          log(`${row.activated?'activated':'not activated'}: ${name} (${row.status??row.error})`);
        });
      }
    }
  };
  let stopped=null;const counts={uploaded:0,already_present:0,items_confirmed:0};
  const send=async(x,u,bytes)=>{
    if(bytes instanceof Error){stopped={ref:x.ref,x_jwl_path:u.x_jwl_path,local:'unreadable: '+(bytes.code??bytes.message)};return false;}
    if(bytes.length!==u.bytes||sha256(bytes)!==u.sha256){stopped={ref:x.ref,x_jwl_path:u.x_jwl_path,local:'bytes differ from the manifest'};return false;}
    const row={at:new Date().toISOString(),ref:x.ref,candidate_id:x.candidate_id,x_jwl_path:u.x_jwl_path,public_url:u.public_url,sha256:u.sha256,bytes:u.bytes};
    try{
      const response=await fetcher(manifest.upload_endpoint,{method:'PUT',body:bytes,signal:AbortSignal.timeout(90000),
        headers:{authorization:`Bearer ${jwt}`,apikey:jwt,'x-jwl-path':u.x_jwl_path,'content-type':'image/webp'}});
      const text=await response.text();let body={};try{body=JSON.parse(text);}catch{body={raw:text.slice(0,200)};}
      Object.assign(row,{status:response.status,state:body.state??null,error:body.error??body.message??body.raw??null});
    }catch(error){Object.assign(row,{status:null,state:null,error:'network: '+(error.name==='TimeoutError'?'timeout':error.message)});}
    await append(receipts,row);
    if(!accepted(row)){stopped={ref:x.ref,x_jwl_path:u.x_jwl_path,status:row.status,error:row.error};return false;}
    confirmed.add(u.x_jwl_path);counts[row.state]++;return true;
  };
  const run=async queue=>{
    const worker=async()=>{
      for(let x=queue.shift();x&&!stopped;x=queue.shift()){
        // The item's files are read together, so a cloud-synced copy hydrates them in parallel, then sent one by one.
        const todo=x.uploads.filter(u=>!confirmed.has(u.x_jwl_path));
        const bytes=await Promise.all(todo.map(u=>readFile(u.file).catch(error=>error)));
        for(const [k,u] of todo.entries()){if(stopped)return;if(!(await send(x,u,bytes[k])))return;}
        counts.items_confirmed++;log(`confirmed ${x.ref} (${counts.items_confirmed})`);await flush();
      }
    };
    await Promise.all(Array.from({length:concurrency},worker));
  };
  let idle=0;
  for(;;){
    const recorded=recordedFile?await readRefs(recordedFile):null;
    // Recorded items only, same-model variants adjacent so their group completes and publishes together.
    const queue=items.filter(x=>!complete(x)&&(!recorded||x.state==='recorded'||named(recorded,x))).sort((a,b)=>a.model.localeCompare(b.model)||a.ref.localeCompare(b.ref));
    if(queue.length){idle=0;await run(queue);}
    if(stopped)break;
    await flush({drain:true});
    const waiting=items.filter(x=>!complete(x));
    if(!waiting.length||!watch||idle>=idle_limit)break;
    await sleep(watch*1000);idle+=watch;
  }
  await writing;await flush({drain:true,all:true});await notifying;await writing;
  const waiting=items.filter(x=>!complete(x)).map(x=>x.ref);
  return {...counts,confirmed_items:items.filter(complete).length,publish_files:publishFiles,published_refs:published.size,waiting:waiting.length,waiting_refs:waiting.slice(0,20),stopped,
    ...(hook?{activation}:{})};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,dir,...rest]=process.argv.slice(2);
  const flag=(name,fallback=null)=>{const i=rest.indexOf('--'+name);if(i<0)return fallback;const v=rest[i+1];rest.splice(i,2);return v;};
  const live=flag('live'),recorded=flag('recorded'),delivered=flag('delivered');
  const concurrency=Number(flag('concurrency',4)),group=Number(flag('group',10)),watch=Number(flag('watch',0));
  if(command==='manifest'&&dir&&rest.length>=2){
    const [grant_reference,...batches]=rest;
    const rows=live?JSON.parse(await readFile(live,'utf8')):null;
    const m=await buildManifest({batches,grant_reference,live:rows?(Array.isArray(rows)?rows:rows.candidate_revisions):null,recorded:await readRefs(recorded),delivered:await readRefs(delivered)});
    await mkdir(dir,{recursive:true,mode:0o700});
    await writeFile(join(dir,'ready-manifest.json'),JSON.stringify(m,null,1),{mode:0o600,flag:'wx'});
    console.log(JSON.stringify({...m.counts,refused:m.refused}));
  }else if(command==='upload'&&dir){
    const result=await deliver({dir,manifest:JSON.parse(await readFile(join(dir,'ready-manifest.json'),'utf8')),jwt:process.env.JWL_UPLOAD_JWT,
      recordedFile:recorded,concurrency,group,watch,hook:process.env.JWL_COMPLETION_HOOK||null});
    console.log(JSON.stringify(result));
    if(result.stopped)process.exitCode=2;else if(result.activation?.not_activated)process.exitCode=3;
  }else if(command==='activate'&&dir){
    const result=await activatePending({dir,hook:process.env.JWL_COMPLETION_HOOK});
    console.log(JSON.stringify(result));
    if(result.not_activated)process.exitCode=3;
  }else throw Error('Usage: node deliver-ready.mjs manifest PRIVATE_DIR GRANT_REFERENCE BATCH_BUNDLE_DIR... [--live LIVE.json] [--delivered REFS]\n'+
    '  | upload PRIVATE_DIR [--recorded REFS] [--concurrency 4] [--group 10] [--watch SECONDS]   (env JWL_UPLOAD_JWT; optional JWL_COMPLETION_HOOK)\n'+
    '  | activate PRIVATE_DIR   (env JWL_COMPLETION_HOOK)');
}
