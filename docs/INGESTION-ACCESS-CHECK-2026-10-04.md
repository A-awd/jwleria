# Intake access check — 2026-10-04

## Verified result

Supabase account discovery succeeded. The intended Jwleria project was not
visible. A direct read-only SQL probe against the historical project reference
extracted from the approved canonical client configuration returned:
`You do not have permission to perform this action`.

Current access is insufficient for that project. Schema writes, candidate
upserts, storage upload/read/withdrawal and runtime credentials have not been
verified. Tool availability is not full authorization. No unrelated project
was queried or modified to manufacture a passing result.

Owner-approved OAuth now provides working official n8n MCP management access through a durable private SDK bridge. Creation, update, execution and result readback were tested. The catalog normalization and social preparation helper workflows passed cloud execution in the existing Jwleria folder. They are unpublished; no scheduled collection or automatic publication is running. Exact identifiers and OAuth material remain private.

The native CLI startup failure was resolved by the official TypeScript MCP SDK rather than repeating the failing binary. Supabase target access remains denied. No unrelated cloud project or workflow was modified, and no paid resources were created.

## Target pipeline

`permitted source → source-specific collector → normalization/deduplication → internal candidates → factual/image/rights checks → published catalog`

n8n schedules jobs, coordinates retries and records success/failure. A small
collector handles each verified source's actual format. Supabase stores brands,
collections, products and internal provenance/publication records; image files
go through controlled storage/delivery. No owner dashboard is required.

A Hostinger VPS is one possible host for n8n and longer browser jobs, not a
mandatory scraper service and not a way around blocked access. Choose hosting
only after verifying the intended n8n service, actual source requirements and
job execution with the local computer off. Existing Cloudflare compute remains
a candidate for small permitted API/feed jobs; no hosting change is activated.

Prefer authorized APIs/feeds/files. For HTML sources, independently check
terms, robots rules, access eligibility and media reuse before enabling a
collector. A 200 response or sitemap does not prove these permissions.
Respect source limits and conditional fetches. Stop on denied access/captcha;
honor Retry-After and bounded backoff for throttling. Do not enable proxy/IP
rotation or captcha bypass to evade a source's refusal. Use an approved feed,
licensed source or reviewed manual intake when automation is unavailable.

## Small live source preflight

One robots-file request per brand succeeded with HTTP 200:

| Brand | Source | Observed constraints | Publication eligibility |
| --- | --- | --- | --- |
| Rolex | https://www.rolex.com/robots.txt | Crawl-delay 2; several search/content/wishlist paths disallowed; sitemap declared | Not established |
| Cartier | https://www.cartier.com/robots.txt | API, account, checkout, search and other paths disallowed; sitemap declared | Not established |
| Louis Vuitton | https://eu.louisvuitton.com/robots.txt | Search/account and other paths disallowed; catalog/product/image sitemaps declared | Not established |

No bulk crawling, product import, image download or public publication occurred.
These are source-preflight results, not proof that product pages will be
accessible to an automated collector or that brand media can be reused.

## Prepared and next action

`scripts/catalog-intake/normalize.mjs` now validates minimal source exports,
omits monetary/private fields, preserves stable candidate identities,
deduplicates replays and rejects conflicting batch versions. It cannot publish
or grant its own media eligibility. Targeted checks use synthetic fixtures.

Resolve the intended Supabase project/organization. Official n8n MCP access is now working.
Prefer native n8n MCP with OAuth for management and an isolated Jwleria
workflow/credential boundary. Do not grant blanket account access or enable
automatic exposure of all new workflows just to fix tool loading.
On an authorized
development target, prove SQL read, schema migration, candidate insert/update
and storage write/read/withdrawal with disposable probes. Then run one permitted
real brand/collection/product pilot through the actual execution host, including
failure recovery. Do not claim full access until those specific checks pass.

## Official references

- [Supabase MCP tools and permissions](https://supabase.com/docs/guides/ai-tools/mcp)
- [n8n deployment choices](https://docs.n8n.io/choose-how-to-use-n8n)
- The directly fetched brand robots files linked in the table above.
