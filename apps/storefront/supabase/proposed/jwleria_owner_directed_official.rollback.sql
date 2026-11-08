-- Rollback of jwleria_owner_directed_official.sql. It refuses while any approval cites an owner_directed_official grant:
-- revoke those grants first (the revocation cascade withdraws their products), then delete their public files.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, jwl_internal.sources in access exclusive mode;
do $$ begin
  if exists(select 1 from jwl_internal.publication_approvals p join jwl_internal.media_grants g on g.grant_reference=p.media_reference where g.kind='owner_directed_official')
    or exists(select 1 from jwl_internal.media_assets a join jwl_internal.media_grants g on g.grant_reference=a.grant_reference where g.kind='owner_directed_official') then
    raise exception 'Owner-directed official media is in use; revoke and clean it up first';
  end if;
end $$;
update jwl_internal.sources set publication_allowed=false,permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots checked 2026-10-04 allows these product paths. This is not a brand media license.' where id='longchamp-official';
delete from jwl_internal.media_grants where kind='owner_directed_official';
alter table jwl_internal.media_grants drop constraint jwl_media_grant_background_removal_check;
alter table jwl_internal.media_grants add constraint jwl_media_grant_background_removal_check check (not background_removal or kind='written_permission');
alter table jwl_internal.media_grants drop constraint jwl_owner_directed_official_check;
alter table jwl_internal.media_grants drop constraint media_grants_kind_check;
alter table jwl_internal.media_grants add constraint media_grants_kind_check check (kind in ('owner_original','written_permission','open_license'));

-- Restores the definition applied by 20261108072948, verbatim.
create or replace function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets; f jsonb;
  treated boolean; plain boolean; masters text[]; originals text[]; kinds text[]; squares text[]; clipped boolean[]; square boolean; tile boolean;
