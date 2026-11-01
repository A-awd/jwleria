# Operator package — source commit 0bff02360d83 (cutout credits) and the prepared cutout migration

Two separate operator actions, in this order:
1. The Worker upload.
2. Applying the database migration, after the Worker is live and checked.

Neither publishes an image. No cutout exists yet: an accepted exact cutout input is still missing (`HANDOFF.md`).

## 1. Worker upload

**Files:**
- Branch `claude/admiring-dirac-nfavfx`, directory `releases/storefront-0bff02360d83/` (added by the commit after `0bff02360d83a66bb118da237f3a5cf11d980caf`).
- 73 compiled files under `dist-cloudflare/`, the same file set as the live release `bf6812e3c5d4` except for hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `edb16e5e653e6463d61cf62221759eaefb46c97c04f75423dedf08f5e0122688`.
- Secret scan: no keys, tokens, project identifiers or local account paths.

**What changes for visitors:** the image credit gains Arabic for two new change texts. They follow the reviewed wording of the existing two, and an Arabic reader confirms them before the first cutout is published:
- `background removed, resized and converted to WebP` → «إزالة الخلفية وتغيير الحجم والتحويل إلى WebP»
- `background removed and converted to WebP` → «إزالة الخلفية والتحويل إلى WebP»

No current row carries either text, so the live site looks exactly as before. Everything else matches `bf6812e3c5d4`: cards, product paragraphs, variants, search, routes, bindings, vars, cache rules, `noindex, nofollow` and robots `Disallow: /`.

**Safe with the database as it is (9 migrations): yes.** This release reads the same relations as `bf6812e3c5d4`, and it is equally safe after step 2.

**Build provenance:**
- Built from a clean clone of `0bff02360d83` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only).
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.
- Tests at the source commit: storefront 164 tests, 159 pass, 0 fail, 5 opt-in skips; intake 125/125.
- A local rendered-HTML check showed the Arabic and English credits on a product page and a search card.

Do not rebuild. Deploy exactly these files.

```
cd releases/storefront-0bff02360d83
shasum -a 256 -c SHA256SUMS                  # or sha256sum -c; every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

These are the operator's verified safeguards (`wrangler deploy --help`, 4.147.0):
- `--no-bundle` uploads the compiled files as they are.
- `--keep-vars` keeps the Worker's existing vars, which the generated config does not declare.
- `--no-autoconfig` turns off framework detection.

**Smoke check (360/390/430 CSS px, Arabic and English):**
- `/ar/products/rolex-m126234-0015-e45f1880/` and `/en/…`: the photo is whole, and the credit reads exactly as before: «Rolex Datejust 36 - Up High» — Ajay Suresh · CC BY 2.0 · source · resized and converted to WebP.
- Cards show only brand and name; the Jaeger-LeCoultre Q3926480 page shows its paragraphs; `q=m126234-0015` finds the product.
- `noindex, nofollow` and `Disallow: /` are kept; there is no horizontal overflow.

## 2. Database migration `jwleria_cutout_media` (only after step 1 is live)

**Done on 2026-11-01:** step 1 was uploaded and HTTP-checked by the operator. The migration was applied once by Claude as version `20261101104017`; the stored statement's sha256 equals the apply body. Its file now lives at `apps/storefront/supabase/migrations/20261101104017_jwleria_cutout_media.sql`, and the proposal was removed; the rollback stays in `proposed/`.

**Files:**
- `apps/storefront/supabase/proposed/jwleria_cutout_media.sql`: sha256 `1db49f2df635d752679c0ae5a6230bd64af0607d202933604e1f634ca1b11c2e`.
- Apply body: lines 20–181 of that file, between its outer `begin;`/`commit;` and without the blank lines next to them. 15,927 bytes, sha256 `5da1e0d2e945b4025be63884d93363c802cf8d2dfdf599a2b06d0c6be8af8f58`.
- Rollback: `apps/storefront/supabase/proposed/jwleria_cutout_media.rollback.sql`, sha256 `ff92aa5a93469950f023729c3be5648eac49bc637e98e50e61bef3999ddd571a`.

**What it does.** It is additive, and changes no existing row or image:
- `media_grants.background_removal` (default false; allowed only on written permission).
- Four treatment columns on `media_assets`, with a check that refuses partial or blank records.
- `public.jwl_record_cutout_approval` (service role only). The regular `jwl_record_media_approval` now refuses treatment fields.
- An evidence trigger that keeps every applied rule and adds the cutout rules of decision 0015.

**Before (read-only):** confirm:
- 9 migrations, the last being `20261028111829`;
- 1 grant, 3 evidence rows, 1 live approval;
- 4,097 active public rows, 1 with a photo.

**Apply:** `apply_migration` with name `jwleria_cutout_media` and exactly the apply body. Before accepting the server's action-time question, confirm that the query's sha256 is `5da1e0d2…8f58`. After a timeout or an error, read back before any retry. Never replay an applied version.

**After (read-only):**
- 10 migrations, the new one last.
- `to_regprocedure('public.jwl_record_cutout_approval(jsonb,jsonb)') is not null`.
- 0 rows with `treatment is not null`, and 0 grants with `background_removal`.
- The same 1 grant, 3 evidence rows and 1 approval, and m126234-0015 still active with its unchanged credit.
- The product page still shows the photo.

Record the registered version privately and in `STATE.md`, then move the file into `apps/storefront/supabase/migrations/` (Claude does this, with its test paths).

## Rollback

- **Worker:** `npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`. Rolling back to `bf6812e3c5d4` is safe at any database state: that release shows a background-removed credit text in English, marked English, so the credit stays complete and true. Never go below `fbf04b80a181` while the titled credit is public.
- **Migration:** run the rollback file. It restores the previous definitions exactly and refuses while any cutout grant, evidence row or credit exists. In that case, revoke the grant or approval first (which withdraws the product), delete its files and decide on the evidence in a reviewed change.
- **Order:** with no cutout recorded, either can be rolled back alone. If one has been recorded, revoke it, then roll back the migration, then the Worker if needed.
