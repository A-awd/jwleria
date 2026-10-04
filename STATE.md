## Current execution checkpoint — 2026-10-04

Official n8n MCP access now works through an owner-approved OAuth grant and a persistent private SDK bridge. Workflow creation, update, execution and output readback succeeded. Catalog normalization and social-draft preparation exist in the owner's existing Jwleria folder and passed cloud execution. They are unpublished helper workflows; permitted-source scheduling, storage and automatic public publication are not running yet. Private tokens, account identifiers, exact execution outputs and bridge configuration stay outside Git.

The storefront now runs as an Astro/Node server with bounded Supabase catalog queries, brand/collection browsing, actual-image galleries and server-side search/pagination. Normal runtime never presents synthetic fixtures as real products; unconfigured development has an empty catalog. Synthetic fixtures are explicit development opt-in only. Generic, brand and actual-product contact controls use direct WhatsApp when the verified number is configured. Approved typography, light palette, neutral copy and rotating brand strip remain.

Implemented background source collection, normalization, private persistence/history, exact media approval, publication/withdrawal, controlled Storage staging/promotion and factual social drafts. Local Postgres and pipeline tests passed. The schema is a generic unapplied SQL source, not a remotely applied migration. One genuine Rolex variant was extracted privately from its official product page; it has not been imported into Supabase or published, and its image was not downloaded.

Live blockers: the historical Jwleria Supabase project is denied to the currently connected account, including the browser; no unrelated project was modified. The owner is choosing a new independent Jwleria project in the visible organization (cost confirmation required) or the account owning the old project. The business WhatsApp number is not prepared. An approved source/media grant, intended deployment target/domain and seller-policy release inputs remain unavailable. No paid resource, ad spend, social posting, production migration or DNS change occurred.

Next action: apply the prepared schema only after the owner-selected Supabase target is accessible; verify actual database and Storage operations, then connect a permitted-source collection job and publish its verified real product images. Configure the verified WhatsApp number and deploy to the approved domain. Do not claim project completion or computer-off intake until these dependencies and end-to-end delivery work.

Earlier checkpoints below are historical; this entry supersedes their runtime/access statements.

## Live access and intake preparation — 2026-10-04

Supabase account discovery succeeded; the intended project was not visible.
A read-only SQL probe against the canonical historical project reference
returned permission denied. Full project access is not established.
The owner's existing n8n Cloud account was located and verified authenticated:
official instance MCP is enabled and existing Codex clients show management/
execution grants. Its tools are not exposed in this turn; local CLI startup
failed. Do not conflate browser login/grants with a working MCP session.

Prepared `scripts/catalog-intake/normalize.mjs`: validates minimal export fields,
omits prices/private fields, deduplicates stable source identities and rejects
conflicting versions without publishing. Four targeted synthetic checks passed.
One robots request per Rolex/Cartier/Louis Vuitton returned 200; source/media
eligibility remains unproven. See `docs/INGESTION-ACCESS-CHECK-2026-10-04.md`.
No bulk scrape, real import, database write, workflow activation or production
change occurred. Next: resolve Supabase target and recover native n8n tool
access, then verify disposable development read/write/storage and a synthetic
workflow execution before enabling one permitted-source pilot.

## Minimal catalog scope clarified — 2026-10-04

The owner rejected a product-management dashboard and owner product entry.
The public experience is brand, collection, product name, clear actual images
and WhatsApp inquiry without prices. Decision 0008 records the correction.
The architecture, roadmap and provider assessment now remove the catalog
console and keep content preparation in controlled background developer/
agent tools. Necessary source/matching/media/publication records stay internal.
Supabase remains proposed; this correction makes no provider or runtime change.

Next: prepare the small permitted-source brand/collection/product/image pilot
and minimal data contract; resolve intended environment ownership/access before
provisioning. No real product import, database connection or new Claude web
dispatch occurred. This is a saved requirement/plan correction, not a claim of
completed ingestion or revised live product rendering.

## Database provider assessment — 2026-10-04

