# Private official catalog collection

`extract-official-brands.mjs` supports the verified structured page formats of
Rolex, Cartier, Van Cleef & Arpels, IWC, Piaget, Panerai, Jaeger-LeCoultre and
Audemars Piguet. Variant identifiers must match their official page paths.
JSON-LD facts remain attributed. The JLC fallback requires matching breadcrumbs,
heading and product image; AP case material and size require an exact reference
in both the component and its data object, never calibre dimensions.

`collect-official-brands.mjs` discovers a bounded official sitemap manifest,
checks fresh robots rules, spaces requests by at least two seconds and respects
larger declared delays. Redirects, HTTP 401/403/429 and challenge pages stop the
source. It never transfers image files, creates permission grants or publishes.

Run with a private configuration file outside this repository:

```sh
node scripts/catalog-intake/collect-official-brands.mjs PRIVATE_SOURCE_CONFIG.json
```

The configuration must provide `source_id`, actual `permission_reference`,
`enabled: true`, `acquisition_allowed: true`, `sitemap_urls`, `language`, and
an absolute `output_directory` outside the repository. Optional
`sitemap_child_selector` limits regional indexes; the collector follows at most
30 sitemap files with a depth limit of three. Image-publication authorization
is a separate existing gate, never inferred from acquisition or robots access.

Private output consists of an atomic `manifest.json`, `progress.json`,
`candidates.json`, and an append-only `candidates.ndjson` revision journal.
A PID lock prevents concurrent acquisition into the same output directory.
Re-running resumes processed URLs. A stopped refusal requires actual source
review before `resume_after_source_review` is set; this flag grants no bypass.
An explicitly reviewed `reviewed_path_exclusions` entry may omit one exact
product URL that redirects to its own `j_security_check` authentication path.
It requires the observed HTTP 302, exact redirect location, review timestamp
and evidence reference. The authentication URL is never followed; unrelated
public product paths can continue. The original manifest, failure evidence
and excluded URL remain visible, and coverage stays incomplete.

`inventory_complete` refers only to successful validation of the filtered
manifest observed for that source and locale. Discovered URL counts are not
validated product counts; duplicate variants collapse into stable source/SKU
identities. This flag does not prove every worldwide product is represented,
current availability, image rights, Arabic editorial review or publication.
Unsupported categories stay pending rather than acquiring an incorrect type.

Synthetic regression inputs in `extract-official-brands.test.mjs` verify
identity binding, technical facts, category boundaries and immediate refusal.
No raw brand pages, source marketing copy or private manifests belong in Git.
