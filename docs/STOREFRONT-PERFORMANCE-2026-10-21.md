# Storefront performance checkpoint — 21 October 2026

## Measured cause and deployed changes

The active catalog contains 1,044 factual watch records and no product images. The listing retrieves 12 records per page rather than sending the whole catalog to the visitor. The measured indexed database query took 0.116ms in its administrative query plan; this does not measure the REST/network round trip.

The slow path was remote metadata and product reads before server-rendered HTML could finish. Independent reads were first parallelized and known curated brands no longer require another directory read per card. The brand page now obtains its product slice, exact count/page bounds, collections and public directory metadata in one read-only database function instead of three HTTP requests. Cards reuse that page's verified brand identity. Empty curated brand pages, unknown published brands, collection links and pagination remain supported.

The additive function is `SECURITY INVOKER`, `STABLE`, with an empty search path, active-only public data, an explicit public column projection, default page size 12 and maximum 48. Anonymous access uses the existing public-row policy. Internal candidates, source material and approval records are not returned. Application validation retains the existing media boundary. Errors are reported rather than converted into an empty successful response.

Existing performance repairs remain: anonymous public HTML cache capped at 60 seconds, build/URL partitioning, cookie/auth/search/API/error bypass, local font cache, editorial WebP cache and shorter hero transitions. APIs remain uncached for publication readback. Cache TTL is an upper bound on cached publication withdrawal delay; no stale-while-revalidate extension is implemented.

## Live observations

Deployed Worker version: `af346733-a8ed-4e26-9679-5b08355fc399`.
Registered migration: `20261021090207_jwleria_public_brand_page`.

Normal-TLS HTTP observations from the execution network after deployment:

| Route | Cache state | Response headers | HTML complete |
|---|---|---:|---:|
| Rolex brand | MISS | 1,514ms | 1,518ms |
| Same brand | HIT | 105ms | 105ms |
| Watches | MISS | 412ms | 414ms |
| Home | MISS | 1,072ms | 1,074ms |

The Rolex origin-render duration was 887ms in this run, versus 1,410ms in the preceding deployed revision's observation. These are separate observations, not a controlled geographic benchmark. Explicit cache-bypassing readbacks varied: Rolex 420–1,619ms, watches 368–889ms, home 381–939ms. Some first requests still exceed a second. Do not state that all cold visits or Saudi/mobile users now meet an accepted performance target.

The brand HTML contained 12 actual product cards, 14 collection links and correct pagination for 1,030 published Rolex references. The public count across all brands remains 1,044. Direct read-only RPC readback verified page clamping and empty/unknown results. The in-app browser rendered the brand page and the next page with distinct actual references. This is not a full browser LCP/INP measurement.

## Photo scale and release gate

Product photos are not published yet. Zero live media approvals and zero Storage buckets/objects were found in the owning project. Existing editorial art is not a same-product photo library. A bounded check found no SKU-bound permitted set in the verified project files; do not infer ownership from legacy camera filenames.

Before photo expansion, implement and verify responsive derivatives from permitted originals. Keep originals private; card images should use actual generated 320/640/960px derivatives with `srcset`/`sizes`, and detailed views should request their larger asset only when needed. Never construct guessed brand-CDN URLs or treat separate gallery angles as responsive variants.

Provisional image budgets to validate with real originals: about 80–150KB per normal card derivative, with a reviewed exception rather than destructive compression where details suffer; use WebP/AVIF only after visual comparison. Provide intrinsic dimensions, lazy-load off-screen images, prioritize only the visible lead image and use versioned CDN URLs/cache headers. Listing queries stay bounded at 12 records. These derivative budgets are an implementation/release requirement, not a claim that that pipeline is already live.

Next acceptance needs actual mobile/browser load and interaction measurements with approved photos at realistic catalog size. Continue reducing first-request latency if those measurements exceed the agreed budget. Do not publish the remaining prepared factual batches solely because parser tests passed.
