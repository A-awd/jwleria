import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {extractBagPage,bagSourceProfile,sitemapLocations} from './extract-bags.mjs';
import {collectBagInventory} from './collect-bags.mjs';

const ld=data=>`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const pradaHtml=(reference='SYNTHETIC123')=>ld({'@type':'Product',sku:reference,name:'Prada Cleo synthetic test bag',image:`https://example.com/${reference}.jpg`,description:'Synthetic technical leather detail',offers:{price:999}})+ld({'@type':'BreadcrumbList',itemListElement:[{item:{name:'Synthetic home'}},{item:{name:'Synthetic bags'}},{item:{name:'Synthetic piece'}}]});
test('Prada binds only same-reference source gallery and keeps offers out',()=>{
 const page=pradaHtml()+ld({'@type':'ImageObject',contentUrl:'https://example.com/SYNTHETIC123_B.jpg'})+ld({'@type':'ImageObject',contentUrl:'https://example.com/OTHER.jpg'});
 const result=extractBagPage(page,{brand:'prada',source_id:'synthetic',page_url:'https://www.prada.com/ae/en/p/synthetic-bag/SYNTHETIC123'});
 assert.equal(result.candidate.external_id,'SYNTHETIC123');assert.equal(result.candidate.collection,'Prada Cleo');assert.equal(result.candidate.image_urls.length,2);
 assert.ok(!('offers' in result.candidate)&&!('price' in result.candidate));assert.equal(result.candidate.media_rights_state,'unverified');
 const mixed=extractBagPage(pradaHtml().replace('Prada Cleo synthetic test bag','Prada Cleo Re-Nylon and Saffiano leather bag'),{brand:'prada',source_id:'synthetic',page_url:'https://www.prada.com/ae/en/p/synthetic-bag/SYNTHETIC123'});assert.equal(mixed.raw.facts.find(f=>f.key==='material').value,'Re-Nylon; Saffiano leather');
 assert.throws(()=>extractBagPage(ld({'@type':'Product',sku:'SYNTHETIC123',name:'Synthetic bag',image:'https://example.com/OTHER.jpg'}),{brand:'prada',source_id:'synthetic',page_url:'https://www.prada.com/p/test'}),/grouping|mismatch/);
});
test('Bottega preserves displayed variant reference distinct from platform SKU; no invented dimensions',()=>{
 const html='<div data-querystring="pid=SYNTHETIC123"></div><p>• Material: lambskin</p>'+ld({'@type':'Product',sku:'PLATFORM1',name:'Synthetic Tote in Blue',image:'https://example.com/SYNTHETIC123.jpg',description:'Synthetic leather tote',color:'Blue'});
 const {candidate,evidence}=extractBagPage(html,{brand:'bottega-veneta',source_id:'synthetic',page_url:'https://www.bottegaveneta.com/en-gb/synthetic-SYNTHETIC123.html'});
 assert.equal(candidate.external_id,'SYNTHETIC123');assert.equal(evidence.platform_sku,'PLATFORM1');assert.equal(candidate.collection,'Synthetic Tote');assert.ok(!candidate.facts.some(f=>f.key==='dimensions'));
});
test('LOEWE parses public JSON literal without executing scripts or including alternate-color images',()=>{
 const product={id:'SYNTHETIC-100',name:'Small Hammock bag',shortDescription:'Synthetic calfskin detail',customAttributes:{c_LW_collection:['Hammock'],c_LW_colorLabel:'Blue',c_LW_measures:'10X20X30 cm',c_allImages:[{src:'/images/SYNTHETIC-100_1.jpg'}]}};
 const html=`<script>window['__pid_SYNTHETIC-100'] = ${JSON.stringify({data:product})}; throw new Error('must never execute');</script>`;
 const result=extractBagPage(html,{brand:'loewe',source_id:'synthetic',page_url:'https://www.loewe.com/int/en/women/bags/hammock/SYNTHETIC-100.html'});
 assert.equal(result.candidate.collection,'Hammock');assert.equal(result.candidate.name_ar,'حقيبة هاموك صغيرة');assert.match(result.candidate.image_urls[0],/SYNTHETIC-100/);
 product.customAttributes.c_allImages=[{src:'/images/OTHER-200.jpg'}];
 assert.throws(()=>extractBagPage(`<script>window['__pid_SYNTHETIC-100'] = ${JSON.stringify({data:product})};</script>`,{brand:'loewe',source_id:'synthetic',page_url:'https://www.loewe.com/int/en/test'}),/mismatch/);
});
test('LOEWE preserves an explicit product line when collection field is absent and keeps mixed materials',()=>{
 const product={id:'SYNTHETIC-200',name:'Slit pochette bag',shortDescription:'Synthetic technical detail',customAttributes:{c_LW_lineTXTDescription:'Slit',c_LW_materialDescription:'Raffia/calf',c_allImages:[{src:'/images/SYNTHETIC-200.jpg'}]}};
 const {candidate,evidence}=extractBagPage(`window['__pid_SYNTHETIC-200'] = ${JSON.stringify({data:product})};`,{brand:'loewe',source_id:'synthetic',page_url:'https://www.loewe.com/int/en/women/bags/baskets/SYNTHETIC-200.html'});
 assert.equal(candidate.collection,'Slit');assert.equal(evidence.grouping_kind,'explicit_product_line_field');assert.equal(candidate.facts.find(f=>f.key==='material').value,'Raffia/calf');
});
test('Regional profiles exclude foreign sitemaps and declare limited coverage honestly',()=>{
 const robots='Sitemap: https://www.prada.com/sitemap_index_0.xml\nSitemap: https://www.prada.cn/sitemap_index_0.xml';
 const profile=bagSourceProfile('prada','https://www.prada.com',robots);assert.equal(profile.roots.length,1);assert.ok(profile.follow('https://www.prada.com/sitemap_product_AE_en_0.xml'));assert.ok(!profile.follow('https://www.prada.com/sitemap_product_US_en_0.xml'));assert.ok(!profile.follow('https://evil.invalid/sitemap_product_AE_en_0.xml'));assert.ok(!profile.product('https://www.prada.com/ae/en/p/saffiano-leather-sandals/SYNTHETIC'));assert.ok(profile.product('https://www.prada.com/ae/en/p/leather-backpack/SYNTHETIC'));
 assert.deepEqual(sitemapLocations('<urlset><url><loc>https://example.com/p?a=1&amp;b=2</loc></url></urlset>'),['https://example.com/p?a=1&b=2']);
});
test('Collector persists resumable records, honors spacing and stops source after access refusal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jwl-bags-test-'));let time=10000,requests=[];
 const config={brand:'prada',origin:'https://www.prada.com',source_id:'synthetic',output_dir:dir,acquisition_allowed:true,permission_reference:'synthetic-test-authorization',min_interval_seconds:2,max_products:1};
 const urls=['https://www.prada.com/ae/en/p/synthetic-bag/SYNTHETIC123','https://www.prada.com/ae/en/p/synthetic-bag/SYNTHETIC456'];
 const deps={now:()=>time,sleeper:async ms=>{assert.ok(ms>=2000);time+=ms;},fetcher:async(url,opts)=>{
  requests.push(url);assert.equal(opts.headers['User-Agent'],'JwleriaCatalog/1.0');assert.equal(opts.redirect,'manual');
  if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nAllow: /\nSitemap: https://www.prada.com/sitemap_index_0.xml');
  if(url.endsWith('/sitemap_index_0.xml'))return new Response('<sitemapindex><sitemap><loc>https://www.prada.com/sitemap_product_AE_en_0.xml</loc></sitemap></sitemapindex>');
  if(url.endsWith('/sitemap_product_AE_en_0.xml'))return new Response('<urlset>'+urls.map(u=>`<url><loc>${u}</loc></url>`).join('')+'</urlset>');
  if(url===urls[0])return new Response(pradaHtml());
  return new Response('denied',{status:403});
 }};
 try{
  await writeFile(join(dir,'collector.lock'),JSON.stringify({pid:2147483647}));
  const first=await collectBagInventory(config,deps);assert.equal(first.status,'bounded_pause');assert.equal(first.candidate_ids.length,1);assert.equal(first.worldwide_brand_complete,false);
  await writeFile(join(dir,'pause.request'),'pause');const paused=await collectBagInventory({...config,max_products:10},deps);assert.equal(paused.status,'bounded_pause');assert.equal(paused.candidate_ids.length,1);await unlink(join(dir,'pause.request'));
  await assert.rejects(collectBagInventory({...config,max_products:10},deps),/http_403/);
  const state=JSON.parse(await readFile(join(dir,'state.json'),'utf8'));assert.equal(state.status,'blocked');assert.equal(state.stop_code,'http_403');
  const exports=(await readFile(join(dir,'candidates.ndjson'),'utf8')).trim().split('\n');assert.equal(exports.length,1);
  const before=requests.length;await assert.rejects(collectBagInventory(config,deps),/http_403/);assert.equal(requests.length,before);
  assert.equal(requests.filter(u=>u.endsWith('/sitemap_index_0.xml')).length,1);assert.equal(requests.filter(u=>u.endsWith('/sitemap_product_AE_en_0.xml')).length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
