# 0023 — The owner-selected product grid: a pale neutral square tile

Status: accepted (owner selection of a reference screenshot, 2026-11-01). It supersedes decision 0022's white frame **for the product grid only**.

Date: 2026-11-01

## Direction

The owner selected a mobile screenshot of an official brand's product grid as the visual reference for Jwleria's own grid. The reference is the screenshot; Jwleria keeps its own header, typography and identity, and copies no logo or business identity.

## The standard (product cards, on phones and desktop)

1. **The tile.** Each photograph card is a square tile of pale neutral grey, `#f0f0f0`, measured from the reference. It has no outline, shadow or rounding. Phones keep two cards per row.
2. **The product inside it.** The product sits whole and centred, with its largest extent at most 70% of the tile (15% padding). It is contained, never cropped, and its true proportions are kept.
3. **Text.** Below the tile, the brand line and a simple name, with no prices.
4. **How each kind of source shows:**
   - A transparent packshot shows the tile through its own alpha.
   - An opaque photograph, or an earlier white square, stays the rectangle it is. Nothing is recoloured or blended to hide its background.
5. **Size hints.** Card size hints name the in-tile width (70% of the column).
6. **The listing surface.** A page that lists product cards, and is not a product page, is white (`#fff`), as in the reference.
7. **Phone spacing.** On phones its grid widens to a 12px outer margin with an 18px gap. The rest of the site keeps its current identity.

## Unchanged

- The product page's gallery frame.
- The source rights gate: an official packshot is published only with the brand's express written permission.
- Facts-only cards, which have no image and no tile.
