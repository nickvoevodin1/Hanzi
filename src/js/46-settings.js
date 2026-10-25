/*==================================================================
  НАСТРОЙКИ: семестр (даты, урок группы, поездки, контрольные), игра,
  контрольные (таймер, шкала, формат разбора), голос, сброс.
==================================================================*/
function stepper(get,set,min,max,step){
  const st=el('div','stepper'), d=el('button','','−'), val=el('b','',get()), i=el('button','','+');
  d.setAttribute('aria-label','меньше'); i.setAttribute('aria-label','больше');
  d.onclick=()=>{ set(Math.max(min,get()-step)); val.textContent=get(); };
  i.onclick=()=>{ set(Math.min(max,get()+step)); val.textContent=get(); };
  st.appendChild(d); st.appendChild(val); st.appendChild(i); return st;
}
function setRow(box,title,sub,ctrl){ const r=el('div','setrow'); r.innerHTML=`<div class="lab"><b>${title}</b>${sub?`<small>${sub}</small>`:''}</div>`; if(ctrl) r.appendChild(ctrl); box.appendChild(r); return r; }
function switchEl(get,set){ const b=el('button','switch'+(get()?' on':'')); b.setAttribute('role','switch'); b.setAttribute('aria-checked',get()?'true':'false');
  b.onclick=()=>{ set(!get()); b.classList.toggle('on',get()); b.setAttribute('aria-checked',get()?'true':'false'); }; return b; }
