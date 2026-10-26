# Background catalog tools

The owner does not need a catalog dashboard. These tools are for agents and background jobs.

- `normalize.mjs`: allowlisted candidate facts, stable source/variant identity and revision hash, replay deduplication, conflict rejection. Never publishes.
- `extract.mjs`: JSON-LD facts without executing page scripts; requires source collection mapping and variant identity. Keeps source descriptions privately and omits offers/prices.
- `enrich.mjs`: original concise Arabic/English summaries from collection/reference and structured technical facts. Source marketing copy is never the public description. Unknown terminology stays unchanged and missing Arabic product-name translation is explicit.
- `image-reference.mjs`: allowlisted origin, bounded HEAD checks without downloading image bytes. Reachability is separate from actual-image identity and media rights.
- `schema.sql`: fresh-install Postgres persistence, private source/history/media approval, public read-only catalog, withdrawal on changed/revoked approval. The foundation was applied remotely; `upgrade-enrichment.sql` upgrades that existing schema and must be applied before deploying the extended description adapter.
- `supabase.mjs`: actual ingestion/publication RPC client. Credentials come from server environment only. Publication requires the current candidate revision and the exact approved image URLs.
- `media.mjs`: permission-bound Storage staging, byte checksums and exact approved promotion. No unapproved media download.
- `social.mjs`: minimal factual drafts for Instagram, TikTok and Snapchat; no external posting or spend.
- `apps/storefront/src/server/collector.mjs`: permitted-source collection with robots checks/delay, bounded responses and explicit stop on access refusal/challenge/rate limit. No anti-bot bypass.

`node supabase.mjs ingest PRIVATE_INPUT.json` ingests original source records; `publish PRIVATE_REVIEW.json` publishes an approved projection. Private inputs and credentials must remain outside Git. Replaying ingestion is safe; it never publishes candidates automatically.

Targeted tests live in `normalize.test.mjs` and `apps/storefront/tests`. Postgres tests use local PGlite; they do not establish remote Supabase access.

Optional raw input fields: `source_description`, `facts` (`[{key,value,source_url?}]`), `name_ar`, `name_en`, `provenance` (`{method,language}`), and `image_reference_checks`. Supported summary fact labels: `material`, `diameter`, `dimensions`, `color`, `movement`, `calibre`, `water_resistance`, `finish`, `logo_material`, `compatible_strap_material`, `belt_included`, `strap_included`, `buckle_included`. Normalization regenerates descriptions from those facts rather than trusting supplied marketing copy. Originals, provenance and extraction completeness stay in private candidate content; only approved summaries enter public rows. Re-ingestion stays idempotent and does not grant image rights or publish products.

Run `node scripts/catalog-intake/build-n8n-normalizer.mjs` after normalizer/enrichment changes. It updates the SDK workflow source only; update and test the cloud helper separately. The existing cloud draft was updated on 2026-10-04 and its actual output for two privately held factual product inputs exactly matched the local importer. It remains unpublished and has no database or publication nodes.

Native n8n SDK workflow sources are under `workflows/n8n`. Both helper workflows passed actual cloud execution. OAuth bridge credentials remain in private local storage; no server key belongs in browser code, exports or Git. Automatic source scheduling and Supabase/Storage connection are still pending the accessible target and permitted source.


## Official Longchamp collection adapter

`extract-longchamp.mjs` matches a Product JSON-LD SKU against the official page's JSON data-layer variant and collection. It retains attributed specifications and only that exact SKU's gallery. It never executes site scripts or imports prices.

`collect-longchamp.mjs PRIVATE_INVENTORY.json PRIVATE_OUTPUT_DIRECTORY` collects a reviewed official-origin inventory with fresh robots checks, two-second-or-longer spacing, resume snapshots, and a stop on access refusal, rate limit, unreviewed redirect or challenge. Output must stay outside this tracked repository. URL discovery is not content validation; failed or incomplete records remain excluded. No image download, media license, publication or source approval is granted by running the collector.

