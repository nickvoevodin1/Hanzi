/*==================================================================
  ИГРОВОЙ СЛОЙ: XP, серия и заморозки, неделя и сундук, достижения,
  задания дня, звуки, конфетти, маскот «Чжу», панель ответа.
  Игра решает «как подать», FSRS — «что и когда повторять».
==================================================================*/
const XP={task:10,combo5:5,perfect:20,mock:50,review:15,quests:30,chest:50};
function addXP(n){ if(!n) return; D().xp+=n; checkDay(); }

// — серия: день засчитан, если все повторения к сроку сделаны (была учёба) ИЛИ набрана дневная цель XP
function dayMet(d){ const r=State.meta.daily[d]; if(r) return !!(r.met||r.fz); return (State.meta.rev[d]||0)>0; }   // до v17 — по журналу повторений
function streakLen(){
  let d=todayStr(), n=0, g=0; if(!dayMet(d)) d=addDays(d,-1);
  while(dayMet(d)&&g++<5000){ n++; d=addDays(d,-1); }
  return n;
}
function checkDay(){
  const d=D(); if(d.met) return;
  const act=d.t>0||d.rv>0||d.dec>0||d.sent>0||d.mock>0;
  if((act&&dueKeys().length===0)||d.xp>=State.settings.xpGoal){
    d.met=1;
    const n=streakLen(), fz=State.meta.fz;                       // заморозка: 1 за каждые 7 дней серии, максимум 2
    if(n>0&&n%7===0&&fz.day!==todayStr()&&fz.n<2){ fz.n++; fz.day=todayStr(); notice('ice','Заморозка серии','за '+n+' '+plural(n,'день','дня','дней')+' подряд'); }
    save('meta'); renderTop();
  }
}
// Пропущенные дни прикрываются заморозками (по одной на день), если их хватает
function applyFreezes(){
  const fz=State.meta.fz, t=todayStr(); if(fz.checked===t) return; fz.checked=t;
  const gap=[]; let d=addDays(t,-1);
  while(!dayMet(d)&&gap.length<=2){ gap.push(d); d=addDays(d,-1); }
  if(!gap.length||gap.length>fz.n||!dayMet(d)) return;
  gap.forEach(x=>{ D(x).fz=1; }); fz.n-=gap.length;
  setTimeout(()=>notice('ice','Серия спасена','заморозка прикрыла '+gap.map(fmtDate).join(', ')),600);
}

// — неделя: XP этой недели против прошлой и рекорда; сундук за недельную цель (5 дневных целей)
function weekStart(d){ const x=pdate(d); x.setDate(x.getDate()-(x.getDay()+6)%7); return dstr(x); }
function weekXP(ws){ let s=0; for(let i=0;i<7;i++){ const r=State.meta.daily[addDays(ws,i)]; if(r) s+=r.xp||0; } return s; }
function weekInfo(){
  const ws=weekStart(todayStr()), cur=weekXP(ws), last=weekXP(addDays(ws,-7));
  const weeks=new Set(Object.keys(State.meta.daily).map(weekStart)); let best=0;
  weeks.forEach(w=>{ if(w!==ws) best=Math.max(best,weekXP(w)); });
  const goal=State.settings.xpGoal*5;
  return {ws,cur,last,best,goal,chest:State.meta.chest[ws]?'opened':cur>=goal?'ready':'locked'};
}
function openChest(){ const w=weekInfo(); if(w.chest!=='ready') return 0; State.meta.chest[w.ws]=todayStr(); addXP(XP.chest); save('meta'); return XP.chest; }

// — достижения
function wordsLearned(){ return semWords().filter(k=>!isNew(k)).length; }
function lessonDaysRun(){ let d=todayStr(), n=0; if(!(State.meta.daily[d]&&State.meta.daily[d].ls)) d=addDays(d,-1);
  while(State.meta.daily[d]&&State.meta.daily[d].ls){ n++; d=addDays(d,-1); } return n; }
