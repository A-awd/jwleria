import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {join,isAbsolute,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openLedger,record} from './batch-ledger.mjs';
import {failedReviewChecks} from './batch-official.mjs';
import {validateCutoutMaster,cutoutReviewChecks} from './cutout.mjs';
import {normalizeFlatTile,flatTileReviewChecks} from './flat-tile.mjs';
import {installedImageEngine,privateOutputRoot} from './responsive-media.mjs';

// Adoption of independently accepted scoped repairs (scoped-mask-repair.mjs) into a NEW, independent private batch
// record. The existing reprocessItem re-cuts through the default path and cannot reproduce a reviewed repair, so this
// opt-in helper adopts the exact accepted files instead, by hash, and creates nothing:
// - seedIndependentBatch only reads the source batch. It copies the append-only ledger byte for byte, writes the results
//   with old-host path prefixes resolved into the new record (no historical file is edited), and refers to every
//   original, cutout and tile where it already lies, after checking each one against its recorded sha256;
// - adoptReviewedRepair records the item's negative review (processed -> quarantined visual_rejected) and lists the
//   rejected files on the item together with any superseded candidate, so the bundler refuses all of them whatever
//   review is supplied; it then walks the ledger back to processed with the accepted cutout and tile. The accepted files
//   must be named by an independent acceptance with every check literally true, pass validateCutoutMaster against the
//   held original, and the tile must be exactly what normalizeFlatTile makes of the cutout.
// No source flag, grant, revision, identity or derivative approval is created or assumed; nothing is uploaded, recorded
// in a database or published. Implementation rules (decision 0010), not owner approvals.

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;
const text=value=>typeof value==='string'&&value.trim().length>0;
const sameName=(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
const within=(root,path)=>{const tail=relative(root,path);return !tail||(!tail.startsWith('..'+sep)&&tail!=='..'&&!isAbsolute(tail));};
const once=(path,bytes)=>writeFile(path,bytes,{flag:'wx',mode:0o600});
const json=value=>Buffer.from(JSON.stringify(value,null,1)+'\n');
const limits={max_quarantined:400};

async function heldFile(file,label){
  if(!file||!isAbsolute(file.path??'')||!hashPattern.test(file.sha256??''))throw Error(`${label} needs an absolute path and its recorded sha256`);
  const stat=await lstat(file.path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1)throw Error(`${label} must be a regular file`);
  const bytes=await readFile(file.path);
  if(digest(bytes)!==file.sha256)throw Error(`${label} differs from its recorded sha256`);
  return bytes;
}

/** The results with every absolute path under a `from` prefix moved to its `to` prefix; other values are unchanged. */
export function relocatedResults(results,relocate=[]){
  for(const r of relocate)if(!isAbsolute(r?.from??'')||!isAbsolute(r?.to??''))throw Error('A relocation maps one absolute path prefix to another');
  const move=value=>{
    if(typeof value==='string'){for(const {from,to} of relocate)if(value===from||value.startsWith(from+'/'))return to+value.slice(from.length);return value;}
    if(Array.isArray(value))return value.map(move);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,move(v)]));
    return value;
  };
  return move(results);
}

/**
 * A new, independent batch record from an existing one: out must be a new (or empty) directory outside the source.
 * Every result must agree with the ledger's latest state (a tile item processed with the same original, cutout and tile;
 * a quarantined item with the same reason); ledger items without a result must not be past acquisition (unreached).
 * Returns the counts it verified.
 */
