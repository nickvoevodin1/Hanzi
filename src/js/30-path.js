/*==================================================================
  ЕДИНЫЙ КУРС: ключи, слова, письмо и грамматика в 30 уроках.
  pathUnits() сохраняет прежние идентификаторы и справочные колоды;
  контрольные из настроек — «босс»-узлы после юнита последнего урока.
  Корона юнита (0–5) — из памяти: ≥80% элементов со стабильностью FSRS ≥1/3/7/21/60 дней.
==================================================================*/
let UNITS=null;
const UCOL=[['#ff9600','#e07b00'],['#1cb0f6','#1899d6'],['#ce82ff','#a568cc'],['#2b70c9','#1f5aa8'],['#ff4b4b','#ea2b2b']];   // цвет юнита и его «кромка»
const CROWN_S=[1,3,7,21,60];
const ZZ=[0,46,70,46,0,-46,-70,-46];
const PATH_OPEN={};                   // ручное раскрытие/сворачивание юнитов и групп
function chunk(a,n){ const o=[]; for(let i=0;i<a.length;i+=n) o.push(a.slice(i,i+n)); return o; }
function pathUnits(){ return UNITS||(UNITS=buildUnits()); }
function buildUnits(){
  const U=[];
  KEY_UNITS.forEach((ns,i)=>{
    const id='K'+(i+1), items=ns.map(n=>'r:'+n);
    const nodes=[];                   // 7 новых ключей → их пропись
    chunk(items,7).forEach((c,j)=>{ const first=radNum(c[0]), last=radNum(c[c.length-1]), t=first===last?String(first):first+'–'+last;
      nodes.push({id:id+'n'+(j+1),type:'learn',icon:'部',title:'Ключи '+t,items:c});
      nodes.push({id:id+'w'+(j+1),type:'write',alt:1,icon:'brushW',title:'Пропись ключей '+t,items:c.map(k=>'wr:'+k),after:id+'n'+(j+1)}); });
    nodes.push({id:id+'rev',type:'review',alt:1,icon:'cycle',title:'Повторение ключей',items});
    U.push({id,sec:'keys',title:'Ключи '+ns[0]+'–'+ns[ns.length-1],sub:ns.slice(0,8).map(n=>RADS[n-1][4][0]).join(' '),items,nodes,color:UCOL[(i+1)%UCOL.length]});
  });
  for(let L=1;L<=NL;L++){
    const id='L'+L, words=lessonKeys(L), main=words.filter(k=>!EXTRA_OF[k]), ext=words.filter(k=>EXTRA_OF[k]), nodes=[];
    chunk(main,7).forEach((c,j,a)=>nodes.push({id:id+'w'+(j+1),type:'learn',icon:'star',title:'Новые слова'+(a.length>1?' '+(j+1):''),items:c}));
    chunk(ext,7).forEach((c,j,a)=>nodes.push({id:id+'x'+(j+1),type:'learn',icon:'star',title:EXTRA_OF[c[0]].split(' · ')[0]+(a.length>1?' '+(j+1):''),items:c}));
    // иероглифы урока порциями по 8: разбор на ключи → пропись тех же знаков
    const kc=chunk(LESSON_CHARS[L].map(c=>'key:'+c).filter(validKey),8), wc=chunk(LESSON_CHARS[L].map(c=>'wr:'+c).filter(validKey),8);
    for(let j=0;j<Math.max(kc.length,wc.length);j++){
      if(kc[j]) nodes.push({id:id+'c'+(j+1),type:'chars',alt:1,icon:'splitW',title:'Иероглифы: разбор'+(kc.length>1?' '+(j+1):''),items:kc[j]});
      if(wc[j]) nodes.push({id:id+'p'+(j+1),type:'write',alt:1,icon:'brushW',title:'Иероглифы: пропись'+(wc.length>1?' '+(j+1):''),items:wc[j]});
    }
    nodes.push({id:id+'h',type:'hear',alt:1,icon:'headphones',title:'Тоны на слух',L});
    if(lessonSents(L).length) nodes.push({id:id+'s',type:'sent',alt:1,icon:'chatW',title:'Предложения',L});
    nodes.push({id:id+'rev',type:'review',alt:1,icon:'cycle',title:'Повторение урока',items:words});
    TESTS.filter(t=>t.lesson===L).forEach(t=>nodes.push({id:id+'t'+t.id,type:'test',alt:1,icon:'考',title:t.kind[0].toUpperCase()+t.kind.slice(1),tid:t.id}));
    nodes.push({id:id+'m',type:'mini',alt:1,icon:'pencilW',title:'Мини-контрольная',L});
    U.push({id,sec:'lessons',L,title:'Урок '+L,sub:lessonTitle(L),items:words,nodes,color:UCOL[(L-1)%UCOL.length]});
  }
  return U;
}
// Один учебный путь. Существующие L# узлы и карточки остаются теми же;
// новые CKL# узлы распределяют все 214 ключей по 30 урокам без повторов.
function courseUnits(){
  const topics=typeof GRAMMAR!=='undefined'&&Array.isArray(GRAMMAR.topics)?GRAMMAR.topics:[];
  return pathUnits().filter(u=>u.sec==='lessons').map(u=>{
    const a=Math.floor((u.L-1)*214/NL), b=Math.floor(u.L*214/NL);
    const radicals=KEY_ORDER.slice(a,b).map(n=>'r:'+n), keyNodes=[];
    chunk(radicals,4).forEach((items,j)=>{
      const range=radNum(items[0])+'–'+radNum(items[items.length-1]), id='CKL'+u.L+'n'+(j+1);
      keyNodes.push({id,type:'learn',icon:'部',title:'Ключи '+range,items});
      keyNodes.push({id:'CKL'+u.L+'w'+(j+1),type:'write',icon:'brushW',title:'Пишем ключи '+range,items:items.map(k=>'wr:'+k),after:id});
    });
    const grammar=topics.filter(t=>+t.lesson===u.L).map(t=>({id:'CG:'+t.id,type:'grammar',icon:'book',title:t.title,topicId:t.id,L:u.L,goal:t.goal||''}));
    const lessonNodes=u.nodes.map(n=>n.type==='review'?{...n,items:radicals.concat(n.items)}:n);
    const firstSentence=lessonNodes.findIndex(n=>['hear','sent','review','test','mini'].includes(n.type));
    const at=firstSentence<0?lessonNodes.length:firstSentence;
    return {...u,sec:'course',course:true,wordItems:u.items.slice(),radicals,
      items:radicals.concat(u.items),grammarCount:grammar.length,
      nodes:keyNodes.concat(lessonNodes.slice(0,at),grammar,lessonNodes.slice(at))};
  });
}
// Основной путь повторяет занятие на парах: один блок из 3–4 уроков,
// шесть проверяемых этапов. Его прогресс не выводится из старых словарных карточек.
const CLASS_PATH_STAGES=[
  {stage:'dialogue',title:'Читаем диалог',icon:'chatW',description:'Диалоги с озвучкой и вопросами по смыслу'},
  {stage:'vocab',title:'Повторяем слова',icon:'cards',description:'Вспоминаем написание и пиньинь по переводу, затем сверяем'},
  {stage:'translation',title:'Переводим предложения',icon:'pencilW',description:'Перевод в обе стороны: русский и китайский'},
  {stage:'decomp',title:'Разбираем иероглифы',icon:'splitW',description:'Ключ, части и смысл иероглифов выбранных уроков'},
  {stage:'listening',title:'Слушаем и переводим',icon:'headphones',description:'Учебный трек или песня с пары: слушаем, вспоминаем смысл, сверяем'},
  {stage:'quiz',title:'Квиз по иероглифам',icon:'target',description:'Короткая проверка иероглифов всех уроков блока'}
];
function courseClassUnits(size){
  const n=[3,4].includes(+size)?+size:State.meta.classroom&&+State.meta.classroom.blockSize===4?4:3;
  const language=courseUnits(), out=[];
  for(let first=1;first<=NL;first+=n){
    const lessons=Array.from({length:Math.min(n,NL-first+1)},(_,i)=>first+i), last=lessons[lessons.length-1];
    const blockId='CL'+first+'-'+last;
    const words=uniq(lessons.flatMap(L=>lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words)).map(w=>w.key)));
    const radicals=lessons.flatMap(L=>language[L-1].radicals);
    const chars=uniq(lessons.flatMap(L=>LESSON_CHARS[L]||[]));
    const nodes=CLASS_PATH_STAGES.map(stage=>({id:blockId+':'+stage.stage,type:'classroom',...stage,blockId,lessons:lessons.slice(),L:first,
      items:stage.stage==='vocab'||stage.stage==='quiz'?words.slice():stage.stage==='decomp'?chars.map(ch=>'key:'+ch):[]}));
    out.push({id:blockId,blockId,classroom:true,sec:'classroom',L:first,lastLesson:last,lessons,
      title:'Занятие '+(out.length+1)+' · уроки '+first+'–'+last,
      sub:lessons.map(L=>lessonTitle(L)).join(' · '),wordItems:words,radicals,items:words.concat(radicals),nodes,color:UCOL[out.length%UCOL.length]});
  }
  return out;
}
function courseClassStageStats(u){ return {done:u.nodes.filter(nodeDone).length,total:u.nodes.length}; }
function classPathProgress(n){
  if(typeof classroomStageProgress==='function'){
    const p=classroomStageProgress(n.blockId,n.stage)||{};
    return {done:Math.max(0,+p.done||0),total:Math.max(0,+p.total||0)};
  }
  return {done:nodeDone(n)?1:0,total:1};
}
function courseRequiredNodes(u){ if(u.classroom) return u.nodes; return u.course?u.nodes.filter(n=>['learn','chars','write','grammar'].includes(n.type)):learnNodes(u); }
// Known words still give access to their lesson and the next lesson. Adding
// writing and grammar never erases progress or silently declares them passed.
function courseWordsComplete(u){ return !!u&&u.wordItems.length>0&&u.wordItems.every(k=>!isNew(k)); }
function crownsOf(keys){
  if(!keys.length) return 0; let c=0;
  for(const t of CROWN_S){ if(keys.filter(k=>stab(k)>=t).length/keys.length>=0.8) c++; else break; }
  return c;
}
function unitCrowns(u){ return crownsOf(u.items); }
const learnNodes=u=>u.nodes.filter(n=>n.type==='learn');
function nodeDone(n){
  if(n.type==='classroom') return typeof classroomStageDone==='function'&&classroomStageDone(n.blockId,n.stage);
  if(n.type==='grammar') return typeof grammarTopicDone==='function'&&grammarTopicDone(n.topicId);
  if(n.type==='learn'||n.type==='chars'||n.type==='write') return n.items.length>0&&n.items.every(k=>!isNew(k));
  if(n.type==='test'){ const tp=State.tp[n.tid]; return !!(tp&&tp.final); }
  return !!State.meta.nodes[n.id];
}
function nodeCracked(n){ if(n.type==='classroom') return false; if(n.type==='grammar') return nodeDone(n)&&typeof grammarDueIds==='function'&&grammarDueIds().includes(n.topicId); return (n.type==='learn'||n.type==='chars'||n.type==='write'||n.type==='review')&&nodeDone(n)&&n.items.some(isDue); }
function unitComplete(u){ return courseRequiredNodes(u).every(nodeDone); }
function unitOpen(u,i,list){
  if(u.classroom) return true;
  if(!u.course) return i===0||!!State.meta.jumps[u.id]||u.items.some(k=>!isNew(k))||unitComplete(list[i-1]);
  return i===0||!!State.meta.jumps[u.id]||u.wordItems.some(k=>!isNew(k))||u.nodes.some(n=>n.type==='grammar'&&nodeDone(n))||unitComplete(list[i-1])||courseWordsComplete(list[i-1]);
}
function nodeState(u,n,open){
  if(n.type==='classroom') return nodeDone(n)?'done':'avail';
  const done=nodeDone(n);
  if(done) return nodeCracked(n)?'cracked':'done';
  if(!open) return 'locked';
  const ln=learnNodes(u);
  if(u.course){
    if(n.type==='learn'){
      const lane=ln.filter(x=>x.items.every(isRad)===n.items.every(isRad)), j=lane.indexOf(n);
      return j===0||nodeDone(lane[j-1])||n.items.some(k=>!isNew(k))?'avail':'locked';
    }
    if(n.type==='mini') return courseRequiredNodes(u).every(nodeDone)?'avail':'locked';
    if(n.type==='test') return 'avail';
    if(n.after){ const before=u.nodes.find(x=>x.id===n.after); return !before||nodeDone(before)||n.items.some(k=>!isNew(k))?'avail':'locked'; }
    const firstWords=ln.find(x=>!x.items.every(isRad));
    return !firstWords||nodeDone(firstWords)||u.wordItems.some(k=>!isNew(k))?'avail':'locked';
  }
  if(n.type==='learn'){ const j=ln.indexOf(n); return j===0||nodeDone(ln[j-1])||n.items.some(k=>!isNew(k))?'avail':'locked'; }
  if(n.type==='mini') return ln.every(nodeDone)?'avail':'locked';
  if(n.type==='test') return 'avail';
  if(n.after){ const a=u.nodes.find(x=>x.id===n.after); return !a||nodeDone(a)||n.items.some(k=>!isNew(k))?'avail':'locked'; }   // пропись ключей — после их узла
  return !ln.length||nodeDone(ln[0])?'avail':'locked';
}
function examBosses(L){
  return (SEM().exams||[]).filter(e=>e.date&&(e.lessons||[]).length&&Math.max(...e.lessons)===L)
    .map(e=>({id:'E'+e.date+':'+e.lessons.join(','),type:'exam',icon:'trophy',title:e.title||'Контрольная',lessons:e.lessons,date:e.date}));
}

