/*==================================================================
  ПРОПИСИ
==================================================================*/
function viewDraw(s){
  const r=State.route, chars=(r.chars||[]).filter(Boolean);
  let i=Math.min(r.i||0,Math.max(0,chars.length-1));
  const v=el('div','view');
  const back=el('button','back','‹ Назад'); back.onclick=()=>r.back?go(r.back.name,r.back):go(State.tab||'home'); v.appendChild(back);
  v.appendChild(el('h2','title','Прописи · '+esc(r.title||'')));
  if(!chars.length){ v.appendChild(el('p','note','Нет иероглифов для прописей.')); s.appendChild(v); return; }
  const ch=chars[i], h=HZ.c[ch];
  const c=el('div','card'); c.style.padding='14px';
  const rr=RIDX[ch]!=null?RADS[RIDX[ch]]:null;
  c.innerHTML=`<div class="bigpy">${h?pinyinHTML(h[7])+' · '+esc(h[6]||''):rr?pinyinHTML(rr[2])+' · ключ «'+esc(rr[3])+'»':''}</div><div id="writer"></div><div class="drawhint" id="drawHint"></div>
    <div class="cardbtns"><button class="iconbtn" id="dAnim" aria-label="Анимация">${IC('play',22)}</button><button class="iconbtn" id="dRedo" aria-label="Заново">${IC('undo',22)}</button><button class="iconbtn" id="dOut" aria-label="Контур">${IC('eye',22)}</button><button class="iconbtn primary" data-say="${ch}" aria-label="Слушать">${SPK(26)}</button></div>`;
  v.appendChild(c);
  if(chars.length>1){
    const nav=el('div','actionrow');
    const p=el('button','btn mini ghost','‹'); p.disabled=i===0; p.onclick=()=>go('draw',{...r,i:i-1});
    const n=el('button','btn mini',(i+1)+' / '+chars.length+' · дальше ›'); n.dataset.key='space'; n.disabled=i===chars.length-1; n.onclick=()=>go('draw',{...r,i:i+1});
    nav.appendChild(p); nav.appendChild(n); v.appendChild(nav);
    const g=el('div','chgrid'); g.style.marginTop='10px';
    chars.forEach((x,j)=>{ const b=el('button','han',x); if(j===i) b.style.borderColor='var(--cinnabar)'; b.onclick=()=>go('draw',{...r,i:j}); g.appendChild(b); });
    v.appendChild(g);
  }
  v.appendChild(el('div','',breakdown(ch)));
  if(typeof HanziWriter==='undefined') v.appendChild(el('p','note',IC('warn',16)+' Библиотека прописей не загрузилась (нужна сеть при первом запуске).'));
  s.appendChild(v);
  let outline=true;
  const mount=()=>{
    const host=$('#writer'), hint=$('#drawHint'); if(!host) return; host.innerHTML='';
    if(typeof HanziWriter==='undefined'){ hint.textContent='нет библиотеки прописей'; return; }
    try{
      const hw=HanziWriter.create('writer',ch,{width:250,height:250,padding:10,showCharacter:false,showOutline:outline,
        strokeColor:HWC.stroke,outlineColor:HWC.outline,drawingColor:HWC.draw,highlightColor:HWC.hl,strokeAnimationSpeed:1.1,delayBetweenStrokes:120,
        charDataLoader:(x,ok)=>hwData(x,ok,()=>{ hint.textContent='нет данных о чертах для '+x+' (нужна сеть)'; })});
      const SN=strokesOf(ch), sname=i=>SN[i]?(SN[i].name+(SN[i].n?' (№'+SN[i].n+')':'')):'';
      hint.textContent=(outline?'Обведи по контуру. ':'По памяти. ')+(SN.length?'Черта 1: '+sname(0):'');
      hw.quiz({showHintAfterMisses:3,
        onMistake:st=>{ hint.textContent='Черта '+(st.strokeNum+1)+(SN.length?' — '+sname(st.strokeNum):'')+': ещё раз'; },
        onCorrectStroke:st=>{ hint.textContent=st.strokesRemaining>0?'✓ черта '+(st.strokeNum+2)+(SN.length?': '+sname(st.strokeNum+1):'')+' · осталось '+st.strokesRemaining:'✓'; },
        onComplete:sum=>{ hint.innerHTML='<span style="color:var(--ok)">Готово! ошибок: '+sum.totalMistakes+'</span>'; Speech.has()&&Speech.say(ch); }});
      $('#dAnim').onclick=()=>hw.animateCharacter();
    }catch(e){ hint.textContent='ошибка: '+e.message; }
  };
  $('#dRedo').onclick=mount; $('#dOut').onclick=()=>{ outline=!outline; mount(); };
  mount();
}

