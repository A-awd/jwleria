import test from 'node:test';
import assert from 'node:assert/strict';
import {configurator,controlLayout,optionKey} from '../src/components/variant-selection.mjs';

// The product options after the owner's failed phone acceptance of 2026-11-01: a dial must never change the size,
// only values made at the selected size are offered, values made only in other sizes name their sizes, and every
// real variant stays reachable. Data shapes follow jwl_product_model_v2 links.
const text=(en,ar=en)=>({en,ar});
const LABELS={case_size:text('Case diameter','قطر العلبة'),dial:text('Dial','الميناء'),bracelet:text('Bracelet','السوار'),colour:text('Colour','اللون'),bag_size:text('Bag size','مقاس الحقيبة'),model_size:text('Model size','حجم الموديل')};
const VALUES={'31-mm':text('31 mm','31 مم'),'36-mm':text('36 mm','36 مم'),'41-mm':text('41 mm','41 مم'),
  silver:text('Silver','فضي'),black:text('Bright black','أسود لامع'),pink:text('Pink','وردي'),green:text('Mint green','أخضر نعناعي'),slate:text('Slate','أردوازي'),
  jubilee:{...text('Jubilee, five-piece links'),lang:'en'},oyster:{...text('Oyster, three-piece solid links'),lang:'en'}};
const option=(kind,key)=>{const v=VALUES[key]??text(key);return {kind,key,label:LABELS[kind]??text(kind),value:{en:v.en,ar:v.ar},...(v.lang?{valueLang:'en'}:{})};};
const build=rows=>rows.map((options,i)=>({id:`id-${i}`,slug:`v-${i}-${options.map(([,k])=>k).join('-')}`,reference:`R${String(i+1).padStart(3,'0')}`,position:i,isPrimary:i===0,options:options.map(([kind,key])=>option(kind,key))}));
// A sparse family like the live Datejust: not every dial is made in every size, and slate only on Oyster.
const family=build([
  [['case_size','31-mm'],['dial','silver'],['bracelet','jubilee']],[['case_size','31-mm'],['dial','silver'],['bracelet','oyster']],
  [['case_size','31-mm'],['dial','pink'],['bracelet','jubilee']],[['case_size','31-mm'],['dial','green'],['bracelet','oyster']],
  [['case_size','36-mm'],['dial','silver'],['bracelet','jubilee']],[['case_size','36-mm'],['dial','silver'],['bracelet','oyster']],
  [['case_size','36-mm'],['dial','black'],['bracelet','jubilee']],[['case_size','36-mm'],['dial','black'],['bracelet','oyster']],
  [['case_size','36-mm'],['dial','pink'],['bracelet','oyster']],
  [['case_size','41-mm'],['dial','black'],['bracelet','jubilee']],[['case_size','41-mm'],['dial','black'],['bracelet','oyster']],
  [['case_size','41-mm'],['dial','slate'],['bracelet','oyster']],
]);
const find=(variants,wanted)=>variants.find(v=>Object.entries(wanted).every(([kind,key])=>optionKey(v,kind)===key));
const pick=wanted=>find(family,wanted);
const control=(controls,kind)=>controls.find(c=>c.kind===kind);
const keys=values=>values.map(v=>v.key);
const slugs=new Set(family.map(v=>v.slug));

test('the size comes first and offers every real size, each linked to an existing variant of that size',()=>{
  const selected=pick({case_size:'41-mm',dial:'black',bracelet:'jubilee'});
  const controls=configurator(family,selected);
  assert.deepEqual(controls.map(c=>[c.kind,c.size]),[['case_size',true],['dial',false],['bracelet',false]]);
  const size=control(controls,'case_size');
  assert.deepEqual(keys(size.values),['31-mm','36-mm','41-mm']);
  assert.deepEqual(size.values.map(v=>v.current),[false,false,true]);
  for(const v of size.values)assert.equal(optionKey(family.find(x=>x.slug===v.slug),'case_size'),v.key,'each size links to a variant of that size');
  assert.equal(size.values[1].slug,pick({case_size:'36-mm',dial:'black',bracelet:'jubilee'}).slug,'36 mm keeps the black dial and Jubilee, which exist there');
  assert.equal(size.values[0].slug,pick({case_size:'31-mm',dial:'silver',bracelet:'jubilee'}).slug,'31 mm has no black dial: the real variant that keeps Jubilee');
  assert.deepEqual(size.values[0].changes.map(c=>[c.kind,c.key]),[['dial','silver']],'the resulting dial is known, to be shown after the change');
  // Size first even when a variant lists its size after its other options.
  const late=build([[['dial','silver'],['case_size','31-mm']],[['dial','silver'],['case_size','36-mm']]]);
  assert.equal(configurator(late,late[0])[0].kind,'case_size');
});

