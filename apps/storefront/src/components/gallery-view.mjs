// What the product gallery may show for the selected variant (decisions 0017 and 0019). A photograph is only ever
// shown as the selected variant when it is that variant's own approved photograph.
/** @typedef {import('../contracts/catalog').PublicProduct} Product */
/** @typedef {import('../contracts/catalog').RepresentativeImage} Representative */
/** @typedef {import('../contracts/catalog').VariantLink} Link */
/** @typedef {import('../contracts/catalog').VariantOption} Option */
/** @typedef {{mode: 'own'} | {mode: 'none'} | {mode: 'missing', representative: Representative, details: Option[]}} GalleryView */

/**
 * - 'own': the variant's own approved photographs.
 * - 'missing': the variant has none. Its model's representative photograph, when there is one, is shown apart and
 *   small, labelled with that photograph's own reference, its size and its first other option (a dial or colour),
 *   so a photographed black dial is never read as the selected green one.
 * - 'none': neither exists; the page shows its facts-only state.
 * @param {Product} product the selected variant
 * @param {Representative | undefined} representative
 * @param {Link[]} variants the model's variants, to name the representative's options
 * @returns {GalleryView}
 */
export function galleryView(product, representative, variants = []) {
  if (product.images.length) return {mode: 'own'};
  if (!representative || !representative.images.length || representative.slug === product.slug) return {mode: 'none'};
  const sizeKind = representative.sizeOption?.kind;
  const other = variants.find(v => v.slug === representative.slug)?.options.find(o => o.kind !== sizeKind);
  const details = /** @type {Option[]} */ ([representative.sizeOption, other].filter(Boolean));
  return {mode: 'missing', representative, details};
}
