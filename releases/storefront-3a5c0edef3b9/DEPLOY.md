# Operator package — source commit 3a5c0edef3b9 (one square white presentation; decision 0022)

This Worker renders the two new, optional image fields that the database now accepts (migration `20261101181522`, applied):
- `canvas: "white_square"`: the photograph is its own square, pure-white canvas, shown as a square on a white frame on phones (as high as the compact 30svh frame) and in listings.
- `source_clipped: true`: the source photograph cuts the product off. The product page then says «لقطة جزئية: الصورة الأصلية لا تُظهر المنتج كاملًا.» / "Partial view: the original photograph does not show the whole product.", and its listing card says «لقطة جزئية» / "Partial view".

It also adds the Arabic and English credit text for "background removed, placed on a square white background, resized and converted to WebP" (and its no-resize form).

**It is safe before the metadata publish.** The current catalogue carries neither field, so every page renders as it does on `storefront-cbbc1e4d5dfc`. The published metadata changes only in step 2, after this Worker is live, because the live Worker refuses unknown manifest fields.

| Step | Who | What |
|---|---|---|
| 1 | Codex | Upload this Worker exactly as built, with the runtime and bindings unchanged, then smoke-check it. |
| 2 | Claude | After Codex's receipt: a fresh read, then publish the two staged approvals on the open-licence lane. |
| 3 | Codex | Public phone-width check in Arabic and English, after the page cache turns over (up to 10 minutes). |

## 1. Worker upload (Codex)

**Done on 2026-11-01** (producer-reported by Codex): all 77 files matched the manifest; the runtime and all three bindings, secrets included, are identical before and after; the six prepublish checks returned 200.

**Files:**
- 77 compiled files under `dist-cloudflare/`, the same file set as `storefront-cbbc1e4d5dfc` apart from hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `06cd1de5fe879f0c4dc8bc1d1022db5b192b6882b62b5dbf92025b08ef60ab19`.
- Secret scan: no keys, project identifiers, private paths or session links. There are two matches, and the live package carries both:
  - the adapter's key-format check (`startsWith("sb_publishable_")`);
  - Astro's null session-driver identifier.
- The build path is the neutral `/Users/Shared/jwleria`.

**Runtime.** Keep the existing runtime secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (names only), and every binding as they are. `--keep-vars` keeps them.

```
cd releases/storefront-3a5c0edef3b9
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP, before step 2):** nothing visible changes yet.
- The Arabic and English home, catalogue and product pages return 200.
- `/ar/products/rolex-m126200-0006-1765d475/` still shows its two current images.
- `noindex, nofollow` and robots `Disallow: /` are kept.

## 2. Metadata publish (Claude, after the step 1 receipt)

**Done on 2026-11-01** (applied, observed live): a fresh read matched the staged approvals; each candidate was published once; both public rows equal their approvals, and the live pages show the white square and the partial-view notice.

Recorded and uploaded on 2026-11-01 (applied, observed live). Not yet published.

**The `m126200-0006` white square:**
- **What it is:** candidate A, made from the existing approved mask, and accepted by Codex by its exact square hash (`0403196d…76bd`).
- **Recorded:** its approval is replaced in place, with four `white_square` evidence rows.
- **Uploaded:** four files (320/640/960/1414 px), through `jwl-media-upload` with JWT verification on; each was read back with the expected sha256 and size.
- **Credit changes:** "background removed, placed on a square white background, resized and converted to WebP".

**The `m126234-0015` photograph:**
- Its approval adds `source_clipped: true` to the same, unchanged photograph and evidence.
- Its white square is not accepted, so it is not published.

**Publish:** a fresh read must still match the staged approvals. Then `jwl_publish_candidate` runs once per candidate on the open-licence lane, with the public row's stored facts and search text unchanged. The exact statements are kept privately.

## 3. Public check (Codex)

**Done on 2026-11-01** (visitor-verified by Codex at 390×844, Arabic and English):
- **`m126200-0006`:** one whole white square in a 253.1875 px square frame, using the 320w file; the full-size link opens 1414 × 1414; the new credit wording is correct.
- **`m126234-0015`:** the partial-view notice and its catalogue label are correct.
- **Arabic catalogue:** the `m126200-0006` card shows the whole image at 167 × 167.
- **Layout:** no overflow; a centre scroll reached scrollY 844; back and forward returned to the exact routes.
- **Not tested:** a physical iPhone and a 3× pixel ratio.

**At 390×844, in Arabic and English:**
- **`m126200-0006`:**
  - one photograph, on a white square frame as high as the compact frame, centred, with the controls still on screen;
  - its `sizes` ends with `calc(30vh)`;
  - the full-size link reads 1414 × 1414;
  - the credit names Remi Mathis, CC BY-SA 4.0 and the Commons source, with the white-square changes text in the page's language;
  - its listing card shows a square white frame.
- **`m126234-0015`:**
  - the same photograph as before;
  - the partial-view notice in the caption, and «لقطة جزئية» / "Partial view" on its card;
  - no other change.
- Back and forward, the full-size link and a vertical scroll from the photograph's centre still work.

**Not tested:** a physical iPhone and a 3× pixel ratio. Claude did not render this build in a browser: the opt-in browser tests skip without Playwright, and a skip is not a pass.

## Rollback

**Order matters.** Once step 2 is published, the previous Worker cannot read `canvas` or `source_clipped`. Undo the data first, then the Worker.

1. **Data (Claude):**
   - restore each previous approval with `jwl_record_presentation_approval`, using its previous manifest and its unchanged evidence;
   - republish it with `jwl_publish_candidate`.

   The previous files remain in storage, and their evidence and the previous manifests are kept: `m126200-0006` had the cutout and the photograph, and `m126234-0015` its photograph without the notice.
2. **Worker (Codex):** `npx wrangler@4.147.0 rollback <the version recorded in step 1>`, or redeploy `releases/storefront-cbbc1e4d5dfc/`.
3. **Schema (rarely needed):** `apps/storefront/supabase/proposed/jwleria_white_square_media.rollback.sql`. It refuses while white square evidence exists, because evidence is append-only.

**Tests at the source commit:**
- storefront: 208 tests, 203 pass, 0 fail, 5 opt-in browser skips;
- intake: 133 of 133.
