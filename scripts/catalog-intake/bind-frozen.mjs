// Binds already-frozen, already-reviewed flat-tile derivatives to a saved candidate revision, without encoding or
// copying anything (decision 0026). It rebuilds the private manifest that prepareResponsiveMedia records for a
// cutout-based flat tile, from the batch's own records: the tile, the cutout check, the frozen derivative index and the
// preview metrics. That manifest then goes through the unchanged gates: mergedVerification, derivativeReviewProblem and
// approvalBundle (grant, exact gallery, verification, cutout and tile reviews, content-addressed paths). Each frozen
// file is hashed again where it lies.
// It creates no review or grant. The candidate is a saved official record, or differs from current content only in
// gallery fields established by that saved record. The re-bind
// statement installs that record only while the live revision is still the compared one and the stored public names and
// descriptions equal it. The database re-checks gallery membership, revision and grant when the approval is recorded.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {mergedVerification,derivativeReviewProblem,derivativeReviewByTile,derivativeReviewed,batchPublishSql,longchampOwnerDirection} from './batch-official.mjs';
import {approvalBundle} from './media-pipeline.mjs';
import {mediaApprovalSql} from './supabase.mjs';
import {dollarQuote} from './factual-publication.mjs';
import {flatTileTreatment,flatTileReviewChecks} from './flat-tile.mjs';
import {cutoutReviewChecks} from './cutout.mjs';
import {normalizeBatch} from './normalize.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
const same=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
const galleryFields=['image_urls','image_reference_checks'];
const file=url=>url.split('?')[0];
const without=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
// The normalizer's own output fields that are not candidate content.
const recordOnly=['candidate_id','revision_hash','source_id','external_id','publication_state','media_rights_state','image_verification_state'];

/**
 * The candidate revision that differs from the live one only in its gallery fields, taken from a saved official page
 * record that lists the same files in the same order. Both revisions come from the existing normalizer:
 * - it must first reproduce the live revision hash from the live content, which proves the canonical form;
 * - the derived content must then equal the live content in every field except image_urls and image_reference_checks;
 * - its names and descriptions must equal the stored public row.
 * Anything else is refused with its reason.
 */
export function derivedRecord({live,saved}){
  const row=c=>({...c,source_id:live.source_id,external_id:live.external_id});
  const [again]=normalizeBatch([row(live.content)]);
  if(again.candidate_id!==live.candidate_id||again.revision_hash!==live.revision_hash)throw Error('the normalizer does not reproduce the live revision');
  if(saved.external_id!==live.external_id||saved.image_urls.length!==live.content.image_urls.length||saved.image_urls.some((u,i)=>file(u)!==file(live.content.image_urls[i])))
    throw Error('the saved gallery does not list the same files in the same order');
  const [next]=normalizeBatch([row({...live.content,image_urls:saved.image_urls,image_reference_checks:saved.image_reference_checks})]);
  if(!same(without(next,[...recordOnly,...galleryFields]),without(live.content,galleryFields)))throw Error('the derived revision changes more than the gallery fields');
  if(!same(next.image_urls,saved.image_urls))throw Error('the derived gallery differs from the saved gallery');
  const k=live.catalog;
  if(!k||k.active!==true||k.reference!==live.external_id||['name_ar','name_en','description_ar','description_en'].some(f=>k[f]!==next[f])||k.brand_name!==next.brand||k.collection_en!==next.collection)
    throw Error('the stored public names or descriptions differ from the current content');
  return next;
}

/**
 * The candidate revision that differs from the live one only where its official page replaced one gallery file. The
 * recorded file URL that the page no longer declared becomes the URL the page declared for that file's current version,
 * at the same position, with its reference check from the download of exactly that URL. The same normalizer proofs as
 * derivedRecord apply.
 */
