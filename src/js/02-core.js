/*==================================================================
  ХРАНИЛИЩЕ: IndexedDB (в превью без хранилища — память)
==================================================================*/
const Store = (()=>{
  let mem={}, idb=null, ok=false;
  function open(){
    return new Promise(res=>{
      try{
        const r=indexedDB.open('hanzi-trainer',1);
        r.onupgradeneeded=e=>{ e.target.result.createObjectStore('kv'); };
        r.onsuccess=e=>{ idb=e.target.result; ok=true; res(true); };
        r.onerror=()=>res(false);
        setTimeout(()=>{ if(!ok) res(false); },800);
      }catch(e){ res(false); }
    });
  }
  function get(k){
    if(!ok) return Promise.resolve(mem[k]);
    return new Promise(res=>{ const t=idb.transaction('kv','readonly').objectStore('kv').get(k);
      t.onsuccess=()=>res(t.result); t.onerror=()=>res(mem[k]); });
  }
  function set(k,v){
    mem[k]=v; if(!ok) return Promise.resolve();
    return new Promise(res=>{ const t=idb.transaction('kv','readwrite').objectStore('kv').put(v,k);
      t.onsuccess=()=>res(); t.onerror=()=>res(); });
  }
  return {open,get,set,persistent:()=>ok};
})();

/*==================================================================
  FSRS-5 — интервальное повторение (стандартные веса)
==================================================================*/
const FSRS = (()=>{
  const W=[0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,1.54575,
           0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,2.9898,0.51655,0.6621];
  const DECAY=-0.5, F=Math.pow(0.9,1/DECAY)-1;
  const clampD=d=>Math.min(Math.max(d,1),10), clampS=s=>Math.max(s,0.01);
  const D0=g=>clampD(W[4]-Math.exp(W[5]*(g-1))+1), S0=g=>clampS(W[g-1]);
  const retr=(t,S)=>Math.pow(1+F*t/S,DECAY);
  function nextD(D,g){ let d=D-W[6]*(g-3); d=D+(d-D)*(10-D)/9; return clampD(W[7]*D0(4)+(1-W[7])*d); }
  function sSucc(D,S,r,g){ const h=g===2?W[15]:1, e=g===4?W[16]:1;
    return clampS(S*(1+Math.exp(W[8])*(11-D)*Math.pow(S,-W[9])*(Math.exp(W[10]*(1-r))-1)*h*e)); }
  function sFail(D,S,r){ return clampS(Math.min(W[11]*Math.pow(D,-W[12])*(Math.pow(S+1,W[13])-1)*Math.exp(W[14]*(1-r)),S)); }
  function interval(S,req){ return Math.max(1,Math.round(S/F*(Math.pow(req,1/DECAY)-1))); }
  const DAY=864e5;
  // card: {S,D,due,last,reps,lapses,state}; state 0 — новая, 1 — в повторении
  function review(card,g,req){
    const now=Date.now(); const c=Object.assign({},card);
    if(!c.state){ c.S=S0(g); c.D=D0(g); c.reps=1; c.lapses=g===1?1:0; c.state=1; }
    else{
      const t=Math.max(0,(now-(c.last||now))/DAY), r=retr(t,c.S);
      if(g===1){ c.S=sFail(c.D,c.S,r); c.lapses=(c.lapses||0)+1; } else c.S=sSucc(c.D,c.S,r,g);
      c.D=nextD(c.D,g); c.reps=(c.reps||0)+1;
    }
    c.last=now;
    c.due = g===1 ? now+6*6e4 : now+interval(c.S,req)*DAY;   // «Не помню» — через ~6 мин, в этой же сессии
    return c;
  }
  return {review};
})();

/*==================================================================
  СОСТОЯНИЕ
==================================================================*/
const REQ=0.90;
// Семестр: даты, которых нет в материалах, — настройки (ТЗ, раздел 10)
const DEF_SEM={on:true,endDate:'2027-01-31',targetLesson:30,groupLesson:18,
  holidays:{from:'2026-12-31',to:'2027-01-10',capacity:0.3},awayDays:[],newWordsUntil:'2026-12-28',
  keysPerDay:10,exams:[],minutesNormal:40};