// — запуск узла
function openNode(u,n,st){
  if(st==='locked'){ toast(n.type==='learn'?'Сначала пройди предыдущий узел — или «Перепрыгни»':n.after?'Откроется, когда выучишь эти ключи':'Откроется после первых слов юнита'); return; }
  const base={title:(u?u.title+' · ':'')+n.title,node:n.id};
  if(n.type==='classroom'){
    startClassroom({lessons:n.lessons.slice(),stage:n.stage,blockId:n.blockId,title:(u?u.title+' · ':'')+n.title});
  }else if(n.type==='learn'){
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);
    const keys=n.items.length>0&&n.items.every(isRad);
    if(nw.length||due.length){
      const portion=keys?n.items.filter(k=>isNew(k)||isDue(k)):due.concat(nw);
      const mixed=withLearnedReview(portion,{kind:keys?'keys':'words',lessonMax:u&&u.L});
      playStart(mixed,{...base,title:base.title+(mixed.length>portion.length?' · повторение пройденного':''),kind:'learn'});
    }
    else playStart((keys?n.items:shuffle(n.items)).slice(0,8),{...base,kind:'practice'});
  }else if(n.type==='grammar'){
    startGrammar([n.topicId],{...base,back:'path'});
  }else if(n.type==='chars'){
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);
    playStart((nw.length||due.length?due.concat(nw):shuffle(n.items)).slice(0,6),{...base,kind:'chars'});
  }else if(n.type==='write'){
    const nw=n.items.filter(isNew), due=n.items.filter(isDue);   // по 4 новых за раз: знакомство + обвести + по памяти
    playStart(nw.length||due.length?due.slice(0,4).concat(nw.slice(0,4)):shuffle(n.items).slice(0,6),{...base,kind:'write'});
  }else if(n.type==='review'){
    const got=n.items.filter(k=>!isNew(k)); if(!got.length){ toast('Сначала выучи слова юнита'); return; }
    playStart(got.filter(isDue).concat(got.filter(k=>!isDue(k)).sort((a,b)=>stab(a)-stab(b))).slice(0,12),{...base,kind:'review'});
  }else if(n.type==='sent'){
    playStart(shuffle(lessonSents(n.L)).slice(0,8).map(x=>'sent:'+x.id),{...base,kind:'sent'});
  }else if(n.type==='hear'){
    const ws=lessonKeys(n.L).map(k=>BYK[k]).filter(Boolean);
    startToneDrill(ws,{...base,kind:'tones'});
  }else if(n.type==='test') go('test',{home:1,tid:n.tid});
  else if(n.type==='mini') go('mock',{setup:{lessons:[n.L],node:n.id,title:'Мини-контрольная · урок '+n.L}});
  else if(n.type==='exam') go('mock',{setup:{lessons:n.lessons,node:n.id,title:n.title}});
}
// — «Урок дня»: порции по 10–15 заданий (новое слово = знакомство + 2 задания, повторение = 1)
function dailyPortion(){
  const K=newKeysToday().slice(0,1), W=newWordsToday().slice(0,2), fresh=K.concat(W);
  const R=dueKeys().slice(0,Math.max(0,12-3*fresh.length));
  const base=R.slice(0,2).concat(fresh,R.slice(2));
  return withLearnedReview(base,{limit:Math.max(0,2-R.length)});
}
function startDaily(){ const p=dailyPortion(); if(!p.length){ toast('На сегодня всё: повторения и новые сделаны'); return; } playStart(p,{title:'Урок дня',kind:'daily',more:dailyPortion}); }
function startPart(id){
  if(id==='rev'){ const f=()=>dueKeys().slice(0,12); if(!f().length){ toast('Повторений к сроку нет'); return; } playStart(f(),{title:'Повторения',kind:'review',more:f}); }
  else if(id==='new'){ const f=()=>withLearnedReview(newWordsToday().slice(0,3),{kind:'words'}); if(!f().length){ toast('Квота новых слов выполнена'); return; } playStart(f(),{title:'Новые слова + пройденное',kind:'learn',more:f}); }
  else if(id==='keys'){ const f=()=>withLearnedReview(newKeysToday().slice(0,3),{kind:'keys'}); if(!f().length){ toast('Ключи на сегодня введены'); return; } playStart(f(),{title:'Новые ключи + пройденное',kind:'learn',more:f}); }
  else if(id==='dec') go('decomp');
  else if(id==='wr') startWrite();
  else if(id==='sent') go('sent');
  else if(id==='mock') go('mock');
}
// — «Перепрыгнуть»: тест по закрытым юнитам до выбранного; 80%+ открывает юниты.
// Карточки получают только проверенные слова — выборка не доказывает знание остальных.
function jumpStart(u){
  const list=u.course?courseUnits():pathUnits().filter(x=>x.sec===u.sec), b=list.findIndex(x=>x.id===u.id);
  let a=list.findIndex((x,i)=>!unitOpen(x,i,list)); if(a<0||a>b) a=b;
  const units=list.slice(a,b+1), items=uniq(units.flatMap(x=>x.items)).filter(isNew);
  if(!items.length){ toast('Здесь нечего проверять'); return; }
  playStart(shuffle(items).slice(0,15),{title:'Перепрыгнуть: '+(units.length>1?units[0].title+' — ':'')+u.title,kind:'jump',test:true,jump:{units:units.map(x=>x.id),items}});
}
function jumpFinish(){
  const P=PLAY, pct=P.first?P.firstOk/P.first:0; P.pct=Math.round(pct*100); P.passed=pct>=0.8;
  if(P.passed){
    P.opts.jump.items.forEach(k=>{ const it=P.items[k]; if(!isNew(k)||!it||it.left>0) return; const g=it.fail?1:3;
      State.cards[k]=FSRS.review({},g,REQ); });
    P.opts.jump.units.forEach(id=>{ State.meta.jumps[id]=todayStr(); });
    D().ls++; confetti(); Sfx.done();
  }
  checkDay(); checkAch();
}
function jumpEnd(s){
  const P=PLAY, v=el('div','view endwrap');
  v.innerHTML=mascot(P.passed?'cheer':'cheer',110)+`<h2 style="color:${P.passed?'var(--ok-text)':'var(--primary-text)'}">${P.passed?'Перепрыгнул!':'Пока рано'}</h2>
    <div class="endstats"><div class="estat acc"><small>Верно</small><b>${P.pct}%</b></div><div class="estat"><small>Нужно</small><b>80%</b></div></div>
    <p class="note">${P.passed?'Юниты открыты. Проверенные слова попадут в повторение. Остальные учи по порядку — они ещё не проверены.':'Пройди юниты по порядку — так надёжнее. Попробовать снова можно в любой момент.'}</p>`;
  const b=el('button','btn','На путь'); b.dataset.key='space'; b.onclick=()=>{ PLAY=null; go('path'); }; v.appendChild(b);
  s.appendChild(v);
}

