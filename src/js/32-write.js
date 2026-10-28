/*==================================================================
  ПРОПИСИ ИЕРОГЛИФОВ И КЛЮЧЕЙ — карточки FSRS 'wr:<знак>' и 'wr:r:<№ ключа>'.
  Новое: знакомство (черта за чертой с названием по таблице черт курса + состав по ключам)
  → обвести по контуру → позже в уроке — написать по памяти. Повторение — по памяти;
  ошибка → в конце урока обвести ещё раз (оценка FSRS — «не помню»).
  Ключ пишется в формах упрощённого письма (RADW: 人 и 亻, 言 и 讠…).
==================================================================*/
const canHW=()=>typeof HanziWriter!=='undefined';
function wrForms(k){ const t=wrOf(k); return isRad(t)?RADW[radNum(t)].map(x=>x[0]):[t]; }
// слово курса с этим знаком — для чтения знака и подсказки: выученное, не имя собственное, не из одного этого знака (谢谢),
// короткое, раннего урока
function wrWord(ch){
  let best=null, bk=null;
  const less=(a,b)=>{ for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return a[i]<b[i]; return false; };
  WORDS.forEach(w=>{ if(!WORD_L[w.key]||!w.s.includes(ch)) return;
    const hz=hanOf(w.s), k=[isNew(w.key)?1:0,/^[А-ЯЁA-Z]/.test(meaning(w))?1:0,hz.length>1&&hz.every(c=>c===ch)?1:0,hz.length,WORD_L[w.key]];
    if(!bk||less(k,bk)){ best=w; bk=k; } });
  return best;
}
function wrInfo(k){
  const t=wrOf(k), forms=wrForms(k);
  if(isRad(t)){ const n=radNum(t), r=RADS[n-1];
    return {forms,n,rad:1,head:'ключ №'+n,py:r[2],ru:r[3],say:forms[0],L:KEY_L[n]}; }
  // чтение: как в словах курса из одного этого знака (还 huán / hái — оба), иначе — в слове-подсказке
  const w=wrWord(t), one=uniq(WORDS.filter(x=>WORD_L[x.key]&&x.s===t).sort((a,b)=>WORD_L[a.key]-WORD_L[b.key]).map(x=>x.p));
  const spy=one[0]||(w?charPyIn(t,w):charPy(t));
  return {forms,ch:t,w,py:one.length>1?one.join(' / '):spy,spy,ru:shortRu(charRu(t)||(w&&hanOf(w.s).length===1?meaning(w):'')),say:t,L:CHAR_L[t]};
}
function wrSay(i){ if(Speech.has()) Speech.say(i.say,undefined,i.spy||i.py); }
function wrTasks(k,used,opts){
  if(!canHW()||opts.test) return [];
  return isNew(k)?[{t:'wintro',k},{t:'wtrace',k},{t:'wmem',k}]:[{t:'wmem',k}];
}
function hwLoad(c){ return new Promise(ok=>hwData(c,ok,()=>ok(null))); }
const wrSize=()=>Math.max(220,Math.min(290,(window.innerWidth||360)-70));
function strokeCap(SN,j,N,named){
  const x=SN[j];
  if(!named||!x) return `<span class="wt">черта ${j+1} из ${N}</span>`;
  return `<span class="wn">${j+1}<small>/${N}</small></span>${x.n?strokeImg(x.n,30):''}<span class="wt">${esc(x.name)}${x.n?` <small>№${x.n}</small>`:''}</span>`;
}
function stripHTML(f){ const SN=strokesOf(f); return `<div class="stks">${SN.map((x,i)=>`<span class="sk" data-j="${i}"><i>${i+1}</i>${x.n?strokeImg(x.n,26):'<b>·</b>'}</span>`).join('')}</div>`; }
function markStrip(host,j,done){ host.querySelectorAll('.sk').forEach((e,i)=>{ e.classList.toggle('done',done?i<=j:i<j); e.classList.toggle('on',!done&&i===j); }); }

