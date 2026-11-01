import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {cutoutReviewChecks} from '../../../scripts/catalog-intake/cutout.mjs';
import {keepOpenLicenseFile,prepareGrantedMedia,approvalBundle} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {recordMediaApproval,mediaApprovalSql,lanePublicationProduct} from '../../../scripts/catalog-intake/supabase.mjs';
import {handleUpload,approvalQuery} from '../supabase/functions/jwl-media-upload/handler.js';
import {responsiveImages} from '../src/server/responsive-media.mjs';

// Synthetic fixtures only: drawn shapes, invented references and example.test hosts. The cutout migration (applied in
// production as 20261101104017) is exercised in memory here; nothing reaches a real database, bucket or product.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const CUTOUT='20261101104017_jwleria_cutout_media.sql';
const proposed=new URL(CUTOUT,migrations);
const rollback=new URL('../supabase/proposed/jwleria_cutout_media.rollback.sql',import.meta.url);
const DECISION='decisions/0013-open-licence-exact-product-photos.md';
const REFERENCE='m126234-0015';
const sha=c=>c.repeat(64);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const file=(width,c)=>`https://media.example.test/v1/${sha('d')}/${sha('a')}/${width}w-${sha(c)}.webp`;
const thumb=(name,width)=>{const md5=createHash('md5').update(decodeURIComponent(name)).digest('hex');
  return {source_page_url:`https://commons.wikimedia.org/wiki/File:${name}`,file_url:`https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0,2)}/${name}/${width}px-${name}`,file_kind:'rendition',rendition_width:width,title:'Synthetic Watch 36 - Test'};};
const rendition=thumb('Synthetic_cutout_watch_TEST.jpg',960);
const licences={'CC-BY-2.0':['CC BY 2.0','https://creativecommons.org/licenses/by/2.0/'],'CC-BY-SA-4.0':['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/']};
const creditFor=(code,changes)=>({creator:'Synthetic Photographer',license:licences[code][0],license_url:licences[code][1],source_url:rendition.source_page_url,changes,title:rendition.title});
const CUT='background removed, resized and converted to WebP';
const entry=(chars,attribution)=>({src:file(960,chars[2]),width:960,height:720,variants:[320,640,960].map((w,i)=>({src:file(w,chars[i]),width:w,height:w*3/4,bytes:40000+i})),...(attribution?{attribution}:{})});

