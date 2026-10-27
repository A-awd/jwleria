# Prebuilt storefront release — source commit fbf04b80a181

**Where the compiled files are:**
- Branch `claude/admiring-dirac-nfavfx`, in the directory `releases/storefront-fbf04b80a181/` (added by the commit after `fbf04b80a181d00e731bd7eee808d0ba52eb0`, or any later commit).
- 74 compiled files under `dist-cloudflare/`.
- `SHA256SUMS` lists one sha256 per compiled file. The sha256 of `SHA256SUMS` itself is `e147b36bdcf79e1518bee3cba8df53dbc2de2d5b74880c892859f64c7fad4bb4`.
- The upload command below uploads these files as they are. It does **not** run a build.
- Secret scan: the package contains no keys, tokens, project identifiers or service credentials. Runtime secrets stay on the Worker.

**What changes for visitors compared with the live release (source `2a1864b`):**
- Copy: brand summaries no longer imply stock or availability ("in the brand directory"; "Ask about the details on WhatsApp"). The home and "latest" leads no longer credit brand houses with preview pieces. One spelling, "inquiry", is used. The internal `concierge` id is renamed.
- Product photos (only images that carry approved responsive variants) are shown whole in the 4:5 frame (`object-fit: contain`), with no hover crop. Editorial and hero imagery is unchanged. There are no product photos live yet, so this is invisible until media is published.
- Image credits accept an optional `title`, rendered as «Title» in Arabic and “Title” in English. Old five-field credits still render.
- No change to routes, bindings, variables, caching rules, `noindex, nofollow`, robots `Disallow: /` or the pending contact state.

**Why this release matters for media:** the live release rejects any credit with a `title` key, and one such row would fail its product page and every listing that includes it (runbook RL-3). This release must be live **before** any titled credit is published (step f of the private m126234-0015 bundle).

**Safe with the database as it is (7 migrations, models and open-licence migrations unapplied): yes.** It reads `jwl_catalog` and `jwl_brand_page` exactly as the live release does, with the same exact fallbacks.

**Build provenance:** built by the cloud session from a clean tree at `fbf04b80a181` with `pnpm build:cloudflare` (Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 22.22.0, pnpm 10.28.0). `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset. Tests at the merged commit: storefront 155 tests, 152 pass, 0 fail, 3 opt-in browser tests skipped; intake 117 of 117 pass. Do not rebuild. Deploy exactly these files.

- Target: the existing Worker `jwleria-storefront`, `compatibility_date` 2026-10-04, flags `nodejs_compat` and `global_fetch_strictly_public`, assets binding `ASSETS`. The generated config declares no routes, no vars and no new bindings.
- `configPath` and `userConfigPath` inside `wrangler.json` record the build machine's paths. They are metadata only and are left untouched so the checksums stay exact.

## Upload-only steps

From a checkout of a commit that contains this directory:

```
cd releases/storefront-fbf04b80a181
sha256sum -c SHA256SUMS                      # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json
```

## Smoke check after upload

On a phone width (360/390/430 CSS px):
- These return 200 with the same visual identity: `https://jwleria.com/ar/`, `/en/catalog/`, `/en/brands/rolex/`, `/ar/products/rolex-m126234-0015-e45f1880/`, `/en/products/rolex-m126200-0006-1765d475/`.
- Search uses the form's `q` parameter: `/en/catalog/?q=m126234-0015` and `/ar/catalog/?q=m126234-0015` each show exactly one piece, linking to `/…/products/rolex-m126234-0015-e45f1880/`.
- A brand page lead reads "… in the brand directory." (English) and "… مدرجة في دليل العلامات." (Arabic) for a directory brand, and "… Ask about the details on WhatsApp." for Rolex.
- The page source has `noindex, nofollow`; `/robots.txt` has `Disallow: /`.
- No horizontal overflow.
- Record `X-JWL-Cache` values exactly as observed (MISS, HIT, STALE). Do not report HIT or STALE unless they were seen. `Cache-Control: public, max-age=0, must-revalidate`.

## Rollback

```
npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront
```

The previous release reads the same tables, so the rollback is valid at any database state reached before a titled credit is published. After a titled credit is published, revoke its grant first (bundle rollback step 1), then roll back the Worker.
