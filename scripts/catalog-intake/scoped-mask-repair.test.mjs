import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {repairedCutoutMaster,validateCutoutMaster} from './cutout.mjs';
import {applyScopedRepair,photographedBackdrop,runScopedRepair,scopedRepairLimits} from './scoped-mask-repair.mjs';

// Synthetic scenes only, drawn in memory: a dark "bag" and "handle" on a smooth studio backdrop with a little noise, and
// the two failure classes the scoped repair answers: a mask that fills the handle opening with backdrop, and a mask that
// loses a thin hanging part. No product photograph is read, nothing is downloaded, recorded, uploaded or published.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const W=240,H=200;
const noise=(()=>{let s=11;return ()=>{s=(Math.imul(s,1103515245)+12345)>>>0;return (s>>>28)&1;};})();
const backdrop=(x,y)=>236+Math.round(x/60)-Math.round(y/80);
const inBody=(x,y)=>x>=60&&x<180&&y>=110&&y<170;
const ring=(x,y,inner=false)=>{const d=Math.hypot((x-120)/(inner?36:50),(y-110)/(inner?31:45));return y<110&&d<1;};
const inHandle=(x,y)=>ring(x,y)&&!ring(x,y,true);
const inOpening=(x,y)=>ring(x,y,true);

function paint(inProduct,colour){
  const rgb=Buffer.alloc(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=inProduct(x,y)?colour(x,y):backdrop(x,y)+noise();rgb.fill(v,(y*W+x)*3,(y*W+x)*3+3);}
  return rgb;
}
const dark=(x,y)=>40+((x>>2)&1)*12+((y>>3)&1)*6;
const handleScene=()=>paint((x,y)=>inBody(x,y)||inHandle(x,y),dark);
// The stored mask of the first failure: body and handle, with the opening filled as if it were product.
const filledMask=()=>{const m=Buffer.alloc(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inBody(x,y)||ring(x,y))m[y*W+x]=255;return m;};
const box={x:60,y:55,width:120,height:58};

test('an opening the mask filled is cleared from the original\'s own backdrop; the handle, the body and everything outside the box keep the stored mask',()=>{
  const rgb=handleScene(),mask=filledMask();
  const {mask:out,record}=applyScopedRepair({rgb,mask,width:W,height:H},[{kind:'clear_retained_backdrop',box}]);
  assert.equal(record.outside_boxes_unchanged,true);
  // Product more than the edge band (band px) from the opening stays fully opaque; within the band a dark textured pixel
  // is matted against its darkest neighbour, so it may lose a few percent of alpha, never more than a fifth.
  const near=(x,y)=>{for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(inOpening(x+dx,y+dy))return true;return false;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=y*W+x,inside=x>=box.x&&x<box.x+box.width&&y>=box.y&&y<box.y+box.height;
    if(!inside)assert.equal(out[p],mask[p],'outside the box nothing changes');
    else if(inHandle(x,y)||inBody(x,y)){if(near(x,y))assert.ok(out[p]>=200,`edge product stays essentially opaque at ${x},${y}`);else assert.equal(out[p],255,`product stays opaque at ${x},${y}`);}
  }
  // The opening's interior (two pixels in from the handle and the body) is transparent; the old mask kept all of it.
  let opening=0,cleared=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inOpening(x,y)&&inOpening(x-2,y)&&inOpening(x+2,y)&&inOpening(x,y-2)&&y+2<110){opening++;if(out[y*W+x]===0)cleared++;}
  assert.ok(opening>500);assert.equal(cleared,opening);
  assert.equal(record.operations[0].kind,'clear_retained_backdrop');assert.ok(record.operations[0].cleared_pixels>500);
  assert.ok(record.backdrop.sigma.every(s=>s<1),'the measured backdrop is smooth');
});

