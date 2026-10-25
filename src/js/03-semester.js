/*==================================================================
  СЕМЕСТРОВЫЙ ПЛАН: ёмкость дней, квоты новых слов и ключей, тип дня
  Все даты — строки 'YYYY-MM-DD' в местном времени (dstr / todayStr).
==================================================================*/
function pdate(s){ const p=(s||'').split('-').map(Number); return p.length===3&&p[0] ? new Date(p[0],p[1]-1,p[2]) : null; }
function addDays(s,n){ const d=pdate(s); d.setDate(d.getDate()+n); return dstr(d); }
function dayDiff(a,b){ return Math.round((pdate(b)-pdate(a))/864e5); }        // b − a, дней
function inHolidays(d,sem){ const h=sem.holidays||{}; return !!(h.from&&h.to&&d>=h.from&&d<=h.to); }
function isAway(d,sem){ return (sem.awayDays||[]).includes(d); }
// Ближайшая контрольная через 1–7 дней (фокус-неделя)
function focusExam(d,sem){
  let best=null;
  (sem.exams||[]).forEach(e=>{ if(!e.date) return; const k=dayDiff(d,e.date); if(k>=1&&k<=7&&(!best||k<best.k)) best={e,k}; });
  return best;
}
function nextExam(d,sem){
  d=d||todayStr(); sem=sem||SEM();
  return (sem.exams||[]).filter(e=>e.date&&e.date>=d).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}
const DAY_NAMES={normal:'обычный день',away:'поездка',holiday:'каникулы',focus:'фокус-неделя',consol:'закрепление'};
function dayType(d,sem){
  d=d||todayStr(); sem=sem||SEM();
  if(isAway(d,sem)) return 'away';
  if(inHolidays(d,sem)) return 'holiday';
  if(focusExam(d,sem)) return 'focus';
  if(sem.newWordsUntil&&d>sem.newWordsUntil) return 'consol';
  return 'normal';
}
// Ёмкость дня для новых слов: обычный 1, поездка 0.3, каникулы — из настроек; после newWordsUntil — 0
// (в режиме «опаздываю» — считаем до endDate); фокус-неделя ×0.5
function capacity(d,sem,late){
  if(!late&&sem.newWordsUntil&&d>sem.newWordsUntil) return 0;
  let c = isAway(d,sem) ? 0.3 : inHolidays(d,sem) ? Math.max(0,+(sem.holidays.capacity)||0) : 1;
  if(focusExam(d,sem)) c*=0.5;
  return c;
}
function capacityLeft(today,sem,late){
  const end=late?sem.endDate:sem.newWordsUntil; if(!end||end<today) return 0;
  let s=0; for(let d=today; d<=end; d=addDays(d,1)) s+=capacity(d,sem,late);
  return Math.round(s*1000)/1000;
}
// Квота новых слов на сегодня. remaining — без карточки сейчас, introduced — уже введено сегодня
function wordsQuota(o){
  const sem=o.sem||SEM(), today=o.today||todayStr(), intro=o.introduced||0;
  const rem0=Math.max(0,(o.remaining||0)+intro);                 // на начало дня — квота не «уезжает» в течение дня
  const late=!!(sem.newWordsUntil&&today>sem.newWordsUntil&&rem0>0);
  const type=dayType(today,sem);
  const capT=capacity(today,sem,late), capL=capacityLeft(today,sem,late);
  let quota = rem0<=0 ? 0 : capL>0 ? Math.ceil(rem0*capT/capL) : 0;
  const rest=(type==='away'||type==='holiday')&&!o.more;           // поездка/каникулы: только повторения, если не «учить больше»
  if(rest) quota=0;
  quota=Math.min(quota,rem0);
  return {quota,left:Math.max(0,quota-intro),late,type,capToday:capT,capLeft:capL,rest,
    pace:capL>0?rem0/capL:0, remaining:rem0, ended:late&&capL<=0};
}
// Квота ключей: keysPerDay в обычный день, 0 в поездку и на каникулах
function keysQuota(today,sem){
  sem=sem||SEM(); const t=dayType(today||todayStr(),sem);
  if(t==='away'||t==='holiday') return 0;
  return Math.max(0,+sem.keysPerDay||0);
}

