/*==================================================================
  СЕГОДНЯ (главная)
==================================================================*/
function streakDays(){
  const rev=State.meta.rev||{}; const d=new Date();
  if(!(rev[dstr(d)]>0)) d.setDate(d.getDate()-1);
  let s=0; while(rev[dstr(d)]>0){ s++; d.setDate(d.getDate()-1); } return s;
}
function nextTest(){
  const list=TESTS.map(t=>({t,d:daysTo(testDate(t))})).filter(x=>x.d!=null&&x.d>=0).sort((a,b)=>a.d-b.d);
  return list[0]||null;
}
function viewHome(s){
  const v=el('div','view');
  const q=dailyQueue();
  const due=dueKeys().length, fresh=q.filter(isNew);
  const nw=fresh.filter(k=>!isRad(k)).length, nr=fresh.filter(isRad).length;
  const todayRev=(State.meta.rev||{})[todayStr()]||0, streak=streakDays();
  const hero=el('div','hero');
  hero.innerHTML=`<h2>${q.length?'Сегодня':'На сегодня всё 🎉'}</h2>
    <p>${q.length?'Повторения и новые слова — по урокам, ключ появляется перед первым словом с ним.':'Новые слова на сегодня введены, повторения сделаны. Загляни позже или поучи урок отдельно.'}</p>
    <div class="duebar">
      <div class="duechip rev"><b>${due}</b><span>повторить</span></div>
      <div class="duechip new"><b>${nw}${nr?'<small style="font-size:12px">+'+nr+'</small>':''}</b><span>новых${nr?' + ключи':''}</span></div>
      <div class="duechip learn"><b>${streak}</b><span>${plural(streak,'день','дня','дней')} подряд</span></div>
    </div>`;
  const b=el('button','btn',q.length?'▶ Учить ('+q.length+')':'Всё сделано'); b.disabled=!q.length;
  b.onclick=()=>startSession(dailyQueue(),'auto','Урок дня',dailyQueue);
  hero.appendChild(b);
  if(todayRev) hero.appendChild(el('p','note','Сегодня: '+todayRev+' повт., новых слов '+(State.meta.newToday||0)+', ключей '+(State.meta.radToday||0)));
  v.appendChild(hero);
  if(SESSION&&!SESSION.finished){
    const rem=SESSION.queue.length+SESSION.again.length+(SESSION.current!=null?1:0);
    if(rem>0){ const rb=el('button','btn ghost','▶ Продолжить сессию ('+rem+')'); rb.style.marginTop='10px'; rb.onclick=()=>go('session'); v.appendChild(rb); }
  }
  // ближайшая проверочная
  const nt=nextTest(), N=State.settings.lesson;
  const tc=el('div','hero'); tc.style.marginTop='12px';
  if(nt){
    const st=testStats(nt.t);
    tc.innerHTML=`<div class="kind">${esc(nt.t.kind)} · ${whenText(nt.d)}, ${fmtDate(testDate(nt.t))}</div>
      <h2 style="margin-top:4px">${esc(nt.t.title)}</h2>
      <div class="bar" style="margin:8px 0 6px"><i style="width:${st.pct}%"></i></div>
      <p>Подготовка: пройдено ${st.done} из ${st.total} шагов${st.final?' · финал с первого раза '+st.final[0]+'/'+st.final[1]:''}</p>`;
    const tb=el('button','btn mini','Готовиться ›'); tb.onclick=()=>go('test',{home:1,tid:nt.t.id}); tc.appendChild(tb);
  }else{
    const t=autoTest(N), st=testStats(t);
    tc.innerHTML=`<div class="kind">тренировка к проверочной</div><h2 style="margin-top:4px">Урок ${N}: предложения урока</h2>
      <p>Разбор → слова → тоны → порядок слов → перевод → диктант. Пройдено ${st.done} из ${st.total}.</p>`;
    const tb=el('button','btn mini','Готовиться ›'); tb.onclick=()=>go('test',{home:1,tid:t.id}); tc.appendChild(tb);
  }
  v.appendChild(tc);
  // курс: догнать группу
  const keys=courseKeys(N), wk=keys.filter(k=>!isRad(k)), rk=keys.filter(isRad);
  const lw=learnedCount(wk), lr=learnedCount(rk), left=wk.length-lw, pct=wk.length?Math.round(lw/wk.length*100):0;
  const cc=el('div','hero'); cc.style.marginTop='12px';
  const pace=State.settings.newPerDay>0?Math.ceil(left/State.settings.newPerDay):null;
  cc.innerHTML=`<div class="kind">курс · уроки 1–${N}</div>
    <h2 style="margin-top:4px">${left?'Догнать группу: '+left+' '+plural(left,'слово','слова','слов'):'Все слова уроков 1–'+N+' в работе ✓'}</h2>
    <div class="bar" style="margin:8px 0 6px"><i style="width:${pct}%"></i></div>
    <p>Слова: ${lw} из ${wk.length} · ключи: ${lr} из ${rk.length}<br>${left?(pace!=null?'При '+State.settings.newPerDay+' новых в день — ещё ~'+pace+' '+plural(pace,'день','дня','дней')+'.':'Новые слова выключены в настройках.'):(N<NL?'Дальше «Урок дня» берёт слова урока '+(N+1)+'.':'Том 1 пройден.')}</p>`;
  const lb=el('button','btn mini ghost','Урок '+N+' ›'); lb.onclick=()=>go('lesson',{L:N}); cc.appendChild(lb);
  const cb=el('button','btn mini ghost','Сменить урок группы'); cb.style.marginLeft='8px'; cb.onclick=()=>go('settings'); cc.appendChild(cb);
  v.appendChild(cc);
  // трудные слова
  const tough=Object.keys(State.cards).filter(k=>validKey(k)&&(cardOf(k).lapses||0)>=3);
  if(tough.length){
    const tb=el('button','btn ghost','Трудные ('+tough.length+') — отработать'); tb.style.marginTop='12px';
    tb.onclick=()=>startSession(shuffle(tough).slice(0,SESSION_CAP),'auto','Трудные'); v.appendChild(tb);
  }
  if(!Store.persistent()) v.appendChild(el('p','note','⚠︎ Превью без постоянного хранилища: прогресс живёт до перезагрузки. В установленном приложении / на GitHub Pages сохраняется.'));
  s.appendChild(v);
}

