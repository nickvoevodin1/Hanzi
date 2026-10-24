/*==================================================================
  ПРОГРЕСС: серия и тепловая карта, XP и точность по неделям, слова по
  состояниям, ключи, короны юнитов, готовность к контрольной, достижения.
==================================================================*/
function viewProgress(s){
  const v=el('div','view'), d=D(), wk=weekInfo(), st=semStats(), kl=214-keysDeckLeft();
  v.appendChild(el('h2','title','Прогресс'));
  const totalXP=Object.values(State.meta.daily).reduce((a,r)=>a+(r.xp||0),0);
  v.appendChild(el('div','stats4',`
    <div class="stbox"><span class="si">🔥</span><div><b>${streakLen()}</b><small>${plural(streakLen(),'день','дня','дней')} подряд</small></div></div>
    <div class="stbox"><span class="si">⚡</span><div><b>${totalXP}</b><small>XP всего · сегодня ${d.xp}</small></div></div>
    <div class="stbox"><span class="si">📚</span><div><b>${st.learned}</b><small>слов из ${st.total}</small></div></div>
    <div class="stbox"><span class="si han">部</span><div><b>${kl}</b><small>ключей из 214</small></div></div>`));
  // тепловая карта: 20 недель, столбец — неделя (пн…вс)
  v.appendChild(el('p','eyebrow','Дни занятий'));
  const heat=el('div','heat'), t=todayStr(), g=State.settings.xpGoal;
  let day=addDays(weekStart(t),-7*19);
  for(let i=0;i<140;i++,day=addDays(day,1)){
    const r=State.meta.daily[day], fut=day>t; let cls='';
    if(fut) cls='fut'; else if(r&&r.fz&&!r.met) cls='fz';
    else{ const x=r?r.xp||0:0, rv=(State.meta.rev[day]||0);
      if(x>=2*g) cls='l4'; else if(x>=g) cls='l3'; else if(x>=g/2) cls='l2'; else if(x>0||rv>0) cls='l1'; }
    const c=el('i',cls+(day===t?' today':'')); c.title=fmtDate(day)+(r?': '+(r.xp||0)+' XP':''); heat.appendChild(c);
  }
  v.appendChild(heat);
  v.appendChild(el('div','legend',`<span style="--c:#ffd8c7">мало</span><span style="--c:var(--primary)">цель XP</span><span style="--c:var(--primary-lip)">×2</span><span style="--c:var(--ice)">заморозка</span>`));
  // неделя
  v.appendChild(el('p','eyebrow','Соревнование с собой'));
  const wb=el('div','hero');
  wb.innerHTML=`<div class="row2" style="display:flex;gap:10px">
    <div class="cell" style="flex:1;text-align:center"><b style="font-size:20px;color:var(--fire)">${wk.cur}</b><div class="lbl">эта неделя</div></div>
    <div class="cell" style="flex:1;text-align:center"><b style="font-size:20px">${wk.last}</b><div class="lbl">прошлая</div></div>
    <div class="cell" style="flex:1;text-align:center"><b style="font-size:20px;color:var(--gold-lip)">${Math.max(wk.best,wk.cur)}</b><div class="lbl">рекорд</div></div></div>
    <div class="bar gold" style="margin-top:12px"><i style="width:${Math.min(100,wk.cur/wk.goal*100)}%"></i></div>
    <div class="note">Недельная цель — ${wk.goal} XP (5 дневных целей): ${wk.chest==='opened'?'сундук открыт ✓':wk.chest==='ready'?'сундук ждёт на Пути 🎁':'осталось '+(wk.goal-wk.cur)+' XP до сундука'}.</div>`;
  v.appendChild(wb);
  // XP и точность по неделям
  v.appendChild(el('p','eyebrow','XP и точность по неделям'));
  const bars=el('div','wbars'), weeks=[]; for(let i=7;i>=0;i--) weeks.push(addDays(weekStart(t),-7*i));
  const xs=weeks.map(weekXP), mx=Math.max(1,...xs);
  weeks.forEach((w,i)=>{ let tt=0,ok=0; for(let j=0;j<7;j++){ const r=State.meta.daily[addDays(w,j)]; if(r){ tt+=r.t||0; ok+=r.ok||0; } }
    const b=el('div','wb'+(i===7?' cur':''),`<em>${xs[i]||''}</em><i style="height:${xs[i]/mx*80}%"></i><small>${tt?Math.round(ok/tt*100)+'%':'—'}</small><small>${fmtDate(w).replace(/\s.*/,'')}.${pdate(w).getMonth()+1}</small>`);
    bars.appendChild(b); });
  v.appendChild(bars);
  // слова по состояниям
  v.appendChild(el('p','eyebrow','Слова уроков 1–'+(SEM().on?SEM().targetLesson:NL)));
  const ws=semWords(), n0=ws.filter(isNew).length, s7=ws.filter(k=>stab(k)>=7&&stab(k)<21).length, s21=st.solid, lrn=ws.length-n0-s7-s21, T=Math.max(1,ws.length);
  v.appendChild(el('div','states',`<i style="width:${lrn/T*100}%;background:var(--blue)"></i><i style="width:${s7/T*100}%;background:var(--ok)"></i><i style="width:${s21/T*100}%;background:var(--gold)"></i>`));
  v.appendChild(el('div','legend',`<span style="--c:var(--line)">новые ${n0}</span><span style="--c:var(--blue)">учу ${lrn}</span><span style="--c:var(--ok)">знаю (≥7 дн.) ${s7}</span><span style="--c:var(--gold)">закреплено (≥21) ${s21}</span>`));
  const ks=KEY_ORDER.map(n=>'r:'+n), kk=ks.filter(k=>stab(k)>=7).length;
  v.appendChild(el('div','note',`Ключи: введено ${kl} из 214, прочно (≥7 дн.) ${kk}. Разобрано иероглифов на ключи: ${Object.keys(State.cards).filter(k=>isKC(k)&&!isNew(k)).length}.`));
  // готовность к контрольной
  const ne=nextExam();
  v.appendChild(el('p','eyebrow','Готовность к контрольной'));
  if(ne&&(ne.lessons||[]).length){
    const set=new Set(ne.lessons), ew=COURSE.filter(k=>set.has(WORD_L[k])), ready=ew.filter(k=>stab(k)>=7).length, pct=ew.length?Math.round(ready/ew.length*100):0;
    const last=State.meta.mocks.filter(m=>(m.lessons||[]).some(l=>set.has(l))).slice(-1)[0];
    v.appendChild(el('div','hero',`<b style="color:var(--title)">${esc(ne.title||'Контрольная')} · ${fmtDate(ne.date)} (${whenText(daysTo(ne.date))})</b>
      <div class="bar ok" style="margin:8px 0"><i style="width:${pct}%"></i></div>
      <div class="note" style="margin:0">Слов уроков ${esc(ne.lessons.join(', '))} в памяти ≥7 дней: ${ready} из ${ew.length} (${pct}%).<br>${last?'Последняя пробная: '+last.pct+'% («'+last.grade+'»), '+fmtDate(last.date):'Пробных по этим урокам ещё не было.'}</div>`));
  }else v.appendChild(el('p','note','Даты и уроки контрольных не заданы — добавь их в Настройках → Семестр.'));
  // короны
  v.appendChild(el('p','eyebrow','Короны уроков (из памяти FSRS)'));
  const cg=el('div','crowngrid');
  pathUnits().filter(u=>u.sec==='lessons').forEach(u=>{ const c=unitCrowns(u); cg.appendChild(el('div','c'+c,`${u.L}<b>${c?'👑'+c:'·'}</b>`)); });
  v.appendChild(cg);
  v.appendChild(el('p','note','Корона k — у 80% слов урока стабильность памяти не меньше 1 / 3 / 7 / 21 / 60 дней.'));
  // достижения
  v.appendChild(el('p','eyebrow','Достижения'));
  const ag=el('div','achs');
  ACH.forEach(a=>{ const got=State.meta.ach[a.id]; ag.appendChild(el('div','ach'+(got?' got':''),`<div class="ai ${a.ic==='部'?'han':''}">${a.ic}</div><b>${esc(a.t)}</b><small>${got?fmtDate(got):esc(a.d)}</small>`)); });
  v.appendChild(ag);
  if(State.meta.mocks.length){
    v.appendChild(el('p','eyebrow','Пробные контрольные'));
    const list=el('div','rowlist'); State.meta.mocks.slice(-8).reverse().forEach(m=>list.appendChild(el('div','row',`<div class="n">${m.grade}</div><div class="tt"><b>${m.pct}% · ${esc(m.title||'Пробная')}</b><small>${fmtDate(m.date)} · уроки ${esc((m.lessons||[]).join(', '))}</small></div>`)));
    v.appendChild(list);
  }
  s.appendChild(v);
}
