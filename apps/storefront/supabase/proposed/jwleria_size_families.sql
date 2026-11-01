-- PROPOSED, not applied: size families (decision 0017). Additive and reversible:
-- 1. The reviewed base derivation is kept unchanged as jwl_internal.derive_base_variants(). A new
--    derive_product_variants() merges whole base models into one model only where the source itself states each size
--    and the design identity matches exactly; everything else keeps its base mapping, with the reason recorded.
-- 2. A listing card shows the model's photographed variant when one exists, so a card image is always the exact
--    photograph of the variant it links to.
-- 3. public.jwl_product_model_v2(slug): the addressed variant in full, every visible variant of its model as a light
--    link (never cut to 60), a compact per-size table and the model's representative photograph.
-- Nothing is regrouped until jwl_internal.apply_product_variants() runs. Rollback: jwleria_size_families.rollback.sql.
begin;

alter function jwl_internal.derive_product_variants() rename to derive_base_variants;

insert into jwl_internal.term_translations(kind,term_en,term_ar) values
  ('size','Nano','نانو'),('size','Micro','مايكرو'),('size','Mini','ميني'),('size','Small','صغير'),('size','Medium','متوسط'),('size','Large','كبير');

-- Read-only and deterministic, like the base derivation it builds on; it writes nothing.
create function jwl_internal.derive_product_variants()
returns table(product_id text,model_key text,is_primary boolean,"position" integer,model_name jsonb,options jsonb,specs jsonb,rule text,
  candidate_id text,revision_hash text,compared jsonb,basis jsonb)
