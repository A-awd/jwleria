-- Exact media evidence and missing-only intake. Creates no grant, asset, approval
-- or publication; it only narrows what a future approval may cite.
begin;

-- A permission record, not the permission document itself (that stays private outside Git).
-- Written permission can never cover a source whose acquisition is restricted or blocked.
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
  -- Recorded for evidence; an expiring grant cannot be used until a scheduled sweep exists.
  expires_at timestamptz,
  revoked_at timestamptz,
  check (kind<>'written_permission' or (source_id is not null and jsonb_array_length(media_origins)>0)),
  check (kind<>'written_permission' or source_id not in ('cartier-official','van-cleef-and-arpels-official','celine-official','rimowa-official')),
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
  foreign key (candidate_id,revision_hash) references jwl_internal.candidate_revisions(candidate_id,revision_hash),
  -- Public files are content-addressed, so a URL can never silently change meaning.
  check (position(public_sha256 in public_url)>0)
);
alter table jwl_internal.media_grants enable row level security;
alter table jwl_internal.media_assets enable row level security;
revoke all on jwl_internal.media_grants,jwl_internal.media_assets from public,anon,authenticated,service_role;
-- Evidence is append-only; a grant can only be revoked, once, never rewritten or restored.
grant select,insert on jwl_internal.media_assets to service_role;
grant select,insert on jwl_internal.media_grants to service_role;
grant update(revoked_at) on jwl_internal.media_grants to service_role;

create function jwl_internal.media_grant_revocation_is_final() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then raise exception 'A revoked media grant cannot be restored or changed';end if;
  return new;
end $$;
revoke all on function jwl_internal.media_grant_revocation_is_final() from public,anon,authenticated;
create trigger jwl_media_grant_final before update on jwl_internal.media_grants
  for each row execute function jwl_internal.media_grant_revocation_is_final();

-- Every cited file must trace to an original permitted by this exact grant kind.
create function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets;
begin
  if not new.image_verified or new.revoked_at is not null then return new; end if;
  select * into c from jwl_internal.candidates where candidate_id=new.candidate_id;
  if c.candidate_id is null or c.revision_hash<>new.revision_hash then raise exception 'Approval must bind the current candidate revision';end if;
  select * into g from jwl_internal.media_grants where grant_reference=new.media_reference;
  if g.grant_reference is null or g.revoked_at is not null then raise exception 'Media grant missing or revoked';end if;
  if g.expires_at is not null then raise exception 'An expiring media grant needs a scheduled expiry sweep before use';end if;
  if (g.candidate_id is not null and g.candidate_id<>c.candidate_id) or (g.source_id is not null and g.source_id<>c.source_id) then raise exception 'Media grant covers another product or source';end if;
  if jsonb_typeof(new.approved_image_variants) is distinct from 'array' or jsonb_array_length(new.approved_image_variants)=0 then raise exception 'Responsive variants required for new media approval';end if;
  for entry in select value from jsonb_array_elements(new.approved_image_variants) loop
    for variant in select value from jsonb_array_elements(entry->'variants') loop
      select * into a from jwl_internal.media_assets m
        where m.candidate_id=new.candidate_id and m.revision_hash=new.revision_hash and m.public_url=variant->>'src';
      if a.public_url is null or a.grant_reference<>new.media_reference or a.verified_reference<>c.external_id then raise exception 'Approved image lacks exact private evidence';end if;
      if a.width<>(variant->>'width')::integer or a.height<>(variant->>'height')::integer then raise exception 'Approved image dimensions differ from evidence';end if;
      if g.kind='owner_original' then
        if a.original_source<>'owner-original:'||a.original_sha256 then raise exception 'Owner grant requires an owner original';end if;
      else
        -- An official gallery URL is only usable under written permission for its exact origin.
        if not coalesce(c.content->'image_urls','[]'::jsonb) ? a.original_source then raise exception 'Original is not in the exact candidate gallery';end if;
        if not g.media_origins ? (split_part(a.original_source,'/',1)||'//'||split_part(a.original_source,'/',3)) then raise exception 'Original origin is not granted';end if;
      end if;
    end loop;
  end loop;
  return new;
end $$;
revoke all on function jwl_internal.require_media_evidence() from public,anon,authenticated;
create trigger jwl_media_evidence before insert or update on jwl_internal.publication_approvals
  for each row execute function jwl_internal.require_media_evidence();

-- Revoking a grant revokes its approvals, which withdraws the public rows.
create function jwl_internal.revoke_media_grant_approvals() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.revoked_at is not null then
    update jwl_internal.publication_approvals set revoked_at=coalesce(revoked_at,now())
      where media_reference=new.grant_reference and revoked_at is null;
  end if;
  return new;
