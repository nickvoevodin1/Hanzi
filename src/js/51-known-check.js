/* Проверка выбранных знаков. Пиньинь проверяется автоматически, письмо и
   перевод — явно обозначенной самопроверкой. Исправление не даёт зачёт. */
function knownCheckState(){const m=studyState();return m.knowledgeCheck||(m.knowledgeCheck={selected:[],session:null});}
function knownCheckPool(kind){return kind==='keys'?KEY_ORDER.map(n=>'r:'+n):Object.keys(CHAR_L).sort((a,b)=>CHAR_L[a]-CHAR_L[b]).map(ch=>'c:'+ch);}
function knownCheckStart(){
  const m=knownCheckState(),keys=uniq(m.selected).filter(k=>knownCheckPool('keys').includes(k)||knownCheckPool('chars').includes(k));
  if(!keys.length)return;
  const queue=[];for(const skill of ['pinyin','meaning','write'])for(const k of keys)queue.push({k,skill,input:'',ink:[],paper:false});
  m.session={keys,queue,index:0,revealed:false,results:{},finished:false,saved:false,started:todayStr()};save('meta');go('knownCheck',{run:true});
}
function knownCheckReveal(){
  const ss=knownCheckState().session,x=ss?.queue[ss.index];if(!x||ss.revealed)return;
  if(x.skill==='pinyin'){if(!x.input.trim()){toast('Введи пиньинь с тоном');return;}x.ok=dictationPinyinOK(x.input,notebookInfo(x.k).py);}
  if(x.skill==='write'&&!x.paper&&!x.ink?.length){toast('Сначала напиши знак на экране или в тетради');return;}
  ss.revealed=true;save('meta');render();
}
function knownCheckGrade(ok){
  const ss=knownCheckState().session,x=ss?.queue[ss.index];if(!x||!ss.revealed||ss.finished)return false;
  const result=ss.results[x.k]||(ss.results[x.k]={});result[x.skill]=x.skill==='pinyin'?!!x.ok:!x.gaveUp&&!!ok;
  ss.index++;ss.revealed=false;ss.finished=ss.index===ss.queue.length;save('meta');render();return true;
}
function knownCheckPassed(ss,k){return ['pinyin','meaning','write'].every(skill=>ss.results[k]?.[skill]===true);}
function knownCheckSave(){
  const ss=knownCheckState().session;if(!ss?.finished||ss.saved)return false;
  const m=studyState();m.known=m.known||{};
  for(const k of ss.keys)if(knownCheckPassed(ss,k))m.known[k]=todayStr();
  ss.saved=true;ss.savedOn=todayStr();save('meta');render();return true;
}
function viewKnownCheck(s){
  const v=el('div','view');s.appendChild(v);const m=knownCheckState(),ss=m.session;
  const back=el('button','back','‹ Настройки');back.onclick=()=>go('settings');v.appendChild(back);
  if(State.route.run&&ss){
    if(ss.finished){
      const passed=ss.keys.filter(k=>knownCheckPassed(ss,k));
      v.appendChild(el('h1','','Результат проверки'));v.appendChild(el('p','note',`Подтверждено ${passed.length} из ${ss.keys.length}. Зачёт — только когда верны пиньинь, перевод и написание. Письмо и перевод оценены тобой.`));
      for(const k of ss.keys){const info=notebookInfo(k),row=el('section','hero');row.style.marginBottom='10px';row.innerHTML=`<b class="han">${esc(info.hz)}</b> · ${knownCheckPassed(ss,k)?'Подтверждено':'Пока не подтверждено'}<p class="note">${['pinyin','meaning','write'].map((sk,i)=>['Пиньинь','Перевод','Написание'][i]+': '+(ss.results[k]?.[sk]?'верно':'повторить')).join(' · ')}</p>`;if(!knownCheckPassed(ss,k)&&studyKnown(k))row.appendChild(studyKnownButton(k));v.appendChild(row);}
      v.appendChild(el('p','note','Прежние отметки не меняются автоматически. У неподтверждённых можно снять «Уже знаю».'));
      const saveButton=el('button','btn',ss.saved?'Подтверждённые отметки сохранены':'Отметить подтверждённые как «Уже знаю»');saveButton.disabled=ss.saved||!passed.length;saveButton.onclick=knownCheckSave;v.appendChild(saveButton);
      const again=el('button','btn ghost','К выбору знаков');again.style.marginTop='12px';again.onclick=()=>go('knownCheck');v.appendChild(again);return;
    }
    const x=ss.queue[ss.index],info=notebookInfo(x.k);
    v.appendChild(el('p','eyebrow',`${ss.index+1} / ${ss.queue.length} · ${x.skill==='pinyin'?'Пиньинь с тонами':x.skill==='meaning'?'Перевод':'Написание по памяти'}`));
    const card=el('section','hero');v.appendChild(card);
    card.appendChild(el('h2',x.skill==='write'?'':'han',esc(x.skill==='write'?info.ru:info.hz)));
    if(!ss.revealed){
      if(x.skill==='pinyin'){const input=el('input','search');input.placeholder='Введи пиньинь с тоном';input.setAttribute('aria-label','Ответ пиньинем');input.value=x.input;input.autocomplete='off';input.spellcheck=false;input.oninput=()=>{x.input=input.value;save('meta');};card.appendChild(input);}
      if(x.skill==='meaning')card.appendChild(el('p','note','Назови перевод вслух или запиши в тетради до открытия ответа.'));
      if(x.skill==='write'){card.appendChild(el('p','note','Напиши основную форму знака по памяти.'));dictationInk(card,x);const label=el('label','setrow'),check=el('input');check.type='checkbox';check.checked=x.paper;check.onchange=()=>{x.paper=check.checked;save('meta');};label.append(check,document.createTextNode(' Написал по памяти в тетради'));card.appendChild(label);}
      const reveal=el('button','btn','Проверить ответ');reveal.onclick=knownCheckReveal;card.appendChild(reveal);const giveUp=el('button','linkbtn','Не помню — показать');giveUp.onclick=()=>{x.gaveUp=true;x.ok=false;ss.revealed=true;save('meta');render();};card.appendChild(giveUp);
    }else{
      card.appendChild(el('p',x.skill==='write'?'han':'py',x.skill==='write'?esc(info.hz):x.skill==='meaning'?esc(info.ru):pinyinHTML(info.py)));
      if(x.skill==='pinyin'){card.appendChild(el('p','note',x.ok?'Пиньинь и тоны верны':'Нужно повторить. Твой ответ: '+esc(x.input)));const next=el('button','btn','Дальше');next.onclick=()=>knownCheckGrade(x.ok);card.appendChild(next);}
      else{if(x.skill==='write'){const demo=el('div');card.appendChild(demo);notebookStrokeDemo(demo,info);}card.appendChild(el('p','note',x.skill==='write'?'Сверь форму и порядок черт. Оцени свою запись до подсказки.':'Сверь смысл своего ответа с переводом.'));for(const [ok,title]of[[false,'Не вспомнил / ошибся'],[true,'Вспомнил верно']]){const button=el('button','btn '+(ok?'':'ghost'),title);button.style.marginTop='10px';button.disabled=ok&&!!x.gaveUp;button.onclick=()=>knownCheckGrade(ok);card.appendChild(button);}}
    }return;
  }
  v.appendChild(el('h1','','Что я уже знаю'));
  v.appendChild(el('p','note','Выбери иероглифы и ключи. Проверим чтение с тонами, перевод и написание. Ответы сначала скрыты. Пиньинь проверяется автоматически; перевод и письмо ты сверяешь сам. Отметки сохраняются после проверки по твоей кнопке.'));
  if(ss){const resume=el('button','btn blue',ss.finished?'Последний результат':'Продолжить проверку');resume.onclick=()=>go('knownCheck',{run:true});v.appendChild(resume);v.appendChild(el('p','note',ss.finished?'Новая проверка заменит последний результат.':'Новая проверка заменит незавершённую.'));}
  const kind=State.route.kind==='keys'?'keys':'chars',chips=el('div','chips');
  for(const [id,title]of[['chars','Иероглифы'],['keys','Ключи']]){const b=el('button','chip'+(kind===id?' on':''),title);b.onclick=()=>go('knownCheck',{kind:id,q:State.route.q||''});chips.appendChild(b);}v.appendChild(chips);
  const lesson=el('select');lesson.setAttribute('aria-label','Урок для выбора знаков');for(let n=0;n<=NL;n++){const o=el('option','',n?'Урок '+n:'Все уроки');o.value=String(n);o.selected=n===(+State.route.lesson||0);lesson.appendChild(o);}lesson.onchange=()=>go('knownCheck',{...State.route,lesson:+lesson.value});if(kind==='chars')v.appendChild(lesson);
  const counter=el('p','note');v.appendChild(counter);const start=el('button','btn','Проверить выбранные');start.onclick=knownCheckStart;v.appendChild(start);
  let shown=[];const tools=el('div','actionrow');for(const [title,all]of[['Выбрать видимые',true],['Очистить выбор',false]]){const button=el('button','linkbtn',title);button.onclick=()=>{m.selected=all?uniq(m.selected.concat(shown)):[];save('meta');draw();};tools.appendChild(button);}v.appendChild(tools);
  const list=el('div','rowlist');studySearch(v,State.route.q,q=>{State.route.q=q;draw();Resume.later();});v.appendChild(list);
  function draw(){counter.textContent='Выбрано: '+m.selected.length;start.disabled=!m.selected.length;list.replaceChildren();
    const pool=knownCheckPool(kind).filter(k=>(kind==='keys'||!State.route.lesson||CHAR_L[k.slice(2)]===+State.route.lesson)&&studyMatches(k,State.route.q));
    shown=pool;for(const k of pool){const info=notebookInfo(k),label=el('label','row'),input=el('input');input.type='checkbox';input.checked=m.selected.includes(k);input.setAttribute('aria-label','Выбрать '+info.hz);input.onchange=()=>{m.selected=input.checked?uniq(m.selected.concat(k)):m.selected.filter(x=>x!==k);save('meta');counter.textContent='Выбрано: '+m.selected.length;start.disabled=!m.selected.length;};label.appendChild(input);label.appendChild(el('div','tt',`<b class="han">${esc(info.hz)}</b><small>${esc(info.label)}${studyKnown(k)?' · уже отмечено':''}</small>`));list.appendChild(label);}
    if(!pool.length)list.appendChild(el('p','empty','Ничего не найдено'));
  }draw();
}
