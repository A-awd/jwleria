// Image quality gate for published product photographs (decision 0021). It checks delivered files against their
// record and their original with free local tools only: `dwebp`/`cwebp` from libwebp, and plain JavaScript. It never
// alters, regenerates or uploads an image. Identity is not checked here: that is decision 0013's gate. Clarity is
// measured where it can be measured, and the rest is left to a reviewer looking side by side, at the shown size
// and zoomed. No result claims 100% accuracy.
//
// Automated rejection:
// - the file's sha256 or byte count differs from its publication record;
// - its decoded pixel size differs from the size its srcset entry declares;
// - it is larger than its original in either dimension (an enlargement);
// - its aspect differs from the original's by more than one pixel of rounding (a crop or a distortion);
// - it is over its byte budget: 150,000 B up to 960 px wide, 600,000 B for a wider detail file;
// - its luma SSIM is below 0.97 where the same-width reference is exact (the original itself, at an equal width).
// For a cutout, these are flagged for a reviewer:
// - opaque corners (no transparency);
// - an opaque run along a frame edge (possible clipping);
// - a soft band wider on average than max(3 px, 1% of the shorter side) (possible halo; decision 0015 allows a soft edge).
// Manual, side by side at the shown size and at 4x: lettering and logos legible in the original stay legible;
// there is no ringing, blocking or colour shift; and a cutout's edge follows the product, with no bite and no fringe.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {lumaSsim,rgbPsnr} from './image-fidelity.mjs';

export const BUDGET={card:150000,detail:600000};
export const SSIM_FLOOR=0.97;

/** A PPM (P6) or PAM (P7) image as written by `dwebp -ppm` or `dwebp -pam`. */
export function parseNetpbm(buffer){
  const head=buffer.subarray(0,Math.min(buffer.length,512)).toString('latin1');
  if(head.startsWith('P7')){
    const end=head.indexOf('ENDHDR\n');if(end<0)throw Error('PAM header incomplete');
    const field=name=>Number(new RegExp(`${name} (\\d+)`).exec(head)?.[1]);
    const width=field('WIDTH'),height=field('HEIGHT'),channels=field('DEPTH');
    return {width,height,channels,data:buffer.subarray(end+7,end+7+width*height*channels)};
  }
  const m=/^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(head);if(!m)throw Error('Only PPM P6 or PAM P7 images are read');
  const width=+m[1],height=+m[2];
  return {width,height,channels:3,data:buffer.subarray(m[0].length,m[0].length+width*height*3)};
}

/** Packed RGB from RGB or RGBA pixels; transparent pixels are composited on white, as a page shows them on paper. */
export function rgbOf({width,height,channels,data}){
  if(channels===3)return data;
  const out=new Uint8Array(width*height*3);
  for(let i=0,o=0;i<width*height;i++,o+=3){const a=data[i*4+3]/255;for(let c=0;c<3;c++)out[o+c]=Math.round(data[i*4+c]*a+255*(1-a));}
  return out;
}

/** The deterministic checks of one delivered file: record, declared size, no enlargement, aspect and byte budget. */
export function geometryChecks({record,file,decoded,original}){
  const results=[];
  const add=(check,pass,detail)=>results.push({check,pass,detail});
  add('sha256 matches the record',file.sha256===record.sha256,`${file.sha256.slice(0,12)} vs ${record.sha256.slice(0,12)}`);
  add('bytes match the record',file.bytes===record.bytes,`${file.bytes} B vs ${record.bytes} B`);
  add('decoded size matches srcset',decoded.width===record.width&&decoded.height===record.height,`${decoded.width}x${decoded.height} vs ${record.width}w x ${record.height}`);
  add('no enlargement',decoded.width<=original.width&&decoded.height<=original.height,`${decoded.width}x${decoded.height} within ${original.width}x${original.height}`);
  const expected=Math.round(decoded.width*original.height/original.width);
  add('aspect kept (no crop or distortion)',Math.abs(expected-decoded.height)<=1,`height ${decoded.height}, expected ${expected} ±1`);
  const budget=record.width<=960?BUDGET.card:BUDGET.detail;
  add(`within the ${budget} B budget`,file.bytes<=budget,`${file.bytes} B`);
  return results;
}

/** Transparency facts of a cutout: corners, opaque runs along each frame edge, and the soft edge band. */
export function alphaReport({width,height,channels,data}){
  if(channels!==4)return {cutout:false};
  const alpha=(x,y)=>data[(y*width+x)*4+3];
  const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]].map(([x,y])=>alpha(x,y));
  const run=(points)=>{let best=0,cur=0;for(const [x,y] of points){cur=alpha(x,y)>=247?cur+1:0;best=Math.max(best,cur);}return best;};
  const line=(n,f)=>Array.from({length:n},(_,i)=>f(i));
  const edges={top:run(line(width,i=>[i,0])),bottom:run(line(width,i=>[i,height-1])),start:run(line(height,i=>[0,i])),end:run(line(height,i=>[width-1,i]))};
  let opaque=0,soft=0,boundary=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=alpha(x,y);if(a>=247)opaque++;else if(a>8)soft++;
    if(a>8&&x+1<width&&(alpha(x+1,y)>8)!==(a>8))boundary++;
    if(a>8&&y+1<height&&(alpha(x,y+1)>8)!==(a>8))boundary++;
  }
  const outline=Math.max(1,boundary);
  return {cutout:true,shorterSide:Math.min(width,height),corners,cornersTransparent:corners.every(a=>a<=8),edges,opaqueShare:+(opaque/(width*height)).toFixed(4),softPixels:soft,softBandPx:+(soft/outline).toFixed(2)};
}

