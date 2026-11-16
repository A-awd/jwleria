import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {repairedCutoutMaster,validateCutoutMaster} from './cutout.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {installedImageEngine,privateOutputRoot} from './responsive-media.mjs';

// Scoped mask repair for one individually rejected cutout (decision 0015: background-only removal, original pixels only).
// It is opt-in and bounded: the batch pipeline never calls it, it adds nothing to validateCutoutMaster, and it changes
// the mask only inside the boxes that a reviewed private plan names, around the failure an independent reviewer found.
// Every changed alpha value is derived from the original's own stored pixels against its own photographed backdrop;
// nothing is generated, redrawn, retouched, recoloured or resized. The composed master then goes through the existing
// path unchanged (repairedCutoutMaster, validateCutoutMaster, normalizeFlatTile) and still needs its own visual review.

export const scopedRepairVersion=1;
/**
 * Implementation settings (decision 0010), not owner approvals. The photographed backdrop is a smooth surface: a
 * bivariate polynomial of backdrop_degree per channel, fitted robustly to the pixels the mask already removed that lie
 * at least backdrop_clearance px from any kept pixel. A pixel looks like that backdrop when every channel lies within
 * max(like_min, like_sigmas x the fit's noise) of the surface. Retained backdrop is cleared only as a solid area: the
 * backdrop-like pixels opened with open_radius, in parts of at least open_min_pixels; enclosed specks of at most
 * speck_max_pixels and speck_max_difference join it; kept pixels within band px of it get alpha from their own
 * difference to the backdrop, relative to the most product-like pixel within band_window px; a band fragment touching
 * no product pixel floats in the cleared area and is cleared too. A restored thin part keeps the stored mask only near
 * the product's solid body (the visible mask opened with body_radius, plus body_edge px of its soft edge); crop-mask
 * pixels within crop_margin px of a crop's own edge (unless that edge is the image's) are not used.
 */
export const scopedRepairLimits=Object.freeze({backdrop_clearance:24,backdrop_degree:3,backdrop_stride:3,backdrop_iterations:4,backdrop_max_sigma:2,backdrop_min_samples:1000,
  like_min:3,like_sigmas:6,open_radius:2,open_min_pixels:400,speck_max_pixels:25,speck_max_difference:16,band:4,band_window:3,
  body_radius:15,body_edge:10,crop_margin:16});
/**
 * clear_retained_backdrop: an opening the mask filled (clearRetainedBackdrop). restore_from_crop_masks: a thin part the
 * mask lost (a zip pull, a hanging chain), restored from the same local foreground-mask tool run on lossless crops of
 * the original, where its working resolution resolves the part (restoreFromCropMasks).
 */
export const scopedRepairOperations=Object.freeze(['clear_retained_backdrop','restore_from_crop_masks']);

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;

// Chamfer distance (1, sqrt 2) from every pixel to the nearest pixel where source is non-zero; Infinity-like without one.
function chamfer(source,width,height){
  const far=1e9,d=new Float32Array(width*height),diagonal=Math.SQRT2;
  for(let p=0;p<d.length;p++)d[p]=source[p]?0:far;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*width+x;let v=d[p];
    if(x>0)v=Math.min(v,d[p-1]+1);
    if(y>0){v=Math.min(v,d[p-width]+1);if(x>0)v=Math.min(v,d[p-width-1]+diagonal);if(x<width-1)v=Math.min(v,d[p-width+1]+diagonal);}
    d[p]=v;}
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const p=y*width+x;let v=d[p];
    if(x<width-1)v=Math.min(v,d[p+1]+1);
    if(y<height-1){v=Math.min(v,d[p+width]+1);if(x<width-1)v=Math.min(v,d[p+width+1]+diagonal);if(x>0)v=Math.min(v,d[p+width-1]+diagonal);}
    d[p]=v;}
  return d;
}

// Connected areas (4-neighbour) of non-zero pixels in a width x height array; each is a list of indices.
function areas(set,width,height){
  const seen=new Uint8Array(set.length),stack=new Int32Array(set.length),out=[];
  for(let start=0;start<set.length;start++){
    if(!set[start]||seen[start])continue;
    const members=[];let top=0;stack[top++]=start;seen[start]=1;
    while(top){const p=stack[--top],x=p%width;members.push(p);
      for(const q of [x>0?p-1:-1,x<width-1?p+1:-1,p>=width?p-width:-1,p+width<set.length?p+width:-1])if(q>=0&&set[q]&&!seen[q]){seen[q]=1;stack[top++]=q;}}
    out.push(members);
  }
  return out;
}

function solve(matrix){
  const n=matrix.length;
  for(let i=0;i<n;i++){
    let pivot=i;for(let r=i+1;r<n;r++)if(Math.abs(matrix[r][i])>Math.abs(matrix[pivot][i]))pivot=r;
    [matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];
    if(Math.abs(matrix[i][i])<1e-12)throw Error('The backdrop fit is singular');
    for(let r=0;r<n;r++){if(r===i)continue;const f=matrix[r][i]/matrix[i][i];for(let c=i;c<=n;c++)matrix[r][c]-=f*matrix[i][c];}
  }
  return matrix.map((row,i)=>row[n]/row[i]);
}
const terms=(u,v,degree)=>{const t=[];for(let i=0;i<=degree;i++)for(let j=0;j<=degree-i;j++)t.push(u**i*v**j);return t;};

