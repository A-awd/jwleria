import { normalizeBatch } from './normalize.mjs';
import { normalizeSearch } from '../../apps/storefront/src/server/supabase-catalog.mjs';
import { dollarQuote } from './factual-publication.mjs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function catalogRpc(name, args, {url,key}, fetcher = fetch) {
  const base = new URL(url);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Invalid Supabase endpoint');
  if (!key || typeof key !== 'string') throw new Error('Missing server credential');
  if (!['jwl_ingest_batch','jwl_ingest_missing_batch','jwl_record_media_approval','jwl_publish_candidate','jwl_source_registry','jwl_revoked_media_files'].includes(name)) throw new Error('Unsupported catalog operation');
  const headers = {apikey:key,'Content-Type':'application/json'};
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  const response = await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers,body:JSON.stringify(args),signal:AbortSignal.timeout(15000),redirect:'error'});
  if (!response.ok) throw new Error(`Catalog operation failed (${response.status})`);
  return response.json();
}

export async function ingest(rows, config, fetcher = fetch) {
  const candidates = normalizeBatch(rows);
  const receipts = [];
  // Stable candidate/revision identities make retries safe after a timeout.
  for (let offset=0; offset<candidates.length; offset+=100) {
    receipts.push(await catalogRpc('jwl_ingest_batch',{records:candidates.slice(offset,offset+100)},config,fetcher));
  }
  return {received:candidates.length,changed:receipts.reduce((n,r)=>n+r.changed,0),published:0};
}

/** Inserts only candidates the database does not have; an existing revision is never overwritten. */
export async function ingestMissing(rows, config, fetcher = fetch) {
  const candidates = normalizeBatch(rows);
  // Re-normalizing must reproduce the exact identity and revision the queue assessed.
  for (const [i,row] of rows.entries()) if (candidates[i]?.candidate_id!==row.candidate_id || candidates[i]?.revision_hash!==row.revision_hash) throw new Error('Record changed during normalization; review before ingestion');
  const result = {inserted_ids:[],skipped_existing_ids:[]};
  for (let offset=0; offset<candidates.length; offset+=100) {
    const receipt = await catalogRpc('jwl_ingest_missing_batch',{records:candidates.slice(offset,offset+100)},config,fetcher);
    result.inserted_ids.push(...receipt.inserted_ids);result.skipped_existing_ids.push(...receipt.skipped_existing_ids);
  }
  return result;
}

/** Fresh acquisition registry from the database (no permission text); queue runners require it. */
export async function sourceRegistry(config, fetcher = fetch) {
  const registry = await catalogRpc('jwl_source_registry',{},config,fetcher);
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error('Invalid source registry');
  return registry;
}

/** Records exact evidence and the verified approval atomically; it does not publish. */
export async function recordMediaApproval(bundle, config, fetcher = fetch) {
  if (bundle?.approval?.image_verified!==true || !Array.isArray(bundle.evidence) || !bundle.evidence.length) throw new Error('Verified approval bundle required');
  return catalogRpc('jwl_record_media_approval',{evidence:bundle.evidence,approval:bundle.approval},config,fetcher);
}

/** The exact media-lane product payload; the database compares it with the approval and current candidate. */
export function publicationProduct(review) {
  const text = field => {const v=review[field];if(typeof v!=='string'||!v.trim())throw new Error(`Missing ${field}`);return v.trim();};
  const slug = field => {const v=text(field);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))throw new Error(`Invalid ${field}`);return v;};
  if (!Array.isArray(review.images) || !review.images.length || review.images.some(s=>{try{const u=new URL(s);return u.protocol!=='https:'||u.username||u.password;}catch{return true;}})) throw new Error('Invalid publication images');
  const product = {
    slug:slug('slug'),reference:text('reference'),brand_slug:slug('brand_slug'),brand_name:text('brand_name'),brand_tier:text('brand_tier'),category_slug:slug('category_slug'),collection_slug:slug('collection_slug'),
    collection_ar:text('collection_ar'),collection_en:text('collection_en'),name_ar:text('name_ar'),name_en:text('name_en'),
    description_ar:text('description_ar'),description_en:text('description_en'),images:[...review.images],
    // The database compares these with the exact approval and current candidate.
    image_variants:Array.isArray(review.image_variants)?review.image_variants:[],
    ...(review.collection_kind?{collection_kind:review.collection_kind}:{}),
  };
  if(!['luxury','accessible','contemporary'].includes(product.brand_tier))throw new Error('Invalid brand tier');
  product.search_text=normalizeSearch([product.reference,product.brand_slug,product.collection_ar,product.collection_en,product.name_ar,product.name_en].join(' '));
  return {candidate:text('candidate_id'),revision:text('revision_hash'),product};
}

export async function publish(review, config, fetcher = fetch) {
  return catalogRpc('jwl_publish_candidate',publicationProduct(review),config,fetcher);
}

const hex64=/^[a-f0-9]{64}$/;
/** Connector form of recordMediaApproval: the same exact evidence and approval, recorded atomically, no publication. */
export function mediaApprovalSql(bundle) {
  if (bundle?.approval?.image_verified!==true || !Array.isArray(bundle.evidence) || !bundle.evidence.length || !hex64.test(bundle.approval.candidate_id??'')) throw new Error('Verified approval bundle required');
  return `select public.jwl_record_media_approval(${dollarQuote(JSON.stringify(bundle.evidence))}::jsonb,${dollarQuote(JSON.stringify(bundle.approval))}::jsonb) as receipt;`;
}
/** Connector form of publish: the database re-checks approval, live grant, source flag and current revision. */
export function mediaPublicationSql(review) {
  const {candidate,revision,product}=publicationProduct(review);
  if (!hex64.test(candidate) || !hex64.test(revision)) throw new Error('Exact candidate revision required');
  return `select public.jwl_publish_candidate('${candidate}','${revision}',${dollarQuote(JSON.stringify(product))}::jsonb) as published;`;
}
/** The one public bucket the derivatives need; creating it is a separately approved production change. */
export const productMediaBucketSql=`insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jwl-product-media','jwl-product-media',true,15728640,array['image/webp']) on conflict(id) do nothing returning id,public,file_size_limit,allowed_mime_types;`;

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [operation,input]=process.argv.slice(2);
  if (!['ingest','publish'].includes(operation)||!input) throw new Error('Usage: node supabase.mjs ingest|publish PRIVATE_INPUT.json');
  const content=JSON.parse(await readFile(input,'utf8'));
  const config={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  const result=operation==='ingest'?await ingest(content,config):await publish(content,config);
  console.log(JSON.stringify({operation,result}));
}
