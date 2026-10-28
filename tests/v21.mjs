// v21: состав по ключам виден сразу; прописи иероглифов и ключей (FSRS 'wr:'), формы ключей, узлы пути, план дня.
import {load} from './env.mjs'; import fs from 'fs';
const A=await load({writer:true}); const {T,ev,ok,txt,doc,click,sleep}=A;
const HD=JSON.parse(fs.readFileSync(new URL('../hanzi-data.json',import.meta.url),'utf8'));
A.w.HZDATA=HD;
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null; render()");
const learn=ks=>ev(`${JSON.stringify(ks)}.forEach(k=>{ State.cards[k]=FSRS.review({},3,REQ); })`);
// пройти текущее задание прописи: quiz-заглушка → onComplete с нужным числом ошибок
async function finishWrite(mist){ await sleep(30); const q=A.w.__quiz; ok(q,'нет прописи');
  for(let i=0;i<(mist||0);i++) q.onMistake({strokeNum:0});
  q.onComplete({totalMistakes:mist||0}); await sleep(10); }

await T('radw-data',()=>{
  ok(ev("Object.keys(RADW).length")===214,'не у всех 214 ключей есть формы для прописи');
  ok(ev("RADW[9].map(x=>x[0]).join('')")==='人亻','人 и 亻'); ok(ev("RADW[149].map(x=>x[0]).join('')")==='言讠','言 и 讠');
  ok(ev("RADW[85].map(x=>x[0]).join('')")==='水氵','水 и 氵'); ok(ev("RADW[162].map(x=>x[0]).join('')")==='辶','辶 (без 辵)');
  ok(ev("RADW[147].map(x=>x[0]).join('')")==='见','见 (без полной 見)');
  const forms=ev("Object.values(RADW).flat().map(x=>x[0])");
  ok(forms.every(f=>HD[f]&&HD[f].strokes&&HD[f].medians),'нет графики черт: '+forms.filter(f=>!HD[f]).join(''));
  ok(ev("Object.values(RADW).flat().every(([f,c])=>c&&c.length>0)"),'нет порядка черт у формы');
  forms.forEach(f=>ok(ev(`strokesOf('${f}').length`)===HD[f].strokes.length,'число черт '+f));
  ok(ev("strokesOf('讠').map(x=>x.n).join(',')")==='7,21','讠 = точка + №21 (как 话讨许)');
  ok(ev("strokesOf('氵').map(x=>x.n).join(',')")==='7,7,6','氵 = точка, точка, восходящая');
  ok(ev("strokesOf('亻').map(x=>x.n).join(',')")==='4,2','亻 = откидная влево + вертикальная'); });

await T('formula-visible',()=>{ reset();
  ev("playStart(['谢谢'],{title:'t',kind:'learn'})"); ok(ev("PLAY.cur.t")==='intro','нет знакомства');
  const st=doc.querySelector('#screen'); ok(!st.querySelector('details'),'разбор спрятан в «развернуть»');
  const kf=st.querySelector('.kf'); ok(kf,'нет формулы состава');
  ok(/讠/.test(kf.textContent)&&/ключ 149/.test(kf.textContent)&&/射/.test(kf.textContent)&&/фонетик/.test(kf.textContent),'谢 = 讠 (ключ 149) + 射 (фонетик): '+kf.textContent);
  ok(/фоноидеограмма/.test(kf.textContent),'тип'); ok(st.querySelectorAll('.kf').length===1,'谢谢 — один знак');
  ev("PLAY=null; playStart(['老师'],{title:'t',kind:'learn'})"); ok(doc.querySelectorAll('#screen .kf').length===2,'老师 — два знака');
  ev("PLAY=null; go('path')"); });

await T('charbox-no-details',()=>{ ev("openChar('谢')"); const sh=doc.getElementById('sheetc');
  ok(!sh.querySelector('details'),'порядок черт спрятан'); ok(sh.querySelectorAll('.stks .sk').length===12,'полоса черт 谢 (12)');
  ok(sh.querySelectorAll('.stkn li').length===12,'названия черт в шторке'); ev("closeSheet()");
  ev("go('lesson',{L:3,tab:'chars'})"); ok(!doc.querySelector('#screen details'),'в уроке есть «развернуть»'); });

