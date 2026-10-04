const FIELDS = 'id,slug,reference,brand_slug,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,published_at';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const integer = (n, fallback, max) => Number.isFinite(Number(n)) && Number(n) >= 1 ? Math.min(Math.floor(Number(n)), max) : fallback;

export function normalizeSearch(s = '') {
  return String(s).normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).trim().slice(0, 200);
}

/** @returns {import('../contracts/catalog').PublicProduct} */
export function publicProduct(row) {
  if (!row || !slugPattern.test(row.slug) || !slugPattern.test(row.brand_slug) || !slugPattern.test(row.category_slug) || !slugPattern.test(row.collection_slug)) throw new Error('Invalid published catalog identity');
  if (!Array.isArray(row.images) || !row.images.length || row.images.some(s => {
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
    collection: { ar: row.collection_ar, en: row.collection_en },
    name: { ar: row.name_ar, en: row.name_en },
    summary: { ar: row.description_ar || `${row.name_ar} — ${row.collection_ar}`, en: row.description_en || `${row.name_en} — ${row.collection_en}` }, image: row.images[0], images: [...row.images],
    mediaKind: 'verified-product', isPreview: false, addedAt: row.published_at,
  };
}

function configuration(config) {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !url.hostname.endsWith('.supabase.co')) throw new Error('Invalid catalog server configuration');
  if (typeof config.key !== 'string' || !config.key) throw new Error('Missing catalog read key');
  return url;
}

async function request(config, query, fetcher) {
  const endpoint = new URL('/rest/v1/jwl_catalog', configuration(config));
  endpoint.search = query.toString();
  const headers = { apikey: config.key, Prefer: 'count=exact', Accept: 'application/json' };
  // New publishable keys aren't JWTs; legacy anon JWTs also need Authorization.
  if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
  const response = await fetcher(endpoint, { headers, signal: AbortSignal.timeout(8000), redirect: 'manual' });
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

export async function queryCatalog(config, query = {}, fetcher = fetch) {
  const pageSize = integer(query.pageSize, 12, 48);
  const page = integer(query.page, 1, 10000);
  const params = new URLSearchParams({ select: FIELDS, order: 'published_at.desc,id.asc', limit: String(pageSize), offset: String((page - 1) * pageSize) });
  for (const [key, field] of [['brand','brand_slug'],['category','category_slug'],['collection','collection_slug']]) {
    if (query[key]) {
      if (!slugPattern.test(query[key])) return {items:[],total:0,page:1,pageSize,pages:0};
      params.set(field, `eq.${query[key]}`);
    }
  }
  const term = normalizeSearch(query.search);
  if (term) params.set('search_text', `ilike.*${term.replace(/[*,()%_\\]/g, ' ').replace(/\s+/g, ' ')}*`);
  const { rows, total } = await request(config, params, fetcher);
  const pages = Math.ceil(total / pageSize);
  if (page > Math.max(1, pages)) return queryCatalog(config, {...query,page:Math.max(1,pages)}, fetcher);
  return {items:rows.map(publicProduct),total,page,pageSize,pages};
}

export async function readProduct(config, slug, fetcher = fetch) {
  if (!slugPattern.test(slug)) return undefined;
  const {rows} = await request(config, new URLSearchParams({select:FIELDS,slug:`eq.${slug}`,limit:'1'}), fetcher);
  return rows[0] ? publicProduct(rows[0]) : undefined;
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
  if(!Array.isArray(rows)||rows.some(r=>!slugPattern.test(r.brand_slug)||typeof r.brand_name!=='string'||!['luxury','accessible','contemporary'].includes(r.brand_tier)))throw new Error('Invalid brand directory');
  return rows.map(r=>({id:`brand-${r.brand_slug}`,slug:r.brand_slug,name:r.brand_name,tier:r.brand_tier,summary:{ar:`مختارات ${r.brand_name}. التفاصيل والتوفر عبر واتساب.`,en:`${r.brand_name} selections. Details and availability via WhatsApp.`}}));
}
