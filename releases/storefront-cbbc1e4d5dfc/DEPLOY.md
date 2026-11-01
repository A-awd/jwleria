# Operator package — source commit cbbc1e4d5dfc (phone size hints, full-size links; decision 0021)

This is a Worker-only release. It makes no database, mapping, grant, asset, cache-rule or route change. It changes:
- each photograph's phone size hint, which follows the compact frame;
- an inline link under each photograph to its largest approved file.

| Step | Who | What |
|---|---|---|
| 1 | Codex | Upload this Worker exactly as built, with the runtime and bindings unchanged, then smoke-check it. |
| 2 | Codex | Public phone-width check in Arabic and English. |

## 1. Worker upload (Codex)

**Files:**
- 77 compiled files under `dist-cloudflare/`. The file set is the same as `storefront-061cff21583e`, except for hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `e78d1ea4305af4bdc11af2bff427bc2dd8c72601cbbf25c3338c248d2aea7b4e`.
- Secret scan: no keys, project identifiers, private paths or session links. The one match is the adapter's key-format check (`startsWith("sb_publishable_")`), which is source text that the live package also carries.

**Runtime.** Keep the existing runtime secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (names only), and every binding as they are. `--keep-vars` keeps them.

```
cd releases/storefront-cbbc1e4d5dfc
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP):**
- The Arabic and English home, catalogue and product pages return 200.
- **`/ar/products/rolex-m126200-0006-1765d475/`:**
  - both gallery images end their `sizes` with `calc(28.4vh)`, no longer `86vw`;
  - each caption has a "فتح بالحجم الكامل (1588 × 1676 بكسل)" link to its 1588w file.
- **`/en/products/rolex-m126234-0015-e45f1880/`:**
  - its `sizes` ends with `calc(40vh)`;
  - its caption links "Open at full size (960 × 720 px)".
- **A page without its own photograph:** the representative thumbnail's `sizes` is `5.5rem`.
- `noindex, nofollow` and robots `Disallow: /` are kept.

## 2. Public check (Codex)

**At 390×844, in Arabic and English, on `m126234-0015` and `m126200-0006`:**
- the compact layout keeps the size, dial and bracelet controls on screen with the photograph;
- the full-size link is in the caption line and opens the approved file;
- Back returns to the product;
- no overflow;
- a vertical scroll from the photograph's centre still moves the document.

**Optional (network panel):** on a 3× phone emulation, `m126200-0006` requests its 960w files, not the 1588w ones.

**Not covered:** a physical iPhone swipe.

**Not certified:** the `m126200-0006` cutout's dark retained pixels along the case's left flank. That is a flagged limitation awaiting a reviewed decision under decision 0015 (decision 0021).

## Build provenance

- Built from a clean clone of `cbbc1e4d5dfccd8fdab961f67aecec6dbcc4e2f4` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only). The clone was deleted after the build.
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.

**Tests:**
- **At `de90e231a19e`** (the size hints and the quality gate):
  - storefront: 201 tests, 196 pass, 0 fail, 5 opt-in skips (Playwright is not installed, so those were not run);
  - intake: 130 of 130;
  - type check: only the 7 existing Deno-function errors.
- **At `cbbc1e4d5dfc`** (the full-size link only):
  - the targeted `tests/product-interaction.test.mjs` and `tests/responsive-product.test.mjs` pass, 17 of 17;
  - type check: only the 7 existing errors;
  - the package build passes.

## Rollback

`npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`.
- The previous Worker (`061cff21583e`) works with the current database unchanged.
- Never go below `fbf04b80a181` while the titled credit is public.
