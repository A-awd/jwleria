import {responsiveImages} from './responsive-media.mjs';
import {assembleModel, orderOptionKinds, singleModel} from '../components/variant-selection.mjs';

const FIELDS = 'id,slug,reference,brand_slug,category_slug,collection_slug,collection_kind,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,published_at';
const MODEL_FIELDS = `${FIELDS},model_key,model_name,variant_count,options_summary`;
const MAX_VARIANTS = 60;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const kindPattern = /^[a-z][a-z0-9_]{0,39}$/;
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const integer = (n, fallback, max) => Number.isFinite(Number(n)) && Number(n) >= 1 ? Math.min(Math.floor(Number(n)), max) : fallback;

export function normalizeSearch(s = '') {
  return String(s).normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).trim().slice(0, 200);
}

/** @returns {import('../contracts/catalog').PublicProduct} */
export function publicProduct(row) {
  if (!row || !slugPattern.test(row.slug) || !slugPattern.test(row.brand_slug) || !slugPattern.test(row.category_slug) || !slugPattern.test(row.collection_slug)) throw new Error('Invalid published catalog identity');
  const collectionKind = row.collection_kind ?? 'collection';
  if (!['collection','source_group'].includes(collectionKind)) throw new Error('Invalid published collection kind');
  const factsOnly = row.media_state === 'facts_only';
  if (!Array.isArray(row.images) || (!row.images.length && !factsOnly) || (factsOnly && row.images.length > 0) || row.images.some(s => {
    if (typeof s !== 'string') return true;
    try { const u = new URL(s); return u.protocol !== 'https:' || Boolean(u.username || u.password); } catch { return true; }
  })) throw new Error('Invalid published catalog images');
  for (const field of ['id','reference','name_ar','name_en','collection_ar','collection_en','published_at']) {
    if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error('Incomplete published catalog');
  }
  return {
    id: row.id, slug: row.slug, reference: row.reference,
    brandSlug: row.brand_slug, categorySlug: row.category_slug,
    collectionSlug: row.collection_slug,
    collectionKind: collectionKind === 'source_group' ? 'source-group' : 'collection',
    collection: { ar: row.collection_ar, en: row.collection_en },
    name: { ar: row.name_ar, en: row.name_en },
    summary: { ar: row.description_ar || `${row.name_ar} — ${row.collection_ar}`, en: row.description_en || `${row.name_en} — ${row.collection_en}` }, image: row.images[0] ?? null, images: [...row.images],
    imageVariants:responsiveImages(row.image_variants,row.images,factsOnly),
    mediaKind: factsOnly ? 'facts-only' : 'verified-product', isPreview: false, addedAt: row.published_at,
  };
}

function configuration(config) {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !url.hostname.endsWith('.supabase.co')) throw new Error('Invalid catalog server configuration');
  if (typeof config.key !== 'string' || !config.key) throw new Error('Missing catalog read key');
  return url;
}

// A missing migration object falls back to today's reads; every other failure stays a failure.
// PGRST202/PGRST205 are PostgREST's schema-cache misses; 42P01/42883 are the same miss on older PostgREST.
// Each counts only as an HTTP 404 whose message names that exact relation or function.
const MISSING_CODES = new Set(['PGRST202','PGRST205','42P01','42883']);
const MISSING_TTL = 60000;
const missingFeatures = new Map();
class MissingFeature extends Error {}

async function reportsMissing(response, name) {
  if (response.status !== 404) return false;
  const body = await response.clone().json().catch(() => null);
  return Boolean(body && MISSING_CODES.has(body.code) && typeof body.message === 'string' && new RegExp(`(?:^|[^a-z0-9_])${name}(?:[^a-z0-9_]|$)`).test(body.message));
}

// Remembered per isolate briefly, so a not-yet-applied migration does not double every request.
/** @template T @param {{url: string}} config @param {string} feature @param {() => Promise<T>} read @param {() => Promise<T>} fallback @returns {Promise<T>} */
async function withFallback(config, feature, read, fallback) {
  const key = `${config.url}|${feature}`;
  if (missingFeatures.get(key) > Date.now()) return fallback();
  missingFeatures.delete(key);
  try { return await read(); } catch (error) {
    if (!(error instanceof MissingFeature)) throw error;
    missingFeatures.set(key, Date.now() + MISSING_TTL);
    return fallback();
  }
}

