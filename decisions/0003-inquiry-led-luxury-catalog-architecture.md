# 0003 — Inquiry-led luxury catalog architecture

Status: proposed; technical review completed, pending owner adoption

Date: 2026-10-03

## Owner-confirmed public behavior

- Keep the public site open without login, sign-up, account, portal, or administration-entry UI/routes. Its purpose is brand/collection/product/image display with a WhatsApp contact button. Decision 0008 removes the separate owner catalog console too; content updates use background developer/agent tools.

- Use the public name **Jwleria** for a luxury catalog with broad brand/category coverage.

- Display no public prices; price and availability are confirmed on private inquiry.

- Keep WhatsApp as the website's primary inquiry CTA while permitting private inquiries in WhatsApp, Instagram, and TikTok.

- Publish source material and media only under an applicable permission basis; approve content batches before publication.

These choices resolve the price-display question recorded in decision 0002. They do not resolve its repository-consolidation or migration gates.

## Proposed technical direction

Use an Astro/React-islands storefront and server gateways on Cloudflare Workers, with one controlled managed PostgreSQL project and server-only read access. Separate public projections and internal catalog revisions/grants. Private immutable quote versions belong to the separate later operations workstream. Deny browser Data API access; catalog data contains no amounts and public views never join operations.

Arabic-first presentation plus English is the proposed locale default, pending owner adoption.

Begin with synthetic previews, manual curation, and approved manual content batches. Future automated adapters remain disabled. Use current grants on fresh reads, bounded caches, an append-only revocation ledger, and restore procedures that reapply revocations before traffic.

The rationale is rendered catalog SEO, a constrained public contract, and a maintainable first release. Existing React/Vite code is not considered inherently unsafe merely because it is a single-page application. Useful components and stable identifiers can be retained selectively.

See [the proposed architecture](../docs/ARCHITECTURE.md) for interfaces, implementation ownership, and acceptance criteria.

## Limits

No code, database, environment, deployment, visibility, archive, routing, subscription, or migration promotion is authorized by this decision. Owner adoption, public publication, and existing repository gates remain pending. This record contains public product/engineering information only; protected operations and review dialogue remain outside the public repository.
