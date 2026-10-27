// Shared by tests/models-integration.test.mjs only (not a test file itself): a PGlite database with every
// migration plus the PROPOSED models/variants layer and synthetic fixtures, and a minimal PostgREST
// stand-in that answers the storefront's exact requests from it as the anon role. Nothing here reaches
// the network; the HTTP server listens on 127.0.0.1 only.
import {readFile,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const proposed=new URL('../supabase/proposed/jwleria_product_models.sql',import.meta.url);
export const slugify=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
export const sources={
  'rolex-official':{origin:'https://www.rolex.com',brand:'Rolex',category:'watches'},
  'loewe-official':{origin:'https://www.loewe.com',brand:'LOEWE',category:'bags'},
  'longchamp-official':{origin:'https://www.longchamp.com',brand:'Longchamp',category:'bags'},
  'cartier-official':{origin:'https://www.cartier.com',brand:'Cartier',category:'jewellery'},
};
// Synthetic rows shaped like the captured data (adapted from tests/product-models-sql.test.mjs). No image
// is ever invented: every row is published facts-only, exactly as the factual batch publishes it.
const datejust=(ref,color,bracelet)=>({source:'rolex-official',ref,collection:'datejust',name_en:`Rolex Datejust 36 watch: Oystersteel - ${ref}`,name_ar:'ساعة رولكس ديت جست، 36 مم',
  facts:{diameter:'36 mm',material:'Oystersteel',movement:'Perpetual, mechanical, self-winding',water_resistance:'Waterproof to 100 metres / 330 feet',power_reserve:'Approximately 55 hours',
    bracelet_material:'Oystersteel',color,bracelet_type:bracelet}});
export const jubilee='Jubilee, five-piece links',oyster='Oyster, three-piece solid links';
const tote=(code,color,ar)=>({source:'longchamp-official',ref:'L1899089'+code,collection:'Le Pliage Original',name_en:`Le Pliage Original L Tote bag — ${color}`,
  name_ar:`حقيبة كتف Le Pliage Original، مقاس كبير، ${ar}`,facts:{color,dimensions:'31 x 30 x 19 cm',material:'Recycled canvas',weight:'0.2 kg'}});
const puzzle=(code,color)=>({source:'loewe-official',ref:'328.24.W10-'+code,collection:'Puzzle',name_en:'Small Puzzle bag in classic calfskin',name_ar:'حقيبة Puzzle، مقاس صغير، من جلد عجل كلاسيكي',
  facts:{color,dimensions:'24 x 16.5 x 10.5 cm',material:'Classic calfskin'}});
export const fixtures=[
  // A dial x bracelet model whose real variants cover only some combinations: silver on both bracelets,
  // bright blue and candy pink on Oyster only. One Arabic name omits the shared case diameter.
  {...datejust('m126200-0001','Silver',jubilee),name_ar:'ساعة رولكس ديت جست'},datejust('m126200-0002','Silver',oyster),
  datejust('m126200-0003','Olive green',oyster),datejust('m126200-0006','Bright blue',oyster),datejust('m126200-0010','Candy pink',oyster),
  // Two references that share dial and bracelet cannot be told apart, so each stays a model of its own.
  datejust('m126200-0005','Bright blue',jubilee),datejust('m126200-0029','Bright blue',jubilee),
  {source:'rolex-official',ref:'m126610ln-0001',collection:'submariner',name_en:'Rolex Submariner Date watch: Oystersteel - m126610ln-0001',name_ar:'ساعة رولكس صب مارينر ديت، 41 مم',
    facts:{diameter:'41 mm',material:'Oystersteel',color:'Black',bracelet_type:oyster,water_resistance:'Waterproof to 300 metres / 1,000 feet',power_reserve:'Approximately 70 hours'}},
  puzzle('2435','Tan'),puzzle('1100','Black'),
  tote('001','Black','أسود'),tote('556','Navy','كحلي'),tote('P59','Paper','ورقي'),
  {source:'cartier-official',ref:'B4084600',collection:'Love',name_en:'Love ring',name_ar:'خاتم Love',facts:{material:'Yellow gold'}},
  {source:'cartier-official',ref:'B4084700',collection:'Love',name_en:'Love ring',name_ar:'خاتم Love',facts:{material:'Yellow gold'}},
];
/** Withdrawn before the mapping run (never mapped) and after it (mapped, then hidden by RLS). */
export const WITHDRAWN_BEFORE='B4084700',WITHDRAWN_AFTER='m126200-0003';
export const slugOf=ref=>{const f=fixtures.find(x=>x.ref===ref);return slugify(sources[f.source].brand+'-'+f.ref);};

const record=f=>{const s=sources[f.source];return normalizeBatch([{source_id:f.source,external_id:f.ref,source_url:`${s.origin}/p/${encodeURIComponent(f.ref)}`,brand:s.brand,collection:f.collection,
  product_name:f.name_en,name_en:f.name_en,name_ar:f.name_ar,translation_state:'provided',image_urls:[`${s.origin}/img/${encodeURIComponent(f.ref)}.png`],
  facts:Object.entries(f.facts).filter(([,v])=>v).map(([key,value])=>({key,value}))}])[0];};
const product=(f,r)=>({candidate_id:r.candidate_id,revision_hash:r.revision_hash,slug:slugOf(f.ref),reference:f.ref,brand_slug:slugify(sources[f.source].brand),
  brand_name:sources[f.source].brand,brand_tier:'luxury',category_slug:sources[f.source].category,collection_slug:slugify(f.collection),collection_ar:f.collection,collection_en:f.collection,
  name_ar:r.name_ar,name_en:r.name_en,description_ar:r.description_ar,description_en:r.description_en,images:[],search_text:(f.ref+' '+f.name_en).toLowerCase()});

export const as=async(db,role,fn)=>{await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}};