export function refreshedRecord({live,from,to,check}){
  const row=c=>({...c,source_id:live.source_id,external_id:live.external_id});
  const [again]=normalizeBatch([row(live.content)]);
  if(again.candidate_id!==live.candidate_id||again.revision_hash!==live.revision_hash)throw Error('the normalizer does not reproduce the live revision');
  const at=live.content.image_urls.indexOf(from);
  if(at<0)throw Error('the recorded stale file URL is not in the live gallery');
  if(live.content.image_urls.includes(to))throw Error('the live gallery already lists the current file URL');
  if(check?.url!==to)throw Error('the reference check must be the download of the current file URL');
  const urls=live.content.image_urls.map((u,k)=>k===at?to:u);
  const checks=(live.content.image_reference_checks??[]).filter(c=>c.url!==from).concat([check]);
  const [next]=normalizeBatch([row({...live.content,image_urls:urls,image_reference_checks:checks})]);
  if(!same(without(next,[...recordOnly,...galleryFields]),without(live.content,galleryFields)))throw Error('the refreshed revision changes more than the gallery fields');
  if(!same(next.image_urls,urls))throw Error('the refreshed gallery differs from the intended gallery');
  const k=live.catalog;
  if(!k||k.active!==true||k.reference!==live.external_id||['name_ar','name_en','description_ar','description_en'].some(f=>k[f]!==next[f])||k.brand_name!==next.brand||k.collection_en!==next.collection)
    throw Error('the stored public names or descriptions differ from the current content');
  return next;
}
const cardWidths=[320,640,960];
const once={mode:0o600,flag:'wx'};
const identityReviewer='Claude (implementation owner; database-bound gallery check, not the visual reviewer)';

/** The binding prepareResponsiveMedia derives for a cutout-based flat tile, in its own key order. */
export function frozenBinding({candidate,row,grant}){
  return {source_id:candidate.source_id,candidate_id:candidate.candidate_id,revision_hash:candidate.revision_hash,media_permission_reference:grant.grant_reference,
    asset_source_url:row.asset_url,asset_sha256:row.original.sha256,
    treatment:{kind:flatTileTreatment.kind,version:flatTileTreatment.version,cutout_sha256:row.cutout?.sha256??null,tile_sha256:row.tile.sha256}};
}

/** The prepared manifest of one frozen set: the recorded tile, cutout check and derivative files, at their content paths. */
export function frozenManifest({binding,row,entry,preview}){
  const root=`v1/${sha256(JSON.stringify(binding))}/${binding.asset_sha256}`;
  const metrics=new Map(preview.variants.map(v=>[v.sha256,v]));
  const file=f=>{
    const m=metrics.get(f.sha256);
    if(!m||m.width!==f.width||m.bytes!==f.bytes||m.height!==f.height)throw Error('A frozen file differs from its preview record');
    return {path:`${root}/${f.width}w-${f.sha256}.webp`,sha256:f.sha256,bytes:f.bytes,width:f.width,height:f.height,mime_type:'image/webp',
      over_budget:m.within_budget!==true,fidelity_floor_met:m.fidelity_floor_met===true};
  };
  const detailFile=entry.files.find(f=>f.width===entry.detail_width);
  if(!detailFile||entry.detail_width!==Math.min(entry.side,1600))throw Error('The frozen set has no detail file at its native cap');
  const variants=entry.files.filter(f=>cardWidths.includes(f.width)&&f.width<=entry.side).map(file),detail=file(detailFile);
  if(!variants.length||entry.files.some(f=>!cardWidths.includes(f.width)&&f.width!==entry.detail_width))throw Error('The frozen set has unexpected widths');
  const t=binding.treatment,cut=row.cutout??null,check=cut?.check??{};
  return {schema_version:6,publication_state:'private-prepared',image_verification_state:'pending',purpose:'catalog',binding,
    assembled_from:'recorded tile, cutout check (when the alpha came from a cutout) and frozen derivative records of the batch; nothing encoded (decision 0026)',
    treatment:{kind:t.kind,version:t.version,cutout_sha256:t.cutout_sha256,tile_sha256:t.tile_sha256,producer:cut?.producer??null,source_clipped:false},pixel_source:'flat_tile',
    // A native-alpha tile has no cutout master and no background removal, as prepareResponsiveMedia records it.
    ...(cut?{cutout_master:{sha256:t.cutout_sha256,check:{passed:check.passed===true,original:{sha256:binding.asset_sha256},cutout:{sha256:t.cutout_sha256},recorded:check}},
      cutout_review_required:[...cutoutReviewChecks]}:{}),
    flat_tile:{sha256:t.tile_sha256,side:entry.side,record:{changed_opaque_product_pixels:row.tile.changed_opaque_product_pixels}},
    flat_tile_review_required:[...flatTileReviewChecks],
    processing:{crop:false,upscale:false,color_adjustments:false,...(cut?{background_removed:true}:{}),canvas:{kind:'flat_tile'}},
    performance_review_required:[...variants,detail].some(f=>f.over_budget||!f.fidelity_floor_met),variants,detail};
}

