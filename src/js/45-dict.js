/*==================================================================
  СЛОВАРЬ: поиск + HSK
==================================================================*/
function viewDict(s){
  const v=el('div','view');
  const heading=el('div','dict-heading');heading.appendChild(el('h1','','Поиск'));const settings=el('button','linkbtn',IC('gear',24));settings.setAttribute('aria-label','Настройки');settings.onclick=()=>go('settings');heading.appendChild(settings);v.appendChild(heading);
  const inp=el('input','search'); inp.placeholder='Иероглиф, пиньинь или перевод…'; inp.value=State.route.q||''; v.appendChild(inp);
  const res=el('div',''); v.appendChild(res);
  const run=()=>{
    const q=inp.value.trim().toLowerCase(); State.route.q=inp.value; res.innerHTML='';
    if(!q){
      res.appendChild(el('p','note','Ищи слова и ключи по иероглифам, русскому переводу или пиньиню: nǐ hǎo, ni3 hao3 и nihao работают одинаково.'));
      const recent=studyLearnedPool().slice(0,12),list=el('div','rowlist');
      if(recent.length){res.appendChild(el('p','eyebrow','Из пройденного'));for(const k of recent){const info=notebookInfo(k),b=el('button','row',`<span class="ri han">${esc(info.hz)}</span><div class="tt"><b>${esc(info.ru)}</b><small>${pinyinHTML(info.py)}</small></div>`);b.onclick=()=>isRad(k)?go('radical',{n:radNum(k)}):info.w?go('card',{id:info.w.id}):go('notebook',{k,fromStudy:true});list.appendChild(b);}res.appendChild(list);}
      return;
    }
    const qt=studySearchText(q);
    const hits=WORDS.filter(w=>w.s.includes(q)||(w.d&&w.d.includes(q))||(qt&&studySearchText(w.p).includes(qt))||(w.ru&&w.ru.toLowerCase().includes(q))||(w.en&&w.en.join(' ').toLowerCase().includes(q)))
      .sort((a,b)=>((WORD_L[a.key]||99)-(WORD_L[b.key]||99))||(a.s.length-b.s.length)).slice(0,80);
    const radicalHits=KEY_ORDER.map(n=>'r:'+n).filter(k=>studyMatches(k,q));
    if(radicalHits.length){const radicals=el('div','rowlist');radicalHits.slice(0,12).forEach(k=>{const info=notebookInfo(k),b=el('button','row',`<span class="ri han">${esc(info.hz)}</span><div class="tt"><b>${esc(info.label)} · ${esc(info.ru)}</b><small>${pinyinHTML(info.py)}</small></div>`);b.onclick=()=>go('radical',{n:radNum(k)});radicals.appendChild(b);});res.appendChild(radicals);}
    if(!hits.length&&!radicalHits.length){ res.appendChild(el('div','empty','Ничего не найдено')); return; }
    const list=el('div','rowlist'); hits.forEach(w=>list.appendChild(witem(w))); res.appendChild(list);
  };
  inp.oninput=()=>{run();Resume.later();}; run(); s.appendChild(v);
}
function viewList(s){
  const l=State.route.hsk, ws=WORDS.filter(w=>w.hsk===l).sort((a,b)=>(a.f||99999)-(b.f||99999)), keys=ws.map(w=>w.key);
  const v=el('div','view');
  const back=el('button','back','‹ Словарь'); back.onclick=()=>go('dict'); v.appendChild(back);
  v.appendChild(el('h2','title','HSK '+l));
  v.appendChild(el('p','note',ws.length+' слов, в работе '+learnedCount(keys)+'. Порядок — по частотности.'));
  const act=el('div','actionrow'); const b=el('button','btn',IC('play',16)+' Учить HSK '+l); const q=()=>poolQueue(keys); b.onclick=()=>startSession(q(),'auto','HSK '+l,q); act.appendChild(b); v.appendChild(act);
  const list=el('div','rowlist'); list.style.marginTop='12px'; ws.slice(0,State.route.all?ws.length:150).forEach(w=>list.appendChild(witem(w))); v.appendChild(list);
  if(!State.route.all&&ws.length>150){ const m=el('button','btn ghost','Показать все '+ws.length); m.style.marginTop='10px'; m.onclick=()=>go('list',{hsk:l,all:1}); v.appendChild(m); }
  s.appendChild(v);
}

