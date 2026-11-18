# AI Operating Model

## Current owner delivery instruction — 2026-11-17

[Decision 0026](../../decisions/0026-ready-work-publishes-immediately.md) governs: upload and publish each ready part immediately on the existing Jwleria website, including the necessary Supabase recording/binding/activation and deployment. No new owner approval, test suites, extra review loops or waiting for the rest of a batch. Earlier local-only/no-upload/pending-production and test-gate wording below is superseded history. Preserve unfinished/rejected items and all other scope/privacy/source-access limits; they do not hold up ready items.

[Decision 0027](../../decisions/0027-official-originals-in-use-photos-and-official-links.md) (owner, 2026-11-18) adds: the exact official original when a cutout fails or is rejected (no upscaling; low-resolution holds kept), one review of the exact final bytes, up to two verified in-use photographs, the verified official page link, and breadth-first brand rotation.

## Role

`jwleria` is a React/Vite app with Supabase integration. It appears to come from a Lovable workflow, so GitHub is now the durable coordination layer around generated app work.

## Durable Memory

- GitHub issues: product tasks, bugs, Supabase work, UX changes.
- Pull requests: implementation notes and verification.
- `AGENTS.md`: AI execution rules.
- `docs/ai/REPO_HEALTH.md`: maturity and hardening backlog.

## Workflow

1. Claude decides product architecture and UX direction.
2. Codex implements deterministic app, test, and Supabase changes.
3. Gemini can provide product/brand critique and external research.
4. Lovable-generated changes should be reviewed through GitHub before production use.

## Supabase Safety

- Browser code uses publishable/anon-safe keys only.
- Service role keys stay server-side only.
- Migrations are additive and reviewed.
- RLS must match the real access model.
