# Operator package — source commit 061cff21583e (compact phone product page, decision 0020)

This is a Worker-only release. It makes no database, mapping, grant or asset change and adds no route. The `/variant/` fragment of decision 0019 is unchanged.

| Step | Who | What |
|---|---|---|
| 1 | Codex | Upload this Worker exactly as built, with the runtime and bindings unchanged, then smoke-check it. |
| 2 | Codex | Public phone-width acceptance in Arabic and English. The physical iPhone swipe stays owner-observed. |

## 1. Worker upload (Codex)

**Done on 2026-11-01** (producer-reported by Codex): verified against `SHA256SUMS` and uploaded. The new version is active at 100%, and the runtime and all three bindings, secrets included, are unchanged. The provider identifiers are held privately.

**Files:**
- 77 compiled files under `dist-cloudflare/`. The file set is the same as `storefront-7f837315b4ec`, except for hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `fd45c603f76f4ab68d50e30d6c4badb14f50cce5814bc5241c73e79dbd9c38ce`.
- Secret scan: no keys, project identifiers, private paths or session links. The one match is the adapter's key-format check (`startsWith("sb_publishable_")`), which is source text that the live package also carries.

**Runtime.** Keep the existing runtime secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (names only), and every binding as they are. `--keep-vars` keeps them.

```
cd releases/storefront-061cff21583e
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP):**
- The Arabic and English home, catalogue and product pages return 200.
- **Product page.** In `/ar/products/rolex-m126234-0015-e45f1880/`, the product block reads in this order: brand, name and reference; the photograph; the options; the inquiry action; the details.
- **Stylesheet.** It carries `clamp(10rem,30svh,20rem)` for the phone photograph frame.
- **Fragment.** `/ar/products/rolex-m126234-0015-e45f1880/variant/` still returns 200 with `X-Robots-Tag: noindex, nofollow`.
- **Indexing.** `noindex, nofollow` and robots `Disallow: /` are kept.

## 2. Public acceptance (Codex)

**Done on 2026-11-01** (visitor-verified by Codex on the public site; layout and interaction only, never a multi-colour photograph demonstration):
- **Arabic, 390×844, `m126234-0015`:** a 253.19 px frame, with the controls ending at 642.23, 705.83 and 769.42.
- **English, 390×844:** the controls end at 680.52, 744.11 and 807.70.
- **English, 390×667:** green → black restored the variant's own photograph (77.11–277.20) together with the dial (464.02–514.02).

**At 390×844, in Arabic and English, on the photographed `rolex-m126234-0015-e45f1880`, from the top of the page.** Do not use `m126334-0018` for this check: it has no photograph of its own, so it is not a gallery example.
- the brand, name and reference, the photograph, and the size, dial and bracelet controls are all on screen together (the bracelet's bottom at or above 844);
- the photograph is whole and uncropped, with its credit or caption kept.

**After choosing a dial from its list:**
- the photograph and the dial control are on screen together;
- the size is kept;
- the list closes.

**On a short screen (for example 390×667):** the chosen variant's photograph, or its "no approved photograph" note, fits on screen together with the control that was used.

**Unchanged and to confirm:**
- native scrolling from the photograph's centre still moves the document;
- Back and Forward restore each variant;
- the specifications and the sizes table are in their disclosures.

**Not covered here:** a physical iPhone swipe in Safari, which is owner-observed.

**There is no multi-colour photograph example.** No model has two colourways with their own approved photographs (`STATE.md`). Do not present a "no approved photograph" colour change as photo switching.

## Build provenance

- Built from a clean clone of `061cff21583e087bb70abce2207b2af80723d4ea` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only). The clone was deleted after the build.
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.

**Tests:**
- **At `f31a667bd382`** (the compact layout):
  - storefront: 200 tests, 195 pass, 0 fail, 5 opt-in skips (Playwright is not installed, so those were not run);
  - type check: only the 7 existing Deno-function errors.
- **At `061cff21583e`** (the frame change only): the targeted `tests/product-interaction.test.mjs` passes 13 of 13, and the build passes.

## Rollback

`npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`.
- The previous Worker (`7f837315b4ec`) works with the current database unchanged.
- Never go below `fbf04b80a181` while the titled credit is public.
