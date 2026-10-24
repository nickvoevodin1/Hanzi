/*==================================================================
  РОУТЕР И НАВИГАЦИЯ
==================================================================*/
const TAB_OF={home:'home',lessons:'lessons',lesson:'lessons',extra:'lessons',strokes:'keys',tests:'tests',test:'tests',keys:'keys',radical:'keys',dict:'dict',list:'dict'};
function go(name,params){
  State.route={name,...params}; if(TAB_OF[name]) State.tab=TAB_OF[name];
  closeSheet(); clearTimeout(playT); Speech.stop(); render(); window.scrollTo(0,0);
}
function render(){
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.nav===State.tab));
  $('#topSub').textContent='Кондрашевский · урок группы '+State.settings.lesson;
  const V={home:viewHome,lessons:viewLessons,lesson:viewLesson,extra:viewExtra,strokes:viewStrokes,card:viewCard,session:viewSession,draw:viewDraw,
    tests:viewTests,test:viewTest,keys:viewKeys,radical:viewRadical,dict:viewDict,list:viewList,settings:viewSettings};
  const s=$('#screen'); s.innerHTML=''; (V[State.route.name]||viewHome)(s);
}
$('#nav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) go(b.dataset.nav); });
$('#btnSettings').onclick=()=>go('settings');
// Клавиатура: Пробел/Enter — показать/дальше, 1/← — не помню, 2/→ — помню, 1–4 — варианты, Backspace — отменить
document.addEventListener('keydown',e=>{
  if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if(!$('#sheet').hidden){ if(e.key==='Escape') closeSheet(); return; }
  const scr=$('#screen'); let b=null;
  if(/^[1-4]$/.test(e.key)) b=scr.querySelector('[data-ch="'+e.key+'"]');
  if(!b){ const k={' ':'space','Enter':'space','1':'1','2':'2','ArrowLeft':'1','ArrowRight':'2','Backspace':'undo'}[e.key];
    if(k) b=scr.querySelector('[data-key="'+k+'"]'); }
  if(b&&!b.disabled){ e.preventDefault(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); b.click(); }
});

