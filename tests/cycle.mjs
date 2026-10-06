// Проверочные: план, все типы шагов, повтор ошибок, финал, автотренировка по уроку, дата, сброс.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,txt,doc,click,key}=A;
const path=id=>ev(`testPath(getTest('${id}')).map(p=>p.id)`);
await T('path-pr18',()=>{ const p=path('pr18'); ok(p[0]==='d1:learn'&&p.includes('rev2')&&p.includes('rev12')&&p.at(-1)==='final','путь: '+p.slice(0,3)+'…'+p.slice(-2));
  ok(p.length===13*7+5+2,'шагов '+p.length); });
await T('path-dictation',()=>{ ev("TESTS.push({id:'dx',kind:'диктант',title:'Диктант x',blocks:[TESTS[0].blocks[0]]})"); const p=path('dx');
  ok(p.join(',')==='d1:learn,d1:words,d1:tones,d1:dict,exam,final','диктант: '+p); ev("TESTS.pop()"); });
await T('plan',()=>{ ev("go('test',{home:1,tid:'pr18'})"); const t=txt(); ok(/Пройдено шагов: 0 из 98/.test(t),'план: '+t.slice(0,120)); ok(doc.querySelectorAll('.sdot').length===91,'точки шагов'); });
await T('learn-step',()=>{ click(/^Начать/); ok(/Главное в этом блоке/.test(txt())&&/Слова блока/.test(txt()),'разбор'); key(' ');
  ok(/Шаг пройден/.test(txt()),'шаг не завершён'); ok(ev("State.tp.pr18.done['d1:learn']")===1,'не сохранено'); });
await T('words-step',()=>{ click(/^Дальше: Слова/); const n=ev("T.total"); ok(n===24,'карточек слов '+n);
  key(' '); ok(doc.querySelector('#screen .bk'),'нет разбора иероглифов в ответе'); key('1');      // ошибка → вернётся
  ok(ev("T.q.length")===24&&ev("T.err")===1,'ошибка не вернулась в очередь');
  for(let i=0;i<60&&ev("T.view")==='run';i++){ key(' '); key('2'); }
  ok(/Шаг пройден/.test(txt())&&/С первого раза верно: 23 из 24/.test(txt()),'итог: '+txt().slice(0,90)); });
await T('tones-step',()=>{ click(/^Дальше: Тоны/);
  for(let g=0;g<20&&ev("T.view")==='run';g++){
    const sy=ev("T.q[0].u.sy").split(' ');
    doc.querySelectorAll('.tc').forEach((b,i)=>{ if(sy[i]==='r') return; const t=ev(`syllTone(${JSON.stringify(sy[i])})`); for(let k=0;k<t;k++) b.click(); });
    click(/^Проверить$/); ok(/Все тоны верны/.test(txt()),'тоны: '+sy.join(' ')); key(' ');
  }
  ok(/С первого раза верно: 5 из 5/.test(txt()),'тоны итог'); });
await T('tiles-step',()=>{ click(/^Дальше: Порядок слов/);
  // первую фразу собираем заведомо неверно (сдвиг на одно слово) — должна вернуться в очередь
  let tl=ev("T.q[0].x"); const wrong=tl.seg.slice(1).concat(tl.seg[0]);
  for(const s of wrong){ [...doc.querySelectorAll('.ptile.pool')].find(x=>x.textContent===s).click(); }
  click(/^Проверить$/);
  const isWrong=![tl.seg.join('')].concat(tl.alt||[]).includes(wrong.join(''));
  ok(isWrong?/Неверно/.test(txt()):/Верно/.test(txt()),'проверка плиток');
  key(' '); if(isWrong) ok(ev("T.err")===1&&ev("T.q.length")===ev("T.total"),'ошибка в плитках не вернулась');
  for(let g=0;g<30&&ev("T.view")==='run';g++){
    tl=ev("T.q[0].x");
    for(const s of tl.seg){ const b=[...doc.querySelectorAll('.ptile.pool')].find(x=>x.textContent===s); b.click(); }
    click(/^Проверить$/); ok(/Верно/.test(txt()),'верный порядок не принят'); key(' ');
  }
  ok(/Шаг пройден/.test(txt()),'плитки не завершены'); });
