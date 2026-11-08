globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { u as isLocale } from "./view_CX2_xOLw.mjs";
import { l as getProductModel, n as getBrand } from "./catalog_r4EbPbhn.mjs";
import { t as $$ProductArticle } from "./ProductArticle_B958UKNA.mjs";
//#region src/pages/[locale]/products/[slug]/variant.astro
var variant_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Variant,
	file: () => $$file,
	partial: () => true,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Variant = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Variant;
	const { locale, slug } = Astro.params;
	const model = isLocale(locale) ? await getProductModel(slug ?? "") : void 0;
	if (!isLocale(locale) || !model) return new Response(null, { status: 404 });
	const brand = await getBrand(model.selected.brandSlug);
	Astro.response.headers.set("X-Robots-Tag", "noindex, nofollow");
	return renderTemplate`${renderComponent($$result, "ProductArticle", $$ProductArticle, {
		"model": model,
		"locale": locale,
		"brand": brand,
		"origin": Astro.url.origin
	})}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug]/variant.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug]/variant.astro";
var $$url = "/[locale]/products/[slug]/variant/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/products/[slug]/variant@_@astro
var page = () => variant_exports;
//#endregion
export { page };
