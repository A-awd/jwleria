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
export async function acquireAndTile({manifest,urls,out,grant=longchampOwnerDirection,run_id,fetcher=fetch,pacer=createMediaPacer(),sharp=installedImageEngine(),mask_tool=null}){
  const root=await privateOutputRoot(out);
  for(const d of ['originals','tiles','cutouts'])await mkdir(join(root,d),{recursive:true,mode:0o700});
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
    await processItem({root,ledger,results,key:item.key,base:{ref:item.ref,model:item.model,colour:item.colour,size:item.size,asset_url,original:{...original}},mask_tool,sharp,run_id,limits});
    await save(root,results);
  }
  const all=Object.values(results);
  return {items:items.length,unique_originals:new Set(all.filter(r=>r.original).map(r=>r.original.sha256)).size,tiles:all.filter(r=>r.tile).length,
    quarantined:all.filter(r=>r.quarantine).reduce((a,r)=>({...a,[r.quarantine]:(a[r.quarantine]??0)+1}),{})};
}

/**
 * The ledger reason for a processing failure, from its message. A format the readers do not support is never called
 * low resolution, and an unrecognised failure is recorded as such rather than guessed.
 */
export function processingFailureReason(message){
  if(/^Unsupported image format|Unsupported original color space|must be 8-bit sRGB/i.test(message))return 'unsupported_image_format';
  if(/Insufficient source resolution/i.test(message))return 'low_resolution';
  if(/touches its source frame/i.test(message))return 'clipped_by_source';
  if(/transparency|Cutout master|mask|vision|fragment/i.test(message))return 'cutout_failed';
  return 'processing_failed';
}

// One held original -> (cutout master when needed) -> flat tile, recorded in the ledger as processed or quarantined.
// An opaque original needs the local, non-generative background-only extraction (localCutout); a native-alpha original
// is used as it is unless its own alpha carries a faint detached stray mark (strayFragmentCutout). Every master passes
// the automated cutout check before any tile, and still needs its own independent review.
async function processItem({root,ledger,results,key,base,mask_tool,sharp,run_id,limits}){
  const {original}=base;
  try{
    const dir=join(root,'cutouts');
    const cut=original.has_alpha===true?await strayFragmentCutout({original,dir,sharp}):await localCutout({original,dir,mask_tool,sharp});
    const {png,record:tile}=await normalizeFlatTile(await readFile(cut?cut.path:original.path),sharp);
    const path=join(root,'tiles',tile.tile_sha256+'.png');
    await writeFile(path,png,{mode:0o600});
    results[key]={...base,tile:{sha256:tile.tile_sha256,path,side:tile.geometry.side,changed_opaque_product_pixels:tile.changed_opaque_product_pixels,...(tile.decoding?{decoding:tile.decoding.kind}:{})},...(cut?{cutout:cut}:{})};
    await record(ledger,{key,to:'processed',evidence:{original_sha256:original.sha256,tile_sha256:tile.tile_sha256,...(cut?{cutout_sha256:cut.sha256}:{}),derivative_sha256:[tile.tile_sha256]},run_id},limits);
  }catch(error){
    const reason=processingFailureReason(error.message);
    results[key]={...base,quarantine:reason,error:error.message};
    await record(ledger,{key,to:'quarantined',reason,evidence:{original_sha256:original.sha256,error:error.message},run_id},limits);
  }
}

