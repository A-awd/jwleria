import test from 'node:test';
import assert from 'node:assert/strict';
import {productInquiryMessage} from '../src/components/inquiry-message.mjs';

test('actual product inquiry preserves reference and includes the exact localized page',()=>{
 const ar=productInquiryMessage('استفسار عن ساعة، المرجع REF-1','https://jwleria.com','ar','actual-watch');
 assert.equal(ar,'استفسار عن ساعة، المرجع REF-1\nhttps://jwleria.com/ar/products/actual-watch/');
 const encoded=new URL(`https://wa.me/966500000000?text=${encodeURIComponent(ar)}`);
 assert.equal(encoded.searchParams.get('text'),ar);
 assert.match(productInquiryMessage('Reference REF-1','https://jwleria.com/','en','actual-watch'),/\/en\/products\/actual-watch\/$/);
 for(const origin of ['https://jwleria.com/private','http://jwleria.com','https://u:p@jwleria.com','https://jwleria.com/?token=private'])assert.throws(()=>productInquiryMessage('REF-1',origin,'ar','actual-watch'),/origin/);
 assert.throws(()=>productInquiryMessage('REF-1','https://jwleria.com','ar','../other'),/identity/);
});
