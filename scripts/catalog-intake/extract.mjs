import { normalizeBatch } from './normalize.mjs';

function entities(value) {
  if (Array.isArray(value)) return value.flatMap(entities);
  if (!value || typeof value !== 'object') return [];
  return [value, ...entities(value['@graph']), ...entities(value.hasVariant)];
}

const plain = value => typeof value === 'string' ? value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() : null;
const factKeys = {material:'material',color:'color',size:'dimensions',width:'dimensions',diameter:'diameter',movement:'movement',waterresistance:'water_resistance'};
function technicalFacts(entity) {
  const facts=[];
  for (const key of ['material','color','size']) {
    const value=plain(entity[key]);
    if(value)facts.push({key:factKeys[key],value});
  }
  for (const property of [entity.additionalProperty].flat().filter(Boolean)) {
    const label=typeof property.name==='string'?property.name.toLowerCase().replace(/[^a-z]/g,''):'';
    const value=plain(property.value);
    if (factKeys[label]&&value)facts.push({key:factKeys[label],value});
  }
  return facts;
}

/** Read public factual metadata without executing scripts; source copy remains private. */
export function extractProducts(html, source) {
  const products=[];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    let data;
    try {data=JSON.parse(match[1]);} catch {continue;} // One broken block must not discard valid product blocks.
    for (const entity of entities(data)) {
      if (![entity['@type']].flat().includes('Product')) continue;
      const id=entity.sku ?? entity.productID;
      // mpn may identify a whole model family; it is not a variant identity.
      if (typeof id!=='string' || !id.trim() || typeof entity.name!=='string') continue;
      const images=[entity.image].flat().filter(Boolean).map(x=>typeof x==='string'?x:x.url??x.contentUrl).filter(Boolean);
      const collection=source.collections?.[source.collection_slug];
      if (!collection) throw new Error('Source collection mapping is missing');
      products.push({source_id:source.id,external_id:id,source_url:source.page_url,brand:source.brand,collection,product_name:entity.name,image_urls:images,
        source_description:plain(entity.description),facts:technicalFacts(entity),provenance:{method:'json-ld',language:source.language ?? null},
      });
    }
  }
  if (!products.length) throw new Error('No complete variant-level product facts found');
  return normalizeBatch(products);
}