await T('hear-write-dict',()=>{ for(const re of [/^Дальше: На слух/,/^Дальше: РУ → 中/,/^Дальше: Диктант/]){
    ok(click(re),'нет кнопки '+re); ok(doc.querySelector('[data-say]')||/Напиши/.test(txt()),'нет задания');
    for(let g=0;g<40&&ev("T.view")==='run';g++){ key(' '); key('2'); }
    ok(/Шаг пройден/.test(txt()),'шаг '+re); } });
await T('final-score',()=>{ ev("tStart(getTest('pr18'),testPath(getTest('pr18')).length-1)"); ok(ev("T.total")===48,'финал: заданий '+ev("T.total"));
  key(' '); key('1');
  ok(ev("T.q.filter(x=>x.need===2).length")===1,'в финале ошибку нужно исправить дважды');
  for(let g=0;g<80&&ev("T.view")==='run';g++){ key(' '); key('2'); }
  ok(/Пройди её ещё раз/.test(txt()),'итог финала'); ok(JSON.stringify(ev("State.tp.pr18.final"))==='[47,48]','счёт финала '+JSON.stringify(ev("State.tp.pr18.final"))); });
await T('plan-progress',()=>{ ev("go('test',{home:1,tid:'pr18'})"); ok(/Пройдено шагов: 8 из 98/.test(txt()),'прогресс: '+txt().slice(0,140)); ok(/с первого раза 47 из 48/.test(txt()),'финал на плане'); });
await T('date',()=>{ const d=doc.querySelector('#screen input[type=date]'); ok(d&&d.value==='2026-10-06','дата'); const fut=ev("dstr(new Date(Date.now()+14*864e5))"); d.value=fut; d.dispatchEvent(new A.w.Event('change'));
  ok(ev("testDate(getTest('pr18'))")===fut,'дата не сохранилась'); });
await T('cheat',()=>{ click(/Шпаргалка/); ok(/现在几点/.test(txt())&&/Отец ещё не вернулся/.test(txt()),'шпаргалка'); });
await T('auto-lesson',()=>{ ev("go('test',{home:1,tid:'L18'})"); ok(/тренировка/.test(txt()),'авто-тренировка'); const t=ev("getTest('L18')");
  ok(t.blocks.length===3&&t.blocks.every(b=>b.w.length&&b.u.length),'блоки урока 18');
  const i=ev("testPath(getTest('L18')).findIndex(p=>p.s==='tiles')"); ev(`tStart(getTest('L18'),${i})`);
  const tl=ev("T.q[0].x"); [...doc.querySelectorAll('.ptile.pool')].reverse().forEach(b=>b.click()); click(/^Проверить$/);
  if(/Неверно/.test(txt())){ ok(click(/тоже верный/),'нет «мой порядок тоже верный»'); ok(ev("T.firstOk")===1,'не засчитано'); } });
await T('alt-order',()=>{ const i=ev("testPath(getTest('L18')).findIndex(p=>p.s==='tiles')"); ev(`tStart(getTest('L18'),${i})`);
  for(let g=0;g<10;g++){ const x=ev("T.q[0].x"); if(x.alt&&x.alt.length) break; ev("T.q.push(T.q.shift())"); ev("tGo('run')"); }
  const x=ev("T.q[0].x"); ok(x.alt&&x.alt.length,'нет фразы с альтернативой');
  const segs=x.seg.slice(); const order=[segs[1],segs[0],...segs.slice(2)];
  for(const s of order){ const b=[...doc.querySelectorAll('.ptile.pool')].find(y=>y.textContent===s); b.click(); }
  click(/^Проверить$/); ok(/Верно/.test(txt())&&/Также верно/.test(txt()),'альтернативный порядок не принят'); });
await T('reset',()=>{ ev("go('test',{home:1,tid:'pr18'})"); click(/Сбросить прогресс/); click(/Точно сбросить/); ok(/Пройдено шагов: 0 из 98/.test(txt()),'сброс'); ok(ev("State.tp.pr18.date")===ev("dstr(new Date(Date.now()+14*864e5))"),'дата пропала при сбросе'); });
await T('home-card',()=>{ ev("go('home')"); ok(/Проверочная · урок 18/.test(txt())&&/через 14 дней/.test(txt()),'карточка проверочной на главной: '+txt().slice(0,300)); });
A.finish('cycle: план, разбор, слова, тоны, плитки, перевод, диктант, финал, автотренировка, дата, сброс');
