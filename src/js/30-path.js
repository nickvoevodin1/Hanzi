/*==================================================================
  ПУТЬ (главный экран): шапка «Семестр» + задания дня + дорожка узлов.
  Разделы: «Ключи» (11 юнитов по ~20 в порядке изучения) и «Уроки 1–30»;
  контрольные из настроек — «босс»-узлы после юнита последнего урока.
  Корона юнита (0–5) — из памяти: ≥80% элементов со стабильностью FSRS ≥1/3/7/21/60 дней.
==================================================================*/
let UNITS=null;
const UCOL=[['#ff9600','#e07b00'],['#1cb0f6','#1899d6'],['#ce82ff','#a568cc'],['#2b70c9','#1f5aa8'],['#ff4b4b','#ea2b2b']];   // цвет юнита и его «кромка»
const CROWN_S=[1,3,7,21,60];
const ZZ=[0,46,70,46,0,-46,-70,-46];
const PATH_OPEN={};                   // ручное раскрытие/сворачивание юнитов и групп
function chunk(a,n){ const o=[]; for(let i=0;i<a.length;i+=n) o.push(a.slice(i,i+n)); return o; }
function pathUnits(){ return UNITS||(UNITS=buildUnits()); }
function buildUnits(){
  const U=[];
  KEY_UNITS.forEach((ns,i)=>{
    const id='K'+(i+1), items=ns.map(n=>'r:'+n), a=Math.round(i*214/11);
    const nodes=[];                   // 7 новых ключей → их пропись
    chunk(items,7).forEach((c,j)=>{ const t=(a+j*7+1)+'–'+(a+j*7+c.length);
      nodes.push({id:id+'n'+(j+1),type:'learn',icon:'部',title:'Ключи '+t,items:c});
      nodes.push({id:id+'w'+(j+1),type:'write',alt:1,icon:'brushW',title:'Пропись ключей '+t,items:c.map(k=>'wr:'+k),after:id+'n'+(j+1)}); });
    nodes.push({id:id+'rev',type:'review',alt:1,icon:'cycle',title:'Повторение ключей',items});
    U.push({id,sec:'keys',title:'Ключи · юнит '+(i+1),sub:ns.slice(0,8).map(n=>RADS[n-1][4][0]).join(' '),items,nodes,color:UCOL[(i+1)%UCOL.length]});
  });
  for(let L=1;L<=NL;L++){
    const id='L'+L, words=lessonKeys(L), main=words.filter(k=>!EXTRA_OF[k]), ext=words.filter(k=>EXTRA_OF[k]), nodes=[];
    chunk(main,7).forEach((c,j,a)=>nodes.push({id:id+'w'+(j+1),type:'learn',icon:'star',title:'Новые слова'+(a.length>1?' '+(j+1):''),items:c}));
    chunk(ext,7).forEach((c,j,a)=>nodes.push({id:id+'x'+(j+1),type:'learn',icon:'star',title:EXTRA_OF[c[0]].split(' · ')[0]+(a.length>1?' '+(j+1):''),items:c}));
    // иероглифы урока порциями по 8: разбор на ключи → пропись тех же знаков
    const kc=chunk(LESSON_CHARS[L].map(c=>'key:'+c).filter(validKey),8), wc=chunk(LESSON_CHARS[L].map(c=>'wr:'+c).filter(validKey),8);
    for(let j=0;j<Math.max(kc.length,wc.length);j++){
      if(kc[j]) nodes.push({id:id+'c'+(j+1),type:'chars',alt:1,icon:'splitW',title:'Иероглифы: разбор'+(kc.length>1?' '+(j+1):''),items:kc[j]});
      if(wc[j]) nodes.push({id:id+'p'+(j+1),type:'write',alt:1,icon:'brushW',title:'Иероглифы: пропись'+(wc.length>1?' '+(j+1):''),items:wc[j]});
    }
    nodes.push({id:id+'h',type:'hear',alt:1,icon:'headphones',title:'Тоны на слух',L});
    if(lessonSents(L).length) nodes.push({id:id+'s',type:'sent',alt:1,icon:'chatW',title:'Предложения',L});
    nodes.push({id:id+'rev',type:'review',alt:1,icon:'cycle',title:'Повторение урока',items:words});
    TESTS.filter(t=>t.lesson===L).forEach(t=>nodes.push({id:id+'t'+t.id,type:'test',alt:1,icon:'考',title:t.kind[0].toUpperCase()+t.kind.slice(1),tid:t.id}));
    nodes.push({id:id+'m',type:'mini',alt:1,icon:'pencilW',title:'Мини-контрольная',L});
    U.push({id,sec:'lessons',L,title:'Урок '+L,sub:lessonTitle(L),items:words,nodes,color:UCOL[(L-1)%UCOL.length]});
  }
  return U;
}
function crownsOf(keys){
  if(!keys.length) return 0; let c=0;
  for(const t of CROWN_S){ if(keys.filter(k=>stab(k)>=t).length/keys.length>=0.8) c++; else break; }
  return c;
}
function unitCrowns(u){ return crownsOf(u.items); }
const learnNodes=u=>u.nodes.filter(n=>n.type==='learn');
function nodeDone(n){
  if(n.type==='learn'||n.type==='chars'||n.type==='write') return n.items.length>0&&n.items.every(k=>!isNew(k));
  if(n.type==='test'){ const tp=State.tp[n.tid]; return !!(tp&&tp.final); }
  return !!State.meta.nodes[n.id];
}
function nodeCracked(n){ return (n.type==='learn'||n.type==='chars'||n.type==='write'||n.type==='review')&&nodeDone(n)&&n.items.some(isDue); }
function unitComplete(u){ return learnNodes(u).every(nodeDone); }
function unitOpen(u,i,list){ return i===0||!!State.meta.jumps[u.id]||u.items.some(k=>!isNew(k))||unitComplete(list[i-1]); }
function nodeState(u,n,open){
  const done=nodeDone(n);
  if(done) return nodeCracked(n)?'cracked':'done';
  if(!open) return 'locked';
  const ln=learnNodes(u);
  if(n.type==='learn'){ const j=ln.indexOf(n); return j===0||nodeDone(ln[j-1])||n.items.some(k=>!isNew(k))?'avail':'locked'; }
  if(n.type==='mini') return ln.every(nodeDone)?'avail':'locked';
  if(n.type==='test') return 'avail';
  if(n.after){ const a=u.nodes.find(x=>x.id===n.after); return !a||nodeDone(a)||n.items.some(k=>!isNew(k))?'avail':'locked'; }   // пропись ключей — после их узла
  return !ln.length||nodeDone(ln[0])?'avail':'locked';
}
function examBosses(L){
  return (SEM().exams||[]).filter(e=>e.date&&(e.lessons||[]).length&&Math.max(...e.lessons)===L)
    .map(e=>({id:'E'+e.date+':'+e.lessons.join(','),type:'exam',icon:'trophy',title:e.title||'Контрольная',lessons:e.lessons,date:e.date}));
}

