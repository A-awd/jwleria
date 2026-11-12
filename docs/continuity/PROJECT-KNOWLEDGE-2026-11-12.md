# Jwleria project knowledge and continuation record — 2026-11-12

## Purpose, evidence and coverage

This is the detailed, sanitized knowledge record behind the compact current STATE and HANDOFF. It preserves material requirements, rejected approaches, reversals, completed work and open boundaries so continuation does not restart the project.

Evidence labels used here:

- Owner direction: an explicit requirement or approval; its scope is retained.
- Historical report: a result stated in the source conversation, not newly proven live on this date.
- Verified artifact: the actual saved implementation, review or report was inspected.
- Prepared: local or proposed work; neither upload nor publication is implied.
- Open: unresolved, unverified or awaiting a specific authorization.

The available original source was reviewed chronologically through the owner's Handoff request on 2026-11-12. The reviewed selection contains 134 actual user/assistant-final messages in nine bounded ranges, from 2026-10-28 onward. Tool bodies and reasoning are outside that selection. Earlier visible owner messages and immutable project decisions supplement it; independent original assistant/tool coverage before that window is not established. This is semantic preservation of available material history, not a literal all-message archive or assurance that the source chat may be deleted.

Private coverage, exact cutoff, raw selected messages, provider bindings, source/session links, local execution paths and image proof stay in the private handoff packet. The two missing temporary screenshot references were recovered as their exact embedded user-image payloads, without claiming recovery of the original temporary files. The original pasted owner directive and device-context screenshot were copied unchanged. A project-specific iCloud destination and remote private sync were not verified.

## 1. Product and owner outcome

Owner direction: Jwleria is an Arabic/English, anonymous product and brand showcase, with mobile use as the primary experience. It is not an account-based application or checkout. No displayed prices, customer login, cart, checkout, country/currency selector or owner product dashboard is required. It covers luxury and accessible-luxury brands and categories such as watches, bracelets, leather goods, handbags and luggage.

Cards should be visually quiet: brand, recognizable product name and photograph. Reference, movement, calibre, material and other technical details belong on the product page in readable paragraphs or compact expandable detail. Avoid marketing copy describing the business as personal shopping, personal shopper or concierge. Arabic copy should address all genders without unnecessary masculine commands.

Earlier WhatsApp contact intent remains a product requirement for its later phase; the owner subsequently deferred the number, contact integrations, social media and ads. Do not ask for the number or rebuild those systems as a prerequisite to photo delivery. True interactive 3D was explored and explicitly deferred; current deliverables are faithful two-dimensional product photos.

A moving brand strip, lighter page palette and Arabic font option 2 / El Messiri were adopted in the earlier implementation. Three alternative full design previews remained unselected. The approved Longchamp-like photo/grid reference below does not select one of those full redesigns.

## 2. Architecture and implementation ownership

The live implementation is the Astro storefront in apps/storefront, deployed as a Cloudflare Worker. The older root Vite/React application is not the live site. Squarespace holds the domain registration. The adopted stack uses a dedicated Supabase project for structured catalogue/media metadata and storage, Cloudflare delivery, GitHub for sanitized project continuity and n8n for off-request orchestration. Do not reopen the earlier Supabase-versus-Neon/Hostinger comparison without a new material need.

Visitors must not wait for n8n, scraping, image segmentation, catalogue-wide database loads or background AI. These jobs happen outside page requests. Larger paid hosting is not an established remedy for oversized assets, unnecessary JavaScript, oversized result sets or touch interception.

Claude owns implementation, tests, technical review and integration. Codex coordinates, operates approved provider steps and performs genuine operator visual review. Codex must not silently become a second application implementer or duplicate Claude's code audit. Coordination with Claude is in English; owner-facing communication is Arabic.

The owner has asked for more autonomy, long comprehensive briefs and fewer repetitive questions. A larger prompt cannot confer provider access, restore an expired session, override automatic approval denial or guarantee completion. Use compact current facts and a bounded executable next action. Do not restart huge old contexts simply to recreate information already saved.

## 3. Catalogue identity, variants and truthful counts

One genuine design/model is one listing with its actual size and colour variants. Keep distinct references, specifications and variant-level media bindings. A shoe size, watch diameter or bag size alone must not become another duplicate card. Do not merge different designs or materials merely because their names overlap.

