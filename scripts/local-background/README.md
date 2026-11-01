# Free local background generation (decision 0024): setup, observed outcome and boundaries

**Scope:** backgrounds only. No product is generated, redrawn, retouched, upscaled or recoloured. Products are placed afterwards, unchanged, by `scripts/catalog-intake/background-composite.mjs`. Nothing here uploads, records or publishes.

## Setup (outside the repository)

```
python3.14 -m venv /private/dir/.venv
PIP_CACHE_DIR=/private/dir/pip-cache /private/dir/.venv/bin/python -m pip install -r scripts/local-background/requirements.txt
/private/dir/.venv/bin/python scripts/local-background/generate_background.py --out-dir /private/dir/backgrounds \
  --cache-dir /private/dir/hf-home --seed 20261101 [--prompt TEXT] [--negative TEXT] [--steps 25] [--guidance 6.5]
```

- **Model:** `stable-diffusion-v1-5/stable-diffusion-v1-5`, ungated, CreativeML OpenRAIL-M (its use restrictions apply), pinned at revision `451f4fe16113bff5a5d2269ed5ad43b0592e9a14`.
- **Files fetched:** only the fp16 UNet, text encoder and VAE, plus configs and tokenizer, into a private Hugging Face cache. No safety checker and no other variants.
- **Cache:** after the first run, `HF_HUB_OFFLINE=1` uses the cache only.

## Observed trial (Apple M2, 8 GB, 2026-11-01)

**Measurements:**
- **Install:** the environment is 1.0 GB. The first pip run hit its 15-minute bound after caching the 138.6 MB torch wheel; one retry with a longer bound completed.
- **Weights:** 2.0 GB, downloaded in 43.7 s.
- **Generation:** 512 × 512, 25 DPM-Solver steps on MPS, 24–31 s per image.
- **Memory:** process peak RSS 549 MiB, not counting GPU memory. Swap in use grew from 6.8 GB to 9.4 GB during the first run.
- **Disk:** free space stayed at 14 GiB or more.

**Results:**
- **Technical:** passed. Each composite kept every fully opaque product pixel unchanged (0 changed: 173,392 and 355,923 pixels), at native scale and about 0.68 fill.
- **Aesthetic:** rejected for the clean catalogue standard. Of the four candidates, seeds 20261101 to 20261104:
  - a concrete wall with tie-holes and a wood floor;
  - a grey sweep with umbrella lights and stands;
  - a dark grey with a purple cast and coloured specks;
  - a strongly non-uniform image (mean RGB 123/118/64), despite a literal prompt.
- This small model does not produce a clean blank pale background reliably, so it is unsuitable for this task.

**Deliverable instead (no AI):** the same compositing step over a deterministic flat `#f0f0f0` background. That is the approved grey-card look (decision 0023), with exact original alpha and unchanged product pixels.

## Boundaries

- **Local only:** product files never leave the Mac, and no paid API is used.
- **n8n:** n8n Cloud cannot reach this Mac. Any batch is an operator-run local command; it is not automated.
- **Delivery:** any rights-cleared output goes only through the existing approval-bound upload function, and n8n's manual delivery check.
- **Not added:** no endpoint, tunnel, new role, schedule or worker.
- **Rights:** official packshots stay private evaluation without the brand's written permission.
