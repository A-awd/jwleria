> **Superseded, never deployed:** use `releases/storefront-1dd1618a5ef1/`, which adds the white listing surface and the phone spacing.

# Operator package — source commit 662fdf4307b7 (owner-selected pale square tile for photograph cards; decision 0023)

This is a Worker-only release: CSS and card markup. It makes no database, migration, source-flag, grant, asset, cache-rule or route change.

**What changes:** every photograph card in the product grid becomes a square `#f0f0f0` tile.
- The product sits whole and centred, at most 70% of the tile.
- No outline, shadow or rounding; two cards per row on phones.
- Card size hints name the in-tile width.
- Facts-only cards and the product page are unchanged.

**On today's data:** only `m126234-0015` has a photograph. Its card shows that opaque photograph as the rectangle it is, inside the tile.

| Step | Who | What |
|---|---|---|
| 1 | Codex | After the visual inspection of the private local preview, upload this Worker exactly as built, with the runtime and bindings unchanged. |
| 2 | Codex | Public phone and desktop check of a listing with the `m126234-0015` card and a facts-only card, in Arabic and English. |

**Files:**
- 77 compiled files, the same file set as `storefront-3a5c0edef3b9`.
- `SHA256SUMS` sha256: `19a004c2822fe8ed4ee6b0bff3d2989d93141dd4ce54b2957b3e347b9782431e`.
- Built from the neutral path `/Users/Shared/jwleria`.
- Leak scan: no private preview code or data, no local host, no Longchamp references, no keys, project identifiers or private paths.

```
cd releases/storefront-662fdf4307b7
shasum -a 256 -c SHA256SUMS                  # every line must read OK
npx wrangler@4.147.0 versions list --name jwleria-storefront   # record the ACTIVE version privately = rollback target
npx wrangler@4.147.0 deploy --config dist-cloudflare/server/wrangler.json --no-bundle --keep-vars --no-autoconfig
```

**Rollback:** `npx wrangler@4.147.0 rollback <the recorded version>`, or redeploy `releases/storefront-3a5c0edef3b9/`. There is no data step: this release reads the same data.

**Tests at the source commit:** storefront 209 tests, 204 pass, 0 fail, 5 opt-in browser skips. The tile layout and in-tile size hints are tested.
