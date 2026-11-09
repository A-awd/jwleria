-- Rollback of jwleria_longchamp_material_option.sql: restores the base derivation applied by 20261028111829's
-- predecessor 20261028111013 (renamed derive_base_variants by 20261101133722) and rebuilds the derived variant tables.
begin;
create or replace function jwl_internal.derive_base_variants()
returns table(product_id text,model_key text,is_primary boolean,"position" integer,model_name jsonb,options jsonb,specs jsonb,rule text,
  candidate_id text,revision_hash text,compared jsonb,basis jsonb)
language sql stable security invoker set search_path='' as $$
with rules(source_id,rule,code_pattern,consistency,option_facts) as (values
  -- Official model number: m126334-0001 -> 126334; letters stay part of it (126610LN differs from 126610LV).
  ('rolex-official','rolex-model-number','^m([0-9]+[A-Za-z]*)-[0-9]{4}$',array['diameter','material','movement','water_resistance','power_reserve'],array['color','bracelet_type','bracelet_material']),
  ('loewe-official','loewe-style-code','^([^:]+)-[0-9]{4}$',array['dimensions','material'],array['color']),
  ('longchamp-official','longchamp-model-code','^([A-Z0-9]{8})[A-Z0-9]{3}$',array['dimensions','material'],array['color']),
  ('bottega-veneta-official','bottega-style-material','^([0-9]{6}[A-Z0-9]{5})[0-9]{4}$',array['material','leather_type'],array['color'])
), kinds(fact,source_id,kind,label_ar,label_en,ord) as (values
  ('diameter',null::text,'diameter','القطر','Diameter',10),('material',null,'material','المادة','Material',20),
  ('color','rolex-official','dial','الميناء','Dial',30),('color',null,'colour','اللون','Colour',30),
  ('bracelet_type',null,'bracelet','السوار','Bracelet',40),('bracelet_material',null,'bracelet_material','مادة السوار','Bracelet material',50),
  ('movement',null,'movement','آلية الحركة','Movement',60),('calibre',null,'calibre','العيار','Calibre',70),
  ('power_reserve',null,'power_reserve','احتياطي الطاقة','Power reserve',80),('water_resistance',null,'water_resistance','مقاومة الماء','Water resistance',90),
  ('dimensions',null,'dimensions','الأبعاد','Dimensions',100),('weight',null,'weight','الوزن','Weight',110),
  ('lining',null,'lining','البطانة','Lining',120),('closing',null,'closure','الإغلاق','Closure',130),
  ('metallic_hardware',null,'metallic_hardware','القطع المعدنية','Metallic hardware',140)
), base as materialized (
  select p.id,p.reference collate "C" reference,p.brand_slug,p.category_slug,p.collection_slug,p.collection_kind,p.collection_en,p.name_ar,p.name_en,
    c.source_id,c.candidate_id,c.revision_hash,coalesce(c.revision_hash in (f.revision_hash,r.revision_hash),false) bound,c.content->'facts' raw
  from public.jwl_catalog p
  left join jwl_internal.candidates c on c.candidate_id=p.id
  left join jwl_internal.factual_publications f on f.catalog_id=p.id
  left join jwl_internal.published_revisions r on r.catalog_id=p.id
  where p.active
), fact_values as (
  -- Only facts of the exact published revision; an encoded line break is whitespace, not content.
  select b.id,b.source_id,lower(e->>'key') fact,btrim(regexp_replace(replace(replace(e->>'value','&#10;',' '),'&#13;',' '),'\s+',' ','g')) collate "C" val
  from base b cross join lateral jsonb_array_elements(case when b.bound and jsonb_typeof(b.raw)='array' then b.raw else '[]'::jsonb end) e
  where jsonb_typeof(e->'key')='string' and jsonb_typeof(e->'value')='string'
), facts as (
  select id,source_id,fact,array_agg(distinct val order by val) vals,string_agg(distinct val,' | ' order by val) joined
  from fact_values where val<>'' group by id,source_id,fact
), translated as (
  select v.fact,v.val,coalesce(t.term_ar,jwl_internal.arabic_measure(v.val)) ar
  from (select distinct fact,val from fact_values) v left join jwl_internal.term_translations t on t.kind=v.fact and t.term_en=v.val
), display as (
  -- Arabic only when every value of the fact has a reviewed translation; otherwise the English text.
  select f.id,f.source_id,f.fact,f.joined,array_to_string(f.vals,', ') en,case when bool_and(t.ar is not null) then string_agg(t.ar,'، ' order by u.o) end ar
  from facts f cross join lateral unnest(f.vals) with ordinality u(v,o) left join translated t on t.fact=f.fact and t.val=u.v
  group by f.id,f.source_id,f.fact,f.vals,f.joined
), fact_maps as (
  -- One row per catalog row, joined once: a per-row lookup into the fact lists would be quadratic.
  select id,jsonb_object_agg(fact,joined) f,jsonb_object_agg(fact,jsonb_build_object('en',en,'ar',ar)) shown from display group by id
), catalog_rows as (
  select b.*,coalesce(m.f,'{}'::jsonb) f,coalesce(m.shown,'{}'::jsonb) shown,
    r.rule grule,r.consistency,r.option_facts,case when b.bound then substring(b.reference from r.code_pattern) end code
  from base b left join fact_maps m on m.id=b.id left join rules r on r.source_id=b.source_id
), stripped as (
  select x.*,
    case when x.f->>'color' is not null and lower(right(x.noref_en,length(x.f->>'color')+3)) in (lower(' — '||(x.f->>'color')),lower(' – '||(x.f->>'color')),lower(' - '||(x.f->>'color')))
      then left(x.noref_en,length(x.noref_en)-length(x.f->>'color')-3) else x.noref_en end core_en
  from (select r.*,
    case when length(r.name_en)>length(r.reference) and right(r.name_en,length(r.reference))=r.reference then rtrim(left(r.name_en,length(r.name_en)-length(r.reference)),' -–—:,') else r.name_en end noref_en,
    case when length(r.name_ar)>length(r.reference) and right(r.name_ar,length(r.reference))=r.reference then rtrim(left(r.name_ar,length(r.name_ar)-length(r.reference)),' -–—:,،') else r.name_ar end noref_ar
    from catalog_rows r) x
), coded as (
  select s.*,count(*) over (partition by s.source_id,s.code) gsize from stripped s where s.grule is not null and s.code is not null
), compared as (
  -- Identity and consistency facts of each member; a missing fact fails the comparison.
  select g.id,g.source_id,g.code,g.gsize,
    jsonb_build_object('brand',g.brand_slug,'category',g.category_slug,'collection',g.collection_slug,'collection_kind',g.collection_kind,'collection_name',g.collection_en,'name',g.core_en)
    ||coalesce((select jsonb_object_agg(k,g.f->k) from unnest(g.consistency) k),'{}'::jsonb) v
  from coded g
), mismatch as (
  select source_id,code,jsonb_agg(key order by key) keys from (
    select c.source_id,c.code,e.key from compared c cross join lateral jsonb_each(c.v) e where c.gsize>1
    group by 1,2,3 having count(distinct e.value)>1 or bool_or(e.value='null'::jsonb)) m
  group by 1,2
), members as (
  select g.* from coded g where g.gsize>1 and not exists(select 1 from mismatch m where m.source_id=g.source_id and m.code=g.code)
), vary1 as (
  select source_id,code,array_agg(o order by ord) kinds from (
    select m.source_id,m.code,u.o,u.ord from members m cross join lateral unnest(m.option_facts) with ordinality u(o,ord)
    group by 1,2,3,4 having count(distinct coalesce(m.f->>u.o,''))>1) x
  group by 1,2
), complete as (
  -- A member that does not record a varying option cannot be placed among the options.
  select m.* from members m left join vary1 v on v.source_id=m.source_id and v.code=m.code
  where not exists(select 1 from unnest(coalesce(v.kinds,'{}'::text[])) k where m.f->>k is null)
), vary2 as (
  select source_id,code,array_agg(o order by ord) kinds from (
    select m.source_id,m.code,u.o,u.ord from complete m cross join lateral unnest(m.option_facts) with ordinality u(o,ord)
    group by 1,2,3,4 having count(distinct m.f->>u.o)>1) x
  group by 1,2
), tupled as (
  select c.*,(select jsonb_agg(c.f->>k order by o) from unnest(v.kinds) with ordinality u(k,o)) tuple
  from complete c left join vary2 v on v.source_id=c.source_id and v.code=c.code
), unique_options as (
  -- Variants whose recorded options are identical cannot be told apart, so each stays its own model.
  select t.*,count(*) over (partition by t.source_id,t.code,t.tuple) dup from tupled t
), kept as (
  select u.*,count(*) over (partition by u.source_id,u.code) kept_n from unique_options u where u.dup=1
), grouped as (
  select k.*,row_number() over (partition by k.source_id,k.code order by k.reference,k.id)-1 pos from kept k where k.kept_n>1
), vary3 as (
  select source_id,code,array_agg(o order by ord) kinds from (
    select m.source_id,m.code,u.o,u.ord from grouped m cross join lateral unnest(m.option_facts) with ordinality u(o,ord)
    group by 1,2,3,4 having count(distinct m.f->>u.o)>1) x
  group by 1,2
), option_cells as (
  select x.*,btrim(regexp_replace(lower(x.en),'[^a-z0-9]+','-','g'),'-') slug from (
    select g.id,g.source_id,g.code,u.fact,u.o,(g.shown->u.fact->>'en') collate "C" en,g.shown->u.fact->>'ar' ar,l.kind,l.label_ar,l.label_en
    from grouped g join vary3 v on v.source_id=g.source_id and v.code=g.code
    cross join lateral unnest(v.kinds) with ordinality u(fact,o)
    cross join lateral (select k.kind,k.label_ar,k.label_en from kinds k where k.fact=u.fact and (k.source_id is null or k.source_id=g.source_id) order by k.source_id nulls last limit 1) l
    where g.shown ? u.fact) x
), keyed_cells as (
  -- Two different values with the same slug get a hash suffix so every key stays unique.
  select c.*,min(c.en) over w<>max(c.en) over w shared_slug from option_cells c window w as (partition by c.source_id,c.code,c.fact,c.slug)
), options as (
  select c.id,jsonb_agg(jsonb_build_object('kind',c.kind,'label',jsonb_build_object('ar',c.label_ar,'en',c.label_en),
      'value',jsonb_build_object('ar',coalesce(c.ar,c.en),'en',c.en),
      'key',case when c.slug<>'' and not c.shared_slug then c.slug when c.slug<>'' then c.slug||'-'||left(md5(c.en),8) else left(md5(c.en),12) end)
    ||case when c.ar is null then '{"value_lang":"en"}'::jsonb else '{}'::jsonb end order by c.o) o
  from keyed_cells c group by c.id
), sized as (
  -- A trailing "، <case diameter>" is model-level when every member records that same diameter.
  select g.*,case when g.shown ? 'diameter' and right(g.noref_ar,length(g.shown->'diameter'->>'ar')+2)='، '||(g.shown->'diameter'->>'ar')
    then left(g.noref_ar,length(g.noref_ar)-length(g.shown->'diameter'->>'ar')-2) else g.noref_ar end unsized_ar
  from grouped g
), names as (
  -- Model-level Arabic name, always an existing name without its reference: identical names, the same
  -- name with or without the shared diameter, or one shared base whose only differing tail is each
  -- member's recorded colour. Any other difference may be a variant's colour or reference, so the
  -- group is not formed and its rows stay single (single:arabic-name-mismatch).
  select g.source_id,g.code,min(g.core_en) en,
    case when count(distinct g.noref_ar)=1 then 'shared'
      when count(distinct g.unsized_ar)=1 and bool_and(g.shown ? 'diameter') and count(distinct g.shown->'diameter'->>'ar')=1 then 'shared_size'
      when v.kinds='{color}'::text[] and count(distinct substring(g.noref_ar from '^(.*\S)، [^،]+$'))=1
        and bool_and(coalesce(substring(g.noref_ar from '^.*\S، ([^،]+)$')=g.shown->'color'->>'ar'
          or lower(substring(g.noref_ar from '^.*\S، ([^،]+)$'))=lower((g.shown->'color'->>'en') collate "C"),false))
        then 'colour_tail' end ar_source,
    min(g.noref_ar) shared_ar,min(g.noref_ar) filter (where g.unsized_ar<>g.noref_ar) sized_ar,
    min(substring(g.noref_ar from '^(.*\S)، [^،]+$')) base_ar
  from sized g join vary3 v on v.source_id=g.source_id and v.code=g.code
  group by g.source_id,g.code,v.kinds
), specs as (
  select d.id,jsonb_agg(jsonb_build_object('kind',l.kind,'label',jsonb_build_object('ar',l.label_ar,'en',l.label_en),
      'value',jsonb_build_object('ar',coalesce(d.ar,d.en),'en',d.en))||case when d.ar is null then '{"value_lang":"en"}'::jsonb else '{}'::jsonb end order by l.ord) s
  from display d
  cross join lateral (select k.kind,k.label_ar,k.label_en,k.ord from kinds k where k.fact=d.fact and (k.source_id is null or k.source_id=d.source_id) order by k.source_id nulls last limit 1) l
  group by d.id
)
-- n is joined only for a group whose Arabic model name is established; any other row is a single.
select s.id,
  case when n.code is not null then s.source_id||':'||s.code else coalesce(s.source_id,'unbound')||':ref:'||s.reference end,
  coalesce(case when n.code is not null then g.pos end,0)=0,coalesce(case when n.code is not null then g.pos end,0)::integer,
  case when n.code is null then jsonb_build_object('ar',s.name_ar,'en',s.name_en)
    else jsonb_build_object('ar',case n.ar_source when 'shared' then n.shared_ar when 'shared_size' then n.sized_ar else n.base_ar end,'en',n.en) end,
  case when n.code is not null then coalesce(o.o,'[]'::jsonb) else '[]'::jsonb end,coalesce(sp.s,'[]'::jsonb),
  case when n.code is not null then s.grule
    when not s.bound then 'single:unbound-revision'
    when s.grule is null then 'single:no-linking-evidence'
    when s.code is null then 'single:unrecognised-reference'
    when m.keys is not null then 'single:inconsistent'
    when c.gsize=1 then 'single:only-variant'
    when cp.id is null then 'single:missing-option'
    when u.dup>1 then 'single:ambiguous-options'
    when g.id is not null then 'single:arabic-name-mismatch'
    else 'single:only-variant' end,
  s.candidate_id,s.revision_hash,coalesce(cmp.v,'{}'::jsonb),
  jsonb_strip_nulls(jsonb_build_object('model_code',s.code,'code_group_size',c.gsize,'mismatched',m.keys,'option_facts',to_jsonb(v3.kinds),
    'group_size',case when n.code is not null then g.kept_n end,'arabic_name',case when n.code is not null then n.ar_source when g.id is not null then 'unresolved' end))
from stripped s
left join coded c on c.id=s.id
left join compared cmp on cmp.id=s.id
left join mismatch m on m.source_id=s.source_id and m.code=s.code
left join complete cp on cp.id=s.id
left join unique_options u on u.id=s.id
left join grouped g on g.id=s.id
left join names n on g.id is not null and n.source_id=s.source_id and n.code=s.code and n.ar_source is not null
left join vary3 v3 on n.code is not null and v3.source_id=s.source_id and v3.code=s.code
left join options o on o.id=s.id
left join specs sp on sp.id=s.id
$$;
select jwl_internal.apply_product_variants();
commit;
