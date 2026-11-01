import test from 'node:test';
import assert from 'node:assert/strict';
import {BUDGET,alphaFlags,alphaReport,fidelity,geometryChecks,parseNetpbm,rgbOf} from './image-quality-gate.mjs';

// Synthetic images only: no network, no private file, no published asset.
const rgba=(width,height,pixel)=>{const data=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(pixel(x,y),(y*width+x)*4);return {width,height,channels:4,data};};
const disc=(width,height,soft=0)=>rgba(width,height,(x,y)=>{const d=Math.hypot(x-width/2,y-height/2),r=Math.min(width,height)/3;const a=d<=r?255:d<=r+soft?Math.round(255*(1-(d-r)/soft)):0;return [40,40,40,a];});
const record={width:960,height:720,bytes:145594,sha256:'a'.repeat(64)};
const file={bytes:145594,sha256:'a'.repeat(64)};
const failed=results=>results.filter(r=>!r.pass).map(r=>r.check);

test('PPM and PAM images from dwebp are read with their size and channels',()=>{
  const ppm=Buffer.concat([Buffer.from('P6\n2 1\n255\n','latin1'),Buffer.from([255,0,0,0,255,0])]);
  assert.deepEqual({...parseNetpbm(ppm),data:[...parseNetpbm(ppm).data]},{width:2,height:1,channels:3,data:[255,0,0,0,255,0]});
  const pam=Buffer.concat([Buffer.from('P7\nWIDTH 1\nHEIGHT 1\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n','latin1'),Buffer.from([10,20,30,0])]);
  const image=parseNetpbm(pam);assert.deepEqual([image.width,image.height,image.channels],[1,1,4]);
  assert.deepEqual([...rgbOf(image)],[255,255,255],'a transparent pixel reads as the white page behind it');
  assert.throws(()=>parseNetpbm(Buffer.from('P5\n1 1\n255\n\0','latin1')),/PPM P6 or PAM P7/);
});

test('a faithful derivative passes; enlargement, crop, distortion, wrong size, changed bytes and budget are rejected',()=>{
  const original={width:960,height:720};
  assert.deepEqual(failed(geometryChecks({record,file,decoded:{width:960,height:720},original})),[]);
  assert.deepEqual(failed(geometryChecks({record:{...record,width:640,height:480,bytes:78538},file:{...file,bytes:78538},decoded:{width:640,height:480},original})),[]);
  assert.ok(failed(geometryChecks({record:{...record,width:1200,height:900},file,decoded:{width:1200,height:900},original})).includes('no enlargement'));
  assert.ok(failed(geometryChecks({record:{...record,height:700},file,decoded:{width:960,height:700},original})).includes('aspect kept (no crop or distortion)'),'a cropped or squeezed file');
  assert.ok(failed(geometryChecks({record,file,decoded:{width:960,height:721},original})).includes('decoded size matches srcset'));
  assert.deepEqual(failed(geometryChecks({record,file,decoded:{width:960,height:721},original:{width:960,height:721}})),['decoded size matches srcset']);
  assert.ok(failed(geometryChecks({record,file:{...file,sha256:'b'.repeat(64)},decoded:{width:960,height:720},original})).includes('sha256 matches the record'));
  assert.ok(failed(geometryChecks({record:{...record,bytes:BUDGET.card+1},file:{...file,bytes:BUDGET.card+1},decoded:{width:960,height:720},original})).some(c=>/budget/.test(c)));
  assert.deepEqual(failed(geometryChecks({record:{width:1588,height:1676,bytes:359862,sha256:'a'.repeat(64)},file:{bytes:359862,sha256:'a'.repeat(64)},decoded:{width:1588,height:1676},original:{width:1588,height:1676}})),[],'a detail file has the 600,000 B budget');
});

test('a cutout is reported by corners, frame edges and its soft band; clipping and halo are flagged, never passed silently',()=>{
  const clean=alphaReport(disc(120,120,2));
  assert.equal(clean.cornersTransparent,true);assert.deepEqual(Object.values(clean.edges),[0,0,0,0]);
  assert.deepEqual(alphaFlags(clean),[]);
  const clipped=alphaReport(rgba(60,60,(x,y)=>[0,0,0,x<4&&y>10&&y<50?255:0]));
  assert.ok(alphaFlags(clipped).some(f=>/start edge/.test(f)),'an opaque run on the frame edge');
  const halo=alphaReport(disc(160,160,12));
  assert.ok(alphaFlags(halo).some(f=>/halo/.test(f)),`soft band ${halo.softBandPx}px`);
  const flat=alphaReport(rgba(10,10,()=>[1,2,3,255]));
  assert.ok(alphaFlags(flat).some(f=>/corner/.test(f)),'no transparency is not a cutout');
  assert.deepEqual(alphaReport({width:1,height:1,channels:3,data:new Uint8Array(3)}),{cutout:false});
});

test('fidelity compares the same pixels to 1 and refuses different sizes',()=>{
  const a=disc(40,30);
  assert.deepEqual(fidelity(a,a),{ssim:1,psnr:Infinity});
  const b={...a,data:a.data.map((v,i)=>i%4===3?v:Math.min(255,v+40))};
  assert.ok(fidelity(a,b).ssim<1);
  assert.throws(()=>fidelity(a,disc(40,31)),/same size/);
});
