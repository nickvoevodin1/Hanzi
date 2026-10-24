/*==================================================================
  НАСТРОЙКИ
==================================================================*/
function stepper(get,set,min,max,step){
  const st=el('div','stepper'), d=el('button','','−'), val=el('b','',get()), i=el('button','','+');
  d.setAttribute('aria-label','меньше'); i.setAttribute('aria-label','больше');
  d.onclick=()=>{ set(Math.max(min,get()-step)); val.textContent=get(); };
  i.onclick=()=>{ set(Math.min(max,get()+step)); val.textContent=get(); };
  st.appendChild(d); st.appendChild(val); st.appendChild(i); return st;
}
function viewSettings(s){
  const v=el('div','view');
  v.appendChild(el('h2','title','Настройки'));
  const box=el('div','meta');
  const r1=el('div','setrow'); r1.innerHTML='<div class="lab"><b>Урок группы</b><small>Где сейчас группа. «Урок дня» догоняет до него, потом идёт дальше</small></div>';
  r1.appendChild(stepper(()=>State.settings.lesson,x=>{ State.settings.lesson=x; save('settings'); $('#topSub').textContent='Кондрашевский · урок группы '+x; },1,NL,1)); box.appendChild(r1);
  const r2=el('div','setrow'); r2.innerHTML=`<div class="lab"><b>Новых слов в день</b><small>Сегодня введено: ${State.meta.newToday||0}. Ключи — до ${RAD_PER_DAY} в день сверх этого</small></div>`;
  r2.appendChild(stepper(()=>State.settings.newPerDay,x=>{ State.settings.newPerDay=x; save('settings'); },0,40,2)); box.appendChild(r2);
  const voices=Speech.list();
  const r3=el('div','setrow'); r3.innerHTML=`<div class="lab"><b>Голос</b><small>${esc(Speech.source())}</small></div>`;
  if(voices.length>1){
    const sel=el('select'); sel.appendChild(el('option','','Авто')).value='';
    voices.forEach(vo=>{ const o=el('option','',esc(vo.name+' ('+vo.lang+')')); o.value=vo.name; if(State.settings.voiceName===vo.name) o.selected=true; sel.appendChild(o); });
    sel.onchange=()=>{ State.settings.voiceName=sel.value||null; Speech.setPref(State.settings.voiceName); save('settings'); Speech.say('你好'); };
    r3.appendChild(sel);
  }else{ const t=el('button','btn mini ghost','🔊 Проверить'); t.onclick=()=>{ Speech.say('你好'); toast(Speech.voice()?'🔊 '+Speech.voice().name:'Китайский голос не найден'); }; r3.appendChild(t); }
  box.appendChild(r3);
  v.appendChild(box);
  const box2=el('div','meta');
  const rs=el('div','setrow'); rs.innerHTML='<div class="lab"><b>Сбросить прогресс</b><small>Удалить все повторения, ключи и подготовку к проверочным</small></div>';
  let armed=false; const rb=el('button','btn mini ghost','Сброс');
  rb.onclick=async()=>{ if(!armed){ armed=true; rb.textContent='Точно? Ещё раз'; rb.style.color='var(--bad)'; setTimeout(()=>{ armed=false; rb.textContent='Сброс'; rb.style.color=''; },4000); return; }
    State.cards={}; State.meta={day:todayStr(),newToday:0,radToday:0,rev:{}}; State.tp={}; SESSION=null; T=null; await save(); toast('Прогресс сброшен'); go('home'); };
  rs.appendChild(rb); box2.appendChild(rs); v.appendChild(box2);
  const learned=Object.keys(State.cards).filter(k=>validKey(k)&&!isNew(k));
  v.appendChild(el('p','note',`В работе: ${learned.filter(k=>!isRad(k)).length} слов, ${learned.filter(isRad).length} ключей · всего повторений: ${Object.values(State.meta.rev||{}).reduce((a,b)=>a+b,0)}.<br>
    Хранилище: ${Store.persistent()?'на устройстве (IndexedDB) — прогресс у каждого браузера свой':'в памяти (превью)'}.<br>
    Данные: Кондрашевский, том 1 (30 уроков, ${COURSE.filter(k=>!isRad(k)).length} слов) + HSK 1–6. Разбор иероглифов — makemeahanzi и Unihan (номер ключа по Канси), названия ключей — таблица ДВФУ. Интервалы — FSRS-5.`));
  s.appendChild(v);
}

