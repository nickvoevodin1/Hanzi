/* Free browsing and lesson-based scheduled review share the textbook deck. */
const STAGE_HOURS=[4,12,24,48,120];
const STAGE_LABELS=['4 ч','12 ч','1 день','2 дня','5 дней'];
function stageCardEntry(lesson){
  return recallState().staged?.[lesson];
}
function stageCardStart(lesson){
  const state=recallState();
  state.staged ||= {};
  const entry=state.staged[lesson] ||= {completed:0,due:0};
  if(!entry.session||entry.session.finished){
    if(entry.completed>STAGE_HOURS.length||entry.due>Date.now())return;
    const keys=textbookWords(lesson).map(w=>w.key);
    if(!keys.length)return;
    entry.session={staged:true,lesson,keys,index:0,round:0,facing:'han',revealed:false,
      current:{k:keys[0],skill:'flip'},finished:false};
  }
  save('meta');
  go('cards',{staged:lesson,run:true});
}
function stageCardRecord(session,grade){
  if(grade===1){
    // Keep mistakes in the current round and retry them after the remaining cards.
    session.keys.push(...session.keys.splice(session.index,1));
  }else{
    session.index++;
  }
  if(session.index===session.keys.length){
    if(session.round===0){
      session.round=1;
      session.index=0;
      session.keys=textbookWords(session.lesson).map(w=>w.key);
    }else{
      const entry=stageCardEntry(session.lesson);
      entry.completed++;
      const hours=STAGE_HOURS[entry.completed-1];
      entry.due=hours?Date.now()+hours*3600000:0;
      session.finished=true;
    }
  }
  session.revealed=false;
  session.current=session.finished?null:{k:session.keys[session.index],skill:session.round?'write':'flip'};
  save('meta');
  render();
}
function stageCardStatus(entry){
  if(entry?.completed>STAGE_HOURS.length)return 'Все пять повторений завершены';
  if(entry?.session&&!entry.session.finished)return 'Занятие начато';
  if(!entry?.completed)return 'Сначала чтение, затем письмо по переводу';
  const label=STAGE_LABELS[entry.completed-1];
  if(entry.due<=Date.now())return 'Повторение · '+label+' · доступно';
  const when=new Intl.DateTimeFormat('ru',{dateStyle:'short',timeStyle:'short'}).format(entry.due);
  return 'Следующее повторение · '+when;
}
function stageCardSummary(view,lesson){
  view.appendChild(el('h1','','Оба круга завершены'));
  view.appendChild(el('p','note',esc(stageCardStatus(stageCardEntry(lesson)))));
}
function startFreeCards(lesson){
  const state=recallState(),keys=textbookWords(lesson).map(w=>w.key);
  go('cards',{free:true,lesson,keys:state.mix?shuffle(keys):keys,index:0,facing:state.facing||'han'});
}
function viewFreeCards(view){
  const route=State.route,words=textbookWords(route.lesson);
  const keys=Array.isArray(route.keys)?route.keys:words.map(w=>w.key);
  const index=route.index||0,word=words.find(w=>w.key===keys[index]);
  const back=el('button','back','‹ К карточкам');back.onclick=()=>go('cards');view.appendChild(back);
  if(!word)return;
  view.appendChild(el('p','eyebrow',`Урок ${route.lesson} · ${index+1} / ${keys.length}`));
  const card=el('section','hero recall-card');view.appendChild(card);
  const faces={han:['han recall-glyph',esc(word.d||word.s)],ru:['tr recall-answer',esc(word.ru)],py:['py recall-answer',pinyinHTML(word.p)]};
  const side=Object.hasOwn(faces,route.facing)?route.facing:'han';
  card.appendChild(el('div',...faces[side]));
  if(route.revealed){
    for(const answer of ['han','py','ru'])if(answer!==side)card.appendChild(el('div',...faces[answer]));
  }else{
    const flip=el('button','btn','Показать ответ');flip.dataset.key='space';flip.onclick=()=>{route.revealed=true;render();};card.appendChild(flip);
  }
  const nav=el('div','actionrow');
  for(const [delta,label]of [[-1,'Назад'],[1,'Дальше']]){
    const button=el('button','btn ghost',label);
    button.onclick=()=>{route.index=(index+delta+keys.length)%keys.length;route.revealed=false;render();};
    nav.appendChild(button);
  }
  card.appendChild(nav);
}
recallCycleBanner=function(){
  const card=el('section','hero study-cycle-banner');
  card.appendChild(el('h2','','Карточки'));
  card.appendChild(el('p','note','Листай слова урока или проходи чтение и письмо с повторениями.'));
  const open=el('button','btn','Открыть карточки');open.onclick=()=>go('cards');card.appendChild(open);return card;
};
let stageCardTimer;
viewRecallCards=function(screen){
  clearTimeout(stageCardTimer);
  const view=el('div','view study-cards-view');screen.appendChild(view);
  if(State.route.free)return viewFreeCards(view);
  if(State.route.run)return recallSessionView(view);
  const state=recallState(),lesson=state.lessons[0]||1,free=state.cardType==='free';
  view.appendChild(el('h1','','Карточки'));
  const modes=el('div','chips');
  for(const [value,label]of [['staged','Поэтапные'],['free','Постоянные']]){
    const button=el('button','chip'+((value==='free')===free?' on':''),label);
    button.onclick=()=>{state.cardType=value;save('meta');render();};
    modes.appendChild(button);
  }
  view.appendChild(modes);
  const select=el('select');select.setAttribute('aria-label','Выбрать урок');
  for(let n=1;n<=NL;n++){
    const option=el('option','','Урок '+n);option.value=n;select.appendChild(option);
  }
  select.value=lesson;select.onchange=()=>{state.lessons=[+select.value];save('meta');render();};view.appendChild(select);
  if(free){
    const facing=el('select');facing.setAttribute('aria-label','Начать с');
    for(const [value,label]of [['han','Начать с иероглифов'],['ru','Начать с перевода'],['py','Начать с пиньиня']]){
      const option=el('option','',label);option.value=value;facing.appendChild(option);
    }
    facing.value=state.facing||'han';facing.onchange=()=>{state.facing=facing.value;save('meta');};view.appendChild(facing);
    const label=el('label','setrow'),mix=el('input');mix.type='checkbox';mix.checked=!!state.mix;
    mix.onchange=()=>{state.mix=mix.checked;save('meta');};label.append(mix,document.createTextNode(' Перемешать карточки'));view.appendChild(label);
    const start=el('button','btn','Листать карточки');start.onclick=()=>startFreeCards(lesson);view.appendChild(start);
  }else{
    const entry=stageCardEntry(lesson),active=entry?.session&&!entry.session.finished;
    view.appendChild(el('p','note',esc(stageCardStatus(entry))));
    view.appendChild(el('p','note','Интервалы после каждого занятия: 4 ч → 12 ч → 1 день → 2 дня → 5 дней.'));
    const start=el('button','btn',active?'Продолжить':entry?.completed?'Повторить урок':'Начать урок');
    start.disabled=!active&&(entry?.due>Date.now()||entry?.completed>STAGE_HOURS.length);
    start.onclick=()=>stageCardStart(lesson);view.appendChild(start);
    const due=Object.entries(state.staged||{}).filter(([n,item])=>+n!==lesson&&item.completed<=STAGE_HOURS.length&&(item.session&&!item.session.finished||item.completed&&item.due<=Date.now()));
    const now=Date.now();
    const upcoming=Object.values(state.staged||{}).map(item=>item.due).filter(time=>time>now);
    if(upcoming.length)stageCardTimer=setTimeout(()=>{if(view.isConnected)render();},Math.min(...upcoming)-now);
    for(const [n,item]of due){
      const button=el('button','btn ghost','Урок '+n+' · '+(item.session&&!item.session.finished?'продолжить':'повторить'));
      button.onclick=()=>{state.lessons=[+n];stageCardStart(+n);};view.appendChild(button);
    }
  }
};
