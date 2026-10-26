import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {normalizeSearch} from '../../apps/storefront/src/server/supabase-catalog.mjs';
import {approvedCategories} from './incremental.mjs';

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hash=/^[a-f0-9]{64}$/;
const tiers=['luxury','accessible','contemporary'];
const filled=value=>typeof value==='string'&&value.trim()!=='';
const slugify=value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const kindOf=value=>value??'collection';
const key=(...parts)=>parts.map(String).join('\u0000');

/**
 * Indexes exact existing public rows joined to their candidates. Each row:
 * {source_id, brand_name, brand_slug, brand_tier, collection, collection_kind, collection_slug,
 *  collection_ar, collection_en, category_slug}, where `collection` is the candidate's own collection.
 * Nothing here is inferred: a mapping exists only where live public rows already use it.
 */
export function publicMapping(rows){
  const brands=new Map(),collections=new Map(),categories=new Map();
  const add=(map,k,v)=>{if(!map.has(k))map.set(k,new Map());map.get(k).set(JSON.stringify(v),v);};
  for(const row of rows??[]){
    if(!filled(row?.source_id)||!filled(row?.brand_name)||!filled(row?.collection))throw Error('Invalid public mapping row');
    add(brands,key(row.source_id,row.brand_name),{brand_slug:row.brand_slug,brand_tier:row.brand_tier});
    const c=key(row.source_id,row.brand_name,row.collection,kindOf(row.collection_kind));
    add(collections,c,{collection_slug:row.collection_slug,collection_ar:row.collection_ar,collection_en:row.collection_en});
    add(categories,c,row.category_slug);
  }
  const only=(map,k)=>{const values=[...(map.get(k)?.values()??[])];return values.length===1?{value:values[0]}:{count:values.length};};
  return {
    brand:(source,brand)=>only(brands,key(source,brand)),
    collection:(source,brand,collection,kind)=>only(collections,key(source,brand,collection,kindOf(kind))),
    categories:(source,brand,collection,kind)=>new Set(categories.get(key(source,brand,collection,kindOf(kind)))?.values()??[]),
  };
}

/** Same composition as the recent public rows: reference, brand, collection names and both product names. */
export function factualSearchText({reference,brand_slug,collection_ar,collection_en,name_ar,name_en}){
  return normalizeSearch([...new Set([reference,brand_slug,collection_ar,collection_en,name_ar,name_en])].join(' '));
}

/**
 * Builds review-ready, facts-only payloads for public.jwl_publish_factual_batch. It copies only the current
 * candidate's own facts and summaries; it never writes prices, availability, media or marketing copy.
 * Anything not provably mapped is held with reasons. Existing public rows are never targeted, so the
 * publisher's upsert cannot overwrite a live product.
 *
 * - candidates: fresh database rows {candidate_id, source_id, external_id, revision_hash, content}
 * - evidence: private acquired records {candidate_id, revision_hash, category_slug, category_mapping_state}
 * - mapping: publicMapping(rows)
 * - existing: {ids, slugs} already present in public.jwl_catalog
 */
