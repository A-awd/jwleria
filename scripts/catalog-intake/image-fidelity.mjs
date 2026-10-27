// Fidelity metrics for lossy derivatives, computed in plain JavaScript on decoded 8-bit RGB pixels so the result
// does not depend on another native library. Deterministic: the same pixels always give the same numbers.

// SSIM (Wang, Bovik, Sheikh, Simoncelli 2004): 11x11 Gaussian window, sigma 1.5, K1 0.01, K2 0.03, L 255,
// computed on BT.601 luma over the "valid" region (windows that fit entirely inside the image).
const radius=5,sigma=1.5;
const kernel=(()=>{const k=[];let sum=0;for(let i=-radius;i<=radius;i++){const v=Math.exp(-(i*i)/(2*sigma*sigma));k.push(v);sum+=v;}return Float64Array.from(k,v=>v/sum);})();
const C1=(0.01*255)**2,C2=(0.03*255)**2;

function luma(rgb,width,height){
  const n=width*height,y=new Float64Array(n);
  for(let i=0,o=0;i<n;i++,o+=3)y[i]=0.299*rgb[o]+0.587*rgb[o+1]+0.114*rgb[o+2];
  return y;
}
function blurValid(source,width,height){
  const w=width-2*radius,h=height-2*radius,rows=new Float64Array(w*height),out=new Float64Array(w*h);
  for(let y=0;y<height;y++)for(let x=0;x<w;x++){let s=0;const o=y*width+x;for(let i=0;i<=2*radius;i++)s+=kernel[i]*source[o+i];rows[y*w+x]=s;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let i=0;i<=2*radius;i++)s+=kernel[i]*rows[(y+i)*w+x];out[y*w+x]=s;}
  return out;
}
function check(a,b,width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||a.length!==width*height*3||b.length!==a.length)throw Error('Fidelity metrics need two RGB images of the same size');
}

/** Mean luma SSIM of b against the reference a (both packed 8-bit RGB, width x height). 1 means identical luma. */
export function lumaSsim(a,b,width,height){
  check(a,b,width,height);
  const A=luma(a,width,height),B=luma(b,width,height);
  if(width<=2*radius||height<=2*radius){
    // Too small for an 11x11 window: one global window over the whole image.
    let ma=0,mb=0;for(let i=0;i<A.length;i++){ma+=A[i];mb+=B[i];}ma/=A.length;mb/=A.length;
    let va=0,vb=0,cv=0;for(let i=0;i<A.length;i++){const da=A[i]-ma,db=B[i]-mb;va+=da*da;vb+=db*db;cv+=da*db;}va/=A.length;vb/=A.length;cv/=A.length;
    return ((2*ma*mb+C1)*(2*cv+C2))/((ma*ma+mb*mb+C1)*(va+vb+C2));
  }
  const AA=new Float64Array(A.length),BB=new Float64Array(A.length),AB=new Float64Array(A.length);
  for(let i=0;i<A.length;i++){AA[i]=A[i]*A[i];BB[i]=B[i]*B[i];AB[i]=A[i]*B[i];}
  const ma=blurValid(A,width,height),mb=blurValid(B,width,height),saa=blurValid(AA,width,height),sbb=blurValid(BB,width,height),sab=blurValid(AB,width,height);
  let sum=0;
  for(let i=0;i<ma.length;i++){
    const m1=ma[i],m2=mb[i],v1=saa[i]-m1*m1,v2=sbb[i]-m2*m2,cv=sab[i]-m1*m2;
    sum+=((2*m1*m2+C1)*(2*cv+C2))/((m1*m1+m2*m2+C1)*(v1+v2+C2));
  }
  return sum/ma.length;
}

/** PSNR in dB over every RGB sample; Infinity when the pixels are identical (recorded as null in JSON). */
export function rgbPsnr(a,b,width,height){
  check(a,b,width,height);
  let error=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];error+=d*d;}
  return error===0?Infinity:10*Math.log10(255*255/(error/a.length));
}
