import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleModel,closestVariant,optionAxes,orderOptionKinds,selectorAxes} from '../src/components/variant-selection.mjs';

const text=(en,ar=en)=>({ar,en});
const labels={dial:text('Dial','لون الميناء'),bracelet:text('Bracelet','السوار'),colour:text('Colour','اللون')};
const v=(slug,position,options)=>({slug,reference:slug.toUpperCase(),position,isPrimary:position===0,specs:[],options:Object.entries(options).map(([kind,key])=>({kind,key,label:labels[kind],value:text(key)}))});
// A sparse real catalog: green exists only on leather; there is no ivory/leather or slate/leather variant.
const watch=[
 v('ivory-oyster',0,{dial:'ivory',bracelet:'oyster'}),
 v('ivory-jubilee',1,{dial:'ivory',bracelet:'jubilee'}),
 v('slate-oyster',2,{dial:'slate',bracelet:'oyster'}),
 v('slate-jubilee',3,{dial:'slate',bracelet:'jubilee'}),
 v('green-leather',4,{dial:'green',bracelet:'leather'}),
];
const bySlug=s=>watch.find(x=>x.slug===s);

test('choosing a value keeps the rest of the selection when that real variant exists',()=>{
 assert.equal(closestVariant(watch,bySlug('ivory-jubilee'),'dial','slate').slug,'slate-jubilee');
 assert.equal(closestVariant(watch,bySlug('slate-oyster'),'bracelet','jubilee').slug,'slate-jubilee');
 assert.equal(closestVariant(watch,bySlug('ivory-oyster'),'dial','green').slug,'green-leather','a value only offered with another bracelet moves to that real variant');
 assert.equal(closestVariant(watch,bySlug('green-leather'),'dial','ivory').slug,'ivory-oyster','ties prefer the lowest position');
 assert.equal(closestVariant(watch,bySlug('ivory-oyster'),'dial','red'),undefined,'an absent value is never constructed');
});

test('the selector offers exactly the real values, each linked to an existing variant, and names forced changes',()=>{
 const selected=bySlug('ivory-oyster');
 const axes=selectorAxes(watch,selected);
 assert.deepEqual(axes.map(a=>a.kind),['dial','bracelet']);
 const slugs=new Set(watch.map(x=>x.slug));
 const links=axes.flatMap(a=>a.values);
 assert.equal(links.length,6,'3 dials + 3 bracelets, not 3 × 3 combinations');
 assert.ok(links.every(l=>slugs.has(l.slug)),'every link is an existing variant URL');
 assert.deepEqual(axes[0].values.map(x=>[x.key,x.slug,x.current]),[['ivory','ivory-oyster',true],['slate','slate-oyster',false],['green','green-leather',false]]);
 assert.equal(axes[0].current.en,'ivory');
 const green=axes[0].values.find(x=>x.key==='green');
 assert.deepEqual(green.changes.map(c=>[c.kind,c.value.en]),[['bracelet','leather']]);
 const leather=axes[1].values.find(x=>x.key==='leather');
 assert.deepEqual(leather.changes.map(c=>[c.kind,c.value.en]),[['dial','green']]);
 assert.ok(axes.flatMap(a=>a.values).filter(x=>!['green','leather'].includes(x.key)).every(x=>x.changes.length===0));
 for(const axis of selectorAxes(watch,bySlug('green-leather')))for(const value of axis.values)assert.ok(value.current||slugs.has(value.slug));
});

test('kinds with a single value are not offered and a single-variant model has no selector',()=>{
 const bag=[v('bag-black',0,{colour:'black',dial:'none'}),v('bag-beige',1,{colour:'beige',dial:'none'})];
 assert.deepEqual(optionAxes(bag).map(a=>a.kind),['colour']);
 assert.deepEqual(selectorAxes([v('only',0,{})],v('only',0,{})),[]);
});

test('models resolve the addressed and primary variants deterministically',()=>{
 const shuffled=[watch[3],watch[0],watch[4],watch[1],watch[2]];
 const model=assembleModel('k',text('Model'),shuffled,'slate-jubilee');
 assert.deepEqual(model.variants.map(x=>x.position),[0,1,2,3,4]);assert.equal(model.selected.slug,'slate-jubilee');assert.equal(model.primary.slug,'ivory-oyster');
 assert.equal(assembleModel('k',text('Model'),watch,'missing'),undefined);
 const noPrimary=assembleModel('k',text('Model'),watch.map(x=>({...x,isPrimary:false})),'slate-oyster');
 assert.equal(noPrimary.primary.slug,'ivory-oyster','without a flagged primary the lowest position is primary');
 assert.throws(()=>assembleModel('k',text('Model'),watch.map(x=>({...x,isPrimary:true})),'slate-oyster'),/primary/);
});

test('known option kinds are ordered for display; unknown kinds follow alphabetically',()=>{
 assert.deepEqual(orderOptionKinds([{kind:'strap_width'},{kind:'bracelet'},{kind:'case_size'},{kind:'dial'},{kind:'colour'},{kind:'finish'}]).map(o=>o.kind),['dial','bracelet','colour','case_size','finish','strap_width']);
});
