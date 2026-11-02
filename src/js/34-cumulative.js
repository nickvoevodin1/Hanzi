/*==================================================================
  КОРОТКОЕ НАКОПИТЕЛЬНОЕ ПОВТОРЕНИЕ ДЛЯ УЗЛОВ ПУТИ.
  Добавляем до двух уже введённых элементов к порции с новым материалом.
  Планирование чистое: очередь не меняет знания, расписание или ротацию.
==================================================================*/
function withLearnedReview(items,opts){
  opts=opts||{}; const base=uniq(items||[]);
  const fresh=base.filter(k=>typeof k==='string'&&memoryValid(k)&&isNew(k));
  if(!fresh.length) return base;
  const limit=opts.limit==null?2:Math.min(2,Math.max(0,Math.floor(+opts.limit)||0));
  if(!limit) return base;
  const newRads=fresh.filter(isRad), newWords=fresh.filter(k=>!isRad(k));
  const kind=opts.kind||'auto';
  const wantRads=kind!=='words'&&newRads.length>0;
  const wantWords=kind!=='keys'&&kind!=='radicals'&&newWords.length>0;
  // A numbered node only revisits earlier keys. A later already-known key
  // (for example 120) cannot appear inside the 37–44 learning node.
  const beforeRad=newRads.length?Math.min(...newRads.map(radNum))-1:0;
  const maxRad=opts.keyMax==null?beforeRad:Math.min(beforeRad,+opts.keyMax||0);
  const beforeLesson=newWords.length?Math.max(...newWords.map(k=>WORD_L[k])):0;
  const maxLesson=opts.lessonMax==null?beforeLesson:Math.min(beforeLesson,+opts.lessonMax||0);
  const exclude=new Set(base), history=State.meta.learnedPractice||{};
  const pool=Object.keys(State.cards).filter(k=>!exclude.has(k)&&memoryValid(k)&&!isNew(k))
    .filter(k=>isRad(k)?wantRads&&radNum(k)<=maxRad:wantWords&&WORD_L[k]<=maxLesson);
  pool.sort((a,b)=>{
    const dueA=isDue(a), dueB=isDue(b);
    if(dueA!==dueB) return dueA?-1:1;
    if(dueA&&cardOf(a).due!==cardOf(b).due) return cardOf(a).due-cardOf(b).due;
    // Successful early practice leaves FSRS untouched; track its rotation
    // separately so the same weak pair cannot monopolise every new portion.
    const time=(history[a]||0)-(history[b]||0); if(time) return time;
    const strength=(+stab(a)||0)-(+stab(b)||0); if(strength) return strength;
    if(isRad(a)&&isRad(b)) return radNum(a)-radNum(b);
    return (WORD_L[a]||0)-(WORD_L[b]||0)||a.localeCompare(b);
  });
  return pool.slice(0,limit).concat(base);
}
function markLearnedPractice(k){
  if(typeof k!=='string'||!memoryValid(k)||isNew(k)) return;
  const log=State.meta.learnedPractice||(State.meta.learnedPractice={});
  log[k]=Date.now();
  save('meta');
}
// A real failure elsewhere can invalidate a skill's previous confident rating.
// Correct recognition answers cannot prove writing, so there is no success hook.
function recordGameMemoryFailure(task){
  if(!task||task.ungraded||!task.k||typeof memoryRecordSkill!=='function') return;
  const skill={wmem:'writing',write:'writing',recall:'writing',radrecall:'writing',
    pinyin:'pinyin',tones:'pinyin',choice:'meaning',keyname:'meaning'}[task.t];
  if(!skill) return;
  const k=isWR(task.k)?wrOf(task.k):task.k;
  // A single-character writing test says nothing about the other characters in
  // multi-character words containing it. Only an exact vocabulary item matches.
  if(!memoryValid(k)) return;
  memoryRecordSkill(k,skill,1);
}
