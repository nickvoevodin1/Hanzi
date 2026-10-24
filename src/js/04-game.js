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
    if(n>0&&n%7===0&&fz.day!==todayStr()&&fz.n<2){ fz.n++; fz.day=todayStr(); notice('❄️','Заморозка серии','за '+n+' '+plural(n,'день','дня','дней')+' подряд'); }
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
  setTimeout(()=>notice('❄️','Серия спасена','заморозка прикрыла '+gap.map(fmtDate).join(', ')),600);
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
  {id:'w100',ic:'🌱',t:'100 слов',d:'выучены первые 100 слов',f:()=>wordsLearned()>=100},
  {id:'w300',ic:'🌿',t:'300 слов',d:'выучено 300 слов',f:()=>wordsLearned()>=300},
  {id:'wall',ic:'🌳',t:'Все слова',d:'все слова уроков 1–30',f:()=>semRemaining()===0},
  {id:'k214',ic:'部',t:'214 ключей',d:'введены все ключи',f:()=>keysDeckLeft()===0},
  {id:'crown5',ic:'👑',t:'5 корон',d:'юнит на 5 корон',f:()=>pathUnits().some(u=>unitCrowns(u)>=5)},
  {id:'s7',ic:'🔥',t:'Серия 7',d:'7 дней подряд',f:()=>streakLen()>=7},
  {id:'s30',ic:'🔥',t:'Серия 30',d:'30 дней подряд',f:()=>streakLen()>=30},
  {id:'s60',ic:'🔥',t:'Серия 60',d:'60 дней подряд',f:()=>streakLen()>=60},
  {id:'mock90',ic:'📝',t:'Пробная на 5',d:'пробная контрольная ≥ 90%',f:()=>State.meta.mocks.some(m=>m.pct>=90)},
  {id:'perfect',ic:'💎',t:'Без ошибок',d:'урок без единой ошибки',f:()=>false},
  {id:'days10',ic:'📅',t:'10 дней',d:'10 уроков подряд без пропуска дня',f:()=>lessonDaysRun()>=10},
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
    d.q=1; addXP(XP.quests); notice('🎁','Все задания дня!','+'+XP.quests+' XP'); Sfx.done(); confetti(); save('meta');
  }
}