export async function seedIndependentBatch({source,out,relocate=[]}){
  const from=await privateOutputRoot(source),root=await privateOutputRoot(out);
  if(within(from,root)||within(root,from))throw Error('The independent batch must lie outside its source batch, and the source outside it');
  const present=await readdir(root).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  if(present.length)throw Error('The independent batch needs a new, empty directory');
  const resultsBytes=await readFile(join(from,'results.json')),ledgerBytes=await readFile(join(from,'ledger.ndjson'));
  const ledger=await openLedger(join(from,'ledger.ndjson'));
  const results=relocatedResults(JSON.parse(resultsBytes),relocate);
  const counts={results:0,tiles:0,cutouts:0,quarantined:{},unreached:0,verified_files:0};
  for(const [key,x] of Object.entries(results)){
    counts.results++;
    const state=ledger.state.get(key);
    if(!state)throw Error('A result has no ledger entry: '+key);
    if(x.original?.path){await heldFile(x.original,'The original of '+x.ref);counts.verified_files++;}
    if(x.tile){
      const e=state.evidence??{};
      if(state.to!=='processed'||e.tile_sha256!==x.tile.sha256||(e.cutout_sha256??null)!==(x.cutout?.sha256??null)||e.original_sha256!==x.original?.sha256)throw Error('Ledger and results disagree for '+key);
      await heldFile(x.tile,'The tile of '+x.ref);counts.verified_files++;counts.tiles++;
      if(x.cutout){await heldFile(x.cutout,'The cutout of '+x.ref);counts.verified_files++;counts.cutouts++;}
      for(const path of [x.cutout?.mask_repair?.record,x.cutout?.stray_removal?.record].filter(Boolean))if(!(await lstat(path)).isFile())throw Error('A cutout record is missing for '+key);
    }else if(x.quarantine){
      if(state.to!=='quarantined'||state.reason!==x.quarantine)throw Error('Ledger and results disagree for '+key);
      counts.quarantined[x.quarantine]=(counts.quarantined[x.quarantine]??0)+1;
    }else throw Error('A result is neither processed nor quarantined: '+key);
  }
  for(const [key,state] of ledger.state)if(!Object.hasOwn(results,key)){
    if(!['discovered','matched','rights_ready'].includes(state.to))throw Error('A ledger item past acquisition has no result: '+key);
    counts.unreached++;
  }
  await mkdir(root,{recursive:true,mode:0o700});
  const moved=Buffer.from(JSON.stringify(results,null,1));
  await once(join(root,'ledger.ndjson'),ledgerBytes);
  await once(join(root,'results.json'),moved);
  await once(join(root,'seed.json'),json({schema:'jwl-independent-batch-seed/1',seeded_at:new Date().toISOString(),
    source:{root:from,results_sha256:digest(resultsBytes),ledger_sha256:digest(ledgerBytes),ledger_entries:ledger.entries.length},relocate,
    seeded:{results_sha256:digest(moved),ledger_sha256:digest(ledgerBytes)},counts,
    note:'The source batch was only read. Paths were resolved into this new record; media are referenced where they lie, by sha256.'}));
  return counts;
}

/** The one row of an immutable review file (a list, or one record) that names this key. */
async function reviewRow(file,key,label){
  const parsed=JSON.parse(await heldFile(file,label+' file'));
  const rows=(Array.isArray(parsed)?parsed:[parsed]).filter(r=>r?.key===key);
  if(rows.length!==1)throw Error(`${label} file must hold exactly one row for ${key}`);
  return rows[0];
}

/**
 * Null, or why an acceptance does not accept exactly these files: an independent reviewer, every cutout and tile check
 * literally true, the exact cutout, tile and original named, and neither the batch writer nor the producer as reviewer
 * (a name comparison; independence is otherwise procedural). Code never creates an acceptance.
 */
