# Coverage and source registry

The Totals table, the brand counts, the source flags and the source-to-photo inventory come from the read-only aggregate read of 2026-10-29 10:07:44Z (observed live, interactive session; no write of any kind). The category breakdown and the model split (283 grouped, 2,603 singles) come from earlier reads (2026-10-27 18:08:50Z baseline and the 2026-10-28 mapping) and were not re-read. Historical baselines (7 migrations, zero media) appear only in dated `STATE.md` entries. Refresh this file from a new read; never edit counts by hand. Rows dated 2026-11-02 come from that day's read-only read (observed live).

## Current source requirements (owner, 2026-11-01)

- **Rejected:** wrist, lifestyle and amateur photographs (Commons included) as substitutes for a product photograph. The owner rejected the `m126200-0006` Commons square, and it is withdrawn from display.
- **Preferred:** the brand's official packshot of the exact reference and colour. Keep its existing alpha or white background as published: no remasking, retouching, generation or upscaling. Then place it on the decision 0022 white square, scaled down only.
- **Superseded by decision 0025 (owner, 2026-11-09):** there is no brand contact. Official exact-product images are used under the owner's direction, with a truthful provenance record that claims no brand licence. The access rules below still apply. The following historical rule no longer applies:
- **Rights gate (historical):** an official packshot is published only with the brand's express written permission for this display, recorded as a grant. Being reachable, carrying a logo or credit, or the owner accepting responsibility is not a licence. Without permission, official files are private reference only.
- **Access:** normal public requests within robots. No retries after a refusal or timeout, no proxies, no constructed asset URLs, and no automated Prada access (its terms exclude crawling).

## Totals

| Measure | Value |
|---|---|
| Registered migrations | 13 (last `20261101181522`; read 2026-11-02) |
| Active public catalog fact records | 4,097 (of 4,097 rows), of which exactly 1 carries a photograph and 4,096 are facts-only (read 2026-11-02) |
| Candidates | 4,150 (read 2026-11-02) |
| Public products with a photograph | 1 (read 2026-11-02): m126234-0015, one independent CC BY 2.0 photograph (Ajay Suresh), identity via creator-stated reference 126234; the full suffix -0015 is not a conclusive pixel read. The m126200-0006 photograph (decision 0016 batch 1) is withdrawn from display at the owner's request; its grant and approval are kept for the rollback |
| Media bucket objects | 15, 1,612,030 bytes (read 2026-11-02) |
| Media grants / approvals | 2 / 2, both open-licence and unrevoked; 15 media evidence rows (read 2026-11-02). Each grant names one file, and both files are already used, so no further photograph is publishable under an existing grant |
| Prepared privately, not publishable (2026-11-02) | 1 rights pending: Longchamp `10166HSR001` (Black), an exact-reference official packshot with native alpha, in the flat `#f0f0f0` square and the transparent form, gate 8 of 8. It has no written permission, and `publication_allowed=false`. 2 non-catalogue-bound: `10352HIU002` and `10327HJD514` have no catalogue row (`STATE.md`) |
| Model grouping | applied: 4,097 mapped variant rows in 2,579 displayed models since the size rebuild of 2026-11-01 (re-read 2026-11-02 18:53Z: unchanged, with 1 model photographed in 1 of its 56 variants, and 0 models with every variant photographed). 395 grouped models hold 1,913 variants, 196 of them size families holding 1,055, and 2,184 models are singles. The 2026-10-28 mapping had 2,886 models: 283 grouped holding 1,494 variants, and 2,603 singles |
| m126234-0015 | active, `approved_media` |

## Public facts by brand

| Brand | Active public products |
|---|---|
| Rolex | 1,465 |
| Prada | 851 |
| Van Cleef & Arpels | 498 |
| Cartier | 463 (of 515 candidates) |
| LOEWE | 407 |
| Longchamp | 390 (of 391 candidates) |
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

There are 12 official sources. All are enabled, and all have `publication_allowed=false`, so publication of each source's own media stays an owner decision (decision 0011). The flags below were read source by source on 2026-10-29.

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

The 2026-10-29 read confirms these flags directly: `acquisition_allowed=false` for Cartier and Van Cleef & Arpels only, `publication_allowed=false` and `enabled=true` for all twelve. (Earlier versions of this table inferred the "true" rows from the 2026-10-27 baseline.)

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

## Source-to-photo inventory (2026-10-29)

Four kinds of evidence, never interchangeable:

| Evidence | What it is | Count |
|---|---|---|
| Official image URL | a gallery URL stored with a candidate. It was never fetched as bytes and is never permission | 15,016 URLs across 4,150 candidates |
| Held original bytes | an untouched file kept privately by sha256 | 3 official Longchamp packshots, held for private evaluation only: 1 catalogue-bound (`10166HSR001`) and 2 without a catalogue row. Wikimedia Commons: the 7 earlier renditions (the m126234-0015 series, "Presentation Ready" and m126200-0006), the m126200-0006 original, and 4 candidates rejected on 2026-11-02, held as evidence. All private (updated 2026-11-02) |
| Approved exact-variant image | a grant, an identity check and an approval for one exact reference | 1: the m126234-0015 front photograph |
| Public photograph | published and visible on the site | 1 product (3 encodings) |

