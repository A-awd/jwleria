import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
// responsive-media.mjs first: flat-tile.mjs and background-composite.mjs import each other through it, and this order
// (the one every existing entry point uses) evaluates background-composite.mjs before flat-tile.mjs reads its settings.
import {installedImageEngine,privateOutputRoot,byteBudgets,fidelityFloor,webpQualityLadder,webpEncoder} from './responsive-media.mjs';
import {flatTile,normalizeFlatTile} from './flat-tile.mjs';
import {backgroundComposite} from './background-composite.mjs';

// Local review aids for the private responsive previews that batch-official.mjs webpPreviews prepares from accepted
// flat tiles (the existing supported widths, encoder, byte budgets and fidelity floor). Nothing here encodes a
// derivative, changes a measured value, waives a budget or the floor, or records a review:
// - freezePreviews checks every preview against its tile and file (sha256, bytes, WebP geometry, the supported width
//   set, no enlargement), makes the files read-only and writes one write-once index with every measurement and flag;
// - reviewSheets, widthProofs, regionProofs and nativeDecodes draw write-once proof images for an independent reviewer:
//   sheets of at most four sets (the accepted frame and every width, each shown at 320 px), every width of chosen sets
//   with native crops beside the lossless resize it was measured against, named regions at every width, and lossless
//   PNG decodes of exact files;
// - derivativeReviewTemplate writes a blank per-file review record: every decision stays null until a reviewer who has
//   viewed the file fills a copy kept outside the batch directory. Code never fills it.

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const once=(path,bytes)=>writeFile(path,bytes,{flag:'wx',mode:0o600});
const json=value=>Buffer.from(JSON.stringify(value,null,1)+'\n');
const escape=value=>String(value).replace(/[<&>"]/g,c=>({'<':'&lt;','&':'&amp;','>':'&gt;','"':'&quot;'})[c]);
const caption=(lines,width,height,size=15)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines.map((line,i)=>`<text x="6" y="${size+4+i*(size+5)}" font-family="Helvetica" font-size="${size}" fill="#111111">${escape(line)}</text>`).join('')}</svg>`);
const byRef=([,a],[,b])=>a.ref<b.ref?-1:a.ref>b.ref?1:0;
const flagText=f=>f.performance_review_required?' · FLAGGED: performance review required':'';
const supportedWidths=side=>{const detail=Math.min(side,backgroundComposite.detailMax);return [...new Set([...backgroundComposite.widths.filter(w=>w<detail),detail])];};
const background=[1,3,5].map(i=>parseInt(flatTile.background.slice(i,i+2),16));

/**
 * Verifies and freezes the previews of every current tile (results.json) and writes derivatives-index.json once. A tile
 * without a matching preview, a width outside the supported set, a changed file or an enlarged derivative is refused.
 * Previews of tiles that are no longer current are listed as stale and never indexed for review.
 */
export async function freezePreviews({out,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out);
  const resultsBytes=await readFile(join(root,'results.json')),previewsBytes=await readFile(join(root,'previews.json'));
  const results=JSON.parse(resultsBytes),previews=JSON.parse(previewsBytes);
  const current=Object.entries(results).filter(([,r])=>r.tile).sort(byRef);
  const items=[];let files=0;
  for(const [n,[key,r]] of current.entries()){
    const tile=await readFile(r.tile.path);
    if(digest(tile)!==r.tile.sha256)throw Error('A tile differs from its recorded sha256: '+r.ref);
    const tm=await sharp(tile).metadata();
    if(tm.width!==tm.height)throw Error('A flat tile is square: '+r.ref);
    const side=tm.width,widths=supportedWidths(side),p=previews[r.tile.sha256];
    if(!p||p.ref!==r.ref||p.tile_sha256!==r.tile.sha256||p.original_sha256!==r.original.sha256)throw Error('No preview of the current tile of '+r.ref);
    if(JSON.stringify(p.variants.map(v=>v.width))!==JSON.stringify(widths))throw Error('Preview widths differ from the supported set for '+r.ref);
    const list=[];
    for(const v of p.variants){
      const bytes=await readFile(v.path);
      if(digest(bytes)!==v.sha256||bytes.length!==v.bytes||basename(v.path)!==`${v.width}w-${v.sha256}.webp`)throw Error(`A preview differs from its record: ${r.ref} ${v.width}w`);
      const m=await sharp(bytes).metadata();
      if(m.format!=='webp'||m.width!==v.width||m.height!==v.height||m.height!==Math.round(tm.height*v.width/tm.width)||v.width>side)throw Error(`A preview is not an uncropped, unenlarged resize: ${r.ref} ${v.width}w`);
      await chmod(v.path,0o444);
      list.push({width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256,path:v.path,quality:v.quality,ssim:v.ssim,budget:v.budget,within_budget:v.within_budget,
        fidelity_floor_met:v.fidelity_floor_met,performance_review_required:v.performance_review_required,role:v.width===widths.at(-1)?(backgroundComposite.widths.includes(v.width)?'card+detail':'detail'):'card'});
      files++;
    }
    items.push({index:n+1,label:String(n+1).padStart(3,'0'),key,ref:r.ref,model:r.model??null,colour:r.colour??null,size:r.size??null,original_sha256:r.original.sha256,
      cutout_sha256:r.cutout?.sha256??null,tile_sha256:r.tile.sha256,tile_path:r.tile.path,side,detail_width:widths.at(-1),repaired:r.adopted_review!==undefined,
      rejected:(r.rejected??[]).map(j=>({cutout_sha256:j.cutout_sha256,tile_sha256:j.tile_sha256,status:j.status??null})),files:list});
  }
  const live=new Set(current.map(([,r])=>r.tile.sha256)),stale=Object.keys(previews).filter(t=>!live.has(t)).sort();
  const flagged=items.flatMap(i=>i.files.filter(f=>f.performance_review_required||!f.within_budget||!f.fidelity_floor_met)
    .map(f=>({label:i.label,ref:i.ref,tile_sha256:i.tile_sha256,width:f.width,sha256:f.sha256,bytes:f.bytes,budget:f.budget,quality:f.quality,ssim:f.ssim,within_budget:f.within_budget,fidelity_floor_met:f.fidelity_floor_met})));
  const byWidth={};for(const i of items)for(const f of i.files){const k=f.role==='detail'?'detail':String(f.width);byWidth[k]=(byWidth[k]??0)+1;}
  await writeFile(join(root,'derivatives-index.json'),json({schema:'jwl-derivative-index/1',frozen_at:new Date().toISOString(),
    label:'private prepared previews for local review only; not a publication bundle; no review or performance exception implied',
    engine:{sharp:sharp.versions.sharp,vips:sharp.versions.vips},
    settings:{widths:backgroundComposite.widths,detail_max:backgroundComposite.detailMax,tile_background:flatTile.background,byte_budgets:byteBudgets,fidelity_floor:fidelityFloor,quality_ladder:webpQualityLadder,encoder:webpEncoder},
    results_sha256:digest(resultsBytes),previews_sha256:digest(previewsBytes),counts:{items:items.length,files,by_width:byWidth,flagged:flagged.length,stale_previews:stale.length},
    flagged,stale_previews:stale,items}),{flag:'wx',mode:0o400});
  return {items:items.length,files,flagged:flagged.length,stale:stale.length};
}

async function frozenIndex(root){
  const index=JSON.parse(await readFile(join(root,'derivatives-index.json'),'utf8'));
  if(index.schema!=='jwl-derivative-index/1')throw Error('Proofs are drawn only from a frozen derivative index');
  return index;
}
/** The integer crop window [x, y, w, h] of a fractional box, inside a width x height image. */
function windowOf(box,width,height){
  const left=Math.max(0,Math.floor(box.x)),top=Math.max(0,Math.floor(box.y));
  const right=Math.min(width,Math.max(left+1,Math.ceil(box.x+box.width))),bottom=Math.min(height,Math.max(top+1,Math.ceil(box.y+box.height)));
  return {left,top,width:right-left,height:bottom-top};
}
const square=(x,y,size,width,height)=>{const w=Math.min(size,width),h=Math.min(size,height);
  return {left:Math.min(Math.max(0,Math.round(x)),width-w),top:Math.min(Math.max(0,Math.round(y)),height-h),width:w,height:h};};
const magnified=(sharp,png,window,k)=>sharp(png).extract(window).resize({width:window.width*k,height:window.height*k,kernel:'nearest'}).png().toBuffer();
/** The product's box in a flat tile: every pixel that is not exactly the tile background. */
function productBox(data,width,height,channels){
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*channels;if(data[p]===background[0]&&data[p+1]===background[1]&&data[p+2]===background[2])continue;
    if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;}
  if(right<0)throw Error('A flat tile without a product');
  return {left,top,width:right-left+1,height:bottom-top+1};
}
const lossless=(sharp,tile,width)=>sharp(tile).resize({width,withoutEnlargement:true,kernel:'lanczos3'}).png().toBuffer();

/**
 * Review sheets, at most four sets per page in the frozen index's stable order: per set, the accepted frame and each
 * actual derivative width, all shown at `cell` px (the frame and any width above it reduced with Lanczos3 for display,
 * the 320w card 1:1), labelled by short hash, with every full hash in the sheet index.
 */
export async function reviewSheets({out,per_sheet=4,cell=320,sharp=installedImageEngine()}){
  if(!Number.isInteger(per_sheet)||per_sheet<1||per_sheet>4)throw Error('A review sheet holds one to four sets');
  const root=await privateOutputRoot(out),index=await frozenIndex(root),dir=join(root,'proofs','sheets');
  await mkdir(dir,{recursive:true,mode:0o700});
  const columns=1+Math.max(...index.items.map(i=>i.files.length)),gap=6,title=26,label=40,header=34;
  const width=columns*cell+(columns-1)*gap,pages=Math.ceil(index.items.length/per_sheet),sheets=[];
  const shown=async(png,w)=>w===cell?sharp(png).png().toBuffer():sharp(png).resize({width:cell,height:cell,fit:'contain',kernel:'lanczos3',background:'#ffffff'}).png().toBuffer();
  for(let s=0;s<pages;s++){
    const page=index.items.slice(s*per_sheet,(s+1)*per_sheet),height=header+page.length*(title+cell+label);
    const layers=[{input:caption([`Review sheet ${s+1}/${pages} · each cell shown at ${cell} px: accepted frame (lossless reduction), then every prepared WebP width (${cell}w 1:1, wider files reduced for display) · no review implied`],width,header,14),left:0,top:0}];
    const sets=[];
    for(const [i,item] of page.entries()){
      const y=header+i*(title+cell+label),tile=await readFile(item.tile_path);
      layers.push({input:caption([`#${item.label} ${item.ref} · ${item.model??''} · ${item.colour??''} · side ${item.side}${item.repaired?' · REPAIRED: accepted repaired frame':''}`],width,title,15),left:0,top:y});
      const cells=[{caption:[`accepted frame ${item.tile_sha256.slice(0,12)}`,`${item.side} px tile, reduced to ${cell}`],png:await shown(tile,item.side)}];
      for(const f of item.files)cells.push({caption:[`${f.width}w ${f.sha256.slice(0,12)} · ${f.bytes} B`,`q${f.quality} · ssim ${f.ssim}${f.performance_review_required?' · FLAGGED':''}${f.width===cell?' · 1:1':' · reduced'}`],png:await shown(await sharp(await readFile(f.path)).png().toBuffer(),f.width)});
      cells.forEach((c,j)=>layers.push({input:c.png,left:j*(cell+gap),top:y+title},{input:caption(c.caption,cell,label,12),left:j*(cell+gap),top:y+title+cell}));
      sets.push({label:item.label,ref:item.ref,key:item.key,row:i+1,repaired:item.repaired,frame:{tile_sha256:item.tile_sha256,side:item.side},
        derivatives:item.files.map((f,j)=>({column:j+2,width:f.width,height:f.height,bytes:f.bytes,sha256:f.sha256,quality:f.quality,ssim:f.ssim,performance_review_required:f.performance_review_required}))});
    }
    const png=await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(layers).png({compressionLevel:9}).toBuffer();
    const file=join(dir,`sheet-${String(s+1).padStart(3,'0')}-${page[0].label}-${page.at(-1).label}.png`);
    await once(file,png);sheets.push({sheet:s+1,file,sha256:digest(png),width,height,sets});
  }
  await once(join(dir,'index.json'),json({schema:'jwl-derivative-review-sheets/1',cell,per_sheet,order:'frozen index order (reference, ascending)',
    columns:['accepted frame',...index.items[0].files.map((_,j)=>j===index.items[0].files.length-1?'detail':'card')],sheets}));
  return {sheets:sheets.length,sets:index.items.length};
}

