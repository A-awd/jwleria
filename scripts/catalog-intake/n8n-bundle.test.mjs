import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {codeNodes,originWorkflow,scheduleWorkflow,scheduledOrigins} from './build-n8n-intake.mjs';
import {originPlan,robotsStep,sitemapStep,collect} from './n8n-intake.mjs';
import {pageStep} from './n8n-intake-page.mjs';

const nodeRequire=createRequire(import.meta.url);
// Mirrors the observed n8n Code-node sandbox (2026-10-26): no URL/URLSearchParams/structuredClone, only crypto
// requirable, Object.defineProperty(ies) replaced by `() => ({})` and Object.getPrototypeOf altered.
const sandboxPatches='Object.defineProperty=()=>({});Object.defineProperties=()=>({});Object.getPrototypeOf=()=>({});';
function sandbox(globals){
  const context=vm.createContext(globals);
  vm.runInContext(sandboxPatches,context);
  return context;
}
function runNode(name,{input=[],nodes={},staticData={}}){
  const context=sandbox({
    require:id=>{if(id!=='crypto')throw Error(`Module '${id}' is disallowed`);return nodeRequire('crypto');},
    $input:{first:()=>input[0],all:()=>input},
    $:node=>{if(!nodes[node])throw Error('No data for '+node);return {first:()=>nodes[node][0],all:()=>nodes[node]};},
    $getWorkflowStaticData:()=>staticData,$execution:{id:'4242',mode:'test'},TextEncoder,TextDecoder,
  });
  assert.equal(vm.runInContext('typeof URL',context),'undefined');
  assert.equal(vm.runInContext('const o={};Object.defineProperty(o,"a",{value:1});o.a',context),undefined,'the replica disables defineProperty like n8n');
  // n8n stores item JSON between nodes, so compare plain data as it would arrive.
  return vm.runInContext('(async()=>{'+codeNodes[name]+'\n})()',context).then(out=>JSON.parse(JSON.stringify(out)));
}
const res=(statusCode,body='',headers={})=>({statusCode,headers,body});
const page=ref=>'<html><script type="application/ld+json">'+JSON.stringify({'@type':'Product',sku:ref,name:'Rolex Datejust 41 watch: Oystersteel - '+ref,image:'https://media.example.test/'+ref+'.png',material:'Oystersteel',size:{value:41,unitText:'mm'}})+'</script></html>';
const urls=['https://www.rolex.com/en-gb/watches/datejust/m126334-0001','https://www.rolex.com/en-gb/watches/datejust/m126334-0002','https://www.rolex.com/en-gb/watches/day-date/m228238-0042'];
const sitemap='<urlset>'+urls.map(u=>'<url><loc>'+u+'</loc></url>').join('')+'</urlset>';
const config={source_id:'rolex-official',sitemap_url:'https://www.rolex.com/en-gb/sitemap-watches.xml',product_url_selector:'^https://www\\.rolex\\.com/en-gb/watches/',max_pages:5,interval_seconds:3};
const gate={granted:true,run_id:'4242-rolex-official',origin:'https://www.rolex.com',min_interval_seconds:2};
const known={source_id:'rolex-official',count:1,ids:['m126334-0001']};

test('every generated Code node runs in the sandbox shape and reproduces the direct modules exactly',async()=>{
  const receive=[{json:{config,run_id:gate.run_id}}];
  const planned=await runNode('Plan origin',{input:[{json:{gate}}],nodes:{'Receive origin plan':receive}});
  assert.deepEqual(planned[0].json.plan,JSON.parse(JSON.stringify(originPlan(config,gate).plan)));
  const robotsResponse=res(200,'User-agent: *\nCrawl-delay: 4\nAllow: /\n');
  const robots=await runNode('Read robots',{input:[{json:robotsResponse}],nodes:{'Plan origin':planned}});
  const directPlan=robotsStep(originPlan(config,gate).plan,robotsResponse).plan;
  assert.deepEqual(robots[0].json.plan,JSON.parse(JSON.stringify(directPlan)));assert.equal(directPlan.interval_seconds,4);
  const knownNode=[{json:{known}}];
  const pages=await runNode('Select missing pages',{input:[{json:res(200,sitemap)}],nodes:{'Read robots':robots,'Known identities':knownNode}});
  assert.deepEqual(pages.map(p=>p.json.url),sitemapStep(directPlan,res(200,sitemap),known).pages);
  assert.deepEqual(pages.map(p=>p.json.url),[urls[1],urls[2]]);
  const staticData={},results=[];
  for(const item of pages){
    const checked=await runNode('Check page',{input:[item],staticData});
    assert.equal(checked[0].json.allowed,true);
    const ref=item.json.url.split('/').pop(),response=res(200,page(ref),{'content-type':'text/html'});
    const assessed=await runNode('Assess page',{input:[{json:response}],nodes:{'Check page':checked,'Known identities':knownNode},staticData});
    const direct=pageStep(directPlan,item.json.url,response,known);
    assert.deepEqual(assessed[0].json,JSON.parse(JSON.stringify(direct)),'sandbox URL subset yields identical records and revisions');
    results.push(assessed[0]);
  }
  const collected=await runNode('Collect results',{input:results,nodes:{'Read robots':robots},staticData});
  const direct=collect(directPlan,results.map(r=>r.json));
  assert.deepEqual(collected[0].json,JSON.parse(JSON.stringify(direct)));
  assert.deepEqual(collected[0].json.records.map(r=>r.external_id),['m126334-0002','m228238-0042']);
  assert.equal(collected[0].json.records[1].collection,'day date','the collection comes from the exact official URL');
  assert.deepEqual(collected[0].json.finish,{run_id:gate.run_id,status:'success',error_code:null});
});

