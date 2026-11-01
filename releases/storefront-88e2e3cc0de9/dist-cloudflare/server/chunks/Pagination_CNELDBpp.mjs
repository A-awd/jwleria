globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, h as maybeRenderHead, m as renderTemplate } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
//#region src/components/Pagination.astro
createAstro("https://astro.build");
var $$Pagination = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Pagination;
	const { locale, result, url } = Astro.props;
	const link = (page) => {
		const next = new URL(url);
		next.searchParams.set("page", String(page));
		return `${next.pathname}${next.search}`;
	};
	return renderTemplate`${result.pages > 1 && renderTemplate`${maybeRenderHead($$result)}<nav class="pagination"${addAttribute(locale === "ar" ? "صفحات المنتجات" : "Product pages", "aria-label")}>${result.page > 1 && renderTemplate`<a class="btn" rel="prev"${addAttribute(link(result.page - 1), "href")}>${locale === "ar" ? "السابق" : "Previous"}</a>`}<span>${locale === "ar" ? `الصفحة ${result.page} من ${result.pages}` : `Page ${result.page} of ${result.pages}`}</span>${result.page < result.pages && renderTemplate`<a class="btn" rel="next"${addAttribute(link(result.page + 1), "href")}>${locale === "ar" ? "التالي" : "Next"}</a>`}</nav>`}`;
}, "/Users/Shared/jwleria/apps/storefront/src/components/Pagination.astro", void 0);
//#endregion
export { $$Pagination as t };
