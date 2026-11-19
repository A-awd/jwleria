import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {prepareResponsiveMedia,installedImageEngine,privateOutputRoot} from './responsive-media.mjs';
import {approvalBundle} from './media-pipeline.mjs';
import {mediaApprovalSql} from './supabase.mjs';
import {derivedRecord,rebindSql} from './bind-frozen.mjs';
import {mergedVerification,batchPublishSql} from './batch-official.mjs';
import {cutoutReviewChecks} from './cutout.mjs';
import {flatTileReviewChecks} from './flat-tile.mjs';
import {resolutionProblem} from './background-composite.mjs';

// Decision 0027 runner: one resumable path for any official source whose exact original is already held. A product whose
// background-only cutout failed or was rejected is published as its exact, complete official original: no treatment, no
// crop, no enlargement, no colour change (prepareResponsiveMedia without a treatment). The runner never acquires, reviews
// or records anything. It prepares derivatives, draws one review sheet of the exact final bytes, and, after an
// independent review accepts those exact files, builds the existing approval bundle, record statement and (only when the
// live revision differs) re-bind statement, and a ready manifest for deliver-ready.mjs. Plans and outputs stay private.

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const once={flag:'wx',mode:0o600};
const verificationChecks=['exact_reference','color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'];
const identityReviewer='Claude (implementation owner; database-bound gallery check, not the visual reviewer)';
// Decision 0027: exact public references held after foreground measurement in the retained LOEWE ledgers and reviews.
// Pin the reference, not the rejected file hash, so a different original cannot silently clear the hold.
const loeweLowResolutionRefs=new Set(`
A510P88X26-3969 A510P88X41-5544 A510P88X43-1160 A510P88X43-8130 A510P88X49-1100
A510P88X49-2530 A510P88X60-0018 A510P88X60-1100 A510P88X60-1769 A510P88X60-3170
A510P88X60-5541 A510PLIX04-1100 A510PLIX04-8160 A510PLIX04-9190 A510PLIX18-0018
AN01NSBX01-1102 AORGSEMX02-0094 AORGSEMX06-1100 C039U96X01-1100 C039U96X02-6423
C510302X16-1220 C510302X23-0362 C510302X23-3606 C510501X14-1100 C510501X14-1220
C510501X15-0623 C510501X18-0362 C510501X18-1100 C510501X18-1220 C510501X18-3606
C510501X20-1220 C510W73X16-1100 C510W73X16-3606 C565501X05-1100 C565R41X04-1220 C565R41X04-4160
C565R41X05-1100 C643302X37-0095 C643501X23-0095 C643501X23-0692 C643W73X11-1100
C660302X05-1100 C660302X05-1110 C660501X03-1100 C660501X03-1110 C660R41X02-0362
C660R41X02-1100 C660R41X02-1110 C660R41X02-4160 C660R41X02-5544 C660TR2X04-1110
C779302X02-1100 C779302X02-1220 C779302X02-6579 C779501X01-1100 C779501X01-1220
C779501X01-3969 C779501X01-6579 C779W73X01-1100 C779W73X01-3969 CPBPR12X01-2586
CPBPR12X02-1100
`.trim().split(/\s+/));

function hasLowResolutionHold(plan,item){
  if(plan.source.id!=='loewe-official')return false;
  return loeweLowResolutionRefs.has(item.candidate.external_id?.toUpperCase())||
    loeweLowResolutionRefs.has(item.ref?.toUpperCase())||item.quarantine==='low_resolution'||
    /\blow_resolution\b|insufficient source resolution/i.test(item.reason??'');
}

