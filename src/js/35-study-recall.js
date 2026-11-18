/* Карточки → проверенное письмо → ежедневное накопительное повторение.
   Отдельное состояние: прежние прописи и FSRS-карточки не переписываются. */
const POSOBIE_KEYS=/*__LESSON_KEYS__*/;
function recallState(){
  const m=studyState();if(!m.recall)m.recall={v:1,lessons:(m.notebookLessons||[]).slice(),unit:'words',includeKeys:true,entries:{},session:null};
  return m.recall;
}
function recallValid(k){return isRad(k)?!!RADS[radNum(k)-1]:k?.startsWith('c:')?!!CHAR_L[k.slice(2)]:!!WORD_L[k];}
function recallVerifiedChars(){
  const m=studyState(),out=new Set();
  for(const [k,proof]of Object.entries(m.verifiedKnown||{}))if(proof&&studyKnown(k)&&!isRad(k))for(const ch of hanOf(BYK[k]?.s||k.replace(/^c:/,'')))out.add(ch);
  return out;
}
function recallExcluded(k){
  if(isRad(k))return !!studyState().verifiedKnown?.[k]&&studyKnown(k);
  const chars=hanOf(notebookInfo(k)?.hz||''),known=recallVerifiedChars();return chars.length>0&&chars.every(ch=>known.has(ch));
}
function recallLessonKeys(L){return (POSOBIE_KEYS[L]||[]).map(x=>'r:'+x.n);}
function recallInfo(k){
  const info=notebookInfo(k);if(!info)return null;
  if(!isRad(k))return {...info,forms:hanOf(info.hz)};
  const n=radNum(k),source=Object.entries(POSOBIE_KEYS).find(([,rows])=>rows.some(x=>x.n===n)),row=source?.[1].find(x=>x.n===n),available=(RADW[n]||[]).map(x=>x[0]);
  const forms=uniq(hanOf(row?.form||'').filter(ch=>available.includes(ch)));
  if(!forms.length)forms.push(available[0]||RADS[n-1][4][0]);
  return {...info,hz:forms.join(' / '),forms,label:'Ключ №'+n+(source?' · пособие, урок '+source[0]:' · таблица ключей')};
}
function recallPool(){
  const m=recallState(),lessons=m.lessons.filter(L=>L>=1&&L<=NL).slice().sort((a,b)=>a-b),out=[];
  for(const L of lessons){
    const words=lessonWords(L),vocab=m.unit==='chars'?uniq(words.flatMap(w=>hanOf(w.s))).map(ch=>'c:'+ch):words.map(w=>w.key);
    out.push(...vocab);if(m.includeKeys)out.push(...recallLessonKeys(L));
  }
  return uniq(out).filter(k=>recallValid(k)&&!recallExcluded(k));
}
function recallGoal(phase){return {py:phase===1?3:phase===4?1:2,meaning:phase===1?3:phase===4?1:2,write:phase===1?0:1};}
function recallRowDone(row,phase){const goal=recallGoal(phase);return !!row&&row.py?.streak>=goal.py&&row.meaning?.streak>=goal.meaning&&(!goal.write||row.write?.passed===true);}
function recallPlan(k){
  if(!recallValid(k)||recallExcluded(k))return {stage:'excluded',phase:0};
  const e=recallState().entries[k],days=e?.days||[],today=todayStr();let complete=0;
  while(complete<3&&recallRowDone(days[complete],complete+1))complete++;
  const last=complete?days[complete-1].date:'';
  if(last&&today<=last)return {stage:'wait',phase:complete<3?complete+1:4,availableOn:addDays(last,1),complete};
  if(complete<3)return {stage:'learn',phase:complete+1,complete};
  return {stage:recallRowDone(e.reviews?.[today],4)?'wait':'review',phase:4,complete,availableOn:addDays(today,1)};
}
function recallDue(){return Object.keys(recallState().entries).filter(k=>['learn','review'].includes(recallPlan(k).stage));}
function recallFresh(){return recallPool().filter(k=>!recallState().entries[k]);}
function recallOrder(keys){const es=recallState().entries;return keys.slice().sort((a,b)=>Number(studyIsDifficult(b))-Number(studyIsDifficult(a))||Number(es[b]?.lastGrade===1)-Number(es[a]?.lastGrade===1)||(es[a]?.lastAt||0)-(es[b]?.lastAt||0));}
function recallPickFresh(n){
  // Rotate selected lessons; neither the old lesson nor radicals swallow a whole portion.
  const pool=recallFresh(),lessons=recallState().lessons.slice().sort((a,b)=>a-b),chosen=[];
  const buckets=lessons.map(L=>pool.filter(k=>isRad(k)?recallLessonKeys(L).includes(k):recallState().unit==='chars'?hanOf(lessonWords(L).map(w=>w.s).join('')).includes(k.slice(2)):lessonWords(L).some(w=>w.key===k)));
  while(chosen.length<n&&buckets.some(b=>b.length))for(const b of buckets){for(let j=b.length-1;j>=0;j--)if(chosen.includes(b[j]))b.splice(j,1);if(b.length&&chosen.length<n){const words=b.filter(k=>!isRad(k)),keys=b.filter(isRad),preferKey=chosen.length%3===2;const k=(preferKey?keys[0]||words[0]:words[0]||keys[0]);chosen.push(k);b.splice(b.indexOf(k),1);}}
  return chosen;
}
function recallData(k,goal,create){
  let e=recallState().entries[k];if(!e&&create)e=recallState().entries[k]={started:todayStr(),days:[],reviews:{},skills:{},familiar:false};if(!e)return null;
  const bag=goal.phase===4?(e.reviews||(e.reviews={})):(e.days||(e.days=[])),id=goal.phase===4?goal.date:goal.phase-1;
  if(bag[id]&&create&&bag[id].date!==goal.date&&!recallRowDone(bag[id],goal.phase)){
    e.attemptHistory=(e.attemptHistory||[]).concat({phase:goal.phase,...bag[id]}).slice(-30);delete bag[id];
  }
  if(!bag[id]&&create)bag[id]={date:goal.date,py:{streak:0,tries:0},meaning:{streak:0,tries:0},write:{passed:false,tries:0}};
  return bag[id]||null;
}
function recallCurrentSession(){const ss=recallState().session;return ss&&!ss.finished?ss:null;}
function recallTasks(ss){
  ss.practiceQueue=(ss.practiceQueue||[]).filter(x=>recallValid(x.k)&&!recallExcluded(x.k));
  if(ss.practiceQueue.length)return ss.practiceQueue.slice();
  const out=[];
  for(const k of ss.keys){
    if(!recallValid(k)||recallExcluded(k)||ss.deferred?.includes(k))continue;
    const e=recallState().entries[k],goal=ss.goals[k];if(!e||!goal)continue;
    if(!e.familiar){out.push({k,skill:'intro'});continue;}
    const row=recallData(k,goal,false),need=recallGoal(goal.phase);
    for(const skill of ['py','meaning'])if((row?.[skill]?.streak||0)<need[skill])out.push({k,skill});
  }
  // Read first on days2/3, then reverse the cue. Writing never substitutes for reading.
  if(out.some(x=>x.skill==='intro'))return out.filter(x=>x.skill==='intro');
  if(out.length)return out;
  for(const k of ss.keys){if(!recallValid(k)||recallExcluded(k)||ss.deferred?.includes(k))continue;const goal=ss.goals[k];if(goal&&recallGoal(goal.phase).write&&!recallData(k,goal,false)?.write?.passed)out.push({k,skill:'write'});}
  return out;
}
function recallAdvance(ss){
  const tasks=recallTasks(ss),recent=ss.recent||[],previous=ss.previous;
  const x=tasks.find(x=>!recent.includes(x.k))||tasks.find(x=>x.k!==previous?.k)||tasks.find(x=>x.skill!==previous?.skill)||tasks[0];
  ss.current=x?{...x,id:++ss.serial}:null;ss.revealed=false;ss.finished=!x;
  if(ss.finished)ss.completed=ss.keys.filter(k=>!recallExcluded(k)&&recallRowDone(recallData(k,ss.goals[k],false),ss.goals[k].phase));
}
function recallStart(mode,selected){
  mode=mode||'today';const m=recallState(),old=m.session,context=mode+'|'+(selected||[]).join(',')+(mode==='new'?'|'+m.unit+'|'+m.lessons.join(',')+'|'+m.includeKeys:'');
  for(const [id,s]of Object.entries(m.paused||{}))if(s.date!==todayStr())delete m.paused[id];
  if(old&&!old.finished&&old.date===todayStr()&&!selected&&old.context===context){go('cards',{run:true});return;}
  if(old&&!old.finished&&old.date===todayStr()){m.paused=m.paused||{};m.paused[old.context]=old;}
  if(m.paused?.[context]?.date===todayStr()&&!m.paused[context].finished){m.session=m.paused[context];delete m.paused[context];save('meta');go('cards',{run:true});return;}
  const due=recallOrder(recallDue()),fresh=recallPickFresh(5);let keys;
  if(selected)keys=uniq(selected).filter(k=>recallValid(k)&&!recallExcluded(k)&&(due.includes(k)||recallFresh().includes(k)||mode==='catalog'&&isRad(k))).slice(0,5);
  else if(mode==='new')keys=fresh;
  else if(mode==='difficult')keys=due.filter(studyIsDifficult).slice(0,5);
  else keys=due.slice(0,5);
  if(!keys.length&&mode==='today')keys=fresh;
  if(!keys.length){toast('На сегодня эта порция завершена. Можно выбрать другой урок.');return false;}
  const ss={v:1,mode,context,keys,goals:{},date:todayStr(),serial:0,current:null,recent:[],attempts:0,correct:0,revealed:false,finished:false,deferred:[]};
  for(const k of keys){const plan=recallPlan(k);ss.goals[k]={phase:plan.phase,date:ss.date};recallData(k,ss.goals[k],true);}
  m.session=ss;recallAdvance(ss);save('meta');go('cards',{run:true});return true;
}
function recallSessionReady(){
  const ss=recallCurrentSession();if(!ss)return null;
  if(ss.date!==todayStr()){ss.finished=true;ss.stale=true;save('meta');return null;}
  if(ss.current&&recallExcluded(ss.current.k)){recallAdvance(ss);save('meta');}
  return ss.finished?null:ss;
}
function recallIntro(){const ss=recallSessionReady(),x=ss?.current;if(!x||x.skill!=='intro')return false;recallState().entries[x.k].familiar=true;ss.previous=x;ss.recent=(ss.recent||[]).concat(x.k).slice(-3);recallAdvance(ss);save('meta');render();return true;}
function recallReveal(){const ss=recallSessionReady(),x=ss?.current;if(!x||!['py','meaning'].includes(x.skill))return false;ss.revealed=true;save('meta');render();return true;}
function recallRecord(ss,x,grade){
  if(x.practice){ss.practiceQueue.splice(ss.practiceQueue.findIndex(t=>t.k===x.k&&t.skill===x.skill),1);ss.previous=x;ss.recent=ss.recent.concat(x.k).slice(-3);recallAdvance(ss);save('meta');render();return;}
  const row=recallData(x.k,ss.goals[x.k],true),e=recallState().entries[x.k],datum=row[x.skill];
  const first=datum.tries===0;datum.tries++;ss.attempts++;if(grade>=2)ss.correct++;
  if(x.skill==='write')datum.passed=grade>=2;else datum.streak=grade>=2?(datum.streak||0)+1:0;
  if(first){
    datum.firstGrade=grade;const prev=e.skills[x.skill];if(!prev?.state||prev.due<=Date.now()||grade===1)e.skills[x.skill]=FSRS.review(prev||{},grade,REQ);
    // Repeated drills and immediate corrections do not inflate FSRS or XP.
    D().t++;if(grade>=2){D().ok++;addXP(2);}
  }
  if(grade===1){const others=ss.keys.filter(k=>k!==x.k&&!recallExcluded(k)&&recallState().entries[k]?.familiar),pool=others.length?others:[x.k];ss.practiceQueue=Array.from({length:3},(_,n)=>({k:pool[n%pool.length],skill:x.skill==='py'?'meaning':x.skill==='meaning'?'py':n%2?'meaning':'py',practice:true}));}
  e.lastAt=Date.now();e.lastGrade=grade;ss.previous={k:x.k,skill:x.skill};ss.recent=(ss.recent||[]).concat(x.k).slice(-3);recallAdvance(ss);save('meta');render();
}
function recallGrade(grade){
  const ss=recallSessionReady(),x=ss?.current;if(!x||!ss.revealed||![1,2,3].includes(grade)||!['py','meaning'].includes(x.skill))return false;
  recallRecord(ss,x,grade);return true;
}
function recallWriteGrade(){
  const ss=recallSessionReady(),x=ss?.current;if(!x||x.skill!=='write'||!ss.revealed||!x.writer?.completed)return false;
  recallRecord(ss,x,x.writer.mistakes||x.writer.assisted?1:3);return true;
}
function recallWritingForms(k){const info=recallInfo(k),known=recallVerifiedChars();return isRad(k)?info.forms:info.forms.filter(ch=>!known.has(ch));}
function recallWriterCurrent(ss,x,host){return host.isConnected&&recallCurrentSession()===ss&&ss.current===x&&ss.date===todayStr()&&!recallExcluded(x.k);}
async function recallWriter(host,ss,x){
  const forms=recallWritingForms(x.k);if(!forms.length){recallAdvance(ss);save('meta');render();return;}
  if(x.writer?.forms&&x.writer.forms.join()!==forms.join())x.writer=null;
  x.writer=x.writer||{index:0,mistakes:0,assisted:false,completed:false,forms:forms.slice()};const w=x.writer;
  // A partial current character starts again after reload; finished characters survive.
  const index=w.index,f=forms[index];if(!f)return;
  const progress=el('p','note',`Знак ${index+1} из ${forms.length} · без образца`),pad=el('div','writer recall-pad'),cap=el('p','recall-stroke-note','Загружаем поле письма…');host.append(progress,pad,cap);
  const size=Math.max(220,Math.min(360,(window.innerWidth||390)-44));pad.style.width=size+'px';pad.style.height=size+'px';
  let data=null;try{if(window.HZREADY)await window.HZREADY;data=window.HZDATA?.[f]||await hwLoad(f);}catch(e){}
  if(!recallWriterCurrent(ss,x,host))return;
  const unavailable=()=>{cap.textContent='Проверка черт сейчас недоступна. Этот знак не будет засчитан.';const retry=el('button','btn ghost','Загрузить поле ещё раз');retry.onclick=render;const later=el('button','linkbtn','Отложить знак');later.onclick=()=>{ss.deferred.push(x.k);recallAdvance(ss);save('meta');render();};host.append(retry,later);};
  if(!canHW()||!data?.strokes?.length||!data?.medians?.length){unavailable();return;}
  cap.textContent='Пиши черты в правильном порядке и направлении.';
  try{
    const hw=HanziWriter.create(pad,f,{width:size,height:size,padding:12,showCharacter:false,showOutline:false,strokeColor:HWC.stroke,outlineColor:HWC.outline,drawingColor:HWC.draw,drawingWidth:6,highlightColor:HWC.hl,charDataLoader:(ch,ok)=>ok(data),acceptBackwardsStrokes:false,leniency:1});
    hw.quiz({showHintAfterMisses:Infinity,acceptBackwardsStrokes:false,leniency:1,highlightOnComplete:true,
      onMistake:st=>{if(!recallWriterCurrent(ss,x,host))return;w.mistakes++;cap.textContent='Черта '+(st.strokeNum+1)+': проверь форму, порядок и направление. Затем повторим без ошибок.';save('meta');},
      onCorrectStroke:st=>{if(!recallWriterCurrent(ss,x,host))return;cap.textContent=st.strokesRemaining?'Верно · осталось черт: '+st.strokesRemaining:'Все черты написаны';},
      onComplete:()=>{if(!recallWriterCurrent(ss,x,host)||w.index!==index)return;w.index++;save('meta');if(w.index<forms.length){host.replaceChildren();recallWriter(host,ss,x);}else{w.completed=true;ss.revealed=true;save('meta');render();}}
    });
  }catch(e){unavailable();}
}
function recallHint(){
  const ss=recallSessionReady(),x=ss?.current;if(!x||x.skill!=='write')return;
  x.writer=x.writer||{index:0,mistakes:0,assisted:false,completed:false};x.writer.assisted=true;x.writer.completed=true;ss.revealed=true;save('meta');render();
}
function recallSessionView(v){
  const raw=recallState().session,ss=recallSessionReady(),back=el('button','back','‹ К карточкам');back.onclick=()=>go('cards');v.appendChild(back);
  if(!ss){
    v.appendChild(el('h1','',raw?.stale?'Начался новый день':'Порция завершена'));
    v.appendChild(el('p','note',raw?.stale?'Вчерашние ответы сохранены. Открой сегодняшнее занятие.':`Готово на сегодня: ${raw?.completed?.length||0} из ${raw?.keys?.filter(k=>!recallExcluded(k)).length||0}. Следующий день откроется завтра; пропущенные дни не засчитываются сами.`));
    if(raw?.deferred?.length)v.appendChild(el('p','note','Отложено знаков: '+raw.deferred.length+'. Их этап остаётся незавершённым.'));
    const more=el('button','btn','К занятиям на сегодня');more.onclick=()=>go('cards');v.appendChild(more);return;
  }
  const x=ss.current,info=recallInfo(x.k),goal=ss.goals[x.k],datum=recallData(x.k,goal,false),need=recallGoal(goal.phase);
  v.appendChild(el('p','eyebrow',(goal.phase===4?'Общее повторение':'День '+goal.phase)+' · '+info.label));
  const total=ss.keys.filter(k=>!recallExcluded(k)).length,completed=ss.keys.filter(k=>!recallExcluded(k)&&recallRowDone(recallData(k,ss.goals[k],false),ss.goals[k].phase)).length;
  v.appendChild(el('div','study-progress',`<i style="width:${Math.round(completed/total*100)}%"></i>`));
  const card=el('section','hero recall-card');v.appendChild(card);
  if(x.skill==='intro'){
    card.appendChild(el('p','kind','Сначала познакомимся'));
    card.appendChild(el('h1','han recall-glyph',esc(info.hz)));card.appendChild(el('p','py',pinyinHTML(info.py)));card.appendChild(el('p','tr',esc(info.ru)));
    const speak=el('button','linkbtn',IC('speaker',18)+' Послушать');speak.onclick=()=>Speech.say(info.forms[0]&&isRad(x.k)?info.forms[0]:info.hz,undefined,info.py);card.appendChild(speak);
    card.appendChild(el('p','note','Посмотри, произнеси с тонами и свяжи со смыслом. Затем ответ будет скрыт.'));
    const next=el('button','btn','Начать вспоминать');next.onclick=recallIntro;card.appendChild(next);
  }else if(x.skill==='write'){
    card.appendChild(el('p','kind','Напиши по переводу'));card.appendChild(el('h2','recall-prompt',esc(info.ru)));
    card.appendChild(el('p','note',isRad(x.k)?'Ключ: напиши форму из пособия.':'Напиши иероглифы слова по очереди. Уже подтверждённые знаки пропускаются.'));
    if(!isRad(x.k)&&recallVerifiedChars().size){const known=info.forms.filter(ch=>recallVerifiedChars().has(ch));if(known.length)card.appendChild(el('p','note','Эти знаки уже подтверждены и не проверяются: '+known.join(' ')));}
    if(!ss.revealed){const host=el('div','recall-writer');card.appendChild(host);recallWriter(host,ss,x);const hint=el('button','linkbtn','Не помню — показать порядок черт');hint.onclick=recallHint;card.appendChild(hint);}
    else{
      const w=x.writer,good=w?.completed&&!w.mistakes&&!w.assisted;
      card.appendChild(el('p','recall-verdict',good?'Верно: форма, порядок и направление черт проверены.':'Это была тренировка. Позже напишем ещё раз без подсказки и ошибок.'));
      if(!good){const model=el('div','recall-demo');card.appendChild(model);notebookStrokeDemo(model,{...info,hz:recallWritingForms(x.k)[Math.min(w?.index||0,recallWritingForms(x.k).length-1)]});}
      const next=el('button','btn',good?'Верно · Дальше':'Повторить после других карточек');next.onclick=recallWriteGrade;card.appendChild(next);
    }
  }else{
    const reading=x.skill==='py';card.appendChild(el('p','kind',(x.practice?'Пауза перед повторной попыткой · ':'')+(reading?'Как читается?':'Что это значит?')));card.appendChild(el('h1','han recall-glyph',esc(info.hz)));
    card.appendChild(el('p','note',x.practice?'Вспомни другой навык, затем вернёмся к ошибке.':`Успешных ответов подряд: ${datum[x.skill]?.streak||0} из ${need[x.skill]}`));
    if(!ss.revealed){card.appendChild(el('p','note',reading?'Произнеси пиньинь с тонами вслух, затем открой ответ.':'Назови перевод до открытия ответа.'));const reveal=el('button','btn','Показать ответ');reveal.dataset.key='space';reveal.onclick=recallReveal;card.appendChild(reveal);}
    else{
      card.appendChild(el('div',reading?'py recall-answer':'tr recall-answer',reading?pinyinHTML(info.py):esc(info.ru)));
      if(reading){const speak=el('button','linkbtn',IC('speaker',18)+' Послушать');speak.onclick=()=>Speech.say(isRad(x.k)?info.forms[0]:info.hz,undefined,info.py);card.appendChild(speak);}
      const grades=el('div','study-grades');for(const [g,label]of[[1,'Не вспомнил'],[2,'С трудом'],[3,'Вспомнил']]){const b=el('button','btn '+(g===3?'':'ghost'),label);b.onclick=()=>recallGrade(g);grades.appendChild(b);}card.appendChild(grades);
      card.appendChild(el('p','note','Оцени ответ, который вспомнил до открытия. Ошибка вернёт карточку после других заданий.'));
    }
  }
  card.appendChild(studyDifficultButton(x.k));
}
function recallCycleBanner(){
  const c=el('section','hero study-cycle-banner'),due=recallDue();
  c.innerHTML='<div class="kind">Твой цикл памяти · 1 → 2 → 3 → каждый день</div><h2>Узнаю. Вспоминаю. Пишу.</h2><p class="note">1-й день: иероглиф → пиньинь и перевод. 2-й: повторение, затем письмо по переводу. 3-й: оба направления. С 4-го — всё пройденное, каждый день.</p>';
  const counts=studyRememberedCounts();c.appendChild(el('p','study-counts',`Запомнил: <b>${counts.chars}</b> ${plural(counts.chars,'иероглиф','иероглифа','иероглифов')} · <b>${counts.keys}</b> ${plural(counts.keys,'ключ','ключа','ключей')} из 214`));
  const line=el('div','study-week');for(const [n,label]of[[1,'Читаю'],[2,'Пишу'],[3,'Закрепляю'],[4,'Повторяю']])line.appendChild(el('span',n===1?'recall':n<4?'writing':'total',n+'<small>'+label+'</small>'));c.appendChild(line);
  const start=el('button','btn',IC('cards',20)+' '+(due.length?'Заниматься сегодня · '+due.length:'Выбрать уроки и учить'));start.onclick=()=>go('cards');c.appendChild(start);return c;
}
function viewRecallCards(s){
  const v=el('div','view study-cards-view');s.appendChild(v);if(State.route.run)return recallSessionView(v);
  const m=recallState();v.appendChild(el('h1','','Мои карточки'));
  v.appendChild(el('p','note','Короткие порции до 5 элементов. Сначала вспоминай сам, потом открывай ответ. Дни 2 и 3 открываются после занятия в предыдущий день; с 4-го повторяем пройденное ежедневно.'));
  const chooser=el('details','hero recall-lesson-picker');chooser.open=!m.lessons.length;chooser.appendChild(el('summary','','Выбрать уроки · '+(m.lessons.join(', ')||'не выбраны')));
  const choices=el('div','chips');for(let L=1;L<=NL;L++){const label=el('label','chip'),input=el('input');input.type='checkbox';input.checked=m.lessons.includes(L);input.setAttribute('aria-label','Урок '+L);input.onchange=()=>{m.lessons=[...choices.querySelectorAll('input:checked')].map(x=>+x.value);chooser.querySelector('summary').textContent='Выбрать уроки · '+(m.lessons.join(', ')||'не выбраны');save('meta');draw();};input.value=L;label.append(input,document.createTextNode(' Урок '+L));choices.appendChild(label);}chooser.appendChild(choices);
  const unit=el('div','chips');for(const [id,title]of[['words','Слова урока'],['chars','Отдельные иероглифы']]){const b=el('button','chip'+(m.unit===id?' on':''),title);b.onclick=()=>{m.unit=id;save('meta');render();};unit.appendChild(b);}chooser.appendChild(unit);
  const keys=el('label','setrow'),toggle=el('input');toggle.type='checkbox';toggle.checked=m.includeKeys;toggle.onchange=()=>{m.includeKeys=toggle.checked;save('meta');draw();};keys.append(toggle,document.createTextNode(' Ключи этих уроков по пособию'));chooser.appendChild(keys);v.appendChild(chooser);
  const result=el('div');v.appendChild(result);
  const method=el('details','hero recall-method');method.appendChild(el('summary','','Как устроено запоминание'));
  method.appendChild(el('p','note','День 1: по три успешных вспоминания подряд отдельно для пиньиня и перевода. Дни 2–3: по два, затем написание по переводу с проверкой каждой черты. Ошибки повторяются между другими карточками, а не сразу вслед за ответом. С 4-го: ежедневный круг всего введённого — чтение, перевод и письмо. Большой список делится на порции и сохраняет остаток.'));
  method.appendChild(el('p','note','Пиньинь ты произносишь и сверяешь сам, без обязательного ввода тонов. В новом цикле чтение тренируется и у ключей. Письмо засчитывается только при верных чертах без подсказок. Знаки, подтверждённые в проверке настроек, исключаются; простая ручная отметка без проверки не заменяет её.'));
  method.appendChild(el('p','note','Ключи взяты из раздела А «Пособия по иероглифике»: в выписке к урокам 1–30 есть 155 пронумерованных ключей. Остальным 59 не придумываем урок — все 214 доступны в поиске, где любой ключ можно добавить в этот цикл кнопкой «Учить в карточках». Старые прописи и результаты сохранены; новые этапы засчитываются по новым ответам.'));v.appendChild(method);
  function draw(){
    result.replaceChildren();const due=recallOrder(recallDue()),fresh=recallFresh(),ss=recallCurrentSession();
    if(ss&&ss.date===todayStr()){const resume=el('button','btn blue','Продолжить занятие');resume.onclick=()=>go('cards',{run:true});result.appendChild(resume);}
    result.appendChild(el('p','note',`На сегодня: ${due.length} · новых в выбранных уроках: ${fresh.length}. Повторения включают все ранее начатые уроки.`));
    if(due.length){const start=el('button','btn','Повторить · '+Math.min(5,due.length)+' из '+due.length);start.onclick=()=>recallStart('today');result.appendChild(start);}
    if(fresh.length){const learn=el('button','btn '+(due.length?'ghost':''),'Учить выбранное · '+Math.min(5,fresh.length)+' из '+fresh.length);learn.style.marginTop='12px';learn.onclick=()=>recallStart('new');result.appendChild(learn);}
    if(!due.length&&!fresh.length)result.appendChild(el('p','empty',m.lessons.length?'На сегодня всё готово или знаки исключены после проверки. Можно выбрать другой урок.':'Выбери один или несколько уроков — например, старый и новый.'));
    const hard=due.filter(studyIsDifficult);if(hard.length){const b=el('button','linkbtn','Сложные на сегодня · '+hard.length);b.onclick=()=>recallStart('difficult');result.appendChild(b);}
    const progress=el('div','rowlist');for(const k of due){const info=recallInfo(k),plan=recallPlan(k),row=el('button','row recall-item',`<span class="ri han">${esc(info.hz)}</span><div class="tt"><b>${esc(info.ru)}</b><small>${esc(info.label)} · ${plan.phase===4?'общее повторение':'день '+plan.phase}${studyIsDifficult(k)?' · сложный':''}</small></div>${IC('chev',18)}`);row.onclick=()=>recallStart('today',[k]);progress.appendChild(row);}result.appendChild(progress);
    if(m.lessons.length){const preview=el('details','recall-preview');preview.appendChild(el('summary','','Что входит в выбранные уроки'));for(const L of m.lessons){const words=m.unit==='chars'?uniq(lessonWords(L).flatMap(w=>hanOf(w.s))).length:lessonWords(L).length;preview.appendChild(el('p','note',`Урок ${L}: ${words} ${m.unit==='chars'?'иероглифов':'слов'} · ключи: `+(m.includeKeys?recallLessonKeys(L).map(k=>recallInfo(k).hz+' №'+radNum(k)).join(', ')||'новых ключей в разделе А нет':'выключены')));}result.appendChild(preview);}
  }draw();
}
function applyStudyUpdateV41(){
  const m=studyState();if(m.recallV41)return false;
  recallState();m.verifiedKnown=m.verifiedKnown||{};
  const ss=m.knowledgeCheck?.session;if(ss?.finished&&ss.saved)for(const k of ss.keys||[])if(knownCheckPassed(ss,k)&&studyKnown(k))m.verifiedKnown[k]={date:ss.savedOn||ss.started,source:'knowledge-check'};
  // Archived paper dates cannot prove the new reading/write stages.
  if(State.route.name==='study'||State.route.name==='cards'&&State.route.run&&!m.recall?.session?.v)State.route={name:'cards'};
  m.recallV41=true;return true;
}