/**
 * The original's photographed backdrop as a smooth surface fitted to the pixels the mask removed far from the product,
 * with its noise (1.4826 x the median absolute residual per channel) and, for every pixel, the largest channel
 * difference between the original and the surface. Refused when too few such pixels exist or the backdrop is not
 * smooth enough to judge (noise above backdrop_max_sigma): the repair needs a measurable backdrop.
 */
export function photographedBackdrop({rgb,mask,width,height},limits=scopedRepairLimits){
  const n=width*height;
  if(mask.length!==n||rgb.length!==n*3)throw Error('The mask and the original differ in geometry');
  const kept=new Uint8Array(n);for(let p=0;p<n;p++)kept[p]=mask[p]>0?1:0;
  const clearance=chamfer(kept,width,height),degree=limits.backdrop_degree;
  const sample=[];
  for(let y=0;y<height;y+=limits.backdrop_stride)for(let x=0;x<width;x+=limits.backdrop_stride){const p=y*width+x;if(clearance[p]>=limits.backdrop_clearance)sample.push(p);}
  if(sample.length<limits.backdrop_min_samples)throw Error('Too little removed backdrop to measure');
  const basis=sample.map(p=>{const x=p%width,y=(p-x)/width;return terms(2*x/(width-1)-1,2*y/(height-1)-1,degree);});
  const size=basis[0].length;
  let use=sample.map((_,i)=>i),coefficients=[],sigma=[];
  for(let round=0;round<limits.backdrop_iterations;round++){
    coefficients=[0,1,2].map(k=>{
      const m=Array.from({length:size},()=>new Array(size+1).fill(0));
      for(const i of use){const t=basis[i],v=rgb[sample[i]*3+k];for(let a=0;a<size;a++){m[a][size]+=t[a]*v;for(let b=0;b<size;b++)m[a][b]+=t[a]*t[b];}}
      return solve(m);
    });
    const residual=sample.map((p,i)=>[0,1,2].map(k=>{let v=0;for(let a=0;a<size;a++)v+=coefficients[k][a]*basis[i][a];return rgb[p*3+k]-v;}));
    sigma=[0,1,2].map(k=>{const r=use.map(i=>Math.abs(residual[i][k])).sort((a,b)=>a-b);return 1.4826*r[r.length>>1];});
    use=sample.map((_,i)=>i).filter(i=>[0,1,2].every(k=>Math.abs(residual[i][k])<=Math.max(4*sigma[k],2)));
  }
  if(use.length<limits.backdrop_min_samples)throw Error('Too little consistent backdrop to measure');
  if(Math.max(...sigma)>limits.backdrop_max_sigma)throw Error('The photographed backdrop is not smooth enough to judge');
  const difference=new Float32Array(n);
  for(let y=0;y<height;y++){const v=2*y/(height-1)-1;for(let x=0;x<width;x++){const t=terms(2*x/(width-1)-1,v,degree),p=y*width+x;let most=0;
    for(let k=0;k<3;k++){let m=0;for(let a=0;a<size;a++)m+=coefficients[k][a]*t[a];const d=Math.abs(rgb[p*3+k]-m);if(d>most)most=d;}
    difference[p]=most;}}
  const like=Math.max(limits.like_min,limits.like_sigmas*Math.max(...sigma));
  return {degree,coefficients,sigma,samples:sample.length,kept:use.length,like,difference};
}

const boxOf=(box,width,height)=>{
  const {x,y,width:w,height:h}=box??{};
  if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>width||y+h>height)throw Error('Every box must lie inside the image');
  return {x,y,width:w,height:h};
};

/**
 * Retained backdrop (an opening the mask filled, such as the space inside a handle): inside the box, the kept pixels
 * that look like the photographed backdrop, as a solid area (opened, large enough, with enclosed noise specks joined),
 * become fully transparent. Kept pixels within band px of that area get alpha from their own difference to the
 * backdrop, relative to the most product-like other pixel near them, and never more than the mask had; a pixel with no
 * product-like neighbour is a backdrop speck and becomes transparent. Nothing outside the box changes.
 */
