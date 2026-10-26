# Website models, variants and original media — working contract (2026-10-26)

Owner priority from 2026-10-26: **website only**. The acceptance target is real original product photography visible on jwleria.com and one card/page per real product model with its genuine variants. Contact, social, advertising and other non-website operations are deferred and are not website gates.

This file is the shared engineering contract for the parallel streams. It is prepared design, not a record of anything applied or deployed.

## Product model

- A **variant** is one existing public catalog row (`public.jwl_catalog`, one exact official reference/SKU, its own source identity and revision). Nothing existing is deleted, renamed or rewritten.
- A **model** groups variants only on official, evidence-backed identity. Grouping must also pass consistency checks. Anything uncertain stays its own model with a single variant.
- Observed source identity structures (live data, 2026-10-26) and the planned rules:

| Source | Variants (public) | Planned rule | Evidence and consistency | Options |
|---|---|---|---|---|
| Rolex | 1,465 | Official model number = reference without the `m` prefix and the `-NNNN` dial/bracelet suffix (e.g. `m126334-0001` → `126334`). The letters stay part of the model (`126610LN` ≠ `126610LV`). | Same collection, case diameter, case material, movement and water resistance across the group. | dial (`color` fact), bracelet (`bracelet_type` fact), bracelet material (`bracelet_material` fact), each only when it varies within the model |
| LOEWE | 407 | Style code before the `-NNNN` colour code (e.g. `328.24.W10-2435` → `328.24.W10`). | Same product name, dimensions and material. | colour |
| Longchamp | 390 | Model code before the trailing three-character colour code, only where the product name (without its colour suffix) and dimensions match. | Same name, dimensions and material. | colour |
| Bottega Veneta | 8 | Style + material prefix before the colour code, only with a colour fact and matching name. | Same name and material. | colour |
| Prada | 851 | No colour names in the captured facts, so a colour option could not be labelled meaningfully. Stays one model per row unless captured evidence names the colour. | — | — |
| Cartier, Van Cleef & Arpels, AP, IWC, JLC, Panerai, Piaget | ≤ 515 each | No captured evidence links references (sizes are not recorded). One model per row. | — | — |

- Sizes (ring, bracelet, bag, case) become options only when the source records them as such for references of the same model. Case diameter and bracelet/strap fit are different attributes. Units come from the source fact (mm, cm, in) and are never converted silently.
- Never build a Cartesian product. The options shown are exactly the existing variants.
- The primary variant is deterministic: the lowest position, ordered by reference.

## Database (prepared migration, applied only after its exact approval)

File: `apps/storefront/supabase/proposed/jwleria_product_models.sql`.

- `public.jwl_product_variants` (additive, anon-readable only for active catalog rows):
  - `product_id text primary key references public.jwl_catalog(id) on delete cascade`;
  - `model_key text not null` (`<source_id>:<model code>` for a grouped model, `<source_id>:ref:<reference>` for a single-variant model, so the two namespaces never collide), `is_primary boolean not null`, `position integer not null >= 0`;
  - `model_name jsonb not null` — `{ar,en}` model-level name without the variant-specific words or reference;
  - `options jsonb not null` — ordered `[{kind, label:{ar,en}, value:{ar,en}, key}]`, empty for a single-variant model;
  - `specs jsonb not null` — ordered translated facts `[{kind, label:{ar,en}, value:{ar,en}}]`; a value without a verified Arabic translation keeps the English text and carries `"value_lang":"en"`;
  - `rule text not null`, `mapped_at timestamptz not null default now()`;
  - at most one primary per `model_key`, and every member of a model shares `model_name`.
- `jwl_internal.variant_evidence` keeps the private basis of each grouping: the rule, the compared facts and candidate revisions. It is not public.
- `jwl_internal.term_translations(kind, term_en, term_ar)` is a reviewed dictionary of distinct fact values.
- `jwl_internal.derive_product_variants()` is a read-only function that computes the full mapping from the current candidates and public rows. The coordinator writes its output in one reversible transaction.
- `public.jwl_catalog_models` view (`security_invoker`): active catalog rows that are primary or have no variant row. It has the same columns as `jwl_catalog`, plus `model_key`, `model_name`, `variant_count`, `options_summary` (for example `{"dial":26}`). Listings, search, categories and the catalog page read it.
- `public.jwl_product_model(p_slug text) returns jsonb` gives, for any variant slug, `{product, model_key, model_name, variants:[...]}` in one round trip, bounded to at most 60 variants ordered by position. Each variant carries its catalog fields plus `options`, `specs`, `position` and `is_primary`. It returns null for an unknown slug.
- `public.jwl_brand_models_page(...)` is the collapsed counterpart of `jwl_brand_page`, with the same arguments and shape.
- Rollback is `drop` of the new objects and nothing else. Existing tables, functions and data are untouched.

## Storefront

- Until the migration exists the storefront behaves exactly as today. A missing view or RPC (PostgREST `PGRST202`/`PGRST205`/HTTP 404 for that relation only) falls back. Every other database error stays an error.
- Cards show the model name and a neutral count of the real options (e.g. "26 dials", "3 colours"). They never claim stock or price.
- Product page:
  - Every existing variant URL stays valid and renders the model page with that variant selected (no orphaned links).
  - `rel=canonical` points to the primary variant's URL.
  - Options are links to each real variant URL, so the page works without JavaScript and by keyboard.
  - JavaScript only swaps to the chosen real variant without a reload (reference, specs, gallery, inquiry reference) and updates the URL with `history.replaceState`.
  - Selecting a value moves to the existing variant that keeps as many of the other selected values as possible. A value that would need another attribute to change shows that change.
  - Each option has a visible label (Arabic/English), `aria-current` on the selected value and a clear focus ring, and works with RTL. Touch targets are at least 44 px.
- Gallery per variant: only that variant's approved images. A variant without an approved image shows the honest facts-only state, never another variant's photo. A bounded number of images (first image eager with `fetchpriority=high` only when it is the LCP, the rest lazy). Use the responsive srcset/sizes already in `product-media.mjs`, with explicit width/height.
- Attribution: when an approved image manifest entry carries `attribution` (`creator`, `license`, `license_url`, `source_url`, `changes`), render a small visible credit under that image. This is prepared for a possible future open-license decision and is inactive otherwise.
- Counts: report displayed models (view count) separately from variants (catalog count).

## Original media

- An image is publishable only through the existing evidence contract (decision 0011): an exact candidate revision, a recorded grant, checksums, derivatives and a recorded visual verification of the exact reference and colour/variant.
- Today the database accepts only `owner_original` and `written_permission` grants. Zero grants exist.
- A public image URL, a successful request, robots allowance or the absence of an automation clause is never permission. Press images limited to editorial use do not cover this commercial showcase.
- Open licences (CC BY, CC BY-SA, CC0) need visible attribution and an explicit owner decision under decision 0011, plus a reviewed migration adding that grant kind. Any such candidate is verified visually against the exact reference before it is even proposed.
- Per-brand/model/variant coverage is tracked in a ledger with genuine gaps; no global completion percentage is invented.
