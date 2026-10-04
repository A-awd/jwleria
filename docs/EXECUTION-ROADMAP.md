# Catalog execution roadmap

Date: 2026-10-04

Status: proposed implementation sequence. Local visual refinements are
implemented; the operational systems below are not connected or released.
This roadmap supplements `ARCHITECTURE.md`, preserving existing approval and
repository-reconciliation gates. It does not provision environments or grant
permission to publish content, campaigns or production changes.

## Current evidence

The local Astro storefront uses Arabic/English routes, El Messiri Arabic
display text and a lighter warm-white palette. It contains 41 international
directory names, nine categories and 27 explicitly synthetic preview items.
No real inventory, current stock, media grant or live WhatsApp destination is
established by those fixtures. The application has no live database adapter.

Production changes must address three current limitations: the build is
static, `components/view.ts` collects the entire fixture catalog for filtering,
and `src/contracts/catalog.ts` permits only synthetic preview products. Those
paths, rather than the earlier illustrative `packages/contracts` location,
are the current implementation entry points.

## 1. Complete the visual foundation

Keep the accepted Arabic display font and gender-neutral customer copy.
Apply the light palette through shared tokens, including header/footer/media
placeholders and the hero overlay. Retain the requested public experience:
brands, collections, categories, pieces and WhatsApp inquiry; no public prices,
country selector, customer account, cart or checkout. The owner rejected a
catalog-management dashboard; developer/agent tools handle content updates
without an owner-facing administration application.

Output: reviewed home, brand/category listing, product detail and contact
states using the same design system. Validate the changed view once, then
extend checks only for a concrete defect.

## 2. Prove a genuine-content pilot before bulk ingestion

Use a proposed first batch of 10–20 real pieces across approximately three
brands and several categories. The batch size is a working target, not a
claim that source access, stock or publication permission exists.

Create a source register: owner/publisher, access method, permitted purpose,
relevant terms/agreement, fields available, rate limits and responsible
reviewer. Prefer authorized feeds/APIs or licensed supplier files; otherwise
use reviewed manual entry and original photography where appropriate. A
public page or sitemap is not a media-reuse license. An adapter is enabled
only after its access and intended use are verified.

For each piece record brand, named collection, model, official reference if available, variant
dimensions, reviewed factual attributes, category, source observation and
verification dates. Write original short descriptions; do not assume that
translation licenses copied promotional text. Record image/logo grants
separately, including site, organic-social and paid-ad use, territory, edits,
expiry and revocation. AI-generated editorial scenes remain distinct from
real-product images and never establish a product's appearance/authenticity.

Output: a complete reviewed batch, with each missing fact/permission held
for review. Source observation does not establish purchasable stock. Confirm
the variant, current availability and fulfillment terms before each quote.

## 3. Prepare data and approved environment boundaries

Design schemas and migrations while presentation review continues. Before
connecting anything, confirm environment ownership and decide whether to
remediate the existing backend or approve an isolated replacement. Historical
runtime counts are not current acceptance evidence. Review the previous
anonymous-access finding before reusing a backend.

Use the proposed managed PostgreSQL/Supabase foundation with separate internal
catalog, published projection and private operations. Give server reads,
curation and migrations separate least-privilege roles. Disable the Data API
when unused or explicitly deny public/authenticated access to restricted
schemas. Private quotations, suppliers, orders and customers never enter the
public projection or browser responses.

Separate stable brand/model/variant IDs from editable slugs and public inquiry
references. Preserve manufacturer and source identifiers privately where
appropriate. Import identity uses a unique source/external-item key;
transactional upserts, normalized revision hashes and an outbox prevent
duplicate products/publications. Missing references require reviewed matching.

Output: reviewed migration and environment plan, then an authorized isolated
test environment. Replayed imports create no duplicate product or publication.
No production connection is implied by schema preparation.

## 4. Make the public catalog scalable and editable

Extend the current contract with explicit real-content versus preview types,
approved factual attributes, variant labels and controlled media references.
Make the server adapter asynchronous. Use Astro on-demand product/catalog
routes through the supported Cloudflare adapter; keep stable editorial pages
prerendered. Start with 24 items per catalog page and a maximum of 48.

Move search/filtering to indexed server queries. Preserve useful HTML results
without JavaScript and add small client enhancements only where needed.
Remove full-catalog fetching/rendering from production routes. Connect the
dedicated read role through Hyperdrive with query caching disabled under the
proposed withdrawal model.

Serve responsive approved media through the controlled gateway; retain source
files privately. Use appropriately sized derivatives and lazy thumbnails.
Keep selected font faces local. Additional frontend/search frameworks are
introduced only for a measured need.

Output: a new approved product appears without rebuilding every catalog page;
only published products are retrievable; HTML/API/search/metadata contain no
commercial amounts, private fields, fabricated reviews or zero-price offers.

## 5. Prepare background catalog updates without a dashboard

Use controlled developer/importer tools with restricted write roles.
Do not build a separate console or require owner product entry. Codex and
Claude prepare the classified catalog and image records. Implement manual/file
intake first:

`candidate → facts/media review → approved revision/batch → publication`

The development workflow can correct classification and internal matching
references, choose media, preview the batch, publish or withdraw an approved
revision, and inspect import failures. Imports
cannot overwrite approved editorial copy or publish automatically. Changes to
approved facts/media create a new reviewable revision.

Output: an incomplete grant blocks publication; a batch is approved once;
withdrawn or expired material is inaccessible through controlled origin/cache
routes. Synthetic items remain confined to the disclosed preview environment.

## 6. Establish WhatsApp inquiry and private order operations