export function acceptanceProblem(row,{original_sha256,cutout_sha256,tile_sha256,prepared_by,producer}){
  const c=row?.cutout_review,t=row?.tile_review;
  if(!text(row?.reviewer)||row.independent_of_batch_writer!==true)return 'the acceptance needs its reviewer, independent of the batch writer';
  if(!hashPattern.test(cutout_sha256??'')||!hashPattern.test(tile_sha256??''))return 'no exact cutout and tile to accept';
  if(c?.cutout_sha256!==cutout_sha256||c.original_sha256!==original_sha256)return 'the cutout review names other bytes';
  if(t?.tile_sha256!==tile_sha256||t.cutout_sha256!==cutout_sha256||t.original_sha256!==original_sha256)return 'the tile review names other bytes';
  if(row.verification!==undefined&&row.verification?.asset_sha256!==original_sha256)return 'the carried source verification names another original';
  for(const r of [c,t])if(!text(r.reviewer)||!text(r.review_reference))return 'each review needs its reviewer and record';
  const failed=[...cutoutReviewChecks.filter(k=>c.checks?.[k]!==true).map(k=>'cutout_review.'+k),...flatTileReviewChecks.filter(k=>t.checks?.[k]!==true).map(k=>'tile_review.'+k)];
  if(failed.length)return 'not every check is literally true: '+failed.join(',');
  for(const r of [row,c,t])if([prepared_by,producer].some(name=>text(name)&&sameName(r.reviewer,name)))return 'the reviewer prepared the batch or made the cutout';
  return null;
}

/** A candidate that was never accepted, listed as rejected: its exact files and the immutable records that hold it negative. */
async function supersededEntry(s){
  if(!hashPattern.test(s?.cutout_sha256??'')||!hashPattern.test(s.tile_sha256??''))throw Error('A superseded candidate names its exact cutout and tile');
  if(!text(s.reviewer)||!text(s.status)||!text(s.reason))throw Error('A superseded candidate needs its reviewer, status and reason');
  if(!Array.isArray(s.evidence)||!s.evidence.length)throw Error('A superseded candidate cites the records that hold it negative');
  for(const e of s.evidence){
    const body=(await heldFile(e,'A superseded candidate record')).toString('utf8');
    if(!body.includes(s.cutout_sha256)||!body.includes(s.tile_sha256))throw Error('A cited record does not name the superseded files');
  }
  return {cutout_sha256:s.cutout_sha256,tile_sha256:s.tile_sha256,reviewer:s.reviewer,status:s.status,reason:s.reason,evidence:s.evidence.map(e=>({path:e.path,sha256:e.sha256}))};
}

/**
 * Adopts one accepted scoped repair into a seeded independent batch. negative and acceptance are immutable review files
 * ({path, sha256}) holding one row for the key; repair is the scoped repair's own run record ({path, sha256}), which names
 * the original, the rejected files it repaired and its outputs. superseded lists candidates that were never accepted.
 */