const sha256Of=async bytes=>(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
const cutCheck=check=>({passed:true,review_flags:check.review_flags,opaque_identical_to_original:check.product_pixels?.opaque_identical_to_original??null});

/**
 * Local mask (foreground-mask, macOS Vision) -> cutout master from the original's own pixels, with proven mask loss
 * repaired (repairEnclosedProductMask: an enclosed product region made see-through is restored to the original's own
 * pixels; real holes stay transparent) -> the automated check. A mask already computed for these exact original bytes
 * (it is named by the original's sha256) is reused, so a re-cut after a rejected review repairs the very mask that
 * produced the rejected master; the mask tool runs only when no mask is held.
 */
async function localCutout({original,dir,mask_tool,sharp}){
  const {repairedCutoutMaster,validateCutoutMaster}=await import('./cutout.mjs');
  const prefix=join(dir,original.sha256);
  let mask=await readFile(prefix+'.mask.raw').catch(()=>null);
  if(!mask){
    if(!mask_tool)throw Error('A flat tile needs a source with its own transparency, or the local mask tool');
    const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
    await promisify(execFile)(mask_tool,[original.path,prefix],{timeout:120000});
    mask=await readFile(prefix+'.mask.raw');
  }
  const {width,height}=JSON.parse(await readFile(prefix+'.mask.json','utf8'));
  const {png,repair}=await repairedCutoutMaster({original:await readFile(original.path),mask,width,height},sharp);
  const sha256=await sha256Of(png),path=join(dir,sha256+'.png');
  const producer=repair.changed?'foreground-mask (macOS Vision, local) with enclosed-region mask repair (local, deterministic)':'foreground-mask (macOS Vision, local)';
  await writeFile(path,png,{mode:0o600});
  const record_path=join(dir,sha256+'.mask-repair.json');
  if(repair.changed)await writeFile(record_path,JSON.stringify(repair,null,1),{mode:0o600});
  const check=await validateCutoutMaster({original:{path:original.path,sha256:original.sha256},cutout:{path,sha256,producer}},sharp);
  if(!check.passed)throw Error('Cutout master failed its check: '+check.failures.join(','));
  return {sha256,path,producer,mask_sha256:repair.mask_sha256,
    ...(repair.changed?{mask_repair:{restored_regions:repair.restored_regions,restored_pixels:repair.restored_pixels,repaired_mask_sha256:repair.repaired_mask_sha256,record:record_path}}:{}),check:cutCheck(check)};
}

/** A native-alpha original whose own alpha carries a faint detached stray mark: the master without it (strayFragmentMaster), checked. */
async function strayFragmentCutout({original,dir,sharp}){
  const {strayFragmentMaster,validateCutoutMaster}=await import('./cutout.mjs');
  const made=await strayFragmentMaster(await readFile(original.path),sharp);
  if(!made)return null;
  const sha256=await sha256Of(made.png),path=join(dir,sha256+'.png'),record_path=join(dir,sha256+'.stray-removal.json');
  const producer='stray-fragment removal of the source alpha (local, deterministic)';
  await writeFile(path,made.png,{mode:0o600});
  await writeFile(record_path,JSON.stringify(made.record,null,1),{mode:0o600});
  const check=await validateCutoutMaster({original:{path:original.path,sha256:original.sha256},cutout:{path,sha256,producer}},sharp);
  if(!check.passed)throw Error('Cutout master failed its check: '+check.failures.join(','));
  return {sha256,path,producer,stray_removal:{fragments:made.record.fragments.length,removed_pixels:made.record.removed_pixels,record:record_path},check:cutCheck(check)};
}
const save=(root,results)=>writeFile(join(root,'results.json'),JSON.stringify(results,null,1),{mode:0o600});

/** The review checks a rejection names as not passed, as section.check (cutout_review, tile_review). */
export function failedReviewChecks(review){
  return ['cutout_review','tile_review'].flatMap(section=>Object.entries(review?.[section]?.checks??{}).filter(([,v])=>v!==true).map(([k])=>`${section}.${k}`));
}

/**
 * Re-processes one held original through the current path, without a new download (the held file must still match its
 * sha256): after an independent reviewer rejected its cutout or tile (rejection: that review record, naming the current
 * hashes and at least one failed check), or after a processing quarantine that a code change addresses (basis says
 * which). A rejection is recorded first (processed -> quarantined visual_rejected) and the rejected hashes stay listed
 * on the item, so they can never be bundled. The ledger then walks matched -> rights_ready -> acquired (the same
 * original) -> processed or quarantined. The new files need their own new review; no earlier review carries over.
 */
export async function reprocessItem({out,key,grant,basis,rejection=null,run_id,mask_tool=null,sharp=installedImageEngine()}){
  if(!text(basis))throw Error('A re-process needs its basis');
  if(grant?.kind!=='owner_directed_official'||!text(grant.grant_reference))throw Error('A re-process needs the source\'s own grant row');
  const root=await privateOutputRoot(out),ledger=await openLedger(join(root,'ledger.ndjson'));
  const results=JSON.parse(await readFile(join(root,'results.json'),'utf8')),x=results[key];
  if(!x?.original?.path)throw Error('No held original for '+key);
  if(!key.startsWith(grant.source_id+':'))throw Error('The grant row is for another source');
  if(await sha256Of(await readFile(x.original.path))!==x.original.sha256)throw Error('The held original no longer matches its sha256');
  const limits={max_quarantined:400},rejected=[...(x.rejected??[])];
  if(rejection){
    const failed=failedReviewChecks(rejection);
    if(rejection.key!==key||!x.tile||rejection.tile_review?.tile_sha256!==x.tile.sha256||(rejection.cutout_review?.cutout_sha256??null)!==(x.cutout?.sha256??null))throw Error('The rejection must name this item\'s current cutout and tile');
    if(!failed.length)throw Error('A rejection needs at least one failed review check');
    if(ledger.state.get(key)?.to!=='processed')throw Error('Only a processed item can be rejected');
    const entry={cutout_sha256:x.cutout?.sha256??null,tile_sha256:x.tile.sha256,reviewer:rejection.tile_review?.reviewer??rejection.cutout_review?.reviewer??null,
      review_references:[rejection.cutout_review?.review_reference,rejection.tile_review?.review_reference].filter(Boolean),failed_checks:failed,status:rejection.review_status??null};
    await record(ledger,{key,to:'quarantined',reason:'visual_rejected',evidence:entry,run_id},limits);
    rejected.push(entry);
  }
  const state=ledger.state.get(key);
  if(state?.to!=='quarantined'||state.reason==='source_refused')throw Error('Only an item quarantined after its original was held can be re-processed');
  await record(ledger,{key,to:'matched',evidence:{basis,previous_quarantine:state.reason},run_id},limits);
  await record(ledger,{key,to:'rights_ready',evidence:{basis:'decision-0025 owner direction; no brand contact; no brand licence claimed',grant_reference:grant.grant_reference},run_id},limits);
  const o=x.original;
  await record(ledger,{key,to:'acquired',evidence:{original_sha256:o.sha256,asset_url:x.asset_url,bytes:o.bytes,width:o.width,height:o.height,has_alpha:o.has_alpha??null,held_original_reused:true},run_id},limits);
  await processItem({root,ledger,results,key,base:{ref:x.ref,model:x.model,colour:x.colour,size:x.size,asset_url:x.asset_url,original:{...o},...(rejected.length?{rejected}:{})},mask_tool,sharp,run_id,limits});
  await save(root,results);
  const y=results[key];
  return {key,state:ledger.state.get(key).to,...(y.quarantine?{quarantine:y.quarantine,error:y.error}:{tile_sha256:y.tile.sha256,cutout_sha256:y.cutout?.sha256??null}),rejected:rejected.length};
}

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
      index.push({sheet:s+1,key,ref:r.ref,model:r.model,colour:r.colour,size:r.size,original_sha256:r.original.sha256,tile_sha256:r.tile.sha256,tile_path:r.tile.path,original_path:r.original.path,...(r.cutout?{cutout_sha256:r.cutout.sha256,cutout_path:r.cutout.path}:{})});
    }
    const sheet=join(root,'sheets',`sheet-${String(s+1).padStart(3,'0')}.png`);
    await sharp({create:{width:cols*cell,height:rows*(cell+label),channels:3,background:'#ffffff'}}).composite(layers).png().toFile(sheet);
  }
  await writeFile(join(root,'sheets','index.json'),JSON.stringify(index,null,1),{mode:0o600});
  // A blank template for the independent reviewer: every check is null until the reviewer sets it. Code never fills it.
  const blank=keys=>Object.fromEntries(keys.map(k=>[k,null]));
  await writeFile(join(root,'sheets','review-template.json'),JSON.stringify(index.map(i=>({key:i.key,ref:i.ref,sheet:i.sheet,
    verification:{asset_sha256:i.original_sha256,verified_reference:i.ref,reviewer:null,verification_reference:null,
      checks:blank(['exact_reference','color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'])},
    ...(i.cutout_sha256?{cutout_review:{cutout_sha256:i.cutout_sha256,original_sha256:i.original_sha256,reviewer:null,review_reference:null,
      checks:blank(['background_only_removed','no_background_or_other_object_retained','whole_product_retained','edges_clean_on_frame_background','no_redrawn_or_generated_detail'])}}:{}),
    tile_review:{tile_sha256:i.tile_sha256,cutout_sha256:i.cutout_sha256??null,original_sha256:i.original_sha256,reviewer:null,review_reference:null,
      checks:blank(['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile'])}})),null,1),{mode:0o600});
  return {sheets:Math.ceil(results.length/per_sheet),tiles:results.length};
}

