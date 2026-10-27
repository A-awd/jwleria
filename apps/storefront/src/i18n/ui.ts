import type { Locale, ModelSummary } from '../contracts/catalog';
import { withBrand } from '../components/inquiry-message.mjs';
import { MODEL_PAGE_VARIANTS } from '../components/variant-selection.mjs';

export const locales = ['ar', 'en'] as const satisfies readonly Locale[];
export const isLocale = (v: unknown): v is Locale => v === 'ar' || v === 'en';
export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr');
export const otherLocale = (l: Locale): Locale => (l === 'ar' ? 'en' : 'ar');
export const href = (l: Locale, path = '/') => `/${l}${path.startsWith('/') ? path : `/${path}`}`;
export const localeParams = () => locales.map((locale) => ({ params: { locale } }));

// Option counts use each noun's correct Arabic form: واحد/مثنى for 1–2, plural for 3–10, singular from 11.
type ArabicForms = readonly [one: string, two: string, few: string, many: string, other: string];
const AR_COUNTS: Record<string, ArabicForms> = {
  // A dial is not always a colour (stone, meteorite, paved), so Arabic counts dial options, as English counts dials.
  dial: ['خيار ميناء واحد', 'خيارا ميناء', 'خيارات ميناء', 'خيار ميناء', 'خيار ميناء'],
  bracelet: ['سوار واحد', 'سواران', 'أساور', 'سوارًا', 'سوار'],
  bracelet_material: ['مادة سوار واحدة', 'مادتا سوار', 'مواد سوار', 'مادة سوار', 'مادة سوار'],
  colour: ['لون واحد', 'لونان', 'ألوان', 'لونًا', 'لون'],
  size: ['مقاس واحد', 'مقاسان', 'مقاسات', 'مقاسًا', 'مقاس'],
  case_size: ['قطر واحد', 'قطران', 'أقطار', 'قطرًا', 'قطر'],
  option: ['خيار واحد', 'خياران', 'خيارات', 'خيارًا', 'خيار'],
};
const EN_COUNTS: Record<string, readonly [one: string, other: string]> = {
  dial: ['dial', 'dials'], bracelet: ['bracelet', 'bracelets'], bracelet_material: ['bracelet material', 'bracelet materials'], colour: ['colour', 'colours'], size: ['size', 'sizes'],
  ring_size: ['ring size', 'ring sizes'], bracelet_size: ['bracelet size', 'bracelet sizes'], bag_size: ['bag size', 'bag sizes'],
  case_size: ['case diameter', 'case diameters'], option: ['option', 'options'],
};
const countKind = (kind: string, table: Record<string, unknown>) => {
  const k = kind === 'color' ? 'colour' : kind;
  return k in table ? k : /^(?:ring|bracelet|bag)_size$/.test(k) && 'size' in table ? 'size' : 'option';
};
const AR_MODELS: ArabicForms = ['طراز واحد', 'طرازان', 'طرازات', 'طرازًا', 'طراز'];
const arabicPlural = ([one, two, few, many, other]: ArabicForms, n: number) => {
  const tens = n % 100;
  return n === 1 ? one : n === 2 ? two : tens >= 3 && tens <= 10 ? `${n} ${few}` : tens >= 11 ? `${n} ${many}` : `${n} ${other}`;
};
export const arabicCount = (kind: string, n: number) => arabicPlural(AR_COUNTS[countKind(kind, AR_COUNTS)], n);
export function englishCount(kind: string, n: number) {
  const [one, other] = EN_COUNTS[countKind(kind, EN_COUNTS)];
  return `${n} ${n === 1 ? one : other}`;
}
/** One changed option in a note; valueLang 'en' marks a value kept in its English source text. */
type Change = { label: string; value: string; valueLang?: 'en' };
/** A note in reading order: plain text, and the changed options whose values the selector marks by language. */
type ChangeNote = (string | Change)[];
const changeNote = (lead: string, separator: string, item: (label: string) => string) => (changes: Change[]): ChangeNote =>
  [lead, ...changes.flatMap((c, i) => [...(i ? [separator] : []), item(c.label), c])];

