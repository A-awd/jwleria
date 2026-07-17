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