/**
 * Private, prepared WebP previews of each flat tile with the existing local encoder (background-composite.mjs
 * webpVariants: card widths and the 1600 detail, byte budgets and the fidelity floor). These are review inputs only:
 * they bind no candidate revision, claim no publication flag and never pass the public bundle gates, which re-encode
 * and re-check everything after the database records the route.
 */
export async function webpPreviews({out,sharp=installedImageEngine()}){
  const {webpVariants}=await import('./background-composite.mjs');
  const root=await privateOutputRoot(out),path=join(root,'previews.json');
  const results=JSON.parse(await readFile(join(root,'results.json'),'utf8'));
  const previews=JSON.parse(await readFile(path,'utf8').catch(()=>'{}'));
  for(const r of Object.values(results).filter(r=>r.tile&&!previews[r.tile.sha256])){
    const dir=join(root,'previews',r.tile.sha256);await mkdir(dir,{recursive:true,mode:0o700});
    const files=[];
    for(const v of await webpVariants(await readFile(r.tile.path),sharp)){const {bytes,...rest}=v;const file=join(dir,`${v.width}w-${v.sha256}.webp`);await writeFile(file,bytes,{mode:0o600});files.push({...rest,bytes:bytes.length,path:file});}
    previews[r.tile.sha256]={label:'private/prepared preview; not a publication bundle',ref:r.ref,original_sha256:r.original.sha256,tile_sha256:r.tile.sha256,variants:files};
    await writeFile(path,JSON.stringify(previews,null,1),{mode:0o600});
  }
  const all=Object.values(previews).flatMap(p=>p.variants);
  return {tiles:Object.keys(previews).length,files:all.length,performance_review_required:all.filter(v=>v.performance_review_required).length};
}

