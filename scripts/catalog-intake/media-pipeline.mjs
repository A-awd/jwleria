import {createHash} from 'node:crypto';
import {open,lstat,readFile,mkdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {privateRoot,recordedSourceStops,agent} from './source-queue.mjs';
import {prepareResponsiveMedia,installedImageEngine} from './responsive-media.mjs';
import {cutoutTreatment,cutoutReviewChecks} from './cutout.mjs';
import {whiteSquareTreatment,whiteSquareReviewChecks} from './white-square.mjs';
import {flatTileTreatment,flatTileReviewChecks} from './flat-tile.mjs';

const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
const robotsParser=require('robots-parser');
const hashPattern=/^[a-f0-9]{64}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2000;
const formats={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
const maxBytes=15728640;
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const verificationChecks=['exact_reference','color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'];
// Media requests name the site they serve, as Wikimedia's user-agent policy asks of every client.
const mediaAgent=agent+' (+https://jwleria.com)';
// Measured in code points, as Postgres length() measures the same credit.
const credit=(value,max)=>text(value)&&[...value].length<=max&&!/\p{Cc}/u.test(value);
const licence=(label,url)=>Object.freeze({label,url});

/**
 * The only open licences an open_license grant may cite (SPDX id → visible label and canonical deed), mirrored
 * by jwl_internal.open_licenses() in the proposed migration. Never NC or ND; ported versions need review.
 */
export const openLicenses=Object.freeze({
  'CC0-1.0':licence('CC0 1.0','https://creativecommons.org/publicdomain/zero/1.0/'),
  'CC-BY-4.0':licence('CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'),
  'CC-BY-3.0':licence('CC BY 3.0','https://creativecommons.org/licenses/by/3.0/'),
  'CC-BY-2.0':licence('CC BY 2.0','https://creativecommons.org/licenses/by/2.0/'),
  'CC-BY-SA-4.0':licence('CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
  'CC-BY-SA-3.0':licence('CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/'),
  'CC-BY-SA-2.0':licence('CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/'),
});

const commonsPage=/^https:\/\/commons\.wikimedia\.org\/wiki\/File:([^/?#\s"<>\\]+)$/;
const commonsOriginalUrl=/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#\s"<>\\]+)$/;
const commonsRenditionUrl=/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#\s"<>\\]+)\/([1-9][0-9]*)px-([^/?#\s"<>\\]+)$/;
// The page and the held file spell the same File name byte for byte (as the database compares them), the name is
// a still image, and the hash directories are MediaWiki's md5 of the decoded name.
function sameCommonsFile(page_url,file_url,pattern){
  const page=commonsPage.exec(page_url??''),file=pattern.exec(file_url??'');
  if(!page||!file||page_url.length>2048||file_url.length>2048||new URL(page_url).href!==page_url||new URL(file_url).href!==file_url)return null;
  let name;try{name=decodeURIComponent(page[1]);decodeURIComponent(file[3]);}catch{return null;}
  if(file[3]!==page[1]||!/\.(jpe?g|png|webp)$/i.test(page[1]))return null;
  const hash=createHash('md5').update(name).digest('hex');
  return file[1]===hash[0]&&file[2]===hash.slice(0,2)?file:null;
}
/**
 * Whether original_url is the untouched Wikimedia Commons original of the file page page_url: canonical URLs,
 * the same file name and MediaWiki's md5 hash directories. Checked offline; brand origins never qualify.
 */
export function commonsOriginal(page_url,original_url){
  return sameCommonsFile(page_url,original_url,commonsOriginalUrl)!==null;
}
/**
 * Whether rendition_url is the Wikimedia-served thumbnail of the file page page_url at exactly width pixels
 * (`.../commons/thumb/<h>/<hh>/<File>/<width>px-<File>`, 100..4000): same name, hash directories and width.
 */
export function commonsRendition(page_url,rendition_url,width){
  const file=sameCommonsFile(page_url,rendition_url,commonsRenditionUrl);
  return file!==null&&file[5]===file[3]&&Number.isInteger(width)&&width>=100&&width<=4000&&file[4]===String(width);
}
/**
 * Whether one licensed-file record of an open-licence grant is an honest original or rendition of its page. Each
 * record states `title`: the work's title as its author supplied it (CC 2.0/3.0 licences require it "if supplied"),
 * 1..300 characters without control characters, or null when none was supplied (a file name or a caption written by
 * others is not one). jwl_internal.valid_open_license_files applies the same rule.
 */
export function commonsFile(file){
  if(!file||typeof file!=='object'||Array.isArray(file))return false;
  const keys=Object.keys(file).sort().join(',');
  if(keys!=='file_kind,file_url,rendition_width,source_page_url,title')return false;
  if(file.title!==null&&!credit(file.title,300))return false;
  if(file.file_kind==='original')return file.rendition_width===null&&commonsOriginal(file.source_page_url,file.file_url);
  if(file.file_kind==='rendition')return commonsRendition(file.source_page_url,file.file_url,file.rendition_width);
  return false;
}
/** The licensed file of an open-licence grant held at file_url, or undefined. */
export function licensedFile(grant,file_url){
  return Array.isArray(grant?.licensed_files)?grant.licensed_files.find(file=>file?.file_url===file_url):undefined;
}
// The owner decisions an open-licence grant may rely on: exactly these recorded decision files of this repository, each
// with the catalogue references it covers. Free text, dated or relayed sentences, decision 0011 (which rejects open
// licences) and any other file are refused. Widening this list, or a decision's references, needs the decision file
// amended first and a reviewed migration: the proposed SQL holds the same list in jwl_internal.open_license_decisions().
export const openLicenseDecisions=Object.freeze({
  'decisions/0013-open-licence-exact-product-photos.md':Object.freeze({references:Object.freeze(['m126234-0015'])}),
  'decisions/0016-verified-open-licence-photo-batches.md':Object.freeze({references:Object.freeze(['m126200-0006'])}),
});
const ownerDecision=value=>typeof value==='string'&&Object.hasOwn(openLicenseDecisions,value);
function openLicenseGaps(grant){
  const reasons=[],deed=Object.hasOwn(openLicenses,grant.license_code??'')?openLicenses[grant.license_code]:null;
  if(!ownerDecision(grant.owner_decision_reference))reasons.push('owner_decision_reference_missing');
  if(!deed)reasons.push('license_not_allowed');else if(grant.license_url!==deed.url)reasons.push('license_url_mismatch');
  if(!credit(grant.creator,300))reasons.push('attribution_creator_missing');
  if(!credit(grant.attribution_text,500)||!grant.attribution_text.includes(grant.creator))reasons.push('attribution_text_missing');
  const files=grant.licensed_files;
  if(!Array.isArray(files)||!files.length||files.length>20||!files.every(commonsFile)
    ||new Set(files.map(f=>f.file_url)).size!==files.length||new Set(files.map(f=>f.source_page_url)).size!==files.length)reasons.push('licensed_file_not_an_allowlisted_commons_file');
  if(Array.isArray(grant.media_origins)&&grant.media_origins.length)reasons.push('open_license_names_one_file_not_origins');
  return reasons;
}
/**
 * The visible credit of one licensed file's image, exactly as the proposed migration re-derives it from the grant:
 * the file's supplied title is added as `title`; a file without one keeps the five-field credit.
 */
export function openLicenseAttribution(grant,changes,file=grant.licensed_files?.[0]){
  return {creator:grant.creator,license:openLicenses[grant.license_code].label,license_url:grant.license_url,source_url:file.source_page_url,changes,
    ...(typeof file.title==='string'?{title:file.title}:{})};
}

/**
 * The visible "changes" of an open-licence credit. The applied database accepts only the first two; the background-removed
 * forms (decision 0015) are what a cutout's credit must say once a reviewed change lets the database record them.
 */
export function creditChanges({resized,background_removed=false,white_square=false}){
  // A white square (decision 0022) is a cutout on a new square white background, and its credit says both.
  if(white_square)return resized?'background removed, placed on a square white background, resized and converted to WebP':'background removed, placed on a square white background and converted to WebP';
  if(background_removed)return resized?'background removed, resized and converted to WebP':'background removed and converted to WebP';
  return resized?'resized and converted to WebP':'converted to WebP';
}
/**
 * Why a grant does not cover background removal (decision 0015), or null when it does. The owner's own photograph is
 * covered by the owner's direction. Written permission must say so itself (background_removal: true). An open licence
 * must allow an adaptation whose conditions this pipeline meets: CC0 and CC BY do (the credit states the change); CC BY-SA
 * also binds the adaptation to its ShareAlike terms, which needs a licence review first; NC and ND are never allowlisted.
 * This covers the treatment only: the grant must still permit the exact product (evaluateMediaGrant).
 */
export function cutoutBasisProblem(grant){
  if(grant?.kind==='owner_original')return null;
  if(grant?.kind==='written_permission')return grant.background_removal===true?null:'written_permission_does_not_cover_background_removal';
  if(grant?.kind==='open_license'){
    if(grant.license_code==='CC0-1.0'||/^CC-BY-[234]\.0$/.test(grant.license_code??''))return null;
    // A CC BY-SA cutout is an adaptation, offered under the same licence: it needs the grant's recorded ShareAlike review.
    if(/^CC-BY-SA-[234]\.0$/.test(grant.license_code??''))return record(grant.share_alike_review)?null:'share_alike_adaptation_needs_licence_review';
    return 'license_not_allowed';
  }
  return 'unsupported_grant_kind';
}

/**
 * Whether each gallery URL itself names the exact variant reference (bounded by non-alphanumerics).
 * Binding is identity evidence only; every image still needs a recorded visual check and a grant.
 */
export function galleryBinding(candidate){
  const reference=String(candidate.external_id??'').toLowerCase();
  const pattern=reference.length>=4?new RegExp('(^|[^a-z0-9])'+escape(reference)+'($|[^a-z0-9])'):null;
  const images=(candidate.image_urls??[]).map(url=>{
    let value;try{value=decodeURIComponent(url).toLowerCase();}catch{value=String(url).toLowerCase();}
    return {url,binding:pattern?.test(value)?'reference_in_asset_url':'unbound_requires_visual_verification'};
  });
  return {candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,source_id:candidate.source_id,external_id:candidate.external_id,
    exact_gallery:images.length>0&&images.every(image=>image.binding==='reference_in_asset_url'),images};
}

/**
 * An official image URL is never permission. Only an exact recorded grant can permit media use. An open_license
 * grant also needs the owner's recorded decision and complete attribution; the database refuses that kind until
 * the proposed open-licence migration is approved and applied.
 */
export function evaluateMediaGrant(grant,{candidate,asset_url,now=Date.now()}={}){
  if(!grant)return {state:'awaiting_permission',reasons:['no_media_grant']};
  if(!['owner_original','written_permission','open_license'].includes(grant.kind))return {state:'rejected',reasons:['unsupported_grant_kind']};
  const reasons=[];
  if(!/^[a-z0-9][a-z0-9._-]{2,80}$/.test(grant.grant_reference??''))reasons.push('invalid_grant_reference');
  if(!text(grant.evidence_reference))reasons.push('permission_evidence_missing');
  if(grant.website_publication!==true||grant.resize!==true||grant.webp_encode!==true)reasons.push('usage_rights_incomplete');
  if(grant.revoked_at)reasons.push('grant_revoked');
  if(grant.expires_at&&!(Date.parse(grant.expires_at)>now))reasons.push('grant_expired');
  if(grant.candidate_id&&grant.candidate_id!==candidate?.candidate_id)reasons.push('grant_covers_another_product');
  if(grant.kind==='owner_original'){
    if(grant.candidate_id!==candidate?.candidate_id)reasons.push('owner_original_must_name_exact_product');
    if(grant.declared_reference!==candidate?.external_id)reasons.push('declared_reference_mismatch');
  }else if(grant.kind==='open_license'){
    if(grant.candidate_id!==candidate?.candidate_id)reasons.push('open_license_must_name_exact_product');
    if(grant.source_id!==candidate?.source_id)reasons.push('grant_covers_another_source');
    if(recordedSourceStops[candidate?.source_id])reasons.push('source_acquisition_restricted');
    reasons.push(...openLicenseGaps(grant));
    // The cited decision covers only the references it lists; another reference needs that decision amended first.
    if(ownerDecision(grant.owner_decision_reference)&&!openLicenseDecisions[grant.owner_decision_reference].references.includes(candidate?.external_id))reasons.push('owner_decision_does_not_cover_reference');
    // A grant covers only its own Commons files; the brand gallery is never a download target here.
    if(asset_url!==undefined&&!licensedFile(grant,asset_url))reasons.push('asset_not_a_granted_file');
  }else{
    if(grant.source_id!==candidate?.source_id)reasons.push('grant_covers_another_source');
    // Restricted sources stay closed to downloads until a reviewed code change lifts the stop.
    if(recordedSourceStops[candidate?.source_id])reasons.push('source_acquisition_restricted');
    let origin=null;try{const url=new URL(asset_url);origin=url.protocol==='https:'&&!url.username&&!url.password?url.origin:null;}catch{}
    if(!origin||!Array.isArray(grant.media_origins)||!grant.media_origins.includes(origin))reasons.push('asset_origin_not_granted');
    if(!candidate?.image_urls?.includes(asset_url))reasons.push('asset_not_in_exact_candidate_gallery');
  }
  return reasons.length?{state:'rejected',reasons}:{state:'permitted',reasons:[],grant_reference:grant.grant_reference};
}

/** Per-source counts of exact galleries and permission state; reads nothing remote. */
export function mediaReadiness(candidates,{grants=[]}={}){
  const bySource={};
  for(const candidate of candidates){
    const row=bySource[candidate.source_id]??={candidates:0,exact_reference_gallery:0,unbound_gallery:0,permitted:0,awaiting_permission:0,rejected:0,reasons:{}};
    row.candidates++;
    galleryBinding(candidate).exact_gallery?row.exact_reference_gallery++:row.unbound_gallery++;
    const grant=grants.find(g=>g.candidate_id===candidate.candidate_id)??grants.find(g=>!g.candidate_id&&g.source_id===candidate.source_id);
    const decision=evaluateMediaGrant(grant,{candidate,asset_url:grant?.kind==='open_license'?grant.licensed_files?.[0]?.file_url:candidate.image_urls?.[0]});
    row[decision.state]++;for(const reason of decision.reasons)row.reasons[reason]=(row.reasons[reason]??0)+1;
  }
  return {sources:bySource,approved_photo_library:false};
}

async function keepOriginal(root,bytes,extension){
  const dir=join(root,'originals');await mkdir(dir,{recursive:true,mode:0o700});
  if(await realpath(dir)!==dir)throw Error('Unsafe original directory');
  const sha256=digest(bytes),path=join(dir,`${sha256}.${extension}`);
  try{const file=await open(path,'wx',0o600);try{await file.writeFile(bytes);}finally{await file.close();}}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||digest(await readFile(path))!==sha256)throw Error('Existing original differs');
  }
  return {sha256,path};
}
async function boundedBytes(response){
  if(Number(response.headers.get('content-length')??0)>maxBytes)throw Error('Image exceeds size limit');
  let size=0;const chunks=[];
  for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Image exceeds size limit');chunks.push(chunk);}
  if(!size)throw Error('Empty image');
  return Buffer.concat(chunks);
}
/** Upright size, EXIF orientation, format and alpha of held bytes, decoded once; undecodable bytes are refused. */
async function imageFacts(bytes){
  const m=await installedImageEngine()(bytes,{failOn:'warning',limitInputPixels:60000000}).metadata();
  if(!m.width||!m.height)throw Error('Undecodable source image');
  const orientation=m.orientation??1,turned=orientation>=5;
  return {width:turned?m.height:m.width,height:turned?m.width:m.height,orientation,format:m.format,has_alpha:m.hasAlpha===true};
}
// One paced, robots-checked request path per media origin. A refusal or rate limit stops the origin in the pacer; a
// redirect stops the transfer. A 304 is accepted only as the answer to a conditional request this code sent.
function mediaRequester(origin,{fetcher,pacer}){
  return async(target,headers={})=>{
    await pacer.wait(origin);
    const response=await fetcher(target,{headers:{'User-Agent':mediaAgent,...headers},redirect:'manual',signal:AbortSignal.timeout(20000)});
    if([401,403].includes(response.status)){pacer.stop(origin);throw Error(`Media source refused access (${response.status})`);}
    if(response.status===429){const v=response.headers.get('retry-after'),s=Number(v);pacer.stop(origin,v==null?null:Number.isFinite(s)?pacer.now()+s*1000:Date.parse(v)||null);throw Error('Media source rate limited (429)');}
    if(response.status===304&&Object.keys(headers).some(h=>/^if-(none-match|modified-since)$/i.test(h)))return response;
    if(response.status>=300&&response.status<400)throw Error('Media redirect requires review');
    return response;
  };
}
async function robotsAllow(url,request,pacer){
  let policy=pacer.robots(url.origin);
  if(!policy){
    const robots=await request(url.origin+'/robots.txt');
    // RFC 9309: an absent robots file allows access; any other failure stops the download.
    if(robots.ok)policy=robotsParser(url.origin+'/robots.txt',(await boundedBytes(robots)).toString('utf8'));
    else if([404,410].includes(robots.status))policy=robotsParser(url.origin+'/robots.txt','');
    else throw Error(`Media robots unavailable (${robots.status})`);
    pacer.remember(url.origin,policy);
  }
  if(policy.isAllowed(url.href,agent)!==true)throw Error('Media robots refused');
}
// Server validators are recorded as the server's own claims; only an equal sha256 proves the bytes are the same.
const validators=response=>({etag:response.headers.get('etag')??null,last_modified:response.headers.get('last-modified')??null});

/**
 * Per-origin pacing and robots cache shared by every download made through one pacer, so a caller
 * looping over many assets still spaces requests to each media origin.
 */
export function createMediaPacer({min_interval_seconds=2,robots_ttl_seconds=3600,rate_limit_min_seconds=900,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}){
  const next=new Map(),robots=new Map(),stopped=new Map(),interval=Math.max(2,Number(min_interval_seconds)||2)*1000;
  return {now,
    async wait(origin){
      // A refused or rate-limited origin is not contacted again through this pacer until its time.
      const until=stopped.get(origin);if(until!==undefined&&until>now())throw Error(`Media origin stopped until ${until===Infinity?'review':new Date(until).toISOString()}`);
      // Reserve the slot before sleeping so concurrent downloads queue behind each other.
      const slot=Math.max(next.get(origin)??0,now());next.set(origin,slot+interval);
      if(slot>now())await sleep(slot-now());},
    stop(origin,retryAfter){stopped.set(origin,retryAfter===undefined?Infinity:Math.max(retryAfter??0,now()+Math.max(60,rate_limit_min_seconds)*1000));},
    robots(origin){const hit=robots.get(origin);return hit&&hit.until>now()?hit.policy:null;},
    remember(origin,policy){robots.set(origin,{policy,until:now()+robots_ttl_seconds*1000});}};
}
const defaultPacer=createMediaPacer();

/**
 * Downloads one exact original: a gallery file under a permitted written grant, or one Commons file (original
 * or recorded rendition) an open-licence grant names. Robots, refusals, rate limits and redirects stop the transfer; the untouched
 * original is preserved privately by checksum.
 */
export async function acquireOriginal({candidate,asset_url,grant,output_directory},{fetcher=fetch,pacer=defaultPacer}={}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url,now:pacer.now()});
  if(decision.state!=='permitted'||!['written_permission','open_license'].includes(grant.kind))throw Error('Permitted written or open-licence media grant required: '+decision.reasons.join(','));
  const root=await privateRoot(output_directory),url=new URL(asset_url);
  const request=mediaRequester(url.origin,{fetcher,pacer});
  await robotsAllow(url,request,pacer);
  const response=await request(url.href);
  if(!response.ok)throw Error(`Source media unavailable (${response.status})`);
  return keepDownloaded({root,url,response,grant,pacer});
}
async function keepDownloaded({root,url,response,grant,pacer}){
  const mime=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  if(!formats[mime])throw Error('Unsupported source image type');
  const bytes=await boundedBytes(response);
  const facts=await imageFacts(bytes);
  const kept=await keepOriginal(root,bytes,formats[mime]);
  return {source_url:url.href,sha256:kept.sha256,bytes:bytes.length,mime_type:mime,path:kept.path,acquired_at:new Date(pacer.now()).toISOString(),grant_reference:grant.grant_reference,
    acquisition:'download',http_status:response.status,...validators(response),...facts};
}

/**
 * Re-checks one recorded download through the same grant, pacing and robots path, conditionally when the record holds
 * an ETag or Last-Modified. 304 means the server claims no change (no bytes kept); a 200 is hashed: the same sha256 is
 * 'unchanged', another is 'changed' and kept under its own sha256 beside the old file, never overwriting it. A changed
 * file is a new original: no verification, review or approval of the old bytes carries over to it.
 */
export async function recheckOriginal({candidate,asset_url,grant,output_directory,recorded},{fetcher=fetch,pacer=defaultPacer}={}){
  if(recorded?.acquisition!=='download'||recorded.source_url!==asset_url||!hashPattern.test(recorded.sha256??''))throw Error('Only a recorded download of this URL can be re-checked');
  const decision=evaluateMediaGrant(grant,{candidate,asset_url,now:pacer.now()});
  if(decision.state!=='permitted'||!['written_permission','open_license'].includes(grant.kind))throw Error('Permitted written or open-licence media grant required: '+decision.reasons.join(','));
  const root=await privateRoot(output_directory),url=new URL(asset_url);
  const request=mediaRequester(url.origin,{fetcher,pacer});
  await robotsAllow(url,request,pacer);
  const headers={...(recorded.etag?{'If-None-Match':recorded.etag}:{}),...(recorded.last_modified?{'If-Modified-Since':recorded.last_modified}:{})};
  const response=await request(url.href,headers);
  const checked_at=new Date(pacer.now()).toISOString();
  if(response.status===304)return {state:'not_modified',source_url:url.href,sha256:recorded.sha256,checked_at,...validators(response)};
  if(!response.ok)throw Error(`Source media unavailable (${response.status})`);
  const kept=await keepDownloaded({root,url,response,grant,pacer});
  return kept.sha256===recorded.sha256?{state:'unchanged',source_url:url.href,sha256:kept.sha256,checked_at,etag:kept.etag,last_modified:kept.last_modified}
    :{state:'changed',previous_sha256:recorded.sha256,checked_at,original:kept};
}

/** Preserves an owner's own photograph of one exact product; no network request. */
export async function keepOwnerOriginal({candidate,grant,local_path,output_directory}){
  const decision=evaluateMediaGrant(grant,{candidate});
  if(decision.state!=='permitted'||grant.kind!=='owner_original')throw Error('Permitted owner-original grant required: '+decision.reasons.join(','));
  const root=await privateRoot(output_directory);
  const stat=await lstat(local_path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maxBytes)throw Error('Owner original must be a regular file within 15 MiB');
  const bytes=await readFile(local_path);
  const head=bytes.subarray(0,12).toString('latin1');
  const extension=head.startsWith('\xff\xd8\xff')?'jpg':head.startsWith('\x89PNG')?'png':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'webp':null;
  if(!extension)throw Error('Unsupported owner original format');
  const facts=await imageFacts(bytes);
  const kept=await keepOriginal(root,bytes,extension);
  return {source_url:'owner-original:'+kept.sha256,sha256:kept.sha256,bytes:bytes.length,path:kept.path,grant_reference:grant.grant_reference,
    acquisition:'owner_file',etag:null,last_modified:null,...facts};
}

/**
 * Preserves a local, untouched copy of one Wikimedia-served rendition an open-licence grant names, without any
 * network request. The copy is bound to its URL only by recorded values, so it must match its recorded sha256 and
 * decode to exactly the recorded rendition width. A held copy can never stand for an original: originals are
 * downloaded with acquireOriginal and checked against what Commons serves, so thumbnail bytes cannot be recorded
 * under an original URL. The one exception is an original already recorded: when the operator's fresh read of the live
 * evidence gives this exact file's recorded original (recorded_original: its original_sha256, width and height, read for
 * this grant and file URL), a held copy with that sha256 and that decoded size is accepted. Those bytes were downloaded
 * from Commons and checked when that evidence was recorded, so no redundant download is made and no other bytes can
 * stand for the original.
 */
export async function keepOpenLicenseFile({candidate,grant,file_url,local_path,expected_sha256,output_directory,recorded_original}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url:file_url});
  if(decision.state!=='permitted'||grant.kind!=='open_license')throw Error('Permitted open-licence grant for this file required: '+decision.reasons.join(','));
  const file=licensedFile(grant,file_url);
  const recorded=file.file_kind==='original'&&recorded_original!==undefined;
  if(recorded&&(recorded_original?.original_sha256!==expected_sha256||!Number.isInteger(recorded_original.width)||!Number.isInteger(recorded_original.height)))throw Error('A held original must carry the sha256 and size its live evidence recorded');
  if(file.file_kind!=='rendition'&&!recorded)throw Error('A held copy is accepted only for a recorded rendition; download an original instead');
  if(!hashPattern.test(expected_sha256??''))throw Error('A held rendition needs its recorded sha256');
  const root=await privateRoot(output_directory);
  const stat=await lstat(local_path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maxBytes)throw Error('Held Commons file must be a regular file within 15 MiB');
  const bytes=await readFile(local_path);
  if(digest(bytes)!==expected_sha256)throw Error('Held Commons file differs from its recorded checksum');
  const head=bytes.subarray(0,12).toString('latin1');
  const extension=head.startsWith('\xff\xd8\xff')?'jpg':head.startsWith('\x89PNG')?'png':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'webp':null;
  if(!extension)throw Error('Unsupported held Commons file format');
  // Decode the pixels (not only the header) upright, as the derivative pipeline will see them.
  const {info}=await installedImageEngine()(bytes,{failOn:'warning'}).autoOrient().raw().toBuffer({resolveWithObject:true});
  if(recorded){if(info.width!==recorded_original.width||info.height!==recorded_original.height)throw Error('Held original size differs from its recorded size');}
  else if(info.width!==file.rendition_width)throw Error('Held rendition width differs from the recorded rendition width');
  const facts=await imageFacts(bytes);
  const kept=await keepOriginal(root,bytes,extension);
  return {source_url:file_url,sha256:kept.sha256,bytes:bytes.length,width:info.width,height:info.height,path:kept.path,file_kind:file.file_kind,rendition_width:file.rendition_width,grant_reference:grant.grant_reference,
    acquisition:'held_copy',orientation:facts.orientation,format:facts.format,has_alpha:facts.has_alpha};
}

