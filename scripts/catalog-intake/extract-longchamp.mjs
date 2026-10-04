import { normalizeBatch } from './normalize.mjs';

const plain = x => typeof x === 'string' ? x.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() : '';
const types = [['Extensible travel bag','حقيبة سفر قابلة للتوسعة'],['Travel bag','حقيبة سفر'],['Tote bag','حقيبة كتف'],['Handbag','حقيبة يد'],['Crossbody bag','حقيبة كروس بودي'],['Shoulder bag','حقيبة كتف'],['Bucket bag','حقيبة باكيت'],['Basket bag','حقيبة سلة'],['Camera bag','حقيبة كاميرا'],['Briefcase','حقيبة مستندات'],['Carry-on','حقيبة سفر للمقصورة'],['Backpack','حقيبة ظهر'],['Pouch','حقيبة صغيرة'],['Coin purse','محفظة نقود معدنية'],['Wallet','محفظة'],['Card holder','حافظة بطاقات'],['Cardholder','حافظة بطاقات'],['Ballerinas','حذاء باليرينا'],['Boots','حذاء بوت'],['Candle','شمعة'],['Belt','حزام']];
const sizes = {XS:'صغير جدًا',S:'صغير',M:'متوسط',L:'كبير',XL:'كبير جدًا'};
const colors = {Black:'أسود',Navy:'كحلي',Paper:'ورقي',Mocha:'موكا',Olive:'زيتوني',Cognac:'كونياك',Pebble:'حصوي',Fawn:'بني فاتح',Strawberry:'فراولة',White:'أبيض',Blue:'أزرق',Green:'أخضر'};

export function localizedLongchampName({name,collection,color}) {
  const kind=types.find(([en])=>new RegExp(en,'i').test(name));
  if(!kind)return null;
  const size=name.match(/\b(XS|XL|S|M|L)\b/)?.[1];
  return `${kind[1]} ${collection}${size?'، مقاس '+sizes[size]:''}${color?'، '+(colors[color]??color):''}`;
}

/** Read exact variant metadata and technical specifications; never execute site scripts. */
export function extractLongchamp(html,{page_url,source_id='longchamp-official'}) {
  if(new URL(page_url).origin!=='https://www.longchamp.com')throw new Error('Unexpected Longchamp origin');
  const layerMatch=html.match(/\bvar\s+dataLayer\s*=\s*(\[[\s\S]*?\]);/);
  if(!layerMatch)throw new Error('Official collection metadata missing');
  const layers=JSON.parse(layerMatch[1]);
  const layer=layers.find(x=>x.pageCategory==='product'&&x.product?.itno&&x.product?.line);
  if(!layer)throw new Error('Official variant and collection missing');
  const meta=layer.product;
  const entities=[];
  for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){
    try{const data=JSON.parse(m[1]);entities.push(...(Array.isArray(data)?data:[data]));}catch{}
  }
  const product=entities.find(x=>String(x?.['@type']).toLowerCase()==='product'&&x.sku===meta.itno);
  if(!product||!plain(product.name)||!product.image)throw new Error('Matching product identity missing');
  const facts=[];
  const specs=product.offers?.description;
  if(typeof specs==='string')for(const part of specs.split(' | ')){
    const sep=part.indexOf(':');if(sep<0)continue;
    const key=part.slice(0,sep).trim().toLowerCase().replace(/\s+/g,'_'),value=plain(part.slice(sep+1));
    if(value&&key!=='reference')facts.push({key,value});
  }
  if(meta.color)facts.push({key:'color',value:meta.color});
  if(!facts.some(x=>x.key==='material')&&meta.material)facts.push({key:'material',value:meta.material});
  const images=[product.image];
  // Include only this exact SKU's gallery, excluding recommendations and color alternatives.
  for(const m of html.matchAll(/https:\/\/www\.longchamp\.com\/[^\s"'<>]+\/images\/DIS\/([A-Za-z0-9]+)_\d+\.png(?:\?[^\s"'<>]*)?/g)){
    if(m[1]!==meta.itno)continue;
    const url=m[0].replace(/&amp;/g,'&');
    if(/(?:\?|&)sw=2000(?:&|$)/.test(url))images.push(url);
  }
  const ar=localizedLongchampName({name:product.name,collection:meta.line,color:meta.color});
  const candidate=normalizeBatch([{source_id,external_id:meta.itno,brand:'Longchamp',collection:meta.line,product_name:plain(product.name),name_en:plain(product.name)+(meta.color?' — '+meta.color:''),name_ar:ar,image_urls:images,source_url:page_url,source_description:plain(product.description),facts,provenance:{method:'structured-page',language:'en'}}])[0];
  return {...candidate,source_category:{level1:layer.pageLevel1??null,level2:layer.pageLevel2??null,level3:layer.pageLevel3??null}};
}
