# Official bag source adapters

`extract-bags.mjs` parses a single public Prada, Bottega Veneta or LOEWE product page without evaluating source scripts. It preserves actual variant references, private factual provenance and verified reference-to-image binding. Original brand descriptions remain private evidence; public summaries are produced by the shared factual enrichment. Media usage permission is never inferred from source accessibility.

`collect-bags.mjs` discovers the official sitemap roots advertised in fresh robots.txt, applies the exact robots rules to every request, and acquires the selected regional product inventory. It uses `JwleriaCatalog/1.0`, at least two seconds between requests per origin, the site's longer crawl delay when specified, a single same-origin product redirect, and immediate source stop on 401/403/429 or a detected challenge. It does not fetch image bytes, publish, write to a database, or create a schedule.

## Acquisition scope

- Prada: AE English product sitemap chunks; URLs naming bags, wallets, belts, luggage and leather accessories. Leather footwear is excluded. This keyword selection cannot prove every bag or every worldwide variant.
- Bottega Veneta: GB English variants from the advertised product/general chunks. The sitemap can contain old variants without usable image metadata; these remain incomplete.
- LOEWE: international English bags, wallets and small-leather-goods routes from advertised product chunks. Collection or explicit product-line metadata supplies the grouping; unrelated alternate-color images are rejected.

Each `inventory.json` states the scope, actual URLs, visited sitemap graph and discovery errors. `state.json` distinguishes discovered, processed, acquired, incomplete, blocked and paused work. `inventory_acquisition_complete` requires successful discovery and acquisition of every URL in that scope. `worldwide_brand_complete` is always false.

## Private execution

Keep configuration and all output outside Git. The JSON configuration requires `brand`, exact official `origin`, registered `source_id`, absolute `output_dir`, `acquisition_allowed: true` and an actual `permission_reference`. Optional `min_interval_seconds` cannot lower the two-second floor. Optional `max_sitemaps` limits discovery; `max_products` pauses after that many newly acquired records. The default acquires all discovered scoped URLs.

Run the module with the private configuration path as its only argument. Resume using the same configuration/output directory. A checkpoint from a blocked source makes no further requests and requires explicit source review. The collector rejects a live process lock, and recovers a stale lock only after the recorded process no longer exists.

To pause gracefully, create `pause.request` inside that source output directory. The collector saves its state after the current request and pauses before another product; remove that file before resuming. This is a per-source pause and does not interrupt another source. A hard process interruption also retains per-record files and processed checkpoints; interrupted in-flight requests can be retried on resume.

Private output:

- `records/<candidate_id>.json`: atomically saved raw factual input, normalized candidate and binding evidence.
- `source-records.ndjson`, `candidates.ndjson`, `evidence.ndjson`: atomic exports rebuilt at startup, every ten processed products and on completion or stop.
- `robots.txt`, `state.json`, `inventory.json`: actual policy and resumable coverage evidence.

Before database ingestion, re-normalize exports using the current shared normalizer and reconcile record counts to source checkpoints. Review unresolved facts and media permissions independently before publication. Do not equate reachable official image references with image reuse authorization.

## Verification

`extract-bags.test.mjs` uses synthetic source structures, not copied marketing or images. It verifies SKU/image binding, Bottega's displayed variant versus platform SKU, LOEWE literal parsing without script execution, explicit product-line fallback, mixed materials, foreign-origin exclusion, exclusion of footwear, conservative coverage, minimum spacing, stale-lock recovery, graceful pause, resumability and immediate refusal stop.