export function clearRetainedBackdrop({mask,width,height},out,box,backdrop,limits=scopedRepairLimits){
  const b=boxOf(box,width,height),w=b.width,h=b.height,local=w*h,at=i=>(b.y+Math.floor(i/w))*width+b.x+i%w;
  const like=new Uint8Array(local),notLike=new Uint8Array(local);
  for(let i=0;i<local;i++){const p=at(i);if(mask[p]>0&&backdrop.difference[p]<=backdrop.like)like[i]=1;else notLike[i]=1;}
  const toNotLike=chamfer(notLike,w,h),eroded=new Uint8Array(local);
  for(let i=0;i<local;i++)if(like[i]&&toNotLike[i]>limits.open_radius)eroded[i]=1;
  const toEroded=chamfer(eroded,w,h),opened=new Uint8Array(local);
  for(let i=0;i<local;i++)if(like[i]&&toEroded[i]<=limits.open_radius)opened[i]=1;
  const core=new Uint8Array(local);let parts=0;
  for(const part of areas(opened,w,h))if(part.length>=limits.open_min_pixels){parts++;for(const i of part)core[i]=1;}
  // Enclosed specks: small areas cut off from the box edge by the cleared area, no more different than JPEG noise.
  let specks=0,speckPixels=0;
  const rest=new Uint8Array(local);for(let i=0;i<local;i++)rest[i]=core[i]?0:1;
  for(const part of areas(rest,w,h)){
    if(part.length>limits.speck_max_pixels)continue;
    if(part.some(i=>{const x=i%w,y=(i-x)/w;return x===0||y===0||x===w-1||y===h-1;}))continue;
    if(part.some(i=>backdrop.difference[at(i)]>limits.speck_max_difference))continue;
    specks++;speckPixels+=part.length;for(const i of part)core[i]=1;
  }
  // Opt-in (a plan's hole_tolerance): a small hole through the product (a slot in a handle's leather loop) shows the
  // backdrop with JPEG ringing from the dark edges around it. It joins the cleared area when it is enclosed by that area
  // or by kept pixels unlike the backdrop (never by the removed exterior or the box edge), every pixel lies within the
  // tolerance and the median within half of it, and its size is within hole_min_pixels..hole_max_pixels.
  const holes=[];
  if(limits.hole_tolerance!==undefined){
    const t=limits.hole_tolerance,candidate=new Uint8Array(local),outsideCandidate=new Uint8Array(local);
    for(let i=0;i<local;i++){const p=at(i);if(!core[i]&&mask[p]>0&&backdrop.difference[p]<=t)candidate[i]=1;else outsideCandidate[i]=1;}
    // A hole is solid (it holds a point hole_min_thickness px from its own edge); a thin sliver along an edge is not one.
    const depth=chamfer(outsideCandidate,w,h);
    for(const part of areas(candidate,w,h)){
      if(part.length<limits.hole_min_pixels||part.length>limits.hole_max_pixels)continue;
      if(Math.max(...part.map(i=>depth[i]))<limits.hole_min_thickness)continue;
      const member=new Set(part);let enclosed=true;
      for(const i of part){const x=i%w,y=(i-x)/w;
        if(x===0||y===0||x===w-1||y===h-1){enclosed=false;break;}
        for(const j of [i-1,i+1,i-w,i+w])if(!member.has(j)&&!core[j]&&mask[at(j)]===0){enclosed=false;break;}
        if(!enclosed)break;}
      if(!enclosed)continue;
      const values=part.map(i=>backdrop.difference[at(i)]).sort((a,b)=>a-b);
      if(values[values.length>>1]>t/2)continue;
      for(const i of part)core[i]=1;
      let x0=w,y0=h,x1=-1,y1=-1;for(const i of part){const x=i%w,y=(i-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      holes.push({box:{x:b.x+x0,y:b.y+y0,width:x1-x0+1,height:y1-y0+1},pixels:part.length,median_difference:Number(values[values.length>>1].toFixed(2))});
    }
  }
  const toCore=chamfer(core,w,h),r=limits.band_window;
  let cleared=0,banded=0,lowered=0;
  for(let i=0;i<local;i++){
    const p=at(i);
    if(core[i]){if(mask[p]>0)cleared++;out[p]=0;continue;}
    if(mask[p]===0||toCore[i]>limits.band)continue;
    banded++;
    const own=backdrop.difference[p];let alpha=0;
    if(own>backdrop.like){
      // The edge pixel's own material: by default the most product-like neighbour; with band_reference 'median' (opt-in,
      // for a light material beside dark strands) the median of the product-like neighbours, so a pale edge is judged
      // against the pale material it belongs to rather than the darkest strand nearby.
      const x=i%w,y=(i-x)/w;let most=0;const near=[];
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;
        if(core[j])continue;const v=backdrop.difference[at(j)];if(v>most)most=v;if(v>backdrop.like)near.push(v);}
      if(limits.band_reference==='median'&&near.length){near.sort((a,c)=>a-c);most=near[near.length>>1];}
      if(most>backdrop.like)alpha=Math.min(mask[p],Math.round(255*Math.min(1,(own-backdrop.like)/(Math.max(most,own)-backdrop.like))));
    }
    if(alpha<mask[p])lowered++;
    out[p]=alpha;
  }
  // A band fragment that touches no product pixel (a kept pixel beyond the band) floats in the cleared area: it is
  // backdrop noise next to the opening's edge, not product, and becomes transparent.
  const shown=new Uint8Array(local),product=new Uint8Array(local);
  for(let i=0;i<local;i++){const p=at(i);if(!core[i]&&out[p]>0){shown[i]=1;if(toCore[i]>limits.band)product[i]=1;}}
  let floating=0;
  const seen=new Uint8Array(local),stack=new Int32Array(local);
  for(let start=0;start<local;start++){
    if(!shown[start]||seen[start])continue;
    const members=[];let top=0,touches=false;stack[top++]=start;seen[start]=1;
    while(top){const i=stack[--top],x=i%w,y=(i-x)/w;members.push(i);if(product[i])touches=true;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if((!dx&&!dy)||xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;if(shown[j]&&!seen[j]){seen[j]=1;stack[top++]=j;}}}
    // A fragment that reaches the box edge may continue outside it; it is left as it is.
    if(touches||members.some(i=>{const x=i%w,y=(i-x)/w;return x===0||y===0||x===w-1||y===h-1;}))continue;
    for(const i of members){out[at(i)]=0;floating++;}
  }
  return {kind:'clear_retained_backdrop',box:b,cleared_area_parts:parts,cleared_pixels:cleared,joined_specks:specks,joined_speck_pixels:speckPixels,band_pixels:banded,band_lowered_pixels:lowered,floating_band_pixels_cleared:floating,
    ...(limits.hole_tolerance!==undefined?{hole_tolerance:limits.hole_tolerance,enclosed_backdrop_holes:holes}:{}),...(limits.band_reference?{band_reference:limits.band_reference}:{})};
}

/**
 * A lost thin part (a zip pull, a hanging chain): the same local foreground-mask tool, run on lossless crops of the
 * original (crops: [{x, y, width, height, mask}], one byte of alpha per crop pixel), resolves what its whole-image run
 * blurred away. Inside the box, the stored mask is kept near the product's solid body; the coarse stored mask of the
 * thin part beyond it is replaced; each pixel then takes the larger of that and the crops' alpha. No colour is judged
 * here and nothing outside the box changes.
 */
export function restoreFromCropMasks({mask,width,height},out,box,crops,limits=scopedRepairLimits){
  const b=boxOf(box,width,height);
  if(!Array.isArray(crops)||!crops.length)throw Error('A crop restoration needs at least one crop mask');
  const usable=crops.map(c=>{const r=boxOf(c,width,height);if(!Buffer.isBuffer(c.mask)||c.mask.length!==r.width*r.height)throw Error('A crop mask must match its crop');return {...r,mask:c.mask};});
  // The solid body: the visible mask opened with body_radius (eroded, then grown back inside the visible mask).
  const hidden=new Uint8Array(width*height);for(let p=0;p<hidden.length;p++)hidden[p]=mask[p]>=128?0:1;
  const toHidden=chamfer(hidden,width,height),core=new Uint8Array(width*height);
  for(let p=0;p<core.length;p++)if(!hidden[p]&&toHidden[p]>limits.body_radius)core[p]=1;
  const toCore=chamfer(core,width,height),body=new Uint8Array(width*height);
  for(let p=0;p<body.length;p++)if(!hidden[p]&&toCore[p]<=limits.body_radius)body[p]=1;
  const toBody=chamfer(body,width,height),m=limits.crop_margin;
  // With protect_body, a crop that itself outlines the solid body (marks most of the body pixels inside it visible) has
  // its own edge for the body; it is used only beyond the body's soft edge, so it can never draw a second, parallel edge.
  if(limits.protect_body)for(const c of usable){
    let inBody=0,marked=0;
    for(let y=c.y+m;y<c.y+c.height-m;y++)for(let x=c.x+m;x<c.x+c.width-m;x++){const p=y*width+x;if(!body[p])continue;inBody++;if(c.mask[(y-c.y)*c.width+x-c.x]>=128)marked++;}
    c.outlines_body=inBody>0&&marked/inBody>=0.5;
  }
  let raised=0,lowered=0,replaced=0;
  for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++){
    const p=y*width+x,kept=toBody[p]<=limits.body_edge?mask[p]:0;
    if(kept<mask[p])replaced++;
    let crop=0;
    for(const c of usable){
      if(x<c.x||y<c.y||x>=c.x+c.width||y>=c.y+c.height)continue;
      const inside=(x-c.x>=m||c.x===0)&&(c.x+c.width-1-x>=m||c.x+c.width===width)&&(y-c.y>=m||c.y===0)&&(c.y+c.height-1-y>=m||c.y+c.height===height);
      if(inside&&!(c.outlines_body&&toBody[p]<=limits.body_edge))crop=Math.max(crop,c.mask[(y-c.y)*c.width+x-c.x]);
    }
    let v=Math.max(kept,crop);
    // Opt-in (a plan's protect_body): near the solid body, a pixel the stored mask already shows (alpha of at least 128)
    // keeps it, so a crop that also outlines the body never moves the body's own edge; only the thin part is restored.
    if(limits.protect_body&&toBody[p]<=limits.body_edge&&mask[p]>=128)v=mask[p];
    // Opt-in (a plan's feather): within feather px of a box side that is not the image's edge, the result blends back
    // to the stored mask, so an edge the crops redraw (a bag's base) meets the stored edge outside the box without a step.
    if(limits.feather){
      const side=Math.min(x-b.x+(b.x===0?Infinity:0),b.x+b.width-1-x+(b.x+b.width===width?Infinity:0),y-b.y+(b.y===0?Infinity:0),b.y+b.height-1-y+(b.y+b.height===height?Infinity:0));
      const weight=Math.min(1,side/limits.feather);
      v=Math.round(mask[p]+weight*(v-mask[p]));
    }
    if(v>mask[p])raised++;else if(v<mask[p])lowered++;
    out[p]=v;
  }
  return {kind:'restore_from_crop_masks',box:b,crops:usable.map(c=>({x:c.x,y:c.y,width:c.width,height:c.height,mask_sha256:digest(c.mask),...(limits.protect_body?{outlines_body:c.outlines_body}:{})})),
    stored_thin_part_pixels_replaced:replaced,raised_pixels:raised,lowered_pixels:lowered,...(limits.feather?{feather:limits.feather}:{}),...(limits.protect_body?{protect_body:true}:{})};
}