end $$;
revoke all on function jwl_internal.revoke_media_grant_approvals() from public,anon,authenticated;
create trigger jwl_media_grant_revocation after update on jwl_internal.media_grants
  for each row execute function jwl_internal.revoke_media_grant_approvals();

-- Publication re-checks the grant itself, independently of the approval row.
create function jwl_internal.require_live_media_grant() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from jwl_internal.publication_approvals p join jwl_internal.media_grants g on g.grant_reference=p.media_reference
    where p.candidate_id=new.candidate_id and p.revision_hash=new.revision_hash and p.image_verified and p.revoked_at is null and g.revoked_at is null and g.expires_at is null) then
    raise exception 'Media publication needs a live approval and grant';
  end if;
  return new;
end $$;
revoke all on function jwl_internal.require_live_media_grant() from public,anon,authenticated;
create trigger jwl_media_publication_grant before insert or update on jwl_internal.published_revisions
  for each row execute function jwl_internal.require_live_media_grant();

-- Public files of revoked grants, for the storage cleanup that must follow a revocation.
create function public.jwl_revoked_media_files() returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(distinct a.public_url),'[]'::jsonb) from jwl_internal.media_assets a
  join jwl_internal.media_grants g on g.grant_reference=a.grant_reference where g.revoked_at is not null;
$$;
revoke all on function public.jwl_revoked_media_files() from public,anon,authenticated;
grant execute on function public.jwl_revoked_media_files() to service_role;

-- The authoritative acquisition registry for queue runners; no permission text leaves the database.
create function public.jwl_source_registry() returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_object_agg(id,jsonb_build_object('origin',origin,'enabled',enabled,'acquisition_allowed',acquisition_allowed and permission_reference is not null,'min_interval_seconds',min_interval_seconds)),'{}'::jsonb)
  from jwl_internal.sources;
$$;
revoke all on function public.jwl_source_registry() from public,anon,authenticated;
grant execute on function public.jwl_source_registry() to service_role;

-- Records the exact evidence rows and the verified approval in one transaction. Replays are
-- idempotent only when every stored value is identical; the evidence trigger re-checks each file.
create function public.jwl_record_media_approval(evidence jsonb, approval jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare mismatched integer;
begin
  if jsonb_typeof(evidence) is distinct from 'array' or jsonb_array_length(evidence) not between 1 and 160 or jsonb_typeof(approval) is distinct from 'object' then raise exception 'Invalid media approval';end if;
  if approval->'image_verified' is distinct from 'true'::jsonb then raise exception 'Only a verified media approval can be recorded';end if;
  if exists(select 1 from jsonb_array_elements(evidence) e where e->>'candidate_id' is distinct from approval->>'candidate_id' or e->>'revision_hash' is distinct from approval->>'revision_hash' or e->>'grant_reference' is distinct from approval->>'media_reference') then
    raise exception 'Evidence must bind the approved candidate revision and grant';
  end if;
  insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference)
    select e->>'candidate_id',e->>'revision_hash',e->>'public_url',e->>'public_sha256',(e->>'width')::integer,(e->>'height')::integer,e->>'original_source',e->>'original_sha256',e->>'grant_reference',e->>'verified_reference',e->>'verification_reference'
    from jsonb_array_elements(evidence) e
    on conflict do nothing;
  select count(*) into mismatched from jsonb_array_elements(evidence) e where not exists(
    select 1 from jwl_internal.media_assets m where m.candidate_id=e->>'candidate_id' and m.revision_hash=e->>'revision_hash' and m.public_url=e->>'public_url'
      and m.public_sha256=e->>'public_sha256' and m.width=(e->>'width')::integer and m.height=(e->>'height')::integer and m.original_source=e->>'original_source'
      and m.original_sha256=e->>'original_sha256' and m.grant_reference=e->>'grant_reference' and m.verified_reference=e->>'verified_reference'
      and m.verification_reference=e->>'verification_reference');
  if mismatched>0 then raise exception 'Stored media evidence differs from this approval';end if;
  insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants)
    values(approval->>'candidate_id',approval->>'revision_hash',approval->>'media_reference',true,approval->'approved_images',approval->'approved_image_variants')
    on conflict do nothing;
  if not exists(select 1 from jwl_internal.publication_approvals p where p.candidate_id=approval->>'candidate_id' and p.revision_hash=approval->>'revision_hash'
    and p.media_reference=approval->>'media_reference' and p.image_verified and p.revoked_at is null and p.approved_images=approval->'approved_images' and p.approved_image_variants=approval->'approved_image_variants') then
    raise exception 'A different or revoked approval already exists for this revision';
  end if;
  return jsonb_build_object('candidate_id',approval->>'candidate_id','revision_hash',approval->>'revision_hash','evidence_rows',jsonb_array_length(evidence),'published',0);
end $$;
revoke all on function public.jwl_record_media_approval(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_record_media_approval(jsonb,jsonb) to service_role;

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
