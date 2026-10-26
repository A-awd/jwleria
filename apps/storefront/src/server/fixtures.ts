import type {
  Brand,
  BrandTier,
  Category,
  LocalizedText,
  ProductModel,
  ProductPage,
  ProductQuery,
  ProductVariant,
  PublicProduct,
  VariantSpec,
} from '../contracts/catalog';
import { assembleModel, singleModel } from '../components/variant-selection.mjs';

const PREVIEW_BRAND_SLUG = 'jwleria-edit';
const CATEGORY_IMAGES: Record<string, string> = {
  watches: '/images/watch.webp',
  bracelets: '/images/bracelet.webp',
  jewelry: '/images/bracelet.webp',
  'leather-goods': '/images/leather-goods.webp',
  handbags: '/images/handbag.webp',
  luggage: '/images/luggage.webp',
  clothing: '/images/clothing.webp',
  shoes: '/images/shoes.webp',
  accessories: '/images/accessories.webp',
};
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

const DIRECTORY_SUMMARY = {
  ar: 'صفحة ضمن دليل العلامات. لا تتضمن هذه المعاينة منتجات منسوبة إلى هذه العلامة، ولا تعني علاقة رسمية معها.',
  en: 'A brand directory preview. No products from this brand are listed in this preview; inclusion does not imply affiliation.',
};

type BrandSeed = readonly [slug: string, name: string, tier: BrandTier];

const brandSeeds: readonly BrandSeed[] = [
  ['cartier', 'Cartier', 'luxury'],
  ['tiffany-and-co', 'Tiffany & Co.', 'luxury'],
  ['van-cleef-and-arpels', 'Van Cleef & Arpels', 'luxury'],
  ['bvlgari', 'Bvlgari', 'luxury'],
  ['chopard', 'Chopard', 'luxury'],
  ['harry-winston', 'Harry Winston', 'luxury'],
  ['piaget', 'Piaget', 'luxury'],
  ['boucheron', 'Boucheron', 'luxury'],
  ['graff', 'Graff', 'luxury'],
  ['rolex', 'Rolex', 'luxury'],
  ['patek-philippe', 'Patek Philippe', 'luxury'],
  ['audemars-piguet', 'Audemars Piguet', 'luxury'],
  ['vacheron-constantin', 'Vacheron Constantin', 'luxury'],
  ['jaeger-lecoultre', 'Jaeger-LeCoultre', 'luxury'],
  ['omega', 'OMEGA', 'luxury'],
  ['iwc-schaffhausen', 'IWC Schaffhausen', 'luxury'],
  ['panerai', 'Panerai', 'luxury'],
  ['tag-heuer', 'TAG Heuer', 'luxury'],
  ['hermes', 'Hermès', 'luxury'],
  ['chanel', 'CHANEL', 'luxury'],
  ['louis-vuitton', 'Louis Vuitton', 'luxury'],
  ['dior', 'Dior', 'luxury'],
  ['gucci', 'Gucci', 'luxury'],
  ['prada', 'Prada', 'luxury'],
  ['bottega-veneta', 'Bottega Veneta', 'luxury'],
  ['saint-laurent', 'Saint Laurent', 'luxury'],
  ['fendi', 'Fendi', 'luxury'],
  ['loewe', 'LOEWE', 'luxury'],
  ['celine', 'CELINE', 'luxury'],
  ['balenciaga', 'Balenciaga', 'luxury'],
  ['valentino', 'Valentino', 'luxury'],
  ['burberry', 'Burberry', 'luxury'],
  ['coach', 'Coach', 'accessible'],
  ['michael-kors', 'Michael Kors', 'accessible'],
  ['tory-burch', 'Tory Burch', 'accessible'],
  ['kate-spade-new-york', 'kate spade new york', 'accessible'],
  ['longchamp', 'Longchamp', 'accessible'],
  ['furla', 'Furla', 'accessible'],
  ['swarovski', 'Swarovski', 'contemporary'],
  ['seiko', 'Seiko', 'contemporary'],
  ['tissot', 'Tissot', 'contemporary'],
];

const brands: readonly Brand[] = [
  {
    id: 'brand-jwleria-edit',
    slug: PREVIEW_BRAND_SLUG,
    name: 'Jwleria Edit',
    tier: 'contemporary',
    summary: {
      ar: 'مجموعة معاينة محايدة من Jwleria: نماذج وصور اصطناعية لتجربة التصفح، وليست منتجات تجارية أو قطعًا من علامات عالمية.',
      en: 'A neutral Jwleria preview collection: synthetic objects and images for exploring the site, rather than commercial products or pieces from international brands.',
    },
  },
  ...brandSeeds.map(([slug, name, tier]): Brand => ({
    id: `brand-${slug}`,
    slug,
    name,
    tier,
    summary: { ...DIRECTORY_SUMMARY },
  })),
];

