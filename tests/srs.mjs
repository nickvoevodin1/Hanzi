// Интервальное повторение: очередь дня по семестру, ключи, игровой урок (задания, ошибки, FSRS), карточки-классика, отмена.
import {load} from './env.mjs';
const A=await load({writer:true}); const {T,ev,ok,txt,doc,click,key}=A;
// обычный день: новые слова до +64 дня (65 дней ёмкости), каникулы и контрольные далеко
const reset=()=>ev(`State.cards={}; State.meta=freshMeta(); SESSION=null; PLAY=null; hideFB();
  State.settings.semester=mergeSemester({newWordsUntil:addDays(todayStr(),64),endDate:addDays(todayStr(),120),holidays:{from:addDays(todayStr(),200),to:addDays(todayStr(),210),capacity:0.3}});`);
const pick=ok2=>{ const x=ev("PLAY.cur"); const right=x.t==='choice'?ev("meaning(BYK[PLAY.cur.k])"):ev("PLAY.cur.k&&BYK[PLAY.cur.k]?BYK[PLAY.cur.k].s:''");
  const bs=[...doc.querySelectorAll('#screen .choice')]; const b=bs.find(e=>(e.textContent.slice(1)===right)===ok2); b.click(); };
await T('daily-order',()=>{ reset(); const q=ev("dailyQueue()"), n=ev("semRemaining()");
  ok(n===ev("semWords().length")&&n>=760,'слов семестра: '+n);
  ok(q.slice(0,10).join()===ev("KEY_ORDER.slice(0,10).map(n=>'r:'+n).join()"),'ключи по порядку изучения: '+q.slice(0,10));
  ok(q[10]==='你','слова — с начала курса: '+q[10]);
  ok(q.length===10+Math.ceil(n/65),'квота слов: '+(q.length-10)); });
await T('skip-learned',()=>{ reset(); ev("lessonWords(1).concat(lessonWords(2)).forEach(w=>State.cards[w.key]={state:1,S:30,D:5,due:Date.now()+9e9,last:Date.now(),reps:1,lapses:0})");
  const q=ev("newWordsToday()"); ok(ev(`WORD_L['${q[0]}']`)===3,'должен начаться урок 3: '+q[0]); });
await T('due-first',()=>{ reset(); ev("State.cards['床']={state:1,S:2,D:5,due:Date.now()-1000,last:Date.now()-2*864e5,reps:2,lapses:0}"); ok(ev("dailyQueue()[0]")==='床','повторение не первым'); });
await T('budget',()=>{ reset(); ev("D().new=todayWordsQuota().quota; D().keys=10"); ok(ev("dailyQueue().length")===0,'квота не работает');
  ev("State.settings.semester.on=false; State.settings.newPerDay=0; D().new=0"); ok(ev("newWordsToday().length")===0,'0 новых в день без семестра'); });
await T('lesson-pool',()=>{ reset(); const q=ev("poolQueue(lessonKeys(18))"), all=ev("lessonKeys(18)");
  ok(q.length===Math.min(20,all.length)&&q.every(k=>ev(`WORD_L['${k}']`)===18),'порция урока'); });
// игровой урок
await T('play-new-word',()=>{ reset(); ev("playStart(['你'],{title:'t',kind:'learn'})"); ok(/Новое слово/.test(txt()),'нет знакомства');
  ok(ev("PLAY.queue.map(t=>t.t).join()").startsWith('choice'),'после знакомства — выбор перевода');
  key(' '); ok(ev("PLAY.cur.t")==='choice','задание 1'); pick(true);
  ok(!doc.getElementById('fb').hidden&&doc.getElementById('fb').classList.contains('ok'),'панель «верно»'); ok(ev("D().xp")===10,'XP за задание: '+ev("D().xp"));
  key(' '); ok(ev("PLAY.cur.t")!=='choice'&&ev("PLAY.cur.k")==='你','задание 2'); });
