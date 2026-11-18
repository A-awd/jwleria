# 0027 — Official originals when a cutout fails, in-use photographs and the official page link

Status: accepted (owner, 2026-11-18, Asia/Riyadh). It extends decisions 0025 and 0026 and keeps every limit they retain.

## Owner direction

- When a product's background-only cutout fails its check or is rejected, publish the exact, complete official original instead, and improve the background later. Do not hold the product for repeated mask repair.
- Work breadth first: other brands do not wait for the whole LOEWE cohort.
- A product page links to the brand's own page for the exact selected product, so a visitor can compare.
- The gallery may add official photographs of the same exact product, colour and material in use: worn, carried or on a person.
- Implement now, with no new owner approval, test programme, extra agent or paid tool.

## Rules

**Primary photograph**
- Use the independently accepted flat tile when one is held.
- Otherwise use the exact official original through the untreated path (`prepareResponsiveMedia` without a treatment):
  - no crop, no enlargement, no colour change;
  - widths are capped at the file's own width;
  - the background stays as photographed.
- This overrides older wording that required one shared background for every product photograph (decisions 0015, 0022 and 0023) whenever no accepted cutout or tile exists.

**One review**
- The independent reviewer (Codex) sees each product's exact final files once, on one combined sheet: the original and every derivative, and the cutout, alpha and tile where a tile is offered.
- The review accepts exact hashes and chooses tile or original. Code never fills a decision.
- A file over its byte budget needs the reviewer's exception record for that exact file. The fidelity floor is never waived.

**Resolution**
- Nothing is upscaled.
- Low-resolution tile holds stay held: the 653 px product-extent floor is not lowered, and an original is not used to bypass it.

**In-use photographs**
- At most two per product at first.
- Only files the same exact variant's own saved official gallery declares.
- Each is checked by looking at the actual image. A detail close-up is not an in-use photograph and is never labelled as one.
- Shown whole: never cut out, regenerated or borrowed from another colour.
- The approval lists the primary first, unchanged, then the in-use photographs. The existing presentation replacement records it at the same revision, and only new files are uploaded.

**Official page link**
- Labels: "عرض المنتج على موقع العلامة" and "View on the brand’s website".
- Opens in a new tab with `rel="noopener noreferrer"` and follows the selected variant.
- Shown only when the database projects a verified page. The page must be the candidate's own `source_url`, https, on the source's registered origin, with no query, fragment, credentials or port, and a path that names the exact reference.
- Never a guessed or home page, never tracking.

**Sources**
- Owner direction under decision 0025, with no brand contact and no licence claimed.
- Each source gets a narrow owner-direction grant naming only its observed media origins.
- Every acquisition gets one fresh robots read per origin, kept raw, with registry pacing.
- A refusal, challenge, rate limit or timeout stops that origin for the run; refused URLs are never replayed.
- No proxy, guessed rendition or alternate route.

## Implementation plan

1. **Runner:** `scripts/catalog-intake/media-runner.mjs`. It is resumable, with an append-only journal, and reuses the existing modules (`prepareResponsiveMedia`, `approvalBundle`, `mediaApprovalSql`, `derivedRecord`, `rebindSql`).
   - It prepares the tile and/or original options, draws the combined review sheet and template, and binds only accepted exact bytes.
   - It writes a re-bind only where the live revision differs, a same-revision replacement where an approval is kept, and a `deliver-ready.mjs` ready manifest.
   - Codex records, uploads and activates through the existing private runner and n8n completion.
2. **Breadth rotation:** a first pass of up to 10 distinct models per reachable brand, then 25 per brand, rotating brands. The source matrix in `docs/spec/COVERAGE-AND-SOURCE-REGISTRY.md` is the work list. LOEWE's remaining cached refs proceed in background chunks.
3. **Official link:** an additive `official_url` column with a verified-only trigger, a backfill and `jwl_product_model_v2` projection (migration `20261118122046`), plus a storefront release. A portrait or landscape original is shown whole in a frame of its own proportions. The release deploys when an authenticated Wrangler session is available; either order works.
4. **New sources:** for directory brands without catalogue rows, onboard only through an existing structured-data adapter on a verified official domain, after its access check. No guessed URLs, no contact.

## Retained

Exact-product provenance, immutable originals, negative and superseded records, every recorded source stop, the 0025 no-contact rule and the 0026 delivery authority.
