# Execution spec — jwleria website

This spec turns the owner's brief into requirements that can be checked. It is sanitised for this public repository: it contains no provider identifiers, private bindings or raw instructions. The current state of each requirement is in [REQUIREMENTS-EVIDENCE-LEDGER.md](REQUIREMENTS-EVIDENCE-LEDGER.md). Decisions are cited by number (`decisions/00NN-*.md`).

## 1. Product definition

- **What it is:** a fast, phone-first, bilingual (Arabic first, English) showcase of luxury products and brands at jwleria.com. Each product page shows the exact piece, its reference and its factual details. Visitors ask about it on WhatsApp.
- **Who it is for:** a visitor on a phone who wants to see a specific piece and ask about it.
- **What it is not:** a shop. There are no prices, accounts or login, cart, checkout, currency or country selectors, CRM, owner admin or dashboard (decisions 0003, 0004, 0008). No new service is added.
- **Voice:** neutral and inquiry-only (decision 0005). The site does not present itself as a personal shopper or concierge. It does not imply that it holds stock or is affiliated with a brand. Arabic interface copy uses verbal nouns rather than gendered imperatives.
- **Identity:** the current visual identity stays until the owner selects a design direction: El Messiri for Arabic display (decision 0006) and the lighter palette (decision 0007).
- **Presentation:** listing cards show only the photograph (when a real one exists), its required credit, the brand and the name; product pages show every fact as grouped paragraphs (decision 0014). Real interactive 3D is deferred; product imagery is 2D (decision 0015).

## 2. Catalogue

- C1. Every public product is one exact catalogue reference (variant) from a registered official source. Its facts are bound to the candidate revision they came from.
- C2. Intake is missing-only and per origin: fresh robots, pacing of at least 2 s per origin, and a stop on 401, 403, 429 or a challenge (decision 0011). A refusal is recorded and never bypassed.
- C3. Facts may be published without media (decision 0009). That does not mean the catalogue is meant to stay without photographs.
- C4. A source breadcrumb is never promoted into a manufacturer collection (decision 0009, qualified grouping).
- C5. Coverage claims always name their denominator. Worldwide brand completeness is never claimed; the denominators are unknown (see [COVERAGE-AND-SOURCE-REGISTRY.md](COVERAGE-AND-SOURCE-REGISTRY.md)).

## 3. Models and variants

- M1. One card and one page per real model. A model page lists only variants that exist, and each option links only to a real variant ([contract](../WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md)).
- M2. Every existing variant URL stays valid. The canonical URL points to the model's primary variant.
- M3. Grouping needs linking evidence. A brand without that evidence stays one model per reference. No size or option is invented.
- M4. Until the models migration is applied, the storefront runs an exact fallback: one card per reference, with today's reads.

## 4. Media

- P1. Only genuine photographs of the exact reference are used. No sibling reference is substituted, nothing is generated, altered or upscaled, and no image is cropped. The one exception is background-only removal under P8 (decision 0015).
- P2. Every image needs a recorded rights basis: an owner original, written permission for its exact origin, or an open licence under decision 0013. An official image URL is never permission (decision 0011).
- P3. Open-licence images show a visible credit wherever they appear: the creator, the work's title when its author supplied one, the licence linked to its deed, the source page and the changes made. They are never described as official brand photography.
- P4. Identity is recorded per file, against its exact sha256, by an independent visual review, or by the creator-stated-reference route of decision 0013 with `exact_reference` kept `"uncertain"`.
- P5. Delivery uses responsive lossy WebP at 320, 640 and 960 px, plus a detail size of at most 1600 px. Each file has a byte budget (150,000 B for card sizes, 600,000 B for a detail-only file) and must reach luma SSIM 0.97 or more. Any exception needs an independent reviewed record (decision 0009 addendum).
- P6. On phones, product photographs are shown whole inside the 4:5 frame (`object-fit: contain` for approved responsive images only). Editorial imagery keeps its art direction.
- P7. On a takedown request, revoking the grant withdraws the product at once, and its public files are deleted.
- P8. Cutouts (decision 0015). An exact-product cutout is preferred, shown over the current product frame colour with no new background. An original that is already transparent and eligible needs no removal pass. Otherwise a cutout master must pass `scripts/catalog-intake/cutout.mjs`: an 8-bit RGBA PNG with the original's upright geometry and colour profile, opaque pixels equal to the original's stored values within 2 per channel, at least 2% transparent and 2% opaque pixels, and no visible pixel on the canvas edge. It also needs an independent visual comparison (background only, whole product, clean edges, nothing redrawn) and a rights basis that covers the adaptation. Derivatives record the untouched original's sha256 and the master's, keep alpha losslessly, and measure fidelity flattened on the frame colour. Their credit states the removal. Recording a cutout needs a reviewed change to the database evidence and credit text, plus the storefront's Arabic for that text; until then the pipeline refuses it.