test('a dial or bracelet choice never changes the size, and offers only the values made at the selected size',()=>{
  for(const selected of family){
    const size=optionKey(selected,'case_size');
    const here=family.filter(v=>optionKey(v,'case_size')===size);
    for(const c of configurator(family,selected).filter(c=>!c.size)){
      assert.deepEqual(new Set(keys(c.values)),new Set(here.map(v=>optionKey(v,c.kind))),`${selected.slug} ${c.kind}: exactly the values made at ${size}`);
      for(const v of c.values){
        const target=family.find(x=>x.slug===v.slug);
        assert.equal(optionKey(target,'case_size'),size,`${selected.slug} ${c.kind}=${v.key} keeps the size`);
        assert.equal(optionKey(target,c.kind),v.key);
        assert.ok(!v.changes.some(change=>change.kind==='case_size'));
      }
    }
  }
});

test('values made only in other sizes are listed apart, each with exactly the sizes it is made in',()=>{
  const selected=pick({case_size:'41-mm',dial:'black',bracelet:'jubilee'});
  const dial=control(configurator(family,selected),'dial');
  assert.deepEqual(keys(dial.values),['black','slate']);
  assert.deepEqual(dial.current.key,'black');
  assert.deepEqual(dial.elsewhere.map(v=>[v.key,keys(v.sizes)]),[['silver',['31-mm','36-mm']],['pink',['31-mm','36-mm']],['green',['31-mm']]]);
  for(const v of dial.elsewhere)for(const s of v.sizes){
    const target=family.find(x=>x.slug===s.slug);
    assert.deepEqual([optionKey(target,'dial'),optionKey(target,'case_size')],[v.key,s.key],'each size link opens that value at that size');
  }
  assert.equal(dial.elsewhere[0].sizes[0].slug,pick({case_size:'31-mm',dial:'silver',bracelet:'jubilee'}).slug,'the bracelet is kept where it exists');
  assert.equal(dial.elsewhere[1].sizes[1].slug,pick({case_size:'36-mm',dial:'pink',bracelet:'oyster'}).slug,'pink exists at 36 mm only on Oyster');
  const bracelet=control(configurator(family,pick({case_size:'36-mm',dial:'pink',bracelet:'oyster'})),'bracelet');
  assert.deepEqual([keys(bracelet.values),bracelet.elsewhere],[['jubilee','oyster'],[]],'both bracelets are made at 36 mm');
});

test('a choice that needs another option resolves to a real variant at the same size and names that option',()=>{
  const selected=pick({case_size:'41-mm',dial:'black',bracelet:'jubilee'});
  const controls=configurator(family,selected);
  const slate=control(controls,'dial').values.find(v=>v.key==='slate');
  assert.equal(slate.slug,pick({case_size:'41-mm',dial:'slate',bracelet:'oyster'}).slug);
  assert.deepEqual(slate.changes.map(c=>[c.kind,c.key,c.valueLang]),[['bracelet','oyster','en']]);
  const oyster=control(controls,'bracelet').values.find(v=>v.key==='oyster');
  assert.deepEqual([oyster.slug,oyster.changes],[pick({case_size:'41-mm',dial:'black',bracelet:'oyster'}).slug,[]],'the dial is kept');
});

test('every real variant stays reachable through explicit choices, and every link is an existing variant',()=>{
  const links=selected=>configurator(family,selected).flatMap(c=>[...c.values.map(v=>v.slug),...c.elsewhere.flatMap(v=>v.sizes.map(s=>s.slug))]);
  for(const start of family){
    const seen=new Set([start.slug]),queue=[start];
    while(queue.length){
      for(const slug of links(queue.shift())){
        assert.ok(slugs.has(slug),`${slug} is an existing variant`);
        if(!seen.has(slug)){seen.add(slug);queue.push(family.find(v=>v.slug===slug));}
      }
    }
    assert.equal(seen.size,family.length,`every variant is reachable from ${start.slug}`);
  }
});

test('a value kept in English stays marked in the current value, the choices and the other sizes',()=>{
  const controls=configurator(family,pick({case_size:'31-mm',dial:'green',bracelet:'oyster'}));
  const bracelet=control(controls,'bracelet');
  assert.equal(bracelet.current.valueLang,'en');
  assert.ok(bracelet.values.every(v=>v.valueLang==='en'));
  assert.equal('valueLang' in control(controls,'dial').values[0],false);
});

