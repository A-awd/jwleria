import {createHash} from 'node:crypto';
import {readFile,lstat,writeFile} from 'node:fs/promises';
import {deflateSync,crc32} from 'node:zlib';
import {createRequire} from 'node:module';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {standardChannels} from './standard-channels.mjs';

// Background-only cutouts (decision 0015). This module checks a cutout master against its untouched original, composes
// a master from the original's own stored pixels and a local mask, and repairs proven mask loss inside the product (an
// enclosed product region made see-through) by restoring the original's own pixels there; it never generates, redraws,
// retouches or recolours an image. A passing record is not an approval: an independent visual comparison is still
// required, and a cutout can be recorded only once the database's cutout migration is applied.
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;
const maxBytes=15728640;
const share=(count,total)=>Number((count/total).toFixed(6));

/** The storefront's product frame colour: `.media { background: var(--sand) }` in apps/storefront/src/styles/global.css. */
export const frameBackground='#f1ede6';
export const cutoutTreatment=Object.freeze({kind:'background_removal',version:1});
/**
 * Implementation defaults (decision 0010), not owner approvals. rgb_tolerance allows only rounding: an opaque pixel may
 * differ from the original by at most 2 per channel. A visible pixel has alpha of at least 128; a visible component
 * counts when it covers at least 0.05% of the canvas. The removed backdrop is sampled in a ring of backdrop_ring pixels
 * along the canvas edge where the cutout is fully transparent (at least backdrop_min_samples pixels); an original pixel
 * looks like that backdrop when every channel lies within its 1st..99th percentile widened by backdrop_tolerance. An
 * enclosed see-through region with at most enclosed_backdrop_max of such pixels shows product, not background. In a
 * source's own transparency, a detached fragment that reaches fragment_min_alpha (the alpha at which flat-tile framing
 * counts a pixel, backgroundComposite.alphaThreshold) but never visible_alpha is a stray mark, not product.
 */
export const cutoutLimits=Object.freeze({rgb_tolerance:2,min_transparent_fraction:0.02,min_opaque_fraction:0.02,visible_alpha:128,component_min_fraction:0.0005,
  backdrop_ring:8,backdrop_tolerance:12,backdrop_min_samples:1000,enclosed_backdrop_max:0.02,fragment_min_alpha:16});
/**
 * What the independent visual comparison of a cutout must confirm, judged on the master itself flattened on the frame
 * colour and on magenta (`preview`), never on the original alone; code never records these as passed. A segmentation can
 * keep a stand, a box or another object that touches the product: that is a retained object, not a product.
 */
export const cutoutReviewChecks=Object.freeze(['background_only_removed','no_background_or_other_object_retained','whole_product_retained','edges_clean_on_frame_background','no_redrawn_or_generated_detail']);

/** The description of an ICC profile ('desc' tag, ICC v2 text or v4 multi-localised), or null. */
export function iccDescription(icc){
  if(!Buffer.isBuffer(icc)||icc.length<132)return null;
  const count=icc.readUInt32BE(128);
  for(let i=0;i<count&&132+i*12+12<=icc.length;i++){
    const entry=132+i*12;
    if(icc.toString('latin1',entry,entry+4)!=='desc')continue;
    const at=icc.readUInt32BE(entry+4),type=icc.toString('latin1',at,at+4);
    if(type==='desc'&&at+12<=icc.length){const n=icc.readUInt32BE(at+8);return icc.toString('latin1',at+12,Math.min(icc.length,at+12+n)).replace(/\0+$/,'');}
    if(type==='mluc'&&at+28<=icc.length){
      const length=icc.readUInt32BE(at+20),offset=icc.readUInt32BE(at+24),bytes=icc.subarray(at+offset,Math.min(icc.length,at+offset+length));
      let text='';for(let j=0;j+1<bytes.length;j+=2)text+=String.fromCharCode(bytes.readUInt16BE(j));
      return text;
    }
  }
  return null;
}

async function heldFile(file,label){
  if(!file||!isAbsolute(file.path??'')||!hashPattern.test(file.sha256??''))throw Error(`${label} needs an absolute path and its recorded sha256`);
  const stat=await lstat(file.path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maxBytes)throw Error(`${label} must be a regular file within 15 MiB`);
  const bytes=await readFile(file.path);
  if(digest(bytes)!==file.sha256)throw Error(`${label} differs from its recorded sha256`);
  return bytes;
}

