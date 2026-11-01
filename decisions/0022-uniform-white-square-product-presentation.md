# 0022 — One square white presentation for every product photograph

Status: accepted (owner direction; supersedes earlier frame-colour and presentation rules for product images only)

Date: 2026-11-01

## Direction

Every product should appear with comparable visual prominence, whatever its real size. A watch, a handbag and a suitcase are not shown at physical scale relative to one another.

## The standard

1. **One square canvas** with a pure white background (`#ffffff`). The whole product is centred, its original proportions are kept, and the margins are balanced.
2. **The product's longest extent is about 80% of the canvas side.** It is measured from the true foreground bounding box after valid masking (decision 0015), never from the whitespace of the source photograph. Small optical corrections are allowed only when documented.
3. **Nothing about the product changes:**
   - no stretching;
   - no cropping of the product;
   - no upscaling of a weak original;
   - no invented parts.

   When the source photograph itself cuts the product off, the result records that limitation and is not certified as complete.
4. **White padding and compositing are now authorized for product images.** They supersede, for product images only:
   - the sand-frame presentation;
   - the "no new background" rule.

   The website's identity, including the lighter palette and the sand used elsewhere, is unchanged.
5. **The geometry is documented and configurable.** The canvas side, the target fill (0.80), the white value, the mask threshold and the rendition widths are named settings. A normalized square asset is distinct from the size it is displayed at on a phone.
6. **The display stays compact on a phone:**
   - native scrolling, with the options near the image (decisions 0019 and 0020);
   - a square need not fill the phone's width or height;
   - responsive sizes come from the real display geometry, keeping decision 0021's speed gain.
7. **Phones and listings use the same standard.** Setting `object-fit: contain` on an old source photograph is not normalization.

## Traceability

**Separate and linked by sha256:**
- the private source original;
- its alpha master (the cutout);
- the normalized white square;
- each responsive derivative.

**Evidence:**
- A published white normalization is recorded truthfully in each credit's changes text and in its evidence.
- The rights, identity and publication gates stay fail-closed, and the upload function keeps JWT verification.
- Previous assets stay available for rollback; nothing is destroyed.

## Superseded

- **Decision 0015:**
  - cutouts shown over the site's light product frame (`.media`, `--sand`);
  - edges "clean on the frame colour".

  For product images, the review is now done on white, and also on dark to reveal fringes.
- **EXECUTION-SPEC P1's "nothing … altered":** white padding and compositing onto the square canvas is now allowed. Background-only removal (P8) still governs the product's own pixels.