/**
 * Native evidence for every width of the given tiles: per width, the whole derivative (native at 320, reduced above),
 * then crops of the product's centre and top edge from the lossless master resize at that width and from the decoded
 * WebP (native 1:1 above 320, x2 nearest at 320).
 */
export async function widthProofs({out,tile_sha256s,cell=320,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out),index=await frozenIndex(root),dir=join(root,'proofs','widths'),wanted=new Set(tile_sha256s??[]);
  const chosen=index.items.filter(i=>wanted.has(i.tile_sha256));
  if(!chosen.length||chosen.length!==wanted.size)throw Error('Width proofs need the exact tiles of frozen derivative sets');
  await mkdir(dir,{recursive:true,mode:0o700});
  const gap=6,label=40,header=48,columns=5,width=columns*cell+(columns-1)*gap,proofs=[];
  for(const item of chosen){
    const tile=await readFile(item.tile_path),{data,info}=await sharp(tile).raw().toBuffer({resolveWithObject:true});
    const box=productBox(data,info.width,info.height,info.channels);
    const layers=[{input:caption([`#${item.label} ${item.ref} · ${item.model??''} · ${item.colour??''}${item.repaired?' · REPAIRED (accepted master)':''} · master ${item.tile_sha256.slice(0,12)} · side ${item.side}`,
      'per width: whole WebP (native at 320, fitted above) | centre: master lossless | centre: WebP | top edge: master lossless | top edge: WebP'],width,header,14),left:0,top:0}];
    const rows=[];
    for(const [r,f] of item.files.entries()){
      const y=header+r*(cell+label),k=f.width<=cell?2:1,size=Math.floor(cell/k),s=f.width/item.side;
      const ref=await lossless(sharp,tile,f.width),webp=await sharp(await readFile(f.path)).png().toBuffer();
      const cx=(box.left+box.width/2)*s,centre=square(cx-size/2,(box.top+box.height/2)*s-size/2,size,f.width,f.height),edge=square(cx-size/2,box.top*s-size*0.3,size,f.width,f.height);
      const whole=f.width===cell?webp:await sharp(webp).resize({width:cell,height:cell,fit:'contain',kernel:'lanczos3',background:'#ffffff'}).png().toBuffer();
      const cells=[whole,await magnified(sharp,ref,centre,k),await magnified(sharp,webp,centre,k),await magnified(sharp,ref,edge,k),await magnified(sharp,webp,edge,k)];
      cells.forEach((png,j)=>layers.push({input:png,left:j*(cell+gap),top:y}));
      layers.push({input:caption([`${f.width}w ${f.sha256.slice(0,10)} · ${f.bytes} B of ${f.budget} · q${f.quality} · ssim ${f.ssim}${flagText(f)} · crops ${k>1?'x'+k+' nearest':'native 1:1'} at ${centre.left},${centre.top} and ${edge.left},${edge.top}`],width,label,14),left:0,top:y+cell});
      rows.push({width:f.width,sha256:f.sha256,magnification:k,centre,edge});
    }
    const height=header+item.files.length*(cell+label);
    const png=await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(layers).png({compressionLevel:9}).toBuffer();
    const file=join(dir,`${item.label}-${item.ref}.png`);
    await once(file,png);proofs.push({label:item.label,ref:item.ref,tile_sha256:item.tile_sha256,file,sha256:digest(png),width,height,product_box:box,rows});
  }
  await once(join(dir,`index-${digest(Buffer.from([...wanted].sort().join()))}.json`),json({schema:'jwl-derivative-width-proofs/1',cell,proofs}));
  return {proofs:proofs.length};
}

