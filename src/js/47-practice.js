/*==================================================================
  ПОВТОРЕНИЕ: разбор на ключи, перевод предложений (+ свои наборы),
  пробная контрольная, карточки-классика, трудные слова, ошибки разбора.
==================================================================*/
// — банк предложений: примеры к словам уроков, предложения проверочных, свои наборы
let BANK=null, BANKI=null;
function sentBank(){
  if(BANK) return BANK;
  const o=[];
  WORDS.forEach(w=>{ if(w.ex&&WORD_L[w.key]) o.push({id:'ex:'+w.key,zh:w.ex[0],py:w.ex[1],ru:w.ex[2],L:WORD_L[w.key],src:'пример к '+(w.d||w.s)}); });
  TESTS.forEach(t=>t.blocks.forEach(b=>b.u.forEach((u,i)=>o.push({id:'t:'+t.id+':'+b.id+':'+i,zh:u.zh,py:u.py,ru:u.ru,L:t.lesson,src:t.title,parts:u.parts}))));
  State.sets.forEach(st=>st.items.forEach((x,i)=>o.push({id:'u:'+st.id+':'+i,zh:x[0],py:x[1],ru:x[2],L:(st.lessons||[])[0]||0,ls:st.lessons||[],src:st.title,user:1})));
  BANKI={}; o.forEach(x=>{ BANKI[x.id]=x; });
  return BANK=o;
}
function resetBank(){ BANK=null; BANKI=null; UNITS=null; }
function sentById(id){ sentBank(); if(BANKI[id]) return BANKI[id]; const m=id.match(/^(.*)#(\d+)$/); if(m&&BANKI[m[1]]) return fragsOf(BANKI[m[1]])[+m[2]]||null; return null; }
function sentLessons(x){ return x.ls&&x.ls.length?x.ls:[x.L]; }
function lessonSents(L){ return sentBank().filter(x=>sentLessons(x).includes(L)); }
// отрывок — часть до запятой/знака препинания (если русский перевод делится так же)
function fragsOf(x){
  if(x.parts&&x.parts.length) return x.parts.map((p,i)=>({id:x.id+'#'+i,ru:p[0],zh:p[1],py:p[2],L:x.L,src:x.src+', отрывок'}));
  const zs=x.zh.split(/(?<=[，；：])/).filter(s=>s.trim()), rs=x.ru.split(/(?<=[,;:])\s*/).filter(s=>s.trim()), ps=(x.py||'').split(/(?<=[,;:])\s*/).filter(s=>s.trim());
  if(zs.length>1&&zs.length===rs.length) return zs.map((z,i)=>({id:x.id+'#'+i,zh:z.replace(/[，；：]$/,''),ru:rs[i].replace(/[,;:]$/,''),py:ps.length===zs.length?ps[i].replace(/[,;:]$/,''):'',L:x.L,src:x.src+', отрывок'}));
  return [x];
}
// фильтр уроков: к ближайшей контрольной / до урока группы / выбранные
function lessonFilter(mode,chosen){
  const ne=nextExam();
  if(mode==='exam'&&ne&&(ne.lessons||[]).length) return ne.lessons.slice();
  if(mode==='pick'&&chosen&&chosen.length) return chosen.slice();
  const o=[]; for(let L=1;L<=groupL();L++) o.push(L); return o;
}
function lessonChips(host,sel,onChange){
  const box=el('div','chips');
  for(let L=1;L<=NL;L++){ const c=el('button','chip'+(sel.includes(L)?' on':''),String(L)); c.onclick=()=>{ const i=sel.indexOf(L); if(i>=0) sel.splice(i,1); else sel.push(L); sel.sort((a,b)=>a-b); onChange(); }; box.appendChild(c); }
  host.appendChild(box);
}

/* — хаб «Повторение» — */
function viewPractice(s){
  const v=el('div','view');
  v.appendChild(el('h2','title','Повторение'));
  const due=dueKeys().length, tough=Object.keys(State.cards).filter(k=>validKey(k)&&(cardOf(k).lapses||0)>=3);
  const rows=[
    ['🔁','Повторить всё к сроку',due?due+' к сроку — слова, ключи, разборы':'к сроку ничего нет',()=>startPart('rev')],
    ['🧩','Разбор на ключи','как на контрольной: ключи, пиньинь, перевод',()=>go('decomp')],
    ['🔤','Собери из ключей','плитки ключей и их названия',()=>{ const q=decompQueue(8); if(!q.length){ toast('Сначала выучи несколько слов'); return; } playStart(q,{title:'Собери из ключей',kind:'chars'}); }],
    ['💬','Перевод предложений','RU→中 и 中→RU, целиком или отрывками',()=>go('sent')],
    ['➕','Свои предложения',State.sets.length?State.sets.length+' '+plural(State.sets.length,'набор','набора','наборов'):'добавить от преподавателя',()=>go('addsent')],
    ['📝','Пробная контрольная','5 слов + 10 предложений, таймер',()=>go('mock')],
    ['考','Проверочные','полный цикл подготовки по урокам',()=>go('tests')],
    ['🃏','Карточки (классика)','самопроверка, 4 кнопки оценки',()=>go('cards')],
    ['部','Ключи-справочник','214 ключей: формы, названия, примеры',()=>go('keys')],
    ['笔','Прописи','новые иероглифы урока группы',()=>go('draw',{chars:LESSON_CHARS[groupL()].slice(),title:'Урок '+groupL(),back:{name:'practice'}})],
  ];
  if(tough.length) rows.push(['⚠️','Трудные слова',tough.length+' — 3 и больше ошибок',()=>playStart(shuffle(tough).slice(0,12),{title:'Трудные',kind:'review'})]);
  if(State.meta.reports.length) rows.push(['🐞','Ошибки разбора',State.meta.reports.length+' — отправь список Claude',()=>go('reports')]);
  if(SESSION&&!SESSION.finished){ const rem=SESSION.queue.length+SESSION.again.length+(SESSION.current!=null?1:0);
    if(rem>0) rows.unshift(['▶','Продолжить карточки',rem+' осталось · '+(SESSION.title||''),()=>go('session')]); }
  const list=el('div','rowlist');
  rows.forEach(([ic,t,sub,fn])=>{ const r=el('button','row',`<span class="ri ${/^[一-鿿]/.test(ic)?'han':''}">${ic}</span><div class="tt"><b>${esc(t)}</b><small>${esc(sub)}</small></div><span class="chev">›</span>`); r.onclick=fn; list.appendChild(r); });
  v.appendChild(list); s.appendChild(v);
}

/* — карточки-классика (4 кнопки) — */
function viewCards(s){
  const v=el('div','view'), mode=State.route.mode||'auto';
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Карточки'));
  v.appendChild(el('p','note','Классика: смотришь, вспоминаешь, сам ставишь оценку — «Не помню / Трудно / Помню / Легко». Интервалы — те же FSRS.'));
  const mc=el('div','chips');
  MODES.forEach(([id,t])=>{ const c=el('button','chip'+(mode===id?' on':''),t); c.onclick=()=>go('cards',{mode:id}); mc.appendChild(c); });
  v.appendChild(mc);
  const N=groupL(), list=el('div','rowlist'); list.style.marginTop='10px';
  const srcs=[['К сроку',()=>dueKeys().filter(k=>!isKC(k)),'повторения'],['Урок дня',()=>dailyQueue().filter(k=>!isKC(k)),'повторения + новые'],
    ['Урок группы '+N,()=>poolQueue(lessonKeys(N)),'слова урока'],['Уроки 1–'+N,()=>poolQueue(courseKeys(N)),'по порядку курса'],['Все 214 ключей',()=>poolQueue(KEY_ORDER.map(n=>'r:'+n)),'в порядке изучения']];
  srcs.forEach(([t,f,sub])=>{ const n=f().length; const r=el('button','row',`<div class="tt"><b>${esc(t)}</b><small>${esc(sub)}</small></div><span class="cnt">${Math.min(n,SESSION_CAP)}${n>SESSION_CAP?'+':''}</span>`);
    r.onclick=()=>startSession(f().slice(0,SESSION_CAP),mode,t,()=>f().slice(0,SESSION_CAP)); list.appendChild(r); });
  v.appendChild(list); s.appendChild(v);
}

/* — разбор на ключи — */
function decompQueue(n){
  const due=dueKeys(isKC).sort((a,b)=>(cardOf(b).lapses||0)-(cardOf(a).lapses||0));
  const learnedChars=uniq(Object.keys(State.cards).filter(k=>BYK[k]&&!isNew(k)).flatMap(k=>hanOf(BYK[k].s)));
  const fresh=learnedChars.map(c=>'key:'+c).filter(k=>validKey(k)&&isNew(k)).sort((a,b)=>(CHAR_L[kcChar(b)]||99)-(CHAR_L[kcChar(a)]||99));
  return due.concat(fresh).slice(0,n||10);
}
let DEC=null;
function viewDecomp(s){
  const v=el('div','view');
  if(!DEC||DEC.done){
    const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
    v.appendChild(el('h2','title','Разбор на ключи'));
    v.appendChild(el('div','',mascotRow('calm','Пиши на бумаге: ключи каждого иероглифа, их пиньинь и перевод, потом пиньинь и перевод иероглифа.')));
    const q=decompQueue(10), d=D();
    v.appendChild(el('p','note',`Сегодня разобрано: ${d.dec} из 5 · к сроку: ${dueKeys(isKC).length} · в очереди: ${q.length} (сначала ошибки, затем новые иероглифы выученных слов).`));
    const seg=el('div','setrow'); seg.style.cssText='padding:10px 0;border:0';
    seg.innerHTML='<div class="lab"><b>Формат разбора</b><small>как у преподавателя — пока не подтверждён</small></div>';
    const sg=el('div','seg2'); [['keys','до ключей'],['ids','первый уровень']].forEach(([id,t])=>{ const b=el('button',State.settings.decomp===id?'on':'',t); b.onclick=()=>{ State.settings.decomp=id; save('settings'); render(); }; sg.appendChild(b); });
    seg.appendChild(sg); v.appendChild(seg);
    if(DEC&&DEC.done) v.appendChild(el('div','info',`Готово: ${DEC.n} ${plural(DEC.n,'иероглиф','иероглифа','иероглифов')}, с первого раза верно ${DEC.ok}.`));
    const row=el('div','actionrow');
    const b1=el('button','btn','На бумаге'); b1.disabled=!q.length; b1.dataset.key='space'; b1.onclick=()=>{ DEC={q:q.slice(),n:0,ok:0,first:{}}; render(); };
    const b2=el('button','btn ghost','Собери из ключей'); b2.disabled=!q.length; b2.onclick=()=>playStart(q.slice(0,8),{title:'Собери из ключей',kind:'chars'});
    row.appendChild(b1); row.appendChild(b2); v.appendChild(row);
    if(!q.length) v.appendChild(el('p','note','Разбирать пока нечего: сначала выучи несколько слов на Пути.'));
    s.appendChild(v); return;
  }
  const k=DEC.q[0], ch=kcChar(k);
  const w=Object.keys(State.cards).map(x=>BYK[x]).filter(x=>x&&x.s.includes(ch)).sort((a,b)=>a.s.length-b.s.length)[0];
  const top=el('div','playtop'); const xb=el('button','x','✕'); xb.onclick=()=>{ DEC=null; render(); }; top.appendChild(xb);
  top.appendChild(el('div','bar',`<i style="width:${DEC.n/(DEC.n+DEC.q.length)*100}%"></i>`)); top.appendChild(el('div','combo',DEC.q.length+''));
  v.appendChild(top);
  head(v,'Разбери на ключи');
  const c=el('div','qcard'); c.style.minHeight='22vh';
  c.innerHTML=`${w&&w.s!==ch?`<div class="han" style="font-size:22px;color:var(--text2)">${esc(w.s).replace(ch,'<b style="color:var(--primary-text)">'+ch+'</b>')}</div>`:''}<div class="qhz han">${esc(ch)}</div><div class="qsub">ключи · их пиньинь и перевод · пиньинь и перевод знака</div>`;
  v.appendChild(c);
  const sb=el('button','btn showbtn','Показать ответ'); sb.dataset.key='space'; v.appendChild(sb);
  sb.onclick=()=>{
    sb.remove(); v.appendChild(el('div','',decompHTML(ch,{w})));
    const rep=el('button','linkbtn','🐞 Сообщить об ошибке разбора'); rep.onclick=()=>reportDecomp(ch); v.appendChild(rep);
    const bar=el('div','gradebar four');
    [['Не помню',1,'g1'],['Трудно',2,'g2'],['Помню',3,'g3'],['Легко',4,'g4']].forEach(([t,g,cl],i)=>{ const b=el('button','grade '+cl,`${t}<small>${i+1}</small>`); b.dataset.ch=String(i+1); b.onclick=()=>decGrade(k,g); bar.appendChild(b); });
    v.appendChild(bar);
  };
  s.appendChild(v);
}
function decGrade(k,g){
  const wasNew=isNew(k), d=D(), firstTime=!(k in DEC.first);
  State.cards[k]=FSRS.review(cardOf(k)||{},g,REQ);
  if(firstTime){ DEC.first[k]=g; d.t++; if(g>=3){ d.ok++; DEC.ok++; } d.dec++; if(!wasNew){ d.rv++; State.meta.rev[todayStr()]=(State.meta.rev[todayStr()]||0)+1; } if(g>=2) addXP(XP.task); DEC.n++; }
  DEC.q.shift(); if(g===1) DEC.q.push(k);
  if(g>=3) Sfx.ok(); else if(g===1) Sfx.bad();
  if(!DEC.q.length){ DEC.done=true; d.ls++; checkDay(); checkQuests(); checkAch(); Sfx.done(); }
  save('cards'); save('meta'); render();
}
function viewReports(s){
  const v=el('div','view');
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Ошибки разбора'));
  v.appendChild(el('p','note','Скопируй список и пришли Claude — разбор поправят в данных.'));
  const txt=State.meta.reports.map(r=>`${r.ch} (${r.date}, ${r.mode==='ids'?'первый уровень':'до ключей'}): ${r.note||'—'} | сейчас: ${keysOf(r.ch).map(([f,n])=>f+n).join(' + ')}`).join('\n');
  const ta=el('textarea','tinput'); ta.value=txt; ta.readOnly=true; v.appendChild(ta);
  let armed=false; const cl=el('button','btn ghost','Очистить список'); cl.style.marginTop='12px';
  cl.onclick=()=>{ if(!armed){ armed=true; cl.textContent='Точно очистить?'; return; } State.meta.reports=[]; save('meta'); go('practice'); };
  v.appendChild(cl); s.appendChild(v);
}

/* — перевод предложений — */
let SENT=null;
const SENT_OPT={lm:'group',pick:[],dir:'mix',frag:false};
function sentPool(){
  const ls=new Set(lessonFilter(SENT_OPT.lm,SENT_OPT.pick));
  let pool=sentBank().filter(x=>sentLessons(x).some(l=>ls.has(l)));
  if(SENT_OPT.frag) pool=pool.flatMap(fragsOf);
  return pool;
}
function viewSent(s){
  const v=el('div','view');
  if(!SENT||SENT.done){
    const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
    v.appendChild(el('h2','title','Перевод предложений'));
    const ne=nextExam(), O=SENT_OPT;
    const c1=el('div','chips');
    [['exam','К ближайшей контрольной',!!(ne&&(ne.lessons||[]).length)],['group','Все до урока группы ('+groupL()+')',true],['pick','Выбрать уроки',true]].forEach(([id,t,ok])=>{ if(!ok) return;
      const b=el('button','chip'+(O.lm===id?' on':''),t); b.onclick=()=>{ O.lm=id; render(); }; c1.appendChild(b); });
    v.appendChild(c1);
    if(O.lm==='pick') lessonChips(v,O.pick,render);
    const c2=el('div','chips');
    [['mix','попеременно'],['ru','RU → 中'],['zh','中 → RU']].forEach(([id,t])=>{ const b=el('button','chip'+(O.dir===id?' on':''),t); b.onclick=()=>{ O.dir=id; render(); }; c2.appendChild(b); });
    [[false,'целиком'],[true,'отрывки']].forEach(([f,t])=>{ const b=el('button','chip'+(O.frag===f?' on':''),t); b.onclick=()=>{ O.frag=f; render(); }; c2.appendChild(b); });
    v.appendChild(c2);
    const pool=sentPool(), ls=lessonFilter(O.lm,O.pick);
    v.appendChild(el('p','note',`Уроки: ${esc(ls.join(', '))||'—'} · предложений: ${pool.length} · сегодня переведено ${D().sent} из 5. RU→中 — пиши на бумаге, потом сверь.`));
    if(SENT&&SENT.done) v.appendChild(el('div','info',`Готово: ${SENT.n}, с первого раза верно ${SENT.ok}.`));
    const b=el('button','btn','▶ 10 предложений'); b.dataset.key='space'; b.disabled=!pool.length; b.style.marginTop='12px';
    b.onclick=()=>{ const err=State.meta.sentErr; const q=shuffle(pool).sort((a,b)=>(err[b.id]||0)-(err[a.id]||0)).slice(0,10);
      SENT={q:q.map((x,i)=>({x,dir:O.dir==='mix'?(i%2?'zh':'ru'):O.dir})),n:0,ok:0,first:{}}; render(); };
    v.appendChild(b);
    s.appendChild(v); return;
  }
  const it=SENT.q[0], x=it.x, ru=it.dir==='ru';
  const top=el('div','playtop'); const xb=el('button','x','✕'); xb.onclick=()=>{ SENT=null; render(); }; top.appendChild(xb);
  top.appendChild(el('div','bar',`<i style="width:${SENT.n/(SENT.n+SENT.q.length)*100}%"></i>`)); top.appendChild(el('div','combo',SENT.q.length+''));
  v.appendChild(top);
  head(v,ru?'Переведи на китайский':'Переведи на русский');
  const c=el('div','qcard'); c.style.minHeight='20vh';
  c.innerHTML=(ru?`<div class="qbig" style="font-size:20px">${esc(x.ru)}</div><div class="qsub">иероглифами на бумаге</div>`
    :`<div class="han zhl" style="font-size:26px">${wrapHz(x.zh)}</div><div class="actionrow" style="justify-content:center"><button class="say" data-say="${esc(x.zh)}">🔊</button><button class="say" data-say="${esc(x.zh)}" data-rate=".5">🐢</button></div>`)
    +`<div class="lbl" style="margin-top:10px">${esc(x.src||'')}${x.L?' · урок '+x.L:''}</div>`;
  v.appendChild(c);
  if(!ru) setTimeout(()=>Speech.say(x.zh),150);
  const sb=el('button','btn showbtn','Показать ответ'); sb.dataset.key='space'; v.appendChild(sb);
  sb.onclick=()=>{ sb.remove();
    c.appendChild(el('div','reveal',`<div class="han zhl" style="font-size:24px">${wrapHz(x.zh)}</div><div class="pyl">${esc(x.py||'')}</div><div class="rul">${esc(x.ru)}</div>`));
    if(ru) Speech.say(x.zh);
    const bar=el('div','gradebar');
    const b1=el('button','grade g1','Ошибся<small>1 · ←</small>'); b1.dataset.key='1'; b1.onclick=()=>sentAnswer(false);
    const b2=el('button','grade g3','Верно<small>2 · →</small>'); b2.dataset.key='2'; b2.onclick=()=>sentAnswer(true);
    bar.appendChild(b1); bar.appendChild(b2); v.appendChild(bar); };
  s.appendChild(v);
}
function sentAnswer(ok){
  const it=SENT.q.shift(), id=it.x.id, d=D(), first=!(id+it.dir in SENT.first);
  if(first){ SENT.first[id+it.dir]=ok; d.t++; if(ok){ d.ok++; SENT.ok++; addXP(XP.task); } }
  if(ok){ SENT.n++; d.sent++; if(State.meta.sentErr[id]) State.meta.sentErr[id]=Math.max(0,State.meta.sentErr[id]-1); Sfx.ok(); }
  else{ SENT.q.push(it); State.meta.sentErr[id]=(State.meta.sentErr[id]||0)+1; Sfx.bad(); }
  if(!SENT.q.length){ SENT.done=true; d.ls++; checkDay(); checkQuests(); checkAch(); Sfx.done(); }
  save('meta'); render();
}
// — свои наборы предложений: строки «китайский | пиньинь | русский»
function parseSet(text){
  const items=[], bad=[];
  (text||'').split(/\r?\n/).forEach((line,i)=>{ const t=line.trim(); if(!t) return;
    const p=t.split('|').map(x=>x.trim());
    if(p.length!==3||!p[0]||!p[2]||!hanOf(p[0]).length) bad.push(i+1); else items.push(p); });
  return {items,bad};
}
function parseLessons(t){ return uniq((t||'').split(/[^\d]+/).map(Number).filter(n=>n>=1&&n<=NL)).sort((a,b)=>a-b); }
function addSentSet(title,lessonsText,text){
  const {items,bad}=parseSet(text); if(!items.length) return {ok:false,bad};
  const st={id:Date.now().toString(36),title:(title||'').trim()||'Мой набор',lessons:parseLessons(lessonsText),items,date:todayStr()};
  State.sets.push(st); resetBank(); save('sentences'); return {ok:true,bad,set:st};
}
function viewAddSent(s){
  const v=el('div','view');
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Свои предложения'));
  v.appendChild(el('p','note','Например, предложения к проверочной от преподавателя. По одному на строку: <b>китайский | пиньинь | русский</b>. Они попадут в «Перевод предложений», «Предложения» на Пути и в пробную контрольную.'));
  const t1=el('input','search'); t1.placeholder='Название набора (например: Проверочная 20)';
  const t2=el('input','search'); t2.placeholder='Уроки (например: 19, 20)'; t2.inputMode='numeric';
  const ta=el('textarea','tinput'); ta.placeholder='我们去看电影吧。| Wǒmen qù kàn diànyǐng ba. | Давай пойдём в кино.';
  v.appendChild(t1); v.appendChild(t2); v.appendChild(ta);
  const msg=el('p','note',''); v.appendChild(msg);
  ta.oninput=()=>{ const r=parseSet(ta.value); msg.innerHTML=`Распознано: ${r.items.length}${r.bad.length?` · <b style="color:var(--bad-text)">не распознаны строки ${r.bad.join(', ')}</b> (нужно 3 части через «|»)`:''}`; };
  const b=el('button','btn','Сохранить набор'); b.style.marginTop='8px';
  b.onclick=()=>{ const r=addSentSet(t1.value,t2.value,ta.value); if(!r.ok){ toast('Нет ни одной строки «китайский | пиньинь | русский»'); return; } toast('Сохранено: '+r.set.items.length+' '+plural(r.set.items.length,'предложение','предложения','предложений')); go('addsent'); };
  v.appendChild(b);
  if(State.sets.length){
    v.appendChild(el('p','eyebrow','Наборы'));
    const list=el('div','rowlist');
    State.sets.forEach(st=>{ const r=el('div','row',`<div class="tt"><b>${esc(st.title)}</b><small>${st.items.length} предл.${st.lessons.length?' · уроки '+esc(st.lessons.join(', ')):''} · ${fmtDate(st.date)}</small></div>`);
      let armed=false; const d=el('button','btn mini ghost','Удалить');
      d.onclick=()=>{ if(!armed){ armed=true; d.textContent='Точно?'; return; } State.sets=State.sets.filter(x=>x!==st); resetBank(); save('sentences'); render(); };
      r.appendChild(d); list.appendChild(r); });
    v.appendChild(list);
  }
  s.appendChild(v);
}

/* — пробная контрольная — */
let MOCK=null, mockTimer=null;
function mockGen(lessons){
  const set=new Set(lessons);
  const ws=COURSE.filter(k=>set.has(WORD_L[k])).map(k=>BYK[k]).filter(w=>hanOf(w.s).length&&hanOf(w.s).every(c=>keysOf(c).length));
  const pick=shuffle(ws.filter(w=>hanOf(w.s).length<=2)).concat(shuffle(ws.filter(w=>hanOf(w.s).length>2)));
  const err=State.meta.sentErr;
  const ss=shuffle(sentBank().filter(x=>sentLessons(x).some(l=>set.has(l)))).sort((a,b)=>(err[b.id]||0)-(err[a.id]||0));
  return {words:pick.slice(0,5).map(w=>w.key),ruzh:ss.slice(0,5),zhru:ss.slice(5,10)};
}
function gradeOf(pct){ const sc=State.settings.scale||[90,75,60]; return pct>=sc[0]?'5':pct>=sc[1]?'4':pct>=sc[2]?'3':'2'; }
function mockTasks(M){
  return M.words.map(k=>({t:'w',k})).concat(M.ruzh.map(x=>({t:'ru',x})),M.zhru.map(x=>({t:'zh',x})));
}
function viewMock(s){
  const v=el('div','view'); clearInterval(mockTimer);
  if(State.route.setup){ MOCK={phase:'setup',...State.route.setup,lessons:State.route.setup.lessons.slice()}; delete State.route.setup; }
  if(!MOCK||MOCK.phase==='setup'){
    if(!MOCK){ const ne=nextExam(); MOCK={phase:'setup',lessons:lessonFilter(ne&&(ne.lessons||[]).length?'exam':'group'),title:ne?(ne.title||'Контрольная'):'Пробная контрольная'}; }
    const back=el('button','back','‹ Назад'); back.onclick=()=>{ MOCK=null; go('practice'); }; v.appendChild(back);
    v.appendChild(el('h2','title',esc(MOCK.title||'Пробная контрольная')));
    v.appendChild(el('p','note','Как настоящая: 1) 5 слов — разобрать на ключи, пиньинь и перевод ключей и иероглифов; 2) 5 предложений RU→中; 3) 5 предложений 中→RU. Пишешь на бумаге, потом сверяешь и честно отмечаешь «верно / частично / неверно».'));
    v.appendChild(el('p','eyebrow','Уроки'));
    lessonChips(v,MOCK.lessons,render);
    const tr=el('div','setrow'); tr.style.cssText='padding:12px 0;border:0'; tr.innerHTML='<div class="lab"><b>Таймер, минут</b><small>настраивается</small></div>';
    tr.appendChild(stepper(()=>State.settings.mockMin,x=>{ State.settings.mockMin=x; save('settings'); },5,120,5)); v.appendChild(tr);
    const b=el('button','btn','Начать'); b.dataset.key='space'; b.disabled=!MOCK.lessons.length;
    b.onclick=()=>{ const g=mockGen(MOCK.lessons); if(!g.words.length&&!g.ruzh.length){ toast('В этих уроках нет материала'); return; }
      Object.assign(MOCK,g,{phase:'paper',start:Date.now(),min:State.settings.mockMin,marks:[],i:0}); render(); };
    v.appendChild(b);
    const hist=State.meta.mocks.slice(-10).reverse();
    if(hist.length){ v.appendChild(el('p','eyebrow','История'));
      const list=el('div','rowlist'); hist.forEach(m=>list.appendChild(el('div','row',`<div class="n">${m.grade}</div><div class="tt"><b>${m.pct}% · ${esc(m.title||'Пробная')}</b><small>${fmtDate(m.date)} · уроки ${esc((m.lessons||[]).join(', '))}</small></div>`)));
      v.appendChild(list); }
    s.appendChild(v); return;
  }
  const tasks=mockTasks(MOCK);
  if(MOCK.phase==='paper'){
    const left=()=>Math.max(0,MOCK.min*60-Math.round((Date.now()-MOCK.start)/1000));
    const top=el('div','playtop'); top.innerHTML=`<div class="kind" style="flex:1">${esc(MOCK.title||'Пробная контрольная')} · уроки ${esc(MOCK.lessons.join(', '))}</div>`;
    const tm=el('div','timer'); top.appendChild(tm); v.appendChild(top);
    const fmt=()=>{ const l=left(); tm.textContent=Math.floor(l/60)+':'+String(l%60).padStart(2,'0'); tm.classList.toggle('low',l<300); };
    fmt(); mockTimer=setInterval(()=>{ if(!document.body.contains(tm)){ clearInterval(mockTimer); return; } fmt(); if(!left()){ clearInterval(mockTimer); toast('Время вышло'); } },1000);
    let i=0; const part=(t,html)=>`<p class="eyebrow">${t}</p><div class="paper"><ol start="${i+1}">${html}</ol></div>`;
    let h=part('1. Разбери на ключи; пиньинь и перевод ключей и иероглифов',MOCK.words.map(k=>{ i++; const w=BYK[k]; return `<li><span class="han" style="font-size:30px;color:var(--title)">${esc(w.d||w.s)}</span></li>`; }).join(''));
    h+=part('2. Переведи на китайский',MOCK.ruzh.map(x=>{ i++; return `<li>${esc(x.ru)}</li>`; }).join(''));
    h+=part('3. Переведи на русский',MOCK.zhru.map(x=>{ i++; return `<li><span class="han" style="font-size:20px">${esc(x.zh)}</span></li>`; }).join(''));
    v.insertAdjacentHTML('beforeend',h);
    const b=el('button','btn','Сдать на проверку'); b.style.marginTop='16px'; b.onclick=()=>{ clearInterval(mockTimer); MOCK.phase='check'; MOCK.used=Math.round((Date.now()-MOCK.start)/1000); render(); };
    v.appendChild(b);
    const q=el('button','btn ghost','Прервать'); q.style.marginTop='12px'; q.onclick=()=>{ clearInterval(mockTimer); MOCK=null; go('practice'); }; v.appendChild(q);
    s.appendChild(v); return;
  }
  if(MOCK.phase==='check'){
    const t=tasks[MOCK.i];
    const top=el('div','playtop'); top.appendChild(el('div','bar',`<i style="width:${MOCK.i/tasks.length*100}%"></i>`)); top.appendChild(el('div','combo',(MOCK.i+1)+'/'+tasks.length)); v.appendChild(top);
    head(v,'Сверь со своим ответом');
    const c=el('div','card'); c.style.textAlign='left';
    if(t.t==='w'){ const w=BYK[t.k]; c.innerHTML=`<div class="kind">Слово ${MOCK.i+1}</div><div style="margin:4px 0 8px"><span class="han" style="font-size:40px;color:var(--title)">${esc(w.d||w.s)}</span> ${pinyinHTML(w.p)} — ${esc(meaning(w))}</div>${hanOf(w.s).map(ch=>decompHTML(ch,{short:1,w})).join('')}`; }
    else{ const x=t.x; c.innerHTML=`<div class="kind">${t.t==='ru'?'RU → 中':'中 → RU'}</div><div class="rul" style="margin:6px 0">${t.t==='ru'?esc(x.ru):`<span class="han zhl">${esc(x.zh)}</span>`}</div>
      <div class="reveal"><div class="han zhl">${wrapHz(x.zh)}</div><div class="pyl">${esc(x.py||'')}</div><div class="rul">${esc(x.ru)}</div></div>`; }
    v.appendChild(c);
    const bar=el('div','gradebar'); bar.style.gridTemplateColumns='1fr 1fr 1fr';
    [['Неверно',0,'g1'],['Частично',.5,'half'],['Верно',1,'g3']].forEach(([lab,val,cl],j)=>{ const b=el('button','grade '+cl,`${lab}<small>${j+1}</small>`); b.dataset.ch=String(j+1);
      b.onclick=()=>{ MOCK.marks[MOCK.i]=val; MOCK.i++; if(MOCK.i>=tasks.length) mockFinish(); render(); }; bar.appendChild(b); });
    v.appendChild(bar);
    if(MOCK.i>0){ const u=el('button','linkbtn','↩ Назад к предыдущему'); u.onclick=()=>{ MOCK.i--; render(); }; v.appendChild(u); }
    s.appendChild(v); return;
  }
  // итог
  const r=MOCK.res;
  v.innerHTML=`<div class="endwrap">${mascot(r.pct>=75?'cheer':'happy',100)}<h2>${r.pct}% · прогноз «${r.grade}»</h2>
    <div class="endstats"><div class="estat"><small>Баллы</small><b>${r.score}/${r.max}</b></div><div class="estat acc"><small>Оценка</small><b>${r.grade}</b></div>
    <div class="estat time"><small>Время</small><b>${Math.floor(MOCK.used/60)}:${String(MOCK.used%60).padStart(2,'0')}</b></div></div>
    <p class="note">Шкала условная (≥${State.settings.scale[0]}% — «5», ≥${State.settings.scale[1]}% — «4», ≥${State.settings.scale[2]}% — «3»), меняется в Настройках. Ошибки ушли в повторение.</p></div>`;
  const b=el('button','btn','Готово'); b.dataset.key='space'; b.onclick=()=>{ MOCK=null; go('path'); }; v.appendChild(b);
  const again=el('button','btn ghost','Ещё одна'); again.style.marginTop='12px'; again.onclick=()=>{ MOCK={phase:'setup',lessons:MOCK.lessons,title:MOCK.title,node:MOCK.node}; render(); }; v.appendChild(again);
  s.appendChild(v);
}
function mockFinish(){
  const tasks=mockTasks(MOCK), score=MOCK.marks.reduce((a,b)=>a+(b||0),0), max=tasks.length, pct=Math.round(score/max*100), grade=gradeOf(pct);
  MOCK.phase='result'; MOCK.res={score,max,pct,grade};
  State.meta.mocks.push({date:todayStr(),lessons:MOCK.lessons.slice(),pct,score,max,grade,title:MOCK.title||'Пробная'});
  const now=Date.now();
  tasks.forEach((t,i)=>{ if((MOCK.marks[i]||0)>=1) return;
    if(t.t==='w'){ const ks=[t.k].concat(hanOf(BYK[t.k].s).map(c=>'key:'+c)); ks.forEach(k=>{ const c=cardOf(k); if(c&&c.state) c.due=Math.min(c.due,now); }); }
    else State.meta.sentErr[t.x.id]=(State.meta.sentErr[t.x.id]||0)+1; });
  const d=D(); d.mock++; d.ls++; addXP(XP.mock);
  if(MOCK.node) State.meta.nodes[MOCK.node]=todayStr();
  checkDay(); checkQuests(); checkAch(); save(); Sfx.done(); setTimeout(confetti,150);
}
