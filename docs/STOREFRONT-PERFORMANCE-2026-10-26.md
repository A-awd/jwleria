# Storefront cache performance — 26 October 2026

Status: prepared and tested code on branch `wf/b1`. It is **not deployed**. Visitors on jwleria.com see none of this until an approved Worker deploy of a build that contains it. Every number in the lab sections is a **local lab** number from one machine, not a visitor measurement.

## What changes

The anonymous public HTML cache (decision 0009) gains a bounded stale-while-revalidate window. The shareability rules are unchanged: only `GET` of the listed public page routes, no `Cookie` or `Authorization`, only `page`/`pageSize`/`brand`/`category`/`collection` query parameters with valid values and no repeats, and only `200` `text/html` responses without `Set-Cookie`, `private`/`no-store`/`no-cache` or a `Vary` other than `Accept-Encoding`. Keys stay partitioned by locale, path, sorted query and build.

| Age of the stored copy | What the visitor receives | Upstream work |
|---|---|---|
| under 60 s | the copy, `X-JWL-Cache: HIT`, `Age` | none |
| 60 s to under 600 s, with `waitUntil` | the copy, `X-JWL-Cache: STALE`, `Age` | at most one background render per page key per isolate; at most 16 in flight per isolate |
| 60 s or more without `waitUntil`, or 600 s and over | a fresh render, `X-JWL-Cache: MISS` | in the foreground, as before |

- Freshness is computed only from `X-JWL-Stored-At` (a missing, invalid or future value is a miss). The stored copy carries `Cache-Control: public, max-age=600` so the Workers cache keeps it for the whole window. Browsers always get `Cache-Control: public, max-age=0, must-revalidate`, plus `Server-Timing: page;dur=…;desc="HIT|STALE|MISS"`; `Age` (whole seconds since the store time) is sent on `HIT` and `STALE`; `X-JWL-Stored-At` never leaves the Worker.
- A background refresh reads the whole body before it stores anything. A thrown render, a body that fails part-way, a `5xx` response or a failed cache write leaves the old copy exactly as it was (same store time, so the window is never extended) and is logged with the path only. No refresh can raise an unhandled rejection.
- A refresh that returns a redirect, `404` or any other non-shareable non-`5xx` response deletes the copy, so a withdrawn product stops being served from that colo once that refresh has finished. Until then the request that started the refresh and every request that arrives while it runs still receive the copy (see the bound below). The pages throw on upstream read failures (they do not turn them into `404`s), so an outage keeps the copy instead of deleting it.
- The in-flight table holds only page keys and start tokens, never a promise another request awaits. An entry is removed when its refresh settles. While 16 refreshes are in flight, further stale pages in that isolate are served from their copy without starting another render (still never past 600 s). Workers stop `waitUntil` work 30 s after the response; a refresh cut off there never settles, so an entry older than 30 s is dropped the next time any refresh starts, and only the refresh that owns an entry can clear it.
- Without `waitUntil` (for example the Node standalone build, which also has no `caches.default` and therefore no HTML cache at all) a stale copy is never served.

### Effect on decision 0009: withdrawal can stay visible for up to 600 s

Decision 0009 currently says a cached page shows withdrawn content for at most 60 s. With this change the bound is **600 s after the copy was stored, in each colo**, and it applies even when every refresh succeeds:

- The first request after the fresh minute is served the copy and only then starts the refresh. At low traffic, the case this change targets, that request is often minutes after the store time. For example, a copy stored at t0, a withdrawal at t0 + 10 s and the next visitor to that colo at t0 + 590 s: that visitor receives `STALE` with `Age: 590` and the withdrawn page, including any revoked image reference in its HTML. Only the refresh that request starts removes the copy.
- Every request that arrives while that refresh runs, and every stale request while the isolate's refresh table is full (16 in flight), also receives the copy. Each isolate keeps its own table, so each may serve the copy while its own refresh runs.
- A refresh that fails (thrown render, `5xx`, failed cache write) keeps the copy, and it can be served until the same bound.
- Measured from the withdrawal itself, add at most the duration of the render that produced the copy. Every read in the copy was made after that render started, and the store time is taken when it answers. The old 60 s bound worked the same way.
- A new deploy changes the build key, so it never reuses an older release's copy.

