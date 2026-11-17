# n8n: approved image delivery check (decision 0022)

## Current owner delivery instruction — 2026-11-17

[Decision 0026](../../decisions/0026-ready-work-publishes-immediately.md) governs: upload and publish each ready part immediately on the existing Jwleria website, including the necessary Supabase recording/binding/activation and deployment. No new owner approval, test suites, extra review loops or waiting for the rest of a batch. Earlier local-only/no-upload/pending-production and test-gate wording below is superseded history. Preserve unfinished/rejected items and all other scope/privacy/source-access limits; they do not hold up ready items.

## Completion after upload — live, 2026-11-17

A second private workflow in the Jwleria project, "Jwleria — Complete recorded approvals after upload (webhook)", is published (producer-reported by Codex). It is the integration for future ready bundles. The manual check below is unchanged.

- **Flow:**
  1. A POST webhook receives metadata only.
  2. A Code node checks the exact ids: 1 to 25 ids of 64 hex characters.
  3. One POST goes to `jwl-media-upload` with the existing public caller.
  4. A Code node checks every candidate's result, then the workflow replies to the uploader.
  5. The execution is marked failed unless every candidate is `published` or `already_published`.
- **Bytes never pass through n8n:** files go directly from the operator's machine to the function. n8n Cloud cannot read local files, and receives only candidate ids.
- **What the function does with the ids:** see "Completion after upload" in [`scripts/catalog-intake/README.md`](../../scripts/catalog-intake/README.md). It resolves each live recorded approval, verifies every stored file, then makes the existing publication call. It never records an approval or writes a file.
- **No new privilege:** the existing public caller is reused inside the private workflow. There is no n8n credential, database node, storage access or schedule. Only Run If (where `$json` is `{body, headers, params, query}`) drops malformed requests with a 200 and no execution.
- **Ignore Bots stays off on this workflow:**
  - In n8n 2.48.4, this option checks `isbot(user-agent)` before authentication and before Only Run If.
  - isbot 3.6.13 classifies every bare machine user agent as a bot (`node`, `curl`, or a custom `Name/1.0`) and the webhook answers 403 `Authorization data is wrong!`.
  - The owner approved disabling it on this workflow only. Do not imitate a browser user agent instead.
- **Observed (producer-reported by Codex):** after that correction, one call for already-published Longchamp 20032021215 returned 200 with `ok: true`, `already_published` and 4 files, and the execution succeeded. No file was downloaded, uploaded or replayed, and nothing was written. The publication call itself will first run for the next genuinely new ready product.
- **Running it:** the uploader (`deliver-ready.mjs upload`, `activate`) reads the webhook address only from its environment at run time. An operator-only private runner loads that address and the existing caller from the private export.
- **Kept private, outside Git:** the workflow's definition and export, its identifiers and webhook address, the caller values, the execution receipts, and the operator's run-time configuration and runner.

## Current delivery and connection status — 2026-11-17

The ready-file route has delivered 515 newly photographed product variants / 2,060 derivative files through the existing Supabase function and catalog calls: Longchamp 390, LOEWE 118 and Bottega Veneta 7. `bind-frozen.mjs` and `deliver-ready.mjs` reuse the reviewed files without re-encoding; private receipts retain actual upload and publication outcomes. This completed production delivery did not run through n8n.

The owner has now opened the existing Cloud account and completed workspace sign-in after its restart. Codex observed the Jwleria project directly: six workflows; its credential list is empty; the image workflow below is still inactive and still replays the same four public files. Its existing caller remains in its private header parameters. The durable intake has two deactivated database nodes. A bounded private export preserves the actual image-workflow definition. No workflow, schedule, credential or account setting was changed or executed. The instance name is no longer missing; do not ask for it again.

Resolved later the same day: the same retained Claude conversation received the continuation and prepared the completion route above. The earlier rejection of instructions, with no alternate control route used, is historical.

**Requirement (met by the completion route above):** the integration must handle future ready-file delivery and activation after legitimate recorded approval. The existing public caller can upload approved bytes and request bounded server-side completion; it cannot directly execute database approval-recording or catalog-publication functions. Inspect and reuse existing server-side capabilities before proposing any new privilege. Do not create a new service, broad credential grant or paid dependency, expose local files publicly, make per-image model calls or replay completed delivery as a preflight. The current owner instruction remains immediate publication of ready work, with no repeated production-approval question or test suite.

**State (2026-11-01):**
- **Ran once by hand, successfully** (observed live): four `already_present` replies with the expected sha256 and size.
- That run is an idempotent delivery replay, not a new upload and not cloud image processing.
- Inactive; a manual trigger only, no schedule.
- **Caller:** the project's existing public anon client key, sent as an Authorization header inside the private workflow, as the owner approved. It is not in this repository.
- **Placement:** in the Jwleria project, moved by the operator through the normal UI. The project lists six inactive workflows. An obsolete duplicate that never ran is archived, not deleted.

## What it does

A real cloud check of the **delivery** route, kept separate from local image work. Normalization (macOS Vision mask, `sharp` white square) and the curator's approval stay local and private.

