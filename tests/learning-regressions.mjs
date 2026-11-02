// Recall and unavailable handwriting must not inflate learning progress.
import fs from 'fs';
import {load} from './env.mjs';
const A=await load({writer:true}); const {T,ev,ok,doc,click,sleep}=A;
const HD=JSON.parse(fs.readFileSync(new URL('../hanzi-data.json',import.meta.url),'utf8'));
const reset=()=>ev("hideFB(); PLAY=null; State.cards={}; State.meta=freshMeta(); go('path')");

await T('tone-aware-pinyin-normalization',()=>{
  const n=s=>ev(`normalizePinyin(${JSON.stringify(s)})`);
  for(const [a,b] of [['nǐ hǎo','ni3hao3'],['lǜ','lv4'],['lǜ','lu:4'],['xiè xie','xie4 xie5'],['ma','ma0']]) ok(n(a)===n(b)&&n(a),`${a} ≠ ${b}`);
  ok(n('nǐ')!==n('nì')&&n('ni')!==n('nǐ'),'тон потерян');
  ok(!n('ni9')&&!n('nǐ4')&&!n('<ni3>'),'невалидный ввод принят');
});

await T('wrong-tone-rejected-and-numbered-tone-accepted',()=>{
  for(const [input,correct] of [['nì',false],['ni3',true]]){
    reset(); ev("playTasks([{t:'pinyin',k:'你'}],{kind:'review'})");
    const inp=doc.querySelector('#screen input'); inp.value=input; inp.dispatchEvent(new A.w.Event('input'));
    click(/^Проверить$/); ok(doc.getElementById('fb').classList.contains(correct?'ok':'bad'),'пиньинь '+input);
  }
});

await T('already-known-needs-retrieval',()=>{
  for(const k of ['你','r:38']){
    reset(); ev(`playStart([${JSON.stringify(k)}],{kind:'learn'})`); click(/Уже знаю/);
    ok(!ev(`State.cards[${JSON.stringify(k)}]`),'карточка создана без проверки');
    ok(['recall','radrecall'].includes(ev('PLAY.cur.t')),'нет проверки по памяти');
    click(/Показать ответ/); click(/Написал верно/);
    ok(ev(`State.cards[${JSON.stringify(k)}].S`)<4,'проверка сразу дала Easy');
  }
});

await T('unavailable-writing-requires-paper-self-check',async()=>{
  reset(); A.w.HZDATA={}; ev("playTasks([{t:'wmem',k:'wr:你'}],{kind:'write'})"); await sleep(40);
  ok(!ev("State.cards['wr:你']"),'нет графики — прогресс вырос');
  ok(click(/Показать образец/),'нет бумажного продолжения');
  ok(!ev("State.cards['wr:你']"),'показ ответа сам засчитал письмо');
  click(/Написал верно на бумаге/); ok(ev("State.cards['wr:你'].state")===1,'ручная сверка не засчиталась');
});

await T('hint-at-three-misses-is-not-independent-recall',async()=>{
  reset(); A.w.HZDATA=HD;
  ev("playTasks([{t:'wmem',k:'wr:你'}],{kind:'write'})"); await sleep(40);
  const q=A.w.__quiz; for(let i=0;i<3;i++) q.onMistake({strokeNum:0}); q.onComplete({totalMistakes:3});
  ok(doc.getElementById('fb').classList.contains('bad'),'подсказка принята за самостоятельное письмо');
  ok(ev("PLAY.queue[0].t")==='wtrace','нет исправления по контуру');
});

await T('detached-writing-callback-does-not-grade-next-task',async()=>{
  reset(); A.w.HZDATA=HD;
  ev("playTasks([{t:'wmem',k:'wr:你'}],{kind:'write'})"); await sleep(40); const old=A.w.__quiz;
  ev("playTasks([{t:'choice',k:'好'}],{kind:'review'})"); old.onComplete({totalMistakes:0});
  ok(!ev("State.cards['好']"),'старое поле засчитало новое задание');
});
await T('classic-pinyin-requires-tone',()=>{
  reset(); ev("State.cards['你']={state:1,S:2,D:5,due:Date.now()-1,last:Date.now()-864e5}; startSession(['你'],'pinyin','test')");
  doc.querySelector('#screen input').value='ni4'; click(/^Проверить$/); click(/Дальше/);
  ok(ev("State.cards['你'].lapses")===1,'classic accepted wrong tone');
});
await T('classic-unavailable-writing-is-not-auto-graded',async()=>{
  reset(); A.w.HZDATA={};
  ev("startSession(['你'],'write','test'); SESSION.intro['你']=1; SESSION.cur='write'; render()");
  await sleep(40);
  ok(!ev("State.cards['你']"),'unavailable classic writing graded itself');
  click(/Показать образец/);
  ok(!/undefined/.test(doc.getElementById('screen').textContent),'fallback shows undefined');
  click(/Написал верно на бумаге/); click(/Дальше/);
  ok(ev("State.cards['你'].state")===1,'paper self-check not graded');
});
A.finish('learning regressions: tones, recall verification, handwriting fallback and hints');
