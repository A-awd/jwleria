## Minimal cards and readable product facts: deployed and visitor-verified, 2026-10-29

**Deployed (producer-reported by Codex, the operator):**
- Codex verified all 73 compiled-file hashes, then uploaded the frozen package `releases/storefront-bf6812e3c5d4/` with no rebuild, using `--no-bundle --keep-vars --no-autoconfig`.
- Codex read the new version back as active at 100%: source `bf6812e3c5d4`, `SHA256SUMS` sha256 `584e470e…7491`.
- Runtime and binding metadata match the prior baseline. The workers.dev and preview-URL states are preserved, and the apex and www custom domains stay in Production. `noindex, nofollow` and the robots restrictions are preserved.
- Version IDs, configuration and screenshots stay private with the operator.

**Visitor-verified (Codex, in-app browser, Arabic and English):**
- Measured at 390×844 CSS px on mobile and 1229×960 on desktop, with no horizontal overflow. This is a CSS-viewport check, not a physical-device test.
- Watches category cards show only brand and name (plus the approved photo and its full credit where one applies). There is no summary, reference, collection, count or card action.
- A pointer click on the Arabic Jaeger-LeCoultre card opened `/ar/products/jaeger-lecoultre-q3926480/`:
  - the identification paragraphs show Q3926480, Reverso Tribute and the category;
  - the technical paragraphs show manual winding and calibre 847;
  - the page has 0 `dl` elements and no repeated summary.
- The English header link opened the counterpart page, with the same facts and structure.
- The Rolex m126234-0015 photo decoded from its unchanged approved 640w file, shown whole (`contain`), with the full CC BY credit and links visible.
- Choosing the Silver option by keyboard opened the m126234-0013 URL. The reference and the dial in the paragraphs changed, and that sibling showed no photo, so the approved photo did not carry over.
- No Jwleria-origin browser warnings or errors were observed.

No database, media, function or bucket state changed. The Photoroom cream sample stays a private preview with no adoption. Wider photo coverage and the A/B/C selection remain open. Rollback floor: `fbf04b80a181`; never roll back below it while the titled credit is public.

**Prepared record from earlier on 2026-10-29 (kept for history):**

**Owner display rule:** decision 0014, a narrow display refinement, not A/B/C adoption.
- Cards show only the photograph (when a real one exists), its required credit, the brand and the name.
- Product pages show every available fact as labelled paragraphs in groups.
- The Photoroom cream sample stays a private experiment. It is not in this release and sets no background, style or media policy.

**Prepared (not deployed):**
- Source commit `bf6812e3c5d4` on this branch. Changed surfaces:
  - `ProductCard.astro`, the shared card: it renders photo, credit, brand and name only. The collection, summary, reference, option counts, preview badge and card inquiry action are no longer rendered.
  - The product page: the generated summary sentence and the definition list became grouped paragraphs. The groups are identification; design and materials; technical; other.
  - New helper `src/components/product-facts.mjs`. It keeps the facts that only a generated summary states: 10 Prada buckles carry finish, logo material or "belt included" only there.
  - Group headings in `i18n/ui.ts`; the unused card count helper is removed.
  - CSS: the `.facts` styles replace `.specs`, and the rules for removed card parts are gone. The facts-only card's `min-height: 20rem` is dropped because the card now holds two lines; its final look belongs to the designer stream.
- Data, search, model grouping, variants, credits, the product-page inquiry action, routes, cache and indexing settings are unchanged. No database, media, function, bucket or provider write was made.
- Package `releases/storefront-bf6812e3c5d4/`: 73 compiled files. `SHA256SUMS` sha256 is `584e470e72de3e69a48d1974b0cbd8fcebf1771b9d167987d765b7d20dce7491`. Its `DEPLOY.md` is upload-only and keeps the configuration.
- Rollback target: `fbf04b80a181`. Never roll back below it while the titled credit is public.
- Checks:
  - Storefront: 158 tests, 153 pass, 0 fail, 5 opt-in skips (browser and preview; Playwright is not installed).
  - `astro check`: 0 storefront errors. The 7 errors are the existing Deno upload-function types, unchanged.
  - Every one of the 2,886 public model summaries (read over public HTTP) parses as a generated summary in both locales, so no page falls back to the old sentence.
  - Local rendered-HTML check, built node server against the synthetic catalogue, Arabic and English: every card holds brand and name only; a synthetic credited photo keeps its full credit; search finds the model; every product page has grouped paragraphs, no definition list, the selected variant, its credit and the inquiry action.
- Live visual acceptance at phone width belongs to the root operator's browser.

**Live before this release:** Worker source `fbf04b80a181`; 1 licensed photo on m126234-0015.

## Models applied and the first product photograph live, 2026-10-28

**Visitors can now see (visitor-verified):** one genuine product photograph on one product. `/ar/products/rolex-m126234-0015-e45f1880/` and `/en/products/rolex-m126234-0015-e45f1880/` show the whole photo with the credit «Rolex Datejust 36 - Up High» — Ajay Suresh · CC BY 2.0 · source · resized and converted to WebP. The search card for `q=m126234-0015` shows the same photo. Codex checked both locales in its in-app browser at 390×844 CSS px: the photo decoded, the 640w file was chosen, it is shown whole (`contain`), there is no horizontal overflow and the full credit is visible. This is third-party photography under CC BY 2.0, not official brand photography. Three files (320, 640 and 960 px) are encodings of that one photo.

**Models (applied, then observed live):**
- Migration `20261028111013_jwleria_product_models`. The stored statement equals the reviewed apply body byte for byte (md5 checked before and after).
- Mapping `jwl_internal.apply_product_variants()`: 4,097 variant rows; 2,886 displayed models; 283 grouped models holding 1,494 variants; 2,603 single models. No primary-key or position collisions. The public catalog was unchanged by both steps (hash `b2182069…` before and after).
- Live site: brand pages show model cards with option counts, for example "13 dials · 2 bracelets". Exact `q=m126234-0015` search returns 1 model and opens that reference. Its page selects dial "Bright black" and the Jubilee bracelet, and the old variant URLs still resolve. No size axis was invented.

**One-photo media lane (applied, deployed, published), in the runbook order:**
- Fresh read before (a): matched the prepared bundle in every field.
- (a) Migration `20261028111829_jwleria_open_license_media`. The stored statement equals the reviewed body (repository file lines 20–385, without its outer `begin`/`commit`).
- (b) The public `jwl-product-media` bucket: WebP only, 15 MiB limit.
- (c) One open-licence grant for m126234-0015 only.
- (d) 3 evidence rows and the verified approval.
- The upload function `jwl-media-upload` was deployed from the reviewed source with **JWT verification on**. Its caller is the project's existing legacy anon JWT; the non-JWT publishable key was not used. An unauthenticated call gets 401.
- (e) 3 files uploaded through the function, each read back publicly with the expected sha256, `image/webp` and a one-day cache.
- (f) Published through the open-licence lane, with an in-transaction guard that no other catalog row changed.
- 07 read-back: 1 image on the row, carrying the titled credit. The other 1,464 Rolex rows are all still active and facts-only. 4,097 active public rows. The Rolex source flag `publication_allowed` stays `false` and was never written. The search text is identical. A sibling variant (m126234-0013) shows no photo.
- `X-JWL-Cache`: MISS observed; HIT and STALE were not observed.

**Owner approvals used (recorded once):** the models migration and its mapping; decision 0013 lines (1) grant kind, (2) source-flag exemption and (3) creator-stated identity route, with `exact_reference` kept `"uncertain"`; the bucket; and the upload function with JWT on. Scope: m126234-0015 and this one photograph only. The four other series photographs stay excluded.

**Coverage, honestly:** 1 of 4,097 public products has a photograph. Every other product is facts-only. Wider photo coverage needs new eligible sources or grants through the same evidence path (`docs/spec/COVERAGE-AND-SOURCE-REGISTRY.md`). Decision 0013 covers only m126234-0015.

**Repository:**
- Both applied files are now in `apps/storefront/supabase/migrations/`, and the two applied proposals were removed from `proposed/`; their rollbacks stay there.
- The PGlite tests were repointed to the registered files.
- Storefront: 155 tests, 150 pass, 0 fail, 5 opt-in skips. Two of the skips are Playwright checks, because Playwright is not installed in this checkout.
- Intake: 117 of 117 pass.
- No storefront source changed, so the live Worker (`fbf04b80a181`) stays as it is.

