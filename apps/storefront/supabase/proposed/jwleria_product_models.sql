-- PROPOSED, NOT APPLIED. Applying it is a separate owner-approved production change; on approval it is
-- registered as a migration and moved to ../migrations with its registered version.
-- Additive models/variants layer (docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md). Every existing catalog row
-- stays one variant with its own URL; nothing existing is renamed, rewritten or deleted. Creating these
-- objects maps nothing: the mapping is written only by jwl_internal.apply_product_variants().
begin;

-- One row per public catalog row once mapped. A row without a mapping is shown as its own model.
-- model_key is '<source>:<model code>' for a grouped model and '<source>:ref:<reference>' for a single.
-- No model code contains ':', so a single can never take a grouped model's key.
create table public.jwl_product_variants (
  product_id text primary key references public.jwl_catalog(id) on delete cascade,
  model_key text not null check (model_key ~ '^[a-z0-9]+(-[a-z0-9]+)*:.' and length(model_key)<=200),
  is_primary boolean not null,
  position integer not null check (position >= 0),
  model_name jsonb not null check (jsonb_typeof(model_name)='object' and length(btrim(model_name->>'ar'))>0 and length(btrim(model_name->>'en'))>0),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options)='array'),
  specs jsonb not null default '[]'::jsonb check (jsonb_typeof(specs)='array'),
  rule text not null check (rule ~ '^[a-z0-9:-]+$'),
  mapped_at timestamptz not null default now(),
  -- The primary variant is the lowest position, so one primary per model follows from the unique position.
  check (is_primary = (position = 0)),
  unique (model_key, position)
);
create unique index jwl_product_variants_primary on public.jwl_product_variants (model_key) where is_primary;
alter table public.jwl_product_variants enable row level security;
create policy jwl_product_variants_public_read on public.jwl_product_variants for select to anon,authenticated
  using (exists (select 1 from public.jwl_catalog c where c.id=product_id and c.active));
revoke all on public.jwl_product_variants from public,anon,authenticated;
grant select on public.jwl_product_variants to anon,authenticated;
grant all on public.jwl_product_variants to service_role;

-- The private basis of each mapping: rule, compared facts and the exact candidate revision.
create table jwl_internal.variant_evidence (
  product_id text primary key references public.jwl_catalog(id) on delete cascade,
  model_key text not null,
  rule text not null,
  candidate_id text not null,
  revision_hash text not null,
  compared jsonb not null check (jsonb_typeof(compared)='object'),
  basis jsonb not null check (jsonb_typeof(basis)='object'),
  recorded_at timestamptz not null default now(),
  foreign key (candidate_id,revision_hash) references jwl_internal.candidate_revisions(candidate_id,revision_hash)
);
-- Reviewed Arabic for exact captured fact values. Trademarks and official names stay in Latin script;
-- a value missing here is displayed in its source English and marked value_lang "en".
create table jwl_internal.term_translations (
  kind text not null check (kind ~ '^[a-z_]+$'),
  term_en text not null check (length(btrim(term_en))>0 and term_en=btrim(term_en)),
  term_ar text not null check (length(btrim(term_ar))>0 and term_ar=btrim(term_ar)),
  primary key (kind,term_en)
);
alter table jwl_internal.variant_evidence enable row level security;
alter table jwl_internal.term_translations enable row level security;
revoke all on jwl_internal.variant_evidence,jwl_internal.term_translations from public,anon,authenticated;
grant all on jwl_internal.variant_evidence,jwl_internal.term_translations to service_role;

