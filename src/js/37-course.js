/* Занятие как на паре: один блок из трёх или четырёх уроков. */
function nextCourseStep(){
  const list=courseClassUnits(), m=State.meta.classroom||{};
  const hasCourseProgress=semWords().some(k=>!isNew(k));
  let preferred=list.find(u=>u.blockId===m.activeBlockId);
  if(!preferred&&hasCourseProgress) preferred=list.find(u=>u.lessons.includes(groupL()));
  const ordered=preferred?[preferred].concat(list.filter(u=>u!==preferred)):list;
  for(const u of ordered){ const n=u.nodes.find(n=>!nodeDone(n)); if(n) return {u,n}; }
  return null;
}
function courseCard(){
  const step=nextCourseStep(), card=el('div','hero study-card course-hero');
  const gs=(State.meta.grammar||{}).session, cs=(State.meta.classroom||{}).session;
  const running=PLAY&&!PLAY.end&&playLeft(), grammarRunning=gs&&!gs.finished, classRunning=cs&&!cs.finished;
  card.innerHTML=`<div class="kind">Как на паре · блоки по 3–4 урока</div><h2>${step?'Уроки '+step.u.lessons[0]+'–'+step.u.lessons[step.u.lessons.length-1]:'Закрепляем изученное'}</h2><p class="note">Диалог → слова → перевод → ключи → аудирование → квиз. К занятиям можно возвращаться в любом порядке.</p>${step?`<div class="course-next"><span class="lbl">Следующий этап</span><b>${esc(step.n.title)}</b></div>`:''}`;
  const b=el('button','btn',classRunning||running||grammarRunning?'Продолжить занятие':step?'Начать занятие':'Повторить знакомое');
  b.onclick=()=>{ if(classRunning) go('classroom',{run:true}); else if(running) go('play'); else if(grammarRunning) go('grammar',{run:true}); else if(step) openNode(step.u,step.n,'avail'); else memoryStart(); };
  card.appendChild(b);
  const writing=el('button','linkbtn','Прописи на три дня · на экране и в тетради'); writing.onclick=()=>go('notebook'); card.appendChild(writing);
  const due=grammarDueIds(); if(due.length){ const r=el('button','linkbtn','Правила к повторению · '+due.length); r.onclick=()=>startGrammar(due.slice(0,2),{back:'path',title:'Повторяем грамматику'}); card.appendChild(r); }
  return card;
}
