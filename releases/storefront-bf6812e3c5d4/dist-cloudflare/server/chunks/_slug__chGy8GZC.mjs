globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { n as renderScript, t as $$BaseLayout } from "./BaseLayout_DIOzp_hM.mjs";
import { c as href, l as isLocale, m as t, o as productInquiry, r as artClass, u as optionLabel } from "./view_DI4H_3ae.mjs";
import { d as getRelatedProducts, f as selectorAxes, l as getProductModel, n as getBrand, o as getCategory } from "./catalog_fhia_VZa.mjs";
import { i as shareImage, n as $$ImageCredit, r as productMedia, t as $$ProductCard } from "./ProductCard_BeOnNK2x.mjs";
//#region src/components/ProductGallery.astro
createAstro("https://astro.build");
var $$ProductGallery = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ProductGallery;
	const LIMIT = 8;
	const { product, locale } = Astro.props;
	const s = t(locale);
	const views = product.images.slice(0, LIMIT).map((src, i) => ({
		src,
		i,
		label: s.product.views[i] ?? s.product.details,
		credit: product.imageVariants?.[i]?.attribution
	}));
	return renderTemplate`${views.length > 0 && renderTemplate`${maybeRenderHead($$result)}<div class="pdp__gallery"${addAttribute(product.name[locale], "aria-label")}${addAttribute(product.reference, "data-gallery")}>${views.map((v) => renderTemplate`<figure><div class="media"><img${addAttribute(v.i === 0 ? artClass(v.src, product.categorySlug, product.reference) : "art", "class")}${spreadAttributes(productMedia(product, v.i, "detail"))}${addAttribute(product.name[locale], "alt")}${addAttribute(v.i === 0 ? "eager" : "lazy", "loading")}${addAttribute(v.i === 0 ? "high" : void 0, "fetchpriority")} decoding="async">${product.isPreview && v.i === 0 && renderTemplate`<span class="badge">${s.preview}</span>`}</div><figcaption>${v.label}${v.credit && renderTemplate`${renderComponent($$result, "ImageCredit", $$ImageCredit, {
		"credit": v.credit,
		"locale": locale
	})}`}</figcaption></figure>`)}</div>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ProductGallery.astro", void 0);
//#endregion
//#region src/components/VariantText.astro
createAstro("https://astro.build");
var $$VariantText = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$VariantText;
	const { text, lang } = Astro.props;
	return renderTemplate`${lang ? renderTemplate`${maybeRenderHead($$result)}<bdi${addAttribute(lang, "lang")} dir="ltr">${text}</bdi>` : text}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/VariantText.astro", void 0);
//#endregion
//#region src/components/VariantSelector.astro
createAstro("https://astro.build");
var $$VariantSelector = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$VariantSelector;
	const { variants, selected, locale } = Astro.props;
	const s = t(locale);
	const axes = selectorAxes(variants, selected);
	return renderTemplate`${axes.length > 0 && renderTemplate`${maybeRenderHead($$result)}<div class="variant-selector" role="group"${addAttribute(s.variants.group, "aria-label")} data-variant-selector>${axes.map((axis, a) => renderTemplate`<fieldset class="variant-option"><legend>${optionLabel(locale, axis.kind, axis.label)}${axis.current && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`: <span>${renderComponent($$result, "VariantText", $$VariantText, {
		"text": axis.current.value[locale],
		"lang": axis.current.valueLang
	})}</span>` })}`}</legend><ul class="variant-values" role="list">${axis.values.map((v, i) => renderTemplate`<li class="variant-item"><a class="chip variant-value"${addAttribute(href(locale, `/products/${v.slug}/`), "href")}${addAttribute(v.current ? "true" : void 0, "aria-current")}${addAttribute(v.changes.length ? `variant-note-${a}-${i}` : void 0, "aria-describedby")} data-variant-link${addAttribute(axis.kind, "data-option-kind")}${addAttribute(v.key, "data-option-key")}>${renderComponent($$result, "VariantText", $$VariantText, {
		"text": v.value[locale],
		"lang": v.valueLang
	})}</a>${v.changes.length > 0 && renderTemplate`<small class="variant-note"${addAttribute(`variant-note-${a}-${i}`, "id")}>${s.variants.changes(v.changes.map((c) => ({
		label: optionLabel(locale, c.kind, c.label),
		value: c.value[locale],
		valueLang: c.valueLang
	}))).map((part) => typeof part === "string" ? part : renderTemplate`${renderComponent($$result, "VariantText", $$VariantText, {
		"text": part.value,
		"lang": part.valueLang
	})}`)}</small>`}</li>`)}</ul></fieldset>`)}</div>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/VariantSelector.astro", void 0);
