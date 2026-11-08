# 0016 — Verified open-licence photographs, found and published in batches

> **Superseded in part by decision 0025 (owner, 2026-11-09):** any requirement here for a brand's written permission, or for brand outreach, no longer applies. There is no brand contact, and official exact-product images follow the decision 0025 owner-direction route. Every other part of this decision stands.

Status: accepted (owner direction)

Date: 2026-11-01

The owner directed that eligible photographs of exact catalogue products be found, acquired and published, without a new owner approval for each photograph. The owner also approved local, non-generative background removal, under decision 0015's cutout contract.

**What qualifies:**
- **Source and licence:** an independent photograph on Wikimedia Commons. Allowed licences are CC0, CC BY 2.0–4.0, or CC BY-SA 2.0–4.0 after a per-file licence review; NC, ND or unknown terms never qualify. It must never be presented as official brand photography, and it must never be a drawing, a render or a replica.
- **Credible authorship:** an uploader whose other files were tagged or deleted for missing permission is not relied on without further evidence.
- **Identity:** decision 0013's gate, applied by independent reviewers. The creator's own statement must name the full reference or its exact model segment, and the visible dial, bezel, case and bracelet must match the catalogue variant. A nickname is not a reference.
- **Size:** the held file is at least 960 px on its long side and 640 px wide. It is never upscaled or cropped.
- **No generation or alteration:** no synthetic generation, compositing, retouching or recolouring of the product. A photographer's global rendition across the whole frame (exposure, saturation, vignette) is recorded as a limitation, not a disqualification. This is the coordinator's technical reading of the owner's no-regeneration direction, adopted as an implementation rule under decision 0010, not a separate owner policy.
- **Cutouts:** made locally under decision 0015's contract, with a foreground mask that is never generative (macOS Vision; implementation choice). A CC BY-SA cutout is an adaptation, so it is offered under the same CC BY-SA licence, which its credit names and links. Its grant records that ShareAlike review (`share_alike_review`), and without it the database refuses the cutout.

**How:**
- Each verified batch names its references below.
- A reviewed migration pins them in the database (`jwl_internal.open_license_decisions()`) and the pipeline pins the same list (`openLicenseDecisions`); tests keep the two identical.
- Source publication flags and closed brand origins are unchanged.

**Batch 1, 2026-11-01:** m126200-0006, the Commons file "Rolex Datejust 36 126200-0006" by Remi Mathis, CC BY-SA 4.0. The creator states the full reference. It is published as a cutout ("background removed, resized and converted to WebP") and as the photograph itself ("resized and converted to WebP").
