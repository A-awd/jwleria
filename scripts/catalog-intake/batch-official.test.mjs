import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {composeCutoutMaster,validateCutoutMaster} from './cutout.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {openLedger,record,quarantineReasons} from './batch-ledger.mjs';
import {processingFailureReason,reprocessItem,failedReviewChecks,bundleReviewed} from './batch-official.mjs';

// Synthetic private batch only: a drawn opaque "packshot" on a drawn backdrop, its segmentation mask and a ledger, in
// a temporary directory. No product photograph is read, nothing is downloaded, recorded, uploaded or published.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('a processing failure is named by its cause: a format refusal is never called low resolution',()=>{
  const cases=[
    ['A flat tile source must be 8-bit sRGB','unsupported_image_format'],
    ['Unsupported image format: greyscale PNG with gAMA','unsupported_image_format'],
    ['Unsupported original color space or depth','unsupported_image_format'],
    ["Insufficient source resolution: the product's largest extent is 500 px; 653 px are needed for a 960 px square at fill 0.68",'low_resolution'],
    ['The product touches its source frame: a flat tile shows the whole product only','clipped_by_source'],
    ['Cutout master failed its check: product_material_made_transparent','cutout_failed'],
    ['A flat tile needs a source with its own transparency, or the local mask tool','cutout_failed'],
    ['The product has no foreground','processing_failed'],
  ];
  for(const [message,reason] of cases){assert.equal(processingFailureReason(message),reason,message);assert.ok(quarantineReasons.includes(reason));}
});

const W=1000,H=900,green=[1,128,59],black=[16,16,16];
const inBody=(x,y)=>x>=150&&x<850&&y>=150&&y<850,inHole=(x,y)=>x>=400&&x<600&&y>=200&&y<320;
const blobs=[{cx:260,cy:600,r:14,low:41},{cx:700,cy:500,r:10,low:83}];
async function scene(){
  const raw=Buffer.alloc(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)raw.set(!inBody(x,y)||inHole(x,y)?[236-(y>>6),237,238]:((x>>5)+(y>>5))&1?black:green,(y*W+x)*3);
  const original=await sharp(raw,{raw:{width:W,height:H,channels:3}}).png().toBuffer();
  const mask=Buffer.alloc(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inBody(x,y)&&!inHole(x,y))mask[y*W+x]=x===150||x===849||y===150||y===849?128:255;
  // The defect a rejected master had: soft see-through blobs inside the leather.
  for(const {cx,cy,r,low} of blobs)for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){const d=Math.hypot(x-cx,y-cy)/r;if(d<1)mask[y*W+x]=Math.round(low+(255-low)*d*d);}
  return {original,mask};
}
const key='test-only-official:TESTREF001',grant={kind:'owner_directed_official',grant_reference:'TEST-ONLY-owner-direction',source_id:'test-only-official'};