function dateEl(get,set){ const i=el('input'); i.type='date'; i.value=get()||''; i.onchange=()=>{ if(i.value) set(i.value); }; return i; }
function segEl(opts,get,set){ const g=el('div','seg2'); opts.forEach(([v,t])=>{ const b=el('button',get()===v?'on':'',t); b.onclick=()=>{ set(v); [...g.children].forEach(x=>x.classList.remove('on')); b.classList.add('on'); }; g.appendChild(b); }); return g; }
function viewSettings(s){
  const v=el('div','view'), S=State.settings, sem=S.semester;
  const ss=()=>{ save('settings'); renderTop(); };
  v.appendChild(el('h2','title','Настройки'));
  // — семестр
  v.appendChild(el('p','eyebrow','Семестр'));
  const b1=el('div','meta');
  setRow(b1,'Семестровый план','квота новых слов считается до даты «новые слова до»',switchEl(()=>sem.on,x=>{ sem.on=x; ss(); render(); }));
  setRow(b1,'Урок группы','где сейчас группа — слова до него идут первыми',stepper(()=>sem.groupLesson,x=>{ sem.groupLesson=x; ss(); },1,NL,1));
  if(sem.on){
    setRow(b1,'Цель — до урока','слова уроков 1…N',stepper(()=>sem.targetLesson,x=>{ sem.targetLesson=x; ss(); },1,NL,1));
    setRow(b1,'Новые слова — до','после — только закрепление',dateEl(()=>sem.newWordsUntil,x=>{ sem.newWordsUntil=x; ss(); }));
    setRow(b1,'Конец семестра','итоговая контрольная / зачёт',dateEl(()=>sem.endDate,x=>{ sem.endDate=x; ss(); }));
    setRow(b1,'Каникулы с','',dateEl(()=>sem.holidays.from,x=>{ sem.holidays.from=x; ss(); }));
    setRow(b1,'Каникулы по','',dateEl(()=>sem.holidays.to,x=>{ sem.holidays.to=x; ss(); }));
    setRow(b1,'Учёба на каникулах','доля обычного дня',segEl([[0,'0'],[0.3,'0,3'],[0.5,'0,5']],()=>+sem.holidays.capacity,x=>{ sem.holidays.capacity=x; ss(); }));
    setRow(b1,'Новых ключей в день','пока не введены все 214; в поездку и на каникулах — 0',stepper(()=>sem.keysPerDay,x=>{ sem.keysPerDay=x; ss(); },0,30,1));
    setRow(b1,'Минут в обычный день','справочно',stepper(()=>sem.minutesNormal,x=>{ sem.minutesNormal=x; ss(); },10,120,5));
  }else setRow(b1,'Новых слов в день','без семестрового плана',stepper(()=>S.newPerDay,x=>{ S.newPerDay=x; ss(); },0,40,1));
  v.appendChild(b1);
  // поездки
  const b2=el('div','meta'); b2.style.padding='12px 14px';
  b2.innerHTML='<div class="lab"><b style="color:var(--title)">Поездки к родителям</b><small style="display:block;color:var(--text3);font-size:12px">в эти дни — только повторения (~10 мин), серия не сгорает</small></div>';
  const ar=el('div','actionrow'); const di=el('input'); di.type='date'; di.value=todayStr();
  const ab=el('button','btn mini','Добавить'); ab.onclick=()=>{ if(!di.value) return; sem.awayDays=uniq(sem.awayDays.concat([di.value])).sort(); ss(); render(); };
  ar.appendChild(di); ar.appendChild(ab); b2.appendChild(ar);
  const ch=el('div','datechips');
  sem.awayDays.filter(x=>x>=addDays(todayStr(),-7)).forEach(x=>{ const b=el('button','',fmtDate(x)+' ✕'); b.onclick=()=>{ sem.awayDays=sem.awayDays.filter(y=>y!==x); ss(); render(); }; ch.appendChild(b); });
  if(!ch.children.length) ch.appendChild(el('span','lbl','поездок не отмечено'));
  b2.appendChild(ch); v.appendChild(b2);
  // контрольные
  const b3=el('div','meta'); b3.style.padding='12px 14px';
  b3.innerHTML='<div class="lab"><b style="color:var(--title)">Контрольные</b><small style="display:block;color:var(--text3);font-size:12px">за 7 дней до каждой — фокус-неделя: новых слов вдвое меньше, пробная в день</small></div>';
  sem.exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
    const r=el('div','row',`<div class="tt"><b>${esc(e.title||'Контрольная')}</b><small>${fmtDate(e.date)} · уроки ${esc((e.lessons||[]).join(', ')||'—')}</small></div>`); r.style.padding='10px 0';
    const d=el('button','btn mini ghost','✕'); d.setAttribute('aria-label','удалить'); d.onclick=()=>{ sem.exams=sem.exams.filter(x=>x!==e); ss(); render(); }; r.appendChild(d); b3.appendChild(r); });
  const f=el('div',''); f.style.marginTop='8px';
  const ed=el('input'); ed.type='date';
  const et=el('input','inl'); et.type='text'; et.placeholder='Название'; et.value='Контрольная';
  const el2=el('input','inl'); el2.type='text'; el2.placeholder='Уроки: 19, 20, 21'; el2.inputMode='numeric';
  const eb=el('button','btn mini','Добавить контрольную');
  eb.onclick=()=>{ const ls=parseLessons(el2.value); if(!ed.value||!ls.length){ toast('Нужны дата и уроки'); return; } sem.exams.push({date:ed.value,title:et.value.trim()||'Контрольная',lessons:ls}); ss(); render(); };
  [ed,et,el2].forEach(x=>{ x.style.cssText='width:100%;max-width:none;margin-bottom:8px'; f.appendChild(x); }); f.appendChild(eb);
  b3.appendChild(f); v.appendChild(b3);
  // — игра
  v.appendChild(el('p','eyebrow','Игра'));
  const b4=el('div','meta');
  setRow(b4,'Дневная цель XP','кольцо в шапке; цель или все повторения — день серии',segEl([[30,'30'],[50,'50'],[80,'80'],[120,'120']],()=>S.xpGoal,x=>{ S.xpGoal=x; ss(); }));
  setRow(b4,'Звуки','короткие сигналы ответа',switchEl(()=>S.sound,x=>{ S.sound=x; ss(); if(x) Sfx.ok(); }));
  setRow(b4,'Вибрация при ошибке','',switchEl(()=>S.vibrate,x=>{ S.vibrate=x; ss(); }));
  v.appendChild(b4);
  // — контрольные: таймер, шкала, разбор
  v.appendChild(el('p','eyebrow','Пробная контрольная'));
  const b5=el('div','meta');
  setRow(b5,'Таймер, минут','',stepper(()=>S.mockMin,x=>{ S.mockMin=x; ss(); },5,120,5));
  setRow(b5,'«5» — от, %','шкала условная: поменяй, когда узнаешь настоящую',stepper(()=>S.scale[0],x=>{ S.scale[0]=Math.max(x,S.scale[1]+1); ss(); },50,100,1));
  setRow(b5,'«4» — от, %','',stepper(()=>S.scale[1],x=>{ S.scale[1]=Math.min(Math.max(x,S.scale[2]+1),S.scale[0]-1); ss(); },30,99,1));
  setRow(b5,'«3» — от, %','',stepper(()=>S.scale[2],x=>{ S.scale[2]=Math.min(x,S.scale[1]-1); ss(); },10,98,1));
  v.appendChild(b5);
  // — голос
  v.appendChild(el('p','eyebrow','Озвучка'));
  const b6=el('div','meta'), voices=Speech.list();
  setRow(b6,'Живые голоса — чёткие тоны','слова и слоги — записи носителей (audio-cmn); выключи, чтобы всё читал голос устройства',
    switchEl(()=>S.voiceRec!==false,x=>{ S.voiceRec=x; ss(); Speech.say('你好',undefined,'nǐ hǎo'); }));
  const dl=el('button','btn mini ghost',IC('headphones',18)+' Скачать');
  dl.onclick=async()=>{ const fs=Speech.files(); let n=0; dl.disabled=true;
    for(let i=0;i<fs.length;i+=12){ await Promise.all(fs.slice(i,i+12).map(u=>fetch(u).then(r=>{ if(r.ok) n++; }).catch(()=>{}))); dl.textContent=Math.round((i+12)/fs.length*100)+'%'; }
    dl.disabled=false; dl.innerHTML=IC('check',16)+' Готово'; toast(n===fs.length?'Записи сохранены — озвучка работает без интернета':'Скачано '+n+' из '+fs.length+' — проверь интернет'); };
  setRow(b6,'Записи для офлайна','≈6 МБ: '+AUD.w.size+' слов и '+AUD.s.size+' слогов; без скачивания они сохраняются по мере прослушивания',dl);
  const r3=setRow(b6,'Голос устройства',esc(Speech.voice()?Speech.voice().name:'для предложений и слов без записи'));
  if(voices.length>1){
    const sel=el('select'); sel.appendChild(el('option','','Авто')).value='';
    voices.forEach(vo=>{ const o=el('option','',esc(vo.name+' ('+vo.lang+')')); o.value=vo.name; if(S.voiceName===vo.name) o.selected=true; sel.appendChild(o); });
    sel.onchange=()=>{ S.voiceName=sel.value||null; Speech.setPref(S.voiceName); save('settings'); Speech.say('你好，我很好。'); };
    r3.appendChild(sel);
  }else{ const t=el('button','btn mini ghost',SPK()+' Проверить'); t.onclick=()=>{ Speech.say('你好，我很好。'); toast(Speech.voice()?'Голос: '+Speech.voice().name:'Китайский голос не найден'); }; r3.appendChild(t); }
  v.appendChild(b6);
  // — сброс
  const b7=el('div','meta'); b7.style.marginTop='18px';
  let armed=false; const rb=el('button','btn mini ghost','Сброс');
  rb.onclick=async()=>{ if(!armed){ armed=true; rb.textContent='Точно? Ещё раз'; rb.style.color='var(--bad)'; setTimeout(()=>{ armed=false; rb.textContent='Сброс'; rb.style.color=''; },4000); return; }
    State.cards={}; State.meta=freshMeta(); State.tp={}; SESSION=null; T=null; PLAY=null; DEC=null; SENT=null; MOCK=null; await save(); toast('Прогресс сброшен'); go('path'); };
  setRow(b7,'Сбросить прогресс','карточки, XP, серия, достижения, подготовка к проверочным (настройки и свои предложения остаются)',rb);
  v.appendChild(b7);
  const learned=Object.keys(State.cards).filter(k=>validKey(k)&&!isNew(k));
  v.appendChild(el('p','note',`В работе: ${learned.filter(k=>BYK[k]).length} слов, ${learned.filter(isRad).length} ключей, ${learned.filter(isKC).length} разборов · всего повторений: ${Object.values(State.meta.rev||{}).reduce((a,b)=>a+b,0)}.<br>
    Хранилище: ${Store.persistent()?'на устройстве (IndexedDB) — прогресс у каждого браузера свой':'в памяти (превью)'}.<br>
    Данные: Кондрашевский, том 1 (30 уроков, ${COURSE.length} слов, из них ${COURSE.filter(k=>EXTRA_OF[k]).length} — из списка группы и презентации) + HSK 1–6. Тип иероглифа и ключ — по «Пособию по иероглифике» А.Ф. Кондрашевского (ч. 1; 456 из 587 знаков уроков), строение и остальные знаки — 汉典 («Шовэнь») и Make Me a Hanzi; ключ Канси — Unihan, названия ключей — таблица ДВФУ. Озвучка — записи носителей из открытой базы audio-cmn (H. Lopez; слоги — Chen Wang, слова — Yue Tan; CC BY-SA). Интервалы — FSRS-5.`));
  s.appendChild(v);
}
