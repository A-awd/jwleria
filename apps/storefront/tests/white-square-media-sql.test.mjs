import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

// Synthetic fixtures only: invented files on example.test hosts. The decision 0022 migration (applied in production as
// 20261101181522) runs in memory here; nothing reaches a real database.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const WHITE_NAME='20261101181522_jwleria_white_square_media.sql';
const WHITE=new URL(WHITE_NAME,migrations);
const ROLLBACK=new URL('../supabase/proposed/jwleria_white_square_media.rollback.sql',import.meta.url);
const W_RESIZED='background removed, placed on a square white background, resized and converted to WebP';
const CUT='background removed, resized and converted to WebP';
const sha=c=>c.repeat(64);
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&!f.endsWith('_jwleria_bulk_media_contract.sql')&&f!==WHITE_NAME).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
const row=ref=>normalizeBatch([{source_id:'test',external_id:ref,source_url:'https://example.test/p/'+ref,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+ref,
  name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+ref+'.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
const name='Synthetic_square_watch_TEST.jpg',md5=createHash('md5').update(name).digest('hex');
const file={source_page_url:'https://commons.wikimedia.org/wiki/File:'+name,file_url:`https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${name}`,file_kind:'original',rendition_width:null,title:null};
const LICENCE=['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'];
const grant=(db,c,reference)=>service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,
  license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference,share_alike_review) values($1,'open_license','test',$2,'[]'::jsonb,true,true,true,'synthetic licence review',
  'CC-BY-SA-4.0',$3,'Synthetic Photographer',$4::jsonb,'Synthetic Photographer via Wikimedia Commons','decisions/0016-verified-open-licence-photo-batches.md','synthetic ShareAlike review')`,
  [reference,c.candidate_id,LICENCE[1],JSON.stringify([file])]);
const src=(w,ch)=>`https://media.example.test/v1/${sha('d')}/${sha('a')}/${w}w-${sha(ch)}.webp`;
const credit=changes=>({creator:'Synthetic Photographer',license:LICENCE[0],license_url:LICENCE[1],source_url:file.source_page_url,changes});
// One image: three files of the given shape, each with its evidence row. File checksums use other characters than the
// original (a), master (b) and square (c), which the treatment check keeps distinct from every file.
function image(c,reference,{chars,width,height,changes,treatment,extra={}}){
  const variants=[320,640,width].map((w,i)=>({src:src(w,chars[i]),width:w,height:Math.round(height*w/width),bytes:40000+i}));
  const entry={src:variants[2].src,width,height,variants,attribution:credit(changes),...extra};
  const evidence=variants.map(v=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,
    original_source:file.file_url,original_sha256:sha('a'),grant_reference:reference,verified_reference:c.external_id,verification_reference:'synthetic identity check',...(treatment??{})}));
  return {entry,evidence};
}
const square=(clipped=false)=>({treatment:'white_square',treatment_version:1,cutout_master_sha256:sha('b'),treatment_reference:'synthetic white square review',square_sha256:sha('c'),source_clipped:clipped});
const approval=(c,reference,images)=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,media_reference:reference,image_verified:true,approved_images:images.map(i=>i.entry.src),approved_image_variants:images.map(i=>i.entry)});
const record=(db,images,c,reference)=>service(db,'select public.jwl_record_presentation_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(images.flatMap(i=>i.evidence)),JSON.stringify(approval(c,reference,images))]).then(r=>r.rows[0].r);
const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'columns',(select jsonb_agg(table_name||'.'||column_name||':'||data_type||':'||ordinal_position order by table_name,ordinal_position) from information_schema.columns where table_schema in ('jwl_internal','public')),
  'triggers',(select jsonb_agg(tgrelid::regclass::text||'.'||tgname order by tgrelid::regclass::text,tgname) from pg_trigger where not tgisinternal)) s`).then(r=>r.rows[0].s);

test('a white square replaces a live approval in place, with its square, master and source flag; the old images restore it',async()=>{
  const db=await database();
  try{
    const c=row('m126200-0006');await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
    await grant(db,c,'grant-sq');
    await db.exec(await readFile(WHITE,'utf8'));
    // The live state before decision 0022: a cutout and its photograph.
    const cut=image(c,'grant-sq',{chars:'123',width:960,height:1013,changes:CUT,treatment:{treatment:'background_removal',treatment_version:1,cutout_master_sha256:sha('b'),treatment_reference:'synthetic cutout review'}});
    const photo=image(c,'grant-sq',{chars:'456',width:960,height:1013,changes:'resized and converted to WebP'});
    const first=await record(db,[cut,photo],c,'grant-sq');
    assert.equal(first.replaced,false);
    const white=image(c,'grant-sq',{chars:'789',width:1414,height:1414,changes:W_RESIZED,treatment:square(),extra:{canvas:'white_square'}});
    const second=await record(db,[white],c,'grant-sq');
    assert.equal(second.replaced,true,'the live approval is replaced in place, not duplicated');
    assert.deepEqual(second.previous_approved_images,[cut.entry.src,photo.entry.src],'the receipt keeps the previous image set for rollback');
    const stored=(await db.query('select approved_image_variants v from jwl_internal.publication_approvals where candidate_id=$1',[c.candidate_id])).rows[0].v;
    assert.deepEqual(stored,[white.entry]);
    assert.equal((await db.query("select count(*)::int n from jwl_internal.media_assets where treatment='white_square' and square_sha256=$1 and source_clipped=false",[sha('c')])).rows[0].n,3);
    // Rollback of the data: the old images, with their unchanged evidence, are recorded again.
    const back=await record(db,[cut,photo],c,'grant-sq');
    assert.equal(back.replaced,true);
    assert.deepEqual((await db.query('select approved_images i from jwl_internal.publication_approvals where candidate_id=$1',[c.candidate_id])).rows[0].i,[cut.entry.src,photo.entry.src]);
    await assert.rejects(db.exec(await readFile(ROLLBACK,'utf8')),/rollback refused/,'the schema rollback refuses while white square evidence exists');
    await db.exec('rollback');
  }finally{await db.close();}
});

test('the white square rules refuse a missing canvas, credit or limitation, a mixed image and a non-square file',async()=>{
  const db=await database();
  try{
    const c=row('m126200-0006');await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
    await grant(db,c,'grant-sq');await db.exec(await readFile(WHITE,'utf8'));
    const make=(chars,o)=>image(c,'grant-sq',{chars,width:900,height:900,changes:W_RESIZED,treatment:square(),extra:{canvas:'white_square'},...o});
    await assert.rejects(record(db,[make('012',{extra:{}})],c,'grant-sq'),/Only a white square image is shown on the white square canvas/);
    await assert.rejects(record(db,[make('013',{changes:CUT})],c,'grant-sq'),/exact visible attribution/,'a white square credit must state the white square');
    await assert.rejects(record(db,[make('014',{treatment:square(true)})],c,'grant-sq'),/must say so/,'a source-clipped white square must disclose it');
    const disclosed=await record(db,[make('015',{treatment:square(true),extra:{canvas:'white_square',source_clipped:true}})],c,'grant-sq');
    assert.equal(disclosed.replaced,false);
    await assert.rejects(record(db,[image(c,'grant-sq',{chars:'de4',width:900,height:900,changes:'resized and converted to WebP',extra:{canvas:'white_square'}})],c,'grant-sq'),/Only a white square/,'a plain photograph cannot claim the canvas');
    // A plain photograph may disclose that its source cuts the product off.
    const plain=await record(db,[image(c,'grant-sq',{chars:'789',width:960,height:720,changes:'resized and converted to WebP',extra:{source_clipped:true}})],c,'grant-sq');
    assert.equal(plain.replaced,true);
    const bad=(o)=>service(db,`insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference,
      treatment,treatment_version,cutout_master_sha256,treatment_reference,square_sha256,source_clipped) values($1,$2,$3,$4,$5,$6,$7,$8,'grant-sq',$9,'x',$10,1,$11,'synthetic review',$12,$13)`,
      [c.candidate_id,c.revision_hash,src(o.w,o.ch),sha(o.ch),o.w,o.h,file.file_url,sha('a'),c.external_id,o.t,sha('b'),o.sq??null,o.cl??null]);
    await assert.rejects(bad({ch:'e',w:900,h:901,t:'white_square',sq:sha('c'),cl:false}),/jwl_media_asset_treatment_check/,'a white square file is square');
    await assert.rejects(bad({ch:'f',w:900,h:900,t:'white_square',cl:false}),/jwl_media_asset_treatment_check/,'a white square names its square');
    await assert.rejects(bad({ch:'0',w:900,h:900,t:'white_square',sq:sha('c')}),/jwl_media_asset_treatment_check/,'a white square states its source flag');
    await assert.rejects(bad({ch:'9',w:900,h:900,t:'background_removal',sq:sha('c')}),/jwl_media_asset_treatment_check/,'a cutout carries no square');
    await assert.rejects(bad({ch:'8',w:900,h:900,t:'white_square',sq:sha('b'),cl:false}),/jwl_media_asset_treatment_check/,'the square is not the alpha master');
    const valid=entry=>db.query('select jwl_internal.valid_image_variants($1::jsonb,$2::jsonb) v',[JSON.stringify([entry.src]),JSON.stringify([entry])]).then(r=>r.rows[0].v);
    const sq=make('de0').entry;
    assert.equal(await valid(sq),true);
    assert.equal(await valid({...sq,canvas:'sand'}),false);
    assert.equal(await valid({...sq,source_clipped:false}),false,'source_clipped only discloses');
    const wide=image(c,'grant-sq',{chars:'de1',width:960,height:720,changes:W_RESIZED}).entry;
    assert.equal(await valid({...wide,canvas:'white_square'}),false,'the canvas is square');
    await assert.rejects(service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb)',[JSON.stringify(make('de2').evidence),JSON.stringify(approval(c,'grant-sq',[make('de2')]))]),/recorded only through/);
    await grant(db,c,'grant-other');
    await assert.rejects(record(db,[image(c,'grant-other',{chars:'de3',width:900,height:900,changes:W_RESIZED,treatment:square(),extra:{canvas:'white_square'}})],c,'grant-other'),/keeps its grant/);
  }finally{await db.close();}
});

test('the white square migration rolls back exactly when no white square data exists',async()=>{
  const db=await database();
  try{
    const before=await snapshot(db);
    await db.exec(await readFile(WHITE,'utf8'));
    assert.notDeepEqual(await snapshot(db),before);
    await db.exec(await readFile(ROLLBACK,'utf8'));
    assert.deepEqual(await snapshot(db),before,'every function, privilege, constraint, column and trigger is restored');
  }finally{await db.close();}
});
