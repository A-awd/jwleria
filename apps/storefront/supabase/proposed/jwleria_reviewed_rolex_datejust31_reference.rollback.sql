begin;
set local lock_timeout='5s';
lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions in share mode;
lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;

do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_base_variants()'::regprocedure) is distinct from '3d4dbcaf2b6998f9732f1e9d822283cf'
    or (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_product_variants()'::regprocedure) is distinct from 'aef19cd868ca2ceecef5b50994cbe1f1' then
    raise exception 'Rolex option derivation changed; refresh exact review signatures';
  end if;
end $guard$;
create temporary table rolex_reference_expected(id text primary key,ref text,slug text,old_signature text,new_signature text) on commit drop;
insert into pg_temp.rolex_reference_expected values
  ('de803dd5210a55a2f9e4a91af063ecd6b4c73b6668b96d2441c37f682ea07aab','m278344rbr-0001','rolex-m278344rbr-0001-de803dd5','b3ffa674c2c1099553859c84855a1bfc','f00a99068311a99275d39860d9632b3b'),
  ('938154f62f9796815b23256f6e5ed6939b326ff4329b740ea6fb384bfdcfe67f','m278344rbr-0002','rolex-m278344rbr-0002-938154f6','cef4689678d8fa5ef609d5089ff361cc','3683beadc4b1e938d71584bc1bdf1760'),
  ('86089706ed50c838a88152ec59017f5abe83eb3f25f67a8c83e5238b7456fe6e','m278344rbr-0005','rolex-m278344rbr-0005-86089706','8d1f224f4f38e2f344c7fb7037c71103','8cfdcd542ba802eee6a112a4383ffdf9'),
  ('1d39fefb71946d036da7f2c8d06c55f46b61276d348cf58a0a934222aec243a2','m278344rbr-0006','rolex-m278344rbr-0006-1d39fefb','e3a3688d61a6dd6a1f116de614a3e6d1','361cf22c17a5164117429c22056de44c'),
  ('816bd0c3a94c8eb326f19cc980c0fff77abe12a6e0ebe070f6f677ecd9bd00e0','m278344rbr-0011','rolex-m278344rbr-0011-816bd0c3','dc362f6f200def3ade1eba77c3be73b8','76df5b91794a2737ce0ce5c3b9ec2183'),
  ('9ba6f994fdd5a5477e3e0afdd13852119fe0c5009beb951987367e89f9f0eaa7','m278344rbr-0012','rolex-m278344rbr-0012-9ba6f994','278bf263f84ae18600a0e4b864c058eb','63e56e3d37aa09dc13267dac1aac38f0'),
  ('ee32d6150471c4a495f6b5ddead4630e6fe5119c5c701f5f4e45177a70eea741','m278344rbr-0013','rolex-m278344rbr-0013-ee32d615','75f1200456e8674f7e2e4e5923990fa9','732235e0aac12784644db0ad49fa11b3'),
  ('dc15b9e33ac1d0c4c289d0d9ad50852350ac32737f6504878abe0cbab60cb3d5','m278344rbr-0014','rolex-m278344rbr-0014-dc15b9e3','24224f2c0764f67041646cd541fbd6d4','790611ba54fa58cc63939634ffcfc397'),
  ('8394dd85f4b4fe63d9af321737f84aa28cab3c3b2fef42fa9d0d10ae8abc992a','m278344rbr-0019','rolex-m278344rbr-0019','075831478706487ce46cb1281cd490db','ba9e56eb1bdd8db54d12eba820b125eb'),
  ('98c82fee87aa140534ece0c533b4952870ba9d04e82234d4c3b1a675a3807011','m278344rbr-0020','rolex-m278344rbr-0020','41929935fb8d69da63e88971666c11b1','d165dec78cd88bddc018d3c13f06d724'),
  ('177d5ee7783e5905332e27aaa00a673cd6d49ae35c8bef1aefbe914b1da76324','m278344rbr-0027','rolex-m278344rbr-0027','1ca66152ef7e0f65bdbfa021323d52a5','29eea9c3c38ddd20b27bc9120590d345'),
  ('949d5a03cf01c30d5f04016119cf148a5b51e7b5a97ba2c0f6b7f602f0e4dc21','m278344rbr-0028','rolex-m278344rbr-0028','67ce2827951d36b76d143ee4ec3a3c55','aa28be10631858f70d87c2c42b62408a'),
  ('b1befddb29f42c4491ef8b33adf21d0392214345ba75f1393779ff8e68cd2ca9','m278344rbr-0031','rolex-m278344rbr-0031','9d90ccddee44e2de4117f82d4597ae7b','ef9bafcd2a6fa1106f05263a33abd0c6'),
  ('e68490a5bb55015285611deb7ac5e36d6eb66836fbec7bae40aecc9c9cb42fec','m278344rbr-0032','rolex-m278344rbr-0032','efee7af7b66a3bab733c3720382d546c','8c1dfc340fb252155ce7c6251d926b71'),
  ('5798bd6b34866d35850255836daaffa42fd15efeba32b6f4254aad94ce85c371','m278344rbr-0035','rolex-m278344rbr-0035','066a859c04cfdc130a6c37e6ea58444d','9fad143f1dbae9d253fdaa8372a25516'),
  ('b0316c3592257a317e1de4e0098203e0435a14cca17c06a329b620270302a23a','m278344rbr-0036','rolex-m278344rbr-0036','ea90d8df34cf83efd9152ac688885304','e58930498de9f660063980d91d27729c'),
  ('64508c1543fbf580548a40b7d13266d37c822ebc32cfa337512da878539355b1','m278344rbr-0007','rolex-m278344rbr-0007-64508c15','440b73b6c7644e2f6b8c0479bd63b1e5','260980dbf46a4728b3d3c75e7c3d306e'),
  ('6c94f6ffa0d5b1d3c2060b4a771de41ffb9b60abcfdfbda8c87aeaf22795777a','m278344rbr-0008','rolex-m278344rbr-0008-6c94f6ff','e9bb369ec0fec08fe6c1810806449e3b','062dbd9970ec16da243e033ac4259110'),
  ('97e0e1895fced51dacd6c092f3ec9d3c214751a0de924bee02f012b46dbb1b56','m278344rbr-0015','rolex-m278344rbr-0015-97e0e189','7b00c1a8b494a2ea617db3dd75d52f14','4539d222c228489d07c0ed24387f188f'),
  ('fe0258bae73bd0ea15c2ca303643f8706e9b235f0cfa02a8004fd403aa6a7e13','m278344rbr-0016','rolex-m278344rbr-0016','e04011e2a779c325de4e2006efbf68ea','0184be3af588b87dbc7b2d7b15763af4'),
  ('00e066dfd1d3428bae355e5e8aff6697495b752d178ea377a30f3a1af94d0ccb','m278344rbr-0017','rolex-m278344rbr-0017','e6001e86711f7ee79a085173da3e7c8b','5dc9a0073a39905b3b510c30235021fa'),
  ('f814400fdc31509df951c3d6a4466074be6113f08345cd4d9f4e01773eb47556','m278344rbr-0018','rolex-m278344rbr-0018','34e0f65c54fb2d983febd5e582163d59','16aac4c6949ec7df18aff09f3fbf105c'),
  ('1827f7d585eee5c2be67de7304fb629131290c86bf7dca282ead4a0cc4477d2d','m278344rbr-0021','rolex-m278344rbr-0021','dff9289d93c76fbbdba5689543faff66','584224702a07d79f193fdc92c141de21'),
  ('a5e5fee6de0576540608774b3d5feff6b67cb9ed9d4b328c631d11217e5e1ccd','m278344rbr-0022','rolex-m278344rbr-0022','44fc2c6e58b157e6e43d8617e0ae4084','16c3531636e5152639b4e3aa62736585'),
  ('a21656c68df14a4f79ee356bc555636087a19bf40b43353a1cc0d65f63a7a5a2','m278344rbr-0023','rolex-m278344rbr-0023','4940d6709d9ec9b044c2bec9f940bf2b','7b1711f0ed79107416f9db9877ad7caf'),
  ('bee7ef6d36b9cf0c1130d58afc113c39ac48f243391a50097a72460d6af8509f','m278344rbr-0024','rolex-m278344rbr-0024','c1ad77d1bdc7c0c678a67c67c7c86e6b','3638adb2013e2e44bf3a1c03f8dcabaf'),
  ('0b606a3c4cf5252bcc49e842fd9329244b34af8e2a9981acd251da127c5a34db','m278344rbr-0025','rolex-m278344rbr-0025','66e44e23ede6d0a8cd648a18890c01d2','642b03cae1a2f6cb83efcab4db467636'),
  ('ad95ac5cba3b74c02d8ce65be9ebcf94e521c668a11b0503ff1f4ef7ac08623f','m278344rbr-0026','rolex-m278344rbr-0026','4a2535a4bdb83ade9a5bba6990affd30','81877b13bceff9e7cff6c2e6b04a6045'),
  ('d740257c9148d8fd745be0d9b5c4255e34b4afc171d4b7fd669ce77ab8045833','m278344rbr-0029','rolex-m278344rbr-0029','c849a653d43784233b5310042048641f','261c8f856bec183682390202d958777a'),
  ('632e83385574a6602fca1d63d885683d5f182b06bcd80ca7f832337c7a92daee','m278344rbr-0030','rolex-m278344rbr-0030','11b6e5121de1d45846051cae57eb31be','2b5094023bc3664e3d22bc03593a014a'),
  ('47e34c553c4d0ce836980ede605dbccf0f7f506d5967bab72821e7f34b4b7403','m278344rbr-0033','rolex-m278344rbr-0033','8adeffcd6d2abcb8ddbe34f509a5575b','b34ea6152446b17bceb256a0d2d5a95b'),
  ('920a4905e2b20e980e5490d7e97c05d71dd7fd3e814daa40446a5dca0d5ab561','m278344rbr-0034','rolex-m278344rbr-0034','3d77a5a273ccf99def790f84f695c596','547d6f7554f05c772e9d46a374db9789');
create temporary table rolex_reference_before on commit drop as
select * from jwl_internal.derive_product_variants();

create or replace function jwl_internal.derive_product_variants()
returns table(product_id text,model_key text,is_primary boolean,"position" integer,model_name jsonb,options jsonb,specs jsonb,rule text,
  candidate_id text,revision_hash text,compared jsonb,basis jsonb)
language sql stable security invoker set search_path='' as $$
with unchanged as materialized (
with original as materialized (
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
), requested(code, pinned_signature) as (values
  ('126300','dab0f3e56d78b5044dcf03297bbd6098'),
  ('126303','f6bd6014036bce8a1c5c2fb945759836'),
  ('128348rbr','f21d457004b950bfe2f4784c3aaf17ab'),
  ('128349rbr','fe0f8453c1e3c20945690cd231ca7529'),
  ('128395tbr','f63050937a3c6b2d744ebac491e23539'),
  ('128398tbr','643cb806a78bc47ec145ffde3160320d'),
  ('128399tbr','e8d82433255ce31c9cf3556ead8e198b'),
  ('228348rbr','a21320e3418271543dc895b8000b8ee8'),
  ('228398tbr','239b0daa793dc71bdb82aeccb0a60728'),
  ('278275','cd3537d02a2998086ab9c861bfccabc4'),
  ('278278','8d691c679d4834dc94e6839cf492424a'),
  ('278285rbr','ae9d1e1b1aff5d4ca6dd198299ada2d6'),
  ('278288rbr','21f79397b5ce0ee189e3e461989c9c83'),
  ('278289rbr','dbf50f869ca6a10a9dd76423b22b0302'),
  ('278341rbr','fc03d8ac7be45c591ebf13ca61721970'),
  ('278343rbr','222aebff9c36f425061d4c90371a662e'),
  ('279135rbr','1d2eb977e57af684078415533e957121'),
  ('279138rbr','c78ea3ff3f14a2ebc6757068afb668db'),
  ('279139rbr','a846b79c91be58c087162231c6087dd4'),
  ('279160','fe285449dedcaaa9e85fd53ebc53c910'),
  ('279161','bfe189e637a950d889428cdfa480d0cf'),
  ('279163','b01c0671a2bb0ef96bdcaaec426aa275'),
  ('279171','20282b467ae8996e93183ed097b34264'),
  ('279173','603d9034fac8b260c143a5eabd67e5f6'),
  ('279174','5d412a784840ea2d51a11485b576459a'),
  ('279175','1a06cce027055b4e83805f8a84a3f05d'),
  ('279178','e1ae38b62ccaf28fe51c750b3c84447d'),
  ('279381rbr','b7ae302d2af5c0c89726fbf3639d8e9a'),
  ('279383rbr','8b6582d8bf8219e811ef31bc4f0859e6'),
  ('279384rbr','72fd2ba8a2eae85a17ca4f1937ebed83')
), official as materialized (
  select d.*,p.reference,p.slug,q.code,q.pinned_signature,
    jsonb_build_array(p.id,p.reference,p.slug,p.name_ar,p.name_en,c.revision_hash,c.content->>'source_url',to_jsonb(d)) evidence
  from original d
  join public.jwl_catalog p on p.id=d.product_id
  join requested q on q.code=substring(p.reference from '^m([0-9a-z]+)-[0-9]{4}$')
  join jwl_internal.candidates c on c.candidate_id=p.id and c.revision_hash=d.revision_hash
  left join jwl_internal.factual_publications f on f.catalog_id=p.id
  left join jwl_internal.published_revisions r on r.catalog_id=p.id
  where p.active and p.brand_slug='rolex' and c.source_id='rolex-official'
    and c.revision_hash in (f.revision_hash,r.revision_hash)
    and c.external_id=p.reference
    and lower(c.content->>'source_url') ~ '^https://www[.]rolex[.]com/[^/]+/watches/[^/]+/m[0-9a-z]+-[0-9]{4}$'
    and regexp_replace(c.content->>'source_url','^.*/','')=p.reference
), cohorts as materialized (
  select code,count(*) n,count(*) filter(where rule='single:ambiguous-options') held,
    min(product_id) filter(where rule='rolex-model-number' and is_primary) primary_id,
    min(pinned_signature) pinned_signature,md5(jsonb_agg(evidence order by reference collate "C")::text) signature
  from official
  group by code
  having count(*) between 2 and 60
    and count(*) = count(*) filter(where rule='single:ambiguous-options' or (rule='rolex-model-number' and model_key='rolex-official:'||code))
    and count(*) filter(where rule='rolex-model-number' and is_primary)=1
    and count(*) filter(where rule='single:ambiguous-options')>0
    and count(distinct compared)=1
), selected as materialized (
  select o.*,g.n,g.primary_id,
    row_number() over(partition by o.code order by (o.product_id=g.primary_id) desc, (o.rule='rolex-model-number') desc, o."position", o.reference collate "C")::int-1 new_position
  from official o join cohorts g on g.code=o.code and g.signature=g.pinned_signature
), attributes as materialized (
  select s.product_id,s.code,j.spec,axis.ord,j.spec->>'kind' kind,j.spec->'value'->>'en' meaning
  from selected s
  cross join lateral jsonb_array_elements(s.specs) j(spec)
  join (values ('dial',1),('bracelet',2),('bracelet_material',3)) axis(kind,ord) on axis.kind=j.spec->>'kind'
), varying as (
  select code,kind from attributes group by code,kind having count(distinct meaning)>1
), original_keys as (
  select o.code,j.option->>'kind' kind,j.option->'value'->>'en' meaning,min(j.option->>'key') key
  from selected o cross join lateral jsonb_array_elements(o.options) j(option)
  where o.rule='rolex-model-number'
  group by 1,2,3
), built as (
  select a.product_id,jsonb_agg(a.spec||jsonb_build_object('key',coalesce(k.key,'source-'||md5(a.meaning))) order by a.ord) options
  from attributes a join varying v using(code,kind) left join original_keys k using(code,kind,meaning)
  group by a.product_id
), replacement as materialized (
  select s.product_id,'rolex-official:'||s.code model_key,s.product_id=s.primary_id is_primary,s.new_position "position",
    p.model_name,coalesce(b.options,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'kind','reference','key',s.reference,'label',jsonb_build_object('ar','المرجع','en','Reference'),
      'value',jsonb_build_object('ar',s.reference,'en',s.reference),'value_lang','en')) options,
    s.specs,'rolex-model-number'::text rule,s.candidate_id,s.revision_hash,s.compared,
    s.basis||jsonb_build_object('exact_reference_option',true,'reviewed_model_code',s.code,'group_size',s.n) basis
  from selected s join selected p on p.product_id=s.primary_id
  left join built b on b.product_id=s.product_id
), proposed as (
  select * from replacement
  union all
  select o.* from original o where not exists(select 1 from replacement r where r.product_id=o.product_id)
)
select * from proposed
), reviewed_options(source_id,kind,term_en,term_ar) as (values
  ('loewe-official','colour','Dark Grey','رمادي داكن'),
  ('loewe-official','colour','Dark Burgundy','عنابي داكن'),
  ('loewe-official','colour','Deep Navy','كحلي داكن'),
  ('loewe-official','colour','Blue Grey','أزرق رمادي'),
  ('loewe-official','colour','Light Blue','أزرق فاتح'),
  ('loewe-official','colour','Khaki','كاكي'),
  ('longchamp-official','colour','Khaki','كاكي'),
  ('loewe-official','colour','Dark Khaki','كاكي داكن'),
  ('loewe-official','colour','Light Khaki','كاكي فاتح'),
  ('loewe-official','colour','Khaki Green','أخضر كاكي'),
  ('longchamp-official','colour','Sky Blue','أزرق سماوي'),
  ('longchamp-official','colour','Cream','كريمي'),
  ('loewe-official','bag_size','XL','كبير جدًا'),
  ('longchamp-official','size','XS','صغير جدًا'),
  ('longchamp-official','size','S','صغير'),
  ('longchamp-official','size','M','متوسط'),
  ('longchamp-official','size','L','كبير'),
  ('longchamp-official','bag_size','XS','صغير جدًا'),
  ('longchamp-official','bag_size','S','صغير'),
  ('longchamp-official','bag_size','M','متوسط'),
  ('longchamp-official','bag_size','L','كبير')
)
select u.product_id,u.model_key,u.is_primary,u."position",u.model_name,coalesce(localized.options,u.options),u.specs,u.rule,
  u.candidate_id,u.revision_hash,u.compared,u.basis