begin
  if not new.image_verified or new.revoked_at is not null then return new; end if;
  select * into c from jwl_internal.candidates where candidate_id=new.candidate_id;
  if c.candidate_id is null or c.revision_hash<>new.revision_hash then raise exception 'Approval must bind the current candidate revision';end if;
  select * into g from jwl_internal.media_grants where grant_reference=new.media_reference;
  if g.grant_reference is null or g.revoked_at is not null then raise exception 'Media grant missing or revoked';end if;
  -- Gap G4: an expiring grant is usable only while its expiry sweep is scheduled and its expiry lies beyond the lead.
  if g.expires_at is not null and not jwl_internal.media_grant_is_usable(g.grant_reference) then raise exception 'An expiring media grant needs a scheduled expiry sweep before use';end if;
  if (g.candidate_id is not null and g.candidate_id<>c.candidate_id) or (g.source_id is not null and g.source_id<>c.source_id) then raise exception 'Media grant covers another product or source';end if;
  if jsonb_typeof(new.approved_image_variants) is distinct from 'array' or jsonb_array_length(new.approved_image_variants)=0 then raise exception 'Responsive variants required for new media approval';end if;
  for entry in select value from jsonb_array_elements(new.approved_image_variants) loop
    f:=null;
    if g.kind='open_license' then
      f:=(select l.value from jsonb_array_elements(g.licensed_files) l where l.value->>'source_page_url'=entry->'attribution'->>'source_url');
      if f is null or entry->'attribution' is distinct from (jsonb_build_object('creator',g.creator,'license',jwl_internal.open_licenses()->g.license_code->>'label','license_url',g.license_url,'source_url',f->>'source_page_url','changes',entry->'attribution'->'changes')
          ||case when jsonb_typeof(f->'title')='string' then jsonb_build_object('title',f->'title') else '{}'::jsonb end)
        or coalesce(entry->'attribution'->>'changes' not in ('resized and converted to WebP','converted to WebP','background removed, resized and converted to WebP','background removed and converted to WebP',
          'background removed, placed on a square white background, resized and converted to WebP','background removed, placed on a square white background and converted to WebP'),true)
        -- A rendition is already a resize of the licensed original, so its credit always says so.
        or (f->>'file_kind'='rendition' and entry->'attribution'->>'changes' not in ('resized and converted to WebP','background removed, resized and converted to WebP','background removed, placed on a square white background, resized and converted to WebP')) then
        raise exception 'Open-licence image needs its exact visible attribution';
      end if;
    elsif entry ? 'attribution' then raise exception 'Attribution is recorded only for open-licence images';
    end if;
    -- Gap G3: a written permission that requires a credit carries it, verbatim, on every image; no other image carries one.
    if entry ? 'permission_credit' then
      if g.kind<>'written_permission' or g.required_credit is null
        or entry->'permission_credit' is distinct from jsonb_strip_nulls(jsonb_build_object('text',g.required_credit,'url',g.required_credit_url)) then
        raise exception 'A permission credit must be exactly the credit its written permission requires';
      end if;
    elsif g.kind='written_permission' and g.required_credit is not null then raise exception 'This written permission requires its credit on every image';
    end if;
    treated:=false;plain:=false;masters:='{}';originals:='{}';kinds:='{}';squares:='{}';clipped:='{}';
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
      if a.treatment is null then plain:=true;else treated:=true;masters:=array_append(masters,a.cutout_master_sha256);kinds:=array_append(kinds,a.treatment);end if;
      if a.treatment in ('white_square','flat_tile') then squares:=array_append(squares,a.square_sha256);clipped:=array_append(clipped,a.source_clipped);end if;
      originals:=array_append(originals,a.original_sha256);
    end loop;
    -- One image is either a cutout of one checked master of one original, or not a cutout at all.
    if treated and plain then raise exception 'One image mixes cutout and other evidence';end if;
    -- A flat tile of a native-alpha original has no cutout master (gap G2); every other treatment cites exactly one.
    tile:=treated and kinds[1]='flat_tile';
    if tile and (select count(distinct m) from unnest(masters) m)=0 and (select count(*) from unnest(masters) m where m is not null)=0 then
      if (select count(distinct o) from unnest(originals) o)<>1 then raise exception 'A cutout image cites one cutout master of one original';end if;
    elsif treated and ((select count(distinct m) from unnest(masters) m)<>1 or (select count(*) from unnest(masters) m where m is null)>0 or (select count(distinct o) from unnest(originals) o)<>1) then
      raise exception 'A cutout image cites one cutout master of one original';
    end if;
    -- Decision 0022: one image has one treatment. A white square cites one square made from that master, states once
    -- whether its source photograph cuts the product off, and is the only kind of image shown on the white square canvas.
    if treated and (select count(distinct k) from unnest(kinds) k)<>1 then raise exception 'One image mixes treatments';end if;
    square:=treated and kinds[1]='white_square';
    if square and ((select count(distinct q) from unnest(squares) q)<>1 or (select count(distinct x) from unnest(clipped) x)<>1) then
      raise exception 'A white square image cites one square of one cutout master';
    end if;
    if tile and (select count(distinct q) from unnest(squares) q)<>1 then raise exception 'A flat tile image cites one tile';end if;
    if (entry->>'canvas') is distinct from (case when square then 'white_square' when tile then 'flat_tile' end) then raise exception 'Only a white square image is shown on the white square canvas';end if;
    if tile and (entry ? 'source_clipped') then raise exception 'A flat tile shows the whole product; it is never clipped';end if;
    if tile and g.kind='open_license' then raise exception 'A flat tile is not offered for open-licence images';end if;
    if square and clipped[1] and not (entry ? 'source_clipped') then raise exception 'A white square cut off by its source photograph must say so';end if;
    if treated and g.kind not in ('owner_original','written_permission','open_license') then raise exception 'This grant kind has no basis for background removal';end if;
    if treated and g.kind='written_permission' and not g.background_removal and not (tile and masters[1] is null) then raise exception 'The written permission does not cover background removal';end if;
    -- A CC BY-SA cutout is an adaptation: allowed only with the grant's recorded ShareAlike review (decision 0016).
    if treated and g.kind='open_license' and g.license_code not in ('CC0-1.0','CC-BY-4.0','CC-BY-3.0','CC-BY-2.0')
      and not (g.license_code like 'CC-BY-SA-%' and g.share_alike_review is not null) then
      raise exception 'Background removal under this licence needs a licence review first';
    end if;
    -- An open-licence credit states the removal exactly when the image is a cutout.
    if g.kind='open_license' and (entry->'attribution'->>'changes' like 'background removed%') is distinct from treated then
      raise exception 'Open-licence image needs its exact visible attribution';
    end if;
    -- ... and it states the white square exactly when the image is one.
    if g.kind='open_license' and (entry->'attribution'->>'changes' like '%square white background%') is distinct from square then
      raise exception 'Open-licence image needs its exact visible attribution';
    end if;
  end loop;
  return new;
end $$;
commit;
