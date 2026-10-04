import robotsParser from 'robots-parser';
import { extractProducts } from '../../../../scripts/catalog-intake/extract.mjs';

export class SourceBlocked extends Error {
  constructor(code, retryAfter = null) {super(code);this.name='SourceBlocked';this.code=code;this.retryAfter=retryAfter;}
}
const agent = 'JwleriaCatalog/1.0';

async function limitedText(response, limit) {
  const declared=Number(response.headers.get('content-length')??0);
  if(declared>limit) throw new SourceBlocked('source_too_large');
  let size=0;const chunks=[];
  for await (const chunk of response.body) {size+=chunk.length;if(size>limit)throw new SourceBlocked('source_too_large');chunks.push(chunk);}
  return Buffer.concat(chunks).toString('utf8');
}

/** Collect only explicitly permitted origins, stop on access refusal, honor robots delay. */
export async function collectSource(source, {fetcher=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  if (!source.enabled || !source.acquisition_allowed || !source.permission_reference) throw new SourceBlocked('source_permission_missing');
  const origin=new URL(source.origin);
  if (origin.protocol!=='https:' || origin.username || origin.password || origin.port || origin.pathname!=='/' || origin.search || origin.hash) throw new SourceBlocked('invalid_source_origin');
  if (!Array.isArray(source.pages) || source.pages.length>20) throw new SourceBlocked('invalid_source_batch');
  const request=async url=>{
    if(new URL(url).origin!==origin.origin) throw new SourceBlocked('source_origin_mismatch');
    const response=await fetcher(url,{headers:{'User-Agent':agent},signal:AbortSignal.timeout(15000),redirect:'manual'});
    if([401,403].includes(response.status))throw new SourceBlocked('source_access_refused');
    if(response.status===429){const value=response.headers.get('retry-after');const seconds=Number(value);const retry=Number.isFinite(seconds)&&value!==null?Date.now()+seconds*1000:Date.parse(value??'');throw new SourceBlocked('source_rate_limited',Number.isFinite(retry)?new Date(retry).toISOString():null);}
    if(response.status>=300&&response.status<400)throw new SourceBlocked('source_redirect_requires_review');
    if(!response.ok)throw new SourceBlocked(`source_http_${response.status}`);
    return response;
  };
  const robotsUrl=new URL('/robots.txt',origin);
  const policy=robotsParser(robotsUrl.href,await limitedText(await request(robotsUrl),512*1024));
  const delay=Math.max(2,source.min_interval_seconds??60,policy.getCrawlDelay(agent)??0)*1000;
  const candidates=[];
  for(const page of source.pages) {
    const url=new URL(page.url);
    if(url.origin!==origin.origin)throw new SourceBlocked('source_origin_mismatch');
    if(policy.isAllowed(url.href,agent)!==true)throw new SourceBlocked('source_robots_refused');
    await sleep(delay);
    const response=await request(url);
    if(!/text\/html/i.test(response.headers.get('content-type')??''))throw new SourceBlocked('source_format_changed');
    const html=await limitedText(response,5*1024*1024);
    if(/<title[^>]*>[^<]*(?:captcha|access denied|just a moment)/i.test(html))throw new SourceBlocked('source_challenge');
    candidates.push(...extractProducts(html,{...source,page_url:url.href,collection_slug:page.collection_slug}));
  }
  return candidates;
}