const categories: readonly Category[] = [
  { id: 'category-watches', slug: 'watches', name: { ar: 'الساعات', en: 'Watches' }, image: CATEGORY_IMAGES.watches },
  { id: 'category-bracelets', slug: 'bracelets', name: { ar: 'الأساور', en: 'Bracelets' }, image: CATEGORY_IMAGES.bracelets },
  { id: 'category-jewelry', slug: 'jewelry', name: { ar: 'المجوهرات', en: 'Jewelry' }, image: CATEGORY_IMAGES.jewelry },
  { id: 'category-leather-goods', slug: 'leather-goods', name: { ar: 'المصنوعات الجلدية', en: 'Leather goods' }, image: CATEGORY_IMAGES['leather-goods'] },
  { id: 'category-handbags', slug: 'handbags', name: { ar: 'حقائب اليد', en: 'Handbags' }, image: CATEGORY_IMAGES.handbags },
  { id: 'category-luggage', slug: 'luggage', name: { ar: 'حقائب السفر', en: 'Luggage' }, image: CATEGORY_IMAGES.luggage },
  { id: 'category-clothing', slug: 'clothing', name: { ar: 'الملابس', en: 'Clothing' }, image: CATEGORY_IMAGES.clothing },
  { id: 'category-shoes', slug: 'shoes', name: { ar: 'الأحذية', en: 'Shoes' }, image: CATEGORY_IMAGES.shoes },
  { id: 'category-accessories', slug: 'accessories', name: { ar: 'الإكسسوارات', en: 'Accessories' }, image: CATEGORY_IMAGES.accessories },
];

type ProductSeed = readonly [
  sequence: number,
  slug: string,
  categorySlug: string,
  arabicName: string,
  englishName: string,
];

// Explicit sequence numbers are stable fixture identities, independent of array order.
const productSeeds: readonly ProductSeed[] = [
  [1, 'watch-study-01', 'watches', 'ساعة — معاينة ١', 'Watch study 01'],
  [2, 'watch-study-02', 'watches', 'ساعة — معاينة ٢', 'Watch study 02'],
  [3, 'watch-study-03', 'watches', 'ساعة — معاينة ٣', 'Watch study 03'],
  [4, 'bracelet-study-01', 'bracelets', 'سوار — معاينة ١', 'Bracelet study 01'],
  [5, 'bracelet-study-02', 'bracelets', 'سوار — معاينة ٢', 'Bracelet study 02'],
  [6, 'bracelet-study-03', 'bracelets', 'سوار — معاينة ٣', 'Bracelet study 03'],
  [7, 'jewelry-study-01', 'jewelry', 'مجوهرات — معاينة ١', 'Jewelry study 01'],
  [8, 'jewelry-study-02', 'jewelry', 'مجوهرات — معاينة ٢', 'Jewelry study 02'],
  [9, 'jewelry-study-03', 'jewelry', 'مجوهرات — معاينة ٣', 'Jewelry study 03'],
  [10, 'leather-goods-study-01', 'leather-goods', 'مصنوعات جلدية — معاينة ١', 'Leather goods study 01'],
  [11, 'leather-goods-study-02', 'leather-goods', 'مصنوعات جلدية — معاينة ٢', 'Leather goods study 02'],
  [12, 'leather-goods-study-03', 'leather-goods', 'مصنوعات جلدية — معاينة ٣', 'Leather goods study 03'],
  [13, 'handbag-study-01', 'handbags', 'حقيبة يد — معاينة ١', 'Handbag study 01'],
  [14, 'handbag-study-02', 'handbags', 'حقيبة يد — معاينة ٢', 'Handbag study 02'],
  [15, 'handbag-study-03', 'handbags', 'حقيبة يد — معاينة ٣', 'Handbag study 03'],
  [16, 'luggage-study-01', 'luggage', 'حقيبة سفر — معاينة ١', 'Luggage study 01'],
  [17, 'luggage-study-02', 'luggage', 'حقيبة سفر — معاينة ٢', 'Luggage study 02'],
  [18, 'luggage-study-03', 'luggage', 'حقيبة سفر — معاينة ٣', 'Luggage study 03'],
  [19, 'clothing-study-01', 'clothing', 'ملابس — معاينة ١', 'Clothing study 01'],
  [20, 'clothing-study-02', 'clothing', 'ملابس — معاينة ٢', 'Clothing study 02'],
  [21, 'clothing-study-03', 'clothing', 'ملابس — معاينة ٣', 'Clothing study 03'],
  [22, 'shoe-study-01', 'shoes', 'حذاء — معاينة ١', 'Shoe study 01'],
  [23, 'shoe-study-02', 'shoes', 'حذاء — معاينة ٢', 'Shoe study 02'],
  [24, 'shoe-study-03', 'shoes', 'حذاء — معاينة ٣', 'Shoe study 03'],
  [25, 'accessory-study-01', 'accessories', 'إكسسوار — معاينة ١', 'Accessory study 01'],
  [26, 'accessory-study-02', 'accessories', 'إكسسوار — معاينة ٢', 'Accessory study 02'],
  [27, 'accessory-study-03', 'accessories', 'إكسسوار — معاينة ٣', 'Accessory study 03'],
];