Historical grouping checkpoints changed from 2,886 parent models to 2,579 with 4,097 variant references. These are dated catalogue figures, not a fresh total or current photographed coverage. Historical examples included Datejust 31/36/41 and multiple Amazona sizes. When a reused exact photograph represents one photographed size, disclose that fact; never claim it proves another size's dimensions.

Reference matching needs the official page, exact reference and declared colour/material/gallery identity. A generic brand search or image filename alone is insufficient. Visual review can find a wrong appearance but does not establish exact SKU identity when visually ambiguous. Keep uncertain matching explicit rather than manufacturing confidence.

The owner previously saw empty or facts-only pages after claims of thousands of products. Preserve the distinction between variant records, model listings, source URLs, downloaded originals, accepted masters, encoded derivatives, uploaded objects and actually public product photos. Eight encoded files for one item are one photographed item, not eight products. A catalogue of official image URLs is not an approved, downloaded or public image library.

## 4. Mobile layout failures and accepted direction

A supplied mobile screenshot documented a chaotic wall of variable-width size/colour pills and repeated helper notes. The owner also reported that image interaction captured most of the screen, preventing normal vertical scrolling except at the edges. Changing colours required scrolling away from the photo, and the new photo could leave the phone viewport.

The implemented direction is compact controls with clear current values, ordered sizes, restrained option lists, collapsible secondary information and an image area that preserves native page scrolling. Avoid many simultaneous pills, repeated size-change warnings and intrusive sticky elements. Switching a variant should update in place, retain the relevant image/control context and preserve useful back-navigation state.

Historical checks reported phone-width browser success, not physical iPhone testing. At the time of the earlier multi-colour request there was no actual model with every colour fully photographed. A layout demo or unavailable-image message is not a successful colour-media acceptance case. Final validation must use a real, fully bound product and confirm the correct image for every selectable colour, without substituting an attractive photograph of a different variant.

## 5. Photo direction, quality failures and reversals

Owner direction: prefer the brand's actual product packshot, preserve product details and use free resources first. Local non-generative background removal was expressly authorized. Do not generate, redraw, recolour, beautify or invent product pixels, logos, dials, chains, textures or unseen geometry. A synthetic product reconstruction cannot stand in for an exact commercial reference.

A single independent Rolex photograph was previously approved under its own CC BY 2.0 attribution and limited reference uncertainty. That one-photo exception must not be generalized to other products or represented as an official brand image.

A second independent Rolex photo was cut out and published historically, then rejected as unattractive. The source was not an official Rolex studio packshot. Reframing and a neutral background did not fix unsuitable source lighting and texture. The owner specifically approved hiding that rejected image while preserving the product, original and other data. The historical report says it was hidden. Do not restore the rejected image or recycle that aesthetic approach.

Photoroom, BRIA, Replicate, generated backgrounds and other commercial options were explored. None is established as the selected cheapest/best provider, and no new subscription or API spend is authorized. An early local generated-background experiment was discarded for poor quality. Preserve the settled free, flat-background path rather than reopening vendor comparisons.

The later owner-supplied official Longchamp grid became the accepted photo direction for all categories:

- A clean white page with a pale neutral card background around #f0f0f0.
- The whole product, a consistent apparent size and deliberate whitespace; approximately 0.68 optical fill in the current profile.
- Comparable visual presence for a watch, small bag or suitcase; not a diagram of their real-world relative sizes.
- Two restrained columns on mobile, simple names and no prices.
- Native transparent official assets where available; otherwise preserve the original and segment only the background.

Earlier white/cream backgrounds, roughly 80% fills or category-relative real-world scale proposals are superseded by that direction. Responsive targets such as 320/640/960 and larger output up to 1600 are implementation choices constrained by actual native product resolution. Do not upscale merely to hit a nominal width. Width, compression and a similarity score alone do not prove clarity, identity or complete product preservation.

Originals remain immutable. A mask can preserve every fully opaque RGB pixel and still destroy material through unwanted partial transparency; the Bottega failure below proves why actual source/cutout/alpha/master review is necessary.

## 6. Source policy and permission boundaries

The earlier written-permission-only plan and proposed Longchamp outreach were superseded by the owner's explicit no-brand-contact decision, recorded in [decision 0025](../../decisions/0025-official-images-without-brand-contact.md). The draft was cancelled unsent. Do not contact brands, request permission, apply to programmes or wait for replies.

The selected route records truthful owner direction and official-page provenance. It does not manufacture written permission, open licensing, copyright ownership or a grant from a brand. Keep source origin, transformation and uncertainty truthful.

