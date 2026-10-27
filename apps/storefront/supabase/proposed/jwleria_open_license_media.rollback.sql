-- Rollback of the PROPOSED jwleria_open_license_media.sql. It restores the exact definitions of 20261004102822
-- (withdraw_revoked), 20261021092208 (valid_image_variants), 20261021101140 (jwl_publish_candidate) and 20261026114541
-- (require_media_evidence) and drops only what that file added. It refuses while any open-licence
-- grant or any attribution exists: append-only evidence is never dropped by a rollback, so revoke the grant
-- (which withdraws its products), remove its public files and decide on that evidence in a reviewed change first.
begin;
do $$ begin
  if exists(select 1 from jwl_internal.media_grants where kind='open_license')
    or exists(select 1 from jwl_internal.publication_approvals p,jsonb_array_elements(p.approved_image_variants) e where e ? 'attribution')
    or exists(select 1 from public.jwl_catalog c,jsonb_array_elements(c.image_variants) e where e ? 'attribution') then
    raise exception 'Open-licence grants or attributed images exist; rollback refused';
  end if;
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
  if not(entry ?& array['src','width','height','variants']) or entry-array['src','width','height','variants']<>'{}'::jsonb then return false;end if;
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

drop trigger jwl_open_license_binding on jwl_internal.media_grants;
drop function jwl_internal.require_open_license_binding();
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
  if not source.enabled or not source.publication_allowed then raise exception 'Source publication not approved'; end if;
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

create or replace function jwl_internal.withdraw_revoked() returns trigger language plpgsql security invoker set search_path='' as $$
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

alter table jwl_internal.media_grants drop constraint jwl_open_license_grant_check;
alter table jwl_internal.media_grants
  drop column license_code,
  drop column license_url,
  drop column creator,
  drop column licensed_files,
  drop column attribution_text,
  drop column owner_decision_reference;
alter table jwl_internal.media_grants drop constraint media_grants_kind_check;
alter table jwl_internal.media_grants add constraint media_grants_kind_check check (kind in ('owner_original','written_permission'));
drop function jwl_internal.valid_open_license_files(jsonb);
drop function jwl_internal.valid_media_attribution(jsonb);
drop function jwl_internal.valid_credit_title(jsonb);
drop function jwl_internal.open_licenses();
drop function jwl_internal.open_license_lane(text,text);
drop function jwl_internal.percent_decode(text);
drop function jwl_internal.open_license_decisions();

commit;