/**
 * One connector statement for one to ten products. For each product, in its own subtransaction:
 * - it installs the saved record as the current revision with the existing intake function;
 * - it publishes the stored public row's facts onto that revision with the existing factual function.
 * The candidate's revision change deactivates and unmaps the row, so both steps run together and `active` is restored
 * before the statement ends. A product whose live revision is not the compared one, or whose stored names and
 * descriptions differ from the saved record, is left unchanged with its reason. Variants are re-mapped once at the end.
 */
export function rebindSql(entries,instruction){
  if(!entries.length||entries.length>10)throw Error('One to ten products per re-bind statement');
  if(typeof instruction!=='string'||!instruction.trim())throw Error('The factual instruction text is required');
  const rows=entries.map(e=>({ref:e.ref,candidate_id:e.candidate_id,from_revision:e.from_revision,revision_hash:e.revision_hash,record:e.record}));
  return `do $do$
declare x record; result jsonb:='[]'::jsonb; rebound integer:=0;
begin
  for x in select * from jsonb_to_recordset(${dollarQuote(JSON.stringify(rows))}::jsonb) as t(ref text,candidate_id text,from_revision text,revision_hash text,record jsonb) loop
    begin
      if exists(select 1 from jwl_internal.candidates where candidate_id=x.candidate_id and revision_hash=x.revision_hash) then
        result:=result||jsonb_build_object('ref',x.ref,'state','already_current');continue;
      end if;
      if not exists(select 1 from jwl_internal.candidates where candidate_id=x.candidate_id and external_id=x.ref and revision_hash=x.from_revision) then
        raise exception 'live revision is not the compared revision';
      end if;
      if not exists(select 1 from public.jwl_catalog k where k.id=x.candidate_id and k.active and k.reference=x.ref
          and k.brand_name=x.record->>'brand' and k.collection_en=x.record->>'collection'
          and k.name_ar=x.record->>'name_ar' and k.name_en=x.record->>'name_en'
          and k.description_ar=x.record->>'description_ar' and k.description_en=x.record->>'description_en') then
        raise exception 'stored public names or descriptions differ from the saved record';
      end if;
      perform public.jwl_ingest_batch(jsonb_build_array(x.record));
      perform public.jwl_publish_factual_batch((select jsonb_build_array(to_jsonb(k)||jsonb_build_object('candidate_id',k.id,'revision_hash',x.revision_hash,
        'images','[]'::jsonb,'image_variants','[]'::jsonb)) from public.jwl_catalog k where k.id=x.candidate_id),${dollarQuote(instruction.trim())});
      result:=result||jsonb_build_object('ref',x.ref,'state','rebound');rebound:=rebound+1;
    exception when others then
      result:=result||jsonb_build_object('ref',x.ref,'state','unchanged','detail',sqlerrm);
    end;
  end loop;
  if rebound>0 then perform jwl_internal.apply_product_variants();end if;
  perform set_config('jwl.rebind_result',result::text,false);
end $do$;
select current_setting('jwl.rebind_result')::jsonb as result;`;
}

