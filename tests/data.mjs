// Целостность данных: слова уроков, разбор иероглифов, блоки тренировки, проверочные.
import {load} from './env.mjs';
const A=await load(); const {T,ev,ok}=A;
await T('rads-index',()=>ok(ev("RADS.every((r,i)=>r[0]===i+1)")&&ev("RADS.length")===214,'RADS не по порядку'));
await T('lesson-words',()=>{ const n=ev("Object.keys(LESSONS).length"); ok(n===30,'уроков '+n);
  ok(ev("Object.values(LESSONS).every(l=>l.o.every(k=>k in BYK)&&l.x.every(x=>x.o.every(k=>k in BYK)))"),'слово урока не найдено в словаре');
  const nc=ev("COURSE.filter(k=>!isRad(k)).length"); ok(nc===ev("new Set(Object.values(LESSONS).flatMap(l=>l.o.concat(...l.x.map(x=>x.o)))).size"),'слов курса '+nc);
  ok(nc>=750,'слов курса мало: '+nc); });
await T('homographs',()=>{ ok(ev("BYK['还'].p")==='huán'&&ev("BYK['还:hái'].p")==='hái','还'); ok(ev("BYK['行:xíng'].k[0]")===28,'行');
  ok(ev("LESSONS[15].o.includes('还:hái')")&&ev("LESSONS[11].o.includes('还')"),'омографы в уроках'); });
await T('textbook-pinyin',()=>{ for(const [s,p] of [['大夫','dài fu'],['多少','duō shao'],['教','jiāo'],['告诉','gào su'],['东西','dōng xi'],['一起','yì qǐ'],['得','de']]) ok(ev(`BYK['${s}'].p`)===p,s+' → '+ev(`BYK['${s}'].p`)); });
await T('group-words',()=>{ const x=ev("JSON.stringify(LESSONS[16].x.map(x=>[x.id,x.o.length]))"); ok(x==='[["g16",70]]','список группы: '+x);
  ok(ev("WORD_L['女儿']")===16&&ev("EXTRA_OF['女儿']").includes('Список группы'),'女儿 в списке группы'); ok(ev("BYK['姥姥'].p")==='lǎo lao','姥姥');
  ok(ev("LESSONS[17].x[0].o.includes('洗脸')"),'презентация 17'); });
await T('syllables',()=>{ // все слоги слов курса — из таблицы слогов курса
  const bad=ev(`COURSE.filter(k=>!isRad(k)).flatMap(k=>BYK[k].p.split(' ').map(x=>toneless(x)).filter(x=>x&&!PALL[x]&&!(x.endsWith('r')&&PALL[x.slice(0,-1)])).map(x=>k+':'+x)).join(' ')`);
  ok(!bad||bad==='T恤:t','слоги вне таблицы: '+bad); });
await T('palladius',()=>{ ok(ev("palladius('běi jīng')")==='бэй цзин','北京'); ok(ev("palladius('nǎr')")==='нар','эрхуа'); ok(ev("palladius(BYK['什么'].p)")==='шэнь мэ','什么'); });
await T('strokes',()=>{ ok(ev("strokesOf('心').map(x=>x.n).join(',')")==='8,0,7,7','心: '+ev("strokesOf('心').map(x=>x.n).join(',')"));
  ok(ev("strokesOf('皮')[0].n")===9&&ev("strokesOf('又')[0].n")===15,'横钩/横撇'); ok(ev("strokesOf('我')[4].n")===13,'斜钩');
  ok(ev("Object.keys(CHARS).every(c=>strokesOf(c).length===CHARS[c][0])"),'число черт'); });
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
