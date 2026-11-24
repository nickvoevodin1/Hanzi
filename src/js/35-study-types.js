/* Free browsing and lesson-based scheduled review share the textbook deck. */
const STAGE_HOURS=[4,12,24,48,120];
const STAGE_LABELS=['4 ч','12 ч','1 день','2 дня','5 дней'];
function deckId(lesson,keys){return keys?'keys:'+lesson:lesson;}
function deckWords(lesson,keys){
  if(!keys)return textbookWords(lesson);
  return recallLessonKeys(lesson).map(key=>{
    const info=recallInfo(key);
    return {key,d:info.hz,p:info.py,ru:info.ru};
  });
}
function stageCardEntry(lesson,keys=false){
  return recallState().staged?.[deckId(lesson,keys)];
}
function stageCardAvailable(lesson,radicals){
  const entry=stageCardEntry(lesson,radicals);
  return !entry||entry.session&&!entry.session.finished
    ||entry.completed<=STAGE_HOURS.length&&entry.due<=Date.now();
}
function startStageBatch(lessons,radicals){
  const [first,...remaining]=lessons.filter(lesson=>stageCardAvailable(lesson,radicals));
  if(first)stageCardStart(first,radicals,remaining);
}
function stageCardStart(lesson,radicals=false,remaining=[]){
  const state=recallState();
  state.staged ||= {};
  const id=deckId(lesson,radicals);
  const entry=state.staged[id] ||= {completed:0,due:0};
  if(!entry.session||entry.session.finished){
    if(entry.completed>STAGE_HOURS.length||entry.due>Date.now())return;
    const keys=deckWords(lesson,radicals).map(w=>w.key);
    if(!keys.length)return;
    entry.session={staged:true,lesson,radicals,keys,index:0,round:0,facing:'han',revealed:false,
      current:{k:keys[0],skill:'flip'},finished:false};
  }
  save('meta');
  go('cards',{staged:id,run:true,remainingLessons:remaining});
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
      session.keys=deckWords(session.lesson,session.radicals).map(w=>w.key);
    }else{
      const entry=stageCardEntry(session.lesson,session.radicals);
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
function stageCardSummary(view,lesson,radicals){
  view.appendChild(el('h1','','Оба круга завершены'));
  view.appendChild(el('p','note',esc(stageCardStatus(stageCardEntry(lesson,radicals)))));
  const remaining=(State.route.remainingLessons||[]).filter(n=>stageCardAvailable(n,radicals));
  if(remaining.length){
    const next=el('button','btn','Следующий урок · '+remaining[0]);
    next.onclick=()=>startStageBatch(remaining,radicals);view.appendChild(next);
  }
}
function startFreeCards(lessons,radicals=false){
  const state=recallState();
  const cards=lessons.flatMap(lesson=>deckWords(lesson,radicals).map(w=>({lesson,key:w.key})));
  if(!cards.length)return;
  go('cards',{free:true,radicals,deck:state.mix?shuffle(cards):cards,index:0,facing:state.facing||'han',mixTypes:!!state.mixTypes});
}
function setFreeCardTask(route,writingSide){
  const entry=route.deck[route.index||0];
  if(!entry)return;
  let side=writingSide||route.facing||'han';
  if(route.mixTypes){
    if(!route.cues?.length)route.cues=shuffle(['han','ru','py']);
    side=route.cues.shift();
  }
  const writing=!!writingSide||(route.mixTypes&&side!=='han');
  route.practice={
    free:true,lesson:entry.lesson,radicals:route.radicals,facing:side,
    current:{k:entry.key,skill:writing?'write':'flip'},revealed:false
  };
}
function advanceFreeCard(session,grade){
  const route=State.route;
  const retries=route.retries ||= [];
  route.attempt=(route.attempt||0)+1;
  if(grade===1){
    retries.push({
      after:route.attempt+2,lesson:session.lesson,facing:session.facing,
      k:session.current.k,skill:session.current.skill
    });
  }
  if(!session.retry){
    if(session.current.skill==='flip'&&!route.mixTypes){
      setFreeCardTask(route,session.facing==='py'?'py':'ru');
    }else{
      route.index=((route.index||0)+1)%route.deck.length;
      setFreeCardTask(route);
    }
  }else{
    route.practice=route.nextPractice;
    delete route.nextPractice;
  }
  if(retries[0]?.after<=route.attempt){
    const retry=retries.shift();
    route.nextPractice=route.practice;
    route.practice={
      free:true,retry:true,lesson:retry.lesson,radicals:route.radicals,facing:retry.facing,
      current:{k:retry.k,skill:retry.skill},revealed:false
    };
  }
  render();
}
function viewFreeCards(view){
  const route=State.route;
  route.deck ||= route.keys?.map(key=>({lesson:route.lesson,key}))||[];
  if(!route.practice)setFreeCardTask(route);
  if(route.practice)return recallSessionView(view);
  const back=el('button','back','‹ К карточкам');back.onclick=()=>go('cards');view.appendChild(back);
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
  const state=recallState(),radicals=!!state.radicalDeck,free=state.cardType==='free';
  const available=Array.from({length:NL},(_,i)=>i+1).filter(n=>!radicals||recallLessonKeys(n).length);
  const selected=radicals?(state.radicalLessons??[state.radicalLesson||1]):(state.lessons.length?state.lessons:state.wordDeckSelectionSet?[]:[1]);
  const lessons=available.filter(n=>selected.includes(n));
  view.appendChild(el('h1','','Карточки'));
  const modes=el('div','chips');
  for(const [value,label]of [['staged','Поэтапные'],['free','Постоянные']]){
    const button=el('button','chip'+((value==='free')===free?' on':''),label);
    button.onclick=()=>{state.cardType=value;save('meta');render();};
    modes.appendChild(button);
  }
  view.appendChild(modes);
  const decks=el('div','chips');
  for(const [isRadical,label]of [[false,'Слова по урокам'],[true,'Ключи по урокам']]){
    const button=el('button','chip'+(isRadical===radicals?' on':''),label);
    button.onclick=()=>{state.radicalDeck=isRadical;save('meta');render();};decks.appendChild(button);
  }
  view.appendChild(decks);
  const picker=el('details','hero recall-lesson-picker');picker.open=!!state.lessonPickerOpen;
  picker.ontoggle=()=>{if(picker.isConnected)state.lessonPickerOpen=picker.open;};
  picker.appendChild(el('summary','','Выбрать уроки'+(lessons.length?' · '+lessons.join(', '):'')));
  const choices=el('div','chips');
  for(const number of available){
    const label=el('label','chip'),input=el('input');
    input.type='checkbox';input.checked=lessons.includes(number);
    input.setAttribute('aria-label','Урок '+number);
    input.onchange=()=>{
      const selection=available.filter(n=>n===number?input.checked:lessons.includes(n));
      if(radicals)state.radicalLessons=selection;
      else{state.lessons=selection;state.wordDeckSelectionSet=true;}
      state.lessonPickerOpen=picker.open;
      save('meta');render();
    };
    label.append(input,document.createTextNode(' Урок '+number));choices.appendChild(label);
  }
  picker.appendChild(choices);view.appendChild(picker);
  if(free){
    const facing=el('select');facing.setAttribute('aria-label','Начать с');
    for(const [value,label]of [['han','Начать с иероглифов'],['ru','Начать с перевода'],['py','Начать с пиньиня']]){
      const option=el('option','',label);option.value=value;facing.appendChild(option);
    }
    facing.value=state.facing||'han';facing.onchange=()=>{state.facing=facing.value;save('meta');};view.appendChild(facing);
    const label=el('label','setrow'),mix=el('input');mix.type='checkbox';mix.checked=!!state.mix;
    mix.onchange=()=>{state.mix=mix.checked;save('meta');};label.append(mix,document.createTextNode(' Перемешать карточки'));view.appendChild(label);
    const types=el('label','setrow'),mixTypes=el('input');
    mixTypes.type='checkbox';mixTypes.checked=!!state.mixTypes;
    mixTypes.onchange=()=>{state.mixTypes=mixTypes.checked;save('meta');facing.disabled=mixTypes.checked;};
    facing.disabled=mixTypes.checked;
    types.append(mixTypes,document.createTextNode(' Перемешать типы заданий'));view.appendChild(types);
    const start=el('button','btn','Начать тренировку');start.disabled=!lessons.length;start.onclick=()=>startFreeCards(lessons,radicals);view.appendChild(start);
  }else{
    for(const lesson of lessons){
      view.appendChild(el('p','note',esc('Урок '+lesson+' · '+stageCardStatus(stageCardEntry(lesson,radicals)))));
    }
    view.appendChild(el('p','note','Интервалы после каждого занятия: 4 ч → 12 ч → 1 день → 2 дня → 5 дней.'));
    const ready=lessons.filter(lesson=>stageCardAvailable(lesson,radicals));
    const entry=lessons.length===1?stageCardEntry(lessons[0],radicals):null;
    const active=entry?.session&&!entry.session.finished;
    const label=lessons.length===1?(active?'Продолжить':entry?.completed?'Повторить урок':'Начать урок'):'Пройти выбранные · '+ready.length;
    const start=el('button','btn',label);
    start.disabled=!ready.length;
    start.onclick=()=>startStageBatch(lessons,radicals);view.appendChild(start);
    const selectedIds=new Set(lessons.map(lesson=>String(deckId(lesson,radicals))));
    const due=Object.entries(state.staged||{}).filter(([id,item])=>!selectedIds.has(id)&&item.completed<=STAGE_HOURS.length&&(item.session&&!item.session.finished||item.completed&&item.due<=Date.now()));
    const now=Date.now();
    const upcoming=Object.values(state.staged||{}).map(item=>item.due).filter(time=>time>now);
    if(upcoming.length)stageCardTimer=setTimeout(()=>{if(view.isConnected)render();},Math.min(...upcoming)-now);
    for(const [id,item]of due){
      const isRadical=id.startsWith('keys:'),number=Number(isRadical?id.slice(5):id);
      const button=el('button','btn ghost',(isRadical?'Ключи':'Слова')+' · урок '+number+' · '+(item.session&&!item.session.finished?'продолжить':'повторить'));
      button.onclick=()=>{
        state.radicalDeck=isRadical;

        stageCardStart(number,isRadical);
      };
      view.appendChild(button);
    }
  }
};
