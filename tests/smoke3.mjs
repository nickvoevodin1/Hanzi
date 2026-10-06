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
T('card-example',()=>{
  const idx=w.eval("WORDS.findIndex(x=>x.s==='花儿')");
  w.eval(`go('card',{id:${idx}})`);
  const t=txt();
  if(!t.includes('Пример')||!t.includes('这束花儿真好看')) throw new Error('пример на карточке не найден');
  if(!t.includes('huār')) throw new Error('эрхуа-пиньинь не найден');
});
T('intro',()=>{ w.eval("State.cards={}; startSession(buildQueue(allIds()).slice(0,3),'choice','t')");
  if(!/Новое слово/.test(txt())) throw new Error('интро не показано');
  clickText(/Проверить себя/);
  if(!doc.querySelector('.choice')) throw new Error('после интро нет вопроса');
  const right=w.eval("meaning(WORDS[SESSION.current])");
  const wrong=[...doc.querySelectorAll('.choice')].find(x=>x.textContent!==right); wrong.click();
});
await new Promise(r=>setTimeout(r,900));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<40 && !/Урок завершён/.test(txt());i++){
  if(clickText(/Проверить себя/)) continue;
  const answered=doc.querySelector('.choice.correct,.choice.wrong');
  const c=doc.querySelector('.choice');
  if(c && !answered){ c.click(); await sleep(1200); continue; }
  const g=doc.querySelector('.grade'); if(g){ g.click(); continue; }
  await sleep(400);
}
T('done',()=>{ const t=txt();
  if(!/Урок завершён/.test(t)) throw new Error('сессия не завершилась');
  if(!/Ошибки этой сессии/.test(t)||!/Повторить ошибки/.test(t)) throw new Error('нет блока ошибок'); });
console.log(E.length?'❌ smoke3: '+E.join(' | '):'✅ smoke3: интро, примеры, разбор ошибок'); process.exit(E.length?1:0);
