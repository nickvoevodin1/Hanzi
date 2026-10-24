// Миграция сохранённых данных из прежних версий: числовые ключи, старые настройки (тема, цель goal, урок группы lesson).
import {load} from './env.mjs';
function fakeIDB(store){ return {open(){ const r={}; setTimeout(()=>{ const db={transaction(){ return {objectStore(){ return {
    get(k){ const q={}; setTimeout(()=>{ q.result=store[k]; q.onsuccess&&q.onsuccess(); },0); return q; },
    put(v,k){ const q={}; store[k]=v; setTimeout(()=>q.onsuccess&&q.onsuccess(),0); return q; } }; } }; } };
  r.onsuccess&&r.onsuccess({target:{result:db}}); },0); return r; }}; }
// 1) самый старый формат: числовые ключи, тема, goal
const st1={cards:{'0':{state:1,S:3,D:5,due:0,last:0,reps:1,lapses:0}},settings:{newPerDay:16,theme:'dark',goal:{on:true,date:'2026-09-18',lesson:20},sessionCap:30,req:.95},meta:{day:'2000-01-01',newToday:5,rev:{'2026-10-01':4}}};
const A=await load({before(w){ w.indexedDB=fakeIDB(st1); }});
const {T,ev,ok}=A;
await T('numeric-keys',()=>{ const k=Object.keys(ev("State.cards")); ok(k.length===1&&k[0]===ev("WORDS[0].s"),'ключи: '+k); });
await T('goal-to-semester',()=>{ const s=ev("State.settings.semester"); ok(s&&s.on===true&&s.endDate==='2027-01-31'&&s.targetLesson===30&&s.groupLesson===18&&s.newWordsUntil==='2026-12-28'&&s.keysPerDay===10,'семестр по умолчанию: '+JSON.stringify(s));
  ok(ev("State.settings.goal")===undefined&&ev("State.settings.theme")===undefined,'старые goal/тема остались'); ok(!A.doc.documentElement.dataset.theme,'data-theme');
  ok(ev("State.settings.newPerDay")===16,'newPerDay не сохранился'); ok(st1.settings.semester&&!st1.settings.goal,'миграция не записана в хранилище'); });
await T('cards-kept',()=>{ ok(st1.cards[ev("WORDS[0].s")].reps===1,'карточки потерялись при миграции'); });
await T('new-day',()=>{ ok(ev("D().new")===0&&ev("State.meta.day")===ev("todayStr()"),'новый день не сбросил счётчик'); ok(ev("State.meta.rev['2026-10-01']")===4,'история повторений');
  ok(ev("State.meta.newToday")===undefined,'старый счётчик остался'); });
// 2) v15–v16: урок группы в settings.lesson, счётчики дня в meta
const today=new Date(), ds=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
const st2={cards:{'你':{state:1,S:5,D:5,due:0,last:0,reps:2,lapses:0},'r:9':{state:1,S:2,D:5,due:0,last:0,reps:1,lapses:0}},settings:{newPerDay:10,lesson:21,voiceName:'Ting-Ting'},meta:{day:ds,newToday:4,radToday:2,rev:{[ds]:7}}};
const B=await load({before(w){ w.indexedDB=fakeIDB(st2); }});
await B.T('lesson-to-groupLesson',()=>{ B.ok(B.ev("State.settings.semester.groupLesson")===21,'урок группы → семестр'); B.ok(B.ev("State.settings.voiceName")==='Ting-Ting','голос'); B.ok(B.ev("State.settings.lesson")===undefined,'lesson остался'); });
await B.T('today-counters',()=>{ B.ok(B.ev("D().new")===4&&B.ev("D().keys")===2&&B.ev("D().rv")===7,'счётчики сегодняшнего дня: '+JSON.stringify(B.ev("D()"))); });
await B.T('cards-kept',()=>{ B.ok(B.ev("Object.keys(State.cards).sort().join()")==='r:9,你','карточки'); });
if(B.E.length||B.errors.length) A.E.push(...B.E,...B.errors);
A.finish('migrate: старые ключи, goal → семестр, урок группы, смена дня');