Use declared official image/gallery renditions and saved originals, paced per source. Work across independent permitted sources may be independent, but the owner's explanation-only question about 100 agents was not an instruction to launch them. The latest operational direction remains sequential without extra agents or Ultracode.

Source refusal must retain its actual scope and evidence. No unchanged retries, proxy rotation, invented larger URLs or access-control bypass. A refused single image lane does not establish that an entire brand is permanently inaccessible. A missing file should not automatically erase already acquired good work.

Permanent tool settings and broad OAuth consent do not authorize every operation on every organization project. A dot confirms only the pending manual step. Handoff is not a production release or expansion of scope.

## 7. Execution continuity through 2026-11-09

Historical sessions moved among cloud execution, official local subscription CLI and a Remote Control browser view. Local execution means the host runs commands; it does not mean offline model inference. The browser view is a bridge to that execution, and a disconnected computer icon is not proof that the deployed website is down or that saved work was deleted.

The UI did show an Ultracode option in a later session after an earlier categorical denial that it existed. Do not repeat that denial. The owner then explicitly requested Opus 5.5 Medium, English coordination and lower token consumption, so Ultracode and extra agents were turned off. The latest owner request before Handoff asked for a higher model; the actual last run used Opus 5.5 with Max effort, still sequential with Ultracode off.

An alternative model's credits gate was cancelled. No paid credits, extra usage, API billing or replacement account was enabled. The reported quota reset at 20:50 Riyadh on 2026-11-09 is historical and must not be described as today's blocker. Neither Claude quota nor session connectivity was rechecked as part of the 2026-11-12 Handoff.

The last actual Codex in-app browser attempt reported disabled local browser use. No external browser or headless substitute was used. Current browser capability must be established only when a required UI check is reached; this Handoff does not assert it is still disabled.

## 8. Actual saved batches and technical results

The following are last verified run results from 2026-11-09, with artifact continuity checked during Handoff. They are private preparation, not new public image delivery.

### Longchamp

- 382 prepared variants in three completed dry bundles: 354 + 17 + 11; 1,528 responsive files, zero bundle refusals.
- All 382 original/master reviews exist. Only 832 batch-one derivatives received supplementary visual review; do not claim all 1,528 derivatives were visually reviewed.
- Eight additional changed shoe-gallery originals and masters are accepted, including the repaired grayscale shoe, but remain unbound pending real gallery refresh. They are outside the 382-variant production request.
- The grayscale source was a valid untagged gray-with-alpha PNG, not a low-resolution image. Lossless gray-channel decoding was corrected and independently checked. A detached faint vertical line outside the shoe was removed without changing visible product pixels. Keep the earlier wrongly labelled ledger entry as history and the new exact-hash acceptance separate.

### Bottega Veneta

Seven official originals, local non-generative cutouts and masters were prepared, with 28 responsive previews. A green bag's mask made enclosed leather regions translucent even though the retained-opaque-pixel check passed. The original negative review remains unchanged.

Claude repaired only six enclosed material-loss regions using the original pixels, preserving the genuine handle opening. Codex reviewed the actual repaired proof and accepted the new hashes. The other six accepted masters remained byte-identical. The private dry run bundles seven current variants and 28 files; an additional refusal correctly rejects the old green hashes.

A source-specific activation/rollback proposal was prepared and separately SQL-tested. It has not been approved or applied.

### LOEWE

Both full page collections terminated; do not describe them as running or restart them. The corrected INT/EN bags/wallets/small-leather-goods pass processed 395 pages: 359 complete and 36 incomplete, comprising 35 missing a collection/line and one redirect. This is not proof of worldwide brand completeness.

The cohort contains 334 current held references, 73 stale held references and 25 newly complete pages not imported. Current official gallery file paths matched the held cohort; newly page-declared 1200-pixel renditions are different bytes from the older 500-pixel renditions. Preserve new hashes and honest gallery refreshes.

The image job exited 1, with 137 result entries: 136 originals downloaded, 121 cutouts/masters completed, 15 genuine resolution holds, and one further media-robots refusal. Of the planned 334 references, 197 were not reached. The 15 photographed-product extents were 541–651 pixels, below the 653 required for a 960 frame at 0.68 fill; do not upscale them.

Codex actually inspected all 121 original/checker-cutout/alpha/frame rows and seven native close-ups: 118 accepted and three rejected cutout/master sets:

- A120HPLX04-9003: background retained inside the handle and substantial lower silver zip-pull loss.
- A411NBPX40-1193: most hanging silver chain removed.
- A510P60X96-1160: background retained inside the silver handle opening.

