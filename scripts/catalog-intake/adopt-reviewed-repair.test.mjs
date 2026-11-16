import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installedImageEngine} from './responsive-media.mjs';
import {composeCutoutMaster} from './cutout.mjs';
import {normalizeFlatTile} from './flat-tile.mjs';
import {openLedger,record} from './batch-ledger.mjs';
import {bundleReviewed} from './batch-official.mjs';
import {seedIndependentBatch,adoptReviewedRepair,relocatedResults,acceptanceProblem} from './adopt-reviewed-repair.mjs';

// Synthetic private batches only: drawn scenes, masks and review records in temporary directories. No product
// photograph is read, nothing is downloaded, recorded, uploaded or published.
const sharp=installedImageEngine();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const W=1000,H=900,source_id='test-only-official',KEY=`${source_id}:TESTREF001`,OLD='/nonexistent-old-host/batch';
const inBody=(x,y)=>x>=150&&x<850&&y>=150&&y<850,inHole=(x,y)=>x>=400&&x<600&&y>=200&&y<320;
const grant={grant_reference:'test-only-owner-direction',kind:'owner_directed_official',source_id,candidate_id:null,media_origins:['https://example.test'],
  website_publication:true,resize:true,webp_encode:true,background_removal:true,evidence_reference:'decision-0025'};
const cutoutChecks=['background_only_removed','no_background_or_other_object_retained','whole_product_retained','edges_clean_on_frame_background','no_redrawn_or_generated_detail'];
const tileChecks=['source_alpha_accepted','tile_accepted_by_exact_hash','photographed_material_preserved','whole_product_on_flat_tile'];
const checks=(names,value=true,failed=[])=>Object.fromEntries(names.map(n=>[n,failed.includes(n)?false:value]));

/** A mask of the drawn bag; blobs are the see-through defect a rejected master had. */
function maskOf(blobs){
  const mask=Buffer.alloc(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inBody(x,y)&&!inHole(x,y))mask[y*W+x]=x===150||x===849||y===150||y===849?128:255;
  for(const {cx,cy,r,low} of blobs)for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){const d=Math.hypot(x-cx,y-cy)/r;if(d<1)mask[y*W+x]=Math.round(low+(255-low)*d*d);}
  return mask;
}
async function put(dir,bytes,ext){const s=sha(bytes),path=join(dir,`${s}.${ext}`);await writeFile(path,bytes);return {path,sha256:s};}

