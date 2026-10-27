import {createHash} from 'node:crypto';
import {open,lstat,readFile,mkdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {privateRoot,recordedSourceStops,agent} from './source-queue.mjs';
import {prepareResponsiveMedia,installedImageEngine} from './responsive-media.mjs';

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
/** Whether one licensed-file record of an open-licence grant is an honest original or rendition of its page. */
export function commonsFile(file){
  if(!file||typeof file!=='object'||Array.isArray(file))return false;
  const keys=Object.keys(file).sort().join(',');
  if(keys!=='file_kind,file_url,rendition_width,source_page_url')return false;
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
/** The visible credit of one licensed file's image, exactly as the proposed migration re-derives it from the grant. */
export function openLicenseAttribution(grant,changes,file=grant.licensed_files?.[0]){
  return {creator:grant.creator,license:openLicenses[grant.license_code].label,license_url:grant.license_url,source_url:file.source_page_url,changes};
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
  const request=async target=>{
    await pacer.wait(url.origin);
    const response=await fetcher(target,{headers:{'User-Agent':mediaAgent},redirect:'manual',signal:AbortSignal.timeout(20000)});
    if([401,403].includes(response.status)){pacer.stop(url.origin);throw Error(`Media source refused access (${response.status})`);}
    if(response.status===429){const v=response.headers.get('retry-after'),s=Number(v);pacer.stop(url.origin,v==null?null:Number.isFinite(s)?pacer.now()+s*1000:Date.parse(v)||null);throw Error('Media source rate limited (429)');}
    if(response.status>=300&&response.status<400)throw Error('Media redirect requires review');
    return response;
  };
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
  const response=await request(url.href);
  if(!response.ok)throw Error(`Source media unavailable (${response.status})`);
  const mime=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  if(!formats[mime])throw Error('Unsupported source image type');
  const bytes=await boundedBytes(response);
  const kept=await keepOriginal(root,bytes,formats[mime]);
  return {source_url:url.href,sha256:kept.sha256,bytes:bytes.length,mime_type:mime,path:kept.path,acquired_at:new Date(pacer.now()).toISOString(),grant_reference:grant.grant_reference};
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
  const kept=await keepOriginal(root,bytes,extension);
  return {source_url:'owner-original:'+kept.sha256,sha256:kept.sha256,bytes:bytes.length,path:kept.path,grant_reference:grant.grant_reference};
}

/**
 * Preserves a local, untouched copy of one Wikimedia-served rendition an open-licence grant names, without any
 * network request. The copy is bound to its URL only by recorded values, so it must match its recorded sha256 and
 * decode to exactly the recorded rendition width. A held copy can never stand for an original: originals are
 * downloaded with acquireOriginal and checked against what Commons serves, so thumbnail bytes cannot be recorded
 * under an original URL.
 */
export async function keepOpenLicenseFile({candidate,grant,file_url,local_path,expected_sha256,output_directory}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url:file_url});
  if(decision.state!=='permitted'||grant.kind!=='open_license')throw Error('Permitted open-licence grant for this file required: '+decision.reasons.join(','));
  const file=licensedFile(grant,file_url);
  if(file.file_kind!=='rendition')throw Error('A held copy is accepted only for a recorded rendition; download an original instead');
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
  if(info.width!==file.rendition_width)throw Error('Held rendition width differs from the recorded rendition width');
  const kept=await keepOriginal(root,bytes,extension);
  return {source_url:file_url,sha256:kept.sha256,bytes:bytes.length,width:info.width,height:info.height,path:kept.path,file_kind:file.file_kind,rendition_width:file.rendition_width,grant_reference:grant.grant_reference};
}

/** Builds the exact per-asset derivative binding the responsive helper requires, then prepares files. */
export async function prepareGrantedMedia({source,candidate,asset,grant,output_directory}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url:asset.source_url});
  if(decision.state!=='permitted')throw Error('Media grant not permitted: '+decision.reasons.join(','));
  // The source's own publication flag stays a separate owner decision; it is passed through, never set here.
  // An open-licence file is outside the brand gallery: the binding sees only the one granted file being prepared.
  const open=grant.kind==='open_license';
  const view={...source,media_permission_reference:grant.grant_reference,media_origins:open?[new URL(asset.source_url).origin]:grant.media_origins??[]};
  return prepareResponsiveMedia({purpose:'catalog',source:view,candidate:open?{...candidate,image_urls:[asset.source_url]}:candidate,asset,output_directory,
    grant:{kind:grant.kind,media_permission_reference:grant.grant_reference,source_id:source.id,candidate_id:candidate.candidate_id,
      revision_hash:candidate.revision_hash,asset_source_url:asset.source_url,asset_sha256:asset.sha256,
      website_publication:grant.website_publication,resize:grant.resize,webp_encode:grant.webp_encode}});
}