//#endregion
//#region src/components/product-facts.mjs
var SUMMARY_LABELS = {
	material: ["المادة", "Material"],
	diameter: ["القطر", "Diameter"],
	dimensions: ["الأبعاد", "Dimensions"],
	color: ["اللون", "Color"],
	movement: ["آلية الحركة", "Movement"],
	calibre: ["العيار", "Calibre"],
	water_resistance: ["مقاومة الماء", "Water resistance"],
	finish: ["التشطيب", "Finish"],
	logo_material: ["مادة الشعار", "Logo material"],
	compatible_strap_material: ["مادة شريط الحزام المتوافق", "Compatible belt strap material"],
	belt_included: ["الحزام مرفق", "Belt included"],
	strap_included: ["شريط الحزام مرفق", "Belt strap included"],
	buckle_included: ["مشبك الحزام مرفق", "Belt buckle included"]
};
var COVERED_BY = {
	material: ["material"],
	diameter: [
		"diameter",
		"case_diameter",
		"case_size"
	],
	dimensions: ["dimensions"],
	color: [
		"colour",
		"color",
		"dial"
	],
	movement: ["movement"],
	calibre: ["calibre"],
	water_resistance: ["water_resistance"]
};
var SUMMARY = {
	en: {
		pattern: /^.+?\. Reference: (\S+?)\.(?: (.+)\.)?$/s,
		separator: "; "
	},
	ar: {
		pattern: /^.+?\. المرجع: (\S+?)\.(?: (.+)\.)?$/s,
		separator: "؛ "
	}
};
var TECHNICAL = /* @__PURE__ */ new Set([
	"movement",
	"calibre",
	"power_reserve",
	"water_resistance"
]);
var DESIGN = /* @__PURE__ */ new Set([
	"diameter",
	"case_diameter",
	"case_size",
	"material",
	"dial",
	"colour",
	"color",
	"bracelet",
	"bracelet_material",
	"dimensions",
	"weight",
	"lining",
	"closure",
	"metallic_hardware",
	"leather_type",
	"size",
	"ring_size",
	"bracelet_size",
	"bag_size",
	"finish",
	"logo_material",
	"compatible_strap_material",
	"belt_included",
	"strap_included",
	"buckle_included"
]);
var ARABIC = /[؀-ۿ]/;
/** The facts a generated summary states, in its order; undefined when the summary is not one (free text is kept as written). */
function summaryFacts(locale, product) {
	const { pattern, separator } = SUMMARY[locale];
	const match = pattern.exec(product.summary[locale] ?? "");
	if (!match || match[1] !== product.reference) return void 0;
	const byLabel = new Map(Object.entries(SUMMARY_LABELS).map(([key, labels]) => [labels[locale === "ar" ? 0 : 1], key]));
	const facts = [];
	for (const part of match[2] ? match[2].split(separator) : []) {
		const at = part.indexOf(": ");
		const key = at > 0 ? byLabel.get(part.slice(0, at)) : void 0;
		if (key && !facts.some((f) => f.kind === key)) facts.push({
			kind: key,
			label: part.slice(0, at),
			value: part.slice(at + 2)
		});
		else if (facts.length) facts[facts.length - 1].value += separator + part;
		else return void 0;
	}
	return facts.map((f) => locale === "ar" && !ARABIC.test(f.value) ? {
		...f,
		lang: "en"
	} : f);
}
/**
* Design, technical and other facts of one variant, each group only when it has a fact. `label` resolves a
* kind's display label (the reviewed translation when known). `intro` is a summary that is not generated from
* facts, shown as written; a generated summary is never repeated, since its facts are in the groups.
* @param {'ar' | 'en'} locale
* @param {{reference: string, summary: Record<string, string>, specs: {kind: string, label: Record<string, string>, value: Record<string, string>, valueLang?: 'en'}[]}} product
* @param {(kind: string, fallback: Record<string, string>) => string} [label]
* @returns {{intro: string | undefined, groups: {key: 'design' | 'technical' | 'other', facts: {kind: string, label: string, value: string, lang?: 'en'}[]}[]}}
*/
function productFacts(locale, product, label = (kind, fallback) => fallback[locale]) {
	const facts = product.specs.map((s) => ({
		kind: s.kind,
		label: label(s.kind, s.label),
		value: s.value[locale],
		lang: s.valueLang
	}));
	const extra = summaryFacts(locale, product);
	const kinds = new Set(facts.map((f) => f.kind));
	for (const f of extra ?? []) if (!(COVERED_BY[f.kind] ?? [f.kind]).some((k) => kinds.has(k))) facts.push({
		...f,
		label: label(f.kind, { [locale]: f.label })
	});
	const group = (kind) => TECHNICAL.has(kind) ? "technical" : DESIGN.has(kind) ? "design" : "other";
	const groups = [
		"design",
		"technical",
		"other"
	].map((key) => ({
		key,
		facts: facts.filter((f) => group(f.kind) === key)
	})).filter((g) => g.facts.length);
	return {
		intro: extra ? void 0 : product.summary[locale],
		groups
	};
}
//#endregion
//#region src/pages/[locale]/products/[slug].astro
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
	if (!isLocale(locale)) return Astro.redirect("/404/");
	const model = await getProductModel(slug ?? "");
	if (!model) return Astro.redirect("/404/");
	const product = model.selected;
	const grouped = model.variants.length > 1;
	const s = t(locale);
	const [brand, related] = await Promise.all([getBrand(product.brandSlug), getRelatedProducts(product, 4, model.key)]);
	const category = getCategory(product.categorySlug);
	const inquiry = productInquiry(locale, product, Astro.url.origin, brand);
	const facts = productFacts(locale, product, (kind, fallback) => optionLabel(locale, kind, fallback));
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"locale": locale,
		"title": grouped ? `${model.name[locale]} — ${product.reference}` : model.name[locale],
		"description": product.summary[locale],
		"path": `/products/${product.slug}/`,
		"canonicalPath": `/products/${model.primary.slug}/`,
		"image": shareImage(product)
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="wrap"><nav class="crumb" style="padding-top:1.5rem"><a${addAttribute(href(locale, "/catalog/"), "href")}>${s.nav.catalog}</a>${category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` / <a${addAttribute(href(locale, `/categories/${category.slug}/`), "href")}>${category.name[locale]}</a>` })}`}</nav><article${addAttribute(["pdp", { "pdp--facts": !product.image }], "class:list")} data-variant-root${addAttribute(product.reference, "data-reference")}>${renderComponent($$result, "ProductGallery", $$ProductGallery, {
		"product": product,
		"locale": locale
	})}<div class="pdp__info">${brand ? renderTemplate`<a class="pdp__brand"${addAttribute(href(locale, `/brands/${brand.slug}/`), "href")} lang="en" dir="ltr">${brand.name}</a>` : renderTemplate`<p class="pdp__brand">${s.brands.ownTitle}</p>`}<h1>${model.name[locale]}</h1>${facts.intro && renderTemplate`<p>${facts.intro}</p>`}${product.isPreview && renderTemplate`<p class="note">${s.preview} — ${s.previewNote}</p>`}${grouped && !product.image && renderTemplate`<p class="note">${s.product.noPhoto}</p>`}${renderComponent($$result, "VariantSelector", $$VariantSelector, {
		"variants": model.variants,
		"selected": product,
		"locale": locale
	})}<div class="facts" data-variant-specs><section class="facts__group" aria-labelledby="facts-identity"><h2 class="facts__title" id="facts-identity">${s.product.groups.identity}</h2><p class="fact"><strong>${s.reference}:</strong> <bdi data-variant-reference>${product.reference}</bdi></p>${brand && product.collectionKind !== "source-group" && renderTemplate`<p class="fact"><strong>${s.product.collection}:</strong> <bdi lang="en" dir="ltr" class="brand-name">${product.collection[locale]}</bdi></p>`}${category && renderTemplate`<p class="fact"><strong>${s.product.category}:</strong> ${category.name[locale]}</p>`}</section>${facts.groups.map((group) => renderTemplate`<section class="facts__group"${addAttribute(`facts-${group.key}`, "aria-labelledby")}><h2 class="facts__title"${addAttribute(`facts-${group.key}`, "id")}>${s.product.groups[group.key]}</h2>${group.facts.map((fact) => renderTemplate`<p class="fact"><strong>${fact.label}:</strong> ${renderComponent($$result, "VariantText", $$VariantText, {
		"text": fact.value,
		"lang": fact.lang
	})}</p>`)}</section>`)}</div><section class="inquiry-note" id="inquiry" aria-labelledby="h-how"><h2 id="h-how">${s.product.how}</h2><p>${product.isPreview ? s.dialog.explain : s.product.confirm}</p><blockquote>${s.dialog.product(product.name[locale], product.reference, brand?.name)}</blockquote></section></div><div class="pdp__cta">${inquiry ? renderTemplate`<a class="cta cta--solid"${addAttribute(inquiry.href, "href")}${spreadAttributes(inquiry.attrs)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.4 18.7z"></path></svg>${s.cta}</a>` : renderTemplate`<button class="cta cta--solid" type="button" disabled${addAttribute(s.whatsapp.pendingDescription, "title")}>${s.cta} — ${s.whatsapp.pending}</button>`}<p class="note">${grouped && product.isPreview && `${s.preview} — `}${s.product.confirm}</p></div></article>${grouped && renderTemplate`<p class="variant-status" role="status" aria-live="polite" data-variant-status${addAttribute(s.variants.showing("{ref}"), "data-template")}></p>`}${related.length > 0 && renderTemplate`<section class="section" aria-labelledby="h-related"><div class="section-head"><h2 id="h-related">${s.product.related}</h2></div><div class="grid grid--4">${related.map((p) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale
	})}`)}</div></section>`}</div>` })}${renderScript($$result, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro", void 0);
var $$file = "/Users/Shared/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro";
var $$url = "/[locale]/products/[slug]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/products/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