await T('path-write-nodes',()=>{ reset();
  const L1=ev("pathUnits().find(u=>u.id==='L1').nodes.filter(n=>n.type==='write').map(n=>n.items.length)");
  ok(L1.length>=1&&L1.reduce((a,b)=>a+b,0)===ev("LESSON_CHARS[1].length"),'пропись всех знаков урока 1: '+L1);
  const K=ev("pathUnits().find(u=>u.id==='K1').nodes.map(n=>n.type).join(',')");
  ok(/^learn,write,learn,write,learn,write/.test(K),'ключи: узел → пропись: '+K);
  ok(ev("(()=>{ const u=pathUnits().find(u=>u.id==='K1'); return nodeState(u,u.nodes[1],true); })()")==='locked','пропись ключей до их изучения закрыта');
  learn(ev("pathUnits().find(u=>u.id==='K1').nodes[0].items"));
  ok(ev("(()=>{ const u=pathUnits().find(u=>u.id==='K1'); return nodeState(u,u.nodes[1],true); })()")==='avail','после изучения ключей пропись открыта'); });

await T('write-lesson-new',async()=>{ reset();
  learn(ev("lessonKeys(3).slice(0,7)"));
  ok(ev("LESSON_CHARS[3].length")>=4,'в уроке 3 меньше 4 новых знаков');
  ev(`openNode(pathUnits().find(u=>u.id==='L3'),pathUnits().find(u=>u.id==='L3').nodes.find(n=>n.type==='write'),'avail')`);
  ok(ev("State.route.name")==='play'&&ev("PLAY.opts.kind")==='write','урок прописи не начался');
  const ts=ev("[PLAY.cur].concat(PLAY.queue).map(t=>t.t)");
  ok(ts.filter(t=>t==='wintro').length===4&&ts.filter(t=>t==='wtrace').length===4&&ts.filter(t=>t==='wmem').length===4,'4 знака × (знакомство, обвести, по памяти): '+ts);
  ok(ts[0]==='wintro'&&ts[1]==='wtrace','после знакомства — сразу обвести');
  const k0=ev("PLAY.cur.k"), ch=k0.slice(3);
  await sleep(40);
  ok(doc.querySelector('#screen .wintro .kf'),'на знакомстве — состав по ключам'); ok(A.w.__anim>0,'анимация черт'); ok(doc.querySelectorAll('#screen .wstrip .sk').length===HD[ch].strokes.length,'полоса черт');
  ok(/Уже умею писать/.test(txt()),'кнопка «Уже умею»');
  // проходим весь урок: обвести с ошибками, по памяти — первый знак с 5 ошибками (неверно), остальные без
  let guard=0, failed=false;
  while(ev("PLAY&&!PLAY.end")&&guard++<40){
    const t=ev("PLAY.cur&&PLAY.cur.t"); if(!t) break;
    if(t==='wintro'){ click(/^Обвести$/); continue; }
    if(t==='wtrace'){ await finishWrite(2); ev("hideFB(); playNext()"); continue; }
    if(t==='wmem'){ const bad=!failed&&ev("PLAY.cur.k")===k0; if(bad) failed=true; await finishWrite(bad?5:0); ev("hideFB(); playNext()"); continue; }
    ev("hideFB(); playNext()");
  }
  ok(failed,'не дошли до прописи по памяти');
  ok(ev(`State.cards['${k0}'].state`)>0,'карточка прописи не создана');
  ok(ev(`State.cards['${k0}'].lapses||0`)>=0&&ev(`cardOf('${k0}').S`)<ev("Math.max(...Object.keys(State.cards).filter(k=>isWR(k)).map(k=>State.cards[k].S))"),'ошибка по памяти → слабее остальных');
  ok(ev("D().wr")===4,'в плане дня 4 новых прописи: '+ev("D().wr"));
  ok(ev("Object.keys(State.cards).filter(isWR).length")===4,'4 карточки прописи'); });

