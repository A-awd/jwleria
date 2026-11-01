globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { n as renderScript, t as $$BaseLayout } from "./BaseLayout_B1v0Tmxn.mjs";
import { h as t, l as href, s as productTitle, u as isLocale } from "./view_CX2_xOLw.mjs";
import { d as getRelatedProducts, l as getProductModel, n as getBrand, o as getCategory } from "./catalog_sunIx8gK.mjs";
import { i as shareImage } from "./ImageCredit_DbRIgmN8.mjs";
import { t as $$ProductCard } from "./ProductCard_DZrijnpj.mjs";
import { t as $$ProductArticle } from "./ProductArticle_BukQA9BW.mjs";
//#region src/pages/[locale]/products/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { locale, slug } = Astro.params;
	if (!isLocale(locale)) return Astro.redirect("/404/");
	const model = await getProductModel(slug ?? "");
	if (!model) return Astro.redirect("/404/");
	const product = model.selected;
	const grouped = model.variants.length > 1;
	const s = t(locale);
	const [brand, related] = await Promise.all([getBrand(product.brandSlug), getRelatedProducts(product, 4, model.key)]);
	const category = getCategory(product.categorySlug);
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": productTitle(model, locale),
		"description": product.summary[locale],
		"path": `/products/${product.slug}/`,
		"canonicalPath": `/products/${model.primary.slug}/`,
		"image": shareImage(product)
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><nav class="crumb crumb--product"><a${addAttribute(href(locale, "/catalog/"), "href")}>${s.nav.catalog}</a>${category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` / <a${addAttribute(href(locale, `/categories/${category.slug}/`), "href")}>${category.name[locale]}</a>` })}`}</nav>${renderComponent($$result, "ProductArticle", $$ProductArticle, {
		"model": model,
		"locale": locale,
		"brand": brand,
		"origin": Astro.url.origin
	})}${grouped && renderTemplate`<p class="variant-status" role="status" aria-live="polite" data-variant-status${addAttribute(s.variants.showing("{ref}"), "data-template")}></p>`}${related.length > 0 && renderTemplate`<section class="section" aria-labelledby="h-related"><div class="section-head"><h2 id="h-related">${s.product.related}</h2></div><div class="grid grid--4">${related.map((p) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale
	})}`)}</div></section>`}</div>` })}${renderScript($$result, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro";
var $$url = "/[locale]/products/[slug]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/products/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
