import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${field}`);
  return value.trim();
}
function httpsUrl(value, field) {
  const text = requiredText(value, field);
  // Shared with n8n's restricted sandbox, which does not expose URL.
  // Accept canonical encoded HTTPS URLs only, without userinfo or custom ports.
  const match = /^https:\/\/([a-zA-Z0-9.-]+)(?::443)?([/?#][^\s<>"'\\]*)?$/.exec(text);
  if (!match || /[^\x21-\x7e]|%(?![a-fA-F0-9]{2})/.test(text)) throw new Error(`Invalid ${field}`);
  const host = match[1].toLowerCase();
  if (host.length > 253 || host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error(`Invalid ${field}`);
  let tail = (match[2] ?? '').split('#')[0];
  if (!tail.startsWith('/')) tail = '/' + tail;
  return `https://${host}${tail}`;
}

/** Normalize reviewed-source exports only. No network, database writes or publication. */
export function normalizeBatch(rows) {
  if (!Array.isArray(rows)) throw new Error('Input must be a JSON array');
  const unique = new Map();
  for (const row of rows) {
    const sourceId = requiredText(row.source_id, 'source_id');
    const sourceUrl = httpsUrl(row.source_url, 'source_url');
    const externalId = requiredText(row.external_id, 'external_id');
    const brand = requiredText(row.brand, 'brand');
    const collection = requiredText(row.collection, 'collection');
    const name = requiredText(row.product_name, 'product_name');
    if (!Array.isArray(row.image_urls) || !row.image_urls.length) throw new Error('Missing image_urls');
    const images = [...new Set(row.image_urls.map(url => httpsUrl(url, 'image_url')))];
    const candidateId = hash([sourceId, externalId]);
    const content = { brand, collection, product_name: name, image_urls: images, source_url: sourceUrl };
    const candidate = {
      candidate_id: candidateId,
      revision_hash: hash(content),
      source_id: sourceId,
      external_id: externalId,
      ...content,
      publication_state: 'candidate',
      media_rights_state: 'unverified',
      image_verification_state: 'unverified',
    };
    const previous = unique.get(candidateId);
    if (previous && previous.revision_hash !== candidate.revision_hash) {
      throw new Error('Conflicting revisions for one source/external identity');
    }
    unique.set(candidateId, candidate);
  }
  return [...unique.values()];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node normalize.mjs INPUT.json OUTPUT.ndjson');
  const candidates = normalizeBatch(JSON.parse(readFileSync(input, 'utf8')));
  writeFileSync(output, candidates.map(candidate => JSON.stringify(candidate)).join('\n') + (candidates.length ? '\n' : ''));
  process.stdout.write(JSON.stringify({ candidates: candidates.length, published: 0, database_written: false }) + '\n');
}