insert into jwl_internal.term_translations(kind,term_en,term_ar)
select k,t.en,t.ar from (values
  ('Oystersteel','Oystersteel'),('Platinum','بلاتين'),('RLX titanium','تيتانيوم RLX'),
  ('18 ct Everose gold','ذهب Everose عيار 18'),('18 ct white gold','ذهب أبيض عيار 18'),('18 ct yellow gold','ذهب أصفر عيار 18'),
  ('Everose Rolesor - combination of Oystersteel and Everose gold','Everose Rolesor - مزيج من Oystersteel وذهب Everose'),
  ('Yellow Rolesor - combination of Oystersteel and yellow gold','Yellow Rolesor - مزيج من Oystersteel والذهب الأصفر'),
  ('White Rolesor - combination of Oystersteel and white gold','White Rolesor - مزيج من Oystersteel والذهب الأبيض'),
  ('Rolesium - combination of Oystersteel and platinum','Rolesium - مزيج من Oystersteel والبلاتين')
) t(en,ar) cross join unnest(array['material','bracelet_material']) k
union all select 'bracelet_material',en,ar from (values
  ('Flexible metal blades overmoulded with high-performance elastomer','شفرات معدنية مرنة مكسوّة بإلاستومر عالي الأداء'),
  ('Matt black alligator leather','جلد أليغيتور أسود غير لامع'),('Matt brown alligator leather','جلد أليغيتور بني غير لامع')
) t(en,ar)
union all select 'bracelet_type',en,ar from (values
  ('Oyster, three-piece solid links','Oyster، حلقات صلبة من ثلاث قطع'),('Jubilee, five-piece links','Jubilee، حلقات من خمس قطع'),
  ('Flat Jubilee, five-piece solid links','Jubilee مسطّح، حلقات صلبة من خمس قطع'),
  ('President, semi-circular three-piece links','President، حلقات نصف دائرية من ثلاث قطع'),
  ('President, three-piece solid links, set with 596 brilliant-cut diamonds','President، حلقات صلبة من ثلاث قطع، مرصّع بـ 596 ماسة بقطع البريليانت'),
  ('Diamond-set President','President مرصّع بالألماس'),('Settimo, seven-piece solid links','Settimo، حلقات صلبة من سبع قطع'),
  ('Oysterflex','Oysterflex'),('Leather strap','حزام جلدي')
) t(en,ar)
union all select 'movement',en,ar from (values
  ('Perpetual, mechanical, self-winding','Perpetual، ميكانيكية، ذاتية التعبئة'),
  ('Perpetual, mechanical chronograph, self-winding','Perpetual، حركة كرونوغراف ميكانيكية، ذاتية التعبئة'),
  ('Perpetual, mechanical, self-winding, GMT function','Perpetual، ميكانيكية، ذاتية التعبئة، وظيفة GMT'),
  ('Perpetual, mechanical, self-winding, dual time zones, annual calendar','Perpetual، ميكانيكية، ذاتية التعبئة، منطقتان زمنيتان، تقويم سنوي'),
  ('Automatic','أوتوماتيكية'),('Quartz','كوارتز'),('Manual winding','تعبئة يدوية')
) t(en,ar)
union all select 'color',en,ar from (values
  ('Black','أسود'),('White','أبيض'),('Blue','أزرق'),('Green','أخضر'),('Pink','وردي'),('Beige','بيج'),('Silver','فضي'),
  ('Chocolate','شوكولاتي'),('Chocolate set with diamonds','شوكولاتي مرصّع بالألماس'),('Lavender','خزامي'),('Pistachio','فستقي'),
  ('Royal blue','أزرق ملكي'),('Med blue','أزرق متوسط'),('Mint green','أخضر نعناعي'),('Olive green','أخضر زيتوني'),
  ('Olive green set with diamonds','أخضر زيتوني مرصّع بالألماس'),('Dark grey','رمادي داكن'),('Dark grey set with diamonds','رمادي داكن مرصّع بالألماس'),
  ('Blue-green','أزرق مخضرّ'),('Blue-green set with diamonds','أزرق مخضرّ مرصّع بالألماس'),
  ('Turquoise blue','أزرق فيروزي'),('Turquoise blue and black','أزرق فيروزي وأسود'),('Turquoise blue set with diamonds','أزرق فيروزي مرصّع بالألماس'),
  ('Ice blue','أزرق جليدي'),('Ice blue set with diamonds','أزرق جليدي مرصّع بالألماس'),
  ('Ice blue, honeycomb motif','أزرق جليدي بنقشة خلية النحل'),('Ice blue, honeycomb motif set with diamonds','أزرق جليدي بنقشة خلية النحل مرصّع بالألماس'),
  ('Ice blue, rice-grain motif','أزرق جليدي بنقشة حبات الأرز'),
  ('Ice blue, chestnut brown counter rings','أزرق جليدي، حلقات عدادات بنية كستنائية'),
  ('Ice blue, chestnut brown counter rings set with diamonds','أزرق جليدي، حلقات عدادات بنية كستنائية، مرصّع بالألماس'),
  ('Bright black','أسود لامع'),('Bright black set with diamonds','أسود لامع مرصّع بالألماس'),('Bright blue','أزرق لامع'),
  ('Bright blue set with diamonds','أزرق لامع مرصّع بالألماس'),('Bright green','أخضر لامع'),('Bright green set with diamonds','أخضر لامع مرصّع بالألماس'),
  ('Bright green and golden','أخضر لامع وذهبي اللون'),('Bright black and golden set with diamonds','أسود لامع وذهبي اللون مرصّع بالألماس'),
  ('Bright black and steel','أسود لامع وفولاذي'),('Bright black and steel set with diamonds','أسود لامع وفولاذي مرصّع بالألماس'),
  ('Bright black and Sundust','أسود لامع وSundust'),('Bright black and Sundust set with diamonds','أسود لامع وSundust مرصّع بالألماس'),
  ('Bright chocolate and black','شوكولاتي لامع وأسود'),('Intense black','أسود داكن'),('Intense black and champagne-colour','أسود داكن وبلون الشمبانيا'),
  ('Intense white','أبيض ناصع'),('Intense white, honeycomb motif','أبيض ناصع بنقشة خلية النحل'),
  ('Intense white, honeycomb motif set with diamonds','أبيض ناصع بنقشة خلية النحل مرصّع بالألماس'),
  ('Black, golden counter rings','أسود، حلقات عدادات ذهبية اللون'),('Black, steel counter rings','أسود، حلقات عدادات فولاذية'),
  ('White, black counter rings','أبيض، حلقات عدادات سوداء'),('White, golden counter rings','أبيض، حلقات عدادات ذهبية اللون'),
  ('Golden, black counter rings','ذهبي اللون، حلقات عدادات سوداء'),
  ('Golden, bright black counter rings set with diamonds','ذهبي اللون، حلقات عدادات سوداء لامعة، مرصّع بالألماس'),
  ('Steel, bright black counter rings set with diamonds','فولاذي، حلقات عدادات سوداء لامعة، مرصّع بالألماس'),
  ('Sundust, bright black counter rings set with diamonds','Sundust، حلقات عدادات سوداء لامعة، مرصّع بالألماس'),
  ('Golden and bright black','ذهبي اللون وأسود لامع'),('Golden set with diamonds','ذهبي اللون مرصّع بالألماس'),
  ('Steel and bright black','فولاذي وأسود لامع'),('Sundust','Sundust'),('Sundust and bright black','Sundust وأسود لامع'),
  ('Sundust set with diamonds','Sundust مرصّع بالألماس'),('D-blue','D-blue'),
  ('Blue ombré','أزرق متدرّج'),('Blue ombré set with diamonds','أزرق متدرّج مرصّع بالألماس'),('Brown ombré','بني متدرّج'),
  ('Brown ombré set with diamonds','بني متدرّج مرصّع بالألماس'),('Green ombré','أخضر متدرّج'),('Green ombré set with diamonds','أخضر متدرّج مرصّع بالألماس'),
  ('Red ombré set with diamonds','أحمر متدرّج مرصّع بالألماس'),('Slate ombré','أردوازي متدرّج'),
  ('Slate','أردوازي'),('Slate set with diamonds','أردوازي مرصّع بالألماس'),('Silver set with diamonds','فضي مرصّع بالألماس'),
  ('Pink set with diamonds','وردي مرصّع بالألماس'),('Aubergine set with diamonds','باذنجاني مرصّع بالألماس'),
  ('Champagne-colour','بلون الشمبانيا'),('Champagne-colour set with diamonds','بلون الشمبانيا مرصّع بالألماس'),
  ('White mother-of-pearl set with diamonds','صدف أبيض مرصّع بالألماس'),('Black mother-of-pearl set with diamonds','صدف أسود مرصّع بالألماس'),
  ('Black and white mother-of-pearl set with diamonds','صدف أسود وأبيض مرصّع بالألماس'),
  ('White and black mother-of-pearl set with diamonds','صدف أبيض وأسود مرصّع بالألماس'),
  ('Diamond-paved','مرصوف بالألماس'),('Paved with diamonds and sapphires','مرصوف بالألماس والياقوت الأزرق'),
  ('Gold-leaf design','بتصميم رقائق الذهب'),('Green ceramic','سيراميك أخضر'),('Blue stone','حجر أزرق'),('Green stone','حجر أخضر'),
  ('Brown stone set with diamonds','حجر بني مرصّع بالألماس'),('Green aventurine set with diamonds','أفينتورين أخضر مرصّع بالألماس'),
  ('Light green aventurine','أفينتورين أخضر فاتح'),('Carnelian set with diamonds','عقيق أحمر مرصّع بالألماس'),
  ('Onyx set with diamonds','أونيكس مرصّع بالألماس'),('Pink opal set with diamonds','أوبال وردي مرصّع بالألماس'),
  ('Eisenkiesel set with diamonds','Eisenkiesel مرصّع بالألماس'),('Meteorite and black','نيزكي وأسود'),('Meteorite set with diamonds','نيزكي مرصّع بالألماس'),
  ('Multicoloured, Jubilee motif','متعدد الألوان بنقشة Jubilee'),
  ('Navy','كحلي'),('Brown','بني'),('Red','أحمر'),('Grey','رمادي'),('Yellow','أصفر'),('Orange','برتقالي'),('Burgundy','عنابي'),
  ('Ivory','عاجي'),('Gold','ذهبي'),('Olive','زيتوني'),('Cognac','كونياك'),('Mocha','موكا'),('Paper','ورقي'),('Pebble','حصوي'),
  ('Fawn','بني فاتح'),('Strawberry','فراولة')
) t(en,ar);

