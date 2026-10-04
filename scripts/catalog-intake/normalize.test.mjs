import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatch } from './normalize.mjs';
import { checkImageReferences } from './image-reference.mjs';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

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
test('private source copy is preserved; original summaries use technical facts only', () => {
  const [candidate]=normalizeBatch([{...fixture,source_description:'Exclusive timeless craftsmanship and luxury advertising.',
    facts:[{key:'material',value:'stainless steel'},{key:'diameter',value:'41 mm'}],
    name_ar:'قطعة اختبار',provenance:{method:'json-ld',language:'en'},
    image_reference_checks:[{url:fixture.image_urls[0],status:'reachable',http_status:200,content_type:'image/jpeg'}],
  }]);
  assert.match(candidate.source_description,/Exclusive/);
  assert.match(candidate.description_ar,/فولاذ مقاوم للصدأ/);
  assert.match(candidate.description_en,/Diameter: 41 mm/);
  assert.doesNotMatch(candidate.description_en,/Exclusive|craftsmanship/);
  assert.equal(candidate.provenance.source_url,fixture.source_url);
  assert.equal(candidate.extraction.description,'captured');
  assert.equal(candidate.image_reference_checks[0].status,'reachable');
  assert.equal(candidate.image_verification_state,'unverified');
  assert.equal(candidate.media_rights_state,'unverified');
  assert.deepEqual(normalizeBatch([candidate])[0],candidate);
});
test('re-normalization does not invent Arabic translation or change candidate revision',()=>{
  const candidate=normalizeBatch([fixture])[0];
  assert.equal(candidate.translation_state,'name_pending');
  assert.equal(candidate.extraction.description,'missing');
  assert.deepEqual(normalizeBatch([candidate])[0],candidate);
  assert.notEqual(normalizeBatch([{...fixture,facts:[{key:'material',value:'leather'}]}])[0].revision_hash,candidate.revision_hash);
});
test('Source material terminology is translated without adding composition claims',()=>{
  const candidate=normalizeBatch([{...fixture,facts:[{key:'material',value:'Recycled canvas'}]}])[0];
  assert.match(candidate.description_ar,/قماش معاد تدويره/);
  assert.match(candidate.description_en,/Recycled canvas/);
  assert.doesNotMatch(candidate.description_ar,/100%|جلد|عضوي/);
});
test('Image references use HEAD, reject foreign origins and never treat HTML/redirect as verified imagery',async()=>{
  let calls=0;
  await assert.rejects(checkImageReferences(['https://foreign.test/a.webp'],{origins:['https://example.com']},()=>{calls++;}),/origin/);
  assert.equal(calls,0);
  const checks=await checkImageReferences(fixture.image_urls,{origins:['https://example.com']},async(url,opts)=>{
    assert.equal(opts.method,'HEAD');assert.equal(opts.redirect,'manual');return new Response(null,{headers:{'content-type':'image/webp'}});
  });
  assert.equal(checks[0].status,'reachable');
  const html=await checkImageReferences(fixture.image_urls,{origins:['https://example.com']},async()=>new Response(null,{headers:{'content-type':'text/html'}}));
  assert.equal(html[0].status,'referenced');
  const candidate=normalizeBatch([{...fixture,image_reference_checks:checks}])[0];
  assert.equal(candidate.image_reference_checks[0].status,'reachable');
  assert.equal(candidate.image_verification_state,'unverified');
});
test('Restricted n8n helper and local importer produce identical enriched candidates',()=>{
  const workflow=readFileSync(new URL('../../workflows/n8n/catalog-normalization.js',import.meta.url),'utf8');
  const start=workflow.indexOf('jsCode:')+7,end=workflow.indexOf('}},output:',start);
  const code=JSON.parse(workflow.slice(start,end));
  const records=[{...fixture,source_description:'Private source text',facts:[{key:'material',value:'leather'}]}];
  const output=runInNewContext(`(function(){${code}\n})()`,{require:()=>({createHash}),$input:{all:()=>[{json:{records}}]}});
  assert.deepEqual(JSON.parse(JSON.stringify(output.map(i=>i.json))),normalizeBatch(records));
});