/**
 * Builds the exact per-asset derivative binding the responsive helper requires, then prepares files. With `cutout`
 * ({path, sha256, producer}), the derivatives are made from that background-only cutout master after it passes its
 * check against this original (decision 0015); approvalBundle then also needs the cutout's independent review.
 */
export async function prepareGrantedMedia({source,candidate,asset,grant,output_directory,cutout,square_sha256,tile_sha256}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url:asset.source_url});
  if(decision.state!=='permitted')throw Error('Media grant not permitted: '+decision.reasons.join(','));
  if(tile_sha256!==undefined){
    // A flat tile (G2): the native alpha of the original, or a checked cutout, on the flat grey square accepted by hash.
    if(square_sha256!==undefined)throw Error('An image is a white square or a flat tile, not both');
    if(grant.kind==='open_license')throw Error('A flat tile is not offered for open-licence images: its credit wording is not reviewed');
    const basis=cutout===undefined?null:cutoutBasisProblem(grant);
    if(basis)throw Error('Background removal is not covered: '+basis);
    return prepareResponsiveMedia({purpose:'catalog',source:{...source,media_permission_reference:grant.grant_reference,media_origins:grant.media_origins??[]},candidate,asset,output_directory,
      treatment:{kind:flatTileTreatment.kind,tile_sha256,...(cutout===undefined?{}:{cutout})},
      grant:{kind:grant.kind,media_permission_reference:grant.grant_reference,source_id:source.id,candidate_id:candidate.candidate_id,
        revision_hash:candidate.revision_hash,asset_source_url:asset.source_url,asset_sha256:asset.sha256,
        website_publication:grant.website_publication,resize:grant.resize,webp_encode:grant.webp_encode,...(cutout===undefined?{}:{background_removal:true})}});
  }
  const basis=cutout===undefined?null:cutoutBasisProblem(grant);
  if(basis)throw Error('Background removal is not covered: '+basis);
  // The source's own publication flag stays a separate owner decision; it is passed through, never set here.
  // An open-licence file is outside the brand gallery: the binding sees only the one granted file being prepared.
  const open=grant.kind==='open_license';
  const view={...source,media_permission_reference:grant.grant_reference,media_origins:open?[new URL(asset.source_url).origin]:grant.media_origins??[]};
  return prepareResponsiveMedia({purpose:'catalog',source:view,candidate:open?{...candidate,image_urls:[asset.source_url]}:candidate,asset,output_directory,
    // With square_sha256 the cutout becomes the white square accepted by that exact hash (decision 0022).
    ...(cutout===undefined?{}:{treatment:square_sha256===undefined?{kind:cutoutTreatment.kind,cutout}:{kind:whiteSquareTreatment.kind,cutout,square_sha256}}),
    grant:{kind:grant.kind,media_permission_reference:grant.grant_reference,source_id:source.id,candidate_id:candidate.candidate_id,
      revision_hash:candidate.revision_hash,asset_source_url:asset.source_url,asset_sha256:asset.sha256,
      website_publication:grant.website_publication,resize:grant.resize,webp_encode:grant.webp_encode,...(cutout===undefined?{}:{background_removal:true})}});
}