// — запуск узла
function openNode(u,n,st){
  if(st==='locked'){ toast(n.type==='learn'?'Сначала пройди предыдущий узел — или «Перепрыгни»':n.after?'Откроется, когда выучишь эти ключи':'Откроется после первых слов юнита'); return; }
  const base={title:(u?u.title+' · ':'')+n.title,node:n.id};
  if(n.type==='learn'){
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);
    if(nw.length||due.length) playStart(due.concat(nw),{...base,kind:'learn'});
    else playStart(shuffle(n.items).slice(0,8),{...base,kind:'practice'});
  }else if(n.type==='chars'){
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);
    playStart((nw.length||due.length?due.concat(nw):shuffle(n.items)).slice(0,6),{...base,kind:'chars'});
  }else if(n.type==='write'){
    if(!canHW()){ toast('Прописи не загрузились — открой приложение с интернетом'); return; }
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);   // по 4 новых за раз: знакомство + обвести + по памяти
    playStart(nw.length||due.length?due.slice(0,4).concat(nw.slice(0,4)):shuffle(n.items).slice(0,6),{...base,kind:'write'});
  }else if(n.type==='review'){
    const got=n.items.filter(k=>!isNew(k)); if(!got.length){ toast('Сначала выучи слова юнита'); return; }
    playStart(got.filter(isDue).concat(got.filter(k=>!isDue(k)).sort((a,b)=>stab(a)-stab(b))).slice(0,12),{...base,kind:'review'});
  }else if(n.type==='sent'){
    playStart(shuffle(lessonSents(n.L)).slice(0,8).map(x=>'sent:'+x.id),{...base,kind:'sent'});
  }else if(n.type==='hear'){
    const ws=lessonKeys(n.L).map(k=>BYK[k]).filter(Boolean);
    startToneDrill(ws,{...base,kind:'tones'});
  }else if(n.type==='test') go('test',{home:1,tid:n.tid});
  else if(n.type==='mini') go('mock',{setup:{lessons:[n.L],node:n.id,title:'Мини-контрольная · урок '+n.L}});
  else if(n.type==='exam') go('mock',{setup:{lessons:n.lessons,node:n.id,title:n.title}});
}
// — «Урок дня»: порции по 10–15 заданий (новое слово = знакомство + 2 задания, повторение = 1)
function dailyPortion(){
  const due=dueKeys(), nk=newKeysToday(), nw=newWordsToday();
  const W=nw.slice(0,3), K=nk.slice(0,2); let cost=2*(W.length+K.length);
  const R=due.slice(0,Math.max(0,12-cost)); cost+=R.length;
  let i=3, j=2; while(cost<10&&(i<nw.length||j<nk.length)){ if(i<nw.length) W.push(nw[i++]); else K.push(nk[j++]); cost+=2; }
  return R.slice(0,3).concat(K,W,R.slice(3));
}
function startDaily(){ const p=dailyPortion(); if(!p.length){ toast('На сегодня всё: повторения и новые сделаны'); return; } playStart(p,{title:'Урок дня',kind:'daily',more:dailyPortion}); }
function startPart(id){
  if(id==='rev'){ const f=()=>dueKeys().slice(0,12); if(!f().length){ toast('Повторений к сроку нет'); return; } playStart(f(),{title:'Повторения',kind:'review',more:f}); }
  else if(id==='new'){ const f=()=>newWordsToday().slice(0,5); if(!f().length){ toast('Квота новых слов выполнена'); return; } playStart(f(),{title:'Новые слова',kind:'learn',more:f}); }
  else if(id==='keys'){ const f=()=>newKeysToday().slice(0,5); if(!f().length){ toast('Ключи на сегодня введены'); return; } playStart(f(),{title:'Новые ключи',kind:'learn',more:f}); }
  else if(id==='dec') go('decomp');
  else if(id==='wr') startWrite();
  else if(id==='sent') go('sent');
  else if(id==='mock') go('mock');
}
// — «Перепрыгнуть»: тест по закрытым юнитам до выбранного; 80%+ → юниты засчитаны, слова получают начальные карточки
function jumpStart(u){
  const list=pathUnits().filter(x=>x.sec===u.sec), b=list.indexOf(u);
  let a=list.findIndex((x,i)=>!unitOpen(x,i,list)); if(a<0||a>b) a=b;
  const units=list.slice(a,b+1), items=uniq(units.flatMap(x=>x.items)).filter(isNew);
  if(!items.length){ toast('Здесь нечего проверять'); return; }
  playStart(shuffle(items).slice(0,15),{title:'Перепрыгнуть: '+(units.length>1?units[0].title+' — ':'')+u.title,kind:'jump',test:true,jump:{units:units.map(x=>x.id),items}});
}
function jumpFinish(){
  const P=PLAY, pct=P.first?P.firstOk/P.first:0; P.pct=Math.round(pct*100); P.passed=pct>=0.8;
  if(P.passed){
    P.opts.jump.items.forEach(k=>{ if(!isNew(k)) return; const it=P.items[k]; const g=it?(it.fail?1:3):2;
      State.cards[k]=FSRS.review({},g,REQ); });
    P.opts.jump.units.forEach(id=>{ State.meta.jumps[id]=todayStr(); });
    D().ls++; confetti(); Sfx.done();
  }
  checkDay(); checkAch();
}
function jumpEnd(s){
  const P=PLAY, v=el('div','view endwrap');
  v.innerHTML=mascot(P.passed?'cheer':'cheer',110)+`<h2 style="color:${P.passed?'var(--ok-text)':'var(--primary-text)'}">${P.passed?'Перепрыгнул!':'Пока рано'}</h2>
    <div class="endstats"><div class="estat acc"><small>Верно</small><b>${P.pct}%</b></div><div class="estat"><small>Нужно</small><b>80%</b></div></div>
    <p class="note">${P.passed?'Юниты засчитаны, слова получили начальные карточки — FSRS скоро проверит их ещё раз.':'Пройди юниты по порядку — так надёжнее. Попробовать снова можно в любой момент.'}</p>`;
  const b=el('button','btn','На путь'); b.dataset.key='space'; b.onclick=()=>{ PLAY=null; go('path'); }; v.appendChild(b);
  s.appendChild(v);
}

