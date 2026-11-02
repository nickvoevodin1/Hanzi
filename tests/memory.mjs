// Тетрадь: три календарных дня, независимые навыки, ошибки и сохранение сессии.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,doc}=A;
ev("window.__memoryRealToday=todayStr; window.__memoryDay=todayStr(); todayStr=()=>window.__memoryDay; window.__memoryNow=Date.now; window.__memoryClock=Date.now(); Date.now=()=>window.__memoryClock");
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null; memoryState().lesson=0");
const nextDay=()=>ev("window.__memoryDay=addDays(window.__memoryDay,1); window.__memoryClock+=864e5");
const mount=()=>ev("document.getElementById('screen').innerHTML=''; viewMemory(document.getElementById('screen'))");
await T('enrollment-is-small-and-preserves-existing',()=>{
  reset(); ev("State.cards[semWords()[0]]=FSRS.review({},3,REQ); window.__before=JSON.stringify(State.cards)");
  ok(ev("Object.keys(memoryState().entries).length")===0,'при открытии весь старый прогресс записан в тетрадь');
  ev("memoryStart()");
  ok(ev("memoryState().session.keys.length")===5,'порция не 3 слова +2 ключа');
  ok(ev("Object.keys(memoryState().entries).length")===5,'лишние автоматически добавленные элементы');
  ok(ev("JSON.stringify(State.cards)===window.__before"),'при старте поменялось существующее расписание');
  ok(ev("memoryState().session.tasks.length")===15,'три навыка для каждого элемента');
});
await T('answers-hidden-and-session-resumable',()=>{
  reset(); ev("memoryStart({kind:'words'}); window.__memoryK=memoryState().session.tasks[0].k"); mount();
  ok(/Закрыть образец/.test(doc.getElementById('screen').textContent),'нет знакомства в день1');
  ev("memoryState().session.studied.push(window.__memoryK)"); mount();
  const hz=ev("memoryInfo(window.__memoryK).hz");
  ok(!doc.querySelector('#screen .qcard .han'),'на письме показан ответ до сверки');
  ok(/Напиши иероглифы/.test(doc.getElementById('screen').textContent),'нет активного воспроизведения письма');
  ev("memoryState().session.reveal=true; window.__savedMemory=JSON.stringify(memoryState()); State.meta.memory=JSON.parse(window.__savedMemory)"); mount();
  ok(doc.querySelector('#screen .hero .han')?.textContent===hz,'ответ после восстановления не показан');
});
await T('three-days-and-independent-fsrs',()=>{
  reset(); ev("window.__memoryK=semWords()[0]; memoryEnroll(window.__memoryK); memoryRecordSkill(window.__memoryK,'hz',1); memoryRecordSkill(window.__memoryK,'py',3); memoryRecordSkill(window.__memoryK,'ru',3)");
  ok(ev("memoryRows(memoryState().entries[window.__memoryK])")===1,'день1 не записан');
  ok(ev("isNew(window.__memoryK)"),'слово с ошибкой письма сочли введённым');
  ok(ev("memoryState().entries[window.__memoryK].skills.hz.card.S<memoryState().entries[window.__memoryK].skills.py.card.S"),'навыки делят одну прочность');
  ok(ev("memoryDueKeys().length")===0,'тот же день немедленно требует ещё строку');
  ev("window.__memoryOldS=memoryState().entries[window.__memoryK].skills.hz.card.S; memoryRecordSkill(window.__memoryK,'hz',3)");
  ok(ev("memoryState().entries[window.__memoryK].skills.hz.card.S===window.__memoryOldS"),'повтор ошибки в тот же день повысил прочность');
  nextDay();
  ok(ev("memoryDueSkills(memoryState().entries[window.__memoryK]).length")===3,'день2 не проверяет три навыка');
  ev("MEMORY_SKILLS.forEach(sk=>memoryRecordSkill(window.__memoryK,sk,3))");
  ok(!ev("isNew(window.__memoryK)"),'после трёх успешных навыков не введено слово');
  const old=ev("JSON.stringify(State.cards[window.__memoryK])");
  nextDay(); ev("MEMORY_SKILLS.forEach(sk=>memoryRecordSkill(window.__memoryK,sk,3))");
  ok(ev("memoryRows(memoryState().entries[window.__memoryK])")===3,'нет3 календарных дней');
  ok(ev("JSON.stringify(State.cards[window.__memoryK])")===old,'тетрадь перезаписала основную FSRS карточку');
  ok(ev("memoryStats().words.threeDays")===1,'нет статистики3 дней');
  ev("MEMORY_SKILLS.forEach((sk,n)=>{ memoryState().entries[window.__memoryK].skills[sk].day=addDays(todayStr(),-1); memoryState().entries[window.__memoryK].skills[sk].card.due=Date.now()+(n===0?-1:864e5); })");
  ok(ev("memoryDueSkills(memoryState().entries[window.__memoryK]).join(',')")==='hz','после3 дней должны быть независимые сроки');
});
await T('backlog-preserved-and-error-retry-bounded',()=>{
  reset(); ev("semWords().slice(0,9).forEach(memoryEnroll); memoryStart(); window.__memoryBefore=Object.keys(memoryState().entries).length");
  ok(ev("memoryState().session.keys.length")===5,'долги не разбиты на порции');
  ev("memoryState().session.studied=memoryState().session.keys.slice(); memoryState().session.reveal=true; memoryGrade(1)");
  ok(ev("memoryState().session.tasks.filter(t=>t.retry).length")===1,'ошибка не вернулась в конец');
  ok(ev("Object.keys(memoryState().entries).length===window.__memoryBefore"),'просроченные записи потеряны');
  ev("window.__memorySS=memoryState().session; window.__memorySS.index=window.__memorySS.tasks.length-1; window.__memorySS.reveal=true; memoryGrade(1)");
  ok(ev("window.__memorySS.tasks.filter(t=>t.retry).length")===1,'исправление бесконечно возвращается в очередь');
});
await T('same-day-error-only-downgrades-and-readiness-is-honest',()=>{
  reset(); ev("window.__memoryK=semWords()[0]; memoryEnroll(window.__memoryK); MEMORY_SKILLS.forEach(sk=>memoryRecordSkill(window.__memoryK,sk,3)); window.__memoryES=memoryState().entries[window.__memoryK]; window.__memoryES.days=[addDays(todayStr(),-2),addDays(todayStr(),-1),todayStr()]; MEMORY_SKILLS.forEach(sk=>window.__memoryES.skills[sk].card.S=25)");
  ok(ev("memoryStats().words.solid")===1,'все три навыка должны быть закреплены');
  ev("memoryRecordSkill(window.__memoryK,'pinyin',1)");
  ok(ev("window.__memoryES.skills.py.grade")===1,'ошибка диктанта в тот же день проигнорирована');
  ok(ev("memoryStats().words.solid")===0,'слово с последней ошибкой выдано за закреплённое');
  ok(ev("memoryStats().words.ready")===0,'слово с ошибкой выдано за готовое');
  ev("window.__memoryFailed=JSON.stringify(window.__memoryES.skills.py); memoryRecordSkill(window.__memoryK,'py',3)");
  ok(ev("JSON.stringify(window.__memoryES.skills.py)===window.__memoryFailed"),'повтор после ошибки повысил оценку в тот же день');
});
await T('all-radicals-have-three-skills',()=>{
  reset(); ev("for(let n=1;n<=214;n++) memoryEnroll('r:'+n)");
  ok(ev("Object.keys(memoryState().entries).length")===214,'не все ключи могут учиться в тетради');
  ev("memoryRecordSkill('r:120','writing',3); memoryRecordSkill('r:120','pinyin',3); memoryRecordSkill('r:120','meaning',3)");
  ok(ev("memoryStats().keys.started")===214,'ключи посчитаны как слова');
  ok(!ev("isNew('r:120')"),'три навыка ключа не засчитаны');
  ok(ev("memoryInfo('r:85').hz.includes('氵')"),'нет формы ключа для состава знака');
});
await T('skills-passed-on-different-days-count-as-introduced',()=>{
  reset(); ev("memoryEnroll('你'); const e=memoryState().entries['你']; e.days=[addDays(todayStr(),-3),addDays(todayStr(),-2),addDays(todayStr(),-1)]; e.skills.hz={day:addDays(todayStr(),-2),grade:3,card:FSRS.review({},3,REQ)}; e.skills.ru={day:addDays(todayStr(),-1),grade:3,card:FSRS.review({},3,REQ)}; memoryRecordSkill('你','py',3)");
  ok(!ev("isNew('你')"),'отдельные успешные повторения никогда не засчитались в план');
  ok(ev("D().new")===1,'новое слово посчитано неправильно');
});
await T('synchronous-resume-keeps-latest-study-work',()=>{
  reset(); ev("memoryStart({newOnly:true,kind:'words'}); memoryState().session.studied.push(memoryState().session.keys[0]); Resume.save(); window.__studyKey=memoryState().session.keys[0]; State.meta.memory=null; Resume.restore()");
  ok(ev("memoryState().session.studied.includes(window.__studyKey)"),'последняя работа потеряна до записи IndexedDB');
});
A.finish('memory');
