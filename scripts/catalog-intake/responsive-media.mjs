import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,mkdir,open,realpath,lstat} from 'node:fs/promises';
import {isAbsolute,join,resolve,relative,dirname,basename,sep} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {lumaSsim,rgbPsnr} from './image-fidelity.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;
const text=value=>typeof value==='string'&&value.trim()&&value.length<=2000;
const widths=[320,640,960];
/**
 * Lossy WebP delivery (decision 0009 addendum of 2026-10-27). Each derivative takes the highest quality of this fixed
 * descending ladder whose bytes fit its byte budget and whose fidelity is at or above the minimum fidelity floor,
 * measured against an in-memory Lanczos3 resize of the same pipeline at the same width. A card size (320/640/960) is
 * in every card srcset of the deployed storefront, so it carries the card budget; a file that is both a card size and
 * the detail file (a source of at most 960 px) carries the card budget too. Only the card budget is canonical (about
 * 80-150 KB per card derivative, docs/STOREFRONT-PERFORMANCE-2026-10-21.md line 37); the 600,000-byte detail-only
 * budget and the SSIM floor are implementation defaults. Nothing here waives either: a flagged file is approved only
 * through an independent reviewed exception record (media-pipeline.mjs performanceExceptionRecord). The minimum
 * floor is the line below which compression counts as destructive. The detail target (SSIM 0.985 at quality 85 or
 * more) is an implementation preference, recorded per detail file for the visual comparison; it is not a gate. When
 * no step meets budget and floor, the top step is kept and the manifest requires a performance review (the file
 * needs a reviewed exception record): quality is never lowered below the floor and the budget is never exceeded silently.
 */
export const webpQualityLadder=Object.freeze([92,90,88,85,82,80,78,75]);
export const byteBudgets=Object.freeze({card:150000,detail:600000});
export const fidelityFloor=Object.freeze({ssim:0.97});
export const detailTarget=Object.freeze({ssim:0.985,min_quality:85});
// Every encoder option is pinned so the same input always produces the same bytes.
const webpEncoder=Object.freeze({lossless:false,nearLossless:false,alphaQuality:100,effort:6,preset:'photo',smartSubsample:true,smartDeblock:false});
const round=(value,places)=>Number.isFinite(value)?Number(value.toFixed(places)):null;
const repository=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const knownWebRoots=[join(homedir(),'Sites'),'/Library/WebServer/Documents','/var/www','/srv/www','/usr/share/nginx/html','/usr/local/var/www','/opt/homebrew/var/www'];
const within=(root,path)=>{const tail=relative(root,path);return !tail||(!tail.startsWith('..'+sep)&&tail!=='..'&&!isAbsolute(tail));};

async function resolveOutputPath(path){
  let ancestor=resolve(path);const missing=[];
  for(;;){
    try{await lstat(ancestor);}catch(error){
      if(error.code!=='ENOENT'||dirname(ancestor)===ancestor)throw error;
      missing.unshift(basename(ancestor));ancestor=dirname(ancestor);continue;
    }
    let canonical;
    try{canonical=await realpath(ancestor);}catch{throw new Error('Unsafe output symlink ancestry');}
    if(!(await lstat(canonical)).isDirectory())throw new Error('Output ancestor is not a directory');
    return resolve(canonical,...missing);
  }
}
async function privateOutputRoot(path){
  const requested=resolve(path),canonical=await resolveOutputPath(requested);
  for(const protectedPath of [repository,...knownWebRoots]){
    const protectedCanonical=await resolveOutputPath(protectedPath);
    if(within(protectedPath,requested)||within(protectedCanonical,canonical))throw new Error('Private output must be outside the repository and known served web roots');
  }
  return canonical;
}
async function privateDirectory(root,relativePath){
  const path=join(root,relativePath);
  // Resolve all existing children before mkdir, including a symlink hidden above
  // a not-yet-created leaf. Generated content paths must never escape the root.
  const canonical=await privateOutputRoot(path);
  if(!within(root,canonical)||canonical!==path)throw new Error('Unsafe output directory symlink');
  let cursor=root;
  for(const part of relative(root,path).split(sep)){
    cursor=join(cursor,part);
    try{if((await lstat(cursor)).isSymbolicLink())throw new Error('Unsafe output directory symlink');}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  await mkdir(path,{recursive:true,mode:0o700});
  if(await realpath(path)!==path)throw new Error('Output ancestry changed');
  return path;
}

export function installedImageEngine(){
  // Reuse Astro's existing locked image engine; this helper installs nothing.
  const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
  return createRequire(require.resolve('astro'))('sharp');
}
function https(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Invalid exact asset URL');
  return url;
}
function bindingOf(input){
  const {source,candidate,asset,grant,purpose}=input;
  if(!['catalog','test-editorial'].includes(purpose))throw new Error('Explicit media purpose required');
  if(!source||!candidate||!asset||!grant||source.publication_allowed!==true||!text(source.media_permission_reference))throw new Error('Explicit media grant required');
  if(!text(source.id)||candidate.source_id!==source.id||!hashPattern.test(candidate.candidate_id)||!hashPattern.test(candidate.revision_hash))throw new Error('Source-bound candidate and revision required');
  const sourcePage=https(candidate.source_url);
  if(sourcePage.origin!==source.origin||!Array.isArray(source.media_origins))throw new Error('Source origin mismatch');
  // An owner's own photograph has no source URL; it binds to its checksum and one exact product instead.
  if(grant.kind==='owner_original'){
    if(!hashPattern.test(asset.sha256??'')||asset.source_url!=='owner-original:'+asset.sha256||grant.candidate_id!==candidate.candidate_id)throw new Error('Exact owner original required');
  }else{
    const assetUrl=https(asset.source_url);
    if(!source.media_origins.includes(assetUrl.origin)||!Array.isArray(candidate.image_urls)||!candidate.image_urls.includes(asset.source_url)||!hashPattern.test(asset.sha256))throw new Error('Exact candidate asset required');
  }
  if(grant.media_permission_reference!==source.media_permission_reference||grant.source_id!==source.id||grant.candidate_id!==candidate.candidate_id||grant.revision_hash!==candidate.revision_hash||grant.asset_source_url!==asset.source_url||grant.asset_sha256!==asset.sha256||grant.website_publication!==true||grant.resize!==true||grant.webp_encode!==true)throw new Error('Exact asset derivative grant mismatch');
  if(!isAbsolute(asset.path??'')||!isAbsolute(input.output_directory??''))throw new Error('Absolute local input and output paths required');
  return {source_id:source.id,candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,media_permission_reference:source.media_permission_reference,asset_source_url:asset.source_url,asset_sha256:asset.sha256};
}
async function immutableFile(path,bytes){
  try{
    const file=await open(path,'wx',0o600);
    try{await file.writeFile(bytes);}finally{await file.close();}
  }catch(error){
    if(error.code!=='EEXIST')throw error;
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||digest(await readFile(path))!==digest(bytes))throw new Error('Existing immutable output differs');
  }
}

