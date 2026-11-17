import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {standardChannels} from './standard-channels.mjs';
import {foregroundBox,edgeContact} from './white-square.mjs';
import {backgroundComposite,resolutionProblem} from './background-composite.mjs';
import {flatTile,flatTileTreatment,normalizeFlatTile} from './flat-tile.mjs';

// Opt-in frame for a flat tile (owner direction, 2026-11-17, for named items only). The accepted cutout is composed
// exactly as normalizeFlatTile composes it: the same decoding, alpha box, flat #f0f0f0 square, native scale and PNG
// settings. The only difference is an explicit, recorded frame: the square's side (padding) and the product box's
// top-left corner (translation). Nothing is scaled, cropped, masked, retouched or generated.
// - The whole product box must lie inside the square, and every opaque product pixel is verified unchanged.
// - Given the accepted default tile as `basis`, that tile must be exactly what normalizeFlatTile makes of this cutout,
//   and the framed product box must equal its product box byte for byte. Only the frame then differs.
// Without a recipe nothing here runs; normalizeFlatTile still makes every default tile.

export const frameRecipeVersion=1;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Null, or why a recipe is not a pure padding and translation that keeps the whole product box inside the square. */
export function frameRecipeProblem(recipe,box,settings=flatTile){
  if(recipe?.kind!=='flat_tile_frame'||recipe.version!==frameRecipeVersion)return 'unsupported frame recipe';
  const {side,left,top}=recipe;
  if(![side,left,top].every(Number.isInteger))return 'side, left and top are whole pixels';
  if(side<settings.minSide||side>settings.maxSide)return `the side must be within ${settings.minSide}-${settings.maxSide}`;
  if(left<0||top<0||left+box.width>side||top+box.height>side)return 'the whole product box must lie inside the square';
  return null;
}

/** The framed tile of one cutout: {png, record}. The record keeps the flat_tile treatment and adds the frame recipe. */
export async function framedFlatTile(source,recipe,{basis=null,sharp=installedImageEngine(),settings=flatTile}={}){
  const {bytes:pixels,decoding}=await standardChannels(source,sharp);
  const meta=await sharp(pixels,{failOn:'warning'}).metadata();
  if(meta.hasAlpha!==true)throw Error('A flat tile needs a source with its own transparency');
  if((meta.orientation??1)!==1)throw Error('A flat tile source must be upright (EXIF orientation 1)');
  if(meta.space!=='srgb'||meta.depth!=='uchar')throw Error('A flat tile source must be 8-bit sRGB');
  const {data,info}=await sharp(pixels,{failOn:'warning'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)clear++;
  if(clear/(info.width*info.height)<settings.minTransparentFraction)throw Error('A flat tile source has too little transparency to be a cutout');
  const box=foregroundBox(data,info.width,info.height,backgroundComposite.alphaThreshold);
  if(!box)throw Error('The product has no foreground');
  const small=resolutionProblem(box,{...backgroundComposite,fill:settings.fill,minSide:settings.minSide});
  if(small)throw Error(small);
  if(Object.values(edgeContact(data,info.width,info.height,backgroundComposite.alphaThreshold)).some(n=>n>0))throw Error('The product touches its source frame: a flat tile shows the whole product only');
  const problem=frameRecipeProblem(recipe,box,settings);
  if(problem)throw Error('Frame refused: '+problem);
  const g={side:recipe.side,left:recipe.left,top:recipe.top,fill:+(Math.max(box.width,box.height)/recipe.side).toFixed(4)};
  // The composition of composeOnBackground, at the recorded frame.
  const cut=await sharp(pixels,{failOn:'warning'}).ensureAlpha().extract(box).png().toBuffer();
  const back=await sharp({create:{width:g.side,height:g.side,channels:3,background:settings.background}}).png().toBuffer();
  const png=await sharp(back).composite([{input:cut,left:g.left,top:g.top}]).removeAlpha().png({compressionLevel:9}).toBuffer();
  const out=await sharp(png).raw().toBuffer({resolveWithObject:true});
  let opaque=0,changed=0;
  for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++){
    const s=((box.top+y)*info.width+(box.left+x))*4;if(data[s+3]!==255)continue;opaque++;
    const o=((g.top+y)*g.side+(g.left+x))*out.info.channels;
    if(out.data[o]!==data[s]||out.data[o+1]!==data[s+1]||out.data[o+2]!==data[s+2])changed++;
  }
  if(changed)throw Error(`Product pixels changed (${changed})`);
  let basisCheck=null;
  if(basis){
    const made=await normalizeFlatTile(source,sharp,settings);
    if(made.record.tile_sha256!==digest(basis))throw Error('The basis is not the default tile of this cutout');
    const d=made.record.geometry,b=await sharp(basis).raw().toBuffer({resolveWithObject:true});
    let differ=0;
    for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++){
      const p=((d.top+y)*d.side+(d.left+x))*b.info.channels,q=((g.top+y)*g.side+(g.left+x))*out.info.channels;
      if(b.data[p]!==out.data[q]||b.data[p+1]!==out.data[q+1]||b.data[p+2]!==out.data[q+2])differ++;
    }
    if(differ)throw Error(`The framed product box differs from the default tile's (${differ} pixels)`);
    basisCheck={tile_sha256:digest(basis),geometry:d,product_box_identical:true};
  }
  return {png,record:{treatment:{...flatTileTreatment},frame:{...recipe},settings:{...settings},source_sha256:digest(source),tile_sha256:digest(png),
    ...(decoding?{decoding:{...decoding,standard_sha256:digest(pixels)}}:{}),
    source:{width:info.width,height:info.height},box,geometry:g,opaque_product_pixels:opaque,changed_opaque_product_pixels:0,...(basisCheck?{basis:basisCheck}:{})}};
}