test('a refusal inside the loop stops later pages of that run in the sandbox too',async()=>{
  const plan=robotsStep(originPlan(config,gate).plan,res(200,'User-agent: *\nAllow: /\n')).plan;
  const staticData={},knownNode=[{json:{known}}];
  const first=await runNode('Check page',{input:[{json:{plan,url:urls[1]}}],staticData});
  const refused=await runNode('Assess page',{input:[{json:res(403,'<title>Access Denied</title>',{server:'AkamaiGHost'})}],nodes:{'Check page':first,'Known identities':knownNode},staticData});
  assert.equal(refused[0].json.stop.reason,'source_refused_access');
  const second=await runNode('Check page',{input:[{json:{plan,url:urls[2]}}],staticData});
  assert.equal(second[0].json.skip,'origin_stopped_this_run','the next page is never requested');
  const skipped=await runNode('Note skipped page',{input:second});
  const collected=await runNode('Collect results',{input:[refused[0],skipped[0]],nodes:{'Read robots':[{json:{plan}}]},staticData});
  assert.deepEqual(collected[0].json.finish,{run_id:gate.run_id,status:'blocked',error_code:'source_refused_access'});
  assert.deepEqual(staticData,{},'the stop flag is cleared for the next run');
});

test('a gate refusal, a missing reviewed sitemap and the schedule config fail closed before any request',async()=>{
  const receive=[{json:{config,run_id:gate.run_id}}];
  assert.deepEqual(await runNode('Plan origin',{input:[{json:{gate:{granted:false,reason:'source_review_required'}}}],nodes:{'Receive origin plan':receive}}),[]);
  const missing=await runNode('Plan origin',{input:[{json:{gate}}],nodes:{'Receive origin plan':[{json:{config:{...config,sitemap_url:null},run_id:gate.run_id}}]}});
  assert.deepEqual(missing[0].json.finish,{run_id:gate.run_id,status:'error',error_code:'reviewed_sitemap_missing'});
  assert(scheduledOrigins.every(o=>o.sitemap_url===null),'no origin is scheduled before its refusal review and approval');
  const source=originWorkflow();
  assert(source.length<300000,'within the workflow tool size limit');
  for(const forbidden of ['SUPABASE_SECRET_KEY','sb_secret_','service_role'])assert(!source.includes(forbidden),forbidden);
  assert.doesNotMatch(source,/eyJ[A-Za-z0-9_-]{20,}\./,'no token of any kind');
  assert.throws(()=>scheduleWorkflow('bad id'),/sub-workflow id/);
  const schedule=scheduleWorkflow('AbCdEf123456');
  assert.match(schedule,/value:"AbCdEf123456"/);
  for(const generated of [source,schedule]){
    const databaseNodes=generated.match(/type:'n8n-nodes-base\.postgres'[^\n]*/g);
    assert(databaseNodes.length>=2&&databaseNodes.every(n=>n.includes('disabled:true')),'every database node is generated disabled');
  }
});

test('an altered copy of a node library refuses to run',async()=>{
  const original=codeNodes['Plan origin'];
  const tampered=original.replace('reviewed_sitemap_missing','reviewed_sitemap_absent');
  assert.notEqual(tampered,original);
  const context=sandbox({require:id=>nodeRequire(id==='crypto'?'crypto':'none'),$input:{first:()=>({json:{gate:{granted:false}}})},$:()=>({first:()=>({json:{config:{}}})})});
  await assert.rejects(vm.runInContext('(async()=>{'+tampered+'\n})()',context),/integrity check failed/);
  assert.deepEqual(JSON.parse(JSON.stringify(await vm.runInContext('(async()=>{'+original+'\n})()',context))),[]);
});
