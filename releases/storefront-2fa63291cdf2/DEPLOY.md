# Operator package — source commit 2fa63291cdf2 (bulk media contract: flat tile, permission credit, expiry)

Status: **prepared, not deployed, not applied.** Nothing in this package publishes a photograph. No grant, approval, source flag, file or n8n workflow changes. On today's data the Worker renders exactly as `storefront-1dd1618a5ef1`: no row carries a `flat_tile` canvas or a `permission_credit` yet.

**What it contains:**
- `dist-cloudflare/`, 77 compiled files, built from the neutral path `/Users/Shared/jwleria`. The Worker accepts, backward-compatibly:
  - canvas `flat_tile`: an opaque `#f0f0f0` square with the whole product at 0.68, drawn edge to edge in the grey card tile, with full-column size hints;
  - `permission_credit`: the credit a written permission requires, shown verbatim, without a licence link and without a share image.
- `sql/jwleria_bulk_media_contract.sql` and its `.rollback.sql`, copies of `apps/storefront/supabase/proposed/`:
  - flat-tile evidence (G2);
  - required written-permission credits (G3);
  - fail-closed expiry (G4): expiring grants stay unusable until a scheduled sweep exists, and the sweep revokes 25 hours before expiry.
- `SHA256SUMS`, 79 lines. Its own sha256 is `73d480dc6e6c44376ae5884b31f182ff51ecc91b32ae6a728a9712127e81e9d3`.

**Order: the Worker first** (spec D3: the Worker must accept a key before any row carries it).

| Step | Who | Needs | What |
|---|---|---|---|
| 1 | Codex | the owner's go-ahead for a Worker release | Run `shasum -a 256 -c SHA256SUMS`. Record the active version privately. Run `npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig`. |
| 2 | Codex | step 1 | A visitor check at 390×844, Arabic and English: the listing and `m126234-0015` unchanged, no overflow. |
| 3 | Operator | the owner's explicit approval of this migration | Apply `sql/jwleria_bulk_media_contract.sql` as a registered migration. Read back the new functions and columns. |
| 4 | Operator | step 3 | Deploy the `jwl-media-upload` function from the same source commit. Before step 3 it keeps the old fail-closed query. |
| — | Owner | separate decision | Scheduling the sweep in pg_cron (`select public.jwl_expire_media_grants()` every 15 minutes) is not part of this package. Without it, expiring grants stay refused. |

**Rollback:**
- **Worker:** `npx wrangler@4.147.0 rollback <recorded version>`, or redeploy `releases/storefront-1dd1618a5ef1/`.
- **Database:** apply `sql/jwleria_bulk_media_contract.rollback.sql`. It restores the exact applied definitions. It refuses while any flat tile, permission credit, required credit, live expiring grant or scheduled sweep depends on the contract.
- **Order:** roll back the database before the Worker whenever a row uses the new keys.

**Tests at the source commit:**
- the full storefront suite: 219 tests, 214 pass, 0 fail, and 5 opt-in browser checks skipped (Playwright is not installed; a skip is not a pass);
- the full intake suite: 138 of 138 pass;
- the contract SQL, including the exact rollback snapshot, runs on PGlite only.
