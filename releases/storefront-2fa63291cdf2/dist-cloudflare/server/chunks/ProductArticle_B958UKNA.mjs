globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { d as optionLabel, h as t, l as href, o as productInquiry, r as artClass, s as productTitle } from "./view_CX2_xOLw.mjs";
import { f as configurator, m as sizeTable, o as getCategory, p as controlLayout } from "./catalog_r4EbPbhn.mjs";
import { n as fullSizeImage, r as productMedia, t as $$ImageCredit } from "./ImageCredit_CthMeayF.mjs";
//#region src/components/Chevron.astro
var $$Chevron = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<svg class="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/Chevron.astro", void 0);
//#endregion
//#region src/components/gallery-view.mjs
/** @typedef {import('../contracts/catalog').PublicProduct} Product */
/** @typedef {import('../contracts/catalog').RepresentativeImage} Representative */
/** @typedef {import('../contracts/catalog').VariantLink} Link */
/** @typedef {import('../contracts/catalog').VariantOption} Option */
/** @typedef {{mode: 'own'} | {mode: 'none'} | {mode: 'missing', representative: Representative, details: Option[]}} GalleryView */
/**
* - 'own': the variant's own approved photographs.
* - 'missing': the variant has none. Its model's representative photograph, when there is one, is shown apart and
*   small, labelled with that photograph's own reference, its size and its first other option (a dial or colour),
*   so a photographed black dial is never read as the selected green one.
* - 'none': neither exists; the page shows its facts-only state.
* @param {Product} product the selected variant
* @param {Representative | undefined} representative
* @param {Link[]} variants the model's variants, to name the representative's options
* @returns {GalleryView}
*/
function galleryView(product, representative, variants = []) {
	if (product.images.length) return { mode: "own" };
	if (!representative || !representative.images.length || representative.slug === product.slug) return { mode: "none" };
	const sizeKind = representative.sizeOption?.kind;
	const other = variants.find((v) => v.slug === representative.slug)?.options.find((o) => o.kind !== sizeKind);
	return {
		mode: "missing",
		representative,
		details: [representative.sizeOption, other].filter(Boolean)
	};
}
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
//#region src/components/ProductGallery.astro
createAstro("https://astro.build");
var $$ProductGallery = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ProductGallery;
	const LIMIT = 8;
	const { product, locale, representative, variants = [] } = Astro.props;
	const s = t(locale);
	const view = galleryView(product, representative, variants);
	const views = view.mode === "own" ? product.images.slice(0, LIMIT).map((src, i) => ({
		src,
		i,
		label: s.product.views[i] ?? s.product.details,
		credit: product.imageVariants?.[i]?.attribution ?? product.imageVariants?.[i]?.permissionCredit,
		full: fullSizeImage(product, i),
		white: product.imageVariants?.[i]?.canvas === "white_square",
		clipped: product.imageVariants?.[i]?.sourceClipped === true,
		flat: product.imageVariants?.[i]?.canvas === "flat_tile"
	})) : [];
	const many = views.length > 1;
	const rep = view.mode === "missing" ? view.representative : void 0;
	const details = view.mode === "missing" ? view.details : [];
	const repMedia = rep && {
		...product,
		images: rep.images,
		image: rep.images[0],
		imageVariants: rep.imageVariants
	};
	const caption = s.product.representative;
	const repFull = repMedia && fullSizeImage(repMedia, 0);
	return renderTemplate`${views.length > 0 && renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(["pdp__gallery", { "pdp__gallery--many": many }], "class:list")}${addAttribute(product.name[locale], "aria-label")}${addAttribute(product.reference, "data-gallery")}>${views.map((v) => renderTemplate`<figure><div${addAttribute(["media", {
		"media--white": v.white,
		"media--flat": v.flat
	}], "class:list")}><img${addAttribute(v.i === 0 ? artClass(v.src, product.categorySlug, product.reference) : "art", "class")}${spreadAttributes(productMedia(product, v.i, many ? "detail" : "single"))}${addAttribute(product.name[locale], "alt")}${addAttribute(v.i === 0 ? "eager" : "lazy", "loading")}${addAttribute(v.i === 0 ? "high" : void 0, "fetchpriority")} decoding="async">${product.isPreview && v.i === 0 && renderTemplate`<span class="badge">${s.preview}</span>`}</div><figcaption>${v.label}${v.clipped && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · <span class="source-clipped">${s.product.sourceClipped}</span>` })}`}${v.full && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · <a class="full-size"${addAttribute(v.full.src, "href")}>${s.product.fullSize(v.full.width, v.full.height)}</a>` })}`}${v.credit && renderTemplate`${renderComponent($$result, "ImageCredit", $$ImageCredit, {
		"credit": v.credit,
		"locale": locale
	})}`}</figcaption></figure>`)}<p class="pdp__gallery-status" data-gallery-status hidden></p></div>`}${rep && repMedia && renderTemplate`<div class="pdp__gallery pdp__gallery--missing"${addAttribute(product.name[locale], "aria-label")}${addAttribute(rep.reference, "data-gallery")}><div class="photo-missing"><p class="photo-missing__title">${s.product.noPhoto}</p><p class="photo-missing__ref"><bdi dir="ltr">${product.reference}</bdi></p></div><figure class="pdp__other"><div${addAttribute(["media", {
		"media--white": rep.imageVariants?.[0]?.canvas === "white_square",
		"media--flat": rep.imageVariants?.[0]?.canvas === "flat_tile"
	}], "class:list")}><img class="art"${spreadAttributes(productMedia(repMedia, 0, "thumb"))}${addAttribute(`${product.name[locale]} — ${rep.reference}`, "alt")} decoding="async"></div><figcaption><span class="representative-note">${caption.before}<bdi dir="ltr">${rep.reference}</bdi>${details.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` (${details.map((o, i) => renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${i > 0 && " · "}${renderComponent($$result, "VariantText", $$VariantText, {
		"text": o.value[locale],
		"lang": o.valueLang
	})}` })}`)})` })}`}${caption.middle}<bdi dir="ltr">${product.reference}</bdi>${caption.end}</span>${rep.imageVariants?.[0]?.sourceClipped && renderTemplate`<span class="source-clipped">${s.product.sourceClipped}</span>`}${repFull && renderTemplate`<a class="full-size"${addAttribute(repFull.src, "href")}>${s.product.fullSize(repFull.width, repFull.height)}</a>`}${(rep.imageVariants?.[0]?.attribution ?? rep.imageVariants?.[0]?.permissionCredit) && renderTemplate`${renderComponent($$result, "ImageCredit", $$ImageCredit, {
		"credit": rep.imageVariants[0].attribution ?? rep.imageVariants[0].permissionCredit,
		"locale": locale
	})}`}</figcaption></figure><p class="pdp__gallery-status" data-gallery-status hidden></p></div>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ProductGallery.astro", void 0);
