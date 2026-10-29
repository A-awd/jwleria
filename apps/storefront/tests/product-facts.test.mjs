import test from 'node:test';
import assert from 'node:assert/strict';
import {productFacts, summaryFacts} from '../src/components/product-facts.mjs';

// Summaries in the exact public format scripts/catalog-intake/enrich.mjs writes (copied from published rows).
const jlc = {
  reference: 'Q3926480',
  summary: {ar: 'Jaeger-LeCoultre، مجموعة Reverso Tribute. المرجع: Q3926480. العيار: 847؛ آلية الحركة: تعبئة يدوية.', en: 'Jaeger-LeCoultre, Reverso Tribute collection. Reference: Q3926480. Calibre: 847; Movement: Manual winding.'},
  specs: [
    {kind: 'movement', label: {ar: 'آلية الحركة', en: 'Movement'}, value: {ar: 'تعبئة يدوية', en: 'Manual winding'}},
    {kind: 'calibre', label: {ar: 'العيار', en: 'Calibre'}, value: {ar: '847', en: '847'}, valueLang: 'en'},
  ],
};
const buckle = {
  reference: '2CF025_UQI_F0C4F',
  summary: {ar: 'Prada. المرجع: 2CF025_UQI_F0C4F. الحزام مرفق: لا؛ التشطيب: مطلي بالمينا؛ المادة: معدن.', en: 'Prada. Reference: 2CF025_UQI_F0C4F. Belt included: No; Finish: enameled; Material: metal.'},
  specs: [{kind: 'material', label: {ar: 'المادة', en: 'Material'}, value: {ar: 'metal', en: 'metal'}, valueLang: 'en'}],
};
const plain = (groups) => groups.map((g) => [g.key, g.facts.map((f) => `${f.label}: ${f.value}${f.lang ? ` [${f.lang}]` : ''}`)]);

test('a generated summary is not repeated: its facts appear once, grouped, from the specs', () => {
  for (const l of ['ar', 'en']) assert.equal(productFacts(l, jlc).intro, undefined, l);
  assert.deepEqual(plain(productFacts('en', jlc).groups), [['technical', ['Movement: Manual winding', 'Calibre: 847 [en]']]]);
  assert.deepEqual(plain(productFacts('ar', jlc).groups), [['technical', ['آلية الحركة: تعبئة يدوية', 'العيار: 847 [en]']]]);
});

test('a fact only the summary states is kept, in its own language; a fact a spec states is not shown twice', () => {
  assert.deepEqual(plain(productFacts('en', buckle).groups), [['design', ['Material: metal [en]', 'Belt included: No', 'Finish: enameled']]]);
  assert.deepEqual(plain(productFacts('ar', buckle).groups), [['design', ['المادة: metal [en]', 'الحزام مرفق: لا', 'التشطيب: مطلي بالمينا']]]);
  // Without specs (the exact fallback with no model rows) every summary fact is shown; untranslated Arabic-page values are marked English.
  const fallback = {...buckle, summary: {...buckle.summary, ar: 'Prada. المرجع: 2CF025_UQI_F0C4F. الحزام مرفق: لا؛ المادة: metal.'}, specs: []};
  assert.deepEqual(plain(productFacts('ar', fallback).groups), [['design', ['الحزام مرفق: لا', 'المادة: metal [en]']]]);
});

test('reviewed labels win, unknown kinds go to other details, and empty groups are omitted', () => {
  const product = {reference: 'X1', summary: {ar: 'Brand. المرجع: X1.', en: 'Brand. Reference: X1.'}, specs: [
    {kind: 'dial', label: {ar: 'x', en: 'x'}, value: {ar: 'أسود', en: 'Black'}},
    {kind: 'strap_width', label: {ar: 'عرض الحزام', en: 'Strap width'}, value: {ar: '20 مم', en: '20 mm'}},
  ]};
  const label = (kind, fallback) => ({dial: 'Dial'})[kind] ?? fallback.en;
  assert.deepEqual(plain(productFacts('en', product, label).groups), [['design', ['Dial: Black']], ['other', ['Strap width: 20 mm']]]);
  assert.deepEqual(summaryFacts('en', product), []);
});

test('a summary that is not generated from facts is kept as written, never parsed', () => {
  const prose = {reference: 'JWL-PREVIEW-001', summary: {ar: 'صورة اصطناعية للتجربة؛ ليست لقطعة تجارية.', en: 'A synthetic preview illustration.'}, specs: []};
  for (const l of ['ar', 'en']) assert.deepEqual(productFacts(l, prose), {intro: prose.summary[l], groups: []});
  // A summary naming another reference, or an unknown label, is not read as this product's facts.
  assert.equal(summaryFacts('en', {...jlc, reference: 'Q0000000'}), undefined);
  assert.equal(summaryFacts('en', {...jlc, summary: {en: 'JLC. Reference: Q3926480. Price: 1.'}}), undefined);
  // A value that contains the separator stays one value.
  assert.deepEqual(summaryFacts('en', {reference: 'R', summary: {en: 'B. Reference: R. Material: steel; gold; Movement: Automatic.'}}).map((f) => f.value), ['steel; gold', 'Automatic']);
});