/**
 * Applies a reviewed plan's operations, each inside its own box (boxes may not overlap), to a copy of the mask, and
 * proves that no pixel outside the boxes changed. Returns the repaired mask and its record. Options an operation may
 * name (each opt-in, recorded on its result; the defaults never change): for an opening, open_min_pixels (at least 25),
 * hole_tolerance (4..16: enclosed slots showing the backdrop, 40..2000 px and at least 2.5 px deep) and band_reference
 * 'median' (a light material beside dark strands); for a crop restoration, protect_body (the body's own edge is never
 * moved) and feather (1..64 px blend back to the stored mask at the box sides).
 */
export function applyScopedRepair({rgb,mask,width,height},operations,limits=scopedRepairLimits){
  if(!Array.isArray(operations)||!operations.length)throw Error('A scoped repair needs at least one operation');
  const boxes=operations.map(o=>{if(!scopedRepairOperations.includes(o?.kind))throw Error('Unknown scoped repair operation: '+o?.kind);return boxOf(o.box,width,height);});
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],c=boxes[j];
    if(a.x<c.x+c.width&&c.x<a.x+a.width&&a.y<c.y+c.height&&c.y<a.y+a.height)throw Error('Scoped repair boxes may not overlap');}
  const backdrop=photographedBackdrop({rgb,mask,width,height},limits);
  const out=Buffer.from(mask),results=[];
  for(const operation of operations){
    // A plan may name a smaller solid area for one opening (a small slot in the product that shows the backdrop).
    let own=limits;
    if(operation.open_min_pixels!==undefined){
      if(operation.kind!=='clear_retained_backdrop'||!Number.isInteger(operation.open_min_pixels)||operation.open_min_pixels<25)throw Error('open_min_pixels is a whole number of at least 25, for an opening');
      own={...own,open_min_pixels:operation.open_min_pixels};
    }
    // Enclosed backdrop holes are judged only when a plan asks for them, with the tolerance it names (at most 16).
    if(operation.hole_tolerance!==undefined){
      if(operation.kind!=='clear_retained_backdrop'||!Number.isInteger(operation.hole_tolerance)||operation.hole_tolerance<4||operation.hole_tolerance>16)throw Error('hole_tolerance is a whole number from 4 to 16, for an opening');
      own={...own,hole_tolerance:operation.hole_tolerance,hole_min_pixels:40,hole_max_pixels:2000,hole_min_thickness:2.5};
    }
    if(operation.protect_body!==undefined){
      if(operation.kind!=='restore_from_crop_masks'||operation.protect_body!==true)throw Error('protect_body may only be true, for a crop restoration');
      own={...own,protect_body:true};
    }
    if(operation.feather!==undefined){
      if(operation.kind!=='restore_from_crop_masks'||!Number.isInteger(operation.feather)||operation.feather<1||operation.feather>64)throw Error('feather is a whole number of px from 1 to 64, for a crop restoration');
      own={...own,feather:operation.feather};
    }
    if(operation.band_reference!==undefined){
      if(operation.kind!=='clear_retained_backdrop'||operation.band_reference!=='median')throw Error('band_reference may only be median, for an opening');
      own={...own,band_reference:'median'};
    }
    const result=operation.kind==='clear_retained_backdrop'
      ?clearRetainedBackdrop({mask,width,height},out,operation.box,backdrop,own)
      :restoreFromCropMasks({mask,width,height},out,operation.box,operation.crop_masks,own);
    results.push(own.open_min_pixels===limits.open_min_pixels?result:{...result,open_min_pixels:own.open_min_pixels});
  }
  const inside=new Uint8Array(width*height);
  for(const b of boxes)for(let y=b.y;y<b.y+b.height;y++)inside.fill(1,y*width+b.x,y*width+b.x+b.width);
  let changed=0;
  for(let p=0;p<out.length;p++){if(out[p]===mask[p])continue;if(!inside[p])throw Error('A scoped repair changed a pixel outside its boxes');changed++;}
  return {mask:out,record:{schema:'jwleria-scoped-mask-repair/1',version:scopedRepairVersion,limits:{...limits},
    backdrop:{degree:backdrop.degree,coefficients:backdrop.coefficients,sigma:backdrop.sigma,samples:backdrop.samples,kept:backdrop.kept,like:backdrop.like},
    operations:results,mask_sha256:digest(mask),repaired_mask_sha256:digest(out),changed_pixels:changed,outside_boxes_unchanged:true}};
}

