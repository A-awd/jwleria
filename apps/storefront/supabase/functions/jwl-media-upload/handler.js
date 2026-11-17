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
 * With `candidate` the binding must also belong to that candidate ($6), as completion requires; without it the query
 * text is unchanged.
 */
export const approvalQueryFor=(usable,candidate=false)=>`select 1 from jwl_internal.media_assets a
 join jwl_internal.candidates c on c.candidate_id=a.candidate_id and c.revision_hash=a.revision_hash
 join jwl_internal.publication_approvals p on p.candidate_id=a.candidate_id and p.revision_hash=a.revision_hash and p.media_reference=a.grant_reference
 join jwl_internal.media_grants g on g.grant_reference=p.media_reference
 where a.public_url=$1 and a.public_sha256=$2 and a.width=$4::integer and a.height=$5::integer and a.verified_reference=c.external_id${candidate?' and c.candidate_id=$6':''}
   and p.image_verified and p.revoked_at is null
   and g.revoked_at is null and ${usable?'jwl_internal.media_grant_is_usable(g.grant_reference)':'g.expires_at is null'}
   and (g.candidate_id is null or g.candidate_id=c.candidate_id) and (g.source_id is null or g.source_id=c.source_id)
   and exists(select 1 from jsonb_array_elements(p.approved_image_variants) e cross join jsonb_array_elements(e->'variants') v
     where v @> jsonb_build_object('src',a.public_url,'bytes',$3::integer,'width',$4::integer,'height',$5::integer))
 limit 1`;
/** The query before the bulk media contract migration exists: an expiring grant never opens an upload. */
export const approvalQuery=approvalQueryFor(false);
/**
 * After that migration (gap G4), an expiring grant opens an upload only while its expiry sweep is scheduled and its
 * expiry is beyond the withdrawal lead, exactly as the approval and publication triggers decide.
 */
export const usableQuery="select to_regprocedure('jwl_internal.media_grant_is_usable(text)') is not null as ready";

const candidateId=/^[a-f0-9]{64}$/;
/** The two completion states that mean the product now shows exactly its recorded approval's images. */
export const completedStates=Object.freeze(['published','already_published']);

/**
 * Completion of recorded approvals by exact candidate id (decision 0026): POST application/json
 * {"candidate_ids":[...]}, 1 to `max_ids` ids, as an operator's upload notice relayed with metadata only.
 * For each id it resolves the live recorded approval of the candidate's current revision, then confirms every file
 * that approval cites: stored under its content-addressed path, hashing to its own name, with the cited size and
 * canvas, and still opening an upload under the same approval-bound query for this candidate. Only then does it call
 * the existing publication (`publishQuery`, the operator's publish statement for one product), guarded by the same
 * revision and variant list. It never records, widens or revokes an approval and never writes a file. A product
 * without a live approval or public facts row, with a file missing or differing, or already showing exactly its
 * approved images is reported and left unchanged.
 * deps: {public_base, state(candidate_id), present(paths)->Set, get(path), digest(bytes),
 *   approved(url,sha256,bytes,width,height,candidate_id), publish(candidate_id,revision_hash,variants)->'published'|'changed'|{refused}, max_ids}
 */
export async function handleCompletion(request,{public_base,state,present,get,digest,approved,publish,max_ids=25}){
  if(request.method!=='POST')return json(405,{error:'method_not_allowed'});
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')return json(415,{error:'json_required'});
  const raw=await boundedBody(request,16384);
  if(!raw)return json(413,{error:'request_too_large'});
  let ids=null;
  try{ids=JSON.parse(new TextDecoder().decode(raw))?.candidate_ids;}catch{ids=null;}
  if(!Array.isArray(ids)||!ids.length||!ids.every(id=>typeof id==='string'&&candidateId.test(id)))return json(400,{error:'exact_candidate_ids_required'});
  ids=[...new Set(ids)];
  if(ids.length>max_ids)return json(413,{error:'too_many_candidates',max_ids});
  const complete=async candidate_id=>{
    const s=await state(candidate_id);
    if(!s)return {state:'unknown_candidate'};
    const r={external_id:s.external_id};
    if(!s.approved)return {...r,state:'no_live_approval'};
    if(!s.public_facts)return {...r,state:'no_public_facts_row'};
    const files=(Array.isArray(s.approved_image_variants)?s.approved_image_variants:[]).flatMap(e=>Array.isArray(e?.variants)?e.variants:[null]);
    r.files=files.length;
    if(s.published)return {...r,state:'already_published'};
    if(!files.length)return {...r,state:'refused',error:'approval_cites_no_files'};
    const paths=[];
    for(const f of files){
      const path=typeof f?.src==='string'&&f.src.startsWith(public_base)?f.src.slice(public_base.length):'';
      if(!pathPattern.test(path))return {...r,state:'refused',error:'content_addressed_path_required'};
      paths.push(path);
    }
    const stored=await present(paths);
    const missing=paths.filter(p=>!stored.has(p)).length;
    if(missing)return {...r,state:'waiting',missing};
    for(const [i,f] of files.entries()){
      const bytes=await get(paths[i]);
      const sha256=await digest(bytes),size=webpSize(bytes);
      if(sha256!==pathPattern.exec(paths[i])[1]||bytes.length!==f.bytes||size?.width!==f.width||size?.height!==f.height)return {...r,state:'refused',error:'stored_file_differs'};
      if(await approved(f.src,sha256,bytes.length,size.width,size.height,candidate_id)!==true)return {...r,state:'refused',error:'no_live_recorded_approval'};
    }
    const outcome=await publish(candidate_id,s.revision_hash,s.approved_image_variants);
    if(outcome==='published')return {...r,state:'published'};
    if(outcome==='changed')return {...r,state:'changed_during_completion'};
    return {...r,state:'refused',error:'publication_refused: '+String(outcome?.refused??'unconfirmed').slice(0,200)};
  };
  const results=[];
  for(const candidate_id of ids){
    try{results.push({candidate_id,...await complete(candidate_id)});}
    catch{results.push({candidate_id,state:'unconfirmed',error:'storage_or_database_unavailable'});}
  }
  const counts={};for(const x of results)counts[x.state]=(counts[x.state]??0)+1;
  return json(200,{state:'completion',counts,results});
}

