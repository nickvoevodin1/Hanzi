/* Подготовка по выбранным основным спискам учебника. */
function examState(){return State.meta.exam||(State.meta.exam={lessons:[groupL()],count:8,audio:false});}
function viewExam(s){
  const v=el('div','view');s.appendChild(v);const m=examState();
  v.appendChild(el('h1','','Контрольная и диктант'));
  v.appendChild(el('p','note','Выбери нужные уроки. В заданиях — основные слова учебника, без дополнительного раздела. Результат отмечаешь после самостоятельного ответа.'));
  const chips=el('div','chips');
  for(let L=1;L<=NL;L++){const label=el('label','chip'),input=el('input');input.type='checkbox';input.checked=m.lessons.includes(L);input.setAttribute('aria-label','Урок '+L);input.onchange=()=>{m.lessons=input.checked?uniq(m.lessons.concat(L)).sort((a,b)=>a-b):m.lessons.filter(x=>x!==L);save('meta');update();};label.append(input,document.createTextNode(' Урок '+L));chips.appendChild(label);}v.appendChild(chips);
  const info=el('p','note');v.appendChild(info);
  const amount=el('select');amount.setAttribute('aria-label','Слов в диктанте');for(const [n,title]of[[4,'4 слова'],[8,'8 слов'],[16,'16 слов'],[214,'Все слова выбранных уроков']]){const o=el('option','',title);o.value=String(n);o.selected=n===m.count;amount.appendChild(o);}amount.onchange=()=>{m.count=+amount.value;save('meta');};v.appendChild(amount);
  const audio=el('label','setrow'),toggle=el('input');toggle.type='checkbox';toggle.checked=m.audio;toggle.onchange=()=>{m.audio=toggle.checked;save('meta');};audio.append(toggle,document.createTextNode(' Диктант на слух'));v.appendChild(audio);
  const dictation=el('button','btn',IC('pencil',20)+' Тренировать диктант');dictation.style.marginTop='12px';dictation.onclick=()=>dictationStart({kind:'lessons',lessons:m.lessons.slice(),count:m.count,audio:m.audio});v.appendChild(dictation);
  v.appendChild(el('p','note','Написание, пиньинь с тонами и перевод. Ошибки возвращаются на повторение.'));
  const mock=el('button','btn ghost',IC('trophy',20)+' Пробная контрольная');mock.onclick=()=>go('mock',{setup:{lessons:m.lessons.slice(),title:'Контрольная · уроки '+m.lessons.join(', ')}});v.appendChild(mock);
  v.appendChild(el('p','note','Разбор иероглифов по ключам, пиньинь и перевод слов, перевод предложений в обе стороны. Таймер выбирается перед началом.'));
  const d=State.meta.dictation?.active;
  if(d&&!d.finished){const b=el('button','btn blue','Продолжить диктант');b.onclick=()=>go('dictation',{run:true});v.appendChild(b);}
  if(MOCK&&['paper','check'].includes(MOCK.phase)){const b=el('button','btn blue','Продолжить контрольную');b.onclick=()=>go('mock');v.appendChild(b);}
  function update(){const items=dictationItems({kind:'lessons',lessons:m.lessons});info.textContent=m.lessons.length?'Уроки '+m.lessons.join(', ')+' · '+items.length+' основных слов':'Выбери хотя бы один урок';dictation.disabled=mock.disabled=!m.lessons.length;}
  update();
}
