// Grammar: independent application, exact word order, conservative intervals and durable sessions.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok,doc,click,txt}=A;
const topic={id:'test-grammar',lesson:6,title:'Порядок слов и вопросы',classNote:true,goal:'Применить правило',rule:'Наречие 也 ставится перед сказуемым.',pattern:'П + 也 + сказуемое',caution:'Не добавляй 是 перед прилагательным.',examples:[{zh:'我也很好。',py:'wǒ yě hěn hǎo',ru:'У меня тоже всё хорошо.'}],exercises:[
 {id:'g-choice',type:'choice',prompt:'我___很好。',choices:['也','是','呢'],answer:'也',explanation:'也 — «тоже», перед сказуемым.'},
 {id:'g-order',type:'order',prompt:'Собери: «Я спрашиваю своего друга».',answer:['我','问','我','的','朋友'],explanation:'Два слова 我 занимают разные позиции.'},
 {id:'g-input',type:'input',prompt:'你的生日是___？',answer:'几月几号',alternatives:['几月几日'],explanation:'Спрашиваем месяц и число.'}
]};
ev(`GRAMMAR.topics=${JSON.stringify([topic,{...topic,id:'test-grammar-2',lesson:7,title:'Другая тема',classNote:false,exercises:topic.exercises.map(x=>({...x,id:'b-'+x.id}))}])}; window.__grammarNow=Date.now(); Date.now=()=>window.__grammarNow`);
const reset=()=>ev("State.cards={}; State.meta=freshMeta(); PLAY=null; SESSION=null; go('path')");
const intro=()=>ev("while(grammarState().session.phase==='intro') grammarReadNext()");
const answerCurrent=()=>ev("grammarReveal(grammarAnswerText(grammarState().session.queue[grammarState().session.index].ex)); grammarNext()");
const complete=()=>ev("{ let guard=0; while(!grammarState().session.finished&&guard++<40){ if(grammarState().session.phase==='intro') grammarReadNext(); else { grammarReveal(grammarAnswerText(grammarState().session.queue[grammarState().session.index].ex)); grammarNext(); } } }");
await T('reading-does-not-grant-progress',()=>{
 reset(); ev("go('grammar',{topic:'test-grammar'})"); ok(!ev("grammarTopicDone('test-grammar')"),'opening rule marked it learned');
 ev("startGrammar(['test-grammar'])"); ok(/Закрыть правило/.test(txt()),'missing explanation'); intro();
 ok(!ev("grammarTopicDone('test-grammar')"),'reading alone marked it learned'); ok(!ev("grammarRecord('test-grammar').card"),'reading created a recall card');
});
await T('duplicate-order-tokens-are-distinct',()=>{
 reset(); ev("startGrammar(['test-grammar']); while(grammarState().session.phase==='intro') grammarReadNext(); grammarState().session.index=1; grammarState().session.revealed=false; render()");
 const answer=ev("grammarState().session.queue[1].ex.answer");
 for(const token of answer){ const b=[...doc.querySelectorAll('.grammar-pool button')].find(x=>x.textContent===token&&!x.disabled); ok(b,'missing duplicate token '+token); b.click(); }
 ok(doc.querySelectorAll('.grammar-selected button').length===5,'duplicate words collapsed');
 ok([...doc.querySelectorAll('.grammar-pool button')].every(x=>x.disabled),'not all tokens used independently');
 click(/^Проверить$/); ok(ev("grammarState().session.queue[1].ok"),'correct duplicate-token order rejected');
});
await T('wrong-answer-delayed-correction-does-not-fake-mastery',()=>{
 reset(); ev("startGrammar(['test-grammar'])"); intro();
 ev("grammarReveal('是')"); ok(!ev("grammarState().session.queue[0].ok"),'wrong word accepted');
 ok(ev("grammarState().session.queue.at(-1).retry"),'error not requeued');
 ok(ev("grammarState().session.queue.length")===4,'correction should be bounded'); ev("grammarNext()");
 complete(); ok(ev("grammarState().session.finished"),'round did not finish');
 ok(!ev("grammarTopicDone('test-grammar')"),'shown corrective answer granted independent mastery');
 ok(ev("grammarRecord('test-grammar').card.lapses")===1,'error lost from FSRS');
 ok(ev("grammarRecord('test-grammar').lastGrade")===1,'corrective retry upgraded grade');
 ok(ev("grammarState().session.correct")===2&&ev("grammarState().session.first")===3,'first-attempt statistics include retries');
});
await T('clean-application-and-early-success-do-not-inflate-intervals',()=>{
 reset(); ev("startGrammar(['test-grammar'])"); complete();
 ok(ev("grammarTopicDone('test-grammar')"),'three clean first attempts not completed');
 ok(ev("grammarStats().completed")===1,'wrong completed count');
 ev("window.__grammarBefore=JSON.stringify(grammarRecord('test-grammar').card); startGrammar(['test-grammar'],{restart:true})");
 ok(ev("grammarState().session.phase")==='questions','known topic unnecessarily shows solution first'); complete();
 ok(ev("JSON.stringify(grammarRecord('test-grammar').card)===window.__grammarBefore"),'early success inflated FSRS');
});
await T('immediate-clean-retest-does-not-complete-failed-topic',()=>{
 reset(); ev("startGrammar(['test-grammar'])"); intro(); ev("grammarReveal('wrong'); grammarNext()"); complete();
 ev("startGrammar(['test-grammar'],{restart:true})"); complete();
 ok(!ev("grammarTopicDone('test-grammar')"),'immediate replay after correction faked independent completion');
 ev("startGrammar(['test-grammar'],{restart:true})"); complete();
 ok(!ev("grammarTopicDone('test-grammar')"),'second immediate replay bypassed scheduled-check guard');
 ev("window.__grammarNow+=7*60e3; startGrammar(['test-grammar'],{restart:true})"); complete();
 ok(ev("grammarTopicDone('test-grammar')"),'clean scheduled retrieval did not complete topic');
});
await T('scheduled-error-reappears-in-six-minutes',()=>{
 reset(); ev("startGrammar(['test-grammar'])"); intro(); ev("grammarReveal('wrong'); grammarNext()"); complete();
 ok(ev("grammarDueIds().length")===0,'error due immediately'); ev("window.__grammarNow+=7*60e3");
 ok(ev("grammarDueIds().join(',')")==='test-grammar','same-day six-minute return missing');
 ev("startGrammar(grammarDueIds(),{restart:true})"); complete(); ok(ev("grammarRecord('test-grammar').card.reps")===2,'scheduled review not recorded exactly once');
});
await T('choice-shuffle-is-persisted-and-keeps-answer-valid',()=>{
 reset(); ev("startGrammar(['test-grammar']); window.__choiceOrder=grammarState().session.queue[0].choices.join('|'); window.__choiceSaved=JSON.stringify(grammarState()); State.meta.grammar=JSON.parse(window.__choiceSaved)");
 ok(ev("grammarState().session.queue[0].choices.join('|')===window.__choiceOrder"),'choices reshuffled during resume');
 ok(ev("grammarState().session.queue[0].choices.includes('也')"),'shuffle lost correct option');
});
await T('input-variants-and-punctuation',()=>{
 ok(ev("grammarAnswerOK(grammarTopic('test-grammar').exercises[2],' 几月几日？ ')"),'valid alternate rejected');
 ok(!ev("grammarAnswerOK(grammarTopic('test-grammar').exercises[2],'多少')"),'wrong date question accepted');
 ok(!ev("grammarAnswerOK(grammarTopic('test-grammar').exercises[0],'')"),'empty answer accepted');
});
await T('partial-state-roundtrip-keeps-input-and-order',()=>{
 reset(); ev("startGrammar(['test-grammar'])"); intro();
 ev("grammarState().session.index=2; grammarState().session.queue[2].input='几月'; window.__grammarSaved=JSON.stringify(grammarState()); State.meta.grammar=JSON.parse(window.__grammarSaved); go('grammar',{run:true})");
 ok(doc.querySelector('#screen input')?.value==='几月','typed answer lost after state restoration');
 ok(ev("grammarState().session.index")===2,'position changed after restoration');
});
await T('hub-filters-class-notes-and-lessons',()=>{
 reset(); ev("go('grammar',{home:true,scope:'class'})"); ok(doc.querySelectorAll('#screen .rowlist .row').length===1,'class-notes filter ignored');
 ev("go('grammar',{home:true,lesson:7})"); ok(/Другая тема/.test(txt())&&!/Порядок слов и вопросы/.test(txt()),'lesson filter ignored');
});
await T('class-time-reference',()=>{
 reset(); ev("go('grammar',{home:true})");
 ok(doc.querySelectorAll('.grammar-time-table tbody tr').length===4,'photo time table missing four time units');
 const reference=doc.querySelector('.grammar-time').textContent;
 ok(['去年','今年','明年','上个月','这个月','下个月','上个星期','这个星期','下个星期','昨天','今天','明天'].every(t=>reference.includes(t)),'time reference not complete');
 ok(/2026年十一月三日星期二上午八点/.test(reference),'date order example missing');
});
A.finish('grammar: active application, word-order duplicates, conservative progress, review and resume');
