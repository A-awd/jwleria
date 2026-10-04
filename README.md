# jwleria

Canonical project repository for the public-safe documentation and code of the Jwleria jewelry commerce project.

## One Brain status

- Canonical name: `jwleria`
- Type: business project
- Status: active; migration merge blocked pending repository reconciliation
- Current repository visibility: public
- GitHub disposition: canonical project repository

GitHub is the permanent source of truth for approved public-safe material. Platform-local chats and memories are non-authoritative.

## Start here

1. Read [AGENTS.md](AGENTS.md).
2. Review [STATE.md](STATE.md) and [HANDOFF.md](HANDOFF.md).
3. Consult [DECISIONS.md](DECISIONS.md) and the latest GitHub branch and commit.
4. Use [LAUNCHER.md](LAUNCHER.md) with any supported AI agent.

See [docs/PROJECT-OVERVIEW.md](docs/PROJECT-OVERVIEW.md) and [migration/MIGRATION-REPORT.md](migration/MIGRATION-REPORT.md).

## Merge gate

The private duplicate repository `jwleria-s-gembox` requires a forensic, history-preserving comparison before any unique useful content can be consolidated. Because this repository is public, no private business or operational memory may be added. These two conditions block merging the One Brain migration branch until resolved.

## Storefront implementation

The current inquiry-only Arabic/English storefront is in `apps/storefront`. It connects to the owner-created dedicated Supabase catalog, with no public prices, visitor accounts or owner product dashboard. The Node development path and Cloudflare Workers deployment path are supported. See [storefront setup](apps/storefront/README.md). The domain cutover and genuine media/WhatsApp launch dependencies remain open; project reconciliation still gates merging the foundation branch.
