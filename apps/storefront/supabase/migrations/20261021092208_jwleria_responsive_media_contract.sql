-- Responsive media metadata does not grant or approve any asset rights.
-- Empty manifests retain compatibility; nonempty manifests describe every
-- canonical image and must match the independently approved private manifest.
begin;

create or replace function jwl_internal.valid_public_media_url(value text)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare parts text[]; host text; label text; port text; path text;
begin
 if value is null or length(value)>2048 or value ~ '[[:space:],\\<>"`?#]' or value ~ '[^\x21-\x7e]' then return false;end if;
 parts:=regexp_match(value,'^https://([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::([1-9][0-9]{0,4}))?(/.*)$');
 if parts is null then return false;end if;
 host:=parts[1];port:=parts[2];path:=parts[3];
 if length(host)>253 then return false;end if;
 foreach label in array string_to_array(host,'.') loop
  if length(label)>63 or label !~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' then return false;end if;
 end loop;
 if port is not null and (port::integer>65535 or port='443') then return false;end if;
 -- A shortened, padded or out-of-range numeric host is not a canonical URL.
 if host ~ '(^|\.)([0-9]+|0x[0-9a-f]+)$' then
  if host !~ '^[0-9.]+$' then return false;end if;
  if array_length(string_to_array(host,'.'),1)<>4 then return false;end if;
  foreach label in array string_to_array(host,'.') loop
   if length(label)>3 or label::integer>255 or label<>label::integer::text then return false;end if;
  end loop;
 end if;
 if replace(lower(path),'%2e','.') ~ '(^|/)\.{1,2}(/|$)' then return false;end if;
 return true;
end $$;
revoke all on function jwl_internal.valid_public_media_url(text) from public,anon,authenticated;
grant execute on function jwl_internal.valid_public_media_url(text) to service_role;

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
revoke all on function jwl_internal.valid_image_variants(jsonb,jsonb) from public,anon,authenticated;
grant execute on function jwl_internal.valid_image_variants(jsonb,jsonb) to service_role;

alter table jwl_internal.publication_approvals add column approved_image_variants jsonb not null default '[]'::jsonb;
alter table jwl_internal.publication_approvals add constraint jwl_approved_image_variants_check
 check(jwl_internal.valid_image_variants(approved_images,approved_image_variants));
alter table public.jwl_catalog add column image_variants jsonb not null default '[]'::jsonb;
alter table public.jwl_catalog add constraint jwl_catalog_image_variants_check
 check(jwl_internal.valid_image_variants(images,image_variants));

create or replace function public.jwl_publish_factual_batch(products jsonb, owner_instruction text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb;c jwl_internal.candidates;published integer:=0;
begin
 if jsonb_typeof(products)<>'array' or jsonb_array_length(products)>100 or coalesce(length(trim(owner_instruction)),0)=0 then raise exception 'Invalid factual publication batch';end if;
 for p in select value from jsonb_array_elements(products) loop
  select * into c from jwl_internal.candidates where candidate_id=p->>'candidate_id';
  if c.candidate_id is null or c.revision_hash<>p->>'revision_hash' then raise exception 'Candidate revision changed';end if;
  if jsonb_array_length(coalesce(c.content->'facts','[]'))=0 or c.content->>'translation_state'<>'provided' then raise exception 'Facts or prepared name missing';end if;
  if p->>'reference' is distinct from c.external_id or p->>'brand_name' is distinct from c.content->>'brand' or p->>'collection_en' is distinct from c.content->>'collection' or p->>'name_ar' is distinct from c.content->>'name_ar' or p->>'name_en' is distinct from c.content->>'name_en' or p->>'description_ar' is distinct from c.content->>'description_ar' or p->>'description_en' is distinct from c.content->>'description_en' then raise exception 'Factual content mismatch';end if;
  if coalesce(jsonb_array_length(p->'images'),0)<>0 then raise exception 'Media excluded from factual publication';end if;
  if p ? 'image_variants' then
   if jsonb_typeof(p->'image_variants') is distinct from 'array' then raise exception 'Media excluded from factual publication';end if;
   if jsonb_array_length(p->'image_variants')<>0 then raise exception 'Media excluded from factual publication';end if;
  end if;
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,search_text)
   values(c.candidate_id,p->>'slug',c.external_id,p->>'brand_slug',p->>'brand_name',p->>'brand_tier',p->>'category_slug',p->>'collection_slug',p->>'collection_ar',p->>'collection_en',p->>'name_ar',p->>'name_en',p->>'description_ar',p->>'description_en','[]','[]','facts_only',p->>'search_text')
   on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images='[]',image_variants='[]',media_state='facts_only',search_text=excluded.search_text,active=true;
  insert into jwl_internal.factual_publications(catalog_id,candidate_id,revision_hash,owner_instruction) values(c.candidate_id,c.candidate_id,c.revision_hash,owner_instruction) on conflict(catalog_id) do update set revision_hash=excluded.revision_hash,owner_instruction=excluded.owner_instruction,published_at=now();
  published:=published+1;
 end loop;
 return jsonb_build_object('published_factual_records',published,'published_images',0);
