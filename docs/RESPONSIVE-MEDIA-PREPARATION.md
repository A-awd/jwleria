# Private responsive media preparation

`scripts/catalog-intake/responsive-media.mjs` prepares derivatives from an explicitly permitted **local** image. It never downloads, uploads, approves or publishes media. The owner currently has no approved product-photo source; no actual catalog photograph has been processed by this work.

Run with the existing storefront dependencies installed:

```sh
node scripts/catalog-intake/responsive-media.mjs /absolute/private/input.json
```

The helper reuses the image engine already locked with Astro. It does not install packages. Validated with Sharp 0.35.5 / libvips 8.18.7.

## Private input contract

Store the input, outputs and manifest outside the public repository and web root. Before creating any output directory, the helper resolves the nearest existing ancestor and all symlinks, and rejects destinations inside this repository or known system/home web roots (including `~/Sites`, macOS WebServer, common nginx/Apache `www` roots). Generated child paths cannot escape the resolved private root through symlinks; existing symlink output files are rejected. Private temporary directories remain supported. The input requires:

- `purpose`: `catalog` or `test-editorial`; tests use only the latter.
- `output_directory`: an absolute private local directory.
- `source`: `id`, exact `origin`, `publication_allowed: true`, `media_permission_reference`, and `media_origins` allowlist.
- `candidate`: `candidate_id` and `revision_hash` SHA-256 values, matching `source_id`, HTTPS `source_url` on the source origin, and exact `image_urls` array.
- `asset`: absolute local `path`, exact HTTPS `source_url` present in the candidate image list and allowed media origin, and expected original-byte `sha256`.
- `grant`: matching `media_permission_reference`, `source_id`, `candidate_id`, `revision_hash`, `asset_source_url`, `asset_sha256`; explicit `website_publication`, `resize`, and `webp_encode` permissions must each be `true`.

These checks match a supplied grant record to this asset/revision; they do not establish the legal validity of a grant. Missing or mismatched permissions fail before transformation. Do not supply invented grant records.

## Generated files

The original remains unchanged. Supported single-frame, 8-bit sRGB originals are resized without cropping, enlargement or color adjustments. Normal phone EXIF orientation is honored during decoding before resizing, so derivatives appear upright; this requires no additional permission gate. The untouched original retains its original EXIF and bytes. Embedded ICC profiles are retained in derivatives; EXIF/GPS metadata is not copied. Unsupported color space/depth inputs are rejected as technical limitations.

The helper generates 320, 640 and 960 pixel-wide WebP files only when the upright visual image is wide enough, plus a detail derivative at that visual width or 1600 pixels, whichever is smaller. Upright images narrower than 320px produce only the detail derivative. Every generated image must fit the public manifest limit of 4096px width and 8192px height; unsuitable geometry is rejected rather than silently cropped or enlarged. Resizing uses Lanczos3. It decodes every result to verify actual dimensions and records its actual byte length and SHA-256.

Encoding is lossy WebP with a measured, deterministic quality search (decision 0009, delivery addendum of 27 October 2026):

- Each derivative takes the highest quality of the fixed ladder 92, 90, 88, 85, 82, 80, 78, 75 whose bytes fit its budget and whose fidelity meets its floor.
- Budgets: 150 KiB for a card size (320/640/960), 600 KiB for the detail file. Floors: card luma SSIM >= 0.97; detail luma SSIM >= 0.985 and quality >= 85, because zoom must retain source detail.
- When the detail width equals a card width (for example a 960px source), it is one shared file and must meet both: 150 KiB, SSIM >= 0.985, quality >= 85.
- Fidelity is measured against an in-memory Lanczos3 resize of the same pipeline at the same width (never written): mean luma (BT.601) SSIM with an 11x11 Gaussian window, sigma 1.5, plus RGB PSNR, implemented in `image-fidelity.mjs` on decoded pixels.
- When no ladder step meets both budget and floor, the helper keeps the smallest file that still meets the floor (or the top step when none does), marks it `over_budget` and/or `fidelity_floor_met: false`, and sets `performance_review_required`. It never lowers quality below a floor and never waives the budget.
- Every encoder option is pinned (`preset: photo`, `effort: 6`, `smartSubsample: true`, `smartDeblock: false`, `alphaQuality: 100`, no near-lossless), so the same input gives byte-identical output; a test proves it.
- Lossy WebP stores colour as 4:2:0 YUV, as every lossy WebP does; no colour adjustment is made. Embedded ICC profiles are kept; EXIF/GPS are not copied.

Files use immutable paths:

```text
v1/<binding-sha256>/<original-sha256>/<actual-width>w-<output-sha256>.webp
```

Repeating identical work verifies/reuses identical files. An existing output with different bytes is rejected.

The private manifest contains:

- `schema_version: 1`, `purpose`, `publication_state: private-prepared`, `image_verification_state: pending`.
- `binding`: exact source/candidate/revision, permission reference, source asset URL and checksum.
- `original`: original local path, format, raw dimensions, original EXIF `orientation`, upright `visual_width`/`visual_height`, byte length and checksum.
- `processing`: engine/version, kernel, `webp_lossless: false`, the pinned `webp_encoder` options, `webp_quality_ladder`, `byte_budgets`, `fidelity_floors`, the fidelity metric, `orientation_applied`, `orientation_normalized` and explicit transformation/metadata behavior.
- `variants` and `detail`: private relative path, MIME type, actual width/height/bytes/checksum, `roles` (`card`, `detail` or both), `webp_quality`, `ssim_luma`, `psnr_rgb_db` (null means identical pixels), `budget_limit_bytes`, `over_budget`, `ssim_floor`, `min_quality`, `fidelity_floor_met` and `ladder_measured` (bytes and fidelity of every step tried).
- `performance_review_required`: true if any derivative exceeds its budget or misses its fidelity floor.

The manifest `schema_version` is 2. These are preparation measurements, not release approval: a file that needs a performance review stays out of an approval until a reviewed exception exists.

## Promotion and public integration boundary

No public URLs are assigned here. A separate, authorized promotion step must reject any manifest whose `purpose` is not exactly `catalog`; in particular, `test-editorial` must never be promoted into product media. It must also verify current grant/revision, actual image identity/visual review, manifest checksums and performance flags before upload/publication.

After approved upload, map the detail file to the canonical `src` already in public `images[]`, and map each derivative to its actual public URL. The deployed per-gallery public contract is:

```text
{src, width, height, variants: [{src, width, height, bytes}]}
```

Include the canonical detail derivative among the mapped `variants` as well. For an original narrower than 320px, this detail file is the sole mapped variant, and its actual width is necessarily at most 960px. Never invent a 320px or larger variant or use the source original's dimensions to describe the canonical derivative. Do not forward private binding, grant, source URL, local path or checksum provenance into the public metadata contract. Parent integration owns schema, approval equality checks, publication and UI `srcset`/`sizes`.

## Verification

The focused tests create synthetic/editorial pixels labelled TEST ONLY in temporary local directories, verify actual outputs and original preservation, reject grant/identity/checksum mismatches, prove no upscaling, prove byte-identical output for the same input, recompute the recorded SSIM/PSNR independently from the files, check the shared 960px card/detail file against both budgets and floors, and prove with noisy test data that a file failing its budget or floor is flagged without going below the floor. An orientation-6 JPEG test independently checks its upright dimensions and four known corner colors, and confirms the original checksum is unchanged. Temporary files are deleted. These tests prove preparation behavior; they are not a real product media review, promotion or live-page acceptance.

```sh
node --test scripts/catalog-intake/responsive-media.test.mjs
```
