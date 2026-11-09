/* Занятие по 3–4 урокам: диалог, слова, перевод, ключи, аудирование, квиз.
   Прогресс этапа означает проверенные задания, а не открытие экрана. */
const CLASSROOM_STAGES=[['dialogue','Диалог'],['vocab','Повторяем слова'],['translation','Переводим предложения'],['decomp','Разбираем иероглифы'],['listening','Слушаем и переводим'],['quiz','Квиз по иероглифам']];
function classroomState(){
  const m=State.meta.classroom||(State.meta.classroom={v:1,blockSize:3,progress:{},sessions:{},materials:{},session:null});
  ['progress','sessions','materials'].forEach(k=>{if(!m[k]||typeof m[k]!=='object') m[k]={};});
  if(m.session?.key) m.sessions[m.session.key]=m.session;
  return m;
}
function classroomConfig(c){
  c=c||{}; let lessons=c.lessons;
  if(!Array.isArray(lessons)){ const match=String(c.blockId||'').match(/^CL(\d+)-(\d+)$/); lessons=match?Array.from({length:Math.max(0,+match[2]-+match[1]+1)},(_,i)=>+match[1]+i):[groupL()]; }
  lessons=uniq(lessons.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=NL)).sort((a,b)=>a-b).slice(0,4);
  if(!lessons.length) lessons=[1];
  return {lessons,stage:CLASSROOM_STAGES.some(x=>x[0]===c.stage)?c.stage:'dialogue',blockId:c.blockId||'CL'+lessons[0]+'-'+lessons[lessons.length-1],title:c.title||'Уроки '+lessons.join(', ')};
}
function classroomLessonData(L){ return typeof CLASSROOM!=='undefined'&&CLASSROOM.lessons&&CLASSROOM.lessons[L]||{dialogue:[],listening:{segments:[]}}; }
function classroomWords(c){
  const out=[], seen=new Set();
  c.lessons.forEach(L=>lessonWords(L).concat(lessonExtras(L).flatMap(e=>e.words)).forEach(w=>{if(!seen.has(w.key)){seen.add(w.key);out.push({w,L});}})); return out;
}
function classroomListeningData(config){
  const c=classroomConfig(config), supplied=classroomState().materials[c.blockId]?.listening;
  if(supplied&&supplied.zh) return {...supplied,custom:true,segments:Array.isArray(supplied.segments)?supplied.segments:[]};
  const segments=c.lessons.flatMap(L=>(classroomLessonData(L).listening?.segments||[]).map((x,i)=>({...x,L,id:'listen:'+L+':'+i})));
  return {title:'Учебный речитатив · '+c.title,kind:'original',zh:segments.map(x=>x.zh).join('。'),py:segments.map(x=>x.py||'').join(' '),ru:segments.map(x=>x.ru||'').join(' '),segments};
}
function classroomBalanced(items,n){
  const queues=new Map();items.forEach(x=>{const L=x.L||0;if(!queues.has(L)) queues.set(L,[]);queues.get(L).push(x);});
  const out=[];while(out.length<n&&[...queues.values()].some(q=>q.length)) for(const q of queues.values()){if(q.length&&out.length<n) out.push(q.shift());} return out;
}
function classroomChoice(right,all){ return shuffle(uniq([right,...shuffle(all.filter(x=>x&&x!==right)).slice(0,3)])); }
function classroomPool(config){
  const c=classroomConfig(config), words=classroomWords(c), lines=c.lessons.flatMap(L=>(classroomLessonData(L).dialogue||[]).map((x,i)=>({...x,L,id:'dialogue:'+L+':'+i})));
  if(c.stage==='vocab') return words.map(({w,L})=>({id:'vocab:'+w.key,kind:'vocab',k:w.key,L,zh:w.s,py:w.p,ru:meaning(w)}));
  if(c.stage==='decomp'){
    const seen=new Set(), out=[];
    c.lessons.forEach(L=>uniq((LESSON_CHARS[L]||[]).concat(classroomWords({...c,lessons:[L]}).flatMap(x=>hanOf(x.w.s)))).forEach(ch=>{if(!seen.has(ch)&&keysOf(ch).length){seen.add(ch);out.push({id:'decomp:'+ch,kind:'decomp',ch,L,zh:ch,py:charPy(ch),ru:charRu(ch)});}}));return out;
  }
  if(c.stage==='dialogue') return lines.map(x=>({...x,kind:'choice',prompt:'Что означает реплика: «'+x.zh+'»?',answer:x.ru,choices:classroomChoice(x.ru,lines.map(y=>y.ru).concat(['Нужно назвать свой номер телефона.','Это просьба купить билет.','Собеседник говорит о погоде.']))}));
  if(c.stage==='translation'){
    const pool=c.lessons.flatMap(L=>{const sentences=lessonSents(L);return (sentences.length?sentences:lines.filter(x=>x.L===L)).map((x,i)=>({id:'translation:'+L+':'+(x.id||i),kind:'translation',L,zh:x.zh,py:x.py,ru:x.ru}));});return classroomBalanced(pool,6).map((x,i)=>({...x,dir:i%2?'zh':'ru'}));
  }
  if(c.stage==='listening'){
    const data=classroomListeningData(c);let pool=data.segments.filter(x=>x.zh&&x.ru);
    if(pool.length<3) pool=c.lessons.flatMap(L=>(classroomLessonData(L).listening?.segments||[]).map(x=>({...x,L})));
    return classroomBalanced(pool.map((x,i)=>({...x,L:x.L||c.lessons[i%c.lessons.length],id:'listening:'+i+':'+x.zh,kind:'listening'})),6);
  }
  const pool=classroomBalanced(words.map(({w,L})=>({id:'quiz:'+w.key,kind:'choice',k:w.key,L,prompt:'Выбери иероглифы: «'+meaning(w)+'»',answer:w.s,choices:classroomChoice(w.s,words.filter(x=>meaning(x.w)!==meaning(w)).map(x=>x.w.s))})),8);
  return pool;
}
function classroomStageProgress(blockId,stage){
  const r=(State.meta.classroom||{}).progress?.[blockId]?.[stage];
  const ids=r?.targetIds||classroomPool({blockId,stage}).map(x=>x.id);
  return {done:ids.filter(id=>r?.covered?.[id]).length,total:ids.length};
}
function classroomStageDone(blockId,stage){ const r=(State.meta.classroom||{}).progress?.[blockId]?.[stage], p=classroomStageProgress(blockId,stage);return !!(r?.completedAt&&p.total&&p.done===p.total); }
function classroomRecord(c){ const p=classroomState().progress;const block=p[c.blockId]||(p[c.blockId]={});return block[c.stage]||(block[c.stage]={covered:{},attempts:0,correct:0}); }
function startClassroom(config){
  const c=classroomConfig(config), m=classroomState(), key=c.blockId+':'+c.stage, old=m.sessions[key];
  if(old&&!old.finished&&!config?.restart){m.session=old;go('classroom',{run:true});return;}
  const pool=classroomPool(c), r=classroomRecord(c);r.targetIds=pool.map(x=>x.id);
  if(!pool.length){toast('В выбранном наборе пока нет материала');return;}
  const remaining=pool.filter(x=>!r.covered[x.id]), working=remaining.length?remaining:pool;
  working.sort((a,b)=>{const rank=x=>x.kind==='vocab'?(isDue(x.k)?0:isNew(x.k)?1:2):0;return rank(a)-rank(b)||(r.seen?.[a.id]||0)-(r.seen?.[b.id]||0);});
  let queue=classroomBalanced(working,['vocab','decomp'].includes(c.stage)?8:pool.length).map(x=>({...clone(x),retry:false,input:'',ink:[]}));
  const ss={config:c,key,queue,index:0,revealed:false,phase:c.stage==='dialogue'?'intro':'questions',first:0,correct:0,started:Date.now(),finished:false};
  m.session=ss;m.sessions[key]=ss;m.activeBlockId=c.blockId;save('meta');go('classroom',{run:true});
}
function classroomVocabGrade(x,ok){
  const wasNew=isNew(x.k);
  if(wasNew||isDue(x.k)||!ok){State.cards[x.k]=FSRS.review(cardOf(x.k)||{},ok?3:1,REQ);if(wasNew){if(inSem(x.k))D().new++;memoryEnroll(x.k,{fresh:true});}else D().rv++;save('cards');}
  if(typeof markLearnedPractice==='function')markLearnedPractice(x.k);
}
function classroomAnswer(ok){
  const m=classroomState(), ss=m.session,x=ss?.queue[ss.index];if(!x||ss.finished||!ss.revealed||x.answered)return;x.answered=true;
  const r=classroomRecord(ss.config);
  if(typeof stopClassListening==='function')stopClassListening();
  if(!x.retry&&!x.spacer){r.seen=r.seen||{};r.seen[x.id]=Date.now();ss.first++;r.attempts++;D().t++;if(ok){ss.correct++;r.correct++;D().ok++;addXP(5);}if(x.kind==='vocab')classroomVocabGrade(x,ok);}
  if(ok&&!x.spacer)r.covered[x.id]=todayStr();
  else if(!x.retry&&!x.spacer){
    const retry={...clone(x),retry:true,revealed:false,answered:false,gaveUp:false,listened:false,input:'',ink:[]};
    const remaining=ss.queue.slice(ss.index+1).filter(t=>t.id!==x.id).length;
    const others=ss.queue.filter(t=>t.id!==x.id&&!t.retry&&!t.spacer);
    for(let i=remaining;i<2&&others.length;i++)ss.queue.push({...clone(others[i%others.length]),spacer:true,answered:false,gaveUp:false,listened:false,input:'',ink:[]});
    ss.queue.push(retry);
  }
  ss.index++;ss.revealed=false;
  if(ss.index>=ss.queue.length){ss.finished=true;ss.ended=Date.now();const p=classroomStageProgress(ss.config.blockId,ss.config.stage);if(p.total&&p.done===p.total)r.completedAt=Date.now();D().ls++;checkDay();}
  save('meta');render();
}
function classroomReveal(){
  const ss=classroomState().session,x=ss?.queue[ss.index];if(!x||ss.revealed)return;
  if(x.kind==='listening'&&!x.listened){toast('Сначала послушай фразу');return;}ss.revealed=true;save('meta');render();
}
function classroomListen(x){x.listened=true;save('meta');if(typeof playClassListening==='function')playClassListening(x);else Speech.say(x.zh,undefined,x.py);}
function classroomSourceView(v,c){
  const data=classroomListeningData(c);if(data.custom&&data.segments.filter(x=>x.zh&&x.ru).length<3)v.appendChild(el('p','note','Твой фрагмент доступен для свободной практики. Проверочные задания используют учебные фразы, пока не добавлены переводы хотя бы трёх строк.'));v.appendChild(el('p','note',data.custom?'Фрагмент, добавленный тобой. Перевод используется для самопроверки.':'Авторский учебный речитатив: озвученные фразы под мелодию, не запись исполнителя.'));
  if(data.audioUrl||data.url){try{const url=new URL(data.audioUrl||data.url);if(url.protocol==='https:'){const a=el('a','linkbtn','Открыть песню');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';v.appendChild(a);if(/\.(mp3|m4a|ogg|wav|aac|webm)(\?|$)/i.test(url.href)){const audio=el('audio');audio.controls=true;audio.preload='none';audio.src=url.href;audio.style.width='100%';v.appendChild(audio);}}}catch(e){}}
  if(typeof renderClassSongEditor==='function')renderClassSongEditor(v,c,()=>startClassroom({...c,restart:true}));
}
function classroomIntroduction(v,ss){
  v.appendChild(el('h2','title','Читаем диалоги'));
  v.appendChild(el('p','note','Короткие авторские диалоги по темам выбранных уроков. Прочитай реплики, послушай и затем проверь понимание.'));
  ss.config.lessons.forEach(L=>{const box=el('div','hero');box.style.marginTop='12px';box.appendChild(el('div','kind','Урок '+L+' · '+lessonTitle(L)));(classroomLessonData(L).dialogue||[]).forEach(line=>{const row=el('div','grammar-example');row.innerHTML=`<div class="han" style="font-size:25px">${esc(line.speaker||'')} ${esc(line.zh)}</div><p class="note">${pinyinHTML(line.py)}<br>${esc(line.ru)}</p>`;const say=el('button','say',SPK(18)+' Послушать');say.onclick=()=>Speech.say(line.zh,undefined,line.py);row.appendChild(say);box.appendChild(row);});v.appendChild(box);});
  const check=el('button','btn','Прочитал — проверить понимание');check.style.marginTop='16px';check.onclick=()=>{ss.phase='questions';save('meta');render();};v.appendChild(check);
}
function classroomEnd(v,ss){
  const c=ss.config,p=classroomStageProgress(c.blockId,c.stage), complete=classroomStageDone(c.blockId,c.stage);
  v.appendChild(el('h2','title','Этап занятия завершён'));
  v.appendChild(el('div','hero',`<div class="kind">${esc(c.title)}</div><h2>С первого раза ${ss.correct} из ${ss.first}</h2><p class="note">Проверено на этапе: ${p.done} из ${p.total}. ${complete?'Все задания этапа проверены.':'Остальная часть сохранена — продолжай короткими порциями.'}</p>`));
  const index=CLASSROOM_STAGES.findIndex(x=>x[0]===c.stage), next=CLASSROOM_STAGES[index+1];
  if(!complete){const more=el('button','btn','Следующая короткая порция');more.style.marginTop='12px';more.onclick=()=>startClassroom(c);v.appendChild(more);}
  if(next){const n=el('button','btn '+(complete?'':'ghost'),'Дальше: '+next[1]);n.style.marginTop='12px';n.onclick=()=>startClassroom({...c,stage:next[0]});v.appendChild(n);}
  const home=el('button','btn ghost','К занятию');home.style.marginTop='12px';home.onclick=()=>go('classroom',{blockId:c.blockId,lessons:c.lessons});v.appendChild(home);
}
function classroomRun(v,ss){
  const pause=el('button','back','‹ Сохранить и выйти');pause.onclick=()=>go('classroom',{blockId:ss.config.blockId,lessons:ss.config.lessons});v.appendChild(pause);
  if(ss.finished)return classroomEnd(v,ss);if(ss.phase==='intro')return classroomIntroduction(v,ss);
  const x=ss.queue[ss.index];if(!x){ss.finished=true;save('meta');return classroomEnd(v,ss);}
  v.appendChild(el('p','eyebrow',ss.config.title+' · '+CLASSROOM_STAGES.find(t=>t[0]===ss.config.stage)[1]));
  v.appendChild(el('div','progress',`<i style="width:${ss.index/ss.queue.length*100}%"></i>`));
  v.appendChild(el('p','note','Урок '+x.L+' · '+(ss.index+1)+'/'+ss.queue.length+(x.retry?' · исправление':x.spacer?' · закрепление':'')));
  if(ss.config.stage==='listening')classroomSourceView(v,ss.config);
  const q=el('div','qcard');q.style.minHeight='140px';v.appendChild(q);
  if(x.kind==='choice'){
    q.innerHTML=`<div class="qbig" style="font-size:22px">${esc(x.prompt)}</div>`;
    if(!ss.revealed){const choices=el('div','choices');x.choices.forEach((choice,i)=>{const b=el('button','choice',esc(choice));b.dataset.ch=String(i+1);b.onclick=()=>{x.input=choice;x.ok=choice===x.answer;ss.revealed=true;save('meta');render();};choices.appendChild(b);});v.appendChild(choices);}else classroomCheckedAnswer(v,ss,x,x.answer,x.ok);
    return;
  }
  if(x.kind==='decomp')q.innerHTML=`<div class="han" style="font-size:68px">${esc(x.ch)}</div><p class="note">Вспомни смысловой ключ, части, чтение и значение. Сначала разбор на бумаге, затем сверка.</p>`;
  else if(x.kind==='vocab')q.innerHTML=`<div class="qbig">${esc(x.ru)}</div><p class="note">Напиши иероглифы и пиньинь по памяти. На экране или на бумаге, затем сверь.</p>`;
  else if(x.kind==='translation')q.innerHTML=`<div class="${x.dir==='zh'?'qbig':'han'}" style="font-size:25px">${esc(x.dir==='zh'?x.ru:x.zh)}</div><p class="note">${x.dir==='zh'?'Переведи на китайский язык':'Переведи на русский язык'} до открытия ответа.</p>`;
  else{q.innerHTML='<div class="qbig">Послушай и переведи фразу</div>';const audio=el('button','btn mini',SPK(20)+' Слушать фразу');audio.onclick=()=>classroomListen(x);q.appendChild(audio);}
  if(!ss.revealed){
    if(x.kind==='vocab'&&typeof notebookPanel==='function'){v.appendChild(notebookPanel(x.k,{compact:true,hideModel:true}));}
    else if(x.kind==='vocab'&&typeof dictationInk==='function'){const ink=el('div');dictationInk(ink,x);v.appendChild(ink);}
    const show=el('button','btn','Сверить ответ');show.style.marginTop='12px';show.dataset.key='space';show.onclick=classroomReveal;v.appendChild(show);
    const no=el('button','linkbtn','Не помню — посмотреть');no.onclick=()=>{x.gaveUp=true;if(x.kind==='listening'&&!x.listened)classroomListen(x);classroomReveal();};v.appendChild(no);return;
  }
  const answer=x.kind==='decomp'?keyFormula(x.ch):`<div class="han" style="font-size:35px">${esc(x.zh)}</div><p>${pinyinHTML(x.py||'')}</p><p>${esc(x.ru||'')}</p>`;
  const result=el('div','hero');result.style.marginTop='12px';result.innerHTML=answer;v.appendChild(result);
  const grades=el('div','gradebar');const no=el('button','grade g1','Нужно повторить');no.dataset.key='1';no.onclick=()=>classroomAnswer(false);const yes=el('button','grade g3','Вспомнил верно');yes.dataset.key='2';yes.disabled=!!x.gaveUp;yes.onclick=()=>classroomAnswer(true);grades.append(no,yes);v.appendChild(grades);
}
function classroomCheckedAnswer(v,ss,x,answer,ok){
  v.appendChild(el('div','hero',`<div class="verdict ${ok?'ok':'bad'}">${ok?'Верно':'Разберём ответ'}</div><div class="han" style="font-size:28px">${esc(answer)}</div>${x.input?`<p class="note">Твой ответ: ${esc(x.input)}</p>`:''}`));
  const next=el('button','btn','Дальше');next.style.marginTop='12px';next.dataset.key='space';next.onclick=()=>classroomAnswer(ok);v.appendChild(next);
}
function viewClassroom(s){
  const v=el('div','view');s.appendChild(v);const m=classroomState(),ss=m.session;
  if(State.route.run&&ss)return classroomRun(v,ss);
  const c=classroomConfig(State.route.blockId||State.route.lessons?State.route:ss?ss.config:State.route),back=el('button','back','‹ На путь');back.onclick=()=>go('path');v.appendChild(back);
  v.appendChild(el('h1','',c.title));v.appendChild(el('p','note','Как на паре: прочитай диалог, повтори слова, переведи предложения, разбери знаки, послушай и закончи квизом. Любой этап можно открыть отдельно.'));
  CLASSROOM_STAGES.forEach(([stage,title])=>{const p=classroomStageProgress(c.blockId,stage),done=classroomStageDone(c.blockId,stage),b=el('button','row',`<span class="ri">${IC(done?'check':'book',26)}</span><div class="tt"><b>${esc(title)}</b><small>${p.done}/${p.total} проверено${done?' · этап пройден':''}</small></div>${IC('chev',18)}`);b.onclick=()=>startClassroom({...c,stage});v.appendChild(b);});
  if(typeof GRAMMAR!=='undefined'){const topics=GRAMMAR.topics.filter(t=>c.lessons.includes(t.lesson));if(topics.length){const g=el('button','btn ghost','Грамматика этого занятия');g.style.marginTop='16px';g.onclick=()=>go('grammar',{lesson:c.lessons[0]});v.appendChild(g);}}
}