//#endregion
//#region src/components/VariantSelector.astro
createAstro("https://astro.build");
var $$VariantSelector = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$VariantSelector;
	const { variants, selected, locale } = Astro.props;
	const s = t(locale);
	const controls = configurator(variants, selected).map((control, i) => ({
		...control,
		id: `option-${i}`,
		layout: controlLayout(control, locale),
		name: optionLabel(locale, control.kind, control.label)
	}));
	const sizeKind = controls.find((c) => c.size)?.kind;
	const page = (slug) => href(locale, `/products/${slug}/`);
	return renderTemplate`${controls.length > 0 && renderTemplate`${maybeRenderHead($$result)}<div class="config" role="group"${addAttribute(s.variants.group, "aria-label")} data-config${addAttribute(s.variants.changed, "data-changed")}>${controls.map((c) => renderTemplate`<div class="config__control"${addAttribute(c.kind, "data-control")}${addAttribute(c.name, "data-label")}${addAttribute(c.current?.key, "data-current-key")}${addAttribute(c.current?.value[locale], "data-current-value")}${addAttribute(c.current?.valueLang, "data-current-lang")}>${c.layout === "segments" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="config__label"${addAttribute(c.id, "id")}>${c.name}</p><ul class="segments" role="list"${addAttribute(c.id, "aria-labelledby")}${addAttribute(`--segments:${c.values.length}`, "style")}>${c.values.map((v) => renderTemplate`<li><a class="segment"${addAttribute(page(v.slug), "href")}${addAttribute(v.current ? "true" : void 0, "aria-current")} data-variant-link${addAttribute(c.kind, "data-option-kind")}${addAttribute(v.key, "data-option-key")}${addAttribute(v.reference, "data-ref")}${addAttribute(v.photo ? "1" : "0", "data-photo")}>${renderComponent($$result, "VariantText", $$VariantText, {
		"text": v.value[locale],
		"lang": v.valueLang
	})}</a></li>`)}</ul>` })}`}${c.layout === "list" && renderTemplate`<details class="picker" name="product-options"${addAttribute(c.kind, "data-picker")}><summary class="picker__summary"><span class="picker__label">${c.name}</span><span class="picker__value">${c.current ? renderTemplate`${renderComponent($$result, "VariantText", $$VariantText, {
		"text": c.current.value[locale],
		"lang": c.current.valueLang
	})}` : "—"}</span>${renderComponent($$result, "Chevron", $$Chevron, {})}</summary><div class="picker__panel">${c.values.length > 0 && renderTemplate`<ul class="picker__list" role="list"${addAttribute(c.name, "aria-label")}>${c.values.map((v) => renderTemplate`<li><a class="picker__option"${addAttribute(page(v.slug), "href")}${addAttribute(v.current ? "true" : void 0, "aria-current")} data-variant-link${addAttribute(c.kind, "data-option-kind")}${addAttribute(v.key, "data-option-key")}${addAttribute(v.reference, "data-ref")}${addAttribute(v.photo ? "1" : "0", "data-photo")}><span class="picker__name">${renderComponent($$result, "VariantText", $$VariantText, {
		"text": v.value[locale],
		"lang": v.valueLang
	})}</span><svg class="picker__check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.1L13 4.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></li>`)}</ul>`}${c.elsewhere.length > 0 && renderTemplate`<details class="picker__elsewhere"><summary class="picker__heading"><span>${s.variants.otherSizes} (${c.elsewhere.length})</span>${renderComponent($$result, "Chevron", $$Chevron, {})}</summary><ul class="picker__list" role="list"${addAttribute(s.variants.otherSizes, "aria-label")}>${c.elsewhere.map((v) => renderTemplate`<li class="picker__row"><span class="picker__name">${renderComponent($$result, "VariantText", $$VariantText, {
		"text": v.value[locale],
		"lang": v.valueLang
	})}</span><span class="picker__sizes">${v.sizes.map((z) => renderTemplate`<a class="picker__size"${addAttribute(page(z.slug), "href")} data-variant-link${addAttribute(c.kind, "data-option-kind")}${addAttribute(v.key, "data-option-key")}${addAttribute(sizeKind, "data-also")}${addAttribute(z.reference, "data-ref")}${addAttribute(z.photo ? "1" : "0", "data-photo")}><span class="sr-only">${renderComponent($$result, "VariantText", $$VariantText, {
		"text": v.value[locale],
		"lang": v.valueLang
	})}${s.sizes.separator}</span>${renderComponent($$result, "VariantText", $$VariantText, {
		"text": z.value[locale],
		"lang": z.valueLang
	})}</a>`)}</span></li>`)}</ul></details>`}</div></details>`}${c.layout === "static" && c.current && renderTemplate`<p class="config__static"><span class="config__label">${c.name}</span> <span class="config__value">${renderComponent($$result, "VariantText", $$VariantText, {
		"text": c.current.value[locale],
		"lang": c.current.valueLang
	})}</span></p>`}</div>`)}<p class="config__notice" data-config-notice aria-hidden="true" hidden></p></div>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/VariantSelector.astro", void 0);
