# Prebuilt storefront release — source commit 2a1864b35fd8

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

  `https://jwleria.com/ar/`, `/en/catalog/`, `/en/brands/rolex/`, `/ar/products/rolex-m126234-0015-e45f1880/`, `/en/products/rolex-m126200-0006-1765d475/`, `/en/catalog/?search=m126234-0015`

- No horizontal overflow.
- `X-JWL-Cache` moves from `MISS` to `HIT`, later to `STALE`, and never shows `STALE` past 600 s.
- `Cache-Control: public, max-age=0, must-revalidate`.

## Rollback

```
npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront
```

The previous Worker reads only `jwl_catalog`, so the rollback is valid whether or not the models migration is applied.