const ACH=[
  {id:'w100',ic:'sprout',t:'100 слов',d:'выучены первые 100 слов',f:()=>wordsLearned()>=100},
  {id:'w300',ic:'leaf',t:'300 слов',d:'выучено 300 слов',f:()=>wordsLearned()>=300},
  {id:'wall',ic:'tree',t:'Все слова',d:'все слова уроков 1–30',f:()=>semRemaining()===0},
  {id:'k214',ic:'部',t:'214 ключей',d:'введены все ключи',f:()=>keysDeckLeft()===0},
  {id:'wr50',ic:'brush',t:'50 иероглифов',d:'50 иероглифов в прописях по памяти',f:()=>writeStats().chars>=50},
  {id:'crown5',ic:'crown',t:'5 корон',d:'юнит на 5 корон',f:()=>pathUnits().some(u=>unitCrowns(u)>=5)},
  {id:'s7',ic:'flame',t:'Серия 7',d:'7 дней подряд',f:()=>streakLen()>=7},
  {id:'s30',ic:'flame',t:'Серия 30',d:'30 дней подряд',f:()=>streakLen()>=30},
  {id:'s60',ic:'flame',t:'Серия 60',d:'60 дней подряд',f:()=>streakLen()>=60},
  {id:'mock90',ic:'medal',t:'Пробная на 5',d:'пробная контрольная ≥ 90%',f:()=>State.meta.mocks.some(m=>m.pct>=90)},
  {id:'perfect',ic:'gem',t:'Без ошибок',d:'урок без единой ошибки',f:()=>false},
  {id:'days10',ic:'calendar',t:'10 дней',d:'10 уроков подряд без пропуска дня',f:()=>lessonDaysRun()>=10},
];
function grantAch(id){
  if(State.meta.ach[id]) return false;
  const a=ACH.find(x=>x.id===id); if(!a) return false;
  State.meta.ach[id]=todayStr(); notice(a.ic,'Достижение: '+a.t,a.d); Sfx.done(); return true;
}
function checkAch(){ let any=false; ACH.forEach(a=>{ if(!State.meta.ach[a.id]&&a.f()) any=grantAch(a.id)||any; }); if(any) save('meta'); }
// — задания дня: за все три — бонус
function checkQuests(){
  const d=D(); if(d.q) return;
  const p=dayPlan(); if(p.quests.length&&p.quests.every(q=>q.done)&&(d.t||d.rv||d.dec||d.sent||d.mock)){
    d.q=1; addXP(XP.quests); notice('chest','Все задания дня!','+'+XP.quests+' XP'); Sfx.done(); confetti(); save('meta');
  }
}

// — всплывающие уведомления (достижения, заморозки, бонусы) по очереди
const NOTES=[]; let noteBusy=false;
function notice(ic,title,sub){ NOTES.push([ic,title,sub]); if(!noteBusy) nextNotice(); }
function nextNotice(){
  const n=NOTES.shift(), p=$('#achpop'); if(!n){ noteBusy=false; return; }
  noteBusy=true; p.innerHTML=`<span class="ai">${icn(n[0],36)}</span><div><b>${esc(n[1])}</b><small>${esc(n[2]||'')}</small></div>`;
  p.classList.add('on'); setTimeout(()=>{ p.classList.remove('on'); setTimeout(nextNotice,450); },2600);
}