// A verification record quotes its reviewers' reasons unabridged, so it may be longer than a short text field.
const record=value=>typeof value==='string'&&value.trim().length>0&&value.length<=8000;
const reference=value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
/**
 * The only forms of a catalogue reference that a creator's statement may give, normalised (lower case, letters and
 * digits only): the full reference (m126234-0015), the full reference without a brand prefix letter (126234-0015),
 * the model segment before the first hyphen (m126234) and that segment without its prefix letter (126234). A
 * fragment such as "1262" (the shared stem of sibling references 126200, 126231, 126233, 126234 ...), "6234",
 * "34-00" or the variant suffix "0015" alone is none of these and is refused; so is a sibling such as 126334.
 */
export function catalogueReferenceForms(external_id){
  const full=String(external_id??'').trim().toLowerCase();
  const model=full.split('-')[0];
  const unprefixed=value=>/^[a-z][0-9]/.test(value)?value.slice(1):value;
  return [...new Set([full,unprefixed(full),model,unprefixed(model)].map(reference))].filter(form=>form.length>=4);
}
export const statedReferenceMatches=(stated,external_id)=>typeof stated==='string'&&catalogueReferenceForms(external_id).includes(reference(stated));

/**
 * Why an independent identity determination cannot settle exact_reference for this file, or null when it can. It
 * applies only where the visual record left exact_reference "uncertain" (never false): it must name the exact
 * original by sha256, say identity_established literally true, carry the creator-stated reference (equal to the full
 * catalogue reference or to its model segment, catalogueReferenceForms; a fragment or a sibling such as 126334 is refused) and be quoted, reviewer and reason, in the
 * verification record. The determination is a separate reviewer's record; code never creates one.
 */
