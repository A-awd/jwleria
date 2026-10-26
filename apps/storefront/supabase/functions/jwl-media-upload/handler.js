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
const tag=(bytes,at)=>String.fromCharCode(...bytes.subarray(at,at+4));
/** Canvas size from the first WebP chunk: lossy VP8, lossless VP8L or extended VP8X (written when an ICC profile is kept). */
export function webpSize(b){
  if(b.length<30||tag(b,0)!=='RIFF'||tag(b,8)!=='WEBP')return null;
  const chunk=tag(b,12);
  if(chunk==='VP8X')return {width:1+(b[24]|b[25]<<8|b[26]<<16),height:1+(b[27]|b[28]<<8|b[29]<<16)};
  if(chunk==='VP8L'&&b[20]===0x2f)return {width:1+(b[21]|(b[22]&0x3f)<<8),height:1+(b[22]>>6|b[23]<<2|(b[24]&0x0f)<<10)};
  if(chunk==='VP8 '&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a)return {width:(b[26]|b[27]<<8)&0x3fff,height:(b[28]|b[29]<<8)&0x3fff};
  return null;
}

/**
 * Accepts PUT with header x-jwl-path. The bytes must hash to the path's own checksum, and that exact public URL,
 * checksum, size and canvas must be cited by a live verified approval of the candidate's current revision under
 * the approval's own grant (`approved`). The object is written once; an existing object must match byte-for-byte.
 * Nothing else can be written or overwritten.
 * deps: {public_base, approved(url,sha256,bytes,width,height), put(path,bytes)->'uploaded'|'exists', get(path), digest(bytes), max_bytes}
 */
export async function handleUpload(request,{public_base,approved,put,get,digest,max_bytes=15728640}){
  if(request.method!=='PUT')return json(405,{error:'method_not_allowed'});
  const path=request.headers.get('x-jwl-path')??'';
  const match=pathPattern.exec(path);
  if(!match)return json(400,{error:'content_addressed_path_required'});
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='image/webp')return json(415,{error:'webp_required'});
  const bytes=await boundedBody(request,max_bytes);
  if(!bytes)return json(413,{error:'derivative_too_large'});
  const size=webpSize(bytes);
  if(!size)return json(422,{error:'not_a_webp_file'});
  const sha256=await digest(bytes);
  if(sha256!==match[1])return json(422,{error:'checksum_mismatch'});
  const public_url=public_base+path;
  // The database evidence, approval and grant decide; the caller's claims never do.
  if(await approved(public_url,sha256,bytes.length,size.width,size.height)!==true)return json(403,{error:'no_live_recorded_approval'});
  const state=await put(path,bytes);
  if(state==='exists'){
    const existing=await get(path);
    if(await digest(existing)!==sha256)return json(409,{error:'existing_object_differs'});
    return json(200,{path,public_url,sha256,bytes:bytes.length,state:'already_present'});
  }
  if(state!=='uploaded')return json(502,{error:'storage_write_unconfirmed'});
  return json(201,{path,public_url,sha256,bytes:bytes.length,state:'uploaded'});
}

/**
 * The exact upload binding ($1 url, $2 sha256, $3 bytes, $4 width, $5 height): recorded evidence of the candidate's
 * current revision under the approval's own grant, and that file cited with the same size and canvas by the live
 * verified approval. The grant must be unrevoked, without an expiry date and scoped to this product and source, as
 * the approval trigger requires. Uncited evidence, a superseded revision or another grant never opens an upload.
 */
export const approvalQuery=`select 1 from jwl_internal.media_assets a
 join jwl_internal.candidates c on c.candidate_id=a.candidate_id and c.revision_hash=a.revision_hash
 join jwl_internal.publication_approvals p on p.candidate_id=a.candidate_id and p.revision_hash=a.revision_hash and p.media_reference=a.grant_reference
 join jwl_internal.media_grants g on g.grant_reference=p.media_reference
 where a.public_url=$1 and a.public_sha256=$2 and a.width=$4::integer and a.height=$5::integer and a.verified_reference=c.external_id
   and p.image_verified and p.revoked_at is null
   and g.revoked_at is null and g.expires_at is null
   and (g.candidate_id is null or g.candidate_id=c.candidate_id) and (g.source_id is null or g.source_id=c.source_id)
   and exists(select 1 from jsonb_array_elements(p.approved_image_variants) e cross join jsonb_array_elements(e->'variants') v
     where v @> jsonb_build_object('src',a.public_url,'bytes',$3::integer,'width',$4::integer,'height',$5::integer))
 limit 1`;
