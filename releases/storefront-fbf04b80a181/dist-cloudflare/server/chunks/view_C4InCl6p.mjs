globalThis.process ??= {};
globalThis.process.env ??= {};
import { env } from "node:process";
//#region src/components/inquiry-message.mjs
var fold = (value) => String(value ?? "").normalize("NFKD").replace(/[\p{M}\u0640]/gu, "").toLowerCase().replace(/ٱ/g, "ا").replace(/ى/g, "ي").replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 15)).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/**
* The brand an inquiry should name: empty when unknown, or when the localized name already contains it as
* whole words (an Arabic name without the Latin brand still gets it).
* @param {string | undefined} brand
* @param {string} name
*/
function inquiryBrand(brand, name) {
	const b = typeof brand === "string" ? brand.trim() : "", key = fold(b);
	return key && !` ${fold(name)} `.includes(` ${key} `) ? b : "";
}
/** @param {string} name @param {string | undefined} brand */
function withBrand(name, brand) {
	const b = inquiryBrand(brand, name);
	return b ? `${b} — ${name}` : name;
}
/** Attach the actual public product link without accepting arbitrary paths or destinations. */
function productInquiryMessage(message, origin, locale, slug) {
	if (!["ar", "en"].includes(locale) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid inquiry product identity");
	const base = new URL(origin);
	if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("Invalid public inquiry origin");
	return `${message}\n${new URL(`/${locale}/products/${slug}/`, base).href}`;
}
//#endregion
//#region src/i18n/ui.ts
var isLocale = (v) => v === "ar" || v === "en";
var dirOf = (l) => l === "ar" ? "rtl" : "ltr";
var otherLocale = (l) => l === "ar" ? "en" : "ar";
var href = (l, path = "/") => `/${l}${path.startsWith("/") ? path : `/${path}`}`;
var AR_COUNTS = {
	dial: [
		"خيار ميناء واحد",
		"خيارا ميناء",
		"خيارات ميناء",
		"خيار ميناء",
		"خيار ميناء"
	],
	bracelet: [
		"سوار واحد",
		"سواران",
		"أساور",
		"سوارًا",
		"سوار"
	],
	bracelet_material: [
		"مادة سوار واحدة",
		"مادتا سوار",
		"مواد سوار",
		"مادة سوار",
		"مادة سوار"
	],
	colour: [
		"لون واحد",
		"لونان",
		"ألوان",
		"لونًا",
		"لون"
	],
	size: [
		"مقاس واحد",
		"مقاسان",
		"مقاسات",
		"مقاسًا",
		"مقاس"
	],
	case_size: [
		"قطر واحد",
		"قطران",
		"أقطار",
		"قطرًا",
		"قطر"
	],
	option: [
		"خيار واحد",
		"خياران",
		"خيارات",
		"خيارًا",
		"خيار"
	]
};
var EN_COUNTS = {
	dial: ["dial", "dials"],
	bracelet: ["bracelet", "bracelets"],
	bracelet_material: ["bracelet material", "bracelet materials"],
	colour: ["colour", "colours"],
	size: ["size", "sizes"],
	ring_size: ["ring size", "ring sizes"],
	bracelet_size: ["bracelet size", "bracelet sizes"],
	bag_size: ["bag size", "bag sizes"],
	case_size: ["case diameter", "case diameters"],
	option: ["option", "options"]
};
var countKind = (kind, table) => {
	const k = kind === "color" ? "colour" : kind;
	return k in table ? k : /^(?:ring|bracelet|bag)_size$/.test(k) && "size" in table ? "size" : "option";
};
var AR_MODELS = [
	"طراز واحد",
	"طرازان",
	"طرازات",
	"طرازًا",
	"طراز"
];
var arabicPlural = ([one, two, few, many, other], n) => {
	const tens = n % 100;
	return n === 1 ? one : n === 2 ? two : tens >= 3 && tens <= 10 ? `${n} ${few}` : tens >= 11 ? `${n} ${many}` : `${n} ${other}`;
};
var arabicCount = (kind, n) => arabicPlural(AR_COUNTS[countKind(kind, AR_COUNTS)], n);
function englishCount(kind, n) {
	const [one, other] = EN_COUNTS[countKind(kind, EN_COUNTS)];
	return `${n} ${n === 1 ? one : other}`;
}
var changeNote = (lead, separator, item) => (changes) => [lead, ...changes.flatMap((c, i) => [
	...i ? [separator] : [],
	item(c.label),
	c
])];
var ui = {
	ar: {
		langName: "العربية",
		skip: "الانتقال إلى المحتوى",
		tagline: "مختارات من عالم الفخامة",
		nav: {
			brands: "العلامات",
			categories: "الفئات",
			catalog: "الكتالوج",
			about: "عن Jwleria"
		},
		menu: "القائمة",
		search: "بحث",
		contact: "التواصل معنا",
		whatsapp: {
			contact: "التواصل عبر واتساب",
			pending: "قيد التجهيز",
			pendingDescription: "سيتاح التواصل المباشر فور تجهيز رقم واتساب."
		},
		cta: "التواصل عبر واتساب لمعرفة السعر",
		preview: "عرض تجريبي",
		previewNote: "صورة توضيحية مولَّدة لأغراض المعاينة، وليست منتجاً حقيقياً.",
		reference: "المرجع",
		viewAll: "عرض الكل",
		hero: {
			eyebrow: "",
			title: "الفخامة، بكل تفاصيلها",
			lead: "دليل العلامات العالمية ومختارات من القطع، والتفاصيل عبر واتساب.",
			primary: "العلامات",
			secondary: "المختارات"
		},
		brands: {
			title: "دليل العلامات",
			lead: "أسماء من الفخامة الكلاسيكية والميسّرة والمعاصرة. ظهور الاسم لا يعني توفّر قطعه.",
			all: "الكل",
			count: (n) => `${n} علامة`,
			ownTitle: "مختاراتنا",
			ownLead: "قطع للمعاينة من مختاراتنا الخاصة.",
			pendingTitle: "المختارات قيد الإعداد",
			pendingText: "لا توجد قطع معروضة لهذه العلامة حالياً.",
			ask: "الاستفسار عن هذه العلامة",
			sameTier: "من الفئة نفسها",
			back: "العودة إلى الدليل"
		},
		tiers: {
			luxury: "الفخامة العليا",
			accessible: "الفخامة الميسّرة",
			contemporary: "المعاصر"
		},
		categories: {
			title: "القطع حسب الفئة",
			lead: "من الساعات إلى حقائب السفر.",
			empty: "لا توجد قطع معروضة في هذه الفئة بعد.",
			other: "فئات أخرى"
		},
		latest: {
			title: "أحدث المختارات",
			lead: "أحدث القطع المعروضة من الأزياء والساعات والمجوهرات."
		},
		inquiryBand: {
			title: "تفاصيل القطع عبر واتساب",
			text: "الاستفسار عن السعر والتوفر متاح عبر واتساب بمرجع القطعة أو صورتها."
		},
		catalog: {
			title: "الكتالوج",
			lead: "جميع القطع المعروضة حالياً.",
			q: "البحث بالاسم أو المرجع",
			category: "الفئة",
			any: "كل الفئات",
			apply: "عرض النتائج",
			clear: "مسح",
			results: (n) => `${n} قطعة`,
			models: (n) => arabicPlural(AR_MODELS, n),
			none: "لا توجد قطع مطابقة.",
			noscript: "البحث والتصفية متاحان دون جافاسكربت."
		},
		product: {
			details: "التفاصيل",
			collection: "المجموعة",
			category: "الفئة",
			confirm: "يُؤكَّد التوفر وكل التفاصيل في المحادثة.",
			related: "مختارات أخرى",
			views: [
				"المشهد الكامل",
				"تفصيل",
				"تفصيل قريب"
			],
			how: "طريقة الاستفسار",
			noPhoto: "لا توجد صورة معتمدة لهذا المرجع بعد."
		},
		variants: {
			group: "خيارات هذا الطراز",
			kinds: {
				dial: "الميناء",
				bracelet: "السوار",
				bracelet_material: "مادة السوار",
				colour: "اللون",
				color: "اللون",
				size: "المقاس",
				ring_size: "مقاس الخاتم",
				bracelet_size: "مقاس السوار",
				bag_size: "مقاس الحقيبة",
				case_size: "قطر العلبة"
			},
			count: arabicCount,
			changes: changeNote("يغيّر ", "، ", (label) => `${label} إلى `),
			showing: (ref) => `تم عرض المرجع ${ref}`,
			credit: {
				photo: "الصورة",
				quote: ["«", "»"],
				source: "المصدر",
				changes: "التعديلات",
				changed: {
					"resized and converted to WebP": "تغيير الحجم والتحويل إلى WebP",
					"converted to WebP": "التحويل إلى WebP"
				}
			}
		},
		dialog: {
			title: "الاستفسار عبر واتساب",
			explain: "هذه نسخة معاينة. لم يُربط رقم واتساب بعد، لذلك لن تُرسل أي رسالة. نص الاستفسار مع المرجع متاح للنسخ.",
			label: "نص الاستفسار",
			copy: "نسخ الاستفسار",
			copied: "تم النسخ.",
			failed: "تعذّر النسخ التلقائي. النص متاح للنسخ اليدوي.",
			close: "إغلاق",
			general: "مرحباً، أود الاستفسار عن مختارات Jwleria.",
			product: (name, ref, brand) => `مرحباً، أود معرفة السعر والتوفر لهذه القطعة: ${withBrand(name, brand)} — المرجع ${ref}`,
			brand: (name) => `مرحباً، أود الاستفسار عن ${name}.`
		},
		footer: {
			rights: "أسماء العلامات التجارية ملك لأصحابها. Jwleria جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.",
			preview: "نسخة معاينة غير منشورة. الصور الحالية توضيحية مولَّدة."
		},
		about: {
			title: "عن Jwleria",
			lead: "مساحة لاستكشاف مختارات من الساعات والمجوهرات والحقائب والأزياء، والاستفسار عن تفاصيلها عبر واتساب.",
			stepsTitle: "طريقة الاستفسار",
			steps: [
				"اختيار القطعة من الكتالوج، أو مشاركة صورتها ومرجعها عبر واتساب.",
				"التحقق من التوفر وتفاصيل الطلب.",
				"تأكيد جميع التفاصيل قبل أي التزام."
			],
			whyTitle: "لماذا لا نعرض الأسعار",
			why: "يختلف التوفر والتكلفة النهائية لكل طلب، لذلك نؤكدهما في المحادثة بدلاً من عرض أرقام قد لا تكون دقيقة.",
			sellerTitle: "بيانات البائع والسياسات",
			seller: "تُعرض بيانات البائع والسياسات النظامية هنا عند اعتمادها.",
			contactTitle: "التواصل",
			contact: "قناة التواصل عبر واتساب قيد الإعداد في نسخة المعاينة هذه."
		},
		notFound: {
			title: "الصفحة غير موجودة",
			home: "العودة إلى الرئيسية"
		}
	},
	en: {
		langName: "English",
		skip: "Skip to content",
		tagline: "Selections from the world of luxury",
		nav: {
			brands: "Brands",
			categories: "Categories",
			catalog: "Catalogue",
			about: "About"
		},
		menu: "Menu",
		search: "Search",
		contact: "Contact",
		whatsapp: {
			contact: "Contact on WhatsApp",
			pending: "Coming soon",
			pendingDescription: "Direct contact will be available once the WhatsApp number is ready."
		},
		cta: "Contact on WhatsApp for the price",
		preview: "Preview",
		previewNote: "Generated illustrative image for preview purposes — not a real product.",
		reference: "Reference",
		viewAll: "View all",
		hero: {
			eyebrow: "",
			title: "Luxury in every detail",
			lead: "A directory of brands and a selection of pieces, with details on WhatsApp.",
			primary: "Explore the brands",
			secondary: "View the edit"
		},
		brands: {
			title: "The brand directory",
			lead: "Names from classic, accessible and contemporary luxury. A listed name does not imply availability.",
			all: "All",
			count: (n) => `${n} brands`,
			ownTitle: "Our edit",
			ownLead: "Preview pieces from our own selection.",
			pendingTitle: "Selection in preparation",
			pendingText: "No pieces from this house are currently on view.",
			ask: "Ask about this house",
			sameTier: "In the same tier",
			back: "Back to the directory"
		},
		tiers: {
			luxury: "Luxury",
			accessible: "Accessible luxury",
			contemporary: "Contemporary"
		},
		categories: {
			title: "Browse by category",
			lead: "From watches to luggage.",
			empty: "No pieces are shown in this category yet.",
			other: "Other categories"
		},
		latest: {
			title: "Latest in the edit",
			lead: "The latest pieces on view across fashion, watches and jewellery."
		},
		inquiryBand: {
			title: "Item details via WhatsApp",
			text: "Price and availability inquiries are available on WhatsApp with the item's reference or photo."
		},
		catalog: {
			title: "Catalogue",
			lead: "Every piece currently on view.",
			q: "Search by name or reference",
			category: "Category",
			any: "All categories",
			apply: "Show results",
			clear: "Clear",
			results: (n) => `${n} pieces`,
			models: (n) => `${n} ${n === 1 ? "model" : "models"}`,
			none: "No matching pieces.",
			noscript: "Search and filters work without JavaScript."
		},
		product: {
			details: "Details",
			collection: "Collection",
			category: "Category",
			confirm: "Availability and every detail are confirmed in conversation.",
			related: "You may also like",
			views: [
				"Full view",
				"Detail",
				"Close detail"
			],
			how: "How to inquire",
			noPhoto: "No approved photograph of this reference yet."
		},
		variants: {
			group: "Options for this model",
			kinds: {
				dial: "Dial",
				bracelet: "Bracelet",
				bracelet_material: "Bracelet material",
				colour: "Colour",
				color: "Colour",
				size: "Size",
				ring_size: "Ring size",
				bracelet_size: "Bracelet size",
				bag_size: "Bag size",
				case_size: "Case diameter"
			},
			count: englishCount,
			changes: changeNote("Changes ", ", ", (label) => `${label.charAt(0).toLowerCase()}${label.slice(1)} to `),
			showing: (ref) => `Showing reference ${ref}`,
			credit: {
				photo: "Photo",
				quote: ["“", "”"],
				source: "Source",
				changes: "Changes",
				changed: {
					"resized and converted to WebP": "resized and converted to WebP",
					"converted to WebP": "converted to WebP"
				}
			}
		},
		dialog: {
			title: "WhatsApp inquiry",
			explain: "This is a preview. No WhatsApp number is connected yet, so no message will be sent. You can copy the inquiry text with its reference.",
			label: "Inquiry text",
			copy: "Copy inquiry",
			copied: "Copied.",
			failed: "Copy failed — select the text manually.",
			close: "Close",
			general: "Hello, I would like to ask about the Jwleria selection.",
			product: (name, ref, brand) => `Hello, I would like the price and availability for: ${withBrand(name, brand)} — reference ${ref}`,
			brand: (name) => `Hello, I would like to ask about ${name}.`
		},
		footer: {
			rights: "Brand names belong to their respective owners. Jwleria is independent and is not affiliated with or endorsed by these brands.",
			preview: "Unpublished preview. Current images are generated illustrations."
		},
		about: {
			title: "About",
			lead: "A space to explore selections of watches, jewellery, handbags and fashion, and ask about their details on WhatsApp.",
			stepsTitle: "How to inquire",
			steps: [
				"Choose a piece from the catalogue, or send us its image and reference.",
				"We check availability and the details of your request.",
				"We confirm everything with you before any commitment."
			],
			whyTitle: "Why we do not show prices",
			why: "Availability and the final cost differ for every request, so we confirm them in conversation rather than display figures that may not be accurate.",
			sellerTitle: "Seller details and policies",
			seller: "Seller details and required policies will appear here once finalised.",
			contactTitle: "Contact",
			contact: "The WhatsApp channel is still being set up in this preview."
		},
		notFound: {
			title: "Page not found",
			home: "Back to home"
		}
	}
};
var t = (l) => ui[l];
/** The label of an option or spec kind (one source for both): the reviewed translation when known, otherwise the catalog's own label. */
var optionLabel = (l, kind, fallback) => ui[l].variants.kinds[kind] ?? fallback[l];
/** A listing total names what it counts: model cards from the model projection, otherwise catalog rows. */
var resultCount = (l, page) => page.unit === "models" ? ui[l].catalog.models(page.total) : ui[l].catalog.results(page.total);
/** Neutral counts of the real option values a model card can mention (only kinds with a choice). A model with
* more variants than its page can offer gets no count, since the page could not show every value counted. */
var optionCounts = (l, model) => !model || model.variantCount > 60 ? "" : model.options.filter((o) => o.count > 1).map((o) => ui[l].variants.count(o.kind, o.count)).join(" · ");
/** A page's canonical URL and its language alternates all name its canonical twin (a model's primary variant). */
function pageLinks(l, canonicalPath, site) {
	const absolute = (path) => site ? new URL(path, site).href : path;
	return {
		canonical: absolute(href(l, canonicalPath)),
		alternates: [
			["ar", absolute(href("ar", canonicalPath))],
			["en", absolute(href("en", canonicalPath))],
			["x-default", absolute(href("ar", canonicalPath))]
		]
	};
}
//#endregion
//#region src/components/contact.mjs
var FORMATTED = /^\+?(?:\d+|\(\d+\))(?:[ -]?\(\d+\)|[ -]\d+|(?<=\))\d+)*$/;
/**
* Canonical +E.164 form of a configured business number, or undefined when the value is anything
* other than an unambiguous number: letters, extensions, 00 or trunk "(0)" prefixes, other separators.
* @param {unknown} value
* @returns {string | undefined}
*/
function normalizeE164(value) {
	const raw = typeof value === "string" ? value.trim() : "";
	if (raw.length > 32 || !FORMATTED.test(raw) || /\(0+\)/.test(raw)) return void 0;
	const digits = raw.replace(/\D/g, "");
	return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : void 0;
}
/**
* Live only with the explicit live mode and a valid number; everything else is the honest pending state.
* @param {unknown} mode
* @param {unknown} number
* @returns {{ live: false } | { live: true; e164: string }}
*/
function contactChannel(mode, number) {
	const e164 = mode === "live" ? normalizeE164(number) : void 0;
	return e164 ? {
		live: true,
		e164
	} : { live: false };
}
/**
* Direct wa.me link. wa.me takes digits only; the text is UTF-8 percent-encoded, newlines included.
* @param {string} number
* @param {string} [message]
*/
function whatsappHref(number, message = "") {
	const e164 = normalizeE164(number);
	if (!e164 || typeof message !== "string") throw new Error("Invalid WhatsApp destination");
	return `https://wa.me/${e164.slice(1)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
//#endregion
//#region src/components/view.ts
var OWN_COLLECTION = "jwleria-edit";
var TIERS = [
	"luxury",
	"accessible",
	"contemporary"
];
var SHARED_STILL = /catalog-still-life/;
var hash = (s) => [...s].reduce((h, c) => h * 31 + c.charCodeAt(0) >>> 0, 7);
function artClass(src, group, variant = "") {
	if (!SHARED_STILL.test(src)) return "art";
	return `art art--${(hash(group) + hash(variant) % 3 * 3) % 9}`;
}
function inquiryChannel() {
	const env$1 = Object.assign({
		"ASSETS_PREFIX": void 0,
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SITE": void 0,
		"SSR": true
	}, { _: "/opt/node22/bin/pnpm" });
	return contactChannel(env.PUBLIC_INQUIRY_MODE || env$1.PUBLIC_INQUIRY_MODE, env.PUBLIC_WHATSAPP_E164 || env$1.PUBLIC_WHATSAPP_E164);
}
function inquiryLink(l, message, fallback, ref = "", subject = "") {
	const ch = inquiryChannel();
	if (ch.live) return {
		href: whatsappHref(ch.e164, message),
		attrs: {
			target: "_blank",
			rel: "noopener"
		}
	};
	return {
		href: href(l, fallback),
		attrs: {
			"data-inquiry": "",
			"aria-controls": "inquiry-dialog",
			"aria-haspopup": "dialog",
			"data-inq-message": message,
			"data-inq-ref": ref,
			"data-inq-subject": subject
		}
	};
}
function productInquiry(l, p, publicOrigin, brand) {
	if (!p.isPreview && !inquiryChannel().live) return void 0;
	const text = t(l).dialog.product(p.name[l], p.reference, brand?.slug === p.brandSlug ? brand.name : void 0);
	const origin = env.PUBLIC_SITE_ORIGIN || Object.assign({
		"ASSETS_PREFIX": void 0,
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SITE": void 0,
		"SSR": true
	}, { _: "/opt/node22/bin/pnpm" }).PUBLIC_SITE_ORIGIN || publicOrigin;
	return inquiryLink(l, p.isPreview ? text : productInquiryMessage(text, origin, l, p.slug), `/products/${p.slug}/#inquiry`, p.reference, p.name[l]);
}
//#endregion
export { inquiryLink as a, href as c, optionLabel as d, otherLocale as f, t as h, inquiryChannel as i, isLocale as l, resultCount as m, TIERS as n, productInquiry as o, pageLinks as p, artClass as r, dirOf as s, OWN_COLLECTION as t, optionCounts as u };