/** A processed item whose cutout and tile came from the defective mask, as the batch held it before its review. */
async function rejectedBatch(){
  const root=await mkdtemp(join(tmpdir(),'jwl-batch-reprocess-TEST-ONLY-'));
  for(const d of ['originals','cutouts','tiles'])await mkdir(join(root,d));
  const {original,mask}=await scene(),o=sha(original);
  const originalPath=join(root,'originals',o+'.png');await writeFile(originalPath,original);
  await writeFile(join(root,'cutouts',o+'.mask.raw'),mask);await writeFile(join(root,'cutouts',o+'.mask.json'),JSON.stringify({width:W,height:H,instances:1}));
  const cut=await composeCutoutMaster({original,mask,width:W,height:H},sharp),cutPath=join(root,'cutouts',sha(cut)+'.png');await writeFile(cutPath,cut);
  const {png:tile,record:t}=await normalizeFlatTile(cut,sharp),tilePath=join(root,'tiles',t.tile_sha256+'.png');await writeFile(tilePath,tile);
  const ledger=await openLedger(join(root,'ledger.ndjson'));
  for(const [to,evidence] of [['discovered',{}],['matched',{}],['rights_ready',{grant_reference:grant.grant_reference}],['acquired',{original_sha256:o}],['processed',{original_sha256:o,tile_sha256:t.tile_sha256,cutout_sha256:sha(cut)}]])
    await record(ledger,{key,to,evidence,run_id:'TEST-ONLY'});
  const results={[key]:{ref:'TESTREF001',model:'TEST-ONLY model',colour:'Grass/black',size:null,asset_url:'https://example.test/TESTREF001.jpg',
    original:{path:originalPath,sha256:o,bytes:original.length,width:W,height:H,has_alpha:false},tile:{sha256:t.tile_sha256,path:tilePath},cutout:{sha256:sha(cut),path:cutPath,producer:'foreground-mask (macOS Vision, local)'}}};
  await writeFile(join(root,'results.json'),JSON.stringify(results));
  const checks=(names,failed)=>Object.fromEntries(names.map(n=>[n,!failed.includes(n)]));
  const rejection={key,ref:'TESTREF001',review_status:'REJECTED_CUTOUT_AND_MASTER',
    verification:{asset_sha256:o,verified_reference:'TESTREF001',reviewer:'TEST-ONLY reviewer',verification_reference:'TEST-ONLY source review',checks:{exact_reference:'uncertain',color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}},
    cutout_review:{cutout_sha256:sha(cut),original_sha256:o,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY negative cutout review',
      checks:checks(['background_only_removed','no_background_or_other_object_retained','whole_product_retained','edges_clean_on_frame_background','no_redrawn_or_generated_detail'],['background_only_removed','whole_product_retained','edges_clean_on_frame_background'])},
    tile_review:{tile_sha256:t.tile_sha256,cutout_sha256:sha(cut),original_sha256:o,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY negative tile review',
      checks:checks(['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile'],['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile'])}};
  return {root,original,mask,o,cut:sha(cut),tile:t.tile_sha256,rejection};
}

