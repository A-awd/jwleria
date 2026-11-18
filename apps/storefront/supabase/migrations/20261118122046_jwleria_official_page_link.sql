-- PROPOSED under decision 0027 (owner, 2026-11-18): the official page link on a product page. Additive only.
-- - public.jwl_catalog gains official_url (nullable). It is never typed by hand: a trigger sets it on every write of a row
--   from that candidate's own current source_url, and only when that URL is https on the source's registered origin,
--   carries no query, fragment, credentials or port (so no tracking parameter), and its path names the exact reference.
--   Anything else stays null and the page shows no link. A guessed or home page URL can never qualify.
-- - One backfill update fills existing rows through the same trigger; jwl_catalog has no other trigger.
-- - jwl_product_model_v2 returns the selected product's official_url; its body is otherwise unchanged.
-- Readers keep their existing table-level select under the active-row policy. Apply after a Worker that ignores the
-- field (any earlier one) or shows it (the decision 0027 release); both are compatible.
-- Rollback: jwleria_official_page_link.rollback.sql.
begin;
alter table public.jwl_catalog add column official_url text;
alter table public.jwl_catalog add constraint jwl_catalog_official_url_check
  check (official_url is null or (length(official_url)<=2000 and official_url ~ '^https://[^/?#@[:space:]:]+/[^?#[:space:]]*$'));

create function jwl_internal.verified_official_url(p_candidate text) returns text
language sql stable security invoker set search_path='' as $$
  select x.u from (
    select c.content->>'source_url' u,c.external_id ref,s.origin
    from jwl_internal.candidates c join jwl_internal.sources s on s.id=c.source_id
    where c.candidate_id=p_candidate
  ) x
  where x.u is not null and length(x.u)<=2000 and x.u ~ '^https://[^/?#@[:space:]:]+/[^?#[:space:]]*$'
    and x.origin ~ '^https://[^/?#@[:space:]:]+$' and left(x.u,length(x.origin)+1)=x.origin||'/'
    and length(coalesce(x.ref,''))>0 and position(lower(x.ref) in lower(substr(x.u,length(x.origin)+1)))>0;
$$;
revoke all on function jwl_internal.verified_official_url(text) from public,anon,authenticated;

create function jwl_internal.project_official_url() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.official_url:=jwl_internal.verified_official_url(new.id);
  return new;
end $$;
revoke all on function jwl_internal.project_official_url() from public,anon,authenticated;
create trigger jwl_catalog_official_url before insert or update on public.jwl_catalog
  for each row execute function jwl_internal.project_official_url();

update public.jwl_catalog k set official_url=jwl_internal.verified_official_url(k.id)
  where k.official_url is distinct from jwl_internal.verified_official_url(k.id);

create or replace function public.jwl_product_model_v2(p_slug text) returns jsonb
language sql stable security invoker set search_path='' as $$
  with target as (
    select c.id,c.slug,c.reference,c.brand_slug,c.category_slug,c.collection_slug,c.collection_kind,c.collection_ar,c.collection_en,
      c.name_ar,c.name_en,c.description_ar,c.description_en,c.images,c.image_variants,c.media_state,c.published_at,c.official_url,
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
        t.name_ar,t.name_en,t.description_ar,t.description_en,t.images,t.image_variants,t.media_state,t.published_at,t.options,t.specs,t."position",t.official_url,
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
commit;
