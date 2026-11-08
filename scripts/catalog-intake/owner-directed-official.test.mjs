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
