// One full-screen writing attempt at a time, ten independently for Hanzi and pinyin.
import {load} from './env.mjs';
const A=await load({before(w){
  w.CanvasRenderingContext2D=function(){};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(target,key)=>key==='measureText'?()=>({width:0}):typeof key==='string'?()=>{}:undefined,set:(target,key,value)=>(target[key]=value,true)});
}});
const {T,ev,ok,doc}=A;
ev("window.__tenDate='2026-11-09'; todayStr=()=>window.__tenDate");
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); State.route={name:'path'}; window.__tenDate='2026-11-09'");
const ink=(k,skill,n=1)=>ev(`notebookRow(${JSON.stringify(k)},0,true)[${JSON.stringify(skill)}].currentInk=[[[0.1,0.1],[0.2,${n/20}]]]`);
const finish=(k,skill)=>ev(`notebookFinishAttempt(${JSON.stringify(k)},${JSON.stringify(skill)})`);

await T('ten-separate-attempts-require-new-ink',()=>{
  reset();
  ok(!finish('你','hz'),'empty attempt accepted');
  ok(ev("notebookCount('你','hz',0)")===0,'empty attempt increased counter');
  for(let i=1;i<=9;i++){
    ink('你','hz',i);ok(finish('你','hz'),'attempt '+i+' not accepted');
    ok(ev("notebookCount('你','hz',0)")===i,'wrong Hanzi counter '+i);
    ok(!ev("notebookRow('你',0,false).hz.done"),'completed before ten attempts');
    ok(ev("notebookCount('你','py',0)")===0,'Hanzi attempt changed pinyin');
    ok(!finish('你','hz'),'double tap reused the previous ink');
  }
  ink('你','hz',10);ok(finish('你','hz'),'tenth attempt rejected');
  ok(ev("notebookCount('你','hz',0)")===10,'tenth attempt not counted');
  ok(ev("notebookRow('你',0,false).hz.done"),'ten Hanzi attempts not complete');
  ok(ev("notebookRow('你',0,false).hz.source")==='screen','screen source lost');
  ok(ev("notebookRow('你',0,false).hz.attempts.length")===10,'saved attempts missing');
  ok(ev("notebookStatus('你').complete")===0,'Hanzi alone closed the day');
  ok(ev("notebookStatus('你').active")===0,'unfinished pinyin skipped');
  ok(!finish('你','hz'),'eleventh attempt accepted');
});
await T('ten-pinyin-attempts-close-only-todays-pair',()=>{
  for(let i=1;i<=10;i++){ink('你','py',i);ok(finish('你','py'),'pinyin attempt '+i+' rejected');}
  ok(ev("notebookCount('你','py',0)")===10,'pinyin did not reach ten');
  ok(ev("notebookStatus('你').complete")===1,'two sets of ten did not finish day1');
  ok(ev("notebookStatus('你').active")===null,'day2 opened on day1');
  ok(!finish('你','py'),'today completion accidentally filled next day');
  ok(ev("Object.keys(State.cards).length")===0,'ten writes falsely granted vocabulary knowledge');
  ok(ev("Object.keys(memoryState().entries['你'].skills).length")===0,'ten writes awarded memory facet grades');
  ev("window.__tenDate='2026-11-10'");
  ok(ev("notebookStatus('你').active")===1,'next calendar day did not unlock');
  ok(ev("notebookCount('你','hz',1)")===0&&ev("notebookCount('你','py',1)")===0,'next day inherited previous counters');
});
await T('paper-record-is-distinct-and-never-awards-fsrs-or-xp',()=>{
  reset();ev("window.__tenCards=JSON.stringify(State.cards); window.__tenDaily=JSON.stringify(State.meta.daily)");
  ok(ev("notebookMark('r:85','hz','paper')"),'paper mark rejected');
  ok(ev("notebookCount('r:85','hz',0)")===10,'paper set not accounted for');
  ok(ev("notebookRow('r:85',0,false).hz.source")==='paper','paper source missing');
  ok(ev("notebookCount('r:85','py',0)")===0,'paper Hanzi also marked pinyin');
  ok(ev("notebookInfo('r:85').hz.includes('氵')"),'radical form lost');
  ok(ev("JSON.stringify(State.cards)===window.__tenCards"),'paper mark changed cards');
  ok(ev("JSON.stringify(State.meta.daily)===window.__tenDaily"),'paper mark changed accuracy or XP');
});
await T('unfinished-ink-and-counters-survive-reload',()=>{
  reset();
  for(let i=1;i<=3;i++){ink('汉语','hz',i);finish('汉语','hz');}
  for(let i=1;i<=2;i++){ink('汉语','py',i);finish('汉语','py');}
  ink('汉语','py',7);
  ev("window.__tenSaved=JSON.stringify(memoryState()); State.meta.memory=JSON.parse(window.__tenSaved)");
  ok(ev("notebookCount('汉语','hz',0)")===3&&ev("notebookCount('汉语','py',0)")===2,'partial counters lost');
  ok(ev("notebookCurrentInk('汉语','py',0).length")===1,'current unsent attempt lost');
  ok(ev("notebookRow('汉语',0,false).hz.attempts[0].strokes")===1,'completed attempt metadata lost');
  ok(ev("Number.isFinite(notebookRow('汉语',0,false).hz.attempts[0].at)"),'completion timestamp lost');
  ok(finish('汉语','py'),'resumed pending attempt could not finish');
  ok(ev("notebookCount('汉语','py',0)")===3,'pending attempt counted twice or not counted');
});
await T('legacy-completed-and-unfinished-writing-preserved',()=>{
  reset();ev("memoryEnroll('你').notebook={v:1,days:[{date:'2026-11-08',hz:{done:true,source:'screen',date:'2026-11-08',ink:[[[0.1,0.1],[0.2,0.2]]]},py:{done:true,source:'paper',date:'2026-11-08',ink:[]}}]}");
  ok(ev("notebookCount('你','hz',0)")===10&&ev("notebookCount('你','py',0)")===10,'old completed row was reset');
  ok(ev("notebookStatus('你').complete")===1&&ev("notebookStatus('你').active")===1,'legacy calendar progress lost');
  ev("memoryEnroll('好').notebook={v:1,days:[{date:todayStr(),hz:{ink:[[[0.1,0.1],[0.2,0.2]]]},py:{ink:[]}}]}");
  ok(ev("notebookCount('好','hz',0)")===0,'unfinished old ink counted as finished attempts');
  ok(ev("notebookCurrentInk('好','hz',0).length")===1,'unfinished legacy ink lost');
  ok(finish('好','hz'),'legacy pending attempt could not be accepted');
  ok(ev("notebookCount('好','hz',0)")===1,'legacy pending ink did not become exactly one attempt');
});
await T('practice-mode-has-one-pad-and-no-row-collection',()=>{
  reset();ev("go('notebook',{k:'你',practice:true,skill:'hz'})");
  ok(doc.querySelectorAll('#screen canvas').length===1,'practice screen does not contain exactly one writing pad');
  ok(doc.querySelectorAll('#screen .notebook-day').length===0,'practice still shows three row sheets');
  ok(!ev("notebookRow('你',0,false)?.hz?.done"),'opening fullscreen completed practice');
});
A.finish('notebook ten: counters, new ink, pinyin, legacy progress, reload and no false mastery');
