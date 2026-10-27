import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {openLicenses,acquireOriginal,keepOpenLicenseFile,createMediaPacer,prepareGrantedMedia,approvalBundle,commonsOriginal,openLicenseAttribution} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {responsiveImages} from '../src/server/responsive-media.mjs';
import {recordMediaApproval,publish} from '../../../scripts/catalog-intake/supabase.mjs';

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

async function database({open=true}={}){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  if(open)await db.exec(await readFile(proposed,'utf8'));
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
  attribution_text:'Synthetic Photographer, CC BY-SA 4.0, via Wikimedia Commons',owner_decision_reference:'synthetic owner decision 2026-10-26',...overrides});
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
      [{owner_decision_reference:'synthetic-owner-decision'},/check constraint/,'an undated decision'],
      [{owner_decision_reference:' synthetic owner decision 2026-10-26'},/check constraint/],
      [{owner_decision_reference:'synthetic owner decision\n2026-10-26'},/check constraint/],
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
    const c=normalizeBatch([{source_id:'test',external_id:'m126234-9999',source_url:'https://example.test/p/m126234-9999',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:['https://brand.example.test/img/m126234-9999.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
    await ingest(db,[c]);
    const files=[renditionFile('Synthetic_front_(1).jpg',960),renditionFile('Synthetic_angle_(2).jpg',960)];
    const grant=openGrant(c,{grant_reference:'grant-rendition-e2e',licensed_files:files});await insertGrant(db,grant);
    const items=[];
    for(const [i,f] of files.entries()){
      const local=join(root,`held-${i}.jpg`);
      await writeFile(local,await sharp({create:{width:960,height:i?540:720,channels:3,background:i?'#3c3631':'#5a5048'}}).jpeg().toBuffer());
      const kept=await keepOpenLicenseFile({candidate:c,grant,file_url:f.file_url,local_path:local,output_directory:join(root,'private')});
      assert.deepEqual([kept.file_kind,kept.rendition_width,kept.width],['rendition',960,960]);
      const assetFile={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
      const prepared=await prepareGrantedMedia({source:{id:'test',origin:'https://example.test',publication_allowed:true},candidate:c,asset:assetFile,grant,output_directory:join(root,'private')});
      items.push({asset:assetFile,manifest:prepared.manifest,performance_review_accepted:true,verification:{asset_sha256:kept.sha256,verified_reference:c.external_id,reviewer:'synthetic reviewer',verification_reference:'synthetic visual check',
        checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}}});
    }
    const bundle=approvalBundle({candidate:c,grant,items,public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media'});
    assert.deepEqual(bundle.approval.approved_image_variants.map(e=>[e.width,e.attribution.source_url,e.attribution.changes]),files.map(f=>[960,f.source_page_url,'resized and converted to WebP']));
    assert(bundle.evidence.every(e=>files.some(f=>f.file_url===e.original_source)&&e.width<=960));
    const receipt=(await service(db,'select public.jwl_record_media_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(bundle.evidence),JSON.stringify(bundle.approval)])).rows[0].r;
    assert.equal(receipt.evidence_rows,bundle.evidence.length);
    await db.exec("update jwl_internal.sources set publication_allowed=true where id='test'");
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-watch-m126234-9999',reference:c.external_id,brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',
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
    const gallery='https://brand.example.test/img/m126610ln-0001.png';
    const c=normalizeBatch([{source_id:'test',external_id:'m126610ln-0001',source_url:'https://example.test/p/m126610ln-0001',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',translation_state:'provided',image_urls:[gallery],facts:[{key:'diameter',value:'41 mm'}]}])[0];
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
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-watch-m126610ln-0001',reference:c.external_id,brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:'Test collection',
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
    await db.exec(await readFile(proposed,'utf8'));
    await insertGrant(db,openGrant(c));
    await assert.rejects(db.exec(await readFile(rollback,'utf8')),/rollback refused/);
    await db.exec('rollback');
    assert.equal((await db.query("select count(*)::int n from jwl_internal.media_grants where kind='open_license'")).rows[0].n,1,'a refused rollback changes nothing');
  }finally{await db.close();}
});
