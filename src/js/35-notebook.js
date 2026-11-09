/* ТРИ ДНЯ ПРОПИСЕЙ: настоящие строки на экране и отметка бумажной
   тетради. Это журнал письма; он не выставляет оценки знания/FSRS. */
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
  if(!entry.notebook&&create) entry.notebook={v:1,days:[]};
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
function notebookHasInk(k,skill,index){
  const row=notebookRow(k,index,false); return !!(row&&row[skill]&&row[skill].ink&&row[skill].ink.some(line=>line&&line.length));
}
function notebookMark(k,skill,source){
  k=notebookKey(k); if(!k||!['hz','py'].includes(skill)||!['paper','screen'].includes(source)) return false;
  const status=notebookStatus(k), index=status.active;
  if(index==null) return false;
  const existing=notebookRow(k,index,false); if(existing?.[skill]?.done) return false;
  if(source==='screen'&&!notebookHasInk(k,skill,index)) return false;
  const row=notebookRow(k,index,true);
  row[skill].done=true; row[skill].source=source; row[skill].date=todayStr(); row[skill].at=Date.now();
  // Explicitly no memoryRecordSkill(), no State.cards and no quiz counters.
  save('meta'); return true;
}
function notebookGrid(ctx,w,h,skill){
  ctx.save(); ctx.clearRect(0,0,w,h); ctx.strokeStyle='#e9e2d5'; ctx.lineWidth=1;
  if(skill==='hz'){
    const size=h;
    for(let x=0;x<w;x+=size){
      ctx.strokeRect(x,0,size,h); ctx.setLineDash([4,5]); ctx.beginPath();
      ctx.moveTo(x+size/2,0); ctx.lineTo(x+size/2,h); ctx.moveTo(x,h/2); ctx.lineTo(x+size,h/2); ctx.stroke(); ctx.setLineDash([]);
    }
  }else{
    for(const y of [.25,.45,.65,.85]){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(w,y*h);ctx.stroke();}
  }
  ctx.restore();
}
function notebookCanvas(host,k,skill,index,editable,onInk){
  const canvas=el('canvas','notebook-canvas '+(skill==='hz'?'notebook-hanzi':'notebook-pinyin'));
  canvas.width=672;canvas.height=168;
  canvas.style.cssText='display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:#fffdf8;touch-action:none;margin:8px 0';
  canvas.setAttribute('aria-label',(skill==='hz'?'Строка иероглифов':'Строка пиньиня')+' · день '+(index+1));
  host.appendChild(canvas);
  let ctx=null;
  try{ if(typeof CanvasRenderingContext2D!=='undefined') ctx=canvas.getContext('2d'); }catch(e){}
  function ink(){ return notebookRow(k,index,false)?.[skill]?.ink||[]; }
  function draw(line){
    if(!ctx||!line||!line.length) return;
    ctx.strokeStyle='#3c3c3c';ctx.fillStyle='#3c3c3c';ctx.lineWidth=skill==='hz'?4:3;ctx.lineCap='round';ctx.lineJoin='round';
    if(line.length===1){ctx.beginPath();ctx.arc(line[0][0]*canvas.width,line[0][1]*canvas.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();return;}
    ctx.beginPath();ctx.moveTo(line[0][0]*canvas.width,line[0][1]*canvas.height);
    for(const p of line.slice(1))ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);ctx.stroke();
  }
  function redraw(){if(!ctx)return;notebookGrid(ctx,canvas.width,canvas.height,skill);ink().forEach(draw);}
  redraw();
  if(!editable)return canvas;
  let line=null;
  function stop(){if(!line)return;line=null;NOTEBOOK_FLUSH.delete(stop);save('meta');if(onInk)onInk();}
  const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/(r.width||canvas.width))),Math.max(0,Math.min(1,(e.clientY-r.top)/(r.height||canvas.height)))];};
  canvas.addEventListener('pointerdown',e=>{
    if(e.button>0)return;e.preventDefault();const status=notebookStatus(k);if(status.active!==index||notebookRow(k,index,false)?.[skill]?.done)return;
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    const row=notebookRow(k,index,true);line=[point(e)];row[skill].ink.push(line);NOTEBOOK_FLUSH.add(stop);redraw();save('meta');if(onInk)onInk();
  });
  canvas.addEventListener('pointermove',e=>{if(!line)return;e.preventDefault();line.push(point(e));redraw();});
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  if(!ctx)host.appendChild(el('p','note','Поле рисования недоступно в этом браузере. Можно прописать строку в тетради и нажать «Прописал».'));
  const clear=el('button','linkbtn','Очистить строку');
  clear.onclick=()=>{stop();if(notebookStatus(k).active!==index||notebookRow(k,index,false)?.[skill]?.done)return;const row=notebookRow(k,index,false);if(row){row[skill].ink=[];save('meta');}redraw();if(onInk)onInk();};
  host.appendChild(clear);return canvas;
}
function notebookPracticeSlot(host,k,skill,index,editable){
  const row=notebookRow(k,index,false), datum=row&&row[skill];
  host.dataset.skill=skill;host.dataset.day=String(index+1);
  host.appendChild(el('div','kind',(skill==='hz'?'Иероглифы / ключи':'Пиньинь')+' · строка '+(index+1)));
  const buttons=el('div','actionrow notebook-actions');
  const screen=el('button','btn ghost mini','Написал на экране'), paper=el('button','btn mini','Прописал');
  screen.disabled=!editable||!notebookHasInk(k,skill,index);paper.disabled=!editable;
  const update=()=>{screen.disabled=!editable||!notebookHasInk(k,skill,index);};
  notebookCanvas(host,k,skill,index,editable,update);
  if(editable){
    screen.onclick=()=>{if(notebookMark(k,skill,'screen'))render();};
    paper.onclick=()=>{if(notebookMark(k,skill,'paper'))render();};
    buttons.appendChild(screen);buttons.appendChild(paper);host.appendChild(buttons);
    host.appendChild(el('p','note','«Прописал» — строка написана в бумажной тетради. Письмо на экране не распознаётся автоматически.'));
  }else if(datum&&datum.done){host.appendChild(el('p','note',IC('check',14)+' Написано '+(datum.source==='paper'?'в тетради':'на экране')+' · '+fmtDate(datum.date)));}
}
function notebookPanel(k,opts){
  opts=opts||{};k=notebookKey(k);const panel=el('section','notebook-panel');if(!k)return panel;
  const skills=opts.skill&&['hz','py'].includes(opts.skill)?[opts.skill]:['hz','py'];const status=notebookStatus(k);
  if(opts.showSample){const i=notebookInfo(k);panel.appendChild(el('div','notebook-sample',`<b class="han" style="font-size:36px">${esc(i.hz)}</b><div>${pinyinHTML(i.py)}</div><div class="note">${esc(i.ru)}</div>`));}
  if(status.active==null){
    const text=status.finished?'Три дня письма завершены. Продолжай отдельные проверки по памяти.':'Сегодняшние строки готовы. Следующие откроются '+fmtDate(status.availableOn)+'.';
    panel.appendChild(el('p','note',text));
  }else{
    if(!opts.compact)panel.appendChild(el('h3','','День '+(status.active+1)+' из 3'));
    for(const skill of skills){const row=notebookRow(k,status.active,false);const slot=el('div','notebook-slot');panel.appendChild(slot);notebookPracticeSlot(slot,k,skill,status.active,!row?.[skill]?.done);}
  }
  if(opts.compact){const open=el('button','linkbtn','Все три дня прописей');open.onclick=()=>go('notebook',{k});panel.appendChild(open);}
  return panel;
}
function notebookPool(scope,L){
  if(scope==='keys')return KEY_ORDER.map(n=>'r:'+n);
  if(scope==='chars')return (LESSON_CHARS[L]||[]).map(ch=>notebookKey(ch)).filter(Boolean);
  return uniq(lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words)).map(w=>w.key)).filter(k=>!!notebookKey(k));
}
function viewNotebook(s){
  const v=el('div','view notebook-view');s.appendChild(v);
  const back=el('button','back','‹ К повторению');back.onclick=()=>go('practice');v.appendChild(back);
  v.appendChild(el('h1','','Прописи на три дня'));
  v.appendChild(el('p','note','Запиши слово, пиньинь и перевод. Ниже — по три строки иероглифов и пиньиня: одна пара строк на каждый день. Можно писать на экране или в бумажной тетради.'));
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
  if(show)sample.innerHTML=`<div class="kind">${esc(info.label)}</div><div class="han" style="font-size:48px">${esc(info.hz)}</div><div class="py">${pinyinHTML(info.py)}</div><div class="tr">${esc(info.ru)}</div>`;
  else sample.innerHTML=`<div class="kind">${esc(info.label)}</div><div class="tr">${esc(info.ru)}</div><p class="note">Сегодня попробуй написать по памяти. Образец можно открыть после попытки.</p>`;
  const toggle=el('button','linkbtn',show?'Закрыть образец':'Сверить образец');toggle.onclick=()=>go('notebook',{scope,lesson:L,k,sample:!show});sample.appendChild(toggle);v.appendChild(sample);
  for(let index=0;index<3;index++){
    const section=el('section','hero notebook-day');section.style.marginTop='14px';section.dataset.notebookDay=String(index+1);
    const existing=status.days[index],isDone=!!notebookCompletedDay(existing),active=status.active===index;
    section.appendChild(el('h2','','День '+(index+1)+(isDone?' · написано':active?' · сегодня':' · следующая пара строк')));
    for(const skill of ['hz','py']){const slot=el('div','notebook-slot');section.appendChild(slot);notebookPracticeSlot(slot,k,skill,index,active&&!existing?.[skill]?.done);}
    if(!active&&!isDone)section.appendChild(el('p','note',index===status.next&&status.availableOn?'Откроется '+fmtDate(status.availableOn)+'.':'Эта строка для следующего дня.'));
    v.appendChild(section);
  }
  v.appendChild(el('p','study-tip','Отметка «Прописал» сохраняет факт письма. Оценки «Без подсказок / С трудом / Не вспомнил» в тетради памяти отдельно проверяют знание. Если пропустил день, продолжай со следующей незаполненной строки: несколько дней не засчитываются одним нажатием.'));
}
window.addEventListener('pagehide',()=>{for(const flush of [...NOTEBOOK_FLUSH])flush();});
