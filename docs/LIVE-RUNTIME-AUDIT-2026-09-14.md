# Live runtime audit — 2026-09-14

This was a read-only inspection. It changed no deployment, database, project,
credential, repository setting, or production data.

## Verified repository boundary

- `A-awd/jwleria` remains the canonical public project. Its approved ref is
  `migration/one-brain-foundation` at `b777a4acc6e0188316972e814879c984dc275331`.
- `A-awd/jwleria-s-gembox` remains a private comparison source on `main` at
  `38417057ec075b2de43e4e672d5686ce991fc3be`.
- The histories have no common ancestor. The existing content comparison remains
  valid: 166 of 200 shared paths are identical and 34 differ. The private copy
  is not safe to merge by Git ancestry.

## Verified live signals

### Canonical Supabase project

The browser client configuration in the approved `jwleria` ref points to a
reachable Supabase project. Read-only anonymous REST requests confirmed:

| Resource | Anonymous read result |
|---|---:|
| Active brands | 17 |
| Active categories | 84 |
| Active products | 37 |
| Profiles | 0 visible |
| User roles | 0 visible |

Anonymous reads returned no inactive brand, category, or product rows. This is
consistent with the checked-in public-read policies, but it is not a complete
RLS audit because the connected Supabase administration account does not own or
expose this project.

The checked-in `orders`, `order_items`, and `order_status_history` migrations
are not reflected in the live REST schema cache. Each endpoint returned
`PGRST205` (table not found). The order backend must therefore be treated as
unavailable until an authenticated schema inspection proves otherwise.

### Private Gembox Supabase reference

The Supabase hostname embedded in `jwleria-s-gembox` does not resolve. Its code
also has no schema migrations and relies exclusively on that backend for the
catalog. The private repository is therefore not a deployable runtime source in
its current state.

### Hosting

- The Lovable project identifier recorded in `jwleria` exposes a public preview
  through the Lovable project page. The visible preview is an English/EUR Linea
  demo with sample products, placeholder contact details, and a Remix surface.
  It is not acceptable evidence of an owned production deployment.
- The Lovable connector returned `403`, so project ownership, publication state,
  and the current Lovable-to-GitHub revision could not be authenticated.
- The connected AWD Vercel account contains no Jwleria project.
- GitHub reports no deployments for the public `jwleria` repository. The private
  repository's deployment endpoint is not publicly readable.

## CTO recommendation

Use `A-awd/jwleria` as the only convergence destination because it owns the
longer history, the schema artifacts, and the reachable catalog backend. Keep
`jwleria-s-gembox` unchanged as a temporary feature source; do not merge its
unrelated history or deploy it.

For the first real release, the safest product shape is an Arabic-first RTL
personal-shopping catalog with WhatsApp as the conversion path. Reimplement the
selected Arabic-only, price-hidden, and WhatsApp behavior from Gembox in a
reviewed `jwleria` branch. Keep checkout and order persistence disabled until
the owner chooses the commercial price/checkout model and an authenticated
Supabase review proves the final schema and RLS policies.

This product shape is a recommendation, not an adopted commercial decision.

## Exact next action

The owner must choose whether the public experience hides prices and converts
through WhatsApp, or displays SAR prices. After that single commercial choice,
implement the selected Gembox behavior in `jwleria`, remove placeholder identity
and contact content, connect the verified catalog project, and verify a preview.
Do not change either repository's visibility or lifecycle until that preview is
accepted and a rollback receipt exists.