/** Derivative proof sheets: per item, its four prepared WebPs side by side at one display size, labelled by width and hash. */
export async function proofSheets({out,per_sheet=8,cell=300,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out);
  // Only the current tile of each item: a tile replaced after a rejected review is never shown for review again.
  const current=new Set(Object.values(JSON.parse(await readFile(join(root,'results.json'),'utf8'))).filter(r=>r.tile).map(r=>r.tile.sha256));
  const previews=Object.values(JSON.parse(await readFile(join(root,'previews.json'),'utf8'))).filter(p=>current.has(p.tile_sha256)).sort((a,b)=>a.ref<b.ref?-1:1);
  await mkdir(join(root,'proofs'),{recursive:true,mode:0o700});
  const index=[];
  for(let s=0;s*per_sheet<previews.length;s++){
    const page=previews.slice(s*per_sheet,(s+1)*per_sheet),label=40,layers=[];
    for(const [i,p] of page.entries())for(const [j,v] of p.variants.entries()){
      const x=j*cell,y=i*(cell+label);
      layers.push({input:await sharp(v.path).resize(cell,cell,{fit:'contain',background:'#ffffff'}).png().toBuffer(),left:x,top:y});
      layers.push({input:Buffer.from(`<svg width="${cell}" height="${label}"><text x="6" y="26" font-family="Helvetica" font-size="15">${p.ref} ${v.width}w ${Math.round(v.bytes/1024)}KB ${v.sha256.slice(0,8)}</text></svg>`),left:x,top:y+cell});
      index.push({sheet:s+1,ref:p.ref,tile_sha256:p.tile_sha256,width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256,ssim:v.ssim,path:v.path});
    }
    await sharp({create:{width:4*cell,height:page.length*(cell+label),channels:3,background:'#ffffff'}}).composite(layers).png().toFile(join(root,'proofs',`proof-${String(s+1).padStart(3,'0')}.png`));
  }
  await writeFile(join(root,'proofs','index.json'),JSON.stringify(index,null,1),{mode:0o600});
  return {sheets:Math.ceil(previews.length/per_sheet),files:index.length};
}

/**
 * The bundle's verification for one original: the independent visual reviewer's record, unchanged in its checks and
 * text, with the separate official-gallery identity determination attached and quoted after it, attributed to its own
 * reviewer. Neither record speaks for the other; requireVerification still decides.
 */
export function mergedVerification(visual,determination){
  if(!visual||!determination||visual.asset_sha256!==determination.asset_sha256||visual.verified_reference!==determination.reference)throw Error('Visual review and identity determination must name the same original and reference');
  if(visual.identity_determination!==undefined)throw Error('The visual review already carries an identity determination');
  const quote=` || Separate official-gallery identity determination by ${determination.reviewer} (quoted): ${determination.reason} | gallery ${determination.gallery_url} | original ${determination.asset_sha256}`;
  return {...visual,verification_reference:visual.verification_reference+quote,identity_determination:determination};
}
/** The independent derivative review gate: every derivative the bundle produced must be listed by hash with pass true. */
export function derivativeReviewProblem(review,{tile_sha256,files}){
  const item=review?.items?.find(i=>i.tile_sha256===tile_sha256);
  if(!item)return 'no derivative review for this tile';
  if(!text(review.reviewer))return 'derivative review needs its reviewer';
  const passed=new Set(item.derivatives.filter(d=>d.pass===true).map(d=>d.sha256));
  const missing=files.filter(f=>!passed.has(f.sha256));
  return missing.length?'derivatives not reviewed and passed: '+missing.map(f=>f.width+'w').join(','):null;
}
const text=value=>typeof value==='string'&&value.trim().length>0;
/**
 * Official-gallery identity determinations, one per processed original, by the implementation owner: the original was
 * downloaded from a URL byte-identical to the candidate's recorded gallery file at its full current revision (checked
 * against the live database by digest before the run). Colour and variant stay a separate visual check.
 */
