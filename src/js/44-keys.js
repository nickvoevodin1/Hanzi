/*==================================================================
  КЛЮЧИ (214, названия — из таблицы ДВФУ)
==================================================================*/
function radGrid(nums){
  const g=el('div','rg'); g.style.marginTop='10px';
  nums.forEach(n=>{ const r=RADS[n-1], st=statusOf('r:'+n);
    const b=el('button','rc'+(st==='due'?' due':st!=='new'?' learned':''),`<div class="rn"><span>№${n}</span><span>${r[1]}</span></div><div class="han">${esc(r[4][0])}${r[4].length>1?`<small style="font-size:18px;color:var(--paper-dim);margin-left:4px">${esc([...r[4]].slice(1,3).join(' '))}</small>`:''}</div><div class="rm">${esc(r[3])}</div>`);
    b.onclick=()=>go('radical',{n}); g.appendChild(b); });
  return g;
}
function viewKeys(s){
  const v=el('div','view'), scope=State.route.scope||'order';
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Ключи'));
  const all=KEY_ORDER.slice(), la=learnedCount(all.map(n=>'r:'+n)), kq=todayKeysQuota();
  v.appendChild(el('p','note',`Колода «Ключи» — все 214, в порядке изучения: сначала частые в иероглифах уроков 1–30 (口, 一, 人, 木…), в конце — ${all.filter(n=>!KEY_CHARS[n]).length}, которых в уроках нет. Введено ${la} из 214; сегодня новых — ${kq.quota} (осталось ${kq.left}). Номера — по Канси; названия — таблица ДВФУ.`));
  const act=el('div','actionrow');
  const b1=el('button','btn','▶ Учить ключи'); const q1=()=>poolQueue(all.map(n=>'r:'+n),8); b1.onclick=()=>playStart(q1(),{title:'Ключи',kind:'learn',more:q1});
  const b2=el('button','btn ghost','🃏 Карточки'); const q2=()=>poolQueue(all.map(n=>'r:'+n)); b2.onclick=()=>startSession(q2(),'auto','Все ключи',q2);
  act.appendChild(b1); act.appendChild(b2); v.appendChild(act);
  const tabs=el('div','tabs');
  [['order','По порядку изучения'],['all','По номеру']].forEach(([id,t])=>{ const b=el('button','tab'+(scope===id?' on':''),t); b.onclick=()=>go('keys',{scope:id}); tabs.appendChild(b); });
  const sb=el('button','tab','Черты'); sb.onclick=()=>go('strokes'); tabs.appendChild(sb);
  v.appendChild(tabs);
  v.appendChild(radGrid(scope==='all'?RADS.map(r=>r[0]):all));
  s.appendChild(v);
}
function viewStrokes(s){
  const v=el('div','view');
  const back=el('button','back','‹ Назад'); back.onclick=()=>go(State.tab==='dict'?'dict':'keys'); v.appendChild(back);
  v.appendChild(el('h2','title','Черты'));
  v.appendChild(el('p','note','Таблица черт курса (24 черты). Названия черт показываются в разборе иероглифа («Порядок черт») и подсказываются в прописях. Нажми на пример — разбор иероглифа.'));
  STROKE_TABLE.forEach(([title,rows])=>{
    v.appendChild(el('p','eyebrow',esc(title)));
    const list=el('div','rowlist');
    rows.forEach(([n,name,ex])=>list.appendChild(el('div','strow',`<span class="num">${n}</span>${strokeImg(n)}<span class="nm">${esc(name)}</span><span class="ex han">${[...ex].map(c=>HZ.c[c]?`<span class="hz" data-c="${c}">${c}</span>`:c).join('')}</span>`)));
    v.appendChild(list);
  });
  v.appendChild(el('p','eyebrow','Нет в таблице курса'));
  v.appendChild(el('p','note','В данных о порядке черт встречаются ещё такие черты; названия для них даны по смыслу: '+Object.values(STROKE_EXTRA).map(esc).join('; ')+'.'));
  s.appendChild(v);
}
function viewRadical(s){
  const n=State.route.n, r=RADS[n-1], st=statusOf('r:'+n);
  const v=el('div','view');
  const back=el('button','back','‹ Ключи'); back.onclick=()=>go('keys'); v.appendChild(back);
  const card=el('div','card');
  card.innerHTML=`<div class="bighz han" style="font-size:76px">${esc(r[4][0])}</div>
    ${r[4].length>1?`<div class="han" style="font-size:22px;color:var(--paper-dim);margin-bottom:6px">${esc([...r[4]].slice(1).join('  '))}</div>`:''}
    <div class="bigpy">${pinyinHTML(r[2])}</div><div class="bigtr">${esc(r[3])}</div>
    <div class="tagrow"><span class="pill">Ключ №${n}</span><span class="pill">${r[1]} ${plural(r[1],'черта','черты','черт')}</span>${KEY_L[n]?`<span class="pill k">урок ${KEY_L[n]}</span>`:''}<span class="pill">№${KEY_ORDER.indexOf(n)+1} в порядке изучения</span>${st!=='new'?'<span class="pill ok">в работе</span>':''}</div>
    <div class="cardbtns"><button class="iconbtn primary" data-say="${esc(r[4][0])}" aria-label="Слушать">🔊</button><button class="iconbtn" data-draw="${esc(r[4][0])}" aria-label="Прописи">笔</button></div>`;
  v.appendChild(card);
  const p2=RAD2[n];
  if(p2){ const ex=p2.e&&HZ.c[p2.e]?`<span class="hz han" data-c="${p2.e}" style="font-size:20px">${esc(p2.e)}</span>`:`<span class="han" style="font-size:20px">${esc(p2.e||'')}</span>`;
    const box=el('div','meta');
    box.appendChild(mr('По пособию',`${esc(p2.m||'')}${p2.p&&p2.p!==r[2]?` · чтение в пособии: ${pinyinHTML(p2.p)}`:''}${p2.s?` · упрощённо: <span class="han" style="font-size:18px">${esc(p2.s)}</span>`:''}${p2.pn?` · формы: <span class="han">${esc(/^[\u2e80-\u9fff]/.test(p2.pn)?p2.f.split(' ')[0]+', '+p2.pn:p2.f.split(' ').join(', ')+' '+p2.pn)}</span>`:''}<div class="lbl" style="margin-top:2px">Петросян, «Таблица иероглифических ключей (по словарю Кан Си)»</div>`));
    if(p2.e) box.appendChild(mr('Пример',`${ex} ${esc(p2.ep||'')} — ${esc(p2.er||'')}`));
    v.appendChild(box); }
  const kc=KEY_CHARS[n]||[];
  if(kc.length){ v.appendChild(el('p','eyebrow','В разборе иероглифов уроков ('+kc.length+')'));
    const g=el('div','chgrid'); kc.slice(0,30).forEach(c=>g.appendChild(hzBtn(c))); v.appendChild(g); }
  const lc=radChars(n);
  const other=Object.keys(HZ.c).filter(c=>HZ.c[c][0]===n&&!CHAR_L[c]);
  if(lc.length){ v.appendChild(el('p','eyebrow','Ключ по словарю (Канси) у иероглифов уроков ('+lc.length+')'));
    const g=el('div','chgrid'); lc.forEach(c=>g.appendChild(hzBtn(c))); v.appendChild(g); }
  if(other.length){ v.appendChild(el('p','eyebrow','Ещё в словаре HSK ('+other.length+')'));
    const g=el('div','chgrid'); other.slice(0,40).forEach(c=>g.appendChild(hzBtn(c))); v.appendChild(g); }
  if(!lc.length&&!other.length) v.appendChild(el('p','note','В словах приложения этот ключ не встречается.'));
  s.appendChild(v);
}

