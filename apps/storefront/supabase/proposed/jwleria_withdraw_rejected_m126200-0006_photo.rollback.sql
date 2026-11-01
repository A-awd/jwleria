-- Rollback of jwleria_withdraw_rejected_m126200-0006_photo.sql: republish the kept, still-live approval (the white
-- square) on the open-licence lane, with the stored facts unchanged. Run only if the owner reverses the rejection.
select public.jwl_publish_candidate(k.id,a.revision_hash,jsonb_build_object('slug',k.slug,'reference',k.reference,'brand_slug',k.brand_slug,
  'brand_name',k.brand_name,'brand_tier',k.brand_tier,'category_slug',k.category_slug,'collection_slug',k.collection_slug,'collection_ar',k.collection_ar,
  'collection_en',k.collection_en,'collection_kind',k.collection_kind,'name_ar',k.name_ar,'name_en',k.name_en,'description_ar',k.description_ar,
  'description_en',k.description_en,'search_text',k.search_text,'images',a.approved_images,'image_variants',a.approved_image_variants))
from public.jwl_catalog k join jwl_internal.candidates c on c.candidate_id=k.id
join jwl_internal.publication_approvals a on a.candidate_id=c.candidate_id and a.revision_hash=c.revision_hash and a.revoked_at is null and a.image_verified
where c.source_id='rolex-official' and c.external_id='m126200-0006';
