// Option selection only ever moves between existing variants; no combination is constructed.
/** @typedef {import('../contracts/catalog').ProductVariant} Variant */
/** @typedef {import('../contracts/catalog').VariantLink} Link */
/** @typedef {import('../contracts/catalog').LocalizedText} Text */

/** The older jwl_product_model read returns at most this many variants of a model. */
export const MODEL_PAGE_VARIANTS = 60;
/** jwl_product_model_v2 lists every variant of a model as a link, up to this hard bound. */
export const MODEL_INDEX_VARIANTS = 2000;
/** Option kinds that are a size: a watch case diameter, a named bag or item size, or the maker's model size. */
export const SIZE_KINDS = ['case_size', 'bag_size', 'size', 'model_size'];

const ORDER = ['dial', 'bracelet', 'bracelet_material', 'colour', 'color', 'size', 'ring_size', 'bracelet_size', 'bag_size', 'case_size', 'model_size'];
const rank = kind => (ORDER.indexOf(kind) + ORDER.length + 1) % (ORDER.length + 1);

/** Known option kinds first, in a stable display order; others alphabetically after them. */
export function orderOptionKinds(items, kindOf = item => item.kind) {
  return [...items].sort((a, b) => rank(kindOf(a)) - rank(kindOf(b)) || kindOf(a).localeCompare(kindOf(b)));
}

/** @param {Link} variant @param {string} kind */
export const optionKey = (variant, kind) => variant.options.find(o => o.kind === kind)?.key;
/** @param {Link} variant */
export const optionSignature = variant => variant.options.map(o => `${o.kind}=${o.key}`).sort().join('|');

/** @typedef {{key: string, value: Text, valueLang?: 'en'}} Value valueLang 'en' marks a value kept in its English source text */
/** @param {import('../contracts/catalog').VariantOption} option @returns {Value} */
const valueOf = ({key, value, valueLang}) => ({key, value, ...(valueLang ? {valueLang} : {})});

/**
 * Option kinds with at least two distinct real values, in the order the variants carry them.
 * @param {Link[]} variants ordered by position
 * @returns {{kind: string, label: Text, values: Value[]}[]}
 */
export function optionAxes(variants) {
  const axes = new Map();
  for (const variant of variants) for (const option of variant.options) {
    if (!axes.has(option.kind)) axes.set(option.kind, {kind: option.kind, label: option.label, values: new Map()});
    const values = axes.get(option.kind).values;
    if (!values.has(option.key)) values.set(option.key, valueOf(option));
  }
  return [...axes.values()].filter(a => a.values.size > 1).map(a => ({kind: a.kind, label: a.label, values: [...a.values.values()]}));
}

const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };

/** The other options that differ between `target` and `selected`, as they read on `target`. */
const changedOptions = (axes, target, selected, kind) => axes.filter(a => a.kind !== kind && optionKey(target, a.kind) !== optionKey(selected, a.kind))
  .flatMap(a => { const option = target.options.find(o => o.kind === a.kind); return option ? [{kind: a.kind, label: a.label, ...valueOf(option)}] : []; });

/**
 * The existing variant with this value that keeps most of the current selection; ties prefer the
 * earlier option kinds, then the lower position.
 * @param {Link[]} variants ordered by position
 * @param {Link} current
 * @param {string} kind
 * @param {string} key
 * @returns {Variant | undefined}
 */
export function closestVariant(variants, current, kind, key, axes = optionAxes(variants)) {
  let best, bestScore;
  for (const variant of variants) {
    if (optionKey(variant, kind) !== key) continue;
    const kept = axes.filter(a => a.kind !== kind).map(a => Number(optionKey(variant, a.kind) === optionKey(current, a.kind)));
    const score = [kept.reduce((sum, n) => sum + n, 0), ...kept];
    if (!best || better(score, bestScore)) { best = variant; bestScore = score; }
  }
  return best;
}

/**
 * Selector state: each value links to one real variant and names every other option that changes with it.
 * @param {Link[]} variants ordered by position
 * @param {Link} selected
 */
export function selectorAxes(variants, selected) {
  const axes = optionAxes(variants);
  return axes.map(axis => {
    const currentKey = optionKey(selected, axis.kind);
    return {
      kind: axis.kind, label: axis.label,
      current: axis.values.find(v => v.key === currentKey),
      values: axis.values.map(value => {
        const target = value.key === currentKey ? selected : closestVariant(variants, selected, axis.kind, value.key, axes);
        return {...value, slug: target.slug, reference: target.reference, current: target === selected, changes: changedOptions(axes, target, selected, axis.kind)};
      }),
    };
  });
}

/**
 * The product page's option controls (owner direction, 2026-11-01). The size comes first and offers every real
 * size. Every other option offers as its choices only the values made at the selected size, each linked to the
 * existing variant at that size that keeps most of the current selection, so choosing one never changes the size.
 * Values made only in other sizes are kept apart, each with the sizes it is made in; each of those sizes is an
 * explicit link. Every link is an existing variant, and no combination is constructed.
 * @param {Link[]} variants ordered by position
 * @param {Link} selected
 */
