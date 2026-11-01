-- Rollback of jwleria_size_families: restores the reviewed base derivation under its original name, the previous card
-- rule of jwl_catalog_models (exactly as 20261028111013 created it) and the previous mapping, which that derivation
-- rebuilds; drops the v2 model read and the size words. Catalogue rows, approvals, images and grants are not touched.
begin;
drop function public.jwl_product_model_v2(text);

create or replace view public.jwl_catalog_models with (security_invoker=true) as
select c.id,c.slug,c.reference,c.brand_slug,c.brand_name,c.brand_tier,c.category_slug,c.collection_slug,c.collection_ar,c.collection_en,
  c.name_ar,c.name_en,c.images,
  case when v.product_id is null then c.search_text else (select string_agg(m.search_text,' ' order by w.position) from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active where w.model_key=v.model_key) end search_text,
  c.published_at,c.active,c.description_ar,c.description_en,c.media_state,c.image_variants,c.collection_kind,
  v.model_key,coalesce(v.model_name,jsonb_build_object('ar',c.name_ar,'en',c.name_en)) model_name,
  case when v.product_id is null then 1 else (select count(*)::integer from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active where w.model_key=v.model_key) end variant_count,
  case when v.product_id is null then '{}'::jsonb else coalesce((select jsonb_object_agg(s.kind,s.n) from (
    select o->>'kind' kind,count(distinct o->>'key')::integer n from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active cross join lateral jsonb_array_elements(w.options) o
    where w.model_key=v.model_key group by 1 having count(distinct o->>'key')>1) s),'{}'::jsonb) end options_summary
from public.jwl_catalog c left join public.jwl_product_variants v on v.product_id=c.id
where c.active and (v.product_id is null or not exists(select 1 from public.jwl_product_variants w join public.jwl_catalog m on m.id=w.product_id and m.active
  where w.model_key=v.model_key and w.position<v.position));

drop function jwl_internal.derive_product_variants();
alter function jwl_internal.derive_base_variants() rename to derive_product_variants;
delete from jwl_internal.term_translations where kind='size' and term_en in ('Nano','Micro','Mini','Small','Medium','Large');
-- The restored derivation rebuilds exactly the mapping it computed before the size layer.
select jwl_internal.apply_product_variants();
commit;
