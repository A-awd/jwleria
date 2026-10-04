import test from 'node:test';
import assert from 'node:assert/strict';
import {stageMedia,promoteMedia} from '../../../scripts/catalog-intake/media.mjs';
import {socialDrafts} from '../../../scripts/catalog-intake/social.mjs';
const config={url:'https://test.supabase.co',key:'sb_secret_TEST'};
test('Unapproved media is never fetched; approved bytes stay private until matching review',async()=>{
  let calls=0;
  await assert.rejects(stageMedia({},['https://example.com/test.png'],config,()=>{calls++;}),/permission/);assert.equal(calls,0);
  const source={publication_allowed:true,media_permission_reference:'test-grant',media_origins:['https://example.com']};
  const bytes=Buffer.from('test-image-bytes');let lastUpload;
  const fetcher=async(url,opts)=>{
    const path=new URL(url).pathname;
    if(new URL(url).hostname==='example.com')return new Response(bytes,{headers:{'content-type':'image/png'}});
    if(opts?.method==='POST'){lastUpload={path,body:opts.body};return new Response('{}');}
    return new Response(bytes);
  };
  const receipts=await stageMedia(source,['https://example.com/test.png'],config,fetcher);
  assert.ok(lastUpload.path.includes('/jwl-media-staging/'));assert.equal(receipts[0].publication_state,'private-staging');
  await assert.rejects(promoteMedia({image_verified:false},receipts,config,fetcher),/review/);
  await assert.rejects(promoteMedia({image_verified:true,media_permission_reference:'different-grant'},receipts,config,fetcher),/grant/);
  const urls=await promoteMedia({image_verified:true,media_permission_reference:'test-grant'},receipts,config,fetcher);
  assert.ok(urls[0].includes('/object/public/jwl-product-media/'));assert.ok(lastUpload.path.includes('/jwl-product-media/'));
});
test('Social drafts contain factual approved product fields without forwarding private values',()=>{
  const product={id:'test',reference:'TEST-01',name:{ar:'قطعة اختبار',en:'Test piece'},collection:{ar:'مجموعة اختبار',en:'Test collection'},images:['https://example.com/test.webp'],isPreview:false,mediaKind:'verified-product',price:999,customer:'private'};
  const drafts=socialDrafts(product,'Test brand');assert.deepEqual(drafts.map(d=>d.channel),['instagram','tiktok','snapchat']);
  assert.ok(drafts.every(d=>d.publication_state==='draft'));assert.doesNotMatch(JSON.stringify(drafts),/999|private/);
  assert.deepEqual(socialDrafts(product,'Test brand').map(d=>d.draft_id),drafts.map(d=>d.draft_id));
  assert.throws(()=>socialDrafts({...product,isPreview:true},'Test brand'),/genuine/);
});
