const exactKeys=(value,keys)=>value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const positive=(value,max)=>Number.isSafeInteger(value)&&value>0&&value<=max;
function publicUrl(value){
 if(typeof value!=='string'||value.length>2048||/[\s,]/.test(value))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.href===value;}catch{return false;}
}

/** Only already approved public derivative metadata belongs in this projection. */
export function responsiveImages(value,images,factsOnly){
 if(value===undefined)value=[]; // Compatibility with earlier projections/fixtures.
 if(!Array.isArray(value)||value.length>20||(factsOnly&&value.length)||value.length&&value.length!==images.length)throw new Error('Invalid responsive image manifest');
 const urls=new Set();
 return value.map((image,index)=>{
  if(!exactKeys(image,['src','width','height','variants'])||image.src!==images[index]||!publicUrl(image.src)||!positive(image.width,4096)||!positive(image.height,8192)||!Array.isArray(image.variants)||!image.variants.length||image.variants.length>8)throw new Error('Invalid responsive image manifest');
  let lastWidth=0;let canonical=0;
  const variants=image.variants.map(v=>{
   if(!exactKeys(v,['src','width','height','bytes'])||!publicUrl(v.src)||!positive(v.width,image.width)||!positive(v.height,image.height)||!positive(v.bytes,15728640)||v.width<=lastWidth||urls.has(v.src)||Math.abs(v.height-image.height*v.width/image.width)>1)throw new Error('Invalid responsive image variant');
   if(v.src===image.src){canonical++;if(v.width!==image.width||v.height!==image.height)throw new Error('Invalid responsive canonical geometry');}
   lastWidth=v.width;urls.add(v.src);
   return {src:v.src,width:v.width,height:v.height,bytes:v.bytes};
  });
  if(canonical!==1||!variants.some(v=>v.width<=960))throw new Error('Missing responsive canonical/card variant');
  return {src:image.src,width:image.width,height:image.height,variants};
 });
}
