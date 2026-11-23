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
