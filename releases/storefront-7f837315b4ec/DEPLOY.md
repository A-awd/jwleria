# Operator package — source commit 7f837315b4ec (touch-safe gallery, honest photo states, fast choices; decision 0019)

This is a Worker-only release. It makes no database, mapping, grant or asset change. It adds one route, the variant fragment `/{locale}/products/{slug}/variant/`, which the public page cache shares under its existing freshness rules.

| Step | Who | What |
|---|---|---|
| 1 | Codex | Upload this Worker exactly as built, with the runtime and bindings unchanged, then smoke-check it. |
| 2 | Codex | Public phone-width acceptance in Arabic and English. The physical iPhone swipe stays owner-observed. |

## 1. Worker upload (Codex)

**Done on 2026-11-01** (producer-reported by Codex): verified against `SHA256SUMS` and uploaded. The new version is active at 100%, and the runtime and all three bindings, both secrets included, are byte-equal before and after. The provider identifiers are held privately.

**Files:**
- 77 compiled files under `dist-cloudflare/`. The file set is that of `storefront-13acacfb79d6` plus four new files:
  - the product page's client module;
  - `ProductArticle`;
  - `ImageCredit`;
  - the `variant` route.
- `SHA256SUMS` has one line per file. Its own sha256 is `604520ecb031e6baea60cf17f9ff7eeb0c5329e668018c9ca1a976cc7fee0fd1`.
- Secret scan: no keys, project identifiers, private paths or session links. The one match is the adapter's key-format check (`startsWith("sb_publishable_")`), which is source text that the live package also carries.

**Runtime.** Keep the existing runtime secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (names only), and every binding as they are. `--keep-vars` keeps them.

```
cd releases/storefront-7f837315b4ec
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP):**
- The Arabic and English home, catalogue and product pages return 200.
- **The fragment.** `/ar/products/rolex-m126234-0015-e45f1880/variant/` returns 200 as `text/html`, with `X-Robots-Tag: noindex, nofollow`, and begins with `<article`. An unknown slug's `/variant/` returns 404.
- **The gallery modes:**
  - `/ar/products/rolex-m126234-0015-e45f1880/` is a single gallery, without `pdp__gallery--many`.
  - `/ar/products/rolex-m126200-0006-1765d475/` has `pdp__gallery--many`.
  - `/ar/products/rolex-m126334-0028-fa91ccba/` shows the "no approved photograph" panel and a small `m126234-0015 (36 مم · أسود لامع)` photograph.
- `noindex, nofollow` and robots `Disallow: /` are kept.

## 2. Public acceptance (Codex)

**Done on 2026-11-01** (visitor-verified by Codex on the public site at 390×844, with native browser scrolling; not a finger swipe). Passed:
- the centre scroll on `m126234-0015` and `m126200-0006`;
- Mint green at 36 mm, with the missing-photograph panel and the small, labelled representative;
- Back and Forward;
- English 36 → 41 mm, keeping Mint green;
- no overflow.

Not covered: the physical iPhone swipe, and the LOEWE item of this list. `STATE.md` labels each check.

At 390 px, in Arabic and English:
- **Scrolling:** native scroll that starts at the centre of the photograph moves the document, on a one-photograph page and on `m126200-0006`.
- **A choice:**
  - the selected value, the reference and the gallery's state change at once;
  - Mint green on a size without its own photograph shows the "no approved photograph" panel and the small, labelled representative;
  - the size is kept, the list closes and nothing jumps.
- **History:** Back and Forward show the variant of each restored address.
- **LOEWE Amazona** sizes and colours, with no horizontal overflow.
- **Not covered here:** a physical iPhone swipe in Safari is owner-observed.

## Build provenance

- Built from a clean clone of `7f837315b4ec00fedb1369cb07a10c9409a9d4ed` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only). The clone was deleted after the build.
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.

**Tests at the source commit:**
- Storefront: 199 tests, 194 pass, 0 fail, 5 opt-in skips. Playwright is not installed, so those 5 were not run.
- Intake: unchanged since `13acacfb79d6` (126 of 126), so not run again.
- Type check: only the 7 existing Deno-function errors.

**Local preview** (Codex's in-app browser at 390×844, against the live catalogue, read-only; native scrolling, not iPhone touch):
- **Scroll from the image centre:**
  - single gallery: `overflow` visible and no snap; the document moved 0 → 422, where the live page stayed at 0;
  - two-photograph `m126200-0006`: the document moved 0 → 422 and the gallery stayed at 0.
- **A choice.** Mint green from `m126234-0015` opened `m126234-0051` at 36 mm:
  - the list closed;
  - the gallery said that no approved photograph exists and showed a 104×130 thumbnail captioned 36 mm, black.
- **History.** Back restored `m126234-0015` with its own photograph, and Forward restored `m126234-0051`. URL, title and reference were correct.

## Rollback

`npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`.
- The previous Worker (`13acacfb79d6`) works with the current database unchanged. Its pages never request `/variant/`.
- Never go below `fbf04b80a181` while the titled credit is public.
