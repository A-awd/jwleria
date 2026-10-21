-- One public read snapshot replaces three network round trips on brand pages.
create or replace function public.jwl_brand_page(p_brand text, p_page integer default 1, p_page_size integer default 12)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with brand_rows as materialized (
    select id,slug,reference,brand_slug,category_slug,collection_slug,collection_ar,collection_en,
      name_ar,name_en,description_ar,description_en,images,media_state,published_at
    from public.jwl_catalog
    where active and brand_slug = p_brand and p_brand ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ), limits as (
    select count(*)::integer as total, greatest(1,least(coalesce(p_page_size,12),48)) as page_size
    from brand_rows
  ), bounds as (
    select total,page_size,ceil(total::numeric/page_size)::integer as pages,
      greatest(1,least(coalesce(p_page,1),greatest(1,ceil(total::numeric/page_size)::integer))) as page
    from limits
  ), page_rows as (
    select b.* from brand_rows b order by published_at desc,id asc
    limit (select page_size from bounds)
    offset (select (page-1)*page_size from bounds)
  ), collections as (
    select distinct collection_slug,collection_ar,collection_en from brand_rows
    order by collection_en asc,collection_slug asc limit 200
  ), directory as (
    select distinct brand_slug,brand_name,brand_tier from public.jwl_catalog
    where active order by brand_slug asc,brand_name asc,brand_tier asc limit 500
  ), target_brand as (
    select brand_slug,brand_name,brand_tier from public.jwl_catalog
    where active and brand_slug = p_brand order by brand_name,brand_tier limit 1
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.published_at desc,p.id asc) from page_rows p),'[]'::jsonb),
    'total',b.total,'page',b.page,'pageSize',b.page_size,'pages',b.pages,
    'collections',coalesce((select jsonb_agg(to_jsonb(c) order by c.collection_en,c.collection_slug) from collections c),'[]'::jsonb),
    'brands',coalesce((select jsonb_agg(to_jsonb(d) order by d.brand_slug,d.brand_name,d.brand_tier) from directory d),'[]'::jsonb),
    'brand',(select to_jsonb(t) from target_brand t)
  ) from bounds b;
$$;
revoke all on function public.jwl_brand_page(text,integer,integer) from public;
grant execute on function public.jwl_brand_page(text,integer,integer) to anon,authenticated,service_role;
