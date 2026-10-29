# CLAUDE.md — jwleria

This file is the entry point for Claude sessions in this repository. It holds the durable rules and points to where the current facts live. It does not repeat `STATE.md` or `HANDOFF.md`; read those for what is live today and what to do next.

## Project identity

- Canonical project: `jwleria`. Canonical repository: `A-awd/jwleria` (public).
- Website: jwleria.com, served by the Cloudflare Worker built from `apps/storefront` (Astro). Catalogue and media data live in the owner's dedicated Supabase project.
- The root Vite/React app (`src/`, `index.html`) is the older Lovable app. It is not the live storefront; do not edit it for website work.

## Canonical routing

1. Global rules: `A-awd/ai-operating-system`, branch `main`, `LAUNCHER.md` and `PROJECT-ROUTING.json`. The routing file maps this project to `jwleria`.
2. Project files, in reading order: `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md` (with `decisions/`), `LAUNCHER.md`.
3. The latest approved GitHub state wins over chat or platform memory. A newer owner instruction supersedes older policy only when it is explicit.

## Owner objective

A fast, phone-first, bilingual (Arabic and English) showcase of products and brands, with genuine photographs of the exact product. Visitors enquire about a piece on WhatsApp.

Photographs are 2D. An exact-product cutout over the current product frame colour is preferred, and background-only removal is the only alteration allowed (decision 0015). Interactive 3D is deferred.

Out of scope, always: prices, login or accounts, cart, checkout, currency or country selectors, CRM, an owner admin or dashboard, and any new service. Copy stays neutral and inquiry-only (decision 0005): no personal-shopping or concierge positioning, no implied stock or brand affiliation.

## Current milestone

Website foundation: real exact-product photographs visible on jwleria.com, and one card or page per real model with its genuine variants. Phone use comes first. Contact, social, ads and other operations are deferred and are not website gates. The milestone's current state is the top entry of `STATE.md`.

## Roles

- **Claude** implements, tests, reviews and integrates (decision 0010). Claude owns technical delivery choices such as byte budgets, fidelity floors and test design, and records them as implementation rules, never as owner approvals.
- **Codex** coordinates, relays and operates. It does not duplicate Claude's implementation or perform a separate code audit (decision 0010). Provider uploads and deploys are made by Codex (or another authorised operator) from immutable, checksummed packages that Claude prepared.
- **Designer stream** owns visuals: layout, typography, responsive presentation and the look of the gallery and variant controls. Directions A, B and C are unselected. Until the owner selects one, keep the current identity: El Messiri for Arabic display (decision 0006) and the lighter palette (decision 0007).
- **Owner** makes the genuine owner decisions listed in `docs/spec/DECISION-APPROVAL-LEDGER.md`.

## Execution rule

- One writer per branch. Parallel work uses separate branches or worktrees, never two writers on one.
- Finalisation is part of the work: validate, update records, commit, and push when authorised.
- Never end a turn or a handoff at "running". Wait for the result, or record exactly what is still in flight, who owns it and how to check it.
- Do not repeat a refused or timed-out provider call within the same turn (see `docs/spec/STOP-RECOVERY-RUNBOOK.md`).

## Evidence labels

Every status claim carries exactly one label:

| Label | Meaning |
|---|---|
| observed live | read directly from production or the real source in this session |
| producer-reported | reported by the operator or tool that made the change, not re-read here |
| reviewed | independently reviewed in a recorded review |
| prepared | built and tested in the repository, not applied or deployed |
| applied | a database change registered in migration history |
| deployed | a Worker version active in production |
| visitor-verified | seen working on the public site at a phone width |
| proposed | written down, awaiting a decision |
| blocked | cannot proceed until a named dependency is met |
| unknown | not established; say so rather than guess |

"Prepared" is never reported as "deployed", and "deployed" is never reported as "visitor-verified".

## Public boundary

This repository is public. Never commit secrets, credentials, project refs, provider IDs, Cloudflare version IDs, private artifact URLs, session links, raw prompts, private source bindings, original image files or customer data. Public-safe counts and hashes of public files are fine.

## Source-of-truth paths

| Topic | Path |
|---|---|
| Live state, latest first | `STATE.md` |
| Next actions | `HANDOFF.md` |
| Decisions | `DECISIONS.md`, `decisions/` |
| Storefront | `apps/storefront/` (setup in `apps/storefront/README.md`) |
| Applied migrations | `apps/storefront/supabase/migrations/` |
| Proposed migrations and rollbacks | `apps/storefront/supabase/proposed/` |
| Intake and media pipeline | `scripts/catalog-intake/` (`README.md`, `OFFICIAL-SOURCES.md`, `BAG-SOURCES.md`) |
| Models and variants contract | `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md` |
| Media coverage | `docs/WEBSITE-MEDIA-COVERAGE-2026-10-26.md` |
| Release and rollback | `docs/operations/RELEASE-AND-ROLLBACK.md`, `releases/` |

## Modules

- [Execution spec](docs/spec/EXECUTION-SPEC.md): product definition and catalogue, model, media, delivery, performance, cache, security and release requirements.
- [Requirements and evidence ledger](docs/spec/REQUIREMENTS-EVIDENCE-LEDGER.md): each requirement, its implementation, evidence, dependency, next action, owner and state.
- [Decision and approval ledger](docs/spec/DECISION-APPROVAL-LEDGER.md): every gate, classified, including the three distinct owner lines for the open-licence migration.
- [Stop and recovery runbook](docs/spec/STOP-RECOVERY-RUNBOOK.md): failure playbooks, including the MCP elicitation timeout.
- [Maintenance backlog](docs/spec/MAINTENANCE-BACKLOG.md): trigger, benefit, owner, dependency and acceptance.
- [Coverage and source registry](docs/spec/COVERAGE-AND-SOURCE-REGISTRY.md): public facts and media counts, sources and their flags, closed lanes and pacing.

## Stopping criteria

Stop and report instead of continuing when:

- the next step needs an owner decision, an action-time confirmation or a credential this session does not have;
- a provider call times out or asks a question that nobody can answer in this session;
- a source refuses access (401, 403, 429, a challenge or a robots disallow);
- a fresh read no longer matches the prepared package (hash, revision or count);
- a test fails and the cause is not understood;
- the change would cross the public boundary or the website scope above.

A stop report states what was done, what was not and why, the exact evidence and the single next safe action.

## Tests and build

```
cd apps/storefront && node --test tests/*.test.mjs
node --test scripts/catalog-intake/*.test.mjs        # from the repository root
cd apps/storefront && pnpm build:cloudflare          # build only; deploys are operator actions
```

Browser checks (`tests/variant-browser.test.mjs`) are opt-in and skip without a local preview server; a skip is not a pass.
