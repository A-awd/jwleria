globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { c as href, m as t, r as artClass } from "./view_DI4H_3ae.mjs";
import { n as getBrand } from "./catalog_fhia_VZa.mjs";
//#region src/components/product-media.mjs
var threeColumns = "(min-width: 100rem) 470px, (min-width: 56rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(2rem, 5vw, 4rem)) / 3), calc((100vw - clamp(2.5rem, 9vw, 8rem) - clamp(1rem, 2.5vw, 2rem)) / 2)";
var cardSizes = `(min-width: 100rem) 344px, (min-width: 80rem) calc((100vw - clamp(2.5rem, 9vw, 8rem) - 6rem) / 4), ${threeColumns.replace("(min-width: 100rem) 470px, ", "")}`;
var detailSizes = "(min-width: 100rem) 840px, (min-width: 60rem) 54vw, 86vw";
var secondaryDetailSizes = "(min-width: 100rem) 414px, (min-width: 60rem) calc(27vw - .375rem), 86vw";
/** The share image (og:image): the first image, unless it needs a visible credit, which a share preview cannot carry.
* @param {import('../contracts/catalog').PublicProduct} product */
var shareImage = (product) => product.image && !product.imageVariants?.[0]?.attribution ? product.image : null;
/** @param {import('../contracts/catalog').PublicProduct} product */
function productMedia(product, index = 0, kind = "card", columns = 4) {
	const src = product.images[index];
	if (!src) throw new Error("Product image missing");
	const image = product.imageVariants?.[index];
	if (!image) return {
		src,
		width: kind === "card" ? 800 : 1200,
		height: kind === "card" ? 1e3 : 1500
	};
	const variants = kind === "card" ? image.variants.filter((v) => v.width <= 960) : image.variants;
	if (!variants.length) throw new Error("Responsive card derivative missing");
	const fallback = kind === "card" ? variants.filter((v) => v.width <= 640).at(-1) ?? variants[0] : image;
	return {
		src: fallback.src,
		width: fallback.width,
		height: fallback.height,
		srcset: variants.map((v) => `${v.src} ${v.width}w`).join(", "),
		sizes: kind === "card" ? columns === 3 ? threeColumns : cardSizes : index === 0 ? detailSizes : secondaryDetailSizes
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
//#region src/components/ProductCard.astro
createAstro("https://astro.build");
var $$ProductCard = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ProductCard;
	const { product: p, locale, eager = false } = Astro.props;
	const s = t(locale);
	const url = href(locale, `/products/${p.slug}/`);
	const brand = Astro.props.brand ?? await getBrand(p.brandSlug);
	const media = p.image ? productMedia(p, 0, "card", Astro.props.columns ?? 4) : void 0;
	const name = p.model?.name ?? p.name;
	const credit = p.image ? p.imageVariants?.[0]?.attribution : void 0;
	return renderTemplate`${maybeRenderHead($$result)}<article${addAttribute(["card", { "card--facts": !p.image }], "class:list")}${addAttribute(p.brandSlug, "data-brand")}${addAttribute(p.categorySlug, "data-category")}>${p.image && renderTemplate`<a class="media"${addAttribute(url, "href")} tabindex="-1" aria-hidden="true"><img${addAttribute(artClass(p.image, p.categorySlug, p.reference), "class")}${spreadAttributes(media)} alt=""${addAttribute(eager ? "eager" : "lazy", "loading")}${addAttribute(Astro.props.priority ? "high" : "auto", "fetchpriority")} decoding="async"></a>`}${credit && renderTemplate`${renderComponent($$result, "ImageCredit", $$ImageCredit, {
		"credit": credit,
		"locale": locale,
		"card": true
	})}`}<div class="card__body"><p class="card__brand">${brand?.name ?? s.brands.ownTitle}</p><h3 class="card__name"><a${addAttribute(url, "href")}>${name[locale]}</a></h3></div></article>`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ProductCard.astro", void 0);
//#endregion
export { shareImage as i, $$ImageCredit as n, productMedia as r, $$ProductCard as t };
