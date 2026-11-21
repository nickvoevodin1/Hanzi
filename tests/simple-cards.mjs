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
await T('textbook-words-and-known-components',()=>{
 ev("todayStr=()=> '2026-11-21';State.route={name:'path'};State.meta=freshMeta();recallState().lessons=[20];studyState().known={'c:参':todayStr(),'c:加':todayStr()};studyState().verifiedKnown={'c:参':{},'c:加':{}};applyStudyUpdateV43()");
 ok(ev("recallPool().includes('参加')"),'word excluded because characters are known');
 ok(ev("recallPool().every(k=>lessonWords(20).some(w=>w.key===k))"),'non-textbook words in lesson cards');
 ok(!ev("recallPool().some(k=>isRad(k)||k.startsWith('c:'))"),'standalone radicals or characters in word list');
 ok(ev("notebookInfo('参加').py").includes('cān'),'pinyin missing');
 for(let L=1;L<=30;L++)ok(ev(`(recallState().lessons=[${L}],recallPool().every(k=>lessonWords(${L}).some(w=>w.key===k)))`),'outside lesson '+L);
});
A.finish('simple cards');
