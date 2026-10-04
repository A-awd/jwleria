# Jwleria catalog architecture

Date: 2026-10-03

Status: proposed; technical review completed, pending owner adoption. Public product behavior below is owner-confirmed. This document describes a target, not completed runtime work or deployment authorization.

## Public behavior

The public website is an open catalog: brand, collection, product name, clear actual product images and a WhatsApp contact button. No visitor or owner login, sign-up, account, portal, or administration-entry UI/routes appear on the public site. The owner rejected a separate product-management dashboard on 2026-10-04; no catalog console is part of this scope. Codex/Claude prepare catalog content and updates in the background. Development-environment access controls do not become public website features.

Jwleria is a luxury discovery catalog. Its directory can cover luxury brands and categories including jewelry, watches, bags, clothing, shoes, and accessories. Actual published coverage follows approved content and usage rights.

Public pages contain no prices. Price and availability are confirmed privately on inquiry. WhatsApp is the website's primary inquiry CTA. Private inquiries may continue in WhatsApp, Instagram, or TikTok; no channel transfer is required. Cart, checkout, customer accounts, and a customer portal are outside the initial release.

Proposed locale defaults are Arabic first plus English, with `/ar/` and `/en/` routes and correct RTL/LTR behavior; these are recommendations awaiting owner adoption. Brand names, logos, images, and wording follow their applicable permissions; directory inclusion does not imply affiliation or stock.

## Proposed components

- **Storefront:** Astro and TypeScript on Cloudflare Workers, with React islands for filters, galleries, and search. Render catalog HTML on demand; prerender stable editorial pages. Pin supported package versions after implementation compatibility checks.

- **Database:** one controlled managed PostgreSQL project, with separate `catalog_internal` and `catalog_public` schemas for reviewed records and published catalog data. Supabase Data API denies `anon` and `authenticated` access to restricted schemas. Browser components do not contain database clients. Any later private order-operation workstream is separate from this minimal catalog foundation.

- **Public data gateway:** a server-only read role through Hyperdrive with query caching disabled. Public views never join private operations. Separate database roles have connection limits and statement timeouts; these reduce shared load but do not provide physical database isolation.

- **Media:** private object storage behind a controlled media gateway. File hashes identify assets; they are not authorization. Publication and media reads enforce current grants and expiry.

- **Catalog updates:** controlled developer/importer tools and scripts with separate write roles. No owner-facing dashboard or separate administration application. Persist review, publication and withdrawal records internally; prepare changes through the existing working conversation and development workflow.

- **Background work:** Cloudflare Workers, durable intake queues where required, and a transactional database outbox for ordinary publication jobs. Intake durability does not depend on PostgreSQL availability. No additional database-resident worker platform is needed initially.

Existing identifiers and useful components are preserved through reviewed additive changes. Reclaiming an existing project or provisioning a replacement requires confirmed ownership and a separately approved environment decision. No new environment is provisioned by this proposal.

## Public contract

The initial contracts are implemented in `packages/contracts` and reviewed before presentation work depends on them:

| Interface | Response/behavior |
|---|---|
| `GET /api/catalog/brands` and `/categories` | Approved localized directory entries with stable IDs/slugs and optional permitted logos. |
| `GET /api/catalog/collections` | Published named collections linked to a brand, with stable IDs/slugs. |
| `GET /api/catalog/products` | Locale, brand/category filters, cursor pagination; at most 48 items. |
| `GET /api/catalog/products/{slug}` | Currently published product; unknown/unpublished entries return 404. |
| `GET /go/whatsapp` | Validated product reference and prefilled inquiry; no quote or amount. |

`PublicProduct` permits only stable identifiers/slugs, localized product names, brand/collection references, navigation category references and approved media references needed for the requested display and inquiry. Detailed matching references and other factual attributes remain internal. Arbitrary source metadata is excluded. Catalog schemas contain no monetary amounts; private quote versions belong to the separate operations workstream.

The serializer, search results, HTML, hydration data, structured data, OG output, and content exports use the same allowlist. Hiding a UI field is not a data-access boundary. Structured data contains no fabricated zero-price Offer or invented review.

PostgreSQL search starts with indexed Arabic/English normalization, curated aliases, and `pg_trgm`; display text remains unchanged. Add another search provider only after a measured acceptance failure.

## Content lifecycle and revocation

The initial release uses developer/agent-assisted curation and reviewed content batches, without requiring the owner to learn a product dashboard or enter pieces. Existing publication/production approvals remain in force. Future source and social adapters remain disabled until their permissions and contracts are independently verified. A reachable source, sitemap, or robots directive does not establish copying rights. No crawler is enabled by this architecture.

`candidate → reviewed revision → approved batch → published projection`

A copy revision records whether its wording is original or licensed and references its grant. Translation alone does not establish eligibility. Media grants distinguish channels, territories, edits, expiry, and revocation. Publication records retain revision, reviewer, target, and release references.

Fresh database reads enforce current publication/grant state. Public edge caches have a maximum 30-second lifetime, capped by grant expiry, and never serve stale content beyond that budget. A database failure fails closed after that budget. Test withdrawal across the controlled origin and CDN against a maximum 60-second revocation budget; do not promise removal of downloaded or externally uploaded copies.

Revocations form an append-only ledger with a separately preserved current revocation record. After a database restore, replay that latest record before traffic resumes; fail closed if its availability or currency cannot be established. An append-only ledger inside the restored database alone is insufficient. A content rollback cannot resurrect revoked material. External-platform removals require separate verified actions.

## Implementation ownership and acceptance

Use exclusive paths for parallel tasks: Codex owns contracts, server/data boundaries, middleware, deployment configuration, database work and background import/publication tools. Opus owns storefront pages, layouts, components, islands, styles, localization, synthetic public assets, UI tests, and UX documents. A requested change outside an agent's owned paths goes through the other owner. Repository path checks enforce this split.

Protected previews are `noindex`, use synthetic data, contain no brand imagery or tracking pixels, and never query an existing backend at runtime. Real content enters only after the first rights-cleared batch is approved.

Acceptance requires price-free direct/API/HTML responses; denied anonymous and ordinary authenticated database access; no public view joining operations; correct Arabic/English crawlable pages; duplicate-safe publication; grant expiry and revocation within the controlled cache budget; restore/rollback respecting revocations; and a 50,000-product synthetic catalog supporting paginated queries and individual updates without a whole-catalog rebuild.

Migration promotion and production activation remain separate gates. This proposed architecture does not resolve historical repository reconciliation or claim runtime security changes.

## Technical references

- [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

- [Cloudflare Workers Cache](https://developers.cloudflare.com/workers/cache/)

- [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/)

- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)

- [Google Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
