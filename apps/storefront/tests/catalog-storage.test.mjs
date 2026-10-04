import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizeBatch} from '../../../scripts/catalog-intake/normalize.mjs';

test('Postgres candidate persistence, revision history, public permissions and withdrawal', async()=>{
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../../../scripts/catalog-intake/schema.sql',import.meta.url),'utf8'));
    await db.query("insert into jwl_internal.sources(id,origin,acquisition_method,permission_reference,acquisition_allowed,publication_allowed,enabled) values('test','https://example.com','owner-export','test-grant',true,true,true)");
    const row={source_id:'test',external_id:'variant-01',source_url:'https://example.com/product',brand:'Test brand',collection:'Test collection',product_name:'Test piece',image_urls:['https://example.com/image.webp'],price:999,customer:'private'};
    const candidate=normalizeBatch([row])[0];
    const ingest=async c=>(await db.query('select public.jwl_ingest_batch($1::jsonb) receipt',[JSON.stringify([c])])).rows[0].receipt;
    assert.equal((await ingest(candidate)).changed,1);
    assert.equal((await ingest(candidate)).changed,0);
    const saved=(await db.query('select content from jwl_internal.candidates')).rows[0].content;
    assert.ok(!('price' in saved) && !('customer' in saved));
    const product={slug:'test-piece',reference:'TEST-01',brand_slug:'test-brand',brand_name:'Test brand',brand_tier:'luxury',category_slug:'watches',collection_slug:'test-collection',collection_ar:'مجموعة اختبار',collection_en:'Test collection',name_ar:'قطعة اختبار',name_en:'Test piece',images:['https://example.com/image.webp'],search_text:'test piece'};
    const publish=()=>db.query('select public.jwl_publish_candidate($1,$2,$3::jsonb)',[candidate.candidate_id,candidate.revision_hash,JSON.stringify(product)]);
    await assert.rejects(publish(),/approval missing/i);
    await db.query('insert into jwl_internal.publication_approvals(candidate_id,revision_hash,media_reference,image_verified,approved_images) values($1,$2,$3,true,$4::jsonb)',[candidate.candidate_id,candidate.revision_hash,'test-media-grant',JSON.stringify(product.images)]);
    await publish();
    await db.exec('set role anon');
    assert.equal((await db.query('select count(*)::int n from public.jwl_catalog')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int n from public.jwl_collections')).rows[0].n,1);
    await assert.rejects(db.query('select * from jwl_internal.candidates'),/permission denied/i);
    await assert.rejects(db.query("update public.jwl_catalog set active=false"),/permission denied/i);
    await assert.rejects(db.query('select public.jwl_ingest_batch($1::jsonb)',['[]']),/permission denied/i);
    await db.exec('reset role');
    await db.query('update jwl_internal.publication_approvals set revoked_at=now()');
    await db.exec('set role anon');
    assert.equal((await db.query('select count(*)::int n from public.jwl_catalog')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int n from public.jwl_collections')).rows[0].n,0);
    await db.exec('reset role');
    await db.query('update jwl_internal.publication_approvals set revoked_at=null');
    await publish();
    const changed=normalizeBatch([{...row,product_name:'Changed piece'}])[0];
    assert.equal((await ingest(changed)).changed,1);
    await assert.rejects(publish(),/revision changed/i);
    assert.equal((await db.query('select count(*)::int n from jwl_internal.candidate_revisions')).rows[0].n,2);
    assert.equal((await db.query('select active from public.jwl_catalog')).rows[0].active,false);
    await db.query('update jwl_internal.sources set enabled=false');
    await assert.rejects(ingest(changed),/Source acquisition not approved/);
  } finally {await db.close();}
});