const products: readonly PublicProduct[] = productSeeds.map(
  ([sequence, slug, categorySlug, ar, en]): PublicProduct => ({
    id: `4c4a0000-2026-4003-8000-${String(sequence).padStart(12, '0')}`,
    slug,
    reference: `JWL-PREVIEW-${String(sequence).padStart(3, '0')}`,
    brandSlug: PREVIEW_BRAND_SLUG,
    collection: { ar: 'مختاراتنا', en: 'Jwleria Edit' },
    collectionSlug: 'jwleria-edit',
    images: [CATEGORY_IMAGES[categorySlug]],
    categorySlug,
    name: { ar, en },
    summary: {
      ar: 'صورة اصطناعية للتجربة؛ ليست لقطعة تجارية أو منتج من علامة عالمية.',
      en: 'A synthetic preview illustration, not a commercial item or a product from an international brand.',
    },
    image: CATEGORY_IMAGES[categorySlug],
    mediaKind: 'synthetic-preview',
    isPreview: true,
    addedAt: `2026-10-03T09:${String(sequence).padStart(2, '0')}:00.000Z`,
  }),
);

// Synthetic model groups exercise variant selection; every reference, value and fact is a labelled preview.
// valueLang 'en' marks a value with no reviewed Arabic translation, kept in English as live data can be.
type OptionSeed = { label: LocalizedText; values: Record<string, LocalizedText & { valueLang?: 'en' }> };
type ModelSeed = {
  key: string;
  categorySlug: string;
  name: LocalizedText;
  options: Record<string, OptionSeed>;
  specs: VariantSpec[];
  variants: readonly (readonly [sequence: number, slug: string, options: Record<string, string>, images: string[]])[];
};

const SYNTHETIC_SUMMARY = {
  ar: 'صورة اصطناعية للتجربة؛ ليست لقطعة تجارية أو منتج من علامة عالمية.',
  en: 'A synthetic preview illustration, not a commercial item or a product from an international brand.',
};