// Connected areas of visible pixels (4-neighbour), largest first.
function visibleComponents(alpha,width,height,visible){
  const seen=new Uint8Array(width*height),stack=new Int32Array(width*height),sizes=[];
  for(let start=0;start<alpha.length;start++){
    if(seen[start]||alpha[start]<visible)continue;
    let top=0,size=0;stack[top++]=start;seen[start]=1;
    while(top){
      const p=stack[--top];size++;
      const x=p%width;
      for(const q of [x>0?p-1:-1,x<width-1?p+1:-1,p-width,p+width]){
        if(q<0||q>=alpha.length||seen[q]||alpha[q]<visible)continue;
        seen[q]=1;stack[top++]=q;
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a,b)=>b-a);
}

// The original's own removed backdrop: its pixels in the canvas-edge ring where the cutout is fully transparent, as a
// per-channel range (1st..99th percentile, widened by the tolerance). Null when too few such pixels exist to say.
function backdropRange(rgb,alpha,width,height){
  const ring=Math.min(cutoutLimits.backdrop_ring,width>>1,height>>1),hist=[0,1,2].map(()=>new Uint32Array(256));let samples=0;
  const take=p=>{if(alpha[p]!==0)return;samples++;for(let k=0;k<3;k++)hist[k][rgb[p*3+k]]++;};
  for(let y=0;y<height;y++){
    if(y<ring||y>=height-ring){for(let x=0;x<width;x++)take(y*width+x);continue;}
    for(let x=0;x<ring;x++){take(y*width+x);take(y*width+width-1-x);}
  }
  if(samples<cutoutLimits.backdrop_min_samples)return null;
  const percentile=(h,q)=>{const target=Math.max(1,Math.ceil(q*samples));let sum=0;for(let v=0;v<256;v++){sum+=h[v];if(sum>=target)return v;}return 255;};
  const t=cutoutLimits.backdrop_tolerance;
  return {samples,low:hist.map(h=>Math.max(0,percentile(h,0.01)-t)),high:hist.map(h=>Math.min(255,percentile(h,0.99)+t))};
}

// Every enclosed region: a connected area (4-neighbour) of pixels that are not fully opaque and that fully opaque pixels
// cut off from the canvas edge. With members, each region also lists its pixel indices (for the mask repair). With
// source_alpha (the original has its own transparency) there is no photographed backdrop, so no region is classified.
function enclosedRegions({rgb,alpha,width,height},{members=false,source_alpha=false}={}){
  const n=width*height,visited=new Uint8Array(n),stack=new Int32Array(n);let top=0;
  const enter=p=>{if(!visited[p]&&alpha[p]!==255){visited[p]=1;stack[top++]=p;}};
  const flood=collect=>{
    while(top){
      const p=stack[--top],x=p%width;collect(p);
      if(x>0)enter(p-1);if(x<width-1)enter(p+1);if(p>=width)enter(p-width);if(p<n-width)enter(p+width);
    }
  };
  // Everything not opaque that reaches the canvas edge is the removed exterior, never an enclosed region.
  for(let x=0;x<width;x++){enter(x);enter((height-1)*width+x);}
  for(let y=0;y<height;y++){enter(y*width);enter(y*width+width-1);}
  flood(()=>{});
  const backdrop=source_alpha?null:backdropRange(rgb,alpha,width,height),regions=[];
  const like=p=>backdrop!==null&&[0,1,2].every(k=>rgb[p*3+k]>=backdrop.low[k]&&rgb[p*3+k]<=backdrop.high[k]);
  for(let start=0;start<n;start++){
    if(visited[start]||alpha[start]===255)continue;
    const list=[];let x0=width,y0=height,x1=-1,y1=-1,min=255,backdropLike=0;
    enter(start);
    flood(p=>{
      list.push(p);const x=p%width,y=(p-x)/width;
      if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      if(alpha[p]<min)min=alpha[p];if(like(p))backdropLike++;
    });
    const fraction=share(backdropLike,list.length);
    regions.push({box:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},pixels:list.length,min_alpha:min,backdrop_like_fraction:fraction,
      kind:backdrop===null?'undetermined':fraction<=cutoutLimits.enclosed_backdrop_max?'product_material':'background_hole',...(members?{members:list}:{})});
  }
  return {backdrop,regions:regions.sort((a,b)=>b.pixels-a.pixels)};
}

