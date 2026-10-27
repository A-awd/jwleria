import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {openLicenses,openLicenseDecisions,acquireOriginal,keepOpenLicenseFile,createMediaPacer,prepareGrantedMedia,approvalBundle,commonsOriginal,commonsFile,openLicenseAttribution} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {responsiveImages} from '../src/server/responsive-media.mjs';
import {recordMediaApproval,publish,publicationProduct,lanePublicationProduct,laneMediaPublicationSql} from '../../../scripts/catalog-intake/supabase.mjs';

// Synthetic fixtures only; the proposed migration is exercised in memory and applied nowhere.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const proposed=new URL('../supabase/proposed/jwleria_open_license_media.sql',import.meta.url);
const rollback=new URL('../supabase/proposed/jwleria_open_license_media.rollback.sql',import.meta.url);
const sha=c=>c.repeat(64);
const file=(width,c)=>`https://media.example.test/v1/${sha('d')}/${sha('a')}/${width}w-${sha(c)}.webp`;
const commons=name=>{const md5=createHash('md5').update(decodeURIComponent(name)).digest('hex');return [`https://commons.wikimedia.org/wiki/File:${name}`,`https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${name}`];};
// A Wikimedia-served thumbnail: .../commons/thumb/<h>/<hh>/<File>/<N>px-<File>.
const thumb=(name,width)=>{const [p,o]=commons(name);return [p,o.replace('/wikipedia/commons/','/wikipedia/commons/thumb/')+`/${width}px-${name}`];};
const originalFile=(p,o)=>({source_page_url:p,file_url:o,file_kind:'original',rendition_width:null});
const renditionFile=(name,width)=>{const [p,t]=thumb(name,width);return {source_page_url:p,file_url:t,file_kind:'rendition',rendition_width:width};};
const [page,original]=commons('Synthetic_test_watch_REF-9.jpg');
const credit={creator:'Synthetic Photographer',license:'CC BY-SA 4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',source_url:page,changes:'resized and converted to WebP'};
const entry=(c,attribution=credit)=>({src:file(1600,c),width:1600,height:2000,variants:[{src:file(640,c==='e'?'b':String.fromCharCode(c.charCodeAt(0)+1)),width:640,height:800,bytes:50000},{src:file(1600,c),width:1600,height:2000,bytes:300000}],...(attribution?{attribution}:{})});
const row=(source_id,external_id)=>normalizeBatch([{source_id,external_id,source_url:'https://example.test/p/'+external_id,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+external_id,name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+external_id+'.png'],facts:[{key:'diameter',value:'41 mm'}]}])[0];

const DECISION='decisions/0013-open-licence-exact-product-photos.md';
// TEST ONLY: decision 0013 covers m126234-0015 alone. The mechanics tests below use synthetic references, so they widen
// the in-memory scope of that one decision after the real migration ran; the scope tests use the unwidened database.
const SYNTHETIC_REFERENCES=['REF-1','REF-2','REF-3','REF-4','REF-5','REF-6','REF-7','REF-8','REF-9','REF-H','OL-1','OL-2','CRW-1','PGT-1'];
async function widenScope(db){
  const real=(await db.query('select jwl_internal.open_license_decisions() d')).rows[0].d;
  const widened={...real,[DECISION]:{references:[...real[DECISION].references,...SYNTHETIC_REFERENCES]}};
  await db.exec(`create or replace function jwl_internal.open_license_decisions() returns jsonb language sql immutable security invoker set search_path='' as $$ select '${JSON.stringify(widened)}'::jsonb $$`);
}
async function database({open=true,scope='widened'}={}){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  if(open){await db.exec(await readFile(proposed,'utf8'));if(scope==='widened')await widenScope(db);}
  // Closed sources are registered as open for acquisition here on purpose: the grant must still be refused.
  await db.exec(`insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values
    ('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true),
    ('cartier-official','https://example.test','permitted-page','synthetic',true,false,true),
    ('piaget-official','https://example.test','permitted-page','synthetic',true,false,true)`);
  return db;
}
const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};
const service=(db,sql,params)=>as(db,'service_role',()=>db.query(sql,params));
const ingest=(db,records)=>service(db,'select public.jwl_ingest_missing_batch($1::jsonb) r',[JSON.stringify(records)]);
const columns=['grant_reference','kind','source_id','candidate_id','media_origins','website_publication','resize','webp_encode','evidence_reference','license_code','license_url','creator','licensed_files','attribution_text','owner_decision_reference'];
const openGrant=(c,overrides={})=>({grant_reference:'grant-open-01',kind:'open_license',source_id:c.source_id,candidate_id:c.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,
  evidence_reference:'synthetic licence review record',license_code:'CC-BY-SA-4.0',license_url:credit.license_url,creator:credit.creator,licensed_files:[originalFile(page,original)],
  attribution_text:'Synthetic Photographer, CC BY-SA 4.0, via Wikimedia Commons',owner_decision_reference:DECISION,...overrides});
// One licensed file of the default grant with some of its fields changed.
const fileChange=change=>({licensed_files:[{...originalFile(page,original),...change}]});
const insertGrant=(db,g)=>service(db,`insert into jwl_internal.media_grants(${columns.join(',')}) select ${columns.map(k=>`g.${k}`).join(',')} from jsonb_populate_record(null::jwl_internal.media_grants,$1::jsonb) g`,[JSON.stringify(g)]);
const asset=(db,c,v,{grant_reference='grant-open-01',original_source=original}={})=>service(db,'insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
  [c.candidate_id,c.revision_hash,v.src,v.src.match(/-([a-f0-9]{64})\.webp$/)[1],v.width,v.height,original_source,sha('a'),grant_reference,c.external_id,'synthetic visual check']);
const approve=(db,c,reference,entries)=>service(db,'insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',
  [c.candidate_id,c.revision_hash,reference,JSON.stringify(entries.map(e=>e.src)),JSON.stringify(entries)]);

test('until the proposed migration is applied the database refuses every open-licence grant',async()=>{
  const db=await database({open:false});
  try{
    const c=row('test','REF-1');await ingest(db,[c]);
    await assert.rejects(service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,website_publication,resize,webp_encode,evidence_reference) values('grant-open-00','open_license','test',$1,true,true,true,'x')",[c.candidate_id]),/check constraint/);
  }finally{await db.close();}
});

