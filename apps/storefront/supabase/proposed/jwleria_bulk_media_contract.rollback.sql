-- Rollback of jwleria_bulk_media_contract.sql. It restores the exact applied definitions of
-- 20261101181522_jwleria_white_square_media.sql (treatment check, valid_image_variants, require_media_evidence) and
-- 20261026114541_jwleria_media_evidence_and_missing_intake.sql (require_live_media_grant), and refuses while any row
-- depends on the contract: a flat tile, a permission credit, a required credit, a live expiring grant or a scheduled sweep.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, public.jwl_catalog in access exclusive mode;
do $$
begin
  if exists(select 1 from jwl_internal.media_assets where treatment='flat_tile')
    or exists(select 1 from jwl_internal.publication_approvals p, jsonb_array_elements(p.approved_image_variants) e where e->>'canvas'='flat_tile' or e ? 'permission_credit')
    or exists(select 1 from public.jwl_catalog c, jsonb_array_elements(coalesce(c.image_variants,'[]'::jsonb)) e where e->>'canvas'='flat_tile' or e ? 'permission_credit')
    or exists(select 1 from jwl_internal.media_grants where required_credit is not null or (expires_at is not null and revoked_at is null))
    or jwl_internal.media_grant_expiry_sweep_scheduled() then
    raise exception 'Flat tiles, permission credits, expiring grants or a scheduled sweep still depend on this contract; rollback refused';
  end if;
end $$;
create or replace function jwl_internal.require_live_media_grant() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from jwl_internal.publication_approvals p join jwl_internal.media_grants g on g.grant_reference=p.media_reference
    where p.candidate_id=new.candidate_id and p.revision_hash=new.revision_hash and p.image_verified and p.revoked_at is null and g.revoked_at is null and g.expires_at is null) then
    raise exception 'Media publication needs a live approval and grant';
  end if;
  return new;
end $$;

