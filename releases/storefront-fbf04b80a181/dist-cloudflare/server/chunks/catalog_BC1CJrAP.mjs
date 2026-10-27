globalThis.process ??= {};
globalThis.process.env ??= {};
import { i as singleModel, n as orderOptionKinds, t as assembleModel } from "./variant-selection_DQ5S3oqF.mjs";
import { env } from "node:process";
//#region src/server/fixtures.ts
var PREVIEW_BRAND_SLUG = "jwleria-edit";
var CATEGORY_IMAGES = {
	watches: "/images/watch.webp",
	bracelets: "/images/bracelet.webp",
	jewelry: "/images/bracelet.webp",
	"leather-goods": "/images/leather-goods.webp",
	handbags: "/images/handbag.webp",
	luggage: "/images/luggage.webp",
	clothing: "/images/clothing.webp",
	shoes: "/images/shoes.webp",
	accessories: "/images/accessories.webp"
};
var DEFAULT_PAGE_SIZE = 12;
var MAX_PAGE_SIZE = 48;
var DIRECTORY_SUMMARY = {
	ar: "صفحة ضمن دليل العلامات. لا تتضمن هذه المعاينة منتجات منسوبة إلى هذه العلامة، ولا تعني علاقة رسمية معها.",
	en: "A brand directory preview. No products from this brand are listed in this preview; inclusion does not imply affiliation."
};
var brands = [{
	id: "brand-jwleria-edit",
	slug: PREVIEW_BRAND_SLUG,
	name: "Jwleria Edit",
	tier: "contemporary",
	summary: {
		ar: "مجموعة معاينة محايدة من Jwleria: نماذج وصور اصطناعية لتجربة التصفح، وليست منتجات تجارية أو قطعًا من علامات عالمية.",
		en: "A neutral Jwleria preview collection: synthetic objects and images for exploring the site, rather than commercial products or pieces from international brands."
	}
}, ...[
	[
		"cartier",
		"Cartier",
		"luxury"
	],
	[
		"tiffany-and-co",
		"Tiffany & Co.",
		"luxury"
	],
	[
		"van-cleef-and-arpels",
		"Van Cleef & Arpels",
		"luxury"
	],
	[
		"bvlgari",
		"Bvlgari",
		"luxury"
	],
	[
		"chopard",
		"Chopard",
		"luxury"
	],
	[
		"harry-winston",
		"Harry Winston",
		"luxury"
	],
	[
		"piaget",
		"Piaget",
		"luxury"
	],
	[
		"boucheron",
		"Boucheron",
		"luxury"
	],
	[
		"graff",
		"Graff",
		"luxury"
	],
	[
		"rolex",
		"Rolex",
		"luxury"
	],
	[
		"patek-philippe",
		"Patek Philippe",
		"luxury"
	],
	[
		"audemars-piguet",
		"Audemars Piguet",
		"luxury"
	],
	[
		"vacheron-constantin",
		"Vacheron Constantin",
		"luxury"
	],
	[
		"jaeger-lecoultre",
		"Jaeger-LeCoultre",
		"luxury"
	],
	[
		"omega",
		"OMEGA",
		"luxury"
	],
	[
		"iwc-schaffhausen",
		"IWC Schaffhausen",
		"luxury"
	],
	[
		"panerai",
		"Panerai",
		"luxury"
	],
	[
		"tag-heuer",
		"TAG Heuer",
		"luxury"
	],
	[
		"hermes",
		"Hermès",
		"luxury"
	],
	[
		"chanel",
		"CHANEL",
		"luxury"
	],
	[
		"louis-vuitton",
		"Louis Vuitton",
		"luxury"
	],
	[
		"dior",
		"Dior",
		"luxury"
	],
	[
		"gucci",
		"Gucci",
		"luxury"
	],
	[
		"prada",
		"Prada",
		"luxury"
	],
	[
		"bottega-veneta",
		"Bottega Veneta",
		"luxury"
	],
	[
		"saint-laurent",
		"Saint Laurent",
		"luxury"
	],
	[
		"fendi",
		"Fendi",
		"luxury"
	],
	[
		"loewe",
		"LOEWE",
		"luxury"
	],
	[
		"celine",
		"CELINE",
		"luxury"
	],
	[
		"balenciaga",
		"Balenciaga",
		"luxury"
	],
	[
		"valentino",
		"Valentino",
		"luxury"
	],
	[
		"burberry",
		"Burberry",
		"luxury"
	],
	[
		"coach",
		"Coach",
		"accessible"
	],
	[
		"michael-kors",
		"Michael Kors",
		"accessible"
	],
	[
		"tory-burch",
		"Tory Burch",
		"accessible"
	],
	[
		"kate-spade-new-york",
		"kate spade new york",
		"accessible"
	],
	[
		"longchamp",
		"Longchamp",
		"accessible"
	],
	[
		"furla",
		"Furla",
		"accessible"
	],
	[
		"swarovski",
		"Swarovski",
		"contemporary"
	],
	[
		"seiko",
		"Seiko",
		"contemporary"
	],
	[
		"tissot",
		"Tissot",
		"contemporary"
	]
].map(([slug, name, tier]) => ({
	id: `brand-${slug}`,
	slug,
	name,
	tier,
	summary: { ...DIRECTORY_SUMMARY }
}))];
var categories = [
	{
		id: "category-watches",
		slug: "watches",
		name: {
			ar: "الساعات",
			en: "Watches"
		},
		image: CATEGORY_IMAGES.watches
	},
	{
		id: "category-bracelets",
		slug: "bracelets",
		name: {
			ar: "الأساور",
			en: "Bracelets"
		},
		image: CATEGORY_IMAGES.bracelets
	},
	{
		id: "category-jewelry",
		slug: "jewelry",
		name: {
			ar: "المجوهرات",
			en: "Jewelry"
		},
		image: CATEGORY_IMAGES.jewelry
	},
	{
		id: "category-leather-goods",
		slug: "leather-goods",
		name: {
			ar: "المصنوعات الجلدية",
			en: "Leather goods"
		},
		image: CATEGORY_IMAGES["leather-goods"]
	},
	{
		id: "category-handbags",
		slug: "handbags",
		name: {
			ar: "حقائب اليد",
			en: "Handbags"
		},
		image: CATEGORY_IMAGES.handbags
	},
	{
		id: "category-luggage",
		slug: "luggage",
		name: {
			ar: "حقائب السفر",
			en: "Luggage"
		},
		image: CATEGORY_IMAGES.luggage
	},
	{
		id: "category-clothing",
		slug: "clothing",
		name: {
			ar: "الملابس",
			en: "Clothing"
		},
		image: CATEGORY_IMAGES.clothing
	},
	{
		id: "category-shoes",
		slug: "shoes",
		name: {
			ar: "الأحذية",
			en: "Shoes"
		},
		image: CATEGORY_IMAGES.shoes
	},
	{
		id: "category-accessories",
		slug: "accessories",
		name: {
			ar: "الإكسسوارات",
			en: "Accessories"
		},
		image: CATEGORY_IMAGES.accessories
	}
];
var products = [
	[
		1,
		"watch-study-01",
		"watches",
		"ساعة — معاينة ١",
		"Watch study 01"
	],
	[
		2,
		"watch-study-02",
		"watches",
		"ساعة — معاينة ٢",
		"Watch study 02"
	],
	[
		3,
		"watch-study-03",
		"watches",
		"ساعة — معاينة ٣",
		"Watch study 03"
	],
	[
		4,
		"bracelet-study-01",
		"bracelets",
		"سوار — معاينة ١",
		"Bracelet study 01"
	],
	[
		5,
		"bracelet-study-02",
		"bracelets",
		"سوار — معاينة ٢",
		"Bracelet study 02"
	],
	[
		6,
		"bracelet-study-03",
		"bracelets",
		"سوار — معاينة ٣",
		"Bracelet study 03"
	],
	[
		7,
		"jewelry-study-01",
		"jewelry",
		"مجوهرات — معاينة ١",
		"Jewelry study 01"
	],
	[
		8,
		"jewelry-study-02",
		"jewelry",
		"مجوهرات — معاينة ٢",
		"Jewelry study 02"
	],
	[
		9,
		"jewelry-study-03",
		"jewelry",
		"مجوهرات — معاينة ٣",
		"Jewelry study 03"
	],
	[
		10,
		"leather-goods-study-01",
		"leather-goods",
		"مصنوعات جلدية — معاينة ١",
		"Leather goods study 01"
	],
	[
		11,
		"leather-goods-study-02",
		"leather-goods",
		"مصنوعات جلدية — معاينة ٢",
		"Leather goods study 02"
	],
	[
		12,
		"leather-goods-study-03",
		"leather-goods",
		"مصنوعات جلدية — معاينة ٣",
		"Leather goods study 03"
	],
	[
		13,
		"handbag-study-01",
		"handbags",
		"حقيبة يد — معاينة ١",
		"Handbag study 01"
	],
	[
		14,
		"handbag-study-02",
		"handbags",
		"حقيبة يد — معاينة ٢",
		"Handbag study 02"
	],
	[
		15,
		"handbag-study-03",
		"handbags",
		"حقيبة يد — معاينة ٣",
		"Handbag study 03"
	],
	[
		16,
		"luggage-study-01",
		"luggage",
		"حقيبة سفر — معاينة ١",
		"Luggage study 01"
	],
	[
		17,
		"luggage-study-02",
		"luggage",
		"حقيبة سفر — معاينة ٢",
		"Luggage study 02"
	],
	[
		18,
		"luggage-study-03",
		"luggage",
		"حقيبة سفر — معاينة ٣",
		"Luggage study 03"
	],
	[
		19,
		"clothing-study-01",
		"clothing",
		"ملابس — معاينة ١",
		"Clothing study 01"
	],
	[
		20,
		"clothing-study-02",
		"clothing",
		"ملابس — معاينة ٢",
		"Clothing study 02"
	],
	[
		21,
		"clothing-study-03",
		"clothing",
		"ملابس — معاينة ٣",
		"Clothing study 03"
	],
	[
		22,
		"shoe-study-01",
		"shoes",
		"حذاء — معاينة ١",
		"Shoe study 01"
	],
	[
		23,
		"shoe-study-02",
		"shoes",
		"حذاء — معاينة ٢",
		"Shoe study 02"
	],
	[
		24,
		"shoe-study-03",
		"shoes",
		"حذاء — معاينة ٣",
		"Shoe study 03"
	],
	[
		25,
		"accessory-study-01",
		"accessories",
		"إكسسوار — معاينة ١",
		"Accessory study 01"
	],
	[
		26,
		"accessory-study-02",
		"accessories",
		"إكسسوار — معاينة ٢",
		"Accessory study 02"
	],
	[
		27,
		"accessory-study-03",
		"accessories",
		"إكسسوار — معاينة ٣",
		"Accessory study 03"
	]
].map(([sequence, slug, categorySlug, ar, en]) => ({
	id: `4c4a0000-2026-4003-8000-${String(sequence).padStart(12, "0")}`,
	slug,
	reference: `JWL-PREVIEW-${String(sequence).padStart(3, "0")}`,
	brandSlug: PREVIEW_BRAND_SLUG,
	collection: {
		ar: "مختاراتنا",
		en: "Jwleria Edit"
	},
	collectionSlug: "jwleria-edit",
	images: [CATEGORY_IMAGES[categorySlug]],
	categorySlug,
	name: {
		ar,
		en
	},
	summary: {
		ar: "صورة اصطناعية للتجربة؛ ليست لقطعة تجارية أو منتج من علامة عالمية.",
		en: "A synthetic preview illustration, not a commercial item or a product from an international brand."
	},
	image: CATEGORY_IMAGES[categorySlug],
	mediaKind: "synthetic-preview",
	isPreview: true,
	addedAt: `2026-10-03T09:${String(sequence).padStart(2, "0")}:00.000Z`
}));
var SYNTHETIC_SUMMARY = {
	ar: "صورة اصطناعية للتجربة؛ ليست لقطعة تجارية أو منتج من علامة عالمية.",
	en: "A synthetic preview illustration, not a commercial item or a product from an international brand."
};
var modelSeeds = [
	{
		key: "preview:watch-model",
		categorySlug: "watches",
		name: {
			ar: "ساعة — نموذج معاينة",
			en: "Preview watch model"
		},
		options: {
			dial: {
				label: {
					ar: "الميناء",
					en: "Dial"
				},
				values: {
					ivory: {
						ar: "عاجي تجريبي",
						en: "Preview ivory"
					},
					slate: {
						ar: "رمادي تجريبي",
						en: "Preview slate"
					},
					green: {
						ar: "أخضر تجريبي",
						en: "Preview green"
					}
				}
			},
			bracelet: {
				label: {
					ar: "السوار",
					en: "Bracelet"
				},
				values: {
					"three-link": {
						ar: "سوار ثلاثي تجريبي",
						en: "Preview three-link"
					},
					"five-link": {
						ar: "سوار خماسي تجريبي",
						en: "Preview five-link"
					},
					leather: {
						ar: "Preview leather strap",
						en: "Preview leather strap",
						valueLang: "en"
					}
				}
			}
		},
		specs: [{
			kind: "case_diameter",
			label: {
				ar: "قطر العلبة",
				en: "Case diameter"
			},
			value: {
				ar: "40 مم",
				en: "40 mm"
			}
		}, {
			kind: "movement",
			label: {
				ar: "الحركة",
				en: "Movement"
			},
			value: {
				ar: "Preview calibre 00",
				en: "Preview calibre 00"
			},
			valueLang: "en"
		}],
		variants: [
			[
				101,
				"preview-watch-ivory-three-link",
				{
					dial: "ivory",
					bracelet: "three-link"
				},
				[CATEGORY_IMAGES.watches]
			],
			[
				102,
				"preview-watch-ivory-five-link",
				{
					dial: "ivory",
					bracelet: "five-link"
				},
				[CATEGORY_IMAGES.watches, "/images/catalog-still-life.webp"]
			],
			[
				103,
				"preview-watch-slate-three-link",
				{
					dial: "slate",
					bracelet: "three-link"
				},
				["/images/catalog-still-life.webp"]
			],
			[
				104,
				"preview-watch-slate-five-link",
				{
					dial: "slate",
					bracelet: "five-link"
				},
				["/images/catalog-still-life.webp", CATEGORY_IMAGES.watches]
			],
			[
				105,
				"preview-watch-green-leather",
				{
					dial: "green",
					bracelet: "leather"
				},
				[]
			]
		]
	},
	{
		key: "preview:handbag-model",
		categorySlug: "handbags",
		name: {
			ar: "حقيبة يد — نموذج معاينة",
			en: "Preview handbag model"
		},
		options: { colour: {
			label: {
				ar: "اللون",
				en: "Colour"
			},
			values: {
				black: {
					ar: "أسود تجريبي",
					en: "Preview black"
				},
				beige: {
					ar: "بيج تجريبي",
					en: "Preview beige"
				},
				burgundy: {
					ar: "عنابي تجريبي",
					en: "Preview burgundy"
				}
			}
		} },
		specs: [{
			kind: "material",
			label: {
				ar: "المادة",
				en: "Material"
			},
			value: {
				ar: "جلد تجريبي",
				en: "Preview leather"
			}
		}, {
			kind: "dimensions",
			label: {
				ar: "الأبعاد",
				en: "Dimensions"
			},
			value: {
				ar: "30 × 22 × 12 سم",
				en: "30 × 22 × 12 cm"
			}
		}],
		variants: [
			[
				111,
				"preview-handbag-black",
				{ colour: "black" },
				[CATEGORY_IMAGES.handbags]
			],
			[
				112,
				"preview-handbag-beige",
				{ colour: "beige" },
				[CATEGORY_IMAGES["leather-goods"]]
			],
			[
				113,
				"preview-handbag-burgundy",
				{ colour: "burgundy" },
				["/images/catalog-still-life.webp"]
			]
		]
	},
	{
		key: "preview:single-bracelet",
		categorySlug: "bracelets",
		name: {
			ar: "سوار — نموذج معاينة مفرد",
			en: "Preview single bracelet"
		},
		options: {},
		specs: [{
			kind: "material",
			label: {
				ar: "المادة",
				en: "Material"
			},
			value: {
				ar: "معدن تجريبي",
				en: "Preview metal"
			}
		}],
		variants: [[
			121,
			"preview-bracelet-single",
			{},
			[CATEGORY_IMAGES.bracelets]
		]]
	}
];
var modelVariants = new Map(modelSeeds.map((model, index) => [model.key, model.variants.map(([sequence, slug, chosen, images], position) => {
	const options = Object.entries(chosen).map(([kind, key]) => {
		const { valueLang, ...value } = model.options[kind].values[key];
		return {
			kind,
			key,
			label: model.options[kind].label,
			value,
			...valueLang ? { valueLang } : {}
		};
	});
	const words = (l) => [model.name[l], ...options.map((o) => o.value[l])].join(l === "ar" ? "، " : ", ");
	return {
		id: `4c4a0000-2026-4003-8000-${String(sequence).padStart(12, "0")}`,
		slug,
		reference: `JWL-PREVIEW-M${index + 1}-${String(position + 1).padStart(2, "0")}`,
		brandSlug: PREVIEW_BRAND_SLUG,
		collection: {
			ar: "مختاراتنا",
			en: "Jwleria Edit"
		},
		collectionSlug: "jwleria-edit",
		images,
		categorySlug: model.categorySlug,
		name: {
			ar: words("ar"),
			en: words("en")
		},
		summary: { ...SYNTHETIC_SUMMARY },
		image: images[0] ?? null,
		mediaKind: images.length ? "synthetic-preview" : "facts-only",
		isPreview: true,
		addedAt: `2026-10-26T09:${String(sequence - 100).padStart(2, "0")}:00.000Z`,
		options,
		specs: [...model.specs, ...options.map(({ kind, label, value, valueLang }) => ({
			kind,
			label,
			value,
			...valueLang ? { valueLang } : {}
		}))],
		position,
		isPrimary: position === 0
	};
})]));
var modelSeedByKey = new Map(modelSeeds.map((model) => [model.key, model]));
var modelKeyBySlug = new Map([...modelVariants].flatMap(([key, variants]) => variants.map((v) => [v.slug, key])));
var listed = [...products, ...[...modelVariants].map(([key, variants]) => {
	const counts = /* @__PURE__ */ new Map();
	for (const v of variants) for (const o of v.options) counts.set(o.kind, (counts.get(o.kind) ?? /* @__PURE__ */ new Set()).add(o.key));
	const { options: _options, specs: _specs, position: _position, isPrimary: _primary, ...primary } = variants[0];
	return {
		...primary,
		model: {
			key,
			name: modelSeedByKey.get(key).name,
			variantCount: variants.length,
			options: [...counts].map(([kind, values]) => ({
				kind,
				count: values.size
			}))
		}
	};
})];
var categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
function cloneBrand(brand) {
	return {
		...brand,
		summary: { ...brand.summary }
	};
}
function cloneCategory(category) {
	return {
		...category,
		name: { ...category.name }
	};
}
function cloneProduct(product) {
	return product.model ? structuredClone(product) : {
		...product,
		name: { ...product.name },
		summary: { ...product.summary }
	};
}
function normalizeSlug(value) {
	return (value ?? "").trim().toLowerCase();
}
function normalizeSearch$1(value) {
	return value.normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).trim();
}
function positiveInteger(value, fallback) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return fallback;
	return Math.max(1, Math.floor(value));
}
function latestFirst(a, b) {
	return b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id);
}
/** Directory entries only. International brand pages are intentionally empty. */
function getBrands$1() {
	return brands.map(cloneBrand);
}
function getCategories$1() {
	return categories.map(cloneCategory);
}
/** A synchronous fixture adapter; no live backend or browser database client. */
function getProducts$1(query = {}) {
	const brand = normalizeSlug(query.brand);
	const category = normalizeSlug(query.category);
	const searchTokens = normalizeSearch$1(query.search ?? "").split(/\s+/).filter(Boolean);
	const pageSize = Math.min(MAX_PAGE_SIZE, positiveInteger(query.pageSize, DEFAULT_PAGE_SIZE));
	const filtered = listed.filter((product) => {
		if (brand && product.brandSlug !== brand) return false;
		if (category && product.categorySlug !== category) return false;
		if (searchTokens.length === 0) return true;
		const productCategory = categoryBySlug.get(product.categorySlug);
		const searchable = normalizeSearch$1([
			product.slug,
			product.reference,
			product.name.ar,
			product.name.en,
			product.summary.ar,
			product.summary.en,
			product.categorySlug,
			productCategory?.name.ar ?? "",
			productCategory?.name.en ?? "",
			"Jwleria Edit",
			product.model?.name.ar ?? "",
			product.model?.name.en ?? "",
			...(modelVariants.get(product.model?.key ?? "") ?? []).map((v) => v.reference)
		].join(" "));
		return searchTokens.every((token) => searchable.includes(token));
	}).sort(latestFirst);
	const total = filtered.length;
	const pages = Math.ceil(total / pageSize);
	const page = Math.min(positiveInteger(query.page, 1), Math.max(1, pages));
	const start = (page - 1) * pageSize;
	return {
		items: filtered.slice(start, start + pageSize).map(cloneProduct),
		total,
		page,
		pageSize,
		pages,
		unit: "models"
	};
}
function getProduct(slug) {
	const key = normalizeSlug(slug);
	const product = products.find((item) => item.slug === key) ?? modelVariants.get(modelKeyBySlug.get(key) ?? "")?.find((v) => v.slug === key);
	return product ? structuredClone(product) : void 0;
}
/** Any variant slug resolves to its whole synthetic model with that variant selected. */
function getProductModel$1(slug) {
	const key = normalizeSlug(slug);
	const modelKey = modelKeyBySlug.get(key);
	if (!modelKey) return singleModel(getProduct(key));
	return structuredClone(assembleModel(modelKey, modelSeedByKey.get(modelKey).name, modelVariants.get(modelKey), key));
}
function getCategory$1(slug) {
	const category = categoryBySlug.get(normalizeSlug(slug));
	return category ? cloneCategory(category) : void 0;
}
/** Category matches first, then other neutral previews; never include the input item or its model. */
function getRelatedProducts$1(product, limit = 4, modelKey = null) {
	if (!Number.isFinite(limit) || limit <= 0) return [];
	const count = Math.min(MAX_PAGE_SIZE, Math.floor(limit));
	return listed.filter((item) => item.id !== product.id && item.slug !== product.slug && (!modelKey || item.model?.key !== modelKey)).sort((a, b) => {
		const aMatch = Number(a.categorySlug === product.categorySlug);
		return Number(b.categorySlug === product.categorySlug) - aMatch || latestFirst(a, b);
	}).slice(0, count).map(cloneProduct);
}
//#endregion
//#region src/server/responsive-media.mjs
var exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(",");
var positive = (value, max) => Number.isSafeInteger(value) && value > 0 && value <= max;
function publicUrl(value) {
	if (typeof value !== "string" || value.length > 2048 || /[\s,]/.test(value)) return false;
	try {
		const u = new URL(value);
		return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash && u.href === value;
	} catch {
		return false;
	}
}
var text = (value, max) => typeof value === "string" && value.trim().length > 0 && [...value].length <= max && !/[\u0000-\u001f\u007f]/.test(value);
function creditUrl(value) {
	if (typeof value !== "string" || value.length > 2048) return false;
	try {
		const u = new URL(value);
		return u.protocol === "https:" && !u.username && !u.password;
	} catch {
		return false;
	}
}
/** An open-licence credit (decision 0013; inactive until such a grant exists). Its bounds are
* jwl_internal.valid_media_attribution's: every field but source_url up to 300 characters, and an optional `title`
* (the work's title as its author supplied it) that may be absent or null, so a five-field credit stays valid. */
function imageAttribution(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((k) => ![
		"creator",
		"license",
		"license_url",
		"source_url",
		"changes",
		"title"
	].includes(k)) || !text(value.creator, 300) || !text(value.license, 300) || !creditUrl(value.license_url) || !creditUrl(value.source_url) || value.changes !== void 0 && value.changes !== null && !text(value.changes, 300) || value.title !== void 0 && value.title !== null && !text(value.title, 300)) throw new Error("Invalid image attribution");
	return {
		creator: value.creator.trim(),
		license: value.license.trim(),
		licenseUrl: value.license_url,
		sourceUrl: value.source_url,
		...value.title ? { title: value.title.trim() } : {},
		...value.changes ? { changes: value.changes.trim() } : {}
	};
}
/** Only already approved public derivative metadata belongs in this projection. */
function responsiveImages(value, images, factsOnly) {
	if (value === void 0) value = [];
	if (!Array.isArray(value) || value.length > 20 || factsOnly && value.length || value.length && value.length !== images.length) throw new Error("Invalid responsive image manifest");
	const urls = /* @__PURE__ */ new Set();
	return value.map((image, index) => {
		const credited = Boolean(image && typeof image === "object" && "attribution" in image);
		if (!exactKeys(image, [
			"src",
			"width",
			"height",
			"variants",
			...credited ? ["attribution"] : []
		]) || image.src !== images[index] || !publicUrl(image.src) || !positive(image.width, 4096) || !positive(image.height, 8192) || !Array.isArray(image.variants) || !image.variants.length || image.variants.length > 8) throw new Error("Invalid responsive image manifest");
		let lastWidth = 0;
		let canonical = 0;
		const variants = image.variants.map((v) => {
			if (!exactKeys(v, [
				"src",
				"width",
				"height",
				"bytes"
			]) || !publicUrl(v.src) || !positive(v.width, image.width) || !positive(v.height, image.height) || !positive(v.bytes, 15728640) || v.width <= lastWidth || urls.has(v.src) || Math.abs(v.height - image.height * v.width / image.width) > 1) throw new Error("Invalid responsive image variant");
			if (v.src === image.src) {
				canonical++;
				if (v.width !== image.width || v.height !== image.height) throw new Error("Invalid responsive canonical geometry");
			}
			lastWidth = v.width;
			urls.add(v.src);
			return {
				src: v.src,
				width: v.width,
				height: v.height,
				bytes: v.bytes
			};
		});
		if (canonical !== 1 || !variants.some((v) => v.width <= 960)) throw new Error("Missing responsive canonical/card variant");
		return {
			src: image.src,
			width: image.width,
			height: image.height,
			variants,
			...credited ? { attribution: imageAttribution(image.attribution) } : {}
		};
	});
}
//#endregion
//#region src/server/supabase-catalog.mjs
var FIELDS = "id,slug,reference,brand_slug,category_slug,collection_slug,collection_kind,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,published_at";
var MODEL_FIELDS = `${FIELDS},model_key,model_name,variant_count,options_summary`;
var slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var kindPattern = /^[a-z][a-z0-9_]{0,39}$/;
var present = (value) => typeof value === "string" && value.trim().length > 0;
var identifier = (value) => present(value) && !/[\u0000-\u001f\u007f]/.test(value);
var integer = (n, fallback, max) => Number.isFinite(Number(n)) && Number(n) >= 1 ? Math.min(Math.floor(Number(n)), max) : fallback;
function normalizeSearch(s = "") {
	return String(s).normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).trim().slice(0, 200);
}
/** @returns {import('../contracts/catalog').PublicProduct} */
function publicProduct(row) {
	if (!row || !slugPattern.test(row.slug) || !slugPattern.test(row.brand_slug) || !slugPattern.test(row.category_slug) || !slugPattern.test(row.collection_slug)) throw new Error("Invalid published catalog identity");
	const collectionKind = row.collection_kind ?? "collection";
	if (!["collection", "source_group"].includes(collectionKind)) throw new Error("Invalid published collection kind");
	const factsOnly = row.media_state === "facts_only";
	if (!Array.isArray(row.images) || !row.images.length && !factsOnly || factsOnly && row.images.length > 0 || row.images.some((s) => {
		if (typeof s !== "string") return true;
		try {
			const u = new URL(s);
			return u.protocol !== "https:" || Boolean(u.username || u.password);
		} catch {
			return true;
		}
	})) throw new Error("Invalid published catalog images");
	for (const field of [
		"id",
		"reference",
		"name_ar",
		"name_en",
		"collection_ar",
		"collection_en",
		"published_at"
	]) if (typeof row[field] !== "string" || !row[field].trim()) throw new Error("Incomplete published catalog");
	return {
		id: row.id,
		slug: row.slug,
		reference: row.reference,
		brandSlug: row.brand_slug,
		categorySlug: row.category_slug,
		collectionSlug: row.collection_slug,
		collectionKind: collectionKind === "source_group" ? "source-group" : "collection",
		collection: {
			ar: row.collection_ar,
			en: row.collection_en
		},
		name: {
			ar: row.name_ar,
			en: row.name_en
		},
		summary: {
			ar: row.description_ar || `${row.name_ar} — ${row.collection_ar}`,
			en: row.description_en || `${row.name_en} — ${row.collection_en}`
		},
		image: row.images[0] ?? null,
		images: [...row.images],
		imageVariants: responsiveImages(row.image_variants, row.images, factsOnly),
		mediaKind: factsOnly ? "facts-only" : "verified-product",
		isPreview: false,
		addedAt: row.published_at
	};
}
function configuration(config) {
	const url = new URL(config.url);
	if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !url.hostname.endsWith(".supabase.co")) throw new Error("Invalid catalog server configuration");
	if (typeof config.key !== "string" || !config.key) throw new Error("Missing catalog read key");
	return url;
}
var MISSING_CODES = /* @__PURE__ */ new Set([
	"PGRST202",
	"PGRST205",
	"42P01",
	"42883"
]);
var MISSING_TTL = 6e4;
var missingFeatures = /* @__PURE__ */ new Map();
var MissingFeature = class extends Error {};
async function reportsMissing(response, name) {
	if (response.status !== 404) return false;
	const body = await response.clone().json().catch(() => null);
	return Boolean(body && MISSING_CODES.has(body.code) && typeof body.message === "string" && new RegExp(`(?:^|[^a-z0-9_])${name}(?:[^a-z0-9_]|$)`).test(body.message));
}
/** @template T @param {{url: string}} config @param {string} feature @param {() => Promise<T>} read @param {() => Promise<T>} fallback @returns {Promise<T>} */
async function withFallback(config, feature, read, fallback) {
	const key = `${config.url}|${feature}`;
	if (missingFeatures.get(key) > Date.now()) return fallback();
	missingFeatures.delete(key);
	try {
		return await read();
	} catch (error) {
		if (!(error instanceof MissingFeature)) throw error;
		missingFeatures.set(key, Date.now() + MISSING_TTL);
		return fallback();
	}
}
async function get(config, path, params, fetcher, { count = false, feature } = {}) {
	const endpoint = new URL(path, configuration(config));
	endpoint.search = params.toString();
	const headers = {
		apikey: config.key,
		Accept: "application/json",
		...count ? { Prefer: "count=exact" } : {}
	};
	if (!config.key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${config.key}`;
	const response = await fetcher(endpoint, {
		headers,
		signal: AbortSignal.timeout(8e3),
		redirect: "manual"
	});
	if (feature && await reportsMissing(response, feature)) throw new MissingFeature(feature);
	return response;
}
async function request(config, query, fetcher, relation = "jwl_catalog", feature) {
	const response = await get(config, `/rest/v1/${relation}`, query, fetcher, {
		count: true,
		feature
	});
	if (response.status === 416) {
		const count = response.headers.get("content-range")?.split("/")[1];
		if (count && /^\d+$/.test(count)) return {
			rows: [],
			total: Number(count)
		};
	}
	if (!response.ok) throw new Error(`Catalog read failed (${response.status})`);
	const rows = await response.json();
	if (!Array.isArray(rows)) throw new Error("Invalid catalog response");
	const count = response.headers.get("content-range")?.split("/")[1];
	if (!count || !/^\d+$/.test(count)) throw new Error("Missing catalog count");
	return {
		rows,
		total: Number(count)
	};
}
var localized = (value, message) => {
	if (!value || typeof value !== "object" || Array.isArray(value) || !present(value.ar) || !present(value.en)) throw new Error(message);
	return {
		ar: value.ar,
		en: value.en
	};
};
var latinOnly = (text) => /[A-Za-z]/.test(text) && !/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(text);
var valueLang = (lang, value, message) => {
	if (![
		void 0,
		null,
		"ar",
		"en"
	].includes(lang)) throw new Error(message);
	return lang === "en" || lang !== "ar" && latinOnly(value.ar) ? { valueLang: "en" } : {};
};
/** @returns {import('../contracts/catalog').ModelSummary | undefined} */
function modelSummary(row) {
	if (row.model_key === null || row.model_key === void 0) return void 0;
	if (!identifier(row.model_key)) throw new Error("Invalid model identity");
	const name = localized(row.model_name, "Invalid model name");
	const count = row.variant_count;
	const summary = row.options_summary ?? {};
	if (!Number.isSafeInteger(count) || count < 1 || count > 1e4 || typeof summary !== "object" || Array.isArray(summary) || Object.keys(summary).length > 8) throw new Error("Invalid model summary");
	const options = Object.entries(summary).map(([kind, n]) => {
		if (!kindPattern.test(kind) || !Number.isSafeInteger(n) || n < 1 || n > count) throw new Error("Invalid model summary");
		return {
			kind,
			count: n
		};
	});
	return {
		key: row.model_key,
		name,
		variantCount: count,
		options: orderOptionKinds(options)
	};
}
/** A listing row from the model projection: its primary variant plus the model summary. */
function publicModelRow(row) {
	const product = publicProduct(row);
	const model = modelSummary(row);
	return model ? {
		...product,
		model
	} : product;
}
var CATALOG = {
	relation: "jwl_catalog",
	fields: FIELDS,
	map: publicProduct,
	unit: "products"
};
var MODELS = {
	relation: "jwl_catalog_models",
	fields: MODEL_FIELDS,
	map: publicModelRow,
	unit: "models",
	feature: "jwl_catalog_models"
};
var MODEL_SEARCH = {
	...MODELS,
	relation: "rpc/jwl_catalog_models_search",
	feature: "jwl_catalog_models_search",
	searchArg: "p_term"
};
/** @returns {Promise<import('../contracts/catalog').ProductPage>} */
function queryCatalog(config, query = {}, fetcher = fetch) {
	return listing(config, query, fetcher, CATALOG);
}
/** One card per model; today's catalog read only while the model view does not exist yet.
* @returns {Promise<import('../contracts/catalog').ProductPage>} */
function queryModels(config, query = {}, fetcher = fetch) {
	const source = normalizeSearch(query.search) ? MODEL_SEARCH : MODELS;
	return withFallback(config, source.feature, () => listing(config, query, fetcher, source), () => queryCatalog(config, query, fetcher));
}
async function listing(config, query, fetcher, source) {
	const pageSize = integer(query.pageSize, 12, 48);
	const page = integer(query.page, 1, 1e4);
	const params = new URLSearchParams({
		select: source.fields,
		order: "published_at.desc,id.asc",
		limit: String(pageSize),
		offset: String((page - 1) * pageSize)
	});
	for (const [key, field] of [
		["brand", "brand_slug"],
		["category", "category_slug"],
		["collection", "collection_slug"]
	]) if (query[key]) {
		if (!slugPattern.test(query[key])) return {
			items: [],
			total: 0,
			page: 1,
			pageSize,
			pages: 0,
			unit: source.unit
		};
		params.set(field, `eq.${query[key]}`);
	}
	if (query.collection) params.set("collection_kind", "eq.collection");
	const term = normalizeSearch(query.search);
	const pattern = term.replace(/[*,()%_\\]/g, " ").replace(/\s+/g, " ");
	if (term && source.searchArg) params.set(source.searchArg, pattern);
	else if (term) params.set("search_text", `ilike.*${pattern}*`);
	const { rows, total } = await request(config, params, fetcher, source.relation, source.feature);
	const pages = Math.ceil(total / pageSize);
	if (page > Math.max(1, pages)) return listing(config, {
		...query,
		page: Math.max(1, pages)
	}, fetcher, source);
	return {
		items: rows.map(source.map),
		total,
		page,
		pageSize,
		pages,
		unit: source.unit
	};
}
async function readProduct(config, slug, fetcher = fetch) {
	if (!slugPattern.test(slug)) return void 0;
	const { rows } = await request(config, new URLSearchParams({
		select: FIELDS,
		slug: `eq.${slug}`,
		limit: "1"
	}), fetcher);
	return rows[0] ? publicProduct(rows[0]) : void 0;
}
function variantOptions(value) {
	if (!Array.isArray(value) || value.length > 8) throw new Error("Invalid variant options");
	const kinds = /* @__PURE__ */ new Set();
	return value.map((o) => {
		if (!o || typeof o !== "object" || !kindPattern.test(o.kind) || kinds.has(o.kind) || !identifier(o.key)) throw new Error("Invalid variant options");
		kinds.add(o.kind);
		return {
			kind: o.kind,
			key: o.key,
			label: localized(o.label, "Invalid variant options"),
			value: localized(o.value, "Invalid variant options"),
			...valueLang(o.value_lang, o.value, "Invalid variant options")
		};
	});
}
function variantSpecs(value) {
	if (!Array.isArray(value) || value.length > 40) throw new Error("Invalid variant specs");
	return value.map((s) => {
		if (!s || typeof s !== "object" || !kindPattern.test(s.kind)) throw new Error("Invalid variant specs");
		return {
			kind: s.kind,
			label: localized(s.label, "Invalid variant specs"),
			value: localized(s.value, "Invalid variant specs"),
			...valueLang(s.value_lang, s.value, "Invalid variant specs")
		};
	});
}
/** @returns {import('../contracts/catalog').ProductVariant} */
function publicVariant(row) {
	const product = publicProduct(row);
	if (!Number.isSafeInteger(row.position) || row.position < 0 || typeof row.is_primary !== "boolean") throw new Error("Invalid variant position");
	return {
		...product,
		options: variantOptions(row.options),
		specs: variantSpecs(row.specs),
		position: row.position,
		isPrimary: row.is_primary
	};
}
/**
* Validates the one-round-trip model envelope for an addressed variant slug.
* @returns {import('../contracts/catalog').ProductModel | undefined}
*/
function productModel(data, slug) {
	if (data === null) return void 0;
	if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.variants) || data.variants.length > 60) throw new Error("Invalid product model response");
	const product = publicProduct(data.product);
	if (product.slug !== slug) throw new Error("Invalid product model identity");
	if (data.model_key === null || data.model_key === void 0 || !data.variants.length) return singleModel(product);
	if (!identifier(data.model_key)) throw new Error("Invalid product model identity");
	const name = localized(data.model_name, "Invalid model name");
	const variants = data.variants.map(publicVariant);
	if (new Set(variants.map((v) => v.slug)).size !== variants.length || new Set(variants.map((v) => v.id)).size !== variants.length || variants.some((v) => v.brandSlug !== product.brandSlug)) throw new Error("Invalid product model variants");
	if (!variants.some((v) => v.slug === slug)) variants.push(publicVariant({
		options: [],
		specs: [],
		position: Number.MAX_SAFE_INTEGER,
		is_primary: false,
		...data.product
	}));
	return assembleModel(data.model_key, name, variants, slug);
}
/** @returns {Promise<import('../contracts/catalog').ProductModel | undefined>} */
async function readProductModel(config, slug, fetcher = fetch) {
	if (!slugPattern.test(slug)) return void 0;
	return withFallback(config, "jwl_product_model", async () => {
		const response = await get(config, "/rest/v1/rpc/jwl_product_model", new URLSearchParams({ p_slug: slug }), fetcher, { feature: "jwl_product_model" });
		if (!response.ok) throw new Error(`Product model read failed (${response.status})`);
		return productModel(await response.json(), slug);
	}, async () => singleModel(await readProduct(config, slug, fetcher)));
}
async function listCollections(config, brand, fetcher = fetch) {
	if (!slugPattern.test(brand)) return [];
	const url = new URL("/rest/v1/jwl_collections", configuration(config));
	url.search = new URLSearchParams({
		select: "collection_slug,collection_ar,collection_en",
		brand_slug: `eq.${brand}`,
		order: "collection_en.asc",
		limit: "200"
	}).toString();
	const headers = { apikey: config.key };
	if (!config.key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${config.key}`;
	const response = await fetcher(url, {
		headers,
		signal: AbortSignal.timeout(8e3),
		redirect: "manual"
	});
	if (!response.ok) throw new Error(`Collections read failed (${response.status})`);
	const rows = await response.json();
	if (!Array.isArray(rows) || rows.some((r) => !slugPattern.test(r.collection_slug) || typeof r.collection_ar !== "string" || typeof r.collection_en !== "string")) throw new Error("Invalid collection response");
	return rows.map((r) => ({
		slug: r.collection_slug,
		name: {
			ar: r.collection_ar,
			en: r.collection_en
		}
	}));
}
async function listPublishedBrands(config, fetcher = fetch) {
	const url = new URL("/rest/v1/jwl_brands", configuration(config));
	url.search = new URLSearchParams({
		select: "brand_slug,brand_name,brand_tier",
		order: "brand_slug.asc",
		limit: "500"
	}).toString();
	const headers = { apikey: config.key };
	if (!config.key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${config.key}`;
	const response = await fetcher(url, {
		headers,
		signal: AbortSignal.timeout(8e3),
		redirect: "manual"
	});
	if (!response.ok) throw new Error(`Brand directory read failed (${response.status})`);
	return publishedBrands(await response.json());
}
/** @returns {import('../contracts/catalog').Brand[]} */
function publishedBrands(rows) {
	if (!Array.isArray(rows) || rows.some((r) => !r || !slugPattern.test(r.brand_slug) || typeof r.brand_name !== "string" || !r.brand_name.trim() || ![
		"luxury",
		"accessible",
		"contemporary"
	].includes(r.brand_tier))) throw new Error("Invalid brand directory");
	return rows.map((r) => ({
		id: `brand-${r.brand_slug}`,
		slug: r.brand_slug,
		name: r.brand_name,
		tier: r.brand_tier,
		summary: {
			ar: `مختارات ${r.brand_name}. الاستفسار عن التفاصيل عبر واتساب.`,
			en: `${r.brand_name} selections. Ask about the details on WhatsApp.`
		}
	}));
}
/** @returns {Promise<{result: import('../contracts/catalog').ProductPage, collections: {slug: string, name: import('../contracts/catalog').LocalizedText}[], brands: import('../contracts/catalog').Brand[], brand: import('../contracts/catalog').Brand | undefined}>} */
function readBrandPage(config, brand, query = {}, fetcher = fetch) {
	return brandPage(config, brand, query, fetcher, {
		fn: "jwl_brand_page",
		map: publicProduct,
		unit: "products"
	});
}
/** The collapsed counterpart: one card per model, with today's brand page while the RPC does not exist yet.
* @returns {ReturnType<typeof readBrandPage>} */
function readBrandModelsPage(config, brand, query = {}, fetcher = fetch) {
	return withFallback(config, "jwl_brand_models_page", () => brandPage(config, brand, query, fetcher, {
		fn: "jwl_brand_models_page",
		map: publicModelRow,
		unit: "models",
		feature: "jwl_brand_models_page"
	}), () => readBrandPage(config, brand, query, fetcher));
}
async function brandPage(config, brand, query, fetcher, source) {
	if (!slugPattern.test(brand)) throw new Error("Invalid brand page identity");
	const params = new URLSearchParams({
		p_brand: brand,
		p_page: String(integer(query.page, 1, 1e4)),
		p_page_size: String(integer(query.pageSize, 12, 48))
	});
	const response = await get(config, `/rest/v1/rpc/${source.fn}`, params, fetcher, { feature: source.feature });
	if (!response.ok) throw new Error(`Brand page read failed (${response.status})`);
	const data = await response.json();
	if (!data || !Array.isArray(data.items) || !Array.isArray(data.collections) || data.collections.length > 200 || !Array.isArray(data.brands) || data.brands.length > 500) throw new Error("Invalid brand page response");
	for (const field of [
		"total",
		"page",
		"pageSize",
		"pages"
	]) if (!Number.isSafeInteger(data[field]) || data[field] < 0) throw new Error("Invalid brand page pagination");
	if (data.pageSize < 1 || data.pageSize > 48 || data.pages !== Math.ceil(data.total / data.pageSize) || data.page < 1 || data.page > Math.max(1, data.pages) || data.items.length > data.pageSize || data.items.some((row) => row.brand_slug !== brand)) throw new Error("Invalid brand page pagination");
	const items = data.items.map(source.map);
	if (data.collections.some((r) => !r || !slugPattern.test(r.collection_slug) || typeof r.collection_ar !== "string" || typeof r.collection_en !== "string")) throw new Error("Invalid collection response");
	const brands = publishedBrands(data.brands);
	const target = data.brand === null ? void 0 : publishedBrands([data.brand])[0];
	if (target && target.slug !== brand) throw new Error("Invalid brand page identity");
	return {
		result: {
			items,
			total: data.total,
			page: data.page,
			pageSize: data.pageSize,
			pages: data.pages,
			unit: source.unit
		},
		collections: data.collections.map((r) => ({
			slug: r.collection_slug,
			name: {
				ar: r.collection_ar,
				en: r.collection_en
			}
		})),
		brands,
		brand: target
	};
}
//#endregion
//#region src/server/catalog-directory.mjs
/**
* The curated public directory already identifies known brands. Query published
* additions only when necessary, rather than making every product card wait.
* @template {{slug: string}} T
* @param {string} slug
* @param {T[]} directory
* @param {() => Promise<T[]>} loadPublishedDirectory
* @returns {Promise<T | undefined>}
*/
async function findDirectoryBrand(slug, directory, loadPublishedDirectory) {
	return directory.find((brand) => brand.slug === slug) ?? (await loadPublishedDirectory()).find((brand) => brand.slug === slug);
}
//#endregion
//#region src/server/catalog.ts
function catalogMode() {
	if ((env.CATALOG_MODE || void 0) === "preview") return "preview";
	const url = env.SUPABASE_URL || void 0;
	const key = env.SUPABASE_PUBLISHABLE_KEY || void 0;
	if (Boolean(url) !== Boolean(key)) throw new Error("Incomplete catalog connection configuration");
	return url && key ? "live" : "empty";
}
var config = () => ({
	url: env.SUPABASE_URL || void 0,
	key: env.SUPABASE_PUBLISHABLE_KEY || void 0
});
var brandCache;
function getDirectoryBrands() {
	return getBrands$1().filter((b) => catalogMode() === "preview" || b.slug !== "jwleria-edit").map((b) => ({
		...b,
		summary: b.slug === "jwleria-edit" ? b.summary : {
			ar: `${b.name} مدرجة في دليل العلامات. الاستفسار عبر واتساب.`,
			en: `${b.name} in the brand directory. Inquiries via WhatsApp.`
		}
	}));
}
async function getBrands() {
	const directory = getDirectoryBrands();
	if (catalogMode() !== "live") return directory;
	if (!brandCache || Date.now() > brandCache.until) brandCache = {
		until: Date.now() + 6e4,
		value: listPublishedBrands(config()).catch((error) => {
			brandCache = void 0;
			throw error;
		})
	};
	const published = await brandCache.value;
	const merged = new Map(directory.map((b) => [b.slug, b]));
	for (const brand of published) merged.set(brand.slug, brand);
	return [...merged.values()];
}
var getCategories = getCategories$1;
var getCategory = getCategory$1;
async function getBrand(slug) {
	return findDirectoryBrand(slug, getDirectoryBrands(), getBrands);
}
async function getBrandPage(slug, query = {}) {
	const directory = getDirectoryBrands();
	const known = directory.find((b) => b.slug === slug);
	if (catalogMode() !== "live") return {
		brand: known,
		result: await getProducts({
			...query,
			brand: slug
		}),
		collections: [],
		directory
	};
	const page = await readBrandModelsPage(config(), slug, query);
	const merged = new Map(directory.map((b) => [b.slug, b]));
	for (const brand of page.brands) merged.set(brand.slug, brand);
	return {
		brand: known ?? page.brand,
		result: page.result,
		collections: page.collections,
		directory: [...merged.values()]
	};
}
async function getProducts(query = {}) {
	if (catalogMode() === "preview") return getProducts$1(query);
	if (catalogMode() === "live") return queryModels(config(), query);
	return {
		items: [],
		total: 0,
		page: 1,
		pageSize: 12,
		pages: 0
	};
}
async function getProductModel(slug) {
	if (catalogMode() === "preview") return getProductModel$1(slug);
	return catalogMode() === "live" ? readProductModel(config(), slug) : void 0;
}
async function getCollections(brand) {
	return catalogMode() === "live" ? listCollections(config(), brand) : [];
}
async function getRelatedProducts(product, limit = 4, modelKey = null) {
	if (catalogMode() === "preview") return getRelatedProducts$1(product, limit, modelKey);
	return (await getProducts({
		category: product.categorySlug,
		pageSize: Math.min(limit + 1, 48)
	})).items.filter((p) => p.id !== product.id && (!modelKey || p.model?.key !== modelKey)).slice(0, limit);
}
async function getLatestProducts(limit = 6) {
	return (await getProducts({ pageSize: limit })).items;
}
//#endregion
export { getCategories as a, getLatestProducts as c, getRelatedProducts as d, getBrands as i, getProductModel as l, getBrand as n, getCategory as o, getBrandPage as r, getCollections as s, catalogMode as t, getProducts as u };
