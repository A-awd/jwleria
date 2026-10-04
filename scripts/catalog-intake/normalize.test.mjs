import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatch } from './normalize.mjs';

const fixture = {
  source_id: 'synthetic-test-source', external_id: 'piece-1',
  source_url: 'https://example.com/pieces/1?variant=black',
  brand: 'Synthetic Brand', collection: 'Synthetic Collection',
  product_name: 'Synthetic Piece', image_urls: ['https://example.com/images/1.jpg'],
};

test('price, private fields and asserted approval cannot enter candidate output', () => {
  const [result] = normalizeBatch([{ ...fixture, price: 100, customer: 'private', publication_state: 'published', media_rights_state: 'approved' }]);
  assert.equal('price' in result, false);
  assert.equal('customer' in result, false);
  assert.equal(result.publication_state, 'candidate');
  assert.equal(result.media_rights_state, 'unverified');
});
test('replayed identities collapse; changed inputs keep stable identity and new revision', () => {
  const [first] = normalizeBatch([fixture, fixture]);
  assert.equal(normalizeBatch([fixture, fixture]).length, 1);
  const [changed] = normalizeBatch([{ ...fixture, product_name: 'Corrected Name' }]);
  assert.equal(first.candidate_id, changed.candidate_id);
  assert.notEqual(first.revision_hash, changed.revision_hash);
});
test('conflicting versions in one batch fail rather than silently overwrite', () => {
  assert.throws(() => normalizeBatch([fixture, { ...fixture, collection: 'Other Collection' }]), /Conflicting/);
});
test('missing collection and unsafe image protocols fail without invented fields', () => {
  assert.throws(() => normalizeBatch([{ ...fixture, collection: '' }]), /Missing collection/);
  assert.throws(() => normalizeBatch([{ ...fixture, image_urls: ['file:///secret'] }]), /Invalid image_url/);
});
