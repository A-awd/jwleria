import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {agent,sourceChallenge} from './intake-core.mjs';
import {robotsParser} from './robots.mjs';
import {privateOutputRoot} from './responsive-media.mjs';

// Decision 0027 source profiles: a resumable, read-only queue for directory brands that have no catalogue source yet.
// For one brand at a time it reads, once each and paced per origin: robots.txt, only the sitemaps robots declares, one
// product sitemap, one product page robots allows, that page's JSON-LD, and the robots of the page's image origin. It
// never downloads an image, guesses a URL or contacts anyone. A refusal (401/403), rate limit (429), challenge,
// redirect or timeout stops the brand and is recorded; a stopped brand is never re-read by this queue. Every response
// is kept raw and write-once in a private directory, and every step is appended to the queue journal.

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const ua=agent+' (+https://jwleria.com)';
const maxBytes=8*1024*1024;
const steps=['robots','sitemap_index','product_sitemap','product_page','image_robots'];

function ldEntities(html){
  return [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].flatMap(m=>{
    try{const v=JSON.parse(m[1]);const flat=x=>Array.isArray(x)?x.flatMap(flat):x&&typeof x==='object'?[x,...(x['@graph']?flat(x['@graph']):[])]:[];return flat(v);}catch{return [];}
  });
}
const typed=(e,t)=>[].concat(e?.['@type']??[]).some(x=>String(x).toLowerCase()===t.toLowerCase());
const locs=xml=>[...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&'));

/** One paced, read-only request; returns {status, headers, body} or the stop reason. */
function requester({out,minIntervalMs=5000,fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}){
  const next=new Map();let n=0;
  return async(url,label)=>{
    const origin=new URL(url).origin,slot=Math.max(next.get(origin)??0,now());next.set(origin,slot+minIntervalMs);if(slot>now())await sleep(slot-now());
    const at=new Date().toISOString();let response;
    try{response=await fetcher(url,{headers:{'User-Agent':ua},redirect:'manual',signal:AbortSignal.timeout(20000)});}
    catch(error){return {stop:`request failed: ${error.message}`,url,at};}
    const chunks=[];let size=0;if(response.body)for await(const c of response.body){size+=c.length;if(size>maxBytes)break;chunks.push(c);}
    const body=Buffer.concat(chunks),headers={};for(const [k,v] of response.headers.entries())headers[k]=k==='set-cookie'?'(present; not kept)':v;
    const name=`${String(++n).padStart(2,'0')}-${label}`;
    await writeFile(join(out,name+'.body'),body,{flag:'wx',mode:0o400});
    await writeFile(join(out,name+'.response.json'),JSON.stringify({url,user_agent:ua,requested_at:at,status:response.status,headers,bytes:body.length,sha256:sha256(body),truncated:size>maxBytes},null,1),{flag:'wx',mode:0o400});
    const text=body.toString('utf8');
    if([401,403].includes(response.status))return {stop:`refused (${response.status})`,url,at};
    if(response.status===429)return {stop:'rate limited (429)',url,at};
    if(response.status>=300&&response.status<400)return {stop:`redirect requires review (${response.status} to ${response.headers.get('location')??'?'})`,url,at};
    if(sourceChallenge(text))return {stop:'challenge served',url,at};
    return {status:response.status,ok:response.ok,text,url,at,sha256:sha256(body)};
  };
}

/** Profiles one brand on its recorded official origin; returns the profile and never throws on a source stop. */
export async function profileSource({brand,origin,out,fetcher,sleep,minIntervalMs}){
  const root=await privateOutputRoot(out);await mkdir(root,{recursive:true,mode:0o700});
  const get=requester({out:root,fetcher,sleep,minIntervalMs});
  const profile={brand,origin,profiled_at:new Date().toISOString(),user_agent:ua,steps:{},identity:null,stop:null,next_action:null};
  const stop=(step,r)=>{profile.stop={step,reason:r.stop,url:r.url,at:r.at};profile.next_action='stopped: recorded refusal-scope review before any further request';return profile;};
  // 1. robots
  const robots=await get(origin+'/robots.txt','robots');if(robots.stop)return stop('robots',robots);
  if(!robots.ok&&![404,410].includes(robots.status))return stop('robots',{...robots,stop:`robots unavailable (${robots.status})`});
  const policy=robotsParser(origin+'/robots.txt',robots.ok?robots.text:''),declared=robots.ok?[...robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(m=>m[1]):[];
  profile.steps.robots={status:robots.status,sha256:robots.sha256,declared_sitemaps:declared.length,crawl_delay:policy.getCrawlDelay?.(agent)??null};
  // Policy before content: the home page (same-origin redirects only, at most two) and the site's own legal or terms
  // page, scanned for clauses on automated access. Any such clause stops the brand for a recorded terms review before a
  // sitemap or product page is read.
  let home=null,homeUrl=origin+'/';
  for(let hop=0;hop<3;hop++){
    if(policy.isAllowed(homeUrl,agent)!==true){profile.next_action='the home page is disallowed by robots';return profile;}
    const r=await get(homeUrl,'home');
    if(r.stop&&/^redirect requires review/.test(r.stop)&&hop<2){const to=r.stop.match(/to (\S+)\)$/)?.[1];let next=null;try{next=new URL(to,homeUrl);}catch{}
      if(next&&next.origin===origin){homeUrl=next.href;continue;}}
    if(r.stop)return stop('home',r);
    home=r;break;
  }
  if(!home){profile.next_action='the home page did not settle within two same-origin redirects';return profile;}
  const links=[...home.text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}))
    .map(l=>{try{return {...l,url:new URL(l.href,homeUrl)};}catch{return null;}}).filter(l=>l&&l.url.origin===origin);
  const termsLink=links.find(l=>/terms|conditions|legal|cgu|nutzungsbedingungen/i.test(l.text+' '+l.url.pathname));
  if(!termsLink){profile.next_action='no terms or legal page linked from the home page: a recorded terms review comes first';profile.steps.terms={found:false};return profile;}
  if(policy.isAllowed(termsLink.url.href,agent)!==true){profile.next_action='the terms page is disallowed by robots: a recorded terms review comes first';return profile;}
  const terms=await get(termsLink.url.href,'terms');if(terms.stop)return stop('terms',terms);
  const plain=terms.text.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  const clauses=[...new Set(plain.split(/(?<=[.;])\s+/).filter(s=>/\b(robots?|spiders?|crawl(?:ers?|ing)?|scrap(?:e|er|ers|ing)|data[- ]mining|harvest(?:ing)?|automated (?:means|access|systems?|tools?|programs?))\b/i.test(s)).map(s=>s.trim().slice(0,400)))].slice(0,6);
  profile.steps.terms={found:true,url_path:termsLink.url.pathname,status:terms.status,sha256:terms.sha256,automated_access_clauses:clauses.length,clauses};
  if(clauses.length){profile.next_action='the terms mention automated access: stopped for a recorded terms review before any sitemap or product page is read';profile.stop={step:'terms',reason:'terms review required',url:termsLink.url.href,at:terms.at};return profile;}
  if(!declared.length){profile.next_action='no sitemap declared in robots: an adapter needs a recorded product inventory source';return profile;}
  // 2. a declared sitemap (index or urlset), on this origin only
  const first=declared.find(u=>{try{return new URL(u).origin===origin;}catch{return false;}});
  if(!first){profile.next_action='robots declares sitemaps only on other origins: review before reading them';profile.steps.robots.foreign_sitemaps=declared.map(u=>{try{return new URL(u).origin;}catch{return 'invalid';}});return profile;}
  if(policy.isAllowed(first,agent)!==true){profile.next_action='the declared sitemap is disallowed by robots';return profile;}
  const index=await get(first,'sitemap-index');if(index.stop)return stop('sitemap_index',index);
  let urls=locs(index.text),productMap=null;
  profile.steps.sitemap_index={status:index.status,locs:urls.length};
  // 3. a product sitemap named by the index itself (never guessed), or the urlset just read
  if(/<sitemapindex/i.test(index.text)){
    productMap=urls.find(u=>/product/i.test(u)&&new URL(u).origin===origin&&policy.isAllowed(u,agent)===true)??null;
    if(!productMap){profile.next_action='the sitemap index names no product sitemap on this origin';return profile;}
    const map=await get(productMap,'product-sitemap');if(map.stop)return stop('product_sitemap',map);
    urls=locs(map.text);profile.steps.product_sitemap={status:map.status,locs:urls.length};
  }
  // 4. one product page robots allows
  const page=urls.find(u=>{try{return new URL(u).origin===origin&&policy.isAllowed(u,agent)===true;}catch{return false;}});
  if(!page){profile.next_action='no allowed product page in the product sitemap';return profile;}
  const html=await get(page,'product-page');if(html.stop)return stop('product_page',html);
  const ld=ldEntities(html.text),product=ld.find(e=>typed(e,'Product')),org=ld.find(e=>typed(e,'Organization')||typed(e,'Corporation'));
  const brandName=product?.brand?.name??product?.brand??null,images=[].concat(product?.image??[]).map(x=>typeof x==='string'?x:x?.url).filter(Boolean);
  profile.steps.product_page={status:html.status,url_path:new URL(page).pathname,json_ld_product:Boolean(product),product_fields:product?Object.keys(product).filter(k=>!/^(offers|aggregateRating|review)$/i.test(k)).sort():[],
    brand_name:typeof brandName==='string'?brandName:null,sku_present:Boolean(product?.sku||product?.mpn||product?.productID),images:images.length};
  // Identity: the site names itself as the brand in its own structured data.
  const named=[brandName,org?.name].filter(x=>typeof x==='string');
  profile.identity={self_identified:named.some(n=>n.toLowerCase().includes(brand.toLowerCase())),names:named};
  // 5. the image origin's robots, read once (no image is requested)
  if(images.length){
    const io=new URL(images[0],page).origin;profile.steps.image_origin={origin:io,same_origin:io===origin};
    if(io!==origin){const r=await get(io+'/robots.txt','image-robots');if(r.stop)return stop('image_robots',r);
      const p=robotsParser(io+'/robots.txt',r.ok?r.text:'');profile.steps.image_robots={status:r.status,first_image_allowed:p.isAllowed(new URL(images[0],page).href,agent)===true};}
    else profile.steps.image_robots={status:robots.status,first_image_allowed:policy.isAllowed(new URL(images[0],page).href,agent)===true};
  }
  profile.next_action=profile.identity.self_identified&&profile.steps.product_page.json_ld_product&&profile.steps.product_page.sku_present
    ?'eligible for an adapter entry on the existing JSON-LD extractor, then a paced product-sitemap collection'
    :'structured product data or self-identification incomplete: review before any adapter';
  return profile;
}