The JLC movement fallback requires the same official URL SKU, the exact internal reference in the primary product details, and its labelled movement feature block. It recovers movement type and calibre only; navigation calibres and movement thickness never become case specifications. A retained exact-page recovery must preserve the current gallery/provenance and pass the current-revision and content-invariant guards before any private correction or factual publication.

## Concurrent per-origin queues and incremental intake (2026-10-26)

`source-queue.mjs PRIVATE_QUEUE_CONFIG.json` runs one queue per official origin, concurrently (default up to 8). Each origin keeps its own pacing (at least 2 seconds, the larger of config, database `min_interval_seconds` and robots crawl-delay), fresh robots, resumable private state, URL/identity deduplication and bounded transient retry with exponential backoff. One origin's stop never halts another:

- 401/403, a challenge page or repeated redirects → `blocked`; the origin is not contacted again until a reviewer copies the recorded `review_token` into `resume_after_review`.
- 429 → `rate_limited` with `not_before` = the later of Retry-After and a 15-minute minimum; later runs return `deferred` without a request.
- 5xx/network errors → retried up to `max_attempts` per run and `max_total_attempts` overall, then `failed: transient_exhausted`; consecutive failures pause an unhealthy origin.
- robots refusal, a single redirect, 404/410 or an extraction failure → explicit per-URL failure; nothing is followed or guessed.

Cartier, Van Cleef & Arpels, CELINE and RIMOWA are refused in code (`recordedSourceStops`); a config flag cannot restart them. A `registry` snapshot of `jwl_internal.sources` narrows (never widens) local permissions. State, journals and outputs must be outside this repository.

Each newly validated record is handed to `incremental.mjs` as soon as it is extracted. It compares it with a fresh `candidate_id → revision_hash` export (`select jsonb_object_agg(candidate_id,revision_hash) from jwl_internal.candidates`): `missing` records may be ingested, `unchanged` ones are skipped and `changed_requires_review` ones are written to `review-required.ndjson` and never overwritten, because guarded name repairs and live rows depend on the current revision. With `ingest_missing: true` and server credentials in the environment, missing records go in batches through `jwl_ingest_missing_batch`, which re-checks existence in the database. Publication readiness (facts, Arabic name, factual summary, approved category) is reported separately and still goes through the current-revision factual guard. Nothing is published and no image bytes are fetched by the queue.

## Exact authentic-media path

