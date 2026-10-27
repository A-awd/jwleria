# Release and rollback — website foundation (2026-10-27)

This is the operator package for the existing-site foundation release. It is written for whoever holds the authenticated Cloudflare Wrangler session. The cloud session that prepared it has no Cloudflare deploy credential and no deploy tool. Nothing here is a record of a completed deploy.

## What the release contains

The source is branch `claude/admiring-dirac-nfavfx`. Use the commit named in the latest STATE entry, or any later commit on this branch that STATE marks as the release. The application directory is `apps/storefront`.

- One page per model, with real variant links, per-variant galleries and image credits. This only takes effect once the models migration below is applied. Until then the storefront falls back to today's reads, and every page renders as it does now. Both cases were verified locally against the live catalogue before release.
- Bounded stale-while-revalidate for anonymous public HTML: 60 s fresh, up to 600 s stale. This is decision 0009.
- Neutral enquiry wording. No visual redesign: the A/B/C directions are not selected and are not part of this release.

Visible appearance stays the current production identity.

## Prerequisites and inputs

- Node 22 (22.22.0 was used for the check build) and pnpm 10 (10.28.0).
- Dependencies are pinned in `apps/storefront/pnpm-lock.yaml`: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0.
- The Worker is the existing `jwleria-storefront` on the existing account and domain. No DNS, domain or account change is needed.
- Runtime secrets that already exist on the Worker (names only): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- Build-time public inputs must match the current live state:
  - Live today is the non-release preview: `noindex, nofollow`, robots `Disallow: /`, and a pending WhatsApp state.
  - Leave `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` **unset**. Setting `PUBLIC_RELEASE=live` without a verified number fails the build by design.

## Order of operations

1. **Database (optional before the deploy, required for model cards).**
   - Apply `apps/storefront/supabase/proposed/jwleria_product_models.sql`. It is additive: new tables, a view and functions; existing tables, rows and functions are untouched.
   - Then run `select jwl_internal.apply_product_variants();` once as the service role.
   - Expected result on the unchanged catalogue (catalog hash `b2182069…`): 4,097 variants, 2,886 models, 283 grouped models holding 1,494 variants, 0 key collisions.
   - The currently deployed Worker ignores the new objects, so this step is safe before or after the deploy.
   - Do not reapply `20261026114541`.
2. **Build.**

   ```
   cd apps/storefront
   pnpm install --frozen-lockfile
   pnpm build:cloudflare
   ```

   The output is `dist-cloudflare/client` (static assets) and `dist-cloudflare/server` (`entry.mjs`, chunks and the generated `wrangler.json`, with name `jwleria-storefront`, `compatibility_date` 2026-10-04 and no `vars`). Each build embeds a new release key in the HTML cache key, so builds are not byte-identical. A new deploy therefore never serves an older release's cached page.
3. **Deploy.** Run `pnpm deploy:cloudflare`, or `npx wrangler deploy` from `apps/storefront` after the build. Record the new version ID privately, not in this public repository.
4. **Smoke check** on a phone width (360/390/430 CSS px):
   - `/ar/` and `/en/catalog/` return 200, show the same identity as before, and have no horizontal overflow.
   - `/en/brands/rolex/`: once the migration has been applied, Rolex shows model cards with a neutral option count. Before the migration, it shows one card per reference.
   - `/ar/products/rolex-m126234-0015-e45f1880/` returns 200 with reference m126234-0015. With the migration applied, the dial and bracelet options link only to real variants, and `rel=canonical` points to the primary variant once the live release is enabled.
   - `/en/catalog/?search=m126234-0015` shows that exact reference.
   - `/en/products/rolex-m126200-0006-1765d475/` (an older variant URL) still renders.
   - Response headers: `X-JWL-Cache` moves from `MISS` to `HIT` and later to `STALE`, never `STALE` past 600 s; `Cache-Control: public, max-age=0, must-revalidate`.

## Rollback

- **Worker.** Run `npx wrangler deployments list` (or `wrangler versions list`), then `npx wrangler rollback <previous-version-id>`. The previous Worker reads only `jwl_catalog`, so it works whether or not the models migration has been applied.
- **Models database layer.** Run `apps/storefront/supabase/proposed/jwleria_product_models.rollback.sql`. It drops only the objects that migration created. The catalogue, candidates, revisions and grants are untouched. Then register the reversal in migration history.
- **Media**, if photographs are later published: revoke the grant, which revokes its approvals and withdraws those products. Then delete the files listed by `jwl_revoked_media_files()` and purge the CDN paths. Cached HTML can show a withdrawn page for up to 600 s in each colo (decision 0009).

## Local evidence at preparation time

These are lab results, not a production test.

- Storefront suite: 135 pass, 0 fail, 3 skipped. The skipped tests are opt-in browser tests and are not counted as passed.
- Intake suite: 103 pass.
- `pnpm build:cloudflare` completed (74 output files).
- The pre-migration fallback was checked against the live catalogue through a local node build: home, catalogue page 2, the Rolex brand page, two product pages and an exact-reference search all returned 200.