// — анимация порядка черт: черта за чертой, подпись — название черты по таблице курса
function strokeDemo(host,forms){
  const size=wrSize();
  host.innerHTML=`${forms.length>1?`<div class="wforms">${forms.map((f,i)=>`<button class="wf${i?'':' on'}" data-i="${i}"><span class="han">${esc(f)}</span><small>${i?'в составе знака':'основная'}</small></button>`).join('')}</div>`:''}
    <div class="writer wpad" style="width:${size}px;height:${size}px"></div><div class="wcap"></div><div class="wstrip"></div>
    <div class="actionrow" style="justify-content:center;margin-top:4px"><button class="say" data-replay>${IC('play',18)} Ещё раз</button></div>`;
  const pad=host.querySelector('.wpad'), cap=host.querySelector('.wcap'), strip=host.querySelector('.wstrip');
  let tok=0, cur=0;
  async function run(i,chain){
    const my=++tok; cur=i;
    host.querySelectorAll('.wf').forEach((b,j)=>b.classList.toggle('on',j===i));
    const f=forms[i], SN=strokesOf(f); pad.innerHTML=''; strip.innerHTML=stripHTML(f);
    if(!canHW()){ cap.textContent='прописи недоступны'; return; }
    const data=await hwLoad(f); if(my!==tok) return;
    if(!data){ cap.textContent='нет данных о чертах для '+f+' (нужна сеть)'; return; }
    const N=data.strokes.length, named=SN.length===N;
    let hw; try{ hw=HanziWriter.create(pad,f,{width:size,height:size,padding:12,showCharacter:false,showOutline:true,
      strokeColor:HWC.stroke,outlineColor:HWC.outline,highlightColor:HWC.hl,strokeAnimationSpeed:reducedMotion()?3:.9,delayBetweenStrokes:0,
      charDataLoader:(x,ok)=>ok(data)}); }catch(e){ cap.textContent='прописи недоступны'; return; }
    for(let j=0;j<N;j++){
      if(my!==tok||!host.isConnected) return;
      cap.innerHTML=strokeCap(SN,j,N,named); markStrip(strip,j);
      try{ await hw.animateStroke(j); }catch(e){ return; }
      await new Promise(r=>setTimeout(r,reducedMotion()?60:220));
    }
    if(my!==tok) return;
    markStrip(strip,N-1,true); cap.innerHTML=`<span class="wt">${N} ${plural(N,'черта','черты','черт')} — теперь обведи сам</span>`;
    if(chain&&i+1<forms.length) setTimeout(()=>{ if(my===tok&&host.isConnected) run(i+1,true); },900);
  }
  host.querySelectorAll('.wf').forEach(b=>b.onclick=()=>run(+b.dataset.i,false));
  host.querySelector('[data-replay]').onclick=()=>run(cur,false);
  run(0,true);
}
// — пропись: формы по очереди; 'trace' — по контуру, подсказка после 1 ошибки, названия черт видны;
//   'mem' — без контура, подсказка после 3 ошибок, название черты — только после ошибки
function writePad(host,forms,mode,onDone){
  const size=wrSize(), trace=mode==='trace';
  let idx=0, mist=0;
  host.innerHTML=`<div class="wforms wprog"></div><div class="writer wpad" style="width:${size}px;height:${size}px"></div><div class="wcap"></div>${trace?'<div class="wstrip"></div>':''}`;
  const pad=host.querySelector('.wpad'), cap=host.querySelector('.wcap'), strip=host.querySelector('.wstrip'), prog=host.querySelector('.wprog');
  async function mount(){
    const f=forms[idx], SN=strokesOf(f);
    prog.innerHTML=forms.length>1?forms.map((x,i)=>`<span class="wf${i===idx?' on':''}${i<idx?' ok':''}">${trace||i<idx?`<span class="han">${esc(x)}</span>`:`<b>${i+1}</b>`}<small>${i?'в составе знака':'основная'}</small></span>`).join(''):'';
    pad.innerHTML=''; if(strip) strip.innerHTML=stripHTML(f);
    const data=await hwLoad(f); if(!host.isConnected) return;
    if(!data){ cap.textContent='нет данных о чертах для '+f+' (нужна сеть)'; onDone(null); return; }
    const N=data.strokes.length, named=SN.length===N;
    cap.innerHTML=strokeCap(SN,0,N,trace&&named); if(strip) markStrip(strip,0);
    try{
      const hw=HanziWriter.create(pad,f,{width:size,height:size,padding:12,showCharacter:false,showOutline:trace,
        strokeColor:HWC.stroke,outlineColor:HWC.outline,drawingColor:HWC.draw,highlightColor:HWC.hl,drawingWidth:6,charDataLoader:(x,ok)=>ok(data)});
      hw.quiz({showHintAfterMisses:trace?1:3,highlightOnComplete:true,
        onMistake:st=>{ mist++; const j=st.strokeNum; cap.innerHTML=strokeCap(SN,j,N,named)+'<span class="wbad">не так — ещё раз</span>'; },
        onCorrectStroke:st=>{ const j=st.strokeNum+1; if(st.strokesRemaining>0){ cap.innerHTML=strokeCap(SN,j,N,trace&&named); if(strip) markStrip(strip,j); } },
        onComplete:()=>{ if(strip) markStrip(strip,N-1,true); cap.innerHTML=`<span class="wt" style="color:var(--ok-text)">✓ ${N} ${plural(N,'черта','черты','черт')}</span>`;
          idx++; if(idx<forms.length){ cap.innerHTML='<span class="wt">✓ теперь форма '+(idx+1)+'</span>'; setTimeout(()=>{ if(host.isConnected) mount(); },500); }
          else onDone(mist); }});
    }catch(e){ cap.textContent='прописи недоступны'; onDone(null); }
  }
  mount();
}
function wrRight(i){
  return `<span class="han" style="font-size:30px">${i.forms.map(esc).join(' ')}</span> ${pinyinHTML(i.py)} — ${esc(i.ru)}${i.rad?' · '+esc(i.head):''}`;
}
function wrHead(i){ return i.rad?`Ключ №${i.n}`:'Иероглиф'+(i.L?' · урок '+i.L:''); }
// задание: знакомство
function tWIntro(stage,x,task){
  const i=wrInfo(task.k);
  const c=el('div','qcard introcard wintro'); c.style.minHeight='0';
  c.innerHTML=`<div class="newtag">${IC('brush',14)} Пропись · ${esc(wrHead(i))}</div>
    <div class="wmeta"><b>${pinyinHTML(i.py)}</b> — ${esc(i.ru)} <button class="say" aria-label="Слушать">${SPK(18)}</button></div>
    ${i.rad?`<div class="note" style="margin:2px 0 0">${i.forms.length>1?'Две формы: основная и та, что пишется в составе иероглифов':'Так ключ пишется в иероглифах'}</div>`:''}
    <div class="wdemo"></div>${i.rad?'':keyFormula(i.ch,{w:i.w})}`;
  stage.appendChild(c);
  c.querySelector('.wmeta .say').onclick=()=>wrSay(i);
  strokeDemo(c.querySelector('.wdemo'),i.forms);
  const row=el('div','actionrow');
  const kn=el('button','btn ghost','Уже умею писать'); kn.onclick=()=>wrKnown(task.k);
  const nx=el('button','btn','Обвести'); nx.dataset.key='space'; nx.onclick=playNext;
  row.appendChild(kn); row.appendChild(nx); stage.appendChild(row);
  wrSay(i);
}
// «Уже умею писать» — без обводки, но по памяти всё равно напишешь (оценка — по ней)
function wrKnown(k){
  const P=PLAY, it=P.items[k], n0=P.queue.length;
  P.queue=P.queue.filter(t=>!(t.k===k&&t.t==='wtrace'));
  const rm=n0-P.queue.length; if(it) it.left-=rm; P.total=Math.max(P.done,P.total-rm);
  save('meta'); playNext();
}
function tWTrace(stage,x,task){
  const i=wrInfo(task.k);
  head(stage,task.retry?'Обведи ещё раз — по контуру':'Обведи по контуру');
  const c=el('div','qcard'); c.style.minHeight='0'; c.style.padding='12px';
  c.innerHTML=`<div class="wmeta"><b>${pinyinHTML(i.py)}</b> — ${esc(i.ru)}${i.rad?' · '+esc(i.head):''}</div><div class="wpadhost"></div>`;
  stage.appendChild(c);
  writePad(c.querySelector('.wpadhost'),i.forms,'trace',m=>{ if(m==null){ playAnswer(true,{noFB:true}); return; } wrSay(i);
    playAnswer(true,{okHtml:m?'ошибок в чертах: '+m:'все черты верно'}); });
}
function tWMem(stage,x,task){
  const i=wrInfo(task.k);
  head(stage,i.rad?'Напиши ключ по памяти':'Напиши иероглиф по памяти');
  const c=el('div','qcard'); c.style.minHeight='0'; c.style.padding='12px';
  let hint='';
  if(i.rad) hint=`<div class="qbig" style="font-size:19px">${esc(i.head)} «${esc(i.ru)}»</div><div class="qsub">${pinyinHTML(i.py)}${i.forms.length>1?' · '+i.forms.length+' формы: основная и в составе знака':''}</div>`;
  else{ const w=i.w, multi=w&&hanOf(w.s).length>1;
    hint=`<div class="qbig" style="font-size:22px">${pinyinHTML(i.py)} — «${esc(i.ru)}»</div>${multi&&hanOf(w.s).some(c=>c!==i.ch)?`<div class="qsub">в слове <span class="han" style="font-size:20px;color:var(--title)">${esc((w.d||w.s).split(i.ch).join('□'))}</span> ${pinyinHTML(w.p)} — ${esc(meaning(w))}</div>`:''}`; }
  c.innerHTML=`${hint}<button class="say" style="margin-top:4px" aria-label="Слушать">${SPK(18)}</button><div class="wpadhost"></div>`;
  stage.appendChild(c);
  c.querySelector('.say').onclick=()=>wrSay(i);
  if(!task.played){ task.played=1; setTimeout(()=>wrSay(i),250); }
  const lim=3*i.forms.length, gu=el('button','linkbtn','Не помню — показать');
  gu.onclick=()=>{ gu.remove(); playAnswer(false,{right:wrRight(i)+'<br><small>обведёшь по контуру в конце урока</small>'}); };
  writePad(c.querySelector('.wpadhost'),i.forms,'mem',m=>{ gu.remove(); if(m==null){ playAnswer(true,{noFB:true}); return; } wrSay(i);
    playAnswer(m<=lim,{hard:m>0,right:wrRight(i)+`<br><small>ошибок в чертах: ${m} — обведёшь ещё раз в конце урока</small>`,okHtml:m?'ошибок в чертах: '+m:'без единой ошибки'}); });
  stage.appendChild(gu);
}

