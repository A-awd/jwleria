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

- Each derivative takes the highest quality of the fixed ladder 92, 90, 88, 85, 82, 80, 78, 75 whose bytes fit its byte budget and whose fidelity is at or above the minimum floor.
- What is canonical and what is a default. Only the card budget is canonical: "about 80–150KB per normal card derivative, with a reviewed exception rather than destructive compression where details suffer" (`docs/STOREFRONT-PERFORMANCE-2026-10-21.md` line 37), applied here as 150,000 bytes per card size (320/640/960). The 600,000-byte budget for a detail-only file (wider than 960 px) and the SSIM 0.97 floor below are implementation defaults chosen by the implementation owner (decision 0010); no approved decision sets them.
- A budget or floor is never waived silently, by a flag or by default. The canonical text's "reviewed exception" is recorded instead (below).
- The deployed storefront puts every variant of at most 960 px into the card `srcset`, so when the detail width is also a card width (a source of at most 960 px), the one shared file carries the card budget.
- Minimum fidelity floor for every file: luma SSIM >= 0.97 against an in-memory Lanczos3 resize of the same pipeline at the same width (never written), so that no file is destructively compressed. SSIM is mean luma (BT.601) SSIM with an 11x11 Gaussian window, sigma 1.5; RGB PSNR is recorded too. Both are implemented in `image-fidelity.mjs` on decoded pixels.
- Detail target, a recorded preference only: SSIM >= 0.985 at quality >= 85 for a file that serves the detail view. `detail_target_met` records it for the visual comparison; it never blocks a file and no approval depends on it. No decision sets a numeric fidelity threshold.
- When no ladder step meets budget and floor, the helper keeps the top step, marks it `over_budget` and/or `fidelity_floor_met: false` and sets `performance_review_required`. Such a file is approved only through a reviewed exception record.
- Reviewed exception record. An independent reviewer, never the batch writer, writes a JSON file `{reviewer, reviewed_at, independent_of_batch_writer: true, basis, exceptions: [{asset_sha256, width, sha256, bytes, accepted, reason}]}`, where `accepted` lists `byte_budget` and/or `fidelity_floor`. `media-run.mjs bundle` reads it only when the input names it (`performance_exception_file`, an absolute path outside the output directory the tooling writes, compared with every symlink of both paths resolved). It refuses the record when:
  - the input does not name the batch writer (`prepared_by`), or the reviewer is that writer (a self-granted record);
  - `independent_of_batch_writer` is not literally `true`;
  - any flagged derivative lacks an entry that matches its original, width, sha256, bytes and exactly its failed checks;
  - an entry names a derivative that needs no exception, or one outside the bundle.

  The name check and `independent_of_batch_writer` are what the code can see. Both come from the runner input, so they catch a record that names its own writer, but they cannot prove independence: the reviewer's independence is a procedural guarantee (who writes the file), not a technical one.

  The tooling never writes such a record. With none named, no exception applies. The old `performance_review_accepted` input flag is refused. The accepted entries are copied into the approval bundle (`performance_exception`). The record approves the measured file as it is; it does not choose another ladder step.
- Lossy WebP is used only after a visual comparison: every manifest says `visual_comparison_required: true`. The helper cannot do that comparison; an independent reviewer records it per derivative before any approval.
- Every encoder option is pinned (`preset: photo`, `effort: 6`, `smartSubsample: true`, `smartDeblock: false`, `alphaQuality: 100`, no near-lossless), so the same input gives byte-identical output; a test proves it.
- Transparent inputs (an original with alpha, or a checked cutout master under decision 0015) keep their alpha. `alphaQuality: 100` encodes it losslessly; each file records `alpha_max_delta` against its reference, and anything above 0 needs review. Fidelity is measured with transparent pixels flattened on the storefront's product frame colour (`--sand`, `#f1ede6`), where visitors see them. Flattening changes nothing in an opaque image, so opaque inputs give the same bytes and numbers as before.
- Lossy WebP stores colour as 4:2:0 YUV, as every lossy WebP does; no colour adjustment is made. Embedded ICC profiles are kept; EXIF/GPS are not copied.

