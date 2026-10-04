# Database provider evaluation — 2026-10-04

Status: technical recommendation; no provider change, project provisioning,
database import or production connection has been performed.

## Recommendation for Jwleria

Retain **Supabase as the proposed V1 provider**. This is a fit decision for a
minimal brand/collection/product/image catalog with background publication
controls, not a claim that Supabase is universally faster or uniquely
compatible with AI. The owner rejected a product-management dashboard; no
separate catalog console is required. The recommendation is about database,
storage and controlled background tools, not owner dashboard convenience.
The public storefront has no customer login; unused authentication features
are not a reason for this choice. Later private operations are a separate
workstream, not part of this minimal public catalog.

Both vendors provide official MCP integration and managed PostgreSQL. AI
agents can inspect schemas and operate permitted SQL/development tools after
the intended project and authorization have been verified. MCP tool presence
does not prove account access, suitable permissions, successful writes or
production readiness.

## Material differences

| Criterion | Supabase | Neon | Implication |
| --- | --- | --- | --- |
| AI development access | Official MCP with project scope, read-only mode, SQL, migrations and diagnostics | Official MCP with project scope, read-only mode, SQL and branch-based development tools | No unique MCP advantage that decides this catalog's provider |
| File management | Storage with access policies, image transformations and optimized delivery | S3-compatible object storage integrated with project branches | Neon is not database-only; Supabase's integrated media/access workflow is a straightforward default for this catalog |
| Test environments | Separate project branches; data-less by default, seed data or dashboard Include data option | Copy-on-write data branches, plus schema-only branches; integrated file namespaces | Neon has a useful branch-first testing model; V1 can use deliberately seeded non-sensitive test data on either provider |
| Inactive compute | Evaluate the selected plan's actual lifecycle and availability | Scale-to-zero can suspend idle compute and add first-query resume latency; always-active settings depend on plan | Measure cold and warm behavior rather than promising a universal speed winner |
| Portability | PostgreSQL data, plus provider-specific APIs/storage policies | PostgreSQL data, plus provider-specific APIs/storage behavior | Standard SQL and a server data adapter reduce migration effort; changing vendor still needs a reviewed migration |

This comparison is an architectural assessment, not a benchmark. Test the
same representative catalog, indexes, queries, region and connection path
before making latency promises. Separate database query latency from image
delivery and complete page loading. The final hosting-region choice depends
on actual availability and the applicable data requirements.

Neon's MCP additionally exposes a prepare/test/complete migration workflow:
test a proposed schema migration on a temporary branch, then explicitly apply
the prepared change to its target. This is a useful concrete advantage for
automated development, not proof of higher query speed or permission to apply
production changes. Supabase also exposes migration and branch tools; a
reviewed test-and-release workflow remains necessary with either provider.

## Durable implementation boundaries

Store brand/collection/product references, attributes, source provenance and
publication state in PostgreSQL. Store image files in object storage with
stable media identifiers, rights records and a controlled delivery layer.
Separate public catalog access from private operations. Keep schema migrations
and development fixtures in version control; private records stay outside it.

Use a dedicated development environment for AI-assisted changes and a
project-scoped read-only path for production diagnostics. Maintain recovery
for both database records and media; a database backup alone is not a backup
of image files. Verify an actual restore before launch.

## Access and next action

A Supabase account-level read succeeded, but the intended Jwleria project was
not visible to that connection. This does not establish that a historical
backend is absent. Neon project access remains unverified: the available
connector requires a target project identifier for the current unscoped
connection. No failure of Neon authentication was established.

Next: resolve ownership of any intended existing backend and confirm the
provider/project/region before provisioning. Prepare the small approved
catalog model and test dataset in parallel. Validate the resulting data
adapter, scoped access and recovery in development before any production
connection. Account availability must not silently choose the provider or
cause reuse of an unrelated project.

## Official evidence consulted

- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp): development tools, project scoping and read-only mode.
- [Supabase Storage](https://supabase.com/docs/guides/storage): file protocols, access policies, image optimization and delivery.
- [Supabase branching](https://supabase.com/docs/guides/deployment/branching): independent environments and data-less-by-default behavior, including optional data seeding/copying.
- [Neon MCP](https://neon.com/docs/ai/neon-mcp-server): official agent access, tool categories, project scoping and read-only mode.
- [Neon MCP migration tools](https://github.com/neondatabase/mcp-server-neon#database-migrations-schema-changes): prepare/test/complete schema-change workflow.
- [Neon backend documentation](https://neon.com/docs/llms.txt): current platform services; not a database-only product.
- [Neon Storage](https://neon.com/docs/storage/overview): S3-compatible files and isolated branch namespaces; available in four listed regions as checked on this date.
- [Neon branching](https://neon.com/docs/introduction/branching): copy-on-write and schema-only development branches.
- [Neon scale-to-zero](https://neon.com/docs/introduction/scale-to-zero): idle suspension and compute resume behavior; vendor latency statements are not Jwleria measurements.

Current vendor documentation takes precedence over older plugin notes about
Neon's narrower region availability. Recheck feature availability, plans and
limits when implementing; this assessment makes no pricing commitment.
