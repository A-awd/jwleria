import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {t}=await import('../src/i18n/ui.ts');

// Decision 0005: neutral, inquiry-only copy. No personal-shopping or concierge positioning, and no line that implies
// brand stock or affiliation where the preview shows synthetic pieces or a directory brand has no products.
const strings=value=>typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
test('public strings carry no concierge or personal-shopping positioning in either locale',()=>{
 for(const locale of ['ar','en']){
  const all=strings(t(locale)).join('\n');
  assert.doesNotMatch(all,/concierge|personal shop|كونسيرج|التسوق الشخصي|مساعدة شخصية/i,locale);
 }
 assert.equal(Object.hasOwn(t('en'),'concierge'),false,'the inquiry band no longer uses the concierge key');
 const home=readFileSync(new URL('../src/pages/[locale]/index.astro',import.meta.url),'utf8');
 assert.doesNotMatch(home,/concierge/,'no concierge id ships in the home page HTML');
});

test('home, latest and own-collection leads describe a directory and pieces on view, not brand stock',()=>{
 assert.equal(t('ar').hero.lead,'دليل العلامات العالمية ومختارات من القطع، والتفاصيل عبر واتساب.');
 assert.equal(t('en').hero.lead,'A directory of brands and a selection of pieces, with details on WhatsApp.');
 assert.equal(t('ar').latest.lead,'أحدث القطع المعروضة من الأزياء والساعات والمجوهرات.');
 assert.equal(t('en').latest.lead,'The latest pieces on view across fashion, watches and jewellery.');
 assert.equal(t('ar').brands.ownLead,'قطع معاينة من مختاراتنا الخاصة.');
 for(const locale of ['ar','en'])assert.doesNotMatch(t(locale).hero.lead+t(locale).latest.lead,/houses|دور الأزياء|من العلامات العالمية،/,locale);
});

test('a directory brand summary names the directory and an enquiry, never selections or availability',()=>{
 const source=readFileSync(new URL('../src/server/catalog.ts',import.meta.url),'utf8');
 assert.match(source,/\$\{b\.name\} ضمن دليل العلامات\. الاستفسار عبر واتساب\./);
 assert.match(source,/\$\{b\.name\} in the brand directory\. Enquiries via WhatsApp\./);
 assert.doesNotMatch(source,/availability via WhatsApp|التوفر عبر واتساب/);
 const live=readFileSync(new URL('../src/server/supabase-catalog.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(live,/availability via WhatsApp|التوفر عبر واتساب/,'a brand with published pieces makes no availability promise either');
});

test('a supplied photo title keeps its own text and takes only the locale quotation marks',()=>{
 assert.deepEqual(t('ar').variants.credit.quote,['«','»']);
 assert.deepEqual(t('en').variants.credit.quote,['“','”']);
});
