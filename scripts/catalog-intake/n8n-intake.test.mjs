import test from 'node:test';
import assert from 'node:assert/strict';
import {originPlan,classify,robotsStep,sitemapStep,pageAllowed,collect,finishFor} from './n8n-intake.mjs';
import {pageStep} from './n8n-intake-page.mjs';

const now=Date.parse('2026-10-26T12:00:00Z');
const gate={granted:true,run_id:'exec-101:rolex-official',origin:'https://www.rolex.com',min_interval_seconds:2};
const config={source_id:'rolex-official',sitemap_url:'https://www.rolex.com/en-gb/sitemap-watches.xml',product_url_selector:'^https://www\\.rolex\\.com/en-gb/watches/',max_pages:2,interval_seconds:3};
const res=(statusCode,body='',headers={})=>({statusCode,headers,body});
const page=ref=>'<html><script type="application/ld+json">'+JSON.stringify({'@type':'Product',sku:ref,name:'Rolex Datejust 41 watch: Oystersteel - '+ref,image:'https://media.example.test/'+ref+'.png',material:'Oystersteel',size:{value:41,unitText:'mm'}})+'</script></html>';
const urls=['https://www.rolex.com/en-gb/watches/datejust/m126334-0001','https://www.rolex.com/en-gb/watches/datejust/m126334-0002','https://www.rolex.com/en-gb/watches/datejust/m126334-0003','https://www.rolex.com/fr/watches/datejust/m126334-0009','https://www.rolex.com/en-gb/watches/wishlist/m999999-0001'];
const sitemap='<urlset>'+urls.map(u=>'<url><loc>'+u+'</loc></url>').join('')+'</urlset>';
const robots='User-agent: *\nCrawl-delay: 5\nDisallow: /*/wishlist\nAllow: /\n';

test('a scheduled origin needs an official adapter, no recorded stop, the database gate and one reviewed same-origin sitemap',()=>{
  assert.deepEqual(originPlan({...config,source_id:'prada-official'},gate),{halt:'unsupported_scheduled_source'});
  assert.deepEqual(originPlan({...config,source_id:'cartier-official'},gate),{halt:'acquisition_permission_restricted'});
  assert.deepEqual(originPlan(config,{granted:false,reason:'source_review_required'}),{halt:'source_review_required',not_before:null});
  assert.equal(originPlan(config,{...gate,origin:'https://www.iwc.com'}).halt,'runner_gate_mismatch');
  assert.deepEqual(originPlan({...config,sitemap_url:'https://cdn.example.test/sitemap.xml'},gate).finish,{run_id:gate.run_id,status:'error',error_code:'reviewed_sitemap_missing'});
  const {plan}=originPlan({...config,max_pages:500,interval_seconds:0},{...gate,min_interval_seconds:60});
  assert.deepEqual([plan.max_pages,plan.interval_seconds,plan.brand],[20,60,'Rolex']);
});

test('responses follow the local queue rules: refusals and challenges block, rate limits defer, the rest fail per URL',()=>{
  assert.deepEqual(classify(res(403,'<HTML><TITLE>Access Denied</TITLE></HTML>',{Server:'AkamaiGHost'}),{now}).stop,{status:'blocked',reason:'source_refused_access',http_status:403,server:'AkamaiGHost',title:'Access Denied'});
  assert.equal(classify(res(403,'Blocked by egress policy'),{now}).stop.reason,'environment_egress_denied');
  assert.equal(classify(res(429,'',{'retry-after':'60'}),{now}).stop.not_before,new Date(now+15*60000).toISOString(),'never sooner than fifteen minutes');
  assert.equal(classify(res(503,'',{'Retry-After':'7200'}),{now}).stop.not_before,new Date(now+7200000).toISOString());
  assert.equal(classify(res(503,'<title>Just a moment...</title>'),{now}).stop.reason,'source_challenge');
  assert.deepEqual(classify(res(503,'busy'),{now}).failure,{reason:'source_http_503',transient:true});
  assert.equal(classify(res(301,'',{location:'/elsewhere'})).failure.reason,'redirect_requires_review');
  assert.equal(classify(res(404)).failure.reason,'source_gone');
  assert.equal(classify(res(200,'<div class="captcha-container"></div>')).stop.reason,'source_challenge');
  assert.deepEqual(classify({error:{message:'ECONNRESET'}}).failure,{reason:'network_error',transient:true});
  assert.equal(classify(res(200,'x'.repeat(20)),{limit:10}).failure.reason,'source_response_too_large');
  assert.deepEqual(finishFor({run_id:'r'},{stop:{status:'error',reason:'source_rate_limited',not_before:'2026-10-26T12:15:00.000Z'}}),{run_id:'r',status:'error',error_code:'source_rate_limited@2026-10-26T12:15:00.000Z'});
});

