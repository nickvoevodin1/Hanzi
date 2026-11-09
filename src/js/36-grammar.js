/*==================================================================
  ГРАММАТИКА: короткое правило → применение → отдельное повторение FSRS.
  Чтение не засчитывает знание; повтор исправления не повышает интервалы.
  Весь незаконченный круг — в State.meta.grammar.session.
==================================================================*/
function grammarTopics(){ return typeof GRAMMAR!=='undefined'&&Array.isArray(GRAMMAR.topics)?GRAMMAR.topics:[]; }
function grammarTopic(id){ return grammarTopics().find(t=>t.id===id)||null; }
function grammarState(){
  const m=State.meta.grammar||(State.meta.grammar={v:1,topics:{},session:null,history:[]});
  if(!m.topics||typeof m.topics!=='object'||Array.isArray(m.topics)) m.topics={};
  if(!Array.isArray(m.history)) m.history=[];
  return m;
}
function grammarRecord(id){ return grammarState().topics[id]||null; }
function grammarTopicDone(id){ const r=grammarRecord(id); return !!(r&&r.completedAt); }
function grammarDueIds(){
  const records=(State.meta.grammar||{}).topics||{};
  return grammarTopics().filter(t=>records[t.id]?.card?.state&&records[t.id].card.due<=Date.now())
    .sort((a,b)=>records[a.id].card.due-records[b.id].card.due).map(t=>t.id);
}
function grammarStats(){
  const topics=grammarTopics(), records=(State.meta.grammar||{}).topics||{};
  const checked=topics.filter(t=>records[t.id]?.card?.state);
  return {total:topics.length,started:topics.filter(t=>records[t.id]?.seenAt||records[t.id]?.card?.state).length,
    checked:checked.length,introduced:checked.length,completed:topics.filter(t=>records[t.id]?.completedAt).length,due:grammarDueIds().length,
    solid:checked.filter(t=>records[t.id].card.S>=21&&records[t.id].lastGrade>=3).length};
}
function grammarNormalize(s){ return String(s||'').normalize('NFC').toLowerCase().replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()]/gu,''); }
function grammarAnswerText(ex){ return Array.isArray(ex.answer)?ex.answer.join(''):String(ex.answer??''); }
function grammarAnswerOK(ex,input){
  const got=grammarNormalize(input); if(!got) return false;
  return [grammarAnswerText(ex)].concat(ex.alternatives||[]).some(a=>grammarNormalize(a)===got);
}
function grammarExercises(topic){
  return (topic.exercises||[]).filter(ex=>ex&&['choice','order','input'].includes(ex.type)&&grammarAnswerText(ex)&&
    (ex.type!=='choice'||Array.isArray(ex.choices)&&ex.choices.length>=2)&&
    (ex.type!=='order'||Array.isArray(ex.tokens||ex.answer)));
}
function grammarSuggestedIds(){
  const records=(State.meta.grammar||{}).topics||{}, due=grammarDueIds();
  const early=grammarTopics().filter(t=>records[t.id]?.card?.state&&!due.includes(t.id)).sort((a,b)=>(records[a.id].practicedAt||0)-(records[b.id].practicedAt||0));
  const fresh=grammarTopics().find(t=>(+t.lesson||1)<=groupL()&&!records[t.id]?.card?.state);
  const ids=due.slice(0,2);
  if(ids.length<2&&early.length) ids.push(early[0].id);
  if(fresh) ids.push(fresh.id);
  return uniq(ids).slice(0,3);
}
function startGrammar(ids,opts){
  opts=opts||{}; const m=grammarState();
  ids=uniq((Array.isArray(ids)?ids:ids?[ids]:grammarSuggestedIds()).filter(id=>grammarTopic(id)&&grammarExercises(grammarTopic(id)).length>=3)).slice(0,3);
  if(!ids.length){ toast('Для этого набора пока нет заданий'); return; }
  const current=m.session;
  if(current&&!current.finished&&!opts.restart&&current.ids.join('|')===ids.join('|')){ go('grammar',{run:true}); return; }
  const introIds=opts.readFirst===true?ids.slice():opts.readFirst===false?[]:ids.filter(id=>!m.topics[id]?.card?.state), queue=[], exByTopic={};
  ids.forEach(id=>{ exByTopic[id]=grammarExercises(grammarTopic(id)).slice(0,opts.exerciseLimit||5); });
  const largest=Math.max(...ids.map(id=>exByTopic[id].length));
  for(let i=0;i<largest;i++) ids.forEach(id=>{
    const ex=exByTopic[id][i]; if(!ex) return;
    const x={topicId:id,ex:clone(ex),retry:false,input:'',orderIds:[]};
    if(ex.type==='choice') x.choices=shuffle(ex.choices.slice());
    if(ex.type==='order') x.pool=shuffle((ex.tokens||ex.answer).map((text,i)=>({id:i,text})));
    queue.push(x);
  });
  const results={}; ids.forEach(id=>results[id]={total:exByTopic[id].length,first:0,correct:0,graded:false});
  m.session={ids,title:opts.title||'Грамматика · короткий круг',node:opts.node||null,queue,index:0,introIds,introIndex:0,
    phase:introIds.length?'intro':'questions',revealed:false,results,first:0,correct:0,started:Date.now(),finished:false,back:opts.back==='path'?'path':null};
  save('meta'); go('grammar',{run:true});
}
function grammarReadNext(){
  const ss=grammarState().session; if(!ss||ss.phase!=='intro') return;
  const id=ss.introIds[ss.introIndex], records=grammarState().topics, record=records[id]||(records[id]={});
  record.seenAt=Date.now();
  ss.introIndex++; if(ss.introIndex>=ss.introIds.length) ss.phase='questions';
  save('meta'); render();
}
function grammarGradeTopic(id,ss){
  const result=ss.results[id]; if(!result||result.graded||result.first<result.total) return;
  result.graded=true;
  const m=grammarState(), record=m.topics[id]||(m.topics[id]={}), grade=result.correct===result.first?3:1;
  const old=record.card, scheduled=!!(old?.state&&old.due<=Date.now());
  if(grade===1) record.needsScheduledCheck=true;
  else if(scheduled) record.needsScheduledCheck=false;
  if(!old?.state||old.due<=Date.now()||grade===1) record.card=FSRS.review(old||{},grade,REQ);
  record.lastGrade=grade; record.practicedAt=Date.now(); record.checkedAt=Date.now();
  record.firstTotal=(record.firstTotal||0)+result.first; record.firstCorrect=(record.firstCorrect||0)+result.correct;
  record.lastAccuracy=Math.round(result.correct/result.first*100);
  // A completed rule means an independent clean set, not merely reading it
  // or selecting the shown correction. Stability remains a separate metric.
  if(grade===3&&!record.needsScheduledCheck&&result.first>=3&&!record.completedAt) record.completedAt=Date.now();
}
function grammarReveal(input){
  const ss=grammarState().session, x=ss&&ss.queue[ss.index];
  if(!x||ss.finished||ss.phase!=='questions'||ss.revealed) return;
  if(input!==undefined) x.input=String(input);
  if(!String(x.input||'').trim()){ toast('Сначала попробуй ответить — или нажми «Не помню»'); return; }
  x.ok=grammarAnswerOK(x.ex,x.input); ss.revealed=true;
  if(!x.retry&&!x.spacer){
    const r=ss.results[x.topicId]; r.first++; ss.first++; D().t++;
    if(x.ok){ r.correct++; ss.correct++; D().ok++; addXP(5); }
    else {
      // Delay the single corrective retry. A one-question tail gets two
      // other recall tasks; they never affect mastery or reward counters.
      const retry={topicId:x.topicId,ex:clone(x.ex),retry:true,input:'',orderIds:[]};
      if(x.ex.type==='choice') retry.choices=shuffle(x.ex.choices.slice());
      if(x.ex.type==='order') retry.pool=shuffle((x.ex.tokens||x.ex.answer).map((text,i)=>({id:i,text})));
      const tail=ss.queue.slice(ss.index+1), others=ss.queue.filter(t=>!t.retry&&!t.spacer&&t.ex.id!==x.ex.id);
      for(let i=tail.length;i<2&&others.length;i++){
        const spacer=clone(others[i%others.length]); spacer.spacer=true; spacer.input=''; spacer.orderIds=[]; delete spacer.ok;
        ss.queue.push(spacer);
      }
      ss.queue.push(retry);
    }
    grammarGradeTopic(x.topicId,ss);
  }
  save('meta'); render();
}
function grammarGiveUp(){
  const ss=grammarState().session, x=ss&&ss.queue[ss.index];
  if(!x||ss.revealed) return;
  x.gaveUp=true; grammarReveal('___не вспомнил___');
}
function grammarNext(){
  const m=grammarState(), ss=m.session; if(!ss||!ss.revealed||ss.finished) return;
  ss.index++; ss.revealed=false;
  if(ss.index>=ss.queue.length){
    ss.finished=true; ss.ended=Date.now(); ss.ids.forEach(id=>grammarGradeTopic(id,ss));
    if(ss.node&&ss.ids.every(grammarTopicDone)) State.meta.nodes[ss.node]=todayStr();
    m.history.unshift({date:todayStr(),ids:ss.ids.slice(),first:ss.first,correct:ss.correct,title:ss.title}); m.history=m.history.slice(0,30);
    D().ls++; checkDay(); save('meta');
  }
  save('meta'); render();
}
function grammarExampleHTML(example){
  return `<div class="grammar-example" style="padding:10px 0;border-top:1px solid var(--line)"><div class="han" style="font-size:23px;color:var(--title)">${esc(example.zh)}</div><div class="note" style="margin:3px 0">${pinyinHTML(example.py||'')}</div><div class="note" style="margin:0">${esc(example.ru||'')}</div></div>`;
}
function grammarRuleCard(topic){
  const card=el('div','hero grammar-rule');
  card.innerHTML=`<div class="kind">${esc(topic.section||(/phonetic|pronunciation|pinyin/.test(topic.kind||'')?'Фонетика и чтение':'Грамматика'))} · ${topic.lesson?'урок '+topic.lesson:'основы'}</div><h2>${esc(topic.title)}</h2>${topic.goal?`<p class="note">${esc(topic.goal)}</p>`:''}`;
  const rules=Array.isArray(topic.rule)?topic.rule:[topic.rule];
  rules.filter(Boolean).forEach(rule=>card.appendChild(el('p','note',esc(rule))));
  if(topic.pattern) card.appendChild(el('div','info',esc(Array.isArray(topic.pattern)?topic.pattern.join(' · '):topic.pattern)));
  if(topic.caution) card.appendChild(el('p','study-tip',esc(topic.caution)));
  (topic.examples||[]).forEach(example=>{
    const row=el('div'); row.innerHTML=grammarExampleHTML(example);
    const say=el('button','say',SPK(18)+' Послушать'); say.setAttribute('aria-label','Послушать пример: '+example.zh); say.onclick=()=>Speech.say(example.zh,undefined,example.py); row.appendChild(say); card.appendChild(row);
  });
  const sourceIds=topic.sourceIds||[], sources=typeof GRAMMAR!=='undefined'&&Array.isArray(GRAMMAR.sources)?GRAMMAR.sources:[];
  const refs=sources.filter(src=>sourceIds.includes(src.id)&&/^https?:\/\//i.test(src.url||''));
  if(refs.length){ const note=el('p','note','Опора: '); refs.forEach((src,i)=>{ if(i) note.appendChild(document.createTextNode(' · ')); const link=el('a','',src.title||src.name||'Источник'); link.href=src.url; link.target='_blank'; link.rel='noopener noreferrer'; note.appendChild(link); }); card.appendChild(note); }
  return card;
}
function grammarSessionView(v,ss){
  const pause=el('button','back','‹ Сохранить и выйти'); pause.onclick=()=>go('grammar',{home:true}); v.appendChild(pause);
  if(ss.finished){
    v.appendChild(el('h2','title','Круг завершён'));
    v.appendChild(el('div','hero',`<div class="kind">${esc(ss.title)}</div><h2>С первого раза ${ss.correct} из ${ss.first}</h2><p class="note">${ss.correct===ss.first?'Все задания решены самостоятельно.':'Исправления разобраны; темы с ошибками вернутся раньше.'} Понимание правила закрепляется применением после паузы.</p>`));
    const repeat=el('button','btn',ss.correct===ss.first?'Другой короткий круг':'Проверить трудные темы ещё раз');
    repeat.style.marginTop='12px'; repeat.onclick=()=>startGrammar(ss.correct===ss.first?grammarSuggestedIds():ss.ids.filter(id=>ss.results[id].correct<ss.results[id].first),{restart:true,title:'Грамматика · закрепление'}); v.appendChild(repeat);
    if(ss.back==='path'){ const path=el('button','btn','Вернуться к уроку'); path.style.marginTop='12px'; path.onclick=()=>go('path'); v.appendChild(path); }
    const home=el('button','btn ghost','К темам'); home.style.marginTop='12px'; home.onclick=()=>go('grammar',{home:true}); v.appendChild(home); return;
  }
  v.appendChild(el('p','eyebrow',esc(ss.title)));
  if(ss.phase==='intro'){
    const topic=grammarTopic(ss.introIds[ss.introIndex]);
    if(!topic){ ss.introIndex++; if(ss.introIndex>=ss.introIds.length) ss.phase='questions'; save('meta'); render(); return; }
    v.appendChild(grammarRuleCard(topic));
    const b=el('button','btn',ss.introIndex+1<ss.introIds.length?'Дальше · следующее правило':'Закрыть правило и применить'); b.style.marginTop='14px'; b.dataset.key='space'; b.onclick=grammarReadNext; v.appendChild(b); return;
  }
  const x=ss.queue[ss.index];
  if(!x){ ss.finished=true; save('meta'); return grammarSessionView(v,ss); }
  const topic=grammarTopic(x.topicId);
  v.appendChild(el('div','progress',`<i style="width:${ss.index/ss.queue.length*100}%"></i>`));
  v.appendChild(el('p','note',`${topic?esc(topic.title):'Грамматика'} · ${ss.index+1}/${ss.queue.length}${x.retry?' · исправление':x.spacer?' · закрепление знакомого':''}`));
  const c=el('div','qcard'); c.style.minHeight='140px'; c.innerHTML=`<div class="qbig" style="font-size:22px">${esc(x.ex.prompt)}</div>`; v.appendChild(c);
  if(ss.revealed){
    const answer=el('div','hero'); answer.style.marginTop='12px';
    answer.innerHTML=`<div class="verdict ${x.ok?'ok':'bad'}">${x.ok?'Верно':x.gaveUp?'Разберём вместе':'Посмотри, где меняется смысл'}</div><div class="han" style="font-size:26px;margin:8px 0;color:var(--title)">${esc(grammarAnswerText(x.ex))}</div>${!x.gaveUp?`<p class="note">Твой ответ: ${esc(x.input)}</p>`:''}<p class="note">${esc(x.ex.explanation||topic?.rule||'Сверь порядок слов и попробуй применить правило ещё раз.')}</p>`;
    v.appendChild(answer);
    const nx=el('button','btn','Дальше'); nx.style.marginTop='14px'; nx.dataset.key='space'; nx.onclick=grammarNext; v.appendChild(nx); return;
  }
  if(x.ex.type==='choice'){
    const choices=el('div','choices'); choices.style.marginTop='12px';
    (x.choices||x.ex.choices).forEach((choice,i)=>{ const b=el('button','choice',esc(choice)); b.dataset.ch=String(i+1); b.onclick=()=>grammarReveal(choice); choices.appendChild(b); }); v.appendChild(choices);
  }else if(x.ex.type==='order'){
    const selected=el('div','grammar-selected chips'); selected.style.cssText='min-height:60px;padding:12px;border:2px dashed var(--line);border-radius:14px;margin:12px 0';
    (x.orderIds||[]).forEach(id=>{ const token=x.pool.find(t=>t.id===id); if(!token) return; const b=el('button','chip on',esc(token.text)); b.setAttribute('aria-label','Убрать слово '+token.text); b.onclick=()=>{ x.orderIds.splice(x.orderIds.indexOf(id),1); save('meta'); render(); }; selected.appendChild(b); }); v.appendChild(selected);
    const pool=el('div','chips grammar-pool');
    x.pool.forEach(token=>{ const b=el('button','chip han',esc(token.text)); b.disabled=(x.orderIds||[]).includes(token.id); b.onclick=()=>{ x.orderIds.push(token.id); save('meta'); render(); }; pool.appendChild(b); }); v.appendChild(pool);
    const check=el('button','btn','Проверить'); check.style.marginTop='14px'; check.dataset.key='space'; check.disabled=!x.orderIds.length; check.onclick=()=>grammarReveal(x.orderIds.map(id=>x.pool.find(t=>t.id===id)?.text||'').join('')); v.appendChild(check);
  }else{
    const input=el('input','tinput'); input.type='text'; input.value=x.input||''; input.autocomplete='off'; input.spellcheck=false; input.maxLength=140; input.placeholder=x.ex.placeholder||'Впиши пропущенное'; input.setAttribute('aria-label','Ответ по грамматике');
    input.oninput=()=>{ x.input=input.value; save('meta'); }; input.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); grammarReveal(input.value); } }; v.appendChild(input);
    const check=el('button','btn','Проверить'); check.style.marginTop='14px'; check.onclick=()=>grammarReveal(input.value); v.appendChild(check);
  }
  const lost=el('button','linkbtn','Не помню — разобрать'); lost.onclick=grammarGiveUp; v.appendChild(lost);
}
function grammarCard(){
  const st=grammarStats(), card=el('div','hero'); card.style.marginTop='12px';
  card.innerHTML=`<div class="kind">Грамматика</div><h2>Понять правило и сказать самому</h2><p class="note">Тем пройдено: ${st.completed}/${st.total}${st.due?' · к повторению: '+st.due:''}. Порядок слов, частицы, вопросы и конструкции курса.</p>`;
  const b=el('button','btn ghost mini','Открыть грамматику'); b.onclick=()=>go('grammar',{home:true}); card.appendChild(b); return card;
}
function grammarTimeReference(){
  const details=el('details','hero grammar-time'); details.style.marginTop='14px';
  const summary=el('summary','','Время: памятка с пары'); summary.style.cssText='font-size:15px;font-weight:900;color:var(--title);cursor:pointer'; details.appendChild(summary);
  const box=el('div'); box.style.cssText='overflow-x:auto;max-width:100%;margin-top:12px';
  const rows=[
    ['Год',['去年','qù nián'],['今年','jīn nián'],['明年','míng nián']],
    ['Месяц',['上个月','shàng ge yuè'],['这个月','zhè ge yuè'],['下个月','xià ge yuè']],
    ['Неделя',['上个星期','shàng ge xīng qī'],['这个星期','zhè ge xīng qī'],['下个星期','xià ge xīng qī']],
    ['День',['昨天','zuó tiān'],['今天','jīn tiān'],['明天','míng tiān']]
  ];
  box.innerHTML=`<table class="grammar-time-table" style="border-collapse:collapse;width:100%;font-size:12px;text-align:left"><thead><tr>${['Единица','Прошлый','Текущий','Следующий'].map(h=>`<th scope="col" style="padding:6px;border-bottom:2px solid var(--line)">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,...cells])=>`<tr><th scope="row" style="padding:8px 4px;border-bottom:1px solid var(--line)">${label}</th>${cells.map(([zh,py])=>`<td style="padding:8px 5px;border-bottom:1px solid var(--line)"><span class="han" style="font-size:20px;color:var(--title)">${zh}</span><br><span style="font-size:10px">${pinyinHTML(py)}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  details.appendChild(box);
  details.appendChild(el('p','note','Год → месяц → число (日 / 号) → день недели → часть дня → время. Для недели также употребляются 上星期、这星期、下星期 без 个.'));
  details.appendChild(el('p','han','2026年十一月三日星期二上午八点'));
  details.appendChild(el('p','note','3 ноября 2026 года, вторник, 8 утра.'));
  return details;
}
function viewGrammar(s){
  const m=grammarState(), ss=m.session, v=el('div','view'); s.appendChild(v);
  if(State.route.run&&ss) return grammarSessionView(v,ss);
  if(State.route.topic){
    const topic=grammarTopic(State.route.topic);
    const back=el('button','back','‹ Все темы'); back.onclick=()=>go('grammar',{home:true}); v.appendChild(back);
    if(!topic){ v.appendChild(el('p','empty','Эта тема пока недоступна')); return; }
    v.appendChild(grammarRuleCard(topic));
    const start=el('button','btn','Проверить правило'); start.style.marginTop='14px'; start.onclick=()=>startGrammar([topic.id],{restart:true,readFirst:false}); v.appendChild(start); return;
  }
  const back=el('button','back','‹ На путь'); back.onclick=()=>go('path'); v.appendChild(back);
  v.appendChild(el('h1','','Грамматика'));
  v.appendChild(el('p','note','Короткое объяснение, затем применение без образца. Можно идти вместе с курсом или отдельно разобрать трудную тему.'));
  const stats=grammarStats(); v.appendChild(el('p','note',`Проверено: ${stats.checked}/${stats.total} тем · самостоятельно пройдено: ${stats.completed} · к сроку: ${stats.due}`));
  if(ss&&!ss.finished){ const resume=el('button','btn blue',IC('play',18)+' Продолжить грамматику'); resume.onclick=()=>go('grammar',{run:true}); v.appendChild(resume); }
  const actions=el('div','actionrow');
  const mix=el('button','btn','Короткий круг'); mix.disabled=!grammarSuggestedIds().length; mix.onclick=()=>startGrammar(); actions.appendChild(mix);
  const due=el('button','btn ghost','Повторить к сроку · '+stats.due); due.disabled=!stats.due; due.onclick=()=>startGrammar(grammarDueIds().slice(0,3),{review:true,title:'Грамматика · повторение'}); actions.appendChild(due); v.appendChild(actions);
  v.appendChild(grammarTimeReference());
  const filter=el('div','actionrow');
  const search=el('input','search'); search.type='search'; search.placeholder='Найти правило: 也, 的, время…'; search.setAttribute('aria-label','Найти тему грамматики'); search.value=State.route.query||''; filter.appendChild(search);
  const lesson=el('select'); lesson.setAttribute('aria-label','Урок грамматики'); lesson.innerHTML='<option value="0">Все уроки</option>'+Array.from({length:NL},(_,i)=>`<option value="${i+1}">Урок ${i+1}</option>`).join(''); lesson.value=String(State.route.lesson||0); filter.appendChild(lesson); v.appendChild(filter);
  const scopes=el('div','chips');
  [['all','Все темы'],['class','С занятий'],['due','К повторению']].forEach(([scope,title])=>{ const b=el('button','chip'+((State.route.scope||'all')===scope?' on':''),title); b.onclick=()=>go('grammar',{home:true,scope,query:search.value,lesson:+lesson.value}); scopes.appendChild(b); }); v.appendChild(scopes);
  const list=el('div','rowlist'); list.style.marginTop='12px'; v.appendChild(list);
  const draw=()=>{
    list.replaceChildren(); const query=search.value.trim().toLowerCase(), L=+lesson.value, scope=State.route.scope||'all', dueSet=new Set(grammarDueIds());
    State.route.query=search.value; State.route.lesson=L;
    const topics=grammarTopics().filter(t=>(!L||+t.lesson===L)&&(scope!=='class'||t.classNote||t.origin==='notes')&&(scope!=='due'||dueSet.has(t.id)))
      .filter(t=>!query||[t.title,t.rule,t.pattern,t.caution,...(t.examples||[]).map(e=>e.zh+' '+e.ru)].join(' ').toLowerCase().includes(query));
    topics.forEach(topic=>{
      const r=grammarRecord(topic.id), status=dueSet.has(topic.id)?'Пора повторить':r?.completedAt?'Проверено самостоятельно':r?.card?.state?'Закрепляем':r?.seenAt?'Правило прочитано':'Новая тема';
      const b=el('button','row',`<span class="ri">${IC('book',26)}</span><div class="tt"><b>${esc(topic.title)}</b><small>Урок ${topic.lesson||'—'} · ${status}</small></div>${IC('chev',16)}`);
      b.onclick=()=>go('grammar',{topic:topic.id}); list.appendChild(b);
    });
    if(!topics.length) list.appendChild(el('p','empty','Тем по этому фильтру нет. Попробуй другой запрос.'));
    Resume.later();
  };
  search.oninput=draw; lesson.onchange=draw; draw();
}
