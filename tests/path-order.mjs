// Regression: numbered ranges must contain precisely those radicals, never frequency-ranked replacements.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,txt,doc}=A;
const reset=()=>ev('State.cards={}; State.meta=freshMeta(); PLAY=null; UNITS=null');
await T('all-214-numerical',()=>{
  const expected=Array.from({length:214},(_,i)=>i+1).join();
  ok(ev('KEY_ORDER.join()')===expected,'numeric deck 1–214');
  ok(ev('KEY_UNITS.flat().join()')===expected,'each key exactly once in the path');
  const nodes=ev("pathUnits().filter(u=>u.sec==='keys').flatMap(u=>u.nodes.filter(n=>n.type==='learn').map(n=>({title:n.title,nums:n.items.map(radNum)})))");
  for(const node of nodes){
    const ns=node.nums, first=ns[0], last=ns[ns.length-1];
    ok(node.title==='Ключи '+(first===last?first:first+'–'+last),'label derived from actual keys: '+node.title);
    ok(ns.every((n,i)=>n===first+i),'consecutive keys: '+node.title);
    if(first<=44&&last>=37) ok(!ns.includes(120),'no №120 in a range near 37–44');
  }
});
await T('node-intros-stay-in-range-and-order',()=>{
  reset();
  const n=ev("pathUnits().filter(u=>u.sec==='keys').flatMap(u=>u.nodes).find(n=>n.type==='learn'&&n.items.includes('r:37'))");
  ev(`(()=>{ const n=${JSON.stringify(n)}, u=pathUnits().find(u=>u.nodes.some(x=>x.id===n.id)); openNode(u,n,'avail'); })()`);
  const tasks=ev('[PLAY.cur].concat(PLAY.queue)');
  ok(tasks.every(t=>n.items.includes(t.k)),'only radicals from selected node');
  ok(tasks.filter(t=>t.t==='rintro').map(t=>t.n).join()===n.items.map(k=>+k.slice(2)).join(),'introductions in numeric order');
});
await T('existing-progress-kept-and-next-new-key-sequential',()=>{
  reset(); ev("State.cards['r:120']=FSRS.review({},3,REQ); State.cards['r:1']=FSRS.review({},3,REQ)");
  ok(ev("newKeysToday()[0]")==='r:2','next unseen is №2, learned №120 retained');
  ok(!ev("isNew('r:120')"),'existing key card preserved');
  ev("go('keys',{scope:'learned'})");
  ok(doc.querySelectorAll('#screen .rc').length===2,'in-progress filter');
  ok(!/сначала частые/.test(txt()),'copy matches numeric ordering');
});
await T('jump-does-not-mark-unseen-or-unanswered-mastered',()=>{
  reset(); ev("jumpStart(pathUnits().find(u=>u.id==='L30'))");
  const tested=ev('Object.keys(PLAY.items)'), all=ev('PLAY.opts.jump.items');
  ok(all.length>tested.length,'test includes unseen keys outside sample');
  ev('Object.values(PLAY.items).slice(0,10).forEach(it=>it.left=0); PLAY.first=10; PLAY.firstOk=10; jumpFinish()');
  ok(ev('Object.keys(State.cards).length')===10,'only actually answered sample items receive cards');
  ok(ev('PLAY.opts.jump.items.filter(isNew).length')===all.length-10,'others still new');
  ok(ev('!!State.meta.jumps.L30'),'unlock allows user to continue');
});
A.finish('numeric radical path and honest jump progress');
