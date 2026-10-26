// Pure intake rules shared by the local queue and the n8n runner bundle: no file, network or database access.
import {officialVariantIdentity} from './official-adapters.mjs';

export const agent='JwleriaCatalog/1.0';
export const approvedCategories=Object.freeze(['watches','handbags','bracelets','jewelry','leather-goods','luggage','shoes','accessories','clothing']);
/** Recorded permission/access boundaries. Lifting one needs a reviewed code change, never a config flag. */
export const recordedSourceStops=Object.freeze({
  'cartier-official':'acquisition_permission_restricted',
  'van-cleef-and-arpels-official':'acquisition_permission_restricted',
  'celine-official':'source_challenge_recorded',
  'rimowa-official':'robots_refusal_recorded',
  // Published terms (Piaget read 2026-10-26; Panerai's indexed copy of the same text) forbid automated access without prior written approval.
  'piaget-official':'acquisition_permission_restricted',
  'panerai-official':'acquisition_permission_restricted',
});
const hash=/^[a-f0-9]{64}$/;
// Invalid numeric config must never disable a bound; it falls back to the safe default.
const number=(value,fallback,min,max)=>{if(value==null)return fallback;const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};

export const sourceChallenge=html=>/<title[^>]*>[^<]*(?:captcha|access denied|just a moment|robot check)|sec-if-cpt-container|sec-bc-tile|akamai-protected-by|captcha-container|verify you are (?:a )?human/i.test(html);
/** A refusal written by the runner's egress proxy rather than the origin (observed body for denied hosts). */
export const environmentDenial=body=>/^\s*Blocked by egress policy\s*$/i.test(String(body).slice(0,200));
export function sitemapLocations(xml){return [...new Set([...xml.matchAll(/<loc\b[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/g)].map(m=>m[1].trim().replace(/&amp;/g,'&')))];}
/** Sitemaps declared in robots.txt, kept only when they are HTTPS on the official origin itself. */
export function declaredSitemaps(urls,origin){
  return [...new Set((urls??[]).map(value=>{try{const url=new URL(String(value).trim());return url.protocol==='https:'&&url.origin===origin&&!url.username&&!url.password&&!url.hash?url.href:null;}catch{return null;}}).filter(Boolean))];
}

/** The reference an official product URL names, or null when the URL is not an exact variant page. */
export const officialIdentity=(sourceId,url)=>{try{return officialVariantIdentity(sourceId,url)?.external_id??null;}catch{return null;}};

/**
 * Picks a bounded inventory from discovered URLs without fetching them: identities the database does not
 * hold come first, then at most `controls` known identities to re-check parity. Identity is read from the
 * official URL and compared case-insensitively, so a case variant can never pass as missing.
 */
export function pickInventory(urls,{identity,known_external_ids,max_missing=20,controls=0}={}){
  if(typeof identity!=='function')throw Error('Inventory selection needs an adapter with URL identity');
  if(!(known_external_ids instanceof Set))throw Error('A fresh known-identity export is required');
  const known=new Set([...known_external_ids].map(id=>String(id).toLowerCase()));
  const missing=[],existing=[],identities=new Set();let unsupported=0,aliases=0;
  for(const url of urls??[]){
    const id=identity(url)?.toLowerCase();
    if(!id){unsupported++;continue;}
    if(identities.has(id)){aliases++;continue;}
    identities.add(id);(known.has(id)?existing:missing).push(url);
  }
  const maxMissing=number(max_missing,20,0,1e6),maxControls=number(controls,0,0,1e6);
  return {selected:[...missing.slice(0,maxMissing),...existing.slice(0,maxControls)],missing:missing.slice(0,maxMissing),controls:existing.slice(0,maxControls),
    counts:{urls:(urls??[]).length,identities:identities.size,missing_total:missing.length,known_total:existing.length,alias_urls:aliases,unsupported_urls:unsupported}};
}

export const identityKey=(sourceId,externalId)=>String(sourceId)+'\u0000'+String(externalId).toLowerCase();
/**
 * Private ingestion and public factual readiness are separate decisions. A known candidate with a
 * different revision is never overwritten here: guarded private repairs and live rows depend on it.
 */
export function assessCandidate(record,known,identities){
  if(!hash.test(record?.candidate_id??'')||!hash.test(record?.revision_hash??''))return {ingest:'rejected',publication:'held',reasons:['invalid_identity']};
  const missing=['source_id','external_id','brand','collection','product_name','source_url'].filter(f=>typeof record[f]!=='string'||!record[f].trim()).map(f=>'missing_'+f);
  if(!Array.isArray(record.image_urls)||!record.image_urls.length)missing.push('gallery_reference_missing');
  if(missing.length)return {ingest:'rejected',publication:'held',reasons:missing};
  const previous=known?.get(record.candidate_id);
  let ingest=!known?'baseline_unknown':previous===undefined?'missing':previous===record.revision_hash?'unchanged':'changed_requires_review';
  // A partial revision export is paired with the complete identity list: an identity the database already
  // holds (including a case variant of its reference) is never treated as missing.
  if(ingest==='missing'&&identities?.has(identityKey(record.source_id,record.external_id)))ingest='known_identity_requires_review';
  const held=[];
  if(!Array.isArray(record.facts)||!record.facts.length)held.push('facts_missing');
  if(record.translation_state!=='provided'||!record.name_ar)held.push('arabic_name_pending');
  if(!record.description_ar||!record.description_en)held.push('factual_summary_missing');
  if(!record.category_slug)held.push('category_requires_review');
  else if(!approvedCategories.includes(record.category_slug))held.push('category_outside_approved_set');
  // Readiness is only for review: publication still needs the current-revision factual guard.
  return {ingest,publication:held.length?'held':'factual_review_ready',reasons:held};
}
