# AGENTS.md

This repository participates in the A-awd GitHub-first AI operating system.

## Repository Role

`jwleria` is a Lovable-generated React/Vite app with Supabase dependencies. Treat generated code carefully: preserve working user-facing behavior and add structure around it before major rewrites.

## AI Role Contract

- Claude: product architecture and UX direction.
- Codex: implementation, tests, Supabase safety, repo hardening.
- Gemini: research, brand and product critique, second-pass review.

## Operating Rules

- Read `docs/ai/OPERATING_MODEL.md` before substantial work.
- Never commit Supabase service keys, auth secrets, customer data, or private business data.
- Prefer small deterministic changes and visible tests.
- Preserve Lovable compatibility unless explicitly changing ownership model.
- Use GitHub issues/PRs as durable memory.
