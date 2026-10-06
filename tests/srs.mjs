// Интервальное повторение: порядок курса, лимиты, ключи, интро, оценки, отмена, клавиатура, миграция.
import {load} from './env.mjs';
const A=await load({writer:true}); const {T,ev,ok,txt,doc,click,key}=A;
const reset=()=>ev("State.cards={}; State.meta={day:todayStr(),newToday:0,radToday:0,rev:{}}; SESSION=null; State.settings.newPerDay=12");
await T('course-order',()=>{ reset(); const q=ev("dailyQueue()");
  ok(q[0]==='r:9'&&q[1]==='你','начало курса: '+q.slice(0,4)); 
  ok(q.filter(k=>!k.startsWith('r:')).length===12,'новых слов не 12: '+q.length);
  ok(q.filter(k=>k.startsWith('r:')).length===5,'ключей не 5'); ok(q.length<=20,'лимит порции'); });
await T('skip-learned',()=>{ reset(); ev("lessonWords(1).concat(lessonWords(2)).forEach(w=>State.cards[w.s]={state:1,S:30,D:5,due:Date.now()+9e9,last:Date.now(),reps:1,lapses:0})");
  const q=ev("dailyQueue()").filter(k=>!k.startsWith('r:')); ok(ev(`WORD_L['${q[0]}']`)===3,'должен начаться урок 3: '+q[0]); });
await T('due-first',()=>{ reset(); ev("State.cards['床']={state:1,S:2,D:5,due:Date.now()-1000,last:Date.now()-2*864e5,reps:2,lapses:0}"); ok(ev("dailyQueue()[0]")==='床','повторение не первым'); });
await T('budget',()=>{ reset(); ev("State.meta.newToday=12"); ok(ev("dailyQueue().length")===0,'лимит новых не работает'); ev("State.settings.newPerDay=0; State.meta.newToday=0"); ok(ev("dailyQueue().length")===0,'0 новых в день'); });
await T('lesson-pool',()=>{ reset(); const q=ev("poolQueue(lessonKeys(18))"); ok(q.length===20,'порция урока: '+q.length);
  ok(q.every(k=>k.startsWith('r:')||ev(`WORD_L['${k}']`)<=18&&ev(`BYS['${k}'].k.includes(18)`)),'чужие слова в уроке'); });
await T('intro-then-question',()=>{ reset(); ev("startSession(['你','好'],'recog','t')"); ok(/Новое слово/.test(txt()),'нет интро');
  ok(doc.querySelectorAll('#screen .bk').length>=1,'нет разбора в интро'); click(/Запомнил/); ok(/Что значит/.test(txt()),'нет вопроса после интро');
  key(' '); ok(doc.querySelector('.grade.g3'),'Space не показал ответ'); key('2');
  ok(ev("SESSION.done")===1&&ev("State.meta.newToday")===1,'оценка не засчитана'); ok(ev("State.cards['你'].state")===1,'карточка не создана'); });
await T('undo',()=>{ ok(click(/Отменить/),'нет кнопки отмены'); ok(ev("SESSION.done")===0&&ev("State.meta.newToday")===0&&!ev("State.cards['你']"),'undo не откатил');
  ok(ev("SESSION.current")==='你','undo не вернул карточку'); });
await T('keyboard-backspace',()=>{ click(/Запомнил/); key(' '); key('1'); ok(ev("SESSION.again.includes('你')"),'не в повтор'); key('Backspace'); ok(!ev("SESSION.again.includes('你')")&&ev("SESSION.done")===0,'Backspace'); });
await T('already-known',()=>{ reset(); ev("startSession(['床'],'auto','t')"); click(/Уже знаю/); const c=ev("State.cards['床']"); ok(c&&c.S>10,'«Уже знаю» не дал длинный интервал'); ok(/Готово/.test(txt()),'не завершилось'); });
await T('radical-flow',()=>{ reset(); ev("startSession(['r:38'],'auto','t')"); ok(/Новый ключ №38/.test(txt())&&/женщина/.test(txt()),'интро ключа'); click(/Запомнил/);
  const ch=doc.querySelectorAll('.choice'); ok(ch.length===4,'нет 4 вариантов'); const right=[...ch].find(b=>/женщина|^女$/.test(b.textContent)); ok(right,'нет верного варианта'); right.click();
  ok(doc.querySelector('.choice.correct'),'не отмечен верный'); key(' '); ok(ev("State.cards['r:38'].state")===1&&ev("State.meta.radToday")===1,'ключ не засчитан'); });
await T('modes',()=>{ reset();
  for(const m of ['recog','choice','produce','recall','pinyin','listen','tones','write','dictate']){
    ev("State.cards['睡觉']={state:1,S:5,D:5,due:0,last:Date.now()-5*864e5,reps:3,lapses:0}");
    ev(`startSession(['睡觉'],'${m}','t')`); ok(ev("SESSION.cur")===m,'режим '+m+' → '+ev("SESSION.cur")); }
  ev("startSession(['睡觉'],'tones','t')"); const tc=doc.querySelectorAll('.tc'); ok(tc.length===2,'тоны: '+tc.length);
  for(let i=0;i<4;i++){ tc[0].click(); tc[1].click(); }     // shuì=4, jiào=4
  click(/^Проверить$/); ok(/все тоны верны/.test(txt()),'тоны не приняты');
  ev("startSession(['睡觉'],'pinyin','t')"); const inp=doc.querySelector('.tinput'); inp.value='shui jiao'; click(/^Проверить$/); ok(/✓ верно/.test(txt()),'пиньинь без тонов не принят');
  ev("startSession(['睡觉'],'write','t')"); A.w.__quiz.onComplete(); A.w.__quiz.onComplete(); ok(/без ошибок/.test(txt()),'прописи: '+txt().slice(0,60)); key(' ');
  ok(ev("State.cards['睡觉'].reps")===4,'оценка после прописей'); });
await T('auto-fallbacks',()=>{ ev("State.cards['哪儿']={state:1,S:5,D:5,due:0,last:0,reps:2,lapses:0}"); ev("startSession(['哪儿'],'tones','t')"); ok(ev("SESSION.cur")==='recog','эрхуа без тонов'); });
await T('done-and-more',async()=>{ reset(); ev("startSession(['你','好'],'recog','t',()=>['吗'])");
  for(let i=0;i<10&&!/Готово/.test(txt());i++){ if(click(/Запомнил/)) continue; key(' '); key(i===1?'1':'2'); }
  for(let i=0;i<6&&!/Готово/.test(txt());i++){ key(' '); key('2'); }
  ok(/Готово/.test(txt()),'не завершилось'); ok(/Ошибки/.test(txt())&&/Повторить ошибки/.test(txt()),'нет разбора ошибок'); ok(/Ещё порция \(1\)/.test(txt()),'нет «ещё порции»'); });
await T('resume',()=>{ reset(); ev("startSession(['你','好','吗'],'recog','t'); go('home')"); ok(click(/Продолжить сессию/),'нет продолжения'); ok(ev("State.route.name")==='session','не вернулись'); });
await T('streak',()=>{ ev(`State.meta.rev={[todayStr()]:3,[dstr(new Date(Date.now()-864e5))]:2}`); ok(ev("streakDays()")===2,'серия'); });
A.finish('srs: порядок курса, лимиты, ключи, интро, режимы, undo, клавиатура, порции');
