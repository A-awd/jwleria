# 0024 — Free local generation for backgrounds only

> **Superseded in part by decision 0025 (owner, 2026-11-09):** any requirement here for a brand's written permission, or for brand outreach, no longer applies. There is no brand contact, and official exact-product images follow the decision 0025 owner-direction route. Every other part of this decision stands.

Status: accepted (owner, 2026-11-01: «ابدأ اذا»). This authorizes the free local path. It authorizes no paid API and no public image licensing.

## Direction

- **What AI may make:** only a **background**: an empty studio scene with no product, logo, text or people. It runs locally on the owner's Mac with a free, publicly downloadable model whose licence allows commercial use of outputs within its use restrictions.
- **Approved model:** `stable-diffusion-v1-5` (CreativeML OpenRAIL-M), pinned revision, fp16 only.
- **The product is never generated, redrawn, retouched, upscaled or recoloured.** Its own alpha cutout is placed at its native scale over the background (`scripts/catalog-intake/background-composite.mjs`). Every fully opaque product pixel is verified unchanged before encoding. An already-transparent official photograph passes through with no AI.
- **No upload of product files to any third-party AI service.** No paid calls, accounts or credits.
- **The catalogue keeps the approved grey card** (decision 0023). A background composite is an experiment for review and does not replace the catalogue design.

## Rights

- A generated background is our own asset, under the model's licence and its use restrictions.
- A product's photograph keeps its own rights basis. An official packshot stays private evaluation until its brand grants written permission.
- A composite is published only through the existing grant, evidence and approval path, never through a shortcut.

## Integration

- n8n Cloud cannot reach this Mac, so the job is a local, operator-run command. No public endpoint, tunnel, new role, credential transfer, schedule or worker is added.
- Delivery of any rights-cleared output uses the existing approval-bound upload function, and n8n's manual delivery check.
- This is operator-assisted, not autonomous.

## Outcome and flat standard (2026-11-01 and 2026-11-02)

- **Generated backgrounds:** all four candidates worked technically but failed visual acceptance, so the AI background path is closed (`STATE.md`, 2026-11-01).
- **Owner direction, 2026-11-02 («ابدأ»):**
  - exact original photos, keeping native transparency where it exists, with background-only removal only if needed;
  - a flat `#f0f0f0` square with consistent occupancy and the whole piece uncropped;
  - light responsive WebP;
  - no generative edits, AI backgrounds or paid services.
- **Implementation** (`background-composite.mjs` version 2, an implementation rule under decision 0010, not an owner approval):
  - a deterministic flat colour fill;
  - fill 0.68;
  - a 653 px minimum product extent, so the square reaches the 960 px card;
  - one source file per reference;
  - the production WebP budgets and fidelity floor.
- **Rights are unchanged:** publication still needs the photograph's own rights basis and the existing grant and approval path.
