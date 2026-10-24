/*==================================================================
  РОУТЕР И НАВИГАЦИЯ: Путь · Повторение · Словарь · Прогресс · Настройки
==================================================================*/
const TAB_OF={path:'path',play:'path',practice:'practice',cards:'practice',session:'practice',decomp:'practice',sent:'practice',addsent:'practice',
  mock:'practice',tests:'practice',test:'practice',keys:'practice',radical:'practice',reports:'practice',
  dict:'dict',list:'dict',lessons:'dict',lesson:'dict',extra:'dict',strokes:'dict',progress:'progress',settings:'settings'};
function go(name,params){
  State.route={name,...params}; if(TAB_OF[name]) State.tab=TAB_OF[name];
  closeSheet(); hideFB(); clearTimeout(playT); Speech.stop(); render(); window.scrollTo(0,0);
}
function render(){
  if(State.meta.day!==todayStr()){ State.meta.day=todayStr(); applyFreezes(); save('meta'); }
  document.body.classList.toggle('focus',['play','session'].includes(State.route.name));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.nav===State.tab));
  renderTop();
  const V={path:viewPath,play:viewPlay,practice:viewPractice,cards:viewCards,decomp:viewDecomp,sent:viewSent,addsent:viewAddSent,mock:viewMock,reports:viewReports,
    lessons:viewLessons,lesson:viewLesson,extra:viewExtra,strokes:viewStrokes,card:viewCard,session:viewSession,draw:viewDraw,
    tests:viewTests,test:viewTest,keys:viewKeys,radical:viewRadical,dict:viewDict,list:viewList,progress:viewProgress,settings:viewSettings};
  const s=$('#screen'); s.innerHTML=''; (V[State.route.name]||viewPath)(s);
}
$('#nav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) go(b.dataset.nav); });
$('#stStreak').onclick=$('#stFreeze').onclick=$('#stRing').onclick=()=>go('progress');
// Клавиатура: Пробел/Enter — показать/дальше, 1/← и 2/→ — оценка, 1–4 — варианты, Backspace — отменить
document.addEventListener('keydown',e=>{
  if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if(!$('#sheet').hidden){ if(e.key==='Escape') closeSheet(); return; }
  const fb=$('#fb'), scr=fb.hidden?$('#screen'):fb; let b=null;
  if(/^[1-4]$/.test(e.key)) b=scr.querySelector('[data-ch="'+e.key+'"]');
  if(!b){ const k={' ':'space','Enter':'space','1':'1','2':'2','ArrowLeft':'1','ArrowRight':'2','Backspace':'undo'}[e.key];
    if(k) b=scr.querySelector('[data-key="'+k+'"]'); }
  if(b&&!b.disabled){ e.preventDefault(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); b.click(); }
});
