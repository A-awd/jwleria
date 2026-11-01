-- PROPOSED, not applied: background-only cutouts (decision 0015). Additive. Every existing grant, evidence row,
-- approval and public image stays valid and unchanged; nothing here creates a grant, an image or an approval.
-- 1. A written permission states whether it also covers background removal (default false, so no existing or future
--    grant is widened silently). Owner originals are covered by decision 0015 and open licences by their licence, so
--    the flag is refused on those kinds.
-- 2. The evidence row of a cutout derivative names its treatment, the checked cutout master's sha256 and the private
--    record of its automated check and independent visual comparison. original_sha256 still names the untouched original.
-- 3. The pipeline records cutout evidence only through public.jwl_record_cutout_approval, which exists only after this
--    migration, so a cutout bundle sent earlier fails closed instead of being stored without its treatment. That
--    function also requires every cutout row to be cited by its approval, so each one passes the trigger's checks. The
--    regular jwl_record_media_approval refuses treatment fields. A direct service-role insert remains possible, as for
--    all evidence; the check constraint and the evidence trigger apply to it in the same way.
-- 4. The evidence trigger keeps every rule of 20261028111829 and adds: one image is a cutout of one master and one
--    original, or no cutout at all; a written permission must cover the removal; an open licence must be CC0 or CC BY
--    (CC BY-SA needs a ShareAlike licence review first); an open-licence credit says "background removed" exactly when
--    the image is a cutout.
-- Rollback: jwleria_cutout_media.rollback.sql (refuses while any cutout grant, evidence or credit exists).
begin;

alter table jwl_internal.media_grants
  add column background_removal boolean not null default false,
  add constraint jwl_media_grant_background_removal_check check (not background_removal or kind='written_permission');

-- CHECK passes on NULL, so the treated branch is wrapped in coalesce(...,false): a partial treatment record is refused.
alter table jwl_internal.media_assets
  add column treatment text,
  add column treatment_version integer,
  add column cutout_master_sha256 text,
  add column treatment_reference text,
  add constraint jwl_media_asset_treatment_check check (case when treatment is null
    then num_nulls(treatment_version,cutout_master_sha256,treatment_reference)=3
    else coalesce(treatment='background_removal' and treatment_version=1 and cutout_master_sha256 ~ '^[a-f0-9]{64}$'
      and cutout_master_sha256<>original_sha256 and cutout_master_sha256<>public_sha256
      and jwl_internal.visible_credit_text(treatment_reference) and length(treatment_reference)<=8000,false) end);

-- Same as 20261026114541, except that it refuses cutout evidence, which only jwl_record_cutout_approval records, and
-- that a stored row matches only when it carries no treatment.
create or replace function public.jwl_record_media_approval(evidence jsonb, approval jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare mismatched integer;
begin
  if jsonb_typeof(evidence) is distinct from 'array' or jsonb_array_length(evidence) not between 1 and 160 or jsonb_typeof(approval) is distinct from 'object' then raise exception 'Invalid media approval';end if;
  if approval->'image_verified' is distinct from 'true'::jsonb then raise exception 'Only a verified media approval can be recorded';end if;
  if exists(select 1 from jsonb_array_elements(evidence) e where jsonb_typeof(e) is distinct from 'object') then raise exception 'Invalid media approval';end if;
  if exists(select 1 from jsonb_array_elements(evidence) e where e ?| array['treatment','treatment_version','cutout_master_sha256','treatment_reference']) then
    raise exception 'Cutout evidence is recorded only through jwl_record_cutout_approval';
  end if;
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
      and m.verification_reference=e->>'verification_reference' and m.treatment is null);
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

