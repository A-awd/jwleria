globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { c as href, l as isLocale, m as t, p as resultCount } from "./view_DI4H_3ae.mjs";
import { a as getCategories, o as getCategory, u as getProducts } from "./catalog_fhia_VZa.mjs";
import { t as $$Pagination } from "./Pagination_CNELDBpp.mjs";
import { t as $$ProductCard } from "./ProductCard_BeOnNK2x.mjs";
//#region src/pages/[locale]/categories/[slug].astro
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
	const category = getCategory(slug ?? "");
	if (!isLocale(locale) || !category) return Astro.redirect("/404/");
	const s = t(locale);
	const result = await getProducts({
		category: category.slug,
		page: Number(Astro.url.searchParams.get("page"))
	});
	const products = result.items;
	const others = getCategories().filter((c) => c.slug !== category.slug);
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": category.name[locale],
		"description": `${category.name[locale]} — ${s.categories.lead}`,
		"path": `/categories/${category.slug}/`,
		"image": category.image
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><p class="crumb"><a${addAttribute(href(locale, "/categories/"), "href")}>${s.nav.categories}</a></p><h1>${category.name[locale]}</h1><p class="lead">${resultCount(locale, result)}</p></header>${products.length > 0 ? renderTemplate`<div class="grid grid--4">${products.map((p, i) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale,
		"eager": i < 2,
		"priority": i === 0
	})}`)}</div>` : renderTemplate`<div class="pending"><p>${s.categories.empty}</p></div>`}${renderComponent($$result, "Pagination", $$Pagination, {
		"locale": locale,
		"result": result,
		"url": Astro.url
	})}<section class="section" aria-labelledby="h-other"><h2 id="h-other" class="eyebrow">${s.categories.other}</h2><nav class="chips">${others.map((c) => renderTemplate`<a class="chip"${addAttribute(href(locale, `/categories/${c.slug}/`), "href")}>${c.name[locale]}</a>`)}</nav></section></div>` })}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/categories/[slug].astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/categories/[slug].astro";
var $$url = "/[locale]/categories/[slug]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/categories/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
