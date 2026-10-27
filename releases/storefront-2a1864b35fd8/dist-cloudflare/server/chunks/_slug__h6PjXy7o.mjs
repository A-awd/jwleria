globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { n as renderScript, t as $$BaseLayout } from "./BaseLayout_B9_7cqTH.mjs";
import { c as href, d as optionLabel, h as t, l as isLocale, o as productInquiry, r as artClass } from "./view_C9MmrhZz.mjs";
import { r as selectorAxes } from "./variant-selection_DQ5S3oqF.mjs";
import { d as getRelatedProducts, l as getProductModel, n as getBrand, o as getCategory } from "./catalog_COnrN2ql.mjs";
import { i as shareImage, n as $$ImageCredit, r as productMedia, t as $$ProductCard } from "./ProductCard_CAeEovlC.mjs";
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
}, "/home/user/jwleria/apps/storefront/src/components/ProductGallery.astro", void 0);
//#endregion
//#region src/components/VariantText.astro
createAstro("https://astro.build");
var $$VariantText = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$VariantText;
	const { text, lang } = Astro.props;
	return renderTemplate`${lang ? renderTemplate`${maybeRenderHead($$result)}<bdi${addAttribute(lang, "lang")} dir="ltr">${text}</bdi>` : text}`;
}, "/home/user/jwleria/apps/storefront/src/components/VariantText.astro", void 0);
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
}, "/home/user/jwleria/apps/storefront/src/components/VariantSelector.astro", void 0);
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
	})}<div class="pdp__info">${brand ? renderTemplate`<a class="pdp__brand"${addAttribute(href(locale, `/brands/${brand.slug}/`), "href")} lang="en" dir="ltr">${brand.name}</a>` : renderTemplate`<p class="pdp__brand">${s.brands.ownTitle}</p>`}<h1>${model.name[locale]}</h1><p>${product.summary[locale]}</p>${product.isPreview && renderTemplate`<p class="note">${s.preview} — ${s.previewNote}</p>`}${grouped && !product.image && renderTemplate`<p class="note">${s.product.noPhoto}</p>`}${renderComponent($$result, "VariantSelector", $$VariantSelector, {
		"variants": model.variants,
		"selected": product,
		"locale": locale
	})}<dl class="specs" data-variant-specs><dt>${s.reference}</dt><dd><bdi data-variant-reference>${product.reference}</bdi></dd>${brand && product.collectionKind !== "source-group" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<dt>${s.product.collection}</dt><dd lang="en" dir="ltr" class="brand-name">${product.collection[locale]}</dd>` })}`}${category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<dt>${s.product.category}</dt><dd>${category.name[locale]}</dd>` })}`}${product.specs.map((spec) => renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<dt>${optionLabel(locale, spec.kind, spec.label)}</dt><dd>${renderComponent($$result, "VariantText", $$VariantText, {
		"text": spec.value[locale],
		"lang": spec.valueLang
	})}</dd>` })}`)}</dl><section class="inquiry-note" id="inquiry" aria-labelledby="h-how"><h2 id="h-how">${s.product.how}</h2><p>${product.isPreview ? s.dialog.explain : s.product.confirm}</p><blockquote>${s.dialog.product(product.name[locale], product.reference, brand?.name)}</blockquote></section></div><div class="pdp__cta">${inquiry ? renderTemplate`<a class="cta cta--solid"${addAttribute(inquiry.href, "href")}${spreadAttributes(inquiry.attrs)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.4 18.7z"></path></svg>${s.cta}</a>` : renderTemplate`<button class="cta cta--solid" type="button" disabled${addAttribute(s.whatsapp.pendingDescription, "title")}>${s.cta} — ${s.whatsapp.pending}</button>`}<p class="note">${grouped && product.isPreview && `${s.preview} — `}${s.product.confirm}</p></div></article>${grouped && renderTemplate`<p class="variant-status" role="status" aria-live="polite" data-variant-status${addAttribute(s.variants.showing("{ref}"), "data-template")}></p>`}${related.length > 0 && renderTemplate`<section class="section" aria-labelledby="h-related"><div class="section-head"><h2 id="h-related">${s.product.related}</h2></div><div class="grid grid--4">${related.map((p) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, {
		"product": p,
		"locale": locale
	})}`)}</div></section>`}</div>` })}${renderScript($$result, "/home/user/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro", void 0);
var $$file = "/home/user/jwleria/apps/storefront/src/pages/[locale]/products/[slug].astro";
var $$url = "/[locale]/products/[slug]/";
//#endregion
//#region \0virtual:astro:page:src/pages/[locale]/products/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
