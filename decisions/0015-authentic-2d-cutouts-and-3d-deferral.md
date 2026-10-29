# 0015 — Authentic 2D cutouts; interactive 3D deferred

Status: accepted (owner direction)

Date: 2026-10-29

**3D.** The owner has deferred real interactive 3D. Earlier 3D discussion sets no implementation requirement.

**Product imagery.** The owner wants authentic, exact-product 2D photographs, preferably as cutouts.
- A cutout is an alpha-transparent rendition of a genuine photograph of the exact reference, colour and material. It is shown over the site's current light product frame (`.media`, `--sand`), with no new background colour. The private cream sample is not a standard.
- Prefer an original that is already transparent, genuinely shows the exact variant and has an eligible use path. It needs no removal pass.
- Otherwise, background-only removal is an owner-requested treatment. It may make the background transparent, with a soft (partly transparent) boundary. It may not redraw, regenerate, retouch or enhance the product. It may not change a logo, dial, engraving, colour, material or proportion, substitute a sibling or synthetic image, upscale, or crop.
- The original stays unchanged and is identified by its sha256. The cutout master is a separate file with its own sha256, bound to that original, candidate revision and grant, and every derivative records both.

**Rights are unchanged.** This decision authorises the treatment, not new sources or images.
- Every image still needs a rights basis: the owner's own photograph, written permission (which must also cover background removal), or an open licence under a decision that names the reference (0013).
- An official image URL, or an official file that is already transparent, is never permission by itself (0011).
- An open licence must allow the adaptation: CC0 and CC BY do, with the change stated in the credit. A CC BY-SA cutout needs a ShareAlike licence review first. NC and ND are never used.

**Before a cutout is public:**
1. The automated check (`scripts/catalog-intake/cutout.mjs`) passes: an 8-bit RGBA PNG with the original's upright geometry and colour profile; opaque pixels equal to the original's stored values (rounding only); real transparency; no visible pixel on the canvas edge.
2. An independent visual comparison confirms that only the background was removed, the whole product is kept, the edges are clean on the frame colour and no detail was redrawn.
3. The credit states "background removed, resized and converted to WebP" (or "background removed and converted to WebP").
4. A reviewed change lets the database record the master, the treatment and that credit text, and the storefront shows the reviewed Arabic for it. Until then, cutouts are prepared privately and the pipeline refuses to record them.

**Tools.** Choosing a tool is an implementation choice (decision 0010), and the output is judged only by this contract.
- No tool, service, account, subscription or credit purchase is adopted or required. Photoroom was a private convenience trial.
- A generative editor that redraws the product fails this contract. The private built-in image editor trial of 2026-10-29 was rejected for that reason: its dial lettering, markers, reflections and proportions were redrawn. The automated check also refuses it (enlarged geometry, changed colour profile, no fully opaque product, product at the edge). Nothing from it is used.

**Cross-references.** Execution spec P1 and decision 0013's "no generated or altered imagery" stay in force. Background-only removal under this contract is the only alteration they allow.