Begin with the verified business number and direct links in WhatsApp Business.
Every piece link prefills its public reference, name and URL. A click is not
proof of a received message or order. Verify the destination and a human
end-to-end inquiry before calling contact live.

Use private statuses: new inquiry, requirements/variant confirmed, availability
check, quote sent, awaiting customer decision, confirmed order, sourcing,
shipping, delivered, closed. A quote records its version, exact total/currency,
included/excluded charges, validity, expected delivery and applicable terms.
Do not promise stock or automatic purchase based on a source observation.

Add WhatsApp Business Platform and an inbox such as Respond.io only after
team workload or automation requires them and account/number support is
verified. The owner deferred that account. Platform automation requires
appropriate permission/opt-in, template/window handling, deduplicated events
and human escalation; application and Platform policies must not be conflated.
For Platform/API messaging, the customer message starts/renews the service
window; a click alone does not. Apply approved templates outside that window.
Do not assume a future provider imports historical chats or supports the
selected number/coexistence mode without an account-specific acceptance test.

Output: inquiry → verified quotation → customer confirmation → fulfillment
is traceable privately, with no customer/financial data on the public site.

## 7. Derive social content from approved catalog content

Maintain a weekly editorial queue linked to product/media revisions. Prepare
Instagram still/carousel/story/reel variants, TikTok vertical video and Snapchat
story variants. Verify factual claims, music/media rights and each intended
channel before the owner-approved batch is scheduled.

Start with native platform publishing tools and reusable templates. Figma or
another design tool is optional; it is not a prerequisite for a working site.
Automated publishing/API integrations follow verified account capabilities and
a successful manual publishing flow. An AI draft cannot invent product facts,
availability, discounts, manufacturer affiliation or customer testimony.

Output: one approved catalog item can produce reviewed site/social assets
with references back to the source revision. Organic approval does not imply
paid-ad eligibility.

## 8. Launch, measure and expand automation

Before launch, verify business identity/disclosures and customer-facing terms,
the domain/hosting destination, HTTPS, contact delivery, mobile behavior,
search and withdrawal. Enable search indexing only for accepted production
content. Add measurement with a documented privacy basis: catalog views,
WhatsApp click intent, actual received inquiries, accepted quotations and
fulfilled orders remain separate events. Do not infer sales from clicks.

Saudi launch review must identify the actual seller and applicable activity.
Provide the full quotation, charges, fulfillment terms and invoice at the
required transaction stage. The suitability of a public price-on-inquiry
catalog under applicable price/advertising rules remains unresolved; private
quotations do not automatically establish an exemption. Review it against the
actual activity before launch. Provide privacy information at collection,
minimize customer data, and assess service-provider/cross-border processing.
Official commerce-law text was available through indexed official results in
this pass; direct access to the law endpoint was unavailable to the reviewer.

Campaigns use genuine business identity and assets with the required rights.
Verify landing-page and channel-specific eligibility immediately before each
approved campaign. No configuration guarantees protection from rejection or
account restrictions; use correction and appeal rather than circumvention.
TikTok may require brand evidence from a reseller under its Brand Check flow.
Commercial disclosure differs between TikTok and Snapchat; review the native
classification before scheduling. Meta/Instagram policy pages were not freshly
retrievable in this research pass (rate limited); recheck official requirements
and account eligibility before approving their first campaign.

After the manual pipeline passes, enable one permitted-source adapter. Its
scheduled run detects additions/changes and creates candidates, with rate
limits, checkpoints, retry/backoff, duplicate protection, alerts and a kill
switch. Add durable queues only for the demonstrated intake requirement and
make consumers idempotent. Expand one source at a time.

Output: safe replay after a partial failure; useful operator alerts; no
unreviewed automatic website/social publication.

## Operations and development continuity

Monitor failed imports, media faults, publication jobs and stale availability
reviews. Run database backups and independent media-object backups; database
Storage metadata alone does not recover actual files. Preserve the latest
revocation state separately and apply it before restored traffic. Test one
isolated restore and the proposed controlled withdrawal budget before launch.

Use reviewed incremental releases, separate test/production configuration,
recorded migrations, rollback procedures and a current handoff. An enhancement
is accepted only after its public data boundary and affected workflow pass.
The existing proposed 50,000-item synthetic scale check is a capacity proof,
not an ingestion target or claim about genuine inventory.

Codex owns contracts, server/data boundaries, migrations, background import/
publication workflows and integration verification. Claude owns presentation,
layouts/components, localization and visual refinement. Exchange the public
contract first; avoid simultaneous edits to the same files. This is the
implementation split, not a claim that a new Claude task was dispatched.

## Official references reviewed 2026-10-04

- [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase backup scope](https://supabase.com/docs/guides/platform/backups)
- [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/)
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [PostgreSQL upsert](https://www.postgresql.org/docs/current/sql-insert.html)
- [Cloudflare queue delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [Louis Vuitton legal notice: website content reuse restrictions](https://eu.louisvuitton.com/eng-e1/legal-notice/)
- [WhatsApp Click to Chat](https://faq.whatsapp.com/5913398998672934)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)
- [TikTok Brand Check](https://ads.tiktok.com/resources/help/article/about-brand-check?lang=en)
- [TikTok intellectual property policy](https://ads.tiktok.com/resources/help/article/tiktok-ads-policy-intellectual-property-infringement?lang=en)
- [Snap commercial content policy](https://www.snap.com/terms/commercial-content?lang=en-US)
- [Snap advertising policies](https://values.snap.com/policy/advertising-policies)
- [Saudi E-Commerce Law](https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/360de590-0286-4fa5-a243-aa9100c31979/1)
- [Saudi PDPL implementing regulation](https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PDPL2/)
- [Saudi copyright law publication](https://www.uqn.gov.sa/details?p=28845)
