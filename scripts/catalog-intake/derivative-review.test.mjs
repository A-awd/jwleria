import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {composeCutoutMaster} from './cutout.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {webpPreviews,derivativeReviewByTile,derivativeReviewProblem} from './batch-official.mjs';
import {freezePreviews,reviewSheets,widthProofs,regionProofs,nativeDecodes,derivativeReviewTemplate} from './derivative-review.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

// A synthetic private batch only: drawn products, their tiles and the existing preview encoder in a temporary directory.
// No product photograph is read; nothing is uploaded, recorded or published.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const W=1000,H=900;

async function batch(){
  const root=await mkdtemp(join(tmpdir(),'jwl-derivative-review-TEST-ONLY-'));
  const put=async(bytes,ext)=>{const s=sha(bytes),path=join(root,`${s}.${ext}`);await writeFile(path,bytes);return {path,sha256:s};};
  // A cutout-based item: an opaque drawn bag with a handle opening, and its background-only cutout.
  const inBody=(x,y)=>x>=150&&x<850&&y>=150&&y<850,inHole=(x,y)=>x>=400&&x<600&&y>=200&&y<320;
  const raw=Buffer.alloc(W*H*3),mask=Buffer.alloc(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const body=inBody(x,y)&&!inHole(x,y);raw.set(body?(((x>>4)+(y>>4))&1?[120,30,40]:[200,170,120]):[236,237,238],(y*W+x)*3);if(body)mask[y*W+x]=255;}
  const original=await sharp(raw,{raw:{width:W,height:H,channels:3}}).png().toBuffer(),o=await put(original,'png');
  const cut=await put(await composeCutoutMaster({original,mask,width:W,height:H},sharp),'png');
  const tile=await put((await normalizeFlatTile(await readFile(cut.path),sharp)).png,'png');
  // A native-alpha item, larger, so its detail width differs.
  const alpha=Buffer.alloc(1300*1300*4);for(let y=100;y<1200;y++)for(let x=100;x<1200;x++)alpha.set([30+(x%50),60,90+(y%40),255],(y*1300+x)*4);
  const native=await put(await sharp(alpha,{raw:{width:1300,height:1300,channels:4}}).png().toBuffer(),'png');
  const nTile=await put((await normalizeFlatTile(await readFile(native.path),sharp)).png,'png');
  const results={
    'test-only-official:TESTREF-B':{ref:'TESTREF-B',model:'TEST-ONLY',colour:'Blue',original:{...native,has_alpha:true},tile:{...nTile,side:1618}},
    'test-only-official:TESTREF-A':{ref:'TESTREF-A',model:'TEST-ONLY',colour:'Wine/sand',original:{...o,has_alpha:false},tile:{...tile,side:1030},
      cutout:{...cut,producer:'TEST-ONLY local mask'},adopted_review:{reviewer:'TEST-ONLY reviewer'},rejected:[{cutout_sha256:'c'.repeat(64),tile_sha256:'d'.repeat(64),status:'TEST-ONLY negative'}]}};
  await writeFile(join(root,'results.json'),JSON.stringify(results,null,1));
  return {root,results,tile,nTile};
}

