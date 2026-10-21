import test from 'node:test';
import assert from 'node:assert/strict';
import { findDirectoryBrand } from '../src/server/catalog-directory.mjs';

test('a known brand renders without a redundant remote-directory request', async()=>{
 const directory=[{slug:'rolex',name:'Rolex',summary:{ar:'مختارات Rolex.',en:'Rolex selections.'}}];
 const result=await findDirectoryBrand('rolex',directory,async()=>{throw new Error('An unnecessary network round trip would delay navigation');});
 assert.equal(result.name,'Rolex');assert.equal(result.summary.ar,'مختارات Rolex.');
});
test('a genuinely new published brand still resolves, and missing brands are never invented',async()=>{
 const load=async()=>[{slug:'new-brand',name:'New Brand'}];
 assert.equal((await findDirectoryBrand('new-brand',[],load)).name,'New Brand');
 assert.equal(await findDirectoryBrand('missing',[],load),undefined);
});
