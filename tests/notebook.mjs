// Digital ink and paper records must never masquerade as learned vocabulary.
import fs from 'fs';
import {load} from './env.mjs';
const A=await load({before(w){
  w.CanvasRenderingContext2D=function(){};
  w.HTMLCanvasElement.prototype.getContext=()=>Object.fromEntries(['save','restore','clearRect','strokeRect','setLineDash','beginPath','moveTo','lineTo','stroke','arc','fill'].map(k=>[k,()=>{}]));
}});
const {T,ev,ok,doc}=A;
if(ev("typeof notebookMark")!=='function')A.w.eval(fs.readFileSync(new URL('../src/js/35-notebook.js',import.meta.url),'utf8'));
ev("window.__nbDay=todayStr(); window.__nbOriginalToday=todayStr; todayStr=()=>window.__nbDay");
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); window.__nbDay='2026-11-09'; State.route={name:'path'}");
const next=()=>ev("window.__nbDay=addDays(window.__nbDay,1)");
await T('preview-creates-no-progress-and-only-paper-records',()=>{
  reset();ev("document.getElementById('screen').replaceChildren(notebookPanel('你',{skill:'hz',compact:true,showSample:false}))");
  ok(ev("Object.keys(memoryState().entries).length")===0,'preview enrolled unseen words');
  ok(!doc.querySelector('.notebook-panel .han'),'hidden answer leaked into practice panel');
  ok([...doc.querySelectorAll('.notebook-panel button')].some(b=>b.textContent==='Прописал'),'exact paper button absent');
  ev("window.__nbCards=JSON.stringify(State.cards); window.__nbDaily=JSON.stringify(State.meta.daily); notebookMark('你','hz','paper')");
  ok(ev("notebookData('你',false).days[0].hz.done"),'paper practice not saved');
  ok(ev("notebookData('你',false).days[0].hz.source")==='paper','paper and screen not distinguished');
  ok(ev("JSON.stringify(State.cards)===window.__nbCards"),'paper button altered FSRS');
  ok(ev("JSON.stringify(State.meta.daily)===window.__nbDaily"),'paper button awarded quiz accuracy or XP');
  ok(ev("Object.keys(memoryState().entries['你'].skills).length")===0,'writing record granted knowledge facets');
  ok(ev("memoryState().entries['你'].days.length")===0,'writing record changed memory practice days');
  ok(ev("notebookStatus('你').active")===0,'pinyin row skipped');
});
await T('three-real-days-and-independent-pinyin-row',()=>{
  reset();ev("notebookMark('你','hz','paper'); notebookMark('你','py','paper')");
  ok(ev("notebookStatus('你').complete")===1,'first pair incomplete');
  ok(ev("notebookStatus('你').active")===null,'second day opened immediately');
  ok(!ev("notebookMark('你','hz','paper')"),'same-day mark filled day2');
  next();ok(ev("notebookStatus('你').active")===1,'day2 did not unlock tomorrow');
  ev("notebookMark('你','hz','paper'); notebookMark('你','py','paper')");
  ok(ev("notebookStatus('你').active")===null,'day3 opened same day as day2');
  next();ev("notebookMark('你','hz','paper'); notebookMark('你','py','paper')");
  ok(ev("notebookStatus('你').finished"),'three actual study days not completed');
  ok(ev("Object.keys(State.cards).length")===0,'three writing days auto-claimed mastery');
});
await T('missed-day-catchup-does-not-fill-several-days',()=>{
  reset();ev("notebookMark('你','hz','paper'); notebookMark('你','py','paper')");next();ev("notebookMark('你','hz','paper'); window.__nbDay='2026-11-16'; notebookMark('你','py','paper')");
  ok(ev("notebookStatus('你').complete")===2,'catchup did not finish pending pinyin');
  ok(ev("notebookStatus('你').active")===null,'catchup allowed two rows on one calendar day');
  next();ok(ev("notebookStatus('你').active")===2,'remaining third row lost');
});
await T('screen-ink-persists-with-pointer-input-and-dot-strokes',()=>{
  reset();ev("document.getElementById('screen').replaceChildren(notebookPanel('你',{skill:'hz',compact:true,showSample:false}))");
  const canvas=doc.querySelector('.notebook-canvas');
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:300,height:100});
  const pointer=(type,x,y)=>{const e=new A.w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{clientX:{value:x},clientY:{value:y},pointerId:{value:1},button:{value:0}});canvas.dispatchEvent(e);};
  pointer('pointerdown',45,25);pointer('pointermove',130,60);pointer('pointerup',130,60);
  ok(ev("notebookHasInk('你','hz',0)"),'drawn ink not stored');
  ok(!ev("notebookHasInk('你','py',0)"),'pinyin and hanzi ink mixed');
  pointer('pointerdown',100,40);pointer('pointerup',100,40);
  ok(ev("notebookData('你',false).days[0].hz.ink[1].length")===1,'single tap dot discarded');
  ev("window.__nbInk=JSON.stringify(notebookData('你',false)); State.meta.memory=JSON.parse(JSON.stringify(memoryState()))");
  ok(ev("JSON.stringify(notebookData('你',false))===window.__nbInk"),'saved ink changed on reload');
  ok(ev("notebookMark('你','hz','screen')"),'real screen ink could not be recorded');
  ok(ev("notebookData('你',false).days[0].hz.source")==='screen','screen source not recorded');
});
await T('empty-screen-cannot-be-marked-as-written',()=>{
  reset();ok(!ev("notebookMark('你','hz','screen')"),'empty screen counted as written');
  ok(ev("Object.keys(memoryState().entries).length")===0,'invalid screen mark created progress');
});
await T('radical-forms-characters-and-word-pools',()=>{
  reset();ok(ev("notebookInfo('r:85').hz.includes('氵')"),'radical variant absent');
  ok(ev("notebookKey('wr:r:85')")==='r:85','writing card radical could not be opened');
  ok(ev("notebookKey('语')")!=null,'single course character unavailable');
  ev("State.route={name:'notebook',scope:'keys',k:'r:85'}; document.getElementById('screen').replaceChildren(); viewNotebook(document.getElementById('screen'))");
  ok(doc.querySelectorAll('.notebook-day').length===3,'three actual day sheets absent');
  ok(doc.querySelectorAll('.notebook-canvas').length===6,'separate character/pinyin lines absent');
  ok(ev("Object.keys(memoryState().entries).length")===0,'selector enrolled all radicals');
});
await T('hide-sample-also-hides-selected-word-label',()=>{
  reset();ev("State.route={name:'notebook',k:'你',lesson:1,sample:false}; document.getElementById('screen').replaceChildren(); viewNotebook(document.getElementById('screen'))");
  ok(!doc.querySelector('.notebook-header .han'),'hidden full-view sample leaked');
  const select=doc.querySelector('select[aria-label="Что прописывать"]');
  ok(!select.selectedOptions[0].textContent.includes('你'),'selected option disclosed hidden character');
});
await T('direct-word-opens-its-own-lesson',()=>{
  ev("go('notebook',{k:'你'})");
  ok(doc.querySelector('[aria-label="Урок прописей"]').value==='1','direct word used class lesson instead of its own lesson');
});
A.finish('notebook: paper button, real3day rows, persistent ink and no false mastery');