const ar = {
  langName: 'العربية',
  skip: 'الانتقال إلى المحتوى',
  tagline: 'مختارات من عالم الفخامة',
  nav: { brands: 'العلامات', categories: 'الفئات', catalog: 'الكتالوج', about: 'عن Jwleria' },
  menu: 'القائمة',
  search: 'بحث',
  contact: 'التواصل معنا',
  whatsapp: { contact: 'التواصل عبر واتساب', pending: 'قيد التجهيز', pendingDescription: 'سيتاح التواصل المباشر فور تجهيز رقم واتساب.' },
  cta: 'التواصل عبر واتساب لمعرفة السعر',
  preview: 'عرض تجريبي',
  previewNote: 'صورة توضيحية مولَّدة لأغراض المعاينة، وليست منتجاً حقيقياً.',
  reference: 'المرجع',
  viewAll: 'عرض الكل',
  hero: {
    eyebrow: '',
    title: 'الفخامة، بكل تفاصيلها',
    lead: 'مختارات من العلامات العالمية، والتفاصيل عبر واتساب.',
    primary: 'العلامات',
    secondary: 'المختارات',
  },
  brands: {
    title: 'دليل العلامات',
    lead: 'أسماء من الفخامة الكلاسيكية والميسّرة والمعاصرة. ظهور الاسم لا يعني توفّر قطعه.',
    all: 'الكل',
    count: (n: number) => `${n} علامة`,
    ownTitle: 'مختاراتنا',
    ownLead: 'مختارات من عالم الفخامة.',
    pendingTitle: 'المختارات قيد الإعداد',
    pendingText: 'لا توجد قطع معروضة لهذه العلامة حالياً.',
    ask: 'الاستفسار عن هذه العلامة',
    sameTier: 'من الفئة نفسها',
    back: 'العودة إلى الدليل',
  },
  tiers: { luxury: 'الفخامة العليا', accessible: 'الفخامة الميسّرة', contemporary: 'المعاصر' },
  categories: { title: 'القطع حسب الفئة', lead: 'من الساعات إلى حقائب السفر.', empty: 'لا توجد قطع معروضة في هذه الفئة بعد.', other: 'فئات أخرى' },
  latest: { title: 'أحدث المختارات', lead: 'مختارات من دور الأزياء والساعات والمجوهرات.' },
  concierge: { title: 'تفاصيل القطع عبر واتساب', text: 'الاستفسار عن السعر والتوفر متاح عبر واتساب بمرجع القطعة أو صورتها.' },
  catalog: {
    title: 'الكتالوج',
    lead: 'جميع القطع المعروضة حالياً.',
    q: 'البحث بالاسم أو المرجع',
    category: 'الفئة',
    any: 'كل الفئات',
    apply: 'عرض النتائج',
    clear: 'مسح',
    results: (n: number) => `${n} قطعة`,
    models: (n: number) => arabicPlural(AR_MODELS, n),
    none: 'لا توجد قطع مطابقة.',
    noscript: 'البحث والتصفية متاحان دون جافاسكربت.',
  },
  product: {
    details: 'التفاصيل',
    collection: 'المجموعة',
    category: 'الفئة',
    confirm: 'يُؤكَّد التوفر وكل التفاصيل في المحادثة.',
    related: 'مختارات أخرى',
    views: ['المشهد الكامل', 'تفصيل', 'تفصيل قريب'],
    how: 'طريقة الاستفسار',
    noPhoto: 'لا توجد صورة معتمدة لهذا المرجع بعد.',
  },
  variants: {
    group: 'خيارات هذا الطراز',
    kinds: { dial: 'الميناء', bracelet: 'السوار', bracelet_material: 'مادة السوار', colour: 'اللون', color: 'اللون', size: 'المقاس', ring_size: 'مقاس الخاتم', bracelet_size: 'مقاس السوار', bag_size: 'مقاس الحقيبة', case_size: 'قطر العلبة' } as Record<string, string>,
    count: arabicCount,
    changes: changeNote('يغيّر ', '، ', (label) => `${label} إلى `),
    showing: (ref: string) => `تم عرض المرجع ${ref}`,
    // The only two changes the open-licence migration accepts, in reviewed Arabic.
    credit: { photo: 'الصورة', quote: ['«', '»'] as [string, string], source: 'المصدر', changes: 'التعديلات', changed: { 'resized and converted to WebP': 'تغيير الحجم والتحويل إلى WebP', 'converted to WebP': 'التحويل إلى WebP' } as Record<string, string> },
  },
  dialog: {
    title: 'الاستفسار عبر واتساب',
    explain: 'هذه نسخة معاينة. لم يُربط رقم واتساب بعد، لذلك لن تُرسل أي رسالة. نص الاستفسار مع المرجع متاح للنسخ.',
    label: 'نص الاستفسار',
    copy: 'نسخ الاستفسار',
    copied: 'تم النسخ.',
    failed: 'تعذّر النسخ التلقائي. النص متاح للنسخ اليدوي.',
    close: 'إغلاق',
    general: 'مرحباً، أود الاستفسار عن مختارات Jwleria.',
    product: (name: string, ref: string, brand?: string) => `مرحباً، أود معرفة السعر والتوفر لهذه القطعة: ${withBrand(name, brand)} — المرجع ${ref}`,
    brand: (name: string) => `مرحباً، أود الاستفسار عن ${name}.`,
  },
  footer: {
    rights: 'أسماء العلامات التجارية ملك لأصحابها. Jwleria جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.',
    preview: 'نسخة معاينة غير منشورة. الصور الحالية توضيحية مولَّدة.',
  },
  about: {
    title: 'عن Jwleria',
    lead: 'مساحة لاستكشاف مختارات من الساعات والمجوهرات والحقائب والأزياء، والاستفسار عن تفاصيلها عبر واتساب.',
    stepsTitle: 'طريقة الاستفسار',
    steps: ['اختيار القطعة من الكتالوج، أو مشاركة صورتها ومرجعها عبر واتساب.', 'التحقق من التوفر وتفاصيل الطلب.', 'تأكيد جميع التفاصيل قبل أي التزام.'],
    whyTitle: 'لماذا لا نعرض الأسعار',
    why: 'يختلف التوفر والتكلفة النهائية لكل طلب، لذلك نؤكدهما في المحادثة بدلاً من عرض أرقام قد لا تكون دقيقة.',
    sellerTitle: 'بيانات البائع والسياسات',
    seller: 'تُعرض بيانات البائع والسياسات النظامية هنا عند اعتمادها.',
    contactTitle: 'التواصل',
    contact: 'قناة التواصل عبر واتساب قيد الإعداد في نسخة المعاينة هذه.',
  },
  notFound: { title: 'الصفحة غير موجودة', home: 'العودة إلى الرئيسية' },
};

