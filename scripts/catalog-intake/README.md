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

Optional raw input fields: `source_description`, `facts` (`[{key,value,source_url?}]`), `name_ar`, `name_en`, `provenance` (`{method,language}`), and `image_reference_checks`. Supported summary fact labels: `material`, `diameter`, `dimensions`, `color`, `movement`, `water_resistance`. Normalization regenerates descriptions from those facts rather than trusting supplied marketing copy. Originals, provenance and extraction completeness stay in private candidate content; only approved summaries enter public rows. Re-ingestion stays idempotent and does not grant image rights or publish products.

Run `node scripts/catalog-intake/build-n8n-normalizer.mjs` after normalizer/enrichment changes. It updates the SDK workflow source only; update and test the cloud helper separately. The existing cloud draft was updated on 2026-10-04 and its actual output for two privately held factual product inputs exactly matched the local importer. It remains unpublished and has no database or publication nodes.

Native n8n SDK workflow sources are under `workflows/n8n`. Both helper workflows passed actual cloud execution. OAuth bridge credentials remain in private local storage; no server key belongs in browser code, exports or Git. Automatic source scheduling and Supabase/Storage connection are still pending the accessible target and permitted source.


## Official Longchamp collection adapter

`extract-longchamp.mjs` matches a Product JSON-LD SKU against the official page's JSON data-layer variant and collection. It retains attributed specifications and only that exact SKU's gallery. It never executes site scripts or imports prices.

`collect-longchamp.mjs PRIVATE_INVENTORY.json PRIVATE_OUTPUT_DIRECTORY` collects a reviewed official-origin inventory with fresh robots checks, two-second-or-longer spacing, resume snapshots, and a stop on access refusal, rate limit, unreviewed redirect or challenge. Output must stay outside this tracked repository. URL discovery is not content validation; failed or incomplete records remain excluded. No image download, media license, publication or source approval is granted by running the collector.
