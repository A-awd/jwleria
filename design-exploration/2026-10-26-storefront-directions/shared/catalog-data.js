/*
 * Jwleria design-exploration fixture — NOT production data or an integration.
 *
 * Product facts (brand, model, reference, size, colour, dimensions, material)
 * were read from the public catalog API on 2026-10-26
 * (https://jwleria.com/api/catalog.json). The grouping of references into one
 * model with selectable variants is a design illustration only; the
 * implementation stream owns the real source-backed variant contract.
 *
 * There are no approved product photographs yet. `tone` values are approximate
 * placeholder tints so variant switching can be previewed; they are not colour
 * claims and must be replaced by the approved per-variant images.
 */
window.JWL_PREVIEW = {
  meta: {
    retrieved: '2026-10-26',
    source: 'https://jwleria.com/api/catalog.json',
    catalogReferences: 4097,
  },

  categories: [
    { slug: 'watches', ar: 'الساعات', en: 'Watches', img: 'watch' },
    { slug: 'jewelry', ar: 'المجوهرات', en: 'Jewelry', img: 'bracelet' },
    { slug: 'bracelets', ar: 'الأساور', en: 'Bracelets', img: 'bracelet' },
    { slug: 'handbags', ar: 'حقائب اليد', en: 'Handbags', img: 'handbag' },
    { slug: 'leather-goods', ar: 'المصنوعات الجلدية', en: 'Leather goods', img: 'leather-goods' },
    { slug: 'luggage', ar: 'حقائب السفر', en: 'Luggage', img: 'luggage' },
    { slug: 'clothing', ar: 'الملابس', en: 'Clothing', img: 'clothing' },
    { slug: 'shoes', ar: 'الأحذية', en: 'Shoes', img: 'shoes' },
    { slug: 'accessories', ar: 'الإكسسوارات', en: 'Accessories', img: 'accessories' },
  ],

  tiers: [
    { id: 'high', ar: 'الفخامة العليا' },
    { id: 'accessible', ar: 'الفخامة الميسّرة' },
    { id: 'contemporary', ar: 'المعاصر' },
  ],

  // Public directory names as displayed on jwleria.com. Directory inclusion
  // does not establish availability or any affiliation.
  brands: [
    'Audemars Piguet', 'Balenciaga', 'Bottega Veneta', 'Boucheron', 'Burberry', 'Bvlgari',
    'Cartier', 'CELINE', 'CHANEL', 'Chopard', 'Coach', 'Dior', 'Fendi', 'Furla', 'Graff',
    'Gucci', 'Harry Winston', 'Hermès', 'IWC Schaffhausen', 'Jaeger-LeCoultre',
    'kate spade new york', 'LOEWE', 'Longchamp', 'Louis Vuitton', 'Michael Kors', 'OMEGA',
    'Panerai', 'Patek Philippe', 'Piaget', 'Prada', 'Rolex', 'Saint Laurent', 'Seiko',
    'Swarovski', 'TAG Heuer', 'Tiffany & Co.', 'Tissot', 'Tory Burch', 'Vacheron Constantin',
    'Valentino', 'Van Cleef & Arpels',
  ],

  // Brands that currently have public products, with their live reference counts.
  brandCounts: {
    Prada: 851, LOEWE: 407, Longchamp: 390, 'Bottega Veneta': 8,
    'Audemars Piguet': 3, 'Jaeger-LeCoultre': 3,
  },

  models: [
    {
      id: 'longchamp-le-pliage-one-handbag',
      brand: 'Longchamp',
      category: 'handbags',
      typeAr: 'حقيبة يد',
      typeEn: 'Handbag',
      name: 'Le Pliage One Handbag',
      collection: 'Le Pliage One',
      material: { ar: 'قماش معاد تدويره', en: 'Recycled canvas' },
      axes: ['size', 'color'],
      sizes: [
        { id: 'S', ar: 'صغير', en: 'S', dims: '9.1 × 8.7 × 5.5 in' },
        { id: 'L', ar: 'كبير', en: 'L', dims: '13 × 9.8 × 7.1 in' },
      ],
      colors: [
        { id: '001', ar: 'أسود', en: 'Black', tone: '#1f1e1d' },
        { id: '012', ar: 'فحمي', en: 'Anthracite', tone: '#45474b' },
        { id: '105', ar: 'بيج', en: 'Beige', tone: '#d8c6a6' },
        { id: 'P87', ar: 'عنّابي', en: 'Burgundy', tone: '#6b2130' },
        { id: '163', ar: 'ليموني', en: 'Lime', tone: '#c9d24f' },
      ],
      variants: [
        { ref: 'L1621979001', size: 'S', color: '001' },
        { ref: 'L1621979012', size: 'S', color: '012' },
        { ref: 'L1621979105', size: 'S', color: '105' },
        { ref: 'L1621979P87', size: 'S', color: 'P87' },
        { ref: 'L1621979163', size: 'S', color: '163' },
        { ref: 'L1626979001', size: 'L', color: '001' },
        { ref: 'L1626979012', size: 'L', color: '012' },
        { ref: 'L1626979105', size: 'L', color: '105' },
        { ref: 'L1626979P87', size: 'L', color: 'P87' },
        { ref: 'L1626979163', size: 'L', color: '163' },
      ],
      defaultRef: 'L1621979001',
    },
    {
      id: 'loewe-puzzle-large',
      brand: 'LOEWE',
      category: 'handbags',
      typeAr: 'حقيبة',
      typeEn: 'Bag',
      name: 'Large Puzzle bag',
      collection: 'Puzzle',
      dims: '33 × 21.5 × 14.7 cm',
      axes: ['color'],
      colorLabel: { ar: 'اللون والخامة', en: 'Colour & material' },
      colors: [
        // `material` is the official Latin material name; render it inside <bdi>.
        { id: '0018', ar: 'كستنائي داكن', en: 'Dark Chestnut', material: 'Grained nubuck', tone: '#5a3a2a' },
        { id: '1100', ar: 'أسود', en: 'Black', material: 'Paper calf', tone: '#1c1b1a' },
        { id: '3606', ar: 'شوكولاتة', en: 'Chocolate', material: 'Supple grained calf', tone: '#4a2f24' },
        { id: '4787', ar: 'أخضر أوكالبتوس', en: 'Eucalyptus Green', material: 'Ostrich', tone: '#7d8f78' },
      ],
      variants: [
        { ref: 'B510PNLX05-0018', color: '0018' },
        { ref: 'B510PNLX20-1100', color: '1100' },
        { ref: 'B510PNLX17-3606', color: '3606' },
        { ref: 'B510PNLX16-4787', color: '4787' },
      ],
      defaultRef: 'B510PNLX20-1100',
    },
    {
      id: 'longchamp-le-pliage-one-backpack',
      brand: 'Longchamp',
      category: 'handbags',
      typeAr: 'حقيبة ظهر',
      typeEn: 'Backpack',
      name: 'Le Pliage One Backpack',
      collection: 'Le Pliage One',
      material: { ar: 'قماش معاد تدويره', en: 'Recycled canvas' },
      axes: ['color'],
      sizes: [{ id: 'M', ar: 'متوسط', en: 'M', dims: '10.2 × 14.6 × 4.3 in' }],
      colors: [
        { id: '001', ar: 'أسود', en: 'Black', tone: '#1f1e1d' },
        { id: '012', ar: 'فحمي', en: 'Anthracite', tone: '#45474b' },
        { id: '105', ar: 'بيج', en: 'Beige', tone: '#d8c6a6' },
        { id: 'P87', ar: 'عنّابي', en: 'Burgundy', tone: '#6b2130' },
        { id: '163', ar: 'ليموني', en: 'Lime', tone: '#c9d24f' },
      ],
      variants: [
        { ref: '10284979001', size: 'M', color: '001' },
        { ref: '10284979012', size: 'M', color: '012' },
        { ref: '10284979105', size: 'M', color: '105' },
        { ref: '10284979P87', size: 'M', color: 'P87' },
        { ref: '10284979163', size: 'M', color: '163' },
      ],
      defaultRef: '10284979001',
    },
    {
      id: 'audemars-piguet-royal-oak-15202or',
      brand: 'Audemars Piguet',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'رويال أوك',
      name: 'Royal Oak',
      collection: 'Royal Oak',
      facts: [{ ar: 'القطر', v: '39 mm' }, { ar: 'المادة', v: '18-carat pink gold' }],
      variants: [{ ref: '15202OR.OO.1240OR.01.A' }],
      tone: '#c9a48a',
      defaultRef: '15202OR.OO.1240OR.01.A',
    },
    {
      id: 'jaeger-lecoultre-reverso-classic-monoface',
      brand: 'Jaeger-LeCoultre',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'ريفيرسو كلاسيك مونوفيس سمول سيكندز',
      name: 'Reverso Classic Monoface Small Seconds',
      collection: 'Reverso Classic',
      facts: [{ ar: 'المادة', v: 'فولاذ مقاوم للصدأ' }, { ar: 'آلية الحركة', v: 'تعبئة يدوية' }],
      variants: [{ ref: 'Q3858520' }],
      tone: '#b9bcbf',
      defaultRef: 'Q3858520',
    },
    {
      id: 'longchamp-le-pliage-one-travel-bag',
      brand: 'Longchamp',
      category: 'luggage',
      typeAr: 'حقيبة سفر قابلة للتوسعة',
      typeEn: 'Extensible travel bag',
      name: 'Le Pliage One Extensible travel bag',
      collection: 'Le Pliage One',
      material: { ar: 'قماش معاد تدويره', en: 'Recycled canvas' },
      axes: ['color'],
      sizes: [{ id: 'S', ar: 'صغير', en: 'S', dims: '17.7 × 13.8 in' }],
      colors: [
        { id: '001', ar: 'أسود', en: 'Black', tone: '#1f1e1d' },
        { id: '012', ar: 'فحمي', en: 'Anthracite', tone: '#45474b' },
        { id: 'P87', ar: 'عنّابي', en: 'Burgundy', tone: '#6b2130' },
      ],
      variants: [
        { ref: 'L1911979001', size: 'S', color: '001' },
        { ref: 'L1911979012', size: 'S', color: '012' },
        { ref: 'L1911979P87', size: 'S', color: 'P87' },
      ],
      defaultRef: 'L1911979001',
    },
    {
      id: 'audemars-piguet-remaster-15240sg',
      brand: 'Audemars Piguet',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'ريماستر',
      name: 'Remaster',
      collection: 'Remaster',
      facts: [{ ar: 'القطر', v: '41 mm' }, { ar: 'المادة', v: '18-carat sand gold' }],
      variants: [{ ref: '15240SG.OO.A347CR.01' }],
      tone: '#cdb48f',
      defaultRef: '15240SG.OO.A347CR.01',
    },
    {
      id: 'jaeger-lecoultre-reverso-tribute-duoface-tourbillon',
      brand: 'Jaeger-LeCoultre',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'ريفيرسو تريبيوت ديوفيس توربيون',
      name: 'Reverso Tribute Duoface Tourbillon',
      collection: 'Reverso Tribute',
      facts: [{ ar: 'العيار', v: '847' }, { ar: 'آلية الحركة', v: 'تعبئة يدوية' }],
      variants: [{ ref: 'Q3926480' }],
      tone: '#a9a39a',
      defaultRef: 'Q3926480',
    },
    {
      id: 'audemars-piguet-royal-oak-offshore-15710st',
      brand: 'Audemars Piguet',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'رويال أوك أوفشور',
      name: 'Royal Oak Offshore',
      collection: 'Royal Oak Offshore',
      facts: [{ ar: 'القطر', v: '42 mm' }, { ar: 'المادة', v: 'فولاذ مقاوم للصدأ' }],
      variants: [{ ref: '15710ST.OO.A002CA.01' }],
      tone: '#8f9396',
      defaultRef: '15710ST.OO.A002CA.01',
    },
    {
      id: 'jaeger-lecoultre-rendez-vous-classic-date',
      brand: 'Jaeger-LeCoultre',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'راندي فو كلاسيك ديت',
      name: 'Rendez-Vous Classic Date',
      collection: 'Rendez-Vous Classic',
      facts: [{ ar: 'المادة', v: 'Pink Gold' }, { ar: 'آلية الحركة', v: 'كوارتز' }],
      variants: [{ ref: 'Q3402530' }],
      tone: '#d2b29b',
      defaultRef: 'Q3402530',
    },
  ],
};

/* Small shared helpers so every direction resolves variants the same way. */
window.JWL = (function () {
  const data = window.JWL_PREVIEW;
  const byId = (id) => data.models.find((m) => m.id === id) || data.models[0];
  const variantOf = (model, ref) => model.variants.find((v) => v.ref === ref) || model.variants.find((v) => v.ref === model.defaultRef) || model.variants[0];
  const find = (model, size, color) => model.variants.find((v) => (!size || v.size === size) && (!color || v.color === color));
  const color = (model, id) => (model.colors || []).find((c) => c.id === id);
  const size = (model, id) => (model.sizes || []).find((s) => s.id === id);
  const toneOf = (model, v) => (v && v.color && color(model, v.color) ? color(model, v.color).tone : model.tone || '#d9d4cc');
  const arDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const params = () => new URLSearchParams(location.search);
  return { data, byId, variantOf, find, color, size, toneOf, arDigits, params };
})();
