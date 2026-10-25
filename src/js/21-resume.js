/*==================================================================
  ПРОДОЛЖЕНИЕ С ТОГО ЖЕ МЕСТА: телефон выгружает свёрнутое приложение из памяти,
  и при возврате страница загружается заново. Поэтому экран, незаконченный урок
  (PLAY), карточки (SESSION), разбор (DEC), предложения (SENT), пробная (MOCK),
  проверочная (T) и прокрутка сохраняются в localStorage (синхронно — успевает при
  сворачивании) и восстанавливаются при запуске, если прошло меньше 12 часов.
==================================================================*/
const Resume=(()=>{
  const KEY='zhu-resume', MAX_AGE=12*3600e3;
  let t=null, enabled=false;
  const rep=(k,v)=>v instanceof Set?{__set:[...v]}:typeof v==='function'?undefined:v;
  const rev=(k,v)=>v&&typeof v==='object'&&Array.isArray(v.__set)?new Set(v.__set):v;
  function snap(){
    return {v:1,ts:Date.now(),route:State.route,tab:State.tab,y:Math.round(window.scrollY||0),
      play:PLAY,session:SESSION,dec:DEC,sent:SENT,mock:MOCK,test:T};
  }
  function save(){
    if(!enabled) return;
    try{ localStorage.setItem(KEY,JSON.stringify(snap(),rep)); }catch(e){}
  }
  function later(){ clearTimeout(t); t=setTimeout(save,250); }
  function clear(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  // восстановить; true — если экран восстановлен (иначе стартуем с Пути)
  function restore(){
    enabled=true;
    let s=null; try{ s=JSON.parse(localStorage.getItem(KEY)||'null',rev); }catch(e){ s=null; }
    if(!s||s.v!==1||!s.route||!s.route.name||Date.now()-s.ts>MAX_AGE) return false;
    try{
      PLAY=s.play||null; SESSION=s.session||null; DEC=s.dec||null; SENT=s.sent||null; MOCK=s.mock||null; T=s.test||null;
      if(PLAY){ PLAY.opts=PLAY.opts||{}; if(PLAY.opts.kind==='daily') PLAY.opts.more=dailyPortion;
        PLAY.fails=PLAY.fails instanceof Set?PLAY.fails:new Set(); PLAY.sents=PLAY.sents instanceof Set?PLAY.sents:new Set(); }
      const name=s.route.name;
      if(name==='play'&&!PLAY || name==='session'&&!SESSION) return false;
      State.route=s.route; if(s.tab) State.tab=s.tab;
      render();
      if(s.y&&!['play','session'].includes(name)) setTimeout(()=>window.scrollTo(0,s.y),30);
      return true;
    }catch(e){ PLAY=SESSION=DEC=SENT=MOCK=T=null; clear(); return false; }
  }
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') save(); });
  window.addEventListener('pagehide',save);
  window.addEventListener('scroll',later,{passive:true});
  return {save,later,restore,clear};
})();