/** Flags a reviewer must look at for a cutout; none of them is an automatic pass. */
export function alphaFlags(report){
  if(!report.cutout)return [];
  const flags=[];
  if(!report.cornersTransparent)flags.push('opaque corner: not a transparent cutout here');
  for(const [side,run] of Object.entries(report.edges))if(run>=8)flags.push(`opaque run of ${run}px along the ${side} edge: check for clipping`);
  if(report.softBandPx>Math.max(3,report.shorterSide*0.01))flags.push(`soft edge band ${report.softBandPx}px on average: check for halo or fringe`);
  return flags;
}

/** Luma SSIM and RGB PSNR of a delivered file against a reference of the same size. */
export function fidelity(reference,delivered){
  if(reference.width!==delivered.width||reference.height!==delivered.height)throw Error('Fidelity needs images of the same size');
  const a=rgbOf(reference),b=rgbOf(delivered);
  return {ssim:+lumaSsim(a,b,reference.width,reference.height).toFixed(5),psnr:+rgbPsnr(a,b,reference.width,reference.height).toFixed(2)};
}

// Free local decoding: libwebp's dwebp, and cwebp for a lossless copy of a JPEG or PNG original.
function decode(path,{alpha=true}={}){
  const dir=mkdtempSync(join(tmpdir(),'jwl-gate-'));
  try{
    let source=path;
    if(!/\.webp$/i.test(path)){source=join(dir,'original.webp');execFileSync('cwebp',['-quiet','-lossless','-exact','-metadata','none',path,'-o',source]);}
    const out=join(dir,alpha?'image.pam':'image.ppm');
    execFileSync('dwebp',['-quiet',source,alpha?'-pam':'-ppm','-o',out]);
    return parseNetpbm(readFileSync(out));
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// What a reviewer still checks by eye, side by side with the original at the shown size and at 4x. A number does not.
export const MANUAL={
  photograph:['lettering and logos legible in the original stay legible','no ringing, blocking or banding around text and indices','no colour or tone shift','the whole product is in the frame'],
  background_removal:['lettering and logos legible in the original stay legible','the edge follows the product: no bite into it and no background fringe','the soft edge reads as the product\'s edge on light and dark grounds','nothing is added, removed or reshaped','the whole product is in the frame'],
};

/**
 * Runs the gate over one photograph's delivered files. The input is a private JSON file kept out of the repository:
 * {label, original: {path?, width, height}, files: [{path, width, height, bytes, sha256, treatment}]}. The command
 * reads local files only.
 * Usage: node image-quality-gate.mjs <private-input.json> <private-report.json>
 */
export function runGate(input){
  const original=input.original.path?decode(input.original.path):undefined;
  const size=original?{width:original.width,height:original.height}:{width:input.original.width,height:input.original.height};
  return {label:input.label,original:{...size,held:Boolean(original)},files:input.files.map(entry=>{
    const bytes=readFileSync(entry.path),decoded=decode(entry.path);
    const checks=geometryChecks({record:entry,file:{sha256:sha256(bytes),bytes:bytes.length},decoded,original:size});
    const cutout=entry.treatment==='background_removal';
    const alpha=cutout?alphaReport(decoded):{cutout:false};
    // Exact only when the original itself is the same-width reference; otherwise a reviewer compares by eye.
    const exact=original&&original.width===decoded.width&&original.height===decoded.height&&entry.treatment!=='background_removal';
    const measured=exact?fidelity(original,decoded):undefined;
    if(measured)checks.push({check:`luma SSIM at least ${SSIM_FLOOR} against the original`,pass:measured.ssim>=SSIM_FLOOR,detail:`SSIM ${measured.ssim}, PSNR ${measured.psnr} dB`});
    return {width:entry.width,treatment:entry.treatment??'photograph',checks,alpha,flags:alphaFlags(alpha),fidelity:measured??'not exact here: reviewed side by side',
      manual:MANUAL[cutout?'background_removal':'photograph'],pass:checks.every(c=>c.pass)};
  })};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node image-quality-gate.mjs <private-input.json> <private-report.json>');
  const report=runGate(JSON.parse(readFileSync(input,'utf8')));
  writeFileSync(output,JSON.stringify(report,null,2));
  for(const f of report.files)console.log(`${report.label} ${f.treatment} ${f.width}w: ${f.pass?'pass':'REJECT'}${f.flags.length?` | review: ${f.flags.join('; ')}`:''}${typeof f.fidelity==='object'?` | SSIM ${f.fidelity.ssim}`:''}`);
}