test('the database allowlist and visible labels are exactly the pipeline allowlist',async()=>{
  const db=await database();
  try{
    assert.deepEqual((await service(db,'select jwl_internal.open_licenses() l')).rows[0].l,JSON.parse(JSON.stringify(openLicenses)));
    for(const role of ['anon','authenticated'])await assert.rejects(as(db,role,()=>db.query('select jwl_internal.open_licenses()')),/permission denied/);
  }finally{await db.close();}
});

test('the only citable decision is 0013, for m126234-0015 alone, exactly as the pipeline pins it',async()=>{
  const db=await database({scope:'real'});
  try{
    assert.deepEqual((await service(db,'select jwl_internal.open_license_decisions() d')).rows[0].d,JSON.parse(JSON.stringify(openLicenseDecisions)),'the SQL and JS lists are the same');
    for(const role of ['anon','authenticated'])await assert.rejects(as(db,role,()=>db.query('select jwl_internal.open_license_decisions()')),/permission denied/);
    const exact=row('test','m126234-0015'),sibling=row('test','m126234-0016'),other=row('test','REF-1');await ingest(db,[exact,sibling,other]);
    await assert.rejects(insertGrant(db,openGrant(exact,{grant_reference:'grant-0011',owner_decision_reference:'decisions/0011-per-origin-queues-and-exact-media-evidence.md'})),/check constraint/,'0011 rejects open licences');
    await assert.rejects(insertGrant(db,openGrant(exact,{grant_reference:'grant-0099',owner_decision_reference:'decisions/0099-synthetic-open-licence-decision.md'})),/check constraint/,'a nonexistent decision');
    await assert.rejects(insertGrant(db,openGrant(sibling,{grant_reference:'grant-sibling'})),/does not cover this reference/,'a sibling reference needs 0013 amended first');
    await assert.rejects(insertGrant(db,openGrant(other,{grant_reference:'grant-other'})),/does not cover this reference/);
    await insertGrant(db,openGrant(exact,{grant_reference:'grant-exact'}));
    assert.equal((await db.query("select count(*)::int n from jwl_internal.media_grants where kind='open_license'")).rows[0].n,1);
  }finally{await db.close();}
});