**Database question channel:** the ordinary native question channel worked in this interactive session. Codex, the authorized coordinator, observed and accepted **two** native Supabase server questions under the owner's existing explicit approval. The first was for the read-only dollar-quoted md5 check of the models body. The second was for the exact models `apply_migration`, whose query sha256 Codex independently confirmed as `0b6f1b93e3ca8486f93f0e20da3ce03a63927e1e80130b28fc1a630836627cdc` before accepting. These are the only two questions Codex observed; this record does not claim that any other statement showed one. The producer session never saw the host dialog, which does not mean no dialog occurred. No hook, `skip_elicitations` setting, alternate tool routing or permission bypass was used. Every write was read back afterwards. DB-1 is closed for these operations.

## Transfer to the interactive continuation, 2026-10-28

**Live:**
- **Worker:** the operator reports that the prebuilt release `releases/storefront-fbf04b80a181/` was uploaded with no rebuild; all 74 checksums and the SHA256SUMS hash `e147b36b…` were verified. Provider and visitor read-back is still pending. Until that receipt arrives, treat the release as uploaded, not visitor-verified. (producer-reported)
- **Database (observed live, read-only, 2026-10-28 08:11Z; the operator's Dashboard read at 08:05Z agrees):**
  - Migrations: 7, last `20261026114541`.
  - Catalog: 4,097 active public rows, 0 with images.
  - Media: 0 grants, 0 storage buckets.
  - Models table: absent.
  - Catalog hash: `b2182069be5de7756e9252a71be3dee7`, the baseline the models mapping expects.
  - Dashboard: shows an "Unhealthy" project badge, but SQL reads succeed. This is not treated as a database failure.

**Prepared (unchanged since `fbf04b80a181`):**
- The models migration and its mapping.
- The open-licence migration.
- The one-photo media bundle.
- Producer tests, cited and not re-run: storefront 155 tests, 152 pass, 0 fail, 3 opt-in skips; intake 117/117.

**Transfer:**
- The full private execution tree, 56 files with `SHA256SUMS`, is held in the owner's private Artifact. It contains the runbook (`TRANSFER.md`), the models migration with its apply body and rollback, the rendered media steps, the evidence, the held source files and the scripts.
- Retrieval: an account Claude session uses the Artifact tool's read action with `paths`. This was verified: all 55 checksummed files matched.
- The same tree was also attached as one archive in the owner's cloud conversation.
- Nothing private is in Git.

**Ownership:**
- From this commit, the cloud session writes nothing to this branch, the database, functions, storage or the artifact.
- The interactive local Claude Code session (real PTY, no `-p`) owns every database, function, storage and media write, and the branch.
- Codex owns Worker uploads.
- No cloud workflow or background task is running.

**Database fault, unchanged:**
- The earlier `apply_migration` calls timed out on an unanswered server question (MCP elicitation). The question's text was never captured.
- Nothing was answered or repaired, and the database did not change.
- The supported next step is the interactive session, where the form can be read and assessed. See runbook DB-1.

## Integrated: foundation completion pass, 2026-10-27

**Live (unchanged by this pass):** Worker release `2a1864b` (operator-deployed). Database: 7 migrations, last `20261026114541`. 0 grants, 0 approvals, no media bucket, 0 public products with images. 4,097 active public products across 12 brand sources, all facts-only. Models view absent. (Observed live, read-only, 2026-10-27 18:08Z and 19:07Z.)

**Integrated on this branch (merge `fbf04b80a181` of the reviewed `wf/finish`):**
- **Credit title:** the work's title from the author ("Rolex Datejust 36 - Up High") flows through grant, evidence, credit and storefront. Old five-field credits stay valid.
- **Blank text:** credit strings made only of Unicode spaces are refused in SQL.
- **Copy:** no implied brand stock or affiliation, one spelling of "inquiry", and the concierge id removed. The audit found no personal-shopping wording and no male-only Arabic imperatives in public strings.
- **Photo framing:** approved product photos show whole on phones (`contain` in the 4:5 frame), with no hover crop.
- **Records:** `CLAUDE.md`, plus the modules in `docs/spec/`.
- **Tests on the merged tree:** storefront 155 tests, 152 pass, 0 fail, 3 opt-in skips; intake 117 of 117 pass. The build succeeds.
- **Reviews:** licence, copy and mobile research; a gates/SQL review; a site/mobile review; a repair; and a re-review. All actionable findings are fixed.

**Prepared release:** `releases/storefront-fbf04b80a181/` contains 74 files. The sha256 of SHA256SUMS is `e147b36bdcf79e1518bee3cba8df53dbc2de2d5b74880c892859f64c7fad4bb4`. It is upload-only; see its `DEPLOY.md`. It must be live before any titled credit is published, because the live release throws on a `title` key.

**Private media bundle (m126234-0015, one photograph, three WebP sizes):** re-rendered at 19:07Z from `fbf04b80a181` after a matching fresh read, and the simulation passed. The rendition URL was re-confirmed live at 18:09Z: HTTP 200, identical bytes. The bundle is held in the owner's private Artifact and is not in Git.

**Database confirmation fault, diagnosed:** this matches the documented MCP elicitation timeout in non-interactive mode. The Supabase server asked a question that a cloud session cannot show or answer, and its text was not recorded. The documented remedies are an interactive session where a person answers the dialog, an Elicitation hook (which changes approval enforcement, so it is an owner decision), an SDK callback, or a longer server timeout (not editable for a claude.ai connector from here). There was no third attempt and no alternate tool. See runbook DB-1.

**Owner decisions still open (one batch):** the open-licence migration as three lines, (a) the grant kind, (b) the source-flag exemption and (c) the creator-stated identity route; the media bucket; the upload-function deploy; and the channel for answering the database confirmation. See `docs/spec/DECISION-APPROVAL-LEDGER.md`.

## Finishing pass on `wf/finish`: credit title, copy, photo framing and project records, 2026-10-27

All prepared on this branch; nothing applied, uploaded or deployed. Live state is unchanged from the entry below.
- **Credit title (prepared):** CC BY 2.0 section 4(b) requires the work's title "if supplied". The front m126234-0015 photograph's author supplies "Rolex Datejust 36 - Up High" in its embedded metadata, so each licensed file now records `title` (or `null`), and the credit carries it end to end: proposed SQL, pipeline and storefront. Five-field credits stay valid. Two consequences: the private execution bundle must be re-rendered and re-hashed, because the proposed SQL changed; and a Worker that accepts `title` must be live before any titled credit is recorded. The live Worker would throw on it, failing the product page and every listing that includes the product (RL-3).
- **Copy (prepared):** the copy audit's replacements are applied. Directory brands no longer claim "selections" or availability, the home, latest and own-collection leads describe a directory and pieces on view, and the concierge key and DOM id are gone.
- **Photo framing (prepared):** approved product photographs use `contain` in the gallery and on cards, inside the unchanged 4:5 frame. Local preview at 360/390/430 px in both locales: 99.4–100% of the width and 100% of the height visible, CLS 0, no overflow. Editorial imagery keeps `cover`.
- **Rendition confirmation: done** (observed live, 18:09Z). HTTP 200, and the served sha256 equals the held bytes.
- **Review fixes (prepared):** the desktop hover override now matches the card link (`a.media:hover`), so a hovered card photo is no longer zoomed or cropped; a new browser test checks this at 1280 px with hover, and that editorial art still zooms. The licence name in a credit no longer breaks across lines. The proposed SQL refuses credit strings made only of Unicode spaces (`jwl_internal.visible_credit_text`, for the title, the other credit fields and the grant's creator and attribution text), matching JavaScript `trim()`; this changes the proposed SQL again, so the bundle re-render in the handoff still applies. RL-3 and D3 now say that a credit key the live Worker does not know fails the product page and every listing that includes it, and that the recovery is to revoke at once. The licence URI half of section 4(b) is recorded in the decision ledger: no licensor-specified URI. Copy: "inquiry" is spelled one way, and three wording nits are polished. Suites: storefront 155 tests, 152 pass, 0 fail, 3 opt-in skips; intake 117 of 117.
- **Records:** `CLAUDE.md` and `docs/spec/` (execution spec, requirements and evidence ledger, decision and approval ledger, stop and recovery runbook, maintenance backlog, coverage and source registry). The open-licence approval needs **three** owner lines, not two: (a) the grant kind, (b) the source-flag exemption and (c) the creator-stated-reference identity route.

## Foundation and media checkpoint: what is live and what is not, 2026-10-27

**Live (deployed by the operator; this session has no deploy tool):**
- Worker `jwleria-storefront` runs the prebuilt foundation release from source commit `2a1864b` (`releases/storefront-2a1864b35fd8/`). Codex uploaded it and read it back: the new version is active at 100%, the rollback target is recorded privately, and domains, secrets and bindings are unchanged. `noindex` and robots `Disallow: /` are kept. Version IDs stay out of this repository.
- Search works with the form's `q` parameter. Codex confirmed exactly one result for `/en/catalog/?q=m126234-0015` and `/ar/catalog/?q=m126234-0015`. Only `X-JWL-Cache: MISS` was observed; HIT and STALE are unconfirmed.
- Database: 7 registered migrations, unchanged. Live approved product images: 0. Bucket: absent (read-only check at 11:53 UTC).

**Not applied (blocked by the database confirmation path):**
- Models migration `jwleria_product_models`. Two `apply_migration` attempts timed out after 60 s because the action-time confirmation was not answered. There was no third attempt and no other tool was used. Until it is applied, the site runs in the exact fallback: one card per reference.
- Open-licence migration (`apps/storefront/supabase/proposed/jwleria_open_license_media.sql`), the media bucket, the upload function and every media write.

**Prepared, reviewed and merged on this branch (merge `b1e5838` of `wf/olmedia` at `24d4f2c`):**
- Open-licence grants may cite Wikimedia renditions, recorded as renditions with their width. MediaWiki md5 hash directories are checked in SQL and JS. Derivatives are never wider than the rendition. A held copy needs its sha256 and is never accepted as an original.
- Decision 0013 (`decisions/0013-open-licence-exact-product-photos.md`) covers m126234-0015 only. The decision reference is pinned in code and SQL. Decision 0011 cross-references the source-flag exemption, which needs its own owner approval line.
- Web delivery: measured lossy WebP replaces lossless output. No approved decision required lossless; the canonical budget is about 150 KB per card file. Each file takes the highest ladder quality that fits its budget at SSIM 0.97 or above. Any exception needs an independent record; there is no waiver flag.
- The open-licence publish lane adds images to a row already public as facts. It never reads or writes the source flag, and every displayed fact and the stored search text stay as they are. The source trigger withdraws only media-lane rows: 0 such rows exist for Rolex, and the 1,464 other Rolex rows are facts only.
- Reviews: provenance and gates, performance and fidelity, a re-review, a final review and a close-out. All actionable findings were fixed. Suites on the merged tree: storefront 145 tests, 142 pass, 0 fail, 3 opt-in skips; intake 117 of 117 pass.

**Photo batch for m126234-0015 (private execution bundle; nothing executed):**
- One photograph passes every gate: `Rolex_Datejust_126234.jpg`, a 960 px rendition. Its creator states "ref. 126234, 36 mm, black dial, Jubilee", and the independent visual record confirms the variant. It is delivered as 320, 640 and 960 px WebP files (27,378, 78,538 and 145,594 B), with no visible detail loss in the independent comparison.
- Four photographs are excluded: their creator states no reference, and three have an uncertain dial shade. "Presentation Ready" (330 px) and m126200-0006 (500 px) stay out.
- The bundle (rendered SQL in execution order with sha256, evidence, rollback, scripts and the three files) is in a private Artifact held by the owner. It is not in Git because source bindings stay private (decision 0009).

**Remaining external gates, in order** (superseded: the current list is `docs/spec/DECISION-APPROVAL-LEDGER.md`, where the migration approval has three lines, both halves of the title/URI point are closed and `confirm-renditions` is done)**:** owner approval of the open-licence migration as two lines (the grant kind, and the source-flag exemption); the action-time database confirmation for each write; owner approval of the bucket and the upload-function deploy; licence-reviewer confirmation of the CC BY 2.0 title/URI point; `confirm-renditions --network` for the front rendition before step (d); a fresh read that still matches. The same database confirmation path also blocks the models migration.

**Reported, not changed:** on phones the gallery's 4:5 `object-fit: cover` frame shows about 60% of a 4:3 photo's width. The fix (`contain`, or a frame that matches the photo's aspect ratio) belongs to the designer stream and needs a Worker release.

## Foundation release deployed (operator) — 2026-10-27

- **Worker upload: done by the operator (Codex), not by this cloud session.** Codex deployed the exact prebuilt package from `releases/storefront-2a1864b35fd8/` (source commit `2a1864b`) with the upload-only command. Codex read back: the new version is active at 100%, the previous version is recorded privately as the rollback target, and custom domains, secrets and bindings are unchanged. `PUBLIC_*` variables are absent, and `noindex` and robots `Disallow: /` are kept. Version IDs are kept out of this public repository.
- **What this release does and does not change.** The foundation code is live. The models migration is still unapplied, so the site runs in its exact fallback: one card per reference, as before. Live approved product images: 0. This upload was not a models migration and not a photo publication.
- **Cache:** only `X-JWL-Cache: MISS` was observed. `HIT` and `STALE` were not verified.
- **Search smoke check:** the documented URL `/en/catalog/?search=m126234-0015` was wrong. The search form submits `q`, so `search` is ignored and the unfiltered catalogue is shown. Live checks with `q`: `/en/catalog/?q=m126234-0015` and `/ar/catalog/?q=m126200-0006` each show exactly one piece, linking to its product page, and `/en/catalog/?q=datejust` shows 972. This was a documentation error, not an application regression. `DEPLOY.md` and `docs/operations/RELEASE-AND-ROLLBACK.md` are corrected. Compiled files and `SHA256SUMS` are unchanged, and no rebuild is needed.

## Release package and models migration status — 2026-10-27

- **Models migration `jwleria_product_models`: NOT applied.** It was attempted twice through the Supabase `apply_migration` tool with the identical reviewed text (sha256 `0b6f1b93e3ca8486f93f0e20da3ce03a63927e1e80130b28fc1a630836627cdc`, from `apps/storefront/supabase/proposed/jwleria_product_models.sql` without its own begin/commit). Both calls returned the same tool error, verbatim: `MCP server "Supabase" tool "apply_migration" timed out after 60s. The server asked the user a question, and no answer came before the time limit.` This is an action-time confirmation that went unanswered within the client's 60 s limit, not an automatic policy rejection. Codex observed no approval card during the second attempt even though Apply migration is saved as Always allow, so the confirmation was not surfaced to the owner. A read-only `list_migrations` after each attempt still showed 7 migrations, the last being `20261026114541`. There are no new objects and catalog hash `b2182069…` is unchanged. No third attempt was made, and no other tool or rerouting was used. `20261026114541` was not touched.
- **Prebuilt release:** upload-only package at `releases/storefront-2a1864b35fd8/` on this branch (first at commit `a23c29f`). It holds 74 compiled files with a per-file `SHA256SUMS`, all verified OK from a fresh clone; `DEPLOY.md` has the exact upload-only command, the rollback target procedure and smoke URLs. It is safe to upload with the database at 7 migrations: the exact fallback was verified locally against the live catalogue, and noindex/non-release behaviour and current bindings and secrets are unchanged. **Not deployed** by this session, which has no Cloudflare credential.
- **Photos:** live approved images are still 0. A rendition-based open-licence amendment and an m126234-0015 batch are being prepared and reviewed. Nothing will be published under a provenance change that has not finished its review and evidence chain.

## Website-only foundation checkpoint — 2026-10-27

**Owner priority since 2026-10-26: website only.** The acceptance target is real exact-product photographs visible on jwleria.com and one card/page per real model with its genuine variants. Phone use comes first. Contact/WhatsApp, social, ads and non-website operations are deferred and are not website gates. The old B1–B6 backlog below is superseded.

**Roles.** The conversation "تأسيس موقع جويلري" is the foundation stream: data, media evidence, variant behaviour, performance, integration and tests. The conversation "تصميم موقع جويلري" is the website designer: visual direction, layouts, typography, responsive presentation and the styling of the gallery/variant controls. A chosen preview becomes the visual authority; the foundation integrates it against the then-current data and image contracts. Isolation is by file ownership and branches, not by connector toggles.

**Prepared and tested on `claude/admiring-dirac-nfavfx` (not deployed, not applied):**
- Models/variants: contract `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md`; proposed additive migration `apps/storefront/supabase/proposed/jwleria_product_models.sql` with rollback and PGlite tests. Read-only production dry run (`docs/PRODUCT-MODELS-DRY-RUN-2026-10-26.md`): 4,097 variants -> 2,886 displayed models; 283 grouped models hold 1,494 variants; 0 key collisions. Rolex 1,465 -> 674, LOEWE 407 -> 232, Longchamp 390 -> 145; Prada, Cartier, VCA and the 3-row watch brands stay one model per row (no linking evidence). No size option exists in the data; none is invented.
- Storefront: one page per model, every existing variant URL valid, canonical to the primary, option links only to real variants, per-variant galleries (never another variant's photo), attribution credit lines, translated specs. Exact fallback to today's reads until the migration exists. Styling is one scoped removable `.variant-*/.gallery-*` block for the designer.
- End-to-end proof: PGlite-backed PostgREST stand-in shows the SQL and the storefront agree; private local mobile preview (390x844, ar/en) with synthetic data.
- Performance: bounded stale-while-revalidate (60 s fresh, <= 600 s stale; decision 0009 updated), local lab only.
- Media: uploads bound to the current revision's own live approval, grant and cited file; one-day derivative cache; gated open-licence grant path as a proposed migration (inactive without an owner decision).
- Source safety: Piaget and Panerai closed in code after reading their terms. A verified-defect list for the inactive intake/n8n runner is recorded (review journal); its fixes are not yet done.
- Suites at merge `18c2332`: storefront 135 pass / 0 fail / 3 opt-in skips; intake 103 pass.

**Media (evidence in `docs/WEBSITE-MEDIA-COVERAGE-2026-10-26.md`):**
- Live: 0 approved images, 0 grants, 0 buckets; catalog hash unchanged.
- Official brand images eligible: 0. For the twelve reviewed sources, no grant or licence covering this showcase's display of official photographs was observed at the checkpoint (terms and press pages read 2026-10-26). This is not a finding that no brand would ever permit it.
- Open-licence exact matches (third-party, never "official"): m126234-0015 (6 Ajay Suresh photos, CC BY 2.0) and m126200-0006 (Remi Mathis, CC BY-SA 4.0) form the lower-risk sample. m126500ln-0001, m126900-0001 and m126713grnr-0001 are exact but carry provenance risk. Three photos are unresolved between sibling references and are excluded.
- A private phone preview of the 7-image sample with credits and WebP derivatives was published as a private Artifact and handed to the designer session. It is not website publication. Commons answered HTTP 429; nothing was retried or bypassed.

**Gates still in force:** applying the models migration and writing its mapping; Worker deploy (no deploy tool in this environment — the owner's/Codex's authenticated Wrangler is the path); open-licence public use (owner decision, open-licence migration, bucket + upload function, then a deploy that carries the credit line); any factual batch; schedule activation. Migration `20261026114541` stays applied once.

## Claude execution checkpoint — handoff to one new conversation — 2026-10-26

The owner requested a safe checkpoint so execution continues in ONE new conversation in which current connector tool policies load from the start. Use the approved dedicated Jwleria environment (Full egress), Opus 5.5 Ultracode, Auto permissions and the same existing connectors and scopes. This supersedes every launch-pending or not-launched checkpoint below: that conversation ran and its outcome is recorded here. Full detail, the requirements ledger and ready briefs are in [docs/CLAUDE-CONTINUATION-2026-10-26.md](docs/CLAUDE-CONTINUATION-2026-10-26.md).

**Live and verified:**
- **Real egress.** Rolex robots answered HTTP 200; IWC robots answered HTTP 403, a source refusal.
- **Bounded two-run pilot.**
  - Run 1: Rolex sent robots 200 then sitemap 403, and IWC sent robots 403. Both origins were blocked as `source_refused_access`, 0 product pages were requested and 0 records were acquired.
  - Run 2 made 0 requests.
  - No database write, publication or image download occurred.
  - Baseline at 2026-10-26 12:56Z: 4,097 active public products, 4,150 candidates, 6,877 revisions and 0 media approvals, grants, assets or buckets. Row hashes were unchanged afterwards.
  - This counts as a successful refusal/resume safety check and an unsuccessful product acquisition.
- **n8n origin workflow "Jwleria — Origin intake run".**
  - It is inactive, with 8 Code nodes verified byte for byte against the build.
  - Its 4 Postgres nodes are disabled. They hold an auto-attached unrelated credential that must never be used.
  - Only the schedule may call it.
  - Offline pinned tests in real n8n passed: fail-closed without the identity export, a page loop with a revision hash identical to the local modules, off-origin skip and 2 s pacing.
- **n8n schedule "Jwleria — Durable catalog intake (inactive)".**
  - It runs daily at 03:17 Asia/Riyadh with a 2400 s limit.
  - Its 2 Postgres nodes are disabled and have no credential.
  - No origin is scheduled, because neither one has a reviewed sitemap.
- **Sandbox discovery.** n8n's Code-node sandbox defines nothing through `Object.defineProperty` and alters `Object.getPrototypeOf`. Bundles are now built without those helpers, and the VM replica reproduces the failure (decision 0012).
- **Codex administration.**
  - n8n has a Jwleria project containing the five Jwleria workflows, with their IDs preserved. The unrelated Postgres credential was not shared into it.
  - Easy Life is permanently cancelled, and its n8n project and workflows are deleted. Do not recreate or invoke it.

**Implemented and tested, not deployed or applied:**
- bounded robots-declared discovery and the factual-publication payload builder (becdc0a);
- the approval-bound media upload function and phased runner (c7d80a4);
- the shared intake rules, n8n steps and the least-privilege runner role proposal (c8d6090);
- the sandbox-safe bundles (1cb725c).

Suites on 1cb725c: catalog-intake 97/97, storefront 56/56.

**Not done (ready briefs in the continuation document):**
- B1: storefront stale-while-revalidate and parallel product-page reads, with a lab before/after. Live cache-miss TTFB is 1.0–3.4 s against about 0.3 s on a hit.
- B2: inquiry message brand line and isolated valid-number tests.
- B3: social drafts with channel-specific grants.
- B4: operations docs.
- B5: a bounded acquisition from another eligible source.
- B6: a single review and final validation.

The ledger fraction is about 65% (11 of 17 actionable items), not the 90% target.

**Owner inputs and gates unchanged:**
- exact-product photos with rights evidence;
- the verified business WhatsApp number, followed by a Worker deploy;
- approval of the runner role migration, then owner entry of its credential in n8n, then approval to enable the database nodes;
- schedule activation;
- upload function deploy and bucket creation;
- any exact factual batch.

Migration `20261026114541` stays applied once. No production write, deploy, schedule, credential, photo or message occurred in this conversation.

## Consolidated execution mandate sent on Ultracode — 2026-10-26

The owner explicitly asks Claude to receive the complete assignment at once, use Ultracode, and stop waiting for sequential stage handoffs. Codex reused the existing "Jwleria — full execution" conversation, changed the observed Opus5.5 Extra setting to Opus5.5 Ultracode, and verified the selected setting. This current owner instruction supersedes the earlier Max preference for this execution. Ordinary Auto permissions, the dedicated Full environment, shared Default and provider scopes were not changed.

A single comprehensive English execution mandate (5,511 whitespace-delimited words) was sent and its beginning and final delivery instructions were read back in the conversation. It covers catalog identity/provenance and missing-only intake, permitted concurrent source queues, authentic media and upload preparation, storefront performance, durable n8n operation, WhatsApp contact/request readiness, social/ad draft operations, security, recovery, maintenance, meaningful verification and saved release evidence. Claude owns implementation/tests/review; Codex did not inspect application code or run its tests. The 90-percent direction is a target against a concrete actionable requirements ledger, not an achieved completion percentage or a guarantee about future problems. The raw prompt, session details and screenshots stay private.

Necessary ordinary n8n code-node update requests were released under the existing attendance delegation. The observed workflow had auto-attached an unrelated/unknown Postgres credential; the mandate explicitly requires affected database nodes disabled/disconnected before any test and forbids execution through that credential. Actual product-acquisition pilot results remain zero new products: Rolex sitemap and IWC robots returned source refusals. Uploader code and inactive workflow preparation are not live photos or scheduled intake. Latest observed Claude implementation pointer is `claude/nifty-curie-2ztbn6` at `c8d6090434903e1a00a65aece07ebdb1440cb9f2`; refresh it before continuation.

Next is Claude's continuous execution of all independent authorized requirements in this one conversation, with normal history-preserving incorporation of newer continuation documents and correction of the stale launch-pending checkpoint on its branch. Group genuinely remaining owner inputs/actions only after concrete preparation. Do not re-request settled network/SQL/OAuth approvals, repeat migration20261026114541, bypass source refusals, publish unapproved media, invent the missing WhatsApp number, create new credentials, activate schedules or perform new production changes without their applicable exact scope. No new database write, media publication, deployment, credential or schedule is established by sending this command. Easy Life remains stopped. Earlier entries are historical.

## Dedicated Jwleria execution conversation launched — 2026-10-26

After the exact environment/network/conversation approval recorded below, Codex launched one new Claude Code conversation titled "Jwleria — full execution". Reopening the saved Jwleria environment confirmed Full networking with no secrets or variables; shared Default was untouched. The selected repositories are global main and Jwleria's `claude/pensive-mccarthy-40nrlc` implementation branch, with only the existing Supabase, n8n and Cloudflare connectors selected. Opus5.5 Max and ordinary Auto permissions remain unchanged. Private session links/identifiers and the raw English command are not published here.

The comprehensive four-stage command was sent and Claude began initial working-directory/repository discovery. Claude then independently verified the dedicated Jwleria environment and reported actual VM egress: `www.rolex.com` returned HTTP200; `www.iwc.com` returned HTTP403 from Akamai/source refusal. This replaces the earlier allowlist-denial assumption for these tested requests only; the IWC result is a source refusal, not an environment block, and must not be bypassed. Claude has begun a private baseline export through Supabase Execute SQL; no approval card was visible at this checkpoint. A completed real runner/factual pilot, authentic media upload/publication and durable scheduling are still not established. Full networking is not provider, source or production authority. Claude retains implementation/tests/review ownership and must refresh current continuation instructions with normal history preservation. Missing approved exact-product photos and the verified WhatsApp destination remain inputs. Separate production-write, media/publication, credential, activation and security-change gates remain; no new key, photo, live pilot write or schedule is claimed. Earlier launch-pending entries below are historical. Easy Life stays stopped.

## Dedicated Jwleria environment created; conversation launch pending — 2026-10-26

The owner explicitly approved creating a dedicated cloud environment named Jwleria with Full networking (any outbound host) and one new conversation using the same Opus5.5 Max and current connectors. The stated scope leaves shared Default, provider scopes, credentials and Mac/OS permissions unchanged. This exact approval supersedes the earlier pending proposal below; it is not an inferred general superuser authorization.

Codex saved the new-environment form. Direct UI readback now shows the saved/selected `Environment: Jwleria`, `Opus5.5 Max` and ordinary `Permissions: Auto`. The new conversation has NOT been sent or launched; repository/branch and selected-connector preparation is still underway. No new credential, provider permission expansion, product photo, production write or application change occurred in this setup. The existing applied migration and all separate source/media/publication/credential/scheduling gates remain unchanged.

The private English continuation brief has been aligned with this approved dedicated Full environment. Do not ask again for the already-approved creation/network scope or modify Default. Verify real egress and required tool operation in the future session rather than treating saved configuration as runner success. Claude remains implementation/tests/review owner; Codex coordinates. No new session URL or completed four-stage execution is established yet. Earlier pending entries below preserve the temporal record.

## Dedicated-environment proposal — approval pending — 2026-10-26

Latest verified Claude preflight head is `claude/pensive-mccarthy-40nrlc` at `3fa1d2d08f94c14c64f5f5765b4ea7346b8aef20`, including the normal merge of continuation pointer1bb3c161. Direct UI readback confirms the current session uses Opus5.5 Max. Its existing `Default` environment is shared, uses Limited networking and has an empty allowed-domain list; denied VM requests did not reach the brand origins. Connector operation remains separate from VM networking.

The owner asks how to complete all four stages in one conversation while reducing repeated approvals. Codex recommends a dedicated Jwleria cloud environment and one future conversation with the same Opus5.5 Max; ordinary permissions remain Auto. A new-environment form currently has Full networking staged but UNSAVED. Full would permit any outbound host for that dedicated environment only; it is broader than exact-host Limited networking, which the owner may choose instead. The exact owner decision is requested and pending. A general superuser/all-permissions question is not authorization. No environment or new session was created, no new credentials/access grants were saved, and the old shared Default was not changed.

A comprehensive English continuation draft is prepared privately and must be aligned with the owner's selected scope before launch. Do not publish its raw prompt, private location, screenshots or account/environment identifiers. Claude retains implementation/tests/review; Codex coordinates and attends specific authorized requests. Do not promise zero prompts or use root, a security-mode change or a network workaround. No application, test or production change occurred during this preparation; existing photo, WhatsApp, runner, upload, scheduling and publication gates remain.

## Four-stage preflight (read-only) — 2026-10-26

Bounded read-only capability preflight before the four owner-requested stages: real runner, factual pilot, permitted images and durable n8n scheduling. No collection, configuration, credential, schedule, publication or production write occurred. Migration `20261026114541` is applied and must not be reapplied.

- **Egress:** the session's cloud environment ("Default", trusted network level) denies by default.
  - One request each to a neutral host, `www.rolex.com`, `www.iwc.com`, the Supabase project host and `jwleria.com` was refused at the proxy CONNECT stage. GitHub opened.
  - This is an environment allowlist denial, not a brand refusal: the brands were never contacted.
  - Node's built-in fetch uses the proxy here, so the queue needs no extra flag.
- **GitHub:** fetch, push to the work branch and MCP reads work.
- **Supabase:** reads, the new `jwl_source_registry()` RPC and the earlier approved `apply_migration` work. No Edge Functions are deployed. The MCP connector has no Storage upload tool. `pg_cron`/`pg_net` are available but not installed.
- **n8n:** search, read, update and pinned tests work. There are no credential tools (the scope excludes them), and nothing is active or scheduled.
- **Cloudflare:** Worker read works. There is no upload or deploy tool despite the Workers Write scope.
- **Storefront:** it accepts any credential-free HTTPS image URL and already renders responsive variants, so approved Storage images need no Worker redeploy.
- **Repository gap:** no factual-publication payload builder exists in the repository (earlier publications used private tooling); it is needed before the pilot can publish.
- **Runner bridge:** no Remote Control or Mac runner session is connected, so a Mac runner is unproven.

Environment facts (owner UI readback relayed by Codex, plus current documentation):
- The session's environment is `Default`, the account's only cloud environment: network "Limited", no allowed domains, package managers on, no variables, no setup script.
- It is shared by every cloud session of the account. The newest 50 sessions include 34 other cloud sessions, none connected now; more exist beyond that page.
- Per the documentation, an allowed-domain change reaches running sessions within about a minute. Exact hostnames match only themselves, and only a leading `*.` matches subdomains.
- A network secret is attached for every session in the environment, so a database key must never be stored as a secret on this shared environment.
- The allowlist is enforced outside the VM, so root access cannot change it, and it must not be routed around.

Proposed minimum for the first pilot: add only the exact hosts `www.rolex.com` and `www.iwc.com` to `Default` (no wildcards or apex, package managers kept on), time-boxed and removed after the pilot. The alternative with no change to the shared environment is to run the bounded fetches in n8n and ingest through the connector. Collect in this session with the tested queue, and do the baseline export, missing-only ingestion and any factual publication through the Supabase connector, which does not use the VM network. Do not add the Supabase host or any secret for the pilot. Media CDN hosts, the Supabase host for uploads, n8n database credentials and activation are later, separately approved steps. Owner inputs still missing: permitted exact-product photos and the verified WhatsApp number.

## Claude implementation pointer and applied migration — 2026-10-26

Claude's completed implementation checkpoint is branch `claude/pensive-mccarthy-40nrlc` at `d76423ad7b9b1ef672707e504b516ce75a857c4d`. Remote ancestry confirms it contains continuation documentation `c342964bb1d10e6571fecaa30f84808fab49ad1a` (15 commits ahead, zero behind). Read that branch's top STATE/HANDOFF and decision0011 for the per-origin queues, missing-only intake and exact media-evidence implementation. Claude owns the code, tests and technical review; its reported77 source/48 app tests and post-apply checks are not a duplicate Codex audit. This continuation checkpoint adds a documentation pointer only: no application merge or foundation/global routing change was performed.

After the initial production-update refusal, the owner freshly and explicitly approved the exact media-evidence/missing-intake migration. Codex directly observed `apply_migration` return success. Claude then reported registered version `20261026114541`, seven migrations, unchanged public/candidate/source hashes and counts, intended access boundaries, installed triggers and completed advisor checks. The file on Claude's branch matches the registered version. The approval covered this exact production update; do not reapply it or infer broader production authority. Claude's readback still shows4,097 active factual products,4,150 private candidates andzero media approvals; no product image was approved or published.

Codex completed attendance of the existing Claude run under the owner's direction. The necessary n8n update request was approved; Claude reports synchronizing only the inactive normalization draft's code node and a successful pinned-data parity test, with no trigger, schedule, credential or activation change. No tool approval remained pending when Claude ended. The earlier recurring SQL-prompt observation and explicit SQL-specific Always allow permission remain historical facts, not a guarantee that every future request will run without a prompt.

The full project remains incomplete: actual permitted exact-product photos and visual acceptance, the verified business WhatsApp destination, real collection in a permitted network environment, durable scheduling and remaining launch acceptance are open. Claude reports that its cloud container blocks the public domain/brand origins, and its Cloudflare connector/container cannot upload or deploy the Worker. Storefront code is unchanged and no new storefront deployment occurred. Preserve source/media/publication restrictions, private inputs outside this public repository and Claude's implementation/review ownership. Easy Life remains stopped. Older entries below are dated history, not a replacement for this implementation pointer.

## Concurrent intake, missing-only ingestion and exact media evidence — 2026-10-26

Claude Code implemented, tested and self-reviewed the remaining background-processing and authentic-media path on branch `claude/pensive-mccarthy-40nrlc`. It descends from continuation tip 60da478 and includes Codex documentation c342964 and, since merge 7ba79e3, the continuation pointer 1bb3c16. The two branches advance independently: consolidate only by merge, never by force-push. Decision 0011 records the rules. Nothing was published, no image was downloaded, uploaded or approved, and the storefront code is unchanged.

**Implemented (repository code):**
- `scripts/catalog-intake/source-queue.mjs`: one queue per permitted official origin, origins running concurrently.
  - Each origin has its own pacing: at least 2 s, taking the largest of config, database interval and robots crawl-delay, persisted across runs.
  - Fresh robots, resumable private state, URL and identity deduplication, and bounded transient retry with exponential backoff.
  - A refusal or challenge (including on a 5xx) blocks only that origin until a recorded review token. A 429 or 5xx Retry-After defers only that origin, for at least 15 minutes. Unhealthy origins cool down.
  - Cartier, VCA, CELINE and RIMOWA stay closed in code. The database registry (`jwl_source_registry`) is required and can only narrow local config.
  - Reuses the existing official, bag and Longchamp extractors.
- `incremental.mjs`: each record is assessed on arrival. Ingestion is missing-only: an existing candidate with another revision is held for review, never overwritten. A durable outbox replays failed batches. Factual readiness (facts, Arabic name, summary, approved category) is reported separately.
- `media-pipeline.mjs`, `media.mjs`, `supabase.mjs`, `responsive-media.mjs`:
  - exact-reference gallery binding;
  - grant evaluation: written permission or owner original; open licenses refused; restricted sources closed;
  - paced, robots-aware original acquisition with per-origin stops, and checksum-preserved originals;
  - owner-original derivatives and a required complete visual-verification record;
  - an approval bundle, with the approval recorded before upload (upload needs the database receipt);
  - content-addressed upload, `image_variants` in publish, and revoked-file cleanup.
- Migration `apps/storefront/supabase/migrations/20261026114541_jwleria_media_evidence_and_missing_intake.sql` (applied; see below):
  - append-only `media_grants`/`media_assets` evidence;
  - an approval trigger binding every file to its grant kind, its exact gallery URL and granted origin or owner original, its reference and its dimensions;
  - final revocation cascading to withdrawal, plus a publish-time live-grant check;
  - expiring grants fail closed, and written permission is refused for restricted sources;
  - RPCs for missing-only intake, atomic approval recording, the source registry and revoked files.

**Validation:**
- Source suite 77/77 and app suite 48/48. PGlite replays every migration, including an end-to-end run: permitted original → derivatives → verification → evidence → publish → revoke → withdrawal → file cleanup.
- An independent reviewer subagent found 3 high and 6 medium defects. All were reproduced and fixed with tests. Its re-check confirmed the fixes and found one new outbox-duplicate defect, also fixed and tested.
- Residual low risks, documented and not fixed: a narrow non-atomic window when stealing a stale queue lock; media pacing and stops are in-memory per process.

**Actual connection outcomes:**
- **GitHub:** clone, fetch and push to the work branch work.
- **Supabase:** reads work. Live readback today: 4,097 active public factual rows, 4,150 private candidates, 6,877 revisions, 0 media approvals, 0 storage buckets, 6 registered migrations.
  - Gallery binding: 3,103 candidates have every gallery URL naming the exact reference (Rolex 1,465, Prada 851, LOEWE 407, Longchamp 372, Bottega 8). 1,047 do not (Cartier, VCA, AP, IWC, JLC, Panerai, Piaget, 19 Longchamp). This is identity evidence only; no media permission exists.
  - Migration history:
    - The first attempt was denied by the Claude Code auto-mode classifier as `[Production Deploy]`. No card was offered, and nothing was applied (6 migrations remained). Permission modes and allow rules were not changed, and no `execute_sql` workaround was used.
    - The owner then explicitly approved this exact production update, relayed by Codex: the Jwleria Supabase project, migration `jwleria_media_evidence_and_missing_intake`, file SHA-256 `0a09c65e…999b24` at commit `3036d7a`.
    - The pre-check listed 6 migrations, so it was not a duplicate. `apply_migration` succeeded. Its statements were the file's, minus the outer `begin;`/`commit;`, because the tool supplies its own transaction.
    - The registered version is `20261026114541`, and the repository file was renamed to match.
  - **Post-apply readback:**
    - `list_migrations` shows 7 migrations.
    - Existing data is unchanged against the pre-apply baseline: public projection hash `f929f0974933890b08574e2d19038803`, candidate hash `0c7944b68e67530c850a51125b0daa84`, source registry hash `46121b5982fbb98645f91d0367f69f32`.
    - Counts are unchanged: 4,097 active, 4,150 candidates, 6,877 revisions, 0 approvals, 0 published revisions. New tables hold 0 grants and 0 assets.
    - Anonymous and signed-in users have no privilege on the new tables or functions. The service role can read and insert evidence and set only `revoked_at`; it cannot update or delete evidence, and it can run the four RPCs.
    - The 4 new triggers are installed and enabled. Anonymous visitors can still run `jwl_brand_page`.
    - Security advisor: only the informational "RLS enabled, no policy" notes (9 = 7 existing + the 2 intended new private tables).
    - Performance advisor: 6 informational unindexed-foreign-key notes, 3 of them on the new, empty tables. They are acceptable at zero volume; add indexes before media volume grows.
- **Cloudflare:** `jwleria-storefront` Worker read works. The connector has no Worker upload/deploy tool and the container has no deploy credential, so no deployment is possible from this session.
- **n8n:** search and read work.
  - The inactive "Jwleria — Catalog candidate normalization" draft was stale (no `collection_kind` or calibre support), so its code node alone was synced to the repository normalizer.
  - A pinned-data test with synthetic records (execution 58896) reproduced the local candidate IDs and revision hashes exactly.
  - No trigger, schedule, credential, activation or other workflow changed.
- **Container network:** the proxy denies `jwleria.com` and brand origins, so live collection or HTTP readback cannot run from this cloud container.

The project remains incomplete. Photos, the verified WhatsApp destination, scheduled operation and launch acceptance are still open. Easy Life remains stopped.

## Claude execution ownership and connection preparation — 2026-10-26

The owner assigns all programming, tests and technical review to Claude Code; Codex supplies directions, relays results and prepares necessary owner authentication. Decision0010 records that role boundary. The Claude Code session titled "Jwleria programming continuation" was launched with Opus5.5 Extra and one comprehensive English execution brief. No completed Claude implementation or new deployment is established by this setup checkpoint.

Authenticated GitHub reads confirmed the existing implementation at0948b351766fb72698b6720ee6a22053b6ddbe26. Claude subsequently reported successful checkouts of the global instructions and Jwleria from the delegation checkpoint60da47835e274e44abc60f142689b55faa82e601. The approved foundation and older main remain unchanged. Through its selected existing Supabase connector, Claude reported successful project/schema/count reads: healthy project,6 migrations,4,097 active public rows,4,150 private candidates,zero media approvals andzero storage buckets. These are Claude's observed execution results relayed by Codex, not a separate Codex code audit. Only specific project read requests were permitted during setup.

The owner explicitly approved both exact consent scopes on2026-10-26. Fresh OAuth flows completed and Claude displayed Connected for Cloudflare andn8n; both are selected in the existing Jwleria session alongside Supabase. Cloudflare authorization is User Read,Account Read,Background Access,Workers Write andD1 Write on the shown account; this is broader than project-only resource scope, and task instructions still restrict operations to Jwleria. n8n authorization is only workflow:read,workflow:write,workflow:execute andexecution:read on the existing instance; no credential,agent,table,project-administration or community-node-installation scopes were granted. No replacement credentials were created. The earlier stale Cloudflare request failed its browser-state check; restarting that same existing connection completed successfully.

The owner subsequently approved persistent Always allow for only Supabase Execute SQL, explicitly including read/write/delete within the existing connector's authority. Live Claude tool-policy readback showed Always allow selected and Needs approval cleared. This tool-level preference is not an automatic project-only data boundary; task operations remain restricted to Jwleria. A read request already pending before the policy change was permitted once so the existing Claude run could resume. No other tool policy was changed by Codex during that setup. This supersedes the earlier setup-only per-request approval state; it does not establish a new data publication, migration or deployment. A subsequent harmless Execute SQL read nevertheless displayed a new approval prompt. Claude later resumed; Codex approval of that particular prompt is not established. Do not claim the displayed persistent preference reliably suppresses every future prompt.

The owner now directs Codex to attend the existing Claude session and approve ordinary tool requests necessary for Jwleria while Claude retains all implementation, tests and technical review. This attendance delegation does not expand provider access or override separately gated destructive, financial, source/media, publication or unrelated-project actions. Continue the same session, relay actual outcomes and avoid a duplicate Codex implementation or audit.

Claude then reported successful bounded reads through both newly connected services: the existing jwleria-storefront Worker andthree inactive Jwleria workflows. Those observations establish read operation, not a new deployment or active schedule. Claude continues the multi-origin runner, authentic-media gates, tests and self-review under decision0010; Codex does not duplicate that implementation or audit. Preserve missing photos, the unprepared WhatsApp destination and complete project acceptance as unfinished requirements. Older dated operational observations below remain historical. Easy Life remains stopped.

## Current catalog reconciliation — 2026-10-21

Live catalog and domain API independently return **4,097 active factual products, zero product images; 4,150 private candidates**. This is captured source-backed regional coverage, not every worldwide product and not a completed photographed catalog. Categories: watches1,774; handbags1,174; bracelets384; jewelry283; leather goods323; luggage28; shoes22; accessories109; clothing0.

Completed the remaining40 in-scope records:37 Longchamp projections,2 exact-current LOEWE/Bottega name/material repairs, and JLC Q3926480. Both narrow bag repairs reproduced their old canonical revision, preserved every unrelated field/gallery/provenance, passed PostgreSQL JSONB invariants, and added only the retained source-backed silk/satin material for Bottega. A single freshly permitted JLC primary page exposed manual winding/calibre847. The fallback now binds the URL SKU and exact primary internal reference to its labelled movement feature block; navigation calibres and movement thickness are excluded. Its private correction changed only two technical facts, own bilingual summaries and extraction.facts under an exact old-revision/invariant guard. Public projection hashes remained unchanged during private repairs. All40 factual publications matched the current candidate revisions and admitted zero photos. Only53 captured records remain held:52 Cartier fragrance/refill/oil items and1 Longchamp candle outside the approved category set.

Current Worker remains `9d4f7a86-f92d-4aac-82f6-e3f7a31eb87f`, with registered migration `20261021101140_jwleria_collection_kind`. The qualified grouping contract distinguishes named collections from generic source groups across both publish lanes, reads, summaries, cards/PDP and collection filters. There are574 public source-group records, zero remaining literal generic-group product names and zero unsupported collection claims in their summaries. Earlier guarded corrections fixed345 legacy category-derived Arabic names and3 boots-with-pouch taxonomy errors. Preserve genuine names, primary categories, full private gallery references and current revisions. Source-group search uses own public fields rather than ambiguous raw group terms. No source/media permission was broadened.

Source regression suite61 passed; the movement-aware restricted-n8n parity case also passed. A bounded independent review found no JLC cross-SKU/navigation/case-dimension defect. The preceding35 app/SQL tests, clean49-file diagnostics and production build/deployment remain valid for the unchanged storefront. No new Worker deployment was needed for importer-only changes. Live no-store domain API readback returned4,097, the exact JLC facts and new luggage products; the actual in-app product page rendered those facts. These observations do not establish real-image performance or inquiry delivery.

The owner confirmed no approved product-photo source and deferred n8n reconnecting. No real product image was downloaded, processed, approved, uploaded or published. The earlier bounded exact-reference open-license search found mismatched variants and rejected them; it does not establish that no suitable asset exists anywhere. Verified WhatsApp number remains unprepared. Local normalizer/SDK helper source is aligned, but no cloud workflow update or schedule is claimed. Photos/visual acceptance, real inquiry delivery, source coverage/permissions, durable updates and remaining launch/social/order acceptance keep the full project incomplete. Available in-scope captured metadata reconciliation is now complete; further end-to-end release depends on the missing external inputs/access. Do not restart refused collectors, invent media rights or revive stopped Easy Life routines.

## Current catalog and responsive-media implementation — 2026-10-21

Deployed Worker `e80d1faf-1a2f-49a6-b337-ef9b7d6c87e7` with the registered migration `20261021092208_jwleria_responsive_media_contract`. Public product media now supports exact approved responsive manifests, bounded card variants, actual dimensions and gallery-specific sizes. The private local derivative helper preserves originals, honors phone orientation, strips private EXIF/GPS, flags excessive bytes and refuses repository/web-root or symlink output. No real product photograph has been processed or published: the owner confirmed there is currently no approved photo source. Derivative readiness does not fulfill the photographed-catalog requirement.

Live database and storefront readback: **3,484 active public factual products, zero product images; 4,150 private candidates**. Public categories are watches 1,773; handbags 874; bracelets 384; jewelry 283; leather goods 133; luggage 17; shoes 19; accessories 1. Rolex has 1,465 factual records from its captured regional inventory, not a worldwide completeness claim. This continuation published 2,440 additional factual records. It repaired 271 bag and 396 Rolex private names under exact revision/invariant guards, then admitted only current publication-eligible records. Missing-only ingestion added 312 LOEWE/Prada private candidates under serializable transactions; the complete public projection hash remained identical during ingestion. Existing/newer candidates were not overwritten. Generic breadcrumb groupings, missing facts and pending names remain held. All source inventories and receipts stay outside Git.

A real PageSpeed mobile lab run of the current text-only watches page returned performance100, FCP/LCP0.9s, TBT0ms and CLS0.025 on the tool's emulated slow4G device. No real-user field data was available; this is not image-loaded acceptance or a guarantee for every region/device. Report: https://pagespeed.web.dev/analysis/https-jwleria-com-ar-categories-watches/6r39rb6vzc?form_factor=mobile . Existing bounded HTML caching, no-store APIs and 12-card pagination remain. Source tests44/app tests29, clean48-file Astro diagnostics, production build and deployment passed. Review findings about private output paths and secondary gallery download sizes were corrected. The local package-runner build failed to resolve its installed binary; the same locked Astro CLI under Node built and deployed successfully without installs/upgrades.

Product inquiry links now prefill the exact localized public product URL with name/reference. An actual locally rendered link test passed using a process-only test destination; no WhatsApp request/message was sent. The verified business number remains unprepared, so contact is not live.

The n8n connection currently rejects refresh. The owner explicitly deferred reconnecting it; no workflow update, schedule or automatic acquisition is claimed. Existing source/media approval gates remain; Cartier/VCA acquisition stays disabled. Remaining full-project dependencies include permitted exact-product photos and visual acceptance, verified WhatsApp delivery, source coverage/permissions, durable update operation and the remaining launch/social/order acceptance. The full goal remains active and incomplete. GitHub owns continuity; Easy Life remains stopped.

## Brand-page round-trip reduction and media boundary — 2026-10-21

Published the additive read-only public brand-page RPC and deployed Worker `af346733-a8ed-4e26-9679-5b08355fc399`. The remote migration is `20261021090207_jwleria_public_brand_page`, aligned with its committed filename. Brand products, exact pagination, collections and published directory metadata now arrive in one HTTP read. Curated empty brands and all existing peer/filter links remain; cards reuse the already loaded brand. Existing public data/media validation, RLS and uncached API behavior remain.

Live HTTP observations: Rolex MISS 1.514s and HIT 0.105s; watches MISS 0.412s; home MISS 1.072s. Cache-bypassing samples varied from 0.420–1.619s for Rolex, so first visits are still variable and not fully accepted as optimized. The measured Rolex server-render duration improved from the previous observation of 1,410ms to 887ms; this is not a controlled user benchmark. Read `docs/STOREFRONT-PERFORMANCE-2026-10-21.md` for bounded evidence and image-release requirements. Actual in-app brand pagination rendered distinct genuine references. SQL/client regression, existing regression suite, Astro check and deployment build passed.

The live catalog still has 1,044 public factual watch records and zero product images; 3,838 private candidates are a separate count. A newly prepared private review contains 3,700 normalized ready rows, including 1,927 non-watch rows, with 417 unique excluded candidates. These are prepared payloads, not newly ingested or published products, and their local-ledger revision advice requires live DB verification. No catalog expansion was performed during this performance checkpoint.

The owning database has zero media approvals and zero Storage buckets/objects. No exact-SKU photo set with demonstrated usage permission was established in the bounded verified-project check. Specific owner originals or written exact-asset website-use permission remain an external dependency. Keep the photographed-catalog requirement; do not substitute generated pictures, assume permission or call the photo-free catalog complete.

Corrected only the Cartier and Van Cleef automated-acquisition flags to false using saved source evidence, pending permission/review. Their enabled/publication flags were preserved. The transaction compared the complete public projection before and after and would roll back on any change; all existing public facts remained unchanged. No new source retrieval occurred. See `docs/SOURCE-ACQUISITION-GATE-REVIEW-2026-10-21.md` for evidence dates and limitations.

Next: accept cold/mobile performance and implement responsive derivatives from actual permitted photos before media expansion; verify remaining prepared rows against current DB revisions before factual publication. WhatsApp number, photo/source inputs and durable inactive-draft scheduling remain unfinished. Goal active and incomplete. Save continuity in GitHub only; Easy Life remains stopped.

## Storefront performance repair deployed — 2026-10-21

Owner priority is measured navigation speed before further catalog/media expansion. Current live verification finds 1,044 public factual watch entries, zero product images, and 3,838 private candidate records. These are separate counts; the site is not a complete photographed catalog. No additional catalog content was published during this performance repair.

Deployed Worker revision 64b2e4c6-4617-44f1-b93f-109d8ebd12b1 adds anonymous public-HTML caching for at most 60 seconds, partitioned by URL and build. Auth/cookie requests, searches, APIs, writes and unexpected query parameters bypass it. Errors, personalized responses and prohibited cache headers never enter the cache. The JSON catalog API remains no-store, so publication readback is fresh. Build-specific keys prevent a new deployment from reusing old HTML. Source/media approval gates were not relaxed.

Removed a remote brand-directory request from known-brand/product-card rendering and parallelized independent home, catalog and brand page reads. Existing fonts/font CSS now use a one-day browser cache; the existing editorial WebPs use one hour, while hashed CSS retains immutable caching. Hero text now appears in 225ms without staggered delays; the image settles in 600ms. The requested brand marquee and reduced-motion behavior remain intact.

Observed final normal-TLS HTTP timings from this execution network: watches 0.64–0.69 seconds uncached and 0.42 seconds cached; homepage 1.24–1.34 seconds uncached and 0.41 seconds cached; Rolex brand page 1.82 seconds uncached and 0.27–0.33 seconds cached. Edge locations varied, so these are observations rather than Saudi-user performance guarantees. Some cold brand loads remain slow and must not be called fully optimized. A database watch-page query used its index and executed in 0.116ms; network/render latency, not that query's execution time, dominated. No database migration/provider change was needed for this performance repair.

Validation: 19 app/integration regressions, seven local preview acceptance checks over 82 HTML responses, 30 source/normalization regressions, clean Astro check and Cloudflare build. The real in-app browser flow home → watches → exact referenced product rendered actual content with no relevant console warnings/errors. Static cache headers were read back from the live domain. The previously deployed factual-publication migration file is now aligned with its actual registered version 20261004144941; this alignment did not reapply it.

Next: finish reducing cold brand/metadata round trips, then resume the remaining genuine catalog categories and prepare responsive approved product media. Remaining launch dependencies include actual permitted product photos/media approval, required source permissions and the verified WhatsApp number. The local n8n helper source has newer enrichment than the inactive cloud draft; do not claim scheduled acquisition is deployed. Do not resume acquisition from an old lock/progress file without a live process check. The project goal remains incomplete. Continuity is saved in GitHub; Easy Life remains stopped.

## Official product acquisition is executing — 2026-10-04

Verified database checkpoint: 2,580 private source-backed product candidates across twelve brands. Every record retains a source-page reference, an exact product identity and official gallery URLs. Of these, 2,384 have prepared Arabic names; 196 retain their official source name with translation explicitly pending. Fifty-eight records lack captured technical facts (54 Cartier records, predominantly fragrances outside the requested category set, three Prada records and one Jaeger-LeCoultre reference). Identity-only descriptions must not be treated as complete product descriptions. Public catalog count remains zero; no image-use permission, visual verification or supplier availability has been inferred.

Actual private ingestion now includes full-running Rolex, Longchamp, Prada, LOEWE, Cartier and Van Cleef & Arpels snapshots, alongside the initial source-bound watch/jewelry records. Bottega Veneta exhausted the eleven advertised URLs in its declared regional keyword scope: eight usable records, three extraction failures. This is not worldwide brand completeness. Source inventories and resumable private snapshots remain outside Git. Rolex, Longchamp, Prada, LOEWE, Cartier and Van Cleef acquisition continue on the execution Mac; inspect current private progress and process locks before restarting.

Source-specific adapters bind exact SKUs, official collection metadata and variant-specific galleries. Audemars Piguet case dimensions and materials require matching component and embedded-data references, preventing movement dimensions or recommended products from being substituted. Twenty-five parser/normalization checks passed before the subsequently added reviewed-path exclusion check. Collectors obey fresh robots, per-origin pacing and access/challenge stops. Specific Longchamp retired-product redirects to robots-disallowed customized collection pages were reviewed and excluded without following them. One Van Cleef authentication redirect is explicitly excluded with its evidence retained; coverage remains incomplete. CELINE stopped on a real source challenge, and RIMOWA remains stopped after its robots refusal. No access bypass occurred.

The registered database migrations match their local filenames and SQL checksums. Existing n8n normalization draft execution 56689 returned the same enriched candidates as local normalization; it remains inactive, and durable scheduled acquisition is not yet deployed. Official image references have been captured, not a licensed or visually accepted downloadable photo library. Initial header checks found 31 reachable image responses and an access refusal at the Panerai asset origin.

The factual-description storefront adapter is deployed at revision aad7d48b-858b-47a1-91bf-b63fe4e89b4b. The domain Arabic page and catalog endpoint returned HTTPS 200; the endpoint contains zero public products.

Next: ingest new validated snapshots incrementally; finish declared inventory reconciliation and required category translations/specifications; resolve actual image-use evidence and visual verification before publication. WhatsApp number remains pending. The requested project goal is active and incomplete.

## Domain cutover saved; new HTTPS storefront verified — 2026-10-04

The owner completed Squarespace email verification. Saved the assigned Cloudflare nameservers and verified the registrar confirmation, COM parent delegation, authoritative DNS, public recursive resolution and an active Free Website zone. Both apex and www are attached to the deployed storefront Worker. The registrar remains Squarespace.

Initial HTTPS checks exposed the previous Lovable deployment despite the new Worker attachment. Its exact custom-domain binding was confirmed in the owner's old Jwleria project, disconnected and read back as absent. The old project itself remains intact. Cloudflare Universal SSL subsequently became Active. New Arabic and English HTML, the www Arabic page, actual editorial hero image and the live catalog endpoint all returned HTTPS 200 with normal certificate verification against the current authoritative IPv4 address. The root page is a language-entry page with an immediate HTML refresh to Arabic. The catalog endpoint returned zero published products.

The execution Mac still resolves this hostname through its system lookup to IPv6 only and cannot reach the site through that lookup; its browser reported ERR_ADDRESS_UNREACHABLE. Authoritative/public DNS includes reachable IPv4 records and direct HTTPS checks passed. A system cache refresh did not resolve the local lookup. Do not confuse this device/network issue with missing registrar authorization or undo the verified cutover. Recheck normal browser access after resolver propagation; if it persists, diagnose the execution Mac's DNS/IPv6 path before changing network settings. Original DNS and previous hosting connection recovery evidence remain in private files outside Git.

The dedicated owner-selected Supabase catalog schema is applied and the deployed Worker reads its active-only public catalog using read credentials. The committed migration is apps/storefront/supabase/migrations/20261004102822_jwleria_catalog_foundation.sql. Private ingestion/publication tables remain restricted. Existing cloud n8n normalization and social-draft helpers are verified but unpublished; scheduled real intake/publication is not active.

Remaining delivery dependencies: permitted real product/media inputs, exact image-publication approval, the verified business WhatsApp number, and seller-policy release inputs. No genuine product has been published. Do not call the whole project complete. Continue the smallest permitted real-content pilot and verified direct WhatsApp delivery when these inputs are available. Earlier checkpoints below are historical and superseded by this entry for database, hosting, registrar and domain access facts.

## Hosted storefront deployed; registrar verification pending — 2026-10-04

Official Cloudflare device OAuth authorization completed and the native account readback succeeded. The prepared Workers storefront was deployed to the owner's existing account. Actual HTTPS Arabic and English pages return 200; the catalog endpoint returns 200 and reads the dedicated live Supabase catalog with zero published products. Runtime read credentials were uploaded privately; no administrative database credential was used.

A dedicated Free Website zone was created for the existing domain. The previous verification TXT record was preserved, and the new Worker is attached to both the apex and www domains. The registrar remains Squarespace. Its custom nameserver control requires an emailed authentication code entered personally by the owner. No registrar nameserver change has been saved; current public delegation still matches the privately backed-up previous configuration. The earlier OAuth blocker is resolved.

Next: the owner completes Squarespace verification and saves the exact Cloudflare nameservers shown in the private connection checkpoint. Verify the registrar readback, authoritative delegation, active Cloudflare zone and actual custom-domain HTTPS rendering. Do not call domain delivery complete before these checks. Real product/media publication inputs and the business WhatsApp number remain unfinished launch dependencies.

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
