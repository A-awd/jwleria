globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { n as renderScript, t as $$BaseLayout } from "./BaseLayout_CEt1Cqx9.mjs";
import { c as href, h as t, l as isLocale, n as TIERS, t as OWN_COLLECTION } from "./view_C4InCl6p.mjs";
import { i as getBrands, n as getBrand, u as getProducts } from "./catalog_BC1CJrAP.mjs";
//#region src/pages/[locale]/brands/index.astro
var brands_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const { locale } = Astro.params;
	if (!isLocale(locale)) throw new Error("Unknown locale");
	const s = t(locale);
	const world = (await getBrands()).filter((b) => b.slug !== OWN_COLLECTION);
	const groups = TIERS.map((tier) => ({
		tier,
		items: world.filter((b) => b.tier === tier).sort((a, b) => a.name.localeCompare(b.name))
	})).filter((g) => g.items.length);
	const own = await getBrand(OWN_COLLECTION);
	const ownCover = own ? (await getProducts({
		brand: OWN_COLLECTION,
		pageSize: 1
	})).items[0] : void 0;
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": s.brands.title,
		"description": s.brands.lead,
		"path": "/brands/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><h1>${s.brands.title}</h1><p class="lead">${s.brands.lead}</p></header>${own && ownCover && renderTemplate`<a class="feature"${addAttribute(href(locale, `/brands/${own.slug}/`), "href")}><span class="media"><img class="art art--0"${addAttribute(ownCover.image, "src")} alt="" width="1600" height="1000" loading="lazy" decoding="async"><span class="badge">${s.preview}</span></span><div><p class="eyebrow">${s.brands.ownTitle}</p><h2 class="brand-name" lang="en" dir="ltr">${own.name}</h2><p>${s.brands.ownLead}</p></div></a>`}<nav class="chips"${addAttribute(s.brands.title, "aria-label")} data-tier-nav><a class="chip" href="#directory" data-tier="all" aria-current="true">${s.brands.all} · ${s.brands.count(world.length)}</a>${groups.map((g) => renderTemplate`<a class="chip"${addAttribute(`#tier-${g.tier}`, "href")}${addAttribute(g.tier, "data-tier")}>${s.tiers[g.tier]}</a>`)}</nav><div id="directory">${groups.map((g) => renderTemplate`<section class="tier"${addAttribute(`tier-${g.tier}`, "id")}${addAttribute(g.tier, "data-tier-section")}${addAttribute(`h-${g.tier}`, "aria-labelledby")}><div class="tier__head"><h2${addAttribute(`h-${g.tier}`, "id")}>${s.tiers[g.tier]}</h2><span>${s.brands.count(g.items.length)}</span></div><ul class="dir-list">${g.items.map((b) => renderTemplate`<li><a${addAttribute(href(locale, `/brands/${b.slug}/`), "href")} lang="en" dir="ltr">${b.name}</a></li>`)}</ul></section>`)}</div></div>` })}${renderScript($$result, "/home/user/jwleria/apps/storefront/src/pages/[locale]/brands/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/jwleria/apps/storefront/src/pages/[locale]/brands/index.astro", void 0);
var $$file = "/home/user/jwleria/apps/storefront/src/pages/[locale]/brands/index.astro";
var $$url = "/[locale]/brands/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/brands/index@_@astro
var page = () => brands_exports;
//#endregion
export { page };