async function get(config, path, params, fetcher, {count = false, feature} = {}) {
  const endpoint = new URL(path, configuration(config));
  endpoint.search = params.toString();
  const headers = { apikey: config.key, Accept: 'application/json', ...(count ? {Prefer: 'count=exact'} : {}) };
  // New publishable keys aren't JWTs; legacy anon JWTs also need Authorization.
  if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
  const response = await fetcher(endpoint, { headers, signal: AbortSignal.timeout(8000), redirect: 'manual' });
  if (feature && await reportsMissing(response, feature)) throw new MissingFeature(feature);
  return response;
}

async function request(config, query, fetcher, relation = 'jwl_catalog', feature) {
  const response = await get(config, `/rest/v1/${relation}`, query, fetcher, {count: true, feature});
  if (response.status===416) {
    const count=response.headers.get('content-range')?.split('/')[1];
    if(count && /^\d+$/.test(count))return {rows:[],total:Number(count)};
  }
  if (!response.ok) throw new Error(`Catalog read failed (${response.status})`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid catalog response');
  const count = response.headers.get('content-range')?.split('/')[1];
  if (!count || !/^\d+$/.test(count)) throw new Error('Missing catalog count');
  return { rows, total: Number(count) };
}

const localized = (value, message) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !text(value.ar, 300) || !text(value.en, 300)) throw new Error(message);
  return {ar: value.ar, en: value.en};
};

/** @returns {import('../contracts/catalog').ModelSummary | undefined} */
function modelSummary(row) {
  if (row.model_key === null || row.model_key === undefined) return undefined;
  if (!text(row.model_key, 300)) throw new Error('Invalid model identity');
  const name = localized(row.model_name, 'Invalid model name');
  const count = row.variant_count;
  const summary = row.options_summary ?? {};
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000 || typeof summary !== 'object' || Array.isArray(summary) || Object.keys(summary).length > 8) throw new Error('Invalid model summary');
  const options = Object.entries(summary).map(([kind, n]) => {
    if (!kindPattern.test(kind) || !Number.isSafeInteger(n) || n < 1 || n > count) throw new Error('Invalid model summary');
    return {kind, count: n};
  });
  return {key: row.model_key, name, variantCount: count, options: orderOptionKinds(options)};
}

/** A listing row from the model projection: its primary variant plus the model summary. */
export function publicModelRow(row) {
  const product = publicProduct(row);
  const model = modelSummary(row);
  return model ? {...product, model} : product;
}

const CATALOG = {relation: 'jwl_catalog', fields: FIELDS, map: publicProduct, unit: 'products'};
const MODELS = {relation: 'jwl_catalog_models', fields: MODEL_FIELDS, map: publicModelRow, unit: 'models', feature: 'jwl_catalog_models'};

/** @returns {Promise<import('../contracts/catalog').ProductPage>} */
export function queryCatalog(config, query = {}, fetcher = fetch) { return listing(config, query, fetcher, CATALOG); }

/** One card per model; today's catalog read only while the model view does not exist yet.
 * @returns {Promise<import('../contracts/catalog').ProductPage>} */
export function queryModels(config, query = {}, fetcher = fetch) {
  return withFallback(config, MODELS.feature, () => listing(config, query, fetcher, MODELS), () => queryCatalog(config, query, fetcher));
}

async function listing(config, query, fetcher, source) {
  const pageSize = integer(query.pageSize, 12, 48);
  const page = integer(query.page, 1, 10000);
  const params = new URLSearchParams({ select: source.fields, order: 'published_at.desc,id.asc', limit: String(pageSize), offset: String((page - 1) * pageSize) });
  for (const [key, field] of [['brand','brand_slug'],['category','category_slug'],['collection','collection_slug']]) {
    if (query[key]) {
      if (!slugPattern.test(query[key])) return {items:[],total:0,page:1,pageSize,pages:0,unit:source.unit};
      params.set(field, `eq.${query[key]}`);
    }
  }
  if (query.collection) params.set('collection_kind','eq.collection');
  const term = normalizeSearch(query.search);
  if (term) params.set('search_text', `ilike.*${term.replace(/[*,()%_\\]/g, ' ').replace(/\s+/g, ' ')}*`);
  const { rows, total } = await request(config, params, fetcher, source.relation, source.feature);
  const pages = Math.ceil(total / pageSize);
  if (page > Math.max(1, pages)) return listing(config, {...query,page:Math.max(1,pages)}, fetcher, source);
  return {items:rows.map(source.map),total,page,pageSize,pages,unit:source.unit};
}