const modelSeeds: readonly ModelSeed[] = [
  {
    key: 'preview:watch-model',
    categorySlug: 'watches',
    name: { ar: 'ساعة — نموذج معاينة', en: 'Preview watch model' },
    options: {
      dial: { label: { ar: 'لون الميناء', en: 'Dial' }, values: {
        ivory: { ar: 'عاجي تجريبي', en: 'Preview ivory' },
        slate: { ar: 'رمادي تجريبي', en: 'Preview slate' },
        green: { ar: 'أخضر تجريبي', en: 'Preview green' },
      } },
      bracelet: { label: { ar: 'السوار', en: 'Bracelet' }, values: {
        'three-link': { ar: 'سوار ثلاثي تجريبي', en: 'Preview three-link' },
        'five-link': { ar: 'سوار خماسي تجريبي', en: 'Preview five-link' },
        leather: { ar: 'Preview leather strap', en: 'Preview leather strap', valueLang: 'en' },
      } },
    },
    specs: [
      { kind: 'case_diameter', label: { ar: 'قطر العلبة', en: 'Case diameter' }, value: { ar: '40 مم', en: '40 mm' } },
      { kind: 'movement', label: { ar: 'الحركة', en: 'Movement' }, value: { ar: 'Preview calibre 00', en: 'Preview calibre 00' }, valueLang: 'en' },
    ],
    // The green dial exists only on the leather strap, so no other combination is offered.
    variants: [
      [101, 'preview-watch-ivory-three-link', { dial: 'ivory', bracelet: 'three-link' }, [CATEGORY_IMAGES.watches]],
      [102, 'preview-watch-ivory-five-link', { dial: 'ivory', bracelet: 'five-link' }, [CATEGORY_IMAGES.watches, '/images/catalog-still-life.webp']],
      [103, 'preview-watch-slate-three-link', { dial: 'slate', bracelet: 'three-link' }, ['/images/catalog-still-life.webp']],
      [104, 'preview-watch-slate-five-link', { dial: 'slate', bracelet: 'five-link' }, ['/images/catalog-still-life.webp', CATEGORY_IMAGES.watches]],
      [105, 'preview-watch-green-leather', { dial: 'green', bracelet: 'leather' }, []],
    ],
  },
  {
    key: 'preview:handbag-model',
    categorySlug: 'handbags',
    name: { ar: 'حقيبة يد — نموذج معاينة', en: 'Preview handbag model' },
    options: {
      colour: { label: { ar: 'اللون', en: 'Colour' }, values: {
        black: { ar: 'أسود تجريبي', en: 'Preview black' },
        beige: { ar: 'بيج تجريبي', en: 'Preview beige' },
        burgundy: { ar: 'عنابي تجريبي', en: 'Preview burgundy' },
      } },
    },
    specs: [
      { kind: 'material', label: { ar: 'المادة', en: 'Material' }, value: { ar: 'جلد تجريبي', en: 'Preview leather' } },
      { kind: 'dimensions', label: { ar: 'الأبعاد', en: 'Dimensions' }, value: { ar: '30 × 22 × 12 سم', en: '30 × 22 × 12 cm' } },
    ],
    variants: [
      [111, 'preview-handbag-black', { colour: 'black' }, [CATEGORY_IMAGES.handbags]],
      [112, 'preview-handbag-beige', { colour: 'beige' }, [CATEGORY_IMAGES['leather-goods']]],
      [113, 'preview-handbag-burgundy', { colour: 'burgundy' }, ['/images/catalog-still-life.webp']],
    ],
  },
  {
    key: 'preview:single-bracelet',
    categorySlug: 'bracelets',
    name: { ar: 'سوار — نموذج معاينة مفرد', en: 'Preview single bracelet' },
    options: {},
    specs: [
      { kind: 'material', label: { ar: 'المادة', en: 'Material' }, value: { ar: 'معدن تجريبي', en: 'Preview metal' } },
    ],
    variants: [[121, 'preview-bracelet-single', {}, [CATEGORY_IMAGES.bracelets]]],
  },
];

const modelVariants = new Map(modelSeeds.map((model, index): [string, ProductVariant[]] => [model.key, model.variants.map(([sequence, slug, chosen, images], position) => {
  const options = Object.entries(chosen).map(([kind, key]) => {
    const { valueLang, ...value } = model.options[kind].values[key];
    return { kind, key, label: model.options[kind].label, value, ...(valueLang ? { valueLang } : {}) };
  });
  const words = (l: 'ar' | 'en') => [model.name[l], ...options.map((o) => o.value[l])].join(l === 'ar' ? '، ' : ', ');
  return {
    id: `4c4a0000-2026-4003-8000-${String(sequence).padStart(12, '0')}`,
    slug,
    reference: `JWL-PREVIEW-M${index + 1}-${String(position + 1).padStart(2, '0')}`,
    brandSlug: PREVIEW_BRAND_SLUG,
    collection: { ar: 'مختاراتنا', en: 'Jwleria Edit' },
    collectionSlug: 'jwleria-edit',
    images,
    categorySlug: model.categorySlug,
    name: { ar: words('ar'), en: words('en') },
    summary: { ...SYNTHETIC_SUMMARY },
    image: images[0] ?? null,
    mediaKind: images.length ? 'synthetic-preview' : 'facts-only',
    isPreview: true,
    addedAt: `2026-10-26T09:${String(sequence - 100).padStart(2, '0')}:00.000Z`,
    options,
    specs: [...model.specs, ...options.map(({ kind, label, value, valueLang }) => ({ kind, label, value, ...(valueLang ? { valueLang } : {}) }))],
    position,
    isPrimary: position === 0,
  };
})]));
const modelSeedByKey = new Map(modelSeeds.map((model) => [model.key, model]));
const modelKeyBySlug = new Map([...modelVariants].flatMap(([key, variants]) => variants.map((v): [string, string] => [v.slug, key])));

