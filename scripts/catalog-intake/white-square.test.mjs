import test from 'node:test';
import assert from 'node:assert/strict';
import {installedImageEngine} from './responsive-media.mjs';
import {edgeContact,foregroundBox,normalizeWhiteSquare,squareGeometry,whiteSquare} from './white-square.mjs';

// Synthetic cutouts only: no network, no private file, no published asset.
const rgba=(width,height,pixel)=>{const data=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(pixel(x,y),(y*width+x)*4);return data;};
// A 100x60 master: a 40x20 product (a gradient, so any change shows) at (10,30); everything else transparent.
const product=(x,y)=>x>=10&&x<50&&y>=30&&y<50?[x*5,y*4,200,255]:[0,0,0,0];

test('the true foreground box comes from alpha, and contact with a frame edge is reported',()=>{
  const data=rgba(100,60,product);
  assert.deepEqual(foregroundBox(data,100,60),{left:10,top:30,width:40,height:20});
  assert.deepEqual(edgeContact(data,100,60),{top:0,bottom:0,start:0,end:0});
  const cut=rgba(100,60,(x,y)=>x>=20&&x<60?[1,2,3,255]:[0,0,0,0]);
  assert.deepEqual(edgeContact(cut,100,60),{top:40,bottom:40,start:0,end:0},'a product running off the top and bottom of the photograph');
  assert.equal(foregroundBox(rgba(4,4,()=>[0,0,0,10]),4,4),undefined,'faint noise below the threshold is not a product');
});

test('the square puts the longest extent at 80% of its side, centred, and never scales up',()=>{
  assert.deepEqual(squareGeometry({left:0,top:0,width:40,height:20}),{nativeSide:50,side:50,scale:1,extend:{left:5,right:5,top:15,bottom:15},fill:0.8});
  const big=squareGeometry({left:0,top:0,width:1500,height:1200});
  assert.deepEqual([big.nativeSide,big.side,big.scale,big.fill],[1875,1600,0.853333,0.8],'a large source is only scaled down to the 1600 px side');
  assert.equal(squareGeometry({left:0,top:0,width:10,height:9}).side,13,'a small product stays small; no upscaling');
  assert.throws(()=>squareGeometry({width:1,height:1},{fill:1.2,maxSide:10}),/fill/);
  assert.deepEqual({...whiteSquare},{version:1,background:'#ffffff',fill:0.8,alphaThreshold:16,maxSide:1600});
});

test('normalization keeps every product pixel, adds only white, and records the geometry truthfully',async()=>{
  const sharp=installedImageEngine();
  const master=await sharp(rgba(100,60,product),{raw:{width:100,height:60,channels:4}}).png().toBuffer();
  const {png,record}=await normalizeWhiteSquare(master,sharp);
  const meta=await sharp(png).metadata();
  assert.deepEqual([meta.channels,meta.hasAlpha],[3,false],'fully opaque: no transparent margins anywhere');
  const {data,info}=await sharp(png).raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height,info.channels],[50,50,3]);
  for(const [x,y] of [[0,0],[49,0],[0,49],[49,49]])assert.deepEqual([...data.subarray((y*50+x)*3,(y*50+x)*3+3)],[255,255,255],`corner ${x},${y} is pure white`);
  assert.deepEqual([...data.subarray(0,3)],[255,255,255],'pure white padding');
  // The product's pixel at source (10,30) lands at (5,15); at (49,49) it lands at (44,34). Both are unchanged.
  const at=(x,y)=>[...data.subarray((y*50+x)*3,(y*50+x)*3+3)];
  assert.deepEqual(at(5,15),[50,120,200]);assert.deepEqual(at(44,34),[245,196,200]);
  assert.deepEqual(at(4,15),[255,255,255]);assert.deepEqual(at(45,15),[255,255,255]);
  assert.deepEqual([record.treatment,record.geometry.fill,record.box,record.clipped_by_source],[{kind:'white_square',version:1},0.8,{left:10,top:30,width:40,height:20},false]);
  assert.match(record.square_sha256,/^[a-f0-9]{64}$/);
  await assert.rejects(normalizeWhiteSquare(await sharp(rgba(8,8,()=>[0,0,0,0]),{raw:{width:8,height:8,channels:4}}).png().toBuffer(),sharp),/no foreground/);
});