export function buildFactualPublication({candidates,evidence,mapping,existing={},max=20}={}){
  if(!mapping)throw Error('Exact public mapping required');
  const cap=Math.max(0,Math.min(100,Number.isInteger(max)?max:20));
  const ids=new Set(existing.ids??[]),slugs=new Set(existing.slugs??[]);
  const observed=new Map((evidence??[]).map(row=>[key(row.candidate_id,row.revision_hash),row]));
  const products=[],held=[],seen=new Set();
  for(const c of candidates??[]){
    const reasons=[];const hold=(...r)=>reasons.push(...r);
    const content=c?.content??{};
    if(!hash.test(c?.candidate_id??'')||!hash.test(c?.revision_hash??'')){held.push({candidate_id:c?.candidate_id??null,reasons:['invalid_identity']});continue;}
    if(seen.has(c.candidate_id)){held.push({candidate_id:c.candidate_id,reasons:['duplicate_in_batch']});continue;}
    seen.add(c.candidate_id);
    if(ids.has(c.candidate_id))hold('already_public');
    const record=observed.get(key(c.candidate_id,c.revision_hash));
    if(!record)hold('current_revision_evidence_missing');
    if(!Array.isArray(content.facts)||!content.facts.length)hold('facts_missing');
    if(content.translation_state!=='provided'||!filled(content.name_ar))hold('arabic_name_pending');
    for(const field of ['name_en','description_ar','description_en','brand','collection'])if(!filled(content[field]))hold(field+'_missing');
    if(!filled(c.external_id)||!filled(c.source_id))hold('identity_fields_missing');
    const kind=kindOf(content.collection_kind);
    if(!['collection','source_group'].includes(kind))hold('collection_kind_invalid');
    const brand=filled(content.brand)?mapping.brand(c.source_id,content.brand):{count:0};
    if(!brand.value)hold(brand.count?'brand_mapping_ambiguous':'brand_mapping_unknown');
    else if(!slugPattern.test(brand.value.brand_slug??'')||!tiers.includes(brand.value.brand_tier))hold('brand_mapping_invalid');
    const collection=filled(content.collection)?mapping.collection(c.source_id,content.brand,content.collection,kind):{count:0};
    if(!collection.value)hold(collection.count?'collection_mapping_ambiguous':'collection_mapping_unknown');
    else if(collection.value.collection_en!==content.collection||!slugPattern.test(collection.value.collection_slug??'')||!filled(collection.value.collection_ar))hold('collection_mapping_inexact');
    // Category: this exact revision's observed source evidence, confirmed by live rows of the same collection.
    const category=record?.category_slug;
    if(!category||!record?.category_mapping_state||record.category_mapping_state==='requires_review')hold('category_requires_review');
    else if(!approvedCategories.includes(category))hold('category_outside_approved_set');
    else if(collection.value&&!mapping.categories(c.source_id,content.brand,content.collection,kind).has(category))hold('category_unconfirmed_for_collection');
    const referenceSlug=slugify(c.external_id??'');
    const slug=brand.value&&referenceSlug?`${brand.value.brand_slug}-${referenceSlug}-${c.candidate_id.slice(0,8)}`:null;
    if(slug&&(!slugPattern.test(slug)||slugs.has(slug)))hold('slug_collision');
    if(reasons.length){held.push({candidate_id:c.candidate_id,external_id:c.external_id??null,reasons});continue;}
    const product={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug,reference:c.external_id,
      brand_slug:brand.value.brand_slug,brand_name:content.brand,brand_tier:brand.value.brand_tier,category_slug:category,
      collection_slug:collection.value.collection_slug,collection_ar:collection.value.collection_ar,collection_en:collection.value.collection_en,collection_kind:kind,
      name_ar:content.name_ar,name_en:content.name_en,description_ar:content.description_ar,description_en:content.description_en,
      images:[],image_variants:[]};
    product.search_text=factualSearchText(product);
    if(products.length>=cap){held.push({candidate_id:c.candidate_id,external_id:c.external_id,reasons:['batch_cap_reached']});continue;}
    slugs.add(slug);products.push(product);
  }
  const reasons={};for(const row of held)for(const r of row.reasons)reasons[r]=(reasons[r]??0)+1;
  return {products,held,summary:{ready:products.length,held:held.length,held_reasons:reasons,published:0,images:0}};
}

const tag=text=>{for(;;){const t='$jwl'+randomBytes(6).toString('hex')+'$';if(!text.includes(t))return t;}};
/** Dollar-quotes one literal for a connector SQL call, with a random tag that cannot occur in the text. */
export const dollarQuote=text=>{const t=tag(String(text));return t+text+t;};
const quoted=dollarQuote;

/**
 * One statement, so one transaction: refuses (writing nothing) when any target row already exists.
 * Slug uniqueness and every content/revision check are re-enforced by the database function.
 */
export function factualPublicationSql(products,ownerInstruction){
  if(!Array.isArray(products)||!products.length||products.length>100)throw Error('Bounded factual batch required');
  if(!filled(ownerInstruction))throw Error('Exact owner instruction required');
  if(products.some(p=>!hash.test(p.candidate_id)||p.images?.length||p.image_variants?.length))throw Error('Facts-only payloads required');
  const ids=products.map(p=>p.candidate_id);
  return `with target(id) as (select unnest(array[${ids.map(id=>`'${id}'`).join(',')}]::text[])),\n`+
    `existing as (select count(*) n from public.jwl_catalog c join target t on t.id=c.id)\n`+
    `select case when (select n from existing)=0 then public.jwl_publish_factual_batch(${quoted(JSON.stringify(products))}::jsonb,${quoted(ownerInstruction.trim())})\n`+
    `else jsonb_build_object('refused','existing_public_rows','count',(select n from existing)) end as result;`;
}

/** The missing-only intake RPC re-checks existence and never overwrites; this only renders its exact call. */
export function missingIntakeSql(records){
  if(!Array.isArray(records)||!records.length||records.length>100)throw Error('Bounded intake batch required');
  return `select public.jwl_ingest_missing_batch(${quoted(JSON.stringify(records))}::jsonb) as receipt;`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [inputPath]=process.argv.slice(2);
  if(!inputPath)throw Error('Usage: node factual-publication.mjs PRIVATE_BUILD_INPUT.json');
  const input=JSON.parse(await readFile(inputPath,'utf8'));
  const result=buildFactualPublication({...input,mapping:publicMapping(input.mapping_rows)});
  console.log(JSON.stringify(result));
}
