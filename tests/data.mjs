// Целостность данных: слова уроков, разбор иероглифов, блоки тренировки, проверочные.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok}=A;
await T('rads-index',()=>ok(ev("RADS.every((r,i)=>r[0]===i+1)")&&ev("RADS.length")===214,'RADS не по порядку'));
await T('lesson-words',()=>{ const n=ev("Object.keys(LESSONS).length"); ok(n===30,'уроков '+n);
  ok(ev("Object.values(LESSONS).every(l=>l.o.every(s=>s in BYS))"),'слово урока не найдено в словаре');
  ok(ev("COURSE.filter(k=>!isRad(k)).length")===696,'слов курса '+ev("COURSE.filter(k=>!isRad(k)).length")); });
await T('lesson-order',()=>{ const o=ev("LESSONS[17].o.slice(0,4).join(',')"); ok(o==='点,食堂,食,堂','порядок учебника: '+o); });
await T('hanzi-coverage',()=>{
  ok(ev("Object.keys(CHARS).every(c=>HZ.c[c]&&HZ.c[c][0]>=1&&HZ.c[c][0]<=214)"),'нет разбора/ключа у части иероглифов');
  const miss=ev("Object.keys(CHAR_L).filter(c=>!HZ.c[c][6]).join('')"); ok(!miss,'без рус. значения: '+miss); });
await T('hanzi-kangxi',()=>{
  ok(ev("HZ.c['都'][0]")===163&&ev("HZ.c['院'][0]")===170,'阝 справа/слева');
  ok(ev("HZ.c['语'][0]")===149&&ev("HZ.c['语'][1]")==='讠','语 → 讠 №149');
  ok(ev("HZ.c['好'][2]")==='⿰女子','состав 好'); ok(ev("HZ.c['点'][3]")==='p'&&ev("HZ.c['点'][4]")==='灬','点 смысл+звук'); });
await T('radicals-before-word',()=>{
  ok(ev(`COURSE.every((k,i)=>!isRad(k)||COURSE.slice(i+1).some(x=>!isRad(x)&&hanOf(x).some(c=>radOf(c)===radNum(k))))`),'ключ без последующего слова');
  ok(ev(`COURSE.filter(k=>!isRad(k)).every(s=>hanOf(s).every(c=>{ const i=COURSE.indexOf('r:'+radOf(c)); return i>=0&&i<COURSE.indexOf(s); }))`),'ключ после слова'); });
await T('drill-units',()=>{
  ok(ev("Object.values(LESSONS).every(l=>l.b.length>0)"),'урок без блоков');
  const bad=ev(`Object.entries(LESSONS).flatMap(([L,l])=>l.b.flatMap(b=>b.u.filter(u=>u.sy&&u.sy.split(' ').length!==hanOf(u.zh).length).map(u=>L+':'+u.zh))).join(' ')`);
  ok(!bad,'слоги не совпадают: '+bad);
  const tl=ev(`Object.values(LESSONS).flatMap(l=>l.b.flatMap(b=>b.tl.filter(t=>t.seg.join('')!==b.u.map(u=>hanOf(u.zh).join('')).find(z=>z===t.seg.join(''))))).length`);
  ok(tl===0,'плитки не совпадают с предложением: '+tl); });
await T('drill-lexicon',()=>{   // примеры урока — только иероглифы уроков ≤ L
  const bad=ev(`Object.entries(LESSONS).flatMap(([L,l])=>l.b.flatMap(b=>b.u.flatMap(u=>hanOf(u.zh).filter(c=>!CHAR_L[c]||CHAR_L[c]>+L).map(c=>L+c)))).join(' ')`);
  ok(!bad,'непройденные иероглифы: '+bad); });
await T('neutral-tones',()=>{ const u=ev(`LESSONS[18].b.flatMap(b=>b.u).find(u=>u.zh.includes('休息')).sy`); ok(/xiū xi /.test(u),'休息 → xiū xi: '+u); });
await T('real-test',()=>{ const t=ev("JSON.stringify(TESTS.map(t=>[t.id,t.kind,t.lesson,t.blocks.length,t.blocks.reduce((a,b)=>a+b.u.length,0)]))");
  ok(t==='[["pr18","проверочная",18,13,24]]','pr18: '+t);
  ok(ev("TESTS.every(t=>t.blocks.every(b=>b.u.every(u=>u.sy.split(' ').length===hanOf(u.zh).length)))"),'тоны pr18');
  ok(ev("TESTS.every(t=>t.blocks.every(b=>b.tl.every(x=>hanOf(b.u.map(u=>u.zh).join('')).join('').includes(x.seg.join('')))))"),'плитки pr18'); });
await T('local-date',()=>ok(ev("dstr(new Date(2026,0,5))")==='2026-01-05','dstr'));
await T('pinyin-fixes',()=>{ ok(ev("BYS['便宜'].p")==='pián yi','便宜'); ok(ev("BYS['重点'].p")==='zhòng diǎn','重点'); ok(ev("WORDS.some(w=>w.d==='接(电话)')"),'помета 接(电话)'); });
A.finish('data: уроки, разбор иероглифов, ключи Канси, блоки тренировки, проверочная 18');