const row=(source_id,external_id)=>normalizeBatch([{source_id,external_id,source_url:'https://example.test/p/'+external_id,brand:'Test brand',collection:'Test collection',product_name:'Test watch '+external_id,
  name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://example.test/img/'+external_id+'.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
async function database({cutout=true}={}){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  // Every applied migration before the cutout one, then (optionally) the cutout migration itself.
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&f!==CUTOUT).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  if(cutout)await db.exec(await readFile(proposed,'utf8'));
  await db.exec(`insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values
    ('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true),
    ('test-b','https://example.test','permitted-page','synthetic acquisition review',true,false,true)`);
  return db;
}
const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};
const service=(db,sql,params)=>as(db,'service_role',()=>db.query(sql,params));
const ingest=(db,records)=>service(db,'select public.jwl_ingest_missing_batch($1::jsonb) r',[JSON.stringify(records)]);
const openGrant=(c,{grant_reference='grant-open-cut',license_code='CC-BY-2.0'}={})=>service(db_(c),`insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,
  license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference) values($1,'open_license',$2,$3,'[]'::jsonb,true,true,true,'synthetic licence review',$4,$5,'Synthetic Photographer',$6::jsonb,'Synthetic Photographer via Wikimedia Commons',$7)`,
  [grant_reference,c.source_id,c.candidate_id,license_code,licences[license_code][1],JSON.stringify([rendition]),DECISION]);
// openGrant needs the database of its candidate; tests bind it once per database.
let current;const db_=()=>current;
const writtenGrant=(db,reference,background_removal)=>service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,media_origins,website_publication,resize,webp_encode,evidence_reference,background_removal)
  values($1,'written_permission','test','["https://example.test"]'::jsonb,true,true,true,'synthetic written permission',$2)`,[reference,background_removal]);
// Without background_removal the insert also runs before the migration, which adds that column.
const ownerGrant=(db,reference,c,background_removal)=>background_removal===undefined
  ?service(db,`insert into jwl_internal.media_grants(grant_reference,kind,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference)
    values($1,'owner_original',$2,'[]'::jsonb,true,true,true,'synthetic owner photo record')`,[reference,c.candidate_id])
  :service(db,`insert into jwl_internal.media_grants(grant_reference,kind,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,background_removal)
    values($1,'owner_original',$2,'[]'::jsonb,true,true,true,'synthetic owner photo record',$3)`,[reference,c.candidate_id,background_removal]);
// An evidence row; without a treatment it uses only the columns that exist before the migration.
const asset=(db,c,v,{grant_reference,original_source,original_sha256=sha('a'),treatment=null,master=sha('f'),version=1,reference='synthetic cutout check and comparison'})=>{
  const base=[c.candidate_id,c.revision_hash,v.src,v.src.match(/-([a-f0-9]{64})\.webp$/)[1],v.width,v.height,original_source,original_sha256,grant_reference,c.external_id];
  const columns='candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference';
  return treatment===null
    ?service(db,`insert into jwl_internal.media_assets(${columns}) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'synthetic identity check')`,base)
    :service(db,`insert into jwl_internal.media_assets(${columns},treatment,treatment_version,cutout_master_sha256,treatment_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'synthetic identity check',$11,$12,$13,$14)`,
      [...base,treatment,version,master,reference]);
};
const approve=(db,c,reference,entries)=>service(db,'insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images,approved_image_variants) values($1,$2,$3,true,$4::jsonb,$5::jsonb)',
  [c.candidate_id,c.revision_hash,reference,JSON.stringify(entries.map(e=>e.src)),JSON.stringify(entries)]);
const cutEvidence=async(db,c,e,options)=>{for(const v of e.variants)await asset(db,c,v,{treatment:'background_removal',...options});};
const plainEvidence=async(db,c,e,options)=>{for(const v of e.variants)await asset(db,c,v,options);};

test('before the cutout migration a cutout bundle fails closed: its recording entry point does not exist',async()=>{
  const db=await database({cutout:false});
  try{
    await assert.rejects(service(db,"select public.jwl_record_cutout_approval('[]'::jsonb,'{}'::jsonb)"),/does not exist/);
    const evidence=[{candidate_id:sha('1'),revision_hash:sha('2'),public_url:file(960,'3'),treatment:'background_removal'}];
    const called=[];
    const rpc=async url=>{called.push(String(url).split('/rpc/')[1]);return new Response('{"message":"function does not exist"}',{status:404});};
    await assert.rejects(recordMediaApproval({evidence,approval:{image_verified:true,candidate_id:sha('1')}},{url:'https://project.supabase.co',key:'synthetic-test-key'},rpc),/failed \(404\)/);
    assert.deepEqual(called,['jwl_record_cutout_approval'],'a bundle with cutout evidence never goes to the older entry point');
    assert.match(mediaApprovalSql({evidence,approval:{image_verified:true,candidate_id:sha('1')}}),/^select public\.jwl_record_cutout_approval\(/);
    assert.match(mediaApprovalSql({evidence:[{...evidence[0],treatment:undefined}],approval:{image_verified:true,candidate_id:sha('1')}}),/^select public\.jwl_record_media_approval\(/);
  }finally{await db.close();}
});

test('cutout evidence names one checked master of one original; a grant states the removal only for written permission',async()=>{
  const db=await database();current=db;
  try{
    const c=row('test','C-1');await ingest(db,[c]);await writtenGrant(db,'grant-written-cut',true);
    const v={src:file(320,'4'),width:320,height:240};
    const g={grant_reference:'grant-written-cut',original_source:'https://example.test/img/C-1.png'};
    for(const [over,label] of [[{master:null},'no master'],[{master:sha('a')},'master equals the original'],[{version:2},'unknown version'],[{treatment:'recolour'},'unknown treatment'],[{reference:' '},'blank record'],
      [{reference:'\t'},'a tab'],[{reference:'\n'},'a newline'],[{reference:'\u00a0\u3000'},'Unicode spaces Postgres trim() keeps'],[{reference:'x'.repeat(8001)},'over 8000 characters']])
      await assert.rejects(asset(db,c,v,{...g,treatment:'background_removal',...over}),/jwl_media_asset_treatment_check|violates check constraint/,label);
    await assert.rejects(service(db,`insert into jwl_internal.media_assets(candidate_id,revision_hash,public_url,public_sha256,width,height,original_source,original_sha256,grant_reference,verified_reference,verification_reference,cutout_master_sha256)
      values($1,$2,$3,$4,320,240,$5,$6,'grant-written-cut',$7,'x',$8)`,[c.candidate_id,c.revision_hash,v.src,sha('4'),g.original_source,sha('a'),c.external_id,sha('f')]),/jwl_media_asset_treatment_check/,'a master without a treatment');
    await asset(db,c,v,{...g,treatment:'background_removal'});
    await assert.rejects(ownerGrant(db,'grant-owner-flag',c,true),/jwl_media_grant_background_removal_check/,'an owner original is covered by decision 0015, not by a flag');
    const o=row('test',REFERENCE);await ingest(db,[o]);
    await assert.rejects(service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference,background_removal)
      values('grant-open-flag','open_license','test',$1,'[]'::jsonb,true,true,true,'x','CC-BY-2.0',$2,'Synthetic Photographer',$3::jsonb,'Synthetic Photographer',$4,true)`,[o.candidate_id,licences['CC-BY-2.0'][1],JSON.stringify([rendition]),DECISION]),/jwl_media_grant_background_removal_check/,'an open licence is covered by its licence, not by a flag');
  }finally{await db.close();}
});

