# Agent instructions

These instructions apply equally to Claude, Codex, ChatGPT, Hermes, and future launchers.

## Session start

1. Open `A-awd/jwleria`.
2. Inspect the latest GitHub branch and commit state.
3. Read `README.md`, this file, `STATE.md`, and `HANDOFF.md`.
4. Read relevant entries in `DECISIONS.md` and `decisions/`.
5. Consult `A-awd/ai-operating-system` only for global rules.

The latest approved GitHub state wins over platform-local memory.

## Scope and public boundary

Work only with public-safe code and documentation for the jewelry commerce experience and its generic storefront integrations. Do not add business secrets, credentials, tokens, customer or order data, supplier records, private assets, financial records, production configuration, or raw conversations.

Do not copy or merge content from `jwleria-s-gembox` until a read-only forensic comparison identifies provenance, licensing, sensitivity, and unique useful history. Do not change repository visibility or archive a repository without separate authorization.

## Session end

Update `STATE.md` and `HANDOFF.md`, record durable public-safe decisions in `DECISIONS.md`, and commit and push only when authorized. Leave the migration branch unmerged while its blockers remain.

## Session contract

Verify the canonical remote, approved ref, working tree, latest local and remote commits, and synchronization state. Read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, `LAUNCHER.md`, and relevant linked decisions and security guidance. The latest approved GitHub state governs sanitized instructions and continuity; platform instructions and conversations supplement verified gaps and never roll back newer decisions. Apply explicit current owner instructions when they supersede earlier policy.

After meaningful work, validate the exact change, update `STATE.md` and `HANDOFF.md`, record durable decisions, and record blockers and the next safe action. Commit and push when authorized, then verify the remote revision. Unpushed work is not durable GitHub completion. Keep project memory here; use `A-awd/ai-operating-system` only for global governance.
