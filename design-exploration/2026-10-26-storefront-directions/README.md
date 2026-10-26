# Storefront design directions — exploration (2026-10-26)

## Role and boundaries

The owner named the «تصميم موقع جويلري» conversation Jwleria's visual
designer. This stream owns visual proposals, responsive layouts, typography,
navigation, galleries and the presentation of variant controls, in this
isolated design-preview branch. The implementation conversation owns the
foundation: data, original photos, the model/variant contract, performance and
integration. This stream makes no database, provider, media or production
change and does not replace the live visual design. A replacement needs the
owner's choice from these real previews; after that choice, this stream hands
over an integration package (exact design commit, preview entry, assets and
fonts, component states and interface assumptions) to the implementation
owner.

The variant presentation follows the foundation stream's
`docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md` (`claude/admiring-dirac-nfavfx`
at `5c5099a`); see the last section of `BRIEF.md`.

Status: **proposal for owner choice. Nothing here is live.** This folder does
not change the storefront app, catalog rows, media approvals, storage,
automation or deployment. The photo/variant implementation stream owns
application and data integration; after the owner picks a direction it is
integrated against the then-current implementation in a coordinated step.

## What is here

| Path | Purpose |
|---|---|
| `BRIEF.md` | Why the redesign, the product contract every direction keeps, rules for bidi text, imagery, performance and accessibility, and the A/B/C comparison |
| `index.html` | Review board: Mobbin references and the three directions side by side |
| `a/`, `b/`, `c/` | Static, self-contained previews: `home.html`, `catalog.html`, `product.html` |
| `shared/catalog-data.js` | Small fixture of real public facts (10 models, 28 references) plus variant helpers |
| `shared/img/` | Smaller WebP derivatives of the existing synthetic editorial images (see below) |
| `screens/` | Screenshots of each direction at desktop and phone widths |
| `references.json` | Manifest of the Mobbin references used, with their original Mobbin links |

Open `index.html` or any `a|b|c/*.html` file directly in a browser. The previews
load fonts from Google Fonts; everything else is local.

## Mobbin research

Research used the actual Mobbin connector (`search_sections`,
`search_screens` on web and iOS, `search_flows`) with focused single-target
queries for: homepage hero/navigation; catalog grid and brand/category
navigation; product gallery with colour/size variants; mobile behaviour.
`references.json` lists every kept reference with its site name, platform and
`mobbin_url`.

Mobbin reference screenshots are research material owned by their sites and
Mobbin. They are **not committed** to this public repository (`refs/` is
ignored) and are not used as page imagery. The review board shows them only in
the owner's private review copy.

Observed coverage limit: Mobbin's library returned almost no luxury jewellery
or watch retailers. The strongest luxury multi-brand references are FARFETCH,
Selfridges and SSENSE; other results are general fashion retail or off-domain
sites chosen for a specific structural idea.

## Product facts and imagery

Product facts come from the public catalog API (`/api/catalog.json`, read on
2026-10-26). Grouping references into one model with selectable colours and
sizes illustrates the required behaviour; it is not the implementation's
variant contract.

There are no approved product photographs yet, so product images are
**labelled placeholders** tinted with an approximate variant tone. The
`shared/img/` files are resized WebP copies (quality 78) of the synthetic
editorial images documented in `docs/ux/preview-image-provenance.md`. They are
used only as captioned atmosphere, never as a product photo.

## Typography

Each direction names its proposed families. They are loaded from Google Fonts
for review only. A chosen family must be self-hosted with its licence and
provenance recorded (see `docs/ux/font-provenance.md`) before production use.
El Messiri remains the accepted Arabic display face until the owner decides
otherwise.
