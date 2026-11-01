# Operator package — source commit 1dd1618a5ef1 (owner-selected pale square tile for photograph cards; decision 0023)

This is a Worker-only release: CSS and card markup. It makes no database, migration, source-flag, grant, asset, cache-rule or route change.

**What changes:** every photograph card in the product grid becomes a square `#f0f0f0` tile.
- The product sits whole and centred, at most 70% of the tile.
- No outline, shadow or rounding; two cards per row on phones.
- Card size hints name the in-tile width.
- A page that lists product cards, and is not a product page, gets a white surface (`#fff`).
- On phones the listing grid has a 12px outer margin and an 18px gap.
- Facts-only cards and the product page are unchanged.
- **Review:** Codex inspected this CSS in the private two-card preview at 390×844: tiles 174 × 174, gap 18, outer margin 12, no overflow. That is approval for packaging, not the owner's final aesthetic sign-off, and not image publication.

**On today's data:** only `m126234-0015` has a photograph. Its card shows that opaque photograph as the rectangle it is, inside the tile.

| Step | Who | What |
|---|---|---|
| 1 | Codex | After the visual inspection of the private local preview, upload this Worker exactly as built, with the runtime and bindings unchanged. |
| 2 | Codex | Public phone and desktop check of a listing with the `m126234-0015` card and a facts-only card, in Arabic and English. |

**Files:**
- 77 compiled files, the same file set as `storefront-3a5c0edef3b9`.
- `SHA256SUMS` sha256: `9e98d60f14b1ea13b22d722206cda32ce1fe2b098d6bc9444e299de0415d467d`.
- Built from the neutral path `/Users/Shared/jwleria`.
- Leak scan: no private preview code or data, no local host, no Longchamp references, no keys, project identifiers or private paths.

```
cd releases/storefront-1dd1618a5ef1
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Rollback:** `npx wrangler@4.147.0 rollback <the recorded version>`, or redeploy `releases/storefront-3a5c0edef3b9/`. There is no data step: this release reads the same data.

**Tests:**
- the full storefront suite at the tile commit: 209 tests, 204 pass, 0 fail, 5 opt-in browser skips;
- after this CSS change, the focused layout tests: 5 pass, 0 fail, 2 opt-in browser skips.

This package supersedes `storefront-662fdf4307b7`, which was never deployed.

## Receipts (2026-11-01)

- **Step 1, done** (deployed, producer-reported by Codex):
  - all 77 files matched `SHA256SUMS`;
  - pinned Wrangler 4.147.0 deployed with `--no-bundle --keep-vars --no-autoconfig`, exit 0;
  - the runtime and all 3 binding metadata entries are identical before and after, and the secrets were kept;
  - the active and rollback version IDs are recorded privately.
- **Step 2, done** (visitor-verified by Codex):
  - **Arabic, 390×844:** white body; a 174 × 174 grey `#f0f0f0` frame with the image complete; no overflow.
  - **`m126200-0006`:** facts only, and the rejected photograph is not restored.
  - **English, 1280×900:** white body; a 267.1875 px grey square with the image complete; the opaque photograph is not blended.
  - **`/ar/__private-preview/`:** "Page not found".
- **Not tested:** a physical iPhone and a 3× pixel ratio.
