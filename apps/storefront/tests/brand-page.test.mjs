import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {readBrandPage} from '../src/server/supabase-catalog.mjs';

const row={id:'id-1',slug:'test-piece',reference:'REF-1',brand_slug:'new-brand',category_slug:'watches',collection_slug:'test-collection',collection_ar:'اختبار',collection_en:'Test',name_ar:'قطعة',name_en:'Piece',description_ar:'حقائق',description_en:'Facts',images:[],media_state:'facts_only',published_at:'2026-10-21T00:00:00Z'};
const config={url:'https://test.supabase.co',key:'sb_publishable_TEST'};
const envelope={items:[row],total:1,page:1,pageSize:12,pages:1,collections:[{collection_slug:'test-collection',collection_ar:'اختبار',collection_en:'Test'}],brands:[],brand:{brand_slug:'new-brand',brand_name:'New Brand',brand_tier:'luxury'}};

test('one fresh brand RPC supplies validated cards, collections and an unknown published brand',async()=>{
 let calls=0;
 const data=await readBrandPage(config,'new-brand',{page:2},async(url,options)=>{
  calls++;assert.equal(url.pathname,'/rest/v1/rpc/jwl_brand_page');assert.equal(url.searchParams.get('p_page'),'2');assert.equal(url.searchParams.get('p_page_size'),'12');assert.equal(options.redirect,'manual');assert.equal(options.headers.apikey,config.key);
  return Response.json(envelope);
 });
 assert.equal(calls,1);assert.equal(data.result.page,1);assert.equal(data.brand.slug,'new-brand');assert.equal(data.result.items[0].image,null);assert.equal(data.collections[0].slug,'test-collection');
 await assert.rejects(readBrandPage(config,'new-brand',{},async()=>new Response('unavailable',{status:503})),/503/);
 await assert.rejects(readBrandPage(config,'new-brand',{},async()=>Response.json({...envelope,items:[{...row,images:['https://example.com/unapproved.webp']}]})),/images/);
 await assert.rejects(readBrandPage(config,'new-brand',{},async()=>Response.json({...envelope,items:[{...row,brand_slug:'wrong-brand'}]})),/pagination/);
 const empty=await readBrandPage(config,'empty-brand',{},async()=>Response.json({items:[],total:0,page:1,pageSize:12,pages:0,collections:[],brands:[],brand:null}));assert.equal(empty.brand,undefined);assert.equal(empty.result.total,0);
});

test('brand RPC preserves pagination, collections and anonymous RLS without exposing extra columns',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role outsider;
   create table public.jwl_catalog(id text,slug text,reference text,brand_slug text,brand_name text,brand_tier text,category_slug text,collection_slug text,collection_ar text,collection_en text,name_ar text,name_en text,description_ar text,description_en text,images jsonb,media_state text,published_at timestamptz,active boolean,source_copy text);
   alter table public.jwl_catalog enable row level security;
   create policy public_read on public.jwl_catalog for select to anon,authenticated using(active);
   grant select on public.jwl_catalog to anon,authenticated,service_role;
   insert into public.jwl_catalog select 'id-'||n,'piece-'||n,'REF-'||n,'new-brand','New Brand','luxury','watches','collection-'||(n%3),'مجموعة','Collection '||(n%3),'قطعة','Piece '||n,'حقائق','Facts','[]'::jsonb,'facts_only','2026-10-21T00:00:00Z'::timestamptz+(n*interval '1 second'),true,'private marketing' from generate_series(1,25)n;
   insert into public.jwl_catalog select 'hidden','hidden','HIDDEN','hidden-brand','Hidden Brand','luxury','watches','hidden','مخفية','Hidden','مخفية','Hidden','','','[]'::jsonb,'facts_only',now(),false,'private marketing';`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261021090207_jwleria_public_brand_page.sql',import.meta.url),'utf8'));
  const properties=(await db.query("select prosecdef,provolatile from pg_proc where proname='jwl_brand_page'")).rows[0];assert.equal(properties.prosecdef,false);assert.equal(properties.provolatile,'s');
  await db.exec('set role anon');
  const query=async(brand,page=1,size=12)=>(await db.query('select public.jwl_brand_page($1,$2,$3) data',[brand,page,size])).rows[0].data;
  const first=await query('new-brand');assert.equal(first.total,25);assert.equal(first.items.length,12);assert.equal(first.pages,3);assert.equal(first.collections.length,3);assert.equal(first.brand.brand_name,'New Brand');assert.equal(first.items[0].reference,'REF-25');assert.equal(first.brands.length,1);assert.ok(!JSON.stringify(first).includes('source_copy'));assert.ok(!JSON.stringify(first).includes('private marketing'));
  const last=await query('new-brand',999);assert.equal(last.page,3);assert.equal(last.items.length,1);
  const max=await query('new-brand',1,999);assert.equal(max.pageSize,48);assert.equal(max.items.length,25);
  assert.equal((await query('new-brand',-1)).page,1);
  const hidden=await query('hidden-brand');assert.equal(hidden.total,0);assert.equal(hidden.brand,null);assert.deepEqual(hidden.collections,[]);
  await db.exec('reset role;set role outsider');await assert.rejects(query('new-brand'),/permission denied/i);
 }finally{await db.close();}
});
