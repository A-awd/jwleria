// Approval-bound upload of one content-addressed product derivative. Shared by the Supabase Edge
// Function entry (Deno) and the Node tests; every dependency is injected, so no secret lives here.
const pathPattern=/^v1\/[a-f0-9]{64}\/[a-f0-9]{64}\/\d+w-([a-f0-9]{64})\.webp$/;
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

async function boundedBody(request,limit){
  const declared=Number(request.headers.get('content-length')??0);
  if(declared>limit)return null;
  if(!request.body)return new Uint8Array();
  const chunks=[];let size=0;
  for await(const chunk of request.body){size+=chunk.length;if(size>limit)return null;chunks.push(chunk);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}
const webp=bytes=>bytes.length>12&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP';

/**
 * Accepts PUT with header x-jwl-path. The bytes must hash to the path's own checksum and that exact public
 * URL must already have recorded evidence under a live, verified approval and grant (`approved`). The object
 * is written once; an existing object must match byte-for-byte. Nothing else can be written or overwritten.
 * deps: {public_base, approved(url,sha256), put(path,bytes)->'uploaded'|'exists', get(path), digest(bytes), max_bytes}
 */
export async function handleUpload(request,{public_base,approved,put,get,digest,max_bytes=15728640}){
  if(request.method!=='PUT')return json(405,{error:'method_not_allowed'});
  const path=request.headers.get('x-jwl-path')??'';
  const match=pathPattern.exec(path);
  if(!match)return json(400,{error:'content_addressed_path_required'});
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='image/webp')return json(415,{error:'webp_required'});
  const bytes=await boundedBody(request,max_bytes);
  if(!bytes)return json(413,{error:'derivative_too_large'});
  if(!webp(bytes))return json(422,{error:'not_a_webp_file'});
  const sha256=await digest(bytes);
  if(sha256!==match[1])return json(422,{error:'checksum_mismatch'});
  const public_url=public_base+path;
  // The database evidence, approval and grant decide; the caller's claims never do.
  if(await approved(public_url,sha256)!==true)return json(403,{error:'no_live_recorded_approval'});
  const state=await put(path,bytes);
  if(state==='exists'){
    const existing=await get(path);
    if(await digest(existing)!==sha256)return json(409,{error:'existing_object_differs'});
    return json(200,{path,public_url,sha256,bytes:bytes.length,state:'already_present'});
  }
  if(state!=='uploaded')return json(502,{error:'storage_write_unconfirmed'});
  return json(201,{path,public_url,sha256,bytes:bytes.length,state:'uploaded'});
}

/** The exact evidence query: a recorded file under an unrevoked verified approval and a live grant. */
export const approvalQuery=`select 1 from jwl_internal.media_assets a
 join jwl_internal.publication_approvals p on p.candidate_id=a.candidate_id and p.revision_hash=a.revision_hash
 join jwl_internal.media_grants g on g.grant_reference=a.grant_reference
 where a.public_url=$1 and a.public_sha256=$2 and p.image_verified and p.revoked_at is null
   and g.revoked_at is null and (g.expires_at is null or g.expires_at>now()) limit 1`;