// — звуки (Web Audio, без файлов) и вибрация
const Sfx=(()=>{
  let ctx=null;
  function ac(){ if(!State.settings.sound) return null; try{ if(!ctx){ const A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ctx=new A(); }
    if(ctx.state==='suspended') ctx.resume(); }catch(e){ return null; } return ctx; }
  function tone(f,t0,dur,type,vol){ const a=ac(); if(!a) return; try{
    const o=a.createOscillator(), g=a.createGain(), t=a.currentTime+t0;
    o.type=type||'sine'; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol||.16,t+.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+.05); }catch(e){} }
  return {
    ok(){ tone(659,0,.13,'triangle',.17); tone(988,.1,.22,'triangle',.15); },
    bad(){ tone(233,0,.22,'sine',.15); tone(196,.12,.3,'sine',.12); },
    combo(){ tone(784,0,.1,'square',.06); tone(1047,.08,.12,'square',.06); tone(1319,.16,.2,'square',.05); },
    done(){ [523,659,784,1047].forEach((f,i)=>tone(f,i*.08,.7-i*.08,'triangle',.11)); },
  };
})();
function buzz(){ if(State.settings.vibrate&&navigator.vibrate) try{ navigator.vibrate(120); }catch(e){} }
function reducedMotion(){ return !window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

// — конфетти: своё, на canvas, без сети
function confetti(){
  if(reducedMotion()) return;
  const c=$('#confetti'); let ctx=null; try{ ctx=c.getContext('2d'); }catch(e){} if(!ctx) return;
  const dpr=Math.min(2,window.devicePixelRatio||1), W=c.width=innerWidth*dpr, H=c.height=innerHeight*dpr; c.hidden=false;
  const col=['#ff9600','#ffc800','#58cc02','#1cb0f6','#ce82ff','#ff4b4b'];
  const P=Array.from({length:140},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*16*dpr,vy:(-Math.random()*16-6)*dpr,
    w:(6+Math.random()*7)*dpr,h:(8+Math.random()*10)*dpr,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:col[Math.random()*col.length|0]}));
  const t0=performance.now();
  (function f(t){
    const k=(t-t0)/2400; ctx.clearRect(0,0,W,H);
    P.forEach(p=>{ p.vy+=.45*dpr; p.vx*=.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
      ctx.save(); ctx.globalAlpha=Math.max(0,1-k*k); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); });
    if(k<1) requestAnimationFrame(f); else { ctx.clearRect(0,0,W,H); c.hidden=true; }
  })(t0);
}

