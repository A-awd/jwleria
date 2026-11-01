# n8n: approved image delivery check (decision 0022)

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
