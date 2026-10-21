// Match the existing two/three/four-column grid. Large originals never enter a card srcset.
const threeColumns='(min-width: 100rem) 470px, (min-width: 56rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(2rem, 5vw, 4rem)) / 3), calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(1rem, 2.5vw, 2rem)) / 2)';
const cardSizes=`(min-width: 100rem) 344px, (min-width: 80rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - 6rem) / 4), ${threeColumns.replace('(min-width: 100rem) 470px, ','')}`;
const detailSizes='(min-width: 100rem) 840px, (min-width: 60rem) 54vw, 86vw';
const secondaryDetailSizes='(min-width: 100rem) 414px, (min-width: 60rem) calc(27vw - .375rem), 86vw';

/** @param {import('../contracts/catalog').PublicProduct} product */
export function productMedia(product,index=0,kind='card',columns=4){
 const src=product.images[index];
 if(!src)throw new Error('Product image missing');
 const image=product.imageVariants?.[index];
 if(!image)return {src,width:kind==='card'?800:1200,height:kind==='card'?1000:1500};
 const variants=kind==='card'?image.variants.filter(v=>v.width<=960):image.variants;
 if(!variants.length)throw new Error('Responsive card derivative missing');
 const fallback=kind==='card'?(variants.filter(v=>v.width<=640).at(-1)??variants[0]):image;
 return {src:fallback.src,width:fallback.width,height:fallback.height,srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', '),sizes:kind==='card'?(columns===3?threeColumns:cardSizes):(index===0?detailSizes:secondaryDetailSizes)};
}