-- Source-unit measures only; numbers, separators and units are never converted.
create function jwl_internal.arabic_measure(value text) returns text
language sql immutable security invoker set search_path='' as $$
  select case
    when value ~ '^[0-9]+([.,][0-9]+)?( x [0-9]+([.,][0-9]+)?)* (mm|cm|in)$'
      then left(value,length(value)-length(substring(value from '[a-z]+$')))||case substring(value from '[a-z]+$') when 'mm' then 'مم' when 'cm' then 'سم' else 'إنش' end
    -- From 11 to 99 hours the counted noun stays singular in Arabic; other counts are left untranslated.
    when value ~ '^Approximately [1-9][0-9] hours$' and substring(value from '[0-9]+')::integer>=11
      then 'حوالي '||substring(value from '[0-9]+')||' ساعة'
    -- The counted noun follows the last two digits, as the storefront's counts do: 3-10 plural, 11-99
    -- accusative singular, otherwise singular (100 متر, 330 قدمًا, 50 مترًا, 3 أمتار).
    when value ~ '^Waterproof to [0-9][0-9,]* metres / [0-9][0-9,]* feet(, helium escape valve)?$'
      then 'مقاومة للماء حتى عمق '||m||' '||case when m100 between 3 and 10 then 'أمتار' when m100>=11 then 'مترًا' else 'متر' end
        ||' / '||f||' '||case when f100 between 3 and 10 then 'أقدام' when f100>=11 then 'قدمًا' else 'قدم' end
        ||case when value like '%, helium escape valve' then '، مع صمام لتصريف الهيليوم' else '' end
  end
  from (select substring(value from '^Waterproof to ([0-9][0-9,]*) metres') m,substring(value from ' / ([0-9][0-9,]*) feet') f) n
  cross join lateral (select right(replace(n.m,',',''),2)::integer m100,right(replace(n.f,',',''),2)::integer f100) d