test('the repaired master keeps every opaque product pixel of the original, passes the existing check, and records the opening as a real hole',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-scoped-TEST-ONLY-'));
  try{
    const rgb=handleScene(),mask=filledMask(),original=await sharp(rgb,{raw:{width:W,height:H,channels:3}}).png().toBuffer();
    const repair=applyScopedRepair({rgb,mask,width:W,height:H},[{kind:'clear_retained_backdrop',box}]);
    const {png}=await repairedCutoutMaster({original,mask:repair.mask,width:W,height:H},sharp);
    const {png:filled}=await repairedCutoutMaster({original,mask,width:W,height:H},sharp);
    const files={original:join(root,'o.png'),repaired:join(root,'r.png'),filled:join(root,'f.png')};
    await writeFile(files.original,original);await writeFile(files.repaired,png);await writeFile(files.filled,filled);
    const of={path:files.original,sha256:sha(original)};
    const repaired=await validateCutoutMaster({original:of,cutout:{path:files.repaired,sha256:sha(png),producer:'TEST-ONLY'}},sharp);
    assert.equal(repaired.passed,true,repaired.failures.join());
    assert.equal(repaired.product_pixels.changed_opaque_pixels,0);assert.equal(repaired.product_pixels.opaque_identical_to_original,true);
    assert.ok(repaired.enclosed_regions.background_holes>=1);assert.equal(repaired.enclosed_regions.product_material,0);
    // The existing check is unchanged: the filled master still passes it (the scoped repair adds no new gate);
    // the difference is exactly the opening, which only the independent visual review judges.
    const old=await validateCutoutMaster({original:of,cutout:{path:files.filled,sha256:sha(filled),producer:'TEST-ONLY'}},sharp);
    assert.equal(old.passed,true);assert.equal(old.enclosed_regions.background_holes,0);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('a small slot through the product joins only when a plan asks (hole_tolerance); a thin backdrop-coloured sliver along an edge never does',()=>{
  // A slot of backdrop with JPEG-like ringing (up to 10 levels) cut through the handle, and a one-pixel light line on it.
  const slot=(x,y)=>x>=79&&x<87&&y>=89&&y<97,line=(x,y)=>y===70&&x>=110&&x<130;
  const rgb=paint((x,y)=>(inBody(x,y)||inHandle(x,y))&&!slot(x,y),(x,y)=>line(x,y)?237:dark(x,y));
  for(let y=89;y<97;y++)for(let x=79;x<87;x++){assert.ok(inHandle(x,y),'the slot lies inside the handle');const v=backdrop(x,y)+((x+y)%3===0?9:-7);rgb.fill(v,(y*W+x)*3,(y*W+x)*3+3);}
  const mask=filledMask(),op={kind:'clear_retained_backdrop',box};
  const plain=applyScopedRepair({rgb,mask,width:W,height:H},[op]).mask;
  const holes=applyScopedRepair({rgb,mask,width:W,height:H},[{...op,hole_tolerance:16}]);
  const at=(m,x,y)=>m[y*W+x];
  assert.equal(at(plain,82,92),255,'without the opt-in the slot keeps the stored mask');
  assert.equal(at(holes.mask,82,92),0,'with it, the enclosed slot is backdrop and becomes transparent');
  assert.equal(holes.record.operations[0].enclosed_backdrop_holes.length,1);
  for(let x=112;x<128;x++)assert.equal(at(holes.mask,x,70),255,'a one-pixel light line on the material stays opaque');
});

// The second failure class: a thin part hanging below the body that the stored mask lost, except for a coarse blob.
const chainDot=(x,y)=>{for(let i=0;i<9;i++){const cx=78+i*12,cy=176+Math.round(10*Math.sin(i/8*Math.PI));if(Math.hypot(x-cx,y-cy)<4)return true;}return false;};
const chainScene=()=>paint((x,y)=>inBody(x,y)||chainDot(x,y),dark);
function chainMasks(){
  const stored=Buffer.alloc(W*H),crop=Buffer.alloc(200*80),outline=Buffer.alloc(200*80);
  // The stored mask: the body with a soft edge, and a coarse band (thin, as a whole-image mask draws a chain) over the
  // first links and the floor around them, apart from the body.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;
    if(inBody(x,y))stored[p]=255;else if(x>=60&&x<180&&y>=170&&y<174)stored[p]=Math.max(0,255-(y-169)*70);
    if(x>=66&&x<140&&y>=175&&y<189)stored[p]=Math.max(stored[p],255);}
  for(let y=0;y<80;y++)for(let x=0;x<200;x++){const X=x+20,Y=y+120;
    if(chainDot(X,Y))crop[y*200+x]=outline[y*200+x]=255;
    if(X>=58&&X<182&&Y<173&&Y>=120)outline[y*200+x]=255;}                        // a crop that also outlines the body, 3 px lower
  return {stored,crop,outline};
}
const thinBox={x:40,y:150,width:160,height:45};

test('a lost thin part is restored from a crop mask of the original; the coarse stored blob beyond the body is replaced; nothing else changes',()=>{
  const rgb=chainScene(),{stored,crop}=chainMasks();
  const {mask:out,record}=applyScopedRepair({rgb,mask:stored,width:W,height:H},[{kind:'restore_from_crop_masks',box:thinBox,crop_masks:[{x:20,y:120,width:200,height:80,mask:crop}]}]);
  let dots=0,restored=0,blobFloor=0,blobCleared=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x,inside=x>=thinBox.x&&x<thinBox.x+thinBox.width&&y>=thinBox.y&&y<thinBox.y+thinBox.height;
    if(!inside){assert.equal(out[p],stored[p]);continue;}
    if(chainDot(x,y)){dots++;if(out[p]===255)restored++;}
    else if(y>=181&&stored[p]===255&&!inBody(x,y)){blobFloor++;if(out[p]===0)blobCleared++;}}
  assert.ok(dots>300);assert.equal(restored,dots,'every photographed link is opaque');
  assert.ok(blobFloor>200);assert.equal(blobCleared,blobFloor,'the floor the coarse band held, beyond the body edge zone, is transparent again');
  for(let x=60;x<180;x+=7)for(let y=150;y<172;y++)assert.equal(out[y*W+x],stored[y*W+x],'the body and its own edge keep the stored mask');
  assert.ok(record.operations[0].raised_pixels>0&&record.operations[0].lowered_pixels>0);
});

