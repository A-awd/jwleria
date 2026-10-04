import { normalizeBatch } from './normalize.mjs';

function entities(value) {
  if (Array.isArray(value)) return value.flatMap(entities);
  if (!value || typeof value !== 'object') return [];
  return [value, ...entities(value['@graph']), ...entities(value.hasVariant)];
}

/** Read facts from JSON-LD; never execute page scripts or import prices/descriptions. */
export function extractProducts(html, source) {
  const products=[];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const data=JSON.parse(match[1]);
    for (const entity of entities(data)) {
      if (![entity['@type']].flat().includes('Product')) continue;
      const id=entity.sku ?? entity.productID;
      // mpn may identify a whole model family; it is not a variant identity.
      if (typeof id!=='string' || !id.trim() || typeof entity.name!=='string') continue;
      const images=[entity.image].flat().filter(Boolean).map(x=>typeof x==='string'?x:x.url??x.contentUrl).filter(Boolean);
      const collection=source.collections?.[source.collection_slug];
      if (!collection) throw new Error('Source collection mapping is missing');
      products.push({source_id:source.id,external_id:id,source_url:source.page_url,brand:source.brand,collection,product_name:entity.name,image_urls:images});
    }
  }
  if (!products.length) throw new Error('No complete variant-level product facts found');
  return normalizeBatch(products);
}
