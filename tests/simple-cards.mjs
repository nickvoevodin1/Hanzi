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
 click(/^Постоянные$/);click(/^Листать карточки$/);
 ok(doc.querySelector('.recall-card .py')&&!doc.querySelector('.recall-card .han'),'free face ignored');
 click(/^Показать ответ$/);ok(doc.querySelector('.recall-card .han'),'free reveal failed');
 click(/^Дальше$/);click(/^Дальше$/);
 ok(ev('State.route.index')===0&&!ev('State.route.revealed'),'free deck did not wrap');
 ok(!ev('recallState().staged'),'free deck affected schedule');
});
await T('entire reading round precedes writing and each interval gates the next round',()=>{
 ev("State.meta=freshMeta();recallState().lessons=[1];Date.now=()=>window.__clock;window.__clock=100000;go('cards')");
 click(/^Начать урок$/);
 ok(ev("recallCurrentSession().facing==='han'"),'staged face changed');
 ev("recallReveal();recallGrade(3)");
 ok(ev("recallCurrentSession().current.skill==='flip'"),'writing started before whole deck');
 ev("recallReveal();recallGrade(3)");
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
A.finish('simple cards');
