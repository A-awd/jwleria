globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { t as $$WhatsAppContact } from "./WhatsAppContact_DNme9nYU.mjs";
import { c as href, l as isLocale, m as t, t as OWN_COLLECTION } from "./view_DI4H_3ae.mjs";
import { a as getCategories, r as getBrandPage } from "./catalog_fhia_VZa.mjs";
import { t as $$Pagination } from "./Pagination_CNELDBpp.mjs";
import { t as $$ProductCard } from "./ProductCard_BeOnNK2x.mjs";
//#region src/pages/[locale]/brands/[slug].astro
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
	if (!isLocale(locale) || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Astro.redirect("/404/");
	const { brand, result, collections, directory } = await getBrandPage(slug, { page: Number(Astro.url.searchParams.get("page")) });
	if (!brand) return Astro.redirect("/404/");
	const s = t(locale);
	const products = result.items;
	const isOwn = brand.slug === OWN_COLLECTION;
	const peers = directory.filter((b) => b.tier === brand.tier && b.slug !== brand.slug && b.slug !== "jwleria-edit").slice(0, 8);
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": brand.name,
		"description": brand.summary[locale],
		"path": `/brands/${brand.slug}/`
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><p class="crumb"><a${addAttribute(href(locale, "/brands/"), "href")}>${s.brands.back}</a></p><p class="eyebrow">${isOwn ? s.brands.ownTitle : s.tiers[brand.tier]}</p><h1 class="brand-name" lang="en" dir="ltr">${brand.name}</h1><p class="lead">${brand.summary[locale]}</p></header>${collections.length > 0 && renderTemplate`<nav class="chips"${addAttribute(s.product.collection, "aria-label")}>${collections.map((c) => renderTemplate`<a class="chip"${addAttribute(href(locale, `/catalog/?brand=${brand.slug}&collection=${c.slug}`), "href")}>${c.name[locale]}</a>`)}</nav>`}${products.length > 0 ? renderTemplate`<section class="section section--tight"${addAttribute(brand.name, "aria-label")}><div class="grid grid--4">${products.map((p, i) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale,
		"brand": brand,
		"eager": i < 2,
		"priority": i === 0
	})}`)}</div></section>` : renderTemplate`<section class="pending" aria-labelledby="h-pending"><h2 id="h-pending">${s.brands.pendingTitle}</h2><p>${s.brands.pendingText}</p>${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, {
		"locale": locale,
		"message": s.dialog.brand(brand.name)
	})}</section>`}${renderComponent($$result, "Pagination", $$Pagination, {
		"locale": locale,
		"result": result,
		"url": Astro.url
	})}<section class="section section--tight" aria-labelledby="h-browse"><h2 id="h-browse" class="eyebrow">${s.categories.title}</h2><nav class="chips">${getCategories().map((c) => renderTemplate`<a class="chip"${addAttribute(href(locale, `/categories/${c.slug}/`), "href")}>${c.name[locale]}</a>`)}</nav>${peers.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<h2 class="eyebrow">${s.brands.sameTier}</h2><ul class="dir-list">${peers.map((b) => renderTemplate`<li><a${addAttribute(href(locale, `/brands/${b.slug}/`), "href")} lang="en" dir="ltr">${b.name}</a></li>`)}</ul>` })}`}</section></div>` })}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/brands/[slug].astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/brands/[slug].astro";
var $$url = "/[locale]/brands/[slug]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/brands/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
