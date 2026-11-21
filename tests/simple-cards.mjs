import {load} from './env.mjs';
const A=await load();const {T,ev,ok,doc}=A;
await T('reset-and-daily-cards',()=>{
 ev("State.meta=freshMeta();State.cards={};studyState().known={'c:你':'2026-11-01'};studyState().verifiedKnown={'c:你':{source:'knowledge-check'}};recallState().entries['好']={familiar:true,days:[]};applyStudyUpdateV42();go('cards')");
 ok(ev('Object.keys(recallState().entries).length')===0,'card progress not reset');ok(ev("studyState().known['c:你']"),'known checks lost');ok(doc.querySelector('select[aria-label="Выбрать урок"]'),'lesson selection missing');
 ev("recallStart('new',['好']);recallIntro();recallReveal();recallGrade(3);recallReveal();recallGrade(3)");
 ok(ev("recallPlan('好').stage")==='wait','learning not finished');ev("todayStr=()=>addDays(recallState().entries['好'].days[0].date,1)");
 ok(ev("recallDue().includes('好')"),'next day review missing');ev("recallStart('today')");
 ok(ev("!recallTasks(recallCurrentSession()).some(x=>x.skill==='write')"),'writing still required');
});
A.finish('simple cards');