export function configurator(variants, selected) {
  const axes = optionAxes(variants);
  const size = axes.find(a => SIZE_KINDS.includes(a.kind));
  const sizeKey = size && optionKey(selected, size.kind);
  const at = key => (size ? variants.filter(v => optionKey(v, size.kind) === key) : variants);
  const here = at(sizeKey);
  return [...(size ? [size] : []), ...axes.filter(a => a !== size)].map(axis => {
    const currentKey = optionKey(selected, axis.kind);
    const choice = (scope, value) => {
      const target = value.key === currentKey ? selected : closestVariant(scope, selected, axis.kind, value.key, axes);
      return {...value, slug: target.slug, reference: target.reference, current: target === selected, changes: changedOptions(axes, target, selected, axis.kind)};
    };
    const base = {kind: axis.kind, label: axis.label, size: axis === size, current: axis.values.find(v => v.key === currentKey)};
    if (axis === size) return {...base, values: axis.values.map(value => choice(variants, value)), elsewhere: []};
    const made = new Set(here.map(v => optionKey(v, axis.kind)));
    const values = axis.values.filter(v => made.has(v.key)).map(value => choice(here, value));
    const elsewhere = !size ? [] : axis.values.filter(v => !made.has(v.key)).map(value => ({
      ...value,
      sizes: size.values.flatMap(s => {
        const target = closestVariant(at(s.key), selected, axis.kind, value.key, axes);
        return target ? [{...s, slug: target.slug, reference: target.reference}] : [];
      }),
    })).filter(v => v.sizes.length);
    return {...base, values, elsewhere};
  });
}

/** The longest value, in characters, that one of n equal segments holds at phone width (390px). */
export const SEGMENT_TEXT = {2: 20, 3: 13, 4: 10, 5: 7};
/** Other options use segments only for this many values, and only when none is made in another size alone. */
export const SEGMENT_OPTIONS = 3;

/**
 * How a control is shown: 'segments' (one row of equal targets) for a few short values; 'list' (the current value,
 * opening a list) for long or numerous values or when some are made in other sizes; 'static' for an option with one
 * value here and none elsewhere.
 * @param {ReturnType<typeof configurator>[number]} control
 * @param {'ar' | 'en'} locale
 * @returns {'segments' | 'list' | 'static'}
 */
export function controlLayout(control, locale) {
  if (!control.size && control.values.length <= 1 && control.elsewhere.length === 0) return 'static';
  const count = control.values.length;
  const fits = control.size || (count <= SEGMENT_OPTIONS && control.elsewhere.length === 0);
  const longest = Math.max(0, ...control.values.map(v => [...(v.value[locale] ?? '')].length));
  return fits && longest <= (SEGMENT_TEXT[count] ?? 0) ? 'segments' : 'list';
}

/** @param {import('../contracts/catalog').PublicProduct | undefined} product */
export function singleModel(product) {
  if (!product) return undefined;
  const variant = {...product, options: [], specs: product.specs ?? [], position: 0, isPrimary: true};
  return {key: null, name: product.name, variants: [variant], selected: variant, primary: variant};
}

/**
 * Orders the variants and resolves the addressed and primary ones. A grouping whose options cannot tell
 * its variants apart is uncertain, so the addressed variant stays a model of its own.
 * @param {string} key @param {Text} name @param {Variant[]} variants @param {string} slug
 * @returns {import('../contracts/catalog').ProductModel | undefined}
 */
export function assembleModel(key, name, variants, slug) {
  const ordered = [...variants].sort((a, b) => a.position - b.position || a.reference.localeCompare(b.reference));
  const selected = ordered.find(v => v.slug === slug);
  if (!selected) return undefined;
  if (ordered.length > 1 && new Set(ordered.map(optionSignature)).size !== ordered.length) return singleModel(selected);
  const primaries = ordered.filter(v => v.isPrimary);
  if (primaries.length > 1) throw new Error('Invalid product model primary');
  return {key, name, variants: ordered, selected, primary: primaries[0] ?? ordered[0]};
}

/**
 * The model from every variant's link plus the addressed variant in full. The full variant replaces its own link,
 * so the selector compares one object. Indistinguishable options make the grouping uncertain, as above.
 * @param {string} key @param {Text} name @param {import('../contracts/catalog').VariantLink[]} links
 * @param {Variant} selected @returns {import('../contracts/catalog').ProductModel}
 */
export function assembleIndexedModel(key, name, links, selected) {
  const ordered = [...links].sort((a, b) => a.position - b.position || a.reference.localeCompare(b.reference));
  if (ordered.length > 1 && new Set(ordered.map(optionSignature)).size !== ordered.length) return singleModel(selected);
  const primaries = ordered.filter(v => v.isPrimary);
  if (primaries.length > 1) throw new Error('Invalid product model primary');
  const variants = ordered.map(v => (v.slug === selected.slug ? selected : v));
  return {key, name, variants, selected, primary: primaries[0] ?? variants[0]};
}

/**
 * The size table: one row per real size, each linked to the existing variant at that size that keeps most of the
 * current selection, naming any other option that changes with it. No combination is constructed.
 * @param {import('../contracts/catalog').ProductModel} model
 */
export function sizeTable(model) {
  const sizes = model.sizes ?? [];
  if (sizes.length < 2) return undefined;
  const axis = selectorAxes(model.variants, model.selected).find(a => SIZE_KINDS.includes(a.kind));
  if (!axis) return undefined;
  const rows = [];
  for (const size of sizes) {
    const value = axis.values.find(v => v.key === size.key);
    if (!value) return undefined;
    // The size's own value is in its first column; only the other facts that differ by size are repeated.
    const facts = size.facts.filter(f => f.value.en !== size.option.value.en);
    rows.push({...size, facts, slug: value.slug, reference: value.reference, current: value.current, changes: value.changes});
  }
  return {kind: axis.kind, label: axis.label, rows};
}
