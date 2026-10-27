const exactKeys=(value,keys)=>value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const positive=(value,max)=>Number.isSafeInteger(value)&&value>0&&value<=max;
function publicUrl(value){
 if(typeof value!=='string'||value.length>2048||/[\s,]/.test(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.href===value;}catch{return false;}
}

// Lengths are code points, as Postgres length() counts them, and "blank" is what trim() strips, as
// jwl_internal.visible_credit_text refuses it, so a credit the database accepted always renders.
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&[...value].length<=max&&!/[\u0000-\u001f\u007f]/.test(value);
function creditUrl(value){
 if(typeof value!=='string'||value.length>2048)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}

/** An open-licence credit (decision 0013; inactive until such a grant exists). Its bounds are
 * jwl_internal.valid_media_attribution's: every field but source_url up to 300 characters, and an optional `title`
 * (the work's title as its author supplied it) that may be absent or null, so a five-field credit stays valid. */
export function imageAttribution(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['creator','license','license_url','source_url','changes','title'].includes(k))||!text(value.creator,300)||!text(value.license,300)||!creditUrl(value.license_url)||!creditUrl(value.source_url)||(value.changes!==undefined&&value.changes!==null&&!text(value.changes,300))||(value.title!==undefined&&value.title!==null&&!text(value.title,300)))throw new Error('Invalid image attribution');
 return {creator:value.creator.trim(),license:value.license.trim(),licenseUrl:value.license_url,sourceUrl:value.source_url,...(value.title?{title:value.title.trim()}:{}),...(value.changes?{changes:value.changes.trim()}:{})};
}

/** Only already approved public derivative metadata belongs in this projection. */
export function responsiveImages(value,images,factsOnly){
 if(value===undefined)value=[]; // Compatibility with earlier projections/fixtures.
 if(!Array.isArray(value)||value.length>20||(factsOnly&&value.length)||value.length&&value.length!==images.length)throw new Error('Invalid responsive image manifest');
 const urls=new Set();
 return value.map((image,index)=>{
  const credited=Boolean(image&&typeof image==='object'&&'attribution' in image);
  const keys=['src','width','height','variants',...(credited?['attribution']:[])];
  if(!exactKeys(image,keys)||image.src!==images[index]||!publicUrl(image.src)||!positive(image.width,4096)||!positive(image.height,8192)||!Array.isArray(image.variants)||!image.variants.length||image.variants.length>8)throw new Error('Invalid responsive image manifest');
  let lastWidth=0;let canonical=0;
  const variants=image.variants.map(v=>{
   if(!exactKeys(v,['src','width','height','bytes'])||!publicUrl(v.src)||!positive(v.width,image.width)||!positive(v.height,image.height)||!positive(v.bytes,15728640)||v.width<=lastWidth||urls.has(v.src)||Math.abs(v.height-image.height*v.width/image.width)>1)throw new Error('Invalid responsive image variant');
   if(v.src===image.src){canonical++;if(v.width!==image.width||v.height!==image.height)throw new Error('Invalid responsive canonical geometry');}
   lastWidth=v.width;urls.add(v.src);
   return {src:v.src,width:v.width,height:v.height,bytes:v.bytes};
  });
  if(canonical!==1||!variants.some(v=>v.width<=960))throw new Error('Missing responsive canonical/card variant');
  return {src:image.src,width:image.width,height:image.height,variants,...(credited?{attribution:imageAttribution(image.attribution)}:{})};
 });
}
