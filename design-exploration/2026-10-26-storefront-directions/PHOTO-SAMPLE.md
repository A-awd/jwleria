# Exact-product photo sample for the phone review (private preview only)

Status: **design-review sample, not approved for jwleria.com.** Publication on
the site still needs the owner's decision under decision 0011 and the
foundation stream's evidence chain (grant, checksums, derivatives, visual
verification, deployed attribution). This folder does not change any of that.

## Why this sample

The foundation stream's media ledger (`docs/WEBSITE-MEDIA-COVERAGE-2026-10-26.md`
on `claude/admiring-dirac-nfavfx`, commit `f42af89`) records 0 eligible official
brand images and names the lower-risk open-licence exact-reference subset:

| Reference | Commons file(s) | Licence | Creator | Ledger verdict |
|---|---|---|---|---|
| `m126234-0015` (Datejust 36, bright black dial, fluted white-gold bezel, Jubilee) | `Rolex_Datejust_126234.jpg` and five more photos of the same watch (Black Sunburst Dial, At an Angle, On Display, Presentation Ready, Ready in the Box) | CC BY 2.0 | Ajay Suresh | Exact (6 checks); `m126234-0016` (Oyster) ruled out |
| `m126200-0006` (Datejust 36, Oystersteel, bright blue dial, Oyster) | `Rolex_Datejust_36_126200-0006.jpg` | CC BY-SA 4.0 | Remi Mathis | Exact |

Licences were re-read on the Commons file pages on 2026-10-27.

The same sample is applied identically to directions A, B and C so the owner
compares layouts, not photos.

## Rules applied in the previews

- A photo is shown only for its exact reference. A sibling variant of the same
  model shows its own facts-only state.
- Every photo shows a visible credit: creator, licence (linked), source (linked)
  and "resized and converted".
- Derivatives: uncropped WebP at 400/800/1200 px, never enlarged. The
  full-screen viewer loads 1200 px only on demand.
- Image files are not committed to this public repository (`shared/photos/` is
  ignored). `shared/photos.js` holds the manifest (source, licence, checksums).
