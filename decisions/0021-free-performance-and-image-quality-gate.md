# 0021 — Free performance: size hints that match the compact frame, and an image quality gate

Status: accepted (owner direction: free tools and existing resources only)

Date: 2026-11-01

## Direction

The owner directed performance work using only free tools and existing resources, with no new service or spending. The owner also asked how image clarity can be trusted. The answer is a practical, measured acceptance, not a claim of 100%.

## Measured (2026-11-01; each figure labelled with where it was taken)

- **Live product page** (`m126200-0006`, a cache miss, from this machine): 17,991 B, or 5,163 B on the wire, with a 626 ms server render. The 4.1 s to first byte was dominated by this machine's network, so it is not used as a latency figure.
- **Deployed package files** (local):
  - CSS: 23,799 B (6,006 B gzip);
  - the product module: 6,598 B (2,711 B gzip);
  - fonts are self-hosted with `font-display: swap`, and only the faces a page uses are fetched;
  - `/_astro/*` is cached for a year, immutable.
- **Published images** (live GET, 11 files): `public, max-age=86400`. A HEAD request reported `private, no-cache`, which is not what a GET serves.
- **The bottleneck was image selection.** The compact phone frame (decision 0020) shows `m126200-0006`'s portrait photographs about 240 CSS px wide, but their size hint said `86vw` (335 px). A 3× phone therefore fetched the 1588 px detail files (359,862 B and 193,466 B) instead of the 960 px files (144,262 B and 102,604 B).

## Change (storefront only)

- **Phone size hint.** It follows each photograph's aspect: `calc(30 × aspect vh)` when the frame's height binds, up to an aspect of 1.38 (true on phones from 360×640 to 430×932). A wider photograph keeps its column width.
- **Thumbnail hint.** It names the thumbnail's 5.5rem column.
- **Unchanged:** the desktop hints, every image, record, cache rule and route.

**Modelled selection, using the published files' real widths and bytes.** The browser takes the smallest file at least as wide as the hint times the pixel ratio:

| Photograph | Phone | Before | After | Saved |
|---|---|---|---|---|
| m126200-0006 photograph | 390×844 at 3× | 1588w | 960w | 215,600 B |
| m126200-0006 photograph | 375×667 at 2× | 960w | 640w | 50,160 B |
| m126200-0006 cutout | 390×844 at 3× | 1588w | 960w | 90,862 B |
| m126200-0006 cutout | 375×667 at 2× | 960w | 640w | 43,914 B |
| m126234-0015 | 390×844 at 3× | 960w | 960w | 0 B |
| m126234-0015 | 375×667 at 2× | 960w | 640w | 67,056 B |
| m126234-0015 as a 5.5rem thumbnail | 390×844 at 3× | 640w | 320w | 51,160 B |

No chosen file is narrower than the width the frame shows, and that includes a phone held sideways.

**The tradeoff.** On a 2× phone at 375×667, `m126234-0015` now loads its 640w file:
- at the shown size (267 CSS px, so 534 device px), that file covers the display;
- under pinch-zoom it shows less detail than the 960w file. The 4× side-by-side shows "OFFICIALLY CERTIFIED" softer at 640w.

**Full-size access.** Every photograph, its own or a representative, therefore carries an inline link to its largest approved file, named by its real size, for example "Open at full size (960 × 720 px)":
- a closer look never depends on the rendition the frame chose;
- the gallery has no zoom control to reuse, so it is a plain link, with no gesture of the page's own;
- its tap area is enlarged without adding height, so the compact layout keeps its measured fit.

The largest file is the most detail that exists. Faithful display at the shown size does not mean unlimited zoom.

## Image quality gate (`scripts/catalog-intake/image-quality-gate.mjs`)

**Approach:**
- Free local tools only: `dwebp` and `cwebp` from libwebp, and plain JavaScript.
- It reads local files only and never alters or uploads an image.
- Identity stays decision 0013's gate. This gate covers clarity and faithfulness.

**Automatic rejection when a file:**
- has a sha256 or byte count that differs from its record;
- decodes to a different size from its srcset entry;
- is enlarged beyond its original;
- has an aspect more than one pixel off, which means a crop or a distortion;
- is over budget (150,000 B up to 960 px, 600,000 B for a detail file);
- has luma SSIM below 0.97, where the same-width reference is exact.

**Flagged for review on a cutout:**
- opaque corners;
- opaque runs along a frame edge;
- a soft band wider than max(3 px, 1% of the shorter side).

**Always checked by eye,** side by side with the original at the shown size and at 4×:
- the lettering;
- ringing and colour;
- the cutout's edge, on light and dark grounds;
- the whole product.

No result claims 100% accuracy.

**Results on the 11 published files:**
- Every file passes the automated checks.
- `m126234-0015` at 960 px: luma SSIM 0.98852 and PSNR 43.44 dB against its held original. That is an exact same-width reference.
- `m126200-0006`'s recorded original is not held locally, so its fidelity is not recomputed. Its files match their records.
- Cutouts:
  - transparent corners;
  - no opaque run on any frame edge;
  - a soft band of about 0.65% of the width at every size.

**Inspection** (a private sample, kept out of the repository):
- **`m126234-0015`:** its small lettering stays legible at 960 px, and is softer at 640 px under zoom.
- **The `m126200-0006` cutout has a real limitation.** It is flagged, and it is not accepted as final quality:
  - at 4× over white, a band of dark retained pixels shows along the case's left flank;
  - it was inspected at 960 px, and every width comes from the same mask;
  - over black it does not show, but the site's light frame can show it under zoom;
  - it is the first photograph on its page.

The cutout stays published as approved, but this gate does not certify it. The remaining step is a reviewed decision under decision 0015, choosing one of:
- keep it, with this limitation recorded;
- show the photograph first;
- a reviewed, non-generative mask rework.

**Correction (2026-11-01, during the decision 0022 review).** Compared against the untouched original's boundary, the dark blue band left of the case rim is not background:
- it is the polished case flank, reflecting the blue surroundings;
- it is a smooth curved surface, with a crisp outer edge against the wrist and no fabric texture.

So it is genuine product material, and the existing approved mask keeps it rightly.

**The remaining uncertainty** is at the lowest flank only. There the case and the shadowed sleeve share dark tones, so the mask boundary is uncertain by a few pixels. It is recorded, not altered.

**A rejected repair.** A cosmetic repair that erased exterior dark pixels was tried and rejected, because it removed product detail: bracelet edges, an angular notch and detached specks.

## Free-only limits

This environment has:
- no real phone, and no paid or remote device lab;
- no Lighthouse or field data, and this machine's network to the site is slow and unreliable;
- no `sharp` locally, so an exact SSIM is possible only where the original is the delivered width;
- no held copy of `m126200-0006`'s recorded original.
