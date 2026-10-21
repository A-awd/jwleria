begin;
alter table public.jwl_catalog add column media_state text not null default 'approved_media' check(media_state in ('approved_media','facts_only'));
alter table public.jwl_catalog drop constraint jwl_catalog_images_check;
alter table public.jwl_catalog add constraint jwl_catalog_images_check check(jsonb_typeof(images)='array' and ((media_state='approved_media' and jsonb_array_length(images)>0) or (media_state='facts_only' and jsonb_array_length(images)=0)));
create table jwl_internal.factual_publications (
 catalog_id text primary key references public.jwl_catalog(id),
 candidate_id text not null,
 revision_hash text not null,
 owner_instruction text not null check(length(trim(owner_instruction))>0),
 published_at timestamptz not null default now(),
 foreign key(candidate_id,revision_hash) references jwl_internal.candidate_revisions(candidate_id,revision_hash)
);
alter table jwl_internal.factual_publications enable row level security;
revoke all on jwl_internal.factual_publications from public,anon,authenticated;
grant all on jwl_internal.factual_publications to service_role;
-- This lane publishes only attributed product facts and our original factual summaries.
-- It neither copies image bytes nor exposes image references, source marketing prose,
-- supplier availability or a fictitious media license. The existing media lane remains gated.
create function public.jwl_publish_factual_batch(products jsonb, owner_instruction text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb;c jwl_internal.candidates;published integer:=0;
begin
 if jsonb_typeof(products)<>'array' or jsonb_array_length(products)>100 or coalesce(length(trim(owner_instruction)),0)=0 then raise exception 'Invalid factual publication batch';end if;
 for p in select value from jsonb_array_elements(products) loop
  select * into c from jwl_internal.candidates where candidate_id=p->>'candidate_id';
  if c.candidate_id is null or c.revision_hash<>p->>'revision_hash' then raise exception 'Candidate revision changed';end if;
  if jsonb_array_length(coalesce(c.content->'facts','[]'))=0 or c.content->>'translation_state'<>'provided' then raise exception 'Facts or prepared name missing';end if;
  if p->>'reference' is distinct from c.external_id or p->>'brand_name' is distinct from c.content->>'brand' or p->>'collection_en' is distinct from c.content->>'collection' or p->>'name_ar' is distinct from c.content->>'name_ar' or p->>'name_en' is distinct from c.content->>'name_en' or p->>'description_ar' is distinct from c.content->>'description_ar' or p->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Factual content mismatch';end if;
  if coalesce(jsonb_array_length(p->'images'),0)<>0 then raise exception 'Media excluded from factual publication';end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,media_state,search_text)
   values(c.candidate_id,p->>'slug',c.external_id,p->>'brand_slug',p->>'brand_name',p->>'brand_tier',p->>'category_slug',p->>'collection_slug',p->>'collection_ar',p->>'collection_en',p->>'name_ar',p->>'name_en',p->>'description_ar',p->>'description_en','[]','facts_only',p->>'search_text')
   on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images='[]',media_state='facts_only',search_text=excluded.search_text,active=true;
  insert into jwl_internal.factual_publications(catalog_id,candidate_id,revision_hash,owner_instruction) values(c.candidate_id,c.candidate_id,c.revision_hash,owner_instruction) on conflict(catalog_id) do update set revision_hash=excluded.revision_hash,owner_instruction=excluded.owner_instruction,published_at=now();
  published:=published+1;
 end loop;
 return jsonb_build_object('published_factual_records',published,'published_images',0);
end $$;
revoke all on function public.jwl_publish_factual_batch(jsonb,text) from public,anon,authenticated;
grant execute on function public.jwl_publish_factual_batch(jsonb,text) to service_role;
create or replace function public.jwl_publish_candidate(candidate text, revision text, product jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; approval jwl_internal.publication_approvals; source jwl_internal.sources;
begin
  select * into c from jwl_internal.candidates where candidate_id=candidate;
  select * into approval from jwl_internal.publication_approvals where candidate_id=candidate and revision_hash=revision;
  select * into source from jwl_internal.sources where id=c.source_id;
  if c.candidate_id is null or c.revision_hash<>revision then raise exception 'Candidate revision changed'; end if;
  if approval.candidate_id is null or not approval.image_verified or approval.revoked_at is not null then raise exception 'Image approval missing or revoked'; end if;
  if not source.enabled or not source.publication_allowed then raise exception 'Source publication not approved'; end if;
  if jsonb_typeof(product->'images') is distinct from 'array' or jsonb_array_length(product->'images')=0 then raise exception 'Missing publication images'; end if;
  if product->'images' is distinct from approval.approved_images then raise exception 'Images differ from approved media'; end if;
  if exists(select 1 from jsonb_array_elements_text(product->'images') i where i !~ '^https://[^/@]+/' or i ~ '^https://[^/]*@') then raise exception 'Invalid image destination'; end if;
  if coalesce(trim(product->>'description_ar'),'')='' or coalesce(trim(product->>'description_en'),'')='' then raise exception 'Factual descriptions missing'; end if;
  if product->>'description_ar' is distinct from c.content->>'description_ar' or product->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Descriptions differ from current candidate'; end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,search_text)
    values(candidate,product->>'slug',product->>'reference',product->>'brand_slug',product->>'brand_name',product->>'brand_tier',product->>'category_slug',product->>'collection_slug',product->>'collection_ar',product->>'collection_en',product->>'name_ar',product->>'name_en',product->>'description_ar',product->>'description_en',product->'images',product->>'search_text')
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images=excluded.images,media_state='approved_media',search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
commit;
