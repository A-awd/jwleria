-- Rollback of jwleria_official_page_link.sql: the RPC returns to its 20261101133722 body, then the trigger, functions,
-- constraint and column are removed. Pages that render the link simply show none.
begin;
create or replace function public.jwl_product_model_v2(p_slug text) returns jsonb
language sql stable security invoker set search_path='' as $$
  with target as (
    select c.id,c.slug,c.reference,c.brand_slug,c.category_slug,c.collection_slug,c.collection_kind,c.collection_ar,c.collection_en,
      c.name_ar,c.name_en,c.description_ar,c.description_en,c.images,c.image_variants,c.media_state,c.published_at,
      v.model_key,coalesce(v.model_name,jsonb_build_object('ar',c.name_ar,'en',c.name_en)) model_name,
      coalesce(v.options,'[]'::jsonb) options,coalesce(v.specs,'[]'::jsonb) specs,coalesce(v.position,0) "position"
    from public.jwl_catalog c left join public.jwl_product_variants v on v.product_id=c.id
    where c.active and c.slug=p_slug and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ), members as (
    select c.id,c.slug,c.reference collate "C" reference,c.images,c.image_variants,v.options,v.specs,v."position",
      (select o from jsonb_array_elements(v.options) o where o->>'kind' in ('case_size','bag_size','size','model_size') limit 1) size_option
    from target t join public.jwl_product_variants v on v.model_key=t.model_key join public.jwl_catalog c on c.id=v.product_id and c.active
  ), ordered as (
    select m.*,row_number() over (order by m."position",m.reference,m.id) rn from members m
  ), size_rows as (
    select o.size_option->>'key' key,min(o.rn) first_rn,count(*)::integer variants,min(o.size_option::text)::jsonb opt
    from ordered o where o.size_option is not null group by 1
  ), size_specs as (
    select o.size_option->>'key' key,u.s,u.s->>'kind' kind,u.s->'value'->>'en' en,u.ord
    from ordered o cross join lateral jsonb_array_elements(o.specs) with ordinality u(s,ord) where o.size_option is not null
  ), size_kinds as (
    -- A fact is shown per size when every size records exactly one value for it and not all sizes agree.
    select x.kind,min(x.ord) ord from (select key,kind,count(distinct en) n,min(ord) ord from size_specs group by 1,2) x
    join (select kind,count(distinct en) d from size_specs group by 1) y on y.kind=x.kind
    group by x.kind,y.d having bool_and(x.n=1) and count(*)=(select count(*) from size_rows) and y.d>1
  ), size_options as (
    select o.size_option->>'key' key,e->>'kind' kind,count(distinct e->>'key')::integer n
    from ordered o cross join lateral jsonb_array_elements(o.options) e where o.size_option is not null and e->>'kind'<>o.size_option->>'kind' group by 1,2
  ), representative as (
    -- Only when the addressed variant has no photograph: the first photographed variant of its own size, else of the model.
    select o.slug,o.reference,o.size_option,o.images,o.image_variants,
      (o.size_option->>'key') is not distinct from (select (select x from jsonb_array_elements(t.options) x where x->>'kind' in ('case_size','bag_size','size','model_size') limit 1)->>'key' from target t) same_size
    from ordered o where jsonb_array_length(o.images)>0 and (select jsonb_array_length(t.images) from target t)=0
    order by 6 desc,o.rn limit 1
  )
  select jsonb_build_object(
    'product',(select to_jsonb(x) from (select t.id,t.slug,t.reference,t.brand_slug,t.category_slug,t.collection_slug,t.collection_kind,t.collection_ar,t.collection_en,
        t.name_ar,t.name_en,t.description_ar,t.description_en,t.images,t.image_variants,t.media_state,t.published_at,t.options,t.specs,t."position",
        coalesce((select o.rn=1 from ordered o where o.id=t.id),true) is_primary) x),
    'model_key',t.model_key,'model_name',t.model_name,
    'variant_count',(select count(*) from members),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'slug',o.slug,'reference',o.reference,'options',o.options,'position',o."position",
        'is_primary',o.rn=1,'has_image',jsonb_array_length(o.images)>0) order by o.rn) from ordered o where o.rn<=2000),'[]'::jsonb),
    'sizes',coalesce((select jsonb_agg(jsonb_build_object('key',r.key,'option',r.opt,'variant_count',r.variants,
        'facts',coalesce((select jsonb_agg(sp.s order by k.ord) from size_kinds k cross join lateral (select ss.s from size_specs ss where ss.key=r.key and ss.kind=k.kind limit 1) sp),'[]'::jsonb),
        'options',coalesce((select jsonb_object_agg(so.kind,so.n) from size_options so where so.key=r.key),'{}'::jsonb)) order by r.first_rn) from size_rows r),'[]'::jsonb),
    'representative',(select jsonb_build_object('slug',r.slug,'reference',r.reference,'size_option',r.size_option,'images',r.images,'image_variants',r.image_variants,'same_size',r.same_size) from representative r)
  ) from target t;
$$;
drop trigger jwl_catalog_official_url on public.jwl_catalog;
drop function jwl_internal.project_official_url();
drop function jwl_internal.verified_official_url(text);
alter table public.jwl_catalog drop constraint jwl_catalog_official_url_check;
alter table public.jwl_catalog drop column official_url;
commit;
