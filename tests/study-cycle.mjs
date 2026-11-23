// Compatibility of archived paper history and v40 scheduler. The active cycle is tested in recall.mjs.
import {load} from './env.mjs';
const A=await load();const {T,ev,ok,doc,click}=A;
ev("window.__studyDate='2026-11-01';todayStr=()=>window.__studyDate");
const reset=()=>ev("State.meta=freshMeta();State.cards={};PLAY=null;SESSION=null;window.__studyDate='2026-11-01';State.route={name:'path'};studyState().notebookRadicalCount=0");
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
 ok(doc.querySelectorAll('.nav button').length===4,'old navigation menus remain');
 ev("go('study')");ok(doc.querySelector('.recall-lesson-picker'),'new lesson selector absent');ok(ev('Object.keys(recallState().entries).length')===0,'opening new cycle silently imported old paper days');
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
 ok(ev("studyStatus('你').day")===6&&ev("studyStatus('你').stage")==='wait','global phase did not wait for next calendar day');
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
await T('reported-writing-credit-covers-full-lessons-only-and-opens-cards-now',()=>{
 reset();learn(['你','r:1']);write(['你']);ev("studyToggleDifficult('你');window.__base=JSON.stringify(State.cards);window.__daily=JSON.stringify(State.meta.daily);window.__old=JSON.stringify(notebookRow('你',0,false));window.__target=studyLesson14Words();window.__outside=semWords().find(k=>!window.__target.includes(k));notebookMark(window.__outside,'hz','paper');window.__other=JSON.stringify(notebookData(window.__outside,false));applyStudyUpdateV30()");
 const keys=ev('studyLesson14Words()');ok(keys.length>15,'incomplete lesson pool');
 ok(ev("studyLesson14Words().every(k=>notebookStatus(k).finished&&studyStatus(k).stage==='cards'&&studyStatus(k).day===4)"),'not all reported words open first card day now');
 ok(ev("studyQueue('today','').length")===keys.length,'cards contain unrelated words or omit lesson words');
 ok(ev('JSON.stringify(State.cards)===window.__base'),'reported writing awarded recognition knowledge');
 ok(ev('JSON.stringify(State.meta.daily)===window.__daily'),'reported writing awarded XP');
 ok(ev("JSON.stringify(notebookRow('你',0,false))===window.__old"),'existing writing history overwritten');
 ok(ev('JSON.stringify(notebookData(window.__outside,false))===window.__other'),'later lesson writing overwritten');
 ok(ev("studyIsDifficult('你')"),'hard mark lost');
 ok(ev("studyLesson14Words().every(k=>notebookData(k,false).credit.reviewFrom===todayStr())"),'first card day postponed');
 ok(ev("studyLesson14Words().filter(k=>k!=='你').every(k=>notebookData(k,false).days.every(d=>d.hz.reported&&d.py.reported&&d.hz.date===todayStr()))"),'fictitious past dates stored');
});
await T('credit-is-once-only-and-two-card-days-still-required',()=>{
 ev("startStudyCards('today')");complete();
 while(ev("studyQueue('today','').length")){ev("studyState().session=null;startStudyCards('today')");complete();}
 ok(ev("studyLesson14Words().every(k=>studyStatus(k).day===5&&studyStatus(k).stage==='wait')"),'second day completed on same date');next();
 ev("window.__before=JSON.stringify(State.meta.memory);window.__reviews=JSON.stringify(studyState().reviews)");
 ok(!ev('applyStudyUpdateV30()'),'one-time adjustment applied again');
 ok(ev('JSON.stringify(State.meta.memory)===window.__before&&JSON.stringify(studyState().reviews)===window.__reviews'),'restart reset credited progress');
 while(ev("studyQueue('today','').length")){ev("studyState().session=null;startStudyCards('today')");complete();}
 ok(ev("studyLesson14Words().every(k=>studyStatus(k).stage==='wait'&&studyStatus(k).day===6)"),'two card days did not finish credited words');
 next();ok(ev("studyQueue('today','').length")>0,'global day missing after credited words');
});
await T('restoring-seven-days-preserves-existing-reviews-and-sessions',()=>{
 reset();ev("studyState().adjustments={lesson14WritingV30:{reportedOn:todayStr()}};studyState().session={tasks:[{k:'你',kind:'global'}]};studyState().global={'2026-10-20':{completed:true}};window.__before=JSON.stringify(studyState());applyStudyUpdateV30()");
 ok(ev('JSON.stringify(studyState())===window.__before'),'startup erased global review history/session');
});
await T('radical-writing-needs-no-pinyin-and-auto-advances',()=>{
 reset();ev("go('notebook',{k:'r:1',queue:['r:1','r:2'],fromStudy:true})");
 ok(!doc.querySelector('.notebook-slot[data-skill="py"]'),'radical still requires pinyin writing');
 [...doc.querySelectorAll('button')].find(b=>b.textContent==='Прописал').click();
 ok(ev("State.route.k==='r:2'"),'radical did not advance after writing');
 ok(ev("notebookStatus('r:1').complete")===1,'radical writing day not complete');
 ok(!ev("notebookRow('r:1',0,false).py.done"),'pinyin completion fabricated');
 ev("go('path')");ok(doc.querySelector('.study-cycle-banner .btn'),'card entry missing');
});
await T('global-round-is-complete-only-after-all-portions',()=>{
 reset();ev("window.__keys=semWords().slice(0,12);for(const k of window.__keys){for(let i=0;i<3;i++){const row=notebookRow(k,i,true);row.date='2026-10-'+(20+i);row.hz={done:true,date:row.date};row.py={done:true,date:row.date};}studyState().reviews[k]={skills:{},days:{'2026-10-23':{hz:3,reading:3},'2026-10-24':{hz:3,reading:3}}};}startStudyCards('today')");
 ok(ev('studyState().session.keys.length')===10,'portion limit ignored');complete();
 ok(!ev('studyGlobalRound(false).completed'),'short portion finished whole global day');
 ok(ev("studyQueue('today','').length")===2,'remaining signs lost');
 ev("studyState().session=null;startStudyCards('today')");complete();
 ok(ev('studyGlobalRound(false).completed'),'all signs did not finish global day');
 ok(ev("studyStatus(window.__keys[0]).day===7&&studyStatus(window.__keys[0]).stage==='wait'"),'global day counted twice');
});
await T('update-removes-only-unfinished-radical-pinyin-and-preserves-history',()=>{
 reset();ev("knownCheckState().session={index:1,queue:[{k:'你',skill:'pinyin'},{k:'r:1',skill:'pinyin'},{k:'r:1',skill:'meaning'}],results:{'你':{pinyin:true}},revealed:true};State.meta.dictation={records:{'r:1|pinyin':{ok:true}},active:{q:[{item:{id:'r:1'},field:'pinyin',tries:0},{item:{id:'r:1'},field:'write',tries:0}],total:2,done:0,open:true}};window.__old=JSON.stringify(State.cards);applyStudyUpdateV40()");
 ok(ev("knownCheckState().session.queue[1].skill==='meaning'&&!knownCheckState().session.revealed"),'active radical reading not skipped');
 ok(ev("knownCheckState().session.results['你'].pinyin"),'previous answer erased');
 ok(ev("dictationStore().active.q.length===1&&dictationStore().active.total===1&&!dictationStore().active.open"),'dictation migration broken');
 ok(ev("dictationStore().records['r:1|pinyin'].ok"),'historical reading result erased');
 ok(ev('JSON.stringify(State.cards)===window.__old'),'migration changed knowledge');
 ok(!ev('applyStudyUpdateV40()'),'migration repeated');
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
 ev("go('dict',{q:'младший'})");ok(A.txt().includes('弟弟'),'word translation no longer searchable');
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
 reset();learn(['你']);write(['你']);ev("studyToggleDifficult('你');startStudyCards('all');studyState().session.revealed=true;studyGrade(2);studyState().session.revealed=true;Resume.save();window.__resume=localStorage.getItem('zhu-resume');State.meta.study=null;localStorage.setItem('zhu-resume',window.__resume);Resume.restore()");
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
await T('multiple-lesson-selection-and-auto-next-after-both-paper-marks',()=>{
 reset();ev("go('study')");
 doc.querySelector('input[aria-label="Урок 18"]').click();
 if(doc.querySelector('input[aria-label="Урок 1"]').checked)doc.querySelector('input[aria-label="Урок 1"]').click();
 ok(ev("recallState().lessons.join()")==='18','lesson not saved');ev("studyState().notebookLessons=[5,18]");
 ev("window.__queue=studyNotebookPool();window.__first=window.__queue[0];window.__next=window.__queue[1];go('notebook',{k:window.__first,queue:window.__queue})");
 let buttons=[...doc.querySelectorAll('.notebook-day[data-notebook-day="1"] button')].filter(b=>b.textContent==='Прописал');buttons[0].click();
 ok(ev('State.route.k===window.__first'),'advanced before pinyin');
 buttons=[...doc.querySelectorAll('.notebook-day[data-notebook-day="1"] button')].filter(b=>b.textContent==='Прописал');buttons[0].click();
 ok(ev('State.route.k===window.__next'),'did not auto advance after both marks');
 ok(ev('notebookStatus(window.__first).complete')===1,'paper day not saved');
 ok(ev('Object.keys(State.cards).length')===0,'lesson selection granted knowledge');
 ev("go('study')");ok(doc.querySelector('input[aria-label="Урок 18"]').checked,'lesson selection not retained');
});
await T('radicals-follow-lesson-words-in-bounded-stable-batches',()=>{
 reset();ev("studyState().notebookLessons=[5];studyState().notebookRadicalCount=3;window.__pool=studyNotebookPool()");
 ok(ev("window.__pool.filter(isRad).join()") ==='r:1,r:2,r:3','wrong numeric radical batch');
 ok(ev("window.__pool.slice(-3).every(isRad)"),'radicals before words');
 write(['r:1']);ok(ev("studyNotebookPool().filter(isRad).join()") ==='r:1,r:2,r:3','batch slides after a completed day');
 ev("studyState().notebookRadicalCount=1");ok(ev('studyNotebookPool().filter(isRad).length')===1,'amount setting ignored');
 ev("studyState().notebookRadicalCount=0");ok(ev('studyNotebookPool().some(isRad)')===false,'zero does not disable radicals');
});
await T('known-marks-skip-writing-count-unique-characters-and-preserve-knowledge',()=>{
 reset();ev("studyState().notebookLessons=[5];studyState().notebookRadicalCount=2;window.__base=JSON.stringify(State.cards);window.__daily=JSON.stringify(State.meta.daily);studyState().known={'c:你':todayStr(),'你好':todayStr(),'r:1':todayStr()}");
 ok(ev("studyKnown('你')"),'individual character not recognized');
 ok(ev("studyNotebookPool().filter(isRad).join()") ==='r:2,r:3','known radical still in writing');
 ok(!ev("studyNotebookPool().includes('你')"),'known character still in writing');
 const stats=ev('studyRememberedCounts()');ok(stats.chars===2&&stats.keys===1,'known marks counted with duplicates');
 ok(ev('JSON.stringify(State.cards)===window.__base&&JSON.stringify(State.meta.daily)===window.__daily'),'known mark invented FSRS or XP');
 ev("go('dict',{q:'你'})");ok([...doc.querySelectorAll('#screen button')].some(b=>b.textContent.includes('Уже знаю')),'search has no known toggle');

});
await T('all-lessons-contain-only-main-textbook-words',()=>{
 reset();ev("window.__core=uniq(Object.values(LESSONS).flatMap(l=>l.o));window.__extra=uniq(Object.values(LESSONS).flatMap(l=>l.x.flatMap(x=>x.o))).find(k=>!window.__core.includes(k));State.cards[window.__extra]=FSRS.review({},3,REQ);memoryState().entries[window.__extra]={notebook:{days:[{hz:{done:true}}]}};window.__old=JSON.stringify(State.cards)");
 ok(ev('COURSE.length')===539,'wrong core curriculum size');
 for(let L=1;L<=30;L++)ok(ev(`lessonExtras(${L}).length===0&&notebookPool('words',${L}).every(k=>LESSONS[${L}].o.includes(k))`),'extra words remain in lesson '+L);
 ok(ev('courseClassUnits().every(u=>u.wordItems.every(k=>window.__core.includes(k)))'),'extras remain in path');
 ok(!ev('studyLearnedPool().includes(window.__extra)||studyWrittenPool().includes(window.__extra)'),'old extra writing reappears in queue');
 ev('applyCoreCurriculumV35()');ok(ev('JSON.stringify(State.cards)===window.__old'),'extra-word history deleted');
});
await T('dedicated-exam-tab-selected-lessons-and-dictation',()=>{
 reset();ev("go('exam');examState().lessons=[];go('exam')");
 ok(doc.querySelector('.nav [data-nav="exam"].on'),'exam tab not active');
 for(const L of [5,18]){const input=doc.querySelector('input[aria-label="Урок '+L+'"]');input.checked=true;input.dispatchEvent(new A.w.Event('change'));}
 ok(ev("examState().lessons.join()") ==='5,18','lesson choice not saved');
 ok(click(/Тренировать диктант/),'dictation cannot start');
 ok(ev("dictationStore().active.config.lessons.join()") ==='5,18','wrong dictation scope');
 ok(ev("dictationStore().active.items.every(x=>[5,18].some(L=>LESSONS[L].o.includes(x.id)))"),'dictation includes extras');
 ev("go('exam')");ok(click(/Пробная контрольная/),'mock cannot open');
 ok(ev("MOCK.lessons.join()") ==='5,18','mock lost selected lessons');
 ev("window.__mock=mockGen([5,18])");ok(ev("window.__mock.words.every(k=>[5,18].some(L=>LESSONS[L].o.includes(k)))"),'mock includes words outside chosen lessons');
});
await T('search-browses-numeric-radicals-and-full-main-lesson-characters',()=>{
 reset();ev("window.__cards=JSON.stringify(State.cards);go('dict')");
 const button=title=>[...doc.querySelectorAll('#screen button')].find(b=>b.textContent.includes(title));
 button('Ключи по порядку').click();ok(ev("State.route.name==='keys'&&State.tab==='dict'"),'radical catalogue outside search');
 const nums=[...doc.querySelectorAll('.rc .rn span:first-child')].map(x=>+x.textContent.replace('№',''));
 ok(nums.join()===Array.from({length:214},(_,i)=>i+1).join(),'radicals not sorted1–214');
 button('‹ Поиск').click();button('Слова по урокам').click();
 ok(ev('State.route.browse'),'not in character browsing mode');
 doc.querySelectorAll('.rowlist > button.row')[4].click();
 ok(ev('State.route.L')===5,'wrong lesson opened');
 const chars=[...doc.querySelectorAll('#screen .hzw')].map(x=>x.textContent);
 ok(chars.join()===ev("textbookWords(5).map(w=>w.d).join()"),'lesson character list missing repeated signs');
 ok(chars.includes('是')&&!chars.includes('纸'),'wrong main/additional character distinction');
 ok(ev('JSON.stringify(State.cards)===window.__cards'),'browsing awarded knowledge');
});
await T('main-path-includes-rules-and-stories-without-radical-lessons',()=>{
 reset();const units=ev('courseClassUnits()');
 ok(units.flatMap(u=>u.nodes.filter(n=>n.type==='grammar').map(n=>n.topicId)).sort().join()===ev('grammarTopics().map(t=>t.id).sort().join()'),'grammar omitted/duplicated');
 ok(units.every(u=>u.items.every(k=>!k.startsWith('r:'))&&u.nodes.every(n=>!n.id.includes(':keys:'))),'radical lessons remain in main path');
 for(const size of [3,4])for(const u of ev(`courseClassUnits(${size})`))ok(ev(`classroomPool({lessons:${JSON.stringify(u.lessons)},stage:'story'}).length`)>0,'story missing '+u.id);
 ev("startClassroom({lessons:[1,2,3],stage:'story'})");ok(!ev("classroomStageDone('CL1-3','story')"),'reading story completed knowledge');ok(click(/Понял историю/),'story has no comprehension stage');
 ev("{let guard=0;while(!classroomState().session.finished&&guard++<30){classroomState().session.revealed=true;classroomAnswer(true)}}");ok(ev("classroomStageDone('CL1-3','story')"),'story understanding not tracked');
 ok(ev("grammarTopic('g17-ordinal-di').rule.includes('第一个人')"),'ordinal rule missing');
});
A.finish('study cycle: introduced-only list,3+2+2 days and reported lesson1–4 writing credit, difficult cards, recall, search, resume and integrated path');
