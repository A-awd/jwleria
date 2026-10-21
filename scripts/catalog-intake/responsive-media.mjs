import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,mkdir,open,realpath,lstat} from 'node:fs/promises';
import {isAbsolute,join,resolve,relative,dirname,basename,sep} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;
const text=value=>typeof value==='string'&&value.trim()&&value.length<=2000;
const widths=[320,640,960];
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
  const assetUrl=https(asset.source_url);
  if(!source.media_origins.includes(assetUrl.origin)||!Array.isArray(candidate.image_urls)||!candidate.image_urls.includes(asset.source_url)||!hashPattern.test(asset.sha256))throw new Error('Exact candidate asset required');
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
  const generated=new Map();
  async function encode(width){
    if(generated.has(width))return generated.get(width);
    const bytes=await sharp(original,{failOn:'warning',limitInputPixels:60000000})
      .autoOrient()
      .resize({width,withoutEnlargement:true,fit:'inside',kernel:'lanczos3'})
      .keepIccProfile().webp({lossless:true,effort:4}).toBuffer();
    const actual=await sharp(bytes,{failOn:'warning'}).metadata();
    const expectedHeight=Math.round(visualHeight*width/visualWidth);
    if(actual.format!=='webp'||actual.width!==width||actual.height!==expectedHeight||actual.width>visualWidth||actual.height>visualHeight||actual.width>4096||actual.height>8192)throw new Error('Derivative geometry differs from requested uncropped resize or public manifest limits');
    const sha256=digest(bytes);
    const path=`${relativeRoot}/${actual.width}w-${sha256}.webp`;
    await immutableFile(join(outputRoot,path),bytes);
    const record={path,sha256,bytes:bytes.length,width:actual.width,height:actual.height,mime_type:'image/webp'};
    generated.set(width,record);return record;
  }
  const budget=(record,limit)=>({...record,budget_limit_bytes:limit,over_budget:record.bytes>limit});
  const variants=[];
  for(const width of widths)if(width<=visualWidth)variants.push(budget(await encode(width),150*1024));
  const detail=budget(await encode(Math.min(visualWidth,1600)),600*1024);
  const manifest={schema_version:1,publication_state:'private-prepared',image_verification_state:'pending',purpose:input.purpose,binding,
    original:{local_path:originalPath,sha256:binding.asset_sha256,bytes:original.length,width:metadata.width,height:metadata.height,orientation,visual_width:visualWidth,visual_height:visualHeight,format:metadata.format},
    processing:{engine:'sharp',version:sharp.versions.sharp,libvips_version:sharp.versions.vips,kernel:'lanczos3',webp_lossless:true,crop:false,upscale:false,color_adjustments:false,orientation_applied:orientation,orientation_normalized:orientation!==1,icc_profile:'retained-if-present',metadata:'private EXIF and GPS not copied'},
    performance_review_required:detail.over_budget||variants.some(record=>record.over_budget),variants,detail};
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
