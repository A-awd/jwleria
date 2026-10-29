globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { n as renderScript, t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { t as $$WhatsAppContact } from "./WhatsAppContact_DNme9nYU.mjs";
import { c as href, l as isLocale, m as t, n as TIERS, r as artClass, t as OWN_COLLECTION } from "./view_DI4H_3ae.mjs";
import { a as getCategories, c as getLatestProducts, i as getBrands } from "./catalog_fhia_VZa.mjs";
import { t as $$ProductCard } from "./ProductCard_BeOnNK2x.mjs";
//#region src/pages/[locale]/index.astro
var _locale__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const { locale } = Astro.params;
	if (!isLocale(locale)) return new Response("Not found", { status: 404 });
	const s = t(locale);
	const [directory, latest] = await Promise.all([getBrands(), getLatestProducts(6)]);
	const brands = directory.filter((b) => b.slug !== OWN_COLLECTION).sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.name.localeCompare(b.name));
	const categories = getCategories();
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": s.tagline,
		"description": s.hero.lead,
		"path": "/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="hero"><img class="hero__img" src="/images/hero-editorial.webp" alt="" width="1672" height="941" fetchpriority="high" decoding="async"><div class="hero__copy">${s.hero.eyebrow && renderTemplate`<p class="eyebrow reveal">${s.hero.eyebrow}</p>`}<h1 class="reveal reveal--2">${s.hero.title}</h1><p class="hero__lead reveal reveal--3">${s.hero.lead}</p><div class="actions reveal reveal--3"><a class="btn btn--solid"${addAttribute(href(locale, "/brands/"), "href")}>${s.hero.primary}</a><a class="btn"${addAttribute(href(locale, "/catalog/"), "href")}>${s.hero.secondary}</a></div></div></section><section class="section" aria-labelledby="h-brands"><div class="wrap section-head"><div><h2 id="h-brands">${s.brands.title}</h2><p>${s.brands.lead}</p></div><div class="brand-actions"><button class="icon-btn brand-motion" type="button" data-brand-motion aria-controls="brand-strip" aria-pressed="false"${addAttribute(locale === "ar" ? "إيقاف حركة العلامات" : "Pause brand movement", "aria-label")}${addAttribute(locale === "ar" ? "إيقاف حركة العلامات" : "Pause brand movement", "data-pause-label")}${addAttribute(locale === "ar" ? "تشغيل حركة العلامات" : "Resume brand movement", "data-play-label")}><svg class="brand-motion__pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg><svg class="brand-motion__play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 5 10 7-10 7Z"></path></svg></button><a class="link-quiet"${addAttribute(href(locale, "/brands/"), "href")}>${s.viewAll}</a></div></div><nav id="brand-strip" class="brand-strip" aria-labelledby="h-brands" data-paused="false"><div class="brand-strip__track" dir="ltr"><div class="brand-strip__group">${brands.map((b) => renderTemplate`<a${addAttribute(href(locale, `/brands/${b.slug}/`), "href")} lang="en" dir="ltr">${b.name}</a>`)}</div><div class="brand-strip__group" aria-hidden="true">${brands.map((b) => renderTemplate`<a${addAttribute(href(locale, `/brands/${b.slug}/`), "href")} lang="en" dir="ltr" tabindex="-1">${b.name}</a>`)}</div></div></nav></section><section class="section section--tight" aria-labelledby="h-cats"><div class="wrap"><div class="section-head"><div><h2 id="h-cats">${s.categories.title}</h2><p>${s.categories.lead}</p></div></div><div class="tiles">${categories.map((c) => renderTemplate`<a class="tile"${addAttribute(href(locale, `/categories/${c.slug}/`), "href")}><span class="media"><img${addAttribute(artClass(c.image, c.slug), "class")}${addAttribute(c.image, "src")} alt="" width="800" height="1000" loading="lazy" decoding="async"></span><span class="tile__name">${c.name[locale]}<span aria-hidden="true">${locale === "ar" ? "←" : "→"}</span></span></a>`)}</div></div></section><section class="section section--tight" aria-labelledby="h-latest"><div class="wrap"><div class="section-head"><div><h2 id="h-latest">${s.latest.title}</h2><p>${s.latest.lead}</p></div><a class="link-quiet"${addAttribute(href(locale, "/catalog/"), "href")}>${s.viewAll}</a></div><div class="grid">${latest.map((p) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale,
		"columns": 3
	})}`)}</div></div></section><section class="band" aria-labelledby="h-inquiry"><div class="wrap"><h2 id="h-inquiry">${s.inquiryBand.title}</h2><p>${s.inquiryBand.text}</p>${renderComponent($$result, "WhatsAppContact", $$WhatsAppContact, {
		"locale": locale,
		"variant": "light"
	})}</div></section>` })}${renderScript($$result, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/index.astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/index.astro";
var $$url = "/[locale]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/index@_@astro
var page = () => _locale__exports;
//#endregion
export { page };