/**
 * The enclosed see-through regions of a cutout (alpha) over its original (stored RGB, upright), each classified against
 * the original's own removed backdrop: a region whose original pixels look like that backdrop is a real hole (inside a
 * handle, an open weave) and stays transparent; a region with at most enclosed_backdrop_max of backdrop-like pixels is
 * photographed product material that the mask made see-through; without a measurable backdrop a region is undetermined.
 * The opaque-pixel check cannot see this loss, because the lost pixels are no longer opaque.
 */
export function enclosedAlphaRegions(image){
  const {backdrop,regions}=enclosedRegions(image,{source_alpha:image.source_alpha===true});
  const count=kind=>regions.filter(r=>r.kind===kind).length;
  return {backdrop,background_holes:count('background_hole'),product_material:count('product_material'),undetermined:count('undetermined'),regions};
}

/**
 * Repairs proven mask loss only: every enclosed region classified as product material becomes fully opaque, so the
 * master shows the original's own photographed pixels there (composeCutoutMaster copies the stored RGB under the mask).
 * Real holes, undetermined regions and everything that reaches the exterior are left exactly as the mask made them;
 * nothing is generated, redrawn, retouched or recoloured. Returns the repaired mask and the record of each region.
 */
export function repairEnclosedProductMask({rgb,mask,width,height}){
  if(mask.length!==width*height||rgb.length!==width*height*3)throw Error('The mask and the original differ in geometry');
  const {backdrop,regions}=enclosedRegions({rgb,alpha:mask,width,height},{members:true});
  const repaired=Buffer.from(mask),restored=[],kept=[];
  for(const {members,...region} of regions){
    if(region.kind==='product_material'){for(const p of members)repaired[p]=255;restored.push(region);}
    else kept.push(region);
  }
  return {mask:repaired,record:{schema:'jwleria-mask-repair/1',
    rule:`An enclosed region of non-opaque mask (cut off from the canvas edge by opaque pixels) whose original pixels are at most ${cutoutLimits.enclosed_backdrop_max*100}% backdrop-like is product material made see-through; only such regions are set fully opaque, showing the original's own pixels. Real holes stay transparent.`,
    limits:{...cutoutLimits},backdrop,mask_sha256:digest(mask),repaired_mask_sha256:digest(repaired),changed:restored.length>0,
    restored_regions:restored.length,restored_pixels:restored.reduce((n,r)=>n+r.pixels,0),restored,kept}};
}

/**
 * Faint detached fragments in a source's own transparency: 8-connected areas of non-zero alpha, other than the largest
 * (the product), that are never visible (every alpha below visible_alpha), that do reach fragment_min_alpha (so flat-tile
 * framing would count them and they can show faintly) and that are small (under component_min_fraction of the canvas).
 * Such a fragment is a stray line or speck left in the source's alpha, not the product; a visible piece (a second
 * earring, a detached strap) is never one, and nothing fainter than the framing threshold is touched.
 */
export function faintDetachedFragments(alpha,width,height){
  const n=width*height,seen=new Uint8Array(n),stack=new Int32Array(n),parts=[];
  for(let start=0;start<n;start++){
    if(seen[start]||!alpha[start])continue;
    let top=0,max=0,x0=width,y0=height,x1=-1,y1=-1;const members=[];
    stack[top++]=start;seen[start]=1;
    while(top){
      const p=stack[--top],x=p%width,y=(p-x)/width;members.push(p);
      if(alpha[p]>max)max=alpha[p];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;if((!dx&&!dy)||xx<0||yy<0||xx>=width||yy>=height)continue;
        const q=yy*width+xx;if(!seen[q]&&alpha[q]){seen[q]=1;stack[top++]=q;}
      }
    }
    parts.push({box:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},pixels:members.length,max_alpha:max,members});
  }
  parts.sort((a,b)=>b.pixels-a.pixels);
  return parts.slice(1).filter(f=>f.max_alpha>=cutoutLimits.fragment_min_alpha&&f.max_alpha<cutoutLimits.visible_alpha&&f.pixels<cutoutLimits.component_min_fraction*n);
}

