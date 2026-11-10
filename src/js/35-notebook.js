/* ТРИ ДНЯ: 10 полноэкранных повторений иероглифов + 10 пиньиня.
   Отметки письма не выставляют оценки знания/FSRS. */
const NOTEBOOK_REPEATS=10;
const NOTEBOOK_FLUSH=new Set();
function notebookKey(k){
  if(typeof k!=='string') return null;
  if(isWR(k)) k=wrOf(k);
  if(memoryValid(k)) return k;
  if(k.startsWith('c:')) return [...k.slice(2)].length===1&&CHARS[k.slice(2)]?k:null;
  return [...k].length===1&&CHARS[k]?'c:'+k:null;
}
function notebookInfo(k){
  k=notebookKey(k); if(!k) return null;
  if(k.startsWith('c:')){ const ch=k.slice(2); return {k,hz:ch,py:charPy(ch),ru:charRu(ch),label:'Иероглиф · урок '+(CHAR_L[ch]||'—')}; }
  return {...memoryInfo(k),k};
}
function notebookData(k,create){
  k=notebookKey(k); if(!k) return null;
  const m=create?memoryState():State.meta.memory;
  let entry=m&&m.entries&&m.entries[k];
  if(!entry&&create) entry=m.entries[k]={start:todayStr(),days:[],skills:{}};
  if(!entry) return null;
  if(!entry.notebook&&create) entry.notebook={v:2,days:[]};
  const n=entry.notebook;
  if(n&&create&&!Array.isArray(n.days)) n.days=[];
  return n||null;
}
function notebookCompletedDay(row){
  if(!row||!row.hz?.done||!row.py?.done) return '';
  return [row.hz.date,row.py.date,row.date].filter(Boolean).sort().slice(-1)[0]||'';
}
function notebookStatus(k){
  const n=notebookData(k,false), days=n&&Array.isArray(n.days)?n.days:[];
  let complete=0; while(complete<3&&notebookCompletedDay(days[complete])) complete++;
  const previous=complete?notebookCompletedDay(days[complete-1]):'';
  const locked=complete<3&&!!previous&&todayStr()<=previous;
  return {days,complete,active:complete<3&&!locked?complete:null,next:complete<3?complete:null,
    availableOn:locked?addDays(previous,1):null,finished:complete===3};
}
function notebookRow(k,index,create){
  const n=notebookData(k,create); if(!n) return null;
  if(!n.days[index]&&create) n.days[index]={date:todayStr(),hz:{ink:[]},py:{ink:[]}};
  const row=n.days[index];
  if(row&&create) for(const skill of ['hz','py']){ if(!row[skill]) row[skill]={ink:[]}; if(!Array.isArray(row[skill].ink)) row[skill].ink=[]; }
  return row||null;
}
function notebookCount(k,skill,index){
  const datum=notebookRow(k,index,false)?.[skill];
  if(datum?.done) return NOTEBOOK_REPEATS; // сохраняем ранее завершённые дни
  return Math.min(NOTEBOOK_REPEATS,Array.isArray(datum?.attempts)?datum.attempts.length:0);
}
function notebookCurrentInk(k,skill,index){
  const datum=notebookRow(k,index,false)?.[skill];
  return Array.isArray(datum?.currentInk)?datum.currentInk:Array.isArray(datum?.ink)?datum.ink:[];
}
function notebookHasInk(k,skill,index){ return notebookCurrentInk(k,skill,index).some(line=>line?.length); }
function notebookWriting(k,skill,index){
  const row=notebookRow(k,index,true), datum=row[skill];
  if(!Array.isArray(datum.attempts)) datum.attempts=[];
  if(!Array.isArray(datum.currentInk)) datum.currentInk=Array.isArray(datum.ink)?datum.ink:[];
  datum.ink=datum.currentInk;
  return datum;
}
function notebookFinishAttempt(k,skill){
  k=notebookKey(k);if(!k||!['hz','py'].includes(skill))return false;
  const index=notebookStatus(k).active;
  if(index==null||notebookCount(k,skill,index)>=NOTEBOOK_REPEATS||!notebookHasInk(k,skill,index))return false;
  const datum=notebookWriting(k,skill,index), strokes=datum.currentInk.filter(x=>x?.length).length;
  // Сохраняем счётчик и текущую попытку, а не десятки больших архивов штрихов.
  datum.attempts.push({at:Date.now(),strokes});datum.currentInk=[];datum.ink=datum.currentInk;
  if(datum.attempts.length===NOTEBOOK_REPEATS){datum.done=true;datum.source='screen';datum.date=todayStr();datum.at=Date.now();}
  save('meta');return true;
}
function notebookMark(k,skill,source){
  if(source==='screen')return notebookFinishAttempt(k,skill);
  k=notebookKey(k);if(!k||!['hz','py'].includes(skill)||source!=='paper')return false;
  const index=notebookStatus(k).active;if(index==null||notebookRow(k,index,false)?.[skill]?.done)return false;
  const datum=notebookWriting(k,skill,index);
  datum.done=true;datum.source='paper';datum.paperCount=NOTEBOOK_REPEATS;datum.date=todayStr();datum.at=Date.now();
  save('meta');return true;
}
function notebookGrid(ctx,w,h,skill){
  ctx.save();ctx.clearRect(0,0,w,h);
  if(skill==='hz'){ctx.strokeStyle='#e9e2d5';ctx.lineWidth=1;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();
}
function notebookCanvas(host,k,skill,index,editable,onInk){
  const canvas=el('canvas','notebook-canvas '+(skill==='hz'?'notebook-hanzi':'notebook-pinyin'));
  canvas.width=900;canvas.height=900;canvas.setAttribute('aria-label',(skill==='hz'?'Поле для иероглифов':'Поле для пиньиня')+' · день '+(index+1));host.appendChild(canvas);
  let ctx=null;try{if(typeof CanvasRenderingContext2D!=='undefined')ctx=canvas.getContext('2d');}catch(e){}
  const draw=line=>{if(!ctx||!line?.length)return;ctx.strokeStyle='#3c3c3c';ctx.fillStyle='#3c3c3c';ctx.lineWidth=skill==='hz'?4:3;ctx.lineCap='round';ctx.lineJoin='round';
    if(line.length===1){ctx.beginPath();ctx.arc(line[0][0]*canvas.width,line[0][1]*canvas.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();return;}
    ctx.beginPath();ctx.moveTo(line[0][0]*canvas.width,line[0][1]*canvas.height);for(const p of line.slice(1))ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);ctx.stroke();};
  const redraw=()=>{if(!ctx)return;const r=canvas.getBoundingClientRect();if(r.width&&r.height){canvas.width=Math.round(r.width*2);canvas.height=Math.round(r.height*2);}notebookGrid(ctx,canvas.width,canvas.height,skill);notebookCurrentInk(k,skill,index).forEach(draw);};
  canvas.notebookRedraw=redraw;redraw();requestAnimationFrame(redraw);
  if(!editable)return canvas;
  let line=null;const stop=()=>{if(!line)return;line=null;NOTEBOOK_FLUSH.delete(stop);save('meta');if(onInk)onInk();};
  const point=e=>{const r=canvas.getBoundingClientRect();return [+(Math.max(0,Math.min(1,(e.clientX-r.left)/(r.width||900)))).toFixed(4),+(Math.max(0,Math.min(1,(e.clientY-r.top)/(r.height||900)))).toFixed(4)];};
  canvas.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();if(notebookStatus(k).active!==index||notebookCount(k,skill,index)>=NOTEBOOK_REPEATS)return;try{canvas.setPointerCapture(e.pointerId);}catch(err){}const datum=notebookWriting(k,skill,index);line=[point(e)];datum.currentInk.push(line);NOTEBOOK_FLUSH.add(stop);redraw();save('meta');if(onInk)onInk();});
  canvas.addEventListener('pointermove',e=>{if(!line)return;e.preventDefault();const p=point(e);if(line.length<1200)line.push(p);else line[line.length-1]=p;redraw();});
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  if(!ctx)host.appendChild(el('p','note','Рисование недоступно. Можно написать десять раз в тетради и нажать «Прописал».'));
  return canvas;
}
function startNotebookPractice(k,skill,opts){
  k=notebookKey(k);if(!k)return;opts=opts||{};
  const status=notebookStatus(k);if(status.active==null){toast(status.finished?'Три дня завершены':'Следующий день ещё не открыт');return;}
  skill=skill==='py'?'py':'hz';if(notebookCount(k,skill,status.active)>=10)skill=skill==='hz'?'py':'hz';
  const back=State.route.practice?State.route.backRoute:clone(State.route);
  go('notebook',{k,practice:true,skill,sample:!!opts.showSample,backRoute:back||{name:'notebook',k}});
}
function notebookReturn(){
  const route=State.route.backRoute||{name:'notebook',k:State.route.k};
  go(route.name||'notebook',route);
}
function notebookAfterAttempt(k,skill,index){
  if(notebookCount(k,skill,index)<10){render();return;}
  const other=skill==='hz'?'py':'hz';
  if(notebookCount(k,other,index)<10){go('notebook',{...State.route,skill:other});return;}
  notebookReturn();
}
function notebookPracticeView(v,k){
  const status=notebookStatus(k),index=status.active;
  if(index==null){notebookReturn();return;}
  const skill=State.route.skill==='py'?'py':'hz',count=notebookCount(k,skill,index),info=notebookInfo(k);
  if(count>=10){notebookAfterAttempt(k,skill,index);return;}
  const full=el('div','notebook-fullscreen');v.appendChild(full);
  const top=el('header','notebook-practice-top');
  const close=el('button','x',IC('x',22));close.setAttribute('aria-label','Сохранить и выйти из прописей');close.onclick=notebookReturn;top.appendChild(close);
  top.appendChild(el('div','',`<b>${skill==='hz'?'Иероглифы / ключи':'Пиньинь'}</b><small>День ${index+1} из 3</small>`));
  top.appendChild(el('b','notebook-counter',count+' / 10'));full.appendChild(top);
  const target=el('div','notebook-practice-target');
  target.innerHTML=State.route.sample?`<b class="${skill==='hz'?'han':'py'}">${skill==='hz'?esc(info.hz):pinyinHTML(info.py)}</b><small>${esc(info.ru)}</small>`:`<b>${esc(info.ru)}</b><small>Напиши по памяти</small>`;
  const toggle=el('button','linkbtn',State.route.sample?'Скрыть образец':'Показать образец');toggle.onclick=()=>go('notebook',{...State.route,sample:!State.route.sample});target.appendChild(toggle);full.appendChild(target);
  const pad=el('div','notebook-pad');full.appendChild(pad);
  const footer=el('footer','notebook-practice-footer');
  const next=el('button','btn','Готово · '+(count+1)+' из 10');next.disabled=!notebookHasInk(k,skill,index);next.onclick=()=>{if(notebookFinishAttempt(k,skill))notebookAfterAttempt(k,skill,index);};
  const canvas=notebookCanvas(pad,k,skill,index,true,()=>{next.disabled=!notebookHasInk(k,skill,index);});
  const actions=el('div','notebook-tools');const clear=el('button','linkbtn','Очистить');clear.onclick=()=>{for(const flush of [...NOTEBOOK_FLUSH])flush();const datum=notebookRow(k,index,false)?.[skill];if(datum){datum.currentInk=[];datum.ink=datum.currentInk;save('meta');}canvas.notebookRedraw();next.disabled=true;};actions.appendChild(clear);
  const paper=el('button','linkbtn','Прописал');paper.setAttribute('aria-label','Прописал 10 раз в тетради');paper.onclick=()=>{if(notebookMark(k,skill,'paper'))notebookAfterAttempt(k,skill,index);};actions.appendChild(paper);
  footer.appendChild(actions);footer.appendChild(next);footer.appendChild(el('small','note','В тетради: напиши 10 раз и нажми «Прописал».'));full.appendChild(footer);
}
function notebookPracticeSlot(host,k,skill,index,editable,opts){
  const datum=notebookRow(k,index,false)?.[skill],count=notebookCount(k,skill,index);
  host.dataset.skill=skill;host.dataset.day=String(index+1);
  host.appendChild(el('div','kind',skill==='hz'?'Иероглифы / ключи':'Пиньинь'));
  host.appendChild(el('p','notebook-slot-count',datum?.done&&!datum.attempts?.length&&!datum.paperCount?'Выполнено ранее':count+' / 10 повторений'));
  if(editable){const actions=el('div','actionrow notebook-actions');const start=el('button','btn ghost mini','Писать 10 раз');start.setAttribute('aria-label',(skill==='hz'?'Писать иероглифы':'Писать пиньинь')+' · день '+(index+1));start.onclick=()=>startNotebookPractice(k,skill,opts);const paper=el('button','btn mini','Прописал');paper.onclick=()=>{if(notebookMark(k,skill,'paper'))render();};actions.append(start,paper);host.appendChild(actions);host.appendChild(el('p','note','«Прописал» — написал десять раз в бумажной тетради.'));}
  else if(datum?.done)host.appendChild(el('p','note',IC('check',14)+' '+(datum.source==='paper'?'В тетради':'На экране')+' · '+fmtDate(datum.date)));
}
function notebookPanel(k,opts){
  opts=opts||{};k=notebookKey(k);const panel=el('section','notebook-panel');if(!k)return panel;
  const status=notebookStatus(k),skills=opts.skill&&['hz','py'].includes(opts.skill)?[opts.skill]:['hz','py'];
  if(status.active==null)panel.appendChild(el('p','note',status.finished?'Три дня письма завершены. Продолжай проверки памяти.':'Сегодня готово. Следующий день откроется '+fmtDate(status.availableOn)+'.'));
  else for(const skill of skills){const slot=el('div','notebook-slot');panel.appendChild(slot);notebookPracticeSlot(slot,k,skill,status.active,!notebookRow(k,status.active,false)?.[skill]?.done,opts);}
  if(opts.compact){const open=el('button','linkbtn','Все три дня прописей');open.onclick=()=>go('notebook',{k});panel.appendChild(open);}return panel;
}
function notebookPool(scope,L){
  if(scope==='keys')return KEY_ORDER.map(n=>'r:'+n);
  if(scope==='chars')return (LESSON_CHARS[L]||[]).map(ch=>notebookKey(ch)).filter(Boolean);
  return uniq(lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words)).map(w=>w.key)).filter(k=>!!notebookKey(k));
}
function viewNotebook(s){
  const v=el('div','view notebook-view');s.appendChild(v);
  const practiceKey=notebookKey(State.route.k);
  if(State.route.practice&&practiceKey)return notebookPracticeView(v,practiceKey);
  const back=el('button','back','‹ К повторению');back.onclick=()=>go('practice');v.appendChild(back);
  v.appendChild(el('h1','','Прописи на три дня'));
  v.appendChild(el('p','note','Каждый день напиши иероглифы 10 раз, затем пиньинь 10 раз. На экране — одно большое поле для каждой попытки. В бумажной тетради отметь десять повторений кнопкой «Прописал».'));
  const routeKey=notebookKey(State.route.k),scope=State.route.scope||(routeKey&&isRad(routeKey)?'keys':routeKey&&routeKey.startsWith('c:')?'chars':'words'),L=Math.max(1,Math.min(NL,+State.route.lesson||(routeKey&&(WORD_L[routeKey]||(routeKey.startsWith('c:')&&CHAR_L[routeKey.slice(2)])))||groupL()));
  const chips=el('div','chips');for(const [id,title]of[['words','Слова'],['chars','Иероглифы'],['keys','Ключи']]){const b=el('button','chip'+(scope===id?' on':''),title);b.onclick=()=>go('notebook',{scope:id,lesson:L});chips.appendChild(b);}v.appendChild(chips);
  const filters=el('div','actionrow');
  if(scope!=='keys'){const lesson=el('select');lesson.setAttribute('aria-label','Урок прописей');for(let n=1;n<=NL;n++){const o=el('option','','Урок '+n);o.value=String(n);o.selected=n===L;lesson.appendChild(o);}lesson.onchange=()=>go('notebook',{scope,lesson:+lesson.value});filters.appendChild(lesson);}
  const pool=notebookPool(scope,L),fallback=pool[0]||semWords()[0],k=notebookKey(State.route.k)||fallback,info=notebookInfo(k);
  const status=notebookStatus(k),show=typeof State.route.sample==='boolean'?State.route.sample:status.active===0||!status.days.length;
  const choose=el('select');choose.style.cssText='max-width:100%;min-width:0';choose.setAttribute('aria-label','Что прописывать');
  const options=pool.includes(k)?pool:[k].concat(pool);
  for(const id of options){const i=notebookInfo(id);if(!i)continue;const o=el('option','',(i.rad?i.label+' · ':'')+(show?i.hz+' — ':'')+i.ru);o.value=id;o.selected=id===k;choose.appendChild(o);}
  choose.onchange=()=>go('notebook',{scope,lesson:L,k:choose.value});filters.appendChild(choose);v.appendChild(filters);
  if(!info){v.appendChild(el('p','note','Для выбранного набора пока нет элементов.'));return;}
  const sample=el('div','hero notebook-header');
  const content=el('div','notebook-sample-text');
  if(show)content.innerHTML=`<div class="kind">${esc(info.label)}</div><div class="han" style="font-size:48px">${esc(info.hz)}</div><div class="py">${pinyinHTML(info.py)}</div><div class="tr">${esc(info.ru)}</div>`;
  else content.innerHTML=`<div class="kind">${esc(info.label)}</div><div class="tr">${esc(info.ru)}</div><p class="note">Сегодня попробуй написать по памяти. Образец можно открыть после попытки.</p>`;
  const toggle=el('button','linkbtn',show?'Закрыть образец':'Сверить образец');toggle.onclick=()=>go('notebook',{scope,lesson:L,k,sample:!show});content.appendChild(toggle);sample.appendChild(content);v.appendChild(sample);
  if(show){const demo=el('div');sample.appendChild(demo);notebookStrokeDemo(demo,info);}
  for(let index=0;index<3;index++){
    const section=el('section','hero notebook-day');section.style.marginTop='14px';section.dataset.notebookDay=String(index+1);
    const existing=status.days[index],isDone=!!notebookCompletedDay(existing),active=status.active===index;
    section.appendChild(el('h2','','День '+(index+1)+(isDone?' · написано':active?' · сегодня':' · следующий день')));
    for(const skill of ['hz','py']){const slot=el('div','notebook-slot');section.appendChild(slot);notebookPracticeSlot(slot,k,skill,index,active&&!existing?.[skill]?.done,{showSample:show});}
    if(!active&&!isDone)section.appendChild(el('p','note',index===status.next&&status.availableOn?'Откроется '+fmtDate(status.availableOn)+'.':'Десять повторений на следующий день.'));
    v.appendChild(section);
  }
  v.appendChild(el('p','study-tip','Отметка «Прописал» сохраняет факт письма. Оценки «Без подсказок / С трудом / Не вспомнил» в тетради памяти отдельно проверяют знание. Если пропустил день, продолжай с незавершённого дня. Несколько дней не засчитываются одним нажатием.'));
}
window.addEventListener('pagehide',()=>{for(const flush of [...NOTEBOOK_FLUSH])flush();});
