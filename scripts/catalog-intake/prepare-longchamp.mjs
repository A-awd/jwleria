import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {localizedLongchampName} from './extract-longchamp.mjs';
import {normalizeBatch} from './normalize.mjs';
/** Enrich existing private facts without network requests or changing publication grants. */
export function prepareLongchamp(rows){
 return rows.map(row=>{
  const color=row.facts.find(x=>x.key==='color')?.value;
  const ar=localizedLongchampName({name:row.product_name,collection:row.collection,color});
  const best=new Map();
  for(const u of row.image_urls){
   const url=new URL(u),key=url.origin+url.pathname,old=best.get(key);
   if(!old||Number(url.searchParams.get('sw')||0)>Number(new URL(old).searchParams.get('sw')||0))best.set(key,u);
  }
  return {...normalizeBatch([{...row,name_ar:ar??row.name_ar,translation_state:ar?'provided':row.translation_state,image_urls:[...best.values()]}])[0],source_category:row.source_category};
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw new Error('Usage: node prepare-longchamp.mjs PRIVATE_INPUT.json PRIVATE_OUTPUT.json');
 const rows=prepareLongchamp(JSON.parse(readFileSync(input,'utf8')));
 writeFileSync(output,JSON.stringify(rows),{mode:0o600});
 console.log(JSON.stringify({candidates:rows.length,arabic_names:rows.filter(x=>x.translation_state==='provided').length,published:0}));
}