// — экран
function viewPath(s){
  applyFreezes(); renderTop();
  const v=el('div','view'), plan=dayPlan(), d=D();
  let mst='calm', say='';
  if(plan.type==='away'||plan.type==='holiday') mst='sleep';
  else if(!d.met&&new Date().getHours()>=19&&streakLen()>0) mst='sad';
  else if(d.met) { mst='happy'; say='День засчитан — серия '+streakLen()+' '+plural(streakLen(),'день','дня','дней')+'!'; }
  v.insertAdjacentHTML('beforeend',mascotRow(mst,say));
  if(PLAY&&!PLAY.end&&playLeft()){ const cb=el('button','btn blue',IC('play',16)+' Продолжить урок ('+playLeft()+')'); cb.style.marginBottom='12px'; cb.onclick=()=>go('play'); v.appendChild(cb); }
  v.appendChild(courseCard());
  const memory=el('details','study-memory'); memory.open=memoryStats().active;
  memory.appendChild(el('summary','','Новое + знакомое · повторение слов и ключей')); memory.appendChild(memoryCard()); v.appendChild(memory);
  const shortcuts=el('div','study-shortcuts');
  [['book','Грамматика и правила с пары','grammar'],['pencil','Готовлюсь к диктанту','dictation'],['brush','Пишу на экране','write']].forEach(([ic,title,route])=>{
    const b=el('button','',IC(ic,22)+esc(title)); b.onclick=()=>route==='write'?startWrite():go(route); shortcuts.appendChild(b);
  }); v.appendChild(shortcuts);
  const extra=el('details','study-extra'); extra.style.marginTop='14px';
  extra.appendChild(el('summary','','Другие тренировки на сегодня')); extra.appendChild(planCard(plan)); v.appendChild(extra);
  const wk=weekInfo();
  if(wk.chest==='ready'){ const ch=el('div','hero chest',`<span class="cico">${IC('chest',52)}</span><div style="flex:1"><b style="color:var(--title)">Недельный сундук!</b><div class="note" style="margin:2px 0 0">Цель недели ${wk.goal} XP выполнена</div></div>`);
    ch.style.marginTop='12px'; const ob=el('button','btn gold mini','Открыть'); ob.onclick=()=>{ ch.classList.add('open'); const g=openChest(); Sfx.done(); confetti(); setTimeout(()=>{ toast('+'+g+' XP'); render(); },900); }; ch.appendChild(ob); v.appendChild(ch); }
  v.appendChild(pathEl());
  s.appendChild(v);
  checkQuests(); checkAch();
}
function planCard(plan){
  const c=el('div','hero'); c.style.marginTop='12px';
  const dq=dailyQueue().length;
  c.innerHTML=`<div class="kind">Сегодня · ${esc(DAY_NAMES[plan.type])}${plan.minutes?' · ≈'+plan.minutes+' мин':' · план выполнен'}${SEM().on&&plan.type==='normal'?' (норма ~'+SEM().minutesNormal+')':''}</div>`;
  const b=el('button','btn',dq?IC('play',16)+' Урок дня':IC('check',16)+' Урок дня пройден'); b.style.margin='10px 0 6px'; b.disabled=!dq; b.dataset.key='space'; b.onclick=startDaily;
  c.appendChild(b);
  plan.items.forEach(it=>{
    const pct=it.need?Math.min(100,it.cur/it.need*100):(it.done?100:0);
    const q=el('button','quest'+(it.done?' done':''),`<span class="qi">${it.done?IC('checkOk',28):icn(it.icon,28)}</span><span class="qm"><b>${esc(it.title)}${it.quest?' <span class="star">'+IC('star',14)+'</span>':''}</b><small>${esc(it.sub)}${!it.done&&it.min?' · ≈'+it.min+' мин':''}</small>
      <span class="bar${it.done?' ok':''}"><i style="width:${pct}%"></i></span></span><span class="chev">${IC('chev',16)}</span>`);
    q.onclick=()=>startPart(it.id); c.appendChild(q);
  });
  const d=D();
  c.appendChild(el('div','note',d.q?`${IC('chest',18)} Все задания дня выполнены — бонус +${XP.quests} XP получен`:`<span class="star">${IC('star',14)}</span> — задания дня: выполни все 3 — бонус +${XP.quests} XP`));
  return c;
}
function unitBanner(u,i,list,open){
  if(u.classroom){
    const progress=courseClassStageStats(u), known=u.wordItems.filter(k=>!isNew(k)).length;
    const b=el('button','ubanner classroom-banner',`<div class="ut"><small>${esc(u.title)}</small><b>${esc(u.sub)}</b><span class="tag">${known}/${u.wordItems.length} знакомых слов</span><span class="tag">6 этапов занятия</span>${u.lessons.includes(groupL())?`<span class="tag">${IC('pin',14)} Здесь группа</span>`:''}</div><div class="crowns">${IC(progress.done===progress.total?'check':'books',25)}<b>${progress.done}/${progress.total}</b><small>этапов</small></div>`);
    b.style.background=u.color[0]; b.style.boxShadow='0 4px 0 '+u.color[1];
    b.onclick=()=>{ PATH_OPEN[u.id]=!unitExpanded(u,i,list); render(); }; return b;
  }
  const cr=unitCrowns(u), required=courseRequiredNodes(u), done=required.filter(nodeDone).length, all=required.length, ck=u.nodes.filter(nodeCracked).length;
  const b=el('button','ubanner'+(open?'':' locked'),`<div class="ut"><small>${esc(u.title)}</small><b class="${u.sec==='keys'?'han':''}">${esc(u.sub)}</b>
    ${u.course?`<span class="tag">Ключи ${radNum(u.radicals[0])}–${radNum(u.radicals[u.radicals.length-1])}</span><span class="tag">${u.wordItems.length} слов</span><span class="tag">Грамматика: ${u.grammarCount}</span>`:''}
    ${(u.sec==='lessons'||u.course)&&u.L===groupL()?`<span class="tag">${IC('pin',14)} Здесь группа</span>`:''}${ck?`<span class="tag">${IC('dumbbell',14)} повторить: ${ck}</span>`:''}</div>
    <div class="crowns">${open?IC('crown',24)+'<b>'+cr+'</b>':IC('lock',22)}<small>${done}/${all}</small></div>`);
  if(open){ b.style.background=u.color[0]; b.style.boxShadow='0 4px 0 '+u.color[1]; }
  b.onclick=()=>{ PATH_OPEN[u.id]=!unitExpanded(u,i,list); render(); };
  return b;
}
function unitExpanded(u,i,list){
  if(u.id in PATH_OPEN) return PATH_OPEN[u.id];
  if(u.classroom){
    const active=(State.meta.classroom||{}).activeBlockId;
    const next=list.findIndex(x=>!unitComplete(x));
    return active?u.id===active:i===next||u.lessons.includes(groupL());
  }
  if(u.course){
    const next=list.findIndex((x,j)=>unitOpen(x,j,list)&&!unitComplete(x));
    return unitOpen(u,i,list)&&!unitComplete(u)&&(i===next||u.L===groupL());
  }
  return unitOpen(u,i,list)&&!unitComplete(u);
}
let PATH_POP=null;                    // открытая подсказка узла (как у Duolingo: тап → карточка с «Начать»)
function nodeGlyph(n,st){
  if(st==='done'&&(n.type==='learn'||n.type==='classroom')) return IC('check',34);
  if(n.icon==='部'||n.icon==='考') return `<span class="han">${n.icon}</span>`;
  return IC(n.icon||'star',n.type==='exam'?40:34);
}
function nodeDesc(n,st){
  if(n.type==='classroom'){ const p=classPathProgress(n); return n.description+(p.total?' · проверено '+Math.min(p.done,p.total)+'/'+p.total:''); }
  const it=n.items||[], nw=it.filter(isNew).length, due=it.filter(isDue).length;
  if(st==='locked') return n.type==='learn'?'Сначала пройди предыдущие узлы — или «Перепрыгни» тестом':n.after?'Откроется, когда выучишь эти ключи':'Откроется после первых слов юнита';
  if(n.type==='learn') return nw?`${nw} ${n.items[0]&&isRad(n.items[0])?plural(nw,'новый ключ','новых ключа','новых ключей'):plural(nw,'новое слово','новых слова','новых слов')}${due?' · повторить '+due:''}`:due?'Пора повторить: '+due:'Пройдено — можно потренироваться';
  if(n.type==='grammar') return (n.goal?n.goal+' · ':'')+'Правило, примеры и самостоятельная проверка';
  if(n.type==='chars') return `Разбор ${it.length} ${plural(it.length,'иероглифа','иероглифов','иероглифов')}: тип, ключ, фонетик`;
  if(n.type==='write'){ const kk=it[0]&&isRad(wrOf(it[0])); return (nw?`Пропись: ${nw} ${kk?plural(nw,'новый ключ','новых ключа','новых ключей'):plural(nw,'новый иероглиф','новых иероглифа','новых иероглифов')}`:due?'Пропись по памяти — к сроку: '+due:'Повторить пропись')+' · порядок черт, обвести, по памяти'; }
  if(n.type==='sent') return 'Перевод предложений урока RU→中 и 中→RU';
  if(n.type==='hear') return 'Слоги и слова урока в записи носителей: угадай тон';
  if(n.type==='review') return due?'К сроку: '+due:'Повторение всего юнита';
  if(n.type==='test') return 'Проверочная: полный цикл подготовки';
  if(n.type==='mini') return 'Мини-контрольная: слова и предложения урока';
  if(n.type==='exam') return 'Контрольная '+fmtDate(n.date)+' · уроки '+n.lessons.join(', ');
  return '';
}
function nodePop(u,n,st,x){
  const p=el('div','npop'+(st==='locked'?' locked':''));
  if(st!=='locked'&&u){ p.style.background=u.color[0]; p.style.setProperty('--lip',u.color[1]); p.style.setProperty('--npbg',u.color[0]); }
  p.style.setProperty('--ax',x+'px');
  p.innerHTML=`<b>${esc(n.title)}</b><small>${esc(nodeDesc(n,st))}</small>`;
  if(st!=='locked'){ const b=el('button','popbtn',st==='done'?'Повторить':'Начать'+(n.type==='learn'||n.type==='chars'||n.type==='write'||n.type==='sent'||n.type==='review'?' · +'+XP.task+' XP':''));
    b.style.color=u?u.color[0]:'var(--primary-text)'; b.dataset.key='space'; b.onclick=()=>{ PATH_POP=null; openNode(u,n,st); }; p.appendChild(b); }
  return p;
}
function renderNodes(host,u,open,curId){
  const p=el('div','path');
  u.nodes.forEach((n,j)=>{
    const st=nodeState(u,n,open), isCur=n.id===curId, x=ZZ[j%ZZ.length];
    const w=el('div','pnode '+st+(isCur?' cur':''));
    w.style.transform=`translateX(${x}px)`;
    if(st!=='locked'){ w.style.setProperty('--nc',u.color[0]); w.style.setProperty('--nl',u.color[1]); }
    const face=el('div','nodeface');
    if(isCur){
      const it=n.items||[], progress=n.type==='classroom'?classPathProgress(n):null, f=progress?(progress.total?Math.min(1,progress.done/progress.total):0):it.length?it.filter(k=>!isNew(k)).length/it.length:0, R=44, C=2*Math.PI*R;
      face.insertAdjacentHTML('beforeend',`<svg class="nring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="#e5e5e5" stroke-width="9"/>
        <circle cx="50" cy="50" r="${R}" fill="none" stroke="${u.color[0]}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`);
      w.appendChild(el('div','startbubble','Начать'));
      w.insertAdjacentHTML('beforeend',`<div class="pmascot ${x>=0?'l':'r'}">${mascot('calm',86)}</div>`);
    }
    const b=el('button','disc',nodeGlyph(n,st));
    b.setAttribute('aria-label',n.title+(st==='locked'?' (закрыт)':st==='cracked'?' (пора повторить)':st==='done'?' (пройден)':''));
    b.onclick=e=>{ e.stopPropagation(); PATH_POP=PATH_POP===n.id?null:n.id; render(); };
    face.appendChild(b); w.appendChild(face);
    if(n.type==='classroom') w.appendChild(el('div','lab',esc(n.title)));
    if(st==='cracked') w.insertAdjacentHTML('beforeend',`<span class="nbadge" title="пора повторить">${IC('dumbbell',22)}</span>`);
    p.appendChild(w);
    if(PATH_POP===n.id) p.appendChild(nodePop(u,n,st,x));
  });
  host.appendChild(p);
}
function renderBoss(host,L){
  examBosses(L).forEach(n=>{
    const done=!!State.meta.nodes[n.id], d=daysTo(n.date);
    const w=el('div','pnode boss'+(done?' done':''));
    const b=el('button','disc',done?IC('check',38):IC('trophy',46)); b.setAttribute('aria-label',n.title); b.onclick=()=>openNode(null,n,'avail'); w.appendChild(b);
    w.appendChild(el('div','lab',`${esc(n.title)} · ${fmtDate(n.date)}${d!=null&&d>=0?' ('+whenText(d)+')':''}<br>уроки ${esc(n.lessons.join(', '))}`));
    const p=el('div','path'); p.appendChild(w); host.appendChild(p);
  });
}
function pathEl(){
  const wrap=el('div','course-path classroom-path'), list=courseClassUnits();
  wrap.appendChild(el('div','section','<h3>Китайский как на парах · уроки 1–30</h3>'));
  wrap.appendChild(el('p','note','Одно занятие объединяет 3–4 урока: диалог → слова → перевод → разбор → аудирование → квиз. Можно открыть нужный этап или продолжить по порядку.'));
  const options=el('div','chips');
  [3,4].forEach(size=>{ const current=(State.meta.classroom||{}).blockSize===4?4:3;
    const b=el('button','chip'+(current===size?' on':''),'По '+size+' урока'); b.setAttribute('aria-pressed',current===size?'true':'false');
    b.onclick=()=>{ const m=State.meta.classroom||(State.meta.classroom={}); m.blockSize=size; delete m.activeBlockId; save('meta'); render(); }; options.appendChild(b);
  }); wrap.appendChild(options);
  const grammar=el('button','btn ghost mini',IC('book',18)+' Грамматика отдельно'); grammar.onclick=()=>go('grammar'); wrap.appendChild(grammar);
  let curId=null;
  const active=(State.meta.classroom||{}).activeBlockId;
  const target=active?list.find(u=>u.blockId===active):list.find(u=>!unitComplete(u));
  if(target){ const next=target.nodes.find(n=>!nodeDone(n)); if(next) curId=next.id; }
  list.forEach((u,i)=>{
    wrap.appendChild(unitBanner(u,i,list,true));
    if(unitExpanded(u,i,list)){
      renderNodes(wrap,u,true,curId);
      const linked=el('div','actionrow');
      const grammarButton=el('button','btn ghost mini','Грамматика и правила'); grammarButton.onclick=()=>go('grammar',{home:true}); linked.appendChild(grammarButton);
      const keys=el('button','btn ghost mini','Ключи '+radNum(u.radicals[0])+'–'+radNum(u.radicals[u.radicals.length-1])); keys.onclick=()=>{
        const portion=()=>u.radicals.filter(isDue).concat(u.radicals.filter(isNew)).slice(0,4), p=portion();
        playStart(withLearnedReview(p.length?p:u.radicals.slice(0,4),{kind:'keys'}),{title:'Ключи '+radNum(u.radicals[0])+'–'+radNum(u.radicals[u.radicals.length-1]),kind:'learn',more:()=>withLearnedReview(portion(),{kind:'keys'})});
      }; linked.appendChild(keys); wrap.appendChild(linked);
      u.lessons.forEach(L=>renderBoss(wrap,L));
    }
  });
  return wrap;
}
