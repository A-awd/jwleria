import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync,crc32} from 'node:zlib';
import {installedImageEngine} from './responsive-media.mjs';
import {standardChannels,decodeGreyPng} from './standard-channels.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {backgroundComposite} from './background-composite.mjs';
import {validateCutoutMaster,strayFragmentMaster,faintDetachedFragments,cutoutLimits} from './cutout.mjs';

// Synthetic greyscale PNGs written byte by byte here (so the expected stored values are known without any image
// library), with every PNG row filter. No product photograph is read; nothing leaves the process.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const chunk=(type,data)=>{const name=Buffer.from(type,'latin1'),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data]))>>>0);return Buffer.concat([size,name,data,crc]);};
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
/** An 8-bit greyscale PNG (colour type 4 with alpha, else 0) of samples, row filters cycling 0..4, plus extra chunks. */
function greyPng({width,height,samples,alpha=true,depth=8,extra=[]}){
  const bpp=alpha?2:1,stride=width*bpp,rows=[];
  for(let y=0;y<height;y++){
    const f=y%5,row=Buffer.alloc(stride+1);row[0]=f;
    for(let i=0;i<stride;i++){
      const x=samples[y*stride+i],a=i>=bpp?samples[y*stride+i-bpp]:0,b=y?samples[(y-1)*stride+i]:0,c=i>=bpp&&y?samples[(y-1)*stride+i-bpp]:0;
      row[1+i]=(x-[0,a,b,(a+b)>>1,paeth(a,b,c)][f])&255;
    }
    rows.push(row);
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=depth;ihdr[9]=alpha?4:0;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),...extra,chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);
}
/** A shoe-like product (grey gradient, opaque, soft edge) on full transparency, as a native-alpha packshot. */
function product(width,height,{extra=(x,y)=>null}={}){
  const s=Buffer.alloc(width*height*2);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=(y*width+x)*2,inside=x>=150&&x<850&&y>=150&&y<650,edge=inside&&(x===150||x===849||y===150||y===649);
    const forced=extra(x,y);
    if(forced){s[p]=forced[0];s[p+1]=forced[1];}
    else if(inside){s[p]=20+((x*3+y*5)%180);s[p+1]=edge?140:255;}
  }
  return s;
}

test('an untagged 8-bit greyscale PNG is read losslessly as R=G=B=grey with its own alpha, for every filter and level',async()=>{
  const width=256,height=10,samples=Buffer.alloc(width*height*2);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){samples[(y*width+x)*2]=(x+y*17)&255;samples[(y*width+x)*2+1]=(x*7+y*31)&255;}
  const png=greyPng({width,height,samples});
  assert.deepEqual(decodeGreyPng(png).samples,samples,'the decoder returns the stored samples');
  const {bytes,decoding}=await standardChannels(png,sharp);
  assert.deepEqual(decoding,{kind:'grey_replicated_to_rgb',version:1,width,height,alpha:true});
  const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true}),m=await sharp(bytes).metadata();
  assert.deepEqual([info.channels,m.space,m.depth,m.icc===undefined],[4,'srgb','uchar',true]);
  for(let p=0;p<width*height;p++){
    const g=samples[p*2],a=samples[p*2+1];
    assert.deepEqual([data[p*4],data[p*4+1],data[p*4+2],data[p*4+3]],[g,g,g,a],'pixel '+p);
  }
  // Without alpha: three equal channels.
  const opaque=greyPng({width,height,samples:Buffer.from(samples.filter((_,i)=>i%2===0)),alpha:false});
  const three=await standardChannels(opaque,sharp),raw=await sharp(three.bytes).raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([three.decoding.alpha,raw.info.channels],[false,3]);
  for(let p=0;p<width*height;p++)assert.ok(raw.data[p*3]===samples[p*2]&&raw.data[p*3+1]===samples[p*2]&&raw.data[p*3+2]===samples[p*2]);
});

test('8-bit sRGB passes unchanged; a tagged, gamma, 16-bit or non-PNG greyscale is refused as an unsupported format',async()=>{
  const rgb=await sharp({create:{width:4,height:4,channels:4,background:{r:10,g:20,b:30,alpha:0.5}}}).png().toBuffer();
  const same=await standardChannels(rgb,sharp);
  assert.equal(same.bytes,rgb);assert.equal(same.decoding,null);
  const samples=Buffer.alloc(8*8*2,100);
  const gamma=Buffer.alloc(4);gamma.writeUInt32BE(45455);
  await assert.rejects(standardChannels(greyPng({width:8,height:8,samples,extra:[chunk('gAMA',gamma)]}),sharp),/^Error: Unsupported image format: greyscale PNG with gAMA/);
  await assert.rejects(standardChannels(greyPng({width:8,height:8,samples:Buffer.alloc(8*8,9),alpha:false,extra:[chunk('tRNS',Buffer.from([0,9]))]}),sharp),/Unsupported image format/);
  const greyJpeg=await sharp(Buffer.alloc(64,90),{raw:{width:8,height:8,channels:1}}).toColourspace('b-w').jpeg().toBuffer();
  assert.equal((await sharp(greyJpeg).metadata()).space,'b-w','a true greyscale JPEG');
  await assert.rejects(standardChannels(greyJpeg,sharp),/Unsupported image format: jpeg/);
  await assert.rejects(standardChannels(await sharp(Buffer.alloc(64*2,90),{raw:{width:8,height:8,channels:1}}).toColourspace('grey16').png().toBuffer(),sharp),/Unsupported image format/);
  assert.throws(()=>decodeGreyPng(rgb),/not a greyscale PNG/);
});

