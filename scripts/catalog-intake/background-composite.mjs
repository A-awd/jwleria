import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {installedImageEngine} from './responsive-media.mjs';
import {foregroundBox,edgeContact} from './white-square.mjs';

// Background-only composition (free local path, owner direction 2026-11-01). A product's own alpha cutout (an official
// packshot with factory alpha, or a checked cutout master) is placed over a background image, which may be generated:
// - the product is never scaled, redrawn, retouched, recoloured or shadowed: it is placed at its native resolution;
// - only the background is resized (cover) to the square, and only background pixels are changed;
// - every fully opaque product pixel must come out byte-identical, and the job verifies it before any encoding.
// A source without a background request passes through unchanged (no AI, no new pixels). Duplicate originals (same
// sha256) are processed once. Nothing here uploads, records or publishes; rights stay with the existing grant path.

/** Implementation settings, not owner approvals. fill is the product's largest extent as a share of the square. */
export const backgroundComposite=Object.freeze({version:1,fill:0.68,alphaThreshold:16,widths:[320,640,960]});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/** The square around the product's true alpha box at native resolution: never scales the product. */
export function compositeGeometry(box,{fill}=backgroundComposite){
  if(!(fill>0&&fill<=1))throw Error('fill must be in (0, 1]');
  const side=Math.ceil(Math.max(box.width,box.height)/fill);
  return {side,left:Math.floor((side-box.width)/2),top:Math.floor((side-box.height)/2),fill:+(Math.max(box.width,box.height)/side).toFixed(4)};
}

/** Composes one RGBA product over a background; returns the PNG master and its verified record. */
export async function composeOnBackground(product,background,sharp=installedImageEngine(),settings=backgroundComposite){
  const {data,info}=await sharp(product,{failOn:'warning'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const box=foregroundBox(data,info.width,info.height,settings.alphaThreshold);
  if(!box)throw Error('The product has no foreground');
  const g=compositeGeometry(box,settings);
  const cut=await sharp(product,{failOn:'warning'}).ensureAlpha().extract(box).png().toBuffer();
  const back=await sharp(background,{failOn:'warning'}).removeAlpha().resize({width:g.side,height:g.side,fit:'cover',kernel:'lanczos3'}).png().toBuffer();
  const png=await sharp(back).composite([{input:cut,left:g.left,top:g.top}]).removeAlpha().png({compressionLevel:9}).toBuffer();
  // Verification before any encoding: every fully opaque product pixel is unchanged.
  const out=await sharp(png).raw().toBuffer({resolveWithObject:true});
  let opaque=0,changed=0,maxDelta=0;
  for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++){
    const s=((box.top+y)*info.width+(box.left+x))*4;if(data[s+3]!==255)continue;opaque++;
    const o=((g.top+y)*g.side+(g.left+x))*out.info.channels;
    const d=Math.max(Math.abs(out.data[o]-data[s]),Math.abs(out.data[o+1]-data[s+1]),Math.abs(out.data[o+2]-data[s+2]));
    if(d){changed++;if(d>maxDelta)maxDelta=d;}
  }
  if(changed)throw Error(`Product pixels changed (${changed}, max delta ${maxDelta})`);
  const contact=edgeContact(data,info.width,info.height,settings.alphaThreshold);
  return {png,record:{kind:'background_composite',version:settings.version,product_sha256:digest(product),background_sha256:digest(background),master_sha256:digest(png),
    source:{width:info.width,height:info.height},box,geometry:g,opaque_product_pixels:opaque,changed_opaque_product_pixels:0,clipped_by_source:Object.values(contact).some(n=>n>0)}};
}

/** Responsive WebP files of a master, never wider than it. */
export async function webpVariants(master,sharp=installedImageEngine(),widths=backgroundComposite.widths,quality=90){
  const {width}=await sharp(master).metadata();const files=[];
  for(const w of [...widths.filter(x=>x<width),width]){const bytes=await sharp(master).resize({width:w,kernel:'lanczos3'}).webp({quality,effort:6,alphaQuality:100}).toBuffer();files.push({width:w,bytes,sha256:digest(bytes)});}
  return files;
}

/**
 * One local job: items [{reference, colour, product_path, product_sha256, background_path?}] -> out_directory.
 * A background_path composes; none passes the source through unchanged (deterministic, no AI). Each product sha256 is
 * processed once; a changed file is refused.
 */
export async function runJob({items,out_directory},sharp=installedImageEngine()){
  const done=new Map(),records=[];
  await mkdir(out_directory,{recursive:true,mode:0o700});
  for(const item of items){
    const product=await readFile(item.product_path);
    if(digest(product)!==item.product_sha256)throw Error(`Product file changed: ${item.reference}`);
    const key=item.product_sha256+':'+(item.background_path?digest(await readFile(item.background_path)):'passthrough');
    if(done.has(key)){records.push({reference:item.reference,colour:item.colour,duplicate_of:done.get(key)});continue;}
    let master,record;
    if(item.background_path)({png:master,record}=await composeOnBackground(product,await readFile(item.background_path),sharp));
    else{const m=await sharp(product).metadata();if(!m.hasAlpha)throw Error(`Passthrough needs a transparent source: ${item.reference}`);master=product;record={kind:'passthrough',product_sha256:item.product_sha256,master_sha256:item.product_sha256,source:{width:m.width,height:m.height}};}
    await writeFile(join(out_directory,`${record.master_sha256}.png`),master,{mode:0o600});
    const variants=[];
    for(const v of await webpVariants(master,sharp)){await writeFile(join(out_directory,`${v.width}w-${v.sha256}.webp`),v.bytes,{mode:0o600});variants.push({width:v.width,sha256:v.sha256,bytes:v.bytes.length});}
    done.set(key,item.reference);records.push({reference:item.reference,colour:item.colour,...record,variants});
  }
  await writeFile(join(out_directory,'job-record.json'),JSON.stringify(records,null,2),{mode:0o600});
  return records;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input]=process.argv.slice(2);
  if(!input)throw Error('Usage: node background-composite.mjs PRIVATE_JOB.json');
  console.log(JSON.stringify(await runJob(JSON.parse(await readFile(input,'utf8')))));
}
