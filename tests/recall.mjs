import fs from 'node:fs';
import {load} from './env.mjs';
const A=await load({writer:true,before(w){w.__writers=[];w.HanziWriter={create(host,ch,opts){const instance={ch,opts,host,quiz(q){instance.q=q;w.__quiz=q;},animateStroke(){return Promise.resolve();},cancelQuiz(){}};w.__writers.push(instance);return instance;}}}});
const {T,ev,ok,doc,click}=A;
const flush=()=>new Promise(r=>setTimeout(r,20));
const reset=()=>ev("State.meta=freshMeta();State.cards={};window.__recallDay='2026-11-18';todayStr=()=>window.__recallDay;State.route={name:'path'};recallState().lessons=[1];window.__writers=[];window.HZDATA={};for(const k of ['你','好','弟弟','r:9','r:38','r:39','r:149'])for(const ch of recallInfo(k).forms)window.HZDATA[ch]={strokes:['M0,0 L1,1'],medians:[[[0,0],[1,1]]]};window.HZREADY=Promise.resolve(window.HZDATA)");
const next=()=>ev("window.__recallDay=addDays(window.__recallDay,1)");
const finish=async()=>{
 let guard=0;
 while(ev('!!recallCurrentSession()')&&guard++<180){
  const skill=ev('recallCurrentSession().current.skill');
  if(skill==='intro')ev('recallIntro()');
  else if(skill==='write'){
   await flush();if(!ev('recallCurrentSession().revealed'))ev('window.__quiz.onComplete({})');else ev('recallWriteGrade()');
  }else ev('recallReveal();recallGrade(3)');
 }
 ok(guard<180,'session never completes');
};
await T('exact-section-A-keys-and-main-only-lessons',()=>{
 reset();ok(ev("recallLessonKeys(1).join()") ==='r:9,r:38,r:39','wrong lesson1 keys');
 ok(ev("recallLessonKeys(2).join()") ==='r:62,r:60,r:138,r:5,r:44,r:21,r:30,r:187','not guide order');
 ok(ev('Object.values(POSOBIE_KEYS).flat().length')===155,'fabricated lesson assignments');
 ev('recallState().lessons=[5,18]');ok(ev("recallPool().every(k=>isRad(k)?[5,18].some(L=>recallLessonKeys(L).includes(k)):[5,18].some(L=>lessonWords(L).some(w=>w.key===k)))"),'extra words or unrelated radicals');
 ev('recallState().unit="chars"');ok(ev('recallPool().filter(k=>!isRad(k)).every(k=>[5,18].some(L=>hanOf(lessonWords(L).map(w=>w.s).join("")).includes(k.slice(2))))'),'wrong character pool');
 ok(ev("recallInfo('r:149').forms.join()") ==='讠','traditional form instead of form taught in guide');
});
await T('unassigned-radicals-can-be-explicitly-added-without-fabricated-lesson',()=>{
 reset();ev("go('radical',{n:3})");ok(click(/^Учить в карточках$/),'no explicit radical learning entry');
 ok(ev("recallCurrentSession().keys.join()") ==='r:3','wrong manual radical');
 ok(ev("recallCurrentSession().goals['r:3'].phase")===1,'manual key skipped reading phase');
 ok(!ev("recallInfo('r:3').label.includes('урок')"),'fabricated lesson number');
});
await T('all-guide-lesson-assignments-match-the-source-and-graphics',()=>{
 const expected=Object.fromEntries(Array.from({length:30},(_,i)=>[i+1,[]]));
 for(const line of fs.readFileSync(new URL('../src/data/posobie.txt',import.meta.url),'utf8').split('\n')){const a=line.trim().split(/\s+/);if(a[1]==='A'&&/^\d+$/.test(a[3]||''))expected[a[0]].push({n:+a[3],form:a[2]});}
 ok(JSON.stringify(ev('POSOBIE_KEYS'))===JSON.stringify(expected),'guide map drifted from section A');
 const graphics=JSON.parse(fs.readFileSync(new URL('../hanzi-data.json',import.meta.url),'utf8'));
 for(const row of Object.values(expected).flat())for(const ch of ev(`recallInfo('r:${row.n}').forms`))ok(graphics[ch]?.strokes?.length&&graphics[ch]?.medians?.length,'missing offline radical geometry '+ch);
});
await T('new-lesson-context-does-not-resume-unrelated-portion',()=>{
 reset();ev("recallStart('new');window.__old=recallCurrentSession();recallState().lessons=[18];recallStart('new')");
 ok(ev('recallCurrentSession()!==window.__old'),'new lessons resumed old portion');
 ok(ev("recallCurrentSession().keys.every(k=>isRad(k)?recallLessonKeys(18).includes(k):lessonWords(18).some(w=>w.key===k))"),'unrelated new-lesson cards');
 ev("recallState().lessons=[1];recallStart('new')");ok(ev('recallCurrentSession()===window.__old'),'paused original portion lost');
 ev('recallState().lessons=[1,2,3]');ok(ev('new Set(recallPickFresh(20)).size===recallPickFresh(20).length'),'repeated words duplicated in combined lesson portion');
});
await T('opening-and-lesson-selection-do-not-introduce-or-grant-knowledge',()=>{
 reset();ev("window.__base=JSON.stringify(State.cards);go('path');window.__daily=JSON.stringify(State.meta.daily)");
 ok(doc.querySelectorAll('#screen > .view > *').length===2,'extra home menus');
 ok(!/3 \+ 2 \+ 2|Прописи на сегодня/.test(A.txt()),'old cycle advertised');
 ev("go('cards')");const box=doc.querySelector('input[aria-label="Урок 18"]');box.checked=true;box.dispatchEvent(new A.w.Event('change'));
 ok(ev('recallState().lessons.join()')==='1,18','old and new lessons not combinable');
 ok(ev('Object.keys(recallState().entries).length')===0,'selection enrolled the entire course');
 ok(ev('JSON.stringify(State.cards)===window.__base&&JSON.stringify(State.meta.daily)===window.__daily'),'selection awarded knowledge');
 ev("recallStart('new')");ok(ev('recallCurrentSession().keys.length')<=5,'overwhelming new portion');
 ok(ev('recallCurrentSession().keys.some(k=>WORD_L[k]===18||recallLessonKeys(18).includes(k))'),'later lesson starved');
});
await T('day-one-three-successes-each-direction-and-no-writing',async()=>{
 reset();ev("recallStart('new',['你','好'])");
 ok(!ev('recallGrade(3)'),'hidden model graded');
 await finish();
 ok(ev("recallState().entries['你'].days[0].py.streak===3&&recallState().entries['你'].days[0].meaning.streak===3"),'not repeated retrieval for both facets');
 ok(ev("!recallState().entries['你'].days[0].write.passed"),'day1 fabricated writing');
 ok(ev("recallPlan('你').stage==='wait'&&recallPlan('你').phase===2"),'day2 opened same date');
 ok(ev('Object.keys(State.cards).length')===0,'drill changed old knowledge');
 ok(ev("recallDue().length")===0,'completed day still due');
});
await T('day-two-reading-first-then-strict-writing-no-paper-bypass',async()=>{
 next();ev("recallStart('today')");
 while(ev('recallCurrentSession().current.skill')!=='write')ev('recallReveal();recallGrade(3)');
 await flush();ok(ev('window.__writers.length')>0,'no writer mounted');
 ok(ev('window.__writers.at(-1).opts.showCharacter===false&&window.__writers.at(-1).opts.showOutline===false'),'model visible in memory test');
 ok(ev('window.__writers.at(-1).q.acceptBackwardsStrokes===false'),'backwards strokes allowed');
 ok(ev('window.__writers.at(-1).q.showHintAfterMisses')===Infinity,'automatic hint can lead to pass');
 ok(!ev('recallWriteGrade()'),'empty drawing accepted');
 ok(![...doc.querySelectorAll('button')].some(b=>/Прописал|бумаге/.test(b.textContent)),'paper can bypass order check');
 ok(!doc.querySelector('.recall-card .recall-glyph'),'answer visible before writing');
 await finish();ok(ev("recallPlan('你').stage==='wait'&&recallPlan('你').phase===3"),'day2 writing did not complete');
});
await T('day-three-both-directions-and-day-four-daily-all-learned',async()=>{
 next();ev("recallStart('today')");await finish();
 ok(ev("recallState().entries['你'].days[2].write.passed"),'day3 omitted reverse direction');
 ok(ev("recallPlan('你').phase===4&&recallPlan('你').stage==='wait'"),'maintenance opened on day3');
 next();ok(ev("recallDue().sort().join()") ==='你,好','not all learned reviewed on day4');
 ev("recallState().lessons=[18];recallStart('today')");ok(ev("recallCurrentSession().keys.includes('你')"),'lesson selection hides old review');await finish();
 ok(ev('recallDue().length')===0,'day4 repeated twice');next();ok(ev('recallDue().length')===2,'daily maintenance stopped after one cycle');
 ev("recallStart('today')");await finish();
 ok(ev("studyRememberedCounts().chars")===2,'new learning missing from home counts');
});
await T('wrong-answer-resets-streak-and-delays-retry-without-fsrs-inflation',()=>{
 reset();ev("recallStart('new',['你','好']);recallIntro();recallIntro();recallReveal();window.__bad=recallCurrentSession().current.k;recallGrade(1)");
 ok(ev('recallCurrentSession().current.practice'),'no spacing after error');
 ok(ev('recallCurrentSession().current.k!==window.__bad'),'immediate same-item correction');
 ev("window.__first=JSON.stringify(recallState().entries[window.__bad].skills.py)");
 let guard=0;while(ev('!!recallCurrentSession()')&&guard++<80){const sk=ev('recallCurrentSession().current.skill');ok(sk!=='write','unexpected writing on day1');ev('recallReveal();recallGrade(3)');}
 ok(ev('JSON.stringify(recallState().entries[window.__bad].skills.py)===window.__first'),'corrected retries inflated first failed estimate');
});
await T('stroke-error-and-hint-cannot-count-as-correct',async()=>{
 reset();ev("recallStart('new',['你'])");await finish();next();ev("recallStart('today')");
 while(ev('recallCurrentSession().current.skill')!=='write')ev('recallReveal();recallGrade(3)');await flush();
 ev('window.__quiz.onMistake({strokeNum:0});window.__quiz.onComplete({});recallWriteGrade()');
 ok(!ev("recallState().entries['你'].days[1].write.passed"),'wrong stroke accepted');
 while(ev('recallCurrentSession().current.skill')!=='write')ev('recallReveal();recallGrade(3)');
 ev('recallHint();recallWriteGrade()');ok(!ev("recallState().entries['你'].days[1].write.passed"),'shown model granted writing');
 await finish();ok(ev("recallState().entries['你'].days[1].write.passed"),'later independent clean writing cannot complete');
 ok(ev("recallState().entries['你'].skills.write.lapses")>=0,'writing failure estimate absent');
});
await T('missing-graphics-never-passes-and-can-be-deferred',async()=>{
 reset();ev("window.HZDATA={};recallState().lessons=[1];recallStart('new',['你'])");await finish();next();ev("recallStart('today')");
 while(ev('recallCurrentSession().current.skill')!=='write')ev('recallReveal();recallGrade(3)');await flush();
 ok(A.txt().includes('не будет засчитан'),'missing data silently accepted');ok(!ev('recallWriteGrade()'),'no-data writing graded');
 ok(click(/Отложить знак/),'cannot defer missing data');ok(ev("!recallState().entries['你'].days[1].write.passed"),'deferred item passed');
});
await T('verified-known-is-excluded-manual-marks-alone-are-not-proof',async()=>{
 reset();ev("studyState().known={'c:你':todayStr(),'r:9':todayStr()};recallState().lessons=[1]");
 ok(ev("recallPool().includes('你')&&recallPool().includes('r:9')"),'unverified manual mark bypassed check');
 ev("knownCheckState().selected=['c:你','r:9'];knownCheckStart();{const ss=knownCheckState().session;for(const k of ss.keys)ss.results[k]=Object.fromEntries(knownCheckSkills(k).map(sk=>[sk,true]));ss.finished=true;knownCheckSave()}");
 ok(!ev("recallPool().includes('你')||recallPool().includes('r:9')"),'passed knowledge check not excluded');
 ok(ev("recallExcluded('你')"),'character proof not applied to word');
 ev("studyState().known['c:弟']=todayStr();studyState().verifiedKnown['c:弟']={source:'knowledge-check'}");
 ok(ev("recallExcluded('弟弟')"),'all repeated known characters in word not excluded');
 ev("delete studyState().known['c:你']");ok(!ev("recallExcluded('你')"),'removed known mark still blocks learning');
});
await T('known-characters-in-mixed-words-are-not-retested-and-current-exclusions-are-immediate',()=>{
 reset();ev("window.__word=semWords().find(k=>new Set(hanOf(BYK[k].s)).size>1);window.__char=hanOf(BYK[window.__word].s)[0];studyState().known={['c:'+window.__char]:todayStr()};studyState().verifiedKnown={['c:'+window.__char]:{source:'knowledge-check'}}");
 ok(!ev('recallExcluded(window.__word)'),'partly known word removed completely');
 ok(!ev('recallWritingForms(window.__word).includes(window.__char)'),'verified character tested again');
 ok(ev('recallWritingForms(window.__word).length')>0,'unknown parts omitted');
 ev("recallStart('new',['r:9','r:38']);recallIntro();recallIntro();studyState().known['r:9']=todayStr();studyState().verifiedKnown['r:9']={source:'knowledge-check'};recallSessionReady()");
 ok(ev("recallCurrentSession().current.k")!=='r:9','new proof did not remove active item');
});
await T('missed-days-do-not-skip-stages-and-partial-day-completes-on-actual-date',async()=>{
 reset();ev("recallStart('new',['你']);recallIntro();recallReveal();recallGrade(3);window.__recallDay='2026-12-01'");
 ok(!ev('recallGrade(3)'),'yesterday session credited today');
 ev("recallStart('today')");await finish();
 ok(ev("recallState().entries['你'].days[0].date")==='2026-12-01','unfinished day credited to old date');
 ok(ev("recallPlan('你').stage==='wait'&&recallPlan('你').phase===2"),'time alone completed multiple stages');
});
await T('resume-keeps-reading-current-state-and-order-model-partial-results',()=>{
 reset();ev("recallStart('new',['你']);recallIntro();recallReveal();Resume.save();window.__snap=localStorage.getItem('zhu-resume');State.meta.study=null;localStorage.setItem('zhu-resume',window.__snap);Resume.restore()");
 ok(ev('recallCurrentSession().revealed'),'reading reveal lost');ok(ev("recallCurrentSession().current.k") ==='你','selected item lost');
 ev('recallGrade(3)');ok(ev("recallState().entries['你'].days[0].py.streak")===1,'resume answer not recorded once');
});
await T('repeated-characters-are-written-separately-and-known-parts-skipped',async()=>{
 reset();ev("recallState().lessons=[3];recallStart('new',['弟弟'])");await finish();next();ev("recallStart('today')");
 while(ev('recallCurrentSession().current.skill')!=='write')ev('recallReveal();recallGrade(3)');await flush();
 ok(ev("recallWritingForms('弟弟').length")===2,'repeated characters collapsed');
 ev('window.__quiz.onComplete({})');await flush();
 ok(!ev('recallCurrentSession().revealed'),'one character passed whole two-character word');
 ok(ev('recallCurrentSession().current.writer.index')===1,'first character result lost');
 ev('Resume.save();window.__snap=localStorage.getItem("zhu-resume");State.meta.study=null;localStorage.setItem("zhu-resume",window.__snap);Resume.restore()');await flush();
 ok(ev('recallCurrentSession().current.writer.index')===1,'finished character lost on reload');
 ev('window.__quiz.onComplete({});recallWriteGrade()');ok(ev("recallState().entries['弟弟'].days[1].write.passed"),'whole word writing not saved');
});
await T('daily-cumulative-review-retains-remaining-portions-and-confirmed-marks-exclude-old-items',async()=>{
 reset();ev("window.__pool=semWords().slice(0,7);for(const k of window.__pool){const e=recallState().entries[k]={familiar:true,days:[],reviews:{},skills:{}};for(let n=0;n<3;n++)e.days.push({date:'2026-11-'+(10+n),py:{streak:3,tries:3},meaning:{streak:3,tries:3},write:{passed:n>0,tries:1}});}recallStart('today')");
 ok(ev('recallCurrentSession().keys.length')===5,'review portion too large');
 // For this scheduler test use writer completion events; real geometry is exercised in Chromium.
 for(const k of ev('recallCurrentSession().keys'))ev(`for(const ch of recallInfo(${JSON.stringify(k)}).forms)window.HZDATA[ch]={strokes:['M0,0 L1,1'],medians:[[[0,0],[1,1]]]}`);
 await finish();ok(ev('recallDue().length')===2,'short portion completed all seven signs');
 ev("window.__rest=recallDue();const k=window.__rest[0];studyState().known=studyState().known||{};studyState().verifiedKnown=studyState().verifiedKnown||{};studyState().known[k]=todayStr();studyState().verifiedKnown[k]={source:'knowledge-check'}");
 ok(ev('recallDue().length')===1,'verified old item still due');
});
await T('old-progress-is-preserved-without-inventing-new-cycle-days',()=>{
 reset();ev("notebookMark('你','hz','paper');studyState().reviews['你']={days:{'2026-11-16':{hz:3,reading:3}},skills:{}};window.__old=JSON.stringify(State.meta.memory);window.__reviews=JSON.stringify(studyState().reviews);applyStudyUpdateV41()");
 ok(ev('JSON.stringify(State.meta.memory)===window.__old&&JSON.stringify(studyState().reviews)===window.__reviews'),'old history overwritten');
 ok(ev('Object.keys(recallState().entries).length')===0,'old paper dates fabricated new reading/writing results');
});
A.finish('recall: lesson words/guide keys,3learning days,daily cumulative review,spaced retrieval,strict writing,verified exclusions,resume and migration');
