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
  // A blank template for the independent reviewer: every check is null until the reviewer sets it. Code never fills it.
  const blank=keys=>Object.fromEntries(keys.map(k=>[k,null]));
  await writeFile(join(root,'sheets','review-template.json'),JSON.stringify(index.map(i=>({key:i.key,ref:i.ref,sheet:i.sheet,
    verification:{asset_sha256:i.original_sha256,verified_reference:i.ref,reviewer:null,verification_reference:null,
      checks:blank(['exact_reference','color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'])},
    tile_review:{tile_sha256:i.tile_sha256,cutout_sha256:null,original_sha256:i.original_sha256,reviewer:null,review_reference:null,
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
  const previews=Object.values(JSON.parse(await readFile(join(root,'previews.json'),'utf8'))).sort((a,b)=>a.ref<b.ref?-1:1);
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
export async function identityDeterminations({out,revisions,checked,page_evidence=null}){
  const root=await privateOutputRoot(out),results=JSON.parse(await readFile(join(root,'results.json'),'utf8'));
  const reviewer='Claude (implementation owner; database-bound gallery check, not the visual reviewer)';
  const list=Object.entries(results).filter(([,x])=>x.tile).sort(([,a],[,b])=>a.ref<b.ref?-1:1).map(([key,x])=>{
    if(!/^[a-f0-9]{64}$/.test(revisions[x.ref]??''))throw Error('Full current revision required: '+x.ref);
    const o=x.original,reason=`The untouched original sha256 ${o.sha256} was downloaded at ${o.acquired_at} from ${x.asset_url}. That URL is byte-identical to image_urls[0] of the live candidate for reference ${x.ref} (source longchamp-official, revision ${revisions[x.ref]}), ${checked}; ${namesRef(x.asset_url,x.ref)?`the file name names ${x.ref} exactly`:`the file name names ${fileName(x.asset_url)}, not ${x.ref}: ${page_evidence??'no page evidence recorded'}`}. This settles the reference only; colour and variant remain a separate visual check. Decision 0025 owner direction; no brand licence is claimed.`;
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
      if(r.tile_review?.tile_sha256!==x.tile.sha256||r.verification?.asset_sha256!==x.original.sha256)throw Error('reviews name other bytes');
      const candidate={candidate_id:createHash('sha256').update(JSON.stringify([grant.source_id,x.ref])).digest('hex'),revision_hash:revisions[x.ref],source_id:grant.source_id,
        external_id:x.ref,source_url:source.origin+'/',image_urls:[x.asset_url]};
      const asset={path:x.original.path,source_url:x.asset_url,sha256:x.original.sha256};
      const dir=join(root,bundles,x.ref);
      const prepared=await prepareGrantedMedia({source,candidate,asset,grant,output_directory:dir,tile_sha256:x.tile.sha256});
      const files=[...prepared.manifest.variants,prepared.manifest.detail];
      // The bundle's derivatives must be byte-identical to the completed private previews, so every review of those
      // previews binds the uploaded bytes. A supplementary derivative review, where one exists for this tile, must pass.
      const preview=previews?.[x.tile.sha256];
      if(!preview||files.some(f=>!preview.variants.some(v=>v.width===f.width&&v.sha256===f.sha256)))throw Error('bundle derivatives differ from the completed previews');
      if(derivativeReviewed(derivative_review,x.tile.sha256)){const gate=derivativeReviewProblem(derivative_review,{tile_sha256:x.tile.sha256,files});if(gate)throw Error(gate);}
      const bundle=approvalBundle({candidate,grant,items:[{asset,manifest:prepared.manifest,verification:mergedVerification(r.verification,det.get(r.key)),tile_review:r.tile_review}],public_base_url,prepared_by});
      await writeFile(join(dir,'approval-bundle.json'),JSON.stringify(bundle,null,1),{mode:0o600});
      sql.push(mediaApprovalSql(bundle));done.push({ref:x.ref,candidate_id:candidate.candidate_id,files:bundle.uploads.length});
    }catch(error){refused.push({key:r.key,ref:r.ref,reason:error.message});}
  }
  await mkdir(join(root,bundles),{recursive:true,mode:0o700});
  for(let i=0;i*chunk<sql.length;i++)await writeFile(join(root,bundles,`record-approvals-${String(i+1).padStart(3,'0')}.sql`),sql.slice(i*chunk,(i+1)*chunk).join('\n')+'\n',{mode:0o600});
  await writeFile(join(root,bundles,'publish.sql'),batchPublishSql(done.map(d=>d.candidate_id))+'\n',{mode:0o600});
  await writeFile(join(root,bundles,'bundle-report.json'),JSON.stringify({...(dry_run?{dry_run}:{}),prepared_by,bundled:done,refused},null,1),{mode:0o600});
  return {bundled:done.length,files:done.reduce((n,d)=>n+d.files,0),refused:refused.length};
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
  if(command==='acquire'&&a&&b&&c)console.log(JSON.stringify(await acquireAndTile({manifest:JSON.parse(await readFile(a,'utf8')),urls:JSON.parse(await readFile(b,'utf8')),out:c,run_id:'decision-0025-'+new Date().toISOString().slice(0,10)})));
  else if(command==='bundle'&&a){
    // a: private input {out, review_files[], determinations_file, derivative_review_file, revisions_file, source, public_base_url, prepared_by}
    const i=JSON.parse(await readFile(a,'utf8')),load=async p=>JSON.parse(await readFile(p,'utf8'));
    const reviews=(await Promise.all(i.review_files.map(load))).flat();
    console.log(JSON.stringify(await bundleReviewed({out:i.out,reviews,determinations:await load(i.determinations_file),derivative_review:i.derivative_review_file?await load(i.derivative_review_file):null,
      revisions:await load(i.revisions_file),source:i.source,public_base_url:i.public_base_url,prepared_by:i.prepared_by,dry_run:i.dry_run??null})));
  }
  else if(command==='identity'&&a&&b&&c)console.log(JSON.stringify(await identityDeterminations({out:a,revisions:JSON.parse(await readFile(b,'utf8')),checked:c,page_evidence:process.argv[6]??null})));
  else if(command==='proofs'&&a)console.log(JSON.stringify(await proofSheets({out:a})));
  else if(command==='previews'&&a)console.log(JSON.stringify(await webpPreviews({out:a})));
  else if(command==='sheets'&&a)console.log(JSON.stringify(await contactSheets({out:a})));
  else throw Error('Usage: node batch-official.mjs acquire MANIFEST.json URLS.json PRIVATE_OUT | sheets PRIVATE_OUT');
}
