/*==================================================================
  УРОК-ИГРА: 10–15 разных заданий, ошибка возвращает задание в конец.
  FSRS (по каждому слову/ключу, когда его задания в уроке закончились):
  с первой попытки верно — Good (быстро — Easy), была ошибка — Again,
  «Уже знаю» — Easy. Досрочная практика без ошибок расписание не трогает.
==================================================================*/
let PLAY=null;
const FAST={choice:4000,produce:4500,listen:5000,keyname:4000,keyform:4000,keyvar:4000,tones:7000,pinyin:9000,assemble:12000,build:15000,pairs:20000};
const PUNCT=/[\s，。！？、；：,.!?;:“”"'‘’（）()…—·《》<>\-–]/;
let WORDSET=null;
function segment(zh){                                   // предложение → слова словаря (жадно, до 4 знаков)
  if(!WORDSET) WORDSET=new Set(WORDS.map(w=>w.s));
  const s=[...zh], out=[]; let i=0;
  while(i<s.length){
    const c=s[i];
    if(PUNCT.test(c)){ i++; continue; }
    if(!isHan(c)){ let j=i; while(j<s.length&&!isHan(s[j])&&!PUNCT.test(s[j])) j++; out.push(s.slice(i,j).join('')); i=j; continue; }
    let L=Math.min(4,s.length-i), tok=c;
    for(;L>1;L--){ const t=s.slice(i,i+L).join(''); if(WORDSET.has(t)){ tok=t; break; } }
    out.push(tok); i+=[...tok].length;
  }
  return out;
}
function ruTokens(ru){ return (ru||'').replace(/[«»"“”()!?.,;:…]/g,' ').replace(/\s[—–-]\s/g,' ').split(/\s+/).filter(Boolean); }
const normRu=a=>a.join(' ').toLowerCase().replace(/ё/g,'е');
function buildable(sn,dir){ const n=dir==='ru'?ruTokens(sn.ru).length:segment(sn.zh).length; return n>=2&&n<=12; }

function canWrite(w){ return typeof HanziWriter!=='undefined' && hanOf(w.s).length>0 && hanOf(w.s).length<=4 && hanOf(w.s).every(c=>CHARS[c]); }
function wordOK(w,t){
  if(t==='listen') return Speech.has();
  if(t==='tones') return !!wordSylls(w);
  if(t==='write') return canWrite(w);
  if(t==='build') return !!(w.ex&&WORD_L[w.key]&&buildable(exSent(w),'zh'));
  return true;
}
function exSent(w){ return {id:'ex:'+w.key,zh:w.ex[0],py:w.ex[1],ru:w.ex[2],L:WORD_L[w.key]}; }
function pickTypes(pool,n,used){
  const out=[], p=pool.slice();
  while(out.length<n&&p.length){ p.sort((a,b)=>(used[a]||0)-(used[b]||0)||Math.random()-.5); const t=p.shift(); out.push(t); used[t]=(used[t]||0)+1; }
  return out;
}
// Задания по одному элементу (слово / ключ / разбор знака / предложение)
function itemTasks(k,used,opts){
  if(k.startsWith('sent:')){ const sn=sentById(k.slice(5)); if(!sn) return [];
    const dirs=['zh','ru'].filter(d=>buildable(sn,d)); if(!dirs.length) return [];
    const dir=dirs.length>1?((used.sdir=(used.sdir||0)+1)%2?'zh':'ru'):dirs[0];
    return [{t:'build',sn,dir,sid:sn.id}]; }
  if(isRad(k)){
    const n=radNum(k), nw=isNew(k)&&!opts.test, r=RADS[n-1];
    if(nw) return [{t:'rintro',k,n},{t:'keyname',k,n},{t:'keyform',k,n}];
    const pool=['keyname','keyform']; if(r[4].length>1) pool.push('keyvar');
    return pickTypes(pool,1,used).map(t=>({t,k,n}));
  }
  if(isKC(k)) return [{t:'assemble',k,ch:kcChar(k)}];
  const w=BYK[k]; if(!w) return [];
  const ok=t=>wordOK(w,t);
  if(opts.test) return pickTypes(['choice','produce','tones'].filter(ok),1,used).map(t=>({t,k}));
  if(isNew(k)){ used.choice=(used.choice||0)+1; return [{t:'intro',k},{t:'choice',k}].concat(pickTypes(['produce','tones','listen'].filter(ok),1,used).map(t=>({t,k}))); }
  const S=stab(k);
  const pool = S<2?['choice','listen','produce','tones'] : S<10?['produce','tones','pinyin','listen','build','choice'] : ['write','recall','build','tones','pinyin','produce'];
  return pickTypes(pool.filter(ok),1,used).map(t=>({t,k}));
}
function buildTasks(items,opts){
  const used={}, out=[], pending=[];
  items.forEach(k=>{
    pending.sort((a,b)=>a.at-b.at);
    while(pending.length&&pending[0].at<=out.length) out.push(pending.shift().t);
    const seq=itemTasks(k,used,opts); if(!seq.length) return;
    const head=/intro$/.test(seq[0].t)?2:1;
    out.push(...seq.slice(0,head));
    seq.slice(head).forEach((t,j)=>pending.push({t,at:out.length+2+2*j}));
  });
  pending.sort((a,b)=>a.at-b.at).forEach(p=>out.push(p.t));
  // «Пары» — если в уроке ≥5 слов с разными переводами
  if(!opts.test&&opts.kind!=='sent'){
    const ws=uniq(items.filter(k=>BYK[k])).map(k=>BYK[k]).filter((w,i,a)=>a.findIndex(x=>meaning(x)===meaning(w)||x.s===w.s)===i);
    if(ws.length>=5&&out.filter(t=>!/intro$/.test(t.t)).length<15){ const ks=shuffle(ws).slice(0,5).map(w=>w.key); out.splice(Math.max(1,Math.floor(out.length*.6)),0,{t:'pairs',ks}); }
  }
  // «Иероглифы урока: ключи» — добавляем вопросы по самим ключам (без оценки FSRS), чтобы было ≥3 типов
  if(opts.kind==='chars'){
    const ns=uniq(items.filter(isKC).flatMap(k=>keysOf(kcChar(k)).map(x=>x[1]))).filter(Boolean);
    shuffle(ns).slice(0,4).forEach((n,i)=>out.splice(Math.min(out.length,2+i*3),0,{t:i%2?'keyform':'keyname',n,ungraded:1}));
  }
  return out;
}
function playStart(items,opts){
  opts=opts||{};
  items=uniq(items).filter(k=>k.startsWith('sent:')||validKey(k));
  playTasks(buildTasks(items,opts),opts);
}
function playTasks(tasks,opts){
  opts=opts||{};
  if(!tasks.length){ toast('Нечего повторять — всё сделано'); return; }
  const it={};
  tasks.forEach(t=>{ if(t.k&&!t.ungraded&&!t.t.endsWith('intro')){ (it[t.k]=it[t.k]||{left:0,wasNew:isNew(t.k)}).left++; } });
  PLAY={opts,title:opts.title||'Урок',queue:tasks,cur:null,total:tasks.filter(t=>!t.t.endsWith('intro')).length,done:0,xp:0,combo:0,best:0,
    first:0,firstOk:0,errors:0,items:it,fails:new Set(),sents:new Set(),t0:Date.now(),answered:false};
  go('play');
}
function playLeft(){ return PLAY? PLAY.queue.length+(PLAY.cur?1:0) : 0; }

function viewPlay(s){
  const P=PLAY; if(!P){ go('path'); return; }
  if(P.end) return playEnd(s);
  if(P.answered){ P.cur=null; P.answered=false; }          // вернулись после выхода с открытой панелью ответа
  if(!P.cur) P.cur=P.queue.shift();
  if(!P.cur){ playFinish(); return playEnd(s); }
  const x=P.cur; if(!x.t0) x.t0=Date.now();
  const v=el('div','view');
  const top=el('div','playtop');
  const xb=el('button','x',IC('x',22)); xb.setAttribute('aria-label','Выйти'); xb.onclick=()=>{ hideFB(); go('path'); };
  top.appendChild(xb);
  top.appendChild(el('div','bar',`<i style="width:${Math.min(100,P.done/Math.max(1,P.total)*100)|0}%"></i>`));
  top.appendChild(el('div','combo'+(P.combo>=3?' hot':''),P.combo>=2?IC('flame',20)+P.combo:''));
  v.appendChild(top);
  if(x.retry) v.appendChild(el('div','kind retry',IC('cycle',16)+' Ещё раз — исправим ошибку')).style.marginBottom='6px';
  const stage=el('div',''); v.appendChild(stage); s.appendChild(v);
  const w=x.k&&BYK[x.k];
  ({intro:tIntro,choice:tChoice,produce:tProduce,listen:tListen,pinyin:tPinyin,tones:tTones,recall:tRecall,write:tWrite,build:tBuild,
    pairs:tPairs,assemble:tAssemble,rintro:tRadIntro,keyname:tKeyName,keyform:tKeyForm,keyvar:tKeyVar,hear:tHear}[x.t]||tChoice)(stage,w||x,x);
  footify(stage);
}
// Главная кнопка задания («Проверить», «Дальше», «Уже знаю/Дальше») — в нижнюю панель, как у Duolingo
function footify(stage){
  const last=[...stage.children].reverse().find(e=>e.matches('.actionrow,button.btn'));
  if(!last||!last.querySelector&&!last.matches('button')) return;
  const f=el('div','playfoot'), inn=el('div','in'); inn.appendChild(last); f.appendChild(inn); stage.appendChild(f);
}
// Ответ на задание: ok — верно; info: {right, fast, hard, noFB, extra, okHtml}
function playAnswer(ok,info){
  const P=PLAY, x=P&&P.cur; if(!x||P.answered) return; P.answered=true; info=info||{};
  const first=!x.retry, d=D();
  if(first){ P.first++; d.t++; if(ok){ P.firstOk++; d.ok++; } }
  P.undo={first,ok,pushed:false,fail:x.k&&P.items[x.k]?P.items[x.k].fail:0};
  if(ok){
    P.combo++; P.best=Math.max(P.best,P.combo);
    let g=first?XP.task:0; if(P.combo%5===0) g+=XP.combo5; P.xp+=g; addXP(g);
    if([3,5,10,15,20,30,40,50].includes(P.combo)) comboPop(P.combo); else Sfx.ok();
    if(x.sid&&!P.sents.has(x.sid)){ P.sents.add(x.sid); d.sent++; }
  }else{
    P.combo=0; P.errors++; Sfx.bad(); buzz();      // ошибку — в конец урока; прописи не зацикливаем: повтор — выбор иероглифов
    if(x.t!=='pairs'&&!P.opts.test){ P.queue.push(Object.assign({},x,{retry:1,t0:0,played:0},x.t==='write'?{t:'produce'}:{})); P.total++; P.undo.pushed=true; if(x.k) P.fails.add(x.k); if(x.sid) P.fails.add('sent:'+x.sid); }
  }
  const it=x.k&&!x.ungraded&&P.items[x.k];
  if(it){
    if(!ok){ it.fail=1; if(P.undo.pushed) it.left++; }
    if(ok&&info.hard) it.hard=1;
    if(!(ok&&Date.now()-x.t0<=(FAST[x.t]||5000))) it.slow=1;
    it.left--; if(it.left<=0) finishItem(x.k);
  }
  P.done++; save('meta');
  if(info.noFB){ playNext(); return; }
  showFB(ok, ok?(info.okHtml||''):(info.right||''), playNext, info.extra);
}
// «Мой вариант тоже верный — засчитать» (для «Собери предложение»)
function playOverride(){
  const P=PLAY, u=P&&P.undo; if(!u||u.ok) return;
  if(u.pushed){ P.queue.pop(); P.total--; }
  const x=P.cur, d=D();
  if(u.first){ P.firstOk++; d.ok++; P.xp+=XP.task; addXP(XP.task); }
  P.errors=Math.max(0,P.errors-1);
  if(x.sid){ P.fails.delete('sent:'+x.sid); if(!P.sents.has(x.sid)){ P.sents.add(x.sid); d.sent++; } }
  const it=x.k&&P.items[x.k]; if(it){ it.left--; it.fail=u.fail; if(!u.fail) P.fails.delete(x.k); if(it.left<=0) finishItem(x.k); }
  hideFB(); playNext();
}
function playNext(){ if(!PLAY) return; PLAY.cur=null; PLAY.answered=false; render(); }
function finishItem(k){
  const P=PLAY, it=P.items[k]; if(!it||it.graded) return; it.graded=1;
  if(P.opts.test) return;
  const wasNew=isNew(k), due=isDue(k);
  if(!(wasNew||due||it.fail)) return;
  const g = it.known?4 : it.fail?1 : it.hard?2 : (!wasNew&&!it.slow?4:3);
  State.cards[k]=FSRS.review(cardOf(k)||{},g,REQ);
  const d=D();
  if(wasNew){ if(isRad(k)) d.keys++; else if(isKC(k)) d.dec++; else if(inSem(k)) d.new++; }
  else{ d.rv++; State.meta.rev[todayStr()]=(State.meta.rev[todayStr()]||0)+1; if(isKC(k)) d.dec++; }
  save('cards');
}
function playFinish(){
  const P=PLAY; if(P.end) return; P.end=true; P.t1=Date.now();
  Object.keys(P.items).forEach(finishItem);
  const d=D();
  if(P.opts.test){ jumpFinish(); save(); return; }
  if(!P.errors&&P.first>=5){ P.xp+=XP.perfect; addXP(XP.perfect); P.perfect=true; grantAch('perfect'); }
  if(P.opts.kind==='review'){ P.xp+=XP.review; addXP(XP.review); }
  if(P.opts.node) State.meta.nodes[P.opts.node]=todayStr();
  d.ls++;
  checkDay(); checkQuests(); checkAch(); save();
  Sfx.done(); setTimeout(confetti,150);
}
function playEnd(s){
  const P=PLAY, v=el('div','view endwrap');
  if(P.opts.test) return jumpEnd(s);
  const acc=P.first?Math.round(P.firstOk/P.first*100):100, sec=Math.round(((P.t1||Date.now())-P.t0)/1000);
  v.innerHTML=mascot(P.errors?'happy':'cheer',150)+`<h2>${P.perfect?'Без единой ошибки!':'Урок пройден!'}</h2>
    <div class="note" style="margin-top:0">${esc(P.title)}</div>
    <div class="endstats"><div class="estat"><small>Всего XP</small><b>${IC('bolt',22)}<span id="xpCount">${P.xp}</span></b></div>
      <div class="estat acc"><small>${acc>=90?'Отлично':acc>=70?'Хорошо':'Точность'}</small><b>${IC('target',22)}${acc}%</b></div>
      <div class="estat time"><small>Время</small><b>${IC('timer',22)}${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</b></div></div>`;
  if(P.best>=5) v.appendChild(el('p','note','Лучшее комбо: '+IC('flame',16)+P.best));
  const more=P.opts.more?P.opts.more():[];
  const nb=el('button','btn',more.length?'Дальше: следующая порция':'Дальше по пути'); nb.dataset.key='space';
  nb.onclick=()=>{ if(more.length) playStart(P.opts.more(),P.opts); else { PLAY=null; go('path'); } };
  v.appendChild(nb);
  const fails=[...P.fails];
  if(fails.length){ const rb=el('button','btn ghost','Ещё раз ошибки ('+fails.length+')'); rb.style.marginTop='12px';
    rb.onclick=()=>playStart(fails,{title:'Работа над ошибками',kind:fails.every(k=>k.startsWith('sent:'))?'sent':'fix'}); v.appendChild(rb); }
  if(more.length){ const hb=el('button','btn ghost','На путь'); hb.style.marginTop='12px'; hb.onclick=()=>{ PLAY=null; go('path'); }; v.appendChild(hb); }
  s.appendChild(v);
  const xc=$('#xpCount'); if(xc&&!reducedMotion()&&P.xp>0){ const t0=performance.now(); (function f(t){ const k=Math.min(1,(t-t0)/900); xc.textContent=Math.round(P.xp*k); if(k<1) requestAnimationFrame(f); })(t0); }
}

/* — задания — */
function wordHead(w,big){ return `<div class="qhz han" style="font-size:${big||84}px">${esc(w.d||w.s)}</div>`; }
function rightWord(w){ return `<span class="han">${esc(w.d||w.s)}</span> ${pinyinHTML(w.p)} — ${esc(meaning(w))}`; }
function head(stage,text){ stage.appendChild(el('div','qh',text)); }
function tIntro(stage,w){
  const L=WORD_L[w.key];
  const c=el('div','qcard introcard');
  c.innerHTML=`<div class="newtag">${IC('sparkle',14)} Новое слово${EXTRA_OF[w.key]?' · '+esc(EXTRA_OF[w.key]):L?' · урок '+L:''}</div>${wordHead(w,80)}
    <div class="reveal" style="border:0;margin-top:4px;padding-top:4px"><div class="py">${pinyinHTML(w.p)}</div>${palladius(w.p)?`<div class="palla">${esc(palladius(w.p))}</div>`:''}<div class="tr">${esc(meaning(w))}</div>
    ${w.ex?`<div class="han" style="font-size:17px;margin-top:10px;color:var(--title)">${wrapHz(w.ex[0])}</div><div class="en">${pinyinHTML(w.ex[1])}</div><div class="en">${esc(w.ex[2])}</div>`:''}
    <div class="actionrow" style="justify-content:center"><button class="say" ${sayA(w)}>${SPK()} Слово</button>${w.ex?`<button class="say" data-say="${esc(w.ex[0])}">${SPK()} Пример</button>`:''}</div></div>`;
  stage.appendChild(c);
  const bk=el('details','strk'); bk.style.marginTop='10px'; bk.innerHTML=`<summary>Разбор по иероглифам и ключам</summary>${hanOf(w.s).filter(c=>HZ.c[c]).map(c=>decompHTML(c,{short:1,w})).join('')}`; stage.appendChild(bk);
  const row=el('div','actionrow');
  const kn=el('button','btn ghost','Уже знаю'); kn.onclick=()=>introKnown(w.key);
  const nx=el('button','btn','Дальше'); nx.dataset.key='space'; nx.onclick=playNext;
  row.appendChild(kn); row.appendChild(nx); stage.appendChild(row);
  Speech.has()&&sayW(w);
}
function introKnown(k){
  const P=PLAY, it=P.items[k];
  P.queue=P.queue.filter(t=>t.k!==k); P.total=Math.max(P.done,P.total-(it?it.left:0));
  if(it){ it.known=1; it.left=0; finishItem(k); }
  save('meta'); playNext();
}
function optionBox(stage,opts,right,done,cls){
  const box=el('div','choices'+(cls?' '+cls:''));
  opts.forEach(([val,html],i)=>{ const b=el('button','choice',`<span class="num">${i+1}</span>${html}`); b.dataset.ch=String(i+1);
    b.onclick=()=>{ if(PLAY&&PLAY.answered||box.dataset.done) return; box.dataset.done='1'; const ok=val===right;
      [...box.children].forEach((x,j)=>{ x.removeAttribute('data-ch'); if(opts[j][0]===right) x.classList.add('correct'); else if(x!==b) x.classList.add('dim'); });
      if(!ok){ b.classList.add('wrong','shake'); }
      done(ok); };
    box.appendChild(b); });
  stage.appendChild(box); return box;
}
function distractWords(w){ const L=WORD_L[w.key]; const near=WORDS.filter(x=>x!==w&&x.ru&&(L?WORD_L[x.key]&&Math.abs(WORD_L[x.key]-L)<=6:x.hsk===w.hsk)); return near.length>=8?near:WORDS; }
function tChoice(stage,w,x){
  head(stage,'Выбери перевод');
  const c=el('div','qcard'); c.style.minHeight='20vh'; c.innerHTML=wordHead(w)+`<button class="say" ${sayA(w)} style="margin-top:6px" aria-label="Слушать">${SPK(20)}</button>`; stage.appendChild(c);
  const right=meaning(w), opts=shuffle(others(distractWords(w).map(meaning),right,3).concat([right]));
  optionBox(stage,opts.map(o=>[o,esc(o)]),right,ok=>{ Speech.has()&&sayW(w); playAnswer(ok,{right:rightWord(w),okHtml:pinyinHTML(w.p)}); });
}
function tProduce(stage,w){
  head(stage,'Как написать иероглифами?');
  const c=el('div','qcard'); c.style.minHeight='14vh'; c.innerHTML=`<div class="qbig">«${esc(meaning(w))}»</div>`; stage.appendChild(c);
  const n=hanOf(w.s).length, pool=distractWords(w).filter(x=>hanOf(x.s).length===n);
  const opts=shuffle(others((pool.length>=6?pool:WORDS).map(x=>x.s),w.s,3).concat([w.s]));
  optionBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:28px">'+esc(o)+'</span>']),w.s,ok=>{ Speech.has()&&sayW(w); playAnswer(ok,{right:rightWord(w),okHtml:pinyinHTML(w.p)}); },'two');
}
function tListen(stage,w,x){
  head(stage,'Что ты слышишь?');
  const c=el('div','qcard'); c.style.minHeight='16vh';
  c.innerHTML=`<button class="iconbtn primary" style="width:80px;height:80px;font-size:34px;border-radius:22px" ${sayA(w)} aria-label="Слушать">${SPK(42)}</button><button class="linkbtn" ${sayA(w)} data-rate=".5">${SLOW()} медленно</button>`;
  stage.appendChild(c); if(!x.played){ x.played=1; setTimeout(()=>sayW(w),200); }
  const n=hanOf(w.s).length, pool=distractWords(w).filter(x=>hanOf(x.s).length===n);
  const opts=shuffle(others((pool.length>=6?pool:WORDS).map(x=>x.s),w.s,3).concat([w.s]));
  optionBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:28px">'+esc(o)+'</span>']),w.s,ok=>playAnswer(ok,{right:rightWord(w),okHtml:esc(meaning(w))}),'two');
}
function tPinyin(stage,w){
  head(stage,'Напиши пиньинь');
  const c=el('div','qcard'); c.style.minHeight='16vh'; c.innerHTML=wordHead(w,72)+`<div class="qsub">${esc(meaning(w))}</div>`; stage.appendChild(c);
  const inp=el('input','tinput'); inp.placeholder='пиньинь (тоны можно не ставить)'; inp.autocapitalize='off'; inp.autocomplete='off'; inp.spellcheck=false; stage.appendChild(inp);
  const chk=el('button','btn showbtn','Проверить'); chk.disabled=true; stage.appendChild(chk);
  inp.oninput=()=>{ chk.disabled=!inp.value.trim(); };
  const check=()=>{ if(!inp.value.trim()) return; const ok=toneless(inp.value)===toneless(w.p); inp.disabled=true; chk.remove(); Speech.has()&&sayW(w);
    playAnswer(ok,{right:rightWord(w)+(inp.value?`<br><small>ты написал: ${esc(inp.value)}</small>`:''),okHtml:pinyinHTML(w.p)}); };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); check(); } });
  chk.onclick=check; setTimeout(()=>inp.focus(),60);
}
const TONE_MARKS=[['ˉ','1'],['ˊ','2'],['ˇ','3'],['ˋ','4'],['·','лёгк.']];
function toneRows(host,chars,sylls,done){
  const sel=sylls.map(s=>s==='r'?0:null), box=el('div','tones');
  chars.forEach((ch,i)=>{
    const row=el('div','trow'+(sylls[i]==='r'?' fix':''));
    row.appendChild(el('span','han',esc(ch)));
    const seg=el('div','seg');
    if(sylls[i]==='r') seg.innerHTML='<span class="lbl" style="align-self:center">эрхуа r</span>';
    else TONE_MARKS.forEach(([m,l],t)=>{ const b=el('button','t'+(t+1),`${toneIcon(t+1,30)}<small>${l}</small>`); b.setAttribute('aria-label','тон '+(t+1)+' '+m); b.onclick=()=>{ sel[i]=t+1; [...seg.children].forEach((x,j)=>x.classList.toggle('on',j===t)); chk.disabled=sel.some(v=>v==null); }; seg.appendChild(b); });
    row.appendChild(seg); box.appendChild(row);
  });
  host.appendChild(box);
  const chk=el('button','btn showbtn','Проверить'); chk.disabled=true; chk.dataset.key='space'; host.appendChild(chk);
  chk.onclick=()=>{
    let ok=true;
    sylls.forEach((s,i)=>{ if(s==='r') return; const t=syllTone(s), seg=box.children[i].querySelector('.seg');
      [...seg.children].forEach((b,j)=>{ b.onclick=null; if(j===t-1) b.classList.add('right'); else if(j===sel[i]-1) b.classList.add('wrongs'); });
      if(sel[i]!==t) ok=false; });
    chk.remove(); done(ok);
  };
}
function tTones(stage,w,task){
  head(stage,task&&task.hearOnly?'Послушай и выбери тоны':'Выбери тоны');
  const c=el('div','qcard'); c.style.minHeight='10vh';
  c.innerHTML=`<div class="qbig">${task&&task.hearOnly?`<span class="han" style="font-size:44px">${esc(w.s)}</span>`:esc(meaning(w))}</div>
    <div class="actionrow" style="justify-content:center;margin-top:8px"><button class="say" ${sayA(w)}>${SPK()} Послушать</button><button class="say" ${sayA(w)} data-rate=".5">${SLOW()} по слогам</button></div>`;
  stage.appendChild(c); if(task&&!task.played){ task.played=1; setTimeout(()=>sayW(w),250); }
  toneRows(stage,hanOf(w.s),wordSylls(w),ok=>{ Speech.has()&&sayW(w); playAnswer(ok,{right:rightWord(w),okHtml:pinyinHTML(w.p)}); });
}
function tRecall(stage,w){
  head(stage,'Вспомни и напиши иероглифами');
  const c=el('div','qcard'); c.style.minHeight='22vh'; c.innerHTML=`<div class="qbig">«${esc(meaning(w))}»</div><div class="qsub">на бумаге, потом сверь</div>`; stage.appendChild(c);
  const sb=el('button','btn showbtn','Показать ответ'); sb.dataset.key='space'; stage.appendChild(sb);
  sb.onclick=()=>{ sb.remove(); c.innerHTML+=`<div class="reveal">${wordHead(w,64)}<div class="py">${pinyinHTML(w.p)}</div></div>`; Speech.has()&&sayW(w);
    const bar=el('div','gradebar');
    const b1=el('button','grade g1','Ошибся<small>1 · ←</small>'); b1.dataset.key='1'; b1.onclick=()=>playAnswer(false,{noFB:true});
    const b2=el('button','grade g3','Написал верно<small>2 · →</small>'); b2.dataset.key='2'; b2.onclick=()=>playAnswer(true,{noFB:true});
    bar.appendChild(b1); bar.appendChild(b2); stage.appendChild(bar); };
}
function tWrite(stage,w){
  head(stage,'Напиши иероглиф');
  const c=el('div','card'); c.style.padding='12px';
  c.innerHTML=`<div class="qbig" style="font-size:20px">«${esc(meaning(w))}»</div><div class="qsub" style="margin-top:4px">${pinyinHTML(w.p)}</div><div id="wqHost"></div>`;
  stage.appendChild(c);
  writeQuiz($('#wqHost'),hanOf(w.s),m=>playAnswer(m<=3,{hard:m>0,right:rightWord(w)+`<br><small>ошибок в чертах: ${m}</small>`,okHtml:m?'ошибок в чертах: '+m:'без ошибок'}));
  const gu=el('button','linkbtn','Не помню — показать'); gu.onclick=()=>{ gu.remove(); playAnswer(false,{right:rightWord(w)}); }; stage.appendChild(gu);
}
// — Собери предложение: RU → 中 (плитки слов) или 中 → RU (плитки русских слов)
function tBuild(stage,x,task){
  const sn=task.sn||(task.k&&exSent(BYK[task.k])), dir=task.dir||(Math.random()<.5?'zh':'ru');
  if(!task.dir) task.dir=dir; if(!task.sn) task.sn=sn;
  const zh=dir==='zh', target=zh?segment(sn.zh):ruTokens(sn.ru);
  if(!task.tiles){
    const bank=sentBank().filter(o=>o.zh!==sn.zh), extra=[];
    for(const o of shuffle(bank).slice(0,12)){ const t=zh?segment(o.zh):ruTokens(o.ru); for(const y of shuffle(t)){ if(!target.includes(y)&&!extra.includes(y)&&(!zh||isHan([...y][0]))){ extra.push(y); break; } } if(extra.length>=3) break; }
    task.tiles=shuffle(target.concat(extra).map((s,i)=>({s,i})));
  }
  head(stage,zh?'Переведи на китайский':'Переведи на русский');
  const c=el('div','qcard'); c.style.minHeight='0'; c.style.padding='16px';
  c.innerHTML=zh?`<div class="qbig" style="font-size:19px">${esc(sn.ru)}</div>`:`<div class="han zhl" style="font-size:24px">${wrapHz(sn.zh)}</div><button class="say" data-say="${esc(sn.zh)}" style="margin-top:6px" aria-label="Слушать">${SPK(20)}</button>`;
  stage.appendChild(c);
  const area=el('div','tl area'), pool=el('div','tl'); stage.appendChild(area); stage.appendChild(pool);
  const pick=[];
  const chk=el('button','btn showbtn','Проверить'); chk.dataset.key='space';
  const draw=()=>{
    area.innerHTML=''; pick.forEach((o,j)=>{ const b=el('button','ptile'+(zh?' han':''),esc(o.s)); b.onclick=()=>{ pick.splice(j,1); draw(); }; area.appendChild(b); });
    pool.innerHTML=''; task.tiles.forEach(o=>{ const b=el('button','ptile'+(zh?' han':'')+(pick.includes(o)?' used':''),esc(o.s)); b.onclick=()=>{ if(!pick.includes(o)){ pick.push(o); draw(); } }; pool.appendChild(b); });
    chk.disabled=!pick.length;
  };
  draw(); stage.appendChild(chk);
  chk.onclick=()=>{
    const got=pick.map(o=>o.s), ok=zh?got.join('')===target.join(''):normRu(got)===normRu(target);
    area.querySelectorAll('button').forEach(b=>b.onclick=null); pool.querySelectorAll('button').forEach(b=>b.onclick=null); chk.remove();
    Speech.has()&&Speech.say(sn.zh);
    const full=`<span class="han">${esc(sn.zh)}</span><br><small>${esc(sn.py||'')}</small><br>${esc(sn.ru)}`;
    let extra=null; if(!ok){ extra=el('button','linkbtn','Мой вариант тоже верный — засчитать'); extra.onclick=playOverride; }
    playAnswer(ok,{right:full,okHtml:zh?esc(sn.py||''):`<span class="han">${esc(sn.zh)}</span>`,extra});
  };
}
// — Пары: 5 иероглифов и 5 переводов
function tPairs(stage,x,task){
  head(stage,'Найди пары');
  const ws=task.ks.map(k=>BYK[k]);
  if(!task.order) task.order=[shuffle(ws.map((w,i)=>i)),shuffle(ws.map((w,i)=>i))];
  const g=el('div','pairs'), L=el('div','col'), R=el('div','col'); g.appendChild(L); g.appendChild(R); stage.appendChild(g);
  let selL=null, selR=null, left=ws.length, mist=0;
  const tryMatch=()=>{
    if(selL==null||selR==null) return;
    const a=L.querySelector(`[data-i="${selL}"]`), b=R.querySelector(`[data-i="${selR}"]`);
    if(selL===selR){ a.classList.add('correct','gone'); b.classList.add('correct','gone'); a.classList.remove('sel'); b.classList.remove('sel'); Sfx.ok(); Speech.has()&&Speech.say(ws[selL].s); left--; }
    else{ mist++; [a,b].forEach(e=>{ e.classList.remove('sel'); e.classList.add('wrong','shake'); setTimeout(()=>e.classList.remove('wrong','shake'),450); }); Sfx.bad(); }
    selL=selR=null;
    if(!left) setTimeout(()=>playAnswer(!mist,{okHtml:'все пары с первого раза',right:'все пары найдены, ошибок: '+mist}),380);
  };
  task.order[0].forEach(i=>{ const b=el('button','choice han',esc(ws[i].d||ws[i].s)); b.dataset.i=i; b.onclick=()=>{ L.querySelectorAll('.sel').forEach(e=>e.classList.remove('sel')); b.classList.add('sel'); selL=i; tryMatch(); }; L.appendChild(b); });
  task.order[1].forEach(i=>{ const b=el('button','choice',esc(meaning(ws[i]))); b.dataset.i=i; b.onclick=()=>{ R.querySelectorAll('.sel').forEach(e=>e.classList.remove('sel')); b.classList.add('sel'); selR=i; tryMatch(); }; R.appendChild(b); });
}
// — Собери иероглиф из ключей: выбрать ключи (правильные + 3–4 лишних), затем название каждого
const TYPE_OPTS=[['g','Изобразительный'],['z','Условный знак'],['i','Идеограмма'],['p','Фоноидеограмма']];   // как в пособии
// ключ для вопроса «Какой ключ?» — только если в пособии у знака один ключ
const keyAsk=ch=>{ const e=ET[ch], b=e&&e[5]; return b&&b[0].length===1?b[0][0]:0; };
function canAssemble(ch){ const e=ET[ch]; return !!e&&e[6]!==0&&e[1].length>=2&&e[1].every(p=>p[1]!=='w'); }   // части видны в написании
let PART_POOL=null;   // части из разборов знаков уроков — для лишних плиток
function partPool(){ if(PART_POOL) return PART_POOL; const s=new Set();
  Object.keys(CHAR_L).forEach(c=>{ const e=ET[c]; if(e) e[1].forEach(p=>{ if(p[1]!=='w'&&[...p[0]].length===1) s.add(p[0]); }); });
  return PART_POOL=[...s]; }