/**
 * One candidate's completion state ($1): its live recorded approval of the current revision, whether its stored
 * public row is the active facts row the publish statement needs, and whether that row already shows exactly the
 * approval's images at this revision.
 */
export const completionStateQuery=`select c.external_id,c.revision_hash,a.candidate_id is not null as approved,a.approved_image_variants,
 coalesce(k.active,false) and (exists(select 1 from jwl_internal.published_revisions p where p.catalog_id=c.candidate_id and p.revision_hash=c.revision_hash)
   or exists(select 1 from jwl_internal.factual_publications f where f.catalog_id=c.candidate_id and f.candidate_id=c.candidate_id and f.revision_hash=c.revision_hash)) as public_facts,
 coalesce(k.active and k.media_state='approved_media' and k.images=a.approved_images and k.image_variants=a.approved_image_variants
   and exists(select 1 from jwl_internal.published_revisions p where p.catalog_id=c.candidate_id and p.revision_hash=c.revision_hash),false) as published
 from jwl_internal.candidates c
 left join jwl_internal.publication_approvals a on a.candidate_id=c.candidate_id and a.revision_hash=c.revision_hash and a.image_verified and a.revoked_at is null
 left join public.jwl_catalog k on k.id=c.candidate_id
 where c.candidate_id=$1`;
/**
 * The stored objects among the given paths ($1 bucket, $2 JSON array of paths). JSON text is bound as text and cast
 * in SQL: a parameter typed jsonb would be serialized again by postgres.js, arriving as a JSON string scalar.
 */
export const storedQuery='select o.name from storage.objects o where o.bucket_id=$1 and o.name in (select jsonb_array_elements_text($2::text::jsonb))';
/**
 * The operator's publish statement (batchPublishSql in scripts/catalog-intake) for one candidate: the stored public
 * facts row with the live approval's own images, through jwl_publish_candidate, which re-checks the grant, source
 * flag, revision and every displayed fact. Guarded by the revision ($2) and exact variant list ($3) that completion
 * verified; no row means one of them changed in between. $3 is JSON text bound as text, as in storedQuery.
 */
export const publishQuery=`select c.external_id,public.jwl_publish_candidate(c.candidate_id,c.revision_hash,to_jsonb(k)||jsonb_build_object('images',a.approved_images,'image_variants',a.approved_image_variants)) as published
from jwl_internal.candidates c
join public.jwl_catalog k on k.id=c.candidate_id and k.active
join jwl_internal.publication_approvals a on a.candidate_id=c.candidate_id and a.revision_hash=c.revision_hash and a.image_verified and a.revoked_at is null
where (exists(select 1 from jwl_internal.published_revisions p where p.catalog_id=c.candidate_id and p.revision_hash=c.revision_hash)
  or exists(select 1 from jwl_internal.factual_publications f where f.catalog_id=c.candidate_id and f.candidate_id=c.candidate_id and f.revision_hash=c.revision_hash))
  and c.candidate_id=$1 and c.revision_hash=$2 and a.approved_image_variants=$3::text::jsonb`;

/**
 * Browser and CDN lifetime of a public derivative. Names are content-addressed, so the bytes behind a URL never
 * change; the lifetime is kept short because a revoked grant's files must stop being served soon after deletion.
 */
export const derivativeCacheSeconds=86400;
