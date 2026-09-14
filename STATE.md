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
