globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { g as renderHead, m as renderTemplate } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=/ar/"><link rel="canonical" href="/ar/"><title>Jwleria</title>${renderHead($$result)}</head><body><p><a href="/ar/">العربية</a> · <a href="/en/" lang="en">English</a></p></body></html>`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/index.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