| Brand | Source status | Active public / candidates | Official image URLs | Galleries naming the exact reference | Format hint (URL text only) | Transparency | Media rights basis | Public photos |
|---|---|---|---|---|---|---|---|---|
| Rolex | open; sitemap refusal recorded (403, 2026-10-26) | 1,465 / 1,465 | 1,465 | 1,465 | `upright-c` packshot view, no extension | not established | none for official media; one open-licence grant (m126234-0015) | 1 |
| Prada | open | 851 / 851 | 4,676 | 851 | 4,493 `.jpg`, 183 `.png` | not established | none | 0 |
| Van Cleef & Arpels | closed (acquisition false, code stop) | 498 / 498 | 2,480 | 0 | 1,408 `.png`, 1,072 `.jpeg` | not established | none | 0 |
| Cartier | closed (acquisition false, code stop) | 463 / 515 | 515 | 0 | 271 `.png`, 244 `.jpeg` | not established | none | 0 |
| LOEWE | open | 407 / 407 | 3,850 | 407 | `.jpg` | not established | none | 0 |
| Longchamp | open | 390 / 391 | 1,968 | 372 (371 public) | `.png` | not established | none | 0 |
| Bottega Veneta | open | 8 / 8 | 30 | 8 | `.jpg` | not established | none | 0 |
| Audemars Piguet | open | 3 / 3 | 6 | 0 | requests `fmt=avif-alpha`, an alpha-capable format | not established | none | 0 |
| IWC Schaffhausen | open in the database; robots refusal recorded (403, 2026-10-26) | 3 / 3 | 12 | 0 | `.jpg` | not established | none | 0 |
| Jaeger-LeCoultre | open | 3 / 3 | 3 | 0 | `.jpg` | not established | none | 0 |
| Panerai | closed in code | 3 / 3 | 8 | 0 | `.jpeg` | not established | none | 0 |
| Piaget | closed in code | 3 / 3 | 3 | 0 | `.jpg` | not established | none | 0 |
| CELINE, RIMOWA | closed in code; not in the source registry | 0 | 0 | — | — | — | — | 0 |

- A gallery "names the exact reference" when every one of its URLs contains the reference between non-alphanumeric characters (the `galleryBinding` rule, evaluated on the stored URLs). This is identity evidence only. The other galleries came from the exact product page, but each of their files needs its own visual identity check.
- Format hints come from URL text alone. Every stored image check is `referenced`: no HTTP status, content type or byte was ever recorded for an official URL. A `.png` or an `avif-alpha` request does not prove a transparent background. Transparency can only be established from held bytes, once a rights basis allows holding them. So no brand is known to have already-transparent assets: that is unknown, not "no".
- Source-use evidence: no source has a media grant beyond the one open-licence grant, there is no written permission for any official media, and every source has `publication_allowed=false`. A visible official page is not publication permission.
- A private built-in image editor trial (2026-10-29) produced a transparent file from the licensed m126234-0015 photograph. It was rejected for product fidelity, because the product was redrawn. The automated cutout check refuses it independently. There is no accepted exact-product cutout input.

### Photo routes

No new acquisition request goes to a recorded stopped or closed origin.

The end-to-end bulk design, including the source-onboarding contract and the rollout stages, is in [BULK-ORIGINAL-IMAGES.md](../architecture/BULK-ORIGINAL-IMAGES.md) (proposed, 2026-11-02).

Longchamp's supply shape (observed live, 2026-11-02):
- 390 active variants in 136 models;
- 371 variants whose recorded gallery URLs all name the exact reference;
- 117 models where that holds for every variant.

That is enough for the proposed first milestone of 100 distinct models, once the decision 0025 owner-direction route is implemented (no brand contact).

Stage 0 (2026-11-08, private manifest, metadata only): 100 distinct models are selected, with 354 planned variants and 327 model-and-colour pairs. 19 variants are excluded as unbound. 0 files are held, approved or published.

1. **Open sources whose galleries name the exact reference** (Rolex 1,465, Prada 851, LOEWE 407, Longchamp 371, Bottega Veneta 8 public products). This is the shortest path to exact photographs. It needs three things:
   - the decision 0025 owner-direction provenance route, with no brand contact. This replaces the historical requirement for written permission from the brand;
   - that source's `publication_allowed` set through the reviewed decision 0025 migration;
   - the existing pipeline: originals, identity check, bundle, upload, publish.

   A Rolex `upright-c` packshot or a Longchamp PNG may already be transparent. That is checked on the held bytes, and an eligible transparent original needs no removal pass. Rolex's recorded sitemap refusal stays in force: a source review, under that permission, comes before any request to that origin.
2. **Open sources whose galleries do not name the reference** (Audemars Piguet, IWC, Jaeger-LeCoultre: 9 products). The same permission route applies, plus a visual identity check per file. IWC's robots stop stays until a source review.
3. **Closed sources** (Cartier 463, Van Cleef & Arpels 498, Piaget 3, Panerai 3; CELINE and RIMOWA have none). Nothing is acquired from these origins. These are access stops, not outreach. A photo can only come from the owner's own photograph, or from a source-access review together with a reviewed code change that lifts the stop. No brand is contacted (decision 0025).
4. **Open-licence photographs** (any brand except the six closed ones). Each needs an exact-match review per reference, an amendment of decision 0013 naming that reference, and a reviewed migration that widens `open_license_decisions()`.
   - **Bounded search, 2026-11-02:**
     - **Method:** Commons' robots file forbids its search and API paths (`/w/`, `Special:`) to every agent, so only allowed category pages were read: 12 requests (8 read, 3 not found, 1 lost to the scan's own false challenge check).
     - **Result:** no new exact-reference photograph.
     - **Rejected:** the 4 candidates that named a catalogue reference (126500LN, 126900, 126713GRNR, 124200), on look (display scenes, clipped bracelets), authorship (repeated tagging notices on the uploader's talk page, decision 0016) and identity (an unestablished suffix).
     - **Still in force:** the owner's 2026-11-01 rejection of amateur Commons photographs.
5. **The owner's own photographs** of exact pieces (`owner_original`). These work for any brand, but publication still needs the source's `publication_allowed` flag (an owner decision).
