-- APPLIED 2026-11-08 as registered migration 20261108072948 (owner-approved, after Worker storefront-2fa63291cdf2). Bulk media contract (docs/architecture/BULK-ORIGINAL-IMAGES.md gaps G2, G3, G4).
-- Applying it is an owner-approved production action, after the Worker release that accepts canvas 'flat_tile' and
-- 'permission_credit' (spec D3). Rollback: jwleria_bulk_media_contract.rollback.sql.
-- G2: evidence and image entries for the flat_tile presentation. G3: the credit a written permission requires.
-- G4: expiring grants become usable only while a scheduled sweep withdraws them 25 hours before expiry; without a
-- scheduled sweep (pg_cron is not installed today), behaviour is exactly as before. Nothing here schedules anything.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals in access exclusive mode;

alter table jwl_internal.media_grants
  add column required_credit text,
  add column required_credit_url text,
  add constraint jwl_media_grant_required_credit_check check (
    (required_credit is null and required_credit_url is null)
    or (kind='written_permission' and jwl_internal.visible_credit_text(required_credit) and char_length(required_credit)<=300 and required_credit !~ '[[:cntrl:]]'
      and (required_credit_url is null or (required_credit_url ~ '^https://[^/@[:space:]]+/[^[:space:][:cntrl:]]*$' and char_length(required_credit_url)<=2048))));

alter table jwl_internal.media_assets
  drop constraint jwl_media_asset_treatment_check,
  add constraint jwl_media_asset_treatment_check check (case when treatment is null
    then num_nulls(treatment_version,cutout_master_sha256,treatment_reference,square_sha256,source_clipped)=5
    else coalesce(treatment_version=1 and ((treatment='flat_tile' and cutout_master_sha256 is null) or (cutout_master_sha256 ~ '^[a-f0-9]{64}$'
      and cutout_master_sha256<>original_sha256 and cutout_master_sha256<>public_sha256))
      and jwl_internal.visible_credit_text(treatment_reference) and length(treatment_reference)<=8000
      and case treatment
        when 'background_removal' then num_nulls(square_sha256,source_clipped)=2
        -- A white square file is square, and its square is neither the original, the alpha master nor the file itself.
        when 'white_square' then square_sha256 ~ '^[a-f0-9]{64}$' and square_sha256<>original_sha256 and square_sha256<>cutout_master_sha256
          and square_sha256<>public_sha256 and source_clipped is not null and width=height
        -- Gap G2: a flat tile names its tile, never the original or the file; it is square and never clipped.
        when 'flat_tile' then square_sha256 ~ '^[a-f0-9]{64}$' and square_sha256<>original_sha256 and square_sha256<>public_sha256
          and square_sha256 is distinct from cutout_master_sha256 and source_clipped=false and width=height
        else false end,false) end);

-- Gap G4. One day of browser cache, under 600 s of stale HTML and a 15-minute sweep interval, rounded up.
create function jwl_internal.media_grant_expiry_lead() returns interval language sql immutable set search_path='' as $$ select interval '25 hours' $$;
-- True only when pg_cron holds an active job that runs the sweep; it compiles and answers false without pg_cron.
create function jwl_internal.media_grant_expiry_sweep_scheduled() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare found boolean:=false;
begin
  if to_regclass('cron.job') is null then return false;end if;
  execute 'select exists(select 1 from cron.job where active and command ilike ''%jwl_expire_media_grants%'')' into found;
  return coalesce(found,false);
end $$;
create function jwl_internal.media_grant_is_usable(p_grant_reference text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from jwl_internal.media_grants g where g.grant_reference=p_grant_reference and g.revoked_at is null
    and (g.expires_at is null or (g.kind<>'open_license' and jwl_internal.media_grant_expiry_sweep_scheduled()
      and g.expires_at>now()+jwl_internal.media_grant_expiry_lead())))
$$;
-- The one sweep: revokes every live grant whose expiry falls within the lead (the revocation cascade withdraws its
-- products) and lists the revoked files for the approval-bound cleanup. The proposed intake runner calls this too.
create function public.jwl_expire_media_grants(p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare refs text[];
begin
  with r as (update jwl_internal.media_grants set revoked_at=now()
    where revoked_at is null and expires_at is not null and expires_at<=p_now+jwl_internal.media_grant_expiry_lead() returning grant_reference)
  select coalesce(array_agg(grant_reference order by grant_reference),'{}') into refs from r;
  return jsonb_build_object('revoked',to_jsonb(refs),'files',public.jwl_revoked_media_files());
end $$;
revoke all on function jwl_internal.media_grant_expiry_lead(),jwl_internal.media_grant_expiry_sweep_scheduled(),jwl_internal.media_grant_is_usable(text),
  public.jwl_expire_media_grants(timestamptz) from public,anon,authenticated;
grant execute on function jwl_internal.media_grant_expiry_lead(),jwl_internal.media_grant_expiry_sweep_scheduled(),jwl_internal.media_grant_is_usable(text),
  public.jwl_expire_media_grants(timestamptz) to service_role;

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
  if not(entry ?& array['src','width','height','variants']) or entry-array['src','width','height','variants','attribution','canvas','source_clipped','permission_credit']<>'{}'::jsonb then return false;end if;
  -- Gap G3: a credit a written permission requires, exactly {text} or {text,url}; never beside an open-licence attribution.
  if entry ? 'permission_credit' and (entry ? 'attribution' or jsonb_typeof(entry->'permission_credit') is distinct from 'object'
    or not (entry->'permission_credit' ? 'text') or (entry->'permission_credit')-array['text','url']<>'{}'::jsonb
    or jsonb_typeof(entry->'permission_credit'->'text') is distinct from 'string' or not jwl_internal.visible_credit_text(entry->'permission_credit'->>'text')
    or char_length(entry->'permission_credit'->>'text')>300 or entry->'permission_credit'->>'text' ~ '[[:cntrl:]]'
    or (entry->'permission_credit' ? 'url' and (jsonb_typeof(entry->'permission_credit'->'url') is distinct from 'string' or entry->'permission_credit'->>'url' !~ '^https://[^/@[:space:]]+/[^[:space:][:cntrl:]]*$' or char_length(entry->'permission_credit'->>'url')>2048))) then return false;end if;
  -- Decision 0022: an image on the white square canvas is square; source_clipped can only disclose a limitation (true).
  -- Gap G2: a flat tile (an opaque #f0f0f0 square with the whole product at 0.68) is square too.
  if entry ? 'canvas' and (entry->'canvas' not in ('"white_square"'::jsonb,'"flat_tile"'::jsonb) or entry->'width' is distinct from entry->'height') then return false;end if;
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

create or replace function jwl_internal.require_live_media_grant() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from jwl_internal.publication_approvals p join jwl_internal.media_grants g on g.grant_reference=p.media_reference
    where p.candidate_id=new.candidate_id and p.revision_hash=new.revision_hash and p.image_verified and p.revoked_at is null and jwl_internal.media_grant_is_usable(g.grant_reference)) then
    raise exception 'Media publication needs a live approval and grant';
  end if;
  return new;
end $$;
commit;