async function requireReviewedForeground(plan,item,review,prepared){
  if(!hasLowResolutionHold(plan,item))return;
  const measurement=review?.foreground_measurement,box=measurement?.box;
  if(measurement?.reference!==item.ref||item.ref!==item.candidate.external_id||
    measurement?.original_sha256!==item.asset.sha256||prepared.original_sha256!==item.asset.sha256||
    measurement?.reviewer!==review.reviewer||!measurement?.review_reference?.trim()||
    !box||![box.left,box.top,box.width,box.height].every(Number.isSafeInteger)||
    box.left<0||box.top<0||box.width<1||box.height<1){
    throw Error('LOEWE low-resolution hold requires this reviewer’s exact original native product foreground box');
  }
  const original=await readFile(item.asset.path);
  if(sha256(original)!==item.asset.sha256)throw Error('The measured original bytes differ');
  const metadata=await installedImageEngine()(original,{failOn:'warning',limitInputPixels:60000000}).metadata();
  const rotated=metadata.orientation>=5&&metadata.orientation<=8;
  const width=rotated?metadata.height:metadata.width,height=rotated?metadata.width:metadata.height;
  if(box.left+box.width>width||box.top+box.height>height)throw Error('The reviewed foreground box is outside the native original');
  const problem=resolutionProblem(box);
  if(problem)throw Error(problem);
}
const filesOf=manifest=>[...manifest.variants,manifest.detail].filter((f,i,all)=>all.findIndex(o=>o.width===f.width)===i).sort((a,b)=>a.width-b.width);

/** The exact-asset derivative input prepareResponsiveMedia binds, from a plan item and the source's grant row. A tile option
 * adds the existing flat-tile treatment, which re-derives the tile from the checked cutout and requires the accepted hash. */
