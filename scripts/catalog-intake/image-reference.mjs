/** Inspect public image headers only. A reachable URL does not prove identity or usage rights. */
export async function checkImageReferences(urls, {origins}, fetcher=fetch) {
  if (!Array.isArray(urls) || urls.length>24 || !Array.isArray(origins) || !origins.length) throw new Error('Image origins and bounded URLs required');
  const checks=[];
  for (const value of [...new Set(urls)]) {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||!origins.includes(url.origin))throw new Error('Unapproved image reference origin');
    try {
      const response=await fetcher(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(8000)});
      const contentType=(response.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
      checks.push({url:url.href,status:response.status===200 && contentType.startsWith('image/')?'reachable':'referenced',http_status:response.status,content_type:contentType||null});
      // Don't follow rate limits, forbidden responses or redirects into another origin.
    } catch {checks.push({url:url.href,status:'referenced',http_status:null,content_type:null});}
  }
  return checks;
}
