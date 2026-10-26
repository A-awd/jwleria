-- PROPOSED, NOT APPLIED. Decision 0011 still rejects open licences. Applying this file is a separate
-- owner-approved production change that follows the owner's recorded open-licence decision and the
-- storefront's visible attribution; on approval it is registered and moved to ../migrations.
-- Adds one grant kind, open_license: one Wikimedia Commons file under an allowlisted free licence (CC0 1.0,
-- CC BY 4.0/3.0/2.0, CC BY-SA 4.0/3.0/2.0; never NC or ND) for one exact candidate, with the owner decision
-- it relies on. Its images must carry the exact visible attribution derived from the grant. Creates no
-- grant, asset, approval or publication; closed sources, evidence, verification and revocation stay in force.
begin;

-- The only accepted licences: SPDX id -> visible label and canonical deed. Ported versions need review.
create function jwl_internal.open_licenses() returns jsonb
language sql immutable security invoker set search_path='' as $$
  select '{"CC0-1.0":{"label":"CC0 1.0","url":"https://creativecommons.org/publicdomain/zero/1.0/"},
    "CC-BY-4.0":{"label":"CC BY 4.0","url":"https://creativecommons.org/licenses/by/4.0/"},
    "CC-BY-3.0":{"label":"CC BY 3.0","url":"https://creativecommons.org/licenses/by/3.0/"},
    "CC-BY-2.0":{"label":"CC BY 2.0","url":"https://creativecommons.org/licenses/by/2.0/"},
    "CC-BY-SA-4.0":{"label":"CC BY-SA 4.0","url":"https://creativecommons.org/licenses/by-sa/4.0/"},
    "CC-BY-SA-3.0":{"label":"CC BY-SA 3.0","url":"https://creativecommons.org/licenses/by-sa/3.0/"},
    "CC-BY-SA-2.0":{"label":"CC BY-SA 2.0","url":"https://creativecommons.org/licenses/by-sa/2.0/"}}'::jsonb
$$;
revoke all on function jwl_internal.open_licenses() from public,anon,authenticated;
grant execute on function jwl_internal.open_licenses() to service_role;

alter table jwl_internal.media_grants drop constraint media_grants_kind_check;
alter table jwl_internal.media_grants add constraint media_grants_kind_check check (kind in ('owner_original','written_permission','open_license'));
alter table jwl_internal.media_grants
  add column license_code text,
  add column license_url text,
  add column creator text,
  add column source_page_url text,
  add column original_url text,
  add column attribution_text text,
  add column owner_decision_reference text;
-- An open-licence grant names one exact candidate, one Commons file page and its untouched original on
-- upload.wikimedia.org (Commons only, never a brand origin). Other kinds carry none of these fields.
alter table jwl_internal.media_grants add constraint jwl_open_license_grant_check check (case when kind='open_license' then coalesce(
  candidate_id is not null and source_id is not null and media_origins='[]'::jsonb
  and source_id not in ('cartier-official','van-cleef-and-arpels-official','celine-official','rimowa-official','piaget-official','panerai-official')
  and jwl_internal.open_licenses() ? license_code and license_url=jwl_internal.open_licenses()->license_code->>'url'
  and length(trim(creator)) between 1 and 300 and creator !~ '[[:cntrl:]]'
  and length(trim(attribution_text)) between 1 and 500 and attribution_text !~ '[[:cntrl:]]' and position(creator in attribution_text)>0
  and length(source_page_url)<=2048 and source_page_url ~ '^https://commons\.wikimedia\.org/wiki/File:[^/?#[:space:]"<>\\]+$'
  and length(original_url)<=2048 and original_url ~ '^https://upload\.wikimedia\.org/wikipedia/commons/[0-9a-f]/[0-9a-f]{2}/[^/?#[:space:]"<>\\]+\.([Jj][Pp][Ee]?[Gg]|[Pp][Nn][Gg]|[Ww][Ee][Bb][Pp])$'
  and split_part(original_url,'/',6)=left(split_part(original_url,'/',7),1)
  and owner_decision_reference ~ '^[a-z0-9][a-z0-9._:/-]{2,120}$',false)
  else num_nulls(license_code,license_url,creator,source_page_url,original_url,attribution_text,owner_decision_reference)=7 end);

-- The grant's candidate must belong to the grant's source, checked once when the grant is recorded.
create function jwl_internal.require_open_license_binding() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.kind='open_license' and not exists(select 1 from jwl_internal.candidates c where c.candidate_id=new.candidate_id and c.source_id=new.source_id) then
    raise exception 'An open-licence grant must name one exact candidate of its source';
  end if;
  return new;
end $$;
revoke all on function jwl_internal.require_open_license_binding() from public,anon,authenticated;
create trigger jwl_open_license_binding before insert on jwl_internal.media_grants
  for each row execute function jwl_internal.require_open_license_binding();

-- A visible credit: exactly five bounded strings, an allowlisted licence and its Commons file page.
create function jwl_internal.valid_media_attribution(credit jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare field text;
begin
 if jsonb_typeof(credit) is distinct from 'object' or not(credit ?& array['creator','license','license_url','source_url','changes']) or credit-array['creator','license','license_url','source_url','changes']<>'{}'::jsonb then return false;end if;
 foreach field in array array['creator','license','license_url','source_url','changes'] loop
  if jsonb_typeof(credit->field) is distinct from 'string' or length(trim(credit->>field))=0 or length(credit->>field)>(case field when 'source_url' then 2048 else 300 end) or credit->>field ~ '[[:cntrl:]]' then return false;end if;
 end loop;
 if not exists(select 1 from jsonb_each(jwl_internal.open_licenses()) l where l.value->>'label'=credit->>'license' and l.value->>'url'=credit->>'license_url') then return false;end if;
 return credit->>'source_url' ~ '^https://commons\.wikimedia\.org/wiki/File:[^/?#[:space:]"<>\\]+$';
end $$;
revoke all on function jwl_internal.valid_media_attribution(jsonb) from public,anon,authenticated;
grant execute on function jwl_internal.valid_media_attribution(jsonb) to service_role;

-- Same responsive contract as 20261021092208, plus one optional, validated attribution per entry.
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
  if not(entry ?& array['src','width','height','variants']) or entry-array['src','width','height','variants','attribution']<>'{}'::jsonb then return false;end if;
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

-- Same evidence rules as 20261026114541, plus: an open-licence file must be the granted Commons original
-- and its entry must carry the exact credit derived from the grant; no other grant kind may carry a credit.
create or replace function jwl_internal.require_media_evidence() returns trigger
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
    if g.kind='open_license' then
      if entry->'attribution' is distinct from jsonb_build_object('creator',g.creator,'license',jwl_internal.open_licenses()->g.license_code->>'label','license_url',g.license_url,'source_url',g.source_page_url,'changes',entry->'attribution'->'changes')
        or coalesce(entry->'attribution'->>'changes' not in ('resized and converted to WebP','converted to WebP'),true) then
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
        if a.original_source is distinct from g.original_url then raise exception 'Open-licence evidence must cite the granted original file';end if;
      else
        -- An official gallery URL is only usable under written permission for its exact origin.
        if not coalesce(c.content->'image_urls','[]'::jsonb) ? a.original_source then raise exception 'Original is not in the exact candidate gallery';end if;
        if not g.media_origins ? (split_part(a.original_source,'/',1)||'//'||split_part(a.original_source,'/',3)) then raise exception 'Original origin is not granted';end if;
      end if;
    end loop;
  end loop;
  return new;
end $$;

commit;