/** A source batch as the existing pipeline leaves it, written with an old host's path prefix; and a repair package. */
async function fixture(){
  const base=await mkdtemp(join(tmpdir(),'jwl-adopt-TEST-ONLY-')),src=join(base,'source'),pkg=join(base,'repairs');
  for(const d of ['originals','cutouts','tiles'])await mkdir(join(src,d),{recursive:true});
  await mkdir(pkg);
  const raw=Buffer.alloc(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)raw.set(!inBody(x,y)||inHole(x,y)?[236-(y>>6),237,238]:((x>>5)+(y>>5))&1?[16,16,16]:[1,128,59],(y*W+x)*3);
  const original=await sharp(raw,{raw:{width:W,height:H,channels:3}}).png().toBuffer(),o=await put(join(src,'originals'),original,'png');
  const cutOf=async blobs=>composeCutoutMaster({original,mask:maskOf(blobs),width:W,height:H},sharp);
  const negCut=await put(join(src,'cutouts'),await cutOf([{cx:260,cy:600,r:14,low:41},{cx:700,cy:500,r:10,low:83}]),'png');
  const negTile=await put(join(src,'tiles'),(await normalizeFlatTile(await readFile(negCut.path),sharp)).png,'png');
  // A second processed item with its own transparency (no cutout) and a resolution hold: both must pass through unchanged.
  const alpha=Buffer.alloc(800*800*4);for(let y=50;y<750;y++)for(let x=50;x<750;x++)alpha.set([40,60,90,255],(y*800+x)*4);
  const native=await sharp(alpha,{raw:{width:800,height:800,channels:4}}).png().toBuffer(),n=await put(join(src,'originals'),native,'png');
  const nTile=await put(join(src,'tiles'),(await normalizeFlatTile(native,sharp)).png,'png');
  const small=await put(join(src,'originals'),await sharp({create:{width:300,height:300,channels:3,background:'#7a5230'}}).png().toBuffer(),'png');
  const ledger=await openLedger(join(src,'ledger.ndjson')),run={run_id:'TEST-ONLY-seed'};
  const walk=async(key,steps)=>{for(const [to,evidence,reason] of steps)await record(ledger,{key,to,evidence,...(reason?{reason}:{}),...run},{max_quarantined:10});};
  const start=o=>[['discovered',{}],['matched',{}],['rights_ready',{grant_reference:grant.grant_reference}],['acquired',{original_sha256:o}]];
  await walk(KEY,[...start(o.sha256),['processed',{original_sha256:o.sha256,tile_sha256:negTile.sha256,cutout_sha256:negCut.sha256}]]);
  await walk(`${source_id}:TESTREF002`,[...start(n.sha256),['processed',{original_sha256:n.sha256,tile_sha256:nTile.sha256}]]);
  await walk(`${source_id}:TESTREF003`,[...start(small.sha256),['quarantined',{original_sha256:small.sha256},'low_resolution']]);
  await walk(`${source_id}:TESTREF004`,[['discovered',{}],['matched',{}]]);
  const old=p=>p.replace(src,OLD);
  const results={
    [KEY]:{ref:'TESTREF001',model:'TEST-ONLY model',colour:'Grass/black',size:null,asset_url:'https://example.test/TESTREF001.jpg',
      original:{path:old(o.path),sha256:o.sha256,bytes:original.length,width:W,height:H,has_alpha:false},tile:{sha256:negTile.sha256,path:old(negTile.path),side:1030},
      cutout:{sha256:negCut.sha256,path:old(negCut.path),producer:'foreground-mask (macOS Vision, local)'}},
    [`${source_id}:TESTREF002`]:{ref:'TESTREF002',model:'TEST-ONLY model',colour:'Blue',size:null,asset_url:'https://example.test/TESTREF002.png',
      original:{path:old(n.path),sha256:n.sha256,bytes:native.length,width:800,height:800,has_alpha:true},tile:{sha256:nTile.sha256,path:old(nTile.path),side:1030}},
    [`${source_id}:TESTREF003`]:{ref:'TESTREF003',model:'TEST-ONLY model',colour:'Brown',size:null,asset_url:'https://example.test/TESTREF003.jpg',
      original:{path:old(small.path),sha256:small.sha256,width:300,height:300,has_alpha:false},quarantine:'low_resolution',error:'Insufficient source resolution'}};
  await writeFile(join(src,'results.json'),JSON.stringify(results,null,1));
  // The repair package: the accepted repair, an unaccepted intermediate version, and their records.
  const accCut=await put(pkg,await cutOf([]),'png'),accTile=await put(pkg,(await normalizeFlatTile(await readFile(accCut.path),sharp)).png,'png');
  const v1Cut=await put(pkg,await cutOf([{cx:700,cy:500,r:10,low:83}]),'png'),v1Tile=await put(pkg,(await normalizeFlatTile(await readFile(v1Cut.path),sharp)).png,'png');
  const producer='TEST-ONLY scoped repair (local, deterministic, original pixels only)';
  const repairRecord=async(outputs,name)=>put(pkg,Buffer.from(JSON.stringify({schema:'jwleria-scoped-repair-run/1',ref:'TESTREF001',code:{sha256:'0'.repeat(64)},
    inputs:{original:{sha256:o.sha256},rejected:{cutout:{sha256:negCut.sha256},tile:{sha256:negTile.sha256}}},outputs})),name);
  const repair=await repairRecord({cutout:{...accCut,producer},tile:accTile,mask:{sha256:'1'.repeat(64)}},'json');
  const verification={asset_sha256:o.sha256,verified_reference:'TESTREF001',reviewer:'TEST-ONLY reviewer',verification_reference:'TEST-ONLY source review',
    checks:{exact_reference:'uncertain',color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
  const negativeRow={key:KEY,ref:'TESTREF001',review_status:'REJECTED_CUTOUT_AND_MASTER',verification,
    cutout_review:{cutout_sha256:negCut.sha256,original_sha256:o.sha256,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY negative cutout review',checks:checks(cutoutChecks,true,['whole_product_retained'])},
    tile_review:{tile_sha256:negTile.sha256,cutout_sha256:negCut.sha256,original_sha256:o.sha256,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY negative tile review',checks:checks(tileChecks,false)}};
  const acceptanceRow=(cut=accCut,tile=accTile)=>({key:KEY,ref:'TESTREF001',reviewer:'TEST-ONLY reviewer',independent_of_batch_writer:true,review_status:'ACCEPTED_REPAIRED_CUTOUT_AND_MASTER',verification,
    cutout_review:{cutout_sha256:cut.sha256,original_sha256:o.sha256,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY repair cutout review',checks:checks(cutoutChecks)},
    tile_review:{tile_sha256:tile.sha256,cutout_sha256:cut.sha256,original_sha256:o.sha256,reviewer:'TEST-ONLY reviewer',review_reference:'TEST-ONLY repair tile review',checks:checks(tileChecks)}});
  const file=async value=>put(pkg,Buffer.from(JSON.stringify(value)),'json');
  const preliminary=await file({ref:'TESTREF001',status:'HOLD',candidate_outputs:{cutout:{sha256:v1Cut.sha256},tile:{sha256:v1Tile.sha256}}});
  const superseded=[{cutout_sha256:v1Cut.sha256,tile_sha256:v1Tile.sha256,reviewer:'TEST-ONLY reviewer',status:'SUPERSEDED_NEGATIVE_CANDIDATE',reason:'TEST-ONLY hard edge',evidence:[preliminary]}];
  return {base,src,pkg,o,negCut,negTile,accCut,accTile,v1Cut,v1Tile,producer,repair,repairRecord,negativeRow,acceptanceRow,file,superseded,verification,
    negative:await file([negativeRow,{key:'other'}]),acceptance:await file([acceptanceRow()])};
}
async function digests(dir){
  const out={};
  for(const entry of await readdir(dir,{withFileTypes:true,recursive:true}))if(entry.isFile()){const p=join(entry.parentPath??entry.path,entry.name);out[p]=sha(await readFile(p));}
  return out;
}

test('an independent batch is seeded from the source by reference only: verified, relocated, the ledger byte-identical',async()=>{
  const f=await fixture(),out=join(f.base,'independent');
  try{
    const before=await digests(f.src),relocate=[{from:OLD,to:f.src}];
    assert.deepEqual(relocatedResults({a:{path:OLD+'/x.png',url:'https://example.test'+OLD}},relocate),{a:{path:f.src+'/x.png',url:'https://example.test'+OLD}});
    await assert.rejects(seedIndependentBatch({source:f.src,out}),/differs from its recorded sha256|ENOENT/,'unresolved old-host paths are never trusted');
    await assert.rejects(seedIndependentBatch({source:f.src,out:join(f.src,'inside'),relocate}),/outside its source batch/);
    await assert.rejects(seedIndependentBatch({source:f.src,out:f.base,relocate}),/outside its source batch/);
    await mkdir(join(f.base,'busy'));await writeFile(join(f.base,'busy','x'),'x');
    await assert.rejects(seedIndependentBatch({source:f.src,out:join(f.base,'busy'),relocate}),/new, empty directory/);
    const counts=await seedIndependentBatch({source:f.src,out,relocate});
    assert.deepEqual(counts,{results:3,tiles:2,cutouts:1,quarantined:{low_resolution:1},unreached:1,verified_files:6});
    assert.equal(sha(await readFile(join(out,'ledger.ndjson'))),sha(await readFile(join(f.src,'ledger.ndjson'))),'the ledger is copied byte for byte');
    const seeded=JSON.parse(await readFile(join(out,'results.json'),'utf8')),old=JSON.parse(await readFile(join(f.src,'results.json'),'utf8'));
    assert.deepEqual(seeded,relocatedResults(old,relocate),'only path prefixes change');
    assert.equal(seeded[KEY].original.path,f.o.path,'media are referenced where they lie, not copied');
    assert.deepEqual((await readdir(out)).sort(),['ledger.ndjson','results.json','seed.json']);
    await assert.rejects(seedIndependentBatch({source:f.src,out,relocate}),/new, empty directory/,'a seed never overwrites');
    assert.deepEqual(await digests(f.src),before,'the source batch is only read');
  }finally{await rm(f.base,{recursive:true,force:true});}
});

test('an accepted repair is adopted by exact hash; its negative and superseded files are listed and the bundler refuses them',async()=>{
  const f=await fixture(),out=join(f.base,'independent');
  try{
    await seedIndependentBatch({source:f.src,out,relocate:[{from:OLD,to:f.src}]});
    const before=await digests(f.src),pkgBefore=await digests(f.pkg);
    const run={out,key:KEY,grant,basis:'TEST-ONLY accepted scoped repair',negative:f.negative,acceptance:f.acceptance,repair:f.repair,superseded:f.superseded,
      prepared_by:'TEST-ONLY batch writer',run_id:'TEST-ONLY-adopt'};
    const entries=async()=>(await openLedger(join(out,'ledger.ndjson'))).entries.length,start=await entries();
    const mutated=async edit=>{const row=f.acceptanceRow();edit(row);return f.file([row]);};
    await assert.rejects(adoptReviewedRepair({...run,acceptance:await mutated(r=>{r.tile_review.checks.whole_product_on_flat_tile='uncertain';})}),/not every check is literally true: tile_review.whole_product_on_flat_tile/);
    await assert.rejects(adoptReviewedRepair({...run,acceptance:await mutated(r=>{r.cutout_review.cutout_sha256=f.v1Cut.sha256;})}),/cutout review names other bytes/);
    await assert.rejects(adoptReviewedRepair({...run,acceptance:await mutated(r=>{r.independent_of_batch_writer=false;})}),/independent of the batch writer/);
    await assert.rejects(adoptReviewedRepair({...run,acceptance:await mutated(r=>{r.reviewer=r.cutout_review.reviewer=r.tile_review.reviewer='TEST-ONLY batch writer';})}),/prepared the batch or made the cutout/);
    await assert.rejects(adoptReviewedRepair({...run,acceptance:{...f.acceptance,sha256:'2'.repeat(64)}}),/differs from its recorded sha256/);
    const allPassed=JSON.parse(JSON.stringify(f.negativeRow));allPassed.cutout_review.checks=checks(cutoutChecks);allPassed.tile_review.checks=checks(tileChecks);
    await assert.rejects(adoptReviewedRepair({...run,negative:await f.file([allPassed])}),/at least one failed review check/);
    const elsewhere=await f.file({schema:'jwleria-scoped-repair-run/1',ref:'TESTREF001',inputs:{original:{sha256:f.o.sha256},rejected:{cutout:{sha256:f.v1Cut.sha256},tile:{sha256:f.v1Tile.sha256}}},outputs:{}});
    await assert.rejects(adoptReviewedRepair({...run,repair:elsewhere}),/repairs other files/);
    // A record pairing the accepted cutout with another tile: the tile step does not make that tile of that cutout.
    const swapped=await f.repairRecord({cutout:{...f.accCut,producer:f.producer},tile:f.v1Tile},'swap.json');
    await assert.rejects(adoptReviewedRepair({...run,repair:swapped,acceptance:await f.file([f.acceptanceRow(f.accCut,f.v1Tile)]),superseded:[]}),/not what the tile step makes/);
    await assert.rejects(adoptReviewedRepair({...run,superseded:[{...f.superseded[0],tile_sha256:f.accTile.sha256}]}),/does not name the superseded files/);
    await assert.rejects(adoptReviewedRepair({...run,superseded:[{...f.superseded[0],reason:''}]}),/reviewer, status and reason/);
    await assert.rejects(adoptReviewedRepair({...run,grant:{...grant,source_id:'another-official'}}),/grant row is for another source/);
    await assert.rejects(adoptReviewedRepair({...run,out:f.src}),/seeded independent batch/,'the source batch is never written');
    assert.equal(await entries(),start,'a refused adoption writes nothing');
    assert.equal(acceptanceProblem(f.acceptanceRow(),{original_sha256:f.o.sha256,cutout_sha256:f.accCut.sha256,tile_sha256:f.accTile.sha256,prepared_by:'TEST-ONLY batch writer',producer:f.producer}),null);

    const done=await adoptReviewedRepair(run);
    assert.deepEqual(done,{key:KEY,ref:'TESTREF001',state:'processed',cutout_sha256:f.accCut.sha256,tile_sha256:f.accTile.sha256,rejected:2});
    const ledger=await openLedger(join(out,'ledger.ndjson')),chain=ledger.entries.filter(e=>e.key===KEY).map(e=>e.to);
    assert.deepEqual(chain,['discovered','matched','rights_ready','acquired','processed','quarantined','matched','rights_ready','acquired','processed']);
    const last=ledger.state.get(KEY);
    assert.deepEqual([last.evidence.tile_sha256,last.evidence.cutout_sha256,last.evidence.adopted.repair_record_sha256],[f.accTile.sha256,f.accCut.sha256,f.repair.sha256]);
    assert.equal(ledger.entries.find(e=>e.key===KEY&&e.to==='quarantined').reason,'visual_rejected');
    const x=JSON.parse(await readFile(join(out,'results.json'),'utf8'))[KEY];
    assert.deepEqual([x.cutout.sha256,x.tile.sha256,x.cutout.path,x.tile.side],[f.accCut.sha256,f.accTile.sha256,f.accCut.path,1030]);
    assert.deepEqual(x.rejected.map(j=>[j.cutout_sha256,j.tile_sha256]),[[f.negCut.sha256,f.negTile.sha256],[f.v1Cut.sha256,f.v1Tile.sha256]]);
    assert.deepEqual(x.rejected[0].failed_checks.slice(0,2),['cutout_review.whole_product_retained','tile_review.source_alpha_accepted']);
    assert.equal(x.rejected[1].status,'SUPERSEDED_NEGATIVE_CANDIDATE');
    assert.deepEqual(x.adopted_review.review_references,['TEST-ONLY repair cutout review','TEST-ONLY repair tile review']);
    assert.equal((await readdir(join(out,'adoptions'))).length,1);
    await assert.rejects(adoptReviewedRepair(run),/must name this item's current cutout and tile|must be processed with its current/,'an adoption cannot be replayed');
    assert.deepEqual(await digests(f.src),before,'the source batch is untouched');
    for(const [p,s] of Object.entries(pkgBefore))assert.equal(sha(await readFile(p)),s,'repair files are referenced, never rewritten');

    // The actual bundler: fabricated all-true reviews of the negative, the superseded version or a mix are refused before
    // anything is prepared; a review of other bytes is refused; the accepted files without an honest revision stop too.
    await writeFile(join(out,'previews.json'),'{}');
    const fabricated=(cut,tile)=>{const r=f.acceptanceRow(cut,tile);r.review_status='TEST-ONLY fabricated all-true';return r;};
    const other={sha256:'e'.repeat(64)};
    const reviews=[fabricated(f.negCut,f.negTile),fabricated(f.v1Cut,f.v1Tile),fabricated(f.negCut,f.accTile),fabricated(f.accCut,f.v1Tile),fabricated(other,other),
      {...f.acceptanceRow(),ref:'TESTREF002'},f.acceptanceRow()];
    const report=await bundleReviewed({out,reviews,determinations:[],derivative_review:null,revisions:{},grant,
      source:{id:source_id,enabled:true,publication_allowed:true,origin:'https://example.test'},public_base_url:'https://example.test/storage/v1/object/public/jwl-product-media',
      prepared_by:'TEST-ONLY batch writer',dry_run:{label:'TEST-ONLY refusal check: expected source row, nothing is bundled'}});
    assert.deepEqual(report,{bundled:0,files:0,refused:7});
    const written=JSON.parse(await readFile(join(out,'bundles-prepared-dryrun','bundle-report.json'),'utf8'));
    assert.deepEqual(written.refused.map(r=>r.reason),['a rejected cutout or tile is never bundled','a rejected cutout or tile is never bundled','a rejected cutout or tile is never bundled',
      'a rejected cutout or tile is never bundled','reviews name other bytes','unknown or unprocessed item','Source-bound candidate and revision required']);
    await assert.rejects(access(join(out,'bundles-prepared-dryrun','publish.sql')),'nothing to publish when everything was refused');
    await assert.rejects(access(join(out,'bundles-prepared-dryrun','TESTREF001')),'no bundle directory was prepared');
  }finally{await rm(f.base,{recursive:true,force:true});}
});
