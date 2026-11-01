import test from 'node:test';
import assert from 'node:assert/strict';

const {arabicCount,englishCount,optionLabel,pageLinks,resultCount,t}=await import('../src/i18n/ui.ts');

test('Arabic option counts use the grammatical form for each number',()=>{
 assert.deepEqual([1,2,3,10,11,26,100,103,111].map(n=>arabicCount('dial',n)),['خيار ميناء واحد','خيارا ميناء','3 خيارات ميناء','10 خيارات ميناء','11 خيار ميناء','26 خيار ميناء','100 خيار ميناء','103 خيارات ميناء','111 خيار ميناء']);
 assert.deepEqual([1,2,3,11,100].map(n=>arabicCount('bracelet',n)),['سوار واحد','سواران','3 أساور','11 سوارًا','100 سوار']);
 assert.deepEqual([2,3,12].map(n=>arabicCount('colour',n)),['لونان','3 ألوان','12 لونًا']);
 assert.deepEqual([1,2,3,11].map(n=>arabicCount('bracelet_material',n)),['مادة سوار واحدة','مادتا سوار','3 مواد سوار','11 مادة سوار']);
 assert.equal(arabicCount('color',4),'4 ألوان');assert.equal(arabicCount('ring_size',4),'4 مقاسات');assert.equal(arabicCount('strap_width',12),'12 خيارًا','an unknown kind uses the neutral word for options');
});

test('English counts are neutral and pluralised',()=>{
 assert.deepEqual([1,26].map(n=>englishCount('dial',n)),['1 dial','26 dials']);
 assert.equal(englishCount('bracelet_material',2),'2 bracelet materials');
 assert.equal(englishCount('colour',3),'3 colours');assert.equal(englishCount('color',3),'3 colours');assert.equal(englishCount('case_size',2),'2 case diameters');assert.equal(englishCount('strap_width',2),'2 options');
});

test('option labels come from the reviewed i18n strings, falling back to the catalog label',()=>{
 assert.equal(optionLabel('ar','dial',{ar:'x',en:'x'}),'الميناء','not "dial colour": many dials are stone, meteorite or paved');assert.equal(optionLabel('en','dial',{ar:'x',en:'x'}),'Dial');
 assert.equal(optionLabel('ar','bracelet',{ar:'x',en:'x'}),'السوار');assert.equal(optionLabel('en','colour',{ar:'x',en:'x'}),'Colour');
 assert.equal(optionLabel('ar','ring_size',{ar:'x',en:'x'}),'مقاس الخاتم');assert.equal(optionLabel('en','strap_width',{ar:'عرض الحزام',en:'Strap width'}),'Strap width');
 assert.equal(optionLabel('ar','bracelet_material',{ar:'x',en:'x'}),'مادة السوار');assert.equal(optionLabel('en','bracelet_material',{ar:'x',en:'x'}),'Bracelet material');
});

test('one notice names an option that changed without being chosen; other sizes have one heading',()=>{
 const fill=(template,label,value)=>template.replace('{label}',label).split('{value}').join(value);
 assert.equal(fill(t('ar').variants.changed,'السوار','جلد'),'تغيّر السوار إلى جلد.');
 assert.equal(fill(t('en').variants.changed,'Bracelet','Leather'),'Bracelet changed to Leather.');
 for(const l of ['ar','en'])assert.equal(t(l).variants.changed.split('{value}').length,2,'the value is one part, so an English value can be marked');
 assert.deepEqual([t('ar').variants.otherSizes,t('en').variants.otherSizes],['بمقاسات أخرى','In other sizes']);
 assert.ok(!('changes' in t('en').variants),'no per-option change notes remain');
});

test('every credit change the media migrations accept reads in Arabic on Arabic pages',async()=>{
 const {readFile}=await import('node:fs/promises');
 const accepted=async path=>{const sql=await readFile(new URL(path,import.meta.url),'utf8');return [...sql.match(/'changes' not in \(([^)]*)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);};
 const applied=await accepted('../supabase/migrations/20261028111829_jwleria_open_license_media.sql');
 // The cutout migration (20261101104017) widens the open-licence list; the storefront translates every text it accepts.
 const cutout=await accepted('../supabase/migrations/20261101104017_jwleria_cutout_media.sql');
 assert.ok(applied.every(value=>cutout.includes(value))&&cutout.length===4,'the cutout migration keeps every applied credit text');
 // The white square migration (decision 0022) adds its two texts and keeps the four.
 const {readdir}=await import('node:fs/promises');
 const white=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_jwleria_white_square_media.sql'));
 const allowed=await accepted(white?'../supabase/migrations/'+white:'../supabase/proposed/jwleria_white_square_media.sql');
 assert.ok(cutout.every(value=>allowed.includes(value))&&allowed.length===6,'the white square migration keeps every earlier credit text');
 assert.deepEqual(Object.keys(t('ar').variants.credit.changed).sort(),[...allowed].sort());
 assert.deepEqual(Object.keys(t('en').variants.credit.changed).sort(),[...allowed].sort());
 for(const value of allowed){assert.match(t('ar').variants.credit.changed[value],/[\u0600-\u06ff]/);assert.equal(t('en').variants.credit.changed[value],value);}
});

test('listing totals name what they count: models from the model projection, catalog rows otherwise',()=>{
 assert.deepEqual([1,2,3,11,100].map(total=>resultCount('ar',{total,unit:'models'})),['طراز واحد','طرازان','3 طرازات','11 طرازًا','100 طراز']);
 assert.deepEqual([1,26].map(total=>resultCount('en',{total,unit:'models'})),['1 model','26 models']);
 assert.equal(resultCount('en',{total:26,unit:'products'}),'26 pieces');assert.equal(resultCount('ar',{total:26}),'26 قطعة','without the model view the count stays as today');
});

test('a variant page\'s canonical URL and its language alternates all name the primary variant',()=>{
 const site=new URL('https://shop.example/');
 const links=pageLinks('ar','/products/m126334-0001/',site);
 assert.equal(links.canonical,'https://shop.example/ar/products/m126334-0001/');
 assert.deepEqual(links.alternates,[['ar','https://shop.example/ar/products/m126334-0001/'],['en','https://shop.example/en/products/m126334-0001/'],['x-default','https://shop.example/ar/products/m126334-0001/']]);
 assert.equal(pageLinks('en','/catalog/').canonical,'/en/catalog/','without a site origin the links stay relative');
});
