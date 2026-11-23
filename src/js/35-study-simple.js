/* Обычные карточки: один день изучения и ежедневное повторение. */
recallGoal=()=>({py:1,meaning:1,write:1});
const recallRowDoneStrict=recallRowDone;
recallRowDone=(row,phase)=>!!row?.legacyReadingDone||recallRowDoneStrict(row,phase);
recallPlan=function(k){
  if(!recallValid(k)||recallExcluded(k))return {stage:'excluded',phase:0};
  const e=recallState().entries[k];if(!e)return {stage:'learn',phase:1};
  const first=e.days?.[0];if(!recallRowDone(first,1))return {stage:'learn',phase:1};
  if(recallRowDone(e.reviews?.[todayStr()],4))return {stage:'wait',phase:4};
  return {stage:'review',phase:4};
};
recallCycleBanner=function(){
  const c=el('section','hero study-cycle-banner'),due=recallDue();
  c.innerHTML='<div class="kind">Карточки</div><h2>Учи и повторяй каждый день</h2><p class="note">Выбери урок, запомни чтение, перевод и написание, затем повторяй изученное.</p>';
  const b=el('button','btn',due.length?'Карточки на сегодня · '+due.length:'Выбрать урок');b.onclick=()=>go('cards');c.appendChild(b);return c;
};
viewRecallCards=function(s){
 const v=el('div','view study-cards-view');s.appendChild(v);if(State.route.run)return recallSessionView(v);
 const m=recallState();v.appendChild(el('h1','','Карточки'));v.appendChild(el('p','note','Выбери урок и учи слова. Каждый день повторяй уже изученное.'));
 const select=el('select');select.setAttribute('aria-label','Выбрать урок');for(let L=1;L<=NL;L++){const o=el('option','','Урок '+L);o.value=L;o.selected=m.lessons[0]===L;select.appendChild(o);}if(m.lessons.length!==1)m.lessons=[m.lessons[0]||1];select.value=m.lessons[0];select.onchange=()=>{m.lessons=[+select.value];save('meta');render();};v.appendChild(select);
 const facing=el('select');facing.setAttribute('aria-label','Начать с');
 for(const [value,label]of [['han','Начать с иероглифов'],['ru','Начать с перевода'],['py','Начать с пиньиня']]){
   const option=el('option','',label);option.value=value;facing.appendChild(option);
 }
 facing.value=m.facing||'han';facing.onchange=()=>{m.facing=facing.value;save('meta');};v.appendChild(facing);
 const label=el('label','setrow'),mix=el('input');mix.type='checkbox';mix.checked=!!m.mix;
 mix.onchange=()=>{m.mix=mix.checked;save('meta');};label.append(mix,document.createTextNode(' Перемешать карточки'));v.appendChild(label);
 const due=recallDue(),fresh=recallFresh(),ss=recallCurrentSession();
 if(ss&&ss.date===todayStr()){const b=el('button','btn blue','Продолжить');b.onclick=()=>go('cards',{run:true});v.appendChild(b);}
 const learn=el('button','btn','Учить урок · '+fresh.length);learn.disabled=!fresh.length;learn.onclick=()=>recallStart('new');v.appendChild(learn);
 const review=el('button','btn ghost','Повторить изученное · '+due.length);review.disabled=!due.length;review.onclick=()=>recallStart('today');v.appendChild(review);
};
function applyStudyUpdateV42(){
 const m=studyState();if(m.simpleCardsV42)return false;
 const previous=recallState();m.recall={v:1,lessons:previous.lessons?.slice(0,1)||[],unit:'words',includeKeys:true,entries:{},session:null};
 if(State.route.name==='cards'||State.route.name==='study')State.route={name:'cards'};
 m.simpleCardsV42=true;return true;
}
// Карточка соответствует словарной строке учебника; известные части не
// доказывают знание значения и чтения многознакового слова.
recallExcluded=function(k){
 if(isRad(k))return !!studyState().verifiedKnown?.[k]&&studyKnown(k);
 return !!studyState().verifiedKnown?.[k]&&!!studyState().known?.[k];
};
recallPool=function(){return uniq(recallState().lessons.flatMap(L=>textbookWords(L).map(w=>w.key)));};
recallDue=function(){return Object.keys(recallState().entries).filter(k=>!!BYK[k]&&recallPlan(k).stage==='review');};
recallFresh=function(){return recallPool().filter(k=>recallPlan(k).stage==='learn');};
function applyStudyUpdateV43(){
 const m=studyState();if(m.wordCardsV43)return false;
 const r=recallState();r.unit='words';r.includeKeys=false;
 // Остановить только старую порцию с отдельными знаками или ключами;
 // уже записанные результаты всех элементов сохраняются.
 if(r.session?.keys?.some(k=>!BYK[k]))r.session=null;
 for(const [id,ss]of Object.entries(r.paused||{}))if(ss.keys?.some(k=>!BYK[k]))delete r.paused[id];
 if(State.route.name==='cards'&&State.route.run&&!r.session)State.route={name:'cards'};
 m.wordCardsV43=true;return true;
}

function applyStudyUpdateV44(){
 const m=studyState();if(m.writingCardsV44)return false;
 const r=recallState();for(const e of Object.values(r.entries||{})){
   const row=e.days?.[0];if(row?.py?.streak>=1&&row?.meaning?.streak>=1&&!row.write?.passed)row.legacyReadingDone=true;
 }
 // Rebuild pending sessions so every new exercise includes writing.
 r.session=null;r.paused={};if(State.route.name==='cards'&&State.route.run)State.route={name:'cards'};
 m.writingCardsV44=true;return true;
}

function applyStudyUpdateV45(){
 const m=studyState();if(m.flashcardFacesV45)return false;
 const r=recallState();
 if(r.session?.v!==2)r.session=null;
 r.paused={};
 if(State.route.name==='cards'&&State.route.run&&!r.session)State.route={name:'cards'};
 m.flashcardFacesV45=true;return true;
}
