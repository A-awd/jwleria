import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {installedImageEngine,webpQualityLadder,byteBudgets,fidelityFloor,webpEncoder,privateOutputRoot} from './responsive-media.mjs';
import {lumaSsim} from './image-fidelity.mjs';
import {foregroundBox,edgeContact} from './white-square.mjs';

// Background-only composition (free local path, owner direction 2026-11-01; flat standard 2026-11-02). A product's own
// alpha (an official packshot with factory alpha, or a checked cutout master) is placed over a background:
// - the product is never scaled, redrawn, retouched, recoloured or shadowed: it is placed at its native resolution;
// - the background is a flat colour (deterministic, no AI; `background_colour`) or an image resized (cover) to the square;
// - every fully opaque product pixel must come out byte-identical, and the job verifies it before any encoding;
// - a product too small for the largest card width at the standard fill is refused, never enlarged.
// A source without a background passes through unchanged (no new pixels). One source file is processed once and binds
// one exact reference: a size or colour of the same model needs its own photograph. Nothing here uploads, records or
// publishes; rights stay with the existing grant path.

/**
 * Implementation settings, not owner approvals. fill: the product's largest extent as a share of the square. minSide:
 * the smallest square that still yields the largest card width natively. tile: the catalogue tile colour (decision 0023),
 * on which a transparent file's fidelity is measured.
 */
export const backgroundComposite=Object.freeze({version:2,fill:0.68,alphaThreshold:16,widths:[320,640,960],detailMax:1600,minSide:960,tile:'#f0f0f0'});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const flatColour=/^#[0-9a-f]{6}$/i;
const hashPattern=/^[a-f0-9]{64}$/;
const sizeKinds=new Set(['size','bag_size']);

/**
 * Null, or why several references may not share one source file (G1). Sharing is allowed only between genuine size
 * variants of one design and colour: every item declares the same shared_with set (all the references), the same
 * model_key and colour, options that differ only in a size kind, and its own current gallery evidence
 * {reference, revision_hash, gallery_url, sha256} naming exactly this file. A different colour or design never shares.
 */