create or replace function jwl_internal.valid_image_variants(images jsonb, manifest jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare entry jsonb; variant jsonb; field text; i integer; width integer; height integer;
 variant_width integer;variant_height integer;previous_width integer;number_value numeric;
 src text;variant_src text;seen_src text[]:='{}';seen_variants text[]:='{}';canonical_found boolean;card_found boolean;
begin
 if jsonb_typeof(images) is distinct from 'array' or jsonb_typeof(manifest) is distinct from 'array' then return false;end if;
 if jsonb_array_length(manifest)=0 then return true;end if;
 if jsonb_array_length(manifest)>20 or jsonb_array_length(manifest)<>jsonb_array_length(images) then return false;end if;
 for i in 0..jsonb_array_length(manifest)-1 loop
  entry:=manifest->i;
  if jsonb_typeof(entry) is distinct from 'object' then return false;end if;
  if not(entry ?& array['src','width','height','variants']) or entry-array['src','width','height','variants','attribution','canvas','source_clipped']<>'{}'::jsonb then return false;end if;
  -- Decision 0022: an image on the white square canvas is square; source_clipped can only disclose a limitation (true).
  if entry ? 'canvas' and (entry->'canvas' is distinct from '"white_square"'::jsonb or entry->'width' is distinct from entry->'height') then return false;end if;
  if entry ? 'source_clipped' and entry->'source_clipped' is distinct from 'true'::jsonb then return false;end if;
  if entry ? 'attribution' and not jwl_internal.valid_media_attribution(entry->'attribution') then return false;end if;
  if jsonb_typeof(entry->'src') is distinct from 'string' or jsonb_typeof(images->i) is distinct from 'string' then return false;end if;
  src:=entry->>'src';
  if src is distinct from images->>i or src=any(seen_src) or not jwl_internal.valid_public_media_url(src) then return false;end if;
  seen_src:=array_append(seen_src,src);
  foreach field in array array['width','height'] loop
   if jsonb_typeof(entry->field) is distinct from 'number' then return false;end if;
   number_value:=(entry->>field)::numeric;
   if number_value<>trunc(number_value) or number_value<1 or number_value>(case when field='width' then 4096 else 8192 end) then return false;end if;
  end loop;
  width:=((entry->>'width')::numeric)::integer;height:=((entry->>'height')::numeric)::integer;
  if jsonb_typeof(entry->'variants') is distinct from 'array' then return false;end if;
  if jsonb_array_length(entry->'variants') not between 1 and 8 then return false;end if;
  previous_width:=0;canonical_found:=false;card_found:=false;
  for variant in select value from jsonb_array_elements(entry->'variants') loop
   if jsonb_typeof(variant) is distinct from 'object' then return false;end if;
   if not(variant ?& array['src','width','height','bytes']) or variant-array['src','width','height','bytes']<>'{}'::jsonb then return false;end if;
   if jsonb_typeof(variant->'src') is distinct from 'string' then return false;end if;
   variant_src:=variant->>'src';
   if not jwl_internal.valid_public_media_url(variant_src) or variant_src=any(seen_variants) then return false;end if;
   seen_variants:=array_append(seen_variants,variant_src);
   foreach field in array array['width','height','bytes'] loop
    if jsonb_typeof(variant->field) is distinct from 'number' then return false;end if;
    number_value:=(variant->>field)::numeric;
    if number_value<>trunc(number_value) or number_value<1 or number_value>(case field when 'width' then 4096 when 'height' then 8192 else 15728640 end) then return false;end if;
   end loop;
   variant_width:=((variant->>'width')::numeric)::integer;variant_height:=((variant->>'height')::numeric)::integer;
   if variant_width<=previous_width or variant_width>width or variant_height>height then return false;end if;
   if abs(variant_height::numeric-height::numeric*variant_width/width)>1 then return false;end if;
   previous_width:=variant_width;card_found:=card_found or variant_width<=960;
   if variant_src=src then
    if variant_width<>width or variant_height<>height then return false;end if;
    canonical_found:=true;
   end if;
  end loop;
  if not canonical_found or not card_found then return false;end if;
 end loop;
 return true;
end $$;

create or replace function jwl_internal.require_media_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; g jwl_internal.media_grants; entry jsonb; variant jsonb; a jwl_internal.media_assets; f jsonb;
  treated boolean; plain boolean; masters text[]; originals text[]; kinds text[]; squares text[]; clipped boolean[]; square boolean;
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
        or coalesce(entry->'attribution'->>'changes' not in ('resized and converted to WebP','converted to WebP','background removed, resized and converted to WebP','background removed and converted to WebP',
          'background removed, placed on a square white background, resized and converted to WebP','background removed, placed on a square white background and converted to WebP'),true)
        -- A rendition is already a resize of the licensed original, so its credit always says so.
        or (f->>'file_kind'='rendition' and entry->'attribution'->>'changes' not in ('resized and converted to WebP','background removed, resized and converted to WebP','background removed, placed on a square white background, resized and converted to WebP')) then
        raise exception 'Open-licence image needs its exact visible attribution';
      end if;
    elsif entry ? 'attribution' then raise exception 'Attribution is recorded only for open-licence images';
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
      if a.treatment='white_square' then squares:=array_append(squares,a.square_sha256);clipped:=array_append(clipped,a.source_clipped);end if;
      originals:=array_append(originals,a.original_sha256);
    end loop;
    -- One image is either a cutout of one checked master of one original, or not a cutout at all.
    if treated and plain then raise exception 'One image mixes cutout and other evidence';end if;
    if treated and ((select count(distinct m) from unnest(masters) m)<>1 or (select count(distinct o) from unnest(originals) o)<>1) then
      raise exception 'A cutout image cites one cutout master of one original';
    end if;
    -- Decision 0022: one image has one treatment. A white square cites one square made from that master, states once
    -- whether its source photograph cuts the product off, and is the only kind of image shown on the white square canvas.
    if treated and (select count(distinct k) from unnest(kinds) k)<>1 then raise exception 'One image mixes treatments';end if;
    square:=treated and kinds[1]='white_square';
    if square and ((select count(distinct q) from unnest(squares) q)<>1 or (select count(distinct x) from unnest(clipped) x)<>1) then
      raise exception 'A white square image cites one square of one cutout master';
    end if;
    if (entry ? 'canvas') is distinct from square then raise exception 'Only a white square image is shown on the white square canvas';end if;
    if square and clipped[1] and not (entry ? 'source_clipped') then raise exception 'A white square cut off by its source photograph must say so';end if;
    if treated and g.kind not in ('owner_original','written_permission','open_license') then raise exception 'This grant kind has no basis for background removal';end if;
    if treated and g.kind='written_permission' and not g.background_removal then raise exception 'The written permission does not cover background removal';end if;
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

alter table jwl_internal.media_assets
  drop constraint jwl_media_asset_treatment_check,
  add constraint jwl_media_asset_treatment_check check (case when treatment is null
    then num_nulls(treatment_version,cutout_master_sha256,treatment_reference,square_sha256,source_clipped)=5
    else coalesce(treatment_version=1 and cutout_master_sha256 ~ '^[a-f0-9]{64}$'
      and cutout_master_sha256<>original_sha256 and cutout_master_sha256<>public_sha256
      and jwl_internal.visible_credit_text(treatment_reference) and length(treatment_reference)<=8000
      and case treatment
        when 'background_removal' then num_nulls(square_sha256,source_clipped)=2
        -- A white square file is square, and its square is neither the original, the alpha master nor the file itself.
        when 'white_square' then square_sha256 ~ '^[a-f0-9]{64}$' and square_sha256<>original_sha256 and square_sha256<>cutout_master_sha256
          and square_sha256<>public_sha256 and source_clipped is not null and width=height
        else false end,false) end);
drop function public.jwl_expire_media_grants(timestamptz);
drop function jwl_internal.media_grant_is_usable(text);
drop function jwl_internal.media_grant_expiry_sweep_scheduled();
drop function jwl_internal.media_grant_expiry_lead();
alter table jwl_internal.media_grants drop constraint jwl_media_grant_required_credit_check, drop column required_credit_url, drop column required_credit;
commit;
