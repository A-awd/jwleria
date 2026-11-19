begin;
set local lock_timeout='5s';
lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions in share mode;
lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;

do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_base_variants()'::regprocedure) is distinct from '3d4dbcaf2b6998f9732f1e9d822283cf'
    or (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_product_variants()'::regprocedure) is distinct from 'ded00a48e61dea41919a606200782d5f' then
    raise exception 'Cheval Longchamp mapping derivation has changed';
  end if;
end $guard$;

create temporary table cheval_expected(id text primary key,ref text,old_signature text,new_signature text) on commit drop;
insert into pg_temp.cheval_expected values
  ('4b89089c0676444d84612a3501aad988fde345b08e3858e6b5acfcc699019cf9','70203PVC001380','b636a97c739c20bb4f44e326577a0bec','bdc2dc718e8f802422b8db2f4a97e030'),
  ('e0a02c7cf0b5e4739001ac71db883f0f18c645d2f7860fce2be1388af3c3e363','70203PVC238380','03932a389de5709c6b3a8779dc7690a2','f1b727af2638a3176e9dc5a31dcd1940'),
  ('ae476048c26619c55a289235ac898dd730e562915efb917fec5a292918c30faf','70203PVC292380','c406b3a460fbd71c248d0ff1a65341ae','09c0664677be1450d5c890cd724ec1a6');

create temporary table cheval_before on commit drop as
select * from jwl_internal.derive_product_variants();

create or replace function jwl_internal.derive_base_variants()
returns table(product_id text,model_key text,is_primary boolean,"position" integer,model_name jsonb,options jsonb,specs jsonb,rule text,
  candidate_id text,revision_hash text,compared jsonb,basis jsonb)
language sql stable security invoker set search_path='' as $$
with rules(source_id,rule,code_pattern,consistency,option_facts) as (values
  -- Official model number: m126334-0001 -> 126334; letters stay part of it (126610LN differs from 126610LV).
  ('rolex-official','rolex-model-number','^m([0-9]+[A-Za-z]*)-[0-9]{4}$',array['diameter','material','movement','water_resistance','power_reserve'],array['color','bracelet_type','bracelet_material']),
  ('loewe-official','loewe-style-code','^([^:]+)-[0-9]{4}$',array['dimensions','material'],array['color']),
  ('longchamp-official','longchamp-model-code','^([A-Z0-9]{8})[A-Z0-9]{3}$',array['dimensions'],array['color','material']),
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
), reviewed_loewe_names(code,reference,id,revision_hash,name_ar,name_en,dimensions,material,collection_slug,category_slug,color,canonical_ar) as (values
    ('A510PLIX04','A510PLIX04-1100','6b5c03221650f20a1d834ac3e20a14d5dcf7499d87cd35f0973677b0e577460f','1a93a3548411b564bb555125bbdd23e309e06e09c852967ca823d39cb1a07c13','حقيبة بازِل ميني','Mini Featherlight Puzzle bag in nappa lambskin','17.5X12.5X7.5 cm','Featherlight nappa lambskin','puzzle','handbags','Black','حقيبة بازِل ميني'),
    ('A510PLIX04','A510PLIX04-8160','40468c7c1cf62bc97556bf86679bafe51014d4a7f370001b0aa6e7c84017594b','127157e763e5a894f09f338813a95f3205bd66f29e35543b20d697144986ddd5','حقيبة بازِل ميني','Mini Featherlight Puzzle bag in nappa lambskin','17.5X12.5X7.5 cm','Featherlight nappa lambskin','puzzle','handbags','Mustard','حقيبة بازِل ميني'),
    ('A510PLIX04','A510PLIX04-8752','37375de965e722f321d8be9305eb475dc01855a7bc0e8f27b0f78fec45e4cfce','51686deb6b5ccdedd67baeb6836dd93439023413f461cdac716ee4414aaf50cd','حقيبة بَزل فيذرلايت ميني من جلد ضأن نابا','Mini Featherlight Puzzle bag in nappa lambskin','17.5X12.5X7.5 cm','Featherlight nappa lambskin','puzzle','handbags','Dark Butter','حقيبة بازِل ميني'),
    ('A510PLIX04','A510PLIX04-9190','55d7bce6d94d1e025d19af482d01e19893a91ccd5a8b5641f346726f643a7e92','60f546b2a038e2b84b7a0a2422add5198d7041e3171084faaa0917249ee05e56','حقيبة بازِل ميني','Mini Featherlight Puzzle bag in nappa lambskin','17.5X12.5X7.5 cm','Featherlight nappa lambskin','puzzle','handbags','Blush','حقيبة بازِل ميني'),
    ('A510PLSX01','A510PLSX01-1100','f0348cecdd18e29b8c018d8c3ce0a45f4710b8879f9075f362d9daf2a9c09df8','7400034de9dc10f93a41792958596f8c16eb725aafb9016af99074089cdf2738','حقيبة بازِل صغيرة','Small Featherlight Puzzle bag in nappa lambskin','24X16.5X10.5 cm','Featherlight nappa lambskin','puzzle','handbags','Black','حقيبة بازِل صغيرة'),
    ('A510PLSX01','A510PLSX01-3565','bb875efd31344e2b56205dce256603390f0395dfc2f644959d834897543120a2','e40fb9f0e6184c74c1e458418604e26ac9521fd4c50ee03633bae2ec3d13a3cf','حقيبة بازِل صغيرة','Small Featherlight Puzzle bag in nappa lambskin','24X16.5X10.5 cm','Featherlight nappa lambskin','puzzle','handbags','Pecan','حقيبة بازِل صغيرة'),
    ('A510PLSX01','A510PLSX01-7885','7fe90af382f5d511c9ea885be65bfa16a87ee55cfefdbeefb4136bc1080e9ee4','11a748dae98c411415d39d005ecca72df6d96dd7a3b6c8cdc012aecf086fb4ea','حقيبة بازِل صغيرة','Small Featherlight Puzzle bag in nappa lambskin','24X16.5X10.5 cm','Featherlight nappa lambskin','puzzle','handbags','Burnt Red','حقيبة بازِل صغيرة'),
    ('A510PLSX01','A510PLSX01-8752','9dc9410183aec1ad9e522521a57620a765e0b8ea234d896c6dd83e331ca2aa5d','716746627f5b5d278702df45c3b872370c1c24626de3cebcef1f2b5b08ab51da','حقيبة بازِل صغيرة','Small Featherlight Puzzle bag in nappa lambskin','24X16.5X10.5 cm','Featherlight nappa lambskin','puzzle','handbags','Dark Butter','حقيبة بازِل صغيرة'),
    ('A510PLSX01','A510PLSX01-9190','aa4f06f91583274ca83d541ddfbeaaa298f36664ccabcca3b44a2f251cf7093d','5972d1a7348602aba4c00dae8c6b6c14b259066eca675d7f64393b2dde2f50ba','حقيبة بَزل فيذرلايت صغيرة من جلد ضأن نابا','Small Featherlight Puzzle bag in nappa lambskin','24X16.5X10.5 cm','Featherlight nappa lambskin','puzzle','handbags','Blush','حقيبة بازِل صغيرة'),
    ('A538H13X23','A538H13X23-1769','732a68b4647003de5b4c00e29758c593d9e34d37ad9369a376b008052fc7a8f7','69c3c5e64213ddce6fdb8e7467ef297d4bd3cc404021e67548fc055b59e4ad64','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم','Compact Hammock bag in soft grained calfskin','14.4X20.8X19.5 cm','Soft grained calf','hammock','handbags','Light Ghost','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم'),
    ('A538H13X23','A538H13X23-3170','c09df6aeebbdd4c6a81584dd3b584c35cd79d1b0b7297f963111916d64a85aaf','1b8a68d3ba38ad98ae066b08ddbeb5bca05e44a66d639cba7ac52f45b397ce13','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم','Compact Hammock bag in soft grained calfskin','14.4X20.8X19.5 cm','Soft grained calf','hammock','handbags','Taupe','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم'),
    ('A538H13X23','A538H13X23-5541','b118fdeb0d62e33197f4deac883fbab14f2028d4f45269bc89d0f931fcdc1787','93f01c5113ff2a28e88350c7453ed9beebb5eb06c477a783f7cf44633b744c9a','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم','Compact Hammock bag in soft grained calfskin','14.4X20.8X19.5 cm','Soft grained calf','hammock','handbags','Clay','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم'),
    ('A538H13X23','A538H13X23-5544','dffbf4a4b7d23bf1822878e4963d642c09e010b816f1ecc7245cf9329a69c4d9','2d4f60817412f65e277bbd0d65e9f4c867fd1011282d98cf4d0758a5f1769ea2','حقيبة هاموك','Compact Hammock bag in soft grained calfskin','14.4X20.8X19.5 cm','Soft grained calf','hammock','handbags','Deep Navy','حقيبة هاموك مدمجة من جلد عجل محبّب ناعم'),
    ('AANBAB1X01','AANBAB1X01-0018','b0f72448dc73432a7f8de8532a4726ec1b96149012a034b45480869c13a6ed3f','84a2cd979e2f4c85eedeee12b0763d08cad3d21e73cf9852531df60add040009','حقيبة Madrid متوسطة','Medium Madrid bag in supple calfskin','28.5X23X11 cm','Supple calfskin','madrid','handbags','Dark Chestnut','حقيبة Madrid متوسطة'),
    ('AANBAB1X01','AANBAB1X01-1100','e52e7ad52b04fa47277502bc15604f3f09610bc3cf1dcca1c267cf2fcdb19cfe','993e6bbbbfae5b7b5b0ae05e45a6b5f9a3ffda409e0a5797317140a1ee003123','حقيبة Madrid متوسطة','Medium Madrid bag in supple calfskin','28.5X23X11 cm','Supple calfskin','madrid','handbags','Black','حقيبة Madrid متوسطة'),
    ('AANBAB1X01','AANBAB1X01-7240','8c8843cdeb48e55fa2b0d1f71f3f9f513740c3343310f8b8fd291ec9310d2a21','5531fb9d4b884c6e1db09027f9a3f84c56685b4e25393535ff14558c3c6525bb','حقيبة Madrid متوسطة','Medium Madrid bag in supple calfskin','28.5X23X11 cm','Supple calfskin','madrid','handbags','Dark Burgundy','حقيبة Madrid متوسطة'),
    ('AANBAB1X01','AANBAB1X01-7885','7f0dbb99221fe7646c944ebefbe2456346661e6b0ebcc9d05cccb6cbbc66cd1f','ed7261a39638809ed100578cb9c0b03d07da747bf0a7bf12f88f4d7edc0f363d','حقيبة مدريد متوسطة من جلد عجل مرن','Medium Madrid bag in supple calfskin','28.5X23X11 cm','Supple calfskin','madrid','handbags','Burnt Red','حقيبة Madrid متوسطة'),
    ('AANBAB1X01','AANBAB1X01-8795','aa808ca0a38d94fea3764928765e6a8b0335305d18732f3775aa70df4bb5480b','853bb99bb031de8a9d374bf8833004b1aef277138ce26d81879cbc6a33ae455a','حقيبة Madrid متوسطة','Medium Madrid bag in supple calfskin','28.5X23X11 cm','Supple calfskin','madrid','handbags','Olive','حقيبة Madrid متوسطة'),
    ('BANBPCBX05','BANBPCBX05-1100','6d4cd66c2be72d124206a3ba289d791be4a4b5f0091739819d48c31a86439a04','d123ad19feb7a29031c28ef5d726a6e13aba917062561a35b5bec9a35576ed69','حقيبة ماسنجر Pebble، مقاس صغير، من جلد عجل ليّن ومحبّب','Small Pebble messenger bag in supple grained calfskin','20X12.5X6 cm','Supple grained calf','anagram-pebble','handbags','Black','حقيبة Anagram pebble صغيرة'),
    ('BANBPCBX05','BANBPCBX05-3606','359cde655487adc62710025b79e0fd66a1b48e12b2feb706dc729040d2217cab','263c2d7a9d16409b84e898e81d972e2fd245c96a7f03a5fc7fd7d022ab5b2fc4','حقيبة Anagram pebble صغيرة','Small Pebble messenger bag in supple grained calfskin','20X12.5X6 cm','Supple grained calf','anagram-pebble','handbags','Chocolate','حقيبة Anagram pebble صغيرة'),
    ('BANBPCBX05','BANBPCBX05-5544','e544f5eacfb1275d1ad2b2b9e1be48657aab654f23791dbbc1b4f4947cebb1b4','6889592925ded85a01d83160c9ded2de36f8fde79c2ba3c5042ce9ca98830805','حقيبة Anagram pebble صغيرة','Small Pebble messenger bag in supple grained calfskin','20X12.5X6 cm','Supple grained calf','anagram-pebble','handbags','Deep Navy','حقيبة Anagram pebble صغيرة'),
    ('C510302X23','C510302X23-0362','9ade66bdf891e1402fe82dfcf3b5ccf5bdd7da495ca17444fa32adaab113c862','cec320d6c9f25f00fe3e781e1f1871b8f8f103472a5848877e36b92b8f9f8fb2','محفظة بازِل','Puzzle bifold wallet in supple grained calfskin','11X9.9X1.8 cm','Supple grained calf','puzzle','leather-goods','Blue Grey','محفظة بازِل'),
    ('C510302X23','C510302X23-1100','9d95331e5996f4f2b51e390e62e732ac7b084be78fbcbee9ce092a0e1d6f8bda','22d99fac8b89b3c3d538d6471795e7d8a3323877d2aeb33445290eb6fbab64c3','محفظة بازِل','Puzzle bifold wallet in supple grained calfskin','11X9.9X1.8 cm','Supple grained calf','puzzle','leather-goods','Black','محفظة بازِل'),
    ('C510302X23','C510302X23-1220','466b8a9be5975fadc07ca09699d265ff18668dbdb001e4fe772afc26ef561012','da36f9240a949cceaa2d528d323c33d712b0f5cf29803af1581be7ed6f85ac1b','محفظة بَزل ثنائية الطي من جلد عجل محبّب مرن','Puzzle bifold wallet in supple grained calfskin','11X9.9X1.8 cm','Supple grained calf','puzzle','leather-goods','Dark Grey','محفظة بازِل'),
    ('C510302X23','C510302X23-3606','e6e6d75c037629ae41d2f187523701493f38dcfde19c2eb4eda858d14d93d030','68231c4dc31404e7612ee6900c243aa1ad9038357b58dbbb130f57f9eb9bf949','محفظة بازِل','Puzzle bifold wallet in supple grained calfskin','11X9.9X1.8 cm','Supple grained calf','puzzle','leather-goods','Chocolate','محفظة بازِل')
), reviewed_loewe_groups as (
  -- The independently checked titles are aliases only for these whole cohorts, never replacements for product copy.
  -- Existing identity, material, dimensions and unique-option rules must already have put every row in grouped.
  -- A new, changed, unbound, ambiguous, missing, or excluded row invalidates that code's entire reviewed cohort.
  select a.code,min(a.canonical_ar) canonical_ar
  from reviewed_loewe_names a
  left join grouped g on g.source_id='loewe-official' and g.code=a.code and g.id=a.id and g.reference=a.reference
    and g.revision_hash=a.revision_hash and g.name_ar=a.name_ar and g.name_en=a.name_en
    and g.category_slug=a.category_slug and g.collection_slug=a.collection_slug
    and g.f->>'dimensions'=a.dimensions and g.f->>'material'=a.material and g.f->>'color'=a.color
  group by a.code
  having count(*)=count(distinct g.id) and min(g.gsize)=count(*) and max(g.gsize)=count(*)
    and count(distinct a.canonical_ar)=1
), reviewed_rolex_names(reference,id,revision_hash,name_ar,name_en,eligible) as (values
    ('m278344rbr-0001','de803dd5210a55a2f9e4a91af063ecd6b4c73b6668b96d2441c37f682ea07aab','691deebb18891cb6d4e7cf580ac4771d5fc25b43b98e0333b4799f5acd874650','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0001',true),
    ('m278344rbr-0002','938154f62f9796815b23256f6e5ed6939b326ff4329b740ea6fb384bfdcfe67f','73a751cb2ae6b08c9c44b9bafb910fa1951cb3e86a5bd911cb17b414092c5ee4','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0002',true),
    ('m278344rbr-0005','86089706ed50c838a88152ec59017f5abe83eb3f25f67a8c83e5238b7456fe6e','c8e9a9542cbab68d37d2ec959869639ce523c26921289e153665e97c070d12f7','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0005',true),
    ('m278344rbr-0006','1d39fefb71946d036da7f2c8d06c55f46b61276d348cf58a0a934222aec243a2','ac6dce5d4b2127c9abd5ad0d5cc8750c43ece569e01750e89995a0c5ed5f5ed7','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0006',true),
    ('m278344rbr-0007','64508c1543fbf580548a40b7d13266d37c822ebc32cfa337512da878539355b1','5c78cfb796b6e138a4beac578a377730143a329465df6da53af245bd5dab5366','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0007',false),
    ('m278344rbr-0008','6c94f6ffa0d5b1d3c2060b4a771de41ffb9b60abcfdfbda8c87aeaf22795777a','2b2c566c4d46db64e279fa3fda19d69be5d358b86179d2d19ec682b8386d63df','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0008',false),
    ('m278344rbr-0011','816bd0c3a94c8eb326f19cc980c0fff77abe12a6e0ebe070f6f677ecd9bd00e0','f85f67c1ed1f4439446c573b56d14935eef58f4be22210ac511f8546d6fb1845','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0011',true),
    ('m278344rbr-0012','9ba6f994fdd5a5477e3e0afdd13852119fe0c5009beb951987367e89f9f0eaa7','d0333a759e99c706627f2540585d718154fe6c78f2d2b5100adca14e95ebb478','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0012',true),
    ('m278344rbr-0013','ee32d6150471c4a495f6b5ddead4630e6fe5119c5c701f5f4e45177a70eea741','f5d1cd9382a769a5a65eb2ce6f224681ea12e1a3e8bfb87d7f0ee64d7dbef7f5','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0013',true),
    ('m278344rbr-0014','dc15b9e33ac1d0c4c289d0d9ad50852350ac32737f6504878abe0cbab60cb3d5','d2ee99b591c6a2a4630863961899a5875662b5328771d2a5699d128ba0236bb3','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0014',true),
    ('m278344rbr-0015','97e0e1895fced51dacd6c092f3ec9d3c214751a0de924bee02f012b46dbb1b56','d31a788aae9abe43fb326ecc0f64fb5eb16297509e4b7f330264d42177359149','ساعة رولكس ديت جست، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0015',false),
    ('m278344rbr-0016','fe0258bae73bd0ea15c2ca303643f8706e9b235f0cfa02a8004fd403aa6a7e13','3d1bd53e06fca1e34143d79f2d5ca0a6cfb4395ff1520d32ff05823ff1771d21','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0016',false),
    ('m278344rbr-0017','00e066dfd1d3428bae355e5e8aff6697495b752d178ea377a30f3a1af94d0ccb','4b50d7b4aa149eeef15913f9b7f8d46484cf365d808d38812e22a828df3bf40d','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0017',false),
    ('m278344rbr-0018','f814400fdc31509df951c3d6a4466074be6113f08345cd4d9f4e01773eb47556','203d8c0d2f48b0b6a801ae3f30e22768f5ec1e1478f79b2b24995bcecdaa9a7c','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0018',false),
    ('m278344rbr-0019','8394dd85f4b4fe63d9af321737f84aa28cab3c3b2fef42fa9d0d10ae8abc992a','f8b2cb5dc3061aed93cf72723ef4eedc18b05978e48b445645fefdaf7d9dabc7','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0019',true),
    ('m278344rbr-0020','98c82fee87aa140534ece0c533b4952870ba9d04e82234d4c3b1a675a3807011','facbe1d0f139f747c213cdaf65579ce79181b97090da6fa011ae74a2a3027559','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0020',true),
    ('m278344rbr-0021','1827f7d585eee5c2be67de7304fb629131290c86bf7dca282ead4a0cc4477d2d','c4e443620d3d4f9ec5747f1b3625c8d6b14a65606524a3fa87c2c3150d658f49','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0021',false),
    ('m278344rbr-0022','a5e5fee6de0576540608774b3d5feff6b67cb9ed9d4b328c631d11217e5e1ccd','4193cd33c7e16243ee50bcc092b18394faec8ec969c4faacae58e6aab1348a9e','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0022',false),
    ('m278344rbr-0023','a21656c68df14a4f79ee356bc555636087a19bf40b43353a1cc0d65f63a7a5a2','a70d69fdca94f73c25f29c3913a052b23e16b29be455d80135caab99fafb918d','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0023',false),
    ('m278344rbr-0024','bee7ef6d36b9cf0c1130d58afc113c39ac48f243391a50097a72460d6af8509f','e45c43ff64140e51c96f3d0e4f32966830cbc260ec5145133e010bce365ba51c','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0024',false),
    ('m278344rbr-0025','0b606a3c4cf5252bcc49e842fd9329244b34af8e2a9981acd251da127c5a34db','4fc70ae33eb11c8db54bd469fd077b46dd02c91a06722cc9a59b3e275e1a896d','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0025',false),
    ('m278344rbr-0026','ad95ac5cba3b74c02d8ce65be9ebcf94e521c668a11b0503ff1f4ef7ac08623f','2c9e2455903ef72b65992a0596fac80dba1c9d7f62aa9a42412d95d59ee1c412','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0026',false),
    ('m278344rbr-0027','177d5ee7783e5905332e27aaa00a673cd6d49ae35c8bef1aefbe914b1da76324','e494fdb2bf48f2130f87d641198c4717aba05ddcc89f927a649c88607e66380c','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0027',true),
    ('m278344rbr-0028','949d5a03cf01c30d5f04016119cf148a5b51e7b5a97ba2c0f6b7f602f0e4dc21','584db5c7a2dceddf80ba47cf826a058365e68d89f8698ab6b951568cad2b9a9f','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0028',true),
    ('m278344rbr-0029','d740257c9148d8fd745be0d9b5c4255e34b4afc171d4b7fd669ce77ab8045833','aa38820cb77b26f99511cb4a929f245174477c58f5410796bcf553957aaea2da','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0029',false),
    ('m278344rbr-0030','632e83385574a6602fca1d63d885683d5f182b06bcd80ca7f832337c7a92daee','7c5cd51bb193d17f35ae3b47614db5dc48c8bed2c63b3c34135ecdae70d673e2','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0030',false),
    ('m278344rbr-0031','b1befddb29f42c4491ef8b33adf21d0392214345ba75f1393779ff8e68cd2ca9','980bd9c2e1b465c2e5d4fafdcf5d6950f7de138472643d9174545401747abbfc','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0031',true),
    ('m278344rbr-0032','e68490a5bb55015285611deb7ac5e36d6eb66836fbec7bae40aecc9c9cb42fec','4454aed51dcc558324cc5a991e81283f27edf9537f3174dfc97ed065bd239904','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0032',true),
    ('m278344rbr-0033','47e34c553c4d0ce836980ede605dbccf0f7f506d5967bab72821e7f34b4b7403','95a363a4c79c2710f9890fcc9c57537496c83799d5798e6549364ef9768d177e','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0033',false),
    ('m278344rbr-0034','920a4905e2b20e980e5490d7e97c05d71dd7fd3e814daa40446a5dca0d5ab561','57617fcef13b3ce486ebd86efca94eeee56ad3521de68d4c188e6d19d7c71de2','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0034',false),
    ('m278344rbr-0035','5798bd6b34866d35850255836daaffa42fd15efeba32b6f4254aad94ce85c371','1185fb1ff82935bbeba1cb94cfd674be06a402c7ec7702a0c158c46117859784','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0035',true),
    ('m278344rbr-0036','b0316c3592257a317e1de4e0098203e0435a14cca17c06a329b620270302a23a','fa809f4782b37f42653febc84657381bad4ffa76aa4289c28faf369ba532a963','ساعة رولكس ديت جست 31، 31 مم','Rolex Datejust 31 watch: Oystersteel and white gold - m278344rbr-0036',true)
), reviewed_rolex_group as (
  -- A display-only alias for this reviewed model; use the existing exact grouping and option rules.
  -- Pin all 32 source revisions and titles. Only the 16 proven unique configurations may participate.
  select '278344rbr'::text code, 'ساعة رولكس ديت جست، 31 مم'::text canonical_ar
  from reviewed_rolex_names a
  left join coded c on c.source_id='rolex-official' and c.code='278344rbr'
    and c.id=a.id and c.reference=a.reference and c.revision_hash=a.revision_hash
    and c.name_ar=a.name_ar and c.name_en=a.name_en
  left join grouped g on g.id=c.id
  having count(distinct c.id)=32 and min(c.gsize)=32 and max(c.gsize)=32
    and count(*) filter (where a.eligible and g.id is not null)=16
    and count(*) filter (where not a.eligible and g.id is not null)=0
), names as (
  -- Model-level Arabic name, always an existing name without its reference: identical names, the same
  -- name with or without the shared diameter, or one shared base whose only differing tail is each
  -- member's recorded colour. Any other difference may be a variant's colour or reference, so the
  -- group is not formed and its rows stay single (single:arabic-name-mismatch).
  select g.source_id,g.code,min(g.core_en) en,
    case when count(distinct g.noref_ar)=1 then 'shared'
      when count(distinct g.unsized_ar)=1 and bool_and(g.shown ? 'diameter') and count(distinct g.shown->'diameter'->>'ar')=1 then 'shared_size'
      when (v.kinds='{color}'::text[] or (g.source_id='longchamp-official' and v.kinds='{color,material}'::text[])) and count(distinct substring(g.noref_ar from '^(.*\S)، [^،]+$'))=1
        and bool_and(coalesce(substring(g.noref_ar from '^.*\S، ([^،]+)$')=g.shown->'color'->>'ar'
          or lower(substring(g.noref_ar from '^.*\S، ([^،]+)$'))=lower((g.shown->'color'->>'en') collate "C"),false))
        then 'colour_tail'
      when max(reviewed.canonical_ar) is not null then 'reviewed_alias'
      when max(rolex.canonical_ar) is not null then 'reviewed_rolex_alias' end ar_source,
    min(g.noref_ar) shared_ar,min(g.noref_ar) filter (where g.unsized_ar<>g.noref_ar) sized_ar,
    min(substring(g.noref_ar from '^(.*\S)، [^،]+$')) base_ar, max(reviewed.canonical_ar) reviewed_ar, max(rolex.canonical_ar) reviewed_rolex_ar
  from sized g join vary3 v on v.source_id=g.source_id and v.code=g.code
  left join reviewed_loewe_groups reviewed on g.source_id='loewe-official' and g.code=reviewed.code
  left join reviewed_rolex_group rolex on g.source_id='rolex-official' and g.code=rolex.code
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
    else jsonb_build_object('ar',case n.ar_source when 'shared' then n.shared_ar when 'shared_size' then n.sized_ar when 'reviewed_alias' then n.reviewed_ar when 'reviewed_rolex_alias' then n.reviewed_rolex_ar else n.base_ar end,'en',n.en) end,
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

create temporary table cheval_after on commit drop as
select * from jwl_internal.derive_product_variants();

do $guard$
begin
  if exists (
    with changes as (
      select coalesce(b.product_id,a.product_id) id,md5(jsonb_build_array(b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule)::text) old_signature,md5(jsonb_build_array(a.model_key,a.is_primary,a."position",a.model_name,a.options,a.specs,a.rule)::text) new_signature
      from pg_temp.cheval_before b full join pg_temp.cheval_after a using(product_id)
      where to_jsonb(b) is distinct from to_jsonb(a)
    )
    select 1 from changes c full join pg_temp.cheval_expected e using(id)
    left join public.jwl_catalog p on p.id=e.id
    left join public.jwl_product_variants v on v.product_id=e.id
    left join jwl_internal.variant_evidence ve on ve.product_id=e.id
    left join pg_temp.cheval_before b on b.product_id=e.id
    where c.id is null or e.id is null or p.brand_slug is distinct from 'longchamp' or p.category_slug is distinct from 'shoes' or p.reference is distinct from e.ref
      or c.old_signature is distinct from e.old_signature or c.new_signature is distinct from e.new_signature
      or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.old_signature
      or (ve.model_key,ve.rule,ve.candidate_id,ve.revision_hash,ve.compared,ve.basis)
        is distinct from (b.model_key,b.rule,b.candidate_id,b.revision_hash,b.compared,b.basis)
  ) then raise exception 'Cheval Longchamp boot drifted from the three reviewed mapping changes'; end if;
end $guard$;

-- Update exactly the reviewed mappings; independent recent catalog rows remain outside this migration.
update public.jwl_product_variants v
set model_key=a.model_key,is_primary=a.is_primary,position=a.position,model_name=a.model_name,options=a.options,specs=a.specs,rule=a.rule,mapped_at=now()
from pg_temp.cheval_expected e join pg_temp.cheval_after a on a.product_id=e.id
where v.product_id=e.id;
update jwl_internal.variant_evidence ve
set model_key=a.model_key,rule=a.rule,candidate_id=a.candidate_id,revision_hash=a.revision_hash,compared=a.compared,basis=a.basis,recorded_at=now()
from pg_temp.cheval_expected e join pg_temp.cheval_after a on a.product_id=e.id
where ve.product_id=e.id;

do $guard$
begin
  if exists (
    select 1 from pg_temp.cheval_expected e left join public.jwl_product_variants v on v.product_id=e.id
    where v.product_id is null or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.new_signature
  ) then raise exception 'Cheval Longchamp boot mapping differs after the update'; end if;
end $guard$;
commit;