1. It lists the exact files of a live, recorded approval: today the four `m126200-0006` white square files, by content-addressed path, sha256 and size.
2. It reads each public file.
3. It PUTs the same bytes to `jwl-media-upload`, the same JWT-verified, approval-bound function that uploaded them. The function:
   - re-hashes the bytes;
   - re-checks the live recorded approval, grant and current revision;
   - compares an existing object byte for byte.
4. It requires every reply to be 200 or 201 with the same sha256, size and URL.

**What a reply means:**
- `already_present`: an idempotent replay of an approved file. It is not a new upload and not cloud background removal.
- `uploaded`: the file was missing and is now written, which only the live approval allows.

**What it never does:**
- read or write any table;
- use a service role or database credential;
- make or alter an image;
- run on a schedule.

## Optional: move the header into a credential (operator, n8n UI)

1. (Done) The workflow is in the Jwleria project.
2. In the Jwleria project, create one credential named `Jwleria public function caller (anon JWT)`.
   - Type: Custom Auth (templated), with the template `{"headers":{"Authorization":"Bearer {{api_key}}"}}`.
   - `api_key`: the project's existing legacy anon key, the public client key.
   - It is not a secret and not the service role, and it adds no privilege: the function authorizes nothing beyond the live database approval.
3. Attach the credential to the "Replay through the approval-bound upload" node, and run the workflow by hand once.
4. Expected: four `already_present` replies. Record the execution as an idempotent delivery replay.

Do not reuse another project's credential, and do not paste a service role key.

## Importable definition

n8n Workflow SDK code. Replace `{{SUPABASE_URL}}` with the project URL (kept outside this public repository).

```javascript
import { workflow, node, trigger, expr, newCredential } from '@n8n/workflow-sdk';
const BASE = '{{SUPABASE_URL}}';
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Run by hand' } });
const files = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Approved files', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `
const base = '${BASE}/storage/v1/object/public/jwl-product-media/';
const root = 'v1/b5c145aa41fb122fcedd2db775a499bd50e95c7801f48108113d793b06422444/f5b5b2b881b06307b567c1d80d3238094de829fedc469698b75a891bb1f5ef5b/';
const approved = [
  { width: 320, sha256: '3b6a69d7e73771672879b7478b1417c30989798a4130ea44856b6f76c56a7a30', bytes: 19656 },
  { width: 640, sha256: 'e53d9ed67c490be01a2f21af467416c1d7dab4f18401addbc1c58f3b9ec061b8', bytes: 57562 },
  { width: 960, sha256: '56d4c4d713d90ec6580dd1e742480378e34f51d9c20391c48d6b8fdaf0472686', bytes: 103852 },
  { width: 1414, sha256: 'd2d26137a688da8bd410de6671e14240557e6801071b22b127fd595e8442c0b3', bytes: 174090 },
];
return approved.map(f => { const path = root + f.width + 'w-' + f.sha256 + '.webp'; return { json: { ...f, height: f.width, path, public_url: base + path } }; });` } } });
const readPublic = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Read the public file', parameters: { method: 'GET', url: expr('{{ $json.public_url }}'),
  options: { timeout: 15000, redirect: { redirect: { followRedirects: false } }, response: { response: { responseFormat: 'file', outputPropertyName: 'data' } } } } } });
const replay = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Replay through the approval-bound upload', parameters: { method: 'PUT', url: BASE + '/functions/v1/jwl-media-upload',
  authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth', sendHeaders: true, specifyHeaders: 'keypair',
  headerParameters: { parameters: [ { name: 'x-jwl-path', value: expr("{{ $('Approved files').item.json.path }}") }, { name: 'Content-Type', value: 'image/webp' } ] },
  sendBody: true, contentType: 'binaryData', inputDataFieldName: 'data',
  options: { timeout: 15000, redirect: { redirect: { followRedirects: false } }, response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } } } },
  credentials: { httpTemplatedCustomAuth: newCredential('Jwleria public function caller (anon JWT)') } } });
const check = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Check every reply', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `
const expected = $('Approved files').all().map(i => i.json);
const results = $input.all().map((item, i) => { const want = expected[i], r = item.json, body = r.body || {};
  const ok = [200, 201].includes(r.statusCode) && body.sha256 === want.sha256 && body.bytes === want.bytes && body.public_url === want.public_url && ['already_present', 'uploaded'].includes(body.state);
  return { width: want.width, status: r.statusCode, state: body.state || null, error: body.error || null, ok }; });
const failed = results.filter(r => !r.ok);
if (failed.length) throw new Error('Replay refused or unconfirmed: ' + JSON.stringify(failed));
return [{ json: { verified: results.length, states: results.map(r => r.width + 'w:' + r.state), results } }];` } } });
export default workflow('jwleria-approved-image-delivery', 'Jwleria — Approved image delivery check (manual)').add(start).to(files).to(readPublic).to(replay).to(check);
```

## Other Jwleria workflows (read 2026-11-01)

- Six workflows, all inactive, all in the Jwleria project, including this delivery check.
- "Durable catalog intake" references no credential: its two database nodes are disabled and carry none. Its database steps would need a separately approved least-privilege runner role, which does not exist.
- None of them handles images.