end $$;
revoke all on function public.jwl_publish_factual_batch(jsonb,text) from public,anon,authenticated;
grant execute on function public.jwl_publish_factual_batch(jsonb,text) to service_role;
create or replace function public.jwl_publish_candidate(candidate text, revision text, product jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare c jwl_internal.candidates; approval jwl_internal.publication_approvals; source jwl_internal.sources; responsive jsonb;
begin
  select * into c from jwl_internal.candidates where candidate_id=candidate;
  select * into approval from jwl_internal.publication_approvals where candidate_id=candidate and revision_hash=revision;
  select * into source from jwl_internal.sources where id=c.source_id;
  if c.candidate_id is null or c.revision_hash<>revision then raise exception 'Candidate revision changed'; end if;
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
  insert into public.jwl_catalog(id,slug,reference,brand_slug,brand_name,brand_tier,category_slug,collection_slug,collection_ar,collection_en,name_ar,name_en,description_ar,description_en,images,image_variants,media_state,search_text)
    values(candidate,product->>'slug',product->>'reference',product->>'brand_slug',product->>'brand_name',product->>'brand_tier',product->>'category_slug',product->>'collection_slug',product->>'collection_ar',product->>'collection_en',product->>'name_ar',product->>'name_en',product->>'description_ar',product->>'description_en',product->'images',responsive,'approved_media',product->>'search_text')
    on conflict(id) do update set slug=excluded.slug,reference=excluded.reference,brand_slug=excluded.brand_slug,brand_name=excluded.brand_name,brand_tier=excluded.brand_tier,category_slug=excluded.category_slug,collection_slug=excluded.collection_slug,collection_ar=excluded.collection_ar,collection_en=excluded.collection_en,name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,images=excluded.images,image_variants=excluded.image_variants,media_state='approved_media',search_text=excluded.search_text,active=true;
  insert into jwl_internal.published_revisions(catalog_id,candidate_id,revision_hash) values(candidate,candidate,revision)
    on conflict(catalog_id) do update set revision_hash=excluded.revision_hash;
  return candidate;
end $$;
revoke all on function public.jwl_publish_candidate(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.jwl_publish_candidate(text,text,jsonb) to service_role;

-- One public read snapshot replaces three network round trips on brand pages.
create or replace function public.jwl_brand_page(p_brand text, p_page integer default 1, p_page_size integer default 12)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with brand_rows as materialized (
    select id,slug,reference,brand_slug,category_slug,collection_slug,collection_ar,collection_en,
      name_ar,name_en,description_ar,description_en,images,image_variants,media_state,published_at
    from public.jwl_catalog
    where active and brand_slug = p_brand and p_brand ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ), limits as (
    select count(*)::integer as total, greatest(1,least(coalesce(p_page_size,12),48)) as page_size
    from brand_rows
  ), bounds as (
    select total,page_size,ceil(total::numeric/page_size)::integer as pages,
      greatest(1,least(coalesce(p_page,1),greatest(1,ceil(total::numeric/page_size)::integer))) as page
    from limits
  ), page_rows as (
    select b.* from brand_rows b order by published_at desc,id asc
    limit (select page_size from bounds)
    offset (select (page-1)*page_size from bounds)
  ), collections as (
    select distinct collection_slug,collection_ar,collection_en from brand_rows
    order by collection_en asc,collection_slug asc limit 200
  ), directory as (
    select distinct brand_slug,brand_name,brand_tier from public.jwl_catalog
    where active order by brand_slug asc,brand_name asc,brand_tier asc limit 500
  ), target_brand as (
    select brand_slug,brand_name,brand_tier from public.jwl_catalog
    where active and brand_slug = p_brand order by brand_name,brand_tier limit 1
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.published_at desc,p.id asc) from page_rows p),'[]'::jsonb),
    'total',b.total,'page',b.page,'pageSize',b.page_size,'pages',b.pages,
    'collections',coalesce((select jsonb_agg(to_jsonb(c) order by c.collection_en,c.collection_slug) from collections c),'[]'::jsonb),
    'brands',coalesce((select jsonb_agg(to_jsonb(d) order by d.brand_slug,d.brand_name,d.brand_tier) from directory d),'[]'::jsonb),
    'brand',(select to_jsonb(t) from target_brand t)
  ) from bounds b;
$$;
revoke all on function public.jwl_brand_page(text,integer,integer) from public;
grant execute on function public.jwl_brand_page(text,integer,integer) to anon,authenticated,service_role;

commit;