export function identityDeterminationProblem(verification,{candidate,asset}){
  const d=verification?.identity_determination;
  if(!d||typeof d!=='object')return 'no identity determination';
  if(d.asset_sha256!==asset.sha256)return 'identity determination names other bytes';
  if(d.identity_established!==true)return 'identity_established is not true';
  if(!text(d.creator_stated_reference)||reference(d.creator_stated_reference).length<4)return 'no creator-stated reference';
  if(!statedReferenceMatches(d.creator_stated_reference,candidate.external_id))return 'creator-stated reference is not this catalogue reference';
  if(!text(d.reviewer)||!record(d.reason))return 'identity determination needs its reviewer and reason';
  // A name comparison only (both names come from the same input): the visual reviewer cannot settle its own uncertain
  // check. Independence of the identity reviewer is otherwise procedural.
  if(String(d.reviewer).trim().toLowerCase()===String(verification.reviewer).trim().toLowerCase())return 'identity determination must name a reviewer other than the visual reviewer';
  const quoted=verification.verification_reference??'';
  if(!quoted.includes(d.reviewer)||!quoted.includes(d.reason)||!quoted.includes(d.creator_stated_reference))return 'verification record does not quote the identity determination';
  return null;
}

/**
 * Why an official gallery listing cannot settle exact_reference for this file, or null when it can (G1: one photograph
 * a source uses for several sizes of one design and colour). Under written permission only, the determination must
 * name this exact file (sha256) as listed in this reference's own gallery at the candidate's current revision, the
 * same URL the bytes came from, by a reviewer other than the visual reviewer, quoted in the record. color_and_variant
 * stays a separate check that must be literally true, so a listing never settles another colour or design.
 */
