import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {acquireOriginal,createMediaPacer} from './media-pipeline.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {openLedger,record} from './batch-ledger.mjs';
import {installedImageEngine,privateOutputRoot} from './responsive-media.mjs';

// Decision 0025 batch driver: official exact-product images under the owner's direction, with no brand contact.
// For each planned manifest item it downloads the one exact recorded gallery file (robots, 2 s pacing, a stop on any
// refusal; one request per unique URL), keeps the untouched original by sha256, and builds the flat #f0f0f0 tile from
// the original's own alpha (flat-tile.mjs: no pixel of the product changes). It writes only private files and the
// append-only ledger, prints only counts, and never records, uploads or publishes anything.

/** The grant row the decision 0025 migration records for Longchamp; it claims no brand licence. */
export const longchampOwnerDirection=Object.freeze({grant_reference:'owner-directed-longchamp-0025',kind:'owner_directed_official',source_id:'longchamp-official',
  candidate_id:null,media_origins:['https://www.longchamp.com'],website_publication:true,resize:true,webp_encode:true,background_removal:true,evidence_reference:'decision-0025'});

/**
 * urls: [{key, ref, asset_url}], each asset_url byte-identical to the candidate's recorded gallery file (checked
 * against the database before the run). Returns per-state counts.
 */
export async function acquireAndTile({manifest,urls,out,grant=longchampOwnerDirection,run_id,fetcher=fetch,pacer=createMediaPacer(),sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out);
  for(const d of ['originals','tiles'])await mkdir(join(root,d),{recursive:true,mode:0o700});
  const ledger=await openLedger(join(root,'ledger.ndjson'));
  const byKey=new Map(urls.map(u=>[u.key,u])),items=manifest.items.filter(i=>byKey.has(i.key));
  const results=JSON.parse(await readFile(join(root,'results.json'),'utf8').catch(()=>'{}'));
  const byUrl=new Map(Object.values(results).filter(r=>r.original).map(r=>[r.asset_url,r.original]));
  const limits={max_quarantined:400};
  for(const item of items){
    if(results[item.key]?.tile||results[item.key]?.quarantine)continue;
    const {asset_url}=byKey.get(item.key);
    const candidate={source_id:grant.source_id,external_id:item.ref,image_urls:[asset_url]};
    if(!ledger.state.has(item.key))throw Error('Item missing from ledger: '+item.key);
    if(ledger.state.get(item.key).to==='matched')await record(ledger,{key:item.key,to:'rights_ready',evidence:{basis:'decision-0025 owner direction; no brand contact; no brand licence claimed',grant_reference:grant.grant_reference},run_id},limits);
    let original=byUrl.get(asset_url);
    try{
      if(!original){
        original=await acquireOriginal({candidate,asset_url,grant,output_directory:join(root,'originals')},{fetcher,pacer});
        byUrl.set(asset_url,original);
      }
    }catch(error){
      results[item.key]={ref:item.ref,asset_url,quarantine:'source_refused',error:error.message};
      await save(root,results);
      await record(ledger,{key:item.key,to:'quarantined',reason:'source_refused',evidence:{asset_url,error:error.message},run_id},limits);
    }
    if(ledger.state.get(item.key).to==='rights_ready')await record(ledger,{key:item.key,to:'acquired',evidence:{original_sha256:original.sha256,asset_url,bytes:original.bytes,width:original.width,height:original.height,has_alpha:original.has_alpha??null},run_id},limits);
    try{
      const {png,record:tile}=await normalizeFlatTile(await readFile(original.path),sharp);
      const path=join(root,'tiles',tile.tile_sha256+'.png');
      await writeFile(path,png,{mode:0o600});
      results[item.key]={ref:item.ref,model:item.model,colour:item.colour,size:item.size,asset_url,original:{...original},tile:{sha256:tile.tile_sha256,path,side:tile.geometry.side,changed_opaque_product_pixels:tile.changed_opaque_product_pixels}};
      await record(ledger,{key:item.key,to:'processed',evidence:{original_sha256:original.sha256,tile_sha256:tile.tile_sha256,derivative_sha256:[tile.tile_sha256]},run_id},limits);
    }catch(error){
      const reason=/transparency|own transparency/i.test(error.message)?'cutout_failed':/touches its source frame/.test(error.message)?'clipped_by_source':'low_resolution';
      results[item.key]={ref:item.ref,model:item.model,colour:item.colour,asset_url,original:{...original},quarantine:reason,error:error.message};
      await record(ledger,{key:item.key,to:'quarantined',reason,evidence:{original_sha256:original.sha256,error:error.message},run_id},limits);
    }
    await save(root,results);
  }
  const all=Object.values(results);
  return {items:items.length,unique_originals:new Set(all.filter(r=>r.original).map(r=>r.original.sha256)).size,tiles:all.filter(r=>r.tile).length,
    quarantined:all.filter(r=>r.quarantine).reduce((a,r)=>({...a,[r.quarantine]:(a[r.quarantine]??0)+1}),{})};
}
const save=(root,results)=>writeFile(join(root,'results.json'),JSON.stringify(results,null,1),{mode:0o600});