test('protect_body: a crop that also outlines the body never moves the body\'s own edge (no second, parallel edge); feather meets the stored mask at the box side',()=>{
  const rgb=chainScene(),{stored,outline}=chainMasks(),crops=[{x:20,y:120,width:200,height:80,mask:outline}];
  const raised=applyScopedRepair({rgb,mask:stored,width:W,height:H},[{kind:'restore_from_crop_masks',box:thinBox,crop_masks:crops}]).mask;
  const kept=applyScopedRepair({rgb,mask:stored,width:W,height:H},[{kind:'restore_from_crop_masks',box:thinBox,crop_masks:crops,protect_body:true}]);
  assert.equal(kept.record.operations[0].crops[0].outlines_body,true);
  let movedRaised=0,movedKept=0;
  for(let y=170;y<174;y++)for(let x=62;x<178;x++){const p=y*W+x;if(raised[p]!==stored[p])movedRaised++;if(kept.mask[p]!==stored[p])movedKept++;}
  assert.ok(movedRaised>0,'without protection the outlining crop redraws the edge');
  assert.equal(movedKept,0,'with protection the body edge is the stored one');
  // Beyond the body's edge zone (body_edge px below the body) the thin part is still restored from that crop.
  for(let y=181;y<H;y++)for(let x=0;x<W;x++)if(chainDot(x,y))assert.equal(kept.mask[y*W+x],255,'the thin part beyond the body edge is still restored');
  // A box side crossing the body edge: with feather the column at the side equals the stored mask exactly.
  const side={x:100,y:150,width:100,height:45};
  const feathered=applyScopedRepair({rgb,mask:stored,width:W,height:H},[{kind:'restore_from_crop_masks',box:side,crop_masks:crops,feather:16}]).mask;
  const hard=applyScopedRepair({rgb,mask:stored,width:W,height:H},[{kind:'restore_from_crop_masks',box:side,crop_masks:crops}]).mask;
  let stepHard=0,stepFeathered=0;
  for(let y=165;y<176;y++){stepHard=Math.max(stepHard,Math.abs(hard[y*W+100]-hard[y*W+99]));stepFeathered=Math.max(stepFeathered,Math.abs(feathered[y*W+100]-feathered[y*W+99]));}
  assert.ok(stepHard>=100,'a hard box side leaves a step in the edge');assert.equal(stepFeathered,0,'the feathered side meets the stored mask');
});

test('plans are bounded: unknown operations, overlapping boxes, misplaced or out-of-range options and an unmeasurable backdrop are refused; defaults are untouched',()=>{
  const rgb=handleScene(),mask=filledMask(),image={rgb,mask,width:W,height:H},op={kind:'clear_retained_backdrop',box};
  assert.throws(()=>applyScopedRepair(image,[]),/at least one operation/);
  assert.throws(()=>applyScopedRepair(image,[{kind:'repaint',box}]),/Unknown scoped repair operation/);
  assert.throws(()=>applyScopedRepair(image,[op,{...op,box:{...box,x:box.x+10}}]),/may not overlap/);
  assert.throws(()=>applyScopedRepair(image,[{...op,box:{...box,width:W}}]),/inside the image/);
  assert.throws(()=>applyScopedRepair(image,[{...op,hole_tolerance:24}]),/hole_tolerance/);
  assert.throws(()=>applyScopedRepair(image,[{...op,band_reference:'max'}]),/band_reference/);
  assert.throws(()=>applyScopedRepair(image,[{...op,open_min_pixels:10}]),/open_min_pixels/);
  assert.throws(()=>applyScopedRepair(image,[{...op,protect_body:true}]),/protect_body/);
  assert.throws(()=>applyScopedRepair(image,[{...op,feather:8}]),/feather/);
  assert.throws(()=>applyScopedRepair(image,[{kind:'restore_from_crop_masks',box}]),/at least one crop mask/);
  const textured=Buffer.from(rgb);for(let p=0;p<W*H;p++)if(!mask[p]){const v=200+((p*7919)%50);textured.fill(v,p*3,p*3+3);}
  assert.throws(()=>photographedBackdrop({rgb:textured,mask,width:W,height:H}),/not smooth enough/);
  assert.equal(Object.isFrozen(scopedRepairLimits),true);assert.equal(scopedRepairLimits.hole_tolerance,undefined);assert.equal(scopedRepairLimits.protect_body,undefined);
  // The same inputs always give the same mask.
  assert.equal(sha(applyScopedRepair(image,[op]).mask),sha(applyScopedRepair(image,[op]).mask));
});

