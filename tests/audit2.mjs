import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.reject(new Error("no-net"));
  w.speechSynthesis={getVoices:()=>[{name:"Ting-Ting",lang:"zh-CN"}],speak(){},cancel(){},onvoiceschanged:null,addEventListener(){}};
  w.SpeechSynthesisUtterance=function(){}; w.scrollTo=()=>{}; w.requestAnimationFrame=cb=>setTimeout(cb,0);
}});
const w=dom.window; await new Promise(r=>setTimeout(r,180)); const doc=w.document; const E=[];
const txt=()=>doc.getElementById("screen").textContent;
const T=(n,f)=>{try{f();}catch(e){E.push("["+n+"] "+(e.message||e));}};
const clickText=re=>{const b=[...doc.querySelectorAll("button")].find(x=>re.test(x.textContent));if(b)b.click();return b;};
T('migration',()=>{
  w.eval("State.cards={'5':{state:1,S:3,D:5,due:Date.now()+9e7,last:Date.now(),reps:1,lapses:0}}");
  w.eval(`(function(){const ks=Object.keys(State.cards);if(ks.length&&ks.every(k=>/^\\d+$/.test(k))){const nc={};ks.forEach(k=>{const x=WORDS[+k];if(x)nc[x.s]=State.cards[k];});State.cards=nc;}})()`);
  if(!/^[\u4e00-\u9fff]/.test(w.eval("Object.keys(State.cards)[0]"))) throw new Error('ключ не иероглиф');
  w.eval("State.cards={}"); });
T('smart-order',()=>{ const f=w.eval("WORDS[buildQueue(allIds())[0]]"); if(!(f.k&&f.k.includes(1))) throw new Error('первым не урок 1: '+f.s); });
T('session-cap',()=>{ w.eval("State.settings.sessionCap=5"); const n=w.eval("buildQueue(allIds()).length"); w.eval("State.settings.sessionCap=20"); if(n>5) throw new Error('cap: '+n); });
T('undo',()=>{
  w.eval("State.cards={}; State.meta.newToday=0; startSession(buildQueue(allIds()).slice(0,3),'recog','t')");
  clickText(/Проверить себя/); clickText(/Показать/); doc.querySelector('.grade').click();
  if(w.eval("SESSION.done")!==1||w.eval("State.meta.newToday")!==1) throw new Error('оценка не засчитана');
  if(!clickText(/Отменить/)) throw new Error('нет кнопки отмены');
  if(w.eval("SESSION.done")!==0||w.eval("State.meta.newToday")!==0||w.eval("Object.keys(State.cards).length")!==0) throw new Error('undo не откатил'); });
T('keyboard',()=>{ const fire=k=>{const e=new w.KeyboardEvent('keydown',{key:k,bubbles:true}); if(doc.onkeydown)doc.onkeydown(e);};
  fire(' '); fire(' '); if(!doc.querySelectorAll('.grade').length) throw new Error('Space не показал ответ');
  fire('3'); if(w.eval("SESSION.done")!==1) throw new Error('клавиша 3 не оценила'); });
T('recall',()=>{ w.eval("SESSION=null; startSession(buildQueue(allIds()).slice(0,2),'recall','t')"); clickText(/Проверить себя/); if(!/Вспомни слово/.test(txt())) throw new Error('recall'); });
T('typehz',()=>{ w.eval("SESSION=null; startSession(buildQueue(allIds()).slice(0,2),'typehz','t')"); clickText(/Проверить себя/); if(!doc.querySelector('input.tinput')) throw new Error('typehz'); });
T('home-extras',()=>{ w.eval("SESSION=null; go('home')"); const t=txt(); if(!/Слово дня/.test(t)||!/сегодня: /.test(t)) throw new Error('нет слова дня/сводки'); });
console.log(E.length?'❌ audit2: '+E.join(' | '):'✅ audit2: миграция, порядок, лимит, undo, клавиатура, режимы, главная'); process.exit(E.length?1:0);
