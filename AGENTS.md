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

## Canonical authority and entry contract

GitHub is the only permanent source of truth for approved, sanitized project state. Platform-local memory, chat history, launcher text, caches, and unpushed work are non-authoritative.

At session start, read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus relevant linked decisions and workflows. Continue only from the latest verified GitHub branch and commit.
