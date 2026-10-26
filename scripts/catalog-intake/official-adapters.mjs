/** Known official origins and grounded variant paths; not a license to publish their media. Shared by the queue, n8n and extraction. */
export const officialAdapters = {
  'rolex-official': {brand:'Rolex',origin:'https://www.rolex.com',path:/\/watches\/([^/]+)\/(m[a-z0-9]+-\d+)$/i},
  'cartier-official': {brand:'Cartier',origin:'https://www.cartier.com',path:/\/([^/]+)\/[^/]*-CR([A-Z]+[0-9][A-Z0-9]*)(?:\.html)?$/},
  'van-cleef-and-arpels-official': {brand:'Van Cleef & Arpels',origin:'https://www.vancleefarpels.com',path:/\/collections\/(?:jewelry|watches)\/([^/]+)\/(vca[a-z0-9]+)---[^/]+\.html$/i},
  'iwc-schaffhausen-official': {brand:'IWC Schaffhausen',origin:'https://www.iwc.com',path:/\/watches\/([^/]+)\/(iw\d+)-[^/]+$/i},
  'piaget-official': {brand:'Piaget',origin:'https://www.piaget.com',path:/\/(?:watches|jewelry)\/([^/]+)\/[^/]*-(g[a-z0-9]+)$/i},
  'panerai-official': {brand:'Panerai',origin:'https://www.panerai.com',path:/\/watch-collection\/([^/]+)\/(pam\d+)-[^/]+\.html$/i},
  'jaeger-lecoultre-official': {brand:'Jaeger-LeCoultre',origin:'https://www.jaeger-lecoultre.com',path:/\/watches\/[^/]+\/([^/]+)\/[^/]+-(q[a-z0-9]+)$/i},
  'audemars-piguet-official': {brand:'Audemars Piguet',origin:'https://www.audemarspiguet.com',path:/\/watch-collection\/([^/]+)\/(\d{5}[a-z]+\.[^/]+)$/i},
};
export function officialVariantIdentity(sourceId,url){const adapter=officialAdapters[sourceId];if(!adapter)throw Error('Unsupported official source');const parsed=new URL(url);if(parsed.origin!==adapter.origin||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('Unexpected official product URL');const match=parsed.pathname.match(adapter.path);return match?{collection:match[1].replaceAll('-',' '),external_id:match[2]}:null;}