await T('play-error-requeue',()=>{ const t=ev("PLAY.cur.t");
  if(['produce','listen'].includes(t)) pick(false);
  else if(t==='tones'){ doc.querySelectorAll('.trow .seg').forEach(s=>s.children[0].click()); click(/^Проверить$/); }
  ok(doc.getElementById('fb').classList.contains('bad'),'панель «ошибка»'); ok(ev("PLAY.queue.length")===1&&ev("PLAY.queue[0].retry")===1,'задание не вернулось в конец');
  key(' '); ok(ev("PLAY.cur.retry")===1,'повтор');
  const t2=ev("PLAY.cur.t"); if(['produce','listen'].includes(t2)) pick(true); else { const sy=ev("wordSylls(BYK['你'])"); doc.querySelectorAll('.trow .seg').forEach((s,i)=>s.children[ev(`syllTone('${sy[i]}')`)-1].click()); click(/^Проверить$/); }
  const c=ev("State.cards['你']"); ok(c&&c.state===1&&c.lapses===1&&c.S<1,'с ошибкой — Again: '+JSON.stringify(c)); ok(ev("D().new")===1,'новое слово засчитано');
  key(' '); ok(/Урок пройден/.test(txt()),'итог: '+txt().slice(0,60)); ok(/Ещё раз ошибки \(1\)/.test(txt()),'кнопка ошибок'); });
await T('play-good-easy',()=>{ reset(); ev("playStart(['好'],{title:'t',kind:'learn'})"); key(' ');
  for(let i=0;i<4&&ev("PLAY.cur");i++){ const t=ev("PLAY.cur.t"); if(t==='tones'){ const sy=ev("wordSylls(BYK['好'])"); doc.querySelectorAll('.trow .seg').forEach((s,i)=>s.children[ev(`syllTone('${sy[i]}')`)-1].click()); click(/^Проверить$/); } else pick(true); key(' '); }
  const c=ev("State.cards['好']"); ok(c&&c.lapses===0&&Math.abs(c.S-3.173)<.01,'без ошибок — Good: '+JSON.stringify(c));
  ev("State.cards['好'].due=Date.now()-1; State.cards['好'].last=Date.now()-3*864e5; playStart(['好'],{title:'t',kind:'review'})");
  ok(!/Новое слово/.test(txt()),'повторение без знакомства'); ev("PLAY.cur.t0=Date.now()"); const t=ev("PLAY.cur.t");
  if(['choice','produce','listen'].includes(t)){ pick(true); ok(ev("State.cards['好'].S")>20,'быстро и верно — Easy: S='+ev("State.cards['好'].S")); } });
await T('already-known',()=>{ reset(); ev("playStart(['床','你'],{title:'t',kind:'learn'})"); click(/Уже знаю/); const c=ev("State.cards['床']"); ok(c&&c.S>10,'«Уже знаю» не дал Easy');
  ok(!ev("PLAY.queue.some(t=>t.k==='床')"),'задания на 床 не убраны'); });
await T('practice-no-reschedule',()=>{ reset(); ev("State.cards['床']={state:1,S:30,D:5,due:Date.now()+9e9,last:Date.now()-864e5,reps:3,lapses:0}"); const before=ev("JSON.stringify(State.cards['床'])");
  ev("playStart(['床'],{title:'t',kind:'practice'})"); ev("PLAY.items['床'].left=1; finishItem('床')"); ok(ev("JSON.stringify(State.cards['床'])")===before,'досрочная практика изменила расписание'); });
await T('key-items',()=>{ reset(); ev("playStart(['r:38'],{title:'t',kind:'learn'})"); ok(/Новый ключ №38/.test(txt())&&/женщина/.test(txt()),'знакомство с ключом'); key(' ');
  for(let i=0;i<4&&ev("PLAY.cur");i++){ const r=ev("RADS[37]"); const b=[...doc.querySelectorAll('#screen .choice')].find(e=>{ const t=e.textContent.slice(1); return t===r[3]||t===r[4][0]; }); ok(b,'нет верного варианта'); b.click(); key(' '); }
  ok(ev("State.cards['r:38'].state")===1&&ev("D().keys")===1,'ключ не засчитан'); });
await T('types-variety',()=>{ reset(); ev("lessonKeys(14).slice(0,12).forEach((k,i)=>State.cards[k]={state:1,S:[1,5,15][i%3],D:5,due:Date.now()-1,last:Date.now()-5*864e5,reps:3,lapses:0})");
  ev("playStart(lessonKeys(14).slice(0,12),{title:'t',kind:'review'})"); const ts=ev("[PLAY.cur.t].concat(PLAY.queue.map(t=>t.t))");
  ok(new Set(ts).size>=3,'меньше 3 типов: '+ts); ok(ts.length>=10&&ts.length<=15,'длина урока: '+ts.length); ok(ts.includes('pairs'),'нет «пар»'); });