/** A human or agent visual check of one exact original. Code never creates a passing record itself. */
export function requireVerification(record,{candidate,asset}){
  if(!record||record.asset_sha256!==asset.sha256||record.verified_reference!==candidate.external_id)throw Error('Verification must name this exact original and reference');
  if(!text(record.reviewer)||!text(record.verification_reference))throw Error('Verification reviewer and private record required');
  const failed=verificationChecks.filter(check=>record.checks?.[check]!==true);
  if(failed.length)throw Error('Visual verification incomplete: '+failed.join(','));
  return record;
}

/**
 * Turns verified, prepared derivatives into exact public URLs, evidence rows and an approval that
 * mirror the database contract. Nothing is uploaded, recorded or published by this function.
 */
export function approvalBundle({candidate,grant,items,public_base_url}){
  const base=new URL(public_base_url);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/storage/v1/object/public/jwl-product-media'))throw Error('Public product-media bucket URL required');
  if(!Array.isArray(items)||!items.length||items.length>20)throw Error('Between one and twenty prepared images required');
  const evidence=[],entries=[],uploads=[];
  for(const {asset,manifest,verification,performance_review_accepted} of items){
    const decision=evaluateMediaGrant(grant,{candidate,asset_url:asset.source_url});
    if(decision.state!=='permitted')throw Error('Media grant not permitted: '+decision.reasons.join(','));
    requireVerification(verification,{candidate,asset});
    const b=manifest?.binding;
    if(manifest?.publication_state!=='private-prepared'||b?.candidate_id!==candidate.candidate_id||b.revision_hash!==candidate.revision_hash||b.asset_sha256!==asset.sha256||b.asset_source_url!==asset.source_url||b.media_permission_reference!==grant.grant_reference)
      throw Error('Prepared derivatives do not bind this exact candidate revision, original and grant');
    if(manifest.performance_review_required&&performance_review_accepted!==true)throw Error('Derivative byte budget needs review before approval');
    const files=[...manifest.variants,manifest.detail].filter((file,i,all)=>all.findIndex(other=>other.width===file.width)===i).sort((a,b)=>a.width-b.width);
    const variants=files.map(file=>{
      if(!hashPattern.test(file.sha256)||!/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-[a-f0-9]{64}\.webp$/.test(file.path)||!file.path.includes(file.sha256))throw Error('Derivative path must be content-addressed');
      const src=base.href+'/'+file.path;
      uploads.push({path:file.path,sha256:file.sha256,bytes:file.bytes,mime_type:'image/webp'});
      evidence.push({candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,public_url:src,public_sha256:file.sha256,width:file.width,height:file.height,
        original_source:asset.source_url,original_sha256:asset.sha256,grant_reference:grant.grant_reference,verified_reference:candidate.external_id,verification_reference:verification.verification_reference});
      return {src,width:file.width,height:file.height,bytes:file.bytes};
    });
    const canonical=variants.find(v=>v.width===manifest.detail.width);
    if(!variants.some(v=>v.width<=960)||variants.length>8)throw Error('Responsive variants must include a card size and stay bounded');
    const entry={src:canonical.src,width:canonical.width,height:canonical.height,variants};
    if(grant.kind==='open_license'){
      // The credit states exactly what the recorded processing did: uncropped, not enlarged, colours unchanged.
      const p=manifest.processing,visual=manifest.original?.visual_width,file=licensedFile(grant,asset.source_url);
      if(p?.crop!==false||p.upscale!==false||p.color_adjustments!==false||!Number.isInteger(visual))throw Error('Open-licence derivatives must be recorded uncropped resizes');
      if(file.file_kind==='rendition'){
        // A rendition is honest only at its recorded width, and nothing published from it may be wider.
        if(visual!==file.rendition_width)throw Error('Held rendition width differs from the recorded rendition width');
        if(files.some(f=>f.width>file.rendition_width))throw Error('Open-licence derivatives cannot be wider than their source rendition');
      }
      // A rendition is already a resize of the licensed original.
      entry.attribution=openLicenseAttribution(grant,file.file_kind==='rendition'||files.some(f=>f.width<visual)?'resized and converted to WebP':'converted to WebP',file);
    }
    entries.push(entry);
  }
  if(new Set(entries.map(e=>e.src)).size!==entries.length)throw Error('Duplicate approved image');
  return {
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
