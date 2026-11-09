import {createHash} from 'node:crypto';
import {composeOnBackground,backgroundComposite} from './background-composite.mjs';
import {installedImageEngine} from './responsive-media.mjs';
import {standardChannels} from './standard-channels.mjs';

// Flat tile presentation (gap G2, decision 0023's grey card made exact): the product's own alpha, from an untouched
// native-alpha original or a checked cutout master, placed whole at native scale on a flat #f0f0f0 square with its
// longest extent at 0.68 of the side. Every fully opaque product pixel is verified unchanged before any encoding
// (composeOnBackground). Nothing is generated, retouched, recoloured or enlarged.

export const flatTile=Object.freeze({version:1,background:'#f0f0f0',fill:backgroundComposite.fill,minSide:backgroundComposite.minSide,maxSide:7745,minTransparentFraction:0.02});
export const flatTileTreatment=Object.freeze({kind:'flat_tile',version:flatTile.version});
/** The independent visual review of an accepted tile names these checks, each literally true. */
export const flatTileReviewChecks=Object.freeze(['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile']);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/**
 * Builds the tile from RGBA source bytes; refuses a source without real transparency, rotated, clipped or out of range.
 * An untagged 8-bit greyscale PNG is read losslessly as R=G=B=grey with its own alpha (standard-channels.mjs); any other
 * non-sRGB source is refused as an unsupported format.
 */
export async function normalizeFlatTile(source,sharp=installedImageEngine(),settings=flatTile){
  const {bytes:pixels,decoding}=await standardChannels(source,sharp);
  const meta=await sharp(pixels,{failOn:'warning'}).metadata();
  if(meta.hasAlpha!==true)throw Error('A flat tile needs a source with its own transparency');
  if((meta.orientation??1)!==1)throw Error('A flat tile source must be upright (EXIF orientation 1)');
  if(meta.space!=='srgb'||meta.depth!=='uchar')throw Error('A flat tile source must be 8-bit sRGB');
  const alpha=await sharp(pixels).ensureAlpha().extractChannel(3).raw().toBuffer();
  let clear=0;for(const a of alpha)if(a===0)clear++;
  if(clear/alpha.length<settings.minTransparentFraction)throw Error('A flat tile source has too little transparency to be a cutout');
  const {png,record}=await composeOnBackground(pixels,settings.background,sharp,{...backgroundComposite,fill:settings.fill,minSide:settings.minSide});
  if(record.clipped_by_source)throw Error('The product touches its source frame: a flat tile shows the whole product only');
  if(record.geometry.side>settings.maxSide)throw Error('The flat tile would exceed the derivative pixel limit');
  return {png,record:{treatment:{...flatTileTreatment},settings:{...settings},source_sha256:digest(source),tile_sha256:record.master_sha256,
    ...(decoding?{decoding:{...decoding,standard_sha256:digest(pixels)}}:{}),
    source:record.source,box:record.box,geometry:record.geometry,opaque_product_pixels:record.opaque_product_pixels,changed_opaque_product_pixels:0}};
}
