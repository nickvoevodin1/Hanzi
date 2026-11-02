import {load} from './env.mjs';
const {ev,T,ok,finish,doc,click}=await load();
await T('presets have precise lesson and Kangxi membership',()=>{
  ok(ev(`dictationItems(DICTATION_PRESETS[0]).every(x=>lessonWords(18).some(w=>w.key===x.id)||lessonExtras(18).some(e=>e.words.some(w=>w.key===x.id)))`),'lesson18 includes outsiders');
  ok(ev(`dictationItems(DICTATION_PRESETS[1]).every(x=>lessonWords(19).some(w=>w.key===x.id)||lessonExtras(19).some(e=>e.words.some(w=>w.key===x.id)))`),'lesson19 includes outsiders');
  ok(ev(`dictationItems(DICTATION_PRESETS[2]).length===uniq([18,19].flatMap(L=>lessonWords(L).concat(lessonExtras(L).flatMap(e=>e.words))).map(w=>w.key)).length`),'lesson18+19 missing words');
  for(const n of [40,115]){
    ok(ev(`JSON.stringify(dictationItems({kind:'radicals',from:1,to:${n}}).map(x=>x.id))===JSON.stringify(Array.from({length:${n}},(_,i)=>'r:'+(i+1)))`),'radical range must be numeric and exact');
  }
});
await T('pinyin compares tones and accepts equivalent numbered spelling',()=>{
  for(const [typed,answer,want] of [['ni3 hao3','nǐ hǎo',true],['ni2 hao3','nǐ hǎo',false],['ni hao','nǐ hǎo',false],['lv4','lǜ',true],['lu:4','lǜ',true],['ma','ma',true],['','',false],['123','123',false]]){
    ok(ev(`dictationPinyinOK(${JSON.stringify(typed)},${JSON.stringify(answer)})`)===want,'pinyin: '+typed+' vs '+answer);
  }
});
await T('mistakes repeat; revealed hints cannot permanently block learning',()=>{
  ev(`dictationStart({kind:'radicals',from:37,to:44,count:8});`);
  ok(ev(`dictationStore().active.items.length`)===8,'8 selected');
  ok(ev(`dictationStore().active.items.every(x=>radNum(x.id)>=37&&radNum(x.id)<=44)`),'range leaked');
  ev(`dictationStore().active.open=true;dictationStore().active.q[0].gaveUp=true;dictationAnswer(false);`);
  ok(ev(`dictationStore().active.q.length`)===24,'mistake should remain in queue');
  ok(ev(`dictationStore().active.q[4].tries===1&&!dictationStore().active.q[4].gaveUp`),'retry must clear hint and allow independent response');
  ok(ev(`dictationStore().active.ok`)===0,'mistake counts as correct');
  ev(`while(!dictationStore().active.finished){dictationStore().active.open=true;dictationAnswer(true);}`);
  ok(ev(`dictationStore().active.ok`)===23,'first-attempt accuracy changed by retries');
  ok(ev(`dictationStore().active.done`)===24,'all three skills not checked');
  ok(ev(`memoryState().entries[dictationStore().active.errors[0]].skills.hz.grade`)===1,'retry must not erase first writing failure');
  ok(ev(`dictationStore().history[0].errors.length`)===1,'missed error record');
  ok(ev(`Object.keys(dictationStore().records).length`)===24,'skill records not independent');
  const failedId=ev(`dictationStore().active.errors[0]`);
  ok(ev(`dictationStore().records[${JSON.stringify(failedId+'|write')}].ok`)===false,'immediate correction erased independent failure');
  ok(ev(`dictationStore().records[${JSON.stringify(failedId+'|write')}].corrected`)===true,'correction not recorded separately');
  ev(`dictationStart({kind:'radicals',from:37,to:44,count:4})`);
  ok(ev(`dictationStore().active.items[0].id`)===failedId,'mistaken key not prioritized in next round');
  ev(`while(!dictationStore().active.finished){dictationStore().active.open=true;dictationAnswer(true);}`);
  ok(ev(`dictationStore().records[${JSON.stringify(failedId+'|write')}].ok`)===true,'independent later recall did not update result');
});
await T('unfinished input survives render and setup accessible',()=>{
  ev(`dictationStart({kind:'lessons',lessons:[18],count:4});dictationStore().active.q=[dictationStore().active.q.find(x=>x.field==='pinyin')];render();`);
  const input=doc.querySelector('#screen input'); ok(input,'pinyin input missing');
  input.value='ni3'; input.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
  ev(`render()`);
  ok(doc.querySelector('#screen input').value==='ni3','input lost on render');
  ev(`go('dictation')`);
  ok(!!doc.querySelector('form'),'custom selection missing');
  const form=doc.querySelector('form'); form.elements.lessons.value='18-19';
  form.dispatchEvent(new doc.defaultView.Event('submit',{bubbles:true,cancelable:true}));
  ok(ev(`dictationStore().active.config.lessons.join(',')`)==='18,19','custom range parse wrong');
});
await T('single-tap dot is drawn and survives restoration',()=>{
  ev(`window.CanvasRenderingContext2D=function(){}; window.__dotCount=0;
    HTMLCanvasElement.prototype.getContext=function(){return {lineWidth:4,strokeStyle:'#4b4b4b',beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){window.__dotCount++},fill(){},clearRect(){}}};
    window.__inkHost=el('div'); document.getElementById('screen').appendChild(window.__inkHost);
    window.__inkTask={}; dictationInk(window.__inkHost,window.__inkTask);
    window.__inkCanvas=window.__inkHost.querySelector('canvas');
    window.__inkCanvas.getBoundingClientRect=()=>({left:0,top:0,width:600,height:270});
    window.__inkCanvas.setPointerCapture=()=>{};
    window.__inkCanvas.onpointerdown({preventDefault(){},pointerId:1,clientX:10,clientY:20});
    window.__inkCanvas.onpointerup();`);
  ok(ev(`window.__dotCount`)===1,'single dot never drawn');
  ok(ev(`JSON.stringify(window.__inkTask.ink)`)==='[[[10,20]]]','dot not persisted');
  ev(`dictationInk(window.__inkHost,JSON.parse(JSON.stringify(window.__inkTask)),true)`);
  ok(ev(`window.__dotCount`)===2,'restored single dot invisible');
});
finish('Dictation');