/**
 * Named regions of one item (boxes in its original's frame, which is the cutout's) at every width: per region, the
 * accepted master at native resolution over the original photograph, then per width the lossless master resize over
 * the decoded WebP; each crop is magnified by a whole factor up to cell px (nearest), never reduced.
 */
export async function regionProofs({out,key,regions,cell=320,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out),index=await frozenIndex(root),item=index.items.find(i=>i.key===key);
  if(!item)throw Error('No frozen derivative set for '+key);
  const x=JSON.parse(await readFile(join(root,'results.json'),'utf8'))[key];
  if(x?.tile?.sha256!==item.tile_sha256||!x.cutout)throw Error('Region proofs need the current cutout-based tile');
  if(!Array.isArray(regions)||!regions.length)throw Error('Region proofs need named regions');
  const tile=await readFile(item.tile_path),original=await readFile(x.original.path),{record}=await normalizeFlatTile(await readFile(x.cutout.path),sharp);
  if(record.tile_sha256!==item.tile_sha256)throw Error('The tile step no longer reproduces the frozen tile');
  const dx=record.geometry.left-record.box.left,dy=record.geometry.top-record.box.top,om=await sharp(original).metadata();
  const dir=join(root,'proofs','repairs',`${item.label}-${x.ref}`);await mkdir(dir,{recursive:true,mode:0o700});
  const widths=[];for(const f of item.files)widths.push({f,ref:await lossless(sharp,tile,f.width),webp:await sharp(await readFile(f.path)).png().toBuffer()});
  const gap=8,label=40,header=34,proofs=[];
  const crop=async(png,box,w,h)=>{const window=windowOf(box,w,h),k=Math.max(1,Math.floor(cell/Math.max(window.width,window.height)));return {png:await magnified(sharp,png,window,k),window,k,w:window.width*k,h:window.height*k};};
  for(const [n,region] of regions.entries()){
    const b=region.box;
    if(!(b?.width>0&&b?.height>0))throw Error('A region needs a box');
    const at={x:b.x+dx,y:b.y+dy,width:b.width,height:b.height};
    const columns=[{title:'accepted master, native',top:await crop(tile,at,item.side,item.side),bottom:await crop(original,b,om.width,om.height),bottomTitle:'original photograph, native'}];
    for(const {f,ref,webp} of widths){const s=f.width/item.side,box={x:at.x*s,y:at.y*s,width:at.width*s,height:at.height*s};
      columns.push({title:`${f.width}w master lossless`,top:await crop(ref,box,f.width,f.height),bottom:await crop(webp,box,f.width,f.height),bottomTitle:`${f.width}w WebP ${f.sha256.slice(0,8)}${f.performance_review_required?' FLAGGED':''}`});}
    const topH=Math.max(...columns.map(c=>c.top.h)),bottomH=Math.max(...columns.map(c=>c.bottom.h)),layers=[];let left=0;
    for(const c of columns){
      const w=Math.max(c.top.w,c.bottom.w,150);
      layers.push({input:c.top.png,left,top:header},{input:caption([c.title,`x${c.top.k} · ${c.top.window.left},${c.top.window.top} ${c.top.window.width}x${c.top.window.height}`],w,label,12),left,top:header+topH},
        {input:c.bottom.png,left,top:header+topH+label},{input:caption([c.bottomTitle,`x${c.bottom.k} · ${c.bottom.window.left},${c.bottom.window.top} ${c.bottom.window.width}x${c.bottom.window.height}`],w,label,12),left,top:header+topH+label+bottomH});
      left+=w+gap;
    }
    const width=left-gap,height=header+topH+bottomH+2*label;
    layers.unshift({input:caption([`#${item.label} ${x.ref} · region ${n+1}: ${region.label} · box ${b.x},${b.y} ${b.width}x${b.height} in the original's frame · whole-factor nearest magnification, never reduced`],width,header,14),left:0,top:0});
    const png=await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(layers).png({compressionLevel:9}).toBuffer();
    const file=join(dir,`${String(n+1).padStart(2,'0')}-${String(region.label).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()}.png`);
    await once(file,png);proofs.push({region:n+1,label:region.label,box:b,tile_box:at,file,sha256:digest(png),width,height});
  }
  await once(join(dir,'index.json'),json({schema:'jwl-derivative-region-proofs/1',key,ref:x.ref,tile_sha256:item.tile_sha256,offset_to_tile:{dx,dy},proofs}));
  return {proofs:proofs.length};
}

