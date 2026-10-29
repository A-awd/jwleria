globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { c as href, l as isLocale, m as t, p as resultCount } from "./view_DI4H_3ae.mjs";
import { a as getCategories, i as getBrands, s as getCollections, u as getProducts } from "./catalog_fhia_VZa.mjs";
import { t as $$Pagination } from "./Pagination_CNELDBpp.mjs";
import { t as $$ProductCard } from "./ProductCard_BeOnNK2x.mjs";
//#region src/pages/[locale]/catalog/index.astro
var catalog_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const { locale } = Astro.params;
	if (!isLocale(locale)) return Astro.redirect("/404/");
	const s = t(locale);
	const params = Astro.url.searchParams;
	const search = (params.get("q") ?? "").slice(0, 200);
	const brand = params.get("brand") ?? "";
	const category = params.get("category") ?? "";
	const collection = params.get("collection") ?? "";
	const [result, brands, collections] = await Promise.all([
		getProducts({
			search,
			brand,
			category,
			collection,
			page: Number(params.get("page"))
		}),
		getBrands(),
		brand ? getCollections(brand) : Promise.resolve([])
	]);
	const categories = getCategories();
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": s.catalog.title,
		"description": s.catalog.lead,
		"path": "/catalog/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><h1>${s.catalog.title}</h1><p class="lead">${s.catalog.lead}</p></header><form class="filters"${addAttribute(href(locale, "/catalog/"), "action")} method="get" role="search" data-filters><div class="field"><label for="q">${s.catalog.q}</label><input id="q" name="q" type="search" autocomplete="off" enterkeyhint="search"${addAttribute(search, "value")}></div><div class="field"><label for="category">${s.catalog.category}</label><select id="category" name="category"><option value="">${s.catalog.any}</option>${categories.map((c) => renderTemplate`<option${addAttribute(c.slug, "value")}${addAttribute(c.slug === category, "selected")}>${c.name[locale]}</option>`)}</select></div><div class="field"><label for="brand">${locale === "ar" ? "العلامة" : "Brand"}</label><select id="brand" name="brand"><option value="">${locale === "ar" ? "كل العلامات" : "All brands"}</option>${brands.map((b) => renderTemplate`<option${addAttribute(b.slug, "value")}${addAttribute(b.slug === brand, "selected")}>${b.name}</option>`)}</select></div>${collections.length > 0 && renderTemplate`<div class="field"><label for="collection">${s.product.collection}</label><select id="collection" name="collection"><option value="">${locale === "ar" ? "كل المجموعات" : "All collections"}</option>${collections.map((c) => renderTemplate`<option${addAttribute(c.slug, "value")}${addAttribute(c.slug === collection, "selected")}>${c.name[locale]}</option>`)}</select></div>`}<button class="btn btn--solid" type="submit">${s.catalog.apply}</button><a class="btn"${addAttribute(href(locale, "/catalog/"), "href")}>${s.catalog.clear}</a></form><p class="status" role="status" aria-live="polite">${result.total ? resultCount(locale, result) : s.catalog.none}</p><div class="grid grid--4 section section--tight">${result.items.map((p, i) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale,
		"eager": i < 2,
		"priority": i === 0
	})}`)}</div>${renderComponent($$result, "Pagination", $$Pagination, {
		"locale": locale,
		"result": result,
		"url": Astro.url
	})}</div>` })}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/catalog/index.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/catalog/index.astro";
var $$url = "/[locale]/catalog/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/catalog/index@_@astro
var page = () => catalog_exports;
//#endregion
export { page };
