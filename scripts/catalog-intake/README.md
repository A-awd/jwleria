# Background catalog tools

The owner does not need a catalog dashboard. These tools are for agents and background jobs.

- `normalize.mjs`: allowlisted candidate facts, stable source/variant identity and revision hash, replay deduplication, conflict rejection. Never publishes.
- `extract.mjs`: JSON-LD facts without executing page scripts; requires source collection mapping and variant identity. Never imports offers/descriptions.
- `schema.sql`: minimal Postgres persistence, private source/history/media approval, public read-only catalog, withdrawal on changed/revoked approval. Not applied remotely; generate the environment migration with the Supabase CLI after selecting the target.
- `supabase.mjs`: actual ingestion/publication RPC client. Credentials come from server environment only. Publication requires the current candidate revision and the exact approved image URLs.
- `media.mjs`: permission-bound Storage staging, byte checksums and exact approved promotion. No unapproved media download.
- `social.mjs`: minimal factual drafts for Instagram, TikTok and Snapchat; no external posting or spend.
- `apps/storefront/src/server/collector.mjs`: permitted-source collection with robots checks/delay, bounded responses and explicit stop on access refusal/challenge/rate limit. No anti-bot bypass.

`node supabase.mjs ingest PRIVATE_INPUT.json` ingests original source records; `publish PRIVATE_REVIEW.json` publishes an approved projection. Private inputs and credentials must remain outside Git. Replaying ingestion is safe; it never publishes candidates automatically.

Targeted tests live in `normalize.test.mjs` and `apps/storefront/tests`. Postgres tests use local PGlite; they do not establish remote Supabase access.

Native n8n SDK workflow sources are under `workflows/n8n`. Both helper workflows passed actual cloud execution. OAuth bridge credentials remain in private local storage; no server key belongs in browser code, exports or Git. Automatic source scheduling and Supabase/Storage connection are still pending the accessible target and permitted source.
