/*==================================================================
  ДИКТАНТ ПО НАБОРУ: три отдельные проверки — написание, пиньинь,
  перевод. Оценка узнавания не подменяет письмо. Сессия сохраняется
  в meta; ошибки возвращаются после нескольких других заданий.
==================================================================*/
const DICTATION_PRESETS=[
  {id:'L18',title:'Урок 18',kind:'lessons',lessons:[18]},
  {id:'L19',title:'Урок 19',kind:'lessons',lessons:[19]},
  {id:'L18-19',title:'Уроки 18 и 19',kind:'lessons',lessons:[18,19]},
  {id:'R1-40',title:'Ключи 1–40',kind:'radicals',from:1,to:40},
  {id:'R1-115',title:'Ключи 1–115',kind:'radicals',from:1,to:115}
];
const DICTATION_FIELDS={write:'Написание',pinyin:'Пиньинь и тоны',meaning:'Перевод'};
function dictationStore(){
  const d=State.meta.dictation;
  if(!d||typeof d!=='object'||Array.isArray(d)) State.meta.dictation={records:{},history:[],active:null};
  const out=State.meta.dictation;
  if(!out.records||typeof out.records!=='object') out.records={};
  if(!Array.isArray(out.history)) out.history=[];
  return out;
}
function dictationConfig(c){
  c=c||{};
  const kind=c.kind==='radicals'?'radicals':'lessons';
  const lessons=uniq((c.lessons||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=NL)).sort((a,b)=>a-b);
  const from=Math.max(1,Math.min(214,Math.floor(+c.from||1)));
  const to=Math.max(from,Math.min(214,Math.floor(+c.to||40)));
  const n=[4,8,16,214].includes(+c.count)?+c.count:8;
  return {kind,lessons:lessons.length?lessons:[18],from,to,count:n,audio:!!c.audio};
}
function dictationScope(c){ c=dictationConfig(c); return c.kind==='radicals'?'R'+c.from+'-'+c.to:'L'+c.lessons.join('-'); }
function dictationTitle(c){ return c.kind==='radicals'?'Ключи '+c.from+'–'+c.to:'Урок'+(c.lessons.length>1?'и ':' ')+c.lessons.join(', '); }
function dictationItems(config){
  const c=dictationConfig(config);
  if(c.kind==='radicals') return RADS.filter(r=>r[0]>=c.from&&r[0]<=c.to).map(r=>({id:'r:'+r[0],zh:(RADW[r[0]]||[[r[4][0]]])[0][0],forms:(RADW[r[0]]||[[r[4][0]]]).map(f=>f[0]).join(' '),py:r[2],ru:r[3],source:'Ключ №'+r[0]}));
  const keysFor=L=>lessonWords(L).concat(lessonExtras(L).flatMap(x=>x.words)).map(w=>w.key);
  return uniq(c.lessons.flatMap(keysFor)).map(k=>BYK[k]).filter(Boolean).map(w=>({id:w.key,zh:w.s,py:w.p,ru:meaning(w),source:'Урок '+c.lessons.filter(L=>keysFor(L).includes(w.key)).join(', ')}));
}
// Tone digits and diacritics are equivalent; omitting a tone is neutral tone,
// not permission to discard the tones of the expected answer.
function dictationPinyinKey(py){
  return (py||'').normalize('NFC').toLowerCase().replace(/u:/g,'ü').replace(/v/g,'ü')
    .replace(/[’'·-]/g,' ').match(/[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹ]+[1-5]?/g)?.map(s=>{
      const digit=s.match(/[1-5]$/), tone=digit?+digit[0]:syllTone(s);
      return toneless(s.replace(/[1-5]$/,''))+tone;
    }).join(' ')||'';
}
function dictationPinyinOK(input,answer){
  if(!input||!input.trim()) return false;
  if(typeof normalizePinyin==='function'){ const got=normalizePinyin(input); return !!got&&answer.split(/\s*[/／;；]\s*/).some(p=>got===normalizePinyin(p)); }
  return answer.split(/\s*[/／;；]\s*/).some(p=>dictationPinyinKey(input)===dictationPinyinKey(p));
}
function dictationItemScore(item){
  const r=dictationStore().records;
  return Object.keys(DICTATION_FIELDS).reduce((n,f)=>n+(r[item.id+'|'+f]?.ok?1:0),0);
}
function dictationStart(config,wrongOnly){
  const c=dictationConfig(config), store=dictationStore();
  let pool=dictationItems(c);
  if(wrongOnly){ const ids=new Set(wrongOnly); pool=pool.filter(x=>ids.has(x.id)); }
  if(!pool.length){ toast('В этом наборе пока нет слов'); return; }
  // Untested and mistaken items first; no random key outside the chosen range.
  pool=pool.map((x,i)=>({x,i,score:dictationItemScore(x),at:Math.max(...Object.keys(DICTATION_FIELDS).map(f=>store.records[x.id+'|'+f]?.at||0))}))
    .sort((a,b)=>a.score-b.score||a.at-b.at||a.i-b.i).map(x=>x.x).slice(0,c.count===214?undefined:c.count);
  const order=shuffle(pool), q=[];
  for(const field of Object.keys(DICTATION_FIELDS)) order.forEach(item=>q.push({item,field,tries:0}));
  store.active={config:c,title:dictationTitle(c),items:pool,q,total:q.length,first:0,ok:0,done:0,errors:[],started:Date.now(),open:false};
  store.lastConfig=c;
  save('meta'); go('dictation',{run:true});
}
function dictationAnswer(ok){
  const st=dictationStore(), a=st.active;
  if(!a||a.finished||!a.open||!a.q.length) return;
  const x=a.q.shift(), first=!x.tries;
  if(first){
    a.first++; D().t++; if(ok){ a.ok++; D().ok++; addXP(5); }
    if(typeof memoryRecordSkill==='function') memoryRecordSkill(x.item.id,x.field==='write'?'writing':x.field,ok?3:1);
  }
  if(!ok&&!a.errors.includes(x.item.id)) a.errors.push(x.item.id);
  x.tries++;
  const recordKey=x.item.id+'|'+x.field, previous=st.records[recordKey];
  // An immediate correction is practice, not new evidence of independent recall.
  // Preserve the first attempt until a later independent round tests it again.
  st.records[recordKey]={ok:first?!!ok:!!previous?.ok,corrected:!first&&!!ok,
    at:Date.now(),attempts:(previous?.attempts||0)+1};
  if(ok) a.done++;
  else{
    delete x.input; delete x.ink; delete x.pyOK; delete x.gaveUp;
    a.q.splice(Math.min(a.q.length,4),0,x);
  }
  a.open=false;
  if(!a.q.length){
    a.finished=true; a.ended=Date.now(); D().ls++;
    st.history.unshift({title:a.title,date:todayStr(),ok:a.ok,total:a.first,errors:a.errors.slice(),config:a.config});
    st.history=st.history.slice(0,30);
  }
  save('meta'); render();
}
function viewDictation(s){
  const v=el('div','view'); s.appendChild(v);
  const st=dictationStore(), a=st.active;
  if(State.route.run&&a) return a.finished?dictationEnd(v,a):dictationRun(v,a);
  const back=el('button','back','‹ Повторение'); back.onclick=()=>go('practice'); v.appendChild(back);
  v.appendChild(el('h2','title','Готовлюсь к диктанту'));
  v.appendChild(el('p','note','Небольшими порциями: вспомни написание по переводу, затем пиньинь с тонами и значение по иероглифам. Без вариантов ответа. Ошибки потренируем ещё раз.'));
  if(a&&!a.finished){
    const resume=el('button','btn blue',IC('play',18)+' Продолжить · '+esc(a.title));
    resume.onclick=()=>go('dictation',{run:true}); v.appendChild(resume);
    v.appendChild(el('p','note','Место сохранено: осталось '+a.q.length+' заданий. Новый набор заменит незаконченный раунд.'));
  }
  v.appendChild(el('p','eyebrow','Быстрый старт · 8 слов или ключей'));
  const presets=el('div','rowlist');
  DICTATION_PRESETS.forEach(p=>{
    const items=dictationItems(p), full=items.filter(x=>dictationItemScore(x)===3).length;
    const b=el('button','row',`<div class="n">${IC(p.kind==='radicals'?'splitW':'pencilW',22)}</div><div class="tt"><b>${esc(p.title)}</b><small>${items.length} ${p.kind==='radicals'?'ключей':'слов'} · три навыка проверены: ${full}/${items.length}</small></div>${IC('chev',18)}`);
    b.onclick=()=>dictationStart(p); presets.appendChild(b);
  }); v.appendChild(presets);
  v.appendChild(el('p','eyebrow','Свой набор'));
  const form=el('form','item');
  form.innerHTML=`<label class="setrow"><span class="lab"><b>Что повторяем</b></span><select name="kind" aria-label="Тип набора"><option value="lessons">Слова уроков</option><option value="radicals">Ключи по номеру</option></select></label>
    <label class="setrow" data-lessons><span class="lab"><b>Уроки 1–30</b><small>Через запятую: 18, 19 или диапазон 18–20</small></span><input name="lessons" value="18, 19" aria-label="Номера уроков" style="max-width:130px"></label>
    <div class="setrow" data-radicals hidden><span class="lab"><b>Ключи Канси 1–214</b></span><label>От <input name="from" type="number" min="1" max="214" value="1" aria-label="Первый ключ" style="width:64px"></label><label>до <input name="to" type="number" min="1" max="214" value="40" aria-label="Последний ключ" style="width:64px"></label></div>
    <label class="setrow"><span class="lab"><b>Порция</b><small>По 3 задания на каждый элемент</small></span><select name="count" aria-label="Размер порции"><option value="4">4 · легко начать</option><option value="8" selected>8 · обычный раунд</option><option value="16">16 · большой раунд</option><option value="214">Весь набор</option></select></label>
    <label class="setrow"><span class="lab"><b>Писать под диктовку</b><small>Вместо перевода — только аудио. Для слов; ключи — по названию.</small></span><input name="audio" type="checkbox"></label>
    <p class="note" data-error role="alert"></p><button class="btn" type="submit">${IC('play',18)} Начать свой раунд</button>`;
  const fields=form.elements;
  const toggle=()=>{ form.querySelector('[data-lessons]').hidden=fields.kind.value!=='lessons'; form.querySelector('[data-radicals]').hidden=fields.kind.value!=='radicals'; };
  fields.kind.onchange=toggle;
  form.onsubmit=e=>{
    e.preventDefault(); let lessons=[];
    const err=form.querySelector('[data-error]'); err.textContent='';
    if(fields.kind.value==='lessons'){
      const tokens=fields.lessons.value.trim().split(/[,;\s]+/).filter(Boolean);
      for(const token of tokens){
        const range=token.match(/^(\d+)[–—-](\d+)$/), single=token.match(/^\d+$/);
        if(range){ const from=+range[1],to=+range[2]; if(from<1||to>30||from>to){ err.textContent='Укажи уроки от 1 до 30, например 18–20.'; return; } for(let n=from;n<=to;n++) lessons.push(n); }
        else if(single&&+token>=1&&+token<=30) lessons.push(+token);
        else{ err.textContent='Укажи уроки от 1 до 30, например 18, 19.'; return; }
      }
      if(!lessons.length){ err.textContent='Выбери хотя бы один урок.'; return; }
    }else if(+fields.from.value<1||+fields.to.value>214||+fields.from.value>+fields.to.value){ err.textContent='Начало и конец: от 1 до 214, по возрастанию.'; return; }
    dictationStart({kind:fields.kind.value,lessons,from:+fields.from.value,to:+fields.to.value,count:+fields.count.value,audio:fields.audio.checked});
  };
  v.appendChild(form);
  v.appendChild(el('p','note','Счётчик показывает последние самопроверки, а не гарантию знания. Пройди тот же набор завтра: вспоминание после паузы важнее результата сразу после изучения.'));
  if(st.history.length){
    v.appendChild(el('p','eyebrow','Последние раунды'));
    st.history.slice(0,5).forEach(h=>v.appendChild(el('div','item',`<b>${esc(h.title)}</b><div class="note">${fmtDate(h.date)} · с первого раза ${h.ok}/${h.total} · ошибки: ${h.errors.length}</div>`)));
  }
}
function dictationRun(v,a){
  const x=a.q[0]; if(!x){ a.finished=true; return dictationEnd(v,a); }
  const pause=el('button','back','‹ Сохранить и выйти'); pause.onclick=()=>{ save('meta'); go('dictation'); }; v.appendChild(pause);
  v.appendChild(el('p','eyebrow',esc(a.title)+' · '+DICTATION_FIELDS[x.field]));
  v.appendChild(el('div','progress',`<i style="width:${Math.min(100,a.done/a.total*100)}%"></i>`));
  v.appendChild(el('p','note','Осталось '+a.q.length+' заданий'+(x.tries?' · возвращаемся к ошибке':'')));
  const c=el('div','qcard'); c.style.minHeight='0'; v.appendChild(c);
  const audio=a.config.audio&&a.config.kind==='lessons'&&x.field==='write';
  c.innerHTML=`<div class="qprompt">${x.field==='write'?(audio?'Послушай и напиши иероглифы':'Напиши иероглифами по памяти'):x.field==='pinyin'?'Как читается? Запиши пиньинь с тонами':'Что это значит? Вспомни перевод'}</div>
    ${x.field==='write'?audio?'':`<div class="qbig">${esc(x.item.ru)}</div>`:`<div class="qhz han" style="font-size:60px">${esc(x.item.zh)}</div>`}`;
  if(audio){ const listen=el('button','btn mini',SPK(20)+' Слушать'); listen.onclick=()=>Speech.say(x.item.zh,undefined,x.item.py); c.appendChild(listen); }
  const answer=el('div',''); v.appendChild(answer);
  if(a.open) return dictationReveal(answer,a,x);
  if(x.field==='write'){
    v.appendChild(el('p','note','Напиши на бумаге или в пустом поле ниже. Здесь нет контура: после ответа сверь каждую черту. Проверку написания оцениваешь ты.'));
    dictationInk(answer,x);
  }else{
    const input=el('input'); input.type='text'; input.value=x.input||''; input.autocomplete='off'; input.spellcheck=false;
    input.setAttribute('aria-label',x.field==='pinyin'?'Ответ пиньинем':'Перевод'); input.placeholder=x.field==='pinyin'?'nǐ hǎo или ni3 hao3':'Перевод (можно проверить устно)';
    input.style.cssText='width:100%;padding:16px;font-size:20px;margin:12px 0';
    input.oninput=()=>{ x.input=input.value; save('meta'); };
    input.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); reveal(); } }; answer.appendChild(input);
  }
  const reveal=()=>{
    if(x.field==='pinyin'&&!(x.input||'').trim()){ toast('Сначала попробуй записать пиньинь — или нажми «Не помню»'); return; }
    a.open=true; if(x.field==='pinyin') x.pyOK=dictationPinyinOK(x.input,x.item.py);
    save('meta'); render();
  };
  const show=el('button','btn','Сверить ответ'); show.dataset.key='space'; show.onclick=reveal; answer.appendChild(show);
  const lost=el('button','btn ghost','Не помню — посмотреть'); lost.onclick=()=>{ x.gaveUp=true; a.open=true; if(x.field==='pinyin') x.pyOK=false; save('meta'); render(); }; answer.appendChild(lost);
}
function dictationReveal(host,a,x){
  if(x.field==='write'&&x.ink&&x.ink.length){ host.appendChild(el('p','note','Твоя запись — сравни с образцом ниже')); dictationInk(host,x,true); }
  host.appendChild(el('div','item',`<div class="kind">${esc(x.item.source)}</div><div class="han" style="font-size:42px">${esc(x.item.zh)}</div>
    ${x.item.forms&&x.item.forms!==x.item.zh?`<div class="han" style="font-size:24px">Формы: ${esc(x.item.forms)}</div>`:''}
    <div class="py">${pinyinHTML(x.item.py)}</div><div class="tr">${esc(x.item.ru)}</div>
    ${x.input?`<div class="note">Твой ответ: ${esc(x.input)}</div>`:''}
    ${x.field==='pinyin'?`<p class="verdict ${x.pyOK?'ok':'bad'}">${x.pyOK?'Пиньинь и тоны совпали':'Сверь слоги и тоны. Вернёмся к слову ещё раз.'}</p>`:''}`));
  const say=el('button','say',SPK(18)+' Произношение'); say.onclick=()=>Speech.say(x.item.zh,undefined,x.item.py); host.appendChild(say);
  if(x.field==='write'){
    host.appendChild(el('p','note','Сверь число знаков, все черты и их расположение. Если подсмотрел, выбери «Повторить».'));
    const demo=el('div'); host.appendChild(demo);
    const show=el('button','btn ghost mini',IC('brush',18)+' Порядок черт');
    show.onclick=()=>{ show.remove(); strokeDemo(demo,a.config.kind==='radicals'?(RADW[radNum(x.item.id)]||[[x.item.zh]]).map(f=>f[0]):hanOf(x.item.zh)); }; host.appendChild(show);
  }
  if(x.field==='pinyin'){
    const next=el('button','btn',x.pyOK?'Верно · дальше':'Повторить позже'); next.dataset.key='space'; next.onclick=()=>dictationAnswer(x.pyOK); host.appendChild(next);
  }else{
    const row=el('div','gradebar');
    const no=el('button','grade g1','Повторить<small>ошибка или подсмотрел</small>'); no.dataset.key='1'; no.onclick=()=>dictationAnswer(false);
    const yes=el('button','grade g3','Вспомнил верно<small>без подсказок</small>'); yes.dataset.key='2'; yes.disabled=!!x.gaveUp; yes.onclick=()=>dictationAnswer(true);
    row.append(no,yes); host.appendChild(row);
  }
  if(x.field==='write'&&a.config.kind==='lessons') host.appendChild(el('div','',wordFormulas(BYK[x.item.id])));
}
function dictationEnd(v,a){
  v.appendChild(el('h2','title','Раунд завершён'));
  v.appendChild(el('div','hero',`<div class="kind">${esc(a.title)}</div><h2>С первого раза ${a.ok} из ${a.first}</h2><p>Написание, пиньинь и перевод проверены отдельно. ${a.errors.length?'Ошибки этого раунда уже повторены.':'Все задания — с первого раза.'}</p><p class="note">Повтори этот набор завтра без подсказок. Сегодня можно остановиться: короткие занятия проще продолжать каждый день.</p>`));
  const next=el('button','btn','Следующая порция этого набора'); next.onclick=()=>dictationStart(a.config); v.appendChild(next);
  if(a.errors.length){ const retry=el('button','btn ghost','Ещё раз только трудные · '+a.errors.length); retry.onclick=()=>dictationStart(a.config,a.errors); v.appendChild(retry); }
  const back=el('button','btn ghost','К наборам'); back.onclick=()=>go('dictation'); v.appendChild(back);
}
// Free handwriting, deliberately without recognition or a contour. Vector ink is
// saved at pointer-up and redrawn after navigation/reload; paper works offline too.
function dictationInk(host,x,readOnly){
  const canvas=el('canvas'); canvas.width=600; canvas.height=270;
  canvas.setAttribute('aria-label','Поле для письма по памяти'); canvas.style.cssText='display:block;width:100%;height:180px;background:#fff;border:2px dashed var(--line2);border-radius:16px;touch-action:none;margin:12px 0';
  host.appendChild(canvas);
  let ctx=null; try{ if(typeof CanvasRenderingContext2D!=='undefined') ctx=canvas.getContext('2d'); }catch(e){}
  if(!ctx){ host.appendChild(el('p','note','Пиши на бумаге, затем сверь ответ.')); return; }
  ctx.lineWidth=4; ctx.lineCap='round'; ctx.strokeStyle='#4b4b4b';
  const draw=points=>{ if(!points.length) return; ctx.beginPath();
    if(points.length===1){ ctx.fillStyle=ctx.strokeStyle; ctx.arc(points[0][0],points[0][1],ctx.lineWidth/2,0,Math.PI*2); ctx.fill(); return; }
    ctx.moveTo(points[0][0],points[0][1]); points.slice(1).forEach(p=>ctx.lineTo(p[0],p[1])); ctx.stroke(); };
  (x.ink||[]).forEach(draw);
  if(readOnly) return;
  let line=null;
  const point=e=>{ const r=canvas.getBoundingClientRect(); return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height]; };
  canvas.onpointerdown=e=>{ e.preventDefault(); canvas.setPointerCapture(e.pointerId); line=[point(e)]; };
  canvas.onpointermove=e=>{ if(!line) return; line.push(point(e)); draw(line.slice(-2)); };
  const stop=()=>{ if(!line) return; if(line.length===1) draw(line); (x.ink||(x.ink=[])).push(line); line=null; save('meta'); };
  canvas.onpointerup=stop; canvas.onpointercancel=stop;
  const clear=el('button','btn ghost mini',IC('undo',16)+' Очистить поле'); clear.onclick=()=>{ x.ink=[]; ctx.clearRect(0,0,canvas.width,canvas.height); save('meta'); }; host.appendChild(clear);
}