-- The same atomic record for an approval with at least one cutout image: every evidence row is stored with its
-- treatment fields (null for an image that is not a cutout), and the evidence trigger decides whether the approval
-- may cite them.
create function public.jwl_record_cutout_approval(evidence jsonb, approval jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare mismatched integer;
begin
  if jsonb_typeof(evidence) is distinct from 'array' or jsonb_array_length(evidence) not between 1 and 160 or jsonb_typeof(approval) is distinct from 'object' then raise exception 'Invalid media approval';end if;
  if approval->'image_verified' is distinct from 'true'::jsonb then raise exception 'Only a verified media approval can be recorded';end if;
  if exists(select 1 from jsonb_array_elements(evidence) e where jsonb_typeof(e) is distinct from 'object') then raise exception 'Invalid media approval';end if;
  if not exists(select 1 from jsonb_array_elements(evidence) e where e->>'treatment' is not null) then raise exception 'A cutout approval needs cutout evidence; use jwl_record_media_approval';end if;
  -- Every cutout row must be an image of this approval, so the evidence trigger checks its grant basis and credit; an
  -- uncited row would sit unchecked in append-only evidence.
  if exists(select 1 from jsonb_array_elements(evidence) e where e->>'treatment' is not null and not exists(
    select 1 from jsonb_array_elements(approval->'approved_image_variants') x cross join jsonb_array_elements(x->'variants') v where v->>'src'=e->>'public_url')) then
    raise exception 'Cutout evidence must be cited by its approval';
  end if;
  if exists(select 1 from jsonb_array_elements(evidence) e where e->>'candidate_id' is distinct from approval->>'candidate_id' or e->>'revision_hash' is distinct from approval->>'revision_hash' or e->>'grant_reference' is distinct from approval->>'media_reference') then
    raise exception 'Evidence must bind the approved candidate revision and grant';
  end if;
  insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference,
      treatment,treatment_version,cutout_master_sha256,treatment_reference)
    select e->>'candidate_id',e->>'revision_hash',e->>'public_url',e->>'public_sha256',(e->>'width')::integer,(e->>'height')::integer,e->>'original_source',e->>'original_sha256',e->>'grant_reference',e->>'verified_reference',e->>'verification_reference',
      e->>'treatment',(e->>'treatment_version')::integer,e->>'cutout_master_sha256',e->>'treatment_reference'
    from jsonb_array_elements(evidence) e
    on conflict do nothing;
  select count(*) into mismatched from jsonb_array_elements(evidence) e where not exists(
    select 1 from jwl_internal.media_assets m where m.candidate_id=e->>'candidate_id' and m.revision_hash=e->>'revision_hash' and m.public_url=e->>'public_url'
      and m.public_sha256=e->>'public_sha256' and m.width=(e->>'width')::integer and m.height=(e->>'height')::integer and m.original_source=e->>'original_source'
      and m.original_sha256=e->>'original_sha256' and m.grant_reference=e->>'grant_reference' and m.verified_reference=e->>'verified_reference'
      and m.verification_reference=e->>'verification_reference' and m.treatment is not distinct from e->>'treatment'
      and m.treatment_version is not distinct from (e->>'treatment_version')::integer and m.cutout_master_sha256 is not distinct from e->>'cutout_master_sha256'
      and m.treatment_reference is not distinct from e->>'treatment_reference');
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
revoke all on function public.jwl_record_cutout_approval(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_record_cutout_approval(jsonb,jsonb) to service_role;

-- Same rules as 20261028111829, plus the cutout rules in the header. The accepted credit texts are listed in one place.
create or replace function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets; f jsonb;
  treated boolean; plain boolean; masters text[]; originals text[];
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
        or coalesce(entry->'attribution'->>'changes' not in ('resized and converted to WebP','converted to WebP','background removed, resized and converted to WebP','background removed and converted to WebP'),true)
        -- A rendition is already a resize of the licensed original, so its credit always says so.
        or (f->>'file_kind'='rendition' and entry->'attribution'->>'changes' not in ('resized and converted to WebP','background removed, resized and converted to WebP')) then
        raise exception 'Open-licence image needs its exact visible attribution';
      end if;
    elsif entry ? 'attribution' then raise exception 'Attribution is recorded only for open-licence images';
    end if;
    treated:=false;plain:=false;masters:='{}';originals:='{}';
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
      if a.treatment is null then plain:=true;else treated:=true;masters:=array_append(masters,a.cutout_master_sha256);end if;
      originals:=array_append(originals,a.original_sha256);
    end loop;
    -- One image is either a cutout of one checked master of one original, or not a cutout at all.
    if treated and plain then raise exception 'One image mixes cutout and other evidence';end if;
    if treated and ((select count(distinct m) from unnest(masters) m)<>1 or (select count(distinct o) from unnest(originals) o)<>1) then
      raise exception 'A cutout image cites one cutout master of one original';
    end if;
    if treated and g.kind not in ('owner_original','written_permission','open_license') then raise exception 'This grant kind has no basis for background removal';end if;
    if treated and g.kind='written_permission' and not g.background_removal then raise exception 'The written permission does not cover background removal';end if;
    if treated and g.kind='open_license' and g.license_code not in ('CC0-1.0','CC-BY-4.0','CC-BY-3.0','CC-BY-2.0') then
      raise exception 'Background removal under this licence needs a licence review first';
    end if;
    -- An open-licence credit states the removal exactly when the image is a cutout.
    if g.kind='open_license' and (entry->'attribution'->>'changes' like 'background removed%') is distinct from treated then
      raise exception 'Open-licence image needs its exact visible attribution';
    end if;
  end loop;
  return new;
end $$;

commit;
