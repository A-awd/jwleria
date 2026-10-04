import { normalizeBatch } from './normalize.mjs';
import { normalizeSearch } from '../../apps/storefront/src/server/supabase-catalog.mjs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function catalogRpc(name, args, {url,key}, fetcher = fetch) {
  const base = new URL(url);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Invalid Supabase endpoint');
  if (!key || typeof key !== 'string') throw new Error('Missing server credential');
  if (!['jwl_ingest_batch','jwl_publish_candidate'].includes(name)) throw new Error('Unsupported catalog operation');
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

export async function publish(review, config, fetcher = fetch) {
  const text = field => {const v=review[field];if(typeof v!=='string'||!v.trim())throw new Error(`Missing ${field}`);return v.trim();};
  const slug = field => {const v=text(field);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))throw new Error(`Invalid ${field}`);return v;};
  if (!Array.isArray(review.images) || !review.images.length || review.images.some(s=>{try{const u=new URL(s);return u.protocol!=='https:'||u.username||u.password;}catch{return true;}})) throw new Error('Invalid publication images');
  const product = {
    slug:slug('slug'),reference:text('reference'),brand_slug:slug('brand_slug'),brand_name:text('brand_name'),brand_tier:text('brand_tier'),category_slug:slug('category_slug'),collection_slug:slug('collection_slug'),
    collection_ar:text('collection_ar'),collection_en:text('collection_en'),name_ar:text('name_ar'),name_en:text('name_en'),images:[...review.images],
  };
  if(!['luxury','accessible','contemporary'].includes(product.brand_tier))throw new Error('Invalid brand tier');
  product.search_text=normalizeSearch([product.reference,product.brand_slug,product.collection_ar,product.collection_en,product.name_ar,product.name_en].join(' '));
  return catalogRpc('jwl_publish_candidate',{candidate:text('candidate_id'),revision:text('revision_hash'),product},config,fetcher);
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [operation,input]=process.argv.slice(2);
  if (!['ingest','publish'].includes(operation)||!input) throw new Error('Usage: node supabase.mjs ingest|publish PRIVATE_INPUT.json');
  const content=JSON.parse(await readFile(input,'utf8'));
  const config={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  const result=operation==='ingest'?await ingest(content,config):await publish(content,config);
  console.log(JSON.stringify({operation,result}));
}
