import {normalizeBatch} from './normalize.mjs';

const plain=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const canonical=value=>new URL(value).href;
function entities(value){
  if(Array.isArray(value))return value.flatMap(entities);
  if(!value||typeof value!=='object')return [];
  return [value,...entities(value['@graph'])];
}
function structured(html){
  return [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].flatMap(m=>{try{return entities(JSON.parse(m[1]));}catch{return [];}});
}
const familyArabic={Hammock:'هاموك',Puzzle:'بازِل',Flamenco:'فلامنكو',Gate:'غيت',Amazona:'أمازونا'};
function arabicBagName(name,family){
  if(/[\u0600-\u06ff]/.test(name))return name.replace(/[\u200e\u200f]/g,'');
  if(!/\bbag\b|\btote\b|\bpouch\b|\bwallet\b/i.test(name))return null;
  const kind=/\bwallet\b/i.test(name)?'محفظة':'حقيبة';
  const size=/\bsmall\b/i.test(name)?' صغيرة':/\bmedium\b/i.test(name)?' متوسطة':/\blarge\b/i.test(name)?' كبيرة':/\bmini\b/i.test(name)?' ميني':'';
  return `${kind} ${familyArabic[family]??family}${size}`;
}
function pradaFacts(product,html){
  const text=plain(html),title=plain(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
  const namedMaterials=[...plain(product.name).matchAll(/brushed leather|Saffiano leather|Re-Nylon|raffia-effect yarn|calfskin|leather|crochet|جلد مصقول|رينايلون/gi)].map(m=>m[0]);
  const material=product.material||[...new Set(namedMaterials)].join('; ');
  const color=product.color||/\b(Black|White|Blue|Green|Pink|Red|Beige|Brown)\s*\|/i.exec(title)?.[1];
  const facts=[];if(material)facts.push({key:'material',value:plain(material)});if(color)facts.push({key:'color',value:plain(color)});
  const dims=/Height:\s*([\d.]+)\s*cm\s*(?:Length|Depth):\s*([\d.]+)\s*cm\s*Width:\s*([\d.]+)\s*cm/i.exec(text)||/الارتفاع:\s*([\d.]+)\s*cm\s*الطول:\s*([\d.]+)\s*cm\s*العرض:\s*([\d.]+)\s*cm/.exec(text);
  if(dims)facts.push({key:'dimensions',value:`${dims[3]} x ${dims[1]} x ${dims[2]} cm (width x height x length)`});
  return facts;
}

/** Parse one official product page. No script execution, guessed images, prices or public reuse grant. */
export function extractBagPage(html,{brand,source_id,page_url}){
  if(!['prada','bottega-veneta','loewe'].includes(brand))throw Error('Unsupported bag source');
  const page=canonical(page_url),data=structured(html);let raw,evidence;
  if(brand==='prada'){
    const product=data.find(d=>[d['@type']].flat().includes('Product'));
    if(!product||typeof product.sku!=='string'||!product.sku||!product.name)throw Error('Missing Prada variant facts');
    const breadcrumbs=data.find(d=>d['@type']==='BreadcrumbList')?.itemListElement?.map(c=>c.item?.name??c.name).filter(Boolean)??[];
    const named=/Prada\s+(Re[- ]Edition(?:\s+\d{4})?|Cleo|Galleria|Symbole|Arqué|Buckle|Bonnie|Panier)/i.exec(product.name)?.[0];
    const family=named?.replace(/\s+\d{4}$/,'')??breadcrumbs.at(-2);
    if(!family||family===product.name)throw Error('Missing observed Prada grouping');
    const images=[product.image].flat().map(i=>typeof i==='string'?i:i?.url).filter(Boolean);
    images.push(...data.filter(d=>d['@type']==='ImageObject'&&typeof d.contentUrl==='string'&&d.contentUrl.includes(product.sku)).map(d=>d.contentUrl));
    if(!images.length||images.some(u=>!u.includes(product.sku)))throw Error('Prada image/variant reference mismatch');
    raw={source_id,external_id:product.sku,source_url:page,brand:'Prada',collection:family,product_name:product.name,name_ar:arabicBagName(product.name,family),name_en:product.name,image_urls:images.map(canonical),source_description:plain(product.description),facts:pradaFacts(product,html),provenance:{method:'structured-page',language:/[\u0600-\u06ff]/.test(product.name)?'ar':'en'}};
    evidence={reference:product.sku,grouping_kind:named?'official_named_product_family':'official_breadcrumb_group',grouping:family,breadcrumbs,image_binding:'Explicit Product/ImageObject variant references'};
  }
  if(brand==='bottega-veneta'){
    const product=data.find(d=>[d['@type']].flat().includes('Product'));
    if(!product?.name||!product.sku||typeof product.image!=='string')throw Error('Missing Bottega variant facts');
    const reference=/data-querystring="pid=([^"&]+)"/.exec(html)?.[1]??product.sku;
    if(reference!==product.sku&&!product.image.includes(reference))throw Error('Bottega image/reference mismatch');
    const family=product.name.split(/\s+in\s+/i)[0].trim();if(!family)throw Error('Missing observed Bottega family');
    const material=plain(/• Material:\s*([^<]+)/.exec(html)?.[1]);
    const extras=[...html.matchAll(/https:\/\/bottega-veneta\.dam\.kering\.com\/[^\s"<>]+/g)].map(m=>m[0].replace(/&amp;/g,'&')).filter(u=>u.includes(reference)&&/\/Large-/.test(u));
    const facts=[];if(/\bleather\b/i.test(plain(product.description)))facts.push({key:'material',value:'leather'});if(material)facts.push({key:'leather_type',value:material});if(product.color)facts.push({key:'color',value:product.color});facts.push({key:'platform_sku',value:product.sku});
    raw={source_id,external_id:reference,source_url:page,brand:'Bottega Veneta',collection:family,product_name:product.name,name_ar:arabicBagName(product.name,family),name_en:product.name,image_urls:[product.image,...new Set(extras)].slice(0,8).map(canonical),source_description:plain(product.description),facts,provenance:{method:'structured-page',language:'en'}};
    evidence={reference,platform_sku:product.sku,grouping_kind:'official_named_product_family',grouping:family,image_binding:'Official product metadata and displayed variant code',dimensions:'Omitted; some official centimeter/inch pairs conflict'};
  }
  if(brand==='loewe'){
    // The surrounding executable script is never evaluated; only its JSON literal is parsed.
    const literal=/window\['__pid_[^']+'\]\s*=\s*(\{[\s\S]*?\});/.exec(html)?.[1];if(!literal)throw Error('Missing public LOEWE product literal');
    const product=JSON.parse(literal).data,a=product?.customAttributes;
    if(!product?.id||!product.name||!a||!(Array.isArray(a.c_LW_collection)&&a.c_LW_collection.length===1)&&!plain(a.c_LW_lineTXTDescription))throw Error('Missing LOEWE variant/collection');
    const images=a.c_allImages?.map(i=>canonical(new URL(i.src,page).href));
    if(!images?.length||images.some(u=>!decodeURIComponent(u).includes(product.id)))throw Error('LOEWE image/reference mismatch');
    const hasCollection=Array.isArray(a.c_LW_collection)&&a.c_LW_collection.length===1;
    const family=hasCollection?a.c_LW_collection[0]:plain(a.c_LW_lineTXTDescription),facts=[];
    if(a.c_LW_materialDescription)facts.push({key:'material',value:plain(a.c_LW_materialDescription)});
    else if(/\bcalfskin\b/i.test(product.name+' '+plain(product.shortDescription)))facts.push({key:'material',value:'calfskin'});
    if(a.c_LW_colorLabel)facts.push({key:'color',value:plain(a.c_LW_colorLabel)});if(a.c_LW_measures)facts.push({key:'dimensions',value:plain(a.c_LW_measures)});
    raw={source_id,external_id:product.id,source_url:page,brand:'LOEWE',collection:family,product_name:product.name,name_ar:arabicBagName(product.name,family),name_en:product.name,image_urls:images,source_description:plain(product.shortDescription),facts,provenance:{method:'structured-page',language:'en'}};
    evidence={reference:product.id,grouping_kind:hasCollection?'explicit_collection_field':'explicit_product_line_field',grouping:family,breadcrumbs:a.c_pdpBreadcrumbs?.map(b=>b.name)??[],image_binding:'Exact selected variant c_allImages; no alternative colors'};
  }
  return {raw,candidate:normalizeBatch([raw])[0],evidence:{...evidence,source_url:page}};
}

export function sitemapLocations(xml){return [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/g)].map(m=>canonical(m[1].trim().replace(/&amp;/g,'&')));}

/** Scope is a selected regional sitemap inventory, never a claim of the worldwide brand catalog. */
export function bagSourceProfile(brand,origin,robots){
  const sameOrigin=u=>{try{return new URL(u).origin===origin;}catch{return false;}};
  const advertised=[...robots.matchAll(/^Sitemap:\s*(\S+)/gmi)].map(m=>canonical(m[1])).filter(u=>new URL(u).origin===origin);
  if(brand==='prada')return {roots:advertised.filter(u=>/\/sitemap_index_[01]\.xml$/.test(u)),follow:u=>sameOrigin(u)&&/\/sitemap_product_AE_en_\d+\.xml$/.test(u),product:u=>sameOrigin(u)&&u.includes('/ae/en/p/')&&/bag|wallet|belt|pouch|keychain|key-ring|card-holder|backpack|case|tote|luggage|trunk|briefcase|purse|rucksack|duffle/i.test(decodeURIComponent(u)),scope:'AE English product sitemap indices; product URLs explicitly naming bags, wallets, belts, luggage or leather accessories; keyword scope excludes footwear'};
  if(brand==='bottega-veneta')return {roots:advertised.filter(u=>/\/en-gb\/sitemap_index\.xml$/.test(u)),follow:u=>sameOrigin(u)&&/sitemap_\d+(?:-product)?\.xml$/.test(u),product:u=>sameOrigin(u)&&u.includes('/en-gb/')&&/[A-Z0-9]{8,24}\.html$/.test(u)&&/bag|tote|pouch|wallet|belt|cassette|jodie|knot|intreccio/i.test(u),scope:'GB English variants listed in advertised product and general sitemap chunks; bags and leather accessories'};
  if(brand==='loewe')return {roots:advertised.filter(u=>/\/int\/en\/sitemap_index\.xml$/.test(u)),follow:u=>sameOrigin(u)&&/sitemap_\d+-product\.xml$/.test(u),product:u=>sameOrigin(u)&&u.includes('/int/en/')&&/\/(bags|wallets|small-leather-goods)\//.test(u),scope:'International English product sitemap chunks; bags, wallets and small leather goods'};
  throw Error('Unsupported bag inventory');
}