$$;
revoke all on function jwl_internal.arabic_measure(text) from public,anon,authenticated;
grant execute on function jwl_internal.arabic_measure(text) to service_role;

-- Read-only and deterministic: computes the complete mapping and its private evidence from the active
-- public rows and the candidate revisions they were published from. It writes nothing.
create function jwl_internal.derive_product_variants()
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
revoke all on function jwl_internal.derive_product_variants() from public,anon,authenticated;
grant execute on function jwl_internal.derive_product_variants() to service_role;

-- The coordinator's single reviewable write: replaces the whole mapping from the derivation in one
-- transaction and returns its counts. Any invalid model aborts it with the previous mapping intact.
create function jwl_internal.apply_product_variants()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare derived jsonb; invalid text; result jsonb;
begin
  lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions in share mode;
  lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;
  select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into derived from jwl_internal.derive_product_variants() d;
  select x.model_key into invalid from jsonb_to_recordset(derived) x(model_key text,is_primary boolean,"position" integer,model_name jsonb,rule text)
    group by x.model_key
    having count(*) filter (where x.is_primary)<>1 or min(x.position)<>0 or max(x.position)<>count(*)-1 or count(distinct x.model_name)<>1 or count(distinct x.rule)<>1
      or (count(*)>1 and bool_or(x.rule like 'single:%'))
    order by x.model_key limit 1;
  if invalid is not null then raise exception 'Derived model % is inconsistent', invalid; end if;
  delete from jwl_internal.variant_evidence where product_id is not null;
  delete from public.jwl_product_variants where product_id is not null;
  insert into public.jwl_product_variants(product_id,model_key,is_primary,position,model_name,options,specs,rule)
    select x.product_id,x.model_key,x.is_primary,x.position,x.model_name,x.options,x.specs,x.rule
    from jsonb_to_recordset(derived) x(product_id text,model_key text,is_primary boolean,"position" integer,model_name jsonb,options jsonb,specs jsonb,rule text);
  insert into jwl_internal.variant_evidence(product_id,model_key,rule,candidate_id,revision_hash,compared,basis)
    select x.product_id,x.model_key,x.rule,x.candidate_id,x.revision_hash,x.compared,x.basis
    from jsonb_to_recordset(derived) x(product_id text,model_key text,rule text,candidate_id text,revision_hash text,compared jsonb,basis jsonb)
    where x.candidate_id is not null;
  select jsonb_build_object(
    'variants',count(*),'models',count(distinct x.model_key),
    'grouped_models',count(distinct x.model_key) filter (where x.rule not like 'single:%'),
    'grouped_variants',count(*) filter (where x.rule not like 'single:%'),
    'single_models',count(*) filter (where x.rule like 'single:%'),
    'evidence_rows',(select count(*) from jwl_internal.variant_evidence),
    'rules',(select jsonb_object_agg(r.rule,r.n) from (select y.rule,count(*) n from jsonb_to_recordset(derived) y(rule text) group by y.rule) r))
    into result from jsonb_to_recordset(derived) x(model_key text,rule text);
  return result;
