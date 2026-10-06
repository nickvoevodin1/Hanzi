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
T('rid-coverage',()=>{ const m=w.eval("WORDS.filter(x=>x.rad&&RIDX[x.rad]==null).length"); if(m>0) throw new Error('непокрытых rad: '+m); });
T('keys-tab',()=>{ w.eval("go('browse',{tab:'keys'})"); const n=doc.querySelectorAll('.rowlist .row').length; if(n<80) throw new Error('мало ключей: '+n); if(!/женщина/.test(txt())) throw new Error('нет названия'); });
T('radical-view',()=>{ const i=w.eval("RIDX['女']"); w.eval(`go('radical',{ri:${i}})`); const t=txt();
  if(!/женщина/.test(t)||!/Ключ №38/.test(t)) throw new Error('шапка'); if(w.eval(`radWordIds(${i}).length`)<10) throw new Error('мало слов'); });
T('card-rad-link',()=>{ const i=w.eval("WORDS.findIndex(x=>x.s==='好')"); w.eval(`go('card',{id:${i}})`); const b=doc.querySelector('#radLink'); if(!b) throw new Error('нет ссылки'); b.click(); if(!/Ключ №/.test(txt())) throw new Error('переход'); });
T('draw-char',()=>{ w.eval("go('draw',{char:'女',py:'nǚ',ru:'ключ «женщина»'})"); const t=txt(); if(!/женщина/.test(t)) throw new Error('подпись'); if(/Следующее слово/.test(t)) throw new Error('лишняя кнопка'); });
T('learn-radical',()=>{ const i=w.eval("RIDX['女']"); w.eval(`go('radical',{ri:${i}})`); clickText(/Учить слова с ключом/); if(!/qcard|Проверить себя|Показать/.test(doc.getElementById('screen').innerHTML)) throw new Error('сессия не стартовала'); w.eval("SESSION=null"); });
console.log(E.length?'❌ audit3: '+E.join(' | '):'✅ audit3: ключи — покрытие, вкладка, экран, ссылка, прописи, учёба'); process.exit(E.length?1:0);
