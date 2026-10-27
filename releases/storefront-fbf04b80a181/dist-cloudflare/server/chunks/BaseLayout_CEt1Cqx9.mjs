globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, d as renderSlot, g as renderHead, h as maybeRenderHead, m as renderTemplate, s as renderComponent, v as createRenderInstruction } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { t as $$WhatsAppContact } from "./WhatsAppContact_6x9QGO1V.mjs";
import { c as href, f as otherLocale, h as t, i as inquiryChannel, p as pageLinks, s as dirOf } from "./view_C4InCl6p.mjs";
import { a as getCategories, t as catalogMode } from "./catalog_BC1CJrAP.mjs";
import { env } from "node:process";
//#region node_modules/.pnpm/astro@7.3.5_@types+node@24.0.0_yaml@2.9.1/node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region src/components/Header.astro
createAstro("https://astro.build");
var $$Header = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Header;
	const { locale, path } = Astro.props;
	const s = t(locale);
	const other = otherLocale(locale);
	const links = [
		{
			path: "/brands/",
			label: s.nav.brands
		},
		{
			path: "/categories/",
			label: s.nav.categories
		},
		{
			path: "/catalog/",
			label: s.nav.catalog
		},
		{
			path: "/about/",
			label: s.nav.about
		}
	];
	const current = (p) => path.startsWith(p) ? "page" : void 0;
	return renderTemplate`${maybeRenderHead($$result)}<header class="site-header"><div class="wrap site-header__bar"><div><nav class="nav-desktop"${addAttribute(s.menu, "aria-label")}>${links.map((l) => renderTemplate`<a${addAttribute(href(locale, l.path), "href")}${addAttribute(current(l.path), "aria-current")}>${l.label}</a>`)}</nav><details class="menu"><summary class="icon-btn"${addAttribute(s.menu, "aria-label")}><svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"></path></svg><svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg></summary><nav class="menu__panel"${addAttribute(s.menu, "aria-label")}>${links.map((l) => renderTemplate`<a${addAttribute(href(locale, l.path), "href")}${addAttribute(current(l.path), "aria-current")}>${l.label}</a>`)}<div class="menu__meta"><a${addAttribute(href(other, path), "href")}${addAttribute(other, "hreflang")}${addAttribute(other, "lang")}>${t(other).langName}</a>${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, {
		"locale": locale,
		"variant": "menu"
	})}</div></nav></details></div><a class="wordmark"${addAttribute(href(locale), "href")} aria-label="Jwleria">JWLERIA</a><div class="header-actions"><a class="icon-btn"${addAttribute(href(locale, "/catalog/"), "href")}${addAttribute(s.search, "aria-label")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4.2-4.2"></path></svg></a><a class="lang"${addAttribute(href(other, path), "href")}${addAttribute(other, "hreflang")}${addAttribute(other, "lang")}>${t(other).langName}</a>${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, {
		"locale": locale,
		"variant": "icon",
		"class": "header-contact"
	})}</div></div></header>`;
}, "/home/user/jwleria/apps/storefront/src/components/Header.astro", void 0);
//#endregion
//#region src/components/Footer.astro
createAstro("https://astro.build");
var $$Footer = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Footer;
	const { locale, path } = Astro.props;
	const s = t(locale);
	const other = otherLocale(locale);
	return renderTemplate`${maybeRenderHead($$result)}<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div><p class="wordmark" aria-hidden="true">JWLERIA</p><p>${s.tagline}</p><p class="fine">${s.footer.rights}</p></div><ul class="footer-nav"><li><a${addAttribute(href(locale, "/brands/"), "href")}>${s.nav.brands}</a></li><li><a${addAttribute(href(locale, "/catalog/"), "href")}>${s.nav.catalog}</a></li><li><a${addAttribute(href(locale, "/about/"), "href")}>${s.nav.about}</a></li><li><a${addAttribute(href(other, path), "href")}${addAttribute(other, "hreflang")}${addAttribute(other, "lang")}>${t(other).langName}</a></li></ul><ul class="footer-nav">${getCategories().map((c) => renderTemplate`<li><a${addAttribute(href(locale, `/categories/${c.slug}/`), "href")}>${c.name[locale]}</a></li>`)}</ul></div><div class="footer-base">${catalogMode() === "preview" && renderTemplate`<p class="fine">${s.footer.preview}</p>`}<p class="fine">© Jwleria</p></div></div></footer>`;
}, "/home/user/jwleria/apps/storefront/src/components/Footer.astro", void 0);
//#endregion
//#region src/components/InquiryDialog.astro
createAstro("https://astro.build");
var $$InquiryDialog = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$InquiryDialog;
	const s = t(Astro.props.locale);
	const live = inquiryChannel().live;
	return renderTemplate`${!live && renderTemplate`${maybeRenderHead($$result)}<dialog id="inquiry-dialog" class="inquiry" aria-labelledby="inquiry-title"${addAttribute(s.dialog.copied, "data-copied")}${addAttribute(s.dialog.failed, "data-failed")}><div class="inquiry__panel"><form method="dialog" class="inquiry__close"><button class="icon-btn"${addAttribute(s.dialog.close, "aria-label")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg></button></form><p class="eyebrow">${s.preview}</p><h2 id="inquiry-title">${s.dialog.title}</h2><p data-subject hidden></p><p data-ref-row hidden>${s.reference}: <bdi data-ref></bdi></p><p>${s.dialog.explain}</p><label class="field"><span class="note">${s.dialog.label}</span><textarea data-message readonly rows="4">${s.dialog.general}</textarea></label><div class="actions"><button type="button" class="btn btn--solid" data-copy>${s.dialog.copy}</button><form method="dialog"><button class="btn">${s.dialog.close}</button></form></div><p class="note" role="status" aria-live="polite" data-status></p></div></dialog>`}${renderScript($$result, "/home/user/jwleria/apps/storefront/src/components/InquiryDialog.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/jwleria/apps/storefront/src/components/InquiryDialog.astro", void 0);
//#endregion
//#region src/layouts/BaseLayout.astro
createAstro("https://astro.build");
var $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$BaseLayout;
	const { locale, title, description, path, canonicalPath = path, image = "/images/hero-editorial.webp" } = Astro2.props;
	const fullTitle = `${title} · Jwleria`;
	const live = (env.PUBLIC_RELEASE || void 0) === "live";
	const origin = env.PUBLIC_SITE_ORIGIN || void 0;
	if (live && (catalogMode() !== "live" || !inquiryChannel().live || !origin)) throw new Error("Live release requires the genuine catalog, verified WhatsApp and site origin");
	let site;
	if (origin) {
		site = new URL(origin);
		if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash) throw new Error("Invalid site origin");
	}
	const absolute = (value) => site ? new URL(value, site).href : value;
	const links = pageLinks(locale, canonicalPath, site);
	return renderTemplate`<html${addAttribute(locale, "lang")}${addAttribute(dirOf(locale), "dir")}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${fullTitle}</title><meta name="description"${addAttribute(description, "content")}><meta name="robots"${addAttribute(live ? "index, follow" : "noindex, nofollow", "content")}>${live && renderTemplate`<link rel="canonical"${addAttribute(links.canonical, "href")}>`}<meta name="theme-color" content="#fcfaf6"><link rel="stylesheet" href="/fonts/preview-fonts.css"><script>
      {
        const font = new URLSearchParams(location.search).get('font');
        if (font && ['amiri', 'el-messiri', 'aref-ruqaa'].includes(font)) {
          document.documentElement.dataset.fontPreview = font;
        }
      }
    <\/script>${links.alternates.map(([lang, url]) => renderTemplate`<link rel="alternate"${addAttribute(lang, "hreflang")}${addAttribute(url, "href")}>`)}${live && renderTemplate`<meta property="og:url"${addAttribute(links.canonical, "content")}>`}<meta property="og:type" content="website"><meta property="og:site_name" content="Jwleria"><meta property="og:title"${addAttribute(fullTitle, "content")}><meta property="og:description"${addAttribute(description, "content")}>${image && renderTemplate`<meta property="og:image"${addAttribute(absolute(image), "content")}>`}<meta property="og:locale"${addAttribute(locale === "ar" ? "ar_SA" : "en_GB", "content")}>${renderHead($$result)}</head><body><a class="skip" href="#main">${t(locale).skip}</a>${renderComponent($$result, "Header", $$Header, {
		"locale": locale,
		"path": path
	})}<main id="main" tabindex="-1">${renderSlot($$result, $$slots["default"])}</main>${renderComponent($$result, "Footer", $$Footer, {
		"locale": locale,
		"path": path
	})}${renderComponent($$result, "InquiryDialog", $$InquiryDialog, { "locale": locale })}</body></html>`;
}, "/home/user/jwleria/apps/storefront/src/layouts/BaseLayout.astro", void 0);
//#endregion
export { renderScript as n, $$BaseLayout as t };