//#endregion
//#region src/components/SizeTable.astro
createAstro("https://astro.build");
var $$SizeTable = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$SizeTable;
	const { model, locale } = Astro.props;
	const s = t(locale);
	const table = sizeTable(model);
	return renderTemplate`${table && renderTemplate`${maybeRenderHead($$result)}<details class="fold" data-fold="sizes"><summary class="fold__summary"><span>${s.sizes.title}</span>${renderComponent($$result, "Chevron", $$Chevron, {})}</summary><div class="fold__body size-table"><table><thead><tr><th scope="col">${optionLabel(locale, table.kind, table.label)}</th><th scope="col">${s.reference}</th><th scope="col">${s.sizes.details}</th></tr></thead><tbody>${table.rows.map((row) => renderTemplate`<tr${addAttribute(row.current ? "true" : void 0, "aria-current")}><th scope="row">${renderComponent($$result, "VariantText", $$VariantText, {
		"text": row.option.value[locale],
		"lang": row.option.valueLang
	})}</th><td>${row.current ? renderTemplate`<bdi dir="ltr">${row.reference}</bdi>` : renderTemplate`<a${addAttribute(href(locale, `/products/${row.slug}/`), "href")} data-variant-link${addAttribute(table.kind, "data-option-kind")}${addAttribute(row.key, "data-option-key")}${addAttribute(row.reference, "data-ref")}${addAttribute(row.photo ? "1" : "0", "data-photo")}><bdi dir="ltr">${row.reference}</bdi></a>`}</td><td>${row.facts.map((fact) => renderTemplate`<span class="size-table__fact">${optionLabel(locale, fact.kind, fact.label)}: ${renderComponent($$result, "VariantText", $$VariantText, {
		"text": fact.value[locale],
		"lang": fact.valueLang
	})}</span>`)}${row.options.length > 0 && renderTemplate`<span class="size-table__fact">${row.options.map((o) => s.variants.count(o.kind, o.count)).join(s.sizes.separator)}</span>`}</td></tr>`)}</tbody></table></div></details>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/SizeTable.astro", void 0);
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
//#region src/components/ProductArticle.astro
createAstro("https://astro.build");
var $$ProductArticle = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ProductArticle;
	const { model, locale, brand, origin } = Astro.props;
	const product = model.selected;
	const grouped = model.variants.length > 1;
	const s = t(locale);
	const category = getCategory(product.categorySlug);
	const inquiry = productInquiry(locale, product, origin, brand);
	const facts = productFacts(locale, product, (kind, fallback) => optionLabel(locale, kind, fallback));
	const pictured = galleryView(product, model.representative, model.variants).mode !== "none";
	return renderTemplate`${maybeRenderHead($$result)}<article${addAttribute(["pdp", { "pdp--facts": !pictured }], "class:list")} data-variant-root${addAttribute(product.reference, "data-reference")}${addAttribute(product.slug, "data-slug")}${addAttribute(`${productTitle(model, locale)} · Jwleria`, "data-title")}${addAttribute(s.product.photoLoading, "data-photo-loading")}${addAttribute(s.product.photoMissing, "data-photo-missing")}><header class="pdp__head">${brand ? renderTemplate`<a class="pdp__brand"${addAttribute(href(locale, `/brands/${brand.slug}/`), "href")} lang="en" dir="ltr">${brand.name}</a>` : renderTemplate`<p class="pdp__brand">${s.brands.ownTitle}</p>`}<h1>${model.name[locale]}</h1><p class="pdp__ref">${s.reference} <bdi dir="ltr" data-variant-reference>${product.reference}</bdi></p></header>${renderComponent($$result, "ProductGallery", $$ProductGallery, {
		"product": product,
		"locale": locale,
		"representative": model.representative,
		"variants": model.variants
	})}<div class="pdp__info">${facts.intro && renderTemplate`<p class="pdp__intro">${facts.intro}</p>`}${product.isPreview && renderTemplate`<p class="note">${s.preview} — ${s.previewNote}</p>`}${grouped && !pictured && renderTemplate`<p class="note">${s.product.noPhoto}</p>`}${renderComponent($$result, "VariantSelector", $$VariantSelector, {
		"variants": model.variants,
		"selected": product,
		"locale": locale
	})}${model.variantCount !== void 0 && model.variantCount > model.variants.length && renderTemplate`<p class="note">${s.variants.partial(model.variants.length, model.variantCount)}</p>`}<div class="pdp__cta">${inquiry ? renderTemplate`<a class="cta cta--solid"${addAttribute(inquiry.href, "href")}${spreadAttributes(inquiry.attrs)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.4 18.7z"></path></svg>${s.cta}</a>` : renderTemplate`<button class="cta cta--solid" type="button" disabled${addAttribute(s.whatsapp.pendingDescription, "title")}>${s.cta} — ${s.whatsapp.pending}</button>`}<p class="note">${grouped && product.isPreview && `${s.preview} — `}${s.product.confirm}</p></div><div class="folds"><details class="fold" data-fold="specs"${addAttribute(!pictured, "open")}><summary class="fold__summary"><span>${s.product.specs}</span>${renderComponent($$result, "Chevron", $$Chevron, {})}</summary><div class="fold__body facts" data-variant-specs><section class="facts__group" aria-labelledby="facts-identity"><h3 class="facts__title" id="facts-identity">${s.product.groups.identity}</h3><p class="fact"><strong>${s.reference}:</strong> <bdi dir="ltr">${product.reference}</bdi></p>${brand && product.collectionKind !== "source-group" && renderTemplate`<p class="fact"><strong>${s.product.collection}:</strong> <bdi lang="en" dir="ltr" class="brand-name">${product.collection[locale]}</bdi></p>`}${category && renderTemplate`<p class="fact"><strong>${s.product.category}:</strong> ${category.name[locale]}</p>`}</section>${facts.groups.map((group) => renderTemplate`<section class="facts__group"${addAttribute(`facts-${group.key}`, "aria-labelledby")}><h3 class="facts__title"${addAttribute(`facts-${group.key}`, "id")}>${s.product.groups[group.key]}</h3>${group.facts.map((fact) => renderTemplate`<p class="fact"><strong>${fact.label}:</strong> ${renderComponent($$result, "VariantText", $$VariantText, {
		"text": fact.value,
		"lang": fact.lang
	})}</p>`)}</section>`)}</div></details>${renderComponent($$result, "SizeTable", $$SizeTable, {
		"model": model,
		"locale": locale
	})}<details class="fold" data-fold="inquiry" id="inquiry"><summary class="fold__summary"><span>${s.product.how}</span>${renderComponent($$result, "Chevron", $$Chevron, {})}</summary><div class="fold__body inquiry-note"><p>${product.isPreview ? s.dialog.explain : s.product.message}</p><blockquote>${s.dialog.product(product.name[locale], product.reference, brand?.name)}</blockquote></div></details></div></div></article>`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/ProductArticle.astro", void 0);
//#endregion
export { $$ProductArticle as t };
