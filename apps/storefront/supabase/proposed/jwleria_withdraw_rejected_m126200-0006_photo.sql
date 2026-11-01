-- PREPARED, NOT APPLIED. Owner rejection, 2026-11-01: the white-square Commons photograph of m126200-0006 (the Remi
-- Mathis wrist photograph) is visually rejected and must not stay on public display.
-- It is withdrawn through the existing factual lane: the one public row returns to facts_only. Its facts and search
-- text stay as stored. Nothing is deleted or revoked: the approval, the evidence and the storage files stay, so the
-- change is reversible (see the rollback file). No other row, flag, grant or asset changes.
-- 1. Fresh read: exactly one active row, approved_media, one image (the white square), facts as stored.
select k.reference,k.active,k.media_state,jsonb_array_length(k.images) as images,
  md5(concat_ws('|',k.slug,k.reference,k.brand_slug,k.brand_name,k.brand_tier,k.category_slug,k.collection_slug,k.collection_ar,k.collection_en,k.collection_kind,k.name_ar,k.name_en,k.description_ar,k.description_en,k.search_text)) as facts_md5
from public.jwl_catalog k join jwl_internal.candidates c on c.candidate_id=k.id where c.source_id='rolex-official' and c.external_id='m126200-0006';
-- 2. The one mutation.
select public.jwl_publish_factual_batch(
  (select jsonb_build_array(jsonb_build_object('candidate_id',c.candidate_id,'revision_hash',c.revision_hash,'slug',k.slug,'reference',k.reference,
     'brand_slug',k.brand_slug,'brand_name',k.brand_name,'brand_tier',k.brand_tier,'category_slug',k.category_slug,'collection_slug',k.collection_slug,
     'collection_ar',k.collection_ar,'collection_en',k.collection_en,'collection_kind',k.collection_kind,'name_ar',k.name_ar,'name_en',k.name_en,
     'description_ar',k.description_ar,'description_en',k.description_en,'search_text',k.search_text,'images','[]'::jsonb,'image_variants','[]'::jsonb))
   from public.jwl_catalog k join jwl_internal.candidates c on c.candidate_id=k.id where c.source_id='rolex-official' and c.external_id='m126200-0006'),
  'Owner rejection 2026-11-01: the Commons white-square photograph of m126200-0006 is withdrawn from public display as visually rejected; the facts stay public; the approval, evidence and files are kept so the change is reversible.');
-- 3. Readback: the row is active and facts_only with no image; facts_md5 unchanged; evidence, live approvals and bucket
--    objects unchanged; rows with a photograph go from 2 to 1.
select k.active,k.media_state,jsonb_array_length(k.images) as images,
  (select count(*) from jwl_internal.media_assets) as evidence,(select count(*) from jwl_internal.publication_approvals where revoked_at is null) as live_approvals,
  (select count(*) from storage.objects where bucket_id='jwl-product-media') as objects,(select count(*) from public.jwl_catalog where active and jsonb_array_length(images)>0) as with_photo
from public.jwl_catalog k join jwl_internal.candidates c on c.candidate_id=k.id where c.source_id='rolex-official' and c.external_id='m126200-0006';