from unchanged u
left join lateral (
  select jsonb_agg(case when t.term_ar is null then o.option
    else jsonb_set(o.option-'value_lang','{value,ar}',to_jsonb(t.term_ar)) end order by o.position) options
  from jsonb_array_elements(u.options) with ordinality o(option,position)
  left join reviewed_options t on t.source_id=split_part(u.model_key,':',1)
    and t.kind=o.option->>'kind' and t.term_en=o.option->'value'->>'en' and o.option->>'value_lang'='en'
) localized on split_part(u.model_key,':',1) in ('loewe-official','longchamp-official');
$$;


create temporary table rolex_reference_after on commit drop as
select * from jwl_internal.derive_product_variants();
do $guard$
begin
  if exists (
    with changes as (
      select coalesce(b.product_id,a.product_id) id,md5(to_jsonb(b)::text) old_signature,md5(to_jsonb(a)::text) new_signature
      from pg_temp.rolex_reference_before b full join pg_temp.rolex_reference_after a using(product_id)
      where to_jsonb(b) is distinct from to_jsonb(a)
    )
    select 1 from changes c full join pg_temp.rolex_reference_expected e using(id)
    left join public.jwl_catalog p on p.id=e.id
    left join public.jwl_product_variants v on v.product_id=e.id
    left join jwl_internal.variant_evidence ve on ve.product_id=e.id
    left join pg_temp.rolex_reference_before b on b.product_id=e.id
    where c.id is null or e.id is null or p.brand_slug is distinct from 'rolex' or p.reference is distinct from e.ref or p.slug is distinct from e.slug
      or c.old_signature is distinct from e.old_signature or c.new_signature is distinct from e.new_signature
      or (v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule) is distinct from (b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule)
      or (ve.model_key,ve.rule,ve.candidate_id,ve.revision_hash,ve.compared,ve.basis) is distinct from (b.model_key,b.rule,b.candidate_id,b.revision_hash,b.compared,b.basis)
  ) then raise exception 'Rolex Reference option deltas differ from the 32 reviewed variants'; end if;
