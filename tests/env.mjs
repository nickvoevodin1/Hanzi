// Общая обвязка jsdom для тестов: загружает собранный index.html без сети.
import {JSDOM} from 'jsdom'; import fs from 'fs';
export async function load(opts={}){
  const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/hanzi/',beforeParse(w){
    w.fetch=()=>Promise.reject(new Error('no-net'));
    w.speechSynthesis={getVoices:()=>[{name:'Ting-Ting',lang:'zh-CN'},{name:'Google 普通话',lang:'zh-CN'}],speak(){},cancel(){},onvoiceschanged:null,addEventListener(){}};
    w.SpeechSynthesisUtterance=function(){}; w.scrollTo=()=>{}; w.requestAnimationFrame=cb=>setTimeout(cb,0);
    if(opts.writer) w.HanziWriter={create(id,ch,o){ const inst={quiz(q){ inst.q=q; w.__quiz=q; }, animateCharacter(){}}; return inst; }};
    if(opts.before) opts.before(w);
  }});
  const w=dom.window;
  w.addEventListener('error',e=>errors.push('error: '+(e.error&&e.error.stack||e.message)));
  w.addEventListener('unhandledrejection',e=>{ if(e.reason&&!/no-net/.test(''+(e.reason.message||e.reason))) errors.push('rej: '+(e.reason.stack||e.reason)); });
  await new Promise(r=>setTimeout(r,200));
  const doc=w.document;
  const E=[];
  const api={w,doc,E,errors,
    txt:()=>doc.getElementById('screen').textContent,
    T:async(n,f)=>{ try{ await f(); }catch(e){ E.push('['+n+'] '+(e.message||e)); } },
    click:re=>{ const b=[...doc.querySelectorAll('#screen button, #sheet button')].find(x=>re.test(x.textContent)&&!x.disabled); if(b) b.click(); return b; },
    key:k=>doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true})),
    ev:s=>w.eval(s),
    sleep:ms=>new Promise(r=>setTimeout(r,ms)),
    ok:(c,m)=>{ if(!c) throw new Error(m); },
    finish(name){ const all=E.concat(errors); if(all.length){ console.log('❌ '+name+' ('+all.length+'):'); all.slice(0,20).forEach(e=>console.log('  - '+e)); process.exit(1); } console.log('✅ '+name); process.exit(0); }
  };
  return api;
}
