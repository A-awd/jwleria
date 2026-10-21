import { normalizeBatch } from './normalize.mjs';

/** Known official origins and grounded variant paths; not a license to publish their media. */
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
const text=value=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim():null;
const unescape=value=>value?.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const attribute=(tag,key)=>unescape(tag.match(new RegExp('\\b'+key+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1]);
function entities(value){if(Array.isArray(value))return value.flatMap(entities);if(!value||typeof value!=='object')return[];return[value,...entities(value['@graph']),...entities(value.hasVariant)];}
function structured(html){return[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].flatMap(match=>{try{return entities(JSON.parse(match[1]))}catch{return[]}});}
const type=(entity,expected)=>[entity['@type']].flat().some(value=>String(value).toLowerCase()===expected.toLowerCase());
export function officialVariantIdentity(sourceId,url){const adapter=officialAdapters[sourceId];if(!adapter)throw Error('Unsupported official source');const parsed=new URL(url);if(parsed.origin!==adapter.origin||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('Unexpected official product URL');const match=parsed.pathname.match(adapter.path);return match?{collection:match[1].replaceAll('-',' '),external_id:match[2]}:null;}
const technicalKeys={material:'material',casematerial:'material',color:'color',dialcolour:'color',size:'dimensions',diameter:'diameter',casediameter:'diameter',movement:'movement',waterresistance:'water_resistance',powerreserve:'power_reserve',braceletmaterial:'bracelet_material',bracelettype:'bracelet_type'};
function factsFrom(entity,sourceUrl){const facts=[];const add=(key,value)=>{const plain=text(value);if(plain&&plain.length<=400)facts.push({key,value:plain,source_url:sourceUrl});};for(const key of ['material','color'])add(key,entity[key]);if(entity.size&&typeof entity.size==='object'&&entity.size.value!=null)add('diameter',String(entity.size.value)+' '+(entity.size.unitText||''));else add('dimensions',entity.size);for(const item of[entity.additionalProperty].flat().filter(Boolean)){const key=technicalKeys[String(item.name).toLowerCase().replace(/[^a-z]/g,'')];if(key)add(key,String(item.value));}return facts;}
const arabicNames=[['Oyster Perpetual','أويستر بربتشوال'],['Cosmograph Daytona','كوزموغراف دايتونا'],['Sea-Dweller','سي دويلر'],['Yacht-Master II','يخت ماستر ٢'],['Yacht-Master','يخت ماستر'],['GMT-Master II','جي إم تي ماستر ٢'],['Sky-Dweller','سكاي دويلر'],['Air-King','إير كينغ'],['Land-Dweller','لاند دويلر'],['Day-Date','داي ديت'],['Deepsea Challenge','ديب سي تشالنج'],['Deepsea','ديب سي'],['Datejust','ديت جست'],['Submariner','سابمارينر'],['Explorer II','إكسبلورر ٢'],['Explorer','إكسبلورر'],['Rolex','رولكس'],['Coussin de Cartier','كوسان دو كارتييه'],['Ballon Bleu de Cartier','بالون بلو دو كارتييه'],['Tank Française','تانك فرانسيز'],['Tank Américaine','تانك أمريكين'],['Tank Must','تانك ماست'],['Tank Louis Cartier','تانك لويس كارتييه'],['Tank','تانك'],['Santos de Cartier','سانتوس دو كارتييه'],['Santos-Dumont','سانتوس دومون'],['Panthère de Cartier','بانتير دو كارتييه'],['Clash de Cartier','كلاش دو كارتييه'],['Juste un Clou','جوست أن كلو'],['Trinity','ترينيتي'],['LOVE','لوف'],['Perlée','بيرليه'],['Magic Alhambra','ماجيك ألامبرا'],['Vintage Alhambra','فينتج ألامبرا'],['Sweet Alhambra','سويت ألامبرا'],['Alhambra','ألامبرا'],['Frivole','فريفول'],['Portugieser','بورتوجيزر'],['Aquatimer','أكواتايمر'],['Portofino','بورتوفينو'],['Limelight Gala','لايملايت غالا'],['Piaget Polo Date','بياجيه بولو ديت'],['Altiplano Tradition','ألتيبلانو تراديشن'],['Reverso Tribute','ريفيرسو تريبيوت'],['Reverso Classic','ريفيرسو كلاسيك'],['Rendez-Vous Classic','راندي فو كلاسيك'],['Luminor Luna Rossa GMT','لومينور لونا روسا جي إم تي'],['Radiomir','راديومير'],['Luminor Due','لومينور دوي'],['Royal Oak Offshore','رويال أوك أوفشور'],['Royal Oak','رويال أوك'],['Remaster','ريماستر'],['small model','الموديل الصغير'],['medium model','الموديل المتوسط'],['large model','الموديل الكبير'],['classic model','الموديل الكلاسيكي'],['long necklace','عقد طويل'],['necklace','عقد'],['pendant','تعليقة'],['bracelet','سوار'],['earrings','أقراط'],['ring','خاتم'],['watch','ساعة'],['Montre','ساعة']];
const additionalArabicNames=[
 ['Lady-Datejust','ليدي ديت جست'],['Submariner Date','سابمارينر ديت'],
 ['Tank Must de Cartier','تانك ماست دو كارتييه'],['La Panthère de Cartier','لا بانتير دو كارتييه'],
 ['Panthère Métiers d\'Art','بانتير ميتييه دار'],['Reflection de Cartier','ريفلكشن دو كارتييه'],
 ['Rotonde de Cartier','روتوند دو كارتييه'],['Indomptables de Cartier','أندومتابل دو كارتييه'],
 ['Ecrou de Cartier','إكرو دو كارتييه'],['Myst de Cartier','ميست دو كارتييه'],
 ['Baignoire Allongée','بينوار ألونجيه'],['Baignoire','بينوار'],['Roadster','رودستر'],
 ['Animalière','أنيماليير'],['Panthère','بانتير'],['Tortue','تورتو'],['Crash','كراش'],
 ['Agrafe','أغراف'],['Astrotourbillon','أستروتوربيون'],['SolarBeat','سولار بيت'],
 ['Lignes Essentielles','لين إيسانسييل'],['Etincelle de Cartier','إتينسيل دو كارتييه'],
 ['Grain de Café','غران دو كافيه'],['Maillon Panthère','مايون بانتير'],
 ["Cartier d'Amour",'كارتييه دامور'],['Logos','لوغوس'],['Symbol','سيمبول'],
 ['mini model','الموديل المصغّر'],['pink sapphire','ياقوت وردي'],
 ['cuff bracelet','سوار مفتوح'],['cufflinks','أزرار أكمام'],['Trace chain','سلسلة تراس'],
 ['Aquarii (Aquarius)','أكواري (الدلو)'],['Arietis (Aries)','أريتيس (الحمل)'],
 ['Cancri (Cancer)','كانكري (السرطان)'],['Capricorni (Capricorn)','كابريكورني (الجدي)'],
 ['Leonis (Leo)','ليونيس (الأسد)'],['Librae (Libra)','ليبراي (الميزان)'],
 ['Piscium (Pisces)','بيسكيوم (الحوت)'],['Sagittarii (Sagittarius)','ساجيتاري (القوس)'],
 ['Scorpii (Scorpio)','سكوربي (العقرب)'],['Tauri (Taurus)','تاوري (الثور)'],
 ['Virginis (Virgo)','فيرجينيس (العذراء)'],['Geminorum (Gemini)','جيمينوروم (الجوزاء)'],
 ['medal','ميدالية'],['three rows','ثلاثة صفوف'],['five rows','خمسة صفوف'],['cm','سم'],
 ['Etruscan inspiration','مستوحى من الفن الأتروري'],['Sweet Hearts','سويت هارتس'],
 ["Contes d'Hiver",'كونت ديفير'],['pendant and detachable clip','تعليقة ومشبك قابل للفصل'],
 ['detachable clip','مشبك قابل للفصل'],['Nœud','نود'],
 ['Sous les étoiles','سو ليز إيتوال'],['Cadenas','كاديناس'],['Charms Clover','شارمز كلوفر'],
 ["Pierre Arpels Heure d'Ici & Heure d'Ailleurs",'بيير آربلز أور ديسي وإ أور دايور'],
 ['Pierre Arpels','بيير آربلز'],['Lady Arpels','ليدي آربلز'],['Lady Féerie','ليدي فييري'],
 ['Zodiaque Lumineux','زودياك لومينو'],['A Day in Paris','أ داي إن باريس'],
 ['Heures Florales Cerisier','أور فلورال سيريزييه'],['Jour Nuit Fée Ondine','جور نوي في أوندين'],
 ['Midnight in Paris','ميدنايت إن باريس'],['Midnight','ميدنايت'],['Planétarium','بلانيتاريوم'],
 ['Heures Florales','أور فلورال'],['Papillon Automate','بابيون أوتومات'],
 ['Pont des Amoureux Hiver','بون دي زامورو إيفير'],['Lady Nuit des Papillons','ليدي نوي دي بابيون'],['mm','مم'],
 ['Pure Alhambra','بيور ألامبرا'],['Lucky Alhambra','لاكي ألامبرا'],['Byzantine Alhambra','بيزنطين ألامبرا'],
 ['Perlée sweet clovers','بيرليه سويت كلوفر'],['Perlée clovers','بيرليه كلوفر'],
 ['Perlée couleurs','بيرليه كولور'],['Perlée signature','بيرليه سيغنتشر'],
 ['Perlée pearls of gold','بيرليه حبيبات الذهب'],['Frivole','فريفول'],['Fleurette','فلوريت'],
 ['Rose de Noël','روز دو نويل'],['Socrate','سقراط'],['Two Butterfly','تو بترفلاي'],
 ['Flowerlace','فلاورليس'],['Cosmos','كوزموس'],['Lotus','لوتس'],['Snowflake','سنو فليك'],
 ['Zodiaque','زودياك'],['Ludo','لودو'],['Lucky Spring','لاكي سبرينغ'],['Bouton d\'or','بوتون دور'],
 ['Between the Finger','بين الأصابع'],['extra-small model','الموديل الصغير جداً'],
 ['extra small model','الموديل الصغير جداً'],['extra-large model','الموديل الكبير جداً'],
 ['extra large model','الموديل الكبير جداً'],['single-screw closure','إغلاق بمسمار واحد'],
 ['equipped with a micro-rotor','مزوّدة بدوّار مصغّر'],['brilliant-cut diamonds','ألماس بقطع بريليانت'],
 ['brilliant-cut diamond','ألماسة بقطع بريليانت'],['reverse-set diamonds','ألماس بترصيع معكوس'],
 ['double row','صف مزدوج'],['semi-paved','مرصّع جزئياً'],['paved','مرصّع'],['pavé','مرصّع'],
 ['on a chain','بسلسلة'],['on chain','بسلسلة'],['hoop earrings','أقراط حلقية'],
 ['earstuds','أقراط صغيرة'],['Jewellery','مرصّعة بالمجوهرات'],['Jewelry','مرصّعة بالمجوهرات'],
 ['transformable','قابل للتحويل'],['reversible','قابل للعكس'],['butterfly','فراشة'],
 ['diamonds','ألماس'],['diamond','ألماسة'],['Unlimited','أنليميتد'],['skeleton','مكشوفة الآلية'],
 ['flexible','مرن'],['supple','مرن'],['articulated','مفصلي'],['brushed','بتشطيب بالفرشاة'],
 ['lacquer','طلاء لاكيه'],['ceramic','سيراميك'],['onyx','أونيكس'],['cushion','كوشن'],
 ['motifs','زخارف'],['motif','زخرفة'],['rows','صفوف'],['row','صف'],['chain','سلسلة'],
 ['double','مزدوج'],['duo','ثنائي'],['Size','مقاس'],['de Cartier','دو كارتييه'],
];
/** Our faithful Arabic rendering of observed names; never an official brand translation. */
export function originalArabicName(name){
 const input=name.replace(/[’‘]/g,"'");let ar=input;for(const[from,to]of[...additionalArabicNames,...arabicNames].sort((a,b)=>b[0].length-a[0].length)){
  const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  ar=ar.replace(new RegExp('(?<![\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])','giu'),to);
 }
 if(ar===input)return null;
 ar=ar.replace(/^(.*?) (عقد طويل|ساعة|سوار|عقد|تعليقة|أقراط حلقية|أقراط صغيرة|أقراط|خاتم)(?=,|$|\s+\()/,'$2 $1').replaceAll(',','،');
 return ar;
}
export function exactReferenceApFacts(html,reference,sourceUrl){
 const facts=[];
 for(const match of html.matchAll(/<ap-product-info\b[^>]*>/g)){
  const tag=match[0];if(attribute(tag,'reference')!==reference)continue;
  const data=unescape(tag.match(/:product-data\s*=\s*"([^"]*)"/s)?.[1]);if(!data)continue;
  const field=key=>{const m=data.match(new RegExp(String.raw`(?:^|[,{\s])${key}:\s*'((?:\\.|[^'\\])*)'`));return m?.[1].replace(/\\u([0-9a-f]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16))).replace(/\\([\\'])/g,'$1');};
  if(field('reference')!==reference)continue;
  for(const [key,name]of[['material','enMaterials'],['diameter','caseSize']]){const value=field(name);if(value&&value.length<=400)facts.push({key,value,source_url:sourceUrl});}
 }
 return facts;
}

function additionalFacts(entity,source,title){const facts=[];const add=(key,value)=>facts.push({key,value,source_url:source.page_url});if(source.id==='audemars-piguet-official')facts.push(...exactReferenceApFacts(source.html||'',entity.sku,source.page_url));const description=text(entity.description)||'';if(source.id==='van-cleef-and-arpels-official'){for(const material of['white gold','yellow gold','rose gold','platinum','chalcedony','carnelian','mother-of-pearl','onyx'])if(description.toLowerCase().includes(material))add('material',material);}if(source.id==='cartier-official'){for(const material of['white gold','yellow gold','rose gold','platinum','steel','ceramic','leather'])if(description.toLowerCase().includes(material))add('material',material);for(const movement of['quartz','automatic'])if(description.toLowerCase().includes(movement))add('movement',movement);if(/manual (?:movement|winding)/i.test(description))add('movement','Manual winding');const diameter=description.match(/^(\d+(?:\.\d+)?)\s*mm/i)?.[1];if(diameter)add('diameter',diameter+' mm');}if(source.id==='piaget-official'){for(const [phrase,material]of[['or blanc','White gold'],['or rose','Rose gold'],['or jaune','Yellow gold'],['acier','Steel']])if(description.toLowerCase().includes(phrase))add('material',material);const mm=description.match(/(\d+(?:\.\d+)?)\s*mm/i)?.[1];if(mm)add('diameter',mm+' mm');if(/quartz/i.test(description))add('movement','Quartz');else if(/remontage automatique/i.test(description))add('movement','Automatic');else if(/remontage manuel/i.test(description))add('movement','Manual winding');}if(['panerai-official','jaeger-lecoultre-official'].includes(source.id)){for(const material of['Stainless Steel','Pink Gold','Platinum'])if(title.toLowerCase().includes(material.toLowerCase()))add('material',material);const mm=title.match(/(\d+(?:\.\d+)?)\s*mm/i)?.[1];if(mm)add('diameter',mm+' mm');if(/automatic/i.test(title))add('movement','Automatic');else if(/manual wind/i.test(title))add('movement','Manual winding');else if(/quartz/i.test(title))add('movement','Quartz');}return facts;}

export function officialCategory(name,url){return /bracelet/i.test(name)?'bracelets':/\/(?:jewelry|jewellery|high-jewellery)\//.test(url)?'jewelry':/\/(?:watches|watch-collection)\//.test(url)?'watches':/\/bags-and-accessories\//.test(url)?(/bag|tote|clutch|backpack/i.test(name)?'handbags':'leather-goods'):null;}

/** Re-prepare acquired snapshots without refetching or inventing absent source facts. */
export function prepareOfficialCandidates(rows){return rows.map(row=>{
 const adapter=officialAdapters[row.source_id];if(!adapter||row.brand!==adapter.brand)throw Error('Unsupported acquired source brand');
 const identity=officialVariantIdentity(row.source_id,row.source_url);if(!identity||identity.external_id.toLowerCase()!==row.external_id.toLowerCase())throw Error('Acquired source identity mismatch');
 let ar=originalArabicName(row.product_name);
 if(row.source_id==='rolex-official'){
  const model=row.product_name.match(/^Rolex (.+?) watch(?=:|$)/)?.[1];const translated=model?originalArabicName('Rolex '+model):null;
  if(translated){const diameter=row.facts?.find(f=>f.key==='diameter'&&/^\d+(?:\.\d+)? mm$/.test(f.value));ar='ساعة '+translated+(diameter?'، '+diameter.value.replace('mm','مم'):'');}
 }
 const facts=[...(row.facts||[]),...additionalFacts({sku:row.external_id,description:row.source_description},{id:row.source_id,page_url:row.source_url},'')];
 const uniqueFacts=[...new Map(facts.map(f=>[f.key+'\0'+f.value,f])).values()];
 const record=normalizeBatch([{...row,facts:uniqueFacts,name_ar:ar,translation_state:ar?'provided':'name_pending'}])[0];
 record.category_slug=officialCategory(row.product_name,row.source_url);record.category_mapping_state=record.category_slug?'source_path':'requires_review';
 record.availability_state='unverified';record.arabic_name_review_state=ar?(/[A-Za-zÀ-ž]/.test(ar)?'untranslated_source_terms':'own_translation_requires_review'):'source_name_retained';
 for(const key of['acquired_at','source_html_sha256'])if(row[key])record[key]=row[key];
 return record;
});}

/** Actual identifiers must agree with the named source page; image references are not grants. */
export function extractOfficialProducts(html,source){const adapter=officialAdapters[source.id];if(!adapter||source.brand&&source.brand!==adapter.brand)throw Error('Official source brand mismatch');const identity=officialVariantIdentity(source.id,source.page_url);if(!identity)throw Error('Unsupported variant URL');const data=structured(html);const title=text(html.match(/<title[^>]*>(.*?)<\/title>/si)?.[1])||'';const expected=identity.external_id.toLowerCase();let products=data.filter(entity=>type(entity,'Product')&&String(entity.sku||entity.productID||'').toLowerCase()===expected);let method='json-ld';
if(!products.length&&source.id==='jaeger-lecoultre-official'){const breadcrumbs=data.find(entity=>type(entity,'BreadcrumbList'));const last=breadcrumbs?.itemListElement?.at(-1);const h1=text(html.match(/<h1[^>]*>(.*?)<\/h1>/si)?.[1]);const meta=[...html.matchAll(/<meta[^>]*>/g)].map(m=>m[0]).find(tag=>attribute(tag,'property')==='og:image');if(String(last?.name).toLowerCase()===expected&&h1&&meta){products=[{sku:last.name,name:h1,image:attribute(meta,'content')}];identity.collection=breadcrumbs.itemListElement.at(-2).name;method='structured-page';}}
if(!products.length&&source.id==='audemars-piguet-official'){const parts=title.split(' - ');const imgs=[...html.matchAll(/<img[^>]*>/g)].map(m=>m[0]).filter(tag=>attribute(tag,'alt')?.startsWith('Standup image of the watch'));if(parts.length===3&&parts[1].toLowerCase()===expected&&parts[2]===adapter.brand&&imgs.length){products=[{sku:parts[1],name:parts[0]+' '+parts[1],image:imgs.map(tag=>attribute(tag,'data-src')).filter(Boolean)}];identity.collection=parts[0];method='structured-page';}}
if(!products.length)throw Error('Complete page-associated variant facts unavailable');return products.map(entity=>{const images=[entity.image].flat().filter(Boolean).map(image=>typeof image==='string'?image:image.url||image.contentUrl).filter(Boolean);const facts=[...factsFrom(entity,source.page_url),...additionalFacts(entity,{...source,html},title)];const uniqueFacts=[...new Map(facts.map(f=>[f.key+'\0'+f.value,f])).values()];const name=text(entity.name);const ar=originalArabicName(name);const record=normalizeBatch([{source_id:source.id,brand:adapter.brand,external_id:String(entity.sku||entity.productID),collection:identity.collection,product_name:name,image_urls:images,source_url:source.page_url,source_description:text(entity.description),facts:uniqueFacts,name_ar:ar,name_en:name,translation_state:ar?'provided':'name_pending',provenance:{method,language:source.language||'en'}}])[0];record.category_slug=officialCategory(name,source.page_url);record.category_mapping_state=record.category_slug?'source_path':'requires_review';record.availability_state='unverified';record.arabic_name_review_state=ar?(/[A-Za-zÀ-ž]/.test(ar)?'untranslated_source_terms':'own_translation_requires_review'):'source_name_retained';return record;});}
