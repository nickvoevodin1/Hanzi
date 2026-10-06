// Миграция сохранённых данных из прежних версий (числовые ключи, старые настройки).
import {load} from './env.mjs';
const A=await load({before(w){
  const store={cards:{'0':{state:1,S:3,D:5,due:0,last:0,reps:1,lapses:0}},settings:{newPerDay:16,theme:'dark',goal:{on:true},sessionCap:30,req:.95},meta:{day:'2000-01-01',newToday:5,rev:{'2026-10-01':4}}};
  w.indexedDB={open(){ const r={}; setTimeout(()=>{ const db={transaction(){ return {objectStore(){ return {
      get(k){ const q={}; setTimeout(()=>{ q.result=store[k]; q.onsuccess&&q.onsuccess(); },0); return q; },
      put(v,k){ const q={}; store[k]=v; setTimeout(()=>q.onsuccess&&q.onsuccess(),0); return q; } }; } }; } };
    r.onsuccess&&r.onsuccess({target:{result:db}}); },0); return r; }};
  w.__store=store; }});
const {T,ev,ok}=A;
await T('numeric-keys',()=>{ const k=Object.keys(ev("State.cards")); ok(k.length===1&&k[0]===ev("WORDS[0].s"),'ключи: '+k); });
await T('settings',()=>{ ok(ev("State.settings.newPerDay")===16,'newPerDay не сохранился'); ok(ev("State.settings.lesson")===18,'урок по умолчанию');
  ok(ev("State.settings.theme")===undefined,'тема осталась'); ok(!A.doc.documentElement.dataset.theme,'data-theme'); });
await T('new-day',()=>{ ok(ev("State.meta.newToday")===0&&ev("State.meta.day")===ev("todayStr()"),'новый день не сбросил счётчик'); ok(ev("State.meta.rev['2026-10-01']")===4,'история повторений'); });
A.finish('migrate: старые ключи, настройки, смена дня');
