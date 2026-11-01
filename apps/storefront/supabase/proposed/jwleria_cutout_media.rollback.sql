-- Rollback of the PROPOSED jwleria_cutout_media.sql. It restores the exact definitions of 20261026114541
-- (jwl_record_media_approval) and 20261028111829 (require_media_evidence), drops jwl_record_cutout_approval and drops
-- only the columns and constraints that file added. It refuses while any cutout grant, evidence row or credit exists:
-- append-only evidence is never dropped by a rollback, so revoke the grant or approval (which withdraws the product),
-- remove its public files and decide on that evidence in a reviewed change first.
begin;
-- Nothing may record a cutout between the check below and the column drops.
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, public.jwl_catalog in access exclusive mode;
do $$ begin
  if exists(select 1 from jwl_internal.media_grants where background_removal)
    or exists(select 1 from jwl_internal.media_assets where treatment is not null)
    or exists(select 1 from jwl_internal.publication_approvals p,jsonb_array_elements(p.approved_image_variants) e where e->'attribution'->>'changes' like 'background removed%')
    or exists(select 1 from public.jwl_catalog c,jsonb_array_elements(c.image_variants) e where e->'attribution'->>'changes' like 'background removed%') then
    raise exception 'Cutout grants, evidence or credits exist; rollback refused';
  end if;
end $$;

create or replace function public.jwl_record_media_approval(evidence jsonb, approval jsonb)
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

create or replace function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets; f jsonb;
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
    f:=null;
    if g.kind='open_license' then
      f:=(select l.value from jsonb_array_elements(g.licensed_files) l where l.value->>'source_page_url'=entry->'attribution'->>'source_url');
      if f is null or entry->'attribution' is distinct from (jsonb_build_object('creator',g.creator,'license',jwl_internal.open_licenses()->g.license_code->>'label','license_url',g.license_url,'source_url',f->>'source_page_url','changes',entry->'attribution'->'changes')
          ||case when jsonb_typeof(f->'title')='string' then jsonb_build_object('title',f->'title') else '{}'::jsonb end)
        or coalesce(entry->'attribution'->>'changes' not in ('resized and converted to WebP','converted to WebP'),true)
        -- A rendition is already a resize of the licensed original, so its credit always says so.
        or (f->>'file_kind'='rendition' and entry->'attribution'->>'changes'<>'resized and converted to WebP') then
        raise exception 'Open-licence image needs its exact visible attribution';
      end if;
    elsif entry ? 'attribution' then raise exception 'Attribution is recorded only for open-licence images';
    end if;
    for variant in select value from jsonb_array_elements(entry->'variants') loop
      select * into a from jwl_internal.media_assets m
        where m.candidate_id=new.candidate_id and m.revision_hash=new.revision_hash and m.public_url=variant->>'src';
      if a.public_url is null or a.grant_reference<>new.media_reference or a.verified_reference<>c.external_id then raise exception 'Approved image lacks exact private evidence';end if;
      if a.width<>(variant->>'width')::integer or a.height<>(variant->>'height')::integer then raise exception 'Approved image dimensions differ from evidence';end if;
      if g.kind='owner_original' then
        if a.original_source<>'owner-original:'||a.original_sha256 then raise exception 'Owner grant requires an owner original';end if;
      elsif g.kind='open_license' then
        if a.original_source is distinct from f->>'file_url' then raise exception 'Open-licence evidence must cite the granted file its credit names';end if;
        if f->>'file_kind'='rendition' and (variant->>'width')::integer>(f->>'rendition_width')::integer then
          raise exception 'An open-licence derivative cannot be wider than its source rendition';
        end if;
      else
        -- An official gallery URL is only usable under written permission for its exact origin.
        if not coalesce(c.content->'image_urls','[]'::jsonb) ? a.original_source then raise exception 'Original is not in the exact candidate gallery';end if;
        if not g.media_origins ? (split_part(a.original_source,'/',1)||'//'||split_part(a.original_source,'/',3)) then raise exception 'Original origin is not granted';end if;
      end if;
    end loop;
  end loop;
  return new;
end $$;

drop function public.jwl_record_cutout_approval(jsonb,jsonb);
alter table jwl_internal.media_assets drop constraint jwl_media_asset_treatment_check,
  drop column treatment, drop column treatment_version, drop column cutout_master_sha256, drop column treatment_reference;
alter table jwl_internal.media_grants drop constraint jwl_media_grant_background_removal_check, drop column background_removal;

commit;