/** Lossless PNG decodes of every derivative of the given tiles, for native inspection of the exact files. */
export async function nativeDecodes({out,tile_sha256s,sharp=installedImageEngine()}){
  const root=await privateOutputRoot(out),index=await frozenIndex(root),wanted=new Set(tile_sha256s),decoded=[];
  for(const item of index.items.filter(i=>wanted.has(i.tile_sha256))){
    const dir=join(root,'proofs','decoded',`${item.label}-${item.ref}`);await mkdir(dir,{recursive:true,mode:0o700});
    for(const f of item.files){
      const png=await sharp(await readFile(f.path)).png({compressionLevel:9}).toBuffer(),file=join(dir,`${f.width}w-${f.sha256}.png`);
      await once(file,png);decoded.push({label:item.label,ref:item.ref,tile_sha256:item.tile_sha256,width:f.width,height:f.height,webp_sha256:f.sha256,file,sha256:digest(png)});
    }
  }
  if(new Set(decoded.map(d=>d.tile_sha256)).size!==wanted.size)throw Error('A requested tile has no frozen derivative set');
  await mkdir(join(root,'proofs','decoded'),{recursive:true,mode:0o700});
  await once(join(root,'proofs','decoded',`index-${digest(Buffer.from([...wanted].sort().join()))}.json`),json({schema:'jwl-derivative-decodes/1',decoded}));
  return {files:decoded.length};
}