test('an open-licence grant needs the owner decision, an allowlisted licence, Commons files, attribution and one exact candidate of an open source',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-2'),other=row('test','REF-3'),cartier=row('cartier-official','CRW-1'),piaget=row('piaget-official','PGT-1');
    await ingest(db,[c,other,cartier,piaget]);
    const [otherPage,otherOriginal]=commons('Another_file.jpg');
    const refused=[
      [{license_code:'CC-BY-NC-4.0',license_url:'https://creativecommons.org/licenses/by-nc/4.0/'},/check constraint/],
      [{license_code:'CC-BY-ND-4.0',license_url:'https://creativecommons.org/licenses/by-nd/4.0/'},/check constraint/],
      [{license_code:'CC-BY-NC-SA-4.0',license_url:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},/check constraint/],
      [{license_code:'CC-BY-4.0'},/check constraint/],
      [{license_url:'https://creativecommons.org/licenses/by-sa/3.0/de/'},/check constraint/],
      [{license_code:null},/check constraint/],
      [{creator:null},/check constraint/],
      [{creator:'  '},/check constraint/],
      [{attribution_text:null},/check constraint/],
      [{attribution_text:'Via Wikimedia Commons'},/check constraint/],
      [{owner_decision_reference:null},/check constraint/],
      [{owner_decision_reference:'Owner said yes'},/check constraint/],
      [{owner_decision_reference:'synthetic-owner-decision'},/check constraint/,'not a decision record'],
      [{owner_decision_reference:'synthetic owner decision 2026-10-26'},/check constraint/,'a dated sentence is not a decision record'],
      [{owner_decision_reference:'owner continuation instruction 2026-10-27 relayed by Codex: complete the reviewed open-licence sample path'},/check constraint/,'a relayed instruction is not a decision record'],
      [{owner_decision_reference:' '+DECISION},/check constraint/],
      [{owner_decision_reference:DECISION+'\n'},/check constraint/],
      // A well-formed decision path is not enough: only the pinned file. 0011 is the decision that rejects open licences.
      [{owner_decision_reference:'decisions/0011-per-origin-queues-and-exact-media-evidence.md'},/check constraint/,'decision 0011 rejects open licences'],
      [{owner_decision_reference:'decisions/0099-synthetic-open-licence-decision.md'},/check constraint/,'a nonexistent decision'],
      [{owner_decision_reference:'decisions/99-synthetic.md'},/check constraint/],
      [{owner_decision_reference:'decisions/0099-Synthetic.md'},/check constraint/],
      [{owner_decision_reference:'decisions/0099-synthetic--decision.md'},/check constraint/],
      [{owner_decision_reference:'docs/0099-synthetic.md'},/check constraint/],
      [{licensed_files:null},/check constraint/],
      [{licensed_files:[]},/check constraint/],
      [{licensed_files:originalFile(page,original)},/check constraint/],
      [{licensed_files:[originalFile(page,original),originalFile(page,original)]},/check constraint/,'a file is listed once'],
      [{licensed_files:Array.from({length:21},(_,i)=>originalFile(...commons(`File_${i}.jpg`)))},/check constraint/],
      [fileChange({source_page_url:page.replace('commons.wikimedia.org','en.wikipedia.org')}),/check constraint/],
      [fileChange({source_page_url:null}),/check constraint/],
      [fileChange({file_url:'https://example.test/img/REF-2.png'}),/check constraint/],
      [fileChange({file_url:original.replace('/wikipedia/commons/','/wikipedia/en/')}),/check constraint/],
      [fileChange({file_url:original.replace(/\/([0-9a-f])\/([0-9a-f]{2})\//,'/thumb/$1/$2/')+'/640px-x.jpg'}),/check constraint/],
      [fileChange({file_url:original.replace(/\/([0-9a-f])\/([0-9a-f]{2})\//,(m,a,b)=>`/${a==='0'?'1':'0'}/${b}/`)}),/check constraint/],
      [fileChange({file_url:original.replace(/\.jpg$/,'.tif')}),/check constraint/],
      [fileChange({file_url:original+'?x'}),/check constraint/],
      [fileChange({file_kind:'thumbnail'}),/check constraint/],
      [fileChange({rendition_width:960}),/check constraint/,'an original has no rendition width'],
      [{licensed_files:[{source_page_url:page,file_url:original,file_kind:'original'}]},/check constraint/],
      [{licensed_files:[{...originalFile(page,original),note:'x'}]},/check constraint/],
      [{media_origins:['https://upload.wikimedia.org']},/check constraint/],
      [{candidate_id:null},/check constraint|exact candidate of its source/],
      [{source_id:'cartier-official'},/exact candidate of its source/],
      [{source_id:cartier.source_id,candidate_id:cartier.candidate_id},/check constraint/],
      [{source_id:piaget.source_id,candidate_id:piaget.candidate_id},/check constraint/],
    ];
    for(const [i,[change,error]] of refused.entries())await assert.rejects(insertGrant(db,openGrant(c,{grant_reference:'grant-refused-'+i,...change})),error,JSON.stringify(change));
    await assert.rejects(insertGrant(db,{...openGrant(c),grant_reference:'grant-written-x',kind:'written_permission',media_origins:['https://example.test']}),/check constraint/,'other kinds carry no open-licence fields');
    await insertGrant(db,openGrant(c,{licensed_files:[originalFile(otherPage,otherOriginal)],grant_reference:'grant-open-other-file'}));
    await insertGrant(db,openGrant(c,{licensed_files:[originalFile(page,original),originalFile(otherPage,otherOriginal)],grant_reference:'grant-open-two-files'}));
    await insertGrant(db,openGrant(c));
    await insertGrant(db,openGrant(other,{grant_reference:'grant-open-cc0',license_code:'CC0-1.0',license_url:'https://creativecommons.org/publicdomain/zero/1.0/'}));
    await assert.rejects(as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set creator='Changed' where grant_reference='grant-open-01'")),/permission denied/,'a grant cannot be rewritten');
    for(const role of ['anon','authenticated'])await assert.rejects(as(db,role,()=>db.query('select creator from jwl_internal.media_grants')),/permission denied/);
  }finally{await db.close();}
});

test('the original must be the credited page\'s own file, not another file with valid hash directories',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-6');await ingest(db,[c]);
    const [alicePage]=commons('CC0_photo_by_Alice.jpg'),[,bobOriginal]=commons('Unrelated_photo_by_Bob.jpg');
    assert.equal(commonsOriginal(alicePage,bobOriginal),false,'the pipeline already refuses the pair');
    await assert.rejects(insertGrant(db,openGrant(c,{grant_reference:'grant-mixed',licensed_files:[originalFile(alicePage,bobOriginal)],license_code:'CC0-1.0',license_url:'https://creativecommons.org/publicdomain/zero/1.0/'})),/check constraint/,
      'a grant written by hand cannot credit one file\'s page for another file');
    await insertGrant(db,openGrant(c,{grant_reference:'grant-same-file'}));
  }finally{await db.close();}
});

test('hash directories are MediaWiki\'s md5 of the percent-decoded name, for originals and renditions, in the database and the pipeline',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-H');await ingest(db,[c]);
    const md5=name=>createHash('md5').update(name).digest('hex');
    // The five m126234-0015 batch files: their URL names and the hash directories Wikimedia serves them under.
    const batch=[['Rolex_Datejust_126234.jpg','8/81'],['Rolex_Datejust_36_-_Black_Sunburst_Dial_%2850826887656%29.jpg','7/77'],['Rolex_Datejust_36_-_At_an_Angle_%2850826143003%29.jpg','2/2c'],
      ['Rolex_Datejust_36_-_On_Display_%2850826140918%29.jpg','9/97'],['Rolex_Datejust_36_-_Ready_in_the_Box_%2850826141328%29.jpg','c/ce']];
    const decode=name=>(service(db,'select jwl_internal.percent_decode($1) d',[name])).then(r=>r.rows[0].d);
    for(const [name,dirs] of batch){
      assert.equal(await decode(name),decodeURIComponent(name));
      const h=md5(decodeURIComponent(name));assert.equal(`${h[0]}/${h.slice(0,2)}`,dirs,name);
      const t=`https://upload.wikimedia.org/wikipedia/commons/thumb/${dirs}/${name}/960px-${name}`;
      const f={source_page_url:`https://commons.wikimedia.org/wiki/File:${name}`,file_url:t,file_kind:'rendition',rendition_width:960};
      assert.equal(commonsFile(f),true,name);
      assert.equal((await service(db,'select jwl_internal.valid_open_license_files($1::jsonb) ok',[JSON.stringify([f])])).rows[0].ok,true,name);
      // A directory pair that is internally consistent (<hh> starts with <h>) but is not the md5 of the name.
      const other=(dirs[0]==='f'?'e':'f');const wrong=t.replace(`/thumb/${dirs}/`,`/thumb/${other}/${other}${dirs[3]}/`);
      const wrongFile={...f,file_url:wrong};
      assert.equal(commonsFile(wrongFile),false);
      assert.equal((await service(db,'select jwl_internal.valid_open_license_files($1::jsonb) ok',[JSON.stringify([wrongFile])])).rows[0].ok,false,'wrong directory: '+name);
      const swapped={...f,file_url:t.replace(`/thumb/${dirs}/`,`/thumb/${dirs[0]}/${dirs[0]}${dirs[3]==='0'?'1':'0'}/`)};
      assert.equal((await service(db,'select jwl_internal.valid_open_license_files($1::jsonb) ok',[JSON.stringify([swapped])])).rows[0].ok,false,'wrong second directory: '+name);
    }
    await insertGrant(db,openGrant(c,{grant_reference:'grant-batch-names',licensed_files:batch.map(([name,dirs])=>({source_page_url:`https://commons.wikimedia.org/wiki/File:${name}`,file_url:`https://upload.wikimedia.org/wikipedia/commons/thumb/${dirs}/${name}/960px-${name}`,file_kind:'rendition',rendition_width:960}))}));
    const [, wrongOriginal]=commons('Rolex_Datejust_126234.jpg');
    await assert.rejects(insertGrant(db,openGrant(c,{grant_reference:'grant-wrong-dir',licensed_files:[originalFile('https://commons.wikimedia.org/wiki/File:Rolex_Datejust_126234.jpg',wrongOriginal.replace('/8/81/','/8/8a/'))]})),/check constraint/,'an original under a wrong md5 directory');
    // Non-ASCII names hash their UTF-8 bytes after decoding; malformed escapes fail closed in both.
    const utf='Montre_%C3%A9t%C3%A9_%E2%80%94_test.jpg';assert.equal(await decode(utf),'Montre_été_—_test.jpg');
    await insertGrant(db,openGrant(c,{grant_reference:'grant-utf8',licensed_files:[originalFile(...commons(utf))]}));
    for(const bad of ['Bad_%E9_byte.jpg','Bad_%2_escape.jpg','Bad_%zz_escape.jpg','Bad_trailing_%.jpg','Bad_%C3_truncated.jpg']){
      assert.equal(await decode(bad),null,bad);
      assert.throws(()=>decodeURIComponent(bad),URIError,'the pipeline refuses it too: '+bad);
      const h='0',hh='00',f={source_page_url:`https://commons.wikimedia.org/wiki/File:${bad}`,file_url:`https://upload.wikimedia.org/wikipedia/commons/${h}/${hh}/${bad}`,file_kind:'original',rendition_width:null};
      assert.equal((await service(db,'select jwl_internal.valid_open_license_files($1::jsonb) ok',[JSON.stringify([f])])).rows[0].ok,false,bad);
      assert.equal(commonsFile(f),false,bad);
    }
  }finally{await db.close();}
});

// Facts-only publication of one candidate through the existing factual lane (no source flag, no images).
const publishFacts=(db,c)=>service(db,'select public.jwl_publish_factual_batch($1::jsonb,$2) r',[JSON.stringify([{candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,
  brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,
  description_ar:c.description_ar,description_en:c.description_en,search_text:c.external_id.toLowerCase()}]),'synthetic facts-only instruction']);
const reviewOf=(c,entries)=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'watches',
  collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images:entries.map(e=>e.src),image_variants:entries});
const publishMedia=(db,review)=>{const {candidate,revision,product}=publicationProduct(review);return service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[candidate,revision,JSON.stringify(product)]);};
// The open-licence lane keeps the public row's existing search text, so a lane call passes it unchanged (as the batch does).
const rawPublish=(db,candidate,revision,product)=>service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[candidate,revision,JSON.stringify(product)]);
async function publishLane(db,review,change={}){
  const {candidate,revision,product}=publicationProduct(review);
  const search_text=(await db.query('select search_text from public.jwl_catalog where id=$1',[candidate])).rows[0]?.search_text;
  const lane={...product,search_text,...change};for(const [k,v] of Object.entries(lane))if(v===undefined)delete lane[k];
  return rawPublish(db,candidate,revision,lane);
}
const catalog=db=>db.query('select * from public.jwl_catalog order by id').then(r=>r.rows);
const without=(rows,id)=>rows.filter(r=>r.id!==id);
const activeOf=async(db,c)=>(await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0]?.active;
const sourceUpdate=(db,set)=>as(db,'postgres',()=>db.exec(`update jwl_internal.sources set ${set} where id='test'`));

