-- Dedicated minimal catalog schema. Apply to the confirmed Jwleria environment only.
-- No changes to legacy tables, Auth users, orders, customers or pricing.
begin;
create schema if not exists jwl_internal;
revoke all on schema jwl_internal from public, anon, authenticated;
grant usage on schema jwl_internal to service_role;

create table jwl_internal.sources (
  id text primary key,
  origin text not null check (origin ~ '^https://[^/]+$'),
  acquisition_method text not null check (acquisition_method in ('feed','api','permitted-page','owner-export')),
  permission_reference text,
  acquisition_allowed boolean not null default false,
  publication_allowed boolean not null default false,
  enabled boolean not null default false,
  min_interval_seconds integer not null default 60 check (min_interval_seconds >= 2),
  checked_at timestamptz,
  next_check_at timestamptz
);
create table jwl_internal.candidates (
  candidate_id text primary key check (candidate_id ~ '^[a-f0-9]{64}$'),
  source_id text not null references jwl_internal.sources(id),
  external_id text not null,
  revision_hash text not null check (revision_hash ~ '^[a-f0-9]{64}$'),
  content jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_id, external_id)
);
create table jwl_internal.candidate_revisions (
  candidate_id text not null references jwl_internal.candidates(candidate_id),
  revision_hash text not null,
  content jsonb not null,
  recorded_at timestamptz not null default now(),
  primary key (candidate_id, revision_hash)
);
create table jwl_internal.publication_approvals (
  candidate_id text not null references jwl_internal.candidates(candidate_id),
  revision_hash text not null,
  media_reference text not null,
  image_verified boolean not null default false,
  approved_images jsonb not null check (jsonb_typeof(approved_images)='array' and jsonb_array_length(approved_images)>0),
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (candidate_id, revision_hash),
  foreign key (candidate_id, revision_hash) references jwl_internal.candidate_revisions(candidate_id,revision_hash)
);

create table public.jwl_catalog (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  reference text not null,
  brand_slug text not null check (brand_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand_name text not null check (length(trim(brand_name)) > 0),
  brand_tier text not null check (brand_tier in ('luxury','accessible','contemporary')),
  category_slug text not null check (category_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  collection_slug text not null check (collection_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  collection_ar text not null check (length(trim(collection_ar)) > 0),
  collection_en text not null check (length(trim(collection_en)) > 0),
  name_ar text not null check (length(trim(name_ar)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  images jsonb not null check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) > 0),
  search_text text not null,
  published_at timestamptz not null default now(),
  active boolean not null default true
);
create index jwl_catalog_taxonomy on public.jwl_catalog (brand_slug,collection_slug,category_slug) where active;
create index jwl_catalog_recent on public.jwl_catalog (published_at desc,id) where active;
alter table public.jwl_catalog enable row level security;
create policy jwl_catalog_public_read on public.jwl_catalog for select to anon,authenticated using (active);
revoke all on public.jwl_catalog from anon,authenticated;
grant select on public.jwl_catalog to anon,authenticated;
grant all on public.jwl_catalog to service_role;

create view public.jwl_collections with (security_invoker=true) as
select distinct brand_slug,collection_slug,collection_ar,collection_en from public.jwl_catalog where active;
grant select on public.jwl_collections to anon,authenticated,service_role;
create view public.jwl_brands with (security_invoker=true) as
select distinct brand_slug,brand_name,brand_tier from public.jwl_catalog where active;
grant select on public.jwl_brands to anon,authenticated,service_role;

create table jwl_internal.published_revisions (
  catalog_id text primary key references public.jwl_catalog(id),
  candidate_id text not null,
  revision_hash text not null,
  foreign key (candidate_id,revision_hash) references jwl_internal.publication_approvals(candidate_id,revision_hash)
);
create table jwl_internal.intake_runs (
  run_id text primary key,
  source_id text not null references jwl_internal.sources(id),
  status text not null check (status in ('running','success','blocked','error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  received integer not null default 0,
  changed integer not null default 0,
  error_code text
);
alter table jwl_internal.sources enable row level security;
alter table jwl_internal.candidates enable row level security;
alter table jwl_internal.candidate_revisions enable row level security;
alter table jwl_internal.publication_approvals enable row level security;
alter table jwl_internal.published_revisions enable row level security;
alter table jwl_internal.intake_runs enable row level security;
grant all on all tables in schema jwl_internal to service_role;

create function public.jwl_ingest_batch(records jsonb)
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
    clean:=jsonb_build_object('brand',r->>'brand','collection',r->>'collection','product_name',r->>'product_name','image_urls',r->'image_urls','source_url',r->>'source_url');
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

create function public.jwl_publish_candidate(candidate text, revision text, product jsonb)
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
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,images,search_text)
    values(candidate,product->>'slug',product->>'reference',product->>'brand_slug',product->>'brand_name',product->>'brand_tier',product->>'category_slug',product->>'collection_slug',product->>'collection_ar',product->>'collection_en',product->>'name_ar',product->>'name_en',product->'images',product->>'search_text')
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,images=excluded.images,search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
revoke all on function public.jwl_publish_candidate(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_publish_candidate(text,text,jsonb) to service_role;

-- Permission changes immediately withdraw dependent public rows.
create function jwl_internal.withdraw_revoked() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name='publication_approvals' then
    if new.revoked_at is not null or not new.image_verified then
      update public.jwl_catalog set active=false where id in
        (select catalog_id from jwl_internal.published_revisions where candidate_id=new.candidate_id and revision_hash=new.revision_hash);
    end if;
  elsif tg_table_name='sources' then
    if not new.enabled or not new.publication_allowed then
      update public.jwl_catalog set active=false where id in
        (select p.catalog_id from jwl_internal.published_revisions p join jwl_internal.candidates c using(candidate_id) where c.source_id=new.id);
    end if;
  elsif tg_table_name='candidates' then
    if new.revision_hash<>old.revision_hash then
      update public.jwl_catalog set active=false where id=new.candidate_id;
    end if;
  end if;
  return new;
end $$;
revoke all on function jwl_internal.withdraw_revoked() from public,anon,authenticated;
create trigger jwl_approval_withdrawal after update on jwl_internal.publication_approvals for each row execute function jwl_internal.withdraw_revoked();
create trigger jwl_source_withdrawal after update on jwl_internal.sources for each row execute function jwl_internal.withdraw_revoked();
create trigger jwl_revision_withdrawal after update on jwl_internal.candidates for each row execute function jwl_internal.withdraw_revoked();
commit;
