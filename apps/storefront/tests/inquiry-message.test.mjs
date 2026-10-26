import test from 'node:test';
import assert from 'node:assert/strict';
import {inquiryBrand,productInquiryMessage,withBrand} from '../src/components/inquiry-message.mjs';
import {whatsappHref} from '../src/components/contact.mjs';
import {t} from '../src/i18n/ui.ts';

const FICTIONAL='+44 7700 900123';
const CURRENCY=/(?:\b(?:SAR|AED|USD|EUR|GBP|QAR|KWD|BHD|OMR|JPY|CNY|CHF)\b|[$€£¥₹﷼]|ر\s*\.\s*س|ريال|درهم|دولار|يورو)/iu;
const PROMISE=/in stock|available now|guarantee|متوفر|متاح الآن|مضمون/i;

test('the brand is added when the localized name lacks it, never duplicated and never invented',()=>{
 for(const [brand,name] of [['OMEGA','Omega Steel Watch'],['Hermès','Hermes Leather Tote'],['Tiffany & Co.','Tiffany & Co Silver Bracelet'],
  ['Jaeger-LeCoultre','Jaeger'+String.fromCharCode(0x2011)+'LeCoultre Steel Watch'],['CHANEL','حقيبة CHANEL جلدية'],['Saint Laurent','Yves Saint Laurent Tote'],
  ['دار أمل','سوار دار امل الذهبي'],['Rolex','Rolex']])
  assert.equal(inquiryBrand(brand,name),'',`${brand} / ${name}`);
 assert.equal(inquiryBrand('Rolex','ساعة فولاذية ٣٦'),'Rolex','an Arabic name without the Latin brand still names it');
 assert.equal(inquiryBrand(' Dior ','Diorama Bag'),'Dior','containment is by whole words');
 for(const brand of [undefined,'','   ','&'])assert.equal(inquiryBrand(brand,'Steel Watch'),'');
 assert.equal(withBrand('ساعة فولاذية ٣٦','Rolex'),'Rolex — ساعة فولاذية ٣٦');
 assert.equal(withBrand('Omega Steel Watch','OMEGA'),'Omega Steel Watch');
 assert.equal(withBrand('Steel Watch',undefined),'Steel Watch');
});

test('Arabic and English templates name brand, model and reference with neutral first-person wording',()=>{
 const cases=[
  [t('ar').dialog.product('ساعة فولاذية ٣٦','REF-1','Rolex'),'مرحباً، أود معرفة السعر والتوفر لهذه القطعة: Rolex — ساعة فولاذية ٣٦ — المرجع REF-1'],
  [t('ar').dialog.product('حقيبة CHANEL جلدية','REF-2','CHANEL'),'مرحباً، أود معرفة السعر والتوفر لهذه القطعة: حقيبة CHANEL جلدية — المرجع REF-2'],
  [t('ar').dialog.product('قطعة','REF-3'),'مرحباً، أود معرفة السعر والتوفر لهذه القطعة: قطعة — المرجع REF-3'],
  [t('en').dialog.product('Steel Watch 36','REF-1','Rolex'),'Hello, I would like the price and availability for: Rolex — Steel Watch 36 — reference REF-1'],
  [t('en').dialog.product('Omega Steel Watch','REF-2','OMEGA'),'Hello, I would like the price and availability for: Omega Steel Watch — reference REF-2'],
  [t('en').dialog.product('Piece','REF-3',undefined),'Hello, I would like the price and availability for: Piece — reference REF-3'],
 ];
 for(const [actual,expected] of cases){
  assert.equal(actual,expected);
  assert.doesNotMatch(actual,CURRENCY);assert.doesNotMatch(actual,PROMISE);
 }
});

test('actual product inquiry keeps the composed text and adds the exact localized page',()=>{
 const text=t('ar').dialog.product('ساعة فولاذية','REF-1','Rolex');
 const ar=productInquiryMessage(text,'https://jwleria.com','ar','actual-watch');
 assert.equal(ar,'مرحباً، أود معرفة السعر والتوفر لهذه القطعة: Rolex — ساعة فولاذية — المرجع REF-1\nhttps://jwleria.com/ar/products/actual-watch/');
 assert.equal(ar.split('\n')[0],text,'the on-page quote is the sent text without the page link');
 assert.equal(new URL(whatsappHref(FICTIONAL,ar)).searchParams.get('text'),ar);
 assert.match(productInquiryMessage('Reference REF-1','https://jwleria.com/','en','actual-watch'),/\nhttps:\/\/jwleria\.com\/en\/products\/actual-watch\/$/);
 for(const origin of ['https://jwleria.com/private','http://jwleria.com','https://u:p@jwleria.com','https://jwleria.com/?token=private','https://jwleria.com/#top','ftp://jwleria.com','javascript:alert(1)'])
  assert.throws(()=>productInquiryMessage('REF-1',origin,'ar','actual-watch'),/origin/,origin);
 for(const [locale,slug] of [['ar','../other'],['ar','Actual-Watch'],['ar','actual_watch'],['ar','actual--watch'],['ar',''],['ar','actual-watch/'],['fr','actual-watch'],['AR','actual-watch']])
  assert.throws(()=>productInquiryMessage('REF-1','https://jwleria.com',locale,slug),/identity/,`${locale}/${slug}`);
});