export async function readProduct(config, slug, fetcher = fetch) {
  if (!slugPattern.test(slug)) return undefined;
  const {rows} = await request(config, new URLSearchParams({select:FIELDS,slug:`eq.${slug}`,limit:'1'}), fetcher);
  return rows[0] ? publicProduct(rows[0]) : undefined;
}

function variantOptions(value) {
  if (!Array.isArray(value) || value.length > 8) throw new Error('Invalid variant options');
  const kinds = new Set();
  return value.map(o => {
    if (!o || typeof o !== 'object' || !kindPattern.test(o.kind) || kinds.has(o.kind) || !text(o.key, 120)) throw new Error('Invalid variant options');
    kinds.add(o.kind);
    return {kind: o.kind, key: o.key, label: localized(o.label, 'Invalid variant options'), value: localized(o.value, 'Invalid variant options')};
  });
}

function variantSpecs(value) {
  if (!Array.isArray(value) || value.length > 40) throw new Error('Invalid variant specs');
  return value.map(s => {
    if (!s || typeof s !== 'object' || !kindPattern.test(s.kind) || ![undefined, null, 'ar', 'en'].includes(s.value_lang)) throw new Error('Invalid variant specs');
    return {kind: s.kind, label: localized(s.label, 'Invalid variant specs'), value: localized(s.value, 'Invalid variant specs'), ...(s.value_lang === 'en' ? {valueLang: 'en'} : {})};
  });
}

/** @returns {import('../contracts/catalog').ProductVariant} */
export function publicVariant(row) {
  const product = publicProduct(row);
  if (!Number.isSafeInteger(row.position) || row.position < 0 || typeof row.is_primary !== 'boolean') throw new Error('Invalid variant position');
  return {...product, options: variantOptions(row.options), specs: variantSpecs(row.specs), position: row.position, isPrimary: row.is_primary};
}

/**
 * Validates the one-round-trip model envelope for an addressed variant slug.
 * @returns {import('../contracts/catalog').ProductModel | undefined}
 */
export function productModel(data, slug) {
  if (data === null) return undefined;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.variants) || data.variants.length > MAX_VARIANTS) throw new Error('Invalid product model response');
  const product = publicProduct(data.product);
  if (product.slug !== slug) throw new Error('Invalid product model identity');
  if (data.model_key === null || data.model_key === undefined || !data.variants.length) return singleModel(product);
  if (!text(data.model_key, 300)) throw new Error('Invalid product model identity');
  const name = localized(data.model_name, 'Invalid model name');
  const variants = data.variants.map(publicVariant);
  if (new Set(variants.map(v => v.slug)).size !== variants.length || new Set(variants.map(v => v.id)).size !== variants.length || variants.some(v => v.brandSlug !== product.brandSlug)) throw new Error('Invalid product model variants');
  // The bounded list can omit a late addressed variant; it stays reachable with whatever options it carries.
  if (!variants.some(v => v.slug === slug)) variants.push(publicVariant({options: [], specs: [], position: Number.MAX_SAFE_INTEGER, is_primary: false, ...data.product}));
  return assembleModel(data.model_key, name, variants, slug);
}

/** @returns {Promise<import('../contracts/catalog').ProductModel | undefined>} */
export async function readProductModel(config, slug, fetcher = fetch) {
  if (!slugPattern.test(slug)) return undefined;
  return withFallback(config, 'jwl_product_model', async () => {
    const response = await get(config, '/rest/v1/rpc/jwl_product_model', new URLSearchParams({p_slug: slug}), fetcher, {feature: 'jwl_product_model'});
    if (!response.ok) throw new Error(`Product model read failed (${response.status})`);
    return productModel(await response.json(), slug);
  }, async () => singleModel(await readProduct(config, slug, fetcher)));
}

export async function listCollections(config, brand, fetcher = fetch) {
  if (!slugPattern.test(brand)) return [];
  // A separate distinct collection projection prevents loading every product.
  const url = new URL('/rest/v1/jwl_collections', configuration(config));
  url.search = new URLSearchParams({select:'collection_slug,collection_ar,collection_en',brand_slug:`eq.${brand}`,order:'collection_en.asc',limit:'200'}).toString();
  const headers = {apikey:config.key};
  if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
  const response = await fetcher(url,{headers,signal:AbortSignal.timeout(8000),redirect:'manual'});
  if (!response.ok) throw new Error(`Collections read failed (${response.status})`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.some(r=>!slugPattern.test(r.collection_slug) || typeof r.collection_ar !== 'string' || typeof r.collection_en !== 'string')) throw new Error('Invalid collection response');
  return rows.map(r=>({slug:r.collection_slug,name:{ar:r.collection_ar,en:r.collection_en}}));
}