const fileName=url=>decodeURIComponent(new URL(url).pathname.split('/').pop());
const namesRef=(url,ref)=>new RegExp('(^|[^a-z0-9])'+ref.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])').test(fileName(url).toLowerCase());
export async function identityDeterminations({out,revisions,checked,page_evidence=null,source_id='longchamp-official'}){
  const root=await privateOutputRoot(out),results=JSON.parse(await readFile(join(root,'results.json'),'utf8'));
  const reviewer='Claude (implementation owner; database-bound gallery check, not the visual reviewer)';
  const list=Object.entries(results).filter(([,x])=>x.tile).sort(([,a],[,b])=>a.ref<b.ref?-1:1).map(([key,x])=>{
    if(!/^[a-f0-9]{64}$/.test(revisions[x.ref]??''))throw Error('Full current revision required: '+x.ref);
    const o=x.original,reason=`The untouched original sha256 ${o.sha256} was downloaded at ${o.acquired_at} from ${x.asset_url}. That URL is byte-identical to image_urls[0] of the live candidate for reference ${x.ref} (source ${source_id}, revision ${revisions[x.ref]}), ${checked}; ${namesRef(x.asset_url,x.ref)?`the file name names ${x.ref} exactly`:`the file name names ${fileName(x.asset_url)}, not ${x.ref}: ${page_evidence??'no page evidence recorded'}`}. This settles the reference only; colour and variant remain a separate visual check. Decision 0025 owner direction; no brand licence is claimed.`;
    return {key,ref:x.ref,colour:x.colour??null,size:x.size??null,identity_determination:{basis:'official_gallery_listing',asset_sha256:o.sha256,identity_established:true,reference:x.ref,
      revision_hash:revisions[x.ref],gallery_url:x.asset_url,reviewer,reason},verification_reference_must_quote:[reviewer,reason,x.asset_url,o.sha256]};
  });
  await writeFile(join(root,'identity-determinations.json'),JSON.stringify(list,null,1),{mode:0o600});
  return {determinations:list.length};
}

/** Groups a flat per-file derivative review ({reviews:[{tile_sha256,width,sha256,reviewer,accepted}]}) by tile; values unchanged. */
export function derivativeReviewByTile(flat){
  if(!flat)return null;
  if(Array.isArray(flat.items))return flat;
  const items=new Map(),reviewers=new Set();
  for(const r of flat.reviews??[]){reviewers.add(r.reviewer);if(!items.has(r.tile_sha256))items.set(r.tile_sha256,{tile_sha256:r.tile_sha256,derivatives:[]});
    items.get(r.tile_sha256).derivatives.push({width:r.width,sha256:r.sha256,pass:r.accepted===true});}
  if(reviewers.size>1)throw Error('One derivative review file per reviewer');
  return {reviewer:[...reviewers][0]??null,items:[...items.values()]};
}
/** Whether a supplementary derivative review names this tile at all (it is optional; existing numeric gates always apply). */
export const derivativeReviewed=(review,tile_sha256)=>Boolean(review?.items?.some(i=>i.tile_sha256===tile_sha256));

/**
 * Bundles each reviewed item through the existing pipeline into its own private directory (prepareGrantedMedia with
 * the accepted tile, then approvalBundle and its connector statement). source must be the fresh database row with
 * publication_allowed already true; nothing here sets or assumes it. Writes chunked approval SQL for the operator.
 */
