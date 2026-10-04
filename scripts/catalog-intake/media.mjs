import {createHash} from 'node:crypto';

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
