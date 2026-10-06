
import {JSDOM} from 'jsdom'; import fs from 'fs'; const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8'); 
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.reject(new Error('no-net'));
  w.speechSynthesis={getVoices:()=>[{name:'Ting-Ting',lang:'zh-CN'},{name:'Google 普通话',lang:'zh-CN'}],speak(){},cancel(){},onvoiceschanged:null,addEventListener(){}};
  w.SpeechSynthesisUtterance=function(){}; w.scrollTo=()=>{}; w.requestAnimationFrame=cb=>setTimeout(cb,0); w.URL.createObjectURL=()=>'blob:x';
}});
const w=dom.window;
w.addEventListener('error',e=>errors.push('error: '+(e.error&&e.error.stack||e.message)));
w.addEventListener('unhandledrejection',e=>{if(e.reason&&!/no-net/.test(''+e.reason.message))errors.push('rej: '+(e.reason.stack||e.reason));});
const T=(n,f)=>{try{f();}catch(e){errors.push('['+n+'] '+(e.stack||e));}};
await new Promise(r=>setTimeout(r,150));
const doc=w.document;
const clickText=re=>{const b=[...doc.querySelectorAll('button')].find(x=>re.test(x.textContent));if(b)b.click();return !!b;};

T('home',()=>w.go('home'));
T('study-menu',()=>w.go('study'));
T('scope-hsk',()=>clickText(/^HSK 1$/));
T('scope-due',()=>clickText(/Только повторение/));
T('scope-lesson',()=>{ w.go('study'); // выбрать урок 22 через StudyScope напрямую недоступно — кликнем кнопку номера
  const nums=[...doc.querySelectorAll('details .n')]; if(nums[21]) nums[21].click(); });
T('start-mode-from-study',()=>{ w.go('study'); const row=doc.querySelector('.rowlist .row'); if(row) row.click(); });
for(let i=0;i<4;i++) T('grade-'+i,()=>{ clickText(/Показать|Проверить/); const ch=doc.querySelector('.choice'); if(ch)ch.click(); const g=doc.querySelector('.grade'); if(g)g.click(); });
T('settings',()=>w.go('settings'));
T('toggle-autoplay',()=>{ const segs=[...doc.querySelectorAll('.seg')]; const s=segs.find(x=>/Вкл/.test(x.textContent)); if(s){const b=[...s.querySelectorAll('button')].find(x=>x.textContent==='Вкл'); b&&b.click();} });
T('voice-select',()=>{ const sel=doc.querySelector('select'); if(sel){ sel.value=sel.options[1]?sel.options[1].value:''; sel.dispatchEvent(new w.Event('change')); } });
T('reset-arm',()=>clickText(/^Сброс$/)); // только первый тап (взвод), без подтверждения
T('stats',()=>w.go('stats'));
T('card',()=>w.go('card',{id:5}));
T('draw',()=>w.go('draw',{id:5}));

setTimeout(()=>{ if(errors.length){console.log('❌ ОШИБКИ ('+errors.length+'):');errors.slice(0,15).forEach(e=>console.log('---\n'+e));process.exit(1);} else {console.log('✅ Расширенный смоук-тест пройден (экраны, области, режимы, настройки)');process.exit(0);} },500);
