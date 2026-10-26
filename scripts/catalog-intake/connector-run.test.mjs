import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {connectorRun,connectorExport} from './connector-run.mjs';
import {sourceAdapters} from './source-queue.mjs';

const at=Date.parse('2026-10-26T12:00:00Z');
const registry=Object.fromEntries(Object.entries(sourceAdapters).map(([id,a])=>[id,{origin:a.origin,enabled:true,acquisition_allowed:true,min_interval_seconds:2}]));
const exported=(extra={})=>({exported_at:new Date(at).toISOString(),via:'database-connector',registry,
  identities:{'rolex-official':['m126610ln-0001'],'iwc-schaffhausen-official':[]},identity_counts:{'rolex-official':1,'iwc-schaffhausen-official':0},revisions:{},...extra});
const source=(source_id,extra={})=>({source_id,enabled:true,acquisition_allowed:true,permission_reference:'synthetic reviewed test permission',min_interval_seconds:2,...extra});
const products=['https://www.rolex.com/en-gb/watches/submariner/m126610ln-0001','https://www.rolex.com/en-gb/watches/datejust/m126334-0001','https://www.rolex.com/en-gb/watches/explorer/m224270-0001'];
const page=url=>{const ref=url.split('/').pop();return new Response('<html><script type="application/ld+json">'+JSON.stringify({'@type':'Product',sku:ref,name:'Rolex Datejust 41 watch: Oystersteel - '+ref,image:'https://media.example.test/'+ref+'.png',material:'Oystersteel',size:{value:41,unitText:'mm'}})+'</script></html>',{headers:{'content-type':'text/html'}});};
function harness(){
  let t=at;const calls=[];
  const fetcher=async url=>{calls.push(url);
    if(url==='https://www.rolex.com/robots.txt')return new Response('User-agent: *\nAllow: /\nSitemap: https://www.rolex.com/sitemap.xml\n');
    if(url==='https://www.rolex.com/sitemap.xml')return new Response('<urlset>'+products.map(u=>'<url><loc>'+u+'</loc></url>').join('')+'</urlset>');
    if(products.includes(url))return page(url);
    if(url.startsWith('https://www.iwc.com/'))return new Response('<HTML><TITLE>Access Denied</TITLE></HTML>',{status:403});
    throw Error('unexpected request '+url);};
  return {calls,fetcher,now:()=>t,sleep:async ms=>{t+=ms;}};
}

test('connector-export runner selects only missing identities, acquires exactly that selection and resumes it without widening',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-connector-'));
  try{
    const config={output_root:root,sources:[source('rolex-official',{sitemap_roots:'robots_declared',max_missing:20}),source('iwc-schaffhausen-official',{min_interval_seconds:60,sitemap_roots:'robots_declared'})]};
    const h=harness();
    const first=await connectorRun(config,exported(),{fetcher:h.fetcher,sleep:h.sleep,now:h.now});
    const [rolex,iwc]=first.origins;
    assert.equal(rolex.status,'completed');assert.deepEqual(rolex.selection,{urls:3,identities:3,missing_total:2,known_total:1,alias_urls:0,unsupported_urls:0,selected:2,missing_selected:2,controls_selected:0});
    assert.deepEqual(rolex.discovery.requests_by_kind,{robots:1,sitemap:1,page:0});assert.deepEqual(rolex.acquisition.requests_by_kind,{robots:1,sitemap:0,page:2});
    assert(!h.calls.includes(products[0]),'a known identity is not fetched');
    assert.equal(iwc.status,'blocked');assert.equal(iwc.reason,'source_refused_access');assert.equal(h.calls.filter(u=>u.includes('iwc')).length,1,'one refusal stops only that origin');
    assert.deepEqual(first.incremental.ingest,{missing:2});assert.equal(first.database_written,false);
    const ready=(await readFile(join(root,'incremental','ingest-ready.ndjson'),'utf8')).trim().split('\n').map(l=>JSON.parse(l));
    assert.deepEqual(ready.map(r=>r.external_id).sort(),['m126334-0001','m224270-0001']);
    assert.equal(ready[0].name_ar,'ساعة رولكس ديت جست، 41 مم');

    // A newer export now lists the ingested identities; the rerun still resumes the saved selection only.
    const before=h.calls.length;
    const second=await connectorRun(config,exported({identities:{'rolex-official':['m126610ln-0001','m126334-0001','m224270-0001'],'iwc-schaffhausen-official':[]},identity_counts:{'rolex-official':3,'iwc-schaffhausen-official':0}}),{fetcher:h.fetcher,sleep:h.sleep,now:h.now});
    assert.deepEqual(second.origins[0].acquisition.requests_by_kind,{robots:1,sitemap:0,page:0});assert.equal(second.origins[0].acquisition.new_revisions,0);
    assert.equal(second.origins[0].discovery,null,'the saved selection is reused, not rediscovered');
    assert.equal(second.origins[1].status,'blocked');assert.equal(second.origins[1].requests,0,'a blocked origin is not contacted again without review');
    assert.deepEqual(h.calls.slice(before),['https://www.rolex.com/robots.txt']);
    assert.equal(second.incremental.received,0);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('stale, partial or non-connector exports fail closed before any request',async()=>{
  const now=()=>at;
  assert.throws(()=>connectorExport(exported({exported_at:new Date(at-3*3600_000).toISOString()}),{now}),/fresh connector export/);
  assert.throws(()=>connectorExport(exported({via:'local-config'}),{now}),/jwl_source_registry/);
  assert.throws(()=>connectorExport(exported({identity_counts:{'rolex-official':2,'iwc-schaffhausen-official':0}}),{now}),/incomplete/);
  assert.throws(()=>connectorExport(exported({revisions:{abc:'def'}}),{now}),/Invalid revision/);
  const root=await mkdtemp(join(tmpdir(),'jwl-connector-'));
  try{
    const h=harness();
    const result=await connectorRun({output_root:root,sources:[source('rolex-official',{sitemap_roots:'robots_declared'})]},exported({identities:{},identity_counts:{}}),{fetcher:h.fetcher,sleep:h.sleep,now:h.now});
    assert.equal(result.origins[0].reason,'identity_export_missing');assert.equal(h.calls.length,0);
    const acquireOnly=await connectorRun({output_root:root,sources:[source('rolex-official',{sitemap_roots:'robots_declared'})]},exported(),{fetcher:h.fetcher,sleep:h.sleep,now:h.now,phase:'acquire'});
    assert.equal(acquireOnly.origins[0].reason,'no_saved_selection');assert.equal(h.calls.length,0);
  }finally{await rm(root,{recursive:true,force:true});}
});