Proposed wording for decision 0009, to be recorded by whoever owns `decisions/` (this stream does not edit it): *"Anonymous public HTML is fresh for 60 seconds after it is stored. From 60 to under 600 seconds after that store time, a colo may serve the stored copy while one background render per page and isolate replaces it. Withdrawn content, or a page that still references a revoked image, can therefore be served from a cached page in each colo for up to 600 seconds after the copy was stored: to the stale request that starts the refresh, to requests that arrive while that refresh runs or while the refresh table is full, and whether or not the refresh succeeds. A refresh that finds the page withdrawn or redirected removes the copy; a failed refresh leaves it until the 600-second bound. A new deploy never reuses an earlier release's copy."*

**Merge and deploy stay gated on recording that bound in `decisions/0009-factual-publication-and-bounded-cache.md`.** If 600 s is too long for withdrawals or image revocations, the window is set by `STALE_SECONDS` (540 s, added to the 60 s fresh minute) in `public-cache.mjs`.

## Why a background `next()` is safe in Astro 7.3.5

Read from `node_modules/astro` 7.3.5 and `@astrojs/cloudflare` 14.3.3 (the pinned versions):

- `core/middleware/callMiddleware.js`: the `next` given to middleware is a closure that starts the route render and records that it was called. When the middleware returns a `Response`, Astro uses that value and neither awaits nor observes the promise from `next()`. The refresh promise therefore belongs to this module alone: it must handle its own failures, and on Workers it only survives inside `waitUntil`.
- `core/cache/memory-provider.js`: Astro's own stale-while-revalidate does the same thing one layer further out (around the middleware pipeline): it calls `next()`, attaches its own `.catch`, and returns the stale copy without waiting.
- `refresh()` calls `next()` synchronously, while this middleware is still running and before the stale copy is returned, so the render starts inside the normal pipeline with the same request, locals and route. Calling `next()` after the middleware had returned is not something Astro supports by contract, and this code never does it.
- What runs after the stale copy is returned (`core/routing/handler.js` `render()`): Astro attaches its cookie jar to the returned response, logs, runs `state.finalizeAll()` and `prepareResponse`. The background `handlePages` later resets response metadata and writes `state.response`, which Astro no longer reads for this request. `finalizeAll()` is a no-op here: sessions are disabled (`session: false`), no route cache provider is configured, and no page uses `Astro.cookies`, `Astro.session`, `Astro.cache` or `request.signal`. If any of that changes, this reasoning must be revisited.
- A page that throws in the background never reaches Astro's 500 handling (`render()` only awaits the stale response), so the rejection lands in this module's `catch` and the copy is kept. The lab outage run below confirms it under workerd.
- Astro's error render runs the middleware again for the same request. When a foreground render throws, `render()` calls the error handler with the same `Request` and its render options. `core/errors/default-handler.js` then builds a new `FetchState` from that `Request`, gives it the same `locals` object (with `cfContext`, so `waitUntil` is available) and runs `handleMiddleware` again for the error route. `render()` does the same for a `404` or `500` response that has no body. With no `src/pages/500.astro`, the error route here is `[locale]/index.astro` with locale `500`, which answers `404` plain text (see below). Without a guard, this sequence would delete a good copy: the main pass's cache lookup fails, so the page renders in the foreground and throws; in the error pass the lookup succeeds and finds a stale copy; that pass serves it and starts a refresh whose `next()` is the error route, and that `404` deletes the copy. The middleware therefore passes `context.locals` as the request scope. The first pass for a scope records it. Any later pass for the same scope bypasses the shared cache completely: nothing is served from it, refreshed or stored. `@astrojs/cloudflare` creates new `locals` for every request (`createLocals` in `utils/cf-helpers.js`), so ordinary requests are unaffected; the lab re-check below confirms `HIT`/`STALE` with the guard in place. One difference from base remains. If the main pass's lookup fails and the error pass would have found a copy under 60 s old, base served that copy. The error pass now returns Astro's error answer, the same one a request gets when no copy exists. That needs a cache failure followed by a page failure in the same request.
- `@astrojs/cloudflare` `utils/handler.js` and `utils/cf-helpers.js`: the execution context is exposed as `Astro.locals.cfContext`; the existing middleware already passes its bound `waitUntil` to the cache.

