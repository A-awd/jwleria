# 0002 — Use `jwleria` as the convergence destination

Status: proposed

Date: 2026-09-14

## Proposal

If the two storefront variants become one product, use `A-awd/jwleria` as the
technical destination. Reimplement selected Gembox behavior through reviewed
changes; do not merge the unrelated Git histories. Preserve
`jwleria-s-gembox` until the selected behavior, data boundary, deployment, and
rollback path are verified.

## Evidence

- `jwleria` has the longer history and owns the Supabase schema artifacts.
- Its configured Supabase project is reachable and serves the active catalog.
- The Gembox Supabase hostname does not resolve, and its repository contains no
  schema migrations.
- Neither repository currently has a verified production deployment.

See `docs/LIVE-RUNTIME-AUDIT-2026-09-14.md`.

## Unresolved commercial decision

The owner still needs to choose the first-release behavior: hide prices and
convert through WhatsApp, or display SAR prices. Checkout remains out of scope
until that choice and the live order schema/RLS review are complete.

No code, data, deployment, visibility, archive, or routing change is authorized
by this proposal.