Files use immutable paths:

```text
v1/<binding-sha256>/<original-sha256>/<actual-width>w-<output-sha256>.webp
```

Repeating identical work verifies/reuses identical files. An existing output with different bytes is rejected.

The private manifest contains:

- `schema_version: 3`, `purpose`, `publication_state: private-prepared`, `image_verification_state: pending`.
- `binding`: exact source/candidate/revision, permission reference, source asset URL and checksum.
- `original`: original local path, format, raw dimensions, original EXIF `orientation`, upright `visual_width`/`visual_height`, byte length and checksum.
- `processing`: engine/version, kernel, `webp_lossless: false`, the pinned `webp_encoder` options, `webp_quality_ladder`, `byte_budgets`, `fidelity_floor`, `detail_target`, the `selection` rule, the fidelity metric, `orientation_applied`, `orientation_normalized` and explicit transformation/metadata behavior.
- `variants` and `detail`: private relative path, MIME type, actual width/height/bytes/checksum, `roles` (`card`, `detail` or both), `webp_quality`, `ssim_luma`, `psnr_rgb_db` (null means identical pixels), `budget_limit_bytes`, `over_budget`, `ssim_floor`, `fidelity_floor_met`, `detail_target_met` (null for a card-only file) and `ladder_measured` (bytes and fidelity of every step tried).
- `performance_review_required`: true if any derivative exceeds its budget or misses the fidelity floor.
- `visual_comparison_required`: always true for lossy output.

These are preparation measurements, not release approval: a file that needs a performance review cannot be approved without an exact entry in an independent reviewed exception record, and every derivative still needs its recorded visual comparison.

## Promotion and public integration boundary

No public URLs are assigned here. A separate, authorized promotion step must reject any manifest whose `purpose` is not exactly `catalog`; in particular, `test-editorial` must never be promoted into product media. It must also verify current grant/revision, actual image identity/visual review, manifest checksums and performance flags before upload/publication.

After approved upload, map the detail file to the canonical `src` already in public `images[]`, and map each derivative to its actual public URL. The deployed per-gallery public contract is:

```text
{src, width, height, variants: [{src, width, height, bytes}]}
```

Include the canonical detail derivative among the mapped `variants` as well. For an original narrower than 320px, this detail file is the sole mapped variant, and its actual width is necessarily at most 960px. Never invent a 320px or larger variant or use the source original's dimensions to describe the canonical derivative. Do not forward private binding, grant, source URL, local path or checksum provenance into the public metadata contract. Parent integration owns schema, approval equality checks, publication and UI `srcset`/`sizes`.

## Verification

The focused tests create synthetic/editorial pixels labelled TEST ONLY in temporary local directories, verify actual outputs and original preservation, reject grant/identity/checksum mismatches, prove no upscaling, prove byte-identical output for the same input, reproduce the recorded SSIM/PSNR by re-running the same resize and decode on the written files (this uses the same metric code), check the metric code itself against a fixed known-value vector computed by a separate numpy implementation, check that the shared 960px card/detail file carries the card budget, and prove with noisy test data that each file takes the highest step within budget and floor, or keeps the top step and is flagged. An orientation-6 JPEG test independently checks its upright dimensions and four known corner colors, and confirms the original checksum is unchanged. Temporary files are deleted. These tests prove preparation behavior; they are not a real product media review, promotion or live-page acceptance.

`media-review-records.test.mjs` proves the exception record path: a flagged derivative is refused with no record, with the old flag, with a record inside the output directory, self-granted, without `independent_of_batch_writer: true`, with a wrong byte count, with a missing, extra or stray entry, and is accepted with the exact record.

```sh
node --test scripts/catalog-intake/responsive-media.test.mjs scripts/catalog-intake/media-review-records.test.mjs
```
