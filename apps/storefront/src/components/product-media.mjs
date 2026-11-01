// Match the existing two/three/four-column grid. Large originals never enter a card srcset. On a card the photograph
// is drawn inside its square tile at TILE_FILL of the column (the tile's 15% padding, owner-selected reference of
// 2026-11-01), so the size hint names that width, not the whole column.
export const TILE_FILL=0.7;
const col2='((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(1rem, 2.5vw, 2rem)) / 2)';
const col3='((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(2rem, 5vw, 4rem)) / 3)';
const col4='((100vw - clamp(2.5rem, 9vw, 8rem) - 6rem) / 4)';
const inTile=column=>`calc(${TILE_FILL} * ${column})`;
const threeColumns=`(min-width: 100rem) ${Math.round(470*TILE_FILL)}px, (min-width: 56rem) ${inTile(col3)}, ${inTile(col2)}`;
const cardSizes=`(min-width: 100rem) ${Math.round(344*TILE_FILL)}px, (min-width: 80rem) ${inTile(col4)}, (min-width: 56rem) ${inTile(col3)}, ${inTile(col2)}`;
// On a phone the photograph sits in a frame of clamp(10rem, 30svh, 20rem) and is contained (decision 0020). A portrait
// or square photograph is then as wide as the frame is high times its aspect, not as wide as its column, so the size
// hint names that width and a phone loads the rendition it shows instead of a larger one (decision 0021). On common
// phones, from 360x640 to 430x932, the height binds up to an aspect of 1.38; wider photographs fill their column.
const FRAME_VH=30;
const HEIGHT_BOUND_ASPECT=1.38;
const phoneWidth=(image,column)=>{
 const aspect=image&&image.width>0&&image.height>0?image.width/image.height:undefined;
 return aspect!==undefined&&aspect<=HEIGHT_BOUND_ASPECT?`calc(${+(FRAME_VH*aspect).toFixed(1)}vh)`:column;
};
const detailSizes=image=>`(min-width: 100rem) 840px, (min-width: 60rem) 54vw, ${phoneWidth(image,'86vw')}`;
const secondaryDetailSizes=image=>`(min-width: 100rem) 414px, (min-width: 60rem) calc(27vw - .375rem), ${phoneWidth(image,'86vw')}`;
// A one-image gallery is not a carousel: the photograph spans the content width (decision 0019).
const singleDetailSizes=image=>`(min-width: 100rem) 840px, (min-width: 60rem) 54vw, ${phoneWidth(image,'calc(100vw - 2.5rem)')}`;
// Another variant's photograph is shown small and apart (decision 0019), in a 5.5rem column (decision 0020).
const thumbSizes='5.5rem';

/**
 * The largest approved file of a photograph, offered on demand (decision 0021). A phone loads the rendition its frame
 * shows, which can be softer under pinch-zoom; this file is the most detail that exists, never an enlargement.
 * @param {import('../contracts/catalog').PublicProduct} product
 */
export function fullSizeImage(product,index=0){
 const image=product.imageVariants?.[index];
 if(!image?.variants?.length)return undefined;
 const largest=image.variants.reduce((a,b)=>(b.width>a.width?b:a));
 return {src:largest.src,width:largest.width,height:largest.height};
}

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
 const sizes=kind==='card'?(columns===3?threeColumns:cardSizes):kind==='thumb'?thumbSizes:kind==='single'?singleDetailSizes(image):(index===0?detailSizes(image):secondaryDetailSizes(image));
 return {src:fallback.src,width:fallback.width,height:fallback.height,srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', '),sizes};
}
