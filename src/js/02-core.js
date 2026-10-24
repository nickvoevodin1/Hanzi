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
const REQ=0.90, SESSION_CAP=20, RAD_PER_DAY=5;
const State = {
  cards:{},                                  // ключ (иероглифы слова или 'r:N') → карточка FSRS
  settings:{ newPerDay:12, lesson:18, voiceName:null },
  meta:{ day:'', newToday:0, radToday:0, rev:{} },
  tp:{},                                     // прогресс подготовки к проверочным: id → {done:{шаг:1}, final:[a,b], date}
  route:{ name:'home' }, tab:'home',
};
function dstr(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function todayStr(){ return dstr(new Date()); }
async function loadState(){
  await Store.open();
  const c=await Store.get('cards'); if(c) State.cards=c;
  const ks=Object.keys(State.cards);          // самый старый формат: числовые индексы → ключи-иероглифы
  if(ks.length && ks.every(k=>/^\d+$/.test(k))){
    const nc={}; ks.forEach(k=>{ const w=WORDS[+k]; if(w) nc[w.s]=State.cards[k]; });
    State.cards=nc; await Store.set('cards',nc);
  }
  const s=await Store.get('settings');
  if(s){ ['newPerDay','lesson','voiceName'].forEach(k=>{ if(s[k]!==undefined) State.settings[k]=s[k]; }); }
  State.settings.lesson=Math.min(NL,Math.max(1,+State.settings.lesson||18));
  const m=await Store.get('meta'); if(m) Object.assign(State.meta,m);
  State.meta.rev=State.meta.rev||{};
  if(State.meta.day!==todayStr()){ State.meta.day=todayStr(); State.meta.newToday=0; State.meta.radToday=0; await save('meta'); }
  const tp=await Store.get('tests'); if(tp) State.tp=tp;
}
async function save(what){
  if(!what||what==='cards') await Store.set('cards',State.cards);
  if(!what||what==='settings') await Store.set('settings',State.settings);
  if(!what||what==='meta') await Store.set('meta',State.meta);
  if(!what||what==='tests') await Store.set('tests',State.tp);
}

/*==================================================================
  КАРТОЧКИ И ОЧЕРЕДИ
==================================================================*/
const isRad = k => typeof k==='string' && k.startsWith('r:');
const radNum = k => +k.slice(2);
const validKey = k => isRad(k) ? (radNum(k)>=1&&radNum(k)<=214) : (k in BYK);
const cardOf = k => State.cards[k];
const isNew = k => { const c=cardOf(k); return !c||!c.state; };
const isDue = k => { const c=cardOf(k); return !!(c&&c.state&&c.due<=Date.now()); };
function statusOf(k){ const c=cardOf(k); if(!c||!c.state) return 'new'; if(c.due<=Date.now()) return 'due'; return c.S>=21?'known':'seen'; }
function learnedCount(keys){ return keys.filter(k=>!isNew(k)).length; }
function dueKeys(filter){
  return Object.keys(State.cards).filter(k=>validKey(k)&&isDue(k)&&(!filter||filter(k))).sort((a,b)=>cardOf(a).due-cardOf(b).due);
}
// Урок дня: повторения + новые по курсу (уроки по порядку, ключ — перед первым словом с ним)
function dailyQueue(){
  const due=dueKeys();
  let wb=Math.max(0,State.settings.newPerDay-(State.meta.newToday||0));
  let rb=wb>0 ? Math.max(0,RAD_PER_DAY-(State.meta.radToday||0)) : 0;
  const fresh=[];
  for(const k of COURSE){
    if(!wb && !rb) break;
    if(!isNew(k)) continue;
    if(isRad(k)){ if(rb){ fresh.push(k); rb--; } }
    else if(wb){ fresh.push(k); wb--; }
  }
  return due.concat(fresh).slice(0,SESSION_CAP);
}
// Очередь по набору (урок, ключи, HSK): повторения набора + все новые по порядку, порциями
function poolQueue(keys){
  const set=new Set(keys);
  const due=dueKeys(k=>set.has(k));
  const fresh=keys.filter(isNew);
  return due.concat(fresh).slice(0,SESSION_CAP);
}
function lessonKeys(L){ return LESSON_RADS[L].map(n=>'r:'+n).concat(lessonWords(L).map(w=>w.key)); }
function courseKeys(N){ const o=[]; for(let L=1;L<=N;L++){ o.push(...lessonKeys(L)); lessonExtras(L).forEach(x=>o.push(...x.words.map(w=>w.key))); } return [...new Set(o)]; }

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
  ОЗВУЧКА: аудио-пак ./audio (если выложен) или голос устройства
==================================================================*/
const Speech=(()=>{
  let voices=[], chosen=null, prefName=null, pack=null;
  fetch('./audio/manifest.json').then(r=>r.ok?r.json():null).then(j=>{ if(Array.isArray(j)&&j.length) pack=new Set(j); }).catch(()=>{});
  function refresh(){ voices=speechSynthesis.getVoices()||[];
    const zh=voices.filter(v=>/zh|cmn|chinese/i.test(v.lang+v.name));
    chosen=(prefName&&zh.find(v=>v.name===prefName))||zh.find(v=>/CN|Hans|普通话|Ting|Mandarin/i.test(v.name+v.lang))||zh[0]||null; }
  if('speechSynthesis' in window){ refresh(); speechSynthesis.onvoiceschanged=refresh; }
  function tts(text,rate){
    if(!('speechSynthesis' in window)){ toast('Озвучка недоступна в этом браузере'); return; }
    if(!chosen) refresh();
    try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/——/g,'，'));
      u.lang='zh-CN'; if(chosen) u.voice=chosen; u.rate=rate||.82; speechSynthesis.speak(u); }catch(e){}
  }
  function say(text,rate){
    if(!text) return;
    if(pack&&pack.has(text+'.mp3')){
      try{ const a=new Audio('./audio/'+encodeURIComponent(text+'.mp3')); if(rate&&rate<.7) a.playbackRate=.7; a.play().catch(()=>tts(text,rate)); return; }catch(e){}
    }
    tts(text,rate);
  }
  function stop(){ try{ speechSynthesis.cancel(); }catch(e){} }
  return {say,stop,has:()=>('speechSynthesis' in window)||!!pack,voice:()=>chosen,
    setPref(n){ prefName=n||null; if('speechSynthesis' in window) refresh(); },
    list(){ if('speechSynthesis' in window) refresh(); return voices.filter(v=>/zh|cmn|chinese/i.test(v.lang+v.name)); },
    source(){ return pack?('аудио-пак ('+pack.size+' файлов)'):(chosen?chosen.name:'системный синтез'); }};
})();

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