// A wider scene for the full run: the flat tile needs a product of at least 653 px (flat-tile.mjs), as a real photograph has.
const RW=760,RH=400;
const runScene=()=>{
  const body=(x,y)=>x>=40&&x<720&&y>=250&&y<330,ell=(x,y,rx,ry)=>y<250&&Math.hypot((x-380)/rx,(y-250)/ry)<1;
  const rgb=Buffer.alloc(RW*RH*3),mask=Buffer.alloc(RW*RH);
  for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const p=y*RW+x,product=body(x,y)||(ell(x,y,320,200)&&!ell(x,y,280,165));
    rgb.fill(product?dark(x,y):backdrop(x,y)+noise(),p*3,p*3+3);if(body(x,y)||ell(x,y,320,200))mask[p]=255;}
  return {rgb,mask,box:{x:50,y:40,width:660,height:216}};
};

test('a private run checks every input by sha256, writes each file once (never over an earlier run), keeps the rejected files untouched and refuses to reproduce them',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-scoped-run-TEST-ONLY-'));
  try{
    const {rgb,mask,box:runBox}=runScene(),original=await sharp(rgb,{raw:{width:RW,height:RH,channels:3}}).png().toBuffer();
    const {png:rejected}=await repairedCutoutMaster({original,mask,width:RW,height:RH},sharp);
    const files={original:join(root,'TEST-ONLY-original.png'),mask:join(root,'TEST-ONLY.mask.raw'),cutout:join(root,'TEST-ONLY-rejected-cutout.png'),tile:join(root,'TEST-ONLY-rejected-tile.png')};
    await writeFile(files.original,original);await writeFile(files.mask,mask);await writeFile(files.mask.replace(/\.raw$/,'.json'),JSON.stringify({width:RW,height:RH,instances:1}));
    await writeFile(files.cutout,rejected);await writeFile(files.tile,Buffer.from('TEST-ONLY rejected tile placeholder'));
    const plan={ref:'TESTREF-SCOPED',out:join(root,'out'),original:{path:files.original,sha256:sha(original)},mask:{path:files.mask,sha256:sha(mask)},
      rejected:{cutout:{path:files.cutout,sha256:sha(rejected)},tile:{path:files.tile,sha256:sha(await readFile(files.tile))}},
      operations:[{kind:'clear_retained_backdrop',box:runBox}],closeups:[{x:80,y:200,width:60,height:40,zoom:3}]};
    const before=await Promise.all(Object.values(files).map(async f=>sha(await readFile(f))));
    const result=await runScopedRepair(plan,sharp);
    const record=JSON.parse(await readFile(result.record,'utf8'));
    assert.equal(record.check.passed,true);assert.equal(record.check.opaque_identical_to_original,true);assert.equal(record.repair.outside_boxes_unchanged,true);
    assert.notEqual(result.cutout_sha256,plan.rejected.cutout.sha256);
    assert.equal(record.regression[0].visible_backdrop_like_pixels.repaired<record.regression[0].visible_backdrop_like_pixels.rejected,true);
    for(const p of record.proofs)assert.equal(sha(await readFile(p.path)),p.sha256);
    assert.equal(record.code.sha256,sha(await readFile(new URL('./scoped-mask-repair.mjs',import.meta.url))),'the exact module source is recorded');
    assert.ok((await readdir(join(plan.out,'evidence'))).some(f=>f.startsWith('scoped-mask-repair.')),'and kept beside the outputs');
    assert.equal((await stat(join(plan.out,'cutouts',result.cutout_sha256+'.png'))).mode&0o777,0o600);
    assert.deepEqual(await Promise.all(Object.values(files).map(async f=>sha(await readFile(f)))),before,'inputs and rejected files are only read');
    await assert.rejects(runScopedRepair(plan,sharp),/EEXIST/,'a second run never overwrites the first');
    await writeFile(files.original,Buffer.concat([original,Buffer.from([0])]));
    await assert.rejects(runScopedRepair({...plan,out:join(root,'out2')},sharp),/Original differs from its recorded sha256/);
    await writeFile(files.original,original);
    await assert.rejects(runScopedRepair({...plan,out:join(root,'out3'),rejected:{...plan.rejected,cutout:{path:files.cutout,sha256:'0'.repeat(64)}}},sharp),/Rejected cutout differs/);
  }finally{await rm(root,{recursive:true,force:true});}
});
