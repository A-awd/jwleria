import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMediaGrant,cutoutBasisProblem,officialGalleryKinds,galleryListingProblem} from './media-pipeline.mjs';

// Synthetic fixtures. Decision 0025: official exact-product images under the owner's direction, no brand contact.
const candidate={candidate_id:'c'.repeat(64),revision_hash:'r'.repeat(64),source_id:'longchamp-official',external_id:'10166HSR001',
  image_urls:['https://www.longchamp.com/img/10166HSR001_HCS.png']};
const grant={grant_reference:'owner-directed-longchamp-0025',kind:'owner_directed_official',source_id:'longchamp-official',candidate_id:null,
  media_origins:['https://www.longchamp.com'],website_publication:true,resize:true,webp_encode:true,background_removal:true,evidence_reference:'decision-0025'};

test('decision 0025: the owner-direction kind permits only the exact recorded gallery file on its recorded origin',()=>{
  assert.deepEqual(officialGalleryKinds,['written_permission','owner_directed_official']);
  assert.equal(evaluateMediaGrant(grant,{candidate,asset_url:candidate.image_urls[0]}).state,'permitted');
  assert.deepEqual(evaluateMediaGrant(grant,{candidate,asset_url:'https://www.longchamp.com/img/10166HSR001_HCS_2000.png'}).reasons,['asset_not_in_exact_candidate_gallery'],'no constructed URLs');
  assert.ok(evaluateMediaGrant(grant,{candidate:{...candidate,source_id:'cartier-official'},asset_url:candidate.image_urls[0]}).reasons.includes('source_acquisition_restricted'));
  assert.deepEqual(evaluateMediaGrant({...grant,evidence_reference:'brand licence'},{candidate,asset_url:candidate.image_urls[0]}).reasons,['owner_direction_must_cite_decision_0025']);
});

test('decision 0025: background-only extraction is covered only when the direction records it',()=>{
  assert.equal(cutoutBasisProblem(grant),null);
  assert.equal(cutoutBasisProblem({...grant,background_removal:false}),'owner_direction_does_not_record_background_removal');
});

test('decision 0025: a gallery listing can settle identity for the owner-direction kind, never for an open licence',()=>{
  assert.notEqual(galleryListingProblem({identity_determination:{}},{candidate,asset:{sha256:'a'.repeat(64)},grant}),'a gallery listing settles identity only for an official-gallery grant');
  assert.equal(galleryListingProblem({identity_determination:{}},{candidate,asset:{sha256:'a'.repeat(64)},grant:{kind:'open_license'}}),'a gallery listing settles identity only for an official-gallery grant');
});

test('decision 0025 batch: the visual review keeps its checks and text; the identity determination is attached and quoted separately',async()=>{
  const {mergedVerification,derivativeReviewProblem,batchPublishSql}=await import('./batch-official.mjs');
  const visual={asset_sha256:'a'.repeat(64),verified_reference:'10166HSR001',reviewer:'Visual reviewer',verification_reference:'Viewed original and tile.',
    checks:{exact_reference:'uncertain',color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
  const d={basis:'official_gallery_listing',asset_sha256:'a'.repeat(64),identity_established:true,reference:'10166HSR001',revision_hash:'r'.repeat(64),gallery_url:candidate.image_urls[0],reviewer:'Identity reviewer',reason:'Recorded gallery file.'};
  const m=mergedVerification(visual,d);
  assert.deepEqual(m.checks,visual.checks);
  assert.ok(m.verification_reference.startsWith('Viewed original and tile. || Separate official-gallery identity determination by Identity reviewer'));
  assert.throws(()=>mergedVerification(visual,{...d,reference:'10166HSR002'}),/same original and reference/);
  const files=[{width:320,sha256:'1'.repeat(64)},{width:1600,sha256:'2'.repeat(64)}];
  const review={reviewer:'Visual reviewer',items:[{tile_sha256:'t',derivatives:[{width:320,sha256:'1'.repeat(64),pass:true},{width:1600,sha256:'2'.repeat(64),pass:false}]}]};
  assert.equal(derivativeReviewProblem(review,{tile_sha256:'t',files}),'derivatives not reviewed and passed: 1600w');
  assert.equal(derivativeReviewProblem(review,{tile_sha256:'other',files}),'no derivative review for this tile');
  review.items[0].derivatives[1].pass=true;
  assert.equal(derivativeReviewProblem(review,{tile_sha256:'t',files}),null);
  assert.throws(()=>batchPublishSql(["x'; drop"]),/Exact candidate ids/);
});

test('decision 0025 batch: a flat per-file derivative review is grouped by tile unchanged, and is optional per tile',async()=>{
  const {derivativeReviewByTile,derivativeReviewed}=await import('./batch-official.mjs');
  const g=derivativeReviewByTile({reviews:[{tile_sha256:'t',width:320,sha256:'1',reviewer:'R',accepted:true},{tile_sha256:'t',width:640,sha256:'2',reviewer:'R',accepted:false}]});
  assert.deepEqual(g,{reviewer:'R',items:[{tile_sha256:'t',derivatives:[{width:320,sha256:'1',pass:true},{width:640,sha256:'2',pass:false}]}]});
  assert.equal(derivativeReviewed(g,'t'),true);assert.equal(derivativeReviewed(g,'u'),false);
  assert.throws(()=>derivativeReviewByTile({reviews:[{tile_sha256:'t',reviewer:'A'},{tile_sha256:'t',reviewer:'B'}]}),/per reviewer/);
});
