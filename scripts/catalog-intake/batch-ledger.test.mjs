import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildBatchManifest,openLedger,record,ledgerCounters,writeStage0} from './batch-ledger.mjs';

// Synthetic export rows only; no real source, URL or file.
const row=(ref,model,over={})=>({ref,cid16:'c'.repeat(16),rev16:ref.padEnd(16,'0').slice(0,16),model,primary:false,pos:1,opts:{colour:'Black'},name:'Bag — Black',cat:'handbags',page:'/p/'+ref,n:2,named:2,
  files:[`dw1/DIS/${ref}_0.png`,`dw2/DIS/${ref}_1.png`],...over});
const doc={source_id:'synthetic',read_at:'2026-11-02T00:00:00Z',snapshot_md5:'x',rows:[
  row('A100S001','m:A100',{primary:true,opts:{colour:'Black',bag_size:'S'}}),row('A100M001','m:A100',{opts:{colour:'Black',bag_size:'M'},pos:2}),
  row('B200S002','m:B200',{primary:true,opts:{colour:'Red'}}),row('B200S003','m:B200',{opts:{colour:'Blue'},files:['dw3/DIS/B200S004_0.png'],n:1,named:0}),
  row('C300S001','m:C300',{primary:true,n:0,files:[],named:0}),
  row('D400S001','m:D400',{primary:true,files:['dw9/DIS/D400S001_0.png']}),row('D400S009','m:D400',{files:['dw9/DIS/D400S001_0.png'],opts:{colour:'Cocoa'}})],non_public:[{ref:'Z'}]};

test('the manifest is deterministic, ranks complete models first, waves one per model and keeps exact exclusion reasons',()=>{
  const m=buildBatchManifest(doc,{limit:2});
  assert.equal(buildBatchManifest({...doc,rows:[...doc.rows].reverse()},{limit:2}).manifest_sha256,m.manifest_sha256,'input order never changes the manifest');
  assert.deepEqual(m.selection,['m:A100','m:B200'],'all-eligible model first, then more eligible variants');
  assert.equal(m.counts.models,4);assert.equal(m.counts.variants,7);assert.equal(m.counts.wave1_variants,2);assert.equal(m.counts.wave2_variants,1);
  assert.deepEqual(m.variants.find(v=>v.ref==='B200S003').reasons,['gallery_unbound'],'a file naming another reference is unbound');
  assert.deepEqual(m.variants.find(v=>v.ref==='C300S001').reasons,['empty_gallery']);
  assert.ok(m.variants.find(v=>v.ref==='D400S009').reasons.includes('shared_file_conflict'),'one file for two colours is refused');
  assert.ok(m.models.find(x=>x.model==='m:C300').reasons.includes('no_eligible_variant'));
  assert.equal(m.counts.non_public_candidates,1);assert.equal(m.counts.originals_held,0);assert.equal(m.counts.published_variants,0);
  assert.ok(m.blocked_by.some(b=>b.startsWith('rights_missing')));
});

test('the ledger is append-only, idempotent, resumable, bounded and counts distinct units',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'jwl-ledger-TEST-ONLY-'));
  try{
    await writeFile(join(dir,'export.json'),JSON.stringify(doc));
    const first=await writeStage0(join(dir,'export.json'),join(dir,'out'),{limit:2});
    const again=await writeStage0(join(dir,'export.json'),join(dir,'out'),{limit:2});
    assert.deepEqual(again,first,'a rerun is a no-op');
    const lines=(await readFile(join(dir,'out','ledger.ndjson'),'utf8')).trim().split('\n');
    assert.equal(lines.length,6,'discovered and matched once per planned item');
    const manifest=JSON.parse(await readFile(join(dir,'out','manifest.json'),'utf8'));
    const ledger=await openLedger(join(dir,'out','ledger.ndjson'));
    const key=manifest.items[0].key;
    await assert.rejects(record(ledger,{key,to:'acquired',evidence:{original_sha256:'a'}}),/not allowed/,'no acquisition before rights under the default policy');
    await record(ledger,{key,to:'rights_ready',evidence:{grant:'g'}});
    await record(ledger,{key,to:'acquired',evidence:{original_sha256:'a'.repeat(64)}});
    assert.deepEqual(await record(ledger,{key,to:'acquired',evidence:{original_sha256:'a'.repeat(64)}}),{recorded:false,duplicate:true});
    await record(ledger,{key,to:'processed',evidence:{derivative_sha256:['1','2','3','4','5','6','7','8']}});
    const counts=ledgerCounters(manifest,await openLedger(join(dir,'out','ledger.ndjson')));
    assert.equal(counts.originals,1);assert.equal(counts.derivative_files,8);assert.equal(counts.published.variants,0,'eight files are one photograph, not eight products');
    await assert.rejects(record(ledger,{key:manifest.items[1].key,to:'quarantined',reason:'no_such_reason'}),/reason code/);
    await assert.rejects(record(ledger,{key:manifest.items[1].key,to:'quarantined',reason:'source_refused',run_id:'r1'}),/source refused/,'a refusal stops the run');
    await assert.rejects(record(ledger,{key:manifest.items[2].key,to:'quarantined',reason:'low_resolution',run_id:'r2'},{max_quarantined:0}),/limit reached/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
