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
import {normalizeWhiteSquare,whiteSquareReviewChecks} from '../../../scripts/catalog-intake/white-square.mjs';
import {keepOpenLicenseFile,prepareGrantedMedia,approvalBundle} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {recordMediaApproval,laneMediaPublicationSql} from '../../../scripts/catalog-intake/supabase.mjs';
import {approvalQuery} from '../supabase/functions/jwl-media-upload/handler.js';
import {publicProduct} from '../src/server/supabase-catalog.mjs';

// Synthetic fixtures only: drawn shapes, an invented reference file and example.test hosts. Nothing reaches a real
// database, bucket or product. The decision 0022 migration runs in memory.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const WHITE_FILE=(await readdir(migrations)).find(f=>f.endsWith('_jwleria_white_square_media.sql'));
const WHITE=WHITE_FILE?new URL(WHITE_FILE,migrations):new URL('../supabase/proposed/jwleria_white_square_media.sql',import.meta.url);
const REFERENCE='m126234-0015',DECISION='decisions/0013-open-licence-exact-product-photos.md';
const W_RESIZED='background removed, placed on a square white background, resized and converted to WebP';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const name='Synthetic_white_square_watch_TEST.jpg',md5=createHash('md5').update(name).digest('hex');
const rendition={source_page_url:`https://commons.wikimedia.org/wiki/File:${name}`,file_url:`https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0,2)}/${name}/960px-${name}`,file_kind:'rendition',rendition_width:960,title:'Synthetic Watch'};
const LICENCE=['CC BY 2.0','https://creativecommons.org/licenses/by/2.0/'];
async function database(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const f of (await readdir(migrations)).filter(f=>f.endsWith('.sql')&&f!==WHITE_FILE).sort())await db.exec(await readFile(new URL(f,migrations),'utf8'));
  await db.exec(await readFile(WHITE,'utf8'));
  await db.exec("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.test','permitted-page','synthetic acquisition review',true,false,true)");
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};

