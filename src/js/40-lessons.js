/*==================================================================
  УРОКИ
==================================================================*/
function viewLessons(s){
  const v=el('div','view'), N=groupL();
  const back=el('button','back','‹ Словарь'); back.onclick=()=>go('dict'); v.appendChild(back);
  v.appendChild(el('h2','title','Уроки'));
  v.appendChild(el('p','note','Кондрашевский, том 1. Красным — текущий урок группы ('+N+'). Цифра справа — слов в работе.'));
  const list=el('div','rowlist'); list.style.marginTop='10px';
  for(let L=1;L<=NL;L++){
    const ws=lessonWords(L), lw=learnedCount(ws.map(w=>w.key));
    const has=TESTS.some(t=>t.lesson===L);
    const r=el('button','row'+(L===N?' cur':''),`<div class="n">${L}</div>
      <div class="tt"><b>${esc(lessonTitle(L))}</b><small><span class="han">${esc(LESSONS[L].sub||'')}</span> · ${ws.length} слов · ${LESSON_CHARS[L].length} нов. иероглифов${has?' · 考 проверочная':''}</small></div>
      <div class="cnt"${lw===ws.length&&ws.length?' style="color:var(--jade)"':''}>${lw}/${ws.length}</div>`);
    r.onclick=()=>go('lesson',{L}); list.appendChild(r);
    lessonExtras(L).forEach(x=>{ const xl=learnedCount(x.words.map(w=>w.key));
      const xr=el('button','row',`<div class="n" style="color:var(--cinnabar-2)">+</div>
        <div class="tt"><b>${esc(x.title)}</b><small>${x.words.length} слов · после урока ${L}</small></div><div class="cnt">${xl}/${x.words.length}</div>`);
      xr.onclick=()=>go('extra',{L,id:x.id}); list.appendChild(xr); });
  }
  v.appendChild(list); s.appendChild(v);
}
function viewExtra(s){
  const {L,id}=State.route, x=lessonExtras(L).find(e=>e.id===id); if(!x){ go('lessons'); return; }
  const keys=x.words.map(w=>w.key), chars=[...new Set(x.words.flatMap(w=>hanOf(w.s)))];
  const v=el('div','view');
  const back=el('button','back','‹ Уроки'); back.onclick=()=>go('lessons'); v.appendChild(back);
  v.appendChild(el('h2','title',esc(x.title)));
  v.appendChild(el('p','note',`${x.words.length} слов, в работе ${learnedCount(keys)} · в «Уроке дня» идут после урока ${L}.<br>${esc(x.note||'')}<br>Источник: ${esc(x.src||'')}`));
  const act=el('div','actionrow');
  const b1=el('button','btn','▶ Учить'); b1.onclick=()=>playStart(poolQueue(keys,8),{title:x.title,kind:'learn',more:()=>poolQueue(keys,8)});
  const b2=el('button','btn ghost','笔 Прописи'); b2.onclick=()=>go('draw',{chars,title:x.title,back:{name:'extra',L,id}});
  act.appendChild(b1); act.appendChild(b2); v.appendChild(act);
  const b3=el('button','btn mini ghost','🔊 Прослушать'); b3.style.marginTop='10px'; b3.onclick=()=>playAll(x.words); v.appendChild(b3);
  const list=el('div','rowlist'); list.style.marginTop='12px'; x.words.forEach(w=>list.appendChild(witem(w))); v.appendChild(list);
  s.appendChild(v);
}
const MODES=[['auto','Авто'],['recog','汉字 → перевод'],['recall','Перевод → 汉字'],['write','Написать'],['listen','На слух'],['tones','Тоны'],['pinyin','Пиньинь']];
function viewLesson(s){
  const L=State.route.L, tab=State.route.tab||'words', mode=State.route.mode||'auto';
  const ws=lessonWords(L), keys=lessonKeys(L);
  const v=el('div','view');
  const back=el('button','back','‹ Уроки'); back.onclick=()=>go('lessons'); v.appendChild(back);
  v.appendChild(el('h2','title','Урок '+L+' · '+esc(lessonTitle(L))));
  v.appendChild(el('p','note',`<span class="han" style="font-size:15px;color:var(--paper)">${esc(LESSONS[L].sub||'')}</span> · ${ws.length} слов, в работе ${learnedCount(ws.map(w=>w.key))} · новых иероглифов ${LESSON_CHARS[L].length} · новых ключей в разборе ${LESSON_KEYS[L].length}`));
  const act=el('div','actionrow');
  const b1=el('button','btn','▶ Учить урок'); b1.onclick=()=>playStart(poolQueue(keys,8),{title:'Урок '+L,kind:'learn',more:()=>poolQueue(keys,8)});
  const real=TESTS.find(t=>t.lesson===L);
  const b2=el('button','btn ghost','考 '+(real?'Проверочная':'К проверочной')); b2.onclick=()=>go('test',{home:1,tid:(real||autoTest(L)).id});
  act.appendChild(b1); act.appendChild(b2); v.appendChild(act);
  const act2=el('div','actionrow');
  const b0=el('button','btn mini ghost','🃏 Карточки'); b0.onclick=()=>startSession(poolQueue(keys),mode,'Урок '+L,()=>poolQueue(keys)); act2.appendChild(b0);
  const b3=el('button','btn mini ghost','笔 Прописи урока'); b3.onclick=()=>go('draw',{chars:LESSON_CHARS[L].slice(),title:'Урок '+L+' · новые иероглифы',back:{name:'lesson',L}});
  const b4=el('button','btn mini ghost','🔊 Прослушать'); b4.onclick=()=>playAll(ws);
  act2.appendChild(b3); act2.appendChild(b4); v.appendChild(act2);
  lessonExtras(L).forEach(x=>{ const xb=el('button','item rowbtn','＋ '+esc(x.title)+' · '+x.words.length+' слов ›'); xb.style.marginTop='10px'; xb.onclick=()=>go('extra',{L,id:x.id}); v.appendChild(xb); });
  const mc=el('div','chips'); mc.appendChild(el('span','note','Режим карточек:')).style.margin='6px 4px 0 0';
  MODES.forEach(([id,t])=>{ const c=el('button','chip'+(mode===id?' on':''),t); c.onclick=()=>go('lesson',{L,tab,mode:id}); mc.appendChild(c); });
  v.appendChild(mc);
  const tabs=el('div','tabs');
  [['words','Слова'],['chars','Иероглифы'],['rads','Ключи']].forEach(([id,t])=>{ const b=el('button','tab'+(tab===id?' on':''),t); b.onclick=()=>go('lesson',{L,tab:id,mode}); tabs.appendChild(b); });
  v.appendChild(tabs);
  if(tab==='words'){
    const list=el('div','rowlist'); ws.forEach(w=>list.appendChild(witem(w))); v.appendChild(list);
  }else if(tab==='chars'){
    v.appendChild(el('p','note','Иероглифы, которые впервые встречаются в этом уроке. Нажми — разбор на ключ и части.'));
    const g=el('div','chgrid'); g.style.marginTop='8px';
    LESSON_CHARS[L].forEach(c=>g.appendChild(hzBtn(c)));
    v.appendChild(g);
    v.appendChild(el('div','',`<div class="bks">${LESSON_CHARS[L].map(c=>charBox(c)).join('')}</div>`));
  }else{
    v.appendChild(el('p','note','Ключи из разбора иероглифов урока, которые встречаются впервые.'));
    if(!LESSON_KEYS[L].length) v.appendChild(el('p','note','Новых ключей в этом уроке нет — все уже встречались раньше.'));
    v.appendChild(radGrid(LESSON_KEYS[L]));
  }
  s.appendChild(v);
}
function witem(w){
  const it=el('button','witem',`<div class="hzw han">${esc(w.d||w.s)}</div>
    <div class="mid"><div class="py">${pinyinHTML(w.p)}</div><div class="tr">${esc(meaning(w))}</div></div><div class="st ${statusOf(w.key)}"></div>`);
  it.onclick=()=>go('card',{id:w.id,from:State.route}); return it;
}
let playT;
function playAll(ws){ let i=0; clearTimeout(playT); (function nxt(){ if(i>=ws.length) return; Speech.say(ws[i].s); i++; playT=setTimeout(nxt,1200); })(); toast('Проигрываю '+ws.length+' слов'); }