The owner asked whether AI/MCP development and future operations favor Supabase
or Neon. Current official documentation confirms both provide official MCP and
PostgreSQL; Neon now also provides object storage and other backend services.
The recommendation retains Supabase as the proposed V1 provider for integrated
catalog/media/access operations. No universal speed advantage was established.
See `docs/DATABASE-PROVIDER-EVALUATION-2026-10-04.md` for tradeoffs and sources.

Supabase account-level read access was verified, but access to the intended
Jwleria project was not. Neon project access remains unverified because the
available unscoped connector requires a target project identifier. No provider
was provisioned or migrated, and no database or production connection changed.
Next: resolve project ownership/access and provider/region before provisioning;
prepare the approved catalog model and small test dataset in parallel.

## Lighter palette and foundation roadmap — 2026-10-04

The owner requested a lighter site and a complete next-step foundation plan.
The local shared palette now uses warm white/ivory `#fcfaf6`, paper `#fffefd`
and sand `#f1ede6`, with a subtle light hero layer. El Messiri and the existing
public behavior remain. Decision 0007 records the accepted visual change.

Prepared `docs/EXECUTION-ROADMAP.md` and empty source/product/media-grant intake
templates under `docs/templates`. The sequence proves a small genuine-content
batch, prepares controlled data/publication boundaries, replaces whole-catalog
preview filtering with server queries, establishes verified WhatsApp inquiry,
then adds reviewed social content, launch and permitted-source automation.
This is a proposed execution sequence, not connected integrations or approval
of source/media reuse, campaigns or production changes.

The static build passed with 170 pages. Settled actual browser readback showed
the new body background, retained El Messiri and equal document/scroll widths
in the checked view; a fresh screenshot is saved privately. No genuine products
were imported. Business WhatsApp remains pending. Work is local and unpushed.
Next: fill the permitted-source register and first 10–20-piece pilot in private
storage; design the database/approval model in parallel. Environment ownership,
previous public-data exposure, rights and launch gates remain open.
Before launch, identify the actual selling entity and resolve the applicability
of price/advertising requirements to a price-on-inquiry catalog. Meta/Instagram
policy retrieval was rate limited in this research pass; verify their official
requirements and account eligibility before approving a first campaign.

## El Messiri adopted — 2026-10-04

The owner selected option 2, El Messiri. The shared storefront styles now use
it as the default Arabic headline/display font, without a query parameter.
The local font stylesheet is active on normal pages. Noto Sans Arabic remains
the body face and Cormorant Garamond the Latin display face. The comparison
page marks El Messiri as selected. Fonts remain locally hosted with their
existing licenses and provenance.

Validation: 26 source files passed with zero errors, warnings or hints; the
static build completed with 170 pages. Actual browser readback on plain `/ar/`
verified the loaded El Messiri face, the shared heading family, no temporary
font override and equal document/scroll widths in the checked view. A fresh
visual capture is saved privately. This update remains local and unpushed.

Next: continue design refinement and genuine approved product/media curation;
the verified business WhatsApp number remains pending. No live contact,
database connection or production release is established by this choice.

## Typography comparison and contact update — 2026-10-03

Three actual Arabic headline fonts are available for local review at
`/ar/font-preview/`: Amiri, El Messiri and Aref Ruqaa, with a shared Noto Sans
Arabic body and Cormorant Garamond Latin face. The six unchanged WOFF2 assets
are hosted locally with their original OFL licenses and provenance. Homepage
links use an allowlisted `font` parameter for temporary comparison. No final
headline font has been chosen. See decision 0006 and font provenance.

The owner confirmed that the business WhatsApp number is not ready. Generic
contact controls in the header/menu, home band and about section now use a
shared WhatsApp component. Without the number they are disabled and visibly
marked pending, rather than navigating to a text-only contact page. With the
verified live configuration the component uses the existing direct `wa.me`
adapter. Product inquiry previews remain disclosed; no live message delivery
is claimed or destination invented.

Validation: 26 source files passed checks with zero errors, warnings or hints;
the build completed with 170 pages. Seven existing public-boundary checks
passed with no skips. Browser readback verified all three heading faces and
the shared body face loaded, the Amiri homepage query selected the actual face,
and the contact controls were disabled with no destination while unconfigured.
The settled checked font preview/home views had no horizontal page overflow.
The work remains local, uncommitted and unpushed. Next: owner typography choice
and the verified business WhatsApp number when available; genuine product/media
and production integration gates remain outstanding.

