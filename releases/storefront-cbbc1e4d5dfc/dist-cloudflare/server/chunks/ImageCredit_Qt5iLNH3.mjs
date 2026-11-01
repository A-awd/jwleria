globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { h as t } from "./view_DFTSn9Oj.mjs";
//#region src/components/product-media.mjs
var threeColumns = "(min-width: 100rem) 470px, (min-width: 56rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(2rem, 5vw, 4rem)) / 3), calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(1rem, 2.5vw, 2rem)) / 2)";
var cardSizes = `(min-width: 100rem) 344px, (min-width: 80rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - 6rem) / 4), ${threeColumns.replace("(min-width: 100rem) 470px, ", "")}`;
var FRAME_VH = 30;
var HEIGHT_BOUND_ASPECT = 1.38;
var phoneWidth = (image, column) => {
	const aspect = image && image.width > 0 && image.height > 0 ? image.width / image.height : void 0;
	return aspect !== void 0 && aspect <= HEIGHT_BOUND_ASPECT ? `calc(${+(FRAME_VH * aspect).toFixed(1)}vh)` : column;
};
var detailSizes = (image) => `(min-width: 100rem) 840px, (min-width: 60rem) 54vw, ${phoneWidth(image, "86vw")}`;
var secondaryDetailSizes = (image) => `(min-width: 100rem) 414px, (min-width: 60rem) calc(27vw - .375rem), ${phoneWidth(image, "86vw")}`;
var singleDetailSizes = (image) => `(min-width: 100rem) 840px, (min-width: 60rem) 54vw, ${phoneWidth(image, "calc(100vw - 2.5rem)")}`;
var thumbSizes = "5.5rem";
/**
* The largest approved file of a photograph, offered on demand (decision 0021). A phone loads the rendition its frame
* shows, which can be softer under pinch-zoom; this file is the most detail that exists, never an enlargement.
* @param {import('../contracts/catalog').PublicProduct} product
*/
function fullSizeImage(product, index = 0) {
	const image = product.imageVariants?.[index];
	if (!image?.variants?.length) return void 0;
	const largest = image.variants.reduce((a, b) => b.width > a.width ? b : a);
	return {
		src: largest.src,
		width: largest.width,
		height: largest.height
	};
}
/** The share image (og:image): the first image, unless it needs a visible credit, which a share preview cannot carry.
* @param {import('../contracts/catalog').PublicProduct} product */
var shareImage = (product) => product.image && !product.imageVariants?.[0]?.attribution ? product.image : null;
/**
* @param {import('../contracts/catalog').PublicProduct} product
* @param {'card' | 'detail' | 'single' | 'thumb'} kind 'single' is the only photograph of a gallery; 'thumb' a small
*   secondary photograph, limited to renditions of at most 640px.
*/
function productMedia(product, index = 0, kind = "card", columns = 4) {
	const src = product.images[index];
	if (!src) throw new Error("Product image missing");
	const image = product.imageVariants?.[index];
	if (!image) return {
		src,
		width: kind === "card" ? 800 : 1200,
		height: kind === "card" ? 1e3 : 1500
	};
	const small = kind === "card" || kind === "thumb";
	const variants = small ? image.variants.filter((v) => v.width <= (kind === "thumb" ? 640 : 960)) : image.variants;
	if (!variants.length) throw new Error("Responsive card derivative missing");
	const fallback = small ? variants.filter((v) => v.width <= (kind === "thumb" ? 320 : 640)).at(-1) ?? variants[0] : image;
	const sizes = kind === "card" ? columns === 3 ? threeColumns : cardSizes : kind === "thumb" ? thumbSizes : kind === "single" ? singleDetailSizes(image) : index === 0 ? detailSizes(image) : secondaryDetailSizes(image);
	return {
		src: fallback.src,
		width: fallback.width,
		height: fallback.height,
		srcset: variants.map((v) => `${v.src} ${v.width}w`).join(", "),
		sizes
	};
}
//#endregion
//#region src/components/ImageCredit.astro
createAstro("https://astro.build");
var $$ImageCredit = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ImageCredit;
	const { credit, locale, card = false } = Astro.props;
	const s = t(locale);
	const Tag = card ? "p" : "span";
	const changes = credit.changes ? s.variants.credit.changed[credit.changes] : void 0;
	const [open, close] = s.variants.credit.quote;
	return renderTemplate`${renderComponent($$result, "Tag", Tag, { "class:list": ["gallery-credit", { "gallery-credit--card": card }] }, { "default": ($$result) => renderTemplate`${s.variants.credit.photo}: ${credit.title && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${open}${maybeRenderHead($$result)}<bdi>${credit.title}</bdi>${close} — ` })}`}<bdi>${credit.creator}</bdi> · <a${addAttribute(credit.licenseUrl, "href")} rel="license nofollow"><bdi>${credit.license}</bdi></a> · <a${addAttribute(credit.sourceUrl, "href")} rel="nofollow">${s.variants.credit.source}</a>${credit.changes && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · ${s.variants.credit.changes}: ${changes ? renderTemplate`<bdi>${changes}</bdi>` : renderTemplate`<bdi lang="en" dir="ltr">${credit.changes}</bdi>`}` })}`}` })}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ImageCredit.astro", void 0);
//#endregion
export { shareImage as i, fullSizeImage as n, productMedia as r, $$ImageCredit as t };
