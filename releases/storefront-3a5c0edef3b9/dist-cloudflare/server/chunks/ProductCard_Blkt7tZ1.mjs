globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { h as t, l as href, r as artClass } from "./view_CX2_xOLw.mjs";
import { n as getBrand } from "./catalog_sunIx8gK.mjs";
import { r as productMedia, t as $$ImageCredit } from "./ImageCredit_MEoVtnJm.mjs";
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
	return renderTemplate`${maybeRenderHead($$result)}<article${addAttribute(["card", { "card--facts": !p.image }], "class:list")}${addAttribute(p.brandSlug, "data-brand")}${addAttribute(p.categorySlug, "data-category")}>${p.image && renderTemplate`<a${addAttribute(["media", { "media--white": p.imageVariants?.[0]?.canvas === "white_square" }], "class:list")}${addAttribute(url, "href")} tabindex="-1" aria-hidden="true"><img${addAttribute(artClass(p.image, p.categorySlug, p.reference), "class")}${spreadAttributes(media)} alt=""${addAttribute(eager ? "eager" : "lazy", "loading")}${addAttribute(Astro.props.priority ? "high" : "auto", "fetchpriority")} decoding="async"></a>`}${p.image && p.imageVariants?.[0]?.sourceClipped && renderTemplate`<p class="source-clipped source-clipped--card">${s.product.sourceClippedShort}</p>`}${credit && renderTemplate`${renderComponent($$result, "ImageCredit", $$ImageCredit, {
		"credit": credit,
		"locale": locale,
		"card": true
	})}`}<div class="card__body"><p class="card__brand">${brand?.name ?? s.brands.ownTitle}</p><h3 class="card__name"><a${addAttribute(url, "href")}>${name[locale]}</a></h3></div></article>`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ProductCard.astro", void 0);
//#endregion
export { $$ProductCard as t };
