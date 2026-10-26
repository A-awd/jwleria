import test from 'node:test';
import assert from 'node:assert/strict';
import {UrlLite} from './url-lite.mjs';

const corpus=['https://www.rolex.com/en-gb/watches/datejust/m126334-0001','HTTPS://WWW.Rolex.com:443/en-gb/x?y=1#z','https://www.iwc.com/en/watches/pilot/iw328201-pilot-watch',
  'https://user:pw@www.rolex.com/a/b','https://www.rolex.com','https://www.rolex.com/a/./b/../c','https://www.rolex.com/a b/é?q=a b','http://www.example.test:8080/x',
  'https://www.rolex.com/sitemap.xml','https://www.cartier.com/en-gb/watches/tank/tank-must-watch-CRWSTA0041.html','https://www.rolex.com/?','https://www.rolex.com/x#',
  'https://www.audemarspiguet.com/com/en/watch-collection/royal-oak/15202OR.OO.1240OR.01.html','https://www.rolex.com/%7Euser/%2e%2e/x'];
const fields=['protocol','username','password','hostname','port','host','origin','pathname','search','hash','href'];

test('the sandbox URL subset matches Node URL on the shapes the intake rules use',()=>{
  for(const input of corpus){const a=new URL(input),b=new UrlLite(input);for(const f of fields)assert.equal(b[f],a[f],input+' '+f);}
  const a=new URL('https://www.rolex.com/x','http://robots-relative.samclarke.com/'),b=new UrlLite('https://www.rolex.com/x','http://robots-relative.samclarke.com/');
  a.port=443;b.port=443;assert.equal(b.port,a.port);assert.equal(b.href,a.href);
  assert.equal(new UrlLite('/robots.txt','https://www.rolex.com/en-gb/').href,new URL('/robots.txt','https://www.rolex.com/en-gb/').href);
  for(const bad of ['not a url','ftp://x.test/a','https://','//no-scheme','javascript:alert(1)'])assert.throws(()=>new UrlLite(bad),TypeError,bad);
});