// — маскот «Чжу»: красная панда (小熊猫) — оранжевая, как акцент приложения; состояния calm / happy / cheer / sad / sleep.
//   Нарисована из кругов и скруглённых прямоугольников (без острых углов и овалов — правила иллюстраций Duolingo).
const MASCOT_SAY={
  calm:['Начнём? Пара минут — и шаг к 30-му уроку.','Я рядом. Один узел за раз.','Учим понемногу, но каждый день.'],
  happy:['Отлично!','Так держать!','Здорово получилось!','Вот это темп!'],
  cheer:['Ошибка — это нормально. Запомним!','Почти! Ещё раз — и получится.','Ничего страшного, повторим в конце.'],
  sad:['Серия под угрозой — хватит пары минут повторений.','Повторения ждут тебя.'],
  sleep:['Сегодня поездка — хватит повторений.','Каникулы: отдыхаем, но повторяем.'],
};
function mascotPhrase(st){ const a=MASCOT_SAY[st]||MASCOT_SAY.calm; return a[Math.random()*a.length|0]; }
const MC={fur:'#f47a2c',furD:'#d9581c',dark:'#5c2a18',darker:'#3d1c10',cream:'#fff7ee',ink:'#2b1a12'};
function mascot(st,size,o){
  st=st||'calm'; size=size||64; o=o||{};
  const C=MC, happy=st==='happy'||st==='cheer';
  const ear=x=>{ const m=x<60?1:-1, X=v=>60+(v-60)*m;
    return `<path d="M${X(16)} 40C${X(10)} 20 ${X(18)} 8 ${X(32)} 9c${8*m} .6 ${12*m} 6 ${11*m} 14z" fill="${C.fur}"/>
      <path d="M${X(21)} 33C${X(18)} 21 ${X(22)} 14 ${X(31)} 14.5c${5*m} .4 ${7*m} 4 ${6*m} 9z" fill="${C.cream}"/>
      <path d="M${X(24)} 31C${X(23)} 24 ${X(25)} 19 ${X(30)} 19.5c${3*m} .3 ${4*m} 2.5 ${3.6*m} 5z" fill="${C.dark}"/>`; };
  const eye=x=>{
    if(happy) return `<path d="M${x-7} 42q7-10 14 0" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`;
    if(st==='sleep') return `<path d="M${x-7} 40q7 6 14 0" fill="none" stroke="${C.ink}" stroke-width="3.6" stroke-linecap="round"/>`;
    const dy=st==='sad'?3:0;
    return `<rect x="${x-7}" y="30" width="14" height="18" rx="7" fill="#fff"/><rect x="${x-4}" y="${35+dy}" width="9" height="11" rx="4.5" fill="${C.ink}"/><circle cx="${x+2.6}" cy="${38+dy}" r="1.9" fill="#fff"/>`
      +(st==='sad'?`<path d="M${x-8} 29.5h16v6h-16z" fill="${C.fur}"/>`:''); };
  const mouth = happy?`<path d="M51 59h18a9 9 0 0 1-18 0z" fill="#8a2c1a"/><path d="M55 64.5a5.5 3.5 0 0 0 10 0 9 9 0 0 1-10 0z" fill="#ff8fa0"/>`
    : st==='sad'?`<path d="M53 66q7-6 14 0" fill="none" stroke="${C.ink}" stroke-width="2.8" stroke-linecap="round"/>`
    : st==='sleep'?`<rect x="57" y="60" width="6" height="4" rx="2" fill="${C.ink}"/>`
    : `<path d="M53 59.5q3.5 4 7 0 3.5 4 7 0" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const arms = st==='cheer'?['M40 74L22 52','M80 74L98 52'] : st==='happy'?['M40 76L35 96','M80 74L99 58'] : ['M40 76L35 96','M80 76L85 96'];
  const head=`${ear(20)}${ear(100)}
    <rect x="12" y="15" width="96" height="63" rx="31.5" fill="${C.fur}"/>
    <rect x="34" y="21" width="15" height="7" rx="3.5" fill="${C.cream}"/><rect x="71" y="21" width="15" height="7" rx="3.5" fill="${C.cream}"/>
    <circle cx="25" cy="55" r="11" fill="${C.cream}"/><circle cx="95" cy="55" r="11" fill="${C.cream}"/>
    <rect x="41" y="44" width="38" height="28" rx="14" fill="${C.cream}"/>
    <path d="M43 48c-1 6 1 10 5 13M77 48c1 6-1 10-5 13" fill="none" stroke="${C.furD}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    ${eye(43)}${eye(77)}
    ${st==='sad'?`<path d="M33 30l12-5M87 30l-12-5" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round"/>`:''}
    ${happy?`<rect x="29" y="47" width="10" height="5" rx="2.5" fill="#ff8fa0" opacity=".75"/><rect x="81" y="47" width="10" height="5" rx="2.5" fill="#ff8fa0" opacity=".75"/>`:''}
    <path d="M54 50h12c1.6 0 2.4 1.9 1.2 3l-4.8 4.6a3.4 3.4 0 0 1-4.8 0L52.8 53c-1.2-1.1-.4-3 1.2-3z" fill="${C.ink}"/>${mouth}`;
  if(o.head) return `<svg class="mascot m-${st}" viewBox="8 4 104 76" width="${size}" height="${Math.round(size*76/104)}" aria-hidden="true">${head}</svg>`;
  const extra= st==='cheer'?`<path d="M11 14c.3 0 .6.2.7.5l1 3.8a4 4 0 0 0 3 3l3.8 1c.7.2.7 1.2 0 1.4l-3.8 1a4 4 0 0 0-3 3l-1 3.8c-.2.7-1.2.7-1.4 0l-1-3.8a4 4 0 0 0-3-3l-3.8-1c-.7-.2-.7-1.2 0-1.4l3.8-1a4 4 0 0 0 3-3l1-3.8c.1-.3.4-.5.7-.5z" fill="#ffc800"/><circle cx="108" cy="12" r="3.5" fill="#ffc800"/><circle cx="102" cy="26" r="2.2" fill="#1cb0f6"/>`
    : st==='sleep'?`<text class="zz" x="96" y="18" font-size="18" font-weight="900" fill="#1cb0f6" font-family="Nunito,sans-serif">z</text><text class="zz" x="108" y="7" font-size="12" font-weight="900" fill="#1cb0f6" font-family="Nunito,sans-serif">z</text>`
    : st==='sad'?`<path d="M96 44c3 5 3 8 0 9.5-3-1.5-3-4.5 0-9.5z" fill="#84d8ff"/>`:'';
  return `<svg class="mascot m-${st}" viewBox="0 0 120 124" width="${size}" height="${Math.round(size*124/120)}" aria-hidden="true">
    <rect x="28" y="115" width="64" height="8" rx="4" fill="#000" opacity=".07"/>
    <g transform="translate(84 62) rotate(-28)"><rect x="-11" y="0" width="22" height="52" rx="11" fill="${C.fur}"/><rect x="-11" y="13" width="22" height="7" fill="${C.furD}"/><rect x="-11" y="28" width="22" height="7" fill="${C.furD}"/><rect x="-11" y="43" width="22" height="9" rx="4.5" fill="${C.dark}"/></g>
    <rect x="32" y="60" width="56" height="56" rx="26" fill="${C.fur}"/><rect x="38" y="86" width="44" height="30" rx="15" fill="${C.dark}"/>
    <rect x="37" y="105" width="19" height="11" rx="5.5" fill="${C.darker}"/><rect x="64" y="105" width="19" height="11" rx="5.5" fill="${C.darker}"/>
    <path d="${arms[0]}" stroke="${C.dark}" stroke-width="12" stroke-linecap="round"/><path d="${arms[1]}" stroke="${C.dark}" stroke-width="12" stroke-linecap="round"/>
    ${head}${extra}</svg>`;
}
function mascotRow(st,text){ return `<div class="mascotrow">${mascot(st,58)}<div class="say-bubble">${esc(text||mascotPhrase(st))}</div></div>`; }

// — нижняя панель ответа (выезжает пружиной)
function showFB(ok,html,onNext,extra){
  const fb=$('#fb'), inn=$('#fbin');
  fb.className='fb '+(ok?'ok':'bad'); fb.hidden=false;
  inn.innerHTML=`<h3><span class="ic">${IC(ok?'checkOk':'xBad',38)}</span>${ok?esc(mascotPhrase('happy')):'Правильный ответ:'}</h3>${html?`<div class="ans">${html}</div>`:''}`
    +(ok?'':`<div class="cheer">${mascot('cheer',30)}<span>${esc(mascotPhrase('cheer'))}</span></div>`);
  if(extra){ extra.classList.add('fbextra'); inn.appendChild(extra); }
  const b=el('button','btn',ok?'Дальше':'Понятно'); b.dataset.key='space'; b.onclick=()=>{ hideFB(); onNext(); }; inn.appendChild(b);
  requestAnimationFrame(()=>requestAnimationFrame(()=>fb.classList.add('on')));
}
function hideFB(){ const fb=$('#fb'); fb.classList.remove('on'); fb.hidden=true; $('#fbin').innerHTML=''; }
function comboPop(n){ const p=$('#combopop'); p.innerHTML=IC('flame',26)+' ×'+n+' комбо'; p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); Sfx.combo(); }

// — шапка: тип дня, серия, заморозки, кольцо XP
function ringSVG(p,size){ const r=15, C=2*Math.PI*r;
  return `<svg width="${size||38}" height="${size||38}" viewBox="0 0 38 38"><circle cx="19" cy="19" r="${r}" fill="none" stroke="#e5e5e5" stroke-width="5"/>
    <circle cx="19" cy="19" r="${r}" fill="none" stroke="${p>=1?'#ffc800':'#ff9600'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C*Math.min(1,p)).toFixed(1)} ${C.toFixed(1)}"/></svg>`; }
function renderTop(){
  const t=dayType(), dc=$('#dayChip'); dc.className='daychip '+t; dc.textContent=DAY_NAMES[t];
  const n=streakLen(), met=dayMet(todayStr());
  const s=$('#stStreak'); s.className='stat fire'+(met?'':' off'); s.firstChild.innerHTML=IC(met?'flame':'flameOff',26); s.lastChild.textContent=n; s.title='Серия: '+n+' '+plural(n,'день','дня','дней')+(met?' · сегодня засчитан':' · сегодня ещё не засчитан');
  const f=$('#stFreeze'); f.className='stat ice'+(State.meta.fz.n?'':' off'); f.firstChild.innerHTML=IC(State.meta.fz.n?'ice':'iceOff',24); f.lastChild.textContent=State.meta.fz.n;
  const lg=$('#logo'); if(lg&&!lg.firstChild) lg.innerHTML=mascot('calm',44,{head:1});
  const xp=D().xp, g=State.settings.xpGoal, r=$('#stRing');
  r.className='ring'+(xp>=g?' full':''); r.innerHTML=ringSVG(xp/g)+`<b>${xp>=g?IC('bolt',18):xp}</b>`; r.title='XP сегодня: '+xp+' из '+g;
}
