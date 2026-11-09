import {inflateSync} from 'node:zlib';

// Lossless channel standardisation for the image checks (decision 0010 implementation rule, not an owner approval).
// An untagged 8-bit greyscale PNG, with or without alpha, is the same picture as 8-bit RGB with R=G=B=grey: its stored
// grey value is copied into the three channels and its alpha is kept, byte for byte. The stored values are read here
// directly from the PNG data (zlib and the five PNG row filters), so no colour conversion of any image library is
// involved; no profile, colourization, retouch or resize is applied, and the written pixels are read back and compared.
// The untouched original stays identified by its own sha256; this is only how its pixels are read.

export const greyDecoding=Object.freeze({kind:'grey_replicated_to_rgb',version:1});
const options={failOn:'warning',limitInputPixels:60000000};

/** A source refused here is an unsupported format, never a resolution problem. */
export const unsupportedFormat=detail=>Error('Unsupported image format: '+detail);

// The chunks of a PNG, in order, with their data.
function pngChunks(bytes){
  if(bytes.length<8||bytes.readUInt32BE(0)!==0x89504e47||bytes.readUInt32BE(4)!==0x0d0a1a0a)throw unsupportedFormat('not a PNG');
  const chunks=[];
  for(let offset=8;offset+12<=bytes.length;){
    const size=bytes.readUInt32BE(offset),type=bytes.toString('latin1',offset+4,offset+8);
    if(offset+12+size>bytes.length)throw unsupportedFormat('truncated PNG chunk');
    chunks.push({type,data:bytes.subarray(offset+8,offset+8+size)});
    offset+=12+size;
    if(type==='IEND')break;
  }
  return chunks;
}

/**
 * The stored samples of an 8-bit, non-interlaced greyscale PNG (colour type 0, or 4 with alpha), decoded from its IDAT
 * data with the PNG row filters. Refuses anything that would change how those samples are meant to be read: a colour
 * profile (iCCP), gamma (gAMA), chromaticities (cHRM) or a transparency key (tRNS).
 */
export function decodeGreyPng(bytes){
  const chunks=pngChunks(bytes),ihdr=chunks[0]?.type==='IHDR'?chunks[0].data:null;
  if(!ihdr||ihdr.length!==13)throw unsupportedFormat('PNG without its header');
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),depth=ihdr[8],type=ihdr[9],interlace=ihdr[12];
  if(![0,4].includes(type))throw unsupportedFormat('not a greyscale PNG');
  if(depth!==8||interlace!==0||ihdr[10]!==0||ihdr[11]!==0)throw unsupportedFormat('greyscale PNG is not 8-bit and non-interlaced');
  const tagged=chunks.filter(c=>['iCCP','gAMA','cHRM','tRNS'].includes(c.type)).map(c=>c.type);
  if(tagged.length)throw unsupportedFormat('greyscale PNG with '+tagged.join(','));
  if(!width||!height||width*height>60000000)throw unsupportedFormat('greyscale PNG size');
  const bpp=type===4?2:1,stride=width*bpp,raw=inflateSync(Buffer.concat(chunks.filter(c=>c.type==='IDAT').map(c=>c.data)));
  if(raw.length!==height*(stride+1))throw unsupportedFormat('greyscale PNG data length');
  const out=Buffer.alloc(height*stride);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],line=y*(stride+1)+1,row=y*stride,up=row-stride;
    if(filter>4)throw unsupportedFormat('PNG row filter '+filter);
    for(let i=0;i<stride;i++){
      const a=i>=bpp?out[row+i-bpp]:0,b=y?out[up+i]:0,c=i>=bpp&&y?out[up+i-bpp]:0;
      let v=raw[line+i];
      if(filter===1)v+=a;
      else if(filter===2)v+=b;
      else if(filter===3)v+=(a+b)>>1;
      else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      out[row+i]=v&255;
    }
  }
  return {width,height,alpha:type===4,samples:out};
}

/**
 * The source as 8-bit sRGB pixels. An 8-bit sRGB source is returned as it is (decoding null). An untagged 8-bit
 * greyscale PNG (decodeGreyPng) is returned as a PNG whose pixels are R=G=B=grey with the same alpha, after the written
 * file is read back and compared pixel for pixel. Any other source (16-bit, CMYK, a tagged or gamma-tagged grey, a
 * greyscale JPEG or WebP) is refused as an unsupported format.
 */
export async function standardChannels(bytes,sharp){
  const meta=await sharp(bytes,options).metadata();
  if(meta.space==='srgb'&&meta.depth==='uchar')return {bytes,decoding:null};
  if(meta.space!=='b-w'||meta.format!=='png')throw unsupportedFormat(`${meta.format} in colour space ${meta.space}; only 8-bit sRGB or an untagged 8-bit greyscale PNG is read`);
  if(meta.icc||(meta.pages??1)!==1||(meta.orientation??1)!==1)throw unsupportedFormat('greyscale PNG with a profile, pages or an orientation');
  const {width,height,alpha,samples}=decodeGreyPng(bytes);
  if(width!==meta.width||height!==meta.height)throw unsupportedFormat('greyscale PNG header differs from its decode');
  const n=width*height,step=alpha?2:1,out=alpha?4:3,rgb=Buffer.alloc(n*out);
  for(let p=0;p<n;p++){
    const g=samples[p*step];rgb[p*out]=g;rgb[p*out+1]=g;rgb[p*out+2]=g;
    if(alpha)rgb[p*out+3]=samples[p*2+1];
  }
  const png=await sharp(rgb,{raw:{width,height,channels:out}}).png({compressionLevel:9}).toBuffer();
  // The written file must read back as exactly those pixels, as 8-bit sRGB.
  const back=await sharp(png,options).raw().toBuffer({resolveWithObject:true}),m=await sharp(png,options).metadata();
  if(m.space!=='srgb'||m.depth!=='uchar'||back.info.channels!==out||Buffer.compare(back.data,rgb)!==0)throw Error('Greyscale standardisation did not read back exactly');
  return {bytes:png,decoding:{...greyDecoding,width,height,alpha}};
}