/** The queue: one record per brand; the next pending brand (or a named one) is profiled once and journaled. */
export async function runQueue({queueFile,brandSlug=null,out,fetcher,sleep,minIntervalMs}){
  const queue=JSON.parse(await readFile(queueFile,'utf8'));
  const entry=brandSlug?queue.brands.find(b=>b.slug===brandSlug):queue.brands.find(b=>b.state==='pending'&&b.origin);
  if(!entry)return {done:true};
  if(entry.state!=='pending')throw Error(`${entry.slug} is ${entry.state}; a profiled or stopped brand is not re-read here`);
  if(!/^https:\/\/[a-z0-9.-]+$/.test(entry.origin??''))throw Error(`${entry.slug} has no recorded official origin`);
  const profile=await profileSource({brand:entry.name,origin:entry.origin,out:join(out,entry.slug),fetcher,sleep,minIntervalMs});
  entry.state=profile.stop?'stopped':'profiled';entry.profile_summary={at:profile.profiled_at,stop:profile.stop,next_action:profile.next_action,identity:profile.identity};
  await writeFile(join(out,entry.slug,'profile.json'),JSON.stringify(profile,null,1),{flag:'wx',mode:0o600});
  await appendFile(queueFile.replace(/\.json$/,'.ndjson'),JSON.stringify({at:new Date().toISOString(),slug:entry.slug,state:entry.state,stop:profile.stop,next_action:profile.next_action})+'\n',{mode:0o600});
  await writeFile(queueFile,JSON.stringify(queue,null,1),{mode:0o600});
  return {slug:entry.slug,state:entry.state,profile};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,queueFile,out,slug]=process.argv.slice(2);
  if(command==='run'&&queueFile&&out)console.log(JSON.stringify(await runQueue({queueFile,out,brandSlug:slug??null}),null,1));
  else throw Error('Usage: node source-profile.mjs run PRIVATE_QUEUE.json PRIVATE_OUT_DIR [brand-slug]');
}
