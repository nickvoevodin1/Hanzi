// One 30-lesson course, preserving existing knowledge and exact radical order.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,doc}=A;
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; UNITS=null; Object.keys(PATH_OPEN).forEach(k=>delete PATH_OPEN[k]); window.__courseGrammarDone=false");
// Keep grammar completion controllable without giving new topics false mastery.
ev("window.__courseOriginalDone=typeof grammarTopicDone==='function'?grammarTopicDone:null; grammarTopicDone=()=>window.__courseGrammarDone");
const learn=ks=>ev(`${JSON.stringify(ks)}.forEach(k=>State.cards[k]=FSRS.review({},3,REQ))`);
await T('one-course-all-214-once-in-order',()=>{
  reset(); const units=ev('courseUnits()');
  ok(units.length===30&&units.every((u,i)=>u.course&&u.L===i+1),'not a single30lesson course');
  const nums=units.flatMap(u=>u.radicals.map(k=>+k.slice(2)));
  ok(nums.join()===Array.from({length:214},(_,i)=>i+1).join(),'all214radicals not numeric/exactly once');
  for(const u of units){
    const keyNodes=u.nodes.filter(n=>n.type==='learn'&&n.items.every(k=>k.startsWith('r:')));
    ok(keyNodes.flatMap(n=>n.items).join()===u.radicals.join(),'assigned key absent from learning nodes');
    ok(keyNodes.every(n=>n.items.length<=4),'key portion too large');
    ok(u.radicals.every(k=>u.nodes.find(n=>n.type==='review').items.includes(k)),'lesson review omitted learned radicals');
    for(const n of keyNodes){ const wr=u.nodes.find(x=>x.after===n.id); ok(wr&&wr.items.join()===n.items.map(k=>'wr:'+k).join(),'writing does not match learned keys'); }
  }
  ok(ev('pathUnits().length')===41,'legacy node catalogue lost');
});
await T('old-word-and-writing-ids-kept-no-progress-mutation',()=>{
  reset(); learn(ev("lessonKeys(1).slice(0,2).concat(['r:120','wr:你'])")); ev('window.__courseBefore=JSON.stringify(State.cards)');
  const units=ev('courseUnits()');
  for(const u of units){
    const old=ev(`pathUnits().find(x=>x.id==='L${u.L}').nodes.map(n=>n.id)`);
    ok(old.every(id=>u.nodes.some(n=>n.id===id)),'old node IDs lost in lesson '+u.L);
  }
  ok(ev('JSON.stringify(State.cards)===window.__courseBefore'),'building course altered knowledge');
});
await T('grammar-topics-integrated-and-not-passed-on-word-progress',()=>{
  reset(); const u=ev("courseUnits().find(u=>u.nodes.some(n=>n.type==='grammar'))");
  ok(u,'no grammar integrated');
  const source=ev(`GRAMMAR.topics.filter(t=>+t.lesson===${u.L}).map(t=>t.id)`);
  ok(u.nodes.filter(n=>n.type==='grammar').map(n=>n.topicId).join()===source.join(),'wrong grammar assignment');
  learn(u.nodes.filter(n=>['learn','chars','write'].includes(n.type)).flatMap(n=>n.items));
  ok(!ev(`unitComplete(courseUnits().find(u=>u.L===${u.L}))`),'known words falsely passed new grammar');
  ev('window.__courseGrammarDone=true');
  ok(ev(`unitComplete(courseUnits().find(u=>u.L===${u.L}))`),'completed learning+writing+grammar not counted');
});
await T('legacy-word-access-preserved-without-fake-new-mastery',()=>{
  reset(); learn(ev('lessonKeys(1)'));
  ok(ev('unitOpen(courseUnits()[1],1,courseUnits())'),'adding keys/grammar relocked next old lesson');
  ok(!ev('unitComplete(courseUnits()[0])'),'new requirements automatically granted');
  learn(ev('lessonKeys(20).slice(0,1)'));
  ok(ev('unitOpen(courseUnits()[19],19,courseUnits())'),'existing current class lesson relocked');
  ev("State.cards['r:200']=FSRS.review({},3,REQ)");
  ok(!ev('unitOpen(courseUnits()[27],27,courseUnits())'),'independent known far radical unlocked unrelated future lesson');
});
await T('course-key-introductions-scoped-numerical-with-old-key-review',()=>{
  reset(); learn(['r:1','r:2','r:120']);
  const pair=ev("(()=>{ const u=courseUnits().find(u=>u.radicals.includes('r:37')); return {u,n:u.nodes.find(n=>n.type==='learn'&&n.items.includes('r:37'))}; })()");
  ev(`openNode(${JSON.stringify(pair.u)},${JSON.stringify(pair.n)},'avail')`);
  const tasks=ev('[PLAY.cur].concat(PLAY.queue)');
  ok(!tasks.some(t=>t.k==='r:120'),'later120 leaked into numbered course node');
  ok(tasks.filter(t=>t.t==='rintro').map(t=>t.k).join()===pair.n.items.join(),'new key order changed');
  ok(tasks.filter(t=>!pair.n.items.includes(t.k)).every(t=>['r:1','r:2'].includes(t.k)),'unknown radical inserted as old review');
});
await T('grammar-node-launch-and-one-primary-path',()=>{
  reset(); const pair=ev("(()=>{ const u=courseUnits().find(u=>u.nodes.some(n=>n.type==='grammar')); return {u,n:u.nodes.find(n=>n.type==='grammar')}; })()");
  ev("window.__courseStartGrammar=startGrammar; startGrammar=(ids,opts)=>window.__courseLaunch={ids,opts}");
  ev(`openNode(${JSON.stringify(pair.u)},${JSON.stringify(pair.n)},'avail')`);
  ok(ev('window.__courseLaunch.ids[0]')===pair.n.topicId,'grammar node wrong topic');
  ok(ev('window.__courseLaunch.opts.node')===pair.n.id,'grammar node progress ID absent');
  ev("startGrammar=window.__courseStartGrammar; go('path')");
  ok(doc.querySelectorAll('.course-path > .section').length===1,'separate key and word paths still visible');
  ok(/Китайский как на парах · уроки 1–30/.test(doc.querySelector('.course-path').textContent),'classroom course heading missing');
  ok(!/Ключи · все 214/.test(doc.querySelector('.course-path').textContent),'old separate radical path visible');
  ok(doc.querySelector('.pnode.cur .nodeface .nring'),'centered node ring structure lost');
});
await T('classroom-blocks-cover-all-lessons-in-three-or-four',()=>{
  reset();
  for(const width of [3,4]){
    const blocks=ev(`courseClassUnits(${width})`);
    ok(blocks.length===Math.ceil(30/width),'wrong block count');
    ok(blocks.flatMap(b=>b.lessons).join()===Array.from({length:30},(_,i)=>i+1).join(),'book lesson omitted or duplicated');
    ok(blocks.flatMap(b=>b.radicals).join()===ev("KEY_ORDER.map(n=>'r:'+n).join()"),'numeric radical allocation changed in class blocks');
    for(const b of blocks){
      ok(b.nodes.map(n=>n.stage).join()==='dialogue,vocab,translation,decomp,listening,quiz','wrong classroom stage order');
      ok(b.nodes.every(n=>n.blockId===b.blockId&&n.lessons.join()===b.lessons.join()),'stage scope differs from block');
    }
  }
  ev("State.meta.classroom={blockSize:4}; window.__classCards=JSON.stringify(State.cards)");
  ok(ev('courseClassUnits()[0].lessons.join()')==='1,2,3,4','saved width4 ignored');
  ev('courseClassUnits()'); ok(ev('JSON.stringify(State.cards)===window.__classCards'),'class planning changed mastery');
});
await T('classroom-stage-launch-is-free-and-progress-is-verified',()=>{
  reset();
  ev("window.__classOriginalDone=typeof classroomStageDone==='function'?classroomStageDone:null; window.__classDone=false; classroomStageDone=()=>window.__classDone; window.__classOriginalStart=typeof startClassroom==='function'?startClassroom:null; startClassroom=c=>window.__classLaunch=c");
  const block=ev('courseClassUnits()[5]');
  ok(ev('unitOpen(courseClassUnits()[5],5,courseClassUnits())'),'class lessons should be selectable for current teacher class');
  for(const n of block.nodes){
    ok(ev(`nodeState(${JSON.stringify(block)},${JSON.stringify(n)},true)`) ==='avail','later classroom stage unnecessarily locked');
  }
  learn(block.wordItems.concat(block.radicals));
  ok(!ev(`unitComplete(${JSON.stringify(block)})`),'old words faked all classroom stages complete');
  ev(`openNode(${JSON.stringify(block)},${JSON.stringify(block.nodes[4])},'avail')`);
  ok(ev('window.__classLaunch.stage')==='listening'&&ev('window.__classLaunch.lessons.join()')===block.lessons.join(),'wrong listening scope');
  ev('window.__classDone=true');
  ok(ev(`courseClassStageStats(${JSON.stringify(block)}).done`)===6,'verified stage completion ignored');
  ev('classroomStageDone=window.__classOriginalDone; startClassroom=window.__classOriginalStart');
});
A.finish('course: ordered214 keys, stable old progress and six-stage classroom blocks');
