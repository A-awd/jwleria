-- Exact media evidence and missing-only intake. Creates no grant, asset, approval
-- or publication; it only narrows what a future approval may cite.
begin;

-- A permission record, not the permission document itself (that stays private outside Git).
create table jwl_internal.media_grants (
  grant_reference text primary key check (grant_reference ~ '^[a-z0-9][a-z0-9._-]{2,80}$'),
  kind text not null check (kind in ('owner_original','written_permission')),
  source_id text references jwl_internal.sources(id),
  candidate_id text references jwl_internal.candidates(candidate_id),
  media_origins jsonb not null default '[]'::jsonb check (jsonb_typeof(media_origins)='array'),
  website_publication boolean not null check (website_publication),
  resize boolean not null check (resize),
  webp_encode boolean not null check (webp_encode),
  evidence_reference text not null check (length(trim(evidence_reference))>0),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  check (kind<>'written_permission' or (source_id is not null and jsonb_array_length(media_origins)>0)),
  check (kind<>'owner_original' or candidate_id is not null)
);
-- One row per public file: its private original, checksums, grant and exact-reference check.
create table jwl_internal.media_assets (
  candidate_id text not null,
  revision_hash text not null,
  public_url text not null check (jwl_internal.valid_public_media_url(public_url)),
  public_sha256 text not null check (public_sha256 ~ '^[a-f0-9]{64}$'),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 8192),
  original_source text not null check (original_source ~ '^(https://[^/@]+/|owner-original:[a-f0-9]{64}$)'),
  original_sha256 text not null check (original_sha256 ~ '^[a-f0-9]{64}$'),
  grant_reference text not null references jwl_internal.media_grants(grant_reference),
  verified_reference text not null check (length(trim(verified_reference))>0),
  verification_reference text not null check (length(trim(verification_reference))>0),
  recorded_at timestamptz not null default now(),
  primary key (candidate_id,revision_hash,public_url),
  foreign key (candidate_id,revision_hash) references jwl_internal.candidate_revisions(candidate_id,revision_hash)
);
alter table jwl_internal.media_grants enable row level security;
alter table jwl_internal.media_assets enable row level security;
revoke all on jwl_internal.media_grants,jwl_internal.media_assets from public,anon,authenticated,service_role;
-- Evidence is append-only; a grant can only be revoked or given an expiry, never rewritten.
grant select,insert on jwl_internal.media_assets to service_role;
grant select,insert on jwl_internal.media_grants to service_role;
grant update(revoked_at,expires_at) on jwl_internal.media_grants to service_role;

create function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets;
begin
  if not new.image_verified or new.revoked_at is not null then return new; end if;
  select * into c from jwl_internal.candidates where candidate_id=new.candidate_id;
  if c.candidate_id is null or c.revision_hash<>new.revision_hash then raise exception 'Approval must bind the current candidate revision';end if;
  select * into g from jwl_internal.media_grants where grant_reference=new.media_reference;
  if g.grant_reference is null or g.revoked_at is not null or (g.expires_at is not null and g.expires_at<=now()) then raise exception 'Media grant missing, revoked or expired';end if;
  if (g.candidate_id is not null and g.candidate_id<>c.candidate_id) or (g.source_id is not null and g.source_id<>c.source_id) then raise exception 'Media grant covers another product or source';end if;
  if jsonb_typeof(new.approved_image_variants) is distinct from 'array' or jsonb_array_length(new.approved_image_variants)=0 then raise exception 'Responsive variants required for new media approval';end if;
  for entry in select value from jsonb_array_elements(new.approved_image_variants) loop
    for variant in select value from jsonb_array_elements(entry->'variants') loop
      select * into a from jwl_internal.media_assets m
        where m.candidate_id=new.candidate_id and m.revision_hash=new.revision_hash and m.public_url=variant->>'src';
      if a.public_url is null or a.grant_reference<>new.media_reference or a.verified_reference<>c.external_id then raise exception 'Approved image lacks exact private evidence';end if;
      if a.width<>(variant->>'width')::integer or a.height<>(variant->>'height')::integer then raise exception 'Approved image dimensions differ from evidence';end if;
    end loop;
  end loop;
  return new;
end $$;
revoke all on function jwl_internal.require_media_evidence() from public,anon,authenticated;
create trigger jwl_media_evidence before insert or update on jwl_internal.publication_approvals
  for each row execute function jwl_internal.require_media_evidence();

-- Revoking or expiring a grant revokes its approvals, which withdraws the public rows.
create function jwl_internal.revoke_media_grant_approvals() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.revoked_at is not null or (new.expires_at is not null and new.expires_at<=now()) then
    update jwl_internal.publication_approvals set revoked_at=coalesce(revoked_at,now())
      where media_reference=new.grant_reference and revoked_at is null;
  end if;
  return new;
end $$;
revoke all on function jwl_internal.revoke_media_grant_approvals() from public,anon,authenticated;
create trigger jwl_media_grant_revocation after update on jwl_internal.media_grants
  for each row execute function jwl_internal.revoke_media_grant_approvals();

create function public.jwl_expire_media_grants() returns integer
language plpgsql security invoker set search_path='' as $$
declare expired integer;
begin
  update jwl_internal.media_grants set revoked_at=now() where revoked_at is null and expires_at<=now();
  get diagnostics expired=row_count;
  return expired;
end $$;
revoke all on function public.jwl_expire_media_grants() from public,anon,authenticated;
grant execute on function public.jwl_expire_media_grants() to service_role;

-- Same validation and private content as jwl_ingest_batch, but an existing candidate is never
-- overwritten: guarded repairs and current publications depend on its exact revision.
create function public.jwl_ingest_missing_batch(records jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; clean jsonb; s jwl_internal.sources; inserted_id text; inserted text[]:='{}'; skipped text[]:='{}';
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
    inserted_id:=null;
    insert into jwl_internal.candidates(candidate_id,source_id,external_id,revision_hash,content)
      values(r->>'candidate_id',s.id,r->>'external_id',r->>'revision_hash',clean)
      on conflict do nothing returning candidate_id into inserted_id;
    if inserted_id is null then skipped:=skipped||(r->>'candidate_id'); continue; end if;
    insert into jwl_internal.candidate_revisions(candidate_id,revision_hash,content)
      values(inserted_id,r->>'revision_hash',clean) on conflict do nothing;
    inserted:=inserted||inserted_id;
  end loop;
  return jsonb_build_object('received',jsonb_array_length(records),'inserted_ids',to_jsonb(inserted),'skipped_existing_ids',to_jsonb(skipped),'published',0);
end $$;
revoke all on function public.jwl_ingest_missing_batch(jsonb) from public,anon,authenticated;
grant execute on function public.jwl_ingest_missing_batch(jsonb) to service_role;

commit;
