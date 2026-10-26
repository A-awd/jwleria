# Claude continuation — 2026-10-26

This is the handoff from the "Jwleria — full execution" conversation to the single next conversation. The checkpoint was requested by the owner so that current connector tool policies load from the start. Use the approved dedicated Jwleria environment (Full egress), Opus 5.5 Ultracode and Auto permissions, with the same existing connectors and scopes. A new conversation may load updated tool permissions. It does not guarantee that no approval prompts appear. No new credential, broader provider scope or security bypass is authorized.

Branch: `claude/nifty-curie-2ztbn6`. It contains the Codex continuation through `23ab5d3` via a normal merge. Read the top of STATE.md and HANDOFF.md, decisions 0010–0012 and this file first.

## Outcomes this conversation

### Live and verified (provider or real-source evidence)

- **Egress from the dedicated environment.** `www.rolex.com/robots.txt` answered HTTP 200. `www.iwc.com/robots.txt` answered HTTP 403 from Akamai, which is a source refusal.
- **Bounded real pilot, two runs.**
  - Run 1 made 2 requests to Rolex (robots, then the robots-declared `sitemap.xml`, which answered 403) and 1 to IWC (robots, 403). Each origin stopped as `source_refused_access`, and 0 product pages were requested.
  - Run 2 reused the private state and made 0 requests.
  - The pilot acquired, ingested and published 0 records and downloaded 0 images.
  - Database baseline at 2026-10-26 12:56Z: 4,097 active public products, 4,150 private candidates, 6,877 revisions, 0 media approvals, grants, assets and buckets. Row hashes were unchanged after the run.
  - This is a successful refusal/resume safety check and an unsuccessful product acquisition.
- **n8n origin intake workflow.** "Jwleria — Origin intake run" has 25 nodes and is inactive with 0 active triggers.
  - All 8 Code nodes match the tested build byte for byte on readback.
  - All 4 Postgres nodes are disabled. They carry an auto-attached pre-existing credential that must never be used.
  - It may be called only by the schedule workflow.
  - Two offline tests in real n8n passed, with every HTTP node pinned and no network calls:
    - Fail-closed path: disabled database nodes ran as 0 ms passthroughs, and the run stopped with `identity_export_incomplete`.
    - Page loop: the revision hash was identical to the local modules, the off-origin URL was skipped, the 2 s pacing was observed, and the disabled ingest wrote nothing.
- **n8n schedule workflow.** "Jwleria — Durable catalog intake (inactive)" runs daily at 03:17 Asia/Riyadh with a 2400 s limit, and no other workflow may call it.
  - Its 2 Postgres nodes are disabled and have no credential attached.
  - No origin is scheduled.
  - A pinned trigger test contacted nothing.
- **Earlier probe workflow.** The temporary sandbox probe workflow was archived.
- **Codex administration (recorded, not repeated here).**
  - n8n now has a Jwleria project holding the five Jwleria workflows, moved with their IDs preserved. The unrelated auto-assigned Postgres credential was not shared into it.
  - An unrelated project was renamed.
  - Easy Life is permanently cancelled. Its old n8n project and remaining workflows were deleted, and a search including archived workflows returned zero. Do not recreate or invoke any Easy Life routine, credential, workflow or runtime checkpoint.

### Implemented and tested in the repository (not deployed or applied)

| Area | Artifact | Commit |
|---|---|---|
| Bounded robots-declared sitemap discovery, missing-first inventory selection, connector-export runner, factual-publication payload builder (refuses if any target row exists) | `scripts/catalog-intake/source-queue.mjs`, `connector-run.mjs`, `factual-publication.mjs` | becdc0a |
| Approval-bound exact-media upload function and phased media runner with verified downloads | `apps/storefront/supabase/functions/jwl-media-upload/`, `scripts/catalog-intake/media-run.mjs`, `media.mjs` | c7d80a4 |
| Shared pure intake rules, n8n step modules, generated workflow, least-privilege runner role proposal (security-definer functions, PGlite-tested) | `intake-core.mjs`, `n8n-*.mjs`, `workflows/n8n/catalog-intake-origin.js`, `apps/storefront/supabase/proposed/jwleria_intake_runner.sql` | c8d6090 |
| Sandbox-safe bundles, the VM replica mirroring n8n patches, database nodes generated disabled | `build-n8n-intake.mjs`, `robots-n8n.mjs`, `n8n-bundle.test.mjs` | 1cb725c |

