import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';

const buckets={staging:'jwl-media-staging',published:'jwl-product-media'};
const formats={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
function storageConfig(config) {
  const url=new URL(config.url);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!config.key)throw new Error('Invalid media storage configuration');
  const headers={apikey:config.key};
  if(!config.key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${config.key}`;
  return {url,headers};
}
async function storage(config,path,options={},fetcher=fetch) {
  const {url,headers}=storageConfig(config);
  const response=await fetcher(new URL(`/storage/v1/${path}`,url),{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Media storage operation failed (${response.status})`);
  return response;
}
export async function setupMediaStorage(config,fetcher=fetch) {
  // Creation is explicit; don't silently change an existing bucket's visibility.
  for(const [kind,id] of Object.entries(buckets)) {
    const {url,headers}=storageConfig(config);
    const existing=await fetcher(new URL(`/storage/v1/bucket/${id}`,url),{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
    if(existing.ok){const bucket=await existing.json();if(bucket.public!==(kind==='published'))throw new Error('Existing bucket visibility differs');continue;}
    if(existing.status!==404)throw new Error(`Bucket read failed (${existing.status})`);
    await storage(config,'bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:id,public:kind==='published',file_size_limit:15728640,allowed_mime_types:Object.keys(formats)})},fetcher);
  }
}
export async function stageMedia(source,images,config,fetcher=fetch) {
  if(!source.publication_allowed||!source.media_permission_reference||!Array.isArray(source.media_origins))throw new Error('Media permission required');
  const receipts=[];
  for(const image of images) {
    const url=new URL(image);
    if(url.protocol!=='https:'||url.username||url.password||!source.media_origins.includes(url.origin))throw new Error('Unapproved media origin');
    const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Source media refused (${response.status})`);
    const type=(response.headers.get('content-type')??'').split(';')[0];
    if(!formats[type])throw new Error('Unsupported source image type');
    if(Number(response.headers.get('content-length')??0)>15728640)throw new Error('Image exceeds size limit');
    let length=0;const chunks=[];
    for await(const chunk of response.body){length+=chunk.length;if(length>15728640)throw new Error('Image exceeds size limit');chunks.push(chunk);}
    if(!length)throw new Error('Empty image');
    const bytes=Buffer.concat(chunks);
    const digest=createHash('sha256').update(bytes).digest('hex');
    const grant=createHash('sha256').update(source.media_permission_reference).digest('hex').slice(0,16);
    const path=`${grant}/${digest}.${formats[type]}`;
    await storage(config,`object/${buckets.staging}/${path}`,{method:'POST',headers:{'Content-Type':type,'x-upsert':'true','cache-control':'private, max-age=0'},body:bytes},fetcher);
    receipts.push({path,sha256:digest,mime_type:type,source_url:url.href,publication_state:'private-staging'});
  }
  return receipts;
}
export async function promoteMedia(review,receipts,config,fetcher=fetch) {
  if(review.image_verified!==true||!review.media_permission_reference)throw new Error('Verified media review required');
  const grant=createHash('sha256').update(review.media_permission_reference).digest('hex').slice(0,16);
  const published=[];
  for(const receipt of receipts) {
    if(!new RegExp(`^${grant}/[a-f0-9]{64}\\.(?:jpg|png|webp|avif)$`).test(receipt.path))throw new Error('Media grant or path mismatch');
    const response=await storage(config,`object/authenticated/${buckets.staging}/${receipt.path}`,{},fetcher);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw new Error('Staged media checksum changed');
    await storage(config,`object/${buckets.published}/${receipt.path}`,{method:'POST',headers:{'Content-Type':receipt.mime_type,'x-upsert':'true','cache-control':'public, max-age=60'},body:bytes},fetcher);
    published.push(new URL(`/storage/v1/object/public/${buckets.published}/${receipt.path}`,config.url).href);
  }
  return published;
}

/** Uploads verified content-addressed derivatives; an object that already exists must match byte-for-byte. */
export async function uploadDerivatives(bundle,{output_directory,storage:config,approval_receipt},fetcher=fetch) {
  const {url,headers}=storageConfig(config);
  // Files become public only after the database accepted this exact approval and its evidence.
  const files=await approvedFiles(bundle,{output_directory,approval_receipt,public_prefix:new URL(`/storage/v1/object/public/${buckets.published}/`,url).href});
  const published=[];
  for(const file of files) {
    // Content-addressed paths never change meaning, so they may be cached immutably.
    const response=await fetcher(new URL(`/storage/v1/object/${buckets.published}/${file.path}`,url),{method:'POST',headers:{...headers,'Content-Type':'image/webp','x-upsert':'false','cache-control':'public, max-age=31536000, immutable'},body:file.bytes,redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok) {
      const detail=await response.text().catch(()=>'');
      if(response.status!==409&&!/duplicate|already exists/i.test(detail))throw new Error(`Media storage operation failed (${response.status})`);
      const existing=await fetcher(file.public_url,{redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!existing.ok||createHash('sha256').update(Buffer.from(await existing.arrayBuffer())).digest('hex')!==file.sha256)throw new Error('Existing public derivative differs');
    }
    published.push(file.public_url);
  }
  return published;
}

/** Checks prepared files against the bundle and its recorded approval receipt; shared by both upload paths. */
async function approvedFiles(bundle,{output_directory,approval_receipt,public_prefix}){
  if(bundle?.publication_state!=='verified-not-uploaded'||!Array.isArray(bundle.uploads)||!bundle.uploads.length)throw new Error('Verified approval bundle required');
  if(approval_receipt?.candidate_id!==bundle.approval?.candidate_id||approval_receipt?.revision_hash!==bundle.approval?.revision_hash||approval_receipt?.evidence_rows!==bundle.evidence?.length)throw new Error('Recorded approval receipt required before upload');
  const root=await realpath(output_directory);
  const expected=new Map(bundle.evidence.map(row=>[row.public_url,row.public_sha256]));
  const files=[];
  for(const file of bundle.uploads){
    if(!/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-[a-f0-9]{64}\.webp$/.test(file.path))throw new Error('Derivative path must be content-addressed');
    const bytes=await readFile(join(root,file.path));
    if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Prepared derivative checksum changed');
    const publicUrl=public_prefix+file.path;
    if(expected.get(publicUrl)!==file.sha256)throw new Error('Upload target differs from approved evidence');
    files.push({...file,bytes,public_url:publicUrl});
  }
  return files;
}

/**
 * Uploads through the deployed approval-bound function (jwl-media-upload): the runner holds no storage or
 * database credential, and the function re-checks each file's checksum against live recorded evidence.
 */
export async function uploadThroughFunction(bundle,{output_directory,approval_receipt,function_url,public_base_url,headers={}},fetcher=fetch){
  const endpoint=new URL(function_url),base=new URL(public_base_url);
  if(endpoint.protocol!=='https:'||!endpoint.hostname.endsWith('.supabase.co')||endpoint.pathname!=='/functions/v1/jwl-media-upload'||endpoint.username||endpoint.password||endpoint.search)throw new Error('Approved upload function URL required');
  if(base.origin!==endpoint.origin||base.pathname!==`/storage/v1/object/public/${buckets.published}`)throw new Error('Public product-media bucket of the same project required');
  const files=await approvedFiles(bundle,{output_directory,approval_receipt,public_prefix:base.href+'/'});
  const results=[];
  for(const file of files){
    const response=await fetcher(endpoint,{method:'PUT',headers:{...headers,'Content-Type':'image/webp','x-jwl-path':file.path},body:file.bytes,redirect:'error',signal:AbortSignal.timeout(30000)});
    const body=await response.json().catch(()=>({}));
    if(![200,201].includes(response.status)||body.sha256!==file.sha256||body.public_url!==file.public_url)throw new Error(`Approved upload refused (${response.status} ${body.error??'unconfirmed'})`);
    results.push({public_url:file.public_url,sha256:file.sha256,state:body.state});
  }
  return results;
}

/** Downloads every approved public file and proves it is the exact derivative: type, size and checksum. */
export async function verifyPublishedDerivatives(bundle,fetcher=fetch){
  const sizes=new Map(bundle.uploads.map(file=>[file.sha256,file.bytes]));
  const verified=[];
  for(const row of bundle.evidence){
    const response=await fetcher(row.public_url,{redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`Uploaded derivative unavailable (${response.status})`);
    if((response.headers.get('content-type')??'').split(';')[0].trim()!=='image/webp')throw new Error('Uploaded derivative type differs');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==row.public_sha256||(sizes.has(row.public_sha256)&&sizes.get(row.public_sha256)!==bytes.length))throw new Error('Uploaded derivative differs from approved evidence');
    verified.push({public_url:row.public_url,sha256:row.public_sha256,bytes:bytes.length});
  }
  return verified;
}

/** Deletes public files whose grant was revoked (from jwl_revoked_media_files); only content-addressed product media. */
export async function deleteRevokedDerivatives(publicUrls,config,fetcher=fetch) {
  const {url,headers}=storageConfig(config);
  const prefix=new URL(`/storage/v1/object/public/${buckets.published}/`,url).href;
  const paths=[...new Set(publicUrls)].map(value=>{
    if(typeof value!=='string'||!value.startsWith(prefix))throw new Error('Not a product-media file of this project');
    const path=value.slice(prefix.length);
    if(!/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-[a-f0-9]{64}\.webp$/.test(path))throw new Error('Derivative path must be content-addressed');
    return path;
  });
  const deleted=[];
  for(let offset=0;offset<paths.length;offset+=100) {
    const batch=paths.slice(offset,offset+100);
    await storage(config,`object/${buckets.published}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:batch})},fetcher);
    deleted.push(...batch);
  }
  return deleted;
}