export function galleryListingProblem(verification,{candidate,asset,grant}){
  const d=verification?.identity_determination;
  if(!d||typeof d!=='object')return 'no identity determination';
  if(grant?.kind!=='written_permission')return 'a gallery listing settles identity only under written permission';
  if(d.asset_sha256!==asset.sha256)return 'identity determination names other bytes';
  if(d.identity_established!==true)return 'identity_established is not true';
  if(d.reference!==candidate.external_id)return 'gallery listing names another reference';
  if(!hashPattern.test(d.revision_hash??'')||d.revision_hash!==candidate.revision_hash)return 'gallery listing is for another candidate revision';
  if(d.gallery_url!==asset.source_url||!(candidate.image_urls??[]).includes(d.gallery_url))return "the file is not in this reference's own current gallery";
  if(!text(d.reviewer)||!record(d.reason))return 'identity determination needs its reviewer and reason';
  if(String(d.reviewer).trim().toLowerCase()===String(verification.reviewer).trim().toLowerCase())return 'identity determination must name a reviewer other than the visual reviewer';
  const quoted=verification.verification_reference??'';
  if(![d.reviewer,d.reason,d.gallery_url,asset.sha256].every(part=>quoted.includes(part)))return 'verification record does not quote the gallery listing';
  return null;
}

/**
 * A human or agent visual check of one exact original. Code never creates a passing record itself. Every check must
 * be literally true, except that exact_reference may be "uncertain" (never false) when an independent identity
 * determination establishes the reference from the creator's own statement (identityDeterminationProblem).
 */
