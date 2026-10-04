/** Deterministic original catalog copy from attributed technical facts, never marketing text. */
const labels = {
  material: ['المادة', 'Material'], diameter: ['القطر', 'Diameter'],
  dimensions: ['الأبعاد', 'Dimensions'], color: ['اللون', 'Color'],
  movement: ['آلية الحركة', 'Movement'], water_resistance: ['مقاومة الماء', 'Water resistance'],
};
const arabicValues = new Map([
  ['stainless steel', 'فولاذ مقاوم للصدأ'], ['steel', 'فولاذ'],
  ['yellow gold', 'ذهب أصفر'], ['white gold', 'ذهب أبيض'], ['rose gold', 'ذهب وردي'],
  ['leather', 'جلد'], ['calfskin', 'جلد عجل'], ['canvas', 'قماش كانفاس'],
  ['recycled canvas', 'قماش معاد تدويره'],
  ['black', 'أسود'], ['white', 'أبيض'], ['blue', 'أزرق'], ['green', 'أخضر'],
  ['automatic', 'أوتوماتيكية'], ['quartz', 'كوارتز'],
]);
export function factualDescriptions({brand, collection, external_id, facts = [], name_ar, name_en, product_name}) {
  // Unknown values stay as source terminology rather than an invented translation.
  const supported = [...new Map(facts.filter(f => labels[f.key] && f.value.length<=120).map(f => [f.key,f])).values()];
  const en = supported.map(f => `${labels[f.key][1]}: ${f.value}`).join('; ');
  const ar = supported.map(f => `${labels[f.key][0]}: ${arabicValues.get(f.value.toLowerCase()) ?? f.value}`).join('؛ ');
  return {
    name_ar: name_ar || product_name,
    name_en: name_en || product_name,
    description_ar: `${brand}، مجموعة ${collection}. المرجع: ${external_id}.${ar ? ` ${ar}.` : ''}`,
    description_en: `${brand}, ${collection} collection. Reference: ${external_id}.${en ? ` ${en}.` : ''}`,
    translation_state: name_ar ? 'provided' : 'name_pending',
  };
}