test('robots and the reviewed sitemap bound the run: crawl-delay only lengthens pacing, selection is missing-first',()=>{
  const {plan}=originPlan(config,gate);
  const ready=robotsStep(plan,res(200,robots),{now}).plan;
  assert.equal(ready.interval_seconds,5);
  assert.equal(robotsStep(plan,res(200,'User-agent: *\nDisallow: /en-gb/sitemap-watches.xml\n')).finish.error_code,'sitemap_robots_refused');
  assert.deepEqual(robotsStep(plan,res(403,'<title>Access Denied</title>')).finish,{run_id:plan.run_id,status:'blocked',error_code:'source_refused_access'});
  assert.equal(robotsStep(plan,res(404)).finish.error_code,'robots_unavailable');
  const known={source_id:'rolex-official',count:1,ids:['m126334-0001']};
  const picked=sitemapStep(ready,res(200,sitemap),known,{now});
  assert.deepEqual(picked.pages,[urls[1],urls[2]],'known, other-locale and robots-disallowed URLs are not selected');
  assert.equal(picked.counts.missing_total,2);
  assert.equal(sitemapStep(ready,res(200,'<sitemapindex></sitemapindex>'),known).finish.error_code,'sitemap_index_requires_review');
  assert.equal(sitemapStep(ready,res(200,sitemap),{...known,count:5}).finish.error_code,'identity_export_incomplete');
  assert.deepEqual(sitemapStep(ready,res(200,sitemap),{source_id:'rolex-official',count:3,ids:['m126334-0001','m126334-0002','m126334-0003']}).finish,{run_id:plan.run_id,status:'success',error_code:null});
});

test('pages are checked before each request and assessed missing-only with the captured-inventory preparation',()=>{
  const plan=robotsStep(originPlan(config,gate).plan,res(200,robots)).plan;
  assert.deepEqual(pageAllowed(plan,urls[1],false),{allowed:true});
  assert.equal(pageAllowed(plan,urls[1],true).skip,'origin_stopped_this_run');
  assert.equal(pageAllowed(plan,'https://www.iwc.com/x',false).skip,'unexpected_acquisition_origin');
  assert.equal(pageAllowed(plan,urls[4],false).skip,'robots_refused');
  const known={source_id:'rolex-official',count:1,ids:['m126334-0001']};
  const fresh=pageStep(plan,urls[1],res(200,page('m126334-0002'),{'content-type':'text/html'}),known);
  assert.equal(fresh.records.length,1);assert.equal(fresh.records[0].name_ar,'ساعة رولكس ديت جست، 41 مم');assert.equal(fresh.records[0].external_id,'m126334-0002');
  const existing=pageStep(plan,urls[0],res(200,page('m126334-0001')),known);
  assert.deepEqual([existing.records.length,existing.decisions[0].ingest],[0,'known_identity_requires_review']);
  assert.equal(pageStep(plan,urls[1],res(403,'<title>Access Denied</title>'),known).stop.reason,'source_refused_access');
  assert.equal(pageStep(plan,urls[1],res(200,'{}',{'content-type':'application/json'}),known).failure.reason,'source_format_changed');
  assert.equal(pageStep(plan,urls[1],res(200,page('m126334-0099')),known).failure.reason,'extraction_failed');

  const result=collect(plan,[fresh,fresh,existing,{url:urls[2],failure:{reason:'source_gone'}}]);
  assert.equal(result.records.length,1,'duplicates collapse');assert.deepEqual(result.counts.failures,{source_gone:1});assert.equal(result.finish.status,'success');
  const redirects=collect(plan,[1,2,3].map(()=>({failure:{reason:'redirect_requires_review'}})));
  assert.deepEqual(redirects.finish,{run_id:plan.run_id,status:'blocked',error_code:'repeated_redirects_require_review'});
  assert.equal(collect(plan,[{stop:{status:'blocked',reason:'source_challenge'}},fresh]).finish.status,'blocked');
});
