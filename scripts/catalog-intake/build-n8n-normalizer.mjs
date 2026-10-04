import {readFileSync,writeFileSync} from 'node:fs';

// Keep the restricted n8n sandbox implementation aligned with the local importer.
const normalize=readFileSync(new URL('./normalize.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').split('if (process.argv[1]')[0].replace('export function normalizeBatch','function normalizeBatch');
const enrichment=readFileSync(new URL('./enrich.mjs',import.meta.url),'utf8').replace('export function factualDescriptions','function factualDescriptions');
const code=`const {createHash} = require('crypto');\n${enrichment}\n${normalize}\nconst rows = $input.all().flatMap(item => { if (!Array.isArray(item.json.records)) throw new Error('Missing records array'); return item.json.records; });\nif (rows.length > 100) throw new Error('Batch exceeds 100 products');\nreturn normalizeBatch(rows).map(json => ({json}));`;
const destination=new URL('../../workflows/n8n/catalog-normalization.js',import.meta.url);
const workflow=readFileSync(destination,'utf8');
const start=workflow.indexOf('jsCode:')+'jsCode:'.length,end=workflow.indexOf('}},output:',start);
if(start<7||end<start)throw new Error('Workflow source shape changed');
writeFileSync(destination,workflow.slice(0,start)+JSON.stringify(code)+workflow.slice(end));