const en: typeof ar = {
  langName: 'English',
  skip: 'Skip to content',
  tagline: 'Selections from the world of luxury',
  nav: { brands: 'Brands', categories: 'Categories', catalog: 'Catalogue', about: 'About' },
  menu: 'Menu',
  search: 'Search',
  contact: 'Contact',
  whatsapp: { contact: 'Contact on WhatsApp', pending: 'Coming soon', pendingDescription: 'Direct contact will be available once the WhatsApp number is ready.' },
  cta: 'Contact on WhatsApp for the price',
  preview: 'Preview',
  previewNote: 'Generated illustrative image for preview purposes — not a real product.',
  reference: 'Reference',
  viewAll: 'View all',
  hero: {
    eyebrow: '',
    title: 'Luxury in every detail',
    lead: 'Explore brands and pieces, and contact us for the details.',
    primary: 'Explore the brands',
    secondary: 'View the edit',
  },
  brands: {
    title: 'The brand directory',
    lead: 'Names from classic, accessible and contemporary luxury. A listed name does not imply availability.',
    all: 'All',
    count: (n: number) => `${n} brands`,
    ownTitle: 'Our edit',
    ownLead: 'Preview pieces from our own selection.',
    pendingTitle: 'Selection in preparation',
    pendingText: 'No pieces from this house are currently on view.',
    ask: 'Ask about this house',
    sameTier: 'In the same tier',
    back: 'Back to the directory',
  },
  tiers: { luxury: 'Luxury', accessible: 'Accessible luxury', contemporary: 'Contemporary' },
  categories: { title: 'Browse by category', lead: 'From watches to luggage.', empty: 'No pieces are shown in this category yet.', other: 'Other categories' },
  latest: { title: 'Latest in the edit', lead: 'Selections from fashion, watch and jewellery houses.' },
  concierge: { title: 'Item details via WhatsApp', text: 'Price and availability enquiries are available on WhatsApp with the item\'s reference or photo.' },
  catalog: {
    title: 'Catalogue',
    lead: 'Every piece currently on view.',
    q: 'Search by name or reference',
    category: 'Category',
    any: 'All categories',
    apply: 'Show results',
    clear: 'Clear',
    results: (n: number) => `${n} pieces`,
    models: (n: number) => `${n} ${n === 1 ? 'model' : 'models'}`,
    none: 'No matching pieces.',
    noscript: 'Search and filters work without JavaScript.',
  },
  product: {
    details: 'Details',
    collection: 'Collection',
    category: 'Category',
    confirm: 'Availability and every detail are confirmed in conversation.',
    related: 'You may also like',
    views: ['Full view', 'Detail', 'Close detail'],
    how: 'How to inquire',
    noPhoto: 'No approved photograph of this reference yet.',
  },
  variants: {
    group: 'Options for this model',
    kinds: { dial: 'Dial', bracelet: 'Bracelet', bracelet_material: 'Bracelet material', colour: 'Colour', color: 'Colour', size: 'Size', ring_size: 'Ring size', bracelet_size: 'Bracelet size', bag_size: 'Bag size', case_size: 'Case diameter' },
    count: englishCount,
    changes: changeNote('Changes ', ', ', (label) => `${label.charAt(0).toLowerCase()}${label.slice(1)} to `),
    showing: (ref: string) => `Showing reference ${ref}`,
    credit: { photo: 'Photo', quote: ['“', '”'] as [string, string], source: 'Source', changes: 'Changes', changed: { 'resized and converted to WebP': 'resized and converted to WebP', 'converted to WebP': 'converted to WebP' } as Record<string, string> },
  },
  dialog: {
    title: 'WhatsApp inquiry',
    explain: 'This is a preview. No WhatsApp number is connected yet, so no message will be sent. You can copy the inquiry text with its reference.',
    label: 'Inquiry text',
    copy: 'Copy inquiry',
    copied: 'Copied.',
    failed: 'Copy failed — select the text manually.',
    close: 'Close',
    general: 'Hello, I would like to ask about the Jwleria selection.',
    product: (name: string, ref: string, brand?: string) => `Hello, I would like the price and availability for: ${withBrand(name, brand)} — reference ${ref}`,
    brand: (name: string) => `Hello, I would like to ask about ${name}.`,
  },
  footer: {
    rights: 'Brand names belong to their respective owners. Jwleria is independent and is not affiliated with or endorsed by these brands.',
    preview: 'Unpublished preview. Current images are generated illustrations.',
  },
  about: {
    title: 'About',
    lead: 'A space to explore selections of watches, jewellery, handbags and fashion, and ask about their details on WhatsApp.',
    stepsTitle: 'How to inquire',
    steps: ['Choose a piece from the catalogue, or send us its image and reference.', 'We check availability and the details of your request.', 'We confirm everything with you before any commitment.'],
    whyTitle: 'Why we do not show prices',
    why: 'Availability and the final cost differ for every request, so we confirm them in conversation rather than display figures that may not be accurate.',
    sellerTitle: 'Seller details and policies',
    seller: 'Seller details and required policies will appear here once finalised.',
    contactTitle: 'Contact',
    contact: 'The WhatsApp channel is still being set up in this preview.',
  },
  notFound: { title: 'Page not found', home: 'Back to home' },
};

