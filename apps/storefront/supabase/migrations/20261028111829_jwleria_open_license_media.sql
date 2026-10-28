
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
  add column licensed_files jsonb,
  add column attribution_text text,
  add column owner_decision_reference text;

-- Strict percent-decoding of a URL path segment into UTF-8 text, as JavaScript's decodeURIComponent does (no "+"
-- rule): a malformed escape or invalid UTF-8 returns null, so every check that uses it fails closed.
create function jwl_internal.percent_decode(value text) returns text
language plpgsql immutable strict security invoker set search_path='' as $$
declare bytes bytea:=''::bytea; i integer:=1; n integer:=length(value); ch text;
begin
 while i<=n loop
  ch:=substr(value,i,1);
  if ch='%' then
   if substr(value,i+1,2) !~ '^[0-9A-Fa-f]{2}$' then return null;end if;
   bytes:=bytes||decode(substr(value,i+1,2),'hex');i:=i+3;
  else
   bytes:=bytes||convert_to(ch,'UTF8');i:=i+1;
  end if;
 end loop;
 return convert_from(bytes,'UTF8');
exception when others then return null;
end $$;
revoke all on function jwl_internal.percent_decode(text) from public,anon,authenticated;
grant execute on function jwl_internal.percent_decode(text) to service_role;

-- The only owner decisions an open-licence grant may cite, each with the catalogue references it covers. This is the
-- same list as openLicenseDecisions in scripts/catalog-intake/media-pipeline.mjs (a test compares them). Decision 0011
-- rejects open licences and is never accepted here; widening this list needs the decision amended and a new migration.
create function jwl_internal.open_license_decisions() returns jsonb
language sql immutable security invoker set search_path='' as $$
  select '{"decisions/0013-open-licence-exact-product-photos.md":{"references":["m126234-0015"]}}'::jsonb
$$;
revoke all on function jwl_internal.open_license_decisions() from public,anon,authenticated;
grant execute on function jwl_internal.open_license_decisions() to service_role;

