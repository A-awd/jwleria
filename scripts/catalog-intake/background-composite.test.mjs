import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {composeOnBackground,compositeGeometry,runJob} from './background-composite.mjs';

// Synthetic images only: a drawn product with soft edges and a drawn background. Nothing is generated or uploaded.
const sharp=installedImageEngine();
const hash=b=>createHash('sha256').update(b).digest('hex');
const rgba=(w,h,f)=>{const d=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)d.set(f(x,y),(y*w+x)*4);return d;};
const productPng=()=>sharp(rgba(120,90,(x,y)=>{const inside=x>=30&&x<90&&y>=10&&y<80;const edge=(x===29||x===90)&&y>=10&&y<80;return inside?[x*2,y*3,150,255]:edge?[200,10,10,128]:[7,250,7,0];}),{raw:{width:120,height:90,channels:4}}).png().toBuffer();
const backgroundPng=()=>sharp(rgba(64,64,(x,y)=>[200+(x%8),195,180+(y%5),255]),{raw:{width:64,height:64,channels:4}}).png().toBuffer();

test('the product keeps every opaque pixel at native scale; only the background is resized',async()=>{
  const {png,record}=await composeOnBackground(await productPng(),await backgroundPng(),sharp);
  assert.deepEqual(compositeGeometry({width:62,height:70},{fill:0.68}),{side:103,left:20,top:16,fill:0.6796});
  assert.equal(record.changed_opaque_product_pixels,0);
  assert.equal(record.opaque_product_pixels,60*70);
  const {data,info}=await sharp(png).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,info.height,'a square master');
  const at=(x,y)=>[...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)];
  // Source pixel (30,10) is opaque; it lands at its offset inside the true alpha box.
  const {left,top}=record.geometry,box=record.box;
  assert.deepEqual(box,{left:29,top:10,width:62,height:70},'the true alpha box includes the soft edges');
  assert.deepEqual(record.geometry,compositeGeometry(box));
  assert.deepEqual(at(left+30-box.left,top+10-box.top),[60,30,150]);
  assert.notDeepEqual(at(0,0),[7,250,7],'transparent source colours never show');
  assert.equal(record.clipped_by_source,false);
});

test('a job composes once per original, passes a transparent source through unchanged, and refuses a changed file',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'jwl-background-TEST-ONLY-'));
  try{
    const p=await productPng(),b=await backgroundPng();
    await writeFile(join(dir,'p.png'),p);await writeFile(join(dir,'b.png'),b);
    const item={reference:'TEST-1',colour:'test',product_path:join(dir,'p.png'),product_sha256:hash(p)};
    const records=await runJob({items:[{...item,background_path:join(dir,'b.png')},{...item,reference:'TEST-1-again',background_path:join(dir,'b.png')},item],out_directory:join(dir,'out')},sharp);
    assert.equal(records[0].kind,'background_composite');
    assert.equal(records[1].duplicate_of,'TEST-1','the same original and background are processed once');
    assert.equal(records[2].kind,'passthrough');assert.equal(records[2].master_sha256,hash(p),'passthrough keeps the exact source bytes');
    assert.deepEqual(await readFile(join(dir,'out',hash(p)+'.png')),p);
    assert.ok(records[0].variants.every(v=>v.width<=records[0].geometry.side));
    await assert.rejects(runJob({items:[{...item,product_sha256:'0'.repeat(64)}],out_directory:join(dir,'out2')},sharp),/changed/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