test('end to end: a white square of a held open-licence rendition is prepared, reviewed by hash, recorded, opened for upload, published and projected',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-white-square-TEST-ONLY-'));
  const db=await database();
  try{
    const sharp=installedImageEngine();
    const c=normalizeBatch([{source_id:'test',external_id:REFERENCE,source_url:'https://example.test/p/'+REFERENCE,brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',
      translation_state:'provided',image_urls:['https://brand.example.test/img/'+REFERENCE+'.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
    await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
    await service(db,'select public.jwl_publish_factual_batch($1::jsonb,$2) r',[JSON.stringify([{candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:'test-'+c.external_id.toLowerCase(),reference:c.external_id,
      brand_slug:'test-brand',brand_name:c.brand,brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة',collection_en:c.collection,name_ar:c.name_ar,name_en:c.name_en,
      description_ar:c.description_ar,description_en:c.description_en,search_text:c.external_id.toLowerCase()}]),'synthetic facts-only instruction']);
    const grant={grant_reference:'grant-white',kind:'open_license',source_id:'test',candidate_id:c.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic licence review',
      license_code:'CC-BY-2.0',license_url:LICENCE[1],creator:'Synthetic Photographer',licensed_files:[rendition],attribution_text:'Synthetic Photographer via Wikimedia Commons',owner_decision_reference:DECISION};
    await service(db,`insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,evidence_reference,license_code,license_url,creator,licensed_files,attribution_text,owner_decision_reference)
      values($1,'open_license','test',$2,'[]'::jsonb,true,true,true,$3,$4,$5,$6,$7::jsonb,$8,$9)`,[grant.grant_reference,c.candidate_id,grant.evidence_reference,grant.license_code,grant.license_url,grant.creator,JSON.stringify([rendition]),grant.attribution_text,DECISION]);
    // A drawn 960 x 720 "held rendition" and masters that copy its stored pixels with new alpha.
    const W=960,H=720;
    const raw=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*3,inside=Math.hypot((x-480)/300,(y-360)/250)<1.02||(x>420&&x<540);raw[o]=inside?50+((x>>2)&15)*6:226;raw[o+1]=inside?45+((y>>2)&15)*5:222;raw[o+2]=inside?40:214;}
    const heldPath=join(root,'TEST-ONLY-held-rendition.jpg');await writeFile(heldPath,await sharp(raw,{raw:{width:W,height:H,channels:3}}).jpeg({quality:90}).toBuffer());
    const kept=await keepOpenLicenseFile({candidate:c,grant,file_url:rendition.file_url,local_path:heldPath,expected_sha256:hash(await readFile(heldPath)),output_directory:join(root,'private')});
    const {data}=await sharp(kept.path,{ignoreIcc:true}).raw().toBuffer({resolveWithObject:true});
    // A whole watch (an ellipse inside the frame) and a "bracelet" band that the photograph cuts at the top and bottom.
    const master=async(file,alphaAt)=>{const rgba=Buffer.alloc(W*H*4);for(let p=0;p<W*H;p++){const x=p%W,y=(p-x)/W;for(let k=0;k<3;k++)rgba[p*4+k]=data[p*3+k];rgba[p*4+3]=alphaAt(x,y);}
      const bytes=await sharp(rgba,{raw:{width:W,height:H,channels:4}}).png().toBuffer();await writeFile(join(root,file),bytes);return {path:join(root,file),sha256:hash(bytes),producer:'TEST-ONLY synthetic mask',bytes};};
    const ellipse=(x,y)=>{const d=Math.hypot((x-480)/300,(y-360)/250);return d<0.98?255:d>=1?0:Math.round((1-d)/0.02*255);};
    const whole=await master('TEST-ONLY-whole.png',ellipse);
    const accepted=(await normalizeWhiteSquare(whole.bytes,sharp)).record;
    assert.equal(accepted.clipped_by_source,false);
    const asset={path:kept.path,source_url:kept.source_url,sha256:kept.sha256};
    const source={id:'test',origin:'https://example.test',publication_allowed:true};
    await assert.rejects(prepareGrantedMedia({source,candidate:c,asset,grant,output_directory:join(root,'private'),cutout:whole,square_sha256:'0'.repeat(64)}),/differs from the accepted square/,'only the square accepted by its exact hash is used');
    const prepared=await prepareGrantedMedia({source,candidate:c,asset,grant,output_directory:join(root,'private'),cutout:whole,square_sha256:accepted.square_sha256});
    const m=prepared.manifest;
    assert.equal(m.pixel_source,'white_square');assert.equal(m.white_square.sha256,accepted.square_sha256);assert.equal(m.treatment.source_clipped,false);
    assert.ok([...m.variants,m.detail].every(f=>f.width===f.height&&f.width<=m.white_square.side),'every derivative is a square no larger than the square');
    assert.equal(m.processing.crop,false);assert.equal(m.processing.canvas.kind,'white_square');
    const verification={asset_sha256:kept.sha256,verified_reference:c.external_id,reviewer:'TEST-ONLY identity reviewer',verification_reference:'TEST-ONLY synthetic identity check',
      checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
    const cutout_review={cutout_sha256:whole.sha256,original_sha256:kept.sha256,reviewer:'TEST-ONLY visual reviewer',review_reference:'TEST-ONLY synthetic cutout comparison',checks:Object.fromEntries(cutoutReviewChecks.map(k=>[k,true]))};
    const square_review={square_sha256:accepted.square_sha256,cutout_sha256:whole.sha256,original_sha256:kept.sha256,reviewer:'TEST-ONLY visual reviewer',review_reference:'TEST-ONLY synthetic square comparison',checks:Object.fromEntries(whiteSquareReviewChecks.map(k=>[k,true]))};
    const bundleOf=(manifest,item)=>approvalBundle({candidate:c,grant,items:[{asset,manifest,verification,...item}],public_base_url:'https://project.supabase.co/storage/v1/object/public/jwl-product-media',prepared_by:'TEST-ONLY batch writer'});
    assert.throws(()=>bundleOf(m,{cutout_review}),/White square review must name this exact square/,'a white square needs the review of its exact square');
    assert.throws(()=>bundleOf(m,{cutout_review,square_review:{...square_review,checks:{...square_review.checks,photographed_material_preserved:false}}}),/review incomplete: photographed_material_preserved/);
    assert.throws(()=>bundleOf(m,{cutout_review,square_review:{...square_review,reviewer:'TEST-ONLY batch writer'}}),/reviewer prepared the batch/);
    const bundle=bundleOf(m,{cutout_review,square_review});
    const entry=bundle.approval.approved_image_variants[0];
    assert.equal(entry.canvas,'white_square');assert.equal(entry.source_clipped,undefined);assert.equal(entry.width,entry.height);
    assert.equal(entry.attribution.changes,W_RESIZED,'the credit states the removal, the white square, the resize and the conversion');
    assert.ok(bundle.evidence.every(e=>e.treatment==='white_square'&&e.square_sha256===accepted.square_sha256&&e.cutout_master_sha256===whole.sha256&&e.source_clipped===false&&e.original_sha256===kept.sha256));
    assert.match(bundle.evidence[0].treatment_reference,/^White square review of square [a-f0-9]{64}: TEST-ONLY synthetic square comparison \|\| Cutout review of master/);
    const called=[];
    const rpc=async(url,init)=>{const fn=String(url).split('/rpc/')[1],args=JSON.parse(init.body);called.push(fn);
      return new Response(JSON.stringify((await service(db,`select public.${fn}($1::jsonb,$2::jsonb) r`,[JSON.stringify(args.evidence),JSON.stringify(args.approval)])).rows[0].r));};
    const receipt=await recordMediaApproval(bundle,{url:'https://project.supabase.co',key:'synthetic-test-key'},rpc);
    assert.deepEqual(called,['jwl_record_presentation_approval']);assert.equal(receipt.replaced,false);
    // The deployed upload function opens exactly the recorded files of the live approval.
    const v=entry.variants[0];
    assert.equal((await service(db,approvalQuery,[v.src,bundle.evidence.find(e=>e.public_url===v.src).public_sha256,v.bytes,v.width,v.height])).rows.length,1);
    // Published on the open-licence lane, keeping every displayed fact.
    const fresh=(await db.query('select * from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0];
    const review={candidate_id:c.candidate_id,revision_hash:c.revision_hash,slug:fresh.slug,reference:fresh.reference,brand_slug:fresh.brand_slug,brand_name:fresh.brand_name,brand_tier:fresh.brand_tier,category_slug:fresh.category_slug,
      collection_slug:fresh.collection_slug,collection_ar:fresh.collection_ar,collection_en:fresh.collection_en,name_ar:fresh.name_ar,name_en:fresh.name_en,description_ar:fresh.description_ar,description_en:fresh.description_en,
      images:bundle.approval.approved_images,image_variants:bundle.approval.approved_image_variants};
    await service(db,laneMediaPublicationSql(review,fresh));
    const live=(await db.query('select * from public.jwl_catalog where id=$1',[c.candidate_id])).rows[0];
    // PostgREST returns timestamps as text; PGlite returns a Date.
    const product=publicProduct({...live,published_at:new Date(live.published_at).toISOString()});
    assert.equal(product.imageVariants[0].canvas,'white_square');assert.equal(product.imageVariants[0].attribution.changes,W_RESIZED);
    // A master that the photograph cuts off at the top and bottom: recorded, disclosed, and replacing the live approval.
    const band=await master('TEST-ONLY-band.png',(x,y)=>x>430&&x<530?255:0);
    const clippedSquare=(await normalizeWhiteSquare(band.bytes,sharp)).record;
    assert.equal(clippedSquare.clipped_by_source,true);
    const clipped=(await prepareGrantedMedia({source,candidate:c,asset,grant,output_directory:join(root,'private'),cutout:band,square_sha256:clippedSquare.square_sha256})).manifest;
    assert.equal(clipped.treatment.source_clipped,true);assert.deepEqual(clipped.cutout_master.check.failures,['product_touches_canvas_edge']);
    const second=bundleOf(clipped,{cutout_review:{...cutout_review,cutout_sha256:band.sha256},square_review:{...square_review,square_sha256:clippedSquare.square_sha256,cutout_sha256:band.sha256}});
    assert.equal(second.approval.approved_image_variants[0].source_clipped,true,'a source-clipped white square says so');
    assert.equal((await recordMediaApproval(second,{url:'https://project.supabase.co',key:'synthetic-test-key'},rpc)).replaced,true);
    assert.throws(()=>bundleOf(prepared.manifest,{cutout_review,square_review,source_clipped:true}),/source_clipped is a disclosure/,'a white square takes its limitation from its own record');
  }finally{await db.close();await rm(root,{recursive:true,force:true});}
});

test('a held open-licence original is kept only with the sha256 and size its live evidence recorded, never in place of a download otherwise',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-held-original-TEST-ONLY-'));
  try{
    const sharp=installedImageEngine();
    const c=normalizeBatch([{source_id:'test',external_id:'m126200-0006',source_url:'https://example.test/p/m126200-0006',brand:'Test brand',collection:'Test collection',product_name:'Test watch',name_ar:'ساعة اختبار',
      translation_state:'provided',image_urls:['https://brand.example.test/img/m126200-0006.png'],facts:[{key:'diameter',value:'36 mm'}]}])[0];
    const held='Synthetic_original_TEST.jpg',h=createHash('md5').update(held).digest('hex');
    const file={source_page_url:'https://commons.wikimedia.org/wiki/File:'+held,file_url:`https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0,2)}/${held}`,file_kind:'original',rendition_width:null,title:null};
    const grant={grant_reference:'grant-held',kind:'open_license',source_id:'test',candidate_id:c.candidate_id,media_origins:[],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic licence review',
      license_code:'CC-BY-SA-4.0',license_url:'https://creativecommons.org/licenses/by-sa/4.0/',creator:'Synthetic Photographer',licensed_files:[file],attribution_text:'Synthetic Photographer via Wikimedia Commons',
      owner_decision_reference:'decisions/0016-verified-open-licence-photo-batches.md',share_alike_review:'synthetic ShareAlike review'};
    const bytes=await sharp({create:{width:40,height:30,channels:3,background:{r:20,g:40,b:200}}}).jpeg().toBuffer();
    const path=join(root,'TEST-ONLY-held-original.jpg');await writeFile(path,bytes);
    const keep=extra=>keepOpenLicenseFile({candidate:c,grant,file_url:file.file_url,local_path:path,expected_sha256:hash(bytes),output_directory:join(root,'private'),...extra});
    await assert.rejects(keep({}),/download an original instead/,'without its recorded evidence a held original is refused');
    await assert.rejects(keep({recorded_original:{original_sha256:'f'.repeat(64),width:40,height:30}}),/sha256 and size its live evidence recorded/);
    await assert.rejects(keep({recorded_original:{original_sha256:hash(bytes),width:41,height:30}}),/differs from its recorded size/);
    const kept=await keep({recorded_original:{original_sha256:hash(bytes),width:40,height:30}});
    assert.equal(kept.sha256,hash(bytes));assert.equal(kept.source_url,file.file_url);assert.equal(kept.file_kind,'original');
  }finally{await rm(root,{recursive:true,force:true});}
});
