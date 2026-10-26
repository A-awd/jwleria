# Jwleria storefront

Astro 7.3.5 with a standalone Node server. Arabic/English, brand and collection browsing, server-side search and pagination, actual product galleries and direct WhatsApp inquiry. No prices, login, checkout or owner dashboard.

The normal runtime reads the dedicated Supabase catalog using `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Unconfigured development shows an empty catalog; it never presents fixtures as genuine products. `CATALOG_MODE=preview` explicitly enables synthetic development fixtures only. Database failures remain errors.

Run `pnpm install`, `pnpm dev`, then open `http://127.0.0.1:4321/ar/`. Validate with `pnpm check` and `pnpm build`. For the standalone server use `HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs`. Runtime environment values can configure the same build.

`PUBLIC_INQUIRY_MODE=live` and the owner-verified `PUBLIC_WHATSAPP_E164` enable direct `wa.me` links. Product inquiries include the exact reference. Without the business number, real product/contact buttons visibly remain pending.

`PUBLIC_RELEASE=live` requires a genuine catalog connection, live WhatsApp and a valid HTTPS `PUBLIC_SITE_ORIGIN`. It activates canonical URLs and indexing. Preview remains unindexed. This configuration is not evidence of verified media rights, seller policies or a deployed domain.

Product models and variants follow `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md`. Listings read `jwl_catalog_models`, brand pages `jwl_brand_models_page`, and a product page reads its whole model in one `jwl_product_model(p_slug)` call. Until that prepared migration is applied, only a 404 that names the missing view or function (`PGRST202`/`PGRST205`, or `42P01`/`42883` on older PostgREST) falls back to today's reads, remembered for a minute per isolate; every other failure stays an error. Every variant URL renders its model with that variant selected and names the primary variant as canonical. Options are links to the real variant pages; with JavaScript the chosen variant's server-rendered block replaces the current one and `history.replaceState` updates the URL. A variant shows only its own approved images, otherwise the facts-only state. An image with an open-licence credit shows that credit in the gallery and on cards, and is never used as the share image. A card counts option values only when its whole model fits on one product page (60 variants). The selector and gallery-credit styles are one removable `.variant-*`/`.gallery-*` block in `global.css`; the visual design is owned separately. `CATALOG_MODE=preview` includes synthetic model groups. The opt-in mobile browser check runs against a local preview server: `JWL_BROWSER_BASE_URL=http://127.0.0.1:4391 JWL_SCREENSHOT_DIR=/absolute/dir node --test tests/variant-browser.test.mjs` (Playwright must be resolvable, for example through `NODE_PATH`).

The approved visual direction uses El Messiri headings, Noto Sans Arabic body, Cormorant Garamond Latin display and a warm-white palette. Font files and original OFL licenses are local. Generated editorial artwork is separate from real product photography.

Background ingestion, image storage and publication tools are in `scripts/catalog-intake`; native n8n workflow sources are in `workflows/n8n`. Remote database application, permitted-source scheduling, actual approved media, business WhatsApp and domain delivery remain blocked until their required inputs/access exist.

## Cloudflare deployment

`pnpm build:cloudflare` uses the pinned official Cloudflare adapter without changing Astro or the presentation. `pnpm deploy:cloudflare` builds and deploys using the authenticated official Wrangler CLI. The generated entry/config lives under ignored `dist-cloudflare/server`; uploaded assets are the client build only. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as Worker runtime secrets. Supply the public release/WhatsApp inputs at build time. Sessions are disabled and no KV or Cloudflare Images service is provisioned. The default Node build remains available.

The owner-created dedicated database now has the foundation migration applied and actual public read/private write boundaries verified. Exact deployment identifiers, keys, DNS backups and environment values remain private. OAuth authorization and actual domain/HTTPS delivery remain pending.