test('applied migrations only: toggling a source flag withdraws only that source\'s media-lane rows, never its facts-only rows',async()=>{
  const db=await database({open:false});
  try{
    const facts=['F-1','F-2','F-3'].map(r=>row('test',r)),media=row('test','M-1');
    await ingest(db,[...facts,media]);for(const c of [...facts,media])await publishFacts(db,c);
    await service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('grant-written-t','written_permission','test','[\"https://example.test\"]',true,true,true,'synthetic private evidence')");
    const e=entry('7',null);for(const v of e.variants)await asset(db,media,v,{grant_reference:'grant-written-t',original_source:'https://example.test/img/M-1.png'});
    await approve(db,media,'grant-written-t',[e]);
    const factsBefore=without(await catalog(db),media.candidate_id);
    await sourceUpdate(db,'publication_allowed=true');
    await publishMedia(db,reviewOf(media,[e]));
    assert.equal(await activeOf(db,media),true);
    await sourceUpdate(db,'publication_allowed=false');
    assert.equal(await activeOf(db,media),false,'set-true / publish / set-false withdraws the media-lane row');
    assert.deepEqual(without(await catalog(db),media.candidate_id),factsBefore,'every facts-only row of the source is unchanged');
    await sourceUpdate(db,'acquisition_allowed=false');await sourceUpdate(db,'enabled=false');
    assert.deepEqual(without(await catalog(db),media.candidate_id),factsBefore,'later source updates and disabling still leave facts-only rows active');
  }finally{await db.close();}
});