## Public copy and brand-strip update — 2026-10-03

The owner's subsequent copy correction removes masculine second-person Arabic
address. The hero is `الفخامة، بكل تفاصيلها`; Arabic actions, instructions,
search labels and related-piece headings use neutral noun-based wording. The
current product CTA is `التواصل عبر واتساب لمعرفة السعر`. The corresponding
English headline is `Luxury in every detail`. Existing public acceptance was
updated for the new CTA and passed all seven checks with no skips.

The owner requested neutral visitor-facing catalog copy and a continuously
moving brand-name strip. Personal-shopping labels and associated promotional
wording were removed from Arabic/English UI strings, page metadata, footer,
about content and default inquiry text. The empty hero label is not rendered.
This current instruction supersedes earlier public positioning copy; see
decision 0005.

The home directory strip now loops continuously, with a pause/resume control,
hover and keyboard-focus handling, and a static scrollable fallback for reduced
motion. The duplicated visual group is hidden from assistive technology and
excluded from sequential keyboard navigation.

Validation: source checks passed with zero errors, warnings or hints; the build
completed with 168 pages. Actual Arabic/English browser reads found no removed
phrases. The strip transform advanced over time, and its control switched the
animation between paused and running. The checked view had no horizontal page
overflow. This update remains local and unpushed; design/content and contact
integration work below remains outstanding.

## Local storefront preview checkpoint — 2026-10-03

The owner authorized starting the inquiry-only catalog. A working bilingual
Astro preview now exists in `apps/storefront`, alongside preserved historical
source. This supersedes the earlier documentation-only implementation status.
Decision 0004 records the accepted local scope; production release is pending.

The preview includes 41 international brand directory names, a separate neutral
Jwleria Edit collection, nine categories, 27 explicitly synthetic fixtures and
ten generated editorial images with optimized WebP derivatives. It has no
public prices, currency/country selection, authentication, cart or checkout.
Every product uses the requested WhatsApp price-inquiry action. No business
number is configured, so the current action opens a disclosed local inquiry
dialogue; no message delivery is claimed.

Claude Opus 5.5 supplied the presentation through its authenticated web chat.
Codex integrated it with the public contract, images and acceptance checks, and
fixed mobile header overflow, brand-filter restoration and copy fallback.
Local Claude Code authentication was unavailable; no CLI implementation is
claimed. See `docs/ux/preview-implementation.md` and
`docs/ux/preview-acceptance.md` for provenance and validation scope.

Validation: 24 source files passed type checks with zero errors, warnings or
hints; the static build completed with 168 pages. Seven HTTP checks passed,
covering 74 HTML responses and all 27 linked products in both languages.
Actual browser interactions verified search/no-match, category filtering and
restoration, clearing, brand-tier restoration, language switching, the inquiry
reference/copy/close controls and focus return. Narrow mobile and wide desktop
layouts had no horizontal overflow in the checked views. Field performance
and production delivery have not been measured.

Next: review the local design, verify the business WhatsApp destination, curate
approved real product/media batches and implement the server-only database
adapter behind the existing public contract. No Supabase connection or writes
occurred in this implementation. The legacy anonymous-data boundary remains a
separate production gate; hiding values in this new UI does not remediate an
older endpoint.

This is an uncommitted, unpushed local working-tree checkpoint based on the
approved foundation. No deployment, DNS/account change, public publication or
migration promotion occurred. Private evidence and backup copies remain outside
the public repository. Existing reconciliation gates below are preserved.

## Catalog architecture checkpoint — 2026-10-03

Owner clarified that the public website is an open image/product/brand catalog with a WhatsApp contact button. No public-site login, sign-up, account, portal, or administration-entry UI/routes. Content administration remains external. This is a scope clarification, not an implemented runtime change.

Prepared a public-safe proposed architecture and decision 0003 on the local
`codex/jwleria-architecture-2026-10-03` branch. Technical review is complete;
architecture adoption and public publication remain pending. No runtime
implementation or production change is claimed.

