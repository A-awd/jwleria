import test from 'node:test';
import assert from 'node:assert/strict';
import {contactChannel, normalizeE164, whatsappHref} from '../src/components/contact.mjs';

// Only the fictional Ofcom drama range (+44 7700 900000-900999) is used; the length cases below are
// truncated or extended strings from that range, not phone numbers.
const FICTIONAL='+44 7700 900123';

test('strict E.164 normalisation accepts only separators around 8-15 digits',()=>{
 for(const value of [FICTIONAL,'+447700900123','447700900123','+44-7700-900123','+44 (7700) 900123','+44(7700)900123','(44) 7700 900-123',` ${FICTIONAL}\n`])
  assert.equal(normalizeE164(value),'+447700900123',value);
 assert.equal(normalizeE164('+44 7700 90'),'+44770090');
 assert.equal(normalizeE164('+44 7700 900123 456'),'+447700900123456');
 for(const value of [undefined,null,'',' ','+','4477009','+44 7700 9','+44 7700 900123 4567',447700900123,
  '0044 7700 900123','+0044 7700 900123','00447700900123','07700 900123','++44 7700 900123','+44 +7700 900123','44+7700900123',
  '+44 7700 900ABC','tel:+447700900123','+44 7700 900123 ext 12','+44 7700 900123x12','+44 7700 900123#12','+44 7700 900123;ext=12','+44 7700 900123,1',
  '+44 (0) 7700 900123','+44 (0)7700 900123','+44 (7700 900123','+44 7700) 900123','+44 ((7700)) 900123','+44 () 7700 900123',
  '+44  7700 900123','+44 - 7700 900123','+44.7700.900123','+44/7700/900123','+44\u00a07700\u00a0900123','+44_7700_900123',
  '-44 7700 900123','+44 7700 900123-','+٤٤ ٧٧٠٠ ٩٠٠١٢٣','+44 7700 900123'.repeat(3)])
  assert.equal(normalizeE164(value),undefined,String(value));
});

test('live contact needs the exact live mode and a valid number; anything else is pending',()=>{
 assert.deepEqual(contactChannel('live',FICTIONAL),{live:true,e164:'+447700900123'});
 for(const [mode,number] of [['preview',FICTIONAL],['LIVE',FICTIONAL],[' live',FICTIONAL],[undefined,FICTIONAL],['',FICTIONAL],
  ['live',''],['live',undefined],['live','0044 7700 900123'],['live','+44 7700 900123 ext 1'],['live','+44 (0) 7700 900123']])
  assert.deepEqual(contactChannel(mode,number),{live:false},`${mode}/${number}`);
});

test('wa.me links carry digits only and percent-encode Arabic text, newlines and reserved characters',()=>{
 const message='مرحباً، أود معرفة السعر والتوفر لهذه القطعة: Tiffany & Co. — المرجع A+B#1?\nhttps://jwleria.example/ar/products/test-piece/';
 const link=whatsappHref(FICTIONAL,message);
 assert.ok(link.startsWith('https://wa.me/447700900123?text='));
 assert.doesNotMatch(link,/[\s#&+]|[^\x21-\x7e]/,'only one query parameter and no raw whitespace or non-ASCII');
 assert.match(link,/%0A/);assert.match(link,/^[^?]+\?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7/);
 const url=new URL(link);
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/447700900123');
 assert.deepEqual([...url.searchParams.keys()],['text']);assert.equal(url.searchParams.get('text'),message);
 assert.equal(whatsappHref('+44 (7700) 900-123'),'https://wa.me/447700900123');
 for(const number of ['','0044 7700 900123','+44 7700 900123 ext 1',undefined])assert.throws(()=>whatsappHref(number,'text'),/destination/);
 assert.throws(()=>whatsappHref(FICTIONAL,{toString:()=>'text'}),/destination/);
});
