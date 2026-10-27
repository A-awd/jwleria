# Prebuilt storefront release — source commit 2a1864b35fd8

**Where the compiled files are:**
- Branch `claude/admiring-dirac-nfavfx`, commit `a23c29f330f7ef5f4f9ca40fa72b272b30008a11` or any later commit, in the directory `releases/storefront-2a1864b35fd8/`.
- The directory holds 74 compiled files under `dist-cloudflare/`.
- `SHA256SUMS` is the per-file checksum manifest: one sha256 per compiled file.
- The upload command below uploads these files as they are. It does **not** run a build.
- A fresh clone of the remote branch verified all 74 entries OK.
- Secret scan: the package contains no keys, project identifiers or service credentials. Runtime secrets stay on the Worker.

**Safe with the database still at 7 migrations: yes.**
- With the models migration unapplied, the release reads `jwl_catalog` and `jwl_brand_page` exactly as the current Worker does. Its fallback triggers only when PostgREST reports the specific missing relation or function.
- A local node build of the same commit was tested against the live 7-migration catalogue on 2026-10-27, reading the live database only. These pages all returned 200 with the expected references: home, catalogue page 2, the Rolex brand page and two product pages.
- Correction (2026-10-27): the local "exact-reference search" check used the wrong parameter (`?search=`). The catalogue search form submits `q`, so that check only rendered the unfiltered catalogue and did not test search. After the upload, the live search was checked with the real parameter: `/en/catalog/?q=m126234-0015` and `/ar/catalog/?q=m126200-0006` each returned exactly one piece, linking to the matching product page. No application change was needed.
- Non-release behaviour is kept: `noindex, nofollow`, robots `Disallow: /`, and the contact state stays pending.


This is an upload-only package. The cloud session that prepared it built it from commit `2a1864b35fd8` on `claude/admiring-dirac-nfavfx`. The working tree was clean, and both test suites passed at that commit: storefront 135 pass, 0 fail, 3 opt-in browser tests skipped; intake 103 pass. Do not rebuild. Deploy exactly these files.

- Build: `pnpm build:cloudflare` (Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 22.22.0, pnpm 10.28.0). The public release variables were unset (`PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164`, `PUBLIC_SITE_ORIGIN`), matching the current live non-release preview, which is `noindex` with robots `Disallow: /`.
- Contents: `dist-cloudflare/server` holds the Worker (`entry.mjs`, `chunks/`, the generated `wrangler.json`). `dist-cloudflare/client` holds the static assets.
- Integrity: 74 files, listed in `SHA256SUMS`. The sha256 of `SHA256SUMS` itself is `b32b420468a5bab570f011c01d788b1bcb1815d5073cd5b83496eb7f77f03538`.
- Target: the existing Worker `jwleria-storefront`, `compatibility_date` 2026-10-04, flags `nodejs_compat` and `global_fetch_strictly_public`, assets binding `ASSETS`.
  - The generated config declares no routes, no vars and no new bindings.
  - Existing secrets (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`), the custom-domain attachment and other dashboard settings are not part of this upload and remain as they are.
  - `configPath` and `userConfigPath` inside `wrangler.json` record the build machine's paths. They are metadata only and are left untouched so the checksums stay exact.
- Compatibility: without the models migration, the release reads `jwl_catalog` exactly as the current Worker does, through an exact fallback. This was verified locally against the live catalogue. With the migration applied, it shows one card per model.

## Upload-only steps

From a checkout of this exact commit:

```
cd releases/storefront-2a1864b35fd8
sha256sum -c SHA256SUMS                      # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # note the currently active version ID = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json
```

## Smoke check after upload

Check on a phone width (360/390/430 CSS px):
- These pages return 200 with the same visual identity as before:

  `https://jwleria.com/ar/`, `/en/catalog/`, `/en/brands/rolex/`, `/ar/products/rolex-m126234-0015-e45f1880/`, `/en/products/rolex-m126200-0006-1765d475/`, `/en/catalog/?q=m126234-0015`

- The search URL uses `q`, the parameter the catalogue search form submits. It must show exactly one piece, linking to `/en/products/rolex-m126234-0015-e45f1880/`.

- No horizontal overflow.
- `X-JWL-Cache` moves from `MISS` to `HIT`, later to `STALE`, and never shows `STALE` past 600 s.
- `Cache-Control: public, max-age=0, must-revalidate`.

## Rollback

```
npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront
```

The previous Worker reads only `jwl_catalog`, so the rollback is valid whether or not the models migration is applied.
