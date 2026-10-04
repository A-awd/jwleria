import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import robotsParser from '../../apps/storefront/node_modules/robots-parser/index.js';
import { extractLongchamp } from './extract-longchamp.mjs';

const ua='JwleriaCatalog/1.0';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
/** Resumable private fact collection. Output paths must stay outside the tracked repository. */
export async function collectLongchamp({inventoryPath,outputDirectory,delaySeconds=2},fetcher=fetch){
  const inv=JSON.parse(readFileSync(inventoryPath,'utf8'));
  if(inv.origin!=='https://www.longchamp.com'||!Array.isArray(inv.urls))throw new Error('Invalid official inventory');
  const output=resolve(outputDirectory), repo=resolve(new URL('../..',import.meta.url).pathname);
  if(output===repo||output.startsWith(repo+'/'))throw new Error('Private catalog output cannot be inside tracked repository');
  mkdirSync(output,{recursive:true,mode:0o700});
  const file=join(output,'candidates.json'),progressFile=join(output,'progress.json');
  const old=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];
  const rows=new Map(old.map(r=>[r.candidate_id,r]));
  const done=new Set(old.map(r=>r.source_url));
  const prior=existsSync(progressFile)?JSON.parse(readFileSync(progressFile,'utf8')):{};
  const reviewedSkips=new Set(inv.reviewed_skipped_urls??[]);
  if(prior.stop&&!reviewedSkips.has(prior.stop.url))throw new Error('Previous source stop remains unresolved');
  for(const failure of prior.failures??[])if(failure.url!==prior.stop?.url)done.add(failure.url);
  for(const skipped of reviewedSkips){if(new URL(skipped).origin!==inv.origin)throw new Error('Unexpected skipped origin');done.add(skipped);}
  const failures=prior.failures??[];let stop=null;
  const request=async url=>{
    if(new URL(url).origin!==inv.origin)throw new Error('Unexpected origin');
    const r=await fetcher(url,{headers:{'User-Agent':ua},redirect:'manual',signal:AbortSignal.timeout(20000)});
    if([401,403,429].includes(r.status)){stop={url,status:r.status,retry_after:r.headers.get('retry-after')};throw new Error('Source refused access');}
    if(r.status>=300&&r.status<400){stop={url,status:r.status,location:r.headers.get('location'),reason:'redirect_requires_review'};throw new Error('Source redirect requires review');}
    return r;
  };
  const rr=await request(inv.origin+'/robots.txt');if(!rr.ok)throw new Error('Robots unavailable');
  const robots=robotsParser(inv.origin+'/robots.txt',await rr.text());
  const delay=Math.max(2,delaySeconds,robots.getCrawlDelay(ua)??0)*1000;
  const save=()=>{
    writeFileSync(file,JSON.stringify([...rows.values()]),{mode:0o600});
    writeFileSync(progressFile,JSON.stringify({observed_at:new Date().toISOString(),total_discovered:inv.urls.length,validated_candidates:rows.size,attempted:done.size,inventory_processed:done.size===inv.urls.length&&!stop,complete:done.size===inv.urls.length&&!stop&&failures.length===0,stop,failures,published:0,image_downloads:0}),{mode:0o600});
  };
  for(const url of inv.urls){
    if(done.has(url))continue;
    if(robots.isAllowed(url,ua)!==true){failures.push({url,reason:'robots_refused'});done.add(url);save();continue;}
    await pause(delay);
    try{
      const r=await request(url);if(!r.ok)throw new Error('HTTP '+r.status);
      if(!/text\/html/i.test(r.headers.get('content-type')??''))throw new Error('Unexpected format');
      const html=await r.text();if(html.length>5*1024*1024)throw new Error('Page too large');
      if(/<title[^>]*>[^<]*(?:captcha|access denied|just a moment)/i.test(html)||/akamai.*?challenge|captcha-container/i.test(html)){stop={url,reason:'challenge'};throw new Error('Challenge requires review');}
      const row=extractLongchamp(html,{page_url:url});rows.set(row.candidate_id,row);done.add(url);
    }catch(error){failures.push({url,reason:error.message});if(!stop)done.add(url);}
    save();if(stop)break;
    if(rows.size%10===0)process.stdout.write(JSON.stringify({validated:rows.size,total:inv.urls.length,failures:failures.length})+'\n');
  }
  save();return {validated:rows.size,total:inv.urls.length,failures:failures.length,stop};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [inventoryPath,outputDirectory]=process.argv.slice(2);
 if(!inventoryPath||!outputDirectory)throw new Error('Usage: node collect-longchamp.mjs PRIVATE_INVENTORY.json PRIVATE_OUTPUT_DIRECTORY');
 console.log(JSON.stringify(await collectLongchamp({inventoryPath,outputDirectory})));
}
