// Cumulative learning uses saved mastery; previews and early practice never fake it.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,doc}=A;
ev("window.__cmNow=Date.now(); Date.now=()=>window.__cmNow");
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null");
const known=()=>ev(`window.__oldWords=semWords().slice(0,37); window.__oldKeys=Array.from({length:47},(_,n)=>'r:'+(n+1)); window.__oldWords.concat(window.__oldKeys).forEach((k,n)=>{ State.cards[k]={S:7+n,D:5,state:1,reps:3,lapses:0,last:Date.now()-864e5,due:Date.now()+864e5*(2+n)}; });`);
const facetKnown=(ks,due=false)=>ev(`${JSON.stringify(ks)}.forEach(k=>{ const e=memoryEnroll(k,{priorLearned:true}); MEMORY_SKILLS.forEach(sk=>e.skills[sk]={grade:3,day:addDays(todayStr(),-2),card:{S:25,D:5,state:1,reps:4,lapses:0,last:Date.now()-864e5,due:Date.now()${due?'-':'+'}864e5}}); });`);
const complete=()=>ev("{ let g=0; while(memoryState().session.index<memoryState().session.tasks.length&&g++<100){ memoryState().session.reveal=true; memoryGrade(3); } }");
await T('legacy37words47keys-plan-pure-no-migration',()=>{
  reset(); known(); ev("window.__cmCards=JSON.stringify(State.cards); window.__cmMeta=JSON.stringify(State.meta); window.__cmPlan=memoryPlan()");
  ok(ev("JSON.stringify(State.cards)===window.__cmCards"),'preview altered main stability');
  ok(ev("JSON.stringify(State.meta)===window.__cmMeta"),'preview enrolled or migrated cards');
  ok(ev("window.__cmPlan.oldCount")===84,'37 learned words+47 learned radicals not eligible');
  ok(ev("window.__cmPlan.freshKeys.length")===1,'large review backlog must reduce fresh to1, not0');
  ok(ev("window.__cmPlan.dueKeys.length")===4,'portion not bounded5');
  ok(ev("window.__cmPlan.dueKeys.some(isRad)&&window.__cmPlan.dueKeys.some(k=>!isRad(k))"),'old words/radicals not balanced');
  ev("memoryStart()");
  ok(ev("Object.keys(memoryState().entries).length")===5,'legacy pool was all enrolled');
  ok(ev("JSON.stringify(State.cards)===window.__cmCards"),'start altered old mastery before answers');
  ok(ev("memoryState().session.plan.dueKeys.every(k=>memoryState().entries[k].priorLearned&&memoryState().entries[k].days.length===0)"),'lazy old entries fake three days');
  ok(ev("memoryState().session.tasks.slice(0,5).every(t=>t.skill==='hz')"),'skills are grouped by sign, not interleaved across signs');
});
await T('unknown-never-old-and-fresh-obeys-quotas',()=>{
  reset(); ev("semWords().slice(0,20).forEach(memoryEnroll); window.__cmP=memoryPlan()");
  ok(ev("window.__cmP.oldCount")===0,'empty unknown entries treated as learned reviews');
  ok(ev("window.__cmP.dueKeys.length")===0,'unknown vocabulary migrated to review');
  ok(ev("window.__cmP.freshKeys.every(k=>isNew(k)&&!memoryState().entries[k])"),'fresh overlaps enrolled or learned');
  ev("D().new=99999; D().keys=99999; window.__cmP=memoryPlan()");
  ok(ev("window.__cmP.freshKeys.length")===0,'exhausted daily quota ignored');
});
await T('normal-round-two-fresh-three-old-numbered-radical',()=>{
  reset(); ev("window.__cmOld=semWords().slice(0,2).concat(['r:1']); window.__cmOld.forEach(k=>State.cards[k]=FSRS.review({},3,REQ))");
  facetKnown(ev("window.__cmOld"),true); ev("window.__cmP=memoryPlan()");
  ok(ev("window.__cmP.freshKeys.length")===2,'normal mixed round missing2 fresh');
  ok(ev("window.__cmP.dueKeys.length")===3,'normal mixed round missing3 old');
  ok(ev("window.__cmP.freshKeys.filter(isRad).join(',')")==='r:2','new radicals not numeric sequential');
});
await T('old-skips-intro-and-no-forced-three-days',()=>{
  reset(); ev("State.cards[semWords()[0]]=FSRS.review({},3,REQ); memoryStart(); window.__cmK=memoryState().session.plan.dueKeys[0]; window.__cmSS=memoryState().session; window.__cmSS.index=window.__cmSS.tasks.findIndex(t=>t.k===window.__cmK); go('memory')");
  ok(!/Закрыть образец/.test(doc.getElementById('screen').textContent),'learned old sign shown sample instead of recall');
  ok(ev("memoryState().entries[window.__cmK].priorLearned"),'known selected card not priorLearned');
  complete();
  ev("window.__cmE=memoryState().entries[window.__cmK]; window.__cmE.skills.hz.card.due=Date.now()+20*864e5; window.__cmE.skills.py.card.due=Date.now()+20*864e5; window.__cmE.skills.ru.card.due=Date.now()+20*864e5");
  ok(ev("memoryDueSkills(window.__cmE).length")===0,'old signs forced into new3day program');
});
await T('early-maintenance-rotates-and-does-not-inflate-fsrs',()=>{
  reset(); ev("window.__cmOld=semWords().slice(0,3); window.__cmOld.forEach(k=>State.cards[k]=FSRS.review({},3,REQ))"); facetKnown(ev("window.__cmOld"));
  ev("D().new=99999; D().keys=99999; window.__cmP=memoryPlan(); window.__cmCards=JSON.stringify(State.cards); window.__cmFacets=JSON.stringify(Object.fromEntries(window.__cmOld.map(k=>[k,Object.fromEntries(MEMORY_SKILLS.map(sk=>[sk,memoryState().entries[k].skills[sk].card]))]))); memoryStart(); window.__cmFirst=memoryState().session.plan.maintenanceKeys[0]");
  ok(ev("memoryState().session.plan.maintenanceKeys.length")===1,'more than1 non-due early sign');
  complete();
  ok(ev("JSON.stringify(State.cards)===window.__cmCards"),'early success boosted baseFSRS');
  ok(ev("JSON.stringify(Object.fromEntries(window.__cmOld.map(k=>[k,Object.fromEntries(MEMORY_SKILLS.map(sk=>[sk,memoryState().entries[k].skills[sk].card]))])))===window.__cmFacets"),'early success boosted facetFSRS');
  ev("window.__cmP2=memoryPlan()");
  ok(ev("window.__cmP2.maintenanceKeys[0]!==window.__cmFirst"),'same early sign repeated in every round');
});
await T('due-base-rescheduled-once-after-all-facets-conservatively',()=>{
  reset(); ev("window.__cmK=semWords()[0]; State.cards[window.__cmK]=FSRS.review({},3,REQ); State.cards[window.__cmK].due=Date.now()-1"); facetKnown(ev("[window.__cmK]"));
  ev("D().new=99999; D().keys=99999; window.__cmBefore=JSON.stringify(State.cards[window.__cmK]); memoryStart(); window.__cmSS=memoryState().session; window.__cmSS.reveal=true; memoryGrade(3)");
  ok(ev("JSON.stringify(State.cards[window.__cmK])===window.__cmBefore"),'base rescheduled before all skills');
  ev("window.__cmSS.reveal=true; memoryGrade(2); window.__cmSS.reveal=true; memoryGrade(3)");
  ok(ev("State.cards[window.__cmK].due>Date.now()"),'base stayed permanently due');
  ok(ev("State.cards[window.__cmK].reps")===2,'base reviewed more than once');
  ok(ev("memoryState().entries[window.__cmK].baseReviewedDay===todayStr()"),'missing base-review guard');
});
await T('scheduled-again-returns-after-seven-minutes-without-early-boost',()=>{
  reset(); ev("window.__cmK=semWords()[0]; State.cards[window.__cmK]=FSRS.review({},3,REQ); State.cards[window.__cmK].due=Date.now()-1"); facetKnown(ev("[window.__cmK]"));
  ev("D().new=99999; D().keys=99999; memoryStart(); window.__cmSS=memoryState().session; window.__cmSS.reveal=true; memoryGrade(1); window.__cmSS.reveal=true; memoryGrade(3); window.__cmSS.reveal=true; memoryGrade(3); window.__cmFailCard=JSON.stringify(memoryState().entries[window.__cmK].skills.hz.card); window.__cmBaseReps=State.cards[window.__cmK].reps; window.__cmFailSkillReps=memoryState().entries[window.__cmK].skills.hz.card.reps");
  ok(ev("memoryDueSkills(memoryState().entries[window.__cmK]).length")===0,'failed skill returned immediately before six-minute interval');
  ok(!ev("memoryBaseDue(window.__cmK,memoryState().entries[window.__cmK])"),'base returned immediately before six-minute interval');
  ev("memoryRecordSkill(window.__cmK,'hz',3)");
  ok(ev("JSON.stringify(memoryState().entries[window.__cmK].skills.hz.card)===window.__cmFailCard"),'early correction inflated stability');
  ev("window.__cmNow+=7*60e3");
  ok(ev("memoryDueSkills(memoryState().entries[window.__cmK]).join(',')")==='hz','same-day due failed skill did not return after seven minutes');
  ok(ev("memoryBaseDue(window.__cmK,memoryState().entries[window.__cmK])"),'same-day actual due base remained blocked');
  ev("memoryState().session=null; memoryStart(); window.__cmSS=memoryState().session; window.__cmSS.reveal=true; memoryGrade(3); window.__cmSS.reveal=true; memoryGrade(3); window.__cmSS.reveal=true; memoryGrade(3)");
  ok(ev("State.cards[window.__cmK].reps===window.__cmBaseReps+1"),'same-day scheduled base not reviewed once');
  ok(ev("memoryState().entries[window.__cmK].skills.hz.card.reps===window.__cmFailSkillReps+1"),'scheduled skill success did not count as real second review');
  ok(ev("memoryState().entries[window.__cmK].skills.hz.card.due>Date.now()"),'scheduled skill stayed overdue after real success');
});
await T('first-three-days-remain-one-row-per-calendar-day',()=>{
  reset(); ev("window.__cmK=semWords()[0]; memoryEnroll(window.__cmK); memoryRecordSkill(window.__cmK,'hz',1); memoryRecordSkill(window.__cmK,'py',3); memoryRecordSkill(window.__cmK,'ru',3); window.__cmNow+=7*60e3");
  ok(ev("memoryDueSkills(memoryState().entries[window.__cmK]).length")===0,'first-day row repeated as another scheduled row that day');
  ev("window.__cmNow+=5*60e3");
  ok(!ev("memoryPlan().maintenanceKeys.includes(window.__cmK)"),'first3day item slipped into an early maintenance row that same day');
  ev("memoryState().entries[window.__cmK].days=[addDays(todayStr(),-2),addDays(todayStr(),-1),todayStr()]");
  ok(ev("memoryDueSkills(memoryState().entries[window.__cmK]).join(',')")==='hz','post-three-day skills still blocked by calendar-day guard');
});
await T('fresh-path-keeps-three-day-program',()=>{
  reset(); ev("window.__cmK=semWords()[0]; State.cards[window.__cmK]=FSRS.review({},3,REQ); memoryEnroll(window.__cmK,{fresh:true}); memoryStart(); window.__cmSS=memoryState().session; window.__cmSS.index=window.__cmSS.tasks.findIndex(t=>t.k===window.__cmK); go('memory')");
  ok(!ev("memoryState().entries[window.__cmK].priorLearned"),'fresh path card treated as legacy prior mastery');
  ok(/Закрыть образец/.test(doc.getElementById('screen').textContent),'fresh path card lost initial study');
});
await T('last-error-retry-after-three-other-tasks-no-infinite-loop',()=>{
  reset(); ev("memoryStart(); window.__cmSS=memoryState().session; window.__cmSS.index=window.__cmSS.tasks.length-1; window.__cmAt=window.__cmSS.index; window.__cmBad=window.__cmSS.tasks[window.__cmAt].k; window.__cmSS.reveal=true; memoryGrade(1)");
  ok(ev("window.__cmSS.tasks.slice(window.__cmAt+1,-1).filter(t=>t.k!==window.__cmBad).length")>=3,'last error repeated immediately');
  ok(ev("window.__cmSS.tasks[window.__cmSS.tasks.length-1].retry"),'no delayed correction');
  ev("window.__cmSS.index=window.__cmSS.tasks.length-1; window.__cmLength=window.__cmSS.tasks.length; window.__cmSS.reveal=true; memoryGrade(1)");
  ok(ev("window.__cmSS.tasks.length===window.__cmLength"),'retry loops endlessly');
});
A.finish('cumulative-memory');