export async function bundleReviewed({out,reviews,determinations,derivative_review,revisions,source,public_base_url,prepared_by,grant=longchampOwnerDirection,chunk=10,dry_run=null}){
  const {prepareGrantedMedia,approvalBundle}=await import('./media-pipeline.mjs');
  const {mediaApprovalSql}=await import('./supabase.mjs');
  const {createHash}=await import('node:crypto');
  if(source?.publication_allowed!==true||source.enabled!==true||source.id!==grant.source_id)throw Error('The fresh source row must already allow publication');
  const root=await privateOutputRoot(out),results=JSON.parse(await readFile(join(root,'results.json'),'utf8'));
  const previews=JSON.parse(await readFile(join(root,'previews.json'),'utf8'));
  derivative_review=derivativeReviewByTile(derivative_review);
  // A dry run is labelled and kept apart: it uses the expected post-migration source row, never the live one.
  if(dry_run!==null&&!text(dry_run?.label))throw Error('A dry run needs its label');
  const bundles=dry_run?'bundles-prepared-dryrun':'bundles';
  const byKey=new Map(Object.entries(results)),det=new Map(determinations.map(d=>[d.key,d.identity_determination]));
  const done=[],refused=[],sql=[];
  for(const r of reviews){
    const x=byKey.get(r.key);
    try{
      if(!x?.tile||x.ref!==r.ref)throw Error('unknown or unprocessed item');
      // A file an independent reviewer rejected is never bundled, whatever review is supplied with it.
      if((x.rejected??[]).some(j=>j.tile_sha256===r.tile_review?.tile_sha256||(j.cutout_sha256!==null&&j.cutout_sha256===r.cutout_review?.cutout_sha256)))throw Error('a rejected cutout or tile is never bundled');
      if(r.tile_review?.tile_sha256!==x.tile.sha256||r.verification?.asset_sha256!==x.original.sha256)throw Error('reviews name other bytes');
      // A tile made from a cutout master carries that master through the pipeline (which re-checks it against the
      // original and rebuilds the tile from it) and needs the master's own cutout review; a native-alpha tile has neither.
      if((r.cutout_review?.cutout_sha256??null)!==(x.cutout?.sha256??null)||(r.tile_review.cutout_sha256??null)!==(x.cutout?.sha256??null))throw Error('reviews name another cutout master');
      const cutout=x.cutout?{path:x.cutout.path,sha256:x.cutout.sha256,producer:x.cutout.producer}:undefined;
      const candidate={candidate_id:createHash('sha256').update(JSON.stringify([grant.source_id,x.ref])).digest('hex'),revision_hash:revisions[x.ref],source_id:grant.source_id,
        external_id:x.ref,source_url:source.origin+'/',image_urls:[x.asset_url]};
      const asset={path:x.original.path,source_url:x.asset_url,sha256:x.original.sha256};
      const dir=join(root,bundles,x.ref);
      const prepared=await prepareGrantedMedia({source,candidate,asset,grant,output_directory:dir,tile_sha256:x.tile.sha256,...(cutout?{cutout}:{})});
      const files=[...prepared.manifest.variants,prepared.manifest.detail];
      // The bundle's derivatives must be byte-identical to the completed private previews, so every review of those
      // previews binds the uploaded bytes. A supplementary derivative review, where one exists for this tile, must pass.
      const preview=previews?.[x.tile.sha256];
      if(!preview||files.some(f=>!preview.variants.some(v=>v.width===f.width&&v.sha256===f.sha256)))throw Error('bundle derivatives differ from the completed previews');
      if(derivativeReviewed(derivative_review,x.tile.sha256)){const gate=derivativeReviewProblem(derivative_review,{tile_sha256:x.tile.sha256,files});if(gate)throw Error(gate);}
      const bundle=approvalBundle({candidate,grant,items:[{asset,manifest:prepared.manifest,verification:mergedVerification(r.verification,det.get(r.key)),tile_review:r.tile_review,...(cutout?{cutout_review:r.cutout_review}:{})}],public_base_url,prepared_by});
      await writeFile(join(dir,'approval-bundle.json'),JSON.stringify(bundle,null,1),{mode:0o600});
      sql.push(mediaApprovalSql(bundle));done.push({ref:x.ref,candidate_id:candidate.candidate_id,files:bundle.uploads.length});
    }catch(error){refused.push({key:r.key,ref:r.ref,reason:error.message});}
  }
  await mkdir(join(root,bundles),{recursive:true,mode:0o700});
  for(let i=0;i*chunk<sql.length;i++)await writeFile(join(root,bundles,`record-approvals-${String(i+1).padStart(3,'0')}.sql`),sql.slice(i*chunk,(i+1)*chunk).join('\n')+'\n',{mode:0o600});
  // A run in which every item was refused still writes its report; it has nothing to publish.
  if(done.length)await writeFile(join(root,bundles,'publish.sql'),batchPublishSql(done.map(d=>d.candidate_id))+'\n',{mode:0o600});
  await writeFile(join(root,bundles,'bundle-report.json'),JSON.stringify({...(dry_run?{dry_run}:{}),prepared_by,bundled:done,refused},null,1),{mode:0o600});
  return {bundled:done.length,files:done.reduce((n,d)=>n+d.files,0),refused:refused.length};
}

/**
 * A review proof for one item's current cutout master and tile, for the independent reviewer: a full row (original,
 * master on a checkerboard, master alpha, flat tile) and, for every region the local path changed (a restored mask
 * region or a removed stray fragment), zoomed crops of the original, the rejected master (when one exists) and the new
 * master on a checkerboard, and their alpha (a faint fragment's alpha is amplified, and labelled so). It also writes a
 * blank review record naming the exact new hashes; code never fills a check.
 */