test('the open-licence lane publishes an already-public candidate without the source flag, changes no other row, and only its own revocations withdraw it',async()=>{
  const db=await database();
  try{
    const facts=['F-1','F-2','F-3'].map(r=>row('test',r)),target=row('test','OL-1'),unpublished=row('test','OL-2'),written=row('test','W-1');
    await ingest(db,[...facts,target,unpublished,written]);
    for(const c of [...facts,target,written])await publishFacts(db,c);
    const f=renditionFile('Synthetic_lane_(1).jpg',960);
    await insertGrant(db,openGrant(target,{grant_reference:'grant-lane',licensed_files:[f]}));
    await insertGrant(db,openGrant(unpublished,{grant_reference:'grant-lane-2',licensed_files:[f]}));
    const credited=(c,chars)=>{const top=960;return {src:file(top,chars[2]),width:top,height:720,variants:[320,640,960].map((w,i)=>({src:file(w,chars[i]),width:w,height:w*3/4,bytes:40000+i})),attribution:{...credit,license:'CC BY-SA 4.0',source_url:f.source_page_url}};};
    const e=credited(target,['1','2','3']),e2=credited(unpublished,['4','5','6']);
    for(const v of e.variants)await asset(db,target,v,{grant_reference:'grant-lane',original_source:f.file_url});
    for(const v of e2.variants)await asset(db,unpublished,v,{grant_reference:'grant-lane-2',original_source:f.file_url});
    await approve(db,target,'grant-lane',[e]);await approve(db,unpublished,'grant-lane-2',[e2]);
    await service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('grant-written-l','written_permission','test','[\"https://example.test\"]',true,true,true,'synthetic private evidence')");
    const w=entry('8',null);for(const v of w.variants)await asset(db,written,v,{grant_reference:'grant-written-l',original_source:'https://example.test/img/W-1.png'});
    await approve(db,written,'grant-written-l',[w]);
    await assert.rejects(publishMedia(db,reviewOf(written,[w])),/Source publication not approved/,'other grant kinds still need the source flag');
    await assert.rejects(publishMedia(db,reviewOf(unpublished,[e2])),/Source publication not approved/,'only a product already public as facts at this revision');
    for(const change of [{slug:'test-renamed'},{category_slug:'jewelry'},{collection_slug:'other-collection'},{collection_ar:'أخرى'},{brand_slug:'other-brand'},{brand_tier:'accessible'}])
      await assert.rejects(publishLane(db,{...reviewOf(target,[e]),...change}),/Source publication not approved/,'without the flag only images may change: '+JSON.stringify(change));
    // The search text is part of the public row too: the lane cannot rewrite it, and a missing field (NULL) is refused.
    await assert.rejects(publishLane(db,reviewOf(target,[e]),{search_text:'rewritten search index'}),/Source publication not approved/,'the lane cannot rewrite search_text');
    await assert.rejects(publishMedia(db,reviewOf(target,[e])),/Source publication not approved/,'a recomputed search text that differs from the public row is refused');
    for(const field of ['search_text','collection_ar','description_en'])
      await assert.rejects(publishLane(db,reviewOf(target,[e]),{[field]:undefined}),/Source publication not approved/,'missing '+field);
    const before=await catalog(db);
    // The repository's lane path takes the stored search_text from a fresh read of the public row, or refuses.
    const freshRow=before.find(r=>r.id===target.candidate_id);
    assert.throws(()=>lanePublicationProduct(reviewOf(target,[e])),/needs the public row from a fresh read/);
    assert.throws(()=>lanePublicationProduct(reviewOf(target,[e]),{...freshRow,search_text:null}),/no stored search_text/);
    assert.throws(()=>lanePublicationProduct(reviewOf(target,[e]),before.find(r=>r.id!==target.candidate_id)),/another product/);
    assert.throws(()=>lanePublicationProduct({...reviewOf(target,[e]),slug:'test-renamed'},freshRow),/slug differs/);
    const lane=lanePublicationProduct(reviewOf(target,[e]),freshRow);
    assert.equal(lane.product.search_text,freshRow.search_text);
    assert.notEqual(publicationProduct(reviewOf(target,[e])).product.search_text,freshRow.search_text,'the recomputed value differs, so only the stored value can pass');
    assert.match(laneMediaPublicationSql(reviewOf(target,[e]),freshRow),/^select public\.jwl_publish_candidate\('/);
    await rawPublish(db,lane.candidate,lane.revision,lane.product);
    const after=await catalog(db);
    assert.deepEqual(without(after,target.candidate_id),without(before,target.candidate_id),'no other row changed');
    const live=after.find(r=>r.id===target.candidate_id);assert.equal(live.active,true);assert.equal(live.media_state,'approved_media');assert.deepEqual(live.image_variants,[e]);
    assert.equal(live.search_text,before.find(r=>r.id===target.candidate_id).search_text,'search text unchanged');
    await publishLane(db,reviewOf(target,[e]));assert.deepEqual(await catalog(db),after,'a replay is idempotent');
    const others=()=>catalog(db).then(rows=>without(rows,target.candidate_id));const othersBefore=await others();
    // Source-row updates that leave the flag false (the trigger fires on every update) and a flag toggle.
    await sourceUpdate(db,'acquisition_allowed=false');await sourceUpdate(db,'min_interval_seconds=90');
    assert.equal(await activeOf(db,target),true,'an unrelated source update does not withdraw the open-licence row');
    await sourceUpdate(db,'publication_allowed=true');await publishMedia(db,reviewOf(written,[w]));
    await sourceUpdate(db,'publication_allowed=false');
    assert.equal(await activeOf(db,written),false,'the flag still withdraws other media');
    assert.equal(await activeOf(db,target),true,'the flag does not withdraw the open-licence lane');
    for(const c of facts)assert.equal(await activeOf(db,c),true);
    assert.deepEqual((await others()).filter(r=>r.id!==written.candidate_id),othersBefore.filter(r=>r.id!==written.candidate_id));
    // A disabled source refuses and withdraws every media publication, the open-licence lane included.
    await db.exec('begin');
    await sourceUpdate(db,'enabled=false');
    assert.equal(await activeOf(db,target),false);for(const c of facts)assert.equal(await activeOf(db,c),true);
    // Inside this transaction the call is made directly (a role reset after an error would itself fail).
    const {candidate:id,revision,product}=publicationProduct(reviewOf(target,[e]));
    const kept=(await db.query('select search_text from public.jwl_catalog where id=$1',[id])).rows[0].search_text;
    await assert.rejects(db.query('select public.jwl_publish_candidate($1,$2,$3::jsonb)',[id,revision,JSON.stringify({...product,search_text:kept})]),/Source publication not approved/);
    await db.exec('rollback');
    // Revocation still withdraws the product; nothing else moves.
    const othersNow=await others();
    await as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-lane'"));
    assert.equal(await activeOf(db,target),false);assert.deepEqual(await others(),othersNow);
    await assert.rejects(publishLane(db,reviewOf(target,[e])),/approval missing or revoked/i);
  }finally{await db.close();}
});

test('the longest creator the database accepts renders on the storefront',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-7');await ingest(db,[c]);
    // 300 code points, the database bound; astral characters are two UTF-16 units each in JavaScript.
    for(const [i,creator] of ['x'.repeat(300),'\u{1D49C}'.repeat(300),'A'+'\u{1F4F7}'.repeat(150)+'b'.repeat(149)].entries()){
      await insertGrant(db,openGrant(c,{grant_reference:'grant-long-'+i,creator,attribution_text:creator}));
      const attribution=openLicenseAttribution({...openGrant(c),creator},'resized and converted to WebP');
      const e=entry('e',attribution);
      assert.equal((await db.query('select jwl_internal.valid_image_variants($1::jsonb,$2::jsonb) ok',[JSON.stringify([e.src]),JSON.stringify([e])])).rows[0].ok,true,'the database accepts it');
      assert.equal(responsiveImages([e],[e.src],false)[0].attribution.creator,creator,'and the storefront renders it');
    }
    const over={...credit,creator:'x'.repeat(301)};
    assert.throws(()=>responsiveImages([entry('e',over)],[entry('e').src],false),/attribution/,'one past the bound is refused by both');
  }finally{await db.close();}
});

