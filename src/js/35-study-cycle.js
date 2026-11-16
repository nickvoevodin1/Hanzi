/* Один видимый цикл: три дня письма и два дня карточек. Чтение, избранное и бумажные отметки не дают знания карточек. */
function studyState(){
  const m=State.meta.study||(State.meta.study={v:1,difficult:{},reviews:{},global:{},session:null});
  for(const key of ['difficult','reviews','global','sessions'])if(!m[key]||typeof m[key]!=='object')m[key]={};
  return m;
}
function studyKnownChars(){
  const marks=State.meta.study?.known||{},chars=new Set();
  for(const k of Object.keys(marks))if(marks[k]&&!isRad(k))for(const ch of hanOf(BYK[k]?.s||k.replace(/^c:/,'')))chars.add(ch);
  return chars;
}
function studyKnown(k){
  const marks=State.meta.study?.known||{};if(marks[k])return true;if(isRad(k))return false;
  const chars=hanOf(BYK[k]?.s||k.replace(/^c:/,'')),known=studyKnownChars();return chars.length>0&&chars.every(ch=>known.has(ch));
}
function studyKnownButton(k,onchange){
  const b=el('button','linkbtn');const update=()=>{b.textContent=studyKnown(k)?'Уже знаю · отмечено':'Уже знаю';b.setAttribute('aria-pressed',String(studyKnown(k)));};
  b.onclick=()=>{const m=studyState();m.known=m.known||{};
    if(studyKnown(k)){
      if(isRad(k))delete m.known[k];
      else{const removed=new Set(hanOf(BYK[k]?.s||k.replace(/^c:/,'')));
        for(const id of Object.keys(m.known))if(!isRad(id)){const chars=hanOf(BYK[id]?.s||id.replace(/^c:/,''));if(chars.some(ch=>removed.has(ch))){delete m.known[id];for(const ch of chars)if(!removed.has(ch))m.known['c:'+ch]=todayStr();}}
      }
    }else m.known[k]=todayStr();
    save('meta');update();if(onchange)onchange();};update();return b;
}
function studyRememberedCounts(){
  const chars=studyKnownChars(),keys=new Set();
  const pool=uniq(Object.keys(State.meta.study?.known||{}).concat(Object.keys(State.cards),studyLearnedPool()));
  for(const k of pool){if(!studyKnown(k)&&isNew(k)&&(!notebookKey(k)||studyStatus(k).stage!=='done'))continue;
    if(isRad(k)){keys.add(k);continue;}if(BYK[k]||k.startsWith('c:'))for(const ch of hanOf(BYK[k]?.s||k.slice(2)))chars.add(ch);
  }
  return {chars:chars.size,keys:keys.size};
}
function studyRadicalBatch(){
  const m=studyState(),count=Math.max(0,Math.min(30,Number.isInteger(m.notebookRadicalCount)?m.notebookRadicalCount:5));
  let batch=m.radicalBatch;
  if(!batch||batch.day!==todayStr()||batch.count!==count)batch={day:todayStr(),count,keys:[]};
  const keys=batch.keys.filter(k=>!studyKnown(k)).slice(0,count);
  const candidates=KEY_ORDER.map(n=>'r:'+n).filter(k=>!studyKnown(k)&&!notebookStatus(k).finished&&!keys.includes(k));
  keys.push(...candidates.slice(0,Math.max(0,count-keys.length)));
  if(JSON.stringify(m.radicalBatch)!==JSON.stringify({...batch,keys})){m.radicalBatch={...batch,keys};save('meta');}
  return keys;
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
  return uniq(candidates).filter(k=>notebookKey(k)&&(isRad(k)||!!WORD_L[k]||k.startsWith('c:')&&!!CHAR_L[k.slice(2)])&&(!isNew(k)&&memoryValid(k)||memoryActuallyStarted(entries[k])||!!entries[k]?.notebook?.days?.some(d=>d&&['hz','py'].some(sk=>d[sk]?.done||d[sk]?.attempts?.length||d[sk]?.currentInk?.length||d[sk]?.ink?.length))))
    .sort((a,b)=>isRad(a)&&isRad(b)?radNum(a)-radNum(b):isRad(a)?1:isRad(b)?-1:(WORD_L[a]||CHAR_L[a.slice(2)]||99)-(WORD_L[b]||CHAR_L[b.slice(2)]||99));
}
function studyWrittenPool(){return Object.keys(State.meta.memory?.entries||{}).filter(k=>notebookKey(k)&&(isRad(k)||!!WORD_L[k]||k.startsWith('c:')&&!!CHAR_L[k.slice(2)])&&studyHasWriting(k));}
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
  const written=notebookCompletedDay(n.days[2]),credit=notebookData(k,false)?.credit,reviewFrom=credit?.reviewFrom||addDays(written,1),r=State.meta.study?.reviews?.[k]||{};
  const local=Object.keys(r.days||{}).filter(d=>d>=reviewFrom&&r.days[d]?.hz&&r.days[d]?.reading).sort().slice(0,2);
  if(local.length<2){const previous=local.at(-1)||addDays(reviewFrom,-1);return {stage:today>previous?'cards':'wait',day:4+local.length,availableOn:addDays(previous,1)};}
  return {stage:'done',day:5};
}
function studyAnswered(k,skill){return !!State.meta.study?.reviews?.[k]?.days?.[todayStr()]?.[skill];}
function studyQueue(mode,q){
  const learned=studyLearnedPool();
  let pool=mode==='today'?learned.filter(k=>studyStatus(k).stage==='cards'):studyWrittenPool();
  if(mode==='difficult')pool=uniq(pool.concat(learned.filter(studyIsDifficult))).filter(studyIsDifficult);
  const reviews=State.meta.study?.reviews||{};
  return pool.filter(k=>studyMatches(k,q)).sort((a,b)=>Number(studyIsDifficult(b))-Number(studyIsDifficult(a))||Number(reviews[b]?.lastGrade===1)-Number(reviews[a]?.lastGrade===1)||(reviews[a]?.lastAt||0)-(reviews[b]?.lastAt||0));
}
function studyWritingPool(q){return studyLearnedPool().filter(k=>!studyKnown(k)&&studyStatus(k).stage==='writing'&&studyMatches(k,q));}
function studyCycleBanner(){
  const c=el('section','hero study-cycle-banner'),writing=studyWritingPool(''),cards=studyQueue('today','');
  c.innerHTML='<div class="kind">Твой цикл памяти · 3 + 2</div><h2>Пишем. Вспоминаем. Закрепляем.</h2><p class="note">1–3-й дни: иероглифы ×10 и пиньинь ×10. 4–5-й: карточки этих слов. После пятого дня цикл завершён.</p>';
  const counts=studyRememberedCounts();c.appendChild(el('p','study-counts',`Запомнил: <b>${counts.chars}</b> ${plural(counts.chars,'иероглиф','иероглифа','иероглифов')} · <b>${counts.keys}</b> ${plural(counts.keys,'ключ','ключа','ключей')} из 214`));
  const days=el('div','study-week');for(let n=1;n<=5;n++)days.appendChild(el('span',n<=3?'writing':'recall',String(n)));c.appendChild(days);
  const b=el('button','btn',IC(cards.length?'cards':'brush',20)+' '+(cards.length?'Карточки на сегодня · '+cards.length:writing.length?'Прописи на сегодня · '+writing.length:'Мои прописи'));
  b.onclick=()=>go(cards.length?'cards':'study');c.appendChild(b);
  if(cards.length){const next=el('button','linkbtn','Выбрать уроки для прописей');next.onclick=()=>go('study');c.appendChild(next);}
  return c;
}
function studySearch(host,value,oninput){
  const input=el('input','search');input.type='search';input.placeholder='Иероглиф, перевод или пиньинь';input.setAttribute('aria-label','Поиск по иероглифу, переводу или пиньиню');input.value=value||'';input.oninput=()=>oninput(input.value);host.appendChild(input);return input;
}
function studyListRow(k,action){
  const info=notebookInfo(k),status=studyStatus(k),labels={writing:'Пропись · день ',cards:'Карточки · день ',wait:'Следующий день ',done:'Цикл завершён'};
  const row=el('button','row study-item',`<span class="ri han">${esc(info.hz)}</span><div class="tt"><b>${esc(info.ru)}</b><small class="py">${pinyinHTML(info.py)}</small><small>${status.stage==='wait'?fmtDate(status.availableOn):labels[status.stage]+(status.stage==='done'?'':status.day)}${studyIsDifficult(k)?' · сложный':''}</small></div>${IC('chev',18)}`);
  row.onclick=()=>action(k);return row;
}
function studyNotebookPool(){
  const lessons=State.meta.study?.notebookLessons||[];
  const words=(lessons.length?uniq(lessons.flatMap(L=>notebookPool('words',L))):studyLearnedPool()).filter(k=>!isRad(k)&&!studyKnown(k));
  return words.concat(studyRadicalBatch());
}
function notebookAdvance(k,queue){
  const pool=queue||studyNotebookPool(),at=pool.indexOf(k),ordered=pool.slice(at+1).concat(pool.slice(0,at<0?0:at));
  const next=ordered.find(id=>id!==k&&!studyKnown(id)&&notebookStatus(id).active!=null);
  if(next){go('notebook',{k:next,queue:pool,fromStudy:true});return true;}
  if(State.route.practice)notebookReturn();else render();
  toast('На сегодня выбранные слова прописаны');return false;
}
function viewStudy(s){
  const v=el('div','view study-list-view');s.appendChild(v);
  const back=el('button','back','‹ На путь');back.onclick=()=>go('path');v.appendChild(back);
  v.appendChild(el('h1','','Мои прописи'));
  v.appendChild(el('p','note','Выбери один или несколько уроков. После слов идут ключи по порядку; размер порции — в настройках. Без фильтра — уже пройденное. Три дня по 10 написаний и 10 пиньиня, затем карточки. Пропущенный день можно продолжить позже.'));
  const chooser=el('details','hero notebook-lesson-picker');chooser.appendChild(el('summary','','Выбрать уроки'));
  const selected=State.meta.study?.notebookLessons||[];
  const reset=el('button','linkbtn','Всё пройденное');reset.onclick=()=>{studyState().notebookLessons=[];save('meta');go('study');};chooser.appendChild(reset);
  const choices=el('div','chips');
  for(let L=1;L<=NL;L++){const label=el('label','chip'),input=el('input');input.type='checkbox';input.value=String(L);input.checked=selected.includes(L);input.setAttribute('aria-label','Урок '+L);input.onchange=()=>{studyState().notebookLessons=[...choices.querySelectorAll('input:checked')].map(x=>+x.value);save('meta');draw();};label.append(input,document.createTextNode(' Урок '+L));choices.appendChild(label);}chooser.appendChild(choices);v.appendChild(chooser);
  const result=el('div');studySearch(v,State.route.q,q=>{State.route.q=q;draw();Resume.later();});v.appendChild(result);
  function draw(){
    result.replaceChildren();const q=State.route.q||'',pool=studyNotebookPool().filter(k=>studyMatches(k,q));
    const groups=[['Сегодня пишем',pool.filter(k=>studyStatus(k).stage==='writing')],['Сегодня готово · расписание и история',pool.filter(k=>studyStatus(k).stage!=='writing')]];
    if(!pool.length){result.appendChild(el('p','empty',q?'Ничего не найдено.':'Сначала познакомься со словами или ключами на пути. Здесь появится только пройденное.'));return;}
    for(const [title,keys]of groups){if(!keys.length)continue;result.appendChild(el('h2','title',title+' · '+keys.length));const list=el('div','rowlist');keys.forEach(k=>list.appendChild(studyListRow(k,k=>go('notebook',{k,queue:pool,fromStudy:true}))));result.appendChild(list);}
  }draw();
}
function startStudyCards(mode,q,selected){
  mode=mode||'today';const m=studyState(),old=m.session,filterKey=mode+'|'+(q||'')+'|'+(selected||[]).join(',');
  if(old&&!old.finished&&old.day===todayStr())m.sessions[old.filterKey||old.mode+'||']=old;
  for(const key of Object.keys(m.sessions))if(m.sessions[key].day!==todayStr()||m.sessions[key].finished)delete m.sessions[key];
  const previous=m.sessions[filterKey];
  if(previous){m.session=previous;save('meta');go('cards',{run:true});return;}

  const eligible=studyQueue(mode,q),keys=(selected?selected.filter(k=>eligible.includes(k)):eligible).slice(0,10),tasks=[];
  for(const skill of ['hz','reading'])for(const k of keys){
    const status=studyStatus(k),kind=status.stage==='cards'?'local':'free';
    if(mode==='today'&&studyAnswered(k,skill))continue;
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
  v.appendChild(el('p','note','После трёх дней письма — два дня карточек этих слов. На этом цикл завершён. Сложные идут первыми и получают дополнительную попытку. В «Все» можно заниматься в любой день.'));
  const mode=['today','difficult','all'].includes(State.route.mode)?State.route.mode:'today',chips=el('div','chips');
  for(const [id,title]of[['today','Сегодня'],['difficult','Сложные'],['all','Все']]){const b=el('button','chip'+(id===mode?' on':''),title);b.onclick=()=>go('cards',{mode:id,q:State.route.q||''});chips.appendChild(b);}v.appendChild(chips);
  const result=el('div');studySearch(v,State.route.q,q=>{State.route.q=q;draw();Resume.later();});v.appendChild(result);
  function draw(){
    result.replaceChildren();const pool=studyQueue(mode,State.route.q),current=studyState().session;
    if(current&&!current.finished){const resume=el('button','btn blue','Продолжить карточки');resume.onclick=()=>go('cards',{run:true});result.appendChild(resume);}
    if(pool.length){const start=el('button','btn','Повторить · '+Math.min(10,pool.length)+' из '+pool.length);start.style.margin='12px 0';start.onclick=()=>startStudyCards(mode,State.route.q);result.appendChild(start);const list=el('div','rowlist');pool.forEach(k=>list.appendChild(studyListRow(k,k=>startStudyCards(mode,State.route.q,[k]))));result.appendChild(list);}
    else result.appendChild(el('p','empty',State.route.q?'Ничего не найдено.':mode==='difficult'?'Отмечай сложные знаки флажком во время письма.':mode==='today'?'Сегодняшние карточки выполнены или ещё не открылись. После третьего дня письма начнутся два дня карточек. Во вкладке «Все» доступны ранее прописанные знаки.':'Пока нет прописанных знаков. Начни с прописей на главной.'));
  }draw();
}

// Разовая отметка по просьбе Никиты. Дата — дата сообщения о письме,
// а не выдуманные даты трёх прежних занятий. Знание и XP не выставляются.
function studyLesson14Words(){return uniq([1,2,3,4].flatMap(L=>lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words))).map(w=>w.key)).filter(memoryValid);}
function applyStudyUpdateV30(){
  const m=studyState();let changed=false;
  // Сохраняем старую историю global, но прекращаем незаконченные общие круги.
  if(m.session?.tasks?.some(x=>x.kind==='global')){
    m.session=null;changed=true;
    if(State.route.name==='cards')State.route={name:'cards',mode:'today'};
  }
  for(const [id,ss]of Object.entries(m.sessions))if(ss?.tasks?.some(x=>x.kind==='global')){delete m.sessions[id];changed=true;}
  m.adjustments=m.adjustments||{};
  if(m.adjustments.lesson14WritingV30)return changed;
  const words=studyLesson14Words(),reportedOn=todayStr();
  for(const k of words){
    const notebook=notebookData(k,true);
    for(let day=0;day<3;day++){
      const row=notebookRow(k,day,true);
      for(const skill of ['hz','py'])if(!row[skill].done)Object.assign(row[skill],{done:true,source:'paper',reported:true,paperCount:NOTEBOOK_REPEATS,date:reportedOn,at:Date.now()});
    }
    notebook.credit={source:'user',days:3,reportedOn,reviewFrom:reportedOn,lessons:[1,2,3,4]};
  }
  m.adjustments.lesson14WritingV30={reportedOn,words:words.length};
  return true;
}