test('an open-licence cutout needs its own credit, one master, an adaptation-friendly licence; other grants need their basis',async()=>{
  const db=await database();current=db;
  try{
    const c=row('test',REFERENCE),sa=row('test-b',REFERENCE);await ingest(db,[c,sa]);
    await openGrant(c);await openGrant(sa,{grant_reference:'grant-open-sa',license_code:'CC-BY-SA-4.0'});
    const o={grant_reference:'grant-open-cut',original_source:rendition.file_url};
    const cut=entry('123'),mixed=entry('456'),two=entry('789'),plain=entry('abc');
    await cutEvidence(db,c,cut,o);
    await plainEvidence(db,c,plain,o);
    await asset(db,c,mixed.variants[0],{...o,treatment:'background_removal'});await plainEvidence(db,c,{variants:mixed.variants.slice(1)},o);
    await asset(db,c,two.variants[0],{...o,treatment:'background_removal',master:sha('e')});await cutEvidence(db,c,{variants:two.variants.slice(1)},o);
    const refused=(e,changes,pattern,label)=>assert.rejects(approve(db,c,'grant-open-cut',[{...e,attribution:creditFor('CC-BY-2.0',changes)}]),pattern,label);
    await refused(cut,'resized and converted to WebP',/exact visible attribution/,'a cutout credit must state the removal');
    await refused(cut,'background removed and converted to WebP',/exact visible attribution/,'a rendition is always credited as resized');
    await refused(cut,'background removed, cropped and converted to WebP',/exact visible attribution/,'only the listed texts');
    await refused(plain,CUT,/exact visible attribution/,'an image that is not a cutout may not claim the removal');
    await refused(mixed,CUT,/mixes cutout and other evidence/);
    await refused(two,CUT,/one cutout master of one original/);
    // Not 'f': the synthetic master is f…f, and a derivative is never its own master (refused above).
    const saCut=entry('012');await cutEvidence(db,sa,saCut,{grant_reference:'grant-open-sa',original_source:rendition.file_url});
    await assert.rejects(approve(db,sa,'grant-open-sa',[{...saCut,attribution:creditFor('CC-BY-SA-4.0',CUT)}]),/needs a licence review first/,'ShareAlike needs a licence review');
    await approve(db,c,'grant-open-cut',[{...cut,attribution:creditFor('CC-BY-2.0',CUT)}]);

    const w=row('test','W-1');await ingest(db,[w]);
    await writtenGrant(db,'grant-written-no',false);await writtenGrant(db,'grant-written-yes',true);
    const wNo=entry('111'),wYes=entry('222');
    await cutEvidence(db,w,wNo,{grant_reference:'grant-written-no',original_source:'https://example.test/img/W-1.png'});
    await cutEvidence(db,w,wYes,{grant_reference:'grant-written-yes',original_source:'https://example.test/img/W-1.png'});
    await assert.rejects(approve(db,w,'grant-written-no',[wNo]),/does not cover background removal/);
    await assert.rejects(approve(db,w,'grant-written-yes',[{...wYes,attribution:creditFor('CC-BY-2.0',CUT)}]),/only for open-licence/,'a written grant still carries no credit');
    await approve(db,w,'grant-written-yes',[wYes]);

    const p=row('test','O-1');await ingest(db,[p]);await ownerGrant(db,'grant-owner-cut',p);
    const pe=entry('333');await cutEvidence(db,p,pe,{grant_reference:'grant-owner-cut',original_source:'owner-original:'+sha('a')});
    await approve(db,p,'grant-owner-cut',[pe]);
  }finally{await db.close();}
});

