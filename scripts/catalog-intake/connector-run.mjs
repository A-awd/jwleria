import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runOrigin,selectInventory,privateRoot,sourceAdapters} from './source-queue.mjs';
import {createIncrementalSink,identityKey} from './incremental.mjs';

const hash=/^[a-f0-9]{64}$/;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/**
 * Validates a private export made through the existing database connector, for runners that hold no
 * server credential: the source registry (jwl_source_registry), the complete identity list of each run
 * source and the exact revisions of any controls. Stale or partial exports fail closed.
 */
export function connectorExport(data,{now=Date.now,max_age_minutes=120}={}){
  const at=Date.parse(data?.exported_at??'');
  if(!Number.isFinite(at)||now()-at>max_age_minutes*60000||at-now()>5*60000)throw Error('A fresh connector export is required');
  if(data.via!=='database-connector'||!data.registry||typeof data.registry!=='object'||Array.isArray(data.registry))throw Error('The registry must come from jwl_source_registry() through the database connector');
  const identities=new Map();
  for(const [source,ids] of Object.entries(data.identities??{})){
    if(!Array.isArray(ids)||Number(data.identity_counts?.[source])!==ids.length)throw Error('Identity export for '+source+' is incomplete');
    identities.set(source,new Set(ids.map(String)));
  }
  const known=new Map(Object.entries(data.revisions??{}));
  for(const [id,revision] of known)if(!hash.test(id)||!hash.test(revision))throw Error('Invalid revision export');
  const identityKeys=[...identities].flatMap(([source,ids])=>[...ids].map(id=>identityKey(source,id)));
  return {registry:data.registry,identities,known,identityKeys,exported_at:new Date(at).toISOString()};
}

const save=async(path,value)=>{await writeFile(path+'.tmp',JSON.stringify(value,null,2),{mode:0o600});await rename(path+'.tmp',path);};
const load=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};

/**
 * Per origin, concurrently: bounded discovery from robots-declared (or reviewed) sitemaps, a missing-first
 * selection saved privately, then acquisition of exactly that selection. A saved selection is reused, so a
 * rerun resumes the same bounded inventory instead of growing it. Nothing is written to the database here:
 * `ingest-ready.ndjson` holds the missing records for a separately approved connector call.
 * phase: 'select' (no product page), 'acquire' (saved selection only) or 'all'.
 */
export async function connectorRun(config,data,{fetcher=fetch,sleep=wait,now=Date.now,log=()=>{},phase='all'}={}){
  if(!['select','acquire','all'].includes(phase))throw Error('Unknown phase');
  const exported=connectorExport(data,{now,max_age_minutes:config.export_max_age_minutes??120});
  const root=await privateRoot(config.output_root);
  const sources=config.sources??[];
  const origins=sources.map(s=>sourceAdapters[s.source_id]?.origin).filter(Boolean);
  if(new Set(origins).size!==origins.length)throw Error('Each origin needs exactly one queue so its pacing cannot be bypassed');
  const sink=phase==='select'?null:await createIncrementalSink({output_directory:join(root,'incremental'),known:exported.known,known_identities:exported.identityKeys});
  const context={root,registry:exported.registry,fetcher,sleep,now,log};
  const one=async source=>{
    const id=source?.source_id,selectionPath=join(root,id+'.selection.json');
    const known=exported.identities.get(id);
    if(!known)return {source_id:id??null,status:'skipped',reason:'identity_export_missing'};
    let selection=config.refresh_selection===true?null:await load(selectionPath),discovery=null;
    if(!selection){
      if(phase==='acquire')return {source_id:id,status:'skipped',reason:'no_saved_selection'};
      let urls=Array.isArray(source.inventory_urls)&&source.inventory_urls.length?source.inventory_urls:null;
      if(!urls){
        discovery=await runOrigin({...source,discover_only:true,inventory_urls:undefined},context);
        if(discovery.status!=='discovered')return {source_id:id,phase:'discovery',...discovery};
        urls=(await load(join(root,id,'state.json'))).discovered.urls;
      }
      const pick=selectInventory(urls,{source_id:id,known_external_ids:known,max_missing:source.max_missing??source.max_products??20,controls:source.controls??0});
      selection={source_id:id,selected_at:new Date(now()).toISOString(),identity_export_at:exported.exported_at,scope:urls===source.inventory_urls?'reviewed_private_inventory':'discovered',...pick};
      await save(selectionPath,selection);
    }
    const counts={...selection.counts,selected:selection.selected.length,missing_selected:selection.missing.length,controls_selected:selection.controls.length};
    if(phase==='select')return {source_id:id,status:'selected',discovery,selection:counts};
    if(!selection.selected.length)return {source_id:id,status:'nothing_missing',discovery,selection:counts,requests:discovery?.requests??0};
    // Exactly the saved selection, capped at its own size: a rerun cannot silently widen acquisition.
    const acquisition=await runOrigin({...source,discover_only:false,inventory_urls:selection.selected,max_products:selection.selected.length},{...context,onRecord:sink.onRecord});
    return {source_id:id,status:acquisition.status,discovery,selection:counts,acquisition};
  };
  const results=await Promise.all(sources.map(source=>one(source).catch(error=>({source_id:source?.source_id??null,status:'failed',reason:String(error?.message??error).slice(0,200)}))));
  return {finished_at:new Date(now()).toISOString(),phase,export_at:exported.exported_at,origins:results,incremental:sink?await sink.close():null,database_written:false,published:0,image_downloads:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [configPath,exportPath,phase='all']=process.argv.slice(2);
  if(!configPath||!exportPath)throw Error('Usage: node connector-run.mjs PRIVATE_QUEUE_CONFIG.json PRIVATE_CONNECTOR_EXPORT.json [select|acquire|all]');
  const config=JSON.parse(await readFile(configPath,'utf8'));
  const result=await connectorRun(config,JSON.parse(await readFile(exportPath,'utf8')),{phase,log:row=>console.error(JSON.stringify(row))});
  console.log(JSON.stringify(result));
}