Preserve originals and the three negative hashes. Four initially uncertain weave cases were cleared by native inspection and must not be regenerated unnecessarily. No LOEWE derivative review, approved publication bundle or public delivery is claimed.

The first accepted master is 1362 square from a native 1200-by-1812 original. Native-size versus a nominal 1600 output is an open validation question, not a proven encoder defect. Demonstrate actual cap/skip behavior before preview encoding, without weakening the no-upscaling or framing requirements.

The stopped media lane is source_refused at A538H13X03-1150. Diagnose its exact saved robots/origin/path evidence before further permitted work; do not replay the same request or generalize its scope.

### Implementation and validation receipts

Claude's saved code checkpoints include 748e6e7 for mask/gray/generic-source handling, afb6e4c for declared renditions/missing-file handling and 77c0e1e for all declared gallery arrays. The observed producer receipts were intake 154/154 after driver changes, final extractor 30/30, storefront 220 passes with five optional browser checks skipped, and three separate Bottega SQL proposal tests. Skips are not passes, and tests do not replace visual or public verification. No application code was changed during this Handoff.

## 9. Upload readiness and the exact pending production boundary

Last read-only observations on 2026-11-09: the existing media upload function was active with JWT verification; an unauthenticated call returned 401. The public WebP bucket contained 15 objects with a 15 MiB limit. These are dated observations, not current authenticated bulk-delivery proof.

The documented gateway caller is an existing public legacy anon JWT client key, entered transiently at upload time. It is not a new service-role secret. Its absence from Claude's shell is not proof of a missing credential. The manual-only approved-image-delivery workflow exists but replay writes PUT requests, so it is not a harmless readiness check. Authenticated bulk acceptance remains unverified until an approved real upload.

The previous production migration was automatically denied as Production Deploy. It was not retried or bypassed. The still-unanswered consolidated release request is limited to:

1. Longchamp owner-direction route SQL, SHA256 065dbb84e305c92c59470dafd5bc7889aa599718afdc0bbe71a82e14d3e66a6f.
2. Required derived grouping repair, SHA256 dbab881e85d778b60e6259a1f7db6d9e57ff1677ff4e3680b6904a3c335a3ea9; rollback cc1f3581218a86f49ae6a0c0c13cf385050600b1c9b0974d8f29079372934188.
3. Record, upload and publish only the 382 prepared variants.

The grouping correction separates two design groups across 16 variants (10 and six colours), preserves variant material and repairs derived grouping only. It is required, not an optional deferral.

Bottega activation, eight Longchamp gallery refreshes and unfinished LOEWE bindings/activation are outside that scope. A new conversation, Max effort, Always allow, renewed login, quota reset or Handoff is not the missing release approval. Do not change writer or permission mode to avoid the denial. Continue independent private repairs while that specific approval is pending.

## 10. Fresh Handoff verification and first continuation action

On 2026-11-12 the active worktree and both authorized implementation branch heads were verified at ed6f5ab45454a8d84448ddeb1da729baef1450a3 before Handoff document edits. The worktree was clean. Current approved governance was read separately; it is not permission to replace newer implementation with the older foundation, merge to main or merge the separate duplicate repository.

The actual LOEWE 121-review record still matched the saved review digest, and the three rejected cases' source originals existed and matched their recorded hashes. Full prior STATE and HANDOFF are retained unchanged at the immutable checkpoint:

- [Prior STATE](https://github.com/A-awd/jwleria/blob/ed6f5ab45454a8d84448ddeb1da729baef1450a3/STATE.md).
- [Prior HANDOFF](https://github.com/A-awd/jwleria/blob/ed6f5ab45454a8d84448ddeb1da729baef1450a3/HANDOFF.md).

The next executor should load the compact current HANDOFF and private receiving brief, establish the actual current Claude availability, and have Claude repair only the three rejected LOEWE masks first. Obtain new-hash proof for genuine operator review; then settle native-size output and the precise stopped acquisition lane. Preserve completed accepted work. Do not repeat broad catalogue collection, vendor research, outreach or an expired quota wait.

No new product photograph was published by the last implementation run or by this Handoff. Current public coverage, authenticated bulk delivery, mobile colour-photo acceptance and runtime connectivity are not newly verified. A local prepared receiving draft is used because this session has no native local-chat creation capability; submission and a receiving-chat identifier are not asserted. The permitted private receipt records that distinction.
