/*==================================================================
  ПРОВЕРОЧНЫЕ: полный цикл подготовки
  Блок: разбор → слова → тоны → порядок слов → на слух → РУ→中 → диктант;
  повторение каждые 3 блока; пробная контрольная; финальная проверка.
  Ошибки возвращаются в очередь, пока не ответишь верно.
==================================================================*/
const STEPS={learn:'Разбор',words:'Слова',tones:'Тоны',tiles:'Порядок слов',hear:'На слух → РУ',write:'РУ → 中',dict:'Диктант'};
const KIND_STEPS={'диктант':['learn','words','tones','dict']};
const FULL_STEPS=['learn','words','tones','tiles','hear','write','dict'];
const AUTO={};
function autoTest(L){
  if(AUTO[L]) return AUTO[L];
  const blocks=(LESSONS[L].b||[]).map((b,i)=>({id:'b'+(i+1),title:'Блок '+(i+1),tip:'',u:b.u,
    w:b.w.map(k=>BYK[k]).filter(Boolean).map(w=>[w.d||w.s,w.p,meaning(w)]),tl:b.tl,auto:true}));
  return AUTO[L]={id:'L'+L,kind:'тренировка',lesson:L,title:'Урок '+L+' · тренировка к проверочной',auto:true,
    note:'Собрано автоматически из примеров учебника к словам урока: только пройденная лексика. Настоящие предложения проверочной добавляются отдельно.',blocks};
}
function getTest(id){ return TESTS.find(t=>t.id===id) || (/^L\d+$/.test(id)&&LESSONS[+id.slice(1)]?autoTest(+id.slice(1)):null); }
function tpOf(id){ return State.tp[id]||(State.tp[id]={done:{}}); }
function testDate(t){ return (State.tp[t.id]&&State.tp[t.id].date)||t.date||''; }
function testPath(t){
  const steps=KIND_STEPS[t.kind]||FULL_STEPS, P=[], nb=t.blocks.length;
  t.blocks.forEach((b,bi)=>{
    steps.forEach(s=>{ if(s==='tiles'&&!(b.tl&&b.tl.length)) return; if(s==='tones'&&!b.u.some(u=>u.sy)) return; P.push({id:b.id+':'+s,b:bi,s,n:STEPS[s]}); });
    if(nb>3&&((bi+1)%3===0||bi===nb-1)) P.push({id:'rev'+bi,s:'review',upto:bi,n:'Повторение: блоки 1–'+(bi+1)});
  });
  P.push({id:'exam',s:'exam',n:'Пробная проверочная'},{id:'final',s:'final',n:'Финальная проверка'});
  return P;
}
function testStats(t){ const P=testPath(t), tp=State.tp[t.id]||{done:{}}; const done=P.filter(p=>tp.done[p.id]).length;
  return {done,total:P.length,pct:Math.round(done/P.length*100),final:tp.final}; }