## 5. Delivery and runtime

- D1. The storefront is an Astro server build on the existing Cloudflare Worker. It reads the catalogue through PostgREST with a publishable key, under RLS and security-invoker functions.
- D2. Releases are immutable, checksummed packages (`releases/`), uploaded by the operator with the upload-only command. A package records its source commit; Cloudflare version IDs stay private.
- D3. The public projection validates every field it renders. An unknown key in image metadata is a hard error, not a dropped image: it fails the product page and every catalogue, brand or home listing that includes the product, because listings map rows without per-row recovery. A credit field must therefore be supported by the live Worker before any row carries it (runbook RL-3).

## 6. Performance

- F1. Phone first: no horizontal overflow at 360, 390 and 430 CSS px, CLS 0 on product and catalogue pages, and tap targets of at least 44 px for primary actions.
- F2. Cards request at most a 960 px derivative. Images declare width and height, so the layout does not shift.
- F3. Independent public reads run concurrently. Known brand identity needs no extra request per card (decision 0009).
- F4. Lab numbers are labelled as lab numbers. Field LCP and INP are not claimed from a single lab run.

## 7. Cache

- K1. Only anonymous, approved public HTML is cached: fresh for 60 s, then served stale for under 600 s while one background refresh per page and isolate replaces it (decision 0009). Search, API, error and personalised responses are not cached.
- K2. Each response is labelled `X-JWL-Cache: MISS`, `HIT` or `STALE`. A claim about cache behaviour names the label that was observed. `HIT` and `STALE` are not claimed from a `MISS`.
- K3. Each build embeds a release key in the cache key, so a new deploy never serves an older release's cached page.
- K4. Withdrawn content can stay visible in a colo's stale copy for up to 600 s. Media takedowns allow for this window.

## 8. Security and public boundary

- S1. Browser code holds only publishable keys. Service-role access stays server-side or in the operator's tools.
- S2. Migrations are additive and reviewed. Each has a rollback and PGlite tests. An applied migration is never replayed; `20261026114541` stays applied once.
- S3. Nothing private enters Git: no secrets, project refs, provider or version IDs, private artifact or session links, raw prompts, private source bindings or original image files.
- S4. Restricted sources stay closed in code until a reviewed change lifts the stop.

## 9. Release

- R1. Outside a live release, every page is `noindex, nofollow` and robots returns `Disallow: /`. A live release (`PUBLIC_RELEASE=live`) fails the build without a verified WhatsApp number.
- R2. Order of operations: the database change, if any, then build, then the operator's upload, then a phone-width smoke check, then a recorded result. See [RELEASE-AND-ROLLBACK.md](../operations/RELEASE-AND-ROLLBACK.md).
- R3. Photographs show publicly only after all of these: the open-licence migration is applied, the bucket and upload function exist, grants, evidence and approvals are recorded, and a Worker is deployed that renders the credits, including the title.
- R4. A release is reported only with its evidence label. A deploy is not visitor-verified until it has been seen at a phone width.
