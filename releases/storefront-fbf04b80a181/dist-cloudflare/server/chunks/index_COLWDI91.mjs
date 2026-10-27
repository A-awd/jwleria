globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_CEt1Cqx9.mjs";
import { c as href, h as t, l as isLocale, r as artClass } from "./view_C4InCl6p.mjs";
import { a as getCategories } from "./catalog_BC1CJrAP.mjs";
//#region src/pages/[locale]/categories/index.astro
var categories_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const { locale } = Astro.params;
	if (!isLocale(locale)) throw new Error("Unknown locale");
	const s = t(locale);
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": s.categories.title,
		"description": s.categories.lead,
		"path": "/categories/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><h1>${s.categories.title}</h1><p class="lead">${s.categories.lead}</p></header><div class="tiles section section--tight">${getCategories().map((c, i) => renderTemplate`<a class="tile"${addAttribute(href(locale, `/categories/${c.slug}/`), "href")}><span class="media"><img${addAttribute(artClass(c.image, c.slug), "class")}${addAttribute(c.image, "src")} alt="" width="800" height="1000"${addAttribute(i < 2 ? "eager" : "lazy", "loading")} decoding="async"></span><span class="tile__name">${c.name[locale]}<span aria-hidden="true">${locale === "ar" ? "←" : "→"}</span></span></a>`)}</div></div>` })}`;
}, "/home/user/jwleria/apps/storefront/src/pages/[locale]/categories/index.astro", void 0);
var $$file = "/home/user/jwleria/apps/storefront/src/pages/[locale]/categories/index.astro";
var $$url = "/[locale]/categories/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/categories/index@_@astro
var page = () => categories_exports;
//#endregion
export { page };
