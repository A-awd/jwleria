# Operator package — source commit 88e2e3cc0de9 (sizes as variants of one model, decision 0017)

Four steps, two actors, in this order. Each step can be read back before the next.

| Step | Who | What |
|---|---|---|
| 1 | Claude | Apply the additive migration `jwleria_size_families`. It regroups nothing. |
| 2 | Codex | Upload this Worker exactly as built, then smoke-check it. |
| 3 | Claude | Only after step 2 is live: rebuild the mapping and read it back. |
| 4 | Codex | Public phone-width acceptance in Arabic and English. |

## 1. Migration `jwleria_size_families` (Claude, before the Worker)

**Files:**
- `apps/storefront/supabase/proposed/jwleria_size_families.sql`, sha256 `f33273e917d0b76211b255fbe406677b5339675ab0e499ecfac312427138c91a`.
- Apply body: lines 12–259 of that file, between its outer `begin;`/`commit;` and without the blank lines next to them. 22,538 bytes, sha256 `8cb5d81dab8234a319881ff451c6be20ba3905b80940ee15dffce6a1aef568dd`.
- Rollback: `apps/storefront/supabase/proposed/jwleria_size_families.rollback.sql`, sha256 `066f06bef37a0ae59de99a0311c91ebde6824dd64f291a3139a89639235887f4`.

**What it does.** It is additive and reversible:
- The reviewed base derivation is renamed `jwl_internal.derive_base_variants()`.
- A new `derive_product_variants()` adds the size layer on top of it.
- `public.jwl_product_model_v2(text)` is new.
- Six Arabic size words are added to the reviewed dictionary.
- No catalogue row, approval, grant, image or URL changes, and the mapping itself is untouched until step 3.

**One visible change.** A model's card becomes its first photographed variant when it has one. A card image is then always the exact photograph of the variant it links to.

**Before (read-only):**
- 11 migrations, the last being `20261101112338`.
- The catalogue hash and the mapping hash are recorded.
- Grants, evidence rows, approvals and active rows are unchanged from the last read-back.

**Apply:** `apply_migration` with name `jwleria_size_families` and exactly the apply body, after a literal byte-fidelity check. After a timeout or an error, read back before any retry. Never replay an applied version.

**After (read-only):**
- 12 migrations.
- `to_regprocedure('public.jwl_product_model_v2(text)')` and `jwl_internal.derive_base_variants()` exist.
- The mapping hash, catalogue hash and media counts are unchanged.

## 2. Worker upload (Codex)

**Files:**
- 73 compiled files under `dist-cloudflare/`: the same file set as `storefront-0bff02360d83`, except for hashed chunk names.
- `SHA256SUMS` has one line per file. Its own sha256 is `fe302580bbd7dd9965ed937df0d63b38f4582b521f86ba3acea6fcfe94bf2705`.
- Secret scan: no keys, project identifiers, private paths or session links.

**Compatibility.** The Worker is safe with the database in any state:
- Before step 1, it falls back to `jwl_product_model` when `jwl_product_model_v2` is missing.
- After step 3, it reads `jwl_product_model_v2`: every variant of a model, its real sizes and the named representative photograph.

```
cd releases/storefront-88e2e3cc0de9
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Smoke check (HTTP):**
- The Arabic and English home, catalogue and product pages return 200.
- `/ar/products/rolex-m126200-0006-1765d475/` still shows its photograph and its credit.
- `noindex, nofollow` and robots `Disallow: /` are kept.

## 3. Mapping rebuild (Claude, only after step 2 is live)

`select jwl_internal.apply_product_variants();` runs once as `service_role`. It is one transaction, and any inconsistent model aborts it with the earlier mapping intact.

**Read back:**
- models and variants by brand, before and after;
- the size families formed by source;
- the rows considered but left ungrouped, by reason;
- the catalogue hash and media counts, unchanged;
- `jwl_product_model_v2` for the example URLs, which are then given to Codex.

## 4. Public acceptance (Codex)

At phone width, in Arabic and English:
- a size family page: the size option first, the size table, and a representative photograph caption where one applies;
- a single page;
- the catalogue cards: one per model, with brand and size-neutral name only.

## What visitors see after step 3

- **One model per design.** Sizes of one genuine design are one card and one page; every existing reference URL still opens with its own reference selected.
- **Options.** The size is offered first, in the source's own units, followed by the existing dial, bracelet or colour options. Each value links to a real variant.
- **Size table.** A compact table below the facts lists only the real sizes. Each row gives the reference of the closest real variant at that size, the facts that differ (for example power reserve or bag dimensions) and the options that exist there. It names any option that changes, so a colour is never implied at a size where it does not exist.
- **Representative photograph.** A variant with no photograph of its own may show its model's photograph. The caption names that photograph's own reference and size, says it is not the selected reference, and the photograph keeps its credit.

## Build provenance

- Built from a clean clone of `88e2e3cc0de95ff9cdf7eca586ef7c62f18db2ff` at a neutral path (`/Users/Shared/jwleria`, which appears in compiled metadata only). The clone was deleted after the build.
- Command: `JWL_DEPLOY_TARGET=cloudflare astro build`, the `build:cloudflare` script, run with the pinned local binaries: Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, Wrangler 4.147.0, Node 24.14.1.
- `PUBLIC_RELEASE`, `PUBLIC_INQUIRY_MODE`, `PUBLIC_WHATSAPP_E164` and `PUBLIC_SITE_ORIGIN` were unset.

**Tests at the source commit:**
- Storefront: 176 tests, 171 pass, 0 fail, 5 opt-in skips.
- Intake: 126 of 126.
- Type check: only the 7 existing Deno-function errors.
- A local rendered-HTML check (synthetic data, no network) showed, in Arabic and English:
  - the size-neutral name;
  - the case-diameter option;
  - the size table;
  - the representative caption and credit;
  - minimal cards.

## Rollback

- **Mapping and migration:** run `proposed/jwleria_size_families.rollback.sql`. It restores the base derivation, the earlier card rule and the earlier mapping exactly, and drops `jwl_product_model_v2`. This Worker keeps working, through its fallback.
- **Worker:** `npx wrangler@4.147.0 rollback <version-id-recorded-before-upload> --name jwleria-storefront`. The previous Worker (`0bff02360d83`) works with either mapping: the largest size family has 56 variants, within its 60-variant read. Never go below `fbf04b80a181` while the titled credit is public.
- **Order:** either can be rolled back alone, in either order.