export async function listPublishedBrands(config,fetcher=fetch) {
  const url=new URL('/rest/v1/jwl_brands',configuration(config));
  url.search=new URLSearchParams({select:'brand_slug,brand_name,brand_tier',order:'brand_slug.asc',limit:'500'}).toString();
  const headers={apikey:config.key};
  if(!config.key.startsWith('sb_publishable_'))headers.Authorization=`Bearer ${config.key}`;
  const response=await fetcher(url,{headers,signal:AbortSignal.timeout(8000),redirect:'manual'});
  if(!response.ok)throw new Error(`Brand directory read failed (${response.status})`);
  const rows=await response.json();
  return publishedBrands(rows);
}

/** @returns {import('../contracts/catalog').Brand[]} */
function publishedBrands(rows) {
  if(!Array.isArray(rows)||rows.some(r=>!r||!slugPattern.test(r.brand_slug)||typeof r.brand_name!=='string'||!r.brand_name.trim()||!['luxury','accessible','contemporary'].includes(r.brand_tier)))throw new Error('Invalid brand directory');
  return rows.map(r=>({id:`brand-${r.brand_slug}`,slug:r.brand_slug,name:r.brand_name,tier:r.brand_tier,summary:{ar:`مختارات ${r.brand_name}. التفاصيل والتوفر عبر واتساب.`,en:`${r.brand_name} selections. Details and availability via WhatsApp.`}}));
}

// One database snapshot avoids waiting for three separate metadata round trips.
// This public read is not cached here; the existing HTML-only cache owns staleness.
/** @returns {Promise<{result: import('../contracts/catalog').ProductPage, collections: {slug: string, name: import('../contracts/catalog').LocalizedText}[], brands: import('../contracts/catalog').Brand[], brand: import('../contracts/catalog').Brand | undefined}>} */
export function readBrandPage(config, brand, query = {}, fetcher = fetch) {
  return brandPage(config, brand, query, fetcher, {fn: 'jwl_brand_page', map: publicProduct, unit: 'products'});
}

/** The collapsed counterpart: one card per model, with today's brand page while the RPC does not exist yet.
 * @returns {ReturnType<typeof readBrandPage>} */
export function readBrandModelsPage(config, brand, query = {}, fetcher = fetch) {
  return withFallback(config, 'jwl_brand_models_page', () => brandPage(config, brand, query, fetcher, {fn: 'jwl_brand_models_page', map: publicModelRow, unit: 'models', feature: 'jwl_brand_models_page'}), () => readBrandPage(config, brand, query, fetcher));
}

async function brandPage(config, brand, query, fetcher, source) {
  if(!slugPattern.test(brand))throw new Error('Invalid brand page identity');
  const params = new URLSearchParams({p_brand:brand,p_page:String(integer(query.page,1,10000)),p_page_size:String(integer(query.pageSize,12,48))});
  const response=await get(config,`/rest/v1/rpc/${source.fn}`,params,fetcher,{feature:source.feature});
  if(!response.ok)throw new Error(`Brand page read failed (${response.status})`);
  const data=await response.json();
  if(!data||!Array.isArray(data.items)||!Array.isArray(data.collections)||data.collections.length>200||!Array.isArray(data.brands)||data.brands.length>500)throw new Error('Invalid brand page response');
  for(const field of ['total','page','pageSize','pages'])if(!Number.isSafeInteger(data[field])||data[field]<0)throw new Error('Invalid brand page pagination');
  if(data.pageSize<1||data.pageSize>48||data.pages!==Math.ceil(data.total/data.pageSize)||data.page<1||data.page>Math.max(1,data.pages)||data.items.length>data.pageSize||data.items.some(row=>row.brand_slug!==brand))throw new Error('Invalid brand page pagination');
  const items=data.items.map(source.map);
  if(data.collections.some(r=>!r||!slugPattern.test(r.collection_slug)||typeof r.collection_ar!=='string'||typeof r.collection_en!=='string'))throw new Error('Invalid collection response');
  const brands=publishedBrands(data.brands);
  const target=data.brand===null?undefined:publishedBrands([data.brand])[0];
  if(target&&target.slug!==brand)throw new Error('Invalid brand page identity');
  return {result:{items,total:data.total,page:data.page,pageSize:data.pageSize,pages:data.pages,unit:source.unit},collections:data.collections.map(r=>({slug:r.collection_slug,name:{ar:r.collection_ar,en:r.collection_en}})),brands,brand:target};
}
