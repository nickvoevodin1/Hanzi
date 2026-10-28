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
  const ch=chars[i], h=HZ.c[ch], size=wrSize();
  const c=el('div','card'); c.style.padding='14px';
  const rr=RIDX[ch]!=null?RADS[RIDX[ch]]:null;
  c.innerHTML=`<div class="bigpy">${h?pinyinHTML(charPy(ch))+' · '+esc(shortRu(charRu(ch))):rr?pinyinHTML(rr[2])+' · ключ №'+rr[0]+' «'+esc(rr[3])+'»':''}</div><div id="writer" style="width:${size}px;height:${size}px"></div><div class="wcap" id="drawHint"></div><div class="wstrip" id="drawStrip"></div>
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
  v.appendChild(el('div','',ET[ch]?keyFormula(ch):'')); v.appendChild(el('div','',breakdown(ch)));
  if(typeof HanziWriter==='undefined') v.appendChild(el('p','note',IC('warn',16)+' Библиотека прописей не загрузилась (нужна сеть при первом запуске).'));
  s.appendChild(v);
  let outline=true;
  const mount=()=>{
    const host=$('#writer'), hint=$('#drawHint'); if(!host) return; host.innerHTML='';
    if(typeof HanziWriter==='undefined'){ hint.textContent='нет библиотеки прописей'; return; }
    try{
      const hw=HanziWriter.create('writer',ch,{width:size,height:size,padding:12,showCharacter:false,showOutline:outline,
        strokeColor:HWC.stroke,outlineColor:HWC.outline,drawingColor:HWC.draw,highlightColor:HWC.hl,strokeAnimationSpeed:1.1,delayBetweenStrokes:120,
        charDataLoader:(x,ok)=>hwData(x,ok,()=>{ hint.textContent='нет данных о чертах для '+x+' (нужна сеть)'; })});
      const SN=strokesOf(ch), N=SN.length, strip=$('#drawStrip');
      strip.innerHTML=N?stripHTML(ch):'';
      const capAt=j=>{ hint.innerHTML=N?strokeCap(SN,j,N,outline):''; if(N) markStrip(strip,j); };
      capAt(0);
      hw.quiz({showHintAfterMisses:outline?1:3,
        onMistake:st=>{ hint.innerHTML=(N?strokeCap(SN,st.strokeNum,N,true):'')+'<span class="wbad">не так — ещё раз</span>'; },
        onCorrectStroke:st=>{ if(st.strokesRemaining>0) capAt(st.strokeNum+1); },
        onComplete:sum=>{ if(N) markStrip(strip,N-1,true); hint.innerHTML='<span class="wt" style="color:var(--ok-text)">Готово! ошибок в чертах: '+sum.totalMistakes+'</span>'; Speech.has()&&Speech.say(ch); }});
      $('#dAnim').onclick=()=>{ hw.cancelQuiz&&hw.cancelQuiz(); hw.animateCharacter({onComplete:()=>setTimeout(mount,600)}); };
    }catch(e){ hint.textContent='ошибка: '+e.message; }
  };
  $('#dRedo').onclick=mount; $('#dOut').onclick=()=>{ outline=!outline; mount(); };
  mount();
}