end $$;
revoke all on function jwl_internal.apply_product_variants() from public,anon,authenticated;
grant execute on function jwl_internal.apply_product_variants() to service_role;

-- A changed candidate revision unmaps its row (its specs came from the old revision); the row is shown
-- as its own model until the next mapping run. Withdrawals never need the mapping and are never blocked.
create function jwl_internal.unmap_changed_variant() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  delete from jwl_internal.variant_evidence where product_id=new.candidate_id;
  delete from public.jwl_product_variants where product_id=new.candidate_id;
  return new;
end $$;
revoke all on function jwl_internal.unmap_changed_variant() from public,anon,authenticated;
create trigger jwl_variant_revision_unmap after update of revision_hash on jwl_internal.candidates
  for each row when (old.revision_hash is distinct from new.revision_hash) execute function jwl_internal.unmap_changed_variant();

-- One card per model: the first visible variant of each model plus every unmapped row. A withdrawn
-- primary hands the card to the next visible variant; search covers every visible variant's text.
create view public.jwl_catalog_models with (security_invoker=true) as
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
  where w.model_key=v.model_key and w.position<v.position));
revoke all on public.jwl_catalog_models from public,anon,authenticated;
grant select on public.jwl_catalog_models to anon,authenticated,service_role;

-- Search keeps one card per model but shows the variant the term found: the first visible variant (lowest
-- position) whose own text contains the term, else the card's own row. A visitor who types an exact
-- reference sees and opens that reference. Model fields (key, name, count, options) stay the model's, and
-- PostgREST applies the listing's filters, order and range to the result as it does to the view.
create function public.jwl_catalog_models_search(p_term text) returns setof public.jwl_catalog_models
language sql stable security invoker set search_path='' as $$
  select h.id,h.slug,h.reference,h.brand_slug,h.brand_name,h.brand_tier,h.category_slug,h.collection_slug,h.collection_ar,h.collection_en,
    h.name_ar,h.name_en,h.images,m.search_text,h.published_at,h.active,h.description_ar,h.description_en,h.media_state,h.image_variants,h.collection_kind,
    m.model_key,m.model_name,m.variant_count,m.options_summary
  from public.jwl_catalog_models m
  cross join lateral (
    select c.* from public.jwl_catalog c left join public.jwl_product_variants w on w.product_id=c.id
    where c.active and ((m.model_key is null and c.id=m.id) or w.model_key=m.model_key)
    order by c.search_text ilike '%'||left(coalesce(p_term,''),200)||'%' desc,w.position nulls first,c.id
    limit 1
  ) h
  where m.search_text ilike '%'||left(coalesce(p_term,''),200)||'%';
