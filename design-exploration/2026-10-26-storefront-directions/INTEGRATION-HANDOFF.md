# Integration handoff — draft (completed after the owner chooses)

Status: **draft. Not handed over.** The owner has not chosen a direction. When
a direction is chosen, this file is completed with the exact design commit and
sent to the implementation owner (foundation stream). Nothing here authorizes a
live visual change.

## To be filled at selection

| Item | Value |
|---|---|
| Chosen direction | _pending_ (`a` Maison, `b` Index or `c` Showroom) |
| Exact design commit | _pending_ (`claude/loving-ramanujan-o1udty`) |
| Preview entry | `design-exploration/2026-10-26-storefront-directions/<dir>/home.html` |
| Owner-approved changes to the preview | _pending_ |

## Interface assumptions (shared by all three directions)

The previews read a small client-side fixture. Production reads the foundation
stream's model contract (`docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md`,
`claude/admiring-dirac-nfavfx` at `5c5099a`). The mapping is:

| Preview (`shared/catalog-data.js`, `shared/variants.js`) | Foundation contract |
|---|---|
| `model.id`, `model.name`, `model.typeAr` | `model_key`, `model_name {ar,en}` |
| `model.variants[]` (one per reference) | `jwl_product_model(slug).variants[]`, ordered by `position` |
| `model.defaultRef`, `JWL.primary(model)` | the variant with `is_primary` (canonical URL) |
| `model.axes`, `colors` / `sizes` / `dials` | each variant's `options[] {kind, label, value, key}` |
| `JWL.axesOf(model)` | distinct `options` values per `kind`, in variant order |
| `JWL.nearest(model, current, kind, value)` | "moves to the existing variant that keeps as many of the other selected values as possible" |
| `JWL.changeNoteAr(...)` | "a value that would need another attribute to change shows that change" |
| `JWL.siblings(model, v)` (reference chips) | variants that share every known option value; shown by reference until the mapping supplies the distinguishing option (for example `bracelet`) |
| `JWL.summaryAr(model)` | card count from `variant_count` and `options_summary` |
| `JWL.counts(models).label` | displayed models (view count) reported separately from references (catalog count) |
| `model.facts`, material, dimensions | variant `specs[] {kind, label, value}`; a value with `value_lang: "en"` stays isolated in `<bdi>` |
| tinted stand-in block (`JWL.hasStandInImage`) | the variant's approved images only, using `product-media.mjs` srcset/sizes |
| facts-only panel | a variant with no approved image |
| image credit line (not shown) | manifest `attribution {creator, license, license_url, source_url, changes}` |

## Component states every direction implements

- **Card:** stand-in or facts-only face; brand; Latin model line; Arabic type
  line; neutral option summary; optional colour dots linking to real variant
  URLs; hover and focus.
- **Variant option:** default, hover, focus-visible, current
  (`aria-current="true"`), "changes another attribute" (with the visible change
  note). There is no disabled state, because only existing variants are shown.
- **Reference chips:** shown when several references share every known option
  value; one current chip.
- **Gallery:** approved images of the selected variant only; the facts-only
  state when none exist. It never shows another variant's photo.
- **Catalog:** filtered, empty and paginated states (at most 48 cards per
  page); a result line with models and references counted separately.
- **Header:** desktop navigation; mobile menu open and closed (`aria-expanded`,
  Escape closes); search.
- **Language:** the English link is inert in the previews. The English pages
  are designed after the direction is chosen.

## Assets and fonts

- Fonts load from Google Fonts in the previews. The chosen families must be
  self-hosted as WOFF2 with licences and provenance recorded, as in
  `docs/ux/font-provenance.md`, before production.
- `shared/img/` holds resized copies of existing synthetic editorial images.
  They are used only as captioned atmosphere. Production product imagery comes
  only from approved media.
- Mobbin screenshots are research material and are not assets.

## Not part of the handoff

Database, provider, media and deployment changes; contact or social work; any
change to the live visual design before the owner's explicit choice.
