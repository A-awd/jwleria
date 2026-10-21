/** Deterministic original catalog copy from attributed technical facts, never marketing text. */
const labels = {
  material: ['المادة', 'Material'], diameter: ['القطر', 'Diameter'],
  dimensions: ['الأبعاد', 'Dimensions'], color: ['اللون', 'Color'],
  movement: ['آلية الحركة', 'Movement'], water_resistance: ['مقاومة الماء', 'Water resistance'],
  finish: ['التشطيب', 'Finish'], logo_material: ['مادة الشعار', 'Logo material'],
  compatible_strap_material: ['مادة شريط الحزام المتوافق', 'Compatible belt strap material'],
  belt_included: ['الحزام مرفق', 'Belt included'], strap_included: ['شريط الحزام مرفق', 'Belt strap included'],
  buckle_included: ['مشبك الحزام مرفق', 'Belt buckle included'],
};
const arabicValues = new Map([
  ['stainless steel', 'فولاذ مقاوم للصدأ'], ['steel', 'فولاذ'],
  ['yellow gold', 'ذهب أصفر'], ['white gold', 'ذهب أبيض'], ['rose gold', 'ذهب وردي'],
  ['leather', 'جلد'], ['calfskin', 'جلد عجل'], ['canvas', 'قماش كانفاس'],
  ['recycled canvas', 'قماش معاد تدويره'],
  ['black', 'أسود'], ['white', 'أبيض'], ['blue', 'أزرق'], ['green', 'أخضر'],
  ['automatic', 'أوتوماتيكية'], ['quartz', 'كوارتز'],
  ['suede', 'شمواه'], ['cotton tape', 'شريط قطني'], ['metal', 'معدن'], ['no', 'لا'], ['enameled', 'مطلي بالمينا'],
]);
export function factualDescriptions({brand, collection, collection_kind, external_id, facts = [], name_ar, name_en, product_name}) {
  // Unknown values stay as source terminology rather than an invented translation.
  const grouped = new Map();
  for (const fact of facts.filter(f => labels[f.key] && f.value.length<=120)) {
    const values = grouped.get(fact.key) ?? new Set();
    values.add(fact.value);
    grouped.set(fact.key, values);
  }
  const en = [...grouped].map(([key, values]) => `${labels[key][1]}: ${[...values].join(', ')}`).join('; ');
  const ar = [...grouped].map(([key, values]) => `${labels[key][0]}: ${[...values].map(value => arabicValues.get(value.toLowerCase()) ?? value).join('، ')}`).join('؛ ');
  return {
    name_ar: name_ar || product_name,
    name_en: name_en || product_name,
    description_ar: `${brand}${collection_kind === 'source_group' ? '' : `، مجموعة ${collection}`}. المرجع: ${external_id}.${ar ? ` ${ar}.` : ''}`,
    description_en: `${brand}${collection_kind === 'source_group' ? '' : `, ${collection} collection`}. Reference: ${external_id}.${en ? ` ${en}.` : ''}`,
    translation_state: name_ar ? 'provided' : 'name_pending',
  };
}
