globalThis.process ??= {};
globalThis.process.env ??= {};
import { A as defineMiddleware, t as sequence } from "./chunks/sequence_BbEQ2mCv.mjs";
//#region src/server/public-cache.mjs
var FRESH_SECONDS = 60;
var MAX_REFRESHES = 16;
var ABANDONED_MS = 3e4;
var refreshing = /* @__PURE__ */ new Map();
var handled = /* @__PURE__ */ new WeakSet();
var route = /^\/(?:ar|en)\/(?:$|(?:brands|categories)\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?|catalog\/|about\/|products\/[a-z0-9]+(?:-[a-z0-9]+)*\/)$/;
function shareableRequest(request) {
	const url = new URL(request.url);
	if (request.method !== "GET" || !route.test(url.pathname) || request.headers.has("Authorization") || request.headers.has("Cookie")) return false;
	for (const [key, value] of url.searchParams) {
		if (url.searchParams.getAll(key).length !== 1) return false;
		if (key === "page" || key === "pageSize") {
			if (!/^[1-9]\d{0,4}$/.test(value)) return false;
		} else if ([
			"brand",
			"category",
			"collection"
		].includes(key)) {
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return false;
		} else return false;
	}
	return true;
}
function shareableResponse(response) {
	return response.status === 200 && /^text\/html(?:;|$)/i.test(response.headers.get("Content-Type") ?? "") && !response.headers.has("Set-Cookie") && !/(?:private|no-store|no-cache)/i.test(response.headers.get("Cache-Control") ?? "") && !response.headers.get("Vary")?.split(",").some((value) => !["accept-encoding"].includes(value.trim().toLowerCase()));
}
function stored(response, body, storedAt) {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", `public, max-age=600`);
	headers.set("X-JWL-Stored-At", String(storedAt));
	return new Response(body, {
		status: response.status,
		headers
	});
}
function outward(response, state, duration, age = 0) {
	const headers = new Headers(response.headers);
	headers.delete("X-JWL-Stored-At");
	headers.set("X-JWL-Cache", state);
	headers.set("Server-Timing", `page;dur=${duration};desc="${state}"`);
	headers.set("Cache-Control", "public, max-age=0, must-revalidate");
	if (state !== "MISS") headers.set("Age", String(age));
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
function refresh(key, next, { cache, waitUntil, now }) {
	const token = { at: now() };
	for (const [url, other] of refreshing) if (token.at - other.at >= ABANDONED_MS) refreshing.delete(url);
	if (refreshing.has(key.url) || refreshing.size >= MAX_REFRESHES) return;
	refreshing.set(key.url, token);
	waitUntil((async () => {
		const response = await next(), renderedAt = now();
		if (!shareableResponse(response)) {
			if (response.status >= 500) throw new Error(`status ${response.status}`);
			return cache.delete?.(key);
		}
		await cache.put(key, stored(response, await response.arrayBuffer(), renderedAt));
	})().catch((error) => console.warn(`Background page refresh failed for ${new URL(key.url).pathname}: ${error?.message ?? error}`)).finally(() => {
		if (refreshing.get(key.url) === token) refreshing.delete(key.url);
	}));
}
/**
* `scope` is an object unique to one visitor request that Astro passes to every render of it (its locals).
* @param {Request} request
* @param {() => Promise<Response>} next
* @param {{cache?: Pick<Cache, 'match' | 'put'> & Partial<Pick<Cache, 'delete'>>, waitUntil?: (task: Promise<unknown>) => void, build?: string, scope?: object, now?: () => number}} options
*/
async function publicPageResponse(request, next, { cache, waitUntil, build, scope, now = Date.now } = {}) {
	if (!cache || !build || !shareableRequest(request)) return next();
	if (scope) {
		if (handled.has(scope)) return next();
		handled.add(scope);
	}
	const start = now();
	const url = new URL(request.url);
	url.searchParams.sort();
	url.searchParams.set("__jwl_release", build);
	const key = new Request(url, { method: "GET" });
	let cached;
	try {
		cached = await cache.match(key);
	} catch {
		return next();
	}
	const storedAt = Number(cached?.headers.get("X-JWL-Stored-At"));
	const age = (now() - storedAt) / 1e3;
	if (storedAt > 0 && age >= 0) {
		if (age < FRESH_SECONDS) return outward(cached, "HIT", now() - start, Math.floor(age));
		if (waitUntil && age < 600) {
			refresh(key, next, {
				cache,
				waitUntil,
				now
			});
			return outward(cached, "STALE", now() - start, Math.floor(age));
		}
	}
	const response = await next();
	if (!shareableResponse(response)) return response;
	const write = cache.put(key, stored(response, response.clone().body, now())).catch(() => {});
	if (waitUntil) waitUntil(write);
	else await write;
	return outward(response, "MISS", now() - start);
}
//#endregion
//#region src/middleware.ts
var onRequest$1 = defineMiddleware(async (context, next) => {
	const storage = globalThis;
	const execution = context.locals;
	return publicPageResponse(context.request, next, {
		cache: storage.caches?.default,
		waitUntil: execution.cfContext?.waitUntil.bind(execution.cfContext),
		build: "mvr23mxj",
		scope: context.locals
	});
});
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
//#endregion
export { onRequest };