language sql stable security invoker set search_path='' as $$
with base as materialized (
  select d.* from jwl_internal.derive_base_variants() d
), base_models as (
  select b.model_key,count(*) n from base b group by b.model_key
), rows as materialized (
  -- Only a cleanly mapped row can join a size family: a grouped model, or a single with nothing wrong. Facts come
  -- from the base specs, which hold only the exact published revision's facts.
  select b.product_id id,b.model_key bkey,b.rule brule,b."position" bpos,b.model_name bname,b.specs,
    p.reference collate "C" reference,p.category_slug,p.collection_slug,p.name_en,p.name_ar,k.source_id,k.content->>'source_description' sd,
    sp.diameter,sp.diameter_ar,sp.material,sp.colour_en,sp.colour_ar
  from base b join public.jwl_catalog p on p.id=b.product_id join jwl_internal.candidates k on k.candidate_id=b.product_id
  cross join lateral (select max(s->'value'->>'en') filter (where s->>'kind'='diameter') diameter,max(s->'value'->>'ar') filter (where s->>'kind'='diameter') diameter_ar,
      max(s->'value'->>'en') filter (where s->>'kind'='material') material,
      max(s->'value'->>'en') filter (where s->>'kind' in ('colour','dial')) colour_en,max(s->'value'->>'ar') filter (where s->>'kind' in ('colour','dial')) colour_ar
    from jsonb_array_elements(b.specs) s) sp
  where b.rule not like 'single:%' or b.rule in ('single:only-variant','single:no-linking-evidence')
), named as (
  -- Names without the reference and, for a single, without a recorded colour tail, as the base rules strip them.
  select r.*,
    case when r.colour_en is not null and lower(right(x.noref_en,length(r.colour_en)+3)) in (lower(' — '||r.colour_en),lower(' – '||r.colour_en),lower(' - '||r.colour_en))
      then left(x.noref_en,length(x.noref_en)-length(r.colour_en)-3) else x.noref_en end core_en,
    case when r.brule not like 'single:%' then r.bname->>'ar'
      when r.colour_ar is not null and right(x.noref_ar,length(r.colour_ar)+2)='، '||r.colour_ar then left(x.noref_ar,length(x.noref_ar)-length(r.colour_ar)-2)
      else x.noref_ar end core_ar
  from rows r cross join lateral (select
    case when length(r.name_en)>length(r.reference) and right(r.name_en,length(r.reference))=r.reference then rtrim(left(r.name_en,length(r.name_en)-length(r.reference)),' -–—:,') else r.name_en end noref_en,
    case when length(r.name_ar)>length(r.reference) and right(r.name_ar,length(r.reference))=r.reference then rtrim(left(r.name_ar,length(r.name_ar)-length(r.reference)),' -–—:,،') else r.name_ar end noref_ar) x
), sized as (
  -- What each source states. A regexp_match that finds nothing still yields a row (NULL), so each branch requires a
  -- match. Rolex: the case diameter fact, the model line without its size, and the case type, case material and bezel
  -- that the source description of the exact reference states.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size' size_kind,n.diameter size_en,n.diameter size_label,n.diameter_ar size_ar,
    split_part(n.diameter,' ',1)::numeric size_rank,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[4],m[5],m[6]) design,nm[1]||' watch: '||nm[3] neutral_en,
    btrim(regexp_replace(case when n.diameter_ar is not null and right(n.core_ar,length(n.diameter_ar)+2)='، '||n.diameter_ar
      then left(n.core_ar,length(n.core_ar)-length(n.diameter_ar)-2) else n.core_ar end,' '||m[3]||'(?=$|،)','')) neutral_ar
  from named n
  cross join lateral regexp_match(n.sd,'^Discover the (.+?) ref\. (\S+) on Rolex\.com\. ([0-9]+) mm (.+?) case in (.+?), (.+?) bezel, (.+?) dial\. (.+?) bracelet in (.+)$') m
  cross join lateral regexp_match(n.core_en,'^(.+) ([0-9]+) watch: (.+)$') nm
  where n.source_id='rolex-official' and m is not null and nm is not null and m[2]=n.reference and n.diameter=m[3]||' mm' and nm[2]=m[3]
  union all
  -- LOEWE: a leading size word in the official name; the rest of the name and the material must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[1],m[1],t.term_ar,
    array_position(array['Nano','Micro','Mini','Small','Medium','Large','XL'],m[1]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[2],n.material),upper(left(m[2],1))||substr(m[2],2),null
  from named n cross join lateral regexp_match(n.core_en,'^(Nano|Micro|Mini|Small|Medium|Large|XL) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=m[1]
  where n.source_id='loewe-official' and m is not null
  union all
  -- Longchamp: the size letter between the line and the item type.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[2],m[2],null,
    array_position(array['XXS','XS','S','M','L','XL','XXL'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(.+) (XXS|XS|S|M|L|XL|XXL) (.+)$') m
  where n.source_id='longchamp-official' and m is not null
  union all
  -- Prada: a size word inside a named line ("Prada Galleria small ..."). Prada records no colour names, so the
  -- reference's material and colour codes must match as well.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,initcap(m[2]),initcap(m[2]),t.term_ar,
    array_position(array['nano','micro','mini','small','medium','large'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material,split_part(n.reference,'_',2),split_part(n.reference,'_',3)),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(Prada [^ ]+(?: [^ ]+)*?) (nano|micro|mini|small|medium|large) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=initcap(m[2])
  where n.source_id='prada-official' and m is not null and n.reference ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+(_|$)'
  union all
  -- Cartier and Van Cleef & Arpels: the maker's "<size> model" in both names; the rest of the name and the source
  -- description (its materials), without that phrase, must match. This is the maker's model size, not a fit size.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'model_size',lower(m[2])||' model',upper(left(m[2],1))||lower(substr(m[2],2))||' model',
    substring(n.core_ar from '، (الموديل [^،]+)'),
    case lower(m[2]) when 'extra small' then 1 when 'extra-small' then 1 when 'mini' then 2 when 'small' then 3 when 'medium' then 4 when 'classic' then 4 when 'large' then 5 else 6 end,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],coalesce(m[3],''),btrim(regexp_replace(coalesce(n.sd,''),', '||m[2]||' model','','i'))),m[1]||coalesce(m[3],''),
    regexp_replace(n.core_ar,'، الموديل [^،]+','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), (extra small|extra-small|mini|small|medium|classic|large|extra large|extra-large) model(, .+)?$','i') m
  where n.source_id in ('cartier-official','van-cleef-and-arpels-official') and m is not null and n.core_ar ~ '، الموديل [^،]+'
  union all
  -- Van Cleef & Arpels watches: "<name>, NN mm"; the description without that diameter must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size',m[2]||' mm',m[2]||' mm',jwl_internal.arabic_measure(m[2]||' mm'),m[2]::numeric,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],btrim(regexp_replace(coalesce(n.sd,''),'\m'||m[2]||' mm\M','','g'))),m[1],
    regexp_replace(n.core_ar,'، '||m[2]||' مم$','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), ([0-9]+) mm$') m
  where n.source_id='van-cleef-and-arpels-official' and m is not null
), arabic as (
  -- Bag and leather-goods names: the size phrase or adjective is removed from the Arabic base name.
  select s.*,coalesce(s.neutral_ar,btrim(regexp_replace(regexp_replace(s.core_ar,'، مقاس [^،]+',''),' (صغيرة|صغير|كبيرة|كبير|متوسطة|متوسط|ميني|نانو|مايكرو)( جداً)?(?=،|$)',''))) nar
  from sized s
), per_model as (
  select bkey,count(*) parsed,count(distinct (design,size_en)) shapes from arabic group by bkey
), complete as (
  -- A base model joins only whole: every member parsed exactly once, all to the same design and size.
  select a.* from arabic a join per_model pm on pm.bkey=a.bkey join base_models bm on bm.model_key=a.bkey where bm.n=pm.parsed and pm.shapes=1
), per_size as (
  select source_id,design,size_en,count(distinct bkey) n from complete group by 1,2,3
), designs as (
  select c.source_id,c.design,count(distinct c.size_en) sizes,bool_and(p.n=1) one_per_size,count(distinct c.nar) ar_names,count(distinct c.neutral_en) en_names
  from complete c join per_size p using(source_id,design,size_en) group by 1,2
), members as (
  -- A family: one design, two or more sizes, exactly one base model per size, one English and one Arabic name.
  select c.* from complete c join designs d using(source_id,design) where d.sizes>1 and d.one_per_size and d.ar_names=1 and d.en_names=1
), option_cells as (
  -- The family's other options: each recorded option fact of the source that varies within it (as in the base rules).
  select m.id,m.source_id,m.design,u.e->>'kind' kind,u.e->'label' label,u.e->'value' value,u.e->>'value_lang' value_lang,(u.e->'value'->>'en') collate "C" en,u.ord
  from members m join base b on b.product_id=m.id cross join lateral jsonb_array_elements(b.specs) with ordinality u(e,ord)
  where u.e->>'kind' = any(case m.source_id when 'rolex-official' then array['dial','bracelet','bracelet_material']
    when 'loewe-official' then array['colour'] when 'longchamp-official' then array['colour'] else array[]::text[] end)
), varying as (
  select source_id,design,kind from option_cells group by 1,2,3 having count(distinct en)>1
), need as (
  select source_id,design,count(*) n from varying group by 1,2
), have as (
  select o.id,count(*) n,string_agg(o.en,' | ' order by o.ord) vals from option_cells o join varying v using(source_id,design,kind) group by o.id
), checked as (
  select m.*,coalesce(nd.n,0) need_n,coalesce(h.n,0) have_n,m.size_en||' | '||coalesce(h.vals,'') tuple
  from members m left join need nd using(source_id,design) left join have h on h.id=m.id
), unresolved as (
  -- Every member records each varying option, and no two members carry the same size and options.
  select source_id,design from checked group by 1,2 having bool_or(have_n<>need_n) or count(*)<>count(distinct tuple)
), grouped as (
  select c.*,(row_number() over (partition by c.source_id,c.design order by c.size_rank,c.size_en,c.bpos,c.reference)-1)::integer pos,d.sizes n_sizes
  from checked c join designs d using(source_id,design) where not exists(select 1 from unresolved u where u.source_id=c.source_id and u.design=c.design)
), cells as (
  select o.*,btrim(regexp_replace(lower(o.en),'[^a-z0-9]+','-','g'),'-') slug
  from option_cells o join varying v using(source_id,design,kind) join grouped g on g.id=o.id
), keyed as (
  -- Two different values with the same slug get a hash suffix so every key stays unique.
  select c.*,min(c.en) over w<>max(c.en) over w shared from cells c window w as (partition by c.source_id,c.design,c.kind,c.slug)
), opts as (
  select k.id,jsonb_agg(jsonb_build_object('kind',k.kind,'label',k.label,'value',k.value,
      'key',case when k.slug<>'' and not k.shared then k.slug when k.slug<>'' then k.slug||'-'||left(md5(k.en),8) else left(md5(k.en),12) end)
    ||case when k.value_lang is not null then jsonb_build_object('value_lang',k.value_lang) else '{}'::jsonb end order by k.ord) o
  from keyed k group by k.id
), family_rows as (
  select g.id product_id,g.source_id||':size:'||left(md5(g.design),16) model_key,g.pos=0 is_primary,g.pos "position",
    jsonb_build_object('ar',g.nar,'en',g.neutral_en) model_name,
    jsonb_build_array(jsonb_build_object('kind',g.size_kind,
        'label',case g.size_kind when 'case_size' then '{"ar":"قطر العلبة","en":"Case diameter"}'::jsonb when 'bag_size' then '{"ar":"مقاس الحقيبة","en":"Bag size"}'::jsonb
          when 'model_size' then '{"ar":"حجم الموديل","en":"Model size"}'::jsonb else '{"ar":"المقاس","en":"Size"}'::jsonb end,
        'value',jsonb_build_object('ar',coalesce(g.size_ar,g.size_label),'en',g.size_label),
        'key',btrim(regexp_replace(lower(g.size_en),'[^a-z0-9]+','-','g'),'-'))
      ||case when g.size_ar is null then '{"value_lang":"en"}'::jsonb else '{}'::jsonb end)||coalesce(op.o,'[]'::jsonb) options,
    b.specs,
    case g.source_id when 'rolex-official' then 'rolex-size-family' when 'loewe-official' then 'loewe-size-family' when 'longchamp-official' then 'longchamp-size-family'
      when 'prada-official' then 'prada-size-family' when 'cartier-official' then 'cartier-size-family' else 'van-cleef-size-family' end rule,
    b.candidate_id,b.revision_hash,
    b.compared||jsonb_build_object('size',g.size_en,'design',g.design) compared,
    jsonb_build_object('base_model_key',g.bkey,'base_rule',g.brule,'size_kind',g.size_kind,'family_sizes',g.n_sizes,'base',b.basis) basis
  from grouped g join base b on b.product_id=g.id left join opts op on op.id=g.id
), reasons as (
  -- Why a row that states a size was not grouped, kept in its private evidence for the coverage report.
  select a.id,case when c.id is null then 'incomplete-base-model' when d.sizes<2 then 'one-size' when not d.one_per_size then 'several-models-per-size'
      when d.ar_names>1 or d.en_names>1 then 'name-mismatch' else 'options-unresolved' end reason
  from arabic a left join complete c on c.id=a.id left join designs d on d.source_id=c.source_id and d.design=c.design
  where not exists(select 1 from family_rows f where f.product_id=a.id)
)
select f.* from family_rows f
union all
select b.product_id,b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule,b.candidate_id,b.revision_hash,b.compared,
  case when r.reason is null then b.basis else b.basis||jsonb_build_object('size_check',r.reason) end
from base b left join (select distinct on (id) id,reason from reasons order by id,reason) r on r.id=b.product_id
where not exists(select 1 from family_rows f where f.product_id=b.product_id)
$$;
revoke all on function jwl_internal.derive_product_variants() from public,anon,authenticated;
grant execute on function jwl_internal.derive_product_variants() to service_role;

-- One card per model, as before, but a model's card is its first visible photographed variant when it has one, so a
-- card image is always the exact photograph of the variant the card links to. Same columns as before.
create or replace view public.jwl_catalog_models with (security_invoker=true) as
select c.id,c.slug,c.reference,c.brand_slug,c.brand_name,c.brand_tier,c.category_slug,c.collection_slug,c.collection_ar,c.collection_en,
  c.name_ar,c.name_en,c.images,
  case when v.product_id is null then c.search_text else (select string_agg(m.search_text,' ' order by w.position) from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active where w.model_key=v.model_key) end search_text,
  c.published_at,c.active,c.description_ar,c.description_en,c.media_state,c.image_variants,c.collection_kind,
  v.model_key,coalesce(v.model_name,jsonb_build_object('ar',c.name_ar,'en',c.name_en)) model_name,
  case when v.product_id is null then 1 else (select count(*)::integer from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active where w.model_key=v.model_key) end variant_count,
  case when v.product_id is null then '{}'::jsonb else coalesce((select jsonb_object_agg(s.kind,s.n) from (
    select o->>'kind' kind,count(distinct o->>'key')::integer n from public.jwl_product_variants w
    join public.jwl_catalog m on m.id=w.product_id and m.active cross join lateral jsonb_array_elements(w.options) o
    where w.model_key=v.model_key group by 1 having count(distinct o->>'key')>1) s),'{}'::jsonb) end options_summary
from public.jwl_catalog c left join public.jwl_product_variants v on v.product_id=c.id
where c.active and (v.product_id is null or not exists(select 1 from public.jwl_product_variants w join public.jwl_catalog m on m.id=w.product_id and m.active
  where w.model_key=v.model_key and (jsonb_array_length(m.images)=0,w.position)<(jsonb_array_length(c.images)=0,v.position)));

-- Any variant slug gives its model in one bounded read. The addressed variant comes in full. Every visible variant of
-- the model comes as a light link (identity, options, whether it has a photograph), so a model never loses a size or a
-- colour to a variant cap. A compact per-size table lists only real sizes, with the facts that differ between them, and
-- the model's representative photograph is named when the addressed variant has none. Bounded by one model's rows.
create function public.jwl_product_model_v2(p_slug text) returns jsonb
language sql stable security invoker set search_path='' as $$
  with target as (
    select c.id,c.slug,c.reference,c.brand_slug,c.category_slug,c.collection_slug,c.collection_kind,c.collection_ar,c.collection_en,
      c.name_ar,c.name_en,c.description_ar,c.description_en,c.images,c.image_variants,c.media_state,c.published_at,
      v.model_key,coalesce(v.model_name,jsonb_build_object('ar',c.name_ar,'en',c.name_en)) model_name,
      coalesce(v.options,'[]'::jsonb) options,coalesce(v.specs,'[]'::jsonb) specs,coalesce(v.position,0) "position"
    from public.jwl_catalog c left join public.jwl_product_variants v on v.product_id=c.id
    where c.active and c.slug=p_slug and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ), members as (
    select c.id,c.slug,c.reference collate "C" reference,c.images,c.image_variants,v.options,v.specs,v."position",
      (select o from jsonb_array_elements(v.options) o where o->>'kind' in ('case_size','bag_size','size','model_size') limit 1) size_option
    from target t join public.jwl_product_variants v on v.model_key=t.model_key join public.jwl_catalog c on c.id=v.product_id and c.active
  ), ordered as (
    select m.*,row_number() over (order by m."position",m.reference,m.id) rn from members m
  ), size_rows as (
    select o.size_option->>'key' key,min(o.rn) first_rn,count(*)::integer variants,min(o.size_option::text)::jsonb opt
    from ordered o where o.size_option is not null group by 1
  ), size_specs as (
    select o.size_option->>'key' key,u.s,u.s->>'kind' kind,u.s->'value'->>'en' en,u.ord
    from ordered o cross join lateral jsonb_array_elements(o.specs) with ordinality u(s,ord) where o.size_option is not null
  ), size_kinds as (
    -- A fact is shown per size when every size records exactly one value for it and not all sizes agree.
    select x.kind,min(x.ord) ord from (select key,kind,count(distinct en) n,min(ord) ord from size_specs group by 1,2) x
    join (select kind,count(distinct en) d from size_specs group by 1) y on y.kind=x.kind
    group by x.kind,y.d having bool_and(x.n=1) and count(*)=(select count(*) from size_rows) and y.d>1
  ), size_options as (
    select o.size_option->>'key' key,e->>'kind' kind,count(distinct e->>'key')::integer n
    from ordered o cross join lateral jsonb_array_elements(o.options) e where o.size_option is not null and e->>'kind'<>o.size_option->>'kind' group by 1,2
  ), representative as (
    -- Only when the addressed variant has no photograph: the first photographed variant of its own size, else of the model.
    select o.slug,o.reference,o.size_option,o.images,o.image_variants,
      (o.size_option->>'key') is not distinct from (select (select x from jsonb_array_elements(t.options) x where x->>'kind' in ('case_size','bag_size','size','model_size') limit 1)->>'key' from target t) same_size
    from ordered o where jsonb_array_length(o.images)>0 and (select jsonb_array_length(t.images) from target t)=0
    order by 6 desc,o.rn limit 1
  )
  select jsonb_build_object(
    'product',(select to_jsonb(x) from (select t.id,t.slug,t.reference,t.brand_slug,t.category_slug,t.collection_slug,t.collection_kind,t.collection_ar,t.collection_en,
        t.name_ar,t.name_en,t.description_ar,t.description_en,t.images,t.image_variants,t.media_state,t.published_at,t.options,t.specs,t."position",
        coalesce((select o.rn=1 from ordered o where o.id=t.id),true) is_primary) x),
    'model_key',t.model_key,'model_name',t.model_name,
    'variant_count',(select count(*) from members),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'slug',o.slug,'reference',o.reference,'options',o.options,'position',o."position",
        'is_primary',o.rn=1,'has_image',jsonb_array_length(o.images)>0) order by o.rn) from ordered o where o.rn<=2000),'[]'::jsonb),
    'sizes',coalesce((select jsonb_agg(jsonb_build_object('key',r.key,'option',r.opt,'variant_count',r.variants,
        'facts',coalesce((select jsonb_agg(sp.s order by k.ord) from size_kinds k cross join lateral (select ss.s from size_specs ss where ss.key=r.key and ss.kind=k.kind limit 1) sp),'[]'::jsonb),
        'options',coalesce((select jsonb_object_agg(so.kind,so.n) from size_options so where so.key=r.key),'{}'::jsonb)) order by r.first_rn) from size_rows r),'[]'::jsonb),
    'representative',(select jsonb_build_object('slug',r.slug,'reference',r.reference,'size_option',r.size_option,'images',r.images,'image_variants',r.image_variants,'same_size',r.same_size) from representative r)
  ) from target t;
$$;
revoke all on function public.jwl_product_model_v2(text) from public;
grant execute on function public.jwl_product_model_v2(text) to anon,authenticated,service_role;

commit;