// ---- Private run: one reviewed plan -> new immutable files and review proofs, outside the repository ----

async function heldFile(file,label){
  if(!file||!isAbsolute(file.path??'')||!hashPattern.test(file.sha256??''))throw Error(`${label} needs an absolute path and its recorded sha256`);
  const stat=await lstat(file.path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1)throw Error(`${label} must be a regular file`);
  const bytes=await readFile(file.path);
  if(digest(bytes)!==file.sha256)throw Error(`${label} differs from its recorded sha256`);
  return bytes;
}
const once=(path,bytes)=>writeFile(path,bytes,{flag:'wx',mode:0o600});
const label=(text,width,height=34)=>Buffer.from(`<svg width="${width}" height="${height}"><text x="6" y="23" font-family="Helvetica" font-size="15">${String(text).replace(/[<&>]/g,'')}</text></svg>`);

/** The master's straight RGBA composited on a checkerboard (squares of `square` px), as packed RGB. */
function onChecker(rgba,width,height,square){
  const out=Buffer.alloc(width*height*3);
  for(let p=0;p<width*height;p++){const x=p%width,y=(p-x)/width,bg=((Math.floor(x/square)+Math.floor(y/square))&1)?204:255,a=rgba[p*4+3]/255;
    for(let k=0;k<3;k++)out[p*3+k]=Math.round(rgba[p*4+k]*a+bg*(1-a));}
  return out;
}
function region(source,channels,width,box){
  const out=Buffer.alloc(box.width*box.height*channels);
  for(let y=0;y<box.height;y++)source.copy(out,y*box.width*channels,((box.y+y)*width+box.x)*channels,((box.y+y)*width+box.x+box.width)*channels);
  return out;
}