Owner-confirmed behavior: Jwleria covers luxury categories, displays no
public prices, and uses WhatsApp as its primary website
CTA while allowing private inquiries across WhatsApp, Instagram, and TikTok.
Sources, media, and content batches require appropriate permission and review.
Arabic first plus English remains a proposed locale default. The current
behavior resolves the older public price-display choice. Existing history,
repository reconciliation, and migration promotion gates remain open.

Next: prepare the shared public contract/synthetic dataset and the Opus
presentation design task with exclusive file ownership. Validate the exact
public-safe diff separately before publication. See
`docs/ARCHITECTURE.md` and decision 0003. This local checkpoint is not evidence
of a remote commit, deployment, or completed runtime fix.

## Live runtime audit — 2026-09-14

Read-only verification resolved the main technical ambiguity. The canonical
Supabase project is reachable and exposes 17 active brands, 84 active
categories, and 37 active products. No profiles, user roles, or inactive catalog
rows were visible anonymously. The committed order tables are absent from the
live REST schema cache, so checkout/order persistence is not a verified runtime.

The Supabase hostname embedded in `jwleria-s-gembox` does not resolve. The
connected AWD Vercel account has no Jwleria project, GitHub has no public
`jwleria` deployment records, and the available Lovable surface is a public
English/EUR demo preview with placeholder content. Production deployment remains
unverified.

The technical recommendation is now specific: converge by selectively
reimplementing Gembox behavior into `jwleria`; never merge the unrelated
histories. Recommend an Arabic-first RTL WhatsApp catalog for the first release,
with checkout disabled. The owner still needs to choose price-hidden versus SAR
price display. Evidence: `docs/LIVE-RUNTIME-AUDIT-2026-09-14.md`; proposal:
`decisions/0002-convergence-destination-proposal.md`.

Exact next action: obtain the single price-display decision, then prepare a
reviewed `jwleria` preview using the live catalog and real public-safe brand
identity. Preserve both repositories and make no production, database,
visibility, routing, or lifecycle change before preview acceptance.

---

## Instruction reconciliation — 2026-09-11

Consolidated duplicated session instructions while preserving project-specific safeguards, current decisions, and implementation history. Preserved the approved migration ref and its unmerged gates.

Owner authorized adoption under the Easy Life standing delegation on 2026-09-11. Prepared through PR #1; effective on the approved ref once that PR is merged. Verify its merge receipt before claiming adoption. This checkpoint changes documentation only. Existing operational evidence and unfinished work below remain valid within their dated scope; refresh live facts before acting. No historical files, platform projects, settings, or production systems were changed.

---

# Project state

- Canonical project: `jwleria`
- Status: active; migration merge blocked
- Visibility: public
- Current focus: preserve public-safe history and reconcile the private duplicate repository

## Verified foundation

- The canonical project is a jewelry commerce experience with storefront and application integrations.
- `jwleria` is the approved canonical name.
- A private duplicate named `jwleria-s-gembox` exists and has not been consolidated.

## Blockers

- A read-only commit-history comparison confirms that `jwleria-s-gembox` imported the canonical source and then diverged with later Arabic-only, catalog, price-display, currency, and integration changes. A complete tree/content comparison is still incomplete.
- The duplicate history reports a hardcoded Supabase public client key. No value is copied here; security review and credential replacement are required before any integration.
- The public repository cannot receive private operational memory.

## Next action

Perform a complete secret-aware tree comparison, classify the divergent changes, replace exposed client configuration outside the migration, and document an approved history-preserving consolidation and visibility decision. Do not merge this migration branch until all gates are resolved.

Last updated: 2026-07-17

## Repository synchronization evidence

- Verified: 2026-07-18
- Canonical repository: `A-awd/jwleria`
- Approved default branch: `main`
- Verified effective ref: `migration/one-brain-foundation`
- Verified baseline revision: `14fa8647280534e8eb7076dca02a9d8d9cd188a8`
- Evidence: the One Brain documents were refreshed from that exact GitHub revision; no business code or production system was changed.
- Runtime requirement: each agent must fetch or inspect the branch tip and remote synchronization state again before work. Local working-tree state was not inferred through the connector.