export function requireVerification(verification,{candidate,asset,grant}){
  if(!verification||verification.asset_sha256!==asset.sha256||verification.verified_reference!==candidate.external_id)throw Error('Verification must name this exact original and reference');
  if(!text(verification.reviewer)||!record(verification.verification_reference))throw Error('Verification reviewer and private record required');
  const failed=verificationChecks.filter(check=>check!=='exact_reference'&&verification.checks?.[check]!==true);
  const exact=verification.checks?.exact_reference;
  if(exact!==true){
    const basis=verification.identity_determination?.basis;
    const route=basis===undefined||basis==='creator_stated_reference'?identityDeterminationProblem:basis==='official_gallery_listing'?galleryListingProblem:()=>'unknown identity basis';
    const problem=exact==='uncertain'?route(verification,{candidate,asset,grant}):'not true or uncertain';
    if(problem)failed.unshift(`exact_reference (${problem})`);
  }
  if(failed.length)throw Error('Visual verification incomplete: '+failed.join(','));
  return verification;
}

const exceptionKinds=['byte_budget','fidelity_floor'];
const sameName=(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
/**
 * An independent reviewed performance exception (docs/STOREFRONT-PERFORMANCE-2026-10-21.md: "a reviewed exception
 * rather than destructive compression where details suffer"). It is a file written by a reviewer who is not the batch
 * writer; the tooling only reads it, there is no default, and nothing here creates one. Shape:
 *   {reviewer, reviewed_at, independent_of_batch_writer: true, basis,
 *    exceptions: [{asset_sha256, width, sha256, bytes, accepted: ["byte_budget"|"fidelity_floor"], reason}]}
 * prepared_by names the batch writer; a record whose reviewer is that writer is refused as self-granted. This is a name
 * comparison on values the runner input supplies, and independent_of_batch_writer is declared by the record itself:
 * independence is guaranteed by procedure (who writes the file), not technically enforced here.
 */
export function performanceExceptionRecord(value,{prepared_by}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Performance exception record must be an object');
  if(!text(value.reviewer)||!text(value.reviewed_at)||!text(value.basis))throw Error('Performance exception needs its reviewer, reviewed_at and basis');
  if(value.independent_of_batch_writer!==true)throw Error('Performance exception must be independent of the batch writer');
  if(!text(prepared_by))throw Error('Performance exception needs the batch writer named (prepared_by) to refuse a self-granted record');
  if(sameName(value.reviewer,prepared_by))throw Error('Performance exception refused: self-granted by the batch writer');
  if(!Array.isArray(value.exceptions)||!value.exceptions.length||value.exceptions.length>160)throw Error('Performance exception needs one entry per excepted derivative');
  const seen=new Set();
  for(const e of value.exceptions){
    if(!hashPattern.test(e?.asset_sha256??'')||!hashPattern.test(e.sha256??'')||!Number.isInteger(e.width)||!Number.isInteger(e.bytes)||!text(e.reason))throw Error('Performance exception entry needs asset_sha256, width, sha256, bytes and reason');
    if(!Array.isArray(e.accepted)||!e.accepted.length||new Set(e.accepted).size!==e.accepted.length||e.accepted.some(k=>!exceptionKinds.includes(k)))throw Error('Performance exception entry must accept byte_budget and/or fidelity_floor');
    if(seen.has(e.sha256))throw Error('Duplicate performance exception entry');
    seen.add(e.sha256);
  }
  return value;
}
// The exception entries that cover exactly this manifest's flagged derivatives; any gap or extra entry is refused.
function exceptedDerivatives(manifest,asset,exception){
  const files=[...manifest.variants,manifest.detail].filter((file,i,all)=>all.findIndex(other=>other.width===file.width)===i);
  const flagged=files.filter(f=>f.over_budget||!f.fidelity_floor_met);
  const entries=(exception?.exceptions??[]).filter(e=>e.asset_sha256===asset.sha256);
  if(!flagged.length){
    if(entries.length)throw Error('Performance exception names a derivative that needs none');
    return [];
  }
  if(!exception)throw Error('Derivative byte budget needs review before approval: no independent performance exception recorded');
  for(const f of flagged){
    const want=[...(f.over_budget?['byte_budget']:[]),...(!f.fidelity_floor_met?['fidelity_floor']:[])];
    const e=entries.find(x=>x.sha256===f.sha256);
    if(!e||e.width!==f.width||e.bytes!==f.bytes||[...e.accepted].sort().join()!==want.sort().join())
      throw Error(`Derivative byte budget needs review before approval: no exact exception for ${f.width}w ${f.sha256}`);
  }
  if(entries.some(e=>!flagged.some(f=>f.sha256===e.sha256)))throw Error('Performance exception names a derivative that needs none');
  return entries;
}

/**
 * The independent visual comparison of one cutout master with its original (decision 0015). The reviewer confirms each
 * of cutoutReviewChecks, literally true, for exactly these two files; code never creates a passing record. The manifest
 * must be a checked background-only cutout of this original, and the grant must cover the treatment. A name comparison
 * refuses a review by the batch writer (prepared_by) or by the master's producer, so both must be named; independence is
 * otherwise procedural.
 * Returns what the evidence rows record.
 */
export function requireCutoutReview(review,{manifest,asset,grant,prepared_by,square_review,tile_review}){
  const t=manifest?.treatment,b=manifest?.binding?.treatment,m=manifest?.cutout_master;
  if(t?.kind===flatTileTreatment.kind||b?.kind===flatTileTreatment.kind||manifest?.flat_tile!==undefined)return requireFlatTileReview(review,tile_review,{manifest,asset,grant,prepared_by});
  if(t?.kind===whiteSquareTreatment.kind||b?.kind===whiteSquareTreatment.kind||manifest?.white_square!==undefined)return requireWhiteSquareReview(review,square_review,{manifest,asset,grant,prepared_by});
  if(t?.kind!==cutoutTreatment.kind||t.version!==cutoutTreatment.version||b?.kind!==t.kind||b.version!==t.version||b.cutout_sha256!==t.cutout_sha256
    ||m?.sha256!==t.cutout_sha256||m.check?.passed!==true||m.check.original?.sha256!==asset.sha256||m.check.cutout?.sha256!==t.cutout_sha256
    ||manifest.pixel_source!=='cutout_master'||manifest.processing?.background_removed!==true)throw Error('Prepared derivatives are not a checked background-only cutout of this original');
  if(!text(t.producer))throw Error('A cutout needs its producer named, so that its review can be checked against it');
  const basis=cutoutBasisProblem(grant);
  if(basis)throw Error('Background removal is not covered: '+basis);
  if(!review||review.cutout_sha256!==t.cutout_sha256||review.original_sha256!==asset.sha256)throw Error('Cutout review must name this exact cutout master and original');
  if(!text(review.reviewer)||!record(review.review_reference))throw Error('Cutout review needs its reviewer and private record');
  const failed=cutoutReviewChecks.filter(check=>review.checks?.[check]!==true);
  if(failed.length)throw Error('Cutout review incomplete: '+failed.join(','));
  if(!text(prepared_by))throw Error('A cutout approval needs the batch writer named (prepared_by)');
  if([prepared_by,t.producer].some(name=>text(name)&&sameName(review.reviewer,name)))throw Error('Cutout review refused: the reviewer prepared the batch or made the cutout');
  return {treatment:cutoutTreatment.kind,treatment_version:cutoutTreatment.version,cutout_master_sha256:t.cutout_sha256,treatment_reference:review.review_reference};
}

/**
 * A white square (decision 0022): the cutout review of its master (cutoutReviewChecks, all true, as for any cutout) and
 * the review of exactly this square by its sha256 (whiteSquareReviewChecks, all true). The master may touch its source
 * frame only because the source photograph cuts the product off; that is recorded as source_clipped and disclosed.
 */
/**
 * A flat tile is approved only with an independent tile review naming its exact hash, plus the cutout review when its
 * alpha came from a cutout. A native-alpha tile has no cutout review; its source transparency is the tile review's
 * first check. The evidence row records the tile in square_sha256 and the cutout master, if any.
 */
function requireFlatTileReview(review,tileReview,{manifest,asset,grant,prepared_by}){
  const t=manifest.treatment,b=manifest.binding?.treatment,m=manifest.cutout_master,f=manifest.flat_tile,cut=t?.cutout_sha256??null;
  if(t?.kind!==flatTileTreatment.kind||t.version!==flatTileTreatment.version||b?.kind!==t.kind||b.version!==t.version||b.cutout_sha256!==cut||b.tile_sha256!==t.tile_sha256
    ||f?.sha256!==t.tile_sha256||f.record?.changed_opaque_product_pixels!==0||t.source_clipped!==false||manifest.pixel_source!=='flat_tile'||manifest.processing?.canvas?.kind!=='flat_tile'
    ||(cut!==null&&(m?.sha256!==cut||m.check?.passed!==true||m.check.original?.sha256!==asset.sha256||manifest.processing?.background_removed!==true))
    ||(cut===null&&(m!==undefined||manifest.processing?.background_removed!==undefined)))
    throw Error('Prepared derivatives are not a checked flat tile of this original');
  if(grant.kind==='open_license')throw Error('A flat tile is not offered for open-licence images');
  if(cut!==null){const basis=cutoutBasisProblem(grant);if(basis)throw Error('Background removal is not covered: '+basis);}
  if(cut!==null&&(!review||review.cutout_sha256!==cut||review.original_sha256!==asset.sha256))throw Error('Cutout review must name this exact cutout master and original');
  if(cut===null&&review!==undefined)throw Error('A native-alpha flat tile has no cutout to review');
  if(!tileReview||tileReview.tile_sha256!==t.tile_sha256||tileReview.cutout_sha256!==cut||tileReview.original_sha256!==asset.sha256)throw Error('Flat tile review must name this exact tile, cutout master (or null) and original');
  const reviews=cut===null?[tileReview]:[review,tileReview];
  for(const r of reviews)if(!text(r.reviewer)||!record(r.review_reference))throw Error('Each review needs its reviewer and private record');
  const failed=[...(cut===null?[]:cutoutReviewChecks.filter(check=>review.checks?.[check]!==true)),...flatTileReviewChecks.filter(check=>tileReview.checks?.[check]!==true)];
  if(failed.length)throw Error('Flat tile review incomplete: '+failed.join(','));
  if(!text(prepared_by))throw Error('A flat tile approval needs the batch writer named (prepared_by)');
  for(const r of reviews)if([prepared_by,t.producer].some(name=>text(name)&&sameName(r.reviewer,name)))throw Error('Review refused: the reviewer prepared the batch or made the cutout');
  const reference=`Flat tile review of tile ${t.tile_sha256}: ${tileReview.review_reference}`+(cut===null?'':` || Cutout review of master ${cut}: ${review.review_reference}`);
  if(!record(reference))throw Error('The combined review record is longer than 8000 characters');
  return {treatment:flatTileTreatment.kind,treatment_version:flatTileTreatment.version,cutout_master_sha256:cut,treatment_reference:reference,square_sha256:t.tile_sha256,source_clipped:false};
}

function requireWhiteSquareReview(review,square,{manifest,asset,grant,prepared_by}){
  const t=manifest.treatment,b=manifest.binding?.treatment,m=manifest.cutout_master,w=manifest.white_square;
  const allowed=m?.check?.failures?.every(f=>f==='product_touches_canvas_edge');
  if(t?.kind!==whiteSquareTreatment.kind||t.version!==whiteSquareTreatment.version||b?.kind!==t.kind||b.version!==t.version||b.cutout_sha256!==t.cutout_sha256||b.square_sha256!==t.square_sha256
    ||m?.sha256!==t.cutout_sha256||allowed!==true||m.check.original?.sha256!==asset.sha256||m.check.cutout?.sha256!==t.cutout_sha256||w?.sha256!==t.square_sha256
    ||typeof t.source_clipped!=='boolean'||w.record?.clipped_by_source!==t.source_clipped||manifest.pixel_source!=='white_square'||manifest.processing?.background_removed!==true||manifest.processing?.canvas?.kind!=='white_square')
    throw Error('Prepared derivatives are not a checked white square of a background-only cutout of this original');
  if(!text(t.producer))throw Error('A cutout needs its producer named, so that its review can be checked against it');
  const basis=cutoutBasisProblem(grant);
  if(basis)throw Error('Background removal is not covered: '+basis);
  if(!review||review.cutout_sha256!==t.cutout_sha256||review.original_sha256!==asset.sha256)throw Error('Cutout review must name this exact cutout master and original');
  if(!square||square.square_sha256!==t.square_sha256||square.cutout_sha256!==t.cutout_sha256||square.original_sha256!==asset.sha256)throw Error('White square review must name this exact square, cutout master and original');
  for(const r of [review,square])if(!text(r.reviewer)||!record(r.review_reference))throw Error('Each review needs its reviewer and private record');
  const failed=[...cutoutReviewChecks.filter(check=>review.checks?.[check]!==true),...whiteSquareReviewChecks.filter(check=>square.checks?.[check]!==true)];
  if(failed.length)throw Error('White square review incomplete: '+failed.join(','));
  if(!text(prepared_by))throw Error('A cutout approval needs the batch writer named (prepared_by)');
  for(const r of [review,square])if([prepared_by,t.producer].some(name=>text(name)&&sameName(r.reviewer,name)))throw Error('Review refused: the reviewer prepared the batch or made the cutout');
  const reference=`White square review of square ${t.square_sha256}: ${square.review_reference} || Cutout review of master ${t.cutout_sha256}: ${review.review_reference}`;
  if(!record(reference))throw Error('The combined review record is longer than 8000 characters');
  return {treatment:whiteSquareTreatment.kind,treatment_version:whiteSquareTreatment.version,cutout_master_sha256:t.cutout_sha256,treatment_reference:reference,square_sha256:t.square_sha256,source_clipped:t.source_clipped};
}

/**
 * Turns verified, prepared derivatives into exact public URLs, evidence rows and an approval that
 * mirror the database contract. Nothing is uploaded, recorded or published by this function. A cutout item also needs
 * its cutout_review; its evidence rows carry the treatment, and its open-licence credit states the removal.
 */
export function approvalBundle({candidate,grant,items,public_base_url,performance_exception=null,prepared_by}){
  const base=new URL(public_base_url);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/storage/v1/object/public/jwl-product-media'))throw Error('Public product-media bucket URL required');
  if(!Array.isArray(items)||!items.length||items.length>20)throw Error('Between one and twenty prepared images required');
  const exception=performance_exception===null||performance_exception===undefined?null:performanceExceptionRecord(performance_exception,{prepared_by});
  const evidence=[],entries=[],uploads=[],excepted=[];
  for(const item of items){
    const {asset,manifest,verification}=item;
    if('performance_review_accepted' in item)throw Error('performance_review_accepted is not accepted: record an independent performance exception file');
    const decision=evaluateMediaGrant(grant,{candidate,asset_url:asset.source_url});
    if(decision.state!=='permitted')throw Error('Media grant not permitted: '+decision.reasons.join(','));
    requireVerification(verification,{candidate,asset,grant});
    const b=manifest?.binding;
    if(manifest?.publication_state!=='private-prepared'||b?.candidate_id!==candidate.candidate_id||b.revision_hash!==candidate.revision_hash||b.asset_sha256!==asset.sha256||b.asset_source_url!==asset.source_url||b.media_permission_reference!==grant.grant_reference)
      throw Error('Prepared derivatives do not bind this exact candidate revision, original and grant');
    // Any cutout marker makes the image a cutout, which must then be complete and reviewed; a review can never turn an
    // ordinary image into one.
    const marked=['treatment','pixel_source','cutout_master','cutout_review_required','white_square','white_square_review_required','flat_tile','flat_tile_review_required'].some(key=>manifest[key]!==undefined)||b.treatment!==undefined||manifest.processing?.background_removed!==undefined||manifest.processing?.canvas!==undefined;
    const treatment=marked?requireCutoutReview(item.cutout_review,{manifest,asset,grant,prepared_by,square_review:item.square_review,tile_review:item.tile_review}):null;
    if(!treatment&&(item.cutout_review!==undefined||item.square_review!==undefined||item.tile_review!==undefined))throw Error('A cutout review was supplied for an image that is not a cutout');
    if(treatment?.treatment!==whiteSquareTreatment.kind&&item.square_review!==undefined)throw Error('A white square review was supplied for an image that is not a white square');
    if(treatment?.treatment!==flatTileTreatment.kind&&item.tile_review!==undefined)throw Error('A flat tile review was supplied for an image that is not a flat tile');
    const squared=treatment?.treatment===whiteSquareTreatment.kind,tiled=treatment?.treatment===flatTileTreatment.kind;
    // An image whose source photograph cuts the product off says so; a white square's own record decides for it.
    if(item.source_clipped!==undefined&&(item.source_clipped!==true||squared||tiled))throw Error('source_clipped is a disclosure (true) for an image that is not a white square');
    // Alpha is encoded losslessly, so any alpha difference is refused outright; no exception record can cover it.
    if([...manifest.variants,manifest.detail].some(f=>f.alpha_max_delta!==undefined&&f.alpha_max_delta!==0))throw Error('A derivative changed its alpha channel; it cannot be approved');
    // A flagged derivative passes only with an exact entry in an independent reviewed exception record (never default).
    const covered=exceptedDerivatives(manifest,asset,exception);
    if(manifest.performance_review_required&&!covered.length)throw Error('Derivative byte budget needs review before approval');
    excepted.push(...covered);
    const files=[...manifest.variants,manifest.detail].filter((file,i,all)=>all.findIndex(other=>other.width===file.width)===i).sort((a,b)=>a.width-b.width);
    const variants=files.map(file=>{
      if(!hashPattern.test(file.sha256)||!/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-[a-f0-9]{64}\.webp$/.test(file.path)||!file.path.includes(file.sha256))throw Error('Derivative path must be content-addressed');
      const src=base.href+'/'+file.path;
      uploads.push({path:file.path,sha256:file.sha256,bytes:file.bytes,mime_type:'image/webp'});
      evidence.push({candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,public_url:src,public_sha256:file.sha256,width:file.width,height:file.height,
        original_source:asset.source_url,original_sha256:asset.sha256,grant_reference:grant.grant_reference,verified_reference:candidate.external_id,verification_reference:verification.verification_reference,
        ...(treatment??{})});
      return {src,width:file.width,height:file.height,bytes:file.bytes};
    });
    const canonical=variants.find(v=>v.width===manifest.detail.width);
    if(!variants.some(v=>v.width<=960)||variants.length>8)throw Error('Responsive variants must include a card size and stay bounded');
    const entry={src:canonical.src,width:canonical.width,height:canonical.height,variants,
      ...(squared?{canvas:'white_square'}:tiled?{canvas:'flat_tile'}:{}),...((squared?treatment.source_clipped:item.source_clipped)===true?{source_clipped:true}:{})};
    if(grant.kind==='open_license'){
      // The credit states exactly what the recorded processing did: uncropped, not enlarged, colours unchanged.
      const p=manifest.processing,visual=manifest.original?.visual_width,file=licensedFile(grant,asset.source_url);
      // A white square's derivatives are resizes of the square, not of the original's frame.
      const frame=squared?manifest.white_square.side:visual;
      if(p?.crop!==false||p.upscale!==false||p.color_adjustments!==false||!Number.isInteger(visual))throw Error('Open-licence derivatives must be recorded uncropped resizes');
      if(file.file_kind==='rendition'){
        // A rendition is honest only at its recorded width, and nothing published from it may be wider.
        if(visual!==file.rendition_width)throw Error('Held rendition width differs from the recorded rendition width');
        if(files.some(f=>f.width>file.rendition_width))throw Error('Open-licence derivatives cannot be wider than their source rendition');
      }
      // A rendition is already a resize of the licensed original.
      entry.attribution=openLicenseAttribution(grant,creditChanges({resized:file.file_kind==='rendition'||files.some(f=>f.width<frame),background_removed:treatment!==null,white_square:squared}),file);
    }
    entries.push(entry);
  }
  if(new Set(entries.map(e=>e.src)).size!==entries.length)throw Error('Duplicate approved image');
  if(exception&&exception.exceptions.length!==excepted.length)throw Error('Performance exception names a derivative that is not in this bundle');
  return {
    ...(exception?{performance_exception:{reviewer:exception.reviewer,reviewed_at:exception.reviewed_at,basis:exception.basis,exceptions:excepted}}:{}),
    approval:{candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,media_reference:grant.grant_reference,image_verified:true,approved_images:entries.map(e=>e.src),approved_image_variants:entries},
    evidence,uploads,publication_state:'verified-not-uploaded',
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [candidatesPath,grantsPath]=process.argv.slice(2);
  if(!candidatesPath)throw Error('Usage: node media-pipeline.mjs PRIVATE_CANDIDATES.ndjson [PRIVATE_GRANTS.json]');
  const candidates=(await readFile(candidatesPath,'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
  const grants=grantsPath?JSON.parse(await readFile(grantsPath,'utf8')):[];
  console.log(JSON.stringify(mediaReadiness(candidates,{grants}),null,2));
}
