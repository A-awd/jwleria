import test from 'node:test';
import assert from 'node:assert/strict';

const {arabicCount,englishCount,optionCounts,optionLabel,pageLinks,resultCount,t}=await import('../src/i18n/ui.ts');
const plain=parts=>parts.map(p=>typeof p==='string'?p:p.value).join('');

test('Arabic option counts use the grammatical form for each number',()=>{
 assert.deepEqual([1,2,3,10,11,26,100,103,111].map(n=>arabicCount('dial',n)),['لون ميناء واحد','لونا ميناء','3 ألوان ميناء','10 ألوان ميناء','11 لون ميناء','26 لون ميناء','100 لون ميناء','103 ألوان ميناء','111 لون ميناء']);
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

test('cards mention only kinds that offer a real choice, with no price, stock or availability wording',()=>{
 const model={variantCount:52,options:[{kind:'dial',count:26},{kind:'bracelet',count:2},{kind:'colour',count:1}]};
 assert.equal(optionCounts('ar',model),'26 لون ميناء · سواران');assert.equal(optionCounts('en',model),'26 dials · 2 bracelets');
 assert.equal(optionCounts('en',{variantCount:1,options:[]}),'');assert.equal(optionCounts('ar',undefined),'');
 for(const l of ['ar','en'])assert.doesNotMatch(optionCounts(l,model),/price|stock|availab|سعر|متوفر|توفر|مخزون/i);
 // A product page reads at most 60 variants, so a larger model would count values its page cannot offer.
 assert.equal(optionCounts('en',{variantCount:60,options:[{kind:'colour',count:60}]}),'60 colours');
 assert.equal(optionCounts('en',{variantCount:62,options:[{kind:'colour',count:62}]}),'');
});

test('option labels come from the reviewed i18n strings, falling back to the catalog label',()=>{
 assert.equal(optionLabel('ar','dial',{ar:'x',en:'x'}),'لون الميناء');assert.equal(optionLabel('en','dial',{ar:'x',en:'x'}),'Dial');
 assert.equal(optionLabel('ar','bracelet',{ar:'x',en:'x'}),'السوار');assert.equal(optionLabel('en','colour',{ar:'x',en:'x'}),'Colour');
 assert.equal(optionLabel('ar','ring_size',{ar:'x',en:'x'}),'مقاس الخاتم');assert.equal(optionLabel('en','strap_width',{ar:'عرض الحزام',en:'Strap width'}),'Strap width');
 assert.equal(optionLabel('ar','bracelet_material',{ar:'x',en:'x'}),'مادة السوار');assert.equal(optionLabel('en','bracelet_material',{ar:'x',en:'x'}),'Bracelet material');
 assert.equal(plain(t('ar').variants.changes([{label:'السوار',value:'جلد'}])),'يغيّر السوار إلى جلد');
 assert.equal(plain(t('en').variants.changes([{label:'Bracelet',value:'Leather'}])),'Changes bracelet to Leather');
 const oyster={label:'السوار',value:'Oyster, three-piece solid links',valueLang:'en'};
 const note=t('ar').variants.changes([oyster,{label:'لون الميناء',value:'أزرق'}]);
 assert.equal(plain(note),'يغيّر السوار إلى Oyster, three-piece solid links، لون الميناء إلى أزرق');
 assert.deepEqual(note.filter(p=>typeof p!=='string').map(p=>p.valueLang),['en',undefined],'each value stays its own part, so an English one can be marked');
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
