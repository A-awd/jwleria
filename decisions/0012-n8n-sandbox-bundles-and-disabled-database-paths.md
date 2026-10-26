# 0012 — n8n sandbox-safe bundles and disabled database paths

Status: accepted technical decision by the implementation owner (decision 0010), 2026-10-26. It grants no credential, schedule, source or production permission.

## Observed sandbox

The n8n Cloud Code-node sandbox was probed with credential-free, network-free test runs on 2026-10-26:
- It has no `URL`, `URLSearchParams` or `structuredClone` global, and `require` allows only `crypto`.
- `Object.defineProperty` is replaced by `() => ({})` and defines nothing. `Object.defineProperties` and `Object.getPrototypeOf` are also altered.
- Class and literal getters, `Object.create`, `Object.freeze`, `Reflect.defineProperty`, Unicode lookbehind regular expressions and `$getWorkflowStaticData` behave natively.

esbuild's export and CommonJS interop helpers depend on the altered primitives, so a normally built library is empty in n8n (`__lib.originPlan is not a function`).

## Rules

- Code-node libraries are generated only by `scripts/catalog-intake/build-n8n-intake.mjs` from the tested modules. Each library hands its functions to a plain callback instead of using export helpers.
- `robots-parser` is loaded through a direct `require`.
- The build fails if output contains `defineProperty`, `getPrototypeOf` or `setPrototypeOf`.
- Each node verifies a SHA-256 of its own library text at runtime and refuses to run an altered copy.
- The local VM replica applies the same sandbox patches, so this class of failure is caught before installation.
- Installed node code is verified byte for byte against the build by reading the saved workflow back.
- Database nodes are generated and kept **disabled**. n8n attaches whichever Postgres credential it already holds, so a pre-existing unrelated credential is never used, altered or shared.
  - The nodes stay off until the owner enters the dedicated least-privilege runner credential through n8n's credential screen, the runner role migration (`apps/storefront/supabase/proposed/jwleria_intake_runner.sql`) is approved and applied, and enabling the nodes is approved.
  - A disabled node passes its input through without executing. Without the identity export the run fails closed with `identity_export_incomplete` before any product page is requested.
- One origin runs per sub-workflow execution. The schedule lists only origins with a reviewed exact sitemap; none is listed while its refusal is unreviewed. Only the schedule may call the origin run.
- The schedule runs daily at 03:17 Asia/Riyadh and stays inactive until activation is separately approved.
- Public Git never stores provider workflow, account, credential or session identifiers, including in commit trailers.