/** A blank per-file derivative review: every decision null. Code never fills it; a filled copy is kept outside this batch. */
export async function derivativeReviewTemplate({out}){
  const root=await privateOutputRoot(out),index=await frozenIndex(root);
  await mkdir(join(root,'proofs'),{recursive:true,mode:0o700});
  const reviews=index.items.flatMap(i=>i.files.map(f=>({label:i.label,ref:i.ref,key:i.key,tile_sha256:i.tile_sha256,width:f.width,sha256:f.sha256,bytes:f.bytes,
    performance_review_required:f.performance_review_required,reviewer:null,accepted:null,decision:null,note:null})));
  await once(join(root,'proofs','derivative-review-template.json'),json({schema:'jwl-derivative-review/1',template:true,
    note:'Blank. Set accepted (true or false) and decision (accepted, rejected or uncertain) only after viewing the exact file. A flagged file needs a separate independent performance exception; nothing here waives one. Keep the filled copy outside the batch directory.',
    reviewer:null,reviewed_at:null,independent_of_batch_writer:null,reviews}));
  return {reviews:reviews.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,a]=process.argv.slice(2);
  const plan=async()=>JSON.parse(await readFile(a,'utf8'));
  if(command==='freeze'&&a)console.log(JSON.stringify(await freezePreviews({out:a})));
  else if(command==='sheets'&&a)console.log(JSON.stringify(await reviewSheets({out:a})));
  else if(command==='widths'&&a){const p=await plan();console.log(JSON.stringify(await widthProofs({out:p.out,tile_sha256s:p.tile_sha256s})));}
  else if(command==='regions'&&a){const p=await plan();const done=[];for(const i of p.items)done.push(await regionProofs({out:p.out,key:i.key,regions:i.regions}));console.log(JSON.stringify(done));}
  else if(command==='decodes'&&a){const p=await plan();console.log(JSON.stringify(await nativeDecodes({out:p.out,tile_sha256s:p.tile_sha256s})));}
  else if(command==='template'&&a)console.log(JSON.stringify(await derivativeReviewTemplate({out:a})));
  else throw Error('Usage: node derivative-review.mjs freeze|sheets|template PRIVATE_OUT | widths|regions|decodes PRIVATE_PLAN.json');
}
