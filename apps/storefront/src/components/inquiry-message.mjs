// Letters and digits only: case, Latin accents, Arabic diacritics/tatweel, alef/yaa variants and Arabic-Indic digits fold together.
const fold = value => String(value ?? '').normalize('NFKD').replace(/[\p{M}\u0640]/gu, '').toLowerCase()
 .replace(/ٱ/g, 'ا').replace(/ى/g, 'ي').replace(/[٠-٩۰-۹]/g, d => String(d.charCodeAt(0) & 15))
 .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * The brand an inquiry should name: empty when unknown, or when the localized name already contains it as
 * whole words (an Arabic name without the Latin brand still gets it).
 * @param {string | undefined} brand
 * @param {string} name
 */
export function inquiryBrand(brand, name) {
 const b = typeof brand === 'string' ? brand.trim() : '', key = fold(b);
 return key && !` ${fold(name)} `.includes(` ${key} `) ? b : '';
}

/** @param {string} name @param {string | undefined} brand */
export function withBrand(name, brand) {
 const b = inquiryBrand(brand, name);
 return b ? `${b} — ${name}` : name;
}

/** Attach the actual public product link without accepting arbitrary paths or destinations. */
export function productInquiryMessage(message,origin,locale,slug){
 if(!['ar','en'].includes(locale)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Invalid inquiry product identity');
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('Invalid public inquiry origin');
 return `${message}\n${new URL(`/${locale}/products/${slug}/`,base).href}`;
}