/**
 * A master of a native-alpha original without its faint detached fragments: the original's own stored pixels (8-bit
 * sRGB, or a greyscale PNG read losslessly as R=G=B=grey) and its own alpha, with only the fragments' alpha set to 0.
 * Null when there is no such fragment. Nothing else changes, and the master must still pass validateCutoutMaster
 * (which refuses any lowered alpha on a pixel the source shows visibly) and the independent visual comparison.
 */
export async function strayFragmentMaster(original,sharp){
  const meta=await sharp(original,{failOn:'warning'}).metadata();
  if((meta.orientation??1)!==1)throw Error('An original with an EXIF orientation is refused here');
  const {bytes,decoding}=await standardChannels(original,sharp);
  const {data,info}=await sharp(bytes,{failOn:'warning',ignoreIcc:true}).raw().toBuffer({resolveWithObject:true});
  if(info.channels!==4)throw Error('Only a source with its own transparency has fragments to remove');
  const {width,height}=info,n=width*height,alpha=Buffer.alloc(n),rgb=Buffer.alloc(n*3);
  for(let p=0;p<n;p++){alpha[p]=data[p*4+3];rgb[p*3]=data[p*4];rgb[p*3+1]=data[p*4+1];rgb[p*3+2]=data[p*4+2];}
  const fragments=faintDetachedFragments(alpha,width,height);
  if(!fragments.length)return null;
  const mask=Buffer.from(alpha);
  for(const f of fragments)for(const p of f.members)mask[p]=0;
  const png=await encodeMaster(rgb,mask,{width,height,icc:meta.icc??null},sharp);
  return {png,record:{schema:'jwleria-stray-fragment-removal/1',
    rule:`In the source's own transparency, a detached area (8-connected) other than the product whose alpha reaches ${cutoutLimits.fragment_min_alpha} but never ${cutoutLimits.visible_alpha}, under ${cutoutLimits.component_min_fraction*100}% of the canvas, is a stray mark: only its alpha is set to 0. Every other pixel keeps the source's own values.`,
    limits:{...cutoutLimits},...(decoding?{decoding}:{}),source_alpha_sha256:digest(alpha),master_alpha_sha256:digest(mask),
    fragments:fragments.map(({members,...f})=>f),removed_pixels:fragments.reduce((s,f)=>s+f.pixels,0)}};
}

/**
 * Checks one supplied cutout master against its untouched original, both identified by sha256. The master must be an
 * 8-bit RGBA PNG with the original's upright geometry (no crop, resize or padding) and colour profile; its fully opaque
 * pixels must keep the original's stored values (rounding only); it must have real transparency, and no visible pixel may
 * touch the canvas edge. Edge pixels (partial alpha) are measured, not judged: their look is for the visual comparison.
 * The cutout always differs from the original in its alpha channel, so the record never calls it identical to the original.
 */
