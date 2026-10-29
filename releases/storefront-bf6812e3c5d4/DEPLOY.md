# Prebuilt storefront release — source commit bf6812e3c5d4

**Where the compiled files are:**
- Branch `claude/admiring-dirac-nfavfx`, in the directory `releases/storefront-bf6812e3c5d4/` (added by the commit after `bf6812e3c5d4076e330c2a20468526b5b53fc9e8`, or any later commit).
- 73 compiled files under `dist-cloudflare/`. The previous release had 74. The difference is one server chunk: `variant-selection` is now bundled into the chunks that use it, because the i18n module no longer imports it. No asset or route is missing.
- `SHA256SUMS` lists one sha256 per compiled file. The sha256 of `SHA256SUMS` itself is `584e470e72de3e69a48d1974b0cbd8fcebf1771b9d167987d765b7d20dce7491`.
- The upload command below uploads these files as they are. It does **not** run a build.
- Secret scan: the package contains no keys, tokens, project identifiers, service credentials or local account paths. Runtime secrets stay on the Worker.

**What changes for visitors compared with the live release (source `fbf04b80a181`), per decision 0014:**
- Listing cards (home, catalogue and search, category, brand and related products) show only the real photograph when one exists, its required credit (unchanged), the brand and the product name. These are no longer rendered on cards: the collection, the summary, the reference line, the option counts ("13 dials · 2 bracelets"), the preview badge and the card inquiry button. The card links to the product page exactly as before.
- On product pages, the repeated summary sentence and the definition list are replaced by short labelled paragraphs in modest groups: identification (reference, collection, category); design and materials; technical details (movement, calibre, power reserve, water resistance); and other details. A group with no facts is not shown. A fact that only the generated summary stated (for example a Prada buckle's finish or "Belt included") is still shown. A fact a spec already states is not repeated. The meta description still uses the summary.
- Unchanged: the product-page inquiry action and its pending state, variant controls and exact selected variants, old variant URLs, the photograph and its full credit, search, data, routes, bindings, variables, caching rules, `noindex, nofollow`, robots `Disallow: /`, the El Messiri / light-palette identity.
- No trial or edited image is included; no media, database or provider change is part of this release.

**Safe with the database as it is (9 migrations, models and one-photo open-licence lane applied): yes.** It reads the same relations and RPCs as `fbf04b80a181`, and it keeps the titled-credit support.

**Build provenance:** built by the local interactive Claude Code session from a clean local clone of `bf6812e3c5d4` at a neutral path (`/Users/Shared/jwleria`; it appears in compiled metadata only). The command was the package script `build:cloudflare` (`JWL_DEPLOY_TARGET=cloudflare astro build`), run through the pinned local binaries from the frozen-lockfile install: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3 and Wrangler 4.147.0. Node was 24.14.1; the previous release used 22.22.0, and the package pins no engine. `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset. Tests at the source commit: storefront 158 tests, 153 pass, 0 fail, 5 opt-in skips (browser and preview checks). A local rendered-HTML check passed in Arabic and English, using the built node server against the synthetic PGlite catalogue through a mock PostgREST with no network access. Do not rebuild. Deploy exactly these files.

- Target: the existing Worker `jwleria-storefront`, `compatibility_date` 2026-10-04, flags `nodejs_compat` and `global_fetch_strictly_public`, assets binding `ASSETS`. The generated config declares no routes, no vars and no new bindings.
- `configPath` and `userConfigPath` inside `wrangler.json` record the build path. They are metadata only and are left untouched so the checksums stay exact.

## Upload-only steps

From a checkout of a commit that contains this directory:

```
cd releases/storefront-bf6812e3c5d4
shasum -a 256 -c SHA256SUMS                  # or sha256sum -c; every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

The three flags are the operator's verified safeguards, checked against `wrangler deploy --help` for 4.147.0:
- `--no-bundle` uploads the compiled files as they are, with no Wrangler build step.
- `--keep-vars` keeps the Worker's existing vars. Without it, Wrangler deletes every var not in the generated config, and that config declares none.
- `--no-autoconfig` turns off framework detection and automatic configuration, which is on by default.

## Smoke check after upload

On a phone width (360/390/430 CSS px), in Arabic and English:
- `/ar/categories/watches/`, `/en/brands/jaeger-lecoultre/` and `/en/catalog/`: each card shows only the brand and the name, plus the photograph and its credit where one exists. There is no reference line, no summary, no option count and no card button.
- `/ar/products/jaeger-lecoultre-q3926480/` and `/en/products/jaeger-lecoultre-q3926480/`: the identification paragraphs show reference Q3926480, collection Reverso Tribute and the category. The technical group shows calibre 847 and manual winding. There is no summary sentence above the options, and the inquiry button is unchanged.
- `/ar/products/rolex-m126234-0015-e45f1880/` and `/en/…`: the whole photo, with its full credit «Rolex Datejust 36 - Up High» — Ajay Suresh · CC BY 2.0 · source · changes, on the page and on its search card for `q=m126234-0015`. Dial "Bright black" and the Jubilee bracelet are selected, and choosing another option shows that variant.
- `/en/products/prada-2cf025-uqi-f0c4f/`: the design group shows Material, Belt included and Finish.
- The page source has `noindex, nofollow`; `/robots.txt` has `Disallow: /`. No horizontal overflow.
- Record `X-JWL-Cache` values exactly as observed (MISS, HIT, STALE). Do not report HIT or STALE unless they were seen.

## Rollback

```
npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront
```

The rollback target is the `fbf04b80a181` version, which reads the same relations and renders titled credits. Do **not** roll back below `fbf04b80a181` while the titled credit on m126234-0015 is public. If an older release is ever required, revoke the grant first (private bundle rollback step 90).
