import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {installedImageEngine} from './responsive-media.mjs';

// One square, pure-white presentation for every product photograph (decision 0022). It starts from a checked cutout
// master (decision 0015), whose transparent pixels are background and whose other pixels are the original's own.
// 1. The true foreground bounding box comes from the master's alpha, never from the photograph's whitespace.
// 2. The box is centred on a square whose side makes its longest extent `fill` of the side.
// 3. The product's pixels are kept as they are. Only white padding is added, and the soft edge is composited onto
//    white.
// 4. Nothing is stretched, cropped or invented. A square larger than `maxSide` is only ever scaled down.
// 5. Where the source photograph itself cuts the product off at a frame edge, the result reports that contact. That
//    limitation is recorded, never certified as a whole product.

/** The configurable geometry (decision 0022). Implementation settings, not owner approvals beyond the 0022 standard. */
export const whiteSquare=Object.freeze({version:1,background:'#ffffff',fill:0.8,alphaThreshold:16,maxSide:1600});

/** Bounding box of the pixels whose alpha is at least `threshold`, in an RGBA buffer. Undefined when there are none. */
export function foregroundBox(rgba,width,height,threshold=whiteSquare.alphaThreshold){
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(rgba[(y*width+x)*4+3]<threshold)continue;
    if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
  }
  return right<0?undefined:{left,top,width:right-left+1,height:bottom-top+1};
}

/** How many foreground pixels lie on each edge of the source frame: a non-zero count means the source cut the product. */
export function edgeContact(rgba,width,height,threshold=whiteSquare.alphaThreshold){
  const at=(x,y)=>rgba[(y*width+x)*4+3]>=threshold;
  const count=(n,f)=>{let c=0;for(let i=0;i<n;i++)if(f(i))c++;return c;};
  return {top:count(width,x=>at(x,0)),bottom:count(width,x=>at(x,height-1)),start:count(height,y=>at(0,y)),end:count(height,y=>at(width-1,y))};
}

/**
 * The square around a box. The padding is computed at the source's own resolution. The side is then scaled down to
 * `maxSide` when it is larger, never up. `fill` is the measured share of the side that the longest extent takes.
 */
export function squareGeometry(box,{fill,maxSide}=whiteSquare){
  if(!(fill>0&&fill<=1))throw Error('fill must be in (0, 1]');
  const longest=Math.max(box.width,box.height);
  const nativeSide=Math.ceil(longest/fill);
  const padX=nativeSide-box.width,padY=nativeSide-box.height;
  const extend={left:Math.floor(padX/2),right:padX-Math.floor(padX/2),top:Math.floor(padY/2),bottom:padY-Math.floor(padY/2)};
  const scale=Math.min(1,maxSide/nativeSide);
  return {nativeSide,side:Math.round(nativeSide*scale),scale:+scale.toFixed(6),extend,fill:+(longest/nativeSide).toFixed(4)};
}

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/** The normalized square (lossless PNG) and its record, from a checked cutout master. */
export async function normalizeWhiteSquare(master,sharp=installedImageEngine(),settings=whiteSquare){
  const {data,info}=await sharp(master,{failOn:'warning'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const box=foregroundBox(data,info.width,info.height,settings.alphaThreshold);
  if(!box)throw Error('The cutout master has no foreground');
  const geometry=squareGeometry(box,settings);
  const contact=edgeContact(data,info.width,info.height,settings.alphaThreshold);
  // Separate steps, because sharp applies flatten before extend within one pipeline: that left the padding transparent.
  // 1. Pad at native resolution. 2. Flatten everything onto white and drop alpha, so the square is fully opaque white.
  // 3. Scale down only if needed.
  const padded=await sharp(master,{failOn:'warning'}).extract(box)
    .extend({...geometry.extend,background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  const opaque=await sharp(padded,{failOn:'warning'}).flatten({background:settings.background}).removeAlpha().keepIccProfile().png({compressionLevel:9}).toBuffer();
  const png=geometry.scale<1
    ?await sharp(opaque,{failOn:'warning'}).resize({width:geometry.side,height:geometry.side,kernel:'lanczos3'}).removeAlpha().keepIccProfile().png({compressionLevel:9}).toBuffer()
    :opaque;
  const clipped=Object.values(contact).some(n=>n>0);
  return {png,record:{treatment:{kind:'white_square',version:settings.version},settings:{...settings},master_sha256:digest(master),square_sha256:digest(png),source:{width:info.width,height:info.height},box,geometry,contact,clipped_by_source:clipped}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,...args]=process.argv.slice(2);
  if(command==='normalize'&&args.length===2){
    // normalize CUTOUT_MASTER_PNG OUTPUT_PNG: writes the square once (never overwrites) and prints its record.
    const {png,record}=await normalizeWhiteSquare(await readFile(args[0]));
    await writeFile(args[1],png,{flag:'wx',mode:0o600});
    console.log(JSON.stringify(record));
  }else throw Error('Usage: node white-square.mjs normalize CUTOUT_MASTER_PNG OUTPUT_PNG');
}
