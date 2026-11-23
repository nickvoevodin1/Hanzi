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
A.finish('simple cards');
