globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { c as href, m as t } from "./view_DI4H_3ae.mjs";
//#region src/pages/404.astro
var _404_exports = /* @__PURE__ */ __exportAll({
	default: () => $$404,
	file: () => $$file,
	url: () => $$url
});
var $$404 = createComponent(($$result, $$props, $$slots) => {
	const ar = t("ar");
	const en = t("en");
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": "ar",
		"title": ar.notFound.title,
		"description": ar.notFound.title,
		"path": "/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap page-head"><h1>${ar.notFound.title}</h1><p class="lead" lang="en" dir="ltr">${en.notFound.title}</p><p class="actions"><a class="btn btn--solid"${addAttribute(href("ar"), "href")}>${ar.notFound.home}</a><a class="btn"${addAttribute(href("en"), "href")} lang="en">${en.notFound.home}</a></p></div>` })}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/404.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/404.astro";
var $$url = "/404/";
//#endregion
//#region \0virtual:astro:page:src/pages/404@_@astro
var page = () => _404_exports;
//#endregion
export { page };