// «Разбери иероглиф»: из каких частей (если составной) → тип → какая часть даёт звук (у фоноидеограммы) → ключ
function tAssemble(stage,x,task){
  const ch=task.ch, e=ET[ch], right=decompHTML(ch,{short:1,plain:1});
  const reset=()=>{ task.step=null; task.tiles=null; };
  const c=el('div','qcard'); c.style.minHeight='0'; c.innerHTML=`<div class="qhz han" style="font-size:80px">${esc(ch)}</div><div class="qsub" style="margin-top:4px">${pinyinHTML(charPy(ch))} — ${esc(charRu(ch))}</div>`;
  if(!e){ head(stage,'Разбор иероглифа'); stage.appendChild(c); stage.appendChild(el('div','',decompHTML(ch)));
    const b=el('button','btn showbtn','Дальше'); b.dataset.key='space'; b.onclick=()=>playAnswer(true,{noFB:true}); stage.appendChild(b); return; }
  const [t,parts]=e, forms=uniq(parts.map(p=>p[0]));
  if(task.step==null) task.step=canAssemble(ch)?0:1;
  if(task.step===0){
    if(!task.tiles) task.tiles=shuffle(forms.concat(shuffle(partPool().filter(f=>!forms.includes(f)&&!ch.includes(f))).slice(0,forms.length>2?3:4)));
    head(stage,'Из каких частей состоит иероглиф?'); stage.appendChild(c);
    const pool=el('div','tl'), sel=new Set(); stage.appendChild(pool);
    task.tiles.forEach(f=>{ const b=el('button','ptile han',esc(f)); b.onclick=()=>{ if(sel.has(f)){ sel.delete(f); b.classList.remove('sel'); } else { sel.add(f); b.classList.add('sel'); } chk.disabled=!sel.size; }; pool.appendChild(b); });
    stage.appendChild(el('p','note','Выбери все части этого иероглифа (смысловой ключ, фонетик, части идеограммы), затем «Проверить».')).style.textAlign='center';
    const chk=el('button','btn showbtn','Проверить'); chk.disabled=true; chk.dataset.key='space'; stage.appendChild(chk);
    chk.onclick=()=>{
      const ok=sel.size===forms.length&&forms.every(f=>sel.has(f));
      [...pool.children].forEach((b,i)=>{ const f=task.tiles[i]; b.onclick=null; if(forms.includes(f)) b.classList.add('right'); else if(sel.has(f)) b.classList.add('wrongs'); });
      chk.remove();
      if(!ok){ reset(); playAnswer(false,{right}); return; }
      Sfx.ok(); task.step=1;
      const nb=el('button','btn showbtn','Дальше: тип иероглифа'); nb.dataset.key='space'; nb.onclick=()=>{ PLAY.cur=task; render(); }; stage.appendChild(nb);
    };
    return;
  }
  if(task.step===1){
    head(stage,'Какой это тип иероглифа?'); stage.appendChild(c);
    if(canAssemble(ch)) stage.appendChild(el('p','note',`Части: <span class="han" style="font-size:20px;color:var(--title)">${forms.map(esc).join(' + ')}</span>`)).style.textAlign='center';
    optionBox(stage,TYPE_OPTS.map(([v,l])=>[v,l]),t,ok=>{
      if(!ok){ reset(); playAnswer(false,{right}); return; }
      next(t==='p'&&parts.some(p=>p[1]==='f')&&parts.length>=2?2:3);
    });
    return;
  }
  if(task.step===2){
    head(stage,'Какая часть даёт звучание (фонетик)?'); stage.appendChild(c);
    const f=parts.find(p=>p[1]==='f');
    optionBox(stage,forms.map(x=>[x,'<span class="han" style="font-size:30px">'+esc(x)+'</span>']),f[0],ok=>{
      if(!ok){ reset(); playAnswer(false,{right}); return; }
      next(3);
    },forms.length<=2?'two':'');
    return;
  }
  // шаг 3: ключ (по пособию); варианты — другие ключи, которые видны в знаке (谢: 身, 寸), иначе случайные
  const n=keyAsk(ch), kl=k=>`<span class="han" style="font-size:26px">${esc(keyForm(ch,k)||RADS[k-1][4][0])}</span> №${k} «${esc(RADS[k-1][3])}»`;
  head(stage,'Какой у иероглифа ключ?'); stage.appendChild(c);
  const near=uniq(keysOf(ch).map(x=>x[1]).concat(((KC.c||{})[ch]||[]).map(x=>x[1]),idsParts(ch).map(f=>RIDX[f]!=null?RADS[RIDX[f]][0]:0))).filter(k=>k&&k!==n);
  const opts=shuffle([n].concat(near.slice(0,3),shuffle(KEY_ORDER.filter(k=>k!==n&&!near.includes(k))).slice(0,Math.max(0,3-near.length))));
  optionBox(stage,opts.map(k=>[k,kl(k)]),n,ok=>{ reset(); playAnswer(ok,ok?{okHtml:right}:{right}); });
  function next(st){
    if(st===3&&!keyAsk(ch)){ reset(); playAnswer(true,{okHtml:right}); return; }
    task.step=st; Sfx.ok(); setTimeout(()=>{ if(PLAY&&PLAY.cur===task) render(); },350);
  }
}
// — ключи
function tRadIntro(stage,x){
  const n=x.n, r=RADS[n-1], ex=(KEY_CHARS[n]||[]).slice(0,5);
  const c=el('div','qcard introcard');
  c.innerHTML=`<div class="newtag">${IC('sparkle',14)} Новый ключ №${n}</div><div class="qhz han" style="font-size:84px">${esc(r[4][0])}</div>
    ${r[4].length>1?`<div class="han" style="font-size:22px;color:var(--text2)">другие формы: ${esc([...r[4]].slice(1).join(' '))}</div>`:''}
    <div class="reveal" style="border:0;padding-top:4px"><div class="py">${pinyinHTML(r[2])}</div><div class="tr">${esc(r[3])}</div><div class="en">${r[1]} ${plural(r[1],'черта','черты','черт')}</div>
    ${ex.length?`<div class="en" style="margin-top:8px">В иероглифах уроков: <span class="han" style="font-size:24px;color:var(--title)">${ex.map(ch=>`<span class="hz" data-c="${ch}">${ch}</span>`).join(' ')}</span></div>`:'<div class="en">В словах уроков 1–30 не встречается — учим для полноты таблицы.</div>'}
    ${RAD2[n]&&RAD2[n].e?`<div class="en">Пример из пособия: <span class="han" style="font-size:18px">${esc(RAD2[n].e)}</span> ${esc(RAD2[n].ep)} — ${esc(RAD2[n].er)}</div>`:''}</div>`;
  stage.appendChild(c);
  const row=el('div','actionrow');
  const kn=el('button','btn ghost','Уже знаю'); kn.onclick=()=>introKnown(x.k);
  const nx=el('button','btn','Дальше'); nx.dataset.key='space'; nx.onclick=playNext;
  row.appendChild(kn); row.appendChild(nx); stage.appendChild(row);
}
function radRight(n){ const r=RADS[n-1]; return `<span class="han">${esc([...r[4]].join(' '))}</span> №${n} · ${esc(r[2])} — ${esc(r[3])}`; }
function radNear(n){ const k=KEY_ORDER.filter(x=>x!==n); return k; }
function tKeyName(stage,x){
  const n=x.n, r=RADS[n-1];
  head(stage,'Что за ключ?');
  const c=el('div','qcard'); c.style.minHeight='18vh'; c.innerHTML=`<div class="qhz han">${esc(r[4][0])}</div>`; stage.appendChild(c);
  const opts=shuffle(others(radNear(n).map(y=>RADS[y-1][3]),r[3],3).concat([r[3]]));
  optionBox(stage,opts.map(o=>[o,esc(o)]),r[3],ok=>playAnswer(ok,{right:radRight(n),okHtml:radRight(n)}));
}
function tKeyForm(stage,x){
  const n=x.n, r=RADS[n-1];
  head(stage,'Какой это ключ?');
  const c=el('div','qcard'); c.style.minHeight='12vh'; c.innerHTML=`<div class="qbig">«${esc(r[3])}»</div><div class="qsub">${pinyinHTML(r[2])} · ${r[1]} ${plural(r[1],'черта','черты','черт')}</div>`; stage.appendChild(c);
  const opts=shuffle(others(radNear(n).map(y=>RADS[y-1][4][0]),r[4][0],3).concat([r[4][0]]));
  optionBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:30px">'+esc(o)+'</span>']),r[4][0],ok=>playAnswer(ok,{right:radRight(n),okHtml:radRight(n)}),'two');
}
function tKeyVar(stage,x){
  const n=x.n, r=RADS[n-1], forms=[...r[4]], v=forms[1+(Math.random()*(forms.length-1)|0)];
  head(stage,'Какой основной ключ у этой формы?');
  const c=el('div','qcard'); c.style.minHeight='16vh'; c.innerHTML=`<div class="qhz han">${esc(v)}</div>`; stage.appendChild(c);
  const opts=shuffle(others(KEY_ORDER.filter(y=>y!==n).map(y=>RADS[y-1][4][0]),forms[0],3).concat([forms[0]]));
  optionBox(stage,opts.map(o=>[o,'<span class="han" style="font-size:30px">'+esc(o)+'</span>']),forms[0],ok=>playAnswer(ok,{right:radRight(n),okHtml:radRight(n)}),'two');
}