// — всплывающие уведомления (достижения, заморозки, бонусы) по очереди
const NOTES=[]; let noteBusy=false;
function notice(ic,title,sub){ NOTES.push([ic,title,sub]); if(!noteBusy) nextNotice(); }
function nextNotice(){
  const n=NOTES.shift(), p=$('#achpop'); if(!n){ noteBusy=false; return; }
  noteBusy=true; p.innerHTML=`<span class="ai">${n[0]}</span><div><b>${esc(n[1])}</b><small>${esc(n[2]||'')}</small></div>`;
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
  const col=['#f25a1e','#ffc800','#58cc02','#1cb0f6','#ce82ff','#ff4b4b'];
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

// — маскот «Чжу»: красная печать 朱 с глазами; состояния calm / happy / cheer / sad / sleep
const MASCOT_SAY={
  calm:['Начнём? Пара минут — и шаг к 30-му уроку.','Я рядом. Один узел за раз.','Учим понемногу, но каждый день.'],
  happy:['Отлично!','Так держать!','Здорово получилось!','Вот это темп!'],
  cheer:['Ошибка — это нормально. Запомним!','Почти! Ещё раз — и получится.','Ничего страшного, повторим в конце.'],
  sad:['Серия под угрозой — хватит пары минут повторений.','Повторения ждут тебя.'],
  sleep:['Сегодня поездка — хватит повторений.','Каникулы: отдыхаем, но повторяем.'],
};
function mascotPhrase(st){ const a=MASCOT_SAY[st]||MASCOT_SAY.calm; return a[Math.random()*a.length|0]; }
function mascot(st,size){
  size=size||64; st=st||'calm';
  const eye=(x)=>{
    if(st==='happy'||st==='cheer') return `<path d="M${x-9} 44 q9 -11 18 0" stroke="#3c1d16" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    if(st==='sleep') return `<path d="M${x-8} 42 q8 7 16 0" stroke="#3c1d16" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    const dy=st==='sad'?4:0;
    return `<ellipse cx="${x}" cy="41" rx="9.5" ry="11" fill="#fff"/><circle cx="${x+1}" cy="${43+dy}" r="5.2" fill="#3c1d16"/><circle cx="${x+3}" cy="${40+dy}" r="1.8" fill="#fff"/>`;
  };
  const brows=st==='sad'?`<path d="M26 28 l12 4 M74 28 l-12 4" stroke="#3c1d16" stroke-width="4" stroke-linecap="round"/>`:'';
  const cheeks=(st==='happy'||st==='cheer')?`<ellipse cx="24" cy="56" rx="6" ry="3.5" fill="#ff9b8a" opacity=".8"/><ellipse cx="76" cy="56" rx="6" ry="3.5" fill="#ff9b8a" opacity=".8"/>`:'';
  const extra= st==='cheer'?`<path d="M8 14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffc800"/><path d="M90 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffc800"/>`
    : st==='sleep'?`<text class="zz" x="80" y="16" font-size="16" font-weight="900" fill="#1cb0f6" font-family="Nunito,sans-serif">z</text><text class="zz" x="90" y="6" font-size="11" font-weight="900" fill="#1cb0f6" font-family="Nunito,sans-serif">z</text>`
    : st==='sad'?`<path d="M80 50 q4 7 0 10 q-4 -3 0 -10z" fill="#84d8ff"/>`:'';
  return `<svg class="mascot m-${st}" viewBox="0 0 100 106" width="${size}" height="${Math.round(size*1.06)}" aria-hidden="true">
    <rect x="10" y="18" width="80" height="84" rx="20" fill="#a92c20"/>
    <rect x="10" y="12" width="80" height="84" rx="20" fill="#e23d2e"/>
    <rect x="16" y="18" width="68" height="72" rx="14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5"/>
    ${brows}${eye(36)}${eye(64)}${cheeks}
    <text x="50" y="87" font-size="30" text-anchor="middle" fill="#fff" font-family="'Songti SC','Noto Serif SC',serif">朱</text>${extra}</svg>`;
}
function mascotRow(st,text){ return `<div class="mascotrow">${mascot(st,58)}<div class="say-bubble">${esc(text||mascotPhrase(st))}</div></div>`; }

// — нижняя панель ответа (выезжает пружиной)
function showFB(ok,html,onNext,extra){
  const fb=$('#fb'), inn=$('#fbin');
  fb.className='fb '+(ok?'ok':'bad'); fb.hidden=false;
  inn.innerHTML=`<h3><span class="ic">${ok?'✅':'❌'}</span>${ok?esc(mascotPhrase('happy')):'Правильный ответ:'}</h3>${html?`<div class="ans">${html}</div>`:''}`
    +(ok?'':`<div class="cheer">${mascot('cheer',30)}<span>${esc(mascotPhrase('cheer'))}</span></div>`);
  const b=el('button','btn',ok?'Дальше':'Понятно'); b.dataset.key='space'; b.onclick=()=>{ hideFB(); onNext(); }; inn.appendChild(b);
  if(extra) inn.appendChild(extra);
  requestAnimationFrame(()=>requestAnimationFrame(()=>fb.classList.add('on')));
}
function hideFB(){ const fb=$('#fb'); fb.classList.remove('on'); fb.hidden=true; $('#fbin').innerHTML=''; }
function comboPop(n){ const p=$('#combopop'); p.textContent='×'+n+' комбо 🔥'; p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); Sfx.combo(); }

// — шапка: тип дня, серия, заморозки, кольцо XP
function ringSVG(p,size){ const r=15, C=2*Math.PI*r;
  return `<svg width="${size||38}" height="${size||38}" viewBox="0 0 38 38"><circle cx="19" cy="19" r="${r}" fill="none" stroke="#e5e5e5" stroke-width="5"/>
    <circle cx="19" cy="19" r="${r}" fill="none" stroke="${p>=1?'#ffc800':'#f25a1e'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C*Math.min(1,p)).toFixed(1)} ${C.toFixed(1)}"/></svg>`; }
function renderTop(){
  const t=dayType(), dc=$('#dayChip'); dc.className='daychip '+t; dc.textContent=DAY_NAMES[t];
  const n=streakLen(), met=dayMet(todayStr());
  const s=$('#stStreak'); s.className='stat fire'+(met?'':' off'); s.lastChild.textContent=n; s.title='Серия: '+n+' '+plural(n,'день','дня','дней')+(met?' · сегодня засчитан':' · сегодня ещё не засчитан');
  const f=$('#stFreeze'); f.className='stat ice'+(State.meta.fz.n?'':' off'); f.lastChild.textContent=State.meta.fz.n;
  const xp=D().xp, g=State.settings.xpGoal, r=$('#stRing');
  r.className='ring'+(xp>=g?' full':''); r.innerHTML=ringSVG(xp/g)+`<b>${xp>=g?'✓':xp}</b>`; r.title='XP сегодня: '+xp+' из '+g;
}
