import fs from 'node:fs';
import {load} from './env.mjs';
const A=await load({writer:true});const {T,ev,ok,doc}=A;
A.w.HZDATA=JSON.parse(fs.readFileSync(new URL('../hanzi-data.json',import.meta.url),'utf8'));A.w.HZREADY=Promise.resolve(A.w.HZDATA);doc.getElementById('splash')?.remove();
await T('demo-is-beside-sample-with-real-direction-guide',async()=>{
 ev("State.cards={};State.meta=freshMeta();window.__before=JSON.stringify(State.cards);go('notebook',{k:'弟弟',sample:true})");await A.sleep(20);doc.querySelector('[aria-label="Повторить порядок черт"]').click();await A.sleep(30);
 ok(doc.querySelector('.notebook-header .notebook-sample-text .han').textContent==='弟弟','word sample missing');
 ok(doc.querySelector('.notebook-header .notebook-stroke-demo'),'demo not in sample card');
 ok(doc.querySelector('.notebook-stroke-arrow polyline[marker-end]'),'direction arrow missing');
 ok(doc.querySelector('.notebook-stroke-arrow circle'),'start point missing');
 ok(/1\//.test(doc.querySelector('.notebook-stroke-caption').textContent),'stroke order counter missing');
 ok(ev('JSON.stringify(State.cards)===window.__before'),'animation awarded mastery');
});
await T('distinct-character-selection-and-replay',async()=>{
 ev("go('notebook',{k:'汉语',sample:true})");await A.sleep(30);
 const buttons=doc.querySelectorAll('.notebook-stroke-selector button');ok(buttons.length===2,'cannot select characters');buttons[1].click();await A.sleep(30);
 ok(A.w.__hw.ch==='语','selected character did not animate');
 doc.querySelector('[aria-label="Повторить порядок черт"]').click();await A.sleep(30);ok(A.w.__hw.ch==='语','replay switched character');
});
await T('hiding-sample-also-hides-demo',()=>{ev("go('notebook',{k:'弟弟',sample:false})");ok(!doc.querySelector('.notebook-stroke-demo'),'hidden sample still exposes character');});
await T('radical-writing-forms-are-selectable',async()=>{ev("go('notebook',{k:'r:85',sample:true})");await A.sleep(30);ok([...doc.querySelectorAll('.notebook-stroke-selector button')].some(b=>b.textContent==='氵'),'radical form not selectable');});
A.finish('notebook stroke animation: sample position, order, direction, word selection and no false mastery');
