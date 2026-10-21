/** Attach the actual public product link without accepting arbitrary paths or destinations. */
export function productInquiryMessage(message,origin,locale,slug){
 if(!['ar','en'].includes(locale)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Invalid inquiry product identity');
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('Invalid public inquiry origin');
 return `${message}\n${new URL(`/${locale}/products/${slug}/`,base).href}`;
}
