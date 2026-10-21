-- Distinguish named collections from factual source grouping.
-- No source permission, photo approval or product publication is granted here.
begin;
alter table public.jwl_catalog add column collection_kind text not null default 'collection'
 check(collection_kind in ('collection','source_group'));

create or replace function public.jwl_ingest_batch(records jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; clean jsonb; s jwl_internal.sources; changed integer:=0; previous text;
begin
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records)>100 then raise exception 'Invalid intake batch'; end if;
  for r in select value from jsonb_array_elements(records) loop
    select * into s from jwl_internal.sources where id=r->>'source_id';
    if s.id is null or not s.enabled or not s.acquisition_allowed or s.permission_reference is null then raise exception 'Source acquisition not approved'; end if;
    if split_part(r->>'source_url','/',1)||'//'||split_part(r->>'source_url','/',3) <> s.origin then raise exception 'Source origin mismatch'; end if;
    if coalesce(r->>'external_id','')='' or coalesce(r->>'brand','')='' or coalesce(r->>'collection','')='' or coalesce(r->>'product_name','')='' then raise exception 'Missing catalog fields'; end if;
    if jsonb_typeof(r->'image_urls') is distinct from 'array' or jsonb_array_length(r->'image_urls')=0 then raise exception 'Missing images'; end if;
    if (r ? 'source_description' and jsonb_typeof(r->'source_description') not in ('string','null')) or (r ? 'facts' and jsonb_typeof(r->'facts') <> 'array') then raise exception 'Invalid candidate enrichment'; end if;
    if r ? 'collection_kind' then
      if jsonb_typeof(r->'collection_kind') is distinct from 'string' or r->>'collection_kind' not in ('collection','source_group') then raise exception 'Invalid collection kind';end if;
    end if;
    clean:=jsonb_build_object('brand',r->>'brand','collection',r->>'collection','product_name',r->>'product_name','image_urls',r->'image_urls','source_url',r->>'source_url',
      'source_description',r->'source_description','facts',coalesce(r->'facts','[]'::jsonb),
      'name_ar',r->>'name_ar','name_en',r->>'name_en','description_ar',r->>'description_ar','description_en',r->>'description_en',
      'translation_state',r->>'translation_state','provenance',r->'provenance','extraction',r->'extraction','image_reference_checks',r->'image_reference_checks');
    if r ? 'collection_kind' then clean:=clean||jsonb_build_object('collection_kind',r->>'collection_kind');end if;
    select revision_hash into previous from jwl_internal.candidates where candidate_id=r->>'candidate_id';
    if previous is distinct from r->>'revision_hash' then changed:=changed+1; end if;
    insert into jwl_internal.candidates(candidate_id,source_id,external_id,revision_hash,content)
      values(r->>'candidate_id',s.id,r->>'external_id',r->>'revision_hash',clean)
      on conflict(candidate_id) do update set revision_hash=excluded.revision_hash,content=excluded.content,last_seen_at=now();
    insert into jwl_internal.candidate_revisions(candidate_id,revision_hash,content)
      values(r->>'candidate_id',r->>'revision_hash',clean) on conflict do nothing;
  end loop;
  return jsonb_build_object('received',jsonb_array_length(records),'changed',changed,'published',0);
end $$;
revoke all on function public.jwl_ingest_batch(jsonb) from public,anon,authenticated;
grant execute on function public.jwl_ingest_batch(jsonb) to service_role;

create or replace function public.jwl_publish_factual_batch(products jsonb, owner_instruction text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb;c jwl_internal.candidates;published integer:=0;
begin
 if jsonb_typeof(products)<>'array' or jsonb_array_length(products)>100 or coalesce(length(trim(owner_instruction)),0)=0 then raise exception 'Invalid factual publication batch';end if;
 for p in select value from jsonb_array_elements(products) loop
  select * into c from jwl_internal.candidates where candidate_id=p->>'candidate_id';
  if c.candidate_id is null or c.revision_hash<>p->>'revision_hash' then raise exception 'Candidate revision changed';end if;
  if p ? 'collection_kind' then
   if jsonb_typeof(p->'collection_kind') is distinct from 'string' or p->>'collection_kind' not in ('collection','source_group') then raise exception 'Invalid collection kind';end if;
  end if;
  if coalesce(p->>'collection_kind','collection') is distinct from coalesce(c.content->>'collection_kind','collection') then raise exception 'Collection kind differs from current candidate';end if;
  if jsonb_array_length(coalesce(c.content->'facts','[]'))=0 or c.content->>'translation_state'<>'provided' then raise exception 'Facts or prepared name missing';end if;
  if p->>'reference' is distinct from c.external_id or p->>'brand_name' is distinct from c.content->>'brand' or p->>'collection_en' is distinct from c.content->>'collection' or p->>'name_ar' is distinct from c.content->>'name_ar' or p->>'name_en' is distinct from c.content->>'name_en' or p->>'description_ar' is distinct from c.content->>'description_ar' or p->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Factual content mismatch';end if;
  if coalesce(jsonb_array_length(p->'images'),0)<>0 then raise exception 'Media excluded from factual publication';end if;
  if p ? 'image_variants' then
   if jsonb_typeof(p->'image_variants') is distinct from 'array' then raise exception 'Media excluded from factual publication';end if;
   if jsonb_array_length(p->'image_variants')<>0 then raise exception 'Media excluded from factual publication';end if;
  end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,collection_kind,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,search_text)
   values(c.candidate_id,p->>'slug',c.external_id,p->>'brand_slug',p->>'brand_name',p->>'brand_tier',p->>'category_slug',p->>'collection_slug',p->>'collection_ar',p->>'collection_en',coalesce(p->>'collection_kind','collection'),p->>'name_ar',p->>'name_en',p->>'description_ar',p->>'description_en','[]','[]','facts_only',p->>'search_text')
   on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,collection_kind=excluded.collection_kind,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images='[]',image_variants='[]',media_state='facts_only',search_text=excluded.search_text,active=true;
  insert into jwl_internal.factual_publications(catalog_id,candidate_id,revision_hash,owner_instruction) values(c.candidate_id,c.candidate_id,c.revision_hash,owner_instruction) on conflict(catalog_id) do update set revision_hash=excluded.revision_hash,owner_instruction=excluded.owner_instruction,published_at=now();
  published:=published+1;
 end loop;
 return jsonb_build_object('published_factual_records',published,'published_images',0);
