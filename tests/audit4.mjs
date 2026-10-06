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
T('goal-calc',()=>{ const g=w.eval("goalInfo()"); if(!g||g.L!==20) throw new Error('goalInfo'); if(g.total<380||g.total>520) throw new Error('total '+g.total); if(g.perDay<1&&g.phase==='learn') throw new Error('perDay '+g.perDay); });
T('goal-card',()=>{ w.eval("State.settings.goal.date='2099-01-01'; State.cards={}; go('home')"); if(!/Цель · до 20 урока/.test(txt())||!/нужный темп/.test(txt())) throw new Error('нет карточки цели'); });
T('goal-progress',()=>{ w.eval("goalInfo().ids.slice(0,10).forEach(id=>{State.cards[WORDS[id].s]={state:1,S:5,D:5,due:Date.now()+9e7,last:Date.now(),reps:1,lapses:0};})");
  const g=w.eval("goalInfo()"); w.eval("go('home')"); if(!new RegExp(g.learned+' из '+g.total).test(txt())) throw new Error('бар'); });
T('goal-session',()=>{ clickText(/Заниматься к цели/); if(!w.eval("SESSION.queue.concat(SESSION.again).every(id=>WORDS[id].k&&WORDS[id].k.some(l=>l<=20))")) throw new Error('внецелевые слова'); w.eval("SESSION=null"); });
T('consolidation',()=>{ const d=new Date(Date.now()+5*864e5); const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  w.eval(`State.settings.goal.date='${ds}'`); if(w.eval("goalInfo().phase")!=='consolidate') throw new Error('phase'); w.eval("go('home')"); if(!/Фаза закрепления/.test(txt())) throw new Error('подсказка'); });
console.log(E.length?'❌ audit4: '+E.join(' | '):'✅ audit4: цель — расчёт, карточка, прогресс, фокус-сессия, закрепление'); process.exit(E.length?1:0);