Last suite results on `1cb725c`: catalog-intake 97/97 and storefront 56/56 (`node --test`). No broad review was run at handoff.

## Requirements ledger

| ID | Requirement | Status | Evidence / artifact |
|---|---|---|---|
| R01 | Verify dedicated environment egress with harmless reads | verified delivered | Rolex robots 200, IWC robots 403 |
| R02 | Bounded two-run real pilot with refusal/resume accounting | verified delivered | 3 requests in run 1, 0 in run 2, 0 records, DB hashes unchanged |
| R03 | Robots-declared bounded discovery | implemented and tested | becdc0a |
| R04 | Factual-publication payload builder | implemented and tested | becdc0a |
| R05 | Approval-bound exact-media uploader | implemented and tested | c7d80a4. The function is not deployed and no bucket exists |
| R06 | n8n runner logic as tested bundles in the real sandbox | verified delivered | readback byte-exact, offline tests in n8n |
| R07 | Dangerous database paths disabled before any test | verified delivered | 6 Postgres nodes disabled across both workflows |
| R08 | Inactive schedule, Asia/Riyadh, bounded, kill switch | verified delivered | Inactive. Deactivating or disabling the nodes is the kill switch |
| R09 | Least-privilege runner role and credential contract | prepared pending exact action | proposed SQL plus tests. Needs migration approval and owner credential entry |
| R10 | Product CTA wording, truthful independence notice, no personal-shopper copy | implemented (pre-existing, re-verified by reading) | `apps/storefront/src/i18n/ui.ts` |
| R11 | Central validated E.164 switch with honest pending state | implemented (pre-existing) | `src/components/view.ts`. Missing an isolated fixture test and a brand line in the message (B2) |
| R12 | Bounded pagination, no whole-catalog fetch, edge HTML cache | implemented (pre-existing), measured live | about 22 KB HTML per page, 12 cards per page, 0 images |
| R13 | Cache-miss latency fix and before/after lab baseline | not done | B1 |
| R14 | Inquiry message with brand and isolated valid-number tests | not done | B2 |
| R15 | Social/ads drafts with channel-specific grants and Optix separation | partly existing (`social.mjs`) | B3 |
| R16 | Operations docs (request lifecycle, media rights intake, monitoring, release/rollback, adding a source) | not done | B4 |
| R17 | Small bounded acquisition from another eligible reachable source | not done | B5 |
| R18 | Independent review of this conversation's changes | not done | B6 |
| R19 | Durable scheduled run with persisted state | prepared pending exact action | needs R09, a reviewed origin and activation approval |
| R20 | Real approved product images | prepared pending exact input | photos and rights evidence missing |
| R21 | Live WhatsApp contact | prepared pending exact input | verified business number missing, then a Worker deploy |
| R22 | Rolex and IWC acquisition | blocked by source refusal | sitemap 403 and robots 403. Never bypass |
| R23 | Cartier, Van Cleef & Arpels, CELINE, RIMOWA | blocked by decision | closed in code |
| R24 | respond.io, WhatsApp Cloud API, social publishing, ad spend | deferred future scope | no accounts and zero spend |

**Completion fraction.** The actionable engineering items are R01–R08 and R10–R18, 17 in all. Of those, 11 are verified delivered, implemented and tested, or pre-existing and verified. That is about 65%, below the 90% target. The excluded items are owner-input or approval dependent (R09, R19, R20, R21), source-blocked (R22, R23) or deferred (R24).

## Ready backlog for the next conversation

Run B1–B4 in parallel with disjoint file ownership. Use one git worktree per stream, created with `git worktree add <scratch>/wt-NAME -b wf/NAME <base>`, and symlink `apps/storefront/node_modules` into each worktree. Merge each stream into the work branch. Keep every database and provider action with one coordinator.

- **B1 — Storefront performance.**
  1. Add a bounded stale-while-revalidate to `apps/storefront/src/server/public-cache.mjs`:
     - keep the fresh window at 60 s and use a stale window of 10 minutes or less;
     - refresh in the background through `waitUntil`, at most once per key per isolate;
     - never cache errors, and keep every existing shareability rule.
  2. Fetch the brand and related products concurrently on the product page.
  3. Record one documented lab before/after, using the Playwright mobile profile (LCP, CLS, INP or a proxy) and a simulated database latency.
  4. Write `docs/STOREFRONT-PERFORMANCE-2026-10-26.md`.
  5. Note that it reaches visitors only after an approved Worker deploy.
  - Live evidence so far: a cache miss takes 1.0–3.4 s TTFB; a hit takes about 0.3–0.4 s.
