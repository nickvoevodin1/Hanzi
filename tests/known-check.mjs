import {load} from './env.mjs';
const A=await load();const {T,ev,ok,doc}=A;
const reset=()=>ev("State.meta=freshMeta();State.cards={};knownCheckState().selected=['c:你','r:1'];go('knownCheck')");
const answer=correct=>ev(`{const ss=knownCheckState().session,x=ss.queue[ss.index];if(x.skill==='pinyin')x.input=${correct?'notebookInfo(x.k).py':"'wrong'"};if(x.skill==='write')x.paper=true;knownCheckReveal();knownCheckGrade(${correct});}`);
await T('selection-and-start-do-not-grant-knowledge',()=>{
 reset();ok(doc.querySelectorAll('input:checked').length===1,'character selection missing');
 ev("go('knownCheck',{kind:'keys'})");ok(doc.querySelectorAll('input:checked').length===1,'mixed radical selection lost');
 ev("window.__base=JSON.stringify(State.cards);window.__daily=JSON.stringify(State.meta.daily);knownCheckStart()");
 ok(ev('knownCheckState().session.queue.length')===6,'missing three facets per selected item');
 ok(!ev("studyKnown('c:你')||studyKnown('r:1')"),'opening verification marked knowledge');
 ok(!A.txt().includes('nǐ')&&!A.txt().includes('ты'),'answer disclosed before recall');
 ok(!ev('knownCheckGrade(true)'),'can grade before reveal');
});
await T('tone-check-cannot-be-overridden-and-writing-requires-attempt',()=>{
 answer(false);ok(!ev("knownCheckState().session.results['c:你'].pinyin"),'wrong pinyin accepted');
 answer(true);answer(true);answer(true);
 ev('knownCheckReveal()');ok(!ev('knownCheckState().session.revealed'),'empty handwriting accepted');
 answer(true);answer(true);
 ok(ev('knownCheckState().session.finished'),'test did not finish');
 ok(!ev("knownCheckPassed(knownCheckState().session,'c:你')"),'failed tone was passed after other facets');
 ok(ev("knownCheckPassed(knownCheckState().session,'r:1')"),'clean radical not passed');
 ok(!ev("studyKnown('r:1')"),'result automatically marked known');
});
await T('explicit-save-only-passed-and-no-fabricated-fsrs-or-xp',()=>{
 ok(ev('knownCheckSave()'),'cannot save completed check');
 ok(ev("studyKnown('r:1')&&!studyKnown('c:你')"),'failed item got known mark');
 ok(ev('JSON.stringify(State.cards)===window.__base&&JSON.stringify(State.meta.daily)===window.__daily'),'check invented XP or FSRS');
 ok(!ev('knownCheckSave()'),'save not idempotent');
});
await T('old-known-marks-survive-failure-and-resume-keeps-current-answer',()=>{
 reset();ev("studyState().known={'c:你':todayStr()};knownCheckStart();knownCheckState().session.queue[0].input='ni3';Resume.save();window.__snap=localStorage.getItem('zhu-resume');State.meta.study=null;localStorage.setItem('zhu-resume',window.__snap);Resume.restore()");
 ok(ev("knownCheckState().session.queue[0].input")==='ni3','resume lost current input');
 for(let n=0;n<6;n++)answer(false);
 ev('knownCheckSave()');ok(ev("studyKnown('c:你')"),'old marks removed without consent');
});
await T('giving-up-writing-never-counts-as-success',()=>{
 reset();ev("knownCheckStart();knownCheckState().session.index=4;render()");
 [...doc.querySelectorAll('button')].find(b=>b.textContent==='Не помню — показать').click();
 ok([...doc.querySelectorAll('button')].find(b=>b.textContent==='Вспомнил верно').disabled,'gave-up answer can be accepted');
 ev('knownCheckGrade(true)');ok(ev("knownCheckState().session.results['c:你'].write")===false,'gave-up writing counted as known');
});
await T('settings-entry-and-basic-only-character-catalogue',()=>{
 ev("go('settings')");ok([...doc.querySelectorAll('button')].some(b=>b.textContent.includes('Что я уже знаю')),'settings entry missing');
 ok(ev("knownCheckPool('keys').length")===214,'not all radicals selectable');
 ok(ev("knownCheckPool('chars').every(k=>CHAR_L[k.slice(2)])"),'additional textbook character in catalogue');
});
A.finish('known check: mixed selection, hidden recall, tones, writing attempt, explicit save, no fake knowledge and resume');