test('cutout evidence is recorded only through jwl_record_cutout_approval, exactly as sent',async()=>{
  const db=await database();current=db;
  try{
    const p=row('test','O-2');await ingest(db,[p]);await ownerGrant(db,'grant-owner-rpc',p);
    const e=entry('444');
    const evidence=e.variants.map(v=>({candidate_id:p.candidate_id,revision_hash:p.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,
      original_source:'owner-original:'+sha('a'),original_sha256:sha('a'),grant_reference:'grant-owner-rpc',verified_reference:p.external_id,verification_reference:'synthetic identity check',
      treatment:'background_removal',treatment_version:1,cutout_master_sha256:sha('f'),treatment_reference:'synthetic cutout check and comparison'}));
    const approval={candidate_id:p.candidate_id,revision_hash:p.revision_hash,media_reference:'grant-owner-rpc',image_verified:true,approved_images:[e.src],approved_image_variants:[e]};
    const call=(name,ev,ap=approval)=>service(db,`select public.${name}($1::jsonb,$2::jsonb) r`,[JSON.stringify(ev),JSON.stringify(ap)]);
    await assert.rejects(call('jwl_record_media_approval',evidence),/only through jwl_record_cutout_approval/);
    await assert.rejects(call('jwl_record_cutout_approval',evidence.map(({treatment,treatment_version,cutout_master_sha256,treatment_reference,...rest})=>rest)),/needs cutout evidence/);
    await assert.rejects(call('jwl_record_cutout_approval',evidence.map(r=>({...r,treatment:null}))),/needs cutout evidence/,'a null treatment is no cutout');
    const uncited={...evidence[0],public_url:file(320,'7'),public_sha256:sha('7')};
    await assert.rejects(call('jwl_record_cutout_approval',[...evidence,uncited]),/must be cited by its approval/,'cutout evidence no image cites is never stored unchecked');
    assert.equal((await db.query('select count(*)::int n from jwl_internal.media_assets')).rows[0].n,0,'a refused call stores nothing');
    assert.equal((await call('jwl_record_cutout_approval',evidence)).rows[0].r.evidence_rows,3);
    assert.deepEqual((await db.query('select distinct treatment,treatment_version,cutout_master_sha256,original_sha256 from jwl_internal.media_assets')).rows,[{treatment:'background_removal',treatment_version:1,cutout_master_sha256:sha('f'),original_sha256:sha('a')}]);
    assert.equal((await call('jwl_record_cutout_approval',evidence)).rows[0].r.evidence_rows,3,'an identical replay is idempotent');
    await assert.rejects(call('jwl_record_cutout_approval',evidence.map(r=>({...r,treatment_reference:'another record'}))),/Stored media evidence differs/);
    for(const role of ['anon','authenticated'])await assert.rejects(as(db,role,()=>db.query("select public.jwl_record_cutout_approval('[]'::jsonb,'{}'::jsonb)")),/permission denied/);
  }finally{await db.close();}
});

const snapshot=db=>db.query(`select jsonb_build_object(
  'functions',(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('jwl_internal','public')),
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'columns',(select jsonb_agg(table_name||'.'||column_name||':'||data_type||':'||ordinal_position order by table_name,ordinal_position) from information_schema.columns where table_schema in ('jwl_internal','public')),
  'triggers',(select jsonb_agg(tgrelid::regclass::text||'.'||tgname order by tgrelid::regclass::text,tgname) from pg_trigger where not tgisinternal)) s`).then(r=>r.rows[0].s);