// — экран
function viewPath(s){
  applyFreezes(); renderTop();
  const v=el('div','view'), plan=dayPlan(), d=D();
  let mst='calm', say='';
  if(plan.type==='away'||plan.type==='holiday') mst='sleep';
  else if(!d.met&&new Date().getHours()>=19&&streakLen()>0) mst='sad';
  else if(d.met) { mst='happy'; say='День засчитан — серия '+streakLen()+' '+plural(streakLen(),'день','дня','дней')+'!'; }
  v.insertAdjacentHTML('beforeend',mascotRow(mst,say));
  if(PLAY&&!PLAY.end&&playLeft()){ const cb=el('button','btn blue',IC('play',16)+' Продолжить урок ('+playLeft()+')'); cb.style.marginBottom='12px'; cb.onclick=()=>go('play'); v.appendChild(cb); }
  if(SEM().on) v.appendChild(semCard());
  v.appendChild(planCard(plan));
  const wk=weekInfo();
  if(wk.chest==='ready'){ const ch=el('div','hero chest',`<span class="cico">${IC('chest',52)}</span><div style="flex:1"><b style="color:var(--title)">Недельный сундук!</b><div class="note" style="margin:2px 0 0">Цель недели ${wk.goal} XP выполнена</div></div>`);
    ch.style.marginTop='12px'; const ob=el('button','btn gold mini','Открыть'); ob.onclick=()=>{ ch.classList.add('open'); const g=openChest(); Sfx.done(); confetti(); setTimeout(()=>{ toast('+'+g+' XP'); render(); },900); }; ch.appendChild(ob); v.appendChild(ch); }
  v.appendChild(pathEl());
  s.appendChild(v);
  checkQuests(); checkAch();
}
function semCard(){
  const sem=SEM(), st=semStats(), wq=todayWordsQuota(), fc=forecast(), ne=nextExam(), dl=daysTo(sem.endDate), bg=behindGroup(), kl=keysDeckLeft();
  const c=el('div','hero sem');
  const pace=wq.capLeft>0?(Math.round(wq.pace*10)/10):0;
  c.innerHTML=`<div class="kind">Семестр · уроки 1–${sem.targetLesson} · до ${fmtDate(sem.endDate)}</div>
    <h2 style="margin-top:4px">Выучено ${st.learned} из ${st.total} слов</h2>
    <div class="bar"><i style="width:${st.total?st.learned/st.total*100:0}%"></i></div>
    <div class="note" style="margin-top:6px">закреплено (≥21 дня в памяти): <b style="color:var(--ok-text)">${st.solid}</b> · ключей введено: ${214-kl} из 214</div>
    <div class="row2"><div class="cell"><b>${dl!=null&&dl>=0?dl:'—'}</b><span>${dl!=null&&dl>=0?plural(dl,'день','дня','дней')+' до конца':'дата не задана'}</span></div>
      <div class="cell"><b>${wq.quota}</b><span>новых сегодня</span></div>
      <div class="cell"><b>${pace?pace.toString().replace('.',','):'—'}</b><span>нужный темп, слов/день</span></div></div>
    ${ne?`<div class="info">${IC('calendar',18)} ${esc(ne.title||'Контрольная')} — ${fmtDate(ne.date)} (${whenText(daysTo(ne.date))})${(ne.lessons||[]).length?', уроки '+esc(ne.lessons.join(', ')):''}</div>`:`<div class="note">Даты контрольных не заданы — добавь их в Настройках → Семестр.</div>`}
    ${fc.date?`<div class="note">В текущем темпе (${(Math.round(fc.avg*10)/10).toString().replace('.',',')} слов/день за 2 недели) новые слова закончатся к ${fmtDate(fc.date)}${fc.date>sem.newWordsUntil?' — <b style="color:var(--bad-text)">позже плана ('+fmtDate(sem.newWordsUntil)+')</b>':''}.</div>`:''}
    ${wq.late?`<div class="warn">${IC('warn',18)} Срок новых слов (${fmtDate(sem.newWordsUntil)}) прошёл, осталось ${wq.remaining}. Квота считается до ${fmtDate(sem.endDate)}.</div>`:''}
    ${bg?`<div class="warn">Отстаёшь от группы на ${bg} ${plural(bg,'слово','слова','слов')} (уроки 1–${groupL()}) — они идут первыми.</div>`:''}`;
  const row=el('div','actionrow');
  const t=dayType();
  if(t==='away'){ const b=el('button','btn ghost mini','Я сегодня дома'); b.onclick=()=>{ sem.awayDays=sem.awayDays.filter(x=>x!==todayStr()); save('settings'); render(); }; row.appendChild(b); }
  else{ const b=el('button','btn ghost mini',IC('suitcase',18)+' Я сегодня уезжаю'); b.onclick=()=>{ sem.awayDays=uniq(sem.awayDays.concat([todayStr()])).sort(); save('settings'); toast('Отмечено: сегодня поездка — только повторения'); render(); }; row.appendChild(b); }
  if((t==='away'||t==='holiday')&&semRemaining()){ const m=el('button','btn ghost mini',D().more?'✓ Учу больше':'Учить больше'); m.onclick=()=>{ D().more=D().more?0:1; save('meta'); render(); }; row.appendChild(m); }
  c.appendChild(row);
  return c;
}
function planCard(plan){
  const c=el('div','hero'); c.style.marginTop='12px';
  const dq=dailyQueue().length;
  c.innerHTML=`<div class="kind">Сегодня · ${esc(DAY_NAMES[plan.type])}${plan.minutes?' · ≈'+plan.minutes+' мин':' · план выполнен'}${SEM().on&&plan.type==='normal'?' (норма ~'+SEM().minutesNormal+')':''}</div>`;
  const b=el('button','btn',dq?IC('play',16)+' Урок дня':IC('check',16)+' Урок дня пройден'); b.style.margin='10px 0 6px'; b.disabled=!dq; b.dataset.key='space'; b.onclick=startDaily;
  c.appendChild(b);
  plan.items.forEach(it=>{
    const pct=it.need?Math.min(100,it.cur/it.need*100):(it.done?100:0);
    const q=el('button','quest'+(it.done?' done':''),`<span class="qi">${it.done?IC('checkOk',28):icn(it.icon,28)}</span><span class="qm"><b>${esc(it.title)}${it.quest?' <span class="star">'+IC('star',14)+'</span>':''}</b><small>${esc(it.sub)}${!it.done&&it.min?' · ≈'+it.min+' мин':''}</small>
      <span class="bar${it.done?' ok':''}"><i style="width:${pct}%"></i></span></span><span class="chev">${IC('chev',16)}</span>`);
    q.onclick=()=>startPart(it.id); c.appendChild(q);
  });
  const d=D();
  c.appendChild(el('div','note',d.q?`${IC('chest',18)} Все задания дня выполнены — бонус +${XP.quests} XP получен`:`<span class="star">${IC('star',14)}</span> — задания дня: выполни все 3 — бонус +${XP.quests} XP`));
  return c;
}
function unitBanner(u,i,list,open){
  const cr=unitCrowns(u), done=learnNodes(u).filter(nodeDone).length, all=learnNodes(u).length, ck=u.nodes.filter(nodeCracked).length;
  const b=el('button','ubanner'+(open?'':' locked'),`<div class="ut"><small>${esc(u.title)}</small><b class="${u.sec==='keys'?'han':''}">${esc(u.sub)}</b>
    ${u.sec==='lessons'&&u.L===groupL()?`<span class="tag">${IC('pin',14)} Здесь группа</span>`:''}${ck?`<span class="tag">${IC('dumbbell',14)} повторить: ${ck}</span>`:''}</div>
    <div class="crowns">${open?IC('crown',24)+'<b>'+cr+'</b>':IC('lock',22)}<small>${done}/${all}</small></div>`);
  if(open){ b.style.background=u.color[0]; b.style.boxShadow='0 4px 0 '+u.color[1]; }
  b.onclick=()=>{ PATH_OPEN[u.id]=!unitExpanded(u,i,list); render(); };
  return b;
}
function unitExpanded(u,i,list){
  if(u.id in PATH_OPEN) return PATH_OPEN[u.id];
  return unitOpen(u,i,list)&&!unitComplete(u);
}
let PATH_POP=null;                    // открытая подсказка узла (как у Duolingo: тап → карточка с «Начать»)
function nodeGlyph(n,st){
  if(st==='done'&&n.type==='learn') return IC('check',34);
  if(n.icon==='部'||n.icon==='考') return `<span class="han">${n.icon}</span>`;
  return IC(n.icon||'star',n.type==='exam'?40:34);
}
function nodeDesc(n,st){
  const it=n.items||[], nw=it.filter(isNew).length, due=it.filter(isDue).length;
  if(st==='locked') return n.type==='learn'?'Сначала пройди предыдущие узлы — или «Перепрыгни» тестом':n.after?'Откроется, когда выучишь эти ключи':'Откроется после первых слов юнита';
  if(n.type==='learn') return nw?`${nw} ${n.items[0]&&isRad(n.items[0])?plural(nw,'новый ключ','новых ключа','новых ключей'):plural(nw,'новое слово','новых слова','новых слов')}${due?' · повторить '+due:''}`:due?'Пора повторить: '+due:'Пройдено — можно потренироваться';
  if(n.type==='chars') return `Разбор ${it.length} ${plural(it.length,'иероглифа','иероглифов','иероглифов')}: тип, ключ, фонетик`;
  if(n.type==='write'){ const kk=it[0]&&isRad(wrOf(it[0])); return (nw?`Пропись: ${nw} ${kk?plural(nw,'новый ключ','новых ключа','новых ключей'):plural(nw,'новый иероглиф','новых иероглифа','новых иероглифов')}`:due?'Пропись по памяти — к сроку: '+due:'Повторить пропись')+' · порядок черт, обвести, по памяти'; }
  if(n.type==='sent') return 'Перевод предложений урока RU→中 и 中→RU';
  if(n.type==='hear') return 'Слоги и слова урока в записи носителей: угадай тон';
  if(n.type==='review') return due?'К сроку: '+due:'Повторение всего юнита';
  if(n.type==='test') return 'Проверочная: полный цикл подготовки';
  if(n.type==='mini') return 'Мини-контрольная: слова и предложения урока';
  if(n.type==='exam') return 'Контрольная '+fmtDate(n.date)+' · уроки '+n.lessons.join(', ');
  return '';
}
function nodePop(u,n,st,x){
  const p=el('div','npop'+(st==='locked'?' locked':''));
  if(st!=='locked'&&u){ p.style.background=u.color[0]; p.style.setProperty('--lip',u.color[1]); p.style.setProperty('--npbg',u.color[0]); }
  p.style.setProperty('--ax',x+'px');
  p.innerHTML=`<b>${esc(n.title)}</b><small>${esc(nodeDesc(n,st))}</small>`;
  if(st!=='locked'){ const b=el('button','popbtn',st==='done'?'Повторить':'Начать'+(n.type==='learn'||n.type==='chars'||n.type==='write'||n.type==='sent'||n.type==='review'?' · +'+XP.task+' XP':''));
    b.style.color=u?u.color[0]:'var(--primary-text)'; b.dataset.key='space'; b.onclick=()=>{ PATH_POP=null; openNode(u,n,st); }; p.appendChild(b); }
  return p;
}
function renderNodes(host,u,open,curId){
  const p=el('div','path');
  u.nodes.forEach((n,j)=>{
    const st=nodeState(u,n,open), isCur=n.id===curId, x=ZZ[j%ZZ.length];
    const w=el('div','pnode '+st+(isCur?' cur':''));
    w.style.transform=`translateX(${x}px)`;
    if(st!=='locked'){ w.style.setProperty('--nc',u.color[0]); w.style.setProperty('--nl',u.color[1]); }
    if(isCur){
      const it=n.items||[], f=it.length?it.filter(k=>!isNew(k)).length/it.length:0, R=44, C=2*Math.PI*R;
      w.insertAdjacentHTML('beforeend',`<svg class="nring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="#e5e5e5" stroke-width="9"/>
        <circle cx="50" cy="50" r="${R}" fill="none" stroke="${u.color[0]}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`);
      w.appendChild(el('div','startbubble','Начать'));
      w.insertAdjacentHTML('beforeend',`<div class="pmascot ${x>=0?'l':'r'}">${mascot('calm',86)}</div>`);
    }
    const b=el('button','disc',nodeGlyph(n,st));
    b.setAttribute('aria-label',n.title+(st==='locked'?' (закрыт)':st==='cracked'?' (пора повторить)':st==='done'?' (пройден)':''));
    b.onclick=e=>{ e.stopPropagation(); PATH_POP=PATH_POP===n.id?null:n.id; render(); };
    w.appendChild(b);
    if(st==='cracked') w.insertAdjacentHTML('beforeend',`<span class="nbadge" title="пора повторить">${IC('dumbbell',22)}</span>`);
    p.appendChild(w);
    if(PATH_POP===n.id) p.appendChild(nodePop(u,n,st,x));
  });
  host.appendChild(p);
}
function renderBoss(host,L){
  examBosses(L).forEach(n=>{
    const done=!!State.meta.nodes[n.id], d=daysTo(n.date);
    const w=el('div','pnode boss'+(done?' done':''));
    const b=el('button','disc',done?IC('check',38):IC('trophy',46)); b.setAttribute('aria-label',n.title); b.onclick=()=>openNode(null,n,'avail'); w.appendChild(b);
    w.appendChild(el('div','lab',`${esc(n.title)} · ${fmtDate(n.date)}${d!=null&&d>=0?' ('+whenText(d)+')':''}<br>уроки ${esc(n.lessons.join(', '))}`));
    const p=el('div','path'); p.appendChild(w); host.appendChild(p);
  });
}
function pathEl(){
  const wrap=el('div',''), U=pathUnits();
  [['keys','Ключи · все 214'],['lessons','Уроки 1–30 · Кондрашевский']].forEach(([sec,title])=>{
    const list=U.filter(u=>u.sec===sec);
    wrap.appendChild(el('div','section',`<h3>${title}</h3>`));
    const info=list.map((u,i)=>{ const open=unitOpen(u,i,list), comp=unitComplete(u);
      return {u,i,open,kind:!open?'locked':comp&&!(sec==='lessons'&&u.L===groupL())?'done':'show'}; });
    // текущий узел: первый доступный непройденный узел новых слов
    let curId=null; for(const x of info){ if(!x.open) continue; const n=learnNodes(x.u).find(n=>nodeState(x.u,n,true)==='avail'); if(n){ curId=n.id; break; } }
    let k=0;
    while(k<info.length){
      const x=info[k]; let m=k; while(m+1<info.length&&info[m+1].kind===x.kind&&!(sec==='lessons'&&examBosses(info[m].u.L).length)) m++;   // группа не перешагивает контрольную
      const run=info.slice(k,m+1), gid=sec+':'+x.u.id+'-'+info[m].u.id;
      if(x.kind!=='show'&&run.length>=3&&!PATH_OPEN[gid]){
        const lbl=sec==='lessons'?'Уроки '+x.u.L+'–'+info[m].u.L:'Ключи · юниты '+(x.i+1)+'–'+(info[m].i+1);
        const crowns=run.reduce((a,y)=>a+unitCrowns(y.u),0), ck=run.reduce((a,y)=>a+y.u.nodes.filter(nodeCracked).length,0);
        const g=el('button','ubanner group'+(x.kind==='locked'?' locked':' donegrp'),`<div class="ut"><small>${x.kind==='done'?'Пройдено':'Закрыто'} · раскрыть</small><b>${esc(lbl)}</b>${ck?`<span class="tag">${IC('dumbbell',14)} повторить: ${ck}</span>`:''}</div><div class="crowns">${x.kind==='done'?IC('crown',24)+'<b>'+crowns+'</b>':IC('lock',22)}</div>`);
        g.onclick=()=>{ PATH_OPEN[gid]=true; render(); };
        wrap.appendChild(g);
        if(sec==='lessons') run.forEach(y=>renderBoss(wrap,y.u.L));
      }else run.forEach(y=>{
        wrap.appendChild(unitBanner(y.u,y.i,list,y.open));
        if(unitExpanded(y.u,y.i,list)){
          renderNodes(wrap,y.u,y.open,curId);
          if(!y.open){ const j=el('button','ujump','Перепрыгнуть сюда · тест, нужно 80%'); j.onclick=()=>jumpStart(y.u); wrap.appendChild(j); }
        }
        if(sec==='lessons') renderBoss(wrap,y.u.L);
      });
      k=m+1;
    }
  });
  return wrap;
}