test('prepared previews are verified and frozen once; sheets, native evidence and a blank review template follow the frozen order',async()=>{
  const b=await batch();
  try{
    assert.deepEqual(await webpPreviews({out:b.root}),{tiles:2,files:8,performance_review_required:0});
    // A preview that no longer matches its record is refused, and nothing is frozen.
    const previewsPath=join(b.root,'previews.json'),good=await readFile(previewsPath,'utf8'),bad=JSON.parse(good);
    bad[b.nTile.sha256].variants[1].bytes+=1;
    await writeFile(previewsPath,JSON.stringify(bad));
    await assert.rejects(freezePreviews({out:b.root}),/A preview differs from its record: TESTREF-B 640w/);
    const wrong=JSON.parse(good);wrong[b.tile.sha256].variants.pop();
    await writeFile(previewsPath,JSON.stringify(wrong));
    await assert.rejects(freezePreviews({out:b.root}),/widths differ from the supported set for TESTREF-A/);
    await writeFile(previewsPath,good);
    await assert.rejects(reviewSheets({out:b.root}),/ENOENT/,'proofs come only from a frozen index');

    assert.deepEqual(await freezePreviews({out:b.root}),{items:2,files:8,flagged:0,stale:0});
    const index=JSON.parse(await readFile(join(b.root,'derivatives-index.json'),'utf8'));
    assert.deepEqual(index.items.map(i=>[i.label,i.ref,i.side,i.files.map(f=>f.width),i.repaired]),[['001','TESTREF-A',1030,[320,640,960,1030],true],['002','TESTREF-B',1618,[320,640,960,1600],false]]);
    assert.deepEqual(index.items[1].files.map(f=>f.role),['card','card','card','detail']);
    assert.deepEqual(index.counts.by_width,{320:2,640:2,960:2,detail:2});
    for(const f of index.items.flatMap(i=>i.files))assert.equal((await stat(f.path)).mode&0o222,0,'a frozen preview is read-only');
    assert.equal((await stat(join(b.root,'derivatives-index.json'))).mode&0o777,0o400);
    await assert.rejects(freezePreviews({out:b.root}),/EEXIST/,'the index is written once');

    await assert.rejects(reviewSheets({out:b.root,per_sheet:5}),/one to four sets/);
    assert.deepEqual(await reviewSheets({out:b.root,per_sheet:1}),{sheets:2,sets:2});
    const sheets=JSON.parse(await readFile(join(b.root,'proofs','sheets','index.json'),'utf8'));
    assert.deepEqual(sheets.sheets.map(s=>s.sets.map(x=>x.label)),[['001'],['002']]);
    assert.deepEqual(sheets.sheets[1].sets[0].derivatives.map(d=>d.sha256),index.items[1].files.map(f=>f.sha256),'every exact hash is indexed');
    const page=await sharp(sheets.sheets[0].file).metadata();
    assert.deepEqual([page.width,page.height],[5*320+4*6,34+26+320+40],'the frame and four widths, each at 320 px');
    assert.equal(sheets.sheets[0].sha256,sha(await readFile(sheets.sheets[0].file)));

    await assert.rejects(widthProofs({out:b.root,tile_sha256s:['f'.repeat(64)]}),/exact tiles of frozen derivative sets/);
    assert.deepEqual(await widthProofs({out:b.root,tile_sha256s:[b.tile.sha256]}),{proofs:1});
    assert.deepEqual(await regionProofs({out:b.root,key:'test-only-official:TESTREF-A',regions:[{label:'handle opening',box:{x:380,y:180,width:240,height:160}}]}),{proofs:1});
    const regions=JSON.parse(await readFile(join(b.root,'proofs','repairs','001-TESTREF-A','index.json'),'utf8'));
    assert.deepEqual(regions.offset_to_tile,{dx:165-150,dy:165-150},'the cutout frame maps onto the tile by the tile step\'s own geometry');
    await assert.rejects(regionProofs({out:b.root,key:'test-only-official:TESTREF-B',regions:[{label:'x',box:{x:0,y:0,width:10,height:10}}]}),/current cutout-based tile/);
    assert.deepEqual(await nativeDecodes({out:b.root,tile_sha256s:[b.tile.sha256]}),{files:4});
    for(const f of index.items[0].files){
      const png=join(b.root,'proofs','decoded','001-TESTREF-A',`${f.width}w-${f.sha256}.png`);
      assert.ok((await sharp(png).raw().toBuffer()).equals(await sharp(f.path).raw().toBuffer()),'a decode holds exactly the WebP pixels');
    }

    assert.deepEqual(await derivativeReviewTemplate({out:b.root}),{reviews:8});
    const template=JSON.parse(await readFile(join(b.root,'proofs','derivative-review-template.json'),'utf8'));
    assert.ok(template.reviews.every(r=>r.reviewer===null&&r.accepted===null&&r.decision===null&&r.note===null),'code never fills a decision');
    assert.equal(template.reviewer,null);
    const files=index.items[0].files.map(({width,sha256})=>({width,sha256}));
    assert.match(derivativeReviewProblem(derivativeReviewByTile(template),{tile_sha256:b.tile.sha256,files}),/needs its reviewer|not reviewed and passed/,'a blank template never passes the gate');
    assert.deepEqual((await readdir(join(b.root,'proofs'))).sort(),['decoded','derivative-review-template.json','repairs','sheets','widths']);
  }finally{await rm(b.root,{recursive:true,force:true});}
});

test('both helpers load as command-line entry points (their module imports evaluate in a working order)',async()=>{
  for(const name of ['derivative-review.mjs','adopt-reviewed-repair.mjs']){
    const script=fileURLToPath(new URL(name,import.meta.url));
    await assert.rejects(promisify(execFile)(process.execPath,[script]),error=>/Usage: node /.test(error.stderr)&&!/ReferenceError/.test(error.stderr),name);
  }
});