- **B2 — Contact contract.**
  1. Move the E.164 validation and wa.me link construction into a pure `.mjs`, with `view.ts` as the adapter.
  2. Include the brand in the product inquiry when the name lacks it, without price, availability or gendered wording.
  3. Make every contact entry point open the configured destination or the honest pending state.
  4. Write tests with an explicitly fictional fixture number (Ofcom drama range `+44 7700 900xxx`). Nothing is ever sent.
- **B3 — Social drafts.** Extend `scripts/catalog-intake/social.mjs`:
  - a website grant does not imply social or ads use, so images appear only under a channel-covering grant;
  - include captions from verified fields, alt text, channel format (dimensions marked "to confirm" unless verified), destination and review state;
  - ads drafts have zero budget with publishing disabled;
  - add a guard that rejects Optix-like identifiers;
  - add tests and a short README section.
- **B4 — Operations docs.** Create `docs/operations/` with these files, each verified against the code:
  - WHATSAPP-REQUEST-LIFECYCLE (nine stages, Arabic and English templates, data/visibility/retention, future provider seam, respond.io deferred);
  - MEDIA-RIGHTS-INTAKE (three intake paths on the existing evidence contracts, revocation and expiry);
  - MONITORING-AND-MAINTENANCE (health facts, alerts prepared but never sent, SAR first for any cost);
  - RELEASE-AND-ROLLBACK;
  - ADDING-A-SOURCE.
- **B5 — Bounded acquisition (coordinator only).**
  1. Read the source registry through the connector.
  2. Pick one eligible official source with no recorded stop or refusal (never the closed brands, Rolex or IWC).
  3. Make one robots request, then fetch a capped sitemap/page inventory (no more than 10 pages, at least 2 s apart, or more if robots asks for it).
  4. Take a fresh private identity export, then select missing items first.
  5. Prepare reviewable private batches of up to 30 candidates and up to 20 facts-only public products. Do not write until the owner approves that exact batch.
  - Report zero honestly if nothing is missing.
- **B6 — Review and final validation.** Review the diff from `3fa1d2d` through the merged B1–B4 changes once. Fix high and medium findings, run both suites once, update STATE and HANDOFF, push and verify the remote.

## Owner action package (only when each dependency is real)

1. **Exact product photos with rights evidence.** For each photo: an owner original or written permission covering source, origins, website publication, resizing and WebP. Upload through an approved private channel, never chat or Git.
2. **Verified business WhatsApp number.**
   - Set it as `PUBLIC_WHATSAPP_E164` with `PUBLIC_INQUIRY_MODE=live` in the Worker configuration.
   - Then deploy the Worker. Deploying needs a tool or person able to deploy, since no deploy tool was available in this session.
3. **Runner database access.**
   - Approve applying the runner role migration.
   - The owner then enters that role's credential in n8n's credential screen, never in chat.
   - Then approve enabling the six database nodes.
4. **Schedule activation**, after a source with a reviewed exact sitemap exists.
5. **Upload function deployment and media bucket creation**, when the first approved photo exists.
6. **The exact factual pilot batch**, when B5 finds genuinely missing records.

## Gates that stay in force

- Do not reapply migration `20261026114541`.
- Do not bypass any refusal, challenge or robots rule. Do not rotate agents, proxies, regions or runtimes against a recorded block.
- Do not publish or approve media without exact evidence. Do not invent, borrow or test-message a phone number.
- Do not create or use credentials outside the owner's secure entry. Do not install `pg_cron`/`pg_net`.
- Do not activate any schedule without approval. Do not deploy, merge to a protected or foundation ref, or force-push.
- Keep private exports, evidence, provider identifiers and session links out of Git. This conversation's private pilot exports were session-local and are not carried over; take a fresh export before any write.

## Notes

- Three commits pushed earlier in this conversation (becdc0a, c7d80a4, c8d6090) carry a session-link trailer. History is not rewritten. Later commits omit it.
- A parallel implementation workflow for B1–B4 was launched and stopped at the checkpoint before any edit. No partial work exists.
