import {createHash} from 'node:crypto';
import {open,lstat,readFile,mkdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {privateRoot,recordedSourceStops,agent} from './source-queue.mjs';
import {prepareResponsiveMedia} from './responsive-media.mjs';

const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
const robotsParser=require('robots-parser');
const hashPattern=/^[a-f0-9]{64}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2000;
const formats={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
const maxBytes=15728640;
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const verificationChecks=['exact_reference','color_and_variant','authentic_product_photo','not_generated_or_altered','clear_product_view'];

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

/** An official image URL is never permission. Only an exact recorded grant can permit media use. */
export function evaluateMediaGrant(grant,{candidate,asset_url,now=Date.now()}={}){
  if(!grant)return {state:'awaiting_permission',reasons:['no_media_grant']};
  if(grant.kind==='open_license')return {state:'rejected',reasons:['open_license_requires_attribution_support_and_owner_decision']};
  if(!['owner_original','written_permission'].includes(grant.kind))return {state:'rejected',reasons:['unsupported_grant_kind']};
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
    const decision=evaluateMediaGrant(grant,{candidate,asset_url:candidate.image_urls?.[0]});
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
 * Downloads one exact gallery original under a permitted written grant. Robots, refusals, rate limits
 * and redirects stop the transfer; the untouched original is preserved privately by checksum.
 */
/**
 * Per-origin pacing and robots cache shared by every download made through one pacer, so a caller
 * looping over many assets still spaces requests to each media origin.
 */
export function createMediaPacer({min_interval_seconds=2,robots_ttl_seconds=3600,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}){
  const next=new Map(),robots=new Map(),interval=Math.max(2,min_interval_seconds)*1000;
  return {now,
    async wait(origin){const at=next.get(origin)??0;if(at>now())await sleep(at-now());next.set(origin,now()+interval);},
    robots(origin){const hit=robots.get(origin);return hit&&hit.until>now()?hit.policy:null;},
    remember(origin,policy){robots.set(origin,{policy,until:now()+robots_ttl_seconds*1000});}};
}
const defaultPacer=createMediaPacer();

export async function acquireOriginal({candidate,asset_url,grant,output_directory},{fetcher=fetch,pacer=defaultPacer}={}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url,now:pacer.now()});
  if(decision.state!=='permitted'||grant.kind!=='written_permission')throw Error('Permitted written media grant required: '+decision.reasons.join(','));
  const root=await privateRoot(output_directory),url=new URL(asset_url);
  const request=async target=>{
    await pacer.wait(url.origin);
    const response=await fetcher(target,{headers:{'User-Agent':agent},redirect:'manual',signal:AbortSignal.timeout(20000)});
    if([401,403,429].includes(response.status))throw Error(`Media source refused access (${response.status})`);
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

/** Builds the exact per-asset derivative binding the responsive helper requires, then prepares files. */
export async function prepareGrantedMedia({source,candidate,asset,grant,output_directory}){
  const decision=evaluateMediaGrant(grant,{candidate,asset_url:asset.source_url});
  if(decision.state!=='permitted')throw Error('Media grant not permitted: '+decision.reasons.join(','));
  // The source's own publication flag stays a separate owner decision; it is passed through, never set here.
  const view={...source,media_permission_reference:grant.grant_reference,media_origins:grant.media_origins??[]};
  return prepareResponsiveMedia({purpose:'catalog',source:view,candidate,asset,output_directory,
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
    entries.push({src:canonical.src,width:canonical.width,height:canonical.height,variants});
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