/** Contact sheets for the independent visual review: each tile beside its untouched original, labelled by reference. */
export async function contactSheets({out,per_sheet=12,cell=360,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out);
  const results=Object.entries(JSON.parse(await readFile(join(root,'results.json'),'utf8'))).filter(([,r])=>r.tile).sort(([,a],[,b])=>a.ref<b.ref?-1:1);
  await mkdir(join(root,'sheets'),{recursive:true,mode:0o700});
  const index=[];
  for(let s=0;s*per_sheet<results.length;s++){
    const page=results.slice(s*per_sheet,(s+1)*per_sheet),cols=4,rows=Math.ceil(page.length*2/cols),label=40;
    const layers=[];
    for(const [i,[key,r]] of page.entries()){
      for(const [j,file] of [r.original.path,r.tile.path].entries()){
        const n=i*2+j,x=(n%cols)*cell,y=Math.floor(n/cols)*(cell+label);
        layers.push({input:await sharp(file).resize(cell,cell,{fit:'contain',background:'#ffffff'}).png().toBuffer(),left:x,top:y});
        const text=`${r.ref} ${j?'tile':'original'} ${(j?r.tile.sha256:r.original.sha256).slice(0,10)}`;
        layers.push({input:Buffer.from(`<svg width="${cell}" height="${label}"><text x="6" y="26" font-family="Helvetica" font-size="17">${text}</text></svg>`),left:x,top:y+cell});
      }
      index.push({sheet:s+1,key,ref:r.ref,model:r.model,colour:r.colour,size:r.size,original_sha256:r.original.sha256,tile_sha256:r.tile.sha256,tile_path:r.tile.path,original_path:r.original.path});
    }
    const sheet=join(root,'sheets',`sheet-${String(s+1).padStart(3,'0')}.png`);
    await sharp({create:{width:cols*cell,height:rows*(cell+label),channels:3,background:'#ffffff'}}).composite(layers).png().toFile(sheet);
  }
  await writeFile(join(root,'sheets','index.json'),JSON.stringify(index,null,1),{mode:0o600});
  return {sheets:Math.ceil(results.length/per_sheet),tiles:results.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,a,b,c]=process.argv.slice(2);
  if(command==='acquire'&&a&&b&&c)console.log(JSON.stringify(await acquireAndTile({manifest:JSON.parse(await readFile(a,'utf8')),urls:JSON.parse(await readFile(b,'utf8')),out:c,run_id:'decision-0025-'+new Date().toISOString().slice(0,10)})));
  else if(command==='sheets'&&a)console.log(JSON.stringify(await contactSheets({out:a})));
  else throw Error('Usage: node batch-official.mjs acquire MANIFEST.json URLS.json PRIVATE_OUT | sheets PRIVATE_OUT');
}
