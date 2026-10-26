# Design brief and contract — storefront directions (2026-10-26)

Status: **exploration only.** Nothing here changes the live app, data, media
approvals, storage, automation or deployment. The owner chooses a direction
before any integration; integration is then coordinated against the current
implementation branch.

## Why

The owner dislikes the current storefront look. Observed on
`https://jwleria.com/ar/` (2026-10-26):

- Product cards and pages are text-only. Model, size and colour are mixed in one
  Arabic sentence with embedded Latin names, so the bidirectional order breaks
  (for example `Le Pliage حقيبة يد One، مقاس صغير، أسود`).
- Each colour or size is a separate card ("Le Pliage One … Black", "… Lime"),
  which repeats the same model across the grid.
- The product page is a long block of facts and a full-width black bar. There is
  no gallery area, no variant control and weak hierarchy.
- The homepage is a single large photograph and a very large display headline.
  Brands and categories are hard to reach from the first screen.

## Product contract every direction must keep

- Arabic-first, `dir="rtl"`, with an English counterpart (the language switch
  is shown; the English pages are not part of this exploration).
- Brands, categories and genuine products only. No prices, currencies,
  country chooser, login, account, cart, checkout, payment or administration.
- Neutral, non-gendered copy. No personal-shopping wording. No implied brand
  affiliation. Keep the independence notice:
  `أسماء العلامات التجارية ملك لأصحابها. Jwleria جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.`
- Product action label: `التواصل عبر واتساب لمعرفة السعر` (existing contract;
  inert in this preview — contact work is not part of this exploration).
- **One card and one canonical page per genuine model.** Its real colours and
  sizes are selectable. Selecting a variant updates the exact reference, the
  colour/size labels, the matching image slot and the URL (`?ref=`). Do not
  merge different models; a backpack, a handbag and a travel bag stay separate.
- Bounded catalog: paginated pages of at most 48 cards, never the whole
  catalog at once.

## Bidirectional text rule

Latin brand, model and reference names are rendered as their own isolated runs
(`<bdi>` or `dir="ltr"`), usually on their own line. An Arabic product-type
line (`حقيبة يد`) sits beside, never inside, the Latin model name. References
use a monospace or tabular style and are always isolated.

## Imagery rule

No approved product photographs exist yet (0 media approvals). Product images
are therefore **labelled layout placeholders** tinted with an approximate tone
of the selected variant so that variant switching can be judged. They never
show another product and never use generated look-alikes. The generic
synthetic editorial images already in the repository may appear only as
labelled atmosphere (hero/category), never as a product photo. Mobbin
screenshots are research only and are not used as page imagery.

## Performance and accessibility rules

- No frameworks or third-party scripts. Small inline/local JS only.
- Fonts: at most two families per direction, regular weights, `display=swap`.
- Images have intrinsic `width`/`height`, `srcset`/`sizes`, lazy loading below
  the fold; hero ≤ 1600 px wide, cards request ≤ 640 px.
- WCAG AA contrast, visible `:focus-visible`, skip link, landmarks,
  `aria-expanded` menu, radio-group semantics for variants, arrow-key support,
  `prefers-reduced-motion` respected, no layout overflow at 360 px.

## Directions

| | A — Maison (editorial) | B — Index (modern multi-brand) | C — Showroom (warm boutique) |
|---|---|---|---|
| Feeling | magazine, calm, slow | precise, fast, inventory-first | warm, brand-first, tactile |
| Background | paper ivory `#faf7f2` | pure white `#ffffff` | ivory `#fbf8f3` with stone panels `#f0eae1` |
| Arabic type (proposal) | Amiri display + IBM Plex Sans Arabic | IBM Plex Sans Arabic only | El Messiri display (current) + Noto Sans Arabic |
| Latin type (proposal) | Bodoni Moda | Inter | Cormorant Garamond (current) |
| Header | centred wordmark, nav row below | wordmark at start, inline categories, visible search field | wordmark at start, brand/category chips under header |
| Home | full-bleed photo hero, slow brand strip, editorial category stories | typographic hero, brand A–Z index, dense new-in grid | split hero, brand "doors", category tiles on stone panels |
| Catalog | 3 columns, tall 4:5 images, minimal text | 4 columns, sticky filter sidebar, colour dots | 3 columns, chips filter bar, tinted product stages |
| Product page | stacked large gallery + sticky info column | 2×2 image grid + compact info, colour chips | main image + thumbnail rail, visual colour tiles, size pills |
| Mobile | full-screen menu, swipe gallery, sticky action bar | filter sheet, 2-column grid, snap gallery | chip rows, card stages, sticky action bar |

Typeface and palette choices are proposals until the owner approves one.

## Foundation variant contract — supersedes earlier variant-control lines

Source: `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md` on the foundation
branch `claude/admiring-dirac-nfavfx` (commit `5c5099a`). Where this section
differs from anything above or from a builder prompt (for example "radiogroup"
or "disable missing combinations"), **this section wins**.

- Options are exactly the existing variants. Never a Cartesian product.
- Every option value is a real link to that variant's URL
  (`product.html?model=…&ref=…`), so it works without JavaScript and by
  keyboard. The selected value carries `aria-current="true"` and a clear focus
  ring. Touch targets are at least 44 px.
- JavaScript only swaps to the chosen real variant without a reload (reference,
  facts, gallery, labels, inquiry reference) and updates the URL with
  `history.replaceState`.
- Choosing a value moves to the existing variant that keeps as many of the
  other selected values as possible. If another attribute must change, the
  option shows that change before it is chosen (for example a small note
  `يتغير المقاس إلى كبير`). Values are not shown as disabled.
- Option kinds include colour, size, dial and bracelet. A model can have many
  values (a Rolex model has 26 variants), so the control must stay usable with
  10+ values on a phone.
- The product page keeps a `rel="canonical"` link to the primary variant URL.
- Gallery per variant shows only that variant's approved images. A variant
  without an approved image shows an honest **facts-only state** (no other
  variant's photo). In these previews the tinted block stands in for an
  approved photo; single-reference watches show the facts-only state.
- Cards show the model name and a neutral count of real options
  (`٣ ألوان`, `٢٦ ميناءً`). Catalog headings report displayed models separately
  from references.
- A small visible image credit line is prepared for a possible future
  open-licence decision; it is inactive and not shown by default.