function preparedInput({plan,item,option='original'}){
  const g=plan.grant,s=plan.source,c=item.candidate,a=item.asset;
  return {purpose:'catalog',output_directory:join(plan.out,'media'),
    source:{id:s.id,origin:s.origin,media_origins:s.media_origins,media_permission_reference:g.grant_reference,publication_allowed:true},
    candidate:{source_id:c.source_id,candidate_id:c.candidate_id,revision_hash:c.revision_hash,external_id:c.external_id,source_url:c.source_url,image_urls:c.image_urls},
    asset:{source_url:a.source_url,sha256:a.sha256,path:a.path},
    grant:{kind:g.kind,media_permission_reference:g.grant_reference,source_id:s.id,candidate_id:c.candidate_id,revision_hash:c.revision_hash,asset_source_url:a.source_url,asset_sha256:a.sha256,
      website_publication:g.website_publication,resize:g.resize,webp_encode:g.webp_encode,background_removal:g.background_removal},
    ...(option==='tile'?{treatment:{kind:'flat_tile',cutout:{path:item.tile.cutout_path,sha256:item.tile.cutout_sha256},tile_sha256:item.tile.tile_sha256}}:{})};
}
const optionsOf=item=>item.options??[item.choice??'original'];
const journalOf=async out=>(await readFile(join(out,'journal.ndjson'),'utf8').catch(()=>'')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(e=>e.state==='prepared').map(e=>({...e,option:e.option??e.choice??'original'}));

/**
 * Prepares each planned option of each product once (write-once files) and journals it; a prepared option is skipped on
 * resume. 'original' is the exact official original without treatment; 'tile' is the held flat tile through the existing
 * flat-tile treatment, offered only where the batch made one.
 */
export async function prepareOriginals({plan}){
  const out=await privateOutputRoot(plan.out);await mkdir(out,{recursive:true,mode:0o700});
  const journal=join(out,'journal.ndjson');
  const done=new Map((await journalOf(out)).map(e=>[e.key+'|'+e.option+'|'+e.revision_hash,e]));
  const prepared=[];
  for(const item of plan.items)for(const option of optionsOf(item)){
    if(!['original','tile'].includes(option)||(option==='tile'&&!item.tile))throw Error('Unknown or unavailable option for '+item.ref+': '+option);
    const seen=done.get(item.key+'|'+option+'|'+item.candidate.revision_hash);
    if(seen){prepared.push(seen);continue;}
    const {manifest_path,manifest}=await prepareResponsiveMedia(preparedInput({plan,item,option}));
    const entry={at:new Date().toISOString(),key:item.key,ref:item.ref,state:'prepared',option,choice:option,reason:item.reason,binding:item.binding??'exact',
      candidate_id:item.candidate.candidate_id,revision_hash:item.candidate.revision_hash,original_sha256:item.asset.sha256,manifest_path,
      ...(option==='tile'?{cutout_sha256:item.tile.cutout_sha256,tile_sha256:item.tile.tile_sha256}:{}),
      performance_review_required:manifest.performance_review_required,files:filesOf(manifest).map(f=>({width:f.width,height:f.height,bytes:f.bytes,sha256:f.sha256,quality:f.webp_quality,ssim:f.ssim_luma,path:join(out,'media',f.path)}))};
    await appendFile(journal,JSON.stringify(entry)+'\n',{mode:0o600});
    prepared.push(entry);
  }
  return prepared;
}

/**
 * One review sheet of the exact final bytes, at most four products per page. Per product, one row per prepared option:
 * the tile option shows its cutout on a checkerboard, its alpha and the tile, then every derivative; the original option
 * shows the untouched original, then every derivative. Each derivative is drawn 320 px wide (the 320w file 1:1, wider
 * files reduced for display), labelled by width, bytes and hash, with every full hash in the index. A blank review
 * template names the exact files of each option; code never fills a decision.
 */
export async function reviewSheet({plan,prepared,name='sheet',per_sheet=4,cell=320,sharp=installedImageEngine()}){
  const out=await privateOutputRoot(plan.out),dir=join(out,'sheets');await mkdir(dir,{recursive:true,mode:0o700});
  const byKey=new Map(plan.items.map(i=>[i.key,i])),label=44,head=30,index=[],sheets=[];
  const text=(s,w,h,size=14)=>Buffer.from(`<svg width="${w}" height="${h}"><text x="5" y="${size+3}" font-family="Helvetica" font-size="${size}">${String(s).replace(/[<&>]/g,'')}</text></svg>`);
  const square=Math.max(6,Math.round(cell/30)),checker=Buffer.alloc(cell*cell*3);
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)checker.fill(((Math.floor(x/square)+Math.floor(y/square))&1)?204:255,(y*cell+x)*3,(y*cell+x)*3+3);
  const products=[...new Set(prepared.map(p=>p.key))].map(key=>({key,sets:prepared.filter(p=>p.key===key).sort((a,b)=>(a.option==='tile'?0:1)-(b.option==='tile'?0:1))}));
  for(let s=0;s*per_sheet<products.length;s++){
    const page=products.slice(s*per_sheet,(s+1)*per_sheet),layers=[];let y=0,width=0;
    for(const [n,product] of page.entries()){
      const item=byKey.get(product.key);
      layers.push({input:text(`#${s*per_sheet+n+1} ${item.ref} · ${item.model??''} · ${item.colour??''} · options: ${product.sets.map(p=>p.option).join(' / ')} · original ${item.asset.sha256.slice(0,12)}`,5*cell,head,15),left:0,top:y});y+=head;
      for(const p of product.sets){
        const cells=[];
        if(p.option==='tile'){
          const fit=async file=>sharp(file).resize(cell,cell,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
          cells.push({kind:'tile:cutout',png:await sharp(checker,{raw:{width:cell,height:cell,channels:3}}).composite([{input:await fit(item.tile.cutout_path)}]).png().toBuffer(),lines:[`cutout ${item.tile.cutout_sha256.slice(0,10)} on checker`,'reduced for display'],sha256:item.tile.cutout_sha256});
          cells.push({kind:'tile:alpha',png:await sharp(item.tile.cutout_path).ensureAlpha().extractChannel(3).resize(cell,cell,{fit:'contain',background:'#000000'}).png().toBuffer(),lines:['cutout alpha (white = kept)','reduced for display'],sha256:item.tile.cutout_sha256});
          cells.push({kind:'tile:frame',png:await sharp(item.tile.tile_path).resize({width:cell,kernel:'lanczos3'}).png().toBuffer(),lines:[`TILE ${item.tile.tile_sha256.slice(0,10)}`,'flat tile, reduced for display'],sha256:item.tile.tile_sha256});
        }else{
          const meta=await sharp(item.asset.path).metadata();
          cells.push({kind:'original',png:await sharp(item.asset.path).autoOrient().resize({width:cell,kernel:'lanczos3'}).png().toBuffer(),lines:[`ORIGINAL ${item.asset.sha256.slice(0,10)} · ${meta.width}x${meta.height}`,'reduced to 320 wide for display'],sha256:item.asset.sha256});
        }
        for(const f of p.files)cells.push({kind:`${p.option}:${f.width}w`,png:f.width===cell?await readFile(f.path):await sharp(f.path).resize({width:cell,kernel:'lanczos3'}).png().toBuffer(),
          lines:[`${p.option} ${f.width}w ${f.sha256.slice(0,10)} · ${f.bytes} B`,`q${f.quality} · ssim ${f.ssim} · ${f.width===cell?'1:1':'reduced'}`],sha256:f.sha256});
        let rowH=0;for(const c of cells){const m=await sharp(c.png).metadata();rowH=Math.max(rowH,m.height);}
        for(const [i,c] of cells.entries()){
          layers.push({input:c.png,left:i*cell,top:y},{input:text(c.lines[0],cell,22,13),left:i*cell,top:y+rowH},{input:text(c.lines[1],cell,22,13),left:i*cell,top:y+rowH+20});
          index.push({sheet:s+1,ref:item.ref,option:p.option,cell:c.kind,sha256:c.sha256});
        }
        width=Math.max(width,cells.length*cell);y+=rowH+label;
      }
    }
    const path=join(dir,`${name}-${String(s+1).padStart(3,'0')}.png`);
    // The header line is drawn five cells wide, so a set with fewer files still fits on the page.
    await sharp({create:{width:Math.max(width,5*cell),height:y,channels:3,background:'#ffffff'}}).composite(layers).png().toFile(path);
    sheets.push({path,sha256:sha256(await readFile(path))});
  }
  await writeFile(join(dir,`${name}-index.json`),JSON.stringify({sheets,cells:index},null,1),{mode:0o600});
  const blank=keys=>Object.fromEntries(keys.map(k=>[k,null]));
  await writeFile(join(dir,`${name}-review-template.json`),JSON.stringify(products.map(({key,sets})=>{const item=byKey.get(key),tile=sets.find(p=>p.option==='tile');
    return {key,ref:item.ref,options:sets.map(p=>p.option),decision:null,accepted:null,reviewer:null,reviewed_at:null,files:null,
      files_by_option:Object.fromEntries(sets.map(p=>[p.option,p.files.map(f=>({width:f.width,sha256:f.sha256}))])),
      verification:{asset_sha256:item.asset.sha256,verified_reference:item.ref,reviewer:null,verification_reference:null,checks:blank(verificationChecks)},
      ...(!plan.primary&&sets.some(p=>p.option==='original')&&hasLowResolutionHold(plan,item)?{
        foreground_measurement:{reference:item.ref,original_sha256:item.asset.sha256,reviewer:null,review_reference:null,
          box:blank(['left','top','width','height'])},
      }:{}),
      ...(tile?{cutout_review:{cutout_sha256:item.tile.cutout_sha256,original_sha256:item.asset.sha256,reviewer:null,review_reference:null,checks:blank(cutoutReviewChecks)},
        tile_review:{tile_sha256:item.tile.tile_sha256,cutout_sha256:item.tile.cutout_sha256,original_sha256:item.asset.sha256,reviewer:null,review_reference:null,checks:blank(flatTileReviewChecks)}}:{})};}),null,1),{mode:0o600});
  return sheets;
}

/** The option an accepted review chose: a combined review names 'tile' or 'original'; an earlier one says 'accepted'. */
const chosenOption=review=>['tile','original'].includes(review?.decision)?review.decision:review?.decision==='accepted'?(review.choice??'original'):null;
/** The accepted review of exactly the chosen option's files, or why not. */
function acceptanceProblem(review,prepared){
  const option=chosenOption(review);
  if(!review||review.accepted!==true||!option||typeof review.reviewer!=='string'||!review.reviewer.trim())return 'no accepted review';
  if(/claude/i.test(review.reviewer)||/claude/i.test(review.verification?.reviewer??''))return 'the batch writer cannot review';
  if((prepared.option??'original')!==option)return 'the review chose another option';
  const want=prepared.files.map(f=>f.width+':'+f.sha256).join(','),got=(review.files??[]).map(f=>f.width+':'+f.sha256).join(',');
  if(want!==got)return 'the review does not name exactly the prepared files';
  if(review.verification?.asset_sha256!==prepared.original_sha256||review.verification?.verified_reference!==prepared.ref)return 'the verification does not name this original and reference';
  if(verificationChecks.some(k=>review.verification.checks?.[k]!==true))return 'a verification check is not true';
  if(option==='tile'){
    if(review.cutout_review?.cutout_sha256!==prepared.cutout_sha256||cutoutReviewChecks.some(k=>review.cutout_review.checks?.[k]!==true))return 'the cutout review does not accept this exact cutout';
    if(review.tile_review?.tile_sha256!==prepared.tile_sha256||flatTileReviewChecks.some(k=>review.tile_review.checks?.[k]!==true))return 'the tile review does not accept this exact tile';
  }
  return null;
}

/**
 * Binds accepted products. Per item: the option its review chose; the exact revision (the live one when it already
 * carries the downloaded file, or the derivedRecord of the live row and the saved official record, which then needs the
 * existing re-bind statement); derivatives re-prepared for that exact revision must equal the reviewed bytes; then the
 * existing approval bundle (with the cutout and tile reviews for a tile) and record statement. Writes once into a new
 * private directory, in deliver-ready.mjs's ready-manifest layout.
 */
export async function bindOriginals({plan,reviews,live,saved=new Map(),public_base_url,prepared_by,owner_instruction,collection_label,out,chunk=10}){
  const journal=await journalOf(plan.out);
  const liveRows=new Map(live.map(r=>[r.external_id,r])),reviewed=new Map(reviews.map(r=>[r.key??r.ref,r]));
  await mkdir(join(out,'bundles'),{recursive:true,mode:0o700});await mkdir(join(out,'rebind'),{mode:0o700});
  const bound=[],refused=[];
  for(const item of plan.items){
    try{
      const review=reviewed.get(item.key)??reviewed.get(item.ref),option=chosenOption(review),now=liveRows.get(item.ref);
      const prepared=journal.find(e=>e.key===item.key&&e.option===option);
      if(!prepared||!now)throw Error(review?'a prepared set or live row is missing':'no review');
      const problem=acceptanceProblem(review,prepared);if(problem)throw Error(problem);
      if(option==='original')await requireReviewedForeground(plan,item,review,prepared);
      const current=now.revision_hash===item.candidate.revision_hash&&now.content?.image_urls?.includes(item.asset.source_url);
      const record=current?{...now.content,candidate_id:now.candidate_id,revision_hash:now.revision_hash,source_id:now.source_id,external_id:now.external_id}
        :derivedRecord({live:now,saved:saved.get(item.ref)??(()=>{throw Error('no saved record');})()});
      if(!record.image_urls.includes(item.asset.source_url))throw Error('the downloaded file is not in the bound revision gallery');
      const exact={...item,candidate:{...item.candidate,revision_hash:record.revision_hash,image_urls:record.image_urls,source_url:record.source_url??item.candidate.source_url}};
      // Prepared for this very revision: reuse its frozen manifest and files (each re-hashed where it lies), never
      // re-encoding. A provisional binding is re-derived for the exact revision and must reproduce the reviewed bytes.
      let manifest;
      if(prepared.revision_hash===record.revision_hash){
        manifest=JSON.parse(await readFile(prepared.manifest_path,'utf8'));
        for(const f of prepared.files){const bytes=await readFile(f.path);if(sha256(bytes)!==f.sha256||bytes.length!==f.bytes)throw Error('a prepared file changed: '+f.width+'w');}
      }else manifest=(await prepareResponsiveMedia(preparedInput({plan,item:exact,option}))).manifest;
      const files=filesOf(manifest);
      if(files.map(f=>f.width+':'+f.sha256).join(',')!==prepared.files.map(f=>f.width+':'+f.sha256).join(','))throw Error('the exact-revision derivatives differ from the reviewed bytes');
      const o=item.asset;
      const reason=`The untouched original sha256 ${o.sha256} was downloaded from ${o.source_url}. That URL is byte-identical to image_urls[${record.image_urls.indexOf(o.source_url)}] of the candidate revision ${record.revision_hash} for reference ${item.ref} (source ${record.source_id})${current?', the live revision':`, which is the live revision ${now.revision_hash} with only its image_urls and image_reference_checks taken from the ${collection_label} record`}. ${o.source_url.includes(`/${item.ref}/`)?`The file path names the reference directory /${item.ref}/.`:'The file path does not name the reference directory.'} This settles the reference only; colour and variant remain a separate visual check. Decision 0025 owner direction; no brand licence is claimed. ${option==='tile'?'Decision 0027: the independently accepted flat tile of this original is shown.':`Decision 0027: the exact official original is shown without treatment because its background-only cutout ${item.reason}.`}`;
      const verification=mergedVerification(review.verification,{basis:'official_gallery_listing',asset_sha256:o.sha256,identity_established:true,reference:item.ref,revision_hash:record.revision_hash,gallery_url:o.source_url,reviewer:identityReviewer,reason});
      const bundle=approvalBundle({candidate:record,grant:plan.grant,items:[{asset:{path:o.path,source_url:o.source_url,sha256:o.sha256},manifest,verification,
        ...(option==='tile'?{cutout_review:review.cutout_review,tile_review:review.tile_review}:{})}],public_base_url,prepared_by});
      await mkdir(join(out,'bundles',item.ref),{mode:0o700});
      await writeFile(join(out,'bundles',item.ref,'approval-bundle.json'),JSON.stringify(bundle,null,1),once);
      const byHash=new Map(files.map(f=>[f.sha256,join(plan.out,'media',f.path)]));
      // A plan item that replaces a kept (unrevoked) approval at the same revision is recorded through the existing
      // jwl_record_presentation_approval, which replaces it and accepts evidence without a treatment; the plain
      // jwl_record_media_approval never replaces. The arguments are the same.
      let sql=mediaApprovalSql(bundle);
      if(item.replaces_approval===true){
        if(!current)throw Error('a replacement keeps its revision');
        const plain='select public.jwl_record_media_approval(',kept='select public.jwl_record_presentation_approval(';
        if(sql.startsWith(plain))sql=kept+sql.slice(plain.length);else if(!sql.startsWith(kept))throw Error('unexpected record statement');
      }
      bound.push({ref:item.ref,option,candidate_id:record.candidate_id,from_revision:now.revision_hash,revision_hash:record.revision_hash,record,rebind:!current,sql,
        uploads:bundle.uploads.map(u=>{const e=bundle.evidence.find(x=>x.public_sha256===u.sha256);return {x_jwl_path:u.path,file:byHash.get(u.sha256),sha256:u.sha256,bytes:u.bytes,width:e.width,height:e.height,public_url:e.public_url};})});
    }catch(error){refused.push({ref:item.ref,reason:error.message});}
  }
  const items=[];
  for(let i=0;i*chunk<bound.length;i++){
    const part=bound.slice(i*chunk,(i+1)*chunk),n=String(i+1).padStart(3,'0'),recordFile=join(out,'bundles',`record-approvals-${n}.sql`);
    await writeFile(recordFile,part.map(b=>b.sql).join('\n')+'\n',once);
    const rebinds=part.filter(b=>b.rebind),rebindFile=rebinds.length?join(out,'rebind',`rebind-${n}.sql`):null;
    if(rebindFile)await writeFile(rebindFile,rebindSql(rebinds,owner_instruction)+'\n',once);
    part.forEach((b,k)=>items.push({ref:b.ref,model:b.ref.replace(/-[0-9]{4}$/,''),batch_dir:join(out,'bundles'),candidate_id:b.candidate_id,revision_hash:b.revision_hash,
      record_sql:{file:recordFile,line:k+1,sha256:sha256(b.sql)},rebind_sql:b.rebind?rebindFile:null,state:'prepared',uploads:b.uploads}));
  }
  if(bound.length)await writeFile(join(out,'bundles','publish.sql'),batchPublishSql(bound.map(b=>b.candidate_id))+'\n',once);
  const base=new URL(public_base_url.replace(/\/?$/,'/'));
  const manifest={generated_at:new Date().toISOString(),grant_reference:plan.grant.grant_reference,public_base:base.href,upload_endpoint:new URL('/functions/v1/jwl-media-upload',base).href,
    counts:{items:items.length,files:items.reduce((n,x)=>n+x.uploads.length,0),bytes:items.reduce((n,x)=>n+x.uploads.reduce((m,u)=>m+u.bytes,0),0),refused:refused.length,delivered:0,recorded:0},items,refused};
  await writeFile(join(out,'ready-manifest.json'),JSON.stringify(manifest,null,1),once);
  return {...manifest.counts,refused,rebind:bound.filter(b=>b.rebind).map(b=>b.ref)};
}

/**
 * Supplemental photographs of one product whose primary is already approved and published (decision 0027): one approval
 * of the same revision whose images are the primary's exact reviewed files first, then each accepted supplemental, built
 * by the existing approvalBundle from one item per asset and recorded through jwl_record_presentation_approval, which
 * replaces the kept approval. The primary is never re-encoded: its derivatives are re-derived for the same revision and
 * must equal its journal. Only the supplemental files are listed for upload; the primary's files are already stored.
 */
export async function bindSupplements({plan,reviews,live,public_base_url,prepared_by,performance_exception=null,out}){
  const primaryPlan=await load(plan.primary.plan);
  const pItem=primaryPlan.items.find(i=>i.key===plan.primary.key);
  const pJournal=(await readFile(join(primaryPlan.out,'journal.ndjson'),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).find(e=>e.key===pItem.key&&e.state==='prepared');
  const sJournal=new Map((await readFile(join(plan.out,'journal.ndjson'),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(e=>e.state==='prepared').map(e=>[e.key,e]));
  const reviewed=new Map(reviews.map(r=>[r.key??r.ref,r])),now=live.find(r=>r.external_id===pItem.ref);
  if(!pJournal||!now)throw Error('the primary set or its live row is missing');
  if(now.revision_hash!==pItem.candidate.revision_hash)throw Error('the live revision is not the primary approval revision');
  const record={...now.content,candidate_id:now.candidate_id,revision_hash:now.revision_hash,source_id:now.source_id,external_id:now.external_id};
  const accepted=plan.items.filter(i=>!acceptanceProblem(reviewed.get(i.key),sJournal.get(i.key)??{files:[]}));
  const skipped=plan.items.filter(i=>!accepted.includes(i)).map(i=>({key:i.key,reason:acceptanceProblem(reviewed.get(i.key),sJournal.get(i.key)??{files:[]})??'not prepared'}));
  if(!accepted.length)return {items:0,skipped};
  const pReview=reviewed.get(pItem.key);const pProblem=acceptanceProblem(pReview,pJournal);if(pProblem)throw Error('primary: '+pProblem);
  const bundleItems=[],stored=new Set(pJournal.files.map(f=>f.sha256));
  for(const [item,journal,review] of [[pItem,pJournal,pReview],...accepted.map(i=>[i,sJournal.get(i.key),reviewed.get(i.key)])]){
    if(!record.image_urls.includes(item.asset.source_url))throw Error('a file is not in the bound revision gallery: '+item.key);
    const {manifest}=await prepareResponsiveMedia(preparedInput({plan:item===pItem?primaryPlan:plan,item}));
    if(filesOf(manifest).map(f=>f.width+':'+f.sha256).join(',')!==journal.files.map(f=>f.width+':'+f.sha256).join(','))throw Error('derivatives differ from the reviewed bytes: '+item.key);
    const o=item.asset,reason=`The untouched original sha256 ${o.sha256} was downloaded from ${o.source_url}, byte-identical to image_urls[${record.image_urls.indexOf(o.source_url)}] of the live candidate revision ${record.revision_hash} for reference ${item.ref} (source ${record.source_id}). ${o.source_url.includes(`/${item.ref}/`)?`The file path names the reference directory /${item.ref}/.`:'The file path does not name the reference directory.'} This settles the reference only; colour and variant remain a separate visual check. Decision 0025 owner direction; no brand licence is claimed. Decision 0027: shown without treatment${item===pItem?'':' as a supplemental photograph of the same exact product'}.`;
    bundleItems.push({asset:{path:o.path,source_url:o.source_url,sha256:o.sha256},manifest,
      verification:mergedVerification(review.verification,{basis:'official_gallery_listing',asset_sha256:o.sha256,identity_established:true,reference:item.ref,revision_hash:record.revision_hash,gallery_url:o.source_url,reviewer:identityReviewer,reason})});
  }
  const bundle=approvalBundle({candidate:record,grant:plan.grant,items:bundleItems,public_base_url,prepared_by,performance_exception});
  if(hasLowResolutionHold(primaryPlan,pItem)){
    const livePrimary=now.catalog?.image_variants?.[0];
    const keepsPrimary=now.catalog?.active&&livePrimary&&
      now.catalog.images?.[0]===bundle.approval.approved_images[0]&&
      isDeepStrictEqual(livePrimary,bundle.approval.approved_image_variants[0]);
    if(!keepsPrimary)await requireReviewedForeground(primaryPlan,pItem,pReview,pJournal);
  }
  const plain='select public.jwl_record_media_approval(',kept='select public.jwl_record_presentation_approval(';
  // The primary's evidence rows are already recorded: the statement submits only the new rows, and the existing evidence
  // checks find the recorded ones (re-submitting them is refused as "Stored media evidence differs from this approval").
  let sql=mediaApprovalSql({...bundle,evidence:bundle.evidence.filter(e=>!stored.has(e.public_sha256))});if(sql.startsWith(plain))sql=kept+sql.slice(plain.length);
  await mkdir(join(out,'bundles',pItem.ref),{recursive:true,mode:0o700});
  await writeFile(join(out,'bundles',pItem.ref,'approval-bundle.json'),JSON.stringify(bundle,null,1),once);
  const recordFile=join(out,'bundles','record-approvals-001.sql');await writeFile(recordFile,sql+'\n',once);
  const files=new Map([...bundleItems.flatMap(b=>filesOf(b.manifest).map(f=>[f.sha256,join((b.asset.sha256===pItem.asset.sha256?primaryPlan:plan).out,'media',f.path)]))]);
  const uploads=bundle.uploads.filter(u=>!stored.has(u.sha256)).map(u=>{const e=bundle.evidence.find(x=>x.public_sha256===u.sha256);return {x_jwl_path:u.path,file:files.get(u.sha256),sha256:u.sha256,bytes:u.bytes,width:e.width,height:e.height,public_url:e.public_url};});
  const base=new URL(public_base_url.replace(/\/?$/,'/'));
  const manifest={generated_at:new Date().toISOString(),grant_reference:plan.grant.grant_reference,public_base:base.href,upload_endpoint:new URL('/functions/v1/jwl-media-upload',base).href,
    counts:{items:1,files:uploads.length,bytes:uploads.reduce((n,u)=>n+u.bytes,0),already_stored:bundle.uploads.length-uploads.length,images:bundle.approval.approved_images.length,refused:0,delivered:0,recorded:0},
    items:[{ref:pItem.ref,model:pItem.ref.replace(/-[0-9]{4}$/,''),batch_dir:join(out,'bundles'),candidate_id:record.candidate_id,revision_hash:record.revision_hash,
      record_sql:{file:recordFile,line:1,sha256:sha256(sql)},rebind_sql:null,state:'prepared',uploads}],refused:[],skipped};
  await writeFile(join(out,'ready-manifest.json'),JSON.stringify(manifest,null,1),once);
  return {...manifest.counts,skipped};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,a]=process.argv.slice(2);
  if(command==='prepare'&&a){const plan=await load(a);const prepared=await prepareOriginals({plan});console.log(JSON.stringify({prepared:prepared.length,sheets:await reviewSheet({plan,prepared,name:plan.sheet_name??'sheet'})}));}
  else if(command==='bind'&&a){
    // a: private input {plan, reviews, live_inputs, saved_records (ndjson, optional), public_base_url, prepared_by, owner_instruction, collection_label, out}
    const i=await load(a);
    const saved=i.saved_records?new Map((await readFile(i.saved_records,'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).map(c=>[c.external_id,c])):new Map();
    const reviews=(await Promise.all([].concat(i.reviews).map(load))).flatMap(v=>Array.isArray(v)?v:v.reviews??[v]);
    // A live read is either the rows themselves or a snapshot object that carries them as rows.
    const liveDoc=await load(i.live_inputs),live=Array.isArray(liveDoc)?liveDoc:liveDoc.rows;
    const plan=await load(i.plan);
    if(plan.primary){console.log(JSON.stringify(await bindSupplements({plan,reviews,live,public_base_url:i.public_base_url,prepared_by:i.prepared_by,
      performance_exception:i.performance_exception?await load(i.performance_exception):null,out:i.out})));process.exit(0);}
    console.log(JSON.stringify(await bindOriginals({plan:await load(i.plan),reviews,live,saved,public_base_url:i.public_base_url,prepared_by:i.prepared_by,
      owner_instruction:i.owner_instruction,collection_label:i.collection_label,out:i.out})));
  }
  else throw Error('Usage: node media-runner.mjs prepare PRIVATE_PLAN.json | bind PRIVATE_BIND.json');
}