test('open-licence images need the granted original and their exact credit; other grant kinds cannot carry one',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-4'),other=row('test','REF-5');await ingest(db,[c,other]);
    await insertGrant(db,openGrant(c));
    const ok=entry('e');for(const v of ok.variants)await asset(db,c,v);
    for(const attribution of [null,{...credit,creator:'Someone else'},{...credit,license:'CC BY 4.0'},{...credit,source_url:commons('Other.jpg')[0]},{...credit,changes:'cropped and recoloured'},{...credit,extra:'x'}])
      await assert.rejects(approve(db,c,'grant-open-01',[{...entry('e',null),...(attribution?{attribution}:{})}]),/exact visible attribution/,JSON.stringify(attribution));
    const brand=entry('5');for(const v of brand.variants)await asset(db,c,v,{original_source:'https://example.test/img/REF-4.png'});
    await assert.rejects(approve(db,c,'grant-open-01',[brand]),/must cite the granted file/,'the brand gallery file is not the licensed file');
    await assert.rejects(approve(db,other,'grant-open-01',[ok]),/covers another product/,'a grant binds one exact candidate');
    await service(db,"insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('grant-written-01','written_permission','test','[\"https://example.test\"]',true,true,true,'synthetic private evidence')");
    const written=entry('1');for(const v of written.variants)await asset(db,other,v,{grant_reference:'grant-written-01',original_source:'https://example.test/img/REF-5.png'});
    await assert.rejects(approve(db,other,'grant-written-01',[written]),/only for open-licence/,'a credit must come from an open-licence grant');
    await approve(db,c,'grant-open-01',[{...ok,attribution:{...credit,changes:'converted to WebP'}}]);
    await approve(db,other,'grant-written-01',[entry('1',null)]);
  }finally{await db.close();}
});

test('the responsive shape accepts only a bounded credit for an allowlisted licence and stays compatible without one',async()=>{
  const db=await database();
  try{
    const valid=(e)=>db.query('select jwl_internal.valid_image_variants($1::jsonb,$2::jsonb) ok',[JSON.stringify([e.src]),JSON.stringify([e])]).then(r=>r.rows[0].ok);
    assert.equal(await valid(entry('e',null)),true);
    assert.equal(await valid(entry('e')),true);
    for(const attribution of [{...credit,extra:'x'},{...credit,creator:''},{...credit,creator:'x'.repeat(301)},{...credit,creator:'a\nb'},{...credit,license:'CC BY-NC 4.0',license_url:'https://creativecommons.org/licenses/by-nc/4.0/'},
      {...credit,license_url:'https://creativecommons.org/licenses/by/4.0/'},{...credit,source_url:'https://example.test/photo'},{...credit,changes:7},'credit',[credit]])
      assert.equal(await valid({...entry('e',null),attribution}),false,JSON.stringify(attribution));
  }finally{await db.close();}
});