let T=null;   // текущий прогон: {tid, view, p, q, total, err, first, firstOk, open}
function viewTests(s){
  const v=el('div','view'), N=groupL();
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Проверочные'));
  v.appendChild(el('p','note','Полный цикл подготовки: разбор → слова → тоны → порядок слов → перевод на слух → перевод с русского → диктант, затем пробная и финальная проверка.'));
  v.appendChild(el('p','eyebrow','Проверочные, диктанты, контрольные'));
  const l1=el('div','list');
  TESTS.slice().sort((a,b)=>(testDate(b)||'').localeCompare(testDate(a)||'')).forEach(t=>l1.appendChild(testRow(t)));
  v.appendChild(l1);
  v.appendChild(el('p','note','Новая проверочная, диктант или контрольная → пришли Claude список заданий (фото или текст) — их добавят сюда с тем же циклом подготовки.'));
  v.appendChild(el('p','eyebrow','Тренировка по урокам (из примеров учебника)'));
  const l2=el('div','rowlist');
  const order=[N]; for(let L=1;L<=NL;L++) if(L!==N) order.push(L);
  order.forEach(L=>{ const t=autoTest(L), st=testStats(t);
    const r=el('button','row'+(L===N?' cur':''),`<div class="n">${L}</div><div class="tt"><b>${esc(lessonTitle(L))}</b><small>${t.blocks.length} ${plural(t.blocks.length,'блок','блока','блоков')} · ${t.blocks.reduce((a,b)=>a+b.u.length,0)} предложений</small></div><div class="cnt">${st.done}/${st.total}</div>`);
    r.onclick=()=>go('test',{home:1,tid:t.id}); l2.appendChild(r); });
  v.appendChild(l2);
  s.appendChild(v);
}
function testRow(t){
  const st=testStats(t), d=daysTo(testDate(t));
  const b=el('button','item',`<div class="kind">${esc(t.kind)}${testDate(t)?' · '+fmtDate(testDate(t))+(d!=null?' ('+whenText(d)+')':''):''}</div>
    <div style="font-weight:700;margin:3px 0 6px">${esc(t.title)}</div><div class="bar"><i style="width:${st.pct}%"></i></div>
    <div class="note" style="margin-top:6px">Пройдено ${st.done} из ${st.total}${st.final?' · финал: '+st.final[0]+'/'+st.final[1]+' с первого раза':''}</div>`);
  b.onclick=()=>go('test',{home:1,tid:t.id}); return b;
}
function viewTest(s){
  const t=getTest(State.route.tid); if(!t){ go('tests'); return; }
  if(!T||T.tid!==t.id||State.route.home){ T={tid:t.id,view:'home'}; delete State.route.home; }
  const v=el('div','view'); s.appendChild(v);
  if(T.view==='home') return tHome(v,t);
  if(T.view==='cheat') return tCheat(v,t);
  if(T.view==='learn') return tLearn(v,t);
  if(T.view==='stepdone') return tStepDone(v,t);
  return tRun(v,t);
}
function tGo(view){ T.view=view; const s=$('#screen'); s.innerHTML=''; viewTest(s); window.scrollTo(0,0); }
function tHome(v,t){
  const P=testPath(t), tp=tpOf(t.id), n=P.findIndex(p=>!tp.done[p.id]), st=testStats(t);
  const back=el('button','back','‹ Проверочные'); back.onclick=()=>go('tests'); v.appendChild(back);
  const head=el('div','hero');
  head.innerHTML=`<div class="kind">${esc(t.kind)}${t.lesson?' · урок '+t.lesson:''}</div><h2 style="margin-top:4px">${esc(t.title)}</h2>
    ${t.note?`<p>${esc(t.note)}</p>`:''}
    <div class="bar" style="margin:6px 0"><i style="width:${st.pct}%"></i></div>
    <p>Пройдено шагов: ${st.done} из ${st.total}${tp.final?`<br><b style="color:${tp.final[0]===tp.final[1]?'var(--ok)':'var(--cinnabar-2)'}">Финальная проверка: с первого раза ${tp.final[0]} из ${tp.final[1]}. ${tp.final[0]===tp.final[1]?'Готов к проверочной.':'Пройди её ещё раз — цель: всё с первого раза.'}</b>`:''}</p>`;
  const nb=el('button','btn',n>=0?(st.done?'Продолжить':'Начать')+': '+P[n].n+(P[n].b!=null?' · '+t.blocks[P[n].b].title:''):'Финальная проверка ещё раз');
  nb.dataset.key='space'; nb.onclick=()=>tStart(t,n>=0?n:P.length-1); head.appendChild(nb);
  if(!t.auto){
    const dr=el('div','setrow'); dr.style.padding='12px 0 0'; dr.innerHTML='<div class="lab"><b>Дата</b><small>для отсчёта на главной</small></div>';
    const di=el('input'); di.type='date'; di.value=testDate(t); di.onchange=()=>{ tp.date=di.value; save('tests'); };
    dr.appendChild(di); head.appendChild(dr);
  }
  v.appendChild(head);
  const row=el('div','actionrow');
  const cb=el('button','btn mini ghost','📄 Шпаргалка: все предложения'); cb.onclick=()=>tGo('cheat'); row.appendChild(cb);
  v.appendChild(row);
  const list=el('div','list'); list.style.marginTop='12px';
  t.blocks.forEach((b,bi)=>{
    const it=el('div','item');
    it.innerHTML=`<div style="font-weight:700">${bi+1}. ${esc(b.title)}</div><div class="han rul" style="font-size:15px">${esc(b.u[0].zh.slice(0,18))}${b.u[0].zh.length>18||b.u.length>1?'…':''}</div>`;
    const dots=el('div','sdots');
    P.forEach((p,i)=>{ if(p.b!==bi) return; const d=el('button','sdot'+(tp.done[p.id]?' on':'')+(i===n?' cur':''),p.n); d.onclick=()=>tStart(t,i); dots.appendChild(d); });
    it.appendChild(dots); list.appendChild(it);
    P.forEach((p,i)=>{ if(p.s==='review'&&p.upto===bi){ const r=el('button','item rowbtn'+(tp.done[p.id]?' ok':''),(tp.done[p.id]?'✓ ':'')+esc(p.n)); r.onclick=()=>tStart(t,i); list.appendChild(r); } });
  });
  P.forEach((p,i)=>{ if(p.s==='exam'||p.s==='final'){ const r=el('button','item rowbtn'+(tp.done[p.id]?' ok':''),(tp.done[p.id]?'✓ ':'')+esc(p.n)); r.onclick=()=>tStart(t,i); list.appendChild(r); } });
  v.appendChild(list);
  let armed=false; const rb=el('button','btn ghost','Сбросить прогресс подготовки'); rb.style.marginTop='14px';
  rb.onclick=()=>{ if(!armed){ armed=true; rb.textContent='Точно сбросить? Нажми ещё раз'; setTimeout(()=>{ armed=false; rb.textContent='Сбросить прогресс подготовки'; },4000); return; }
    State.tp[t.id]={done:{},date:tp.date}; save('tests'); tGo('home'); };
  v.appendChild(rb);
}
function tCheat(v,t){
  const back=el('button','back','‹ План'); back.onclick=()=>tGo('home'); v.appendChild(back);
  v.appendChild(el('h2','title','Шпаргалка'));
  const list=el('div','list');
  t.blocks.forEach(b=>b.u.forEach(u=>list.appendChild(unitItem(u,b.title)))); v.appendChild(list);
}
function unitItem(u,src){
  return el('div','item',`${src?`<div class="kind" style="color:var(--muted)">${esc(src)}</div>`:''}<div class="han zhl">${wrapHz(u.zh)}</div><div class="pyl">${esc(u.py)}</div><div class="rul">${esc(u.ru)}</div>
    ${u.parts?`<div class="parts">${u.parts.map(p=>`<div><span class="han" style="font-size:17px">${wrapHz(p[1])}</span> <span class="pyl">${esc(p[2])}</span><br><span class="rul">${esc(p[0])}</span></div>`).join('')}</div>`:''}
    <div class="actionrow" style="margin-top:8px"><button class="say" data-say="${esc(u.zh)}">▶ Слушать</button><button class="say" data-say="${esc(u.zh)}" data-rate=".5">🐢 Медленно</button></div>`);
}
function frags(b){ const o=[]; b.u.forEach(u=>{ (u.parts||[]).forEach(p=>o.push({ru:p[0],zh:p[1],py:p[2],src:b.title+', отрывок'})); o.push({ru:u.ru,zh:u.zh,py:u.py,src:b.title}); }); return o; }
function wholes(b){ return b.u.map(u=>({ru:u.ru,zh:u.zh,py:u.py,src:b.title})); }
function tTasks(t,p){
  const b=t.blocks[p.b];
  if(p.s==='words') return shuffle(b.w).map(w=>({k:'flash',dir:'zh',w})).concat(shuffle(b.w).map(w=>({k:'flash',dir:'ru',w})));
  if(p.s==='tones') return b.u.filter(u=>u.sy).map(u=>({k:'tone',u}));
  if(p.s==='tiles') return shuffle(b.tl).map(x=>({k:'tiles',x,auto:b.auto}));
  if(['hear','write','dict'].includes(p.s)) return frags(b).map(f=>({k:p.s,f}));
  if(p.s==='review'){ const o=[]; for(let i=0;i<=p.upto;i++) wholes(t.blocks[i]).forEach((f,j)=>o.push({k:j%2?'hear':'write',f})); return shuffle(o); }
  if(p.s==='exam'){ const o=[]; t.blocks.forEach(b=>frags(b).forEach(f=>o.push({k:Math.random()<.5?'write':'hear',f}))); return shuffle(o); }
  if(p.s==='final'){ const o=[]; t.blocks.forEach(b=>wholes(b).forEach(f=>{ o.push({k:'write',f}); o.push({k:'hear',f}); })); return shuffle(o); }
  return [];
}
function tStart(t,i){
  const p=testPath(t)[i];
  Object.assign(T,{p:i,err:0,first:0,firstOk:0,open:false,played:null});
  if(p.s==='learn'){ T.q=[]; tGo('learn'); }
  else{ T.q=tTasks(t,p); T.q.forEach(x=>x.tries=0); T.total=T.q.length; if(!T.total){ tFinish(t); return; } tGo('run'); }
}
function tFinish(t){
  const p=testPath(t)[T.p], tp=tpOf(t.id); tp.done[p.id]=1;
  if(p.s==='final') tp.final=[T.firstOk,T.first];
  save('tests'); tGo('stepdone');
}
function tAnswer(t,ok){
  if(!T||!T.q||!T.q.length) return;
  const x=T.q.shift(); if(!x.tries){ T.first++; if(ok) T.firstOk++; } x.tries++;
  const strict=['exam','final'].includes(testPath(t)[T.p].s);
  if(ok){ x.need=(x.need||1)-1; if(x.need>0) T.q.splice(Math.min(T.q.length,4),0,x); }
  else{ T.err++; x.need=strict?2:1; T.q.splice(Math.min(T.q.length,3),0,x); }
  T.open=false; T.played=null;
  if(!T.q.length) tFinish(t); else tGo('run');
}
function tTop(v,t,extra){
  const p=testPath(t)[T.p];
  const bar=el('div',''); bar.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px';
  const b=el('button','back','‹ План'); b.onclick=()=>tGo('home'); bar.appendChild(b);
  bar.appendChild(el('div','note',`<div style="text-align:right;margin-top:-6px">${p.b!=null?esc(t.blocks[p.b].title)+'<br>':''}<b style="color:var(--paper)">${esc(p.n)}</b>${extra||''}</div>`));
  v.appendChild(bar);
}
function tLearn(v,t){
  const b=t.blocks[testPath(t)[T.p].b];
  tTop(v,t);
  const list=el('div','list');
  if(b.tip) list.appendChild(el('div','item tip',`<div style="font-weight:700;margin-bottom:4px">Главное в этом блоке</div><div>${wrapHz(b.tip)}</div>`));
  b.u.forEach(u=>list.appendChild(unitItem(u)));
  const wl=el('div','item',`<div style="font-weight:700;margin-bottom:6px">Слова блока</div>${b.w.map(w=>`<div class="wl"><span class="han" style="font-size:19px">${wrapHz(w[0])}</span><span class="pyl">${esc(w[1])}</span><span>${esc(w[2])}</span></div>`).join('')}<div class="note">Нажми на иероглиф — ключ, состав и значение.</div>`);
  list.appendChild(wl); v.appendChild(list);
  const ok=el('button','btn','Прочитал, понял — дальше'); ok.style.marginTop='12px'; ok.dataset.key='space'; ok.onclick=()=>tFinish(t); v.appendChild(ok);
}
function tSelf(stage,t){
  const bar=el('div','gradebar');
  const n=el('button','grade g1','Ошибся<small>1 · ←</small>'); n.dataset.key='1'; n.onclick=()=>tAnswer(t,false);
  const y=el('button','grade g3','Верно<small>2 · →</small>'); y.dataset.key='2'; y.onclick=()=>tAnswer(t,true);
  bar.appendChild(n); bar.appendChild(y); stage.appendChild(bar);
}
function tNextBtn(stage,t,ok){ const b=el('button','btn showbtn','Дальше ›'); b.dataset.key='space'; b.onclick=()=>tAnswer(t,ok); stage.appendChild(b); }
function tRun(v,t){
  const x=T.q[0], left=T.q.length;
  tTop(v,t,`<br>осталось: ${left}${T.err?' · ошибок: '+T.err:''}`);
  v.appendChild(el('div','progress',`<i style="width:${(T.total-left)/Math.max(1,T.total)*100}%"></i>`));
  const c=el('div','qcard'); c.style.minHeight='30vh'; v.appendChild(c);
  const stage=el('div',''); v.appendChild(stage);
  const ans=html=>{ c.appendChild(el('div','reveal',html)); };
  const audio=f=>{ c.innerHTML+=`<div class="actionrow" style="justify-content:center;width:100%"><button class="btn mini" data-say="${esc(f.zh)}">▶ Слушать</button><button class="btn mini ghost" data-say="${esc(f.zh)}" data-rate=".5">🐢 Медленно</button></div>
    <button class="linkbtn" id="tTxt">Нет звука? Показать иероглифы</button><div class="han zhl" id="tTx" hidden>${esc(f.zh)}</div>`;
    $('#tTxt').onclick=()=>{ $('#tTx').hidden=!$('#tTx').hidden; };
    if(T.played!==x){ T.played=x; setTimeout(()=>Speech.say(f.zh),150); } };
  if(x.k==='flash'){
    const w=x.w;
    if(x.dir==='zh'){ c.innerHTML=`<div class="qprompt">Что значит?</div><div class="qhz han" style="font-size:68px">${esc(w[0])}</div>`;
      showBtn(stage,()=>{ ans(`<div class="py">${pinyinHTML(w[1])}</div><div class="tr">${esc(w[2])}</div>`); Speech.say(hanOf(w[0]).join('')); tSelf(stage,t); stage.appendChild(el('div','',breakdown(w[0]))); }); }
    else{ c.innerHTML=`<div class="qprompt">Напиши иероглифами</div><div class="qbig">${esc(w[2])}</div><div class="qsub">на бумаге, потом сверь</div>`;
      showBtn(stage,()=>{ ans(`<div class="qhz han" style="font-size:60px">${wrapHz(w[0])}</div><div class="py">${pinyinHTML(w[1])}</div>`); Speech.say(hanOf(w[0]).join('')); tSelf(stage,t); stage.appendChild(el('div','',breakdown(w[0]))); }); }
  }else if(x.k==='tone'){
    const u=x.u, sy=u.sy.split(' ');
    c.innerHTML=`<div class="qprompt">Тоны</div><div class="rul" style="font-size:16px">${esc(u.ru)}</div><button class="say" data-say="${esc(u.zh)}" style="margin-top:8px">▶ Послушать</button>`;
    toneTask(c,hanOf(u.zh),sy,ok=>{ ans(`<div class="pyl" style="font-size:17px">${esc(u.py)}</div><div class="verdict ${ok?'ok':'bad'}">${ok?'Все тоны верны':'Есть ошибки — пример вернётся'}</div>`); tNextBtn(stage,t,ok); });
  }else if(x.k==='tiles'){
    const tl=x.x, pool=shuffle(tl.seg.map((s,i)=>({s,i}))), pick=[];
    c.innerHTML=`<div class="qprompt">Собери фразу по-китайски</div><div class="qbig" style="font-size:19px">${esc(tl.ru)}</div>`;
    const area=el('div','tl area'), rest=el('div','tl'); c.appendChild(area); c.appendChild(rest);
    const chk=el('button','btn showbtn','Проверить'), clr=el('button','btn ghost showbtn','Очистить');
    const draw=()=>{
      area.innerHTML=pick.length?'':'<span class="note" style="margin:0">нажимай на слова ниже</span>';
      pick.forEach((o,j)=>{ const b=el('button','ptile',esc(o.s)); b.onclick=()=>{ pick.splice(j,1); draw(); }; area.appendChild(b); });
      rest.innerHTML=''; pool.filter(o=>!pick.includes(o)).forEach(o=>{ const b=el('button','ptile pool',esc(o.s)); b.onclick=()=>{ pick.push(o); draw(); }; rest.appendChild(b); });
      chk.disabled=pick.length!==tl.seg.length;
    };
    draw();
    const row=el('div','actionrow'); row.appendChild(clr); row.appendChild(chk); stage.appendChild(row);
    clr.onclick=()=>{ pick.length=0; draw(); };
    chk.dataset.key='space';
    chk.onclick=()=>{
      const got=pick.map(o=>o.s).join(''), ok=[tl.seg.join('')].concat(tl.alt||[]).includes(got);
      area.querySelectorAll('button').forEach(b=>b.onclick=null); rest.innerHTML='';
      ans(`<div class="verdict ${ok?'ok':'bad'}">${ok?'Верно':'Неверно. Правильно:'}</div>${ok?'':`<div class="han zhl">${wrapHz(tl.seg.join(''))}</div>`}${(tl.alt||[]).length?`<div class="note">Также верно: ${tl.alt.map(esc).join(', ')}</div>`:''}`);
      row.remove(); tNextBtn(stage,t,ok);
      if(!ok&&x.auto){ const mine=el('button','linkbtn','Мой порядок тоже верный — засчитать'); mine.onclick=()=>tAnswer(t,true); stage.appendChild(mine); }
    };
  }else if(x.k==='hear'){
    c.innerHTML=`<div class="qprompt">Послушай и переведи на русский</div>`; audio(x.f);
    showBtn(stage,()=>{ ans(`<div class="han zhl">${wrapHz(x.f.zh)}</div><div class="pyl">${esc(x.f.py)}</div><div class="tr">${esc(x.f.ru)}</div>`); tSelf(stage,t); });
  }else if(x.k==='write'){
    c.innerHTML=`<div class="qprompt">Напиши по-китайски</div><div class="qbig" style="font-size:20px">${esc(x.f.ru)}</div><div class="qsub">иероглифами на бумаге</div>`;
    showBtn(stage,()=>{ ans(`<div class="han zhl" style="font-size:24px">${wrapHz(x.f.zh)}</div><div class="pyl">${esc(x.f.py)}</div><div class="note">Сверь каждый иероглиф и порядок слов. Хоть одна ошибка — «Ошибся».</div>`); Speech.say(x.f.zh); tSelf(stage,t); });
  }else if(x.k==='dict'){
    c.innerHTML=`<div class="qprompt">Диктант: запиши иероглифами с тонами</div>`; audio(x.f);
    showBtn(stage,()=>{ ans(`<div class="han zhl" style="font-size:24px">${wrapHz(x.f.zh)}</div><div class="pyl">${esc(x.f.py)}</div><div class="rul">${esc(x.f.ru)}</div>`); tSelf(stage,t); });
  }
  c.style.textAlign='center';
  const sm=el('div','note',x.f?esc(x.f.src):''); if(x.f) v.insertBefore(sm,c);
}
function tStepDone(v,t){
  const P=testPath(t), p=P[T.p], tp=tpOf(t.id), n=P.findIndex(q=>!tp.done[q.id]);
  const perfect=T.first&&T.firstOk===T.first;
  let msg='Шаг пройден.';
  if(p.s==='final') msg=perfect?'Всё с первого раза. Ты готов к проверочной.':'Финальная проверка закончена. Пройди её ещё раз, пока всё не будет верно с первого раза.';
  else if(p.s==='exam') msg='Пробная проверочная пройдена.';
  v.appendChild(el('div','empty',`<div class="big han" style="color:${p.s==='final'&&!perfect?'var(--cinnabar)':'var(--jade)'}">${p.s==='final'&&!perfect?'再':'好'}</div>${esc(msg)}${T.first?`<br><span style="font-size:13px">С первого раза верно: ${T.firstOk} из ${T.first}</span>`:''}`));
  if(n>=0){ const b=el('button','btn','Дальше: '+P[n].n+(P[n].b!=null?' · '+t.blocks[P[n].b].title:'')); b.dataset.key='space'; b.onclick=()=>tStart(t,n); v.appendChild(b); }
  if(p.s==='final'){ const b=el('button','btn'+(n<0?'':' ghost'),'Финальная проверка ещё раз'); b.style.marginTop='10px'; b.onclick=()=>tStart(t,P.length-1); v.appendChild(b); }
  const h=el('button','btn ghost','К плану'); h.style.marginTop='10px'; h.onclick=()=>tGo('home'); v.appendChild(h);
}

