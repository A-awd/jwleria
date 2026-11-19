begin;
set local lock_timeout='5s';
-- Existing mapping writer's lock order; catalog rows may be read, but their review snapshot cannot change mid-run.
lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions in share mode;
lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;

do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_base_variants()'::regprocedure) is distinct from '369f8b6b5f11bf0d5aadb0f2d0dd1353'
    or (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_product_variants()'::regprocedure) is distinct from 'ded00a48e61dea41919a606200782d5f' then
    raise exception 'LOEWE alias boundary changed: refresh the read-only derivation before applying';
  end if;
end $guard$;

create temporary table loewe_reviewed_public_before on commit drop as
select p.id,md5(to_jsonb(p)::text) signature from public.jwl_catalog p;

create temporary table loewe_reviewed_expected(ref text,id text,old_signature text,new_signature text) on commit drop;
insert into pg_temp.loewe_reviewed_expected values
  ('A510PLIX04-1100','6b5c03221650f20a1d834ac3e20a14d5dcf7499d87cd35f0973677b0e577460f','ab05bf295441a4c9f04bed30075eb7ed','f452e88f1f643816564c5b1c938f333c'),
  ('A510PLIX04-8160','40468c7c1cf62bc97556bf86679bafe51014d4a7f370001b0aa6e7c84017594b','5135a783f9062141296b173971ccb5bf','1f8e56ff58d5c69980b507081babca74'),
  ('A510PLIX04-8752','37375de965e722f321d8be9305eb475dc01855a7bc0e8f27b0f78fec45e4cfce','75c774536ff0233a50b07a9de43a0e03','61ba41508f80303dd2c844d532ab3bb8'),
  ('A510PLIX04-9190','55d7bce6d94d1e025d19af482d01e19893a91ccd5a8b5641f346726f643a7e92','801e56d8c7afbfaf1b0101a1b7c5afac','265e31c86020da24d63177170924a4ce'),
  ('A510PLSX01-1100','f0348cecdd18e29b8c018d8c3ce0a45f4710b8879f9075f362d9daf2a9c09df8','a99721c41e30ce6d442bf5fa918d73d8','25ac95ddcb5d3d7145efa8b8b2d88650'),
  ('A510PLSX01-3565','bb875efd31344e2b56205dce256603390f0395dfc2f644959d834897543120a2','db64fe92d11c71e29f12cb9ceb13290f','99702128b5c4ea3cb8e4a2144754ebe6'),
  ('A510PLSX01-7885','7fe90af382f5d511c9ea885be65bfa16a87ee55cfefdbeefb4136bc1080e9ee4','9bdb1dfe76b629259ae65ecfcbdf35f9','5dc0f49392cfb5245a7da6586a85df8e'),
  ('A510PLSX01-8752','9dc9410183aec1ad9e522521a57620a765e0b8ea234d896c6dd83e331ca2aa5d','b0791e825c8fec3b9d0087086258ea53','48bbe5963e873373595bbcbb78eed4ad'),
  ('A510PLSX01-9190','aa4f06f91583274ca83d541ddfbeaaa298f36664ccabcca3b44a2f251cf7093d','5ad01e32cda7b6a01e622e6fae177cbe','d44130a1f1bd114878b19466aaee8285'),
  ('A538H13X23-1769','732a68b4647003de5b4c00e29758c593d9e34d37ad9369a376b008052fc7a8f7','bc037b57f6c2b6fbb35f2be81206f51e','0bfb91fd1e079811de9ae98299cd06f6'),
  ('A538H13X23-3170','c09df6aeebbdd4c6a81584dd3b584c35cd79d1b0b7297f963111916d64a85aaf','7759660fe0b574c4c47496153d5cc8ec','8dccc5c40cb99975cc754e9bede1b8e3'),
  ('A538H13X23-5541','b118fdeb0d62e33197f4deac883fbab14f2028d4f45269bc89d0f931fcdc1787','d776c30a97097dc5a16c1f48f70c688e','8add08fb521d82c6b99afb0411ff3303'),
  ('A538H13X23-5544','dffbf4a4b7d23bf1822878e4963d642c09e010b816f1ecc7245cf9329a69c4d9','423e94fa81bd9fc15a8ada537892e6db','2564ce65863ac525f0ad2779fdbdbe22'),
  ('AANBAB1X01-0018','b0f72448dc73432a7f8de8532a4726ec1b96149012a034b45480869c13a6ed3f','f93b8a1d06f1573904f5d5d2162d2bde','948ad1a900bb27906792ed6626f1d657'),
  ('AANBAB1X01-1100','e52e7ad52b04fa47277502bc15604f3f09610bc3cf1dcca1c267cf2fcdb19cfe','d4f6f0d61e7bd97a742183780d1b73fc','dfd2839825514906bfb7dcb02b300ce5'),
  ('AANBAB1X01-7240','8c8843cdeb48e55fa2b0d1f71f3f9f513740c3343310f8b8fd291ec9310d2a21','622710eaadf1ce21d50c817b3b999d1d','644b718f6460f39c251f149b8abe93cc'),
  ('AANBAB1X01-7885','7f0dbb99221fe7646c944ebefbe2456346661e6b0ebcc9d05cccb6cbbc66cd1f','5aaff3ac76554ed073c3e5ce99ffe6df','4f1e568636ee82bff5643b3c0f1cacc1'),
  ('AANBAB1X01-8795','aa808ca0a38d94fea3764928765e6a8b0335305d18732f3775aa70df4bb5480b','c9166b45481a15f12201ebbd79ec23b9','4d46ac0e01774a951975be506f53c408'),
  ('AANBSPBX01-0018','0aeb7f670bf5904f65de3fbec71d4168579d48c3c6fe279e84ab3feb601a1cd8','fc8cc165b8a0e7b58b86411879804e42','7471f0f715caf43312b3b0d50fecc298'),
  ('AANBSPBX01-1100','71dc1b371e31d8df048431662ed22042c7ebf71dae01e6ae5c87d16af4beef3a','f3164c7b804c8c81f0a25cbdb680053d','4f4caf33297d1cf043f5b4bafb006372'),
  ('AANBSPBX01-7240','c97d70386e6cda3cb674adc33e7201e9871de4bea6ed88cbb2bac14549c349b3','4783189727e11ac20872bf8803ef256a','659f027e678fb333181d3e2ba60b0f1d'),
  ('AANBSPBX01-8795','50f4a6f0b2986375fe023a39d28b1306a5dd6d929de48b307c8bc76ed740df19','53d989c74e6b931a313ac7c40b4f157d','b52272ff3ff792496f14c228c5fdbe42'),
  ('BANBPCBX05-1100','6d4cd66c2be72d124206a3ba289d791be4a4b5f0091739819d48c31a86439a04','970b813bde2e2d62f12579e2aac83ac4','221f4e88ce997f91fa842011d7cb3793'),
  ('BANBPCBX05-3606','359cde655487adc62710025b79e0fd66a1b48e12b2feb706dc729040d2217cab','0e8a1ee8ae3eacd149fffbe6e6584eb8','95da16737fff9cd742f84587db1f621a'),
  ('BANBPCBX05-5544','e544f5eacfb1275d1ad2b2b9e1be48657aab654f23791dbbc1b4f4947cebb1b4','ef9b7abb336e62036492db5e4272aec7','5c9dd68d26a38c12112ac73897c5af33'),
  ('C510302X23-0362','9ade66bdf891e1402fe82dfcf3b5ccf5bdd7da495ca17444fa32adaab113c862','9aa598cf71c0939078c208f769e6683a','0f16fdbeaac464c98dd0c57ca8161b1b'),
  ('C510302X23-1100','9d95331e5996f4f2b51e390e62e732ac7b084be78fbcbee9ce092a0e1d6f8bda','ebcc318c89457d7e76f88df1d340becb','bdc23f0007e5b2a6daaf640947e6bd35'),
  ('C510302X23-1220','466b8a9be5975fadc07ca09699d265ff18668dbdb001e4fe772afc26ef561012','46529523598fea0267f7079dcdc0519e','39e9f112515179522397e0e3750d62ea'),
  ('C510302X23-3606','e6e6d75c037629ae41d2f187523701493f38dcfde19c2eb4eda858d14d93d030','cb98a9ad388f6c5140c8d76869f1a771','e5f6e9bb2d17f415be54a2c00a58f0b7');

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
      when max(reviewed.canonical_ar) is not null then 'reviewed_alias' end ar_source,
    min(g.noref_ar) shared_ar,min(g.noref_ar) filter (where g.unsized_ar<>g.noref_ar) sized_ar,
    min(substring(g.noref_ar from '^(.*\S)، [^،]+$')) base_ar, max(reviewed.canonical_ar) reviewed_ar
  from sized g join vary3 v on v.source_id=g.source_id and v.code=g.code
  left join reviewed_loewe_groups reviewed on g.source_id='loewe-official' and g.code=reviewed.code
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
    else jsonb_build_object('ar',case n.ar_source when 'shared' then n.shared_ar when 'shared_size' then n.sized_ar when 'reviewed_alias' then n.reviewed_ar else n.base_ar end,'en',n.en) end,
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

-- Review only these exact mapping deltas, from the captured old values to the captured new ones.
do $guard$
begin
  -- Fresh schema replays contain no mappings yet; the guarded aliases stay inactive until all reviewed rows exist.
  if not exists (select 1 from public.jwl_catalog) then return; end if;
  if exists (
    with derived as materialized (select * from jwl_internal.derive_product_variants()),
    changes as materialized (
      select coalesce(o.product_id,n.product_id) id,md5(jsonb_build_array(o.model_key,o.is_primary,o."position",o.model_name,o.options,o.specs,o.rule)::text) old_signature,md5(jsonb_build_array(n.model_key,n.is_primary,n."position",n.model_name,n.options,n.specs,n.rule)::text) new_signature
      from public.jwl_product_variants o full join derived n on n.product_id=o.product_id
      where (o.model_key,o.is_primary,o."position",o.model_name,o.options,o.specs,o.rule)
        is distinct from (n.model_key,n.is_primary,n."position",n.model_name,n.options,n.specs,n.rule)
    )
    select 1 from changes c full join pg_temp.loewe_reviewed_expected e using(id)
    left join public.jwl_catalog p on p.id=coalesce(c.id,e.id)
    where c.id is null or e.id is null or p.brand_slug is distinct from 'loewe' or p.reference is distinct from e.ref
      or c.old_signature is distinct from e.old_signature or c.new_signature is distinct from e.new_signature
  ) then raise exception 'LOEWE mapping deltas differ from the 29 reviewed results'; end if;
end $guard$;

select jwl_internal.apply_product_variants();
do $guard$
begin
  if not exists (select 1 from public.jwl_catalog) then return; end if;
  if exists (
    select 1 from pg_temp.loewe_reviewed_expected e
    left join public.jwl_product_variants v on v.product_id=e.id
    where v.product_id is null or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.new_signature
  ) then raise exception 'LOEWE derived mapping differs after rebuild'; end if;
end $guard$;

do $guard$
begin
  if exists (
    select 1 from pg_temp.loewe_reviewed_public_before b full join public.jwl_catalog p using(id)
    where b.id is null or p.id is null or b.signature is distinct from md5(to_jsonb(p)::text)
  ) then raise exception 'LOEWE alias mapping must preserve all public product rows exactly'; end if;
end $guard$;
commit;