export async function reviewProof({out,key,cell=300,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out),x=JSON.parse(await readFile(join(root,'results.json'),'utf8'))[key];
  if(!x?.tile)throw Error('No current tile for '+key);
  const label=36,text=s=>Buffer.from(`<svg width="${cell}" height="${label}"><text x="5" y="23" font-family="Helvetica" font-size="13">${s.replace(/[<&>]/g,'')}</text></svg>`);
  // Checker squares scale with the image, so they stay visible after the image is fitted to its cell.
  const checker=async(w,h)=>{const square=Math.max(6,Math.round(Math.max(w,h)/40)),raw=Buffer.alloc(w*h*3);for(let y=0;y<h;y++)for(let i=0;i<w;i++){const v=((Math.floor(i/square)+Math.floor(y/square))&1)?204:255;raw.fill(v,(y*w+i)*3,(y*w+i)*3+3);}return sharp(raw,{raw:{width:w,height:h,channels:3}}).png().toBuffer();};
  // Each cell is framed in grey, so a fully opaque (white) alpha view is not mistaken for an empty cell.
  const fit=(png,kernel='lanczos3')=>sharp(png).resize(cell-4,cell-4,{fit:'contain',kernel,background:'#ffffff'}).extend({top:2,bottom:2,left:2,right:2,background:'#888888'}).png().toBuffer();
  const region=(file,box)=>sharp(file).extract({left:box.x,top:box.y,width:box.width,height:box.height}).png().toBuffer();
  const onChecker=async png=>{const {width,height}=await sharp(png).metadata();return sharp(await checker(width,height)).composite([{input:png}]).png().toBuffer();};
  const onBlack=png=>sharp(png).flatten({background:'#000000'}).png().toBuffer();
  const alphaOf=(png,gain=1)=>sharp(png).ensureAlpha().extractChannel(3).linear(gain,0).png().toBuffer();
  const cutoutPath=sha=>join(root,'cutouts',sha+'.png');
  const rows=[];
  const master=x.cutout?.path;
  const full=[['original '+x.original.sha256.slice(0,12),await fit(await readFile(x.original.path))]];
  if(master)full.push(['master on checker '+x.cutout.sha256.slice(0,12),await fit(await onChecker(await readFile(master)))],['master alpha',await fit(await alphaOf(await readFile(master)))]);
  full.push(['flat tile '+x.tile.sha256.slice(0,12),await fit(await readFile(x.tile.path))]);
  rows.push(full);
  // The regions the local path changed, from its own records.
  const changed=[];
  if(x.cutout?.mask_repair)for(const r of JSON.parse(await readFile(x.cutout.mask_repair.record,'utf8')).restored)changed.push({kind:'restored mask region',box:r.box,gain:1});
  if(x.cutout?.stray_removal)for(const f of JSON.parse(await readFile(x.cutout.stray_removal.record,'utf8')).fragments)changed.push({kind:'removed stray fragment',box:f.box,gain:4});
  const meta=await sharp(x.original.path).metadata();
  const rejectedMaster=(x.rejected??[]).map(j=>j.cutout_sha256).filter(Boolean).at(-1)??null;
  for(const c of changed){
    const pad=Math.max(24,Math.round(Math.max(c.box.width,c.box.height)/2));
    const box={x:Math.max(0,c.box.x-pad),y:Math.max(0,c.box.y-pad)};box.width=Math.min(meta.width,c.box.x+c.box.width+pad)-box.x;box.height=Math.min(meta.height,c.box.y+c.box.height+pad)-box.y;
    const where=`${c.box.x},${c.box.y} ${c.box.width}x${c.box.height}`;
    const row=[[`original crop ${where}`,await fit(await onChecker(await region(x.original.path,box)),'nearest')]];
    if(rejectedMaster){
      const old=await region(cutoutPath(rejectedMaster),box);
      row.push([`REJECTED ${rejectedMaster.slice(0,10)} checker`,await fit(await onChecker(old),'nearest')],[`REJECTED alpha${c.gain>1?' x'+c.gain:''}`,await fit(await alphaOf(old,c.gain),'nearest')]);
    }else if(c.gain>1){
      // A faint light mark is invisible on a light checker: show the original on black as well as its amplified alpha.
      const before=await region(x.original.path,box);
      row.push([`original on black`,await fit(await onBlack(before),'nearest')],[`original alpha x${c.gain}`,await fit(await alphaOf(before,c.gain),'nearest')]);
    }
    const now=await region(master,box);
    row.push([`NEW ${x.cutout.sha256.slice(0,10)} checker`,await fit(await onChecker(now),'nearest')]);
    if(c.gain>1)row.push([`NEW on black`,await fit(await onBlack(now),'nearest')]);
    row.push([`NEW alpha${c.gain>1?' x'+c.gain:''} (${c.kind})`,await fit(await alphaOf(now,c.gain),'nearest')]);
    rows.push(row);
  }
  const columns=Math.max(...rows.map(r=>r.length)),layers=[];
  for(const [i,row] of rows.entries())for(const [j,[caption,png]] of row.entries()){
    layers.push({input:png,left:j*cell,top:i*(cell+label)},{input:text(caption),left:j*cell,top:i*(cell+label)+cell});
  }
  await mkdir(join(root,'review-proofs'),{recursive:true,mode:0o700});
  const path=join(root,'review-proofs',`${x.ref}-${x.tile.sha256.slice(0,12)}.png`);
  const png=await sharp({create:{width:columns*cell,height:rows.length*(cell+label),channels:3,background:'#ffffff'}}).composite(layers).png().toBuffer();
  await writeFile(path,png,{mode:0o600});
  const blank=keys=>Object.fromEntries(keys.map(k=>[k,null]));
  const template={key,ref:x.ref,proof:{path,sha256:await sha256Of(png)},rejected:x.rejected??[],
    ...(x.cutout?{cutout_review:{cutout_sha256:x.cutout.sha256,original_sha256:x.original.sha256,reviewer:null,review_reference:null,
      checks:blank(['background_only_removed','no_background_or_other_object_retained','whole_product_retained','edges_clean_on_frame_background','no_redrawn_or_generated_detail'])}}:{}),
    tile_review:{tile_sha256:x.tile.sha256,cutout_sha256:x.cutout?.sha256??null,original_sha256:x.original.sha256,reviewer:null,review_reference:null,
      checks:blank(['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile'])}};
  await writeFile(path.replace(/\.png$/,'.review-template.json'),JSON.stringify(template,null,1),{mode:0o600});
  return {path,sha256:template.proof.sha256,regions:changed.length,rows:rows.length};
}