// — слова семестра: уроки 1..targetLesson в порядке курса (учебник, затем список группы урока)
function semWords(){ const N=SEM().on?SEM().targetLesson:NL; return COURSE.filter(k=>WORD_L[k]<=N); }
const inSem=k=>WORD_L[k]!=null&&WORD_L[k]<=(SEM().on?SEM().targetLesson:NL);
function semRemaining(){ return semWords().filter(isNew).length; }
function behindGroup(){ return COURSE.filter(k=>WORD_L[k]<=groupL()&&isNew(k)).length; }
function todayWordsQuota(){
  const d=D();
  if(!SEM().on){ const q=Math.max(0,State.settings.newPerDay||0); return {quota:q,left:Math.max(0,q-d.new),type:dayType(),rest:false,late:false,pace:q,remaining:semRemaining(),capLeft:0}; }
  return wordsQuota({remaining:semRemaining(),introduced:d.new,more:!!d.more});
}
function keysDeckLeft(){ return KEY_ORDER.filter(n=>isNew('r:'+n)).length; }
function todayKeysQuota(){ const q=keysDeckLeft()?keysQuota():0; return {quota:q,left:Math.max(0,Math.min(keysDeckLeft(),q-D().keys))}; }
// Новые на сегодня: ключи по порядку изучения, слова — сначала долги до урока группы, дальше по курсу
function newKeysToday(){ const n=todayKeysQuota().left; return n? KEY_ORDER.map(x=>'r:'+x).filter(isNew).slice(0,n) : []; }
function newWordsToday(){ const n=todayWordsQuota().left; return n? semWords().filter(isNew).slice(0,n) : []; }
// «Урок дня» целиком: повторения к сроку + новые ключи + новые слова
function dailyQueue(){ return dueKeys().concat(newKeysToday(),newWordsToday()); }

// Прогноз: средний темп за 14 дней → дата, когда кончатся новые слова
function forecast(){
  const rem=semRemaining(); if(!rem) return {done:true};
  let sum=0; const t=todayStr();
  for(let i=1;i<=14;i++){ const r=State.meta.daily[addDays(t,-i)]; if(r) sum+=r.new||0; }
  const avg=sum/14; if(avg<=0) return {avg:0};
  return {avg,date:addDays(t,Math.ceil(rem/avg))};
}
function semStats(){
  const ws=semWords(), learned=ws.filter(k=>!isNew(k)).length, solid=ws.filter(k=>stab(k)>=21).length;
  return {total:ws.length,learned,solid,know:ws.filter(k=>stab(k)>=7).length};
}
// Сколько минут займёт пункт плана (для подсказки)
function planMinutes(id,n){ return Math.max(1,Math.round(({rev:.33,new:1.4,keys:1,dec:1,sent:1.4,mock:State.settings.mockMin||40}[id]||1)*(id==='mock'?1:n))); }
// План дня (чеклист раздела 4)
function dayPlan(){
  const d=D(), type=dayType(), due=dueKeys().length;
  const wq=todayWordsQuota(), kq=todayKeysQuota();
  const items=[];
  items.push({id:'rev',icon:'cycleC',title:'Повторения',sub:due?'к сроку: '+due:(d.rv?'все сделаны':'на сегодня нет'),cur:d.rv,need:d.rv+due,done:due===0,min:planMinutes('rev',due)});
  if(wq.quota>0||(!wq.rest&&wq.remaining>0)) items.push({id:'new',icon:'sparkleC',title:'Новые слова — '+wq.quota,sub:wq.left?'осталось '+wq.left:'квота выполнена',cur:d.new,need:wq.quota,done:wq.left===0,min:planMinutes('new',wq.left)});
  if(keysDeckLeft()&&kq.quota>0) items.push({id:'keys',icon:'部',title:'Новые ключи — '+kq.quota,sub:'осталось ввести '+keysDeckLeft()+' из 214',cur:d.keys,need:kq.quota,done:kq.left===0,min:planMinutes('keys',kq.left)});
  if(type==='focus'){
    items.push({id:'mock',icon:'pencil',title:'Пробная контрольная',sub:'фокус-неделя: '+(focusExam(todayStr(),SEM()).e.title||'контрольная'),cur:d.mock,need:1,done:d.mock>=1,min:planMinutes('mock')});
  }else if(type!=='away'){
    items.push({id:'dec',icon:'split',title:'Разбор на ключи — 5',sub:'иероглифы выученных слов',cur:d.dec,need:5,done:d.dec>=5,min:planMinutes('dec',Math.max(0,5-d.dec))});
    items.push({id:'sent',icon:'chat',title:'Перевод предложений — 5',sub:'RU→中 и 中→RU',cur:d.sent,need:5,done:d.sent>=5,min:planMinutes('sent',Math.max(0,5-d.sent))});
    if(type==='holiday'||type==='consol') items.push({id:'mock',icon:'pencil',title:'Пробная контрольная',sub:'раз в 2–3 дня',cur:d.mock,need:1,done:d.mock>=1,opt:1,min:planMinutes('mock')});
  }
  // 3 ежедневных задания: повторения, новые слова (или предложения), ключи (или разбор / пробная в фокус-неделю)
  const pick=ids=>ids.map(id=>items.find(x=>x.id===id)).find(Boolean);
  const quests=[pick(['rev']),pick(wq.quota>0?['new','sent','dec']:['sent','dec','new']),pick(type==='focus'?['mock','keys','dec']:['keys','dec','sent'])]
    .filter((x,i,a)=>x&&a.indexOf(x)===i);
  quests.forEach(q=>q.quest=1);
  return {type,items,quests,minutes:items.filter(x=>!x.done&&!x.opt).reduce((a,x)=>a+x.min,0)};
}