// Listings show one card per model: its primary variant with a count of the real option values.
const listed: readonly PublicProduct[] = [
  ...products,
  ...[...modelVariants].map(([key, variants]): PublicProduct => {
    const counts = new Map<string, Set<string>>();
    for (const v of variants) for (const o of v.options) counts.set(o.kind, (counts.get(o.kind) ?? new Set()).add(o.key));
    const { options: _options, specs: _specs, position: _position, isPrimary: _primary, ...primary } = variants[0];
    return { ...primary, model: { key, name: modelSeedByKey.get(key)!.name, variantCount: variants.length, options: [...counts].map(([kind, values]) => ({ kind, count: values.size })) } };
  }),
];

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

function cloneBrand(brand: Brand): Brand {
  return { ...brand, summary: { ...brand.summary } };
}

function cloneCategory(category: Category): Category {
  return { ...category, name: { ...category.name } };
}

function cloneProduct(product: PublicProduct): PublicProduct {
  return product.model ? structuredClone(product) : { ...product, name: { ...product.name }, summary: { ...product.summary } };
}

function normalizeSlug(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .trim();
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return fallback;
  return Math.max(1, Math.floor(value));
}

function latestFirst(a: PublicProduct, b: PublicProduct): number {
  return b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id);
}

/** Directory entries only. International brand pages are intentionally empty. */
export function getBrands(): Brand[] {
  return brands.map(cloneBrand);
}

export function getCategories(): Category[] {
  return categories.map(cloneCategory);
}

/** A synchronous fixture adapter; no live backend or browser database client. */
export function getProducts(query: ProductQuery = {}): ProductPage {
  const brand = normalizeSlug(query.brand);
  const category = normalizeSlug(query.category);
  const searchTokens = normalizeSearch(query.search ?? '').split(/\s+/).filter(Boolean);
  const pageSize = Math.min(MAX_PAGE_SIZE, positiveInteger(query.pageSize, DEFAULT_PAGE_SIZE));

  const filtered = listed.filter((product) => {
    if (brand && product.brandSlug !== brand) return false;
    if (category && product.categorySlug !== category) return false;
    if (searchTokens.length === 0) return true;

    const productCategory = categoryBySlug.get(product.categorySlug);
    const searchable = normalizeSearch([
      product.slug,
      product.reference,
      product.name.ar,
      product.name.en,
      product.summary.ar,
      product.summary.en,
      product.categorySlug,
      productCategory?.name.ar ?? '',
      productCategory?.name.en ?? '',
      'Jwleria Edit',
      product.model?.name.ar ?? '',
      product.model?.name.en ?? '',
      ...(modelVariants.get(product.model?.key ?? '') ?? []).map((v) => v.reference),
    ].join(' '));
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
    // Like the model projection: one card per model, single-variant previews included.
    unit: 'models',
  };
}

export function getProduct(slug: string): PublicProduct | undefined {
  const key = normalizeSlug(slug);
  const product = products.find((item) => item.slug === key) ?? modelVariants.get(modelKeyBySlug.get(key) ?? '')?.find((v) => v.slug === key);
  return product ? structuredClone(product) : undefined;
}

/** Any variant slug resolves to its whole synthetic model with that variant selected. */
export function getProductModel(slug: string): ProductModel | undefined {
  const key = normalizeSlug(slug);
  const modelKey = modelKeyBySlug.get(key);
  if (!modelKey) return singleModel(getProduct(key));
  return structuredClone(assembleModel(modelKey, modelSeedByKey.get(modelKey)!.name, modelVariants.get(modelKey)!, key));
}

export function getBrand(slug: string): Brand | undefined {
  const brand = brands.find((item) => item.slug === normalizeSlug(slug));
  return brand ? cloneBrand(brand) : undefined;
}

export function getCategory(slug: string): Category | undefined {
  const category = categoryBySlug.get(normalizeSlug(slug));
  return category ? cloneCategory(category) : undefined;
}

/** Category matches first, then other neutral previews; never include the input item or its model. */
export function getRelatedProducts(product: PublicProduct, limit = 4, modelKey: string | null = null): PublicProduct[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const count = Math.min(MAX_PAGE_SIZE, Math.floor(limit));

  return listed
    .filter((item) => item.id !== product.id && item.slug !== product.slug && (!modelKey || item.model?.key !== modelKey))
    .sort((a, b) => {
      const aMatch = Number(a.categorySlug === product.categorySlug);
      const bMatch = Number(b.categorySlug === product.categorySlug);
      return bMatch - aMatch || latestFirst(a, b);
    })
    .slice(0, count)
    .map(cloneProduct);
}

export function getLatestProducts(limit = 6): PublicProduct[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  return [...listed]
    .sort(latestFirst)
    .slice(0, Math.min(MAX_PAGE_SIZE, Math.floor(limit)))
    .map(cloneProduct);
}