/**
 * One connector statement that publishes each recorded approval onto its existing public facts row, server side: the
 * product is the stored public row with the approval's own images, so nothing is retyped and the database re-checks
 * the live grant, the source flag, the current revision and every displayed fact.
 */
export function batchPublishSql(candidate_ids){
  if(!candidate_ids.length||candidate_ids.some(id=>!/^[a-f0-9]{64}$/.test(id)))throw Error('Exact candidate ids required');
  return `select c.external_id, public.jwl_publish_candidate(c.candidate_id,c.revision_hash,to_jsonb(k)||jsonb_build_object('images',a.approved_images,'image_variants',a.approved_image_variants)) as published
from jwl_internal.candidates c
join public.jwl_catalog k on k.id=c.candidate_id and k.active
join jwl_internal.publication_approvals a on a.candidate_id=c.candidate_id and a.revision_hash=c.revision_hash and a.image_verified and a.revoked_at is null
where (exists(select 1 from jwl_internal.published_revisions p where p.catalog_id=c.candidate_id and p.revision_hash=c.revision_hash)
  or exists(select 1 from jwl_internal.factual_publications f where f.catalog_id=c.candidate_id and f.candidate_id=c.candidate_id and f.revision_hash=c.revision_hash))
  and c.candidate_id in (${candidate_ids.map(id=>`'${id}'`).join(',')}) order by c.external_id;`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,a,b,c]=process.argv.slice(2);
  if(command==='acquire'&&a&&b&&c){
    // Optional: a private grant-row JSON for another source (never Longchamp's identity) and the local mask tool path.
    const [grantFile,mask_tool]=process.argv.slice(6);
    console.log(JSON.stringify(await acquireAndTile({manifest:JSON.parse(await readFile(a,'utf8')),urls:JSON.parse(await readFile(b,'utf8')),out:c,run_id:'decision-0025-'+new Date().toISOString().slice(0,10),
      ...(grantFile?{grant:JSON.parse(await readFile(grantFile,'utf8'))}:{}),...(mask_tool?{mask_tool}:{})})));
  }
  else if(command==='bundle'&&a){
    // a: private input {out, review_files[], determinations_file, derivative_review_file, revisions_file, source, public_base_url, prepared_by}
    const i=JSON.parse(await readFile(a,'utf8')),load=async p=>JSON.parse(await readFile(p,'utf8'));
    const reviews=(await Promise.all(i.review_files.map(load))).flat();
    console.log(JSON.stringify(await bundleReviewed({out:i.out,reviews,determinations:await load(i.determinations_file),derivative_review:i.derivative_review_file?await load(i.derivative_review_file):null,
      revisions:await load(i.revisions_file),source:i.source,public_base_url:i.public_base_url,prepared_by:i.prepared_by,dry_run:i.dry_run??null,
      ...(i.grant_file?{grant:await load(i.grant_file)}:{})})));
  }
  else if(command==='reprocess'&&a){
    // a: private input {out, key, basis, grant_file (absent: Longchamp's own row), rejection_file (a review list), mask_tool}
    const i=JSON.parse(await readFile(a,'utf8')),load=async p=>JSON.parse(await readFile(p,'utf8'));
    const rejection=i.rejection_file?(await load(i.rejection_file)).find(r=>r.key===i.key)??null:null;
    if(i.rejection_file&&!rejection)throw Error('The review file has no record for '+i.key);
    console.log(JSON.stringify(await reprocessItem({out:i.out,key:i.key,basis:i.basis,grant:i.grant_file?await load(i.grant_file):longchampOwnerDirection,rejection,
      run_id:'reprocess-'+new Date().toISOString().slice(0,10),mask_tool:i.mask_tool??null})));
  }
  else if(command==='review-proof'&&a&&b)console.log(JSON.stringify(await reviewProof({out:a,key:b})));
  else if(command==='identity'&&a&&b&&c)console.log(JSON.stringify(await identityDeterminations({out:a,revisions:JSON.parse(await readFile(b,'utf8')),checked:c,page_evidence:process.argv[6]||null,...(process.argv[7]?{source_id:process.argv[7]}:{})})));
  else if(command==='proofs'&&a)console.log(JSON.stringify(await proofSheets({out:a})));
  else if(command==='previews'&&a)console.log(JSON.stringify(await webpPreviews({out:a})));
  else if(command==='sheets'&&a)console.log(JSON.stringify(await contactSheets({out:a})));
  else throw Error('Usage: node batch-official.mjs acquire MANIFEST.json URLS.json PRIVATE_OUT | sheets PRIVATE_OUT');
}