end $guard$;

-- Clear the scoped mapping before inserting to avoid temporary duplicate positions on restore.
delete from jwl_internal.variant_evidence e using pg_temp.rolex_reference_expected s where e.product_id=s.id;
delete from public.jwl_product_variants v using pg_temp.rolex_reference_expected s where v.product_id=s.id;
insert into public.jwl_product_variants(product_id,model_key,is_primary,position,model_name,options,specs,rule)
select a.product_id,a.model_key,a.is_primary,a."position",a.model_name,a.options,a.specs,a.rule
from pg_temp.rolex_reference_after a join pg_temp.rolex_reference_expected s on s.id=a.product_id;
insert into jwl_internal.variant_evidence(product_id,model_key,rule,candidate_id,revision_hash,compared,basis)
select a.product_id,a.model_key,a.rule,a.candidate_id,a.revision_hash,a.compared,a.basis
from pg_temp.rolex_reference_after a join pg_temp.rolex_reference_expected s on s.id=a.product_id;

do $guard$
begin
  if exists (
    select 1 from pg_temp.rolex_reference_expected e
    join pg_temp.rolex_reference_after a on a.product_id=e.id
    left join public.jwl_product_variants v on v.product_id=e.id
    left join jwl_internal.variant_evidence ve on ve.product_id=e.id
    where (v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule) is distinct from (a.model_key,a.is_primary,a."position",a.model_name,a.options,a.specs,a.rule)
       or (ve.model_key,ve.rule,ve.candidate_id,ve.revision_hash,ve.compared,ve.basis) is distinct from (a.model_key,a.rule,a.candidate_id,a.revision_hash,a.compared,a.basis)
  ) then raise exception 'Rolex Reference option mapping differs after scoped write'; end if;
end $guard$;
commit;
