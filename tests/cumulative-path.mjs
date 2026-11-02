// Cumulative review adds genuinely introduced past items, without changing memory.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok}=A;
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null");
const introduce=(keys,S=5,due=864e5)=>ev(`${JSON.stringify(keys)}.forEach(k=>State.cards[k]={state:1,S:${S},D:5,due:Date.now()+${due},last:Date.now()-864e5,reps:2,lapses:0})`);

await T('numbered-node-only-revisits-introduced-earlier-keys',()=>{
  reset(); introduce(['r:1','r:2','r:120']);
  const base=Array.from({length:8},(_,i)=>'r:'+(37+i));
  ev(`window.__base=${JSON.stringify(base)}; window.__before=JSON.stringify({cards:State.cards,meta:State.meta}); window.__q=withLearnedReview(window.__base,{kind:'keys',keyMax:214})`);
  const q=ev('window.__q'); ok(q.length===10,'not bounded to two old keys');
  ok(q.slice(0,2).every(k=>['r:1','r:2'].includes(k)),'later or unknown key leaked into review');
  ok(q.slice(2).join()===base.join(),'fresh key order changed');
  ok(ev('window.__before===JSON.stringify({cards:State.cards,meta:State.meta})'),'planner changed progress or rotation');
});

await T('no-injection-into-review-only-or-writing-sessions',()=>{
  reset(); introduce(['r:1','r:2','r:37']);
  ok(ev("withLearnedReview(['r:37']).join(',')")==='r:37','a review-only round grew');
  ok(ev("withLearnedReview(['wr:你']).join(',')")==='wr:你','a writing session grew');
  ok(ev("withLearnedReview(['r:38'],{limit:0}).join(',')")==='r:38','zero review limit ignored');
});

await T('due-items-first-and-early-practice-rotates-without-rescheduling',()=>{
  reset(); introduce(['r:1','r:2','r:3','r:4']);
  ev("State.cards['r:4'].due=Date.now()-1; window.__q=withLearnedReview(['r:37']);");
  ok(ev("window.__q[0]")==='r:4','due item not prioritised');
  ev("State.cards['r:4'].due=Date.now()+864e5; window.__first=withLearnedReview(['r:37']).slice(0,2); window.__before=JSON.stringify(State.cards); window.__first.forEach(markLearnedPractice); window.__second=withLearnedReview(['r:37']).slice(0,2)");
  ok(ev('window.__second.every(k=>!window.__first.includes(k))'),'same old pair repeats every session');
  ok(ev('window.__before===JSON.stringify(State.cards)'),'practice rotation changed FSRS');
  ev("markLearnedPractice('r:120')");
  ok(!ev("State.meta.learnedPractice['r:120']"),'unintroduced key acquired practice progress');
});

await T('word-review-stays-within-current-lessons-and-kind',()=>{
  reset(); const old=ev('lessonKeys(1).slice(0,3)'), later=ev('lessonKeys(30)[0]'), base=ev('lessonKeys(18).slice(0,3)');
  introduce([...old,later,'r:1']);
  ev(`window.__q=withLearnedReview(${JSON.stringify(base)},{kind:'words'})`);
  ok(ev('window.__q.length')===base.length+2,'missing word warmup');
  ok(ev(`window.__q.slice(0,2).every(k=>${JSON.stringify(old)}.includes(k))`),'wrong kind or later lesson leaked');
  ok(ev(`window.__q.slice(2).join(',')`)===base.join(','),'fresh word order changed');
});
await T('actual-failures-downgrade-exact-skill-without-writing-by-recognition',()=>{
  reset();
  ev("MEMORY_SKILLS.forEach(sk=>memoryRecordSkill('你',sk,3)); recordGameMemoryFailure({t:'pinyin',k:'你'})");
  ok(ev("memoryState().entries['你'].skills.py.grade")===1,'pinyin failure left confidence intact');
  ok(ev("memoryState().entries['你'].skills.hz.grade")===3,'pinyin failure changed writing');
  ev("recordGameMemoryFailure({t:'produce',k:'你'})");
  ok(ev("memoryState().entries['你'].skills.hz.grade")===3,'recognition choice treated as writing');
  ev("recordGameMemoryFailure({t:'wmem',k:'wr:你'})");
  ok(ev("memoryState().entries['你'].skills.hz.grade")===1,'exact single-character writing failure ignored');
  ev("memoryEnroll('老师'); recordGameMemoryFailure({t:'wmem',k:'wr:老'}); recordGameMemoryFailure({t:'keyname',k:'r:38',ungraded:1})");
  ok(!ev("memoryState().entries['老师'].skills.hz"),'one character downgraded unrelated whole word');
  ok(!ev("memoryState().entries['r:38']"),'ungraded question enrolled a key');
  ev("recordGameMemoryFailure({t:'wmem',k:'wr:r:38'})");
  ok(ev("memoryState().entries['r:38'].skills.hz.grade")===1,'radical writing failure ignored');
});
A.finish('cumulative path: old + new, exact radical bounds, pure scheduling and rotation');