$$;
revoke all on function public.jwl_catalog_models_search(text) from public;
grant execute on function public.jwl_catalog_models_search(text) to anon,authenticated,service_role;

-- Any variant slug gives its whole model in one round trip: at most 60 visible variants ordered by
-- position, always including the requested one. The first visible variant is the primary.
create function public.jwl_product_model(p_slug text) returns jsonb
language sql stable security invoker set search_path='' as $$
  with target as (
    select c.id,v.model_key,coalesce(v.model_name,jsonb_build_object('ar',c.name_ar,'en',c.name_en)) model_name
    from public.jwl_catalog c left join public.jwl_product_variants v on v.product_id=c.id
    where c.active and c.slug=p_slug and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ), members as (
    select c.id,c.slug,c.reference,c.brand_slug,c.category_slug,c.collection_slug,c.collection_kind,c.collection_ar,c.collection_en,
      c.name_ar,c.name_en,c.description_ar,c.description_en,c.images,c.image_variants,c.media_state,c.published_at,
      v.options,v.specs,v.position
    from target t join public.jwl_product_variants v on v.model_key=t.model_key join public.jwl_catalog c on c.id=v.product_id and c.active
    union all
    select c.id,c.slug,c.reference,c.brand_slug,c.category_slug,c.collection_slug,c.collection_kind,c.collection_ar,c.collection_en,
      c.name_ar,c.name_en,c.description_ar,c.description_en,c.images,c.image_variants,c.media_state,c.published_at,'[]'::jsonb,'[]'::jsonb,0
    from target t join public.jwl_catalog c on c.id=t.id where t.model_key is null
  ), bounded as (
    select m.* from members m,target t order by m.id=t.id desc,m.position,m.reference collate "C",m.id limit 60
  ), ordered as (
    select b.*,row_number() over (order by b.position,b.reference collate "C",b.id)=1 is_primary from bounded b
  )
  select jsonb_build_object(
    'product',(select to_jsonb(o) from ordered o where o.id=t.id),
    'model_key',t.model_key,'model_name',t.model_name,
    'variant_count',(select count(*) from members),
    'variants',(select jsonb_agg(to_jsonb(o) order by o.position,o.reference collate "C",o.id) from ordered o)
  ) from target t;
$$;
revoke all on function public.jwl_product_model(text) from public;
grant execute on function public.jwl_product_model(text) to anon,authenticated,service_role;

-- Collapsed counterpart of jwl_brand_page: same arguments and envelope; items are model cards.
create function public.jwl_brand_models_page(p_brand text, p_page integer default 1, p_page_size integer default 12)
returns jsonb language sql stable security invoker set search_path='' as $$
  with brand_rows as materialized (
    select id,slug,reference,brand_slug,category_slug,collection_slug,collection_ar,collection_en,collection_kind,
      name_ar,name_en,description_ar,description_en,images,image_variants,media_state,published_at,
      model_key,model_name,variant_count,options_summary
    from public.jwl_catalog_models
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
    select distinct collection_slug,collection_ar,collection_en from brand_rows where collection_kind='collection'
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
revoke all on function public.jwl_brand_models_page(text,integer,integer) from public;
grant execute on function public.jwl_brand_models_page(text,integer,integer) to anon,authenticated,service_role;

commit;