test('a flat tile of a greyscale original is the tile of the same picture written as RGBA, and names its decoding',async()=>{
  const width=1000,height=800,s=product(width,height);
  const grey=greyPng({width,height,samples:s});
  const rgba=Buffer.alloc(width*height*4);for(let p=0;p<width*height;p++){rgba.fill(s[p*2],p*4,p*4+3);rgba[p*4+3]=s[p*2+1];}
  const asRgba=await sharp(rgba,{raw:{width,height,channels:4}}).png().toBuffer();
  const a=await normalizeFlatTile(grey,sharp),b=await normalizeFlatTile(asRgba,sharp);
  assert.equal(a.record.tile_sha256,b.record.tile_sha256,'identical tile bytes');
  assert.equal(a.record.source_sha256,sha(grey),'the untouched original stays identified by its own sha256');
  assert.equal(a.record.decoding.kind,'grey_replicated_to_rgb');assert.equal(b.record.decoding,undefined,'an sRGB source records no decoding');
  // The failure that used to be called low resolution is now a format refusal, named as such.
  const gamma=Buffer.alloc(4);gamma.writeUInt32BE(45455);
  await assert.rejects(normalizeFlatTile(greyPng({width,height,samples:s,extra:[chunk('gAMA',gamma)]}),sharp),/^Error: Unsupported image format/);
});

test('a faint detached stray mark in a source\'s own alpha is removed alone; visible pieces and sub-threshold specks stay',async()=>{
  assert.equal(cutoutLimits.fragment_min_alpha,backgroundComposite.alphaThreshold,'the fragment threshold is the tile framing threshold');
  const width=1000,height=800;
  // A one-pixel vertical line at alpha 40 right of the product, as on the operator's shoe (301 pixels, under the 0.05%
  // size limit of 400 here), a visible detached square, and a speck fainter than the framing threshold.
  const extra=(x,y)=>x===900&&y>=200&&y<501?[223,40]:x>=60&&x<80&&y>=60&&y<80?[90,255]:x>=950&&x<953&&y>=700&&y<703?[200,8]:null;
  const s=product(width,height,{extra}),grey=greyPng({width,height,samples:s});
  const alpha=Buffer.alloc(width*height);for(let p=0;p<width*height;p++)alpha[p]=s[p*2+1];
  const fragments=faintDetachedFragments(alpha,width,height);
  assert.deepEqual(fragments.map(f=>[f.box,f.pixels,f.max_alpha]),[[{x:900,y:200,width:1,height:301},301,40]]);
  const {png,record}=await strayFragmentMaster(grey,sharp);
  assert.deepEqual([record.removed_pixels,record.fragments.length,record.decoding.kind],[301,1,'grey_replicated_to_rgb']);
  const {data}=await sharp(png).raw().toBuffer({resolveWithObject:true});
  let changed=0;
  for(let p=0;p<width*height;p++){
    const want=fragments[0].members.includes(p)?0:alpha[p];
    if(data[p*4+3]!==want)changed++;
    if(want===255)assert.ok(data[p*4]===s[p*2]&&data[p*4+1]===s[p*2]&&data[p*4+2]===s[p*2]);
  }
  assert.equal(changed,0,'only the stray line loses its alpha');
  const root=await mkdtemp(join(tmpdir(),'jwl-stray-TEST-ONLY-'));
  try{
    const originalPath=join(root,'TEST-ONLY-grey.png');await writeFile(originalPath,grey);
    const check=async(bytes,name)=>{const path=join(root,name);await writeFile(path,bytes);return validateCutoutMaster({original:{path:originalPath,sha256:sha(grey)},cutout:{path,sha256:sha(bytes),producer:'TEST-ONLY'}},sharp);};
    const r=await check(png,'TEST-ONLY-master.png');
    assert.equal(r.passed,true,r.failures.join());
    assert.deepEqual(r.source_alpha,{lowered_pixels:301,lowered_visible_pixels:0,raised_pixels:0});
    assert.equal(r.original.decoding.kind,'grey_replicated_to_rgb');
    assert.deepEqual([r.product_pixels.opaque_identical_to_original,r.product_pixels.opaque_max_channel_delta],[true,0]);
    // A master that thins a visible pixel of the source, or adds alpha the source does not have, is refused.
    const thinned=Buffer.from(data);thinned[(400*width+500)*4+3]=100;
    const thin=await check(await sharp(thinned,{raw:{width,height,channels:4}}).png().toBuffer(),'TEST-ONLY-thinned.png');
    assert.ok(thin.failures.includes('source_alpha_lowered_on_visible_pixels'),thin.failures.join());
    const added=Buffer.from(data);added[(100*width+500)*4+3]=255;
    const add=await check(await sharp(added,{raw:{width,height,channels:4}}).png().toBuffer(),'TEST-ONLY-added.png');
    assert.ok(add.failures.includes('alpha_added_beyond_source'),add.failures.join());
  }finally{await rm(root,{recursive:true,force:true});}
  assert.equal(await strayFragmentMaster(greyPng({width,height,samples:product(width,height)}),sharp),null,'no fragment, no master');
});
