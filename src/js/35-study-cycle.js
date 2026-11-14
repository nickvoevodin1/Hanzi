/* Один видимый цикл: три реальных дня письма, два закрепления, два общего
   повторения. Чтение, избранное и бумажные отметки не дают знания карточек. */
function studyState(){
  const m=State.meta.study||(State.meta.study={v:1,difficult:{},reviews:{},global:{},session:null});
  for(const key of ['difficult','reviews','global','sessions'])if(!m[key]||typeof m[key]!=='object')m[key]={};
  return m;
}
function studySearchText(s){return toneless(String(s||'').toLowerCase().replace(/u:/g,'v')).replace(/[0-5]/g,'');}
function studyMatches(k,q){
  q=String(q||'').trim().toLowerCase();if(!q)return true;
  const i=notebookInfo(k);if(!i)return false;
  const py=studySearchText(q);
  return i.hz.includes(q)||i.ru.toLowerCase().includes(q)||!!(py&&studySearchText(i.py).includes(py));
}
function studyHasWriting(k){return !!notebookData(k,false)?.days?.some(d=>d?.hz?.done);}
function studyLearnedPool(){
  const entries=State.meta.memory?.entries||{}, candidates=semWords().concat(KEY_ORDER.map(n=>'r:'+n),Object.keys(entries));
  return uniq(candidates).filter(k=>notebookKey(k)&&(!isNew(k)&&memoryValid(k)||memoryActuallyStarted(entries[k])||!!entries[k]?.notebook?.days?.some(d=>d&&['hz','py'].some(sk=>d[sk]?.done||d[sk]?.attempts?.length||d[sk]?.currentInk?.length||d[sk]?.ink?.length))))
    .sort((a,b)=>isRad(a)&&isRad(b)?radNum(a)-radNum(b):isRad(a)?1:isRad(b)?-1:(WORD_L[a]||CHAR_L[a.slice(2)]||99)-(WORD_L[b]||CHAR_L[b.slice(2)]||99));
}
function studyWrittenPool(){return Object.keys(State.meta.memory?.entries||{}).filter(k=>notebookKey(k)&&studyHasWriting(k));}
function studyIsDifficult(k){
  const marks=State.meta.study?.difficult||{};if(marks[k])return true;
  return !isRad(k)&&hanOf(notebookInfo(k)?.hz||'').some(ch=>marks[notebookKey(ch)]||marks['c:'+ch]);
}
function studyToggleDifficult(k){
  k=notebookKey(k);if(!k)return;
  const marks=studyState().difficult;if(studyIsDifficult(k)){delete marks[k];if(!isRad(k))for(const ch of hanOf(notebookInfo(k)?.hz||'')){delete marks[notebookKey(ch)];delete marks['c:'+ch];}}else marks[k]=todayStr();save('meta');
}
function studyDifficultButton(k){
  const b=el('button','linkbtn study-difficult');
  const update=()=>{const on=studyIsDifficult(k);b.innerHTML=IC('flag',16)+' '+(on?'Сложный · отмечено':'Отметить как сложный');b.setAttribute('aria-pressed',String(on));};
  b.onclick=()=>{studyToggleDifficult(k);update();};update();return b;
}
function studyStatus(k){
  const n=notebookStatus(k),today=todayStr();
  if(!n.finished)return {stage:n.active==null?'wait':'writing',day:n.complete+1,availableOn:n.availableOn};
  const written=notebookCompletedDay(n.days[2]),r=State.meta.study?.reviews?.[k]||{};
  const local=Object.keys(r.days||{}).filter(d=>d>written&&r.days[d]?.hz&&r.days[d]?.reading).sort().slice(0,2);
  if(local.length<2){const previous=local.at(-1)||written;return {stage:today>previous?'cards':'wait',day:4+local.length,availableOn:addDays(previous,1)};}
  const globals=Object.keys(State.meta.study?.global||{}).filter(d=>d>local[1]&&State.meta.study.global[d]?.completed).sort().slice(0,2);
  if(globals.length<2){const previous=globals.at(-1)||local[1];return {stage:today>previous?'global':'wait',day:6+globals.length,availableOn:addDays(previous,1)};}
  return {stage:'done',day:7};
}
function studyGlobalRound(create){
  const m=create?studyState():State.meta.study,today=todayStr();let round=m?.global?.[today];
  if(!round&&create){const targets=studyWrittenPool();round=m.global[today]={targets,answers:{},completed:false};}
  return round||null;
}
function studyGlobalNeeded(){
  if(studyLearnedPool().some(k=>studyStatus(k).stage==='global'))return true;
  // После первого полного цикла два общих дня возвращаются каждую неделю,
  // даже если новых слов больше нет. Пропуск сдвигает пару, а не засчитывает её.
  const completed=Object.keys(State.meta.study?.global||{}).filter(d=>State.meta.study.global[d]?.completed).sort();
  if(!completed.length||!studyWrittenPool().length)return false;
  const last=completed.at(-1),today=todayStr();
  return completed.length%2?today>last:today>=addDays(last,6);
}
function studyAnswered(k,skill,kind){
  const today=todayStr();return !!(kind==='global'?studyGlobalRound(false)?.answers?.[k]?.[skill]:State.meta.study?.reviews?.[k]?.days?.[today]?.[skill]);
}
function studyQueue(mode,q){
  const learned=studyLearnedPool(),global=studyGlobalNeeded(),round=studyGlobalRound(false);
  let pool=mode==='today'?(global?(round?.targets||studyWrittenPool()).filter(k=>!['hz','reading'].every(sk=>studyAnswered(k,sk,'global'))):[]):studyWrittenPool();
  if(mode==='today')pool=uniq(learned.filter(k=>studyStatus(k).stage==='cards').concat(pool));
  if(mode==='difficult')pool=uniq(pool.concat(learned.filter(studyIsDifficult))).filter(studyIsDifficult);
  const reviews=State.meta.study?.reviews||{};
  return pool.filter(k=>studyMatches(k,q)).sort((a,b)=>Number(studyIsDifficult(b))-Number(studyIsDifficult(a))||Number(reviews[b]?.lastGrade===1)-Number(reviews[a]?.lastGrade===1)||(reviews[a]?.lastAt||0)-(reviews[b]?.lastAt||0));
}
function studyWritingPool(q){return studyLearnedPool().filter(k=>studyStatus(k).stage==='writing'&&studyMatches(k,q));}
function studyCycleBanner(){
  const c=el('section','hero study-cycle-banner'),writing=studyWritingPool(''),cards=studyQueue('today','');
  c.innerHTML='<div class="kind">Твой цикл памяти · 3 + 2 + 2</div><h2>Пишем. Вспоминаем. Закрепляем.</h2><p class="note">1–3-й дни: иероглифы ×10 и пиньинь ×10. 4–5-й: карточки этих слов. 6–7-й: всё ранее прописанное.</p>';
  const days=el('div','study-week');for(let n=1;n<=7;n++)days.appendChild(el('span',n<=3?'writing':n<=5?'recall':'total',String(n)));c.appendChild(days);
  const b=el('button','btn',IC(writing.length?'brush':'cards',20)+' '+(writing.length?'Прописи на сегодня · '+writing.length:cards.length?'Карточки на сегодня · '+cards.length:'Мои прописи'));
  b.onclick=()=>go(writing.length||!cards.length?'study':'cards');c.appendChild(b);
  if(writing.length&&cards.length){const next=el('button','linkbtn','Карточки на сегодня · '+cards.length);next.onclick=()=>go('cards');c.appendChild(next);}
  return c;
}
function studySearch(host,value,oninput){
  const input=el('input','search');input.type='search';input.placeholder='Иероглиф, перевод или пиньинь';input.setAttribute('aria-label','Поиск по иероглифу, переводу или пиньиню');input.value=value||'';input.oninput=()=>oninput(input.value);host.appendChild(input);return input;
}
function studyListRow(k,action,globalReview){
  const info=notebookInfo(k),status=studyStatus(k),labels={writing:'Пропись · день ',cards:'Карточки · день ',global:'Общее повторение · день ',wait:'Следующий день ',done:'Цикл завершён'};
  const row=el('button','row study-item',`<span class="ri han">${esc(info.hz)}</span><div class="tt"><b>${esc(info.ru)}</b><small class="py">${pinyinHTML(info.py)}</small><small>${globalReview&&status.stage!=='cards'?'Общее повторение':status.stage==='wait'?fmtDate(status.availableOn):labels[status.stage]+(status.stage==='done'?'':status.day)}${studyIsDifficult(k)?' · сложный':''}</small></div>${IC('chev',18)}`);
  row.onclick=()=>action(k);return row;
}
function viewStudy(s){
  const v=el('div','view study-list-view');s.appendChild(v);
  const back=el('button','back','‹ На путь');back.onclick=()=>go('path');v.appendChild(back);
  v.appendChild(el('h1','','Мои прописи'));
  v.appendChild(el('p','note','Слова и ключи из пройденного. Три дня по 10 написаний и 10 пиньиня, затем карточки. Пропущенный день можно продолжить позже.'));
  const result=el('div');studySearch(v,State.route.q,q=>{State.route.q=q;draw();Resume.later();});v.appendChild(result);
  function draw(){
    result.replaceChildren();const q=State.route.q||'',pool=studyLearnedPool().filter(k=>studyMatches(k,q));
    const groups=[['Сегодня пишем',pool.filter(k=>studyStatus(k).stage==='writing')],['Сегодня готово · расписание и история',pool.filter(k=>studyStatus(k).stage!=='writing')]];
    if(!pool.length){result.appendChild(el('p','empty',q?'Ничего не найдено.':'Сначала познакомься со словами или ключами на пути. Здесь появится только пройденное.'));return;}
    for(const [title,keys]of groups){if(!keys.length)continue;result.appendChild(el('h2','title',title+' · '+keys.length));const list=el('div','rowlist');keys.forEach(k=>list.appendChild(studyListRow(k,k=>go('notebook',{k,fromStudy:true}))));result.appendChild(list);}
  }draw();
}
function startStudyCards(mode,q,selected){
  mode=mode||'today';const m=studyState(),old=m.session,filterKey=mode+'|'+(q||'')+'|'+(selected||[]).join(',');
  if(old&&!old.finished&&old.day===todayStr())m.sessions[old.filterKey||old.mode+'||']=old;
  for(const key of Object.keys(m.sessions))if(m.sessions[key].day!==todayStr()||m.sessions[key].finished)delete m.sessions[key];
  const previous=m.sessions[filterKey];
  if(previous){m.session=previous;save('meta');go('cards',{run:true});return;}

  if(studyGlobalNeeded())studyGlobalRound(true);
  const eligible=studyQueue(mode,q),keys=(selected?selected.filter(k=>eligible.includes(k)):eligible).slice(0,10),tasks=[];
  for(const skill of ['hz','reading'])for(const k of keys){
    const status=studyStatus(k),kind=status.stage==='cards'?'local':studyGlobalNeeded()&&studyGlobalRound(false)?.targets?.includes(k)?'global':'free';
    if(mode==='today'&&studyAnswered(k,skill,kind))continue;
    tasks.push({k,skill,kind,retry:false});
  }
  if(!tasks.length){toast('На сегодня всё. Можно повторить карточки из вкладки «Все».');return;}
  m.session={mode,q:q||'',filterKey,keys,tasks,index:0,revealed:false,finished:false,first:0,correct:0,day:todayStr(),started:Date.now()};save('meta');go('cards',{run:true});
}
function studyGrade(grade){
  const m=studyState(),ss=m.session,x=ss?.tasks[ss.index];if(!x||!ss.revealed||ss.finished||![1,2,3].includes(grade))return false;
  // Полночь не переносит вчерашние отметки на новый учебный день.
  if(ss.day!==todayStr()){ss.finished=true;save('meta');go('cards',{mode:ss.mode,q:ss.q||''});toast('Начался новый день. Открой сегодняшние карточки.');return false;}
  const r=m.reviews[x.k]||(m.reviews[x.k]={skills:{},days:{}});r.skills=r.skills||{};r.days=r.days||{};
  if(!x.retry){
    ss.first++;if(grade>=2)ss.correct++;
    const previous=r.skills[x.skill];if(!previous?.state||previous.due<=Date.now()||grade===1)r.skills[x.skill]=FSRS.review(previous||{},grade,REQ);
    r.lastAt=Date.now();r.lastGrade=grade;
    if(x.kind==='local'&&['cards','wait'].includes(studyStatus(x.k).stage)){
      const d=r.days[todayStr()]||(r.days[todayStr()]={});d[x.skill]=grade;
    }
    const activeGlobal=studyGlobalRound(false);
    if(x.kind==='global'||x.kind==='local'&&activeGlobal?.targets?.includes(x.k)){
      const round=activeGlobal||studyGlobalRound(true),d=round.answers[x.k]||(round.answers[x.k]={});d[x.skill]=grade;
      round.completed=round.targets.length>0&&round.targets.every(k=>round.answers[k]?.hz&&round.answers[k]?.reading);
    }
    D().t++;if(grade>=2){D().ok++;addXP(2);}save('meta');
    if(grade===1||studyIsDifficult(x.k)){
      const retry={...x,retry:true};ss.tasks.splice(Math.min(ss.tasks.length,ss.index+4),0,retry);
    }
  }
  ss.index++;ss.revealed=false;ss.finished=ss.index>=ss.tasks.length;save('meta');render();return true;
}
function studyCardsRun(v){
  const ss=studyState().session;if(!ss){go('cards');return;}
  const back=el('button','back','‹ К карточкам');back.onclick=()=>go('cards',{mode:ss.mode,q:ss.q||''});v.appendChild(back);
  if(ss.finished){v.appendChild(el('div','',mascot('happy',100)));v.appendChild(el('h1','','Круг завершён!'));v.appendChild(el('p','note','С первого раза вспомнил: '+ss.correct+' из '+ss.first+'. Ошибки потренировали ещё раз.'));const next=el('button','btn','Продолжить');next.onclick=()=>{studyState().session=null;save('meta');go('cards',{mode:ss.mode,q:ss.q||''});};v.appendChild(next);return;}
  const x=ss.tasks[ss.index],info=notebookInfo(x.k);v.appendChild(el('p','eyebrow',(x.retry?'Ещё одна попытка':'Вспоминаем по памяти')+' · '+(ss.index+1)+' / '+ss.tasks.length));
  v.appendChild(el('div','study-progress',`<i style="width:${Math.round(ss.index/ss.tasks.length*100)}%"></i>`));
  const card=el('div','hero study-flashcard');
  card.appendChild(el('p','kind',x.skill==='hz'?'Вспомни иероглифы и пиньинь':'Вспомни пиньинь и перевод'));
  card.appendChild(el('h2',x.skill==='reading'?'han':'',esc(x.skill==='hz'?info.ru:info.hz)));
  if(!ss.revealed){card.appendChild(el('p','note',x.skill==='hz'?'Напиши в воздухе или в тетради, затем проверь.':'Произнеси вслух с тонами, затем проверь.'));const show=el('button','btn','Проверить себя');show.dataset.key='space';show.onclick=()=>{ss.revealed=true;save('meta');render();};card.appendChild(show);}
  else{
    card.appendChild(el('div','han study-answer',esc(info.hz)));card.appendChild(el('div','py',pinyinHTML(info.py)));card.appendChild(el('p','tr',esc(info.ru)));
    const speak=el('button','linkbtn',IC('speaker',18)+' Послушать');speak.onclick=()=>Speech.say(info.hz,undefined,info.py);card.appendChild(speak);
    const grades=el('div','study-grades');for(const [g,label]of[[1,'Не вспомнил'],[2,'С трудом'],[3,'Помню']]){const b=el('button','btn '+(g===3?'':'ghost'),label);b.dataset.ch=String(g);b.onclick=()=>studyGrade(g);grades.appendChild(b);}card.appendChild(grades);
  }
  card.appendChild(studyDifficultButton(x.k));v.appendChild(card);
}
function viewStudyCards(s){
  const v=el('div','view study-cards-view');s.appendChild(v);if(State.route.run)return studyCardsRun(v);
  v.appendChild(el('h1','','Карточки'));
  v.appendChild(el('p','note','4–5-й дни — прописанные слова. 6–7-й — всё ранее прописанное. Сложные идут первыми и получают дополнительную попытку. Два общих дня повторяются каждую неделю. В «Все» можно заниматься в любой день.'));
  const mode=['today','difficult','all'].includes(State.route.mode)?State.route.mode:'today',chips=el('div','chips');
  for(const [id,title]of[['today','Сегодня'],['difficult','Сложные'],['all','Все']]){const b=el('button','chip'+(id===mode?' on':''),title);b.onclick=()=>go('cards',{mode:id,q:State.route.q||''});chips.appendChild(b);}v.appendChild(chips);
  const result=el('div');studySearch(v,State.route.q,q=>{State.route.q=q;draw();Resume.later();});v.appendChild(result);
  function draw(){
    result.replaceChildren();const pool=studyQueue(mode,State.route.q),current=studyState().session,globalReview=mode==='today'&&studyGlobalNeeded();
    if(current&&!current.finished){const resume=el('button','btn blue','Продолжить карточки');resume.onclick=()=>go('cards',{run:true});result.appendChild(resume);}
    if(pool.length){const start=el('button','btn','Повторить · '+Math.min(10,pool.length)+' из '+pool.length);start.style.margin='12px 0';start.onclick=()=>startStudyCards(mode,State.route.q);result.appendChild(start);const list=el('div','rowlist');pool.forEach(k=>list.appendChild(studyListRow(k,k=>startStudyCards(mode,State.route.q,[k]),globalReview)));result.appendChild(list);}
    else result.appendChild(el('p','empty',State.route.q?'Ничего не найдено.':mode==='difficult'?'Отмечай сложные знаки флажком во время письма.':mode==='today'?'Сегодняшние карточки выполнены или ещё не открылись. После третьего дня письма начнутся два дня карточек. Во вкладке «Все» доступны ранее прописанные знаки.':'Пока нет прописанных знаков. Начни с прописей на главной.'));
  }draw();
}
