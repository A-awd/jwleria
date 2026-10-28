# Coverage and source registry

The Totals table comes from the read-only reads of 2026-10-28 after publication (observed live, interactive session). The brand and category breakdowns come from the 2026-10-27 18:08:50Z baseline; publishing one image changed none of their facts counts. Historical baselines (7 migrations, zero media) appear only in dated `STATE.md` entries. Refresh this file from a new read; never edit counts by hand.

## Totals

| Measure | Value |
|---|---|
| Registered migrations | 9 (last `20261028111829`) |
| Active public catalog fact records | 4,097, of which exactly 1 carries a photograph |
| Candidates | 4,150 (2026-10-27 baseline) |
| Public products with a photograph | 1: m126234-0015, one independent CC BY 2.0 photograph (Ajay Suresh), identity via creator-stated reference 126234; the full suffix -0015 is not a conclusive pixel read |
| Media bucket objects | 3 (320, 640 and 960 px encodings of that one photograph) |
| Media grants / approvals | 1 / 1 |
| Model grouping | applied: 4,097 variant rows, 2,886 displayed models (283 grouped holding 1,494 variants; 2,603 singles) |
| m126234-0015 | active, `approved_media` |

## Public facts by brand

| Brand | Active public products |
|---|---|
| Rolex | 1,465 |
| Prada | 851 |
| Van Cleef & Arpels | 498 |
| Cartier | 463 |
| LOEWE | 407 |
| Longchamp | 390 |
| Bottega Veneta | 8 |
| Audemars Piguet | 3 |
| IWC Schaffhausen | 3 |
| Jaeger-LeCoultre | 3 |
| Panerai | 3 |
| Piaget | 3 |
| **Total** | **4,097** |

Media public: Rolex 1 (m126234-0015); every other brand 0. Broader product photography is not delivered.

## Public facts by category

| Category | Active public products |
|---|---|
| Watches | 1,774 |
| Handbags | 1,174 |
| Bracelets | 384 |
| Leather goods | 323 |
| Jewellery | 283 |
| Accessories | 109 |
| Luggage | 28 |
| Shoes | 22 |
| **Total** | **4,097** |

## Denominators

Each brand's worldwide total of references is **unknown**. These counts are what was acquired within each source's reviewed scope. They are not a share of the brand's catalogue, and no coverage percentage is claimed.

## Sources

There are 12 official sources. All are enabled, and all have `publication_allowed=false`, so publication of each source's own media stays an owner decision (decision 0011).

| Source | `acquisition_allowed` (database) | Code status | Notes |
|---|---|---|---|
| rolex-official | true | open | the sitemap returned 403 on 2026-10-26 and is recorded as a source refusal; no reviewed sitemap |
| iwc-schaffhausen-official | true | open | robots returned 403 on 2026-10-26 and is recorded as a source refusal |
| audemars-piguet-official | true | open | |
| jaeger-lecoultre-official | true | open | |
| prada-official | true | open | AE English product sitemap scope |
| bottega-veneta-official | true | open | GB English scope; old variants may lack image metadata |
| loewe-official | true | open | international English scope |
| longchamp-official | true | open | |
| cartier-official | **false** | closed: `acquisition_permission_restricted` | |
| van-cleef-and-arpels-official | **false** | closed: `acquisition_permission_restricted` | |
| piaget-official | true | **closed in code**: `acquisition_permission_restricted` | the published terms forbid automated access without prior written approval (read 2026-10-26) |
| panerai-official | true | **closed in code**: `acquisition_permission_restricted` | the same terms text |

The baseline does not list the database flags source by source. It reports only that `acquisition_allowed=false` for Cartier and Van Cleef & Arpels, and true for Piaget and Panerai. The rows marked "true" above are inferred from that statement.

### Closed lanes

The code stops these whatever the database flags say (`recordedSourceStops` in `scripts/catalog-intake/intake-core.mjs`). Lifting one needs an owner decision and a reviewed code change.

| Source | Reason recorded in code |
|---|---|
| Cartier | `acquisition_permission_restricted` |
| Van Cleef & Arpels | `acquisition_permission_restricted` |
| CELINE | `source_challenge_recorded` |
| RIMOWA | `robots_refusal_recorded` |
| Piaget | `acquisition_permission_restricted` |
| Panerai | `acquisition_permission_restricted` |

The open-licence grant constraint refuses these six sources as well.

## Pacing rules

- At least 2 s between requests to one origin. The site's own longer crawl delay applies when it states one, and configuration can raise the interval but never lower it.
- HTTP 429, or any `Retry-After`: the origin pauses until the later of `Retry-After` and 15 minutes. It is never retried through.
- 401, 403 or a detected challenge: the origin stops and needs a source review before any further request.
- Media origins (Wikimedia Commons included) follow the same pacer, with robots checked first and one request per held file.