Also observed in the lab (pre-existing behaviour outside this stream's files; the visitor-facing answer is unchanged): when a page throws on a foreground miss, Astro renders its 500 path through the middleware again, and that pass now bypasses the cache as described above. With no `src/pages/500.astro`, `/500/` is matched by `[locale]/index.astro` with locale `500`, which answers `404 Not found` (plain text). A visitor who hits a cold miss during an upstream outage therefore gets a `404`, not a `500`. The cache never stores it (it is not `200` HTML, and the error pass bypasses the cache anyway). A `src/pages/500.astro` would be owned by the UI stream.

## Tests

`apps/storefront/tests/public-cache.test.mjs` (22 tests, Node test runner, a real `Response` store standing in for the remote cache service; like remote I/O, its calls settle on a later macrotask) covers: the fresh minute and its exact boundary; `STALE` with `Age`, `Server-Timing` and the browser `Cache-Control`; the refresh render starting before the stale copy is returned (checked before anything else is awaited, so a `next()` deferred behind an awaited cache call, a timer or a microtask fails it) and still running when it is; exactly one refresh per page while it runs; a page withdrawn right after its copy was stored still being served `STALE` at `Age: 599` and while its successful refresh runs, then removed; Astro's error render of the same request (same `locals`) bypassing the cache without serving, refreshing or deleting the copy, while the next request is served from it; the stored `max-age=600` and store-time freshness (missing, zero, invalid and future store times); build partitioning; failed refreshes (thrown render, body failing part-way, `503`, `500`, failed `put`/`delete`) keeping the copy and its store time and releasing the page; withdrawn, redirected and personalized refreshes deleting the copy; the 600 s bound; no `waitUntil` meaning no stale copy; the 16-entry bound; cut-off refreshes being dropped after 30 s; a late settle never clearing a newer refresh; every existing bypass and non-shareable response; no unhandled rejection.

## Lab method

- Runtime: `wrangler` 4.147.0 local workerd through `unstable_startWorker` on 127.0.0.1, Cloudflare build of each tree. No login, no deploy, no remote bindings. Every Worker subrequest goes through a local outbound handler: only the fictional mock origin is answered, everything else is refused and counted.
- Upstream: a mock PostgREST on 127.0.0.1 that answers the storefront's real request shapes with 60 fictional facts-only rows and **delays every request by an assumed 250 ms**. The 250 ms is an assumption chosen to be in the range implied by the live miss timings below; it is not a measured Supabase latency. Every storefront read named its own row bound; nothing fetches a whole catalog.
- Builds: `base` is commit `22b350c` (the 60 s cache). `change` is the cache code of commit `dd46571`. The later error-render guard changes nothing these steps exercise; it was re-checked separately (below). Product-page reads are owned by the UI stream and are identical in both trees.
- Cold miss: a fresh Worker per sample, warmed by `/ar/about/` (no catalog read), then one cold request; median of 5. "Round trips" groups upstream requests that start within half the injected delay of each other.
- Stale: one Worker per build; each page is primed and hit, the fresh minute passes, then the next request, the background reads it caused and the following request are recorded.
- Harness: `apps/storefront/scripts/perf-lab.mjs`. Build both trees with `pnpm build:cloudflare`, then from this tree `node scripts/perf-lab.mjs --base <base storefront dir> --stale --browser --out <file>`. `--browser` needs a locally installed Playwright with Chromium; it is not a project dependency.

## Lab results (local lab)

One run of the harness on 26 October 2026 with the cache code of commit `dd46571`; 250 ms injected per upstream request.

Re-check with the error-render guard (change build only, `--runs 1 --stale`, same day, same mock): the cache states and upstream request counts matched the tables below. Every cold page was a `MISS`, with 2, 2, 2, 1 and 3 upstream requests. Inside the minute every page was a `HIT`. After it, every page was `STALE` (`Age` 65–68) with 2, 1, 1, 1 and 2 background reads, then a `HIT` with `Age: 1`. The outage probe gave `STALE`, `STALE`, `STALE` after recovery, then `HIT` with `Age: 1`, with 2 failed upstream reads. Refused outbound requests and unbounded reads were both 0. A one-sample run gives no timing comparison, so its times are not reported.

### Cold miss (fresh isolate, median of 5)

| Page | Upstream requests / round trips | Base TTFB (range) | Change TTFB (range) | Base HTML complete | Change HTML complete |
|---|---:|---:|---:|---:|---:|
| home | 2 / 1 | 327 ms (293–341) | 291 ms (288–297) | 329 ms | 293 ms |
| catalog | 2 / 1 | 301 ms (291–305) | 312 ms (304–315) | 305 ms | 321 ms |
| category | 2 / 2 | 311 ms (292–311) | 308 ms (292–331) | 569 ms | 569 ms |
| brand | 1 / 1 | 289 ms (282–317) | 328 ms (301–353) | 290 ms | 329 ms |
| product | 3 / 3 | 828 ms (797–837) | 806 ms (797–844) | 832 ms | 807 ms |
| second product, same isolate | 2 / 2 | 547 ms | 538 ms | 554 ms | 541 ms |

### After the fresh minute (same isolate; the change's copy was 80–83 s old)

| Page | Hit TTFB inside the minute (base / change) | Base: next request after 61 s | Change: next request after 61 s | Upstream requests it caused (base / change) | Following request (base / change) |
|---|---:|---|---|---:|---|
| home | 11 / 11 ms | MISS 200, TTFB 289 ms, page 272 ms | STALE 200, TTFB 23 ms, Age 80, page 3 ms | 2 / 2 | HIT 17 ms / HIT 19 ms |
| catalog | 10 / 13 ms | MISS 200, TTFB 295 ms, page 264 ms | STALE 200, TTFB 21 ms, Age 81, page 2 ms | 1 / 1 | HIT 13 ms / HIT 13 ms |
| category | 13 / 14 ms | MISS 200, TTFB 322 ms, page 305 ms | STALE 200, TTFB 11 ms, Age 81, page 1 ms | 1 / 1 | HIT 10 ms / HIT 16 ms |
| brand | 12 / 9 ms | MISS 200, TTFB 275 ms, page 268 ms | STALE 200, TTFB 12 ms, Age 82, page 2 ms | 1 / 1 | HIT 11 ms / HIT 12 ms |
| product | 11 / 11 ms | MISS 200, TTFB 529 ms, page 519 ms | STALE 200, TTFB 17 ms, Age 83, page 1 ms | 2 / 2 | HIT 26 ms / HIT 17 ms |

### Upstream outage inside the window (`/en/catalog/?page=2`, every upstream read answers 503)

| Step | Base | Change |
|---|---|---|
| first request during the outage | no X-JWL-Cache 404, TTFB 315 ms | STALE 200, TTFB 23 ms, Age 83 |
| second request during the outage | no X-JWL-Cache 404, TTFB 287 ms | STALE 200, TTFB 13 ms, Age 85 |
| first request after recovery | MISS 200, TTFB 272 ms | STALE 200, TTFB 13 ms, Age 87 |
| following request | HIT 200, TTFB 17 ms, Age 1 | HIT 200, TTFB 14 ms, Age 1 |
| failed upstream reads during the outage | 2 | 2 |

### One mobile browser run (change build only)

Profile: Pixel 7, 4x CPU, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up. External requests blocked: 0.

| Visit | Cache | TTFB | FCP | LCP (element) | CLS | TBT | Longest tap event |
|---|---|---:|---:|---:|---:|---:|---:|
| home miss | MISS | 304 ms | 1032 ms | 3944 ms (IMG) | 0 | 26 ms | 176 ms |
| home hit | HIT | 42 ms | 756 ms | 3400 ms (IMG) | 0 | 207 ms | 128 ms |
| product miss | MISS | 544 ms | 1060 ms | 1060 ms (BLOCKQUOTE) | 0.0236 | 188 ms | 64 ms |
| home stale | STALE | 30 ms | 744 ms | 3500 ms (IMG) | 0 | 193 ms | 64 ms |

Refused outbound requests: 0. Unbounded upstream reads: 0.

Reading the tables:

- Cold misses are not faster and were not meant to be: the miss path is the same code in both builds (one cache lookup, then the render), so the differences between base and change medians are single-machine run-to-run variation. The product page waits for three sequential upstream round trips (two in a warm isolate, where the brand directory is held in memory for 60 s).
- After the fresh minute the base build re-renders in the foreground, so the visitor waits for the upstream round trips again. The change answers from the copy and the same upstream reads happen in the background; the following request is a `HIT` with `Age: 1`.
- During the outage the base build answers the `404` described above. The change keeps serving the copy; its `Age` keeps rising, which shows the failed refreshes neither replaced nor extended it. Each stale request made one failed read, because a failed refresh releases its page. After recovery the next stale request refreshes it and the one after is a `HIT` with `Age: 1`.
- The mobile run is one run on the change build. On the home page LCP is an image downloaded over the throttled link, so in a single run it does not follow TTFB. It is not field LCP or INP; the tap value is the longest Event Timing entry of one tap.

## Live observation (coordinator, not lab)

On 2026-10-26, from a US-east egress against the deployed site (60 s cache, before this change), consecutive requests landed on different Cloudflare colos (EWR and IAD) and both were cache `MISS`es with `Server-Timing` page 626–683 ms. Miss TTFB was 0.9–2.3 s; a same-colo hit was about 0.25–0.5 s. The Workers Cache API (`caches.default`) is local to each colo, so at low traffic many colos are cold and a 60 s copy usually expires before that colo's next visitor arrives. The stale window keeps each colo's copy usable for ten minutes, so a later visitor to the same colo inside that window gets hit-like latency while the colo refreshes in the background. It does not help the first visitor to a colo, and it does not shorten a miss.

## Smart Placement (owner decision; no configuration changed)

Smart Placement (`"placement": { "mode": "smart" }` in the Wrangler configuration) is a deploy-time option the owner may consider. When Cloudflare's analysis finds it faster, it runs the Worker near the back end (the Supabase region) instead of the visitor's colo, which shortens each upstream round trip on a miss; the product page currently waits for three sequential reads. The trade-off for this cache: the Cache API is local to wherever the Worker runs, so placed requests would share the placement location's cache instead of each visitor's colo. That concentrates the cache (fewer cold copies at low traffic), but every HTML request, hits included, would then cross from the visitor's colo to the placement location. Static files are served by Workers Static Assets and are not expected to move. Placement decisions also need enough traffic to be made. Check Cloudflare's current documentation and measure before and after if it is enabled; nothing in this branch enables it.

## Limits and next steps

- Lab numbers come from one machine, an assumed upstream delay and fictional facts-only rows. They show relative behaviour, not visitor experience, Saudi/mobile latency or LCP with real product photos.
- The change does not make cold misses faster. Cold-miss work belongs to the page reads (UI stream) and possibly placement.
- The in-flight bound is per isolate; several isolates in one colo may each refresh the same page once.
- Reaching visitors needs: the 600 s withdrawal bound recorded in decision 0009 (wording above) before merge, review, then an approved Worker deploy. After deploy, verify with `X-JWL-Cache`/`Age`/`Server-Timing` on a few same-colo requests more than 60 s apart.