// — что писать: знаки выученных слов (по порядку уроков) и выученные ключи (2 знака : 1 ключ)
function newWriteItems(n,kind){
  const chars=kind==='keys'?[]:uniq(COURSE.filter(k=>!isNew(k)).flatMap(k=>hanOf(BYK[k].s))).sort((a,b)=>(CHAR_L[a]||99)-(CHAR_L[b]||99))
    .map(c=>'wr:'+c).filter(k=>validKey(k)&&isNew(k));
  const keys=kind==='chars'?[]:KEY_ORDER.filter(x=>!isNew('r:'+x)).map(x=>'wr:r:'+x).filter(isNew);
  if(kind) return (kind==='keys'?keys:chars).slice(0,n);
  const out=[]; let i=0, j=0;
  while(out.length<n&&(i<chars.length||j<keys.length)){ if((out.length%3===2||i>=chars.length)&&j<keys.length) out.push(keys[j++]); else out.push(chars[i++]); }
  return out;
}
// план дня: новых прописей 6 (фокус-неделя — 3, поездка — 0); повторения прописей — в общих «Повторениях»
function writeQuota(){ const t=dayType(); return t==='away'?0:t==='focus'?3:6; }
function writeToday(){ const q=writeQuota(), done=D().wr||0, avail=q?newWriteItems(q).length:0; return {quota:q,done,left:Math.max(0,q-done),avail,need:Math.min(q,done+avail)}; }
function startWrite(kind){
  if(!canHW()){ toast('Прописи не загрузились — открой приложение с интернетом'); return; }
  const fil=k=>isWR(k)&&(kind==='keys'?isRad(wrOf(k)):kind==='chars'?!isRad(wrOf(k)):true);
  const f=()=>{ const left=kind?4:Math.min(4,writeToday().left); return dueKeys(fil).slice(0,3).concat(newWriteItems(left,kind)); };
  if(!f().length){ toast(kind==='keys'?'Сначала выучи ключи на Пути — потом пропишем':kind==='chars'?'Сначала выучи слова на Пути — потом пропишем их иероглифы':'Прописи на сегодня сделаны'); return; }
  playStart(f(),{title:kind==='keys'?'Прописи ключей':kind==='chars'?'Прописи иероглифов':'Прописи',kind:'write',more:f});
}
// «Прописи урока» (экран урока): к сроку + по 4 новых знака урока; всё написано — по памяти вразброс
function startLessonWrite(L){
  if(!canHW()){ toast('Прописи не загрузились — открой приложение с интернетом'); return; }
  const ks=LESSON_CHARS[L].map(c=>'wr:'+c).filter(validKey);
  const f=()=>{ const nw=ks.filter(isNew), due=ks.filter(isDue); return nw.length||due.length?due.slice(0,4).concat(nw.slice(0,4)):[]; };
  const q=f(); playStart(q.length?q:shuffle(ks).slice(0,6),{title:'Урок '+L+' · прописи',kind:'write',more:f});
}
function writeStats(){
  const ks=Object.keys(State.cards).filter(k=>isWR(k)&&!isNew(k)), r=ks.filter(k=>isRad(wrOf(k)));
  return {chars:ks.length-r.length,keys:r.length,solid:ks.filter(k=>stab(k)>=7).length,due:dueKeys(isWR).length};
}
