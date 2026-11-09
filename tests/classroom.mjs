// Classroom stages verify answers and preserve cumulative word knowledge.
import {load} from './env.mjs';
const A=await load();const {T,ev,ok,doc,click}=A;
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null; hideFB()");
const start=(stage,lessons=[18,19,20])=>ev(`startClassroom({lessons:${JSON.stringify(lessons)},stage:${JSON.stringify(stage)}})`);
const answer=g=>ev(`classroomState().session.revealed=true; classroomAnswer(${g})`);
const complete=()=>ev("{let guard=0;while(!classroomState().session.finished&&guard++<80){classroomState().session.revealed=true;classroomAnswer(true);}} ");
await T('stage-config-and-full-selected-lesson-word-pool',()=>{
 reset();ok(ev("classroomConfig({lessons:[1,2,3,4,5,0,31]}).lessons.join(',')")==='1,2,3,4','lesson config bounds');
 const expected=ev("uniq([18,19].flatMap(L=>lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words))).map(w=>w.key)).length");
 ok(ev("classroomWords(classroomConfig({lessons:[18,19]})).length")===expected,'repeated earlier vocabulary omitted');
 for(const stage of ['dialogue','vocab','translation','decomp','listening','quiz'])ok(ev(`classroomPool({lessons:[18,19,20],stage:'${stage}'}).length`)>0,'empty stage '+stage);
});
await T('vocabulary-start-does-not-enrol-whole-pool',()=>{
 reset();start('vocab');ok(ev('Object.keys(State.cards).length')===0,'opening the stage awarded knowledge');
 ok(ev('classroomState().session.queue.length')===8,'vocabulary portion not bounded8');
 ok(ev('new Set(classroomState().session.queue.map(t=>t.L)).size')===3,'portion not balanced between selected lessons');
 ok(!ev("classroomStageDone('CL18-20','vocab')"),'unanswered stage complete');
});
await T('only-answered-word-enters-fsrs-and-partial-stage-stays-open',()=>{
 const word=ev('classroomState().session.queue[0].k');answer(true);
 ok(ev('Object.keys(State.cards).length')===1,'unanswered words introduced');
 ok(ev(`State.cards[${JSON.stringify(word)}].state`)===1,'answered word absent');
 ok(ev(`!!memoryState().entries[${JSON.stringify(word)}]`),'answered word absent from cumulative memory');
 complete();const progress=ev("classroomStageProgress('CL18-20','vocab')");ok(progress.done===8&&progress.total>8,'coverage falsely full after one portion');
 ok(!ev("classroomStageDone('CL18-20','vocab')"),'one eight-word portion completed the entire block');
 ev("startClassroom({lessons:[18,19,20],stage:'vocab'})");ok(ev("classroomState().session.queue.every(t=>!classroomRecord(classroomState().session.config).covered[t.id])"),'covered words crowd out next portion');
});
await T('early-correct-old-word-does-not-inflate-fsrs',()=>{
 reset();ev("window.__classK=classroomWords(classroomConfig({lessons:[18]}))[0].w.key; State.cards[window.__classK]=FSRS.review({},3,REQ); window.__classBefore=JSON.stringify(State.cards[window.__classK]); classroomVocabGrade({k:window.__classK},true)");
 ok(ev('JSON.stringify(State.cards[window.__classK])===window.__classBefore'),'early correct review changed old interval');
});
await T('error-is-delayed-and-retry-not-an-independent-success',()=>{
 reset();start('vocab');ev("window.__classSS=classroomState().session; window.__classId=window.__classSS.queue[0].id; window.__classSS.queue[0].gaveUp=true");answer(false);
 ok(ev('window.__classSS.first')===1&&ev('window.__classSS.correct')===0,'first accuracy inflated');
 const retry=ev('window.__classSS.queue[window.__classSS.queue.length-1]');ok(retry.retry&&!retry.gaveUp,'retry stuck as gave up');
 ok(ev('window.__classSS.queue.slice(1,-1).filter(x=>x.id!==window.__classId).length')>=2,'immediate corrective retry');
 ev('window.__classSS.index=window.__classSS.queue.length-1');answer(true);
 ok(ev('window.__classSS.first')===1&&ev('window.__classSS.correct')===0,'correction counted as first success');
 ok(ev('Object.keys(State.cards).length')===1,'retry introduced unrelated words');
});
await T('dialogue-read-is-not-completion',()=>{
 reset();start('dialogue',[1,2,3]);ok(ev("classroomState().session.phase")==='intro','dialogue not readable first');
 ok(!ev("classroomStageDone('CL1-3','dialogue')"),'reading marked stage done');
 ok(click(/Прочитал — проверить/),'no understanding check');ok(!ev("classroomStageDone('CL1-3','dialogue')"),'read button completed stage');
 complete();ok(ev("classroomStageDone('CL1-3','dialogue')"),'correct comprehension not recorded');
});
await T('translation-directions-and-decomposition-coverage',()=>{
 reset();start('translation');ok(ev("classroomState().session.queue.some(x=>x.dir==='zh')&&classroomState().session.queue.some(x=>x.dir==='ru')"),'only one translation direction');
 start('decomp');ok(ev('classroomState().session.queue.length')<=8,'decomp portion too large');complete();
 const p=ev("classroomStageProgress('CL18-20','decomp')");ok(p.done<=8&&p.total>p.done,'decomp falsely covers all chars');
});
await T('listening-hides-transcript-until-listened',()=>{
 reset();start('listening');ev('classroomReveal()');ok(!ev('classroomState().session.revealed'),'no audio attempt required');
 ok(!doc.querySelector('#screen .qcard .han'),'transcript leaked in prompt');
 ev('classroomState().session.queue[0].listened=true; classroomReveal()');ok(ev('classroomState().session.revealed'),'heard phrase cannot be checked');
});
await T('quiz-correct-choices-unique-and-no-bulk-mastery',()=>{
 reset();start('quiz');const tasks=ev('classroomState().session.queue');ok(tasks.length===8,'mini quiz not8');
 for(const x of tasks)ok(x.choices.filter(v=>v===x.answer).length===1&&new Set(x.choices).size===x.choices.length,'ambiguous quiz choice');
 complete();ok(ev("classroomStageDone('CL18-20','quiz')"),'verified mini quiz incomplete');ok(ev('Object.keys(State.cards).length')===0,'recognition quiz grants writing mastery');
});
await T('resumed-serialized-stage-keeps-current-index',()=>{
 reset();start('vocab');answer(true);ev("State.meta.classroom=JSON.parse(JSON.stringify(State.meta.classroom)); classroomState().session.revealed=true; classroomAnswer(true); startClassroom({lessons:[18,19,20],stage:'translation'}); startClassroom({lessons:[18,19,20],stage:'vocab'})");
 ok(ev('classroomState().session.index')===2,'stage switch after reload restored stale session index');
});
await T('custom-song-can-be-supplemental-or-graded',()=>{
 reset();ev("classroomState().materials['CL18-20']={listening:{title:'Мой фрагмент',zh:'你好。',segments:[{zh:'你好。'}]}}; window.__custom=classroomListeningData({lessons:[18,19,20]})");
 ok(ev('window.__custom.custom')&&ev('window.__custom.title')==='Мой фрагмент','custom source ignored');
 ok(ev("classroomPool({lessons:[18,19,20],stage:'listening'}).length")>=3,'untranslated custom text falsely replaced graded listening');
 ev("classroomState().materials['CL18-20'].listening={title:'Песня с пары',zh:'你好。谢谢。再见。',segments:[{zh:'你好。',ru:'Привет'},{zh:'谢谢。',ru:'Спасибо'},{zh:'再见。',ru:'До свидания'}]}");
 ok(ev("classroomPool({lessons:[18,19,20],stage:'listening'}).length")===3,'translated custom text not used');
});
await T('changing-song-restarts-questions-for-new-translated-fragment',()=>{
 reset();start('listening');ev("window.__oldClassSession=classroomState().session; classroomState().materials['CL18-20']={listening:{title:'Новый текст',zh:'甲。乙。丙。',segments:[{zh:'甲。',ru:'А'},{zh:'乙。',ru:'Б'},{zh:'丙。',ru:'В'}]}}; startClassroom({lessons:[18,19,20],stage:'listening',restart:true})");
 ok(ev('classroomState().session!==window.__oldClassSession'),'song edit merely resumed old exercises');
 ok(ev("classroomState().session.queue.map(x=>x.zh).join('')")==='甲。乙。丙。','new song not used');
});
A.finish('classroom: six verified stages, coverage, conservative vocabulary, delayed correction and resume');
