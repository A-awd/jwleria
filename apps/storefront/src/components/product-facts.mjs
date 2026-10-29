// A product page's facts as readable groups: the variant's own specs first, then any fact that only its
// generated summary states. Nothing is invented: every label and value comes from the published row.

// The labels scripts/catalog-intake/enrich.mjs writes into a generated summary, as [Arabic, English].
const SUMMARY_LABELS = {
  material: ['المادة', 'Material'], diameter: ['القطر', 'Diameter'], dimensions: ['الأبعاد', 'Dimensions'], color: ['اللون', 'Color'],
  movement: ['آلية الحركة', 'Movement'], calibre: ['العيار', 'Calibre'], water_resistance: ['مقاومة الماء', 'Water resistance'],
  finish: ['التشطيب', 'Finish'], logo_material: ['مادة الشعار', 'Logo material'],
  compatible_strap_material: ['مادة شريط الحزام المتوافق', 'Compatible belt strap material'],
  belt_included: ['الحزام مرفق', 'Belt included'], strap_included: ['شريط الحزام مرفق', 'Belt strap included'],
  buckle_included: ['مشبك الحزام مرفق', 'Belt buckle included'],
};
// The spec kinds that already state a summary fact, so it is not shown twice.
const COVERED_BY = {
  material: ['material'], diameter: ['diameter', 'case_diameter', 'case_size'], dimensions: ['dimensions'], color: ['colour', 'color', 'dial'],
  movement: ['movement'], calibre: ['calibre'], water_resistance: ['water_resistance'],
};
// "<brand>[, <collection> collection]. Reference: <ref>.[ <facts>.]" and its Arabic twin, as enrich.mjs writes them.
const SUMMARY = {
  en: { pattern: /^.+?\. Reference: (\S+?)\.(?: (.+)\.)?$/s, separator: '; ' },
  ar: { pattern: /^.+?\. المرجع: (\S+?)\.(?: (.+)\.)?$/s, separator: '؛ ' },
};
const TECHNICAL = new Set(['movement', 'calibre', 'power_reserve', 'water_resistance']);
const DESIGN = new Set(['diameter', 'case_diameter', 'case_size', 'material', 'dial', 'colour', 'color', 'bracelet', 'bracelet_material',
  'dimensions', 'weight', 'lining', 'closure', 'metallic_hardware', 'leather_type', 'size', 'ring_size', 'bracelet_size', 'bag_size',
  'finish', 'logo_material', 'compatible_strap_material', 'belt_included', 'strap_included', 'buckle_included']);
const ARABIC = /[؀-ۿ]/;

/** The facts a generated summary states, in its order; undefined when the summary is not one (free text is kept as written). */
export function summaryFacts(locale, product) {
  const {pattern, separator} = SUMMARY[locale];
  const match = pattern.exec(product.summary[locale] ?? '');
  if (!match || match[1] !== product.reference) return undefined;
  const byLabel = new Map(Object.entries(SUMMARY_LABELS).map(([key, labels]) => [labels[locale === 'ar' ? 0 : 1], key]));
  const facts = [];
  for (const part of match[2] ? match[2].split(separator) : []) {
    const at = part.indexOf(': ');
    const key = at > 0 ? byLabel.get(part.slice(0, at)) : undefined;
    if (key && !facts.some((f) => f.kind === key)) facts.push({kind: key, label: part.slice(0, at), value: part.slice(at + 2)});
    // A value that itself contains the separator continues the previous fact.
    else if (facts.length) facts[facts.length - 1].value += separator + part;
    else return undefined;
  }
  // An Arabic-page value with no Arabic letters is the English source text, marked as such.
  return facts.map((f) => (locale === 'ar' && !ARABIC.test(f.value) ? {...f, lang: 'en'} : f));
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
export function productFacts(locale, product, label = (kind, fallback) => fallback[locale]) {
  const facts = product.specs.map((s) => ({kind: s.kind, label: label(s.kind, s.label), value: s.value[locale], lang: s.valueLang}));
  const extra = summaryFacts(locale, product);
  const kinds = new Set(facts.map((f) => f.kind));
  for (const f of extra ?? []) {
    if (!(COVERED_BY[f.kind] ?? [f.kind]).some((k) => kinds.has(k))) facts.push({...f, label: label(f.kind, {[locale]: f.label})});
  }
  const group = (kind) => (TECHNICAL.has(kind) ? 'technical' : DESIGN.has(kind) ? 'design' : 'other');
  const groups = ['design', 'technical', 'other'].map((key) => ({key, facts: facts.filter((f) => group(f.kind) === key)})).filter((g) => g.facts.length);
  return {intro: extra ? undefined : product.summary[locale], groups};
}
