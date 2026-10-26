// The n8n Code-node sandbox has no URL global (observed 2026-10-26: URL, URLSearchParams undefined;
// require('url') disallowed). The runner bundle uses this subset only where URL is missing. It covers
// absolute http(s) URLs as the intake rules use them, and is tested against Node's WHATWG URL.
const defaults={'http:':'80','https:':'443'};
const encodePath=value=>{let out='';for(const ch of value){const c=ch.codePointAt(0);out+=c<=0x20||c>0x7e||'"<>`{}'.includes(ch)?encodeURIComponent(ch):ch;}return out;};
const encodeQuery=value=>{let out='';for(const ch of value){const c=ch.codePointAt(0);out+=c<=0x20||c>0x7e||'"<>'.includes(ch)?encodeURIComponent(ch):ch;}return out;};
function dotSegments(path){
  const out=[];
  for(const segment of path.split('/').slice(1)){
    if(segment==='.'||segment.toLowerCase()==='%2e')continue;
    if(segment==='..'||/^(?:\.|%2e){2}$/i.test(segment)){out.pop();continue;}
    out.push(segment);
  }
  const last=path.split('/').pop();
  return '/'+out.join('/')+(['.','..'].includes(last)&&out.length?'/':'');
}

export class UrlLite{
  constructor(input,base){
    let text=String(input).trim();
    if(!/^[a-z][a-z0-9+.-]*:/i.test(text)){
      if(base===undefined)throw new TypeError('Invalid URL');
      const root=new UrlLite(base);
      text=text.startsWith('//')?root.protocol+text:text.startsWith('/')?root.origin+text:root.origin+root.pathname.replace(/[^/]*$/,'')+text;
    }
    const match=/^([a-z][a-z0-9+.-]*:)\/\/(?:([^@/?#]*)@)?(\[[^\]]*\]|[^:/?#]*)(?::(\d*))?([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(text.replace(/\\/g,'/'));
    if(!match||!/^https?:$/i.test(match[1])||!match[3])throw new TypeError('Invalid URL');
    this._protocol=match[1].toLowerCase();
    const [user='',pass='']=(match[2]??'').split(/:(.*)/s);
    this.username=user;this.password=pass;
    this.hostname=match[3].toLowerCase();
    if(!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.?$|^\[[0-9a-f:.]+\]$/.test(this.hostname))throw new TypeError('Invalid URL');
    this.port=match[4]??'';
    this.pathname=dotSegments(encodePath(match[5]||'/'));
    // An empty query or fragment reads as '' but stays in href, as in WHATWG URL.
    this._query=match[6]===undefined?'':'?'+encodeQuery(match[6].slice(1));
    this._fragment=match[7]===undefined?'':'#'+encodePath(match[7].slice(1));
  }
  get search(){return this._query.length>1?this._query:'';}
  get hash(){return this._fragment.length>1?this._fragment:'';}
  get protocol(){return this._protocol;}
  get port(){return this._port;}
  set port(value){const v=String(value??'');this._port=v===''||v===defaults[this._protocol]?'':String(Number(v));}
  get host(){return this.hostname+(this._port?':'+this._port:'');}
  get origin(){return this._protocol+'//'+this.host;}
  get href(){return this._protocol+'//'+(this.username||this.password?this.username+(this.password?':'+this.password:'')+'@':'')+this.host+this.pathname+this._query+this._fragment;}
  toString(){return this.href;}
  toJSON(){return this.href;}
}