/**
 * Runs one private plan: {ref, out, original:{path,sha256}, mask:{path,sha256} (the stored .mask.raw beside its
 * .mask.json), rejected:{cutout:{path,sha256}, tile:{path,sha256}}, operations:[{kind, box}], closeups:[{x,y,width,
 * height,zoom}]}. Every input must still match its recorded sha256. Writes new files only (never overwrites), each named
 * by its own sha256, plus the record and proofs; the rejected files, the original and the stored mask are only read.
 */
export async function runScopedRepair(plan,sharp=installedImageEngine()){
  if(typeof plan?.ref!=='string'||!plan.ref.trim())throw Error('A plan names its reference');
  const original=await heldFile(plan.original,'Original'),oldMask=await heldFile(plan.mask,'Stored mask');
  const rejectedCutout=await heldFile(plan.rejected?.cutout,'Rejected cutout'),rejectedTile=await heldFile(plan.rejected?.tile,'Rejected tile');
  if(!plan.mask.path.endsWith('.mask.raw'))throw Error('The stored mask is a .mask.raw file');
  const {width,height}=JSON.parse(await readFile(plan.mask.path.replace(/\.raw$/,'.json'),'utf8'));
  const meta=await sharp(original,{failOn:'warning'}).metadata();
  if((meta.orientation??1)!==1)throw Error('An original with an EXIF orientation is refused here');
  const {data:rgb,info}=await sharp(original,{failOn:'warning',ignoreIcc:true}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==width||info.height!==height||oldMask.length!==width*height)throw Error('The mask and the original differ in geometry');

  const root=await privateOutputRoot(plan.out);
  for(const d of ['','masks','cutouts','checks','tiles','proof','evidence'])await mkdir(join(root,d),{recursive:true,mode:0o700});
  const code=await readFile(fileURLToPath(import.meta.url)),codeSha=digest(code);
  await once(join(root,'evidence',`scoped-mask-repair.${codeSha}.mjs`),code);
  // A thin-part restoration runs the local mask tool (foreground-mask.swift, built privately; its bytes must match the
  // plan) on lossless PNG crops of the original, kept with their masks as evidence.
  const cropEvidence=[];
  const operations=[];
  for(const operation of plan.operations??[]){
    if(operation?.kind!=='restore_from_crop_masks'){operations.push(operation);continue;}
    const tool=await heldFile(plan.mask_tool,'Mask tool');
    const crop_masks=[];
    for(const c of operation.crops??[]){
      const r=boxOf(c,width,height),name=`crop-${r.x}-${r.y}-${r.width}x${r.height}`,png=join(root,'evidence',name+'.png'),prefix=join(root,'evidence',name);
      const bytes=await sharp(original,{failOn:'warning'}).extract({left:r.x,top:r.y,width:r.width,height:r.height}).png({compressionLevel:9}).toBuffer();
      const {data:check}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
      if(!check.equals(region(rgb,3,width,r)))throw Error('A crop must keep the original\'s stored pixels exactly');
      await once(png,bytes);
      await promisify(execFile)(plan.mask_tool.path,[png,prefix],{timeout:120000});
      const mask=await readFile(prefix+'.mask.raw'),size=JSON.parse(await readFile(prefix+'.mask.json','utf8'));
      if(size.width!==r.width||size.height!==r.height||mask.length!==r.width*r.height)throw Error('The crop mask differs from its crop');
      crop_masks.push({...r,mask});
      cropEvidence.push({crop:r,png:{path:png,sha256:digest(bytes)},mask:{path:prefix+'.mask.raw',sha256:digest(mask)},tool_sha256:digest(tool)});
    }
    operations.push({...operation,crop_masks});
  }
  const repair=applyScopedRepair({rgb,mask:oldMask,width,height},operations);
  const maskSha=repair.record.repaired_mask_sha256,maskPath=join(root,'masks',maskSha+'.mask.raw');
  await once(maskPath,repair.mask);
  await once(maskPath.replace(/\.raw$/,'.json'),JSON.stringify({width,height,derived_from_mask_sha256:digest(oldMask)}));

  // The existing path, unchanged: compose from the original's stored pixels (with its own enclosed-region repair),
  // the automated cutout check, then the flat tile.
  const {png,repair:enclosed}=await repairedCutoutMaster({original,mask:repair.mask,width,height},sharp);
  const cutoutSha=digest(png),cutoutPath=join(root,'cutouts',cutoutSha+'.png');
  const producer='foreground-mask (macOS Vision, local) with scoped repair of the reviewed failure (local, deterministic, original pixels only)'+(enclosed.changed?' and enclosed-region mask repair':'');
  await once(cutoutPath,png);
  if(enclosed.changed)await once(join(root,'cutouts',cutoutSha+'.mask-repair.json'),JSON.stringify(enclosed,null,1));
  const check=await validateCutoutMaster({original:{path:plan.original.path,sha256:plan.original.sha256},cutout:{path:cutoutPath,sha256:cutoutSha,producer}},sharp);
  await once(join(root,'checks',cutoutSha+'.cutout-check.json'),JSON.stringify(check,null,1));
  if(!check.passed)throw Error('The repaired master failed its check: '+check.failures.join(','));
  const tile=await normalizeFlatTile(png,sharp),tilePath=join(root,'tiles',tile.record.tile_sha256+'.png');
  await once(tilePath,tile.png);
  await once(join(root,'tiles',tile.record.tile_sha256+'.tile.json'),JSON.stringify(tile.record,null,1));
  if([cutoutSha,tile.record.tile_sha256].some(h=>h===plan.rejected.cutout.sha256||h===plan.rejected.tile.sha256))throw Error('The repair reproduced a rejected file');

  // Regression evidence per operation: visible pixels over the backdrop-like area before and after, inside its box.
  const {data:oldRgba}=await sharp(rejectedCutout).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {data:newRgba}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const backdrop=photographedBackdrop({rgb,mask:oldMask,width,height});
  // Clearly photographed (not backdrop): differing from the backdrop surface by at least 20 levels in some channel.
  const regression=repair.record.operations.map(o=>{let likeOld=0,likeNew=0,visibleOld=0,visibleNew=0,clearOld=0,clearNew=0,clearAll=0;
    for(let y=o.box.y;y<o.box.y+o.box.height;y++)for(let x=o.box.x;x<o.box.x+o.box.width;x++){const p=y*width+x,a0=oldRgba[p*4+3]>=128,a1=newRgba[p*4+3]>=128;
      if(a0)visibleOld++;if(a1)visibleNew++;
      if(backdrop.difference[p]<=backdrop.like){if(a0)likeOld++;if(a1)likeNew++;}
      if(backdrop.difference[p]>=20){clearAll++;if(a0)clearOld++;if(a1)clearNew++;}}
    return {kind:o.kind,box:o.box,visible_backdrop_like_pixels:{rejected:likeOld,repaired:likeNew},
      visible_pixels_differing_from_backdrop_by_20_or_more:{all:clearAll,rejected:clearOld,repaired:clearNew},visible_pixels:{rejected:visibleOld,repaired:visibleNew}};});

  // Proofs. Full view: original | new master on checker | new alpha | new flat tile, each fitted to its cell.
  const proofs=[],cellW=600,cellH=Math.round(cellW*height/width),cap=34;
  const fit=async(input,raw)=>sharp(input,raw?{raw}:{}).resize(cellW,cellH,{fit:'contain',background:'#ffffff'}).png().toBuffer();
  const newAlpha=Buffer.alloc(width*height);for(let p=0;p<width*height;p++)newAlpha[p]=newRgba[p*4+3];
  const oldAlpha=Buffer.alloc(width*height);for(let p=0;p<width*height;p++)oldAlpha[p]=oldRgba[p*4+3];
  const checkerNative=onChecker(newRgba,width,height,12);
  const cells=[[`original ${plan.original.sha256.slice(0,12)}`,await fit(original)],[`NEW master on checker ${cutoutSha.slice(0,12)}`,await fit(checkerNative,{width,height,channels:3})],
    ['NEW master alpha (white = opaque)',await fit(newAlpha,{width,height,channels:1})],[`NEW flat tile ${tile.record.tile_sha256.slice(0,12)} (${tile.record.geometry.side}px)`,await fit(tile.png)]];
  const layers=[];for(const [i,[caption,img]] of cells.entries())layers.push({input:img,left:i*(cellW+8),top:0},{input:label(caption,cellW),left:i*(cellW+8),top:cellH});
  const overview=await sharp({create:{width:4*(cellW+8),height:cellH+cap,channels:3,background:'#ffffff'}}).composite(layers).png().toBuffer();
  // A later version of one case is named by its version, and may show the earlier candidate it replaces.
  const name=plan.version?`${plan.ref}-${plan.version}`:plan.ref;
  const previous=plan.previous?await heldFile(plan.previous.cutout,'Previous candidate'):null;
  const write=async(file,bytes,what)=>{const path=join(root,'proof',file);await once(path,bytes);proofs.push({file,path,sha256:digest(bytes),shows:what});};
  await write(`${name}-overview.png`,overview,'original | new master on checker | new master alpha | new flat tile (fitted)');
  await write(`${name}-new-master-on-checker-native.png`,await sharp(checkerNative,{raw:{width,height,channels:3}}).png().toBuffer(),'new master on a 12 px checkerboard, native 1:1');
  await write(`${name}-new-alpha-native.png`,await sharp(newAlpha,{raw:{width,height,channels:1}}).png().toBuffer(),'new master alpha, native 1:1 (white = opaque)');
  // Native details: each repaired box (padded) and each requested close-up, original | REJECTED | NEW, nearest-neighbour.
  const details=[...repair.record.operations.map(o=>({x:Math.max(0,o.box.x-12),y:Math.max(0,o.box.y-12),width:Math.min(width,o.box.x+o.box.width+12)-Math.max(0,o.box.x-12),height:Math.min(height,o.box.y+o.box.height+12)-Math.max(0,o.box.y-12),zoom:1,why:o.kind})),
    ...(plan.closeups??[]).map(c=>({...boxOf(c,width,height),zoom:c.zoom,why:'close-up'}))];
  const oldChecker=onChecker(oldRgba,width,height,6),newChecker=onChecker(newRgba,width,height,6);
  let previousRgba=null;
  if(previous){previousRgba=(await sharp(previous).ensureAlpha().raw().toBuffer({resolveWithObject:true})).data;}
  const previousChecker=previousRgba?onChecker(previousRgba,width,height,6):null;
  const previousAlpha=previousRgba?Buffer.from(Array.from({length:width*height},(_,p)=>previousRgba[p*4+3])):null;
  for(const [i,d] of details.entries()){
    const z=Number.isInteger(d.zoom)&&d.zoom>=1&&d.zoom<=8?d.zoom:1,W=d.width*z,H=d.height*z;
    const panel=async(buf,ch)=>sharp(region(buf,ch,width,d),{raw:{width:d.width,height:d.height,channels:ch}}).resize(W,H,{kernel:'nearest'}).png().toBuffer();
    const row=[['original',await panel(rgb,3)],[`REJECTED ${plan.rejected.cutout.sha256.slice(0,10)} on checker`,await panel(oldChecker,3)],['REJECTED alpha',await panel(oldAlpha,1)],
      ...(previous?[[`PREVIOUS ${plan.previous.label??''} ${plan.previous.cutout.sha256.slice(0,10)} on checker`,await panel(previousChecker,3)],[`PREVIOUS ${plan.previous.label??''} alpha`,await panel(previousAlpha,1)]]:[]),
      [`NEW ${cutoutSha.slice(0,10)} on checker`,await panel(newChecker,3)],['NEW alpha',await panel(newAlpha,1)]];
    // A wide detail (a whole base) stacks its panels; others sit side by side.
    const stacked=W>1400,lw=Math.max(W,220),ls=[];
    for(const [j,[caption,img]] of row.entries()){
      if(stacked)ls.push({input:label(caption,lw),left:0,top:j*(H+cap)},{input:img,left:0,top:j*(H+cap)+cap});
      else ls.push({input:img,left:j*(lw+8),top:0},{input:label(caption,lw),left:j*(lw+8),top:H});
    }
    const sheet=await sharp({create:{width:stacked?lw:row.length*(lw+8),height:stacked?row.length*(H+cap):H+cap,channels:3,background:'#ffffff'}}).composite(ls).png().toBuffer();
    const shows=row.map(([caption])=>caption.replace(/ [0-9a-f]{10}/,'').trim()).join(' | ');
    await write(`${name}-detail-${i+1}-${d.why}-${d.x}-${d.y}-${d.width}x${d.height}-x${z}.png`,sheet,`native detail (${d.why}) at x${z}${stacked?', stacked':''}: ${shows}; box ${d.x},${d.y} ${d.width}x${d.height}`);
  }
  const record={schema:'jwleria-scoped-repair-run/1',ref:plan.ref,version:plan.version??null,status:'prepared; awaiting independent visual review (not accepted)',
    ...(plan.previous?{replaces:{label:plan.previous.label??null,cutout_sha256:plan.previous.cutout.sha256,tile_sha256:plan.previous.tile_sha256??null,why:plan.previous.why??null}}:{}),
    code:{module:'scripts/catalog-intake/scoped-mask-repair.mjs',sha256:codeSha,version:scopedRepairVersion},engine:{node:process.version,sharp:sharp.versions?.sharp??null,vips:sharp.versions?.vips??null},
    inputs:{original:plan.original,stored_mask:plan.mask,rejected:plan.rejected,...(cropEvidence.length?{mask_tool:plan.mask_tool,crop_evidence:cropEvidence}:{})},
    outputs:{mask:{path:maskPath,sha256:maskSha},cutout:{path:cutoutPath,sha256:cutoutSha,producer,enclosed_region_repair_changed:enclosed.changed},
      tile:{path:tilePath,sha256:tile.record.tile_sha256,side:tile.record.geometry.side,changed_opaque_product_pixels:tile.record.changed_opaque_product_pixels}},
    check:{passed:check.passed,failures:check.failures,review_flags:check.review_flags,opaque_identical_to_original:check.product_pixels?.opaque_identical_to_original??null,
      changed_opaque_pixels:check.product_pixels?.changed_opaque_pixels??null,enclosed_regions:{background_holes:check.enclosed_regions?.background_holes,product_material:check.enclosed_regions?.product_material}},
    repair:repair.record,regression,proofs,visual_review_required:'Codex: original, new master on checker, alpha, flat tile and native details; no derivative, binding or publication follows from this record.'};
  const recordPath=join(root,`${name}.scoped-repair.json`);
  await once(recordPath,JSON.stringify(record,null,1));
  return {record:recordPath,cutout_sha256:cutoutSha,tile_sha256:tile.record.tile_sha256,mask_sha256:maskSha,proofs:proofs.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,file]=process.argv.slice(2);
  if(command==='run'&&file)console.log(JSON.stringify(await runScopedRepair(JSON.parse(await readFile(file,'utf8')))));
  else throw Error('Usage: node scoped-mask-repair.mjs run PRIVATE_PLAN.json');
}