-- A credit string must contain a character that JavaScript's String.prototype.trim() keeps. Postgres trim() strips
-- only U+0020, so "length(trim(x))>0" alone accepts a string of no-break, ideographic or other Unicode spaces that the
-- pipeline and the storefront refuse; such a row would pass the database and then fail the storefront read. The set
-- below is ECMAScript WhiteSpace and LineTerminator ([[:space:]] covers the ASCII ones).
create function jwl_internal.visible_credit_text(value text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(value ~ '[^[:space:]\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]',false)
$$;
revoke all on function jwl_internal.visible_credit_text(text) from public,anon,authenticated;
grant execute on function jwl_internal.visible_credit_text(text) to service_role;

-- The files an open-licence grant covers: 1..20 distinct Commons file pages, each with exactly one held file on
-- upload.wikimedia.org (Commons only, never a brand origin or another wiki), recorded honestly as either
--   {"file_kind":"original","rendition_width":null,"file_url":".../wikipedia/commons/<h>/<hh>/<File>"} or
--   {"file_kind":"rendition","rendition_width":N,"file_url":".../wikipedia/commons/thumb/<h>/<hh>/<File>/<N>px-<File>"}
-- where <File> is the page's own File name spelled the same way, N is 100..4000, and <h>/<hh> are the first one and
-- two hex digits of md5(<File> percent-decoded), as MediaWiki stores it (underscores, as in the URL).
-- Each file also states "title": the work's title as its author supplied it (CC BY/BY-SA 2.0 and 3.0 require it
-- "if supplied"), 1..300 characters without control characters, or null when the author supplied none. A file
-- name or a caption written by others is not a supplied title.
create function jwl_internal.valid_credit_title(title jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(jsonb_typeof(title)='string' and jwl_internal.visible_credit_text(title#>>'{}') and length(title#>>'{}')<=300 and title#>>'{}' !~ '[[:cntrl:]]',false)
$$;
revoke all on function jwl_internal.valid_credit_title(jsonb) from public,anon,authenticated;
grant execute on function jwl_internal.valid_credit_title(jsonb) to service_role;

create function jwl_internal.valid_open_license_files(files jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare f jsonb; page text; name text; hash text; url text; parts text[]; width numeric; seen_pages text[]:='{}'; seen_files text[]:='{}';
begin
 if jsonb_typeof(files) is distinct from 'array' or jsonb_array_length(files) not between 1 and 20 then return false;end if;
 for f in select value from jsonb_array_elements(files) loop
  if jsonb_typeof(f) is distinct from 'object' or not(f ?& array['source_page_url','file_url','file_kind','rendition_width','title'])
    or f-array['source_page_url','file_url','file_kind','rendition_width','title']<>'{}'::jsonb then return false;end if;
  if f->'title'<>'null'::jsonb and not jwl_internal.valid_credit_title(f->'title') then return false;end if;
  if jsonb_typeof(f->'source_page_url') is distinct from 'string' or jsonb_typeof(f->'file_url') is distinct from 'string' then return false;end if;
  page:=f->>'source_page_url';url:=f->>'file_url';parts:=string_to_array(url,'/');
  if length(page)>2048 or length(url)>2048 or page !~ '^https://commons\.wikimedia\.org/wiki/File:[^/?#[:space:]"<>\\]+$' then return false;end if;
  name:=substring(page from '^https://commons\.wikimedia\.org/wiki/File:(.+)$');
  if name !~ '\.([Jj][Pp][Ee]?[Gg]|[Pp][Nn][Gg]|[Ww][Ee][Bb][Pp])$' then return false;end if;
  hash:=md5(jwl_internal.percent_decode(name));
  if hash is null then return false;end if;
  if f->>'file_kind'='original' then
   if f->'rendition_width'<>'null'::jsonb then return false;end if;
   if url !~ '^https://upload\.wikimedia\.org/wikipedia/commons/[0-9a-f]/[0-9a-f]{2}/[^/?#[:space:]"<>\\]+$'
     or parts[6]<>left(hash,1) or parts[7]<>left(hash,2) or parts[8]<>name then return false;end if;
  elsif f->>'file_kind'='rendition' then
   if jsonb_typeof(f->'rendition_width') is distinct from 'number' then return false;end if;
   width:=(f->>'rendition_width')::numeric;
   if width<>trunc(width) or width not between 100 and 4000 then return false;end if;
   if url !~ '^https://upload\.wikimedia\.org/wikipedia/commons/thumb/[0-9a-f]/[0-9a-f]{2}/[^/?#[:space:]"<>\\]+/[1-9][0-9]*px-[^/?#[:space:]"<>\\]+$'
     or parts[7]<>left(hash,1) or parts[8]<>left(hash,2) or parts[9]<>name or parts[10]<>width::integer::text||'px-'||name then return false;end if;
  else return false;
  end if;
  if page=any(seen_pages) or url=any(seen_files) then return false;end if;
  seen_pages:=array_append(seen_pages,page);seen_files:=array_append(seen_files,url);
 end loop;
 return true;
end $$;
revoke all on function jwl_internal.valid_open_license_files(jsonb) from public,anon,authenticated;
grant execute on function jwl_internal.valid_open_license_files(jsonb) to service_role;

-- An open-licence grant names one exact candidate and its licensed files. The owner decision is exactly one of the
-- recorded decision files above; free text, however dated, and any other file are refused. Other kinds carry none of
-- these fields.
alter table jwl_internal.media_grants add constraint jwl_open_license_grant_check check (case when kind='open_license' then coalesce(
  candidate_id is not null and source_id is not null and media_origins='[]'::jsonb
  and source_id not in ('cartier-official','van-cleef-and-arpels-official','celine-official','rimowa-official','piaget-official','panerai-official')
  and jwl_internal.open_licenses() ? license_code and license_url=jwl_internal.open_licenses()->license_code->>'url'
  and length(trim(creator)) between 1 and 300 and jwl_internal.visible_credit_text(creator) and creator !~ '[[:cntrl:]]'
  and length(trim(attribution_text)) between 1 and 500 and jwl_internal.visible_credit_text(attribution_text) and attribution_text !~ '[[:cntrl:]]' and position(creator in attribution_text)>0
  and jwl_internal.valid_open_license_files(licensed_files)
  and jwl_internal.open_license_decisions() ? owner_decision_reference,false)
  else num_nulls(license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference)=6 end);

-- The grant's candidate must belong to the grant's source, and its reference must be one the cited decision covers,
-- checked once when the grant is recorded.
create function jwl_internal.require_open_license_binding() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates;
begin
  if new.kind='open_license' then
    select * into c from jwl_internal.candidates where candidate_id=new.candidate_id and source_id=new.source_id;
    if c.candidate_id is null then raise exception 'An open-licence grant must name one exact candidate of its source'; end if;
    -- An unlisted or missing decision is left to the check constraint, which refuses it.
    if jwl_internal.open_license_decisions() ? new.owner_decision_reference
      and not (jwl_internal.open_license_decisions()->new.owner_decision_reference->'references' ? c.external_id) then
      raise exception 'The cited owner decision does not cover this reference';
    end if;
  end if;
  return new;
end $$;
revoke all on function jwl_internal.require_open_license_binding() from public,anon,authenticated;
create trigger jwl_open_license_binding before insert on jwl_internal.media_grants
  for each row execute function jwl_internal.require_open_license_binding();

-- A visible credit: five bounded strings, an allowlisted licence and its Commons file page, plus an optional "title"
-- (null, or a bounded string as in valid_credit_title). A five-field credit stays valid.
create function jwl_internal.valid_media_attribution(credit jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare field text;
begin
 if jsonb_typeof(credit) is distinct from 'object' or not(credit ?& array['creator','license','license_url','source_url','changes']) or credit-array['creator','license','license_url','source_url','changes','title']<>'{}'::jsonb then return false;end if;
 if credit ? 'title' and credit->'title'<>'null'::jsonb and not jwl_internal.valid_credit_title(credit->'title') then return false;end if;
 foreach field in array array['creator','license','license_url','source_url','changes'] loop
  if jsonb_typeof(credit->field) is distinct from 'string' or not jwl_internal.visible_credit_text(credit->>field) or length(credit->>field)>(case field when 'source_url' then 2048 else 300 end) or credit->>field ~ '[[:cntrl:]]' then return false;end if;
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

-- Same evidence rules as 20261026114541, plus: each open-licence entry credits one granted file, carries the exact
-- credit derived from the grant and that file (with that file's title when its author supplied one, and no title key
-- otherwise), cites that file as the original of every variant and, for a rendition, says it was resized and is
-- never wider than the rendition. No other grant kind may carry a credit.
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


-- The open-licence lane: the current revision of the candidate has a live, verified approval citing a live
-- open_license grant for this exact candidate and its source, and that same revision is already published as facts.
create function jwl_internal.open_license_lane(p_candidate text, p_revision text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from jwl_internal.candidates c
    join jwl_internal.publication_approvals a on a.candidate_id=c.candidate_id and a.revision_hash=c.revision_hash
    join jwl_internal.media_grants g on g.grant_reference=a.media_reference
    join jwl_internal.factual_publications f on f.catalog_id=c.candidate_id and f.candidate_id=c.candidate_id and f.revision_hash=c.revision_hash
    where c.candidate_id=p_candidate and c.revision_hash=p_revision and a.image_verified and a.revoked_at is null
      and g.kind='open_license' and g.revoked_at is null and g.expires_at is null and g.candidate_id=c.candidate_id and g.source_id=c.source_id)
$$;
revoke all on function jwl_internal.open_license_lane(text,text) from public,anon,authenticated;
grant execute on function jwl_internal.open_license_lane(text,text) to service_role;

-- Same as 20261021101140 except the source check above.
create or replace function public.jwl_publish_candidate(candidate text, revision text, product jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; approval jwl_internal.publication_approvals; source jwl_internal.sources; responsive jsonb;
begin
  select * into c from jwl_internal.candidates where candidate_id=candidate;
  select * into approval from jwl_internal.publication_approvals where candidate_id=candidate and revision_hash=revision;
  select * into source from jwl_internal.sources where id=c.source_id;
  if c.candidate_id is null or c.revision_hash<>revision then raise exception 'Candidate revision changed'; end if;
  if product ? 'collection_kind' then
   if jsonb_typeof(product->'collection_kind') is distinct from 'string' or product->>'collection_kind' not in ('collection','source_group') then raise exception 'Invalid collection kind';end if;
  end if;
  if coalesce(product->>'collection_kind','collection') is distinct from coalesce(c.content->>'collection_kind','collection') then raise exception 'Collection kind differs from current candidate';end if;
  if approval.candidate_id is null or not approval.image_verified or approval.revoked_at is not null then raise exception 'Image approval missing or revoked'; end if;
  -- The source flag governs the source's own media. A live open-licence approval of a product already public as facts at
  -- this exact revision does not use it; every other publication still does, and a disabled source refuses all.
  if not source.enabled or (not source.publication_allowed and not jwl_internal.open_license_lane(candidate,revision)) then raise exception 'Source publication not approved'; end if;
  -- Without the flag the lane only adds images to the existing public row: every displayed fact and the search text
  -- must stay exactly as they are (NULL-safe comparisons, so a NULL column must also stay NULL).
  if not source.publication_allowed and not exists(select 1 from public.jwl_catalog k where k.id=candidate and k.active
    and k.slug is not distinct from product->>'slug' and k.reference is not distinct from product->>'reference'
    and k.brand_slug is not distinct from product->>'brand_slug' and k.brand_name is not distinct from product->>'brand_name'
    and k.brand_tier is not distinct from product->>'brand_tier' and k.category_slug is not distinct from product->>'category_slug'
    and k.collection_slug is not distinct from product->>'collection_slug' and k.collection_ar is not distinct from product->>'collection_ar'
    and k.collection_en is not distinct from product->>'collection_en' and k.collection_kind is not distinct from coalesce(product->>'collection_kind','collection')
    and k.name_ar is not distinct from product->>'name_ar' and k.name_en is not distinct from product->>'name_en'
    and k.description_ar is not distinct from product->>'description_ar' and k.description_en is not distinct from product->>'description_en'
    and k.search_text is not distinct from product->>'search_text') then
    raise exception 'Source publication not approved';
  end if;
  if product->>'reference' is distinct from c.external_id or product->>'brand_name' is distinct from c.content->>'brand' or product->>'collection_en' is distinct from c.content->>'collection' or product->>'name_ar' is distinct from c.content->>'name_ar' or product->>'name_en' is distinct from c.content->>'name_en' then raise exception 'Product identity differs from current candidate';end if;
  if jsonb_typeof(product->'images') is distinct from 'array' or jsonb_array_length(product->'images')=0 then raise exception 'Missing publication images'; end if;
  if product->'images' is distinct from approval.approved_images then raise exception 'Images differ from approved media'; end if;
  responsive:=coalesce(product->'image_variants','[]'::jsonb);
  if responsive is distinct from approval.approved_image_variants then raise exception 'Image variants differ from approved media';end if;
  if not jwl_internal.valid_image_variants(product->'images',responsive) then raise exception 'Invalid responsive image metadata';end if;
  if exists(select 1 from jsonb_array_elements_text(product->'images') i where i !~ '^https://[^/@]+/' or i ~ '^https://[^/]*@') then raise exception 'Invalid image destination'; end if;
  if coalesce(trim(product->>'description_ar'),'')='' or coalesce(trim(product->>'description_en'),'')='' then raise exception 'Factual descriptions missing'; end if;
  if product->>'description_ar' is distinct from c.content->>'description_ar' or product->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Descriptions differ from current candidate'; end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,collection_kind,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,search_text)
    values(candidate,product->>'slug',product->>'reference',product->>'brand_slug',product->>'brand_name',product->>'brand_tier',product->>'category_slug',product->>'collection_slug',product->>'collection_ar',product->>'collection_en',coalesce(product->>'collection_kind','collection'),product->>'name_ar',product->>'name_en',product->>'description_ar',product->>'description_en',product->'images',responsive,'approved_media',product->>'search_text')
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,collection_kind=excluded.collection_kind,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images=excluded.images,image_variants=excluded.image_variants,media_state='approved_media',search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
revoke all on function public.jwl_publish_candidate(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_publish_candidate(text,text,jsonb) to service_role;

-- Same as 20261004102822 except the sources branch: a disabled source still withdraws every media publication; a
-- source without publication_allowed withdraws every media publication except the open-licence lane's.
create or replace function jwl_internal.withdraw_revoked() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name='publication_approvals' then
    if new.revoked_at is not null or not new.image_verified then
      update public.jwl_catalog set active=false where id in
        (select catalog_id from jwl_internal.published_revisions where candidate_id=new.candidate_id and revision_hash=new.revision_hash);
    end if;
  elsif tg_table_name='sources' then
    if not new.enabled then
      update public.jwl_catalog set active=false where id in
        (select p.catalog_id from jwl_internal.published_revisions p join jwl_internal.candidates c using(candidate_id) where c.source_id=new.id);
    elsif not new.publication_allowed then
      -- Exactly the publications the open-licence lane may make without the flag are not withdrawn by it.
      update public.jwl_catalog set active=false where id in
        (select p.catalog_id from jwl_internal.published_revisions p join jwl_internal.candidates c using(candidate_id) where c.source_id=new.id
          and not jwl_internal.open_license_lane(p.candidate_id,p.revision_hash));
    end if;
  elsif tg_table_name='candidates' then
    if new.revision_hash<>old.revision_hash then
      update public.jwl_catalog set active=false where id=new.candidate_id;
    end if;
  end if;
  return new;
end $$;