/*==================================================================
  КАРТОЧКА СЛОВА
==================================================================*/
function viewCard(s){
  const w=WORDS[State.route.id], from=State.route.from;
  const v=el('div','view');
  const back=el('button','back','‹ Назад'); back.onclick=()=>from?go(from.name,from):go(State.tab||'dict'); v.appendChild(back);
  const card=el('div','card');
  card.innerHTML=`<div class="bighz han">${esc(w.d||w.s)}</div>
    <div class="bigpy">${pinyinHTML(w.p)}</div>
    ${palladius(w.p)?`<div class="palla" style="margin:-2px 0 6px">по Палладию: ${esc(palladius(w.p))}</div>`:''}
    <div class="bigtr">${esc(w.ru||meaning(w))}</div>
    ${w.ru&&w.en?`<div class="bigen">${esc(w.en.slice(0,2).join('; '))}</div>`:''}
    <div class="tagrow">${(w.k||[]).map(n=>`<span class="pill k">Урок ${n}</span>`).join('')}${w.hsk?`<span class="pill hsk">HSK ${w.hsk}</span>`:''}${EXTRA_OF[w.key]?`<span class="pill k">${esc(EXTRA_OF[w.key])}</span>`:''}${statusOf(w.key)!=='new'?'<span class="pill ok">в работе</span>':''}</div>
    <div class="cardbtns"><button class="iconbtn primary" id="cSay" aria-label="Слушать">🔊</button><button class="iconbtn" id="cDraw" aria-label="Прописи">笔</button></div>`;
  v.appendChild(card);
  const meta=el('div','meta');
  if(w.ex) meta.appendChild(mr('Пример',`<div class="han zhl">${wrapHz(w.ex[0])}</div><div>${pinyinHTML(w.ex[1])}</div><div style="color:var(--paper-dim)">${esc(w.ex[2])}</div><button class="say" data-say="${esc(w.ex[0])}" style="margin-top:6px">🔊 Пример</button>`));
  if(w.cl&&w.cl.length) meta.appendChild(mr('Счётное слово',w.cl.map(c=>'<span class="han">'+wrapHz(c)+'</span>').join('  ')));
  if(w.alt&&w.alt.length) meta.appendChild(mr('Ещё чтение',w.alt.map(a=>pinyinHTML(a.p)+(a.en&&a.en[0]?' — '+esc(a.en[0]):'')).join('<br>')));
  if(w.ra) meta.appendChild(mr('Перевод','<span style="color:var(--muted)">из открытого словаря — можно перепроверить</span>'));
  if(meta.children.length) v.appendChild(meta);
  v.appendChild(el('p','eyebrow','Разбор на ключи'));
  v.appendChild(el('div','',hanOf(w.s).filter(c=>keysOf(c).length).map(c=>decompHTML(c,{w})).join('')));
  v.appendChild(el('p','eyebrow','Разбор по иероглифам'));
  v.appendChild(el('div','',breakdown(w.s)));
  s.appendChild(v);
  $('#cSay').onclick=()=>Speech.say(w.s);
  $('#cDraw').onclick=()=>go('draw',{chars:hanOf(w.s),title:w.d||w.s,back:{name:'card',id:w.id,from}});
}
function mr(k,v){ return el('div','mr',`<div class="k">${k}</div><div class="v">${v}</div>`); }