/** Applies every migration and the proposed layer, publishes the fixtures and runs the mapping as service_role. */
export async function modelsDatabase(){
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; set timezone='UTC';");
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.exec(await readFile(proposed,'utf8'));
  for(const [id,s] of Object.entries(sources))await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values($1,$2,'permitted-page','synthetic review',true,false,true)",[id,s.origin]);
  const records=fixtures.map(record);
  await db.query('select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify(records)]);
  await db.query("select public.jwl_publish_factual_batch($1::jsonb,'synthetic owner instruction')",[JSON.stringify(fixtures.map((f,j)=>product(f,records[j])))]);
  await db.query('update public.jwl_catalog set active=false where reference=$1',[WITHDRAWN_BEFORE]);
  const applied=(await as(db,'service_role',()=>db.query('select jwl_internal.apply_product_variants() r'))).rows[0].r;
  await db.query('update public.jwl_catalog set active=false where reference=$1',[WITHDRAWN_AFTER]);
  return {db,applied};
}

// The relations and functions the storefront reads, with PostgREST's argument types for the RPCs.
const RELATIONS=new Set(['jwl_catalog','jwl_catalog_models','jwl_collections','jwl_brands']);
const RPCS={jwl_product_model:{p_slug:'text'},jwl_brand_models_page:{p_brand:'text',p_page:'integer',p_page_size:'integer'},jwl_brand_page:{p_brand:'text',p_page:'integer',p_page_size:'integer'}};
// Set-returning RPCs: PostgREST applies select, filters, order, range and count to their rows like a relation's.
const ROW_RPCS={jwl_catalog_models_search:{p_term:'text'}};
const ident=/^[a-z_][a-z0-9_]*$/;
const json=(status,body,headers={})=>({status,headers:{'content-type':'application/json; charset=utf-8',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const fail=(status,code,message)=>json(status,{code,message,details:null,hint:null});

/**
 * Answers one GET as PostgREST would for this schema: rows rendered by Postgres' own json_agg, an exact
 * count in Content-Range, RPC results as their JSON value, and PostgREST's schema-cache 404s.
 * Every statement runs as anon, so row-level security decides what is visible.
 */
export function postgrest(db,{key}={}){
  let queue=Promise.resolve();
  const exclusive=fn=>{const run=queue.then(fn,fn);queue=run.catch(()=>{});return run;};
  const anon=(sql,params)=>exclusive(()=>as(db,'anon',()=>db.query(sql,params)));
  return async function handle(url,headers={}){
    if(key&&headers.apikey!==key)return fail(401,'PGRST301','No API key found in request');
    const path=url.pathname.replace(/^\/rest\/v1\//,'');
    if(path===url.pathname)return fail(404,'PGRST125','Invalid path specified in request URL');
    try{
      const rowFn=path.startsWith('rpc/')&&ROW_RPCS[path.slice(4)]?path.slice(4):null;
      if(path.startsWith('rpc/')&&!rowFn){
        const fn=path.slice(4),args=RPCS[fn];
        if(!args)return fail(404,'PGRST202',`Could not find the function public.${fn} without parameters in the schema cache`);
        const names=[...url.searchParams.keys()];
        if(names.some(n=>!(n in args)))return fail(404,'PGRST202',`Could not find the function public.${fn}(${names.join(', ')}) in the schema cache`);
        const sql=`select public.${fn}(${names.map((n,i)=>`${n} => $${i+1}::${args[n]}`).join(',')})::text as body`;
        const {rows}=await anon(sql,names.map(n=>url.searchParams.get(n)));
        return json(200,rows[0].body??'null');
      }
      if(!rowFn&&!RELATIONS.has(path))return fail(404,'PGRST205',`Could not find the table 'public.${path}' in the schema cache`);
      const where=[],values=[];let select='*',order='',limit=null,offset=0,from=`public.${path}`;
      if(rowFn){
        const args=ROW_RPCS[rowFn],given=Object.keys(args).filter(n=>url.searchParams.has(n));
        if(given.length!==Object.keys(args).length)return fail(404,'PGRST202',`Could not find the function public.${rowFn} without parameters in the schema cache`);
        for(const n of given)values.push(url.searchParams.get(n));
        from=`public.${rowFn}(${given.map((n,i)=>`${n} => $${i+1}::${args[n]}`).join(',')})`;
      }
      for(const [name,value] of url.searchParams){
        if(rowFn&&name in ROW_RPCS[rowFn])continue;
        if(name==='select'){const cols=value.split(',');if(cols.some(c=>!ident.test(c)))return fail(400,'PGRST100','Unsupported select');select=cols.map(c=>`"${c}"`).join(',');}
        else if(name==='order'){const terms=value.split(',').map(t=>t.split('.'));if(terms.some(([c,d='asc'])=>!ident.test(c)||!['asc','desc'].includes(d)))return fail(400,'PGRST100','Unsupported order');order=' order by '+terms.map(([c,d='asc'])=>`"${c}" ${d}`).join(',');}
        else if(name==='limit')limit=Number(value);
        else if(name==='offset')offset=Number(value);
        else{
          const m=/^(eq|ilike)\.(.*)$/s.exec(value);
          if(!ident.test(name)||!m)return fail(400,'PGRST100',`Unsupported filter ${name}`);
          values.push(m[1]==='ilike'?m[2].replaceAll('*','%'):m[2]);
          where.push(`"${name}" ${m[1]==='eq'?'=':'ilike'} $${values.length}`);
        }
      }
      if(![limit??0,offset].every(n=>Number.isSafeInteger(n)&&n>=0))return fail(400,'PGRST100','Unsupported range');
      const filter=where.length?' where '+where.join(' and '):'';
      const page=`select ${select} from ${from}${filter}${order}${limit===null?'':` limit ${limit}`} offset ${offset}`;
      const {rows}=await anon(`select coalesce(json_agg(t),'[]')::text as body,count(*)::int as n from (${page}) t`,values);
      if(!/count=exact/.test(headers.Prefer??headers.prefer??''))return json(200,rows[0].body);
      // PostgREST's range status: 416 past the end, 206 for a partial page, 200 for everything.
      const total=(await anon(`select count(*)::int as n from ${from}${filter}`,values)).rows[0].n;
      if(offset>total)return json(416,{code:'PGRST103',message:'Requested range not satisfiable'},{'content-range':`*/${total}`});
      return json(rows[0].n<total?206:200,rows[0].body,{'content-range':rows[0].n?`${offset}-${offset+rows[0].n-1}/${total}`:`*/${total}`});
    }catch(error){return fail(400,error.code??'XX000',error.message);}
  };
}

/** A fetch stub for the adapter: answers from the database and records every request URL. */
export function postgrestFetch(handle,log=[]){
  return async(input,init={})=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    log.push(url);
    const r=await handle(url,init.headers??{});
    return new Response(r.status===204?null:r.body,{status:r.status,headers:r.headers});
  };
}

/** The same answers over HTTP on 127.0.0.1, for the private local preview. */
export async function postgrestServer(handle,log=[]){
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    log.push(url);
    const r=req.method==='GET'?await handle(url,req.headers):fail(405,'PGRST117','Only GET is served');
    res.writeHead(r.status,r.headers).end(r.body);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,origin:`http://127.0.0.1:${server.address().port}/`};
}
