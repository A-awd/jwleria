import {createHash} from 'node:crypto';

/** Prepare factual drafts from already-published products. No outbound posting or messages. */
export function socialDrafts(product, brandName) {
  if (product.isPreview !== false || product.mediaKind !== 'verified-product') throw new Error('Social content requires a published genuine product');
  for (const value of [product.id,product.reference,product.name?.ar,product.name?.en,product.collection?.ar,product.collection?.en,brandName]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Incomplete social product facts');
  }
  if (!Array.isArray(product.images) || !product.images.length || product.images.some(s=>{try{const u=new URL(s);return u.protocol!=='https:'||u.username||u.password;}catch{return true;}})) throw new Error('Invalid social media');
  const captions={
    ar:[brandName,product.collection.ar,product.name.ar,`المرجع: ${product.reference}`,'التفاصيل والتوفر عبر واتساب.'].join('\n\n'),
    en:[brandName,product.collection.en,product.name.en,`Reference: ${product.reference}`,'Details and availability via WhatsApp.'].join('\n\n'),
  };
  return ['instagram','tiktok','snapchat'].map(channel=>({
    draft_id:createHash('sha256').update(JSON.stringify([product.id,channel,captions,product.images])).digest('hex'),
    product_id:product.id,channel,captions,images:[...product.images],
    aspect_ratio:channel==='instagram'?'4:5':'9:16',
    publication_state:'draft',media_channel_approval:'required',
  }));
}