/** Prepare private files only. No fetch, upload, approval or public publication occurs. */
export async function prepareResponsiveMedia(input){
  const binding=bindingOf(input);
  const outputRoot=await privateOutputRoot(input.output_directory);
  const originalPath=await realpath(input.asset.path);
  const stat=await lstat(originalPath);
  if(!stat.isFile()||stat.size<1||stat.size>15728640)throw new Error('Original image must be a local file within 15 MiB');
  const original=await readFile(originalPath);
  if(digest(original)!==binding.asset_sha256)throw new Error('Original asset checksum mismatch');
  const sharp=installedImageEngine();
  const metadata=await sharp(original,{failOn:'warning',limitInputPixels:60000000}).metadata();
  if(!['jpeg','png','webp','avif','heif'].includes(metadata.format)||!metadata.width||!metadata.height||(metadata.pages??1)!==1)throw new Error('Unsupported or animated original image');
  if(metadata.space!=='srgb'||metadata.depth!=='uchar')throw new Error('Unsupported original color space or depth');
  const orientation=metadata.orientation??1;
  if(!Number.isInteger(orientation)||orientation<1||orientation>8)throw new Error('Unsupported original EXIF orientation');
  const visualWidth=orientation>=5?metadata.height:metadata.width;
  const visualHeight=orientation>=5?metadata.width:metadata.height;
  const targetWidths=[...widths.filter(width=>width<=visualWidth),Math.min(visualWidth,1600)];
  if(targetWidths.some(width=>width>4096||Math.round(visualHeight*width/visualWidth)>8192))throw new Error('Derivative geometry exceeds public manifest limits');
  const relativeRoot=`v1/${digest(JSON.stringify(binding))}/${binding.asset_sha256}`;
  await privateDirectory(outputRoot,relativeRoot);
  const detailWidth=Math.min(visualWidth,1600);
  // A card width equal to the detail width is one shared file, so it carries the smaller (card) budget.
  const roles=new Map();
  for(const width of widths)if(width<=visualWidth)roles.set(width,['card']);
  roles.set(detailWidth,[...(roles.get(detailWidth)??[]),'detail']);
  const pipeline=width=>sharp(original,{failOn:'warning',limitInputPixels:60000000})
    .autoOrient()
    .resize({width,withoutEnlargement:true,fit:'inside',kernel:'lanczos3'})
    .keepIccProfile();
  // Metric pixels: both images are decoded the same way (flattened on white, 8-bit RGB) so only the encoding differs.
  const pixels=async bytes=>sharp(bytes,{failOn:'warning'}).flatten({background:'#ffffff'}).raw().toBuffer({resolveWithObject:true});
  const generated=new Map();
  async function encode(width){
    if(generated.has(width))return generated.get(width);
    const applied=roles.get(width);
    const budget=Math.min(...applied.map(role=>byteBudgets[role]));
    // The reference is held in memory only; it is never written or published.
    const reference=await pixels(await pipeline(width).webp({lossless:true,effort:0}).toBuffer());
    const tried=[];let chosen;
    for(const quality of webpQualityLadder){
      const bytes=await pipeline(width).webp({...webpEncoder,quality}).toBuffer();
      const decoded=await pixels(bytes);
      if(decoded.info.width!==reference.info.width||decoded.info.height!==reference.info.height)throw new Error('Derivative geometry differs from its fidelity reference');
      const step={quality,bytes,ssim:lumaSsim(reference.data,decoded.data,decoded.info.width,decoded.info.height),psnr:rgbPsnr(reference.data,decoded.data,decoded.info.width,decoded.info.height)};
      step.floor_met=step.ssim>=fidelityFloor.ssim;
      tried.push(step);
      if(step.floor_met&&bytes.length<=budget){chosen=step;break;}
    }
    // Nothing fits: keep the top (highest quality) step and require a review; only a reviewed exception record approves it.
    if(!chosen)chosen=tried[0];
    const bytes=chosen.bytes;
    const actual=await sharp(bytes,{failOn:'warning'}).metadata();
    const expectedHeight=Math.round(visualHeight*width/visualWidth);
    if(actual.format!=='webp'||actual.width!==width||actual.height!==expectedHeight||actual.width>visualWidth||actual.height>visualHeight||actual.width>4096||actual.height>8192)throw new Error('Derivative geometry differs from requested uncropped resize or public manifest limits');
    const sha256=digest(bytes);
    const path=`${relativeRoot}/${actual.width}w-${sha256}.webp`;
    await immutableFile(join(outputRoot,path),bytes);
    const detailRole=applied.includes('detail');
    const record={path,sha256,bytes:bytes.length,width:actual.width,height:actual.height,mime_type:'image/webp',roles:applied,
      webp_quality:chosen.quality,ssim_luma:round(chosen.ssim,5),psnr_rgb_db:round(chosen.psnr,2),
      budget_limit_bytes:budget,over_budget:bytes.length>budget,ssim_floor:fidelityFloor.ssim,fidelity_floor_met:chosen.floor_met,
      // Recorded for the visual comparison only; it never blocks or waives anything.
      detail_target_met:detailRole?chosen.ssim>=detailTarget.ssim&&chosen.quality>=detailTarget.min_quality:null,
      ladder_measured:tried.map(step=>({quality:step.quality,bytes:step.bytes.length,ssim_luma:round(step.ssim,5),psnr_rgb_db:round(step.psnr,2)}))};
    generated.set(width,record);return record;
  }
  const variants=[];
  for(const width of widths)if(width<=visualWidth)variants.push(await encode(width));
  const detail=await encode(detailWidth);
  const review=record=>record.over_budget||!record.fidelity_floor_met;
  const manifest={schema_version:3,publication_state:'private-prepared',image_verification_state:'pending',purpose:input.purpose,binding,
    original:{local_path:originalPath,sha256:binding.asset_sha256,bytes:original.length,width:metadata.width,height:metadata.height,orientation,visual_width:visualWidth,visual_height:visualHeight,format:metadata.format},
    processing:{engine:'sharp',version:sharp.versions.sharp,libvips_version:sharp.versions.vips,kernel:'lanczos3',webp_lossless:false,webp_encoder:webpEncoder,webp_quality_ladder:webpQualityLadder,
      byte_budgets:byteBudgets,fidelity_floor:fidelityFloor,detail_target:detailTarget,
      selection:'highest ladder step within the byte budget and at or above the fidelity floor; a card size, and a detail file that is also a card size, carries the card budget',
      fidelity_metric:'luma (BT.601) SSIM, 11x11 Gaussian window sigma 1.5, and RGB PSNR, against an in-memory Lanczos3 resize of the same pipeline at the same width',
      crop:false,upscale:false,color_adjustments:false,orientation_applied:orientation,orientation_normalized:orientation!==1,icc_profile:'retained-if-present',metadata:'private EXIF and GPS not copied'},
    performance_review_required:review(detail)||variants.some(review),
    // Lossy WebP is used only after a visual comparison (docs/STOREFRONT-PERFORMANCE-2026-10-21.md); this helper cannot do it.
    visual_comparison_required:true,variants,detail};
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
  const manifestPath=`${relativeRoot}/manifest-${digest(manifestBytes)}.json`;
  await immutableFile(join(outputRoot,manifestPath),manifestBytes);
  return {manifest_path:join(outputRoot,manifestPath),manifest};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2])throw new Error('Usage: node responsive-media.mjs private-input.json');
  const result=await prepareResponsiveMedia(JSON.parse(await readFile(process.argv[2],'utf8')));
  process.stdout.write(JSON.stringify({manifest_path:result.manifest_path,variants:result.manifest.variants.length,publication_state:result.manifest.publication_state})+'\n');
}
