globalThis.process ??= {};
globalThis.process.env ??= {};
//#region src/components/variant-selection.mjs
var ORDER = [
	"dial",
	"bracelet",
	"bracelet_material",
	"colour",
	"color",
	"size",
	"ring_size",
	"bracelet_size",
	"bag_size",
	"case_size"
];
var rank = (kind) => (ORDER.indexOf(kind) + ORDER.length + 1) % (ORDER.length + 1);
/** Known option kinds first, in a stable display order; others alphabetically after them. */
function orderOptionKinds(items, kindOf = (item) => item.kind) {
	return [...items].sort((a, b) => rank(kindOf(a)) - rank(kindOf(b)) || kindOf(a).localeCompare(kindOf(b)));
}
/** @param {Variant} variant @param {string} kind */
var optionKey = (variant, kind) => variant.options.find((o) => o.kind === kind)?.key;
/** @param {Variant} variant */
var optionSignature = (variant) => variant.options.map((o) => `${o.kind}=${o.key}`).sort().join("|");
/** @typedef {{key: string, value: Text, valueLang?: 'en'}} Value valueLang 'en' marks a value kept in its English source text */
/** @param {import('../contracts/catalog').VariantOption} option @returns {Value} */
var valueOf = ({ key, value, valueLang }) => ({
	key,
	value,
	...valueLang ? { valueLang } : {}
});
/**
* Option kinds with at least two distinct real values, in the order the variants carry them.
* @param {Variant[]} variants ordered by position
* @returns {{kind: string, label: Text, values: Value[]}[]}
*/
function optionAxes(variants) {
	const axes = /* @__PURE__ */ new Map();
	for (const variant of variants) for (const option of variant.options) {
		if (!axes.has(option.kind)) axes.set(option.kind, {
			kind: option.kind,
			label: option.label,
			values: /* @__PURE__ */ new Map()
		});
		const values = axes.get(option.kind).values;
		if (!values.has(option.key)) values.set(option.key, valueOf(option));
	}
	return [...axes.values()].filter((a) => a.values.size > 1).map((a) => ({
		kind: a.kind,
		label: a.label,
		values: [...a.values.values()]
	}));
}
var better = (a, b) => {
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
	return false;
};
/**
* The existing variant with this value that keeps most of the current selection; ties prefer the
* earlier option kinds, then the lower position.
* @param {Variant[]} variants ordered by position
* @param {Variant} current
* @param {string} kind
* @param {string} key
* @returns {Variant | undefined}
*/
function closestVariant(variants, current, kind, key, axes = optionAxes(variants)) {
	let best, bestScore;
	for (const variant of variants) {
		if (optionKey(variant, kind) !== key) continue;
		const kept = axes.filter((a) => a.kind !== kind).map((a) => Number(optionKey(variant, a.kind) === optionKey(current, a.kind)));
		const score = [kept.reduce((sum, n) => sum + n, 0), ...kept];
		if (!best || better(score, bestScore)) {
			best = variant;
			bestScore = score;
		}
	}
	return best;
}
/**
* Selector state: each value links to one real variant and names every other option that changes with it.
* @param {Variant[]} variants ordered by position
* @param {Variant} selected
*/
function selectorAxes(variants, selected) {
	const axes = optionAxes(variants);
	return axes.map((axis) => {
		const currentKey = optionKey(selected, axis.kind);
		return {
			kind: axis.kind,
			label: axis.label,
			current: axis.values.find((v) => v.key === currentKey),
			values: axis.values.map((value) => {
				const target = value.key === currentKey ? selected : closestVariant(variants, selected, axis.kind, value.key, axes);
				const changes = axes.filter((a) => a.kind !== axis.kind && optionKey(target, a.kind) !== optionKey(selected, a.kind)).flatMap((a) => {
					const option = target.options.find((o) => o.kind === a.kind);
					return option ? [{
						kind: a.kind,
						label: a.label,
						...valueOf(option)
					}] : [];
				});
				return {
					...value,
					slug: target.slug,
					reference: target.reference,
					current: target === selected,
					changes
				};
			})
		};
	});
}
/** @param {import('../contracts/catalog').PublicProduct | undefined} product */
function singleModel(product) {
	if (!product) return void 0;
	const variant = {
		...product,
		options: [],
		specs: product.specs ?? [],
		position: 0,
		isPrimary: true
	};
	return {
		key: null,
		name: product.name,
		variants: [variant],
		selected: variant,
		primary: variant
	};
}
/**
* Orders the variants and resolves the addressed and primary ones. A grouping whose options cannot tell
* its variants apart is uncertain, so the addressed variant stays a model of its own.
* @param {string} key @param {Text} name @param {Variant[]} variants @param {string} slug
* @returns {import('../contracts/catalog').ProductModel | undefined}
*/
function assembleModel(key, name, variants, slug) {
	const ordered = [...variants].sort((a, b) => a.position - b.position || a.reference.localeCompare(b.reference));
	const selected = ordered.find((v) => v.slug === slug);
	if (!selected) return void 0;
	if (ordered.length > 1 && new Set(ordered.map(optionSignature)).size !== ordered.length) return singleModel(selected);
	const primaries = ordered.filter((v) => v.isPrimary);
	if (primaries.length > 1) throw new Error("Invalid product model primary");
	return {
		key,
		name,
		variants: ordered,
		selected,
		primary: primaries[0] ?? ordered[0]
	};
}
//#endregion
export { singleModel as i, orderOptionKinds as n, selectorAxes as r, assembleModel as t };