export async function validateCutoutMaster({original,cutout},sharp){
  const originalBytes=await heldFile(original,'Original'),cutoutBytes=await heldFile(cutout,'Cutout master');
  if(original.sha256===cutout.sha256)throw Error('A cutout master must be a separate file from its original');
  const failures=[],flags=[],options={failOn:'warning',limitInputPixels:60000000,ignoreIcc:true};
  const om=await sharp(originalBytes,options).metadata(),cm=await sharp(cutoutBytes,options).metadata();
  // The original's pixels as 8-bit sRGB: unchanged, or an untagged greyscale PNG read losslessly as R=G=B=grey.
  const standard=await standardChannels(originalBytes,sharp).catch(()=>null);
  if(!['jpeg','png','webp','avif','heif'].includes(om.format)||!standard||(om.pages??1)!==1)failures.push('original_unsupported');
  const orientation=om.orientation??1;
  const width=orientation>=5?om.height:om.width,height=orientation>=5?om.width:om.height;
  const rgba=cm.format==='png'&&cm.channels===4&&cm.hasAlpha===true&&cm.depth==='uchar'&&cm.space==='srgb'&&(cm.pages??1)===1;
  if(!rgba)failures.push('cutout_not_8bit_rgba_png');
  if((cm.orientation??1)!==1)failures.push('cutout_not_upright');
  if(cm.width!==width||cm.height!==height)failures.push('geometry_changed');
  // Stored values are compared with profiles ignored, so the profile itself must be the same. A master without a profile
  // is accepted only when the original's profile is sRGB, which a browser assumes for an untagged file; it is flagged.
  const originalIcc=om.icc?digest(om.icc):null,cutoutIcc=cm.icc?digest(cm.icc):null;
  if(originalIcc!==cutoutIcc){
    if(cutoutIcc===null&&/\bsrgb\b/i.test(iccDescription(om.icc)??''))flags.push('srgb_profile_not_carried');
    else failures.push('colour_profile_changed');
  }
  const record={schema:'jwleria-cutout-check/1',treatment:{...cutoutTreatment},limits:{...cutoutLimits},
    original:{sha256:original.sha256,bytes:originalBytes.length,format:om.format,width,height,orientation,icc_sha256:originalIcc,...(standard?.decoding?{decoding:standard.decoding}:{})},
    cutout:{sha256:cutout.sha256,bytes:cutoutBytes.length,format:cm.format,width:cm.width,height:cm.height,channels:cm.channels,icc_sha256:cutoutIcc,producer:typeof cutout.producer==='string'?cutout.producer:null},
    identical_to_original:false};
  if(rgba){
    const {data:c,info}=await sharp(cutoutBytes,options).raw().toBuffer({resolveWithObject:true});
    const n=info.width*info.height,alpha=new Uint8Array(n);
    let transparent=0,opaque=0,x0=info.width,y0=info.height,x1=-1,y1=-1,border=0;
    for(let p=0;p<n;p++){
      const a=c[p*4+3];alpha[p]=a;
      if(a===0)transparent++;else if(a===255)opaque++;
      if(a<cutoutLimits.visible_alpha)continue;
      const x=p%info.width,y=(p-x)/info.width;
      if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      if(x===0||y===0||x===info.width-1||y===info.height-1)border++;
    }
    record.alpha={transparent_fraction:share(transparent,n),opaque_fraction:share(opaque,n),partial_fraction:share(n-transparent-opaque,n)};
    if(record.alpha.transparent_fraction<cutoutLimits.min_transparent_fraction)failures.push('no_transparent_background');
    if(record.alpha.opaque_fraction<cutoutLimits.min_opaque_fraction)failures.push('no_opaque_product');
    record.framing=x1<0?{visible_box:null,border_visible_pixels:0}
      :{visible_box:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},border_visible_pixels:border,
        margins:{left:share(x0,info.width),right:share(info.width-1-x1,info.width),top:share(y0,info.height),bottom:share(info.height-1-y1,info.height)}};
    if(border)failures.push('product_touches_canvas_edge');
    const sizes=visibleComponents(alpha,info.width,info.height,cutoutLimits.visible_alpha);
    const significant=sizes.filter(size=>size>=cutoutLimits.component_min_fraction*n);
    record.components={significant:significant.length,largest_fraction:sizes.length?share(sizes[0],n):0};
    // Two pieces (a pair of earrings) can be right; a stray background island cannot. The visual comparison decides.
    if(significant.length>1)flags.push('multiple_visible_components');
    if(!failures.includes('geometry_changed')&&!failures.includes('original_unsupported')){
      const {data:o}=await sharp(standard.bytes,options).autoOrient().removeAlpha().raw().toBuffer({resolveWithObject:true});
      let changed=0,maxOpaque=0,partial=0,maxPartial=0,sumPartial=0;
      for(let p=0;p<n;p++){
        const a=alpha[p];if(a===0)continue;
        const d=Math.max(Math.abs(c[p*4]-o[p*3]),Math.abs(c[p*4+1]-o[p*3+1]),Math.abs(c[p*4+2]-o[p*3+2]));
        if(a===255){if(d){changed++;if(d>maxOpaque)maxOpaque=d;}}
        else{partial++;sumPartial+=d;if(d>maxPartial)maxPartial=d;}
      }
      record.product_pixels={opaque_pixels:opaque,changed_opaque_pixels:changed,opaque_max_channel_delta:maxOpaque,opaque_identical_to_original:changed===0};
      record.edge_pixels={partial_alpha_pixels:partial,max_channel_delta:maxPartial,mean_channel_delta:partial?Number((sumPartial/partial).toFixed(3)):0};
      if(maxOpaque>cutoutLimits.rgb_tolerance)failures.push('product_pixels_changed');
      // Product material made see-through inside the product is invisible to the opaque-pixel check above (those pixels
      // are no longer opaque), so the enclosed regions are judged against the original's own backdrop. Real holes are
      // recorded and flagged for the visual comparison; they are not failures. An original with its own transparency
      // has no photographed backdrop to judge by (its regions are undetermined); instead the master may lower its alpha
      // only where the source itself never shows a visible pixel, and may never add alpha the source does not have.
      const ownAlpha=(await sharp(standard.bytes,options).metadata()).hasAlpha===true;
      const enclosed=enclosedAlphaRegions({rgb:o,alpha,width:info.width,height:info.height,source_alpha:ownAlpha});
      record.enclosed_regions={...enclosed,regions:enclosed.regions.slice(0,50)};
      if(enclosed.product_material)failures.push('product_material_made_transparent');
      if(enclosed.background_holes||enclosed.undetermined)flags.push('enclosed_transparent_regions');
      if(ownAlpha){
        const source=await sharp(standard.bytes,options).autoOrient().extractChannel(3).raw().toBuffer();
        let lowered=0,loweredVisible=0,raised=0;
        for(let p=0;p<n;p++){if(alpha[p]<source[p]){lowered++;if(source[p]>=cutoutLimits.visible_alpha)loweredVisible++;}else if(alpha[p]>source[p])raised++;}
        record.source_alpha={lowered_pixels:lowered,lowered_visible_pixels:loweredVisible,raised_pixels:raised};
        if(loweredVisible)failures.push('source_alpha_lowered_on_visible_pixels');
        if(raised)failures.push('alpha_added_beyond_source');
      }
    }
  }
  record.passed=failures.length===0;
  record.failures=failures;
  record.review_flags=flags;
  record.visual_review_required=[...cutoutReviewChecks];
  record.statement=record.passed
    ?`Supplied cutout master ${cutout.sha256} passed the automated check against the untouched original ${original.sha256}: same geometry, real transparency and opaque pixels ${record.product_pixels.opaque_identical_to_original?'identical to the original':`within ${cutoutLimits.rgb_tolerance} per channel of the original (not identical)`}. Its alpha channel differs from the original by design. This is not an approval: an independent visual comparison is still required.`
    :`Supplied cutout master ${cutout.sha256} failed the automated check against the untouched original ${original.sha256}: ${failures.join(', ')}. It cannot be used.`;
  return record;
}

