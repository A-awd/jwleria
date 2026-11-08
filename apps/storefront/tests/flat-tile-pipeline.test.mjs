import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';
import {installedImageEngine} from '../../../scripts/catalog-intake/responsive-media.mjs';
import {normalizeFlatTile,flatTileReviewChecks} from '../../../scripts/catalog-intake/flat-tile.mjs';
import {prepareGrantedMedia,approvalBundle} from '../../../scripts/catalog-intake/media-pipeline.mjs';
import {mediaApprovalSql} from '../../../scripts/catalog-intake/supabase.mjs';

// Synthetic fixtures only (gap G2): a drawn native-alpha packshot, example.test hosts, no database or upload.
const sharp=installedImageEngine();
const hash=b=>createHash('sha256').update(b).digest('hex');
const FILE='https://brand.example.test/img/SYN200S001_0.png';
const c=normalizeBatch([{source_id:'test',external_id:'SYN200S001',source_url:'https://example.test/p/SYN200S001',brand:'Test brand',collection:'Test bag',product_name:'Test bag — Black',
  name_ar:'حقيبة اختبار',translation_state:'provided',image_urls:[FILE],facts:[{key:'color',value:'Black'}]}])[0];
const grant={grant_reference:'grant-tile',kind:'written_permission',source_id:'test',media_origins:['https://brand.example.test'],website_publication:true,resize:true,webp_encode:true,evidence_reference:'synthetic permission record'};
const source={id:'test',origin:'https://example.test',publication_allowed:true};
const packshot=async({w=1000,h=1000,clip=false}={})=>{
  const d=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=Math.hypot((x-500)/360,(y-500)/(clip?520:330));if(e<1)d.set([30+(x>>3)%40,28,26,255],(y*w+x)*4);}
  return sharp(d,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
};

test('a native-alpha packshot becomes a flat tile: exact pixels, fixed grey, native scale, reviewed by hash, presentation route',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jwl-flat-tile-TEST-ONLY-'));
  try{
    const bytes=await packshot();await writeFile(join(root,'o.png'),bytes);
    const asset={path:join(root,'o.png'),source_url:FILE,sha256:hash(bytes)};
    const {record}=await normalizeFlatTile(bytes,sharp);
    assert.ok(Math.abs(record.geometry.fill-0.68)<0.001,'fill 0.68 up to one-pixel rounding');assert.equal(record.changed_opaque_product_pixels,0);
    const prepared=await prepareGrantedMedia({source,candidate:c,asset,grant,output_directory:join(root,'out'),tile_sha256:record.tile_sha256});
    const m=prepared.manifest;
    assert.equal(m.schema_version,6);assert.equal(m.pixel_source,'flat_tile');assert.equal(m.treatment.cutout_sha256,null);
    assert.ok([...m.variants,m.detail].every(v=>v.width===v.height&&v.width<=1600),'square derivatives, detail at most 1600');
    assert.ok(m.variants.every(v=>!v.over_budget&&v.fidelity_floor_met),'card budgets and fidelity floor');
    const verification={asset_sha256:asset.sha256,verified_reference:c.external_id,reviewer:'synthetic visual reviewer',verification_reference:'synthetic visual record',
      checks:{exact_reference:true,color_and_variant:true,authentic_product_photo:true,not_generated_or_altered:true,clear_product_view:true}};
    const tile_review={tile_sha256:record.tile_sha256,cutout_sha256:null,original_sha256:asset.sha256,reviewer:'synthetic tile reviewer',review_reference:'synthetic tile review record',
      checks:Object.fromEntries(flatTileReviewChecks.map(k=>[k,true]))};
    const bundle=approvalBundle({candidate:c,grant,items:[{asset,manifest:m,verification,tile_review}],public_base_url:'https://project.example.test/storage/v1/object/public/jwl-product-media',prepared_by:'synthetic batch writer'});
    const entry=bundle.approval.approved_image_variants[0];
    assert.equal(entry.canvas,'flat_tile');assert.equal(entry.width,entry.height);assert.equal(entry.attribution,undefined);
    assert.ok(bundle.evidence.every(e=>e.treatment==='flat_tile'&&e.square_sha256===record.tile_sha256&&e.cutout_master_sha256===null&&e.source_clipped===false));
    assert.match(mediaApprovalSql(bundle),/jwl_record_presentation_approval/);
    const again=item=>()=>approvalBundle({candidate:c,grant,items:[{asset,manifest:m,verification,...item}],public_base_url:'https://project.example.test/storage/v1/object/public/jwl-product-media',prepared_by:'synthetic batch writer'});
    assert.throws(again({}),/Flat tile review must name/,'a tile needs its review');
    assert.throws(again({tile_review:{...tile_review,tile_sha256:'0'.repeat(64)}}),/Flat tile review must name/);
    assert.throws(again({tile_review:{...tile_review,reviewer:'synthetic batch writer'}}),/prepared the batch/);
    assert.throws(again({tile_review:{...tile_review,checks:{...tile_review.checks,whole_product_on_flat_tile:'uncertain'}}}),/incomplete/);
    await assert.rejects(prepareGrantedMedia({source,candidate:c,asset,grant,output_directory:join(root,'out2'),tile_sha256:'1'.repeat(64)}),/differs from the accepted tile/);
    await assert.rejects(prepareGrantedMedia({source,candidate:c,asset,grant:{...grant,kind:'open_license'},output_directory:join(root,'out3'),tile_sha256:record.tile_sha256}),/not offered for open-licence|not permitted/);
    await assert.rejects(normalizeFlatTile(await packshot({clip:true}),sharp),/touches its source frame/,'a clipped product is never shown as whole');
    await assert.rejects(normalizeFlatTile(await sharp({create:{width:900,height:900,channels:3,background:'#fff'}}).png().toBuffer(),sharp),/own transparency/);
  }finally{await rm(root,{recursive:true,force:true});}
});