/*==================================================================
  ТОНЫ НА СЛУХ: слог в записи носителя → выбери тон 1–4 (график высоты голоса);
  ошибка — «Сравни»: тот же слог во всех тонах. Слова из 2–3 знаков — тоны каждого слога.
  Слабые слоги (meta.toneErr) попадаются чаще. В FSRS не идёт — это тренировка слуха.
==================================================================*/
const TONE_NAMES=['','ровный высокий','восходящий','низкий, с подъёмом','резкий нисходящий'];
function sylMark(n){                                    // 'xie4' → 'xiè'
  const t=+n.slice(-1), b=n.slice(0,-1).replace(/v/g,'ü'); if(!(t>=1&&t<=4)) return b;
  const M={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù','ü':'ǖǘǚǜ'};
  let i=b.search(/[ae]/); if(i<0) i=b.indexOf('ou'); if(i<0){ const m=[...b.matchAll(/[iouü]/g)]; i=m.length?m[m.length-1].index:-1; }
  return i<0?b:b.slice(0,i)+M[b[i]][t-1]+b.slice(i+1);
}
let SYL_EX=null;                                        // слог → односложное слово курса с этим чтением
function sylExample(n){
  if(!SYL_EX){ SYL_EX={}; COURSE.map(k=>BYK[k]).filter(w=>w&&hanOf(w.s).length===1).forEach(w=>{ const ss=Speech.sylls(w.s,w.p); if(ss&&!SYL_EX[ss[0]]) SYL_EX[ss[0]]=w; }); }
  return SYL_EX[n]||null;
}
function toneDrillTasks(words){
  const err=State.meta.toneErr||{}, syl={}, multi=[];
  words.forEach(w=>{ const ss=Speech.sylls(w.s,w.p); if(!ss) return; ss.forEach(n=>{ syl[n]=1; });
    if(ss.length>=2&&ss.length<=3&&wordSylls(w)) multi.push(w); });
  let pool=Object.keys(syl); if(pool.length<6) pool=pool.concat(shuffle([...AUD.s]).slice(0,12));
  const pick=uniq(shuffle(pool).sort((a,b)=>(err[b]||0)-(err[a]||0))).slice(0,7);
  const tasks=shuffle(pick).map(n=>({t:'hear',sy:n,ungraded:1}));
  shuffle(multi).slice(0,3).forEach((w,i)=>tasks.splice(2+i*3,0,{t:'tones',k:w.key,ungraded:1,hearOnly:1}));
  return tasks;
}
function startToneDrill(words,opts){
  const ws=(words&&words.length?words:COURSE.filter(k=>!isNew(k)).map(k=>BYK[k]).filter(Boolean));
  playTasks(toneDrillTasks(ws.length?ws:COURSE.slice(0,40).map(k=>BYK[k])),Object.assign({title:'Тоны на слух',kind:'tones'},opts||{}));
}
function tHear(stage,x,task){
  const n=task.sy, t=+n.slice(-1), base=n.slice(0,-1), ex=sylExample(n);
  head(stage,'Какой тон ты слышишь?');
  const c=el('div','qcard'); c.style.minHeight='0';
  c.innerHTML=`<button class="iconbtn primary bigsay" aria-label="Слушать">${SPK(44)}</button>
    <div class="qsub" style="margin-top:12px">слог <b style="color:var(--title);font-size:20px">${esc(base.replace(/v/g,'ü'))}</b></div>
    <button class="linkbtn" data-slow>${SLOW()} медленнее</button>`;
  const play=r=>{ Speech.stop(); try{ const a=new Audio('./audio/s/'+n+'.mp3'); if(r) a.playbackRate=r; a.play().catch(()=>{}); }catch(e){} };
  c.querySelector('.bigsay').onclick=()=>play(); c.querySelector('[data-slow]').onclick=()=>play(.75);
  stage.appendChild(c); if(!task.played){ task.played=1; setTimeout(()=>play(),250); }
  const opts=[1,2,3,4].map(k=>[k,`<span class="tonechoice">${toneIcon(k,44)}<b>${k}</b><small>${TONE_NAMES[k]}</small></span>`]);
  const right=`<span style="font-size:22px">${pinyinHTML(sylMark(n))}</span> — тон ${t}, ${TONE_NAMES[t]}`+(ex?`<br><span class="han">${esc(ex.s)}</span> ${esc(meaning(ex))}`:'');
  optionBox(stage,opts,t,ok=>{
    const err=State.meta.toneErr=State.meta.toneErr||{};
    if(ok){ if(err[n]) err[n]=Math.max(0,err[n]-1); } else err[n]=(err[n]||0)+1;
    const cmp=el('div','actionrow cmprow'); cmp.style.justifyContent='center';
    [1,2,3,4].filter(k=>AUD.s.has(base+k)).forEach(k=>{ const b=el('button','say t'+k,`${toneIcon(k,22)} ${esc(sylMark(base+k))}`);
      b.onclick=()=>{ try{ new Audio('./audio/s/'+base+k+'.mp3').play().catch(()=>{}); }catch(e){} }; cmp.appendChild(b); });
    const extra=el('div',''); extra.appendChild(el('div','lbl','Сравни все тоны этого слога:')).style.marginBottom='6px'; extra.appendChild(cmp);
    playAnswer(ok,{right,okHtml:right,extra:ok?null:extra});
  },'two');
}