const pngChunk=(type,data)=>{
  const name=Buffer.from(type,'latin1'),size=Buffer.alloc(4),crc=Buffer.alloc(4);
  size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data]))>>>0);
  return Buffer.concat([size,name,data,crc]);
};
/** Adds the given ICC profile bytes, unchanged, as the PNG's iCCP chunk; refuses a PNG that already states a colour space. */
export function withIccProfileChunk(png,icc){
  const types=[];
  for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset);types.push(png.toString('latin1',offset+4,offset+8));offset+=12+size;}
  if(types[0]!=='IHDR'||types.some(type=>['iCCP','sRGB','gAMA','cHRM'].includes(type)))throw Error('Unexpected PNG colour chunks: '+types.join(','));
  return Buffer.concat([png.subarray(0,33),pngChunk('iCCP',Buffer.concat([Buffer.from('ICC profile','latin1'),Buffer.from([0,0]),deflateSync(icc)])),png.subarray(33)]);
}

/**
 * A cutout master made locally and without generation (decision 0016): the original's stored RGB values, unconverted, with
 * a foreground mask (one byte of alpha per pixel, from foreground-mask.swift) as alpha, and the original's own ICC
 * profile bytes. Nothing is retouched, cropped, resized or reconstructed; the master still has to pass
 * validateCutoutMaster and the independent visual comparison.
 */
export async function composeCutoutMaster({original,mask,width,height},sharp){
  const {data,icc}=await uprightRgb(original,{mask,width,height},sharp);
  return encodeMaster(data,mask,{width,height,icc},sharp);
}
/**
 * composeCutoutMaster after repairEnclosedProductMask: the same stored pixels of the original under the repaired mask.
 * Returns the master and the repair record (which says whether anything was restored, and exactly where).
 */
