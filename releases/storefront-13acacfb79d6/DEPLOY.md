# Operator package — source commit 13acacfb79d6 (coherent mobile product page, decision 0018)

This is a Worker-only release. It makes no database, mapping, grant or asset change, and it reads the same `jwl_product_model_v2` as the live `88e2e3cc0de9`.

| Step | Who | What |
|---|---|---|
| 1 | Codex | Upload this Worker exactly as built, with the runtime and bindings unchanged, then smoke-check it. |
| 2 | Codex | Public phone-width acceptance in Arabic and English. |

## 1. Worker upload (Codex)

**Done on 2026-11-01** (producer-reported by Codex): verified against `SHA256SUMS` and uploaded. The new version is active at 100%, and the runtime and all three bindings, both secrets included, are byte-equal before and after. The version identifiers are held privately.

**Files:**
- 73 compiled files under `dist-cloudflare/`. The file set is the same as `storefront-88e2e3cc0de9`, except for hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `c3f4caef9c85fe84f17be9a1773e6f77b2bbfa943e9accddb9d887802fe49ae9`.
- Secret scan: no keys, project identifiers, private paths or session links. The one match is the adapter's key-format check (`startsWith("sb_publishable_")`), which is source text that the live package also carries.

**Runtime.** Keep the existing runtime secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (names only), and every binding as they are. `--keep-vars` keeps them.

```
cd releases/storefront-13acacfb79d6
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP):**
- The Arabic and English home, catalogue and product pages return 200.
- `/ar/products/rolex-m126334-0018-3861b734/`:
  - The size row reads 31, 36 and 41 mm, with 41 mm current.
  - The dial list offers the 7 dials made at 41 mm and lists 8 under «بمقاسات أخرى» with their sizes.
  - No value carries a note, and there is no sticky inquiry bar.
- `/ar/products/rolex-m126200-0006-1765d475/` still shows its photograph and its credit, with no options.
- `noindex, nofollow` and robots `Disallow: /` are kept.

## 2. Public acceptance (Codex)

**Done on 2026-11-01** (visitor-verified by Codex on the public site at 390×844): the Arabic 41 mm Datejust page, including the dial choice, and the English page of the same reference. The other items below were checked on the local preview before the upload, or not yet; `STATE.md` labels each.

At 390 px, in Arabic and English:
- **The Datejust 41 mm page:**
  - choose a dial: the size is kept, the list closes and focus returns;
  - choose a dial under other sizes, by its size;
  - change the size: the dial is kept where it exists, otherwise one notice names the new dial.
- **The LOEWE Amazona family:** the four bag sizes and the colour list.
- **A single product.**
- **A facts-only family**, for example `/en/products/rolex-m276200-0001-219dfd35/`: the specifications are open.

## What visitors see

The product page follows decision 0018:
- **Order.** The product leads: its image, then the brand, the name and the reference. The options follow, then one inquiry action, then the specifications, sizes and how to inquire as disclosures.
- **Size.** The size is a row of equal segments.
- **Other options.** Every other option shows its current value and opens a tidy list of only the values made at that size. A few short values are shown as segments instead.
- **Other sizes.** Values made only in other sizes are listed apart, each with its sizes as explicit links. A choice never changes the size unless it names it.
- **Coupled changes.** When a choice changes another option, one notice names it.
- **Unchanged.** URLs, the back button, canonical links, references, facts, photo credits, the representative caption and the inquiry-only copy are the same.

## Build provenance

- Built from a clean clone of `13acacfb79d6cdfd97ac02b4771c3087d7ab3d16` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only). The clone was deleted after the build.
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.

**Tests at the source commit:**
- Storefront: 186 tests, 181 pass, 0 fail, 5 opt-in skips. The two updated Playwright checks skip without Playwright, so they were not run.
- Intake: 126 of 126.
- Type check: only the 7 existing Deno-function errors.
- Local preview: the same source, built for Node, read the live catalogue (read-only) at `127.0.0.1:4391`.
  - Codex checked it at 390×844 in its in-app browser.
  - Mint green on the 41 mm page opened `m126334-0028` at 41 mm, with the reference and title updated, the list closed and focus returned.

## Rollback

`npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`.
- The previous Worker (`88e2e3cc0de9`) works with the current database unchanged.
- Never go below `fbf04b80a181` while the titled credit is public.