export function sharedFileProblem(items){
  const refs=[...new Set(items.map(i=>i.reference))].sort();
  if(refs.length<2)return null;
  const first=items[0],norm=v=>String(v??'').trim().toLowerCase();
  for(const item of items){
    if(JSON.stringify([...new Set(item.shared_with??[])].sort())!==JSON.stringify(refs))return `shared_with of ${item.reference} must list exactly ${refs.join(', ')}`;
    if(!item.model_key||item.model_key!==first.model_key)return `${item.reference} belongs to another model`;
    if(norm(item.colour)!==norm(first.colour))return `${item.reference} is another colour`;
    const options=item.options??{},base=first.options??{};
    for(const kind of new Set([...Object.keys(options),...Object.keys(base)]))if(!sizeKinds.has(kind)&&norm(options[kind])!==norm(base[kind]))return `${item.reference} differs in ${kind}, not only in size`;
    const own=(item.gallery_evidence??[]).find(e=>e.reference===item.reference);
    if(!hashPattern.test(item.revision_hash??'')||!own||own.revision_hash!==item.revision_hash||own.sha256!==item.product_sha256||!/^https:\/\/[^/@\s]+\//.test(own.gallery_url??''))return `stale or missing gallery evidence for ${item.reference}`;
  }
  const sizes=new Set(items.map(i=>JSON.stringify(Object.entries(i.options??{}).filter(([k])=>sizeKinds.has(k)).sort())));
  if(sizes.size!==refs.length)return 'shared references must be distinct sizes';
  return null;
}

/** The square around the product's true alpha box at native resolution: never scales the product. */
export function compositeGeometry(box,{fill}=backgroundComposite){
  if(!(fill>0&&fill<=1))throw Error('fill must be in (0, 1]');
  const side=Math.ceil(Math.max(box.width,box.height)/fill);
  return {side,left:Math.floor((side-box.width)/2),top:Math.floor((side-box.height)/2),fill:+(Math.max(box.width,box.height)/side).toFixed(4)};
}

/** Null, or why the product is too small: at the standard fill its square must reach the largest card width. */
export function resolutionProblem(box,{fill,minSide}=backgroundComposite){
  const extent=Math.max(box.width,box.height),needed=Math.ceil(minSide*fill);
  return extent<needed?`Insufficient source resolution: the product's largest extent is ${extent} px; ${needed} px are needed for a ${minSide} px square at fill ${fill}`:null;
}

/** Composes one RGBA product over a background (a '#rrggbb' flat colour or image bytes); returns the PNG master and its verified record. */
export async function composeOnBackground(product,background,sharp=installedImageEngine(),settings=backgroundComposite){
  const flat=typeof background==='string';
  if(flat&&!flatColour.test(background))throw Error('A flat background is a #rrggbb colour');
  const {data,info}=await sharp(product,{failOn:'warning'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const box=foregroundBox(data,info.width,info.height,settings.alphaThreshold);
  if(!box)throw Error('The product has no foreground');
  const problem=resolutionProblem(box,settings);
  if(problem)throw Error(problem);
  const g=compositeGeometry(box,settings);
  const cut=await sharp(product,{failOn:'warning'}).ensureAlpha().extract(box).png().toBuffer();
  const back=flat?await sharp({create:{width:g.side,height:g.side,channels:3,background}}).png().toBuffer()
    :await sharp(background,{failOn:'warning'}).removeAlpha().resize({width:g.side,height:g.side,fit:'cover',kernel:'lanczos3'}).png().toBuffer();
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
  return {png,record:{kind:'background_composite',version:settings.version,product_sha256:digest(product),
    background_sha256:flat?null:digest(background),background_colour:flat?background.toLowerCase():null,master_sha256:digest(png),
    source:{width:info.width,height:info.height},box,geometry:g,opaque_product_pixels:opaque,changed_opaque_product_pixels:0,clipped_by_source:Object.values(contact).some(n=>n>0)}};
}

/**
 * Responsive WebP files of a master, never wider than it: the card widths below it plus one detail file of at most
 * `detailMax`. Each takes the first step of the production quality ladder that meets the fidelity floor (luma SSIM
 * against a lossless encode of the same resize, measured on the catalogue tile) within its byte budget (a card width
 * carries the card budget). When no step fits, the top step is kept and flagged for a performance review, as in production.
 */
export async function webpVariants(master,sharp=installedImageEngine(),settings=backgroundComposite){
  const {width}=await sharp(master).metadata();
  const detail=Math.min(width,settings.detailMax);
  const pixels=bytes=>sharp(bytes).flatten({background:settings.tile}).raw().toBuffer({resolveWithObject:true});
  const files=[];
  for(const w of [...new Set([...settings.widths.filter(x=>x<detail),detail])]){
    const budget=w<=Math.max(...settings.widths)?byteBudgets.card:byteBudgets.detail;
    const resized=()=>sharp(master).resize({width:w,withoutEnlargement:true,kernel:'lanczos3'});
    const reference=await pixels(await resized().webp({lossless:true,effort:0}).toBuffer());
    const tried=[];let chosen=null;
    for(const quality of webpQualityLadder){
      const bytes=await resized().webp({...webpEncoder,quality}).toBuffer();
      const decoded=await pixels(bytes);
      const ssim=+lumaSsim(reference.data,decoded.data,decoded.info.width,decoded.info.height).toFixed(5);
      tried.push({quality,bytes,ssim});
      if(ssim>=fidelityFloor.ssim&&bytes.length<=budget){chosen=tried.at(-1);break;}
    }
    const step=chosen??tried[0];
    const {height}=await sharp(step.bytes).metadata();
    files.push({width:w,height,bytes:step.bytes,sha256:digest(step.bytes),quality:step.quality,ssim:step.ssim,budget,
      within_budget:step.bytes.length<=budget,fidelity_floor_met:step.ssim>=fidelityFloor.ssim,performance_review_required:!chosen});
  }
  return files;
}

/**
 * One local job: items [{reference, colour, product_path, product_sha256, background_colour? | background_path?, binding?}]
 * -> out_directory. A flat colour or an image composes; neither passes the transparent source through unchanged. Each
 * source file is processed once and binds one reference; a changed file, a second reference for the same file or a
 * product below the resolution floor is refused. `binding` is the caller's private identity evidence, copied as given.
 */
export async function runJob({items,out_directory},sharp=installedImageEngine(),settings=backgroundComposite){
  const done=new Map(),records=[];
  out_directory=await privateOutputRoot(out_directory);
  await mkdir(out_directory,{recursive:true,mode:0o700});
  // One source file binds one reference, unless every reference sharing it passes sharedFileProblem.
  const bySha=new Map();
  for(const item of items){if(!bySha.has(item.product_sha256))bySha.set(item.product_sha256,[]);bySha.get(item.product_sha256).push(item);}
  for(const group of bySha.values()){
    const refs=[...new Set(group.map(i=>i.reference))];
    if(refs.length<2)continue;
    if(group.every(i=>i.shared_with===undefined))throw Error(`One source file cannot be bound to two references (${refs[0]}, ${refs[1]}): each size or colour needs its own exact photograph`);
    const problem=sharedFileProblem(group);
    if(problem)throw Error('Shared source file refused: '+problem);
  }
  for(const item of items){
    if(!item.reference?.trim()||!item.colour?.trim())throw Error('Each item needs its exact reference and colour');
    if(item.background_colour!==undefined&&item.background_path!==undefined)throw Error(`One background per item: ${item.reference}`);
    const product=await readFile(item.product_path);
    if(digest(product)!==item.product_sha256)throw Error(`Product file changed: ${item.reference}`);
    const background=item.background_colour??(item.background_path!==undefined?await readFile(item.background_path):null);
    const key=item.product_sha256+':'+(background===null?'passthrough':typeof background==='string'?background.toLowerCase():digest(background));
    if(done.has(key)){
      const first=done.get(key);
      // A size variant sharing the file gets its own record and binding; the same reference repeated is a duplicate.
      records.push({reference:item.reference,colour:item.colour,duplicate_of:first.reference,...(item.binding?{binding:item.binding}:{}),
        ...(first.reference!==item.reference?{shared_with:[...item.shared_with].sort(),gallery_evidence:item.gallery_evidence.find(e=>e.reference===item.reference),master_sha256:first.master_sha256,variants:first.variants}:{})});
      continue;
    }
    let master,record;
    if(background!==null)({png:master,record}=await composeOnBackground(product,background,sharp,settings));
    else{
      const {data,info}=await sharp(product).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const m=await sharp(product).metadata();if(!m.hasAlpha)throw Error(`Passthrough needs a transparent source: ${item.reference}`);
      const box=foregroundBox(data,info.width,info.height,settings.alphaThreshold);if(!box)throw Error(`The product has no foreground: ${item.reference}`);
      const problem=resolutionProblem(box,settings);if(problem)throw Error(`${problem}: ${item.reference}`);
      master=product;record={kind:'passthrough',product_sha256:item.product_sha256,master_sha256:item.product_sha256,source:{width:m.width,height:m.height},box};
    }
    await writeFile(join(out_directory,`${record.master_sha256}.png`),master,{mode:0o600});
    const variants=[];
    for(const v of await webpVariants(master,sharp,settings)){const {bytes,...rest}=v;await writeFile(join(out_directory,`${v.width}w-${v.sha256}.webp`),bytes,{mode:0o600});variants.push({...rest,bytes:bytes.length});}
    done.set(key,{reference:item.reference,master_sha256:record.master_sha256,variants});
    records.push({reference:item.reference,colour:item.colour,...(item.binding?{binding:item.binding}:{}),
      ...(item.shared_with?{shared_with:[...item.shared_with].sort(),gallery_evidence:item.gallery_evidence.find(e=>e.reference===item.reference)}:{}),...record,variants});
  }
  await writeFile(join(out_directory,'job-record.json'),JSON.stringify(records,null,2),{mode:0o600});
  return records;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input]=process.argv.slice(2);
  if(!input)throw Error('Usage: node background-composite.mjs PRIVATE_JOB.json');
  console.log(JSON.stringify(await runJob(JSON.parse(await readFile(input,'utf8')))));
}
