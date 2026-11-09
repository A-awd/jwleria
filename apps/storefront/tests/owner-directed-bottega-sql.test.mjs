import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

// Synthetic fixtures only. The proposed, not approved, Bottega activation under decision 0025 runs in memory after
// every applied migration and the proposed base owner_directed_official migration; nothing reaches a real database.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const BASE=new URL('../supabase/proposed/jwleria_owner_directed_official.sql',import.meta.url);
const FORWARD=new URL('../supabase/proposed/jwleria_owner_directed_bottega.sql',import.meta.url);
const ROLLBACK=new URL('../supabase/proposed/jwleria_owner_directed_bottega.rollback.sql',import.meta.url);
const LONGCHAMP_REF='Owner instruction 2026-10-04 to collect official public product facts privately; robots checked 2026-10-04 allows these product paths. This is not a brand media license.';
// The live Bottega row's text, read 2026-11-09; the migration refuses any other.
const BOTTEGA_REF='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant.';
const GRANT='owner-directed-bottega-0025',HOST='https://bottega-veneta.dam.kering.com';
const sha=c=>c.repeat(64);
async function database({base=true}={}){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,migrations),'utf8'));
  await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('longchamp-official','https://www.longchamp.com','permitted-page',$1,true,false,true)",[LONGCHAMP_REF]);
  await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('bottega-veneta-official','https://www.bottegaveneta.com','permitted-page',$1,true,false,true)",[BOTTEGA_REF]);
  if(base)await db.exec(await readFile(BASE,'utf8'));
  return db;
}
const service=async(db,sql,params)=>{await db.exec('set role service_role');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
const snapshot=db=>db.query(`select jsonb_build_object(
  'constraints',(select jsonb_object_agg(conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('jwl_internal','public'))),
  'sources',(select jsonb_agg(to_jsonb(s) order by id) from jwl_internal.sources s),
  'grants',(select coalesce(jsonb_agg(to_jsonb(g) order by grant_reference),'[]') from jwl_internal.media_grants g)) s`).then(r=>r.rows[0].s);
let n=0;
async function product(db,{source='bottega-veneta-official',image}={}){
  const ref='5690'+(41000+(++n))+'VMAA03715'.slice(4);
  const url=image??(source==='bottega-veneta-official'?`${HOST}/m/${(n*7919).toString(16)}/eCom-${ref}_A.jpg?v=2`:`https://www.longchamp.com/img/${ref}_HCS.png`);
  const c=normalizeBatch([{source_id:source,external_id:ref,source_url:(source==='bottega-veneta-official'?'https://www.bottegaveneta.com/en-gb/p/':'https://www.longchamp.com/p/')+ref+'.html',
    brand:source==='bottega-veneta-official'?'Bottega Veneta':'Longchamp',collection:'Test tote',product_name:'Test tote '+ref,name_ar:'حقيبة اختبار',translation_state:'provided',image_urls:[url],facts:[{key:'color',value:'Grass/black'}]}])[0];
  await service(db,'select public.jwl_ingest_missing_batch($1::jsonb)',[JSON.stringify([c])]);
  return c;
}
// A flat tile made from a cutout master of an opaque original, as the Bottega batch prepares it.
function tile(c,{chars='def',master=sha('b'),original=null,grant=GRANT}={}){
  const variants=[320,640,1200].map((w,i)=>({src:`https://media.example.test/v1/${sha('9')}/${sha('a')}/${w}w-${sha(chars[i])}.webp`,width:w,height:w,bytes:30000+i}));
  const entry={src:variants[2].src,width:1200,height:1200,variants,canvas:'flat_tile'};
  const evidence=variants.map(v=>({candidate_id:c.candidate_id,revision_hash:c.revision_hash,public_url:v.src,public_sha256:v.src.match(/-([a-f0-9]{64})\.webp$/)[1],width:v.width,height:v.height,
    original_source:original??c.image_urls[0],original_sha256:sha('a'),grant_reference:grant,verified_reference:c.external_id,verification_reference:'synthetic identity check',
    treatment:'flat_tile',treatment_version:1,cutout_master_sha256:master,treatment_reference:'synthetic cutout and flat tile review',square_sha256:sha('c'),source_clipped:false}));
  return {entry,evidence,grant};
}
const approve=(db,c,img)=>service(db,'select public.jwl_record_presentation_approval($1::jsonb,$2::jsonb) r',[JSON.stringify(img.evidence),
  JSON.stringify({candidate_id:c.candidate_id,revision_hash:c.revision_hash,media_reference:img.grant,image_verified:true,approved_images:[img.entry.src],approved_image_variants:[img.entry]})]);

test('Bottega activation: needs the base migration, changes only its own source row and grant, and rolls back exactly',async()=>{
  const bare=await database({base:false});
  try{await assert.rejects(bare.exec(await readFile(FORWARD,'utf8')),/Apply jwleria_owner_directed_official.sql first/);}finally{await bare.close();}
  const db=await database();
  try{
    const before=await snapshot(db);
    await db.exec(await readFile(FORWARD,'utf8'));
    const after=await snapshot(db);
    const bottega=after.sources.find(s=>s.id==='bottega-veneta-official');
    assert.equal(bottega.publication_allowed,true);assert.match(bottega.permission_reference,/decision 0025 .*no brand contact; this is not a brand licence\.$/);
    assert.deepEqual(after.sources.find(s=>s.id==='longchamp-official'),before.sources.find(s=>s.id==='longchamp-official'),'Longchamp is not touched');
    const added=after.grants.filter(g=>!before.grants.some(b=>b.grant_reference===g.grant_reference));
    assert.deepEqual(added.map(g=>[g.grant_reference,g.kind,g.source_id,g.candidate_id,g.media_origins,g.background_removal,g.evidence_reference,g.expires_at]),
      [[GRANT,'owner_directed_official','bottega-veneta-official',null,[HOST],true,'decision-0025',null]]);
    assert.deepEqual(before.grants.map(g=>g.grant_reference),after.grants.filter(g=>g.grant_reference!==GRANT).map(g=>g.grant_reference),'no other grant changes');
    assert.deepEqual(after.constraints,before.constraints,'no schema change');
    await db.exec(await readFile(ROLLBACK,'utf8'));
    assert.deepEqual(await snapshot(db),before);
  }finally{await db.close();}
});

test('Bottega activation: a drifted or already-published source row refuses it',async()=>{
  for(const drift of ["permission_reference='changed'",'publication_allowed=true','enabled=false']){
    const db=await database();
    try{
      await db.exec(`update jwl_internal.sources set ${drift} where id='bottega-veneta-official'`);
      await assert.rejects(db.exec(await readFile(FORWARD,'utf8')),/differs from the reviewed state/,drift);
    }finally{await db.close();}
  }
});

test('Bottega activation: a cutout flat tile of an exact gallery file is approved; other hosts, sources and a busy rollback are refused',async()=>{
  const db=await database();
  try{
    await db.exec(await readFile(FORWARD,'utf8'));
    const c=await product(db);
    assert.equal((await approve(db,c,tile(c))).rows[0].r.evidence_rows,3);
    const d=await product(db);
    await assert.rejects(approve(db,d,tile(d,{chars:'123',original:`${HOST}/m/0/eCom-other_A.jpg`})),/exact candidate gallery/);
    const e=await product(db,{image:'https://cdn.example.test/eCom-x_A.jpg'});
    await assert.rejects(approve(db,e,tile(e,{chars:'456'})),/origin is not granted/,'only the recorded official file host');
    const l=await product(db,{source:'longchamp-official'});
    await assert.rejects(approve(db,l,tile(l,{chars:'789'})),/another product or source/,'the Bottega grant never covers Longchamp');
    await assert.rejects(db.exec(await readFile(ROLLBACK,'utf8')),/in use/,'the rollback refuses while an approval cites the grant');
  }finally{await db.close();}
});
