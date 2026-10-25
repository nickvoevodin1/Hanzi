/*==================================================================
  КАРТОЧКИ (классика): самопроверка с 4 кнопками оценки FSRS.
  Режим «Авто» подбирает задание по прочности памяти (S, дни):
  новое → знакомство; слабое → узнавание/выбор/на слух; среднее → вспомнить,
  тоны, пиньинь; прочное → написать иероглиф, диктант.
==================================================================*/
let SESSION=null;
function startSession(queue,mode,title,more){
  queue=queue.filter(validKey);
  if(!queue.length){ toast('Нечего повторять — всё сделано'); return; }
  SESSION={queue:queue.slice(),mode:mode||'auto',title,more,total:queue.length,done:0,again:[],fails:{},intro:{},current:null,cur:null,last:null};
  go('session');
}
function nextItem(){ return SESSION.queue.length?SESSION.queue.shift():SESSION.again.length?SESSION.again.shift():null; }
function pickMode(w){
  let m=SESSION.mode;
  if(m==='auto'){
    const c=cardOf(w.key), S=c&&c.state?c.S:0;
    const pool = S<2 ? ['recog','recog','choice','listen'] : S<10 ? ['recog','recall','produce','tones','pinyin','listen'] : ['recall','write','write','dictate','tones','produce'];
    m=pool[Math.random()*pool.length|0];
  }
  if((m==='listen'||m==='dictate')&&!Speech.has()) m='recog';
  if((m==='write'||m==='dictate')&&!canWrite(w)) m= m==='dictate'?'listen':'recall';
  if(m==='tones'&&!wordSylls(w)) m='recog';
  return m;
}
function viewSession(s){
  if(!SESSION){ go('practice'); return; }
  let key=SESSION.current!=null?SESSION.current:nextItem();
  if(key==null) return sessionDone(s);
  if(SESSION.current!==key){ SESSION.current=key; SESSION.cur=null; }
  const v=el('div','view qwrap');
  const hdr=el('div',''); hdr.style.cssText='display:flex;align-items:center;justify-content:space-between';
  const back=el('button','back',IC('x',14)+' '+esc(SESSION.title||'Завершить')); back.onclick=()=>{ SESSION.finished=true; go('practice'); }; hdr.appendChild(back);
  if(SESSION.last){ const ub=el('button','back',IC('undo',14)+' Отменить'); ub.dataset.key='undo'; ub.onclick=undoLast; hdr.appendChild(ub); }
  v.appendChild(hdr);
  v.appendChild(el('div','progress',`<i style="width:${Math.min(100,SESSION.done/Math.max(1,SESSION.total)*100)|0}%"></i>`));
  const stage=el('div',''); v.appendChild(stage); s.appendChild(v);
  if(isRad(key)){
    const n=radNum(key);
    if(isNew(key)&&!SESSION.intro[key]) return radIntro(stage,n);
    if(!SESSION.cur) SESSION.cur=Math.random()<.5?'rname':'rform';
    return SESSION.cur==='rname'?qRadName(stage,n):qRadForm(stage,n);
  }
  const w=BYK[key];
  if(isNew(key)&&!SESSION.intro[key]) return qIntro(stage,w);
  if(!SESSION.cur) SESSION.cur=pickMode(w);
  ({recog:qRecog,choice:qChoice,produce:qProduce,recall:qRecall,pinyin:qPinyin,listen:qListen,tones:qTones,write:qWrite,dictate:qDictate}[SESSION.cur]||qRecog)(stage,w);
}
function gradeSelf(stage){
  const bar=el('div','gradebar four');
  [['Не помню',1,'g1','1'],['Трудно',2,'g2',''],['Помню',3,'g3','2'],['Легко',4,'g4','']].forEach(([t,g,cl,k],i)=>{
    const b=el('button','grade '+cl,`${t}<small>${i+1}${k==='1'?' · ←':k==='2'?' · →':''}</small>`); b.dataset.ch=String(i+1); if(k) b.dataset.key=k;
    b.onclick=()=>afterGrade(g); bar.appendChild(b); });
  stage.appendChild(bar);
}
function gradeAuto(stage,g){
  const b=el('button','btn showbtn','Дальше ›'); b.dataset.key='space'; b.onclick=()=>afterGrade(g); stage.appendChild(b);
}
function showBtn(stage,fn,label){ const b=el('button','btn showbtn',label||'Показать ответ'); b.dataset.key='space'; b.onclick=()=>{ b.remove(); fn(); }; stage.appendChild(b); return b; }
function answerHTML(w,extra){
  return `<div class="reveal"><div class="py">${pinyinHTML(w.p)}</div><div class="tr">${esc(meaning(w))}</div>
    ${w.ex?`<div class="en han" style="font-size:15px;margin-top:8px">${wrapHz(w.ex[0])}</div><div class="en">${esc(w.ex[2])}</div>`:''}${extra||''}</div>`;
}
function afterGrade(g){
  if(!SESSION||SESSION.current==null) return;
  const key=SESSION.current, wasNew=isNew(key);
  SESSION.last={key,wasNew,g,prev:cardOf(key)?JSON.parse(JSON.stringify(cardOf(key))):null,hadFail:!!SESSION.fails[key]};
  State.cards[key]=FSRS.review(cardOf(key)||{},g,REQ);
  const dd=D(); dd.t++; if(g>=3) dd.ok++; if(g>=2) addXP(XP.task);
  if(wasNew){ if(isRad(key)) dd.keys++; else if(inSem(key)) dd.new++; } else dd.rv++;
  const d=todayStr(); State.meta.rev[d]=(State.meta.rev[d]||0)+1;
  if(g===1){ SESSION.again.push(key); SESSION.fails[key]=1; }
  SESSION.done++; SESSION.current=null; SESSION.cur=null;
  save('cards'); save('meta'); render();
}
function undoLast(){
  const L=SESSION&&SESSION.last; if(!L) return;
  if(L.prev) State.cards[L.key]=L.prev; else delete State.cards[L.key];
  const dd=D(); dd.t=Math.max(0,dd.t-1); if(L.g>=3) dd.ok=Math.max(0,dd.ok-1); if(L.g>=2) dd.xp=Math.max(0,dd.xp-XP.task);
  if(L.wasNew){ if(isRad(L.key)) dd.keys=Math.max(0,dd.keys-1); else if(inSem(L.key)) dd.new=Math.max(0,dd.new-1); } else dd.rv=Math.max(0,dd.rv-1);
  const d=todayStr(); if(State.meta.rev[d]>0) State.meta.rev[d]--;
  if(L.g===1){ const i=SESSION.again.lastIndexOf(L.key); if(i>-1) SESSION.again.splice(i,1); if(!L.hadFail) delete SESSION.fails[L.key]; }
  if(SESSION.current!=null && SESSION.current!==L.key) SESSION.queue.unshift(SESSION.current);
  SESSION.done=Math.max(0,SESSION.done-1); SESSION.current=L.key; SESSION.cur=null; SESSION.last=null;
  save('cards'); save('meta'); render();
}
// — знакомство с новым словом
function qIntro(stage,w){
  const c=el('div','qcard');
  c.innerHTML=`<div class="qprompt" style="color:var(--cinnabar-2)">${IC('sparkle',14)} Новое слово${EXTRA_OF[w.key]?' · '+esc(EXTRA_OF[w.key]):WORD_L[w.key]?' · урок '+WORD_L[w.key]:''}</div>
    <div class="qhz han" style="font-size:84px">${esc(w.d||w.s)}</div>
    <div class="reveal" style="margin-top:10px"><div class="py">${pinyinHTML(w.p)}</div>${palladius(w.p)?`<div class="palla">${esc(palladius(w.p))}</div>`:''}<div class="tr">${esc(meaning(w))}</div>
    ${w.ex?`<div class="en han" style="font-size:16px;margin-top:8px">${wrapHz(w.ex[0])}</div><div class="en">${pinyinHTML(w.ex[1])}</div><div class="en">${esc(w.ex[2])}</div><button class="say" data-say="${esc(w.ex[0])}" style="margin-top:6px">${SPK()} Пример</button>`:''}</div>
`;
  stage.appendChild(c);
  const row=el('div','actionrow');
  const known=el('button','btn ghost','Уже знаю'); known.onclick=()=>{ SESSION.intro[w.key]=1; afterGrade(4); };
  const go2=el('button','btn','Запомнил → проверить'); go2.dataset.key='space'; go2.onclick=()=>{ SESSION.intro[w.key]=1; render(); };
  row.appendChild(known); row.appendChild(go2); stage.appendChild(row);
  stage.appendChild(el('p','eyebrow','Разбор по иероглифам'));
  stage.appendChild(el('div','',breakdown(w.s)));
  Speech.has()&&sayW(w);
}
// — 汉字 → перевод и пиньинь (самопроверка)
function qRecog(stage,w){
  stage.appendChild(el('div','qprompt','Что значит и как читается?'));
  const c=el('div','qcard'); c.innerHTML=`<div class="qhz han">${esc(w.d||w.s)}</div>`; stage.appendChild(c);
  const rev=()=>{ c.innerHTML=`<div class="qhz han" style="font-size:72px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w); Speech.has()&&sayW(w); gradeSelf(stage); stage.appendChild(el('div','',breakdown(w.s))); };
  showBtn(stage,rev);
}
// — 汉字 → 4 перевода
function qChoice(stage,w){
  stage.appendChild(el('div','qprompt','Выбери перевод'));
  const c=el('div','qcard'); c.style.minHeight='24vh'; c.innerHTML=`<div class="qhz han">${esc(w.d||w.s)}</div>`; stage.appendChild(c);
  const right=meaning(w);
  const opts=shuffle(others(distractWords(w).map(meaning),right,3).concat([right]));
  choiceBox(stage,opts.map(o=>[o,esc(o)]),right,ok=>{ c.innerHTML=`<div class="qhz han" style="font-size:64px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w); Speech.has()&&sayW(w); gradeAuto(stage,ok?3:1); });
}
// — перевод → выбрать 汉字
function qProduce(stage,w){
  stage.appendChild(el('div','qprompt','Какой иероглиф?'));
  const c=el('div','qcard'); c.style.minHeight='20vh'; c.innerHTML=`<div class="qbig">${esc(meaning(w))}</div>`; stage.appendChild(c);
  const n=hanOf(w.s).length;
  const pool=distractWords(w).filter(x=>hanOf(x.s).length===n);
  const opts=shuffle(others((pool.length>=6?pool:WORDS).map(x=>x.s),w.s,3).concat([w.s]));
  choiceBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:28px">'+esc(o)+'</span>']),w.s,ok=>{ c.innerHTML=`<div class="qhz han" style="font-size:64px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w); Speech.has()&&sayW(w); gradeAuto(stage,ok?3:1); });
}
function choiceBox(stage,opts,right,done){
  const box=el('div','choices');
  opts.forEach(([val,html],i)=>{ const b=el('button','choice',html); b.dataset.ch=String(i+1);
    b.onclick=()=>{ const ok=val===right; b.classList.add(ok?'correct':'wrong');
      [...box.children].forEach((x,j)=>{ if(opts[j][0]===right) x.classList.add('correct'); x.onclick=null; x.removeAttribute('data-ch'); });
      done(ok); };
    box.appendChild(b); });
  stage.appendChild(box);
}
// — перевод → вспомнить и написать на бумаге (самопроверка)
function qRecall(stage,w){
  stage.appendChild(el('div','qprompt','Вспомни и напиши иероглифами'));
  const c=el('div','qcard'); c.style.minHeight='28vh'; c.innerHTML=`<div class="qbig">${esc(meaning(w))}</div><div class="qsub">напиши на бумаге или в уме, потом сверь</div>`; stage.appendChild(c);
  showBtn(stage,()=>{ c.innerHTML=`<div class="qbig">${esc(meaning(w))}</div><div class="qhz han" style="font-size:72px;margin-top:8px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w); Speech.has()&&sayW(w); gradeSelf(stage); stage.appendChild(el('div','',breakdown(w.s))); });
}
// — ввод пиньиня
function qPinyin(stage,w){
  stage.appendChild(el('div','qprompt','Напиши пиньинь'));
  const c=el('div','qcard'); c.style.minHeight='22vh'; c.innerHTML=`<div class="qhz han">${esc(w.d||w.s)}</div><div class="qsub">${esc(meaning(w))}</div>`; stage.appendChild(c);
  const inp=el('input','tinput'); inp.placeholder='пиньинь (тоны можно не ставить)'; inp.autocapitalize='off'; inp.autocomplete='off'; inp.spellcheck=false; stage.appendChild(inp);
  const chk=el('button','btn showbtn','Проверить'); stage.appendChild(chk);
  const check=()=>{
    const ok=!!inp.value.trim()&&toneless(inp.value)===toneless(w.p);
    c.innerHTML=`<div class="qhz han" style="font-size:64px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w,`<div class="verdict ${ok?'ok':'bad'}">${ok?'✓ верно':'ты написал: '+esc(inp.value||'—')}</div>`);
    inp.remove(); chk.remove(); Speech.has()&&sayW(w); gradeAuto(stage,ok?3:1);
  };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); check(); } });
  chk.onclick=check; setTimeout(()=>inp.focus(),60);
}
// — на слух
function qListen(stage,w){
  stage.appendChild(el('div','qprompt','Послушай: что это?'));
  const c=el('div','qcard'); c.style.minHeight='24vh';
  c.innerHTML=`<button class="iconbtn primary" style="width:70px;height:70px;font-size:30px" ${sayA(w)} aria-label="Слушать">${SPK(36)}</button><button class="linkbtn" ${sayA(w)} data-rate=".5">${SLOW()} медленно</button>`;
  stage.appendChild(c); setTimeout(()=>sayW(w),150);
  showBtn(stage,()=>{ c.innerHTML=`<div class="qhz han" style="font-size:64px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w); gradeSelf(stage); });
}
// — тоны каждого слога
function toneTask(host,chars,sylls,done){
  const box=el('div','tn'); const sel=sylls.map(()=>null);
  const TM=['?','ˉ','ˊ','ˇ','ˋ','·'];
  chars.forEach((ch,i)=>{
    const fixed=sylls[i]==='r';
    const b=el('button','tc'+(fixed?' fix':''),`<span class="han">${esc(ch)}</span><span class="tm">${fixed?'':'?'}</span><span class="tp">${esc(fixed?'r':toneless(sylls[i]))}</span>`);
    if(!fixed) b.onclick=()=>{ sel[i]=sel[i]==null?1:sel[i]===5?1:sel[i]+1; b.querySelector('.tm').innerHTML=toneIcon(sel[i],26); };
    box.appendChild(b);
  });
  host.appendChild(box);
  host.appendChild(el('p','note','Нажимай на слог: тон 1 → 2 → 3 → 4 → лёгкий (график — как меняется высота голоса). 一 и 不 — с изменённым тоном, как в учебнике.')).style.textAlign='center';
  const chk=el('button','btn showbtn','Проверить'); chk.dataset.key='space'; host.appendChild(chk);
  chk.onclick=()=>{
    const idx=sylls.map((s,i)=>i).filter(i=>sylls[i]!=='r');
    if(idx.some(i=>sel[i]==null)){ toast('Отметь тон каждого слога'); return; }
    let ok=true;
    idx.forEach(i=>{ const t=syllTone(sylls[i]), good=sel[i]===t; if(!good) ok=false;
      const b=box.children[i]; b.classList.add(good?'ok':'bad'); b.querySelector('.tp').innerHTML=pinyinHTML(sylls[i]); b.onclick=null; });
    chk.remove(); done(ok);
  };
}
function qTones(stage,w){
  stage.appendChild(el('div','qprompt','Расставь тоны'));
  const c=el('div','qcard'); c.style.minHeight='16vh';
  c.innerHTML=`<div class="qbig">${esc(meaning(w))}</div><button class="say" ${sayA(w)} style="margin-top:10px">${SPK()} Послушать</button>`;
  stage.appendChild(c);
  toneTask(stage,hanOf(w.s),wordSylls(w),ok=>{ stage.appendChild(el('div','reveal',`<div class="py" style="text-align:center">${pinyinHTML(w.p)}</div><div class="verdict ${ok?'ok':'bad'}" style="text-align:center">${ok?'✓ все тоны верны':'есть ошибки'}</div>`)); Speech.has()&&sayW(w); gradeAuto(stage,ok?3:1); });
}
// — написать иероглиф по чертам (hanzi-writer), по переводу или на слух
function hwData(c,onC,onErr){
  if(window.HZDATA&&window.HZDATA[c]){ onC(window.HZDATA[c]); return; }
  fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/'+c+'.json').then(r=>r.json()).then(d=>{ if(window.HZDATA) window.HZDATA[c]=d; onC(d); }).catch(()=>onErr&&onErr());
}
const HWC={stroke:'#3c3c3c',outline:'#e5e5e5',draw:'#ff9600',hl:'#1cb0f6'};   // прописи: написанное — тёмным, контур — светло-серым, рука — оранжевым, подсказка — голубым
function writeQuiz(host,chars,onDone){
  let idx=0, mistakes=0; host.innerHTML='<div class="writer" id="wq"></div><div class="drawhint" id="wqHint"></div>';
  function mount(){
    const hint=$('#wqHint'); $('#wq').innerHTML='';
    hint.textContent=chars.length>1?'Иероглиф '+(idx+1)+' из '+chars.length:'Пиши по чертам';
    try{
      const inst=HanziWriter.create('wq',chars[idx],{width:230,height:230,padding:8,showCharacter:false,showOutline:false,
        strokeColor:HWC.stroke,drawingColor:HWC.draw,highlightColor:HWC.hl,charDataLoader:(c,ok)=>hwData(c,ok,()=>{ hint.textContent='нет данных о чертах (нужна сеть)'; })});
      const SN=strokesOf(chars[idx]);
      inst.quiz({showHintAfterMisses:3,onMistake:st=>{ mistakes++; if(SN[st.strokeNum]) hint.textContent='Черта '+(st.strokeNum+1)+': '+SN[st.strokeNum].name; },
        onComplete:()=>{ idx++; if(idx<chars.length){ hint.textContent='✓'; setTimeout(mount,400); } else onDone(mistakes); }});
    }catch(e){ hint.textContent='прописи недоступны'; onDone(99); }
  }
  mount();
}
function writeGrade(m){ return m===0?3:m<=3?2:1; }
function qWrite(stage,w){
  stage.appendChild(el('div','qprompt','Напиши иероглифами'));
  const c=el('div','card'); c.style.padding='14px';
  c.innerHTML=`<div class="qbig">${esc(meaning(w))}</div><div class="qsub" style="margin-top:4px">${pinyinHTML(w.p)}</div><div id="wqHost"></div>`;
  stage.appendChild(c);
  writeQuiz($('#wqHost'),hanOf(w.s),m=>{ c.appendChild(el('div','',answerHTML(w,`<div class="verdict ${m===0?'ok':m<=3?'':'bad'}">${m===0?'✓ без ошибок':'ошибок в чертах: '+m}</div>`))); Speech.has()&&sayW(w); gradeAuto(stage,writeGrade(m)); });
  const giveup=el('button','linkbtn','Не помню — показать'); giveup.onclick=()=>{ giveup.remove(); c.appendChild(el('div','',`<div class="qhz han" style="font-size:60px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w))); gradeAuto(stage,1); }; stage.appendChild(giveup);
}
function qDictate(stage,w){
  stage.appendChild(el('div','qprompt','Диктант: напиши на слух'));
  const c=el('div','card'); c.style.padding='14px';
  c.innerHTML=`<button class="iconbtn primary" style="width:56px;height:56px;font-size:24px;margin:0 auto" ${sayA(w)} aria-label="Слушать">${SPK(28)}</button><div id="wqHost"></div>`;
  stage.appendChild(c); setTimeout(()=>sayW(w),200);
  writeQuiz($('#wqHost'),hanOf(w.s),m=>{ c.appendChild(el('div','',answerHTML(w,`<div class="verdict ${m===0?'ok':m<=3?'':'bad'}">${m===0?'✓ без ошибок':'ошибок в чертах: '+m}</div>`))); gradeAuto(stage,writeGrade(m)); });
  const giveup=el('button','linkbtn','Не помню — показать'); giveup.onclick=()=>{ giveup.remove(); c.appendChild(el('div','',`<div class="qhz han" style="font-size:60px">${wrapHz(w.d||w.s)}</div>`+answerHTML(w))); gradeAuto(stage,1); }; stage.appendChild(giveup);
}
// — ключи
function radChars(n,limit){ const lc=Object.keys(CHAR_L).filter(c=>radOf(c)===n).sort((a,b)=>CHAR_L[a]-CHAR_L[b]); return limit?lc.slice(0,limit):lc; }
function radIntro(stage,n){
  const r=RADS[n-1], ex=(KEY_CHARS[n]||[]).slice(0,8);
  const c=el('div','qcard');
  c.innerHTML=`<div class="qprompt" style="color:var(--cinnabar-2)">${IC('sparkle',14)} Новый ключ №${n}${KEY_L[n]?' · урок '+KEY_L[n]:''}</div>
    <div class="qhz han" style="font-size:80px">${esc(r[4][0])}</div>
    ${r[4].length>1?`<div class="han" style="font-size:22px;color:var(--paper-dim)">другие формы: ${esc([...r[4]].slice(1).join(' '))}</div>`:''}
    <div class="reveal"><div class="py">${pinyinHTML(r[2])}</div><div class="tr">${esc(r[3])}</div><div class="en">${r[1]} ${plural(r[1],'черта','черты','черт')}</div>
    ${ex.length?`<div class="en" style="margin-top:8px">В иероглифах уроков: <span class="han" style="font-size:22px">${ex.map(ch=>`<span class="hz" data-c="${ch}">${ch}</span>`).join(' ')}</span></div>`:''}
    ${RAD2[n]&&RAD2[n].e?`<div class="en">Пример из пособия: <span class="han" style="font-size:18px">${esc(RAD2[n].e)}</span> ${esc(RAD2[n].ep)} — ${esc(RAD2[n].er)}</div>`:''}</div>`;
  stage.appendChild(c);
  const row=el('div','actionrow');
  const known=el('button','btn ghost','Уже знаю'); known.onclick=()=>{ SESSION.intro['r:'+n]=1; afterGrade(4); };
  const g=el('button','btn','Запомнил → проверить'); g.dataset.key='space'; g.onclick=()=>{ SESSION.intro['r:'+n]=1; render(); };
  row.appendChild(known); row.appendChild(g); stage.appendChild(row);
}
function radAnswer(n){ const r=RADS[n-1], ex=(KEY_CHARS[n]||[]).slice(0,6);
  return `<div class="reveal"><div class="qhz han" style="font-size:56px">${esc([...r[4]].join(' '))}</div><div class="py">${pinyinHTML(r[2])}</div><div class="tr">№${n} · ${esc(r[3])}</div>${ex.length?`<div class="en han" style="font-size:20px">${ex.map(ch=>`<span class="hz" data-c="${ch}">${ch}</span>`).join(' ')}</div>`:''}</div>`; }
function qRadName(stage,n){
  const r=RADS[n-1];
  stage.appendChild(el('div','qprompt','Ключ: как называется?'));
  const c=el('div','qcard'); c.style.minHeight='22vh'; c.innerHTML=`<div class="qhz han">${esc(r[4][0])}</div>`; stage.appendChild(c);
  const opts=shuffle(others(radNear(n).map(x=>RADS[x-1][3]),r[3],3).concat([r[3]]));
  choiceBox(stage,opts.map(o=>[o,esc(o)]),r[3],ok=>{ c.innerHTML=radAnswer(n); gradeAuto(stage,ok?3:1); });
}
function qRadForm(stage,n){
  const r=RADS[n-1];
  stage.appendChild(el('div','qprompt','Какой это ключ?'));
  const c=el('div','qcard'); c.style.minHeight='18vh'; c.innerHTML=`<div class="qbig">${esc(r[3])}</div><div class="qsub">${r[1]} ${plural(r[1],'черта','черты','черт')}</div>`; stage.appendChild(c);
  const opts=shuffle(others(radNear(n).map(x=>RADS[x-1][4][0]),r[4][0],3).concat([r[4][0]]));
  choiceBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:30px">'+esc(o)+'</span>']),r[4][0],ok=>{ c.innerHTML=radAnswer(n); gradeAuto(stage,ok?3:1); });
}
function sessionDone(s){
  const fails=Object.keys(SESSION.fails), title=SESSION.title, more=SESSION.more, done=SESSION.done;
  SESSION.finished=true; D().ls++; checkDay(); checkQuests(); checkAch(); save('meta');
  const v=el('div','view');
  v.appendChild(el('div','empty',`<div class="big">✓</div>Готово: ${done} ${plural(done,'карточка','карточки','карточек')}<br><span style="font-size:13px">${esc(title||'')}</span>`));
  if(fails.length){
    v.appendChild(el('p','eyebrow','Ошибки'));
    const list=el('div','rowlist');
    fails.slice(0,15).forEach(k=>{ if(isRad(k)){ const r=RADS[radNum(k)-1]; const it=el('button','witem',`<div class="hzw han">${esc(r[4][0])}</div><div class="mid"><div class="py">ключ №${r[0]}</div><div class="tr">${esc(r[3])}</div></div>`); it.onclick=()=>go('radical',{n:r[0]}); list.appendChild(it); } else list.appendChild(witem(BYK[k])); });
    v.appendChild(list);
    const rb=el('button','btn ghost','Повторить ошибки ('+fails.length+')'); rb.style.marginTop='12px'; rb.onclick=()=>startSession(fails,'auto','Работа над ошибками'); v.appendChild(rb);
  }
  const nx=more?more().filter(validKey):[];
  if(nx.length){ const mb=el('button','btn','Ещё порция ('+nx.length+')'); mb.style.marginTop='12px'; mb.onclick=()=>startSession(more(),SESSION.mode,title,more); v.appendChild(mb); }
  const b=el('button','btn ghost','К повторению'); b.style.marginTop='12px'; b.onclick=()=>go('practice'); v.appendChild(b);
  s.appendChild(v);
}