const clone=o=>JSON.parse(JSON.stringify(o));
const DEF_SETTINGS={semester:clone(DEF_SEM),newPerDay:12,voiceName:null,voiceRec:true,xpGoal:50,sound:true,vibrate:false,
  mockMin:40,scale:[90,75,60]};
const State = {
  cards:{},                                  // ключ → карточка FSRS: слово (w.key), ключ 'r:N', разбор знака 'key:<иероглиф>'
  settings:clone(DEF_SETTINGS),
  meta:{},                                   // см. freshMeta()
  tp:{},                                     // прогресс подготовки к проверочным: id → {done:{шаг:1}, final:[a,b], date}
  sets:[],                                   // свои наборы предложений: {id,title,lessons:[],items:[[zh,py,ru]]}
  route:{ name:'path' }, tab:'path',
};
// daily[дата] = {xp, t задания с 1-й попытки, ok верно, new слова, keys ключи, dec разбор, sent предложения, mock, rv повторения,
//                ls уроков, met день серии засчитан, fz заморозка, more «учить больше», q бонус заданий}
function freshMeta(){ return {day:todayStr(),rev:{},daily:{},ach:{},nodes:{},jumps:{},mocks:[],reports:[],sentErr:{},fz:{n:0,day:''},chest:{}}; }
State.meta=freshMeta();
function dstr(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function todayStr(){ return dstr(new Date()); }
function mergeSemester(x){
  const s=Object.assign(clone(DEF_SEM),x||{});
  s.holidays=Object.assign(clone(DEF_SEM.holidays),(x&&x.holidays)||{});
  s.awayDays=Array.isArray(s.awayDays)?s.awayDays.filter(d=>/^\d{4}-\d\d-\d\d$/.test(d)).sort():[];
  s.exams=Array.isArray(s.exams)?s.exams.filter(e=>e&&e.date):[];
  s.groupLesson=Math.min(NL,Math.max(1,+s.groupLesson||18)); s.targetLesson=Math.min(NL,Math.max(1,+s.targetLesson||30));
  return s;
}
async function loadState(){
  await Store.open();
  const c=await Store.get('cards'); if(c) State.cards=c;
  const ks=Object.keys(State.cards);          // самый старый формат: числовые индексы → ключи-иероглифы
  if(ks.length && ks.every(k=>/^\d+$/.test(k))){
    const nc={}; ks.forEach(k=>{ const w=WORDS[+k]; if(w) nc[w.s]=State.cards[k]; });
    State.cards=nc; await Store.set('cards',nc);
  }
  const s=await Store.get('settings');
  if(s){
    ['newPerDay','voiceName','voiceRec','xpGoal','sound','vibrate','mockMin','scale'].forEach(k=>{ if(s[k]!==undefined) State.settings[k]=s[k]; });
    // миграция: старые «урок группы» (lesson) и цель (goal) → семестр; прогресс не трогаем
    const sem=s.semester||{}; if(!s.semester&&s.lesson) sem.groupLesson=s.lesson;
    State.settings.semester=mergeSemester(sem);
    if(!s.semester||s.goal||s.lesson!==undefined) await Store.set('settings',State.settings);
  }
  if(![30,50,80,120].includes(State.settings.xpGoal)) State.settings.xpGoal=50;
  const m=await Store.get('meta');
  State.meta=Object.assign(freshMeta(),m||{});
  ['rev','daily','ach','nodes','jumps','sentErr','chest'].forEach(k=>{ if(!State.meta[k]||typeof State.meta[k]!=='object') State.meta[k]={}; });
  ['mocks','reports'].forEach(k=>{ if(!Array.isArray(State.meta[k])) State.meta[k]=[]; });
  if(!State.meta.fz) State.meta.fz={n:0,day:''};
  if(m&&m.day===todayStr()&&(m.newToday||m.radToday)){ const d=D(); d.new=Math.max(d.new,m.newToday||0); d.keys=Math.max(d.keys,m.radToday||0); }
  const rt=State.meta.rev[todayStr()]; if(rt&&!(State.meta.daily[todayStr()]||{}).rv) D().rv=rt;     // повторения сегодня до обновления
  delete State.meta.newToday; delete State.meta.radToday;
  State.meta.day=todayStr();
  const tp=await Store.get('tests'); if(tp) State.tp=tp;
  const st=await Store.get('sentences'); if(Array.isArray(st)) State.sets=st;
}
async function save(what){
  if(!what||what==='cards') await Store.set('cards',State.cards);
  if(!what||what==='settings') await Store.set('settings',State.settings);
  if(!what||what==='meta') await Store.set('meta',State.meta);
  if(!what||what==='tests') await Store.set('tests',State.tp);
  if(!what||what==='sentences') await Store.set('sentences',State.sets);
}
function D(day){ day=day||todayStr(); const m=State.meta.daily;
  return m[day]||(m[day]={xp:0,t:0,ok:0,new:0,keys:0,dec:0,sent:0,mock:0,rv:0,ls:0}); }
const SEM=()=>State.settings.semester;
const groupL=()=>SEM().groupLesson;

/*==================================================================
  КАРТОЧКИ И ОЧЕРЕДИ
==================================================================*/
const isRad = k => typeof k==='string' && k.startsWith('r:');
const radNum = k => +k.slice(2);
const isKC = k => typeof k==='string' && k.startsWith('key:');      // разбор иероглифа на ключи
const kcChar = k => k.slice(4);
const validKey = k => isRad(k) ? (radNum(k)>=1&&radNum(k)<=214) : isKC(k) ? !!(ET[kcChar(k)]||HZ.c[kcChar(k)]) : (k in BYK);
const cardOf = k => State.cards[k];
const isNew = k => { const c=cardOf(k); return !c||!c.state; };
const isDue = k => { const c=cardOf(k); return !!(c&&c.state&&c.due<=Date.now()); };
const stab = k => { const c=cardOf(k); return c&&c.state ? c.S : 0; };
function statusOf(k){ const c=cardOf(k); if(!c||!c.state) return 'new'; if(c.due<=Date.now()) return 'due'; return c.S>=21?'known':'seen'; }
function learnedCount(keys){ return keys.filter(k=>!isNew(k)).length; }
function dueKeys(filter){
  return Object.keys(State.cards).filter(k=>validKey(k)&&isDue(k)&&(!filter||filter(k))).sort((a,b)=>cardOf(a).due-cardOf(b).due);
}
// Очередь по набору (урок, ключи, HSK): повторения набора + новые по порядку, порциями
const SESSION_CAP=20;
function poolQueue(keys,cap){
  const set=new Set(keys);
  const due=dueKeys(k=>set.has(k));
  const fresh=keys.filter(isNew);
  return due.concat(fresh).slice(0,cap||SESSION_CAP);
}
function lessonKeys(L){ return COURSE.filter(k=>WORD_L[k]===L); }
function courseKeys(N){ return COURSE.filter(k=>WORD_L[k]<=N); }

/*==================================================================
  ПИНЬИНЬ
==================================================================*/
const TONE_MAP={'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],
  'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],
  'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['ü',1],'ǘ':['ü',2],'ǚ':['ü',3],'ǜ':['ü',4],
  'ü':['ü',5],'ń':['n',2],'ň':['n',3],'ǹ':['n',4]};
function syllTone(s){ for(const ch of s){ if(TONE_MAP[ch]&&TONE_MAP[ch][1]<5) return TONE_MAP[ch][1]; } return 5; }
function toneless(s){ let o=''; for(const ch of (s||'').toLowerCase()){ o+=TONE_MAP[ch]?TONE_MAP[ch][0]:ch; } return o.replace(/ü/g,'v').replace(/[^a-z0-9]/g,''); }
function pinyinHTML(py){
  return (py||'').split(/(\s+)/).map(t=>/^\s*$/.test(t)?t:'<span style="color:var(--t'+syllTone(t)+')">'+esc(t)+'</span>').join('');
}
function wordSylls(w){ const s=w.p.trim().split(/\s+/); return s.length===hanOf(w.s).length ? s : null; }

/*==================================================================
  ОЗВУЧКА: живые записи носителей (audio/, tools/make_audio_pack.py) — чёткие тоны;
  предложения и слова без записи — голос устройства (Web Speech, zh-CN).
  Слово с записью → audio/w/<коды>.mp3 (диктор Yue Tan); односложное слово и знак → слог audio/s/<слог><тон>.mp3
  (диктор Chen Wang; тон всегда как в учебнике); нет записи слова → по слогам; «медленно» — по слогам с паузами.
==================================================================*/
const AUD=(()=>{ const a=/*__AUDIO__*/; return {s:new Set(a.s||[]),w:new Set(a.w||[])}; })();
const Speech=(()=>{
  let voices=[], chosen=null, prefName=null, pack=null, seq=0, cur=null;
  fetch('./audio/manifest.json').then(r=>r.ok?r.json():null).then(j=>{ if(Array.isArray(j)&&j.length) pack=new Set(j); }).catch(()=>{});
  function refresh(){ voices=('speechSynthesis' in window)?(speechSynthesis.getVoices()||[]):[];
    const zh=voices.filter(v=>/zh|cmn|chinese/i.test(v.lang+v.name));
    chosen=(prefName&&zh.find(v=>v.name===prefName))||zh.find(v=>/CN|Hans|普通话|Ting|Mandarin/i.test(v.name+v.lang))||zh[0]||null; }
  if('speechSynthesis' in window){ refresh(); speechSynthesis.onvoiceschanged=refresh; }
  const rec=()=>State.settings.voiceRec!==false;
  function tts(text,rate){
    if(!('speechSynthesis' in window)){ toast('Озвучка недоступна в этом браузере'); return; }
    if(!chosen) refresh();
    try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/——/g,'，'));
      u.lang='zh-CN'; if(chosen) u.voice=chosen; u.rate=rate||.82; speechSynthesis.speak(u); }catch(e){}
  }
  // слог пиньиня → имя файла «xie4» (ü → v); лёгкий тон и эрхуа — нет записи
  function sylName(p){ const t=syllTone(p), b=toneless(p); if(t>4||!b) return null; return b==='er'||!/r$/.test(b)?b+t:null; }
  function sylls(text,py){
    const hz=hanOf(text); if(!hz.length) return null;
    if(!py){ const w=BYS[text]; py=w?w.p:(hz.length===1?charPy(hz[0]).split(' / ')[0]:''); }
    const ps=(py||'').trim().split(/\s+/).filter(Boolean); if(ps.length!==hz.length) return null;
    const ns=ps.map(sylName); return ns.every(n=>n&&AUD.s.has(n))?ns:null;
  }
  const url=n=>'./audio/'+n+'.mp3';
  const wid=t=>[...t].map(c=>c.codePointAt(0).toString(16)).join('-');
  function playList(list,gap,rate,onFail){
    const my=++seq; let i=0;
    (function next(){
      if(my!==seq||i>=list.length) return;
      try{ const a=new Audio(url(list[i++])); cur=a; if(rate&&rate<1) a.playbackRate=Math.max(.7,rate);
        a.onended=()=>{ if(my===seq) setTimeout(next,gap); };
        a.play().catch(()=>{ if(my===seq&&i===1&&onFail) onFail(); });
      }catch(e){ if(onFail) onFail(); }
    })();
  }
  // источник для текста: {list:[файлы], gap} или null (тогда синтез)
  function plan(text,py,slow){
    if(!rec()) return null;
    const ss=sylls(text,py), hz=hanOf(text), t=text.trim();
    if(slow&&ss) return {list:ss.map(n=>'s/'+n),gap:420};
    if(hz.length>1&&AUD.w.has(t)&&[...t].every(isHan)) return {list:['w/'+wid(t)],gap:0};
    if(hz.length===1&&!ss&&AUD.w.has(t)) return {list:['w/'+wid(t)],gap:0};          // лёгкий тон: 吗 呢 了…
    if(ss&&hz.length<=4) return {list:ss.map(n=>'s/'+n),gap:hz.length>1?60:0};
    return null;
  }
  function say(text,rate,py){
    if(!text) return; stop();
    const slow=rate&&rate<.7, p=plan(text,py,slow);
    if(p){ playList(p.list,p.gap,slow&&p.list.length===1?.75:1,()=>tts(text,rate)); return; }
    if(pack&&pack.has(text+'.mp3')){
      try{ const a=new Audio('./audio/'+encodeURIComponent(text+'.mp3')); cur=a; if(rate&&rate<.7) a.playbackRate=.7; a.play().catch(()=>tts(text,rate)); return; }catch(e){}
    }
    tts(text,rate);
  }
  function stop(){ seq++; try{ if(cur){ cur.pause(); cur=null; } }catch(e){} try{ speechSynthesis.cancel(); }catch(e){} }
  // все файлы записей — чтобы приложение озвучивало без интернета (их кэширует service worker)
  function files(){ return [...AUD.s].map(n=>url('s/'+n)).concat([...AUD.w].map(t=>url('w/'+wid(t)))); }
  return {say,stop,plan,files,sylls,has:()=>('speechSynthesis' in window)||!!pack||rec(),voice:()=>chosen,
    setPref(n){ prefName=n||null; if('speechSynthesis' in window) refresh(); },
    list(){ if('speechSynthesis' in window) refresh(); return voices.filter(v=>/zh|cmn|chinese/i.test(v.lang+v.name)); },
    source(){ return rec()?'живые голоса: слова и слоги — запись носителей, предложения — '+(chosen?chosen.name:'голос устройства'):pack?('аудио-пак ('+pack.size+' файлов)'):(chosen?chosen.name:'системный синтез'); }};
})();
const sayW=(w,rate)=>Speech.say(w.s,rate,w.p);
const sayA=w=>`data-say="${esc(w.s)}" data-py="${esc(w.p)}"`;

