/*
 * Shared variant behaviour for every direction, following the foundation
 * contract (docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md on
 * claude/admiring-dirac-nfavfx, 5c5099a). Load after catalog-data.js.
 *
 * - Options are exactly the existing variants (no Cartesian product).
 * - Choosing a value moves to the existing variant that keeps as many of the
 *   other selected values as possible; `changesFor` names what else changes.
 * - When several references share every known option value, they are offered
 *   as reference chips instead of invented labels.
 */
(function () {
  const data = window.JWL_PREVIEW;
  const JWL = window.JWL;

  // Rolex Datejust 41, model code 126334: 26 public references (2026-10-26).
  // Public facts name the dial only. References that share a dial differ by an
  // attribute that is not public (the foundation mapping uses the private
  // bracelet_type fact), so the preview offers them as reference chips.
  if (!data.models.some((m) => m.id === 'rolex-datejust-41-126334')) {
    data.models.splice(1, 0, {
      id: 'rolex-datejust-41-126334',
      brand: 'Rolex',
      category: 'watches',
      typeAr: 'ساعة',
      typeEn: 'Watch',
      nameAr: 'ديت جست 41',
      name: 'Datejust 41',
      collection: 'Datejust',
      axes: ['dial'],
      dials: [
        { id: 'd01', ar: 'أزرق لامع', en: 'Bright blue', tone: '#2b4f8a' },
        { id: 'd02', ar: 'أزرق لامع مرصّع بالألماس', en: 'Bright blue set with diamonds', tone: '#2b4f8a' },
        { id: 'd03', ar: 'أخضر نعناعي', en: 'Mint green', tone: '#9cc7b4' },
        { id: 'd04', ar: 'أخضر متدرّج', en: 'Green ombré', tone: '#2f5b44' },
        { id: 'd05', ar: 'فضي', en: 'Silver', tone: '#c9cbcd' },
        { id: 'd06', ar: 'أبيض', en: 'White', tone: '#eeeeea' },
        { id: 'd07', ar: 'أردوازي', en: 'Slate', tone: '#5d636a' },
        { id: 'd08', ar: 'أردوازي مرصّع بالألماس', en: 'Slate set with diamonds', tone: '#5d636a' },
        { id: 'd09', ar: 'أسود لامع', en: 'Bright black', tone: '#1d1d1f' },
        { id: 'd10', ar: 'أسود لامع مرصّع بالألماس', en: 'Bright black set with diamonds', tone: '#1d1d1f' },
      ],
      facts: [
        { ar: 'القطر', v: '41 mm' },
        { ar: 'المادة', v: 'White Rolesor — Oystersteel and white gold' },
        { ar: 'آلية الحركة', v: 'Perpetual, mechanical, self-winding' },
        { ar: 'مقاومة الماء', v: '100 m / 330 ft' },
      ],
      variants: [
        ['0001', 'd01'], ['0002', 'd01'], ['0003', 'd05'], ['0004', 'd05'], ['0005', 'd08'], ['0006', 'd08'],
        ['0009', 'd06'], ['0010', 'd06'], ['0011', 'd10'], ['0012', 'd10'], ['0013', 'd07'], ['0014', 'd07'],
        ['0015', 'd02'], ['0016', 'd02'], ['0017', 'd09'], ['0018', 'd09'], ['0021', 'd07'], ['0022', 'd07'],
        ['0027', 'd03'], ['0028', 'd03'], ['0033', 'd04'], ['0034', 'd04'], ['0035', 'd06'], ['0036', 'd06'],
        ['0037', 'd01'], ['0038', 'd01'],
      ].map(([n, dial]) => ({ ref: 'm126334-' + n, dial })),
      defaultRef: 'm126334-0001',
    });
  }

  const KIND = {
    size: { list: 'sizes', label: { ar: 'المقاس', en: 'Size' } },
    color: { list: 'colors', label: { ar: 'اللون', en: 'Colour' } },
    dial: { list: 'dials', label: { ar: 'الميناء', en: 'Dial' } },
  };

  const AR = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

  // Arabic number agreement: 1 / 2 / 3–10 / 11+.
  const NOUNS = {
    color: ['لون واحد', 'لونان', 'ألوان', 'لونًا'],
    size: ['مقاس واحد', 'مقاسان', 'مقاسات', 'مقاسًا'],
    dial: ['لون ميناء واحد', 'لونان للميناء', 'ألوان للميناء', 'لونًا للميناء'],
    ref: ['مرجع واحد', 'مرجعان', 'مراجع', 'مرجعًا'],
    model: ['طراز واحد', 'طرازان', 'طرازات', 'طرازًا'],
  };
  function countAr(n, noun) {
    const f = NOUNS[noun];
    if (n === 1) return f[0];
    if (n === 2) return f[1];
    if (n >= 3 && n <= 10) return AR(n) + ' ' + f[2];
    return AR(n) + ' ' + f[3];
  }

  // Ordered axes with only the values that some variant actually has.
  function axesOf(model) {
    return (model.axes || []).map((kind) => {
      const k = KIND[kind];
      const label = kind === 'color' && model.colorLabel ? model.colorLabel : kind === 'dial' && model.dialLabel ? model.dialLabel : k.label;
      const values = (model[k.list] || []).filter((val) => model.variants.some((v) => v[kind] === val.id));
      return { kind, label, values };
    }).filter((a) => a.values.length > 1 || (a.kind !== 'size'));
  }

  function valueOf(model, kind, id) {
    const k = KIND[kind];
    return k ? (model[k.list] || []).find((x) => x.id === id) : undefined;
  }

  // The existing variant for `kind = valueId` that keeps the most other values
  // of `current`; ties go to the earliest variant (lowest position).
  function nearest(model, current, kind, valueId) {
    const axes = (model.axes || []).filter((a) => a !== kind);
    let best = null;
    let bestScore = -1;
    for (const v of model.variants) {
      if (v[kind] !== valueId) continue;
      const score = axes.reduce((s, a) => s + (v[a] === current[a] ? 1 : 0), 0) + (v.ref === current.ref ? 0.5 : 0);
      if (score > bestScore) { best = v; bestScore = score; }
    }
    return best;
  }

  // What else changes if `kind = valueId` is chosen from `current`.
  function changesFor(model, current, kind, valueId) {
    const target = nearest(model, current, kind, valueId);
    if (!target) return [];
    return (model.axes || []).filter((a) => a !== kind && target[a] !== current[a]).map((a) => ({
      kind: a,
      label: (KIND[a] && KIND[a].label) || { ar: a, en: a },
      from: valueOf(model, a, current[a]),
      to: valueOf(model, a, target[a]),
    }));
  }

  // Short Arabic note for a value whose choice changes another attribute.
  function changeNoteAr(model, current, kind, valueId) {
    return changesFor(model, current, kind, valueId)
      .map((c) => 'يتغير ' + c.label.ar + ' إلى ' + (c.to ? c.to.ar : ''))
      .join('، ');
  }

  // References that share every known option value with `v` (incl. itself).
  function siblings(model, v) {
    const axes = model.axes || [];
    return model.variants.filter((x) => axes.every((a) => x[a] === v[a]));
  }

  function url(model, v) {
    return 'product.html?model=' + encodeURIComponent(model.id) + '&ref=' + encodeURIComponent(v.ref);
  }

  function primary(model) {
    return model.variants.find((v) => v.ref === model.defaultRef) || model.variants[0];
  }

  // Neutral card summary built only from real options, e.g. "٥ ألوان · مقاسان".
  function summaryAr(model) {
    const rank = { color: 0, dial: 0, size: 1 };
    const parts = axesOf(model).filter((a) => a.values.length > 1).sort((x, y) => rank[x.kind] - rank[y.kind]).map((a) => countAr(a.values.length, a.kind));
    if (model.variants.length > 1 && (parts.length === 0 || model.axes.includes('dial'))) parts.push(countAr(model.variants.length, 'ref'));
    return parts.join(' · ');
  }

  // Facts-only state: no approved photograph exists for this variant.
  // In the previews only Longchamp and LOEWE tints stand in for approved photos.
  function hasStandInImage(model) {
    return model.brand === 'Longchamp' || model.brand === 'LOEWE';
  }

  function counts(models) {
    const refs = models.reduce((n, m) => n + m.variants.length, 0);
    return { models: models.length, refs, label: countAr(models.length, 'model') + ' · ' + countAr(refs, 'ref') };
  }

  const baseTone = JWL.toneOf;
  function toneOf(model, v) {
    if (v && v.dial) { const d = valueOf(model, 'dial', v.dial); if (d) return d.tone; }
    return baseTone(model, v);
  }

  Object.assign(JWL, {
    toneOf,
    AR, countAr, axesOf, valueOf, nearest, changesFor, changeNoteAr, siblings, url, primary, summaryAr, hasStandInImage, counts,
  });
})();
