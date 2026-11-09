/*==================================================================
  ТЕТРАДЬ ПАМЯТИ: три дня по совету репетитора, затем интервалы FSRS.
  Три независимых навыка: письмо, пиньинь с тоном, перевод. Самопроверка
  на бумаге: приложение не выдаёт узнавание/обводку за письмо по памяти.
  Старые карточки и их расписание сохраняются. Состояние сессии в IndexedDB.
==================================================================*/
const MEMORY_SKILLS=['hz','py','ru'];
const MEMORY_LABELS={hz:'Написание',py:'Пиньинь и тон',ru:'Перевод'};
function memoryState(){
  const m=State.meta.memory||(State.meta.memory={v:2,entries:{},session:null,lesson:0,round:0});
  if(!m.entries||typeof m.entries!=='object') m.entries={};
  return m;
}
function memoryValid(k){ return isRad(k)?Number.isInteger(radNum(k))&&radNum(k)>=1&&radNum(k)<=214:!!BYK[k]&&inSem(k); }
function memoryInfo(k){
  if(isRad(k)){ const n=radNum(k), r=RADS[n-1]; return {k,hz:(RADW[n]||[]).map(f=>f[0]).join(' / ')||r[4][0],py:r[2],ru:r[3],label:'Ключ №'+n,rad:true}; }
  const w=BYK[k]; return {k,hz:w.d||w.s,py:w.p,ru:meaning(w),label:'Урок '+WORD_L[k],w};
}
function memoryActuallyStarted(e){ return !!(e&&(e.studied||(e.days||[]).length||Object.values(e.skills||{}).some(s=>s&&s.card&&s.card.state))); }
function memoryEnroll(k,o){
  if(!memoryValid(k)) return null;
  const m=memoryState();
  if(!m.entries[k]) m.entries[k]={start:todayStr(),days:[],skills:{}};
  const e=m.entries[k];
  if(o&&o.fresh&&!memoryActuallyStarted(e)){ e.initialStudy=true; delete e.priorLearned; }
  if(o&&o.priorLearned&&!e.initialStudy&&!memoryActuallyStarted(e)) e.priorLearned=true;
  return e;
}
function memoryRows(e){ return Math.min(3,(e.days||[]).length); }
function memoryDueSkills(e,day){
  if(!e) return MEMORY_SKILLS.slice();
  day=day||todayStr(); const rows=memoryRows(e), ss=e.skills||{};
  return MEMORY_SKILLS.filter(sk=>{
    const x=ss[sk];
    if(!e.priorLearned&&rows<3){
      // The tutor's first three rows are three calendar days, never three
      // repetitions on one day. Corrections stay ungraded in this phase.
      if(x&&x.day===day||e.practice&&e.practice[sk]&&e.practice[sk].day===day) return false;
      return !(e.days||[]).length||day>e.days[e.days.length-1];
    }
    // A scheduled Again really returns after six minutes, even if the last
    // review was today. Merely seeing its correction cannot move this due.
    return !x||!x.card||x.card.due<=Date.now();
  });
}
function memoryOldPool(o){
  o=o||{}; const es=(State.meta.memory||{}).entries||{};
  const allowed=o.oldKeys?new Set(o.oldKeys):null;
  return [...new Set(semWords().concat(KEY_ORDER.map(n=>'r:'+n),Object.keys(es)))].filter(k=>memoryValid(k)&&(!allowed||allowed.has(k))&&(!isNew(k)||memoryActuallyStarted(es[k])));
}
function memoryBaseDue(k,e){ return !isNew(k)&&isDue(k)&&(!e||!e.baseReviewedAt||cardOf(k).due>e.baseReviewedAt); }
function memoryOldDue(k,es){ const e=es[k]; return memoryDueSkills(e).length>0||memoryBaseDue(k,e); }
function memoryDueKeys(){
  const es=(State.meta.memory||{}).entries||{};
  return memoryOldPool().filter(k=>memoryOldDue(k,es));
}
// Read-only: even previewing the plan must not create daily rows, enrol old
// cards, change their mastery, or turn unlearned vocabulary into reviews.
function memoryPlan(o){
  o=o||{}; const m=State.meta.memory||{}, es=m.entries||{}, L=o.lesson==null?(+m.lesson||0):+o.lesson;
  const old=memoryOldPool(o), due=old.filter(k=>memoryOldDue(k,es));
  const d=(State.meta.daily||{})[todayStr()]||{}, sem=SEM();
  const wq=sem.on?wordsQuota({remaining:semWords().filter(isNew).length,introduced:d.new||0,more:!!d.more}).left:Math.max(0,(State.settings.newPerDay||0)-(d.new||0));
  const kq=Math.max(0,keysQuota()-(d.keys||0));
  const wp=semWords().filter(k=>(!L||WORD_L[k]===L)&&isNew(k)&&!memoryActuallyStarted(es[k]));
  const kp=KEY_ORDER.map(n=>'r:'+n).filter(k=>isNew(k)&&!memoryActuallyStarted(es[k]));
  let nw=wp.slice(0,Math.min(wq,o.kind==='keys'?0:old.length?1:3));
  let nk=kp.slice(0,Math.min(kq,o.kind==='words'?0:old.length?1:2));
  if(o.kind&&old.length){ if(o.kind==='words') nw=wp.slice(0,Math.min(wq,2)); else nk=kp.slice(0,Math.min(kq,2)); }
  let fresh=nw.concat(nk);
  if(due.length>10&&fresh.length>1) fresh=[fresh[(m.round||0)%fresh.length]];
  const rank=k=>{
    const e=es[k], skills=e&&Object.values(e.skills||{})||[], c=cardOf(k);
    const failed=skills.some(x=>x.grade===1)?0:1;
    const stability=skills.length?Math.min(...skills.map(x=>x.card&&x.card.S||0)):(c&&c.S||0);
    const date=Math.min(c&&c.due||Infinity,...skills.map(x=>x.card&&x.card.due||Infinity));
    return [failed,stability,date,e&&e.lastPracticedAt||0];
  };
  const compare=(a,b)=>{ const x=rank(a),y=rank(b); for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return x[i]-y[i]; return 0; };
  const balance=(pool,n)=>{
    const a=pool.filter(k=>!isRad(k)).sort(compare), b=pool.filter(isRad).sort(compare), out=[];
    let rad=(m.round||0)%2===1;
    while(out.length<n&&(a.length||b.length)){ const p=rad?(b.length?b:a):(a.length?a:b); out.push(p.shift()); rad=!rad; }
    return out;
  };
  const room=5-fresh.length;
  const selectedDue=balance(due,room);
  // One early check at most; rotate instead of showing the same familiar
  // sign each round. The rotation clock is separate from FSRS.last.
  const maintenance=old.filter(k=>!due.includes(k)&&k!==m.lastMaintenanceKey&&(!es[k]||es[k].priorLearned||memoryRows(es[k])>=3)&&(!es[k]||!es[k].lastPracticedAt||Date.now()-es[k].lastPracticedAt>=10*60e3))
    .sort((a,b)=>{
      const ea=es[a],eb=es[b], cross=State.meta.learnedPractice||{};
      const x=Math.max(ea&&ea.lastPracticedAt||0,+cross[a]||0), y=Math.max(eb&&eb.lastPracticedAt||0,+cross[b]||0);
      return x-y;
    });
  const selectedMaintenance=selectedDue.length<room?maintenance.slice(0,1):[];
  const chosenOld=selectedDue.concat(selectedMaintenance), keys=[];
  // Spread new material through the familiar portion.
  let oi=0,ni=0;
  while(oi<chosenOld.length||ni<fresh.length){ if(oi<chosenOld.length) keys.push(chosenOld[oi++]); if(ni<fresh.length) keys.push(fresh[ni++]); }
  return {keys,freshKeys:fresh,dueKeys:selectedDue,maintenanceKeys:selectedMaintenance,dueCount:due.length,oldCount:old.length};
}
function memoryStats(){
  const m=memoryState(), entries=Object.entries(m.entries).filter(([k])=>memoryValid(k));
  const stat=rad=>{ const es=entries.filter(([k])=>isRad(k)===rad).map(([,e])=>e); return {
    started:es.length,threeDays:es.filter(e=>memoryRows(e)>=3).length,
    solid:es.filter(e=>(e.priorLearned||memoryRows(e)>=3)&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].card&&e.skills[sk].grade>=2&&e.skills[sk].card.S>=21)).length,
    ready:es.filter(e=>(e.priorLearned||memoryRows(e)>=3)&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].card&&e.skills[sk].grade>=2&&e.skills[sk].card.S>=7)).length}; };
  return {words:stat(false),keys:stat(true),due:memoryDueKeys().length,active:!!(m.session&&m.session.index<m.session.tasks.length),
    doneToday:entries.filter(([,e])=>e.lastPracticedDay===todayStr()||(e.days||[]).includes(todayStr())).length};
}
function memoryNewCandidates(rad,L){
  const es=(State.meta.memory||{}).entries||{}, pool=rad?KEY_ORDER.map(n=>'r:'+n):semWords().filter(k=>!L||WORD_L[k]===L);
  return pool.filter(k=>isNew(k)&&!memoryActuallyStarted(es[k]));
}
function memoryPaceNote(){ return 'Каждый круг соединяет новое со знакомым. Если повторений накопилось много, новая порция станет меньше. Можно остановиться после одного круга.'; }
function memoryPlanLabel(p){ const n=p.freshKeys.length, old=p.dueKeys.length+p.maintenanceKeys.length; return n+' '+plural(n,'новый элемент','новых элемента','новых элементов')+' + '+old+' '+plural(old,'знакомый','знакомых','знакомых'); }
function memoryCard(){
  const st=memoryStats(), p=memoryPlan(), c=el('div','hero memory-hero study-card'); c.style.marginTop='12px';
  const ss=memoryState().session, plan=st.active&&ss.plan?ss.plan:p;
  c.innerHTML=`<div class="kind">${IC('brush',16)} Новое + знакомое</div><h2>Помнить всё, что уже выучил.</h2><p class="note">Следующий круг: <b>${esc(memoryPlanLabel(plan))}</b>. Письмо, пиньинь и перевод — по памяти, с чередованием заданий.</p><div class="note">${esc(memoryPaceNote())}</div>`;
  const b=el('button','btn',st.active?'Продолжить круг':p.keys.length?'Начать короткий круг':'На сегодня достаточно');
  b.disabled=!st.active&&!p.keys.length; b.style.marginTop='10px'; b.onclick=()=>memoryStart(); c.appendChild(b); return c;
}
function memoryStart(o){
  o=o||{}; const m=memoryState();
  if(m.session&&m.session.index<m.session.tasks.length&&!o.restart){ go('memory'); return; }
  const p=memoryPlan(o);
  if(!p.keys.length){ toast('На сегодня достаточно. Знакомое вернётся к своему сроку.'); return; }
  m.round=(m.round||0)+1;
  const flags={};
  p.keys.forEach(k=>{
    const e=memoryEnroll(k,{priorLearned:!isNew(k)}), maintenance=p.maintenanceKeys.includes(k);
    flags[k]={fresh:p.freshKeys.includes(k),maintenance,baseDue:memoryBaseDue(k,e),baseBefore:cardOf(k)?clone(cardOf(k)):null};
    if(maintenance) m.lastMaintenanceKey=k;
  });
  // Skill rounds interleave signs: write A/B/C, then pinyin A/B/C, then meaning.
  const tasks=MEMORY_SKILLS.flatMap(skill=>p.keys.filter(k=>flags[k].maintenance||flags[k].baseDue||memoryDueSkills(m.entries[k]).includes(skill)).map(k=>({k,skill,retry:false,maintenance:flags[k].maintenance})));
  m.session={tasks,index:0,studied:[],reveal:false,marks:[],started:todayStr(),keys:p.keys.slice(),flags,plan:p};
  save('meta'); go('memory');
}
function memoryCompleteDay(e){
  if(MEMORY_SKILLS.every(sk=>(e.practice&&e.practice[sk]&&e.practice[sk].day===todayStr())||(e.skills[sk]&&e.skills[sk].day===todayStr()))&&!e.days.includes(todayStr())) e.days.push(todayStr());
}
function memoryRecordSkill(k,skill,grade,o){
  skill=({writing:'hz',pinyin:'py',meaning:'ru'})[skill]||skill; o=o||{};
  if(!MEMORY_SKILLS.includes(skill)||!memoryValid(k)) return;
  const existing=(State.meta.memory||{}).entries||{}, learnedBefore=!isNew(k)&&!memoryActuallyStarted(existing[k]);
  const e=memoryEnroll(k,{priorLearned:learnedBefore}), old=e.skills[skill], g=Math.max(1,Math.min(3,+grade||1));
  e.lastPracticedAt=Date.now(); e.lastPracticedDay=todayStr();
  // Correct early practice is rotation, not proof of a longer interval.
  // Errors can lower the estimate even during an early check.
  if(old&&old.card&&old.card.due>Date.now()&&g>=2){
    e.practice=e.practice||{}; e.practice[skill]={day:todayStr(),grade:g}; memoryCompleteDay(e); save('meta'); return;
  }
  const scheduled=!!(old&&old.card&&old.card.due<=Date.now());
  if(old&&old.day===todayStr()&&!scheduled&&g>=old.grade) return;
  const prior=old&&old.day===todayStr()&&!scheduled?(old.prior||old.card):(old&&old.card||{});
  const card=FSRS.review(prior,g,REQ);
  e.skills[skill]={card,day:todayStr(),grade:g,prior};
  e.practice=e.practice||{}; e.practice[skill]={day:todayStr(),grade:g};
  memoryCompleteDay(e);
  if(isNew(k)&&MEMORY_SKILLS.every(sk=>e.skills[sk]&&e.skills[sk].grade>=2)){
    State.cards[k]=FSRS.review({},3,REQ); if(isRad(k)) D().keys++; else D().new++; save('cards');
  }
  save('meta');
}
function memoryCompleteBase(k,ss){
  const f=(ss.flags||{})[k], e=memoryState().entries[k];
  if(!f||!f.baseDue||f.baseDone) return;
  const checks=ss.marks.filter(t=>t.k===k), grades=MEMORY_SKILLS.map(sk=>checks.find(t=>t.skill===sk));
  if(grades.some(x=>!x)) return;
  f.baseDone=true;
  // Another mode may have changed this card while a paused circle was saved.
  if(!isNew(k)&&JSON.stringify(cardOf(k))===JSON.stringify(f.baseBefore)){
    State.cards[k]=FSRS.review(cardOf(k),Math.min(...grades.map(x=>x.grade)),REQ);
    e.baseReviewedDay=todayStr(); e.baseReviewedAt=Date.now(); D().rv++; State.meta.rev[todayStr()]=(State.meta.rev[todayStr()]||0)+1; save('cards');
  }
}
function memoryDelayRetry(ss,t){
  const retry={...t,retry:true};
  const rest=ss.tasks.slice(ss.index+1).filter(x=>x.k!==t.k).length;
  const other=ss.keys.filter(k=>k!==t.k);
  if(rest<3&&!other.length) return; // A one-item custom set returns at its next interval.
  for(let i=rest;i<3;i++) ss.tasks.push({k:other[i%other.length],skill:MEMORY_SKILLS[i%3],spacer:true,retry:false});
  ss.tasks.push(retry);
}
function memoryGrade(grade){
  const m=memoryState(), ss=m.session;
  if(!ss||!ss.reveal||ss.index>=ss.tasks.length) return;
  const t=ss.tasks[ss.index];
  if(!t.retry&&!t.spacer){
    memoryRecordSkill(t.k,t.skill,grade,{maintenance:t.maintenance});
    ss.marks.push({k:t.k,skill:t.skill,grade});
    if(grade===1) memoryDelayRetry(ss,t);
    memoryCompleteBase(t.k,ss);
    D().t++; if(grade>=2) D().ok++; if(grade>=2) addXP(5);
    if(typeof markLearnedPractice==='function') markLearnedPractice(t.k);
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
    v.appendChild(el('div','kind',`${i.label} · ${t.retry?'Исправление ошибки':t.spacer?'Чередуем знакомое':e.priorLearned?'Знакомое · проверка памяти':row<=3?'День '+row+' из 3':'Повторение'} · ${ss.index+1}/${ss.tasks.length}`));
    v.appendChild(el('div','progress',`<i style="width:${ss.index/ss.tasks.length*100}%"></i>`));
    if(!e.priorLearned&&!e.days.length&&!ss.studied.includes(t.k)){
      const c=el('div','qcard introcard');
      c.innerHTML=`<div class="newtag">${IC('brush',16)} День 1 · первая строка</div><div class="han" style="font-size:64px">${esc(i.hz)}</div><div class="py">${pinyinHTML(i.py)}</div><div class="tr">${esc(i.ru)}</div><p class="note">Прочитай вслух. Запиши слово, пиньинь и перевод. Под ними оставь по три строки для иероглифов и пиньиня: сегодня заполни первую, завтра вторую, послезавтра третью.</p>${i.w?wordFormulas(i.w):''}`;
      v.appendChild(c);
      const paper=el('button','btn ghost mini','Открыть три дня прописей'); paper.onclick=()=>go('notebook',{k:t.k}); v.appendChild(paper);
      const say=el('button','say',SPK(18)+' Послушать'); say.onclick=()=>Speech.say(i.rad?(RADW[radNum(t.k)]||[[i.hz]])[0][0]:i.w.s,undefined,i.py); v.appendChild(say);
      const b=el('button','btn','Закрыть образец и вспомнить'); b.dataset.key='space'; b.style.marginTop='12px';
      b.onclick=()=>{ ss.studied.push(t.k); e.studied=true; save('meta'); render(); }; v.appendChild(b); return;
    }
    const c=el('div','qcard'); c.style.minHeight='180px';
    const prompts={hz:'Напиши иероглифы по памяти',py:'Запиши пиньинь с тонами',ru:'Вспомни перевод'};
    v.appendChild(el('h2','',prompts[t.skill]));
    c.innerHTML=t.skill==='hz'?`<div class="qbig" style="font-size:25px">${esc(i.ru)}</div>`:`<div class="han" style="font-size:64px">${esc(i.hz)}</div>`;
    c.insertAdjacentHTML('beforeend',`<p class="note">${t.skill==='hz'?(i.rad?'Основная форма и форма в составе знака, если она есть. ':'')+'Заполни одну строку на бумаге. Сначала вспомни, потом сверяй.':t.skill==='py'?'Заполни одну строку пиньиня на бумаге. Не забудь тон каждого слога.':'Произнеси или запиши значение до открытия ответа.'}</p>`);
    v.appendChild(c);
    if(!ss.reveal&&(t.skill==='hz'||t.skill==='py')) v.appendChild(notebookPanel(t.k,{skill:t.skill,compact:true,showSample:false}));
    if(!ss.reveal){
      const b=el('button','btn','Сверить с образцом'); b.dataset.key='space'; b.onclick=()=>{ ss.reveal=true; save('meta'); render(); }; v.appendChild(b);
      v.appendChild(el('p','note','Самопроверка на бумаге. Приложение не распознаёт рукописный ответ.'));
    }else{
      const ans=el('div','hero',memoryAnswer(i,t.skill)); ans.style.marginTop='12px'; v.appendChild(ans);
      v.appendChild(el('p','note',t.skill==='hz'?'Сравни все знаки и их части. Порядок черт можно потренировать в «Прописях».':t.skill==='py'?'Проверь каждый слог и тон. Пропущенный или неверный тон — ошибка.':'Допустим близкий по смыслу перевод. Если смысл изменился — повтори.'));
      if(t.retry||t.spacer){ const b=el('button','btn',t.retry?'Исправил — дальше':'Вспомнил — дальше'); b.dataset.key='space'; b.onclick=()=>memoryGrade(3); v.appendChild(b); }
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
    v.appendChild(el('p','note',`${count} ${plural(count,'элемент','элемента','элементов')} · ${failed.length?'ошибок: '+failed.length+' — исправили и вернёмся к ним раньше.':'Проверка по памяти закончена.'} Для первых трёх дней новая строка откроется завтра. После третьего дня каждый навык повторяется к своему сроку.`));
    ss.keys.forEach(k=>{ const e=m.entries[k], i=memoryInfo(k); v.appendChild(el('div','cell',`<b class="han">${esc(i.hz)}</b><span>${e.priorLearned?'Знакомое':Math.min(3,memoryRows(e))+'/3 дня'} · ${esc(i.ru)}</span>`)); });
    const b=el('button','btn','Готово на сейчас'); b.onclick=()=>{ m.session=null; save('meta'); go('path'); }; v.appendChild(b);
    const more=el('button','linkbtn','Ещё короткую порцию'); more.onclick=()=>{ m.session=null; memoryStart(); }; v.appendChild(more); return;
  }
  v.appendChild(el('h1','','Тетрадь памяти'));
  v.appendChild(el('p','note','Небольшая порция каждый день. Сначала вспомни сам, затем проверь: так тренируется память, а не только узнавание.'));
  const guide=el('div','hero');
  guide.innerHTML=`<div class="kind">Метод репетитора + повторения</div><h2>Три строки. Три дня.</h2><ol style="padding-left:22px;line-height:1.65"><li><b>Сегодня:</b> запиши слово, пиньинь, перевод. Оставь по 3 строки для письма и пиньиня. Заполни первую, затем закрой образец и проверь память.</li><li><b>Завтра:</b> заполни вторые строки по памяти. Отдельно проверь тоны и перевод.</li><li><b>Послезавтра:</b> заполни третьи строки. Дальше приложение вернёт каждый навык к своему сроку.</li></ol><p class="note"><b>В каждом круге:</b> немного нового и уже выученное. Знакомое выбирается из твоего сохранённого прогресса. Сначала слабые навыки и повторения к сроку; иногда один знакомый знак возвращается раньше срока, без увеличения интервала за правильный ответ.</p><p class="note">Ошибка — подсказка, чему уделить минуту. Не нужно переписывать страницу: исправь, закрой ответ и попробуй ещё раз.</p>`;
  v.appendChild(guide);
  const nb=el('button','btn ghost','Прописывать на экране · три дня'); nb.style.marginTop='12px'; nb.onclick=()=>go('notebook'); v.appendChild(nb);
  const status=el('div','hero'); status.style.marginTop='12px';
  const upcoming=memoryPlan();
  status.innerHTML=`<b>Следующий круг: ${esc(memoryPlanLabel(upcoming))}</b><div class="note">Старые карточки уже участвуют в повторении. Незнакомые слова не попадают в проверку знакомого.</div>`;
  v.appendChild(status);
  v.appendChild(el('p','note',memoryPaceNote()));
  const b=el('button','btn',upcoming.keys.length?'Начать · '+memoryPlanLabel(upcoming):'На сегодня достаточно'); b.disabled=!upcoming.keys.length; b.style.marginTop='12px'; b.onclick=()=>memoryStart(); v.appendChild(b);
  const pick=el('label','note','Новые слова из урока'); pick.style.display='block'; pick.style.marginTop='18px';
  const sel=el('select',''); sel.setAttribute('aria-label','Урок для новых слов');
  sel.innerHTML='<option value="0">По порядку · уроки 1–'+SEM().targetLesson+'</option>'+Array.from({length:SEM().targetLesson},(_,n)=>`<option value="${n+1}">Урок ${n+1}</option>`).join('');
  sel.value=String(m.lesson||0); sel.onchange=()=>{ m.lesson=+sel.value; save('meta'); }; pick.appendChild(sel); v.appendChild(pick);
  const row=el('div','actionrow');
  [['words','Слова + знакомое'],['keys','Ключи + знакомое']].forEach(([kind,label])=>{ const x=el('button','btn ghost',label); x.onclick=()=>memoryStart({kind}); row.appendChild(x); }); v.appendChild(row);
  v.appendChild(el('p','note','Повторения не теряются. Знакомые знаки чередуются, а новые ключи идут по номерам. Если тяжело, достаточно одного круга. Для письма пальцем открой «Повторение → Прописи».'));
}