/*==================================================================
  УТИЛИТЫ
==================================================================*/
const $=(s,r=document)=>r.querySelector(s);
const el=(t,c,h)=>{ const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; };
function esc(s){ return (s+'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function meaning(w){ return w.ru||(w.en&&w.en[0])||'—'; }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
const uniq = a => [...new Set(a)];
function others(list,right,n){ return shuffle(uniq(list).filter(x=>x!==right)).slice(0,n); }   // n неверных вариантов, без повторов
// иероглифы в тексте → кликабельные (разбор по нажатию)
function wrapHz(t){ return esc(t).replace(/[一-鿿]/g,c=>HZ.c[c]?'<span class="hz" data-c="'+c+'">'+c+'</span>':c); }
let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2000); }
const RUM=['янв.','февр.','марта','апр.','мая','июня','июля','авг.','сент.','окт.','нояб.','дек.'];
function fmtDate(s){ const p=(s||'').split('-').map(Number); return p.length===3? p[2]+' '+RUM[p[1]-1] : ''; }
function daysTo(s){ const p=(s||'').split('-').map(Number); if(p.length!==3) return null;
  const t=new Date(); return Math.round((new Date(p[0],p[1]-1,p[2])-new Date(t.getFullYear(),t.getMonth(),t.getDate()))/864e5); }
function whenText(d){ return d===0?'сегодня':d===1?'завтра':d>1?'через '+d+' '+plural(d,'день','дня','дней'):d<0?'прошла':''; }
function plural(n,a,b,c){ n=Math.abs(n)%100; const n1=n%10; return n>10&&n<20?c:n1>1&&n1<5?b:n1===1?a:c; }