test('the migration keeps existing media valid, and the rollback restores the applied definitions or refuses while cutout evidence exists',async()=>{
  const db=await database({cutout:false});current=db;
  try{
    // Existing media as production has it: an open-licence photograph with its credit, and an owner original.
    const c=row('test',REFERENCE),p=row('test','O-3');await ingest(db,[c,p]);
    await openGrant(c);await ownerGrant(db,'grant-owner-old',p);
    const live=entry('555',creditFor('CC-BY-2.0','resized and converted to WebP')),owned=entry('666');
    await plainEvidence(db,c,live,{grant_reference:'grant-open-cut',original_source:rendition.file_url});
    await plainEvidence(db,p,owned,{grant_reference:'grant-owner-old',original_source:'owner-original:'+sha('a')});
    await approve(db,c,'grant-open-cut',[live]);await approve(db,p,'grant-owner-old',[owned]);
    const data=async()=>(await db.query("select (select jsonb_agg(to_jsonb(g)-'recorded_at' order by grant_reference) from jwl_internal.media_grants g) g,(select jsonb_agg(to_jsonb(a)-'recorded_at' order by public_url) from jwl_internal.media_assets a) a,(select jsonb_agg(p.approved_image_variants order by candidate_id) from jwl_internal.publication_approvals p) p")).rows[0];
    const before=await snapshot(db),rows=await data();
    await db.exec(await readFile(proposed,'utf8'));
    assert.notDeepEqual(await snapshot(db),before);
    // The new evidence rules accept every existing approval when it is checked again.
    await service(db,'update jwl_internal.publication_approvals set approved_images=approved_images');
    const strip=v=>({...v,g:v.g.map(({background_removal,...g})=>g),a:v.a.map(({treatment,treatment_version,cutout_master_sha256,treatment_reference,...a})=>a)});
    const after=await data();
    assert.ok(after.g.every(g=>g.background_removal===false)&&after.a.every(a=>a.treatment===null),'existing rows gain only empty treatment fields');
    assert.deepEqual(strip(after),rows,'existing grants, evidence and approvals are otherwise unchanged');
    await db.exec(await readFile(rollback,'utf8'));
    assert.deepEqual(await snapshot(db),before,'rollback restores every function, privilege, constraint, column and trigger');
    assert.deepEqual(await data(),rows,'existing media is unchanged');
    await db.exec(await readFile(proposed,'utf8'));
    await writtenGrant(db,'grant-written-flag',true);
    await assert.rejects(db.exec(await readFile(rollback,'utf8')),/rollback refused/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from jwl_internal.media_grants where background_removal')).rows[0].n,1,'a refused rollback changes nothing');
  }finally{await db.close();}
});

// Facts-only publication through the existing factual lane, as production published every product.
const publishFacts=(db,c)=>service(db,'select public.jwl_publish_factual_batch($1::jsonb,$2) r',[JSON.stringify([{candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,
  brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,
  description_ar:c.description_ar,description_en:c.description_en,search_text:c.external_id.toLowerCase()}]),'synthetic facts-only instruction']);

test('end to end: a synthetic cutout of a held open-licence rendition records, uploads, publishes its localized credit on the lane and is withdrawn by revocation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-cutout-sql-TEST-ONLY-'));
  const db=await database();current=db;
  try{
    const sharp=installedImageEngine();
    const c=normalizeBatch([{source_id:'test',external_id:REFERENCE,source_url:'https://example.test/p/'+REFERENCE,brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',
      translation_state:'provided',image_urls:['https://brand.example.test/img/'+REFERENCE+'.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
    await ingest(db,[c]);await publishFacts(db,c);await openGrant(c);
    const grant={grant_reference:'grant-open-cut',kind:'open_license',source_id:'test',candidate_id:c.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic licence review',
      license_code:'CC-BY-2.0',license_url:licences['CC-BY-2.0'][1],creator:'Synthetic Photographer',licensed_files:[rendition],attribution_text:'Synthetic Photographer via Wikimedia Commons',owner_decision_reference:DECISION};
    // A drawn "held rendition" (960 px, as the grant records) and a master that copies its stored pixels with new alpha.
    const W=960,H=720,inside=(x,y)=>Math.hypot((x-480)/300,(y-360)/250);
    const raw=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*3,d=inside(x,y);raw[o]=d<1.02?50+((x>>2)&15)*6:226;raw[o+1]=d<1.02?45+((y>>2)&15)*5:222;raw[o+2]=d<1.02?40:214;}
    const heldPath=join(root,'TEST-ONLY-held-rendition.jpg');await writeFile(heldPath,await sharp(raw,{raw:{width:W,height:H,channels:3}}).jpeg({quality:90}).toBuffer());
    const kept=await keepOpenLicenseFile({candidate:c,grant,file_url:rendition.file_url,local_path:heldPath,expected_sha256:hash(await readFile(heldPath)),output_directory:join(root,'private')});
    const {data}=await sharp(kept.path,{ignoreIcc:true}).raw().toBuffer({resolveWithObject:true});
    const rgba=Buffer.alloc(W*H*4);for(let p=0;p<W*H;p++){const x=p%W,y=(p-x)/W,d=inside(x,y);for(let k=0;k<3;k++)rgba[p*4+k]=data[p*3+k];rgba[p*4+3]=d<0.98?255:d>=1?0:Math.round((1-d)/0.02*255);}
    const masterPath=join(root,'TEST-ONLY-cutout-master.png'),masterBytes=await sharp(rgba,{raw:{width:W,height:H,channels:4}}).png().toBuffer();await writeFile(masterPath,masterBytes);
    const cutout={path:masterPath,sha256:hash(masterBytes),producer:'TEST-ONLY synthetic mask'};
    const asset={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
    const prepared=await prepareGrantedMedia({source:{id:'test',origin:'https://example.test',publication_allowed:true},candidate:c,asset,grant,output_directory:join(root,'private'),cutout});
    const verification={asset_sha256:kept.sha256,verified_reference:c.external_id,reviewer:'TEST-ONLY identity reviewer',verification_reference:'TEST-ONLY synthetic identity check',
      checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
    const cutout_review={cutout_sha256:cutout.sha256,original_sha256:kept.sha256,reviewer:'TEST-ONLY cutout reviewer',review_reference:'TEST-ONLY synthetic cutout comparison',checks:Object.fromEntries(cutoutReviewChecks.map(k=>[k,true]))};
    const bundleOf=item=>approvalBundle({candidate:c,grant,items:[{asset,manifest:prepared.manifest,verification,...item}],public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media',prepared_by:'TEST-ONLY batch writer'});
    assert.throws(()=>bundleOf({}),/exact cutout master and original/,'a cutout needs its visual comparison');
    // The bundle refuses whatever would let an image pass with less than the full cutout contract.
    const m=prepared.manifest,withManifest=(manifest,item={cutout_review})=>()=>approvalBundle({candidate:c,grant,items:[{asset,manifest,verification,...item}],public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media',prepared_by:'TEST-ONLY batch writer'});
    const ordinary=(await prepareGrantedMedia({source:{id:'test',origin:'https://example.test',publication_allowed:true},candidate:c,asset,grant,output_directory:join(root,'private')})).manifest;
    assert.throws(withManifest(ordinary),/not a cutout/,'a review cannot turn an ordinary image into a cutout');
    const {treatment:_t,...unmarked}=m;
    assert.throws(withManifest({...unmarked,binding:{...m.binding,treatment:undefined}}),/not a checked background-only cutout/,'a cutout stripped of two markers is still a cutout');
    assert.throws(withManifest({...m,treatment:{...m.treatment,producer:null}}),/producer named/,'the producer must be named so the review can be checked against it');
    assert.throws(withManifest({...m,variants:m.variants.map((v,i)=>i===1?{...v,alpha_max_delta:7}:v)}),/changed its alpha channel/,'no exception covers an alpha difference');
    const bundle=bundleOf({cutout_review});
    assert.ok(bundle.evidence.every(e=>e.treatment==='background_removal'&&e.cutout_master_sha256===cutout.sha256&&e.original_sha256===kept.sha256&&e.original_source===rendition.file_url),'evidence names the untouched original and the master');
    const credit=bundle.approval.approved_image_variants[0].attribution;
    assert.deepEqual(credit,creditFor('CC-BY-2.0',CUT),'the credit states the removal, the resize and the conversion');
    const called=[];
    const rpc=async(url,init)=>{
      const name=String(url).split('/rpc/')[1],args=JSON.parse(init.body);called.push(name);
      if(name==='jwl_record_cutout_approval')return new Response(JSON.stringify((await service(db,'select public.jwl_record_cutout_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(args.evidence),JSON.stringify(args.approval)])).rows[0].r));
      throw Error('unexpected rpc '+name);
    };
    assert.equal((await recordMediaApproval(bundle,{url:'https://project.supabase.co',key:'synthetic-test-key'},rpc)).evidence_rows,bundle.evidence.length);
    assert.deepEqual(called,['jwl_record_cutout_approval']);
    // The deployed upload function's own handler opens each recorded cutout file, and nothing else.
    const stored=new Map(),digest=async b=>hash(b);
    const deps={public_base:'https://project.supabase.co/storage/v1/object/public/jwl-product-media/',digest,
      approved:async(...params)=>(await service(db,approvalQuery,params)).rows.length===1,
      put:async(path,b)=>{if(stored.has(path))return 'exists';stored.set(path,b);return 'uploaded';},get:async path=>stored.get(path)};
    for(const upload of bundle.uploads){
      const bytes=await readFile(join(root,'private',upload.path));
      assert.equal((await sharp(bytes).metadata()).hasAlpha,true,'the public file keeps its transparency');
      const response=await handleUpload(new Request('https://function.example.test/',{method:'PUT',headers:{'x-jwl-path':upload.path,'content-type':'image/webp'},body:bytes}),deps);
      assert.equal(response.status,201,upload.path);
    }
    // A well-formed, content-addressed transparent WebP that no approval cites is refused by the approval check itself.
    const strayBytes=await sharp({create:{width:320,height:240,channels:4,background:{r:10,g:20,b:30,alpha:0.5}}}).webp().toBuffer();
    const stray=bundle.uploads[0].path.replace(/w-[a-f0-9]{64}\.webp$/,'w-'+hash(strayBytes)+'.webp');
    const refusedUpload=await handleUpload(new Request('https://function.example.test/',{method:'PUT',headers:{'x-jwl-path':stray,'content-type':'image/webp'},body:strayBytes}),deps);
    assert.deepEqual([refusedUpload.status,(await refusedUpload.json()).error],[403,'no_live_recorded_approval'],'a file the approval does not cite is refused');
    const fresh=(await db.query('select * from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0];
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'watches',
      collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,description_ar:c.description_ar,description_en:c.description_en,
      images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    const lane=lanePublicationProduct(review,fresh);
    await service(db,'select public.jwl_publish_candidate($1,$2,$3::jsonb) r',[lane.candidate,lane.revision,JSON.stringify(lane.product)]);
    const live=(await as(db,'anon',()=>db.query('select images,image_variants,search_text from public.jwl_catalog where id=$1',[c.candidate_id]))).rows[0];
    assert.equal(live.search_text,fresh.search_text,'the lane changed only the images');
    const shown=responsiveImages(live.image_variants,live.images,false)[0].attribution;
    assert.equal(shown.changes,CUT,'the storefront reads the credit');
    const {t}=await import('../src/i18n/ui.ts');
    assert.equal(t('ar').variants.credit.changed[shown.changes],'إزالة الخلفية وتغيير الحجم والتحويل إلى WebP','and shows it in reviewed Arabic');
    assert.equal(t('en').variants.credit.changed[shown.changes],CUT);
    assert.equal(hash(await readFile(heldPath)),kept.sha256,'the held original is untouched');
    await as(db,'service_role',()=>db.exec("update jwl_internal.media_grants set revoked_at=now() where grant_reference='grant-open-cut'"));
    assert.equal((await db.query('select active from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0].active,false,'revocation withdraws the product');
    assert.deepEqual((await service(db,'select public.jwl_revoked_media_files() r')).rows[0].r.sort(),bundle.evidence.map(e=>e.public_url).sort(),'and lists its files for deletion');
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});
