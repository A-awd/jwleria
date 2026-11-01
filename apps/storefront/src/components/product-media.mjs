// Match the existing two/three/four-column grid. Large originals never enter a card srcset.
const threeColumns='(min-width: 100rem) 470px, (min-width: 56rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(2rem, 5vw, 4rem)) / 3), calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(1rem, 2.5vw, 2rem)) / 2)';
const cardSizes=`(min-width: 100rem) 344px, (min-width: 80rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - 6rem) / 4), ${threeColumns.replace('(min-width: 100rem) 470px, ','')}`;
const detailSizes='(min-width: 100rem) 840px, (min-width: 60rem) 54vw, 86vw';
const secondaryDetailSizes='(min-width: 100rem) 414px, (min-width: 60rem) calc(27vw - .375rem), 86vw';
// A one-image gallery is not a carousel: the photograph spans the content width (decision 0019).
const singleDetailSizes='(min-width: 100rem) 840px, (min-width: 60rem) 54vw, calc(100vw - 2.5rem)';
// Another variant's photograph is shown small and apart (decision 0019), so it never loads a large rendition.
const thumbSizes='7.5rem';

/** The share image (og:image): the first image, unless it needs a visible credit, which a share preview cannot carry.
 * @param {import('../contracts/catalog').PublicProduct} product */
export const shareImage=product=>product.image&&!product.imageVariants?.[0]?.attribution?product.image:null;

/**
 * @param {import('../contracts/catalog').PublicProduct} product
 * @param {'card' | 'detail' | 'single' | 'thumb'} kind 'single' is the only photograph of a gallery; 'thumb' a small
 *   secondary photograph, limited to renditions of at most 640px.
 */
export function productMedia(product,index=0,kind='card',columns=4){
 const src=product.images[index];
 if(!src)throw new Error('Product image missing');
 const image=product.imageVariants?.[index];
 if(!image)return {src,width:kind==='card'?800:1200,height:kind==='card'?1000:1500};
 const small=kind==='card'||kind==='thumb';
 const variants=small?image.variants.filter(v=>v.width<=(kind==='thumb'?640:960)):image.variants;
 if(!variants.length)throw new Error('Responsive card derivative missing');
 const fallback=small?(variants.filter(v=>v.width<=(kind==='thumb'?320:640)).at(-1)??variants[0]):image;
 const sizes=kind==='card'?(columns===3?threeColumns:cardSizes):kind==='thumb'?thumbSizes:kind==='single'?singleDetailSizes:(index===0?detailSizes:secondaryDetailSizes);
 return {src:fallback.src,width:fallback.width,height:fallback.height,srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', '),sizes};
}