function applyCoreCurriculumV34(){
  const m=studyState();if(m.coreCurriculumV34)return false;
  const allowed=k=>isRad(k)||!!WORD_L[k]||k?.startsWith('c:')&&!!CHAR_L[k.slice(2)];
  if(m.session?.tasks?.some(t=>!allowed(t.k))){m.session=null;if(State.route.name==='cards')State.route={name:'cards'};}
  for(const [id,ss]of Object.entries(m.sessions))if(ss?.tasks?.some(t=>!allowed(t.k)))delete m.sessions[id];
  const classroom=State.meta.classroom;
  if(classroom){
    const stale=ss=>ss?.config&&ss.queue?.some(x=>!classroomPool(ss.config).some(y=>y.id===x.id));
    if(stale(classroom.session)){classroom.session=null;if(State.route.name==='classroom')State.route={name:'path'};}
    for(const [id,ss]of Object.entries(classroom.sessions||{}))if(stale(ss))delete classroom.sessions[id];
    for(const block of Object.values(classroom.progress||{}))for(const row of Object.values(block))delete row.targetIds;
  }
  if(State.route.name==='notebook'&&(!allowed(State.route.k)||State.route.queue?.some(k=>!allowed(k))))State.route={name:'study'};
  m.coreCurriculumV34=true;return true;
}
