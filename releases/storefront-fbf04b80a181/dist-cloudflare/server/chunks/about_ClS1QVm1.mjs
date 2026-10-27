globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$BaseLayout } from "./BaseLayout_CEt1Cqx9.mjs";
import { t as $$WhatsAppContact } from "./WhatsAppContact_6x9QGO1V.mjs";
import { h as t, i as inquiryChannel, l as isLocale } from "./view_C4InCl6p.mjs";
//#region src/pages/[locale]/about.astro
var about_exports = /* @__PURE__ */ __exportAll({
	default: () => $$About,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$About = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$About;
	const { locale } = Astro.params;
	if (!isLocale(locale)) throw new Error("Unknown locale");
	const s = t(locale);
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": s.about.title,
		"description": s.about.lead,
		"path": "/about/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><header class="page-head"><h1>${s.about.title}</h1><p class="lead">${s.about.lead}</p></header><div class="prose section section--tight"><h2>${s.about.stepsTitle}</h2><ol class="steps">${s.about.steps.map((step) => renderTemplate`<li>${step}</li>`)}</ol><h2>${s.about.whyTitle}</h2><p>${s.about.why}</p><h2 id="contact">${s.about.contactTitle}</h2>${!inquiryChannel().live && renderTemplate`<p>${s.about.contact}</p>`}${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, { "locale": locale })}<p class="note" style="margin-top:2rem">${s.footer.rights}</p></div></div>` })}`;
}, "/home/user/jwleria/apps/storefront/src/pages/[locale]/about.astro", void 0);
var $$file = "/home/user/jwleria/apps/storefront/src/pages/[locale]/about.astro";
var $$url = "/[locale]/about/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/about@_@astro
var page = () => about_exports;
//#endregion
export { page };