test('a grant may cite Wikimedia-served renditions honestly: same file name and hash directories, a recorded width of 100..4000',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-8');await ingest(db,[c]);
    const name='Synthetic_rendition_(12345).jpg',encoded='Synthetic_rendition_%2812345%29.jpg';
    const ok=renditionFile(name,960),okEncoded=renditionFile(encoded,960);
    const [otherPage]=commons('Another_rendition.jpg');
    const refused=[
      [{...ok,rendition_width:undefined},'missing rendition_width'],
      [{...ok,rendition_width:null},'null rendition_width'],
      [{...ok,rendition_width:'960'},'a text width'],
      [{...ok,rendition_width:960.5},'a fractional width'],
      [{...ok,rendition_width:640},'a width other than the URL names'],
      [renditionFile(name,99),'below 100 px'],
      [renditionFile(name,4001),'above 4000 px'],
      [{...ok,file_kind:'original'},'a rendition recorded as an original'],
      [{...ok,source_page_url:otherPage},'another file page'],
      [{...ok,file_url:ok.file_url.replace(/\/960px-.*$/,'/960px-Another_rendition.jpg')},'mismatched file name after the width'],
      [{...ok,file_url:ok.file_url.replace(`/${name}/`,'/Another_rendition.jpg/')},'mismatched file name directory'],
      [{...ok,file_url:ok.file_url.replace(/\/thumb\/([0-9a-f])\/([0-9a-f]{2})\//,(m,a,b)=>`/thumb/${a==='0'?'1':'0'}/${b}/`)},'wrong hash directory'],
      [{...ok,file_url:ok.file_url.replace('/wikipedia/commons/thumb/','/wikipedia/en/thumb/')},'another wiki'],
      [{...ok,file_url:ok.file_url.replace('/960px-','/960px-x')},'a prefixed thumbnail name'],
      [{...ok,file_url:ok.file_url+'?x'},'a query'],
      [{...ok,file_url:ok.file_url.replace('960px-','960px-').replace(/\/960px-/,'/0960px-')},'a padded width'],
      [{...okEncoded,source_page_url:commons(name)[0]},'the page and rendition spell the name differently'],
    ];
    for(const [i,[file,label]] of refused.entries()){
      const record=Object.fromEntries(Object.entries(file).filter(([,v])=>v!==undefined));
      await assert.rejects(insertGrant(db,openGrant(c,{grant_reference:'grant-rendition-refused-'+i,licensed_files:[record]})),/check constraint/,label);
    }
    await assert.rejects(insertGrant(db,openGrant(c,{grant_reference:'grant-rendition-dup',licensed_files:[ok,renditionFile(name,640)]})),/check constraint/,'one held file per page');
    await insertGrant(db,openGrant(c,{grant_reference:'grant-rendition-01',licensed_files:[ok]}));
    await insertGrant(db,openGrant(c,{grant_reference:'grant-rendition-02',licensed_files:[okEncoded,originalFile(page,original),renditionFile('Small_one.png',100),renditionFile('Large_one.webp',4000)]}));
  }finally{await db.close();}
});

test('rendition-backed images cite their rendition, are credited as resized and are never wider than the rendition',async()=>{
  const db=await database();
  try{
    const c=row('test','REF-9');await ingest(db,[c]);
    const a=renditionFile('Synthetic_dial_(111).jpg',960),b=renditionFile('Synthetic_box_(222).jpg',960);
    await insertGrant(db,openGrant(c,{grant_reference:'grant-rendition-03',licensed_files:[a,b]}));
    const creditOf=(f,changes='resized and converted to WebP')=>({...credit,source_url:f.source_page_url,changes});
    // widths in ascending order; the last is the canonical file; chars name distinct content hashes.
    const sized=(chars,widths,attribution,ratio=0.75)=>{const top=widths.at(-1);
      return {src:file(top,chars.at(-1)),width:top,height:Math.round(top*ratio),variants:widths.map((w,i)=>({src:file(w,chars[i]),width:w,height:Math.round(w*ratio),bytes:30000+i})),...(attribution?{attribution}:{})};};
    const record=async(entry,f,original_source=f.file_url)=>{for(const v of entry.variants)await asset(db,c,v,{grant_reference:'grant-rendition-03',original_source});};
    const first=sized(['1','2','3'],[320,640,960],creditOf(a)),second=sized(['4','5','6'],[320,640,960],creditOf(b),0.5625);
    await record(first,a);await record(second,b);
    const upscaled=sized(['7','8','9','0'],[320,640,960,1200],creditOf(a));await record(upscaled,a);
    await assert.rejects(approve(db,c,'grant-rendition-03',[upscaled]),/wider than its source rendition/,'an upscaled derivative is refused');
    await assert.rejects(approve(db,c,'grant-rendition-03',[{...first,attribution:creditOf(a,'converted to WebP')}]),/exact visible attribution/,'a rendition is always credited as resized');
    await assert.rejects(approve(db,c,'grant-rendition-03',[{...first,attribution:creditOf(b)}]),/must cite the granted file its credit names/,'an image is credited to its own file only');
    const viaOriginal=sized(['a','b','c'],[320,640,960],creditOf(a));await record(viaOriginal,a,a.file_url.replace('/thumb/','/').replace(/\/960px-.*$/,''));
    await assert.rejects(approve(db,c,'grant-rendition-03',[viaOriginal]),/must cite the granted file/,'evidence cannot claim the original when a rendition is held');
    await approve(db,c,'grant-rendition-03',[first,second]);
    assert.deepEqual((await db.query('select approved_image_variants v from jwl_internal.publication_approvals where candidate_id=$1',[c.candidate_id])).rows[0].v.map(e=>e.attribution.source_url),[a.source_page_url,b.source_page_url]);
  }finally{await db.close();}
});

test('end to end: held Wikimedia renditions for one product record, publish their credits and are withdrawn by one revocation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-rendition-'));
  const db=await database();
  try{
    const sharp=installedImageEngine();
    const c=normalizeBatch([{source_id:'test',external_id:'m126234-0015',source_url:'https://example.test/p/m126234-0015',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://brand.example.test/img/m126234-0015.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
    await ingest(db,[c]);
    const files=[renditionFile('Synthetic_front_(1).jpg',960),renditionFile('Synthetic_angle_(2).jpg',960)];
    const grant=openGrant(c,{grant_reference:'grant-rendition-e2e',licensed_files:files});await insertGrant(db,grant);
    const items=[];
    for(const [i,f] of files.entries()){
      const local=join(root,`held-${i}.jpg`);
      await writeFile(local,await sharp({create:{width:960,height:i?540:720,channels:3,background:i?'#3c3631':'#5a5048'}}).jpeg().toBuffer());
      const kept=await keepOpenLicenseFile({candidate:c,grant,file_url:f.file_url,local_path:local,expected_sha256:createHash('sha256').update(await readFile(local)).digest('hex'),output_directory:join(root,'private')});
      assert.deepEqual([kept.file_kind,kept.rendition_width,kept.width],['rendition',960,960]);
      const assetFile={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
      const prepared=await prepareGrantedMedia({source:{id:'test',origin:'https://example.test',publication_allowed:true},candidate:c,asset:assetFile,grant,output_directory:join(root,'private')});
      items.push({asset:assetFile,manifest:prepared.manifest,verification:{asset_sha256:kept.sha256,verified_reference:c.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check',
        checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}}});
    }
    const bundle=approvalBundle({candidate:c,grant,items,public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media'});
    assert.deepEqual(bundle.approval.approved_image_variants.map(e=>[e.width,e.attribution.source_url,e.attribution.changes]),files.map(f=>[960,f.source_page_url,'resized and converted to WebP']));
    assert(bundle.evidence.every(e=>files.some(f=>f.file_url===e.original_source)&&e.width<=960));
    const receipt=(await service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(bundle.evidence),JSON.stringify(bundle.approval)])).rows[0].r;
    assert.equal(receipt.evidence_rows,bundle.evidence.length);
    await db.exec("update jwl_internal.sources set publication_allowed=true where id='test'");
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-watch-m126234-0015',reference:c.external_id,brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',
      name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    const rpc=async(url,init)=>{const args=JSON.parse(init.body);return new Response(JSON.stringify((await service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[args.candidate,args.revision,JSON.stringify(args.product)])).rows[0].r));};
    await publish(review,{url:'https://project.supabase.co',key:'synthetic-test-key'},rpc);
    const live=(await as(db,'anon',()=>db.query('select image_variants from public.jwl_catalog where id=$1',[c.candidate_id]))).rows[0];
    assert.deepEqual(live.image_variants.map(e=>e.attribution.source_url),files.map(f=>f.source_page_url),'each image shows its own credit');
    await as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-rendition-e2e'"));
    assert.equal((await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0].active,false,'one revocation withdraws the product');
    assert.deepEqual((await service(db,'select public.jwl_revoked_media_files() r')).rows[0].r.sort(),bundle.evidence.map(e=>e.public_url).sort());
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

test('end to end: an open-licence bundle from the pipeline records, publishes its credit and is withdrawn by revocation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-open-sql-'));
  const db=await database();
  try{
    const sharp=installedImageEngine();
    const gallery='https://brand.example.test/img/m126234-0015.png';
    const c=normalizeBatch([{source_id:'test',external_id:'m126234-0015',source_url:'https://example.test/p/m126234-0015',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:[gallery],facts:[{key:'diameter',value:'41 mm'}]}])[0];
    await ingest(db,[c]);
    const grant=openGrant(c);await insertGrant(db,grant);
    const jpeg=await sharp({create:{width:1200,height:1500,channels:3,background:'#3c3631'}}).jpeg().toBuffer();
    const fetcher=async url=>{if(!url.startsWith('https://upload.wikimedia.org/'))throw Error('unexpected '+url);return url.endsWith('/robots.txt')?new Response('',{status:404}):new Response(jpeg,{headers:{'content-type':'image/jpeg'}});};
    const kept=await acquireOriginal({candidate:c,asset_url:original,grant,output_directory:root},{fetcher,pacer:createMediaPacer({sleep:async()=>{}})});
    const assetFile={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
    const prepared=await prepareGrantedMedia({source:{id:'test',origin:'https://example.test',publication_allowed:true},candidate:c,asset:assetFile,grant,output_directory:root});
    const bundle=approvalBundle({candidate:c,grant,items:[{asset:assetFile,manifest:prepared.manifest,verification:{asset_sha256:kept.sha256,verified_reference:c.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check',
      checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}}}],public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media'});
    const rpc=async(url,init)=>{
      const name=String(url).split('/rpc/')[1],args=JSON.parse(init.body);
      if(name==='jwl_record_media_approval')return new Response(JSON.stringify((await service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(args.evidence),JSON.stringify(args.approval)])).rows[0].r));
      if(name==='jwl_publish_candidate')return new Response(JSON.stringify((await service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[args.candidate,args.revision,JSON.stringify(args.product)])).rows[0].r));
      throw Error('unexpected rpc '+name);
    };
    const config={url:'https://project.supabase.co',key:'synthetic-test-key'};
    const tampered=structuredClone(bundle);tampered.approval.approved_image_variants[0].attribution.creator='Someone else';
    await assert.rejects(recordMediaApproval(tampered,config,rpc),/exact visible attribution/,'the database re-derives the credit from the grant');
    assert.equal((await recordMediaApproval(bundle,config,rpc)).evidence_rows,bundle.evidence.length,'the pipeline credit matches the database derivation exactly');
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-watch-m126234-0015',reference:c.external_id,brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',
      name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    await assert.rejects(publish(review,config,rpc),/Source publication not approved/,'the source publication flag stays a separate owner decision');
    await db.exec("update jwl_internal.sources set publication_allowed=true where id='test'");
    const stripped=structuredClone(review);delete stripped.image_variants[0].attribution;
    await assert.rejects(publish(stripped,config,rpc),/differ from approved media/,'a published image cannot drop its credit');
    await publish(review,config,rpc);
    const live=(await as(db,'anon',()=>db.query('select image_variants from public.jwl_catalog where id=$1',[c.candidate_id]))).rows[0];
    assert.deepEqual(live.image_variants[0].attribution,credit,'the visible credit is public with the image');
    await as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-open-01'"));
    assert.equal((await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0].active,false,'revocation withdraws the product');
    assert.equal((await as(db,'anon',()=>db.query('select count(*)::int n from public.jwl_catalog'))).rows[0].n,0);
    await assert.rejects(as(db,'service_role',()=>db.exec('update jwl_internal.media_grants set revoked_at=null')),/cannot be restored/);
    await assert.rejects(publish(review,config,rpc),/approval missing or revoked/i);
    assert.deepEqual((await service(db,'select public.jwl_revoked_media_files() r')).rows[0].r.sort(),bundle.evidence.map(e=>e.public_url).sort());
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'columns',(select jsonb_agg(table_name||'.'||column_name||':'||data_type||':'||ordinal_position order by table_name,ordinal_position) from information_schema.columns where table_schema in ('jwl_internal','public')),
  'triggers',(select jsonb_agg(tgrelid::regclass::text||'.'||tgname order by tgrelid::regclass::text,tgname) from pg_trigger where not tgisinternal)) s`).then(r=>r.rows[0].s);

test('the migration keeps existing evidence valid, and the rollback restores the applied definitions or refuses while open-licence evidence exists',async()=>{
  const db=await database({open:false});
  try{
    const c=row('test','REF-7');await ingest(db,[c]);
    await service(db,"insert into jwl_internal.media_grants(grant_reference,kind,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference) values('grant-owner-01','owner_original',$1,'[]'::jsonb,true,true,true,'synthetic owner photo record')",[c.candidate_id]);
    const owner=entry('e',null);for(const v of owner.variants)await asset(db,c,v,{grant_reference:'grant-owner-01',original_source:'owner-original:'+sha('a')});
    await approve(db,c,'grant-owner-01',[owner]);
    const data=async()=>(await db.query("select (select jsonb_agg(to_jsonb(g)-'recorded_at') from jwl_internal.media_grants g) g,(select jsonb_agg(p.approved_image_variants) from jwl_internal.publication_approvals p) p")).rows[0];
    const before=await snapshot(db),rows=await data();
    await db.exec(await readFile(proposed,'utf8'));
    assert.notDeepEqual(await snapshot(db),before);
    await db.exec(await readFile(rollback,'utf8'));
    assert.deepEqual(await snapshot(db),before,'rollback restores every function, privilege, constraint, column and trigger');
    assert.deepEqual(await data(),rows,'existing evidence is unchanged');
    await db.exec(await readFile(proposed,'utf8'));await widenScope(db);
    await insertGrant(db,openGrant(c));
    await assert.rejects(db.exec(await readFile(rollback,'utf8')),/rollback refused/);
    await db.exec('rollback');
    assert.equal((await db.query("select count(*)::int n from jwl_internal.media_grants where kind='open_license'")).rows[0].n,1,'a refused rollback changes nothing');
  }finally{await db.close();}
});