export async function repairedCutoutMaster({original,mask,width,height},sharp){
  const {data,icc}=await uprightRgb(original,{mask,width,height},sharp);
  const repair=repairEnclosedProductMask({rgb:data,mask,width,height});
  return {png:await encodeMaster(data,repair.mask,{width,height,icc},sharp),repair:repair.record};
}
async function uprightRgb(original,{mask,width,height},sharp){
  const meta=await sharp(original,{failOn:'warning'}).metadata();
  if((meta.orientation??1)!==1)throw Error('An original with an EXIF orientation needs its mask computed upright; refused');
  const {data,info}=await sharp(original,{failOn:'warning',ignoreIcc:true}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==width||info.height!==height||info.channels!==3||mask.length!==width*height)throw Error('The mask and the original differ in geometry');
  return {data,icc:meta.icc??null};
}
async function encodeMaster(data,mask,{width,height,icc},sharp){
  // A fully transparent pixel keeps no colour, so a viewer that ignores alpha cannot show the removed background.
  const rgba=Buffer.alloc(width*height*4);
  for(let p=0;p<width*height;p++)if(mask[p]){rgba[p*4]=data[p*3];rgba[p*4+1]=data[p*3+1];rgba[p*4+2]=data[p*3+2];rgba[p*4+3]=mask[p];}
  const png=await sharp(rgba,{raw:{width,height,channels:4}}).png({compressionLevel:9}).toBuffer();
  return icc?withIccProfileChunk(png,icc):png;
}

/** Review images of a master: flattened on the storefront frame colour, and on magenta to expose anything retained. */
export async function cutoutPreviews(master,prefix,sharp){
  const out={sand:prefix+'.preview-sand.jpg',magenta:prefix+'.preview-magenta.jpg'};
  await sharp(master).flatten({background:frameBackground}).jpeg({quality:90}).toFile(out.sand);
  await sharp(master).flatten({background:'#ff00ff'}).jpeg({quality:90}).toFile(out.magenta);
  return out;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,...args]=process.argv.slice(2);
  // The same locked engine as responsive-media.mjs (which imports this module, so it is not imported back here).
  const sharp=createRequire(createRequire(new URL('../../apps/storefront/package.json',import.meta.url)).resolve('astro'))('sharp');
  if(command==='validate'&&args.length===1){
    console.log(JSON.stringify(await validateCutoutMaster(JSON.parse(await readFile(args[0],'utf8')),sharp),null,2));
  }else if(command==='compose'&&args.length===3){
    // compose ORIGINAL MASK_PREFIX OUTPUT_PNG, where MASK_PREFIX.mask.raw and MASK_PREFIX.mask.json come from foreground-mask
    const {width,height}=JSON.parse(await readFile(args[1]+'.mask.json','utf8'));
    const png=await composeCutoutMaster({original:await readFile(args[0]),mask:await readFile(args[1]+'.mask.raw'),width,height},sharp);
    await writeFile(args[2],png,{flag:'wx',mode:0o600});
    console.log(JSON.stringify({path:args[2],sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length}));
  }else if(command==='compose-repaired'&&args.length===3){
    // As compose, after repairEnclosedProductMask; the repair record is written beside the master.
    const {width,height}=JSON.parse(await readFile(args[1]+'.mask.json','utf8'));
    const {png,repair}=await repairedCutoutMaster({original:await readFile(args[0]),mask:await readFile(args[1]+'.mask.raw'),width,height},sharp);
    await writeFile(args[2],png,{flag:'wx',mode:0o600});
    await writeFile(args[2]+'.mask-repair.json',JSON.stringify(repair,null,1),{flag:'wx',mode:0o600});
    console.log(JSON.stringify({path:args[2],sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,restored_regions:repair.restored_regions,restored_pixels:repair.restored_pixels}));
  }else if(command==='preview'&&args.length===2){
    console.log(JSON.stringify(await cutoutPreviews(await readFile(args[0]),args[1],sharp)));
  }else throw Error('Usage: node cutout.mjs validate PRIVATE_CUTOUT_INPUT.json | compose ORIGINAL MASK_PREFIX OUTPUT_PNG | compose-repaired ORIGINAL MASK_PREFIX OUTPUT_PNG | preview MASTER_PNG OUTPUT_PREFIX');
}