`media-pipeline.mjs` reports gallery binding (`reference_in_asset_url` only when the URL contains the exact reference between non-alphanumeric boundaries) and permission readiness. An official image URL is never permission. Supported grants are `written_permission` (rights holder or authorized distributor: source, media origins, website publication, resize and WebP encoding, private evidence reference) and `owner_original` (the owner's own photograph of one exact product with a declared reference). An `open_license` path is prepared but not active (below); restricted sources stay closed to downloads.

Order of operations, each bound to the exact candidate revision:

1. `acquireOriginal` (written permission, or the one Commons original an open-licence grant names: robots, refusal, redirect and type stops; untouched original preserved privately by SHA-256) or `keepOwnerOriginal` (no network).
2. `prepareGrantedMedia` → existing responsive helper (320/640/960 card sizes plus ≤1600 detail, lossless WebP, no crop or upscale). The source's own publication flag remains a separate owner decision and is never set by these tools.
3. `requireVerification`: a recorded visual check of that exact original — reference, colour/variant, authentic photo, not generated or altered, clear view. Code never creates a passing record.
4. `approvalBundle` re-checks the grant and returns exact content-addressed public URLs, one evidence row per file and the approval.
5. `recordMediaApproval` (`jwl_record_media_approval`) stores evidence and approval atomically **before any upload**; the database trigger re-checks every file's grant kind, original (owner original by checksum, or written permission for an exact gallery URL on a granted origin), reference and dimensions.
6. `uploadDerivatives` uploads the content-addressed files (immutable cache) and verifies any existing object byte-for-byte; `publish` then sends `image_variants`, and the database re-checks that the approval and grant are still live.

Revocation is final: revoking a grant revokes its approvals and withdraws the products at once; then delete the public files listed by `jwl_revoked_media_files()` with `deleteRevokedDerivatives`. A grant with an expiry date is refused until a scheduled expiry sweep is added in a reviewed change (`pg_cron` is available on the project but not installed). Written permission cannot be recorded for Cartier, Van Cleef & Arpels, CELINE or RIMOWA. `acquireOriginal` paces each media origin through a shared pacer, caches robots and stops an origin after a refusal or rate limit; its requests identify the client and its site (`JwleriaCatalog/1.0 (+https://jwleria.com)`), as Wikimedia's user-agent policy asks.

### Open-licence photos (prepared, not active)

Decision 0011 still rejects open licences and the applied database accepts only `owner_original` and `written_permission` grants, so no open-licence image can be recorded or published today. The path goes live only after, in order: the owner's recorded decision to accept open licences (amending 0011); the storefront showing the visible credit of every `attribution` entry wherever that image appears (see `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md`); and the approved application of `apps/storefront/supabase/proposed/jwleria_open_license_media.sql`. Its rollback (`.rollback.sql`) restores the applied definitions exactly and refuses while any open-licence grant or credit exists.

- An `open_license` grant names one Wikimedia Commons file for one exact candidate of a source that is not closed: an SPDX licence code from the allowlist (`CC0-1.0`, `CC-BY-4.0`/`3.0`/`2.0`, `CC-BY-SA-4.0`/`3.0`/`2.0`; never NC or ND; ported versions such as `by-sa/3.0/de` need a reviewed change) with its canonical deed URL, the `creator` as they ask to be credited, the reviewed credit line (`attribution_text`, naming the creator), the file page (`https://commons.wikimedia.org/wiki/File:…`), its untouched original (`https://upload.wikimedia.org/wikipedia/commons/x/xy/…`, the same file name in MediaWiki's hash directories; never a thumbnail, a local-wiki upload or a brand origin), the `owner_decision_reference` and the private licence-review `evidence_reference`. Cartier, Van Cleef & Arpels, CELINE, RIMOWA, Piaget and Panerai products stay closed.
- A licence tag on a file page is a claim to review, not proof. Before a grant is recorded, a reviewer confirms the uploader's authorship (or a free original source), that the photo shows the exact reference and colour/variant, and that nothing is presented as brand-affiliated. That review, not this code, decides the licence questions (for example ShareAlike and the older 2.0/3.0 terms); the code only records the technical changes.
- `media-run.mjs originals` takes exactly one original per open-licence grant. Derivatives are prepared as for every grant (320/640/960 plus ≤1600 detail, lossless WebP, no crop, enlargement or colour change), the recorded visual verification is still required, and `approvalBundle` adds `attribution` (`creator`, `license`, `license_url`, `source_url`, `changes`) to each entry. `changes` is `resized and converted to WebP`, or `converted to WebP` when no file is smaller than the original.
- The proposed trigger re-derives the credit from the grant and refuses an approval whose credit differs, whose evidence cites another file or whose grant names another product. A credit on any other grant kind is refused. Revoking the grant withdraws the product as for every grant.
- One grant covers one file and an approval cites one grant, so an open-licence product revision carries one approved photo in this smallest path.

Queue runners need the database registry (`jwl_source_registry()`, service role); the CLI loads it with server credentials from the environment, and a registry inside the local config is ignored. The `ingest-ready.ndjson` outbox is replayed until each record has a matching receipt, so a failed database call never loses records or stops collection.

Migration `20261026114541_jwleria_media_evidence_and_missing_intake.sql` adds the append-only `media_grants`/`media_assets` evidence tables, the approval and publication triggers, final revocation with cascade, the registry and revoked-file RPCs and the missing-only intake RPC. It creates no grant, asset, approval or publication. Status 2026-10-26: applied to production after explicit owner approval; registered version `20261026114541`, readback verified unchanged existing data (see STATE).