test('the layout is equal segments for a few short values, a list for long or many values or values in other sizes, text for one',()=>{
  const at41=configurator(family,pick({case_size:'41-mm',dial:'black',bracelet:'jubilee'}));
  assert.deepEqual(at41.map(c=>[c.kind,controlLayout(c,'en'),controlLayout(c,'ar')]),[['case_size','segments','segments'],['dial','list','list'],['bracelet','list','list']]);
  const bag=build([
    [['bag_size','Mini'],['colour','Black']],[['bag_size','Mini'],['colour','Tan']],[['bag_size','Small'],['colour','Black']],[['bag_size','Small'],['colour','Tan']],
    [['bag_size','Small'],['colour','Ghost']],[['bag_size','Small'],['colour','Ochre']],[['bag_size','Medium'],['colour','Black']],[['bag_size','Large'],['colour','Black']],
  ]);
  const layouts=selected=>configurator(bag,selected).map(c=>[c.kind,controlLayout(c,'en')]);
  assert.deepEqual(layouts(bag[0]),[['bag_size','segments'],['colour','list']],'two colours here, two more only in Small: a list with the other sizes');
  assert.deepEqual(layouts(bag[2]),[['bag_size','segments'],['colour','list']],'four colours: a list');
  assert.deepEqual(layouts(bag[7]),[['bag_size','segments'],['colour','list']],'one colour here, others in other sizes: still reachable');
  const twoColours=build([[['colour','Black']],[['colour','Beige']]]);
  assert.deepEqual(configurator(twoColours,twoColours[0]).map(c=>controlLayout(c,'en')),['segments']);
  const fixed=build([[['bag_size','S'],['colour','Black']],[['bag_size','M'],['colour','Black']],[['bag_size','M'],['colour','Navy']],[['bag_size','S'],['colour','Navy']]]);
  assert.deepEqual(configurator(fixed,fixed[0]).map(c=>controlLayout(c,'en')),['segments','segments']);
  const lone=build([[['bag_size','S'],['colour','Black']],[['bag_size','M'],['colour','Black']]]);
  assert.deepEqual(optionKey(lone[0],'colour'),'Black');
  assert.deepEqual(configurator(lone,lone[0]).map(c=>c.kind),['bag_size'],'a colour that never varies is not an option');
  const sparse=build([[['bag_size','S'],['colour','Black']],[['bag_size','M'],['colour','Navy']],[['bag_size','M'],['colour','Black']]]);
  assert.deepEqual(configurator(sparse,sparse[0]).map(c=>[c.kind,controlLayout(c,'en')]),[['bag_size','segments'],['colour','list']]);
  const models=build(['Extra small model','Small model','Medium model','Large model','Extra large model'].map(k=>[['model_size',k]]));
  assert.equal(controlLayout(configurator(models,models[0])[0],'en'),'list','long maker model sizes read as a list');
  const many=build(['28 mm','31 mm','34 mm','36 mm','39 mm','41 mm'].map(k=>[['case_size',k]]));
  assert.equal(controlLayout(configurator(many,many[0])[0],'en'),'list','six sizes do not fit one row at phone width');
});

test('one variant has no options, and a model without a size offers every value as before',()=>{
  const one=build([[['dial','silver']]]);
  assert.deepEqual(configurator(one,one[0]),[]);
  const watch=build([[['dial','silver'],['bracelet','jubilee']],[['dial','silver'],['bracelet','oyster']],[['dial','green'],['bracelet','oyster']]]);
  const controls=configurator(watch,watch[0]);
  assert.deepEqual(controls.map(c=>[c.kind,keys(c.values),c.elsewhere.length]),[['dial',['silver','green'],0],['bracelet',['jubilee','oyster'],0]]);
  const green=control(controls,'dial').values.find(v=>v.key==='green');
  assert.deepEqual([green.slug,green.changes.map(c=>c.key)],[watch[2].slug,['oyster']],'green exists only on Oyster: the real variant, with the change named');
});

test('a 56-variant family stays bounded: seven dials here, eight in other sizes, every link real',()=>{
  const dials=Array.from({length:15},(_,i)=>`d${i}`);
  const madeIn={'31-mm':dials.slice(0,8),'36-mm':['d0',...dials.slice(3,15)],'41-mm':dials.slice(8,15)};
  const rows=Object.entries(madeIn).flatMap(([size,ds])=>ds.flatMap(d=>[[['case_size',size],['dial',d],['bracelet','jubilee']],[['case_size',size],['dial',d],['bracelet','oyster']]]));
  const big=build(rows);
  assert.equal(big.length,56);
  const selected=find(big,{case_size:'41-mm',dial:'d8',bracelet:'oyster'});
  const started=performance.now();
  const controls=configurator(big,selected);
  assert.ok(performance.now()-started<250,'computed well within a request');
  const dial=control(controls,'dial');
  assert.deepEqual([dial.values.length,dial.elsewhere.length],[7,8]);
  assert.deepEqual(dial.elsewhere.map(v=>[v.key,keys(v.sizes)]).slice(0,4),[['d0',['31-mm','36-mm']],['d1',['31-mm']],['d2',['31-mm']],['d3',['31-mm','36-mm']]]);
  const bigSlugs=new Set(big.map(v=>v.slug));
  assert.ok(controls.every(c=>[...c.values,...c.elsewhere.flatMap(v=>v.sizes)].every(v=>bigSlugs.has(v.slug))));
  assert.ok(dial.values.every(v=>optionKey(big.find(x=>x.slug===v.slug),'bracelet')==='oyster'),'the bracelet is kept');
});
