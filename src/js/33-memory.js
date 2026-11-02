/*==================================================================
  ТЕТРАДЬ ПАМЯТИ: три дня по совету репетитора, затем интервалы FSRS.
  Три независимых навыка: письмо, пиньинь с тоном, перевод. Самопроверка
  на бумаге: приложение не выдаёт узнавание/обводку за письмо по памяти.
  Старые карточки и их расписание сохраняются. Состояние сессии в IndexedDB.
==================================================================*/
const MEMORY_SKILLS=['hz','py','ru'];
const MEMORY_LABELS={hz:'Написание',py:'Пиньинь и тон',ru:'Перевод'};
function memoryState(){
  const m=State.meta.memory||(State.meta.memory={v:1,entries:{},session:null,lesson:0});
  if(!m.entries||typeof m.entries!=='object') m.entries={};
  return m;
}
function memoryValid(k){ return isRad(k)?Number.isInteger(radNum(k))&&radNum(k)>=1&&radNum(k)<=214:!!BYK[k]&&inSem(k); }
function memoryInfo(k){
  if(isRad(k)){ const n=radNum(k), r=RADS[n-1]; return {k,hz:(RADW[n]||[]).map(f=>f[0]).join(' / ')||r[4][0],py:r[2],ru:r[3],label:'Ключ №'+n,rad:true}; }
  const w=BYK[k]; return {k,hz:w.d||w.s,py:w.p,ru:meaning(w),label:'Урок '+WORD_L[k],w};
}
function memoryEnroll(k){
  if(!memoryValid(k)) return null;
  const m=memoryState();
  if(!m.entries[k]) m.entries[k]={start:todayStr(),days:[],skills:{}};
  return m.entries[k];
}
function memoryRows(e){ return Math.min(3,(e.days||[]).length); }
function memoryDueSkills(e,day){
  day=day||todayStr(); const rows=memoryRows(e);
  return MEMORY_SKILLS.filter(sk=>{
    const s=e.skills[sk];
    if(s&&s.day===day) return false;
    if(rows<3) return !e.days.length||day>e.days[e.days.length-1];
    return !s||!s.card||s.card.due<=Date.now();
  });
}
function memoryDueKeys(){
  return Object.keys(memoryState().entries).filter(memoryValid).filter(k=>memoryDueSkills(memoryState().entries[k]).length)
    .sort((a,b)=>{ const x=memoryState().entries[a], y=memoryState().entries[b]; return (x.days[0]||x.start).localeCompare(y.days[0]||y.start); });
}
function memoryStats(){
  const m=memoryState(), entries=Object.entries(m.entries).filter(([k])=>memoryValid(k));
  const stat=rad=>{ const es=entries.filter(([k])=>isRad(k)===rad).map(([,e])=>e); return {
    started:es.length,threeDays:es.filter(e=>memoryRows(e)>=3).length,
    solid:es.filter(e=>memoryRows(e)>=3&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].card&&e.skills[sk].grade>=2&&e.skills[sk].card.S>=21)).length,
    ready:es.filter(e=>memoryRows(e)>=3&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].card&&e.skills[sk].grade>=2&&e.skills[sk].card.S>=7)).length}; };
  return {words:stat(false),keys:stat(true),due:memoryDueKeys().length,active:!!(m.session&&m.session.index<m.session.tasks.length),
    doneToday:entries.filter(([,e])=>(e.days||[]).includes(todayStr())).length};
}
function memoryNewCandidates(rad,L){
  const m=memoryState(), pool=rad?KEY_ORDER.map(n=>'r:'+n):semWords().filter(k=>!L||WORD_L[k]===L);
  return pool.filter(k=>!m.entries[k]).sort((a,b)=>Number(isNew(a))-Number(isNew(b)));
}
function memoryPaceNote(){
  const w=todayWordsQuota().left, k=todayKeysQuota().left;
  return w?'План семестра: ещё '+w+' новых слов сегодня. Бери по 3 с перерывами.'+(k?' Ключей: '+k+'.':''):'Новые слова по плану на сегодня сделаны.'+(k?' Ключей осталось на сегодня: '+k+'.':'');
}
function memoryCard(){
  const st=memoryStats(), c=el('div','hero memory-hero study-card'); c.style.marginTop='12px';
  c.innerHTML=`<div class="kind">${IC('brush',16)} Тетрадь памяти · 3 дня + повторения</div><h2>Вспомнить. Написать. Закрепить.</h2><p class="note">Короткая порция: до 3 слов и 2 ключей. Письмо, пиньинь и перевод проверяются отдельно.</p><div class="note">${st.due?'Ждут повторения: <b>'+st.due+'</b>':'Можно взять новую порцию'} · сегодня проверено: ${st.doneToday}</div><div class="note">${esc(memoryPaceNote())}</div>`;
  const b=el('button','btn',st.active?'Продолжить тетрадь':st.due?'Повторить по памяти':'Начать с малого');
  b.style.marginTop='10px'; b.onclick=()=>memoryStart(); c.appendChild(b); return c;
}
function memoryStart(o){
  o=o||{}; const m=memoryState();
  if(m.session&&m.session.index<m.session.tasks.length&&!o.restart){ go('memory'); return; }
  const L=+m.lesson||0, due=memoryDueKeys();
  // Не теряем просроченные: следующая порция возьмёт оставшиеся. Пока есть
  // долги, новые автоматически не добавляем; можно взять их отдельной кнопкой.
  const keys=o.newOnly?[]:due.slice(0,5);
  if(!keys.length){
    const words=memoryNewCandidates(false,L).slice(0,3), rads=memoryNewCandidates(true).slice(0,2);
    keys.push(...(o.kind==='keys'?[]:words),...(o.kind==='words'?[]:rads));
  }
  if(!keys.length){ toast('Новых в выбранном наборе нет. Повторим, когда придёт срок.'); return; }
  keys.forEach(memoryEnroll);
  const tasks=keys.flatMap(k=>memoryDueSkills(m.entries[k]).map(skill=>({k,skill,retry:false})));
  if(!tasks.length){ toast('Эта порция уже сделана сегодня'); return; }
  m.session={tasks,index:0,studied:[],reveal:false,marks:[],started:todayStr(),keys:keys.slice()};
  save('meta'); go('memory');
}
function memoryRecordSkill(k,skill,grade){
  skill=({writing:'hz',pinyin:'py',meaning:'ru'})[skill]||skill;
  if(!MEMORY_SKILLS.includes(skill)||!memoryValid(k)) return;
  const e=memoryEnroll(k), old=e.skills[skill];
  // Исправление в тот же день не повышает стабильность. Более поздняя
  // ошибка (например, на диктанте) может понизить оценку за этот день.
  const g=Math.max(1,Math.min(3,+grade||1));
  if(old&&old.day===todayStr()&&g>=old.grade) return;
  const prior=old&&old.day===todayStr()?(old.prior||old.card):(old&&old.card||{});
  const card=FSRS.review(prior,g,REQ);
  e.skills[skill]={card,day:todayStr(),grade:g,prior};
  if(MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].day===todayStr())){
    if(!e.days.includes(todayStr())) e.days.push(todayStr());
  }
  // После первых трёх дней навыки могут повторяться в разные даты.
  // Учитываем знакомство, когда каждый уже проверен без ошибки, сохраняя
  // отдельные сроки и не меняя существующее расписание слова/ключа.
  if(isNew(k)&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].grade>=2)){
    State.cards[k]=FSRS.review({},3,REQ); if(isRad(k)) D().keys++; else D().new++;
    save('cards');
  }
  save('meta');
}
function memoryGrade(grade){
  const m=memoryState(), ss=m.session;
  if(!ss||!ss.reveal||ss.index>=ss.tasks.length) return;
  const t=ss.tasks[ss.index];
  if(!t.retry){
    memoryRecordSkill(t.k,t.skill,grade);
    ss.marks.push({k:t.k,skill:t.skill,grade});
    if(grade===1) ss.tasks.push({...t,retry:true});
    D().t++; if(grade>=2) D().ok++; if(grade>=2) addXP(5);
  }
  ss.index++; ss.reveal=false; save('meta'); render();
}
function memoryAnswer(i,skill){
  if(skill==='hz') return `<div class="han" style="font-size:54px;line-height:1.5">${esc(i.hz)}</div>`;
  if(skill==='py') return `<div class="py" style="font-size:28px">${pinyinHTML(i.py)}</div>`;
  return `<div class="qbig" style="font-size:24px">${esc(i.ru)}</div>`;
}
function viewMemory(s){
  const m=memoryState(), st=memoryStats(), ss=m.session, v=el('div','view');
  s.appendChild(v);
  const back=el('button','back',IC('chev',14)+' На путь'); back.onclick=()=>go('path'); v.appendChild(back);
  if(ss&&ss.index<ss.tasks.length){
    const t=ss.tasks[ss.index], e=m.entries[t.k], i=memoryInfo(t.k), row=memoryRows(e)+1;
    v.appendChild(el('div','kind',`${i.label} · ${t.retry?'Исправление ошибки':row<=3?'День '+row+' из 3':'Повторение'} · ${ss.index+1}/${ss.tasks.length}`));
    v.appendChild(el('div','progress',`<i style="width:${ss.index/ss.tasks.length*100}%"></i>`));
    if(!e.days.length&&!ss.studied.includes(t.k)){
      const c=el('div','qcard introcard');
      c.innerHTML=`<div class="newtag">${IC('brush',16)} День 1 · первая строка</div><div class="han" style="font-size:64px">${esc(i.hz)}</div><div class="py">${pinyinHTML(i.py)}</div><div class="tr">${esc(i.ru)}</div><p class="note">Прочитай вслух. Запиши слово, пиньинь и перевод. Под ними оставь по три строки для иероглифов и пиньиня: сегодня заполни первую, завтра вторую, послезавтра третью.</p>${i.w?wordFormulas(i.w):''}`;
      v.appendChild(c);
      const say=el('button','say',SPK(18)+' Послушать'); say.onclick=()=>Speech.say(i.rad?(RADW[radNum(t.k)]||[[i.hz]])[0][0]:i.w.s,undefined,i.py); v.appendChild(say);
      const b=el('button','btn','Закрыть образец и вспомнить'); b.dataset.key='space'; b.style.marginTop='12px';
      b.onclick=()=>{ ss.studied.push(t.k); save('meta'); render(); }; v.appendChild(b); return;
    }
    const c=el('div','qcard'); c.style.minHeight='180px';
    const prompts={hz:'Напиши иероглифы по памяти',py:'Запиши пиньинь с тонами',ru:'Вспомни перевод'};
    v.appendChild(el('h2','',prompts[t.skill]));
    c.innerHTML=t.skill==='hz'?`<div class="qbig" style="font-size:25px">${esc(i.ru)}</div>`:`<div class="han" style="font-size:64px">${esc(i.hz)}</div>`;
    c.insertAdjacentHTML('beforeend',`<p class="note">${t.skill==='hz'?(i.rad?'Основная форма и форма в составе знака, если она есть. ':'')+'Заполни одну строку на бумаге. Сначала вспомни, потом сверяй.':t.skill==='py'?'Заполни одну строку пиньиня на бумаге. Не забудь тон каждого слога.':'Произнеси или запиши значение до открытия ответа.'}</p>`);
    v.appendChild(c);
    if(!ss.reveal){
      const b=el('button','btn','Сверить с образцом'); b.dataset.key='space'; b.onclick=()=>{ ss.reveal=true; save('meta'); render(); }; v.appendChild(b);
      v.appendChild(el('p','note','Самопроверка на бумаге. Приложение не распознаёт рукописный ответ.'));
    }else{
      const ans=el('div','hero',memoryAnswer(i,t.skill)); ans.style.marginTop='12px'; v.appendChild(ans);
      v.appendChild(el('p','note',t.skill==='hz'?'Сравни все знаки и их части. Порядок черт можно потренировать в «Прописях».':t.skill==='py'?'Проверь каждый слог и тон. Пропущенный или неверный тон — ошибка.':'Допустим близкий по смыслу перевод. Если смысл изменился — повтори.'));
      if(t.retry){ const b=el('button','btn','Исправил — дальше'); b.dataset.key='space'; b.onclick=()=>memoryGrade(3); v.appendChild(b); }
      else{
        const bar=el('div','gradebar three'); bar.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
        [[1,'Не вспомнил'],[2,'С трудом'],[3,'Без подсказок']].forEach(([g,label])=>{ const b=el('button','grade g'+g,label); b.dataset.ch=String(g); b.onclick=()=>memoryGrade(g); bar.appendChild(b); }); v.appendChild(bar);
      }
    }
    const pause=el('button','linkbtn','Сделать паузу'); pause.onclick=()=>go('path'); v.appendChild(pause); return;
  }
  if(ss){
    const failed=ss.marks.filter(x=>x.grade===1), count=ss.keys.length;
    v.appendChild(el('h2','','Порция завершена'));
    v.appendChild(el('p','note',`${count} ${plural(count,'элемент','элемента','элементов')} · ${failed.length?'ошибок: '+failed.length+' — исправили и вернёмся к ним раньше.':'Все три навыка проверены.'} Для первых трёх дней новая строка откроется завтра. После третьего дня каждый навык повторяется к своему сроку.`));
    ss.keys.forEach(k=>{ const e=m.entries[k], i=memoryInfo(k); v.appendChild(el('div','cell',`<b class="han">${esc(i.hz)}</b><span>${Math.min(3,memoryRows(e))}/3 дня · ${esc(i.ru)}</span>`)); });
    const b=el('button','btn','Готово на сейчас'); b.onclick=()=>{ m.session=null; save('meta'); go('path'); }; v.appendChild(b);
    const more=el('button','linkbtn','Ещё короткую порцию'); more.onclick=()=>{ m.session=null; memoryStart(); }; v.appendChild(more); return;
  }
  v.appendChild(el('h1','','Тетрадь памяти'));
  v.appendChild(el('p','note','Небольшая порция каждый день. Сначала вспомни сам, затем проверь: так тренируется память, а не только узнавание.'));
  const guide=el('div','hero');
  guide.innerHTML=`<div class="kind">Метод репетитора + повторения</div><h2>Три строки. Три дня.</h2><ol style="padding-left:22px;line-height:1.65"><li><b>Сегодня:</b> запиши слово, пиньинь, перевод. Оставь по 3 строки для письма и пиньиня. Заполни первую, затем закрой образец и проверь память.</li><li><b>Завтра:</b> заполни вторые строки по памяти. Отдельно проверь тоны и перевод.</li><li><b>Послезавтра:</b> заполни третьи строки. Дальше приложение вернёт каждый навык к своему сроку.</li></ol><p class="note">Ошибка — подсказка, чему уделить минуту. Не нужно переписывать страницу: исправь, закрой ответ и попробуй ещё раз.</p>`;
  v.appendChild(guide);
  const status=el('div','hero'); status.style.marginTop='12px';
  status.innerHTML=`<b>${st.due?'Пора повторить: '+st.due:'Сегодня можно взять новое'}</b><div class="note">Три дня практики: ${st.words.threeDays} слов, ${st.keys.threeDays} ключей. Закреплены все три навыка (≥21 дня): ${st.words.solid} слов, ${st.keys.solid} ключей.</div>`;
  v.appendChild(status);
  v.appendChild(el('p','note',memoryPaceNote()));
  const b=el('button','btn',st.due?'Повторить · до 5 элементов':'Начать · 3 слова + 2 ключа'); b.style.marginTop='12px'; b.onclick=()=>memoryStart(); v.appendChild(b);
  const pick=el('label','note','Новые слова из урока'); pick.style.display='block'; pick.style.marginTop='18px';
  const sel=el('select',''); sel.setAttribute('aria-label','Урок для новых слов');
  sel.innerHTML='<option value="0">По порядку · уроки 1–'+SEM().targetLesson+'</option>'+Array.from({length:SEM().targetLesson},(_,n)=>`<option value="${n+1}">Урок ${n+1}</option>`).join('');
  sel.value=String(m.lesson||0); sel.onchange=()=>{ m.lesson=+sel.value; save('meta'); }; pick.appendChild(sel); v.appendChild(pick);
  const row=el('div','actionrow');
  [['words','3 новых слова'],['keys','2 новых ключа']].forEach(([kind,label])=>{ const x=el('button','btn ghost',label); x.onclick=()=>memoryStart({newOnly:true,kind}); row.appendChild(x); }); v.appendChild(row);
  v.appendChild(el('p','note','Просроченные задания сохраняются. Новые берём небольшими порциями; если тяжело, достаточно одного повторения. Для письма пальцем открой «Повторение → Прописи».'));
}
