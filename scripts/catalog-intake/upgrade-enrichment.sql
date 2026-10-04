-- Preserve enriched factual candidates privately and publish original summaries only.
-- Upgrade an existing Jwleria foundation; no source/media grants or rows are published.
begin;
alter table public.jwl_catalog add column if not exists description_ar text not null default '';
alter table public.jwl_catalog add column if not exists description_en text not null default '';
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
    clean:=jsonb_build_object('brand',r->>'brand','collection',r->>'collection','product_name',r->>'product_name','image_urls',r->'image_urls','source_url',r->>'source_url',
      'source_description',r->'source_description','facts',coalesce(r->'facts','[]'::jsonb),
      'name_ar',r->>'name_ar','name_en',r->>'name_en','description_ar',r->>'description_ar','description_en',r->>'description_en',
      'translation_state',r->>'translation_state','provenance',r->'provenance','extraction',r->'extraction','image_reference_checks',r->'image_reference_checks');
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
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images=excluded.images,search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
revoke all on function public.jwl_publish_candidate(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_publish_candidate(text,text,jsonb) to service_role;

commit;