await T('pairs',()=>{ reset(); const ks=ev("lessonKeys(10).slice(0,5)"); ev(`PLAY=null; playStart(${JSON.stringify(ks)},{title:'t',kind:'practice'}); PLAY.cur={t:'pairs',ks:${JSON.stringify(ks)}}; render()`);
  const L=[...doc.querySelectorAll('.pairs .col')[0].children], R=[...doc.querySelectorAll('.pairs .col')[1].children];
  L.forEach(a=>{ a.click(); R.find(b=>b.dataset.i===a.dataset.i).click(); });
  return new Promise(r=>setTimeout(()=>{ ok(doc.getElementById('fb').classList.contains('ok'),'пары не приняты'); r(); },500)); });
await T('assemble-谢',()=>{ reset(); ev("PLAY=null; playStart(['key:谢'],{title:'t',kind:'chars'}); PLAY.queue=[]; PLAY.cur={t:'assemble',k:'key:谢',ch:'谢'}; render()");
  [...doc.querySelectorAll('.ptile')].filter(b=>['讠','身','寸'].includes(b.textContent)).forEach(b=>b.click()); click(/^Проверить$/);
  ok(/названия ключей/i.test(txt()),'плитки ключей не приняты'); click(/названия ключей/);
  for(let i=0;i<3;i++){ const n=ev("PLAY.cur.names[PLAY.cur.qi]"), name=ev(`RADS[${n}-1][3]`); [...doc.querySelectorAll('#screen .choice')].find(e=>e.textContent.slice(1)===name).click();
    if(i<2) ev("render()"); }
  ok(doc.getElementById('fb').classList.contains('ok'),'«собери из ключей» не принят'); ok(ev("State.cards['key:谢'].state")===1&&ev("D().dec")===1,'разбор не засчитан'); });
await T('write-no-loop',()=>{ reset(); ev("State.cards['睡觉']={state:1,S:15,D:5,due:Date.now()-1,last:Date.now()-15*864e5,reps:3,lapses:0}; PLAY=null; playStart(['睡觉'],{title:'t',kind:'review'}); PLAY.cur.t='write'; PLAY.answered=false; render()");
  click(/Не помню — показать/); ok(ev("PLAY.queue.length")===1&&ev("PLAY.queue[0].t")==='produce','повтор прописи — другим заданием: '+ev("PLAY.queue.map(t=>t.t)")); });
// карточки-классика: 4 кнопки
await T('cards-4-buttons',()=>{ reset(); ev("startSession(['你','好'],'recog','t')"); ok(/Новое слово/.test(txt()),'нет интро');
  click(/Запомнил/); key(' '); ok(doc.querySelectorAll('#screen .grade').length===4,'не 4 кнопки'); key('ArrowRight');
  ok(ev("SESSION.done")===1&&ev("D().new")===1,'оценка не засчитана'); ok(ev("State.cards['你'].state")===1,'карточка не создана'); });
await T('undo',()=>{ ok(click(/Отменить/),'нет кнопки отмены'); ok(ev("SESSION.done")===0&&ev("D().new")===0&&!ev("State.cards['你']"),'undo не откатил');
  ok(ev("SESSION.current")==='你','undo не вернул карточку'); });
await T('keyboard-grades',()=>{ click(/Запомнил/); key(' '); key('2'); ok(Math.abs(ev("State.cards['你'].S")-1.18385)<.001,'2 — «Трудно»'); key('Backspace'); click(/Запомнил/); key(' '); key('1'); ok(ev("SESSION.again.includes('你')"),'1 — «Не помню» в повтор'); });
await T('resume',()=>{ reset(); ev("startSession(['你','好','吗'],'recog','t'); go('practice')"); ok(click(/Продолжить карточки/),'нет продолжения'); ok(ev("State.route.name")==='session','не вернулись'); });
await T('resume-play',()=>{ reset(); ev("playStart(['你','好'],{title:'t',kind:'learn'}); go('path')"); ok(click(/Продолжить урок/),'нет продолжения урока'); ok(ev("State.route.name")==='play','не вернулись'); });
A.finish('srs: план дня, ключи, игровой урок, ошибки, FSRS, пары, сборка из ключей, карточки, отмена');