test('a rejected cutout is recorded, re-cut from the same held original with only the proven mask loss repaired, and never bundled',async()=>{
  const b=await rejectedBatch();
  try{
    const run={out:b.root,key,grant,basis:'TEST-ONLY re-cut after a rejected review',run_id:'TEST-ONLY-reprocess'};
    // Nothing moves without a recorded rejection that names the current files and at least one failed check.
    await assert.rejects(reprocessItem(run),/Only an item quarantined after its original was held/);
    await assert.rejects(reprocessItem({...run,grant:{...grant,source_id:'another-official'}}),/grant row is for another source/);
    await assert.rejects(reprocessItem({...run,grant:{...grant,kind:'written_permission'}}),/source's own grant row/);
    const allPassed=JSON.parse(JSON.stringify(b.rejection));for(const s of ['cutout_review','tile_review'])for(const k in allPassed[s].checks)allPassed[s].checks[k]=true;
    await assert.rejects(reprocessItem({...run,rejection:allPassed}),/at least one failed review check/);
    await assert.rejects(reprocessItem({...run,rejection:{...b.rejection,tile_review:{...b.rejection.tile_review,tile_sha256:'c'.repeat(64)}}}),/current cutout and tile/);
    assert.deepEqual(failedReviewChecks(b.rejection).slice(0,2),['cutout_review.background_only_removed','cutout_review.whole_product_retained']);
    const maskBefore=sha(await readFile(join(b.root,'cutouts',b.o+'.mask.raw')));
    // No mask tool is given: the stored mask of these exact original bytes is reused and repaired.
    const r=await reprocessItem({...run,rejection:b.rejection});
    assert.equal(r.state,'processed');assert.notEqual(r.cutout_sha256,b.cut);assert.notEqual(r.tile_sha256,b.tile);assert.equal(r.rejected,1);
    assert.equal(sha(await readFile(join(b.root,'cutouts',b.o+'.mask.raw'))),maskBefore,'the stored mask itself is never rewritten');
    const x=JSON.parse(await readFile(join(b.root,'results.json'),'utf8'))[key];
    assert.equal(x.original.sha256,b.o,'the same held original; no new download');
    assert.deepEqual([x.rejected[0].cutout_sha256,x.rejected[0].tile_sha256,x.rejected[0].review_references],[b.cut,b.tile,['TEST-ONLY negative cutout review','TEST-ONLY negative tile review']]);
    assert.ok(x.rejected[0].failed_checks.includes('tile_review.photographed_material_preserved'));
    assert.equal(x.cutout.mask_repair.restored_regions,2);assert.match(x.cutout.producer,/enclosed-region mask repair/);
    const check=await validateCutoutMaster({original:{path:x.original.path,sha256:b.o},cutout:{path:x.cutout.path,sha256:x.cutout.sha256,producer:x.cutout.producer}},sharp);
    assert.equal(check.passed,true,check.failures.join());
    const old=await validateCutoutMaster({original:{path:x.original.path,sha256:b.o},cutout:{path:join(b.root,'cutouts',b.cut+'.png'),sha256:b.cut,producer:'TEST-ONLY'}},sharp);
    assert.deepEqual(old.failures,['product_material_made_transparent'],'the rejected master now fails the automated check too');
    const ledger=await openLedger(join(b.root,'ledger.ndjson')),chain=ledger.entries.filter(e=>e.key===key);
    assert.deepEqual(chain.map(e=>e.to),['discovered','matched','rights_ready','acquired','processed','quarantined','matched','rights_ready','acquired','processed']);
    assert.equal(chain[5].reason,'visual_rejected');assert.deepEqual([chain[5].evidence.cutout_sha256,chain[5].evidence.tile_sha256],[b.cut,b.tile]);
    assert.deepEqual([chain[8].evidence.original_sha256,chain[8].evidence.held_original_reused],[b.o,true]);
    assert.deepEqual([chain[9].evidence.cutout_sha256,chain[9].evidence.tile_sha256],[x.cutout.sha256,x.tile.sha256]);
    // The old rejection no longer names the current files, so it cannot be replayed.
    await assert.rejects(reprocessItem({...run,rejection:b.rejection}),/current cutout and tile/);

    // The bundler refuses the rejected files and any review naming another master, before preparing anything.
    await writeFile(join(b.root,'previews.json'),'{}');
    const accepted=JSON.parse(JSON.stringify(b.rejection));
    accepted.cutout_review.cutout_sha256=x.cutout.sha256;accepted.tile_review.cutout_sha256=x.cutout.sha256;accepted.tile_review.tile_sha256=x.tile.sha256;
    const reviews=[b.rejection,{...accepted,cutout_review:{...accepted.cutout_review,cutout_sha256:'d'.repeat(64)}},{...accepted,tile_review:{...accepted.tile_review,cutout_sha256:null}}];
    const report=await bundleReviewed({out:b.root,reviews,determinations:[],derivative_review:null,revisions:{},grant:{...grant,media_origins:['https://example.test']},
      source:{id:grant.source_id,enabled:true,publication_allowed:true,origin:'https://example.test'},public_base_url:'https://example.test/storage/v1/object/public/jwl-product-media',
      prepared_by:'TEST-ONLY batch writer',dry_run:{label:'TEST-ONLY refusal check'}});
    assert.deepEqual(report,{bundled:0,files:0,refused:3});
    const written=JSON.parse(await readFile(join(b.root,'bundles-prepared-dryrun','bundle-report.json'),'utf8'));
    assert.deepEqual(written.refused.map(r=>r.reason),['a rejected cutout or tile is never bundled','reviews name another cutout master','reviews name another cutout master']);
    await assert.rejects(access(join(b.root,'bundles-prepared-dryrun','publish.sql')),'nothing to publish when everything was refused');
    // A held original that changed is never re-cut.
    await writeFile(x.original.path,Buffer.concat([await readFile(x.original.path),Buffer.from([0])]));
    await assert.rejects(reprocessItem({...run,rejection:b.rejection}),/no longer matches its sha256/);
  }finally{await rm(b.root,{recursive:true,force:true});}
});
