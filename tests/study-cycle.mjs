// Seven actual study days, only introduced items, genuine recall and cumulative history.
import {load} from './env.mjs';
const A=await load();const {T,ev,ok,doc,click}=A;
ev("window.__studyDate='2026-11-01';todayStr=()=>window.__studyDate");
const reset=()=>ev("State.meta=freshMeta();State.cards={};PLAY=null;SESSION=null;window.__studyDate='2026-11-01';State.route={name:'path'}");
const next=()=>ev("window.__studyDate=addDays(window.__studyDate,1)");
const learn=keys=>ev(`${JSON.stringify(keys)}.forEach(k=>State.cards[k]=FSRS.review({},3,REQ))`);
const write=keys=>ev(`${JSON.stringify(keys)}.forEach(k=>{notebookMark(k,'hz','paper');notebookMark(k,'py','paper')})`);
const complete=()=>ev("{let guard=0;while(studyState().session&&!studyState().session.finished&&guard++<200){studyState().session.revealed=true;studyGrade(3)}}");
await T('read-only-home-and-no-unseen-enrolment',()=>{
 reset();learn(['你','好','r:1']);ev("window.__cards=JSON.stringify(State.cards);window.__daily=JSON.stringify(State.meta.daily);window.__meta=JSON.stringify(State.meta.memory);go('path')");
 ok(ev("studyLearnedPool().join(',')")==='你,好,r:1','unknown words/keys entered writing list');
 ok(ev('JSON.stringify(State.cards)===window.__cards'),'home altered knowledge');
 ok(ev('JSON.stringify(State.meta.memory)===window.__meta'),'opening home enrolled notebook entries');
 ok(doc.querySelectorAll('#screen > .view > *').length===2,'extra menus before course path');
 ok(doc.querySelectorAll('.nav button').length===3,'old navigation menus remain');
 ev("go('study')");ok(doc.querySelectorAll('.study-item').length===3,'introduced items absent from aggregate list');
});
await T('writing-and-pinyin-three-calendar-days',()=>{
 reset();learn(['你','r:1']);write(['你','r:1']);
 ok(ev("studyStatus('你').day")===2&&ev("studyStatus('你').stage")==='wait','day2 opened same day');
 ok(ev("studyQueue('today','').length")===0,'cards assigned during first writing day');
 ok(ev("studyQueue('all','').length")===2,'always available written cards absent');
 next();write(['你','r:1']);next();write(['你','r:1']);
 ok(ev("studyStatus('你').day")===4&&ev("studyStatus('你').stage")==='wait','day4 on third writing day');
 ok(ev("Object.keys(State.cards).length")===2,'writing created knowledge');
 next();ok(ev("studyStatus('你').stage")==='cards','day4 did not open');
});
await T('two-retrieval-directions-no-auto-grading-and-two-days',()=>{
 ev("window.__base=JSON.stringify(State.cards);startStudyCards('today')");
 ok(ev('studyState().session.tasks.length')===4,'missing two recall directions');
 ok(!ev('studyGrade(3)'),'hidden answer could be graded');
 ok(!doc.querySelector('.study-answer'),'hidden answer leaked');
 complete();ok(ev("studyStatus('你').stage")==='wait'&&ev("studyStatus('你').day")===5,'one card day granted two days');
 ok(ev('JSON.stringify(State.cards)===window.__base'),'recall modified legacy knowledge');
 ok(ev("studyQueue('today','').length")===0,'completed cards still due today');
 next();ev("studyState().session=null;startStudyCards('today')");complete();
 ok(ev("studyStatus('你').day")===6&&ev("studyStatus('你').stage")==='wait','global review opened same day');
});
await T('days-six-seven-review-all-ever-written-including-old-and-partial',()=>{
 // An older, partly written word belongs to cumulative review without being called mastered.
 learn(['好']);write(['好']);next();
 ok(ev("studyStatus('你').stage")==='global','day6 missing');
 ev("studyState().session=null;startStudyCards('today')");
 ok(ev("studyGlobalRound(false).targets.includes('好')"),'previous writing omitted from global pool');
 ok(ev("studyState().session.tasks.some(x=>x.k==='好')"),'old written word not reviewed');
 complete();ok(ev("studyStatus('你').day")===7&&ev("studyStatus('你').stage")==='wait','day7 granted on day6');
 next();ev("studyState().session=null;startStudyCards('today')");complete();
 ok(ev("studyStatus('你').stage")==='done','seven-day cycle not complete');
 ok(ev("studyStatus('好').stage")!=='done','general review granted uncompleted writing days');
 ok(ev("studyQueue('all','').includes('你')"),'finished word vanished from free cards');
});
await T('cumulative-review-continues-weekly-after-no-new-vocabulary',()=>{
 // The previous scenario completed two global days; an unfinished word must not force new items.
 ev("window.__studyDate=addDays(window.__studyDate,5)");
 ok(!ev('studyGlobalNeeded()'),'maintenance returned too soon');next();
 ok(ev('studyGlobalNeeded()'),'weekly review stopped after the first seven days');
 ev("studyState().session=null;startStudyCards('today')");complete();
 ok(!ev('studyGlobalNeeded()'),'second weekly day opened on same date');next();
 ok(ev('studyGlobalNeeded()'),'second weekly maintenance day missing');
 ev("studyState().session=null;startStudyCards('today')");complete();
 ok(!ev('studyGlobalNeeded()'),'completed weekly pair remained due');
});
await T('missed-days-never-fill-unfinished-stages',()=>{
 reset();learn(['你']);write(['你']);ev("window.__studyDate='2026-11-20'");
 ok(ev("studyStatus('你').stage")==='writing'&&ev("studyStatus('你').day")===2,'time alone completed writing');
 write(['你']);ok(ev("studyStatus('你').stage")==='wait','missed days filled several writing rows');
 next();write(['你']);ev("window.__studyDate='2026-12-20'");
 ok(ev("studyStatus('你').stage")==='cards'&&ev("studyStatus('你').day")===4,'time skipped recall days');
});
await T('local-cards-also-cover-same-day-global-round-without-duplicate-demands',()=>{
 reset();learn(['你','好']);
 ev("['你','好'].forEach(k=>{for(let day=0;day<3;day++){const row=notebookRow(k,day,true);row.date='2026-10-'+(25+day);for(const sk of ['hz','py'])row[sk]={done:true,date:'2026-10-'+(25+day)};}});studyState().reviews['你']={skills:{},days:{'2026-10-28':{hz:3,reading:3},'2026-10-29':{hz:3,reading:3}}};startStudyCards('today')");
 ok(ev("studyState().session.tasks.filter(x=>x.k==='好').every(x=>x.kind==='local')"),'newly written word lost own local phase');complete();
 ok(ev('studyGlobalRound(false).completed'),'mixed local/global pool could not complete');
 ok(ev("studyStatus('好').day")===5,'global round skipped two-day consolidation');
});
await T('difficult-priority-extra-retrieval-and-conservative-fsrs',()=>{
 reset();learn(['你','好']);write(['你','好']);ev("studyToggleDifficult('好');window.__before=JSON.stringify(State.cards)");
 ok(ev("studyQueue('difficult','').join()") ==='好','hard filter includes unrelated words');
 ev("startStudyCards('all')");ok(ev("studyState().session.tasks[0].k")==='好','hard word not prioritized');
 ev("studyState().session.revealed=true;studyGrade(1)");
 ok(ev('studyState().session.tasks.length')===5,'failure not retried after other cards');
 ok(ev("studyState().session.tasks[1].k")!=='好','immediate correction instead of spacing');
 ev("window.__hard=JSON.stringify(studyState().reviews['好'].skills.hz);studyState().session.index=4;studyState().session.revealed=true;studyGrade(3)");
 ok(ev("JSON.stringify(studyState().reviews['好'].skills.hz)===window.__hard"),'correction inflated failed recall interval');
 ok(ev('JSON.stringify(State.cards)===window.__before'),'marking difficult changed base knowledge');
 ev("studyToggleDifficult('好')");ok(!ev("studyIsDifficult('好')"),'cannot remove difficult mark');
});
await T('search-hanzi-russian-pinyin-tones-digits-and-umlaut',()=>{
 reset();learn(['你','好','弟弟','r:1']);
 for(const [q,k] of [['弟','弟弟'],['младший','弟弟'],['di4 di5','弟弟'],['didi','弟弟'],['nǐ','你'],['ni3','你']])ok(ev(`studyWritingPool(${JSON.stringify(q)}).includes(${JSON.stringify(k)})`),'search '+q);
 ev("go('study');");const input=doc.querySelector('.search');input.value='младший';input.dispatchEvent(new A.w.Event('input'));ok(doc.querySelectorAll('.study-item').length===1,'list did not filter');
 ev("go('dict',{q:'lv4'})");ok(A.txt().includes('绿'),'numbered umlaut pinyin not searchable');
});
await T('notebook-single-item-no-lesson-menu-and-difficult-on-writing-pad',()=>{
 reset();learn(['你']);ev("go('notebook',{k:'你',fromStudy:true,sample:true})");
 ok(!doc.querySelector('#screen select'),'old lesson selector in aggregate flow');
 ok(doc.querySelector('.notebook-header .study-difficult'),'cannot mark difficult on sample');
 ev("startNotebookPractice('你','hz')");ok(doc.querySelector('.notebook-practice-target .study-difficult'),'cannot mark during fullscreen writing');
 doc.querySelector('.study-difficult').click();ok(ev("studyIsDifficult('你')"),'hard mark not persisted');
});
await T('resume-saves-cards-index-reveal-and-difficult-marks',()=>{
 reset();learn(['你']);write(['你']);ev("studyToggleDifficult('你');startStudyCards('all');studyState().session.revealed=true;studyGrade(2);studyState().session.revealed=true;Resume.restore();Resume.save();window.__resume=localStorage.getItem('zhu-resume');State.meta.study=null;localStorage.setItem('zhu-resume',window.__resume);Resume.restore()");
 ok(ev('studyState().session.index')===1&&ev('studyState().session.revealed'),'lost current card on reload');ok(ev("studyIsDifficult('你')"),'lost difficult marks on resume');
});
await T('switching-to-difficult-and-single-word-cards-preserves-old-round',()=>{
 reset();learn(['你','好']);write(['你','好']);ev("studyToggleDifficult('好');startStudyCards('all');studyState().session.revealed=true;studyGrade(3);startStudyCards('difficult')");
 ok(ev("studyState().session.keys.join()") ==='好','difficult tab resumed unrelated round');
 ev("startStudyCards('all')");ok(ev('studyState().session.index')===1,'old round lost when switching filters');
 ev("startStudyCards('all','',['你'])");ok(ev("studyState().session.keys.join()") ==='你','single-word row did not start selected card');
});
await T('midnight-never-credits-yesterday-session-to-today',()=>{
 reset();learn(['你']);write(['你']);ev("startStudyCards('all');studyState().session.revealed=true");next();
 ok(!ev('studyGrade(3)'),'stale session graded on a different day');ok(ev('studyState().session.finished'),'stale session not closed');
});
await T('global-round-covers-large-history-across-short-sessions',()=>{
 reset();ev("window.__many=semWords().slice(0,12);window.__many.forEach(k=>{State.cards[k]=FSRS.review({},3,REQ);for(let day=0;day<3;day++){const row=notebookRow(k,day,true);row.date='2026-10-'+(25+day);for(const sk of ['hz','py'])row[sk]={done:true,date:'2026-10-'+(25+day)};}studyState().reviews[k]={skills:{},days:{'2026-10-28':{hz:3,reading:3},'2026-10-29':{hz:3,reading:3}}};});window.__before=JSON.stringify(State.cards);startStudyCards('all','',[window.__many[0]])");
 complete();ok(ev('Object.keys(studyGlobalRound(false).answers).length')===1,'free card did not count toward eligible global review');
 ev("studyState().session=null;startStudyCards('today')");ok(ev('studyState().session.keys.length')===10,'global portion not bounded10');complete();
 ok(!ev('studyGlobalRound(false).completed'),'one short session falsely reviewed full history');
 ev("studyState().session=null;startStudyCards('today')");ok(ev('studyState().session.keys.length')===1,'remaining old word lost or already reviewed repeated');complete();
 ok(ev('studyGlobalRound(false).completed'),'full history did not complete after all portions');ok(ev('JSON.stringify(State.cards)===window.__before'),'global history review rewrote base knowledge');
});
await T('main-path-includes-every-rule-and-ordered-key-once-and-stories',()=>{
 reset();const units=ev('courseClassUnits()');
 ok(units.flatMap(u=>u.nodes.filter(n=>n.type==='grammar').map(n=>n.topicId)).sort().join()===ev('grammarTopics().map(t=>t.id).sort().join()'),'grammar omitted/duplicated');
 ok(units.flatMap(u=>u.nodes.filter(n=>n.type==='learn').flatMap(n=>n.items)).join()===ev("KEY_ORDER.map(n=>'r:'+n).join()"),'radicals not sequential/exactly once');
 for(const size of [3,4])for(const u of ev(`courseClassUnits(${size})`))ok(ev(`classroomPool({lessons:${JSON.stringify(u.lessons)},stage:'story'}).length`)>0,'story missing '+u.id);
 ev("startClassroom({lessons:[1,2,3],stage:'story'})");ok(!ev("classroomStageDone('CL1-3','story')"),'reading story completed knowledge');ok(click(/Понял историю/),'story has no comprehension stage');
 ev("{let guard=0;while(!classroomState().session.finished&&guard++<30){classroomState().session.revealed=true;classroomAnswer(true)}}");ok(ev("classroomStageDone('CL1-3','story')"),'story understanding not tracked');
 ok(ev("grammarTopic('g17-ordinal-di').rule.includes('第一个人')"),'ordinal rule missing');
});
A.finish('study cycle: introduced-only list,3+2+2 days, difficult cards, recall, search, resume and integrated path');
