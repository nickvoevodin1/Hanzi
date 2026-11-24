import {load} from './env.mjs';
const A=await load({writer:true});
const {T,ev,ok,doc,click}=A;
await T('all textbook entries, including separately glossed characters',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[20];go('lesson',{L:20,browse:true})");
 const words=ev('textbookWords(20).map(w=>w.d)');
 ok(words.includes('参加')&&words.includes('星')&&words.includes('期'),'missing textbook entries');
 ok(ev("textbookWords(15).some(w=>w.d==='阅览')&&textbookWords(26).some(w=>w.d==='《洪湖水，浪打浪》')"),'verified scan entries missing');
 ok(!words.some(x=>['参','加','去年'].includes(x)),'added components or supplementary words');
 ok([...doc.querySelectorAll('#screen .hzw')].map(x=>x.textContent).join()===words.join(),'search and data differ');
 for(let L=1;L<=30;L++)ok(ev(`(recallState().lessons=[${L}],recallPool().join()===lessonWords(${L}).map(w=>w.key).join())`),'lesson cards differ '+L);
});
await T('faces, shuffled queue, whole lesson and resumed learning',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[20];go('cards')");
 click(/^Постоянные$/);
 const facing=doc.querySelector('select[aria-label="Начать с"]');
 facing.value='py';facing.dispatchEvent(new A.w.Event('change'));
 ev("recallStart('new')");
 ok(ev('recallState().session.keys.length===lessonWords(20).length'),'portion truncates lesson');
 ok(doc.querySelector('.recall-card .py')&&!doc.querySelector('.recall-card .han'),'wrong pinyin face');
 ok(click(/Показать ответ/)&&doc.querySelector('.recall-card .han')&&doc.querySelector('.recall-card .tr'),'missing reverse sides');
 ev("recallGrade(3);go('cards')");
 ok(ev('recallFresh().length===lessonWords(20).length'),'unfinished cards dropped');
 ev("recallState().facing='ru';recallState().mix=true;shuffle=xs=>xs.slice().reverse();recallStart('new')");
 ok(ev("recallState().session.keys[0]===lessonWords(20).at(-1).key"),'shuffle did not affect queue');
 ok(doc.querySelector('.recall-card .tr')&&!doc.querySelector('.recall-card .han'),'wrong translation face');
});
await T('writing gates completion and every finished word transfers to review',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[20];window.HZREADY=Promise.resolve();recallStart('new',['参加','地址'])");
 ok(doc.querySelector('.recall-card .han')&&!doc.querySelector('.recall-card .py'),'wrong character face');
 ev("while(recallCurrentSession().current.skill==='flip'){recallReveal();recallGrade(3)}");
 ok(doc.querySelector('.recall-writer')&&ev('recallDue().length===0'),'writing missing or already counted');
 ev("for(let i=0;i<8&&recallCurrentSession();i++){const s=recallCurrentSession();if(s.current.skill==='write'){s.current.writer={completed:true};s.revealed=true;recallWriteGrade()}else{recallReveal();recallGrade(3)}}");
 ok(ev("recallDue().sort().join()==='参加,地址'"),'learned words omitted from same-day review');
 ev("recallState().lessons=[1];recallStart('today')");
 ok(ev("recallCurrentSession().keys.sort().join()==='参加,地址'"),'review filtered by selected lesson');
});
await T('free deck wraps without touching scheduled progress',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[1];recallState().facing='py';go('cards')");
 click(/^Постоянные$/);click(/^Начать тренировку$/);
 ok(doc.querySelector('.recall-card .py')&&!doc.querySelector('.recall-card .han'),'free face ignored');
 click(/^Показать ответ$/);ok(doc.querySelector('.recall-card .han'),'free reveal failed');
 click(/^Вспомнил$/);
 ok(doc.querySelector('.recall-writer'),'free writing missing');
 ev("for(let i=0;i<3;i++){const s=recallCurrentSession();if(s.current.skill==='flip'){recallReveal();recallGrade(3)}else{s.current.writer={completed:true};s.revealed=true;recallWriteGrade()}}");
 ok(ev('State.route.index')===0&&!ev('State.route.practice.revealed'),'free deck did not wrap');
 ok(!ev('recallState().staged'),'free deck affected schedule');
});
await T('entire reading round precedes writing and each interval gates the next round',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[1];Date.now=()=>window.__clock;window.__clock=100000;go('cards')");
 click(/^Начать урок$/);
 ok(ev("recallCurrentSession().facing==='han'"),'staged face changed');
 const first=ev('recallCurrentSession().current.k');
 click(/^Показать ответ$/);
 ok(click(/^Не вспомнил$/),'forgotten rating missing');
 ok(ev('recallCurrentSession().current.k')!==first,'forgotten card stayed at front');
 click(/^Показать ответ$/);
 ok(click(/^С трудом$/),'hard rating missing');
 ok(ev("recallCurrentSession().current.skill==='flip'&&recallCurrentSession().current.k")===first,'forgotten card did not return before writing');
 click(/^Показать ответ$/);
 ok(click(/^Вспомнил$/),'remembered rating missing');
 ok(doc.querySelector('.recall-writer'),'writing round missing');
 ev("window.__complete=()=>{while(recallCurrentSession()){const s=recallCurrentSession();if(s.current.skill==='flip'){recallReveal();recallGrade(3)}else{s.current.writer={completed:true};s.revealed=true;recallWriteGrade()}}};window.__complete()");
 for(const hours of [4,12,24,48,120]){
   ok(ev('stageCardEntry(1).due-Date.now()')===hours*3600000,'wrong interval '+hours);
   ev("go('cards');stageCardStart(1)");
   ok(!ev('recallCurrentSession()'),'early review accepted');
   ev("window.__clock=stageCardEntry(1).due;stageCardStart(1);window.__complete()");
 }
 ok(ev('stageCardEntry(1).completed')===6&&doc.body.textContent.includes('Все пять повторений завершены'),'schedule did not finish');
});
await T('radicals by lesson have their own deck and schedule',()=>{
 ev("State.meta=freshMeta();go('dict')");
 ok(click(/Ключи по урокам/),'radical lessons missing from search');
 ok(click(/Урок 1/),'lesson missing from radical catalogue');
 ok(ev('recallState().radicalDeck&&recallState().radicalLesson===1'),'catalogue opened wrong deck');
 click(/^Постоянные$/);click(/^Начать тренировку$/);
 ok(ev("State.route.deck.map(x=>x.key).join()")==='r:9,r:38,r:39','free deck differs from guide');
 ev("go('cards');stageCardStart(1);stageCardStart(1,true)");
 ok(ev("stageCardEntry(1).session.keys.every(k=>!isRad(k))"),'word session was overwritten');
 ok(ev("recallCurrentSession().keys.join()")==='r:9,r:38,r:39','staged deck differs from guide');
 ev("for(let i=0;i<3;i++){recallReveal();recallGrade(3)}");
 ok(doc.querySelector('.recall-writer'),'radical writing missing');
 ev("for(let i=0;i<3;i++){const s=recallCurrentSession();s.current.writer={completed:true};s.revealed=true;recallWriteGrade()}");
 ok(ev('stageCardEntry(1,true).completed===1&&stageCardEntry(1).completed===0'),'radical and word schedules mixed');
});
await T('multiple lesson selections, free deck and staged batch',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[1];go('cards')");
 click(/^Постоянные$/);
 const toggle=n=>doc.querySelector(`input[aria-label="Урок ${n}"]`).click();
 toggle(2);click(/^Начать тренировку$/);
 ok(ev('State.route.deck.some(card=>card.lesson===1)&&State.route.deck.some(card=>card.lesson===2)'),'word deck missing selected lesson');
 ev("go('cards')");click(/^Ключи по урокам$/);toggle(2);click(/^Начать тренировку$/);
 ok(ev('State.route.deck.length')===ev('recallLessonKeys(1).length+recallLessonKeys(2).length'),'radical deck missing selected lesson');
 ev("go('cards')");click(/^Поэтапные$/);click(/^Пройти выбранные/);
 ok(ev("State.route.staged==='keys:1'&&State.route.remainingLessons.join()==='2'"),'batch did not enqueue lesson 2');
 ev("window.__complete()");
 ok(click(/^Следующий урок · 2$/),'batch continuation missing');
 ok(ev("State.route.staged==='keys:2'&&stageCardEntry(1,true).completed===1&&stageCardEntry(2,true).completed===0"),'batch mixed schedules');
 ev("go('cards')");click(/^Слова по урокам$/);
 ok(ev("recallState().lessons.join()==='1,2'"),'key lesson selection changed word lesson selection');
});
await T('mixed permanent prompts show handwriting without waiting for text input',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[1];recallState().mixTypes=true;shuffle=a=>a.slice();startFreeCards([1])");
 ok(ev("recallCurrentSession().current.skill")==='flip','character cue did not start with recall');
 click(/^Показать ответ$/);click(/^Вспомнил$/);
 for(const [cue,prompt]of [['ru','Запиши пиньинь'],['py','Запиши перевод']]){
   ok(ev('recallCurrentSession().facing')===cue,'wrong mixed cue');
   const input=doc.querySelector('input[aria-label="'+prompt+'"]');
   ok(input,'complementary answer missing');
   ok(doc.querySelector('.recall-writer'),'writing field gated by text input');
   input.value='ответ';input.dispatchEvent(new A.w.Event('input'));
   ev("const session=recallCurrentSession();session.current.writer={completed:true};session.revealed=true;render()");
   ok(doc.body.textContent.includes('Твой ответ — ответ'),'answer not available for comparison');
   click(/^Дальше$/);
 }
 ok(!ev('recallState().staged'),'mixed practice changed scheduled progress');
});
A.finish('simple cards');
