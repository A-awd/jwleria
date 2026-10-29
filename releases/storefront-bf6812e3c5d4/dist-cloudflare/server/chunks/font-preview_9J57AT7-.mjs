globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, g as renderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$WhatsAppContact } from "./WhatsAppContact_DNme9nYU.mjs";
import { c as href, l as isLocale, m as t } from "./view_DI4H_3ae.mjs";
//#region src/pages/[locale]/font-preview.astro
var font_preview_exports = /* @__PURE__ */ __exportAll({
	default: () => $$FontPreview,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$FontPreview = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$FontPreview;
	const { locale } = Astro.params;
	if (!isLocale(locale)) throw new Error("Unknown locale");
	const arabic = locale === "ar";
	return renderTemplate`<html${addAttribute(locale, "lang")}${addAttribute(arabic ? "rtl" : "ltr", "dir")} data-astro-cid-m5e6ngxy><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${arabic ? "مقارنة الخطوط" : "Font comparison"} · Jwleria</title><link rel="stylesheet" href="/fonts/preview-fonts.css">${renderHead($$result)}</head><body class="font-comparison" data-astro-cid-m5e6ngxy><header class="comparison-header wrap" data-astro-cid-m5e6ngxy><a class="wordmark"${addAttribute(href(locale), "href")} aria-label="Jwleria" data-astro-cid-m5e6ngxy>JWLERIA</a><a class="link-quiet"${addAttribute(href(locale), "href")} data-astro-cid-m5e6ngxy>${arabic ? "العودة إلى الموقع" : "Back to the site"}</a></header><main class="wrap" data-astro-cid-m5e6ngxy><div class="comparison-intro" data-astro-cid-m5e6ngxy><h1 data-astro-cid-m5e6ngxy>${arabic ? "ثلاثة خطوط، على نفس العنوان" : "Three fonts, one headline"}</h1><p data-astro-cid-m5e6ngxy>${arabic ? "المسيري هو الخط المعتمد للعناوين. الخيارات الأخرى متاحة للمعاينة." : "El Messiri is the selected headline font. The other options remain available for comparison."}</p></div><div class="font-options" data-astro-cid-m5e6ngxy>${[
		{
			id: "amiri",
			family: "Amiri",
			name: "أميري",
			note: "كلاسيكي بحضور هادئ"
		},
		{
			id: "el-messiri",
			family: "El Messiri",
			name: "المسيري",
			note: "معاصر بخطوط ناعمة"
		},
		{
			id: "aref-ruqaa",
			family: "Aref Ruqaa",
			name: "عارف رقعة",
			note: "طابع خطّي أكثر زخرفة"
		}
	].map((font, index) => renderTemplate`<article${addAttribute(["font-option", { "font-option--selected": font.id === "el-messiri" }], "class:list")} dir="rtl" lang="ar"${addAttribute(`--sample-font: '${font.family}'`, "style")} data-astro-cid-m5e6ngxy><div class="font-option__name" data-astro-cid-m5e6ngxy><span data-astro-cid-m5e6ngxy>${index + 1} — ${font.name}</span><span lang="en" dir="ltr" data-astro-cid-m5e6ngxy>${font.family}</span></div><div class="font-option__sample" data-astro-cid-m5e6ngxy><h2 data-astro-cid-m5e6ngxy>${t("ar").hero.title}</h2><p data-astro-cid-m5e6ngxy>${t("ar").hero.lead}</p></div><p class="font-option__note" data-astro-cid-m5e6ngxy>${font.id === "el-messiri" ? `${font.note} · الخط المعتمد` : font.note}</p><a class="btn"${addAttribute(`${href(locale)}?font=${font.id}`, "href")} data-astro-cid-m5e6ngxy>${arabic ? `معاينة ${font.name} في الموقع` : `Preview ${font.family} in the site`}</a></article>`)}</div><section class="comparison-contact" data-astro-cid-m5e6ngxy><h2 data-astro-cid-m5e6ngxy>${arabic ? "زر واتساب" : "WhatsApp contact"}</h2><p data-astro-cid-m5e6ngxy>${arabic ? "يفتح المحادثة مباشرة عند تجهيز الرقم. يظهر الآن بحالة «قيد التجهيز»." : "Opens the conversation directly once the number is ready. It currently shows a coming-soon state."}</p>${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, {
		"locale": locale,
		"data-astro-cid-m5e6ngxy": true
	})}</section></main></body></html>`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/font-preview.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/font-preview.astro";
var $$url = "/[locale]/font-preview/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/font-preview@_@astro
var page = () => font_preview_exports;
//#endregion
export { page };
