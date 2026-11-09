import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../src/data/'+n+'.json',import.meta.url),'utf8'));
const topics=read('grammar-early').topics.concat(read('grammar-late').topics), sources=new Set(read('grammar-sources').map(x=>x.id)), ids=new Set(), exercises=new Set();
const norm=s=>String(s).replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()]/gu,'').toLowerCase();
for(const t of topics){
 assert(t.id&&!ids.has(t.id),'duplicate/missing topic '+t.id);ids.add(t.id);
 assert(Number.isInteger(t.lesson)&&t.lesson>=1&&t.lesson<=30,'lesson '+t.id);
 for(const key of ['title','goal','rule','pattern']) assert(t[key]&&String(t[key]).trim(),key+' '+t.id);
 assert(t.examples?.length>=1&&t.examples.every(e=>e.zh&&e.py&&e.ru),'examples '+t.id);
 assert(t.sourceIds?.length&&t.sourceIds.every(s=>sources.has(s)),'sources '+t.id);
 assert(t.exercises?.length>=3,'not enough independent exercises '+t.id);
 for(const e of t.exercises){
  assert(e.id&&!exercises.has(e.id),'exercise id '+e.id);exercises.add(e.id);
  assert(e.prompt&&e.explanation&&['choice','order','input'].includes(e.type),'exercise '+e.id);
  assert(norm(Array.isArray(e.answer)?e.answer.join(''):e.answer||''),'empty answer '+e.id);
  if(e.type==='choice'){assert(e.choices.length>=2&&e.choices.some(x=>norm(x)===norm(e.answer)),'missing correct option '+e.id);assert(new Set(e.choices.map(norm)).size===e.choices.length,'equivalent duplicate options '+e.id);}
  if(e.type==='order'){assert(Array.isArray(e.answer)&&e.answer.length>=2,'order '+e.id);if(e.tokens){const pool=e.tokens.slice();for(const word of e.answer){const i=pool.indexOf(word);assert(i>=0,'missing token '+e.id);pool.splice(i,1);}}}
 }
}
assert.equal(new Set(topics.map(t=>t.lesson)).size,30,'every lesson must have a verified topic or labeled practice bridge');
assert(topics.filter(t=>t.lesson===1).every(t=>t.kind==='bridge'),'phonetic lesson1 misrepresented as formal grammar');
const content=JSON.stringify(topics);
for(const term of ['也','都','不太好','哪','谁','什么','在','去','来','的','地','得','一下','跟','和','给','从','生日','以后','多少','吗','呢','了']) assert(content.includes(term),'missing class-note model '+term);
const classroom=read('classroom');assert.equal(Object.keys(classroom.lessons).length,30);
for(let L=1;L<=30;L++){const t=classroom.lessons[L];assert(t.origin==='original'&&t.dialogue.length>=2&&t.dialogue.every(e=>e.zh&&e.py&&e.ru),'dialogue '+L);assert(t.listening.segments.length>=2&&t.listening.segments.every(e=>e.zh&&e.py&&e.ru),'listening '+L);}
console.log('PASS grammar data: '+topics.length+' topics, '+exercises.size+' exercises,30 lessons and original classroom materials');