await T('write-retry-trace',async()=>{ reset(); learn(['你']); ev("State.cards['wr:你']=FSRS.review({},3,REQ); State.cards['wr:你'].due=Date.now()-1");
  ev("playStart(['wr:你'],{title:'t',kind:'write'})"); ok(ev("PLAY.cur.t")==='wmem','повторение — по памяти');
  await sleep(30); ok(/Напиши иероглиф по памяти/.test(txt())&&/nǐ/.test(txt()),'подсказка: пиньинь'); ok(doc.querySelector('#screen .wpad'),'поле прописи');
  click(/Не помню/); ok(doc.getElementById('fb').classList.contains('bad'),'«не помню» — ошибка');
  ev("hideFB(); playNext()"); ok(ev("PLAY.cur.t")==='wtrace'&&ev("PLAY.cur.retry")===1,'после ошибки — обвести по контуру');
  await finishWrite(0); ev("hideFB(); playNext()");
  ok(ev("State.cards['wr:你'].lapses")===1,'оценка «не помню» → lapse'); });

await T('radical-write',async()=>{ reset(); learn(['r:9']);
  ev("playStart(['wr:r:9'],{title:'t',kind:'write'})"); ok(ev("PLAY.cur.t")==='wintro','знакомство с ключом'); await sleep(30);
  ok(doc.querySelectorAll('#screen .wf').length===2&&/в составе знака/.test(txt()),'две формы: 人 и 亻');
  click(/^Обвести$/); await finishWrite(0); await sleep(600);
  ok(A.w.__hw.ch==='亻','вторая форма — 亻: '+A.w.__hw.ch); await finishWrite(0);
  ok(doc.getElementById('fb').classList.contains('ok'),'обвёл обе формы'); ev("hideFB(); PLAY=null; go('path')"); });

await T('day-plan-and-hub',()=>{ reset(); learn(ev("courseKeys(4)"));
  const it=ev("dayPlan().items.find(x=>x.id==='wr')"); ok(it&&it.need===6,'пункт «Прописи — 6» в плане дня');
  ev("go('practice')"); ok(/Прописи иероглифов/.test(txt())&&/Прописи ключей/.test(txt()),'прописи в «Повторении»');
  click(/Прописи иероглифов/); ok(ev("State.route.name")==='play'&&ev("PLAY.opts.kind")==='write','запуск прописей из хаба');
  ok(ev("[PLAY.cur].concat(PLAY.queue).every(t=>t.k&&t.k.startsWith('wr:'))"),'в уроке только прописи');
  ev("PLAY=null; State.cards['wr:你']=FSRS.review({},3,REQ); State.cards['wr:你'].due=Date.now()-1");
  ok(!ev("dueKeys().filter(k=>!isKC(k)&&!isWR(k))").includes('wr:你'),'классические карточки не берут прописи');
  ok(ev("dailyQueue()").includes('wr:你'),'повторения прописей — в Уроке дня');
  ev("go('progress')"); ok(/Прописи: иероглифов/.test(txt()),'прогресс прописей'); });

await T('radical-screen-draw',()=>{ ev("go('radical',{n:149})"); ok(/Пишется:\s*言 · 讠/.test(txt()),'формы ключа для прописи');
  doc.querySelector('#screen [data-draw]').click(); ok(ev("State.route.name")==='draw'&&ev("State.route.chars.join('')")==='言讠','прописи обеих форм');
  ok(doc.querySelectorAll('#screen .wstrip .sk').length===7,'полоса черт 言'); });

await T('lesson-write-button',()=>{ reset(); ev("go('lesson',{L:3})"); click(/Прописи урока/);
  ok(ev("State.route.name")==='play'&&ev("PLAY.opts.kind")==='write'&&ev("[PLAY.cur].concat(PLAY.queue).every(t=>LESSON_CHARS[3].includes(t.k.slice(3)))"),'«Прописи урока» — урок прописи знаков урока');
  ev("PLAY=null; go('path')"); });
await T('resume-write',async()=>{ reset(); learn(['你']);
  ev("playStart(['wr:你'],{title:'Пропись',kind:'write'})"); ev("Resume.save()");
  const raw=A.w.localStorage.getItem('zhu-resume');
  const B=await load({writer:true,before(w){ w.localStorage.setItem('zhu-resume',raw); }}); B.w.HZDATA=HD; await B.sleep(300);
  B.ok(B.ev("State.route.name")==='play'&&B.ev("PLAY.cur.t")==='wintro','урок прописи не восстановился'); });

A.finish('v21: состав по ключам сразу, прописи иероглифов и ключей, формы ключей, путь, план дня');
