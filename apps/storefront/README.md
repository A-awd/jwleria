# Jwleria storefront

Astro 7.3.5 with a standalone Node server. Arabic/English, brand and collection browsing, server-side search and pagination, actual product galleries and direct WhatsApp inquiry. No prices, login, checkout or owner dashboard.

The normal runtime reads the dedicated Supabase catalog using `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Unconfigured development shows an empty catalog; it never presents fixtures as genuine products. `CATALOG_MODE=preview` explicitly enables synthetic development fixtures only. Database failures remain errors.

Run `pnpm install`, `pnpm dev`, then open `http://127.0.0.1:4321/ar/`. Validate with `pnpm check` and `pnpm build`. For the standalone server use `HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs`. Runtime environment values can configure the same build.

`PUBLIC_INQUIRY_MODE=live` and the owner-verified `PUBLIC_WHATSAPP_E164` enable direct `wa.me` links. Product inquiries include the exact reference. Without the business number, real product/contact buttons visibly remain pending.

`PUBLIC_RELEASE=live` requires a genuine catalog connection, live WhatsApp and a valid HTTPS `PUBLIC_SITE_ORIGIN`. It activates canonical URLs and indexing. Preview remains unindexed. This configuration is not evidence of verified media rights, seller policies or a deployed domain.

The approved visual direction uses El Messiri headings, Noto Sans Arabic body, Cormorant Garamond Latin display and a warm-white palette. Font files and original OFL licenses are local. Generated editorial artwork is separate from real product photography.

Background ingestion, image storage and publication tools are in `scripts/catalog-intake`; native n8n workflow sources are in `workflows/n8n`. Remote database application, permitted-source scheduling, actual approved media, business WhatsApp and domain delivery remain blocked until their required inputs/access exist.