/**
 * Binds each named reference. Inputs are files the operator names: the batch directory, the saved official records
 * (ndjson), the visual reviews, the derivative review, Codex's live gallery read, the exact grant row the migration
 * inserts, the public bucket URL and the batch writer's name. Writes, once, into a new private directory:
 * - bundles in the bundler's layout;
 * - re-bind statements, in the same product order and chunks as the record statements;
 * - a ready manifest for deliver-ready.mjs, whose upload files are the frozen files where they lie.
 */
export async function bindFrozen({batch_dir,refs,records,reviews,derivative_review,live,grant,public_base_url,prepared_by,owner_instruction,collection_label,derived=false,refreshes=null,relocate=[],refused:prior=[],out,chunk=10}){
  if(grant?.kind!=='owner_directed_official'||grant.evidence_reference!=='decision-0025'||!Array.isArray(grant.media_origins))throw Error('The exact owner-directed grant row is required');
  // Old-host paths are resolved in memory only; the batch's own records are never rewritten.
  const at=path=>{for(const r of relocate)if(path?.startsWith(r.from))return r.to+path.slice(r.from.length);return path;};
  const relocated=text=>relocate.reduce((t,r)=>t.split(r.from).join(r.to),text);
  const results=JSON.parse(relocated(await readFile(join(batch_dir,'results.json'),'utf8')));
  const previews=JSON.parse(relocated(await readFile(join(batch_dir,'previews.json'),'utf8')));
  const rows=new Map(Object.values(results).filter(x=>x.tile).map(x=>[x.ref,x]));
  // A frozen derivative index when the batch has one; otherwise the preview record of each accepted tile.
  const index=existsSync(join(batch_dir,'derivatives-index.json'))?JSON.parse(await readFile(join(batch_dir,'derivatives-index.json'),'utf8')):null;
  const entries=new Map(index?index.items.map(e=>[e.ref,e]):[...rows.values()].filter(x=>previews[x.tile.sha256]).map(x=>[x.ref,{ref:x.ref,original_sha256:x.original.sha256,
    cutout_sha256:x.cutout?.sha256??null,tile_sha256:x.tile.sha256,side:x.tile.side,detail_width:Math.min(x.tile.side,1600),repaired:false,rejected:[],
    files:previews[x.tile.sha256].variants.map(v=>({width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256,path:at(v.path)}))}]));
  const visual=new Map(reviews.map(r=>[r.ref,r])),liveRows=new Map(live.map(r=>[r.external_id,r]));
  const derivatives=derivativeReviewByTile(derivative_review);
  await mkdir(join(out,'bundles'),{recursive:true,mode:0o700});await mkdir(join(out,'rebind'),{mode:0o700});
  const bound=[],refused=[...prior];
  for(const ref of refs){
    try{
      const row=rows.get(ref),entry=entries.get(ref),record=records.get(ref),review=visual.get(ref),now=liveRows.get(ref);
      if(!row||!entry||!record||!review||!now)throw Error('a batch row, frozen set, saved record, review or live row is missing');
      if(entry.repaired!==false||entry.rejected?.length||entry.tile_sha256!==row.tile.sha256||entry.cutout_sha256!==(row.cutout?.sha256??null)||entry.original_sha256!==row.original.sha256)throw Error('the frozen set is not the accepted set');
      if(record.external_id!==ref||record.source_id!==grant.source_id||record.candidate_id!==now.candidate_id)throw Error('the saved record names another product');
      const gallery=record.image_urls.indexOf(row.asset_url);
      if(gallery<0)throw Error('the downloaded file is not in the saved record gallery');
      if(record.translation_state!=='provided')throw Error('the saved record has no provided Arabic name');
      if(now.revision_hash===record.revision_hash)throw Error('already current: bind directly without a re-bind');
      for(const f of entry.files){const bytes=await readFile(f.path);if(bytes.length!==f.bytes||sha256(bytes)!==f.sha256)throw Error('a frozen file changed: '+f.width+'w');}
      const binding=frozenBinding({candidate:record,row,grant});
      const manifest=frozenManifest({binding,row,entry,preview:previews[row.tile.sha256]});
      // The bundler's own rule: a supplementary derivative review that names this tile must pass every one of its files.
      if(derivativeReviewed(derivatives,row.tile.sha256)){const gate=derivativeReviewProblem(derivatives,{tile_sha256:row.tile.sha256,files:[manifest.detail,...manifest.variants]});if(gate)throw Error(gate);}
      const o=row.original,named=row.asset_url.includes(`/${ref}/`);
      const r=refreshes?.get(ref);
      const reason=`The untouched original sha256 ${o.sha256} was downloaded at ${o.acquired_at} from ${row.asset_url} (HTTP ${o.http_status}). That URL is byte-identical to image_urls[${gallery}] of ${r?`the candidate revision ${record.revision_hash} for reference ${ref} (source ${record.source_id}). That revision is the live revision ${now.revision_hash} with only one gallery file updated: the recorded ${r.recorded_image_url}, which the official page ${r.page} no longer declared when read (${r.page_read}), is replaced by the URL that page declared for the file's current version, with its reference check; every other field is unchanged`:derived?`the candidate revision ${record.revision_hash} for reference ${ref} (source ${record.source_id}). That revision is the live revision ${now.revision_hash} with only its image_urls and image_reference_checks taken from the ${collection_label} record, which lists the same files in the same order at the largest width the page itself declares; every other field is unchanged`:`the ${collection_label} record for reference ${ref} (source ${record.source_id}, revision ${record.revision_hash}), which records each gallery file at the largest width the page itself declares. The live revision ${now.revision_hash} lists the same files in the same order at the page's default rendition`}. The re-bind statement installs ${derived||r?'that revision':'the saved record'} as the current revision only while the stored public names and descriptions equal it, and the database re-checks gallery membership when this approval is recorded. ${named?`The file path names the reference directory /${ref}/.`:'The file path does not name the reference directory.'} This settles the reference only; colour and variant remain a separate visual check. Decision 0025 owner direction; no brand licence is claimed.`;
      const verification=mergedVerification(review.verification,{basis:'official_gallery_listing',asset_sha256:o.sha256,identity_established:true,reference:ref,
        revision_hash:record.revision_hash,gallery_url:row.asset_url,reviewer:identityReviewer,reason});
      const bundle=approvalBundle({candidate:record,grant,items:[{asset:{path:o.path,source_url:row.asset_url,sha256:o.sha256},manifest,verification,
        ...(row.cutout?{cutout_review:review.cutout_review}:{}),tile_review:review.tile_review}],public_base_url,prepared_by});
      await mkdir(join(out,'bundles',ref),{mode:0o700});
      await writeFile(join(out,'bundles',ref,'approval-bundle.json'),JSON.stringify(bundle,null,1),once);
      const frozen=new Map(entry.files.map(f=>[f.sha256,f.path]));
      bound.push({ref,candidate_id:record.candidate_id,from_revision:now.revision_hash,revision_hash:record.revision_hash,record,sql:mediaApprovalSql(bundle),
        uploads:bundle.uploads.map(u=>{const e=bundle.evidence.find(x=>x.public_sha256===u.sha256);
          return {x_jwl_path:u.path,file:frozen.get(u.sha256),sha256:u.sha256,bytes:u.bytes,width:e.width,height:e.height,public_url:e.public_url};})});
    }catch(error){refused.push({ref,reason:error.message});}
  }
  const items=[];
  for(let i=0;i*chunk<bound.length;i++){
    const part=bound.slice(i*chunk,(i+1)*chunk),n=String(i+1).padStart(3,'0');
    const recordFile=join(out,'bundles',`record-approvals-${n}.sql`);
    await writeFile(recordFile,part.map(b=>b.sql).join('\n')+'\n',once);
    await writeFile(join(out,'rebind',`rebind-${n}.sql`),rebindSql(part,owner_instruction)+'\n',once);
    part.forEach((b,k)=>items.push({ref:b.ref,model:b.ref.replace(/-[0-9]{4}$/,''),batch_dir:join(out,'bundles'),candidate_id:b.candidate_id,revision_hash:b.revision_hash,
      record_sql:{file:recordFile,line:k+1,sha256:sha256(b.sql)},rebind_sql:join(out,'rebind',`rebind-${n}.sql`),state:'prepared',uploads:b.uploads}));
  }
  if(bound.length)await writeFile(join(out,'bundles','publish.sql'),batchPublishSql(bound.map(b=>b.candidate_id))+'\n',once);
  const base=new URL(public_base_url.replace(/\/?$/,'/'));
  await writeFile(join(out,'bundles','bundle-report.json'),JSON.stringify({prepared_by,assembled:'bind-frozen.mjs; no encoding',bundled:bound.map(b=>({ref:b.ref,candidate_id:b.candidate_id,files:b.uploads.length})),refused},null,1),once);
  const manifest={generated_at:new Date().toISOString(),grant_reference:grant.grant_reference,public_base:base.href,upload_endpoint:new URL('/functions/v1/jwl-media-upload',base).href,
    counts:{items:items.length,files:items.reduce((n,x)=>n+x.uploads.length,0),bytes:items.reduce((n,x)=>n+x.uploads.reduce((m,u)=>m+u.bytes,0),0),refused:refused.length,delivered:0,recorded:0},items,refused};
  await writeFile(join(out,'ready-manifest.json'),JSON.stringify(manifest,null,1),once);
  return {...manifest.counts,record_files:Math.ceil(bound.length/chunk),refused};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2])throw Error('Usage: node bind-frozen.mjs PRIVATE_INPUT.json');
  const i=JSON.parse(await readFile(process.argv[2],'utf8')),load=async p=>JSON.parse(await readFile(p,'utf8'));
  const saved=i.saved_records?new Map((await readFile(i.saved_records,'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).map(c=>[c.external_id,c])):new Map();
  // One or more review files; each is a list, a {reviews} object or one review row.
  const visual=(await Promise.all([].concat(i.visual_reviews).map(load))).flatMap(v=>Array.isArray(v)?v:v.reviews??[v]);
  // With live_inputs (current candidate content and stored public rows), each revision is derived from the live one and
  // only its gallery fields come from the saved record; without it, the saved records are used as they are.
  // With refresh_payload, each revision instead updates only the one gallery file the official page replaced.
  const current=i.live_inputs?await load(i.live_inputs):null,records=current?new Map():saved,refused=[];
  const relocated=text=>(i.relocate??[]).reduce((t,r)=>t.split(r.from).join(r.to),text);
  const payload=i.refresh_payload?new Map((await load(i.refresh_payload)).map(p=>[p.ref,p])):null;
  const batchRows=payload?new Map(Object.values(JSON.parse(relocated(await readFile(join(i.batch_dir,'results.json'),'utf8')))).map(x=>[x.ref,x])):null;
  if(current)for(const ref of i.refs){
    const now=current.find(r=>r.external_id===ref);
    try{
      if(!now)throw Error('no live row');
      if(payload){
        const p=payload.get(ref),x=batchRows.get(ref);
        if(!p||!x||x.asset_url!==p.current_declared_image_url)throw Error('the refresh payload does not name the downloaded file');
        records.set(ref,refreshedRecord({live:now,from:p.recorded_image_url,to:p.current_declared_image_url,
          check:{url:x.asset_url,status:'reachable',http_status:x.original.http_status,content_type:x.original.mime_type}}));
      }else{if(!saved.has(ref))throw Error('no saved record');records.set(ref,derivedRecord({live:now,saved:saved.get(ref)}));}
    }catch(error){refused.push({ref,reason:error.message});}
  }
  const refs=i.refs.filter(ref=>!refused.some(r=>r.ref===ref));
  console.log(JSON.stringify(await bindFrozen({batch_dir:i.batch_dir,refs,records,reviews:visual,
    derivative_review:i.derivative_review?await load(i.derivative_review):null,live:current??await load(i.live_gallery),grant:i.grant,public_base_url:i.public_base_url,prepared_by:i.prepared_by,
    owner_instruction:i.owner_instruction,collection_label:i.collection_label,derived:Boolean(current)&&!payload,refreshes:payload,relocate:i.relocate??[],refused,out:i.out})));
}
