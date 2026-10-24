/*==================================================================
  СЛОВАРЬ: поиск + HSK
==================================================================*/
function viewDict(s){
  const v=el('div','view');
  const inp=el('input','search'); inp.placeholder='Иероглиф, пиньинь или перевод…'; inp.value=State.route.q||''; v.appendChild(inp);
  const res=el('div',''); v.appendChild(res);
  const run=()=>{
    const q=inp.value.trim().toLowerCase(); State.route.q=inp.value; res.innerHTML='';
    if(!q){
      res.appendChild(el('p','eyebrow','HSK 3.0 — дополнительно к урокам'));
      const list=el('div','rowlist');
      [1,2,3,4,5,6].forEach(l=>{ const ws=WORDS.filter(w=>w.hsk===l);
        const r=el('button','row',`<div class="n" style="color:var(--gold)">${l}</div><div class="tt"><b>HSK ${l}</b><small>${ws.length} слов</small></div><div class="cnt">${learnedCount(ws.map(w=>w.key))}/${ws.length}</div>`);
        r.onclick=()=>go('list',{hsk:l}); list.appendChild(r); });
      res.appendChild(list);
      res.appendChild(el('p','note',`В базе ${WORDS.length} слов и ${Object.keys(CHARS).length} иероглифов: Кондрашевский (уроки 1–30) + HSK 1–6.`));
      return;
    }
    const qt=toneless(q);
    const hits=WORDS.filter(w=>w.s.includes(q)||(w.d&&w.d.includes(q))||(qt&&toneless(w.p).includes(qt))||(w.ru&&w.ru.toLowerCase().includes(q))||(w.en&&w.en.join(' ').toLowerCase().includes(q)))
      .sort((a,b)=>((WORD_L[a.key]||99)-(WORD_L[b.key]||99))||(a.s.length-b.s.length)).slice(0,80);
    if(!hits.length){ res.appendChild(el('div','empty','Ничего не найдено')); return; }
    const list=el('div','rowlist'); hits.forEach(w=>list.appendChild(witem(w))); res.appendChild(list);
  };
  inp.oninput=run; run(); s.appendChild(v);
}
function viewList(s){
  const l=State.route.hsk, ws=WORDS.filter(w=>w.hsk===l).sort((a,b)=>(a.f||99999)-(b.f||99999)), keys=ws.map(w=>w.key);
  const v=el('div','view');
  const back=el('button','back','‹ Словарь'); back.onclick=()=>go('dict'); v.appendChild(back);
  v.appendChild(el('h2','title','HSK '+l));
  v.appendChild(el('p','note',ws.length+' слов, в работе '+learnedCount(keys)+'. Порядок — по частотности.'));
  const act=el('div','actionrow'); const b=el('button','btn','▶ Учить HSK '+l); const q=()=>poolQueue(keys); b.onclick=()=>startSession(q(),'auto','HSK '+l,q); act.appendChild(b); v.appendChild(act);
  const list=el('div','rowlist'); list.style.marginTop='12px'; ws.slice(0,State.route.all?ws.length:150).forEach(w=>list.appendChild(witem(w))); v.appendChild(list);
  if(!State.route.all&&ws.length>150){ const m=el('button','btn ghost','Показать все '+ws.length); m.style.marginTop='10px'; m.onclick=()=>go('list',{hsk:l,all:1}); v.appendChild(m); }
  s.appendChild(v);
}