end $$;
revoke all on function public.jwl_publish_factual_batch(jsonb,text) from public,anon,authenticated;
grant execute on function public.jwl_publish_factual_batch(jsonb,text) to service_role;
create or replace function public.jwl_publish_candidate(candidate text, revision text, product jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; approval jwl_internal.publication_approvals; source jwl_internal.sources; responsive jsonb;
begin
  select * into c from jwl_internal.candidates where candidate_id=candidate;
  select * into approval from jwl_internal.publication_approvals where candidate_id=candidate and revision_hash=revision;
  select * into source from jwl_internal.sources where id=c.source_id;
  if c.candidate_id is null or c.revision_hash<>revision then raise exception 'Candidate revision changed'; end if;
  if product ? 'collection_kind' then
   if jsonb_typeof(product->'collection_kind') is distinct from 'string' or product->>'collection_kind' not in ('collection','source_group') then raise exception 'Invalid collection kind';end if;
  end if;
  if coalesce(product->>'collection_kind','collection') is distinct from coalesce(c.content->>'collection_kind','collection') then raise exception 'Collection kind differs from current candidate';end if;
  if approval.candidate_id is null or not approval.image_verified or approval.revoked_at is not null then raise exception 'Image approval missing or revoked'; end if;
  if not source.enabled or not source.publication_allowed then raise exception 'Source publication not approved'; end if;
  if product->>'reference' is distinct from c.external_id or product->>'brand_name' is distinct from c.content->>'brand' or product->>'collection_en' is distinct from c.content->>'collection' or product->>'name_ar' is distinct from c.content->>'name_ar' or product->>'name_en' is distinct from c.content->>'name_en' then raise exception 'Product identity differs from current candidate';end if;
  if jsonb_typeof(product->'images') is distinct from 'array' or jsonb_array_length(product->'images')=0 then raise exception 'Missing publication images'; end if;
  if product->'images' is distinct from approval.approved_images then raise exception 'Images differ from approved media'; end if;
  responsive:=coalesce(product->'image_variants','[]'::jsonb);
  if responsive is distinct from approval.approved_image_variants then raise exception 'Image variants differ from approved media';end if;
  if not jwl_internal.valid_image_variants(product->'images',responsive) then raise exception 'Invalid responsive image metadata';end if;
  if exists(select 1 from jsonb_array_elements_text(product->'images') i where i !~ '^https://[^/@]+/' or i ~ '^https://[^/]*@') then raise exception 'Invalid image destination'; end if;
  if coalesce(trim(product->>'description_ar'),'')='' or coalesce(trim(product->>'description_en'),'')='' then raise exception 'Factual descriptions missing'; end if;
  if product->>'description_ar' is distinct from c.content->>'description_ar' or product->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Descriptions differ from current candidate'; end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,collection_kind,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,search_text)
    values(candidate,product->>'slug',product->>'reference',product->>'brand_slug',product->>'brand_name',product->>'brand_tier',product->>'category_slug',product->>'collection_slug',product->>'collection_ar',product->>'collection_en',coalesce(product->>'collection_kind','collection'),product->>'name_ar',product->>'name_en',product->>'description_ar',product->>'description_en',product->'images',responsive,'approved_media',product->>'search_text')
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,collection_kind=excluded.collection_kind,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images=excluded.images,image_variants=excluded.image_variants,media_state='approved_media',search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
revoke all on function public.jwl_publish_candidate(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_publish_candidate(text,text,jsonb) to service_role;

create or replace view public.jwl_collections with (security_invoker=true) as
 select distinct brand_slug,collection_slug,collection_ar,collection_en from public.jwl_catalog
 where active and collection_kind='collection';
revoke all on public.jwl_collections from public;
grant select on public.jwl_collections to anon,authenticated,service_role;

-- One public read snapshot replaces three network round trips on brand pages.
create or replace function public.jwl_brand_page(p_brand text, p_page integer default 1, p_page_size integer default 12)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with brand_rows as materialized (
    select id,slug,reference,brand_slug,category_slug,collection_slug,collection_ar,collection_en,collection_kind,
      name_ar,name_en,description_ar,description_en,images,image_variants,media_state,published_at
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
    select distinct collection_slug,collection_ar,collection_en from brand_rows where collection_kind='collection'
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


commit;
