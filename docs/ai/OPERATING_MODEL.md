# AI Operating Model

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