export async function adoptReviewedRepair({out,key,grant,basis,negative,acceptance,repair,superseded=[],prepared_by,run_id,sharp=installedImageEngine()}){
  if(!text(basis))throw Error('An adoption needs its basis');
  if(!text(prepared_by))throw Error('An adoption needs the batch writer named (prepared_by)');
  if(!text(run_id))throw Error('An adoption needs its run id');
  if(grant?.kind!=='owner_directed_official'||!text(grant.grant_reference)||!text(grant.source_id))throw Error("An adoption needs the source's own grant row");
  if(!key?.startsWith(grant.source_id+':'))throw Error('The grant row is for another source');
  const root=await privateOutputRoot(out);
  const seed=JSON.parse(await readFile(join(root,'seed.json'),'utf8').catch(()=>'{}'));
  if(seed.schema!=='jwl-independent-batch-seed/1')throw Error('An adoption writes only into a seeded independent batch');
  const ledger=await openLedger(join(root,'ledger.ndjson'));
  const results=JSON.parse(await readFile(join(root,'results.json'),'utf8')),x=results[key];
  if(!x?.tile||!x.cutout||!x.original)throw Error('Only a processed cutout item can adopt a reviewed repair');
  const state=ledger.state.get(key);
  if(state?.to!=='processed'||state.evidence?.tile_sha256!==x.tile.sha256||state.evidence?.cutout_sha256!==x.cutout.sha256)throw Error('The item must be processed with its current cutout and tile');
  await heldFile(x.original,'The held original');
  const neg=await reviewRow(negative,key,'The negative review');
  if(neg.cutout_review?.cutout_sha256!==x.cutout.sha256||neg.tile_review?.tile_sha256!==x.tile.sha256)throw Error("The negative review must name this item's current cutout and tile");
  const failed=failedReviewChecks(neg);
  if(!failed.length)throw Error('A negative review needs at least one failed review check');
  const run=JSON.parse(await heldFile(repair,'The repair record'));
  if(run.schema!=='jwleria-scoped-repair-run/1'||run.ref!==x.ref)throw Error('The repair record is for another item');
  if(run.inputs?.original?.sha256!==x.original.sha256)throw Error('The repair record starts from another original');
  if(run.inputs?.rejected?.cutout?.sha256!==x.cutout.sha256||run.inputs?.rejected?.tile?.sha256!==x.tile.sha256)throw Error("The repair record repairs other files than this item's rejected ones");
  const cut=run.outputs?.cutout,tile=run.outputs?.tile;
  if(!text(cut?.producer))throw Error('The repair record names no producer for its cutout');
  const acc=await reviewRow(acceptance,key,'The acceptance');
  const problem=acceptanceProblem(acc,{original_sha256:x.original.sha256,cutout_sha256:cut?.sha256,tile_sha256:tile?.sha256,prepared_by,producer:cut.producer});
  if(problem)throw Error('Acceptance refused: '+problem);
  const cutBytes=await heldFile(cut,'The accepted cutout'),tileBytes=await heldFile(tile,'The accepted tile');
  const negativeEntry={cutout_sha256:x.cutout.sha256,tile_sha256:x.tile.sha256,reviewer:neg.tile_review?.reviewer??neg.cutout_review?.reviewer??null,
    review_references:[neg.cutout_review?.review_reference,neg.tile_review?.review_reference].filter(Boolean),failed_checks:failed,status:neg.review_status??null};
  const supersededEntries=[];
  for(const s of superseded)supersededEntries.push(await supersededEntry(s));
  const rejected=[...(x.rejected??[]),negativeEntry,...supersededEntries];
  if(rejected.some(j=>j.cutout_sha256===cut.sha256||j.tile_sha256===tile.sha256))throw Error('An accepted file is also listed as rejected');
  // The accepted files pass the existing checks unchanged: the cutout against the held original, and the tile is exactly
  // what the existing tile step makes of that cutout, so the bundler's own re-derivation will reproduce it.
  const check=await validateCutoutMaster({original:{path:x.original.path,sha256:x.original.sha256},cutout:{path:cut.path,sha256:cut.sha256,producer:cut.producer}},sharp);
  if(!check.passed)throw Error('The accepted cutout failed its check: '+check.failures.join(','));
  const made=await normalizeFlatTile(cutBytes,sharp);
  if(made.record.tile_sha256!==tile.sha256||!made.png.equals(tileBytes))throw Error('The accepted tile is not what the tile step makes of the accepted cutout');
  const references=[acc.cutout_review.review_reference,acc.tile_review.review_reference];
  const before=ledger.entries.length,o=x.original;
  await record(ledger,{key,to:'quarantined',reason:'visual_rejected',evidence:negativeEntry,run_id},limits);
  await record(ledger,{key,to:'matched',evidence:{basis,previous_quarantine:'visual_rejected'},run_id},limits);
  await record(ledger,{key,to:'rights_ready',evidence:{basis:'decision-0025 owner direction; no brand contact; no brand licence claimed',grant_reference:grant.grant_reference},run_id},limits);
  await record(ledger,{key,to:'acquired',evidence:{original_sha256:o.sha256,asset_url:x.asset_url,bytes:o.bytes,width:o.width,height:o.height,has_alpha:o.has_alpha??null,held_original_reused:true},run_id},limits);
  await record(ledger,{key,to:'processed',evidence:{original_sha256:o.sha256,tile_sha256:tile.sha256,cutout_sha256:cut.sha256,derivative_sha256:[tile.sha256],
    adopted:{reviewer:acc.reviewer,review_references:references,repair_record_sha256:repair.sha256},superseded:supersededEntries.map(s=>({cutout_sha256:s.cutout_sha256,tile_sha256:s.tile_sha256}))},run_id},limits);
  const {tile:_tile,cutout:_cutout,rejected:_rejected,...base}=x;
  results[key]={...base,
    tile:{sha256:tile.sha256,path:tile.path,side:made.record.geometry.side,changed_opaque_product_pixels:made.record.changed_opaque_product_pixels},
    cutout:{sha256:cut.sha256,path:cut.path,producer:cut.producer,mask_sha256:run.outputs?.mask?.sha256??null,
      check:{passed:true,review_flags:check.review_flags,opaque_identical_to_original:check.product_pixels?.opaque_identical_to_original??null},
      scoped_repair:{record:{path:repair.path,sha256:repair.sha256},module_sha256:run.code?.sha256??null}},
    adopted_review:{file:{path:acceptance.path,sha256:acceptance.sha256},reviewer:acc.reviewer,reviewed_at:acc.reviewed_at??null,status:acc.review_status??null,review_references:references},
    rejected};
  await writeFile(join(root,'results.json'),JSON.stringify(results,null,1),{mode:0o600});
  await mkdir(join(root,'adoptions'),{recursive:true,mode:0o700});
  await once(join(root,'adoptions',`${x.ref}-${tile.sha256.slice(0,12)}.json`),json({schema:'jwl-reviewed-repair-adoption/1',adopted_at:new Date().toISOString(),key,ref:x.ref,run_id,prepared_by,basis,
    negative_review:{file:{path:negative.path,sha256:negative.sha256},status:neg.review_status??null,failed_checks:failed},acceptance:{file:{path:acceptance.path,sha256:acceptance.sha256},reviewer:acc.reviewer,review_references:references},
    repair_record:{path:repair.path,sha256:repair.sha256},checks:{cutout_check:{passed:true,failures:[],review_flags:check.review_flags,changed_opaque_pixels:check.product_pixels?.changed_opaque_pixels??null},tile_reproduced_byte_for_byte:true},
    ledger_entries:ledger.entries.slice(before).map(e=>({seq:e.seq,from:e.from,to:e.to,reason:e.reason??null})),before:{cutout_sha256:x.cutout.sha256,tile_sha256:x.tile.sha256},after:{cutout_sha256:cut.sha256,tile_sha256:tile.sha256},rejected,
    note:'Adoption of an accepted master only. It approves no derivative, binding, grant, source activation, upload or publication.'}));
  return {key,ref:x.ref,state:ledger.state.get(key).to,cutout_sha256:cut.sha256,tile_sha256:tile.sha256,rejected:rejected.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,planPath]=process.argv.slice(2);
  const plan=planPath?JSON.parse(await readFile(planPath,'utf8')):null;
  if(command==='seed'&&plan)console.log(JSON.stringify(await seedIndependentBatch(plan)));
  else if(command==='adopt'&&plan){
    // plan: {out, grant_file:{path, sha256}, prepared_by, run_id, items:[{key, basis, negative, acceptance, repair, superseded}]}
    const grant=JSON.parse(await heldFile(plan.grant_file,'The grant row'));
    const done=[];
    for(const item of plan.items)done.push(await adoptReviewedRepair({out:plan.out,grant,prepared_by:plan.prepared_by,run_id:plan.run_id,...item}));
    console.log(JSON.stringify(done.map(({key,state,rejected})=>({key,state,rejected}))));
  }
  else throw Error('Usage: node adopt-reviewed-repair.mjs seed PRIVATE_SEED.json | adopt PRIVATE_ADOPTION.json');
}
