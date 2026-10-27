globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { i as inquiryChannel } from "./view_C9MmrhZz.mjs";
import { t as catalogMode } from "./catalog_COnrN2ql.mjs";
import { env } from "node:process";
//#region src/pages/robots.txt.ts
var robots_txt_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = () => {
	const origin = env.PUBLIC_SITE_ORIGIN || void 0;
	const configured = (env.PUBLIC_RELEASE || void 0) === "live" && catalogMode() === "live" && inquiryChannel().live && origin;
	if (configured) {
		const site = new URL(origin);
		if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash) throw new Error("Invalid site origin");
	}
	return new Response(configured ? "User-agent: *\nAllow: /\nDisallow: /ar/font-preview/\nDisallow: /en/font-preview/\nDisallow: /api/\n" : "User-agent: *\nDisallow: /\n", { headers: {
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "no-store"
	} });
};
//#endregion
//#region \0virtual:astro:page:src/pages/robots.txt@_@ts
var page = () => robots_txt_exports;
//#endregion
export { page };