export const ui = { ar, en };
export const t = (l: Locale) => ui[l];

/** The label of an option or spec kind (one source for both): the reviewed translation when known, otherwise the catalog's own label. */
export const optionLabel = (l: Locale, kind: string, fallback: Record<Locale, string>) => ui[l].variants.kinds[kind] ?? fallback[l];
/** A listing total names what it counts: model cards from the model projection, otherwise catalog rows. */
export const resultCount = (l: Locale, page: { total: number; unit?: 'models' | 'products' }) =>
  page.unit === 'models' ? ui[l].catalog.models(page.total) : ui[l].catalog.results(page.total);
/** Neutral counts of the real option values a model card can mention (only kinds with a choice). A model with
 * more variants than its page can offer gets no count, since the page could not show every value counted. */
export const optionCounts = (l: Locale, model?: Pick<ModelSummary, 'variantCount' | 'options'>) =>
  !model || model.variantCount > MODEL_PAGE_VARIANTS ? '' : model.options.filter((o) => o.count > 1).map((o) => ui[l].variants.count(o.kind, o.count)).join(' · ');
/** A page's canonical URL and its language alternates all name its canonical twin (a model's primary variant). */
export function pageLinks(l: Locale, canonicalPath: string, site?: URL) {
  const absolute = (path: string) => (site ? new URL(path, site).href : path);
  return {
    canonical: absolute(href(l, canonicalPath)),
    alternates: [['ar', absolute(href('ar', canonicalPath))], ['en', absolute(href('en', canonicalPath))], ['x-default', absolute(href('ar', canonicalPath))]] as const,
  };
}
