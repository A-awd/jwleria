globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { u as getProducts } from "./catalog_BC1CJrAP.mjs";
//#region src/pages/api/catalog.json.ts
var catalog_json_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url }) => {
	try {
		const params = url.searchParams;
		const page = await getProducts({
			brand: params.get("brand") ?? void 0,
			category: params.get("category") ?? void 0,
			collection: params.get("collection") ?? void 0,
			search: params.get("q") ?? void 0,
			page: Number(params.get("page")),
			pageSize: Number(params.get("pageSize"))
		});
		return new Response(JSON.stringify(page), { headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store"
		} });
	} catch {
		return new Response(JSON.stringify({ error: "catalog_unavailable" }), {
			status: 503,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Retry-After": "60",
				"Cache-Control": "no-store"
			}
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/catalog.json@_@ts
var page = () => catalog_json_exports;
//#endregion
export { page };
