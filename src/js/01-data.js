/*==================================================================
  ДАННЫЕ (встраиваются сборкой tools/build.py)
==================================================================*/
const DB_RAW = /*__DATA__*/;        // слова и иероглифы (черты, состав)
const HZ = /*__HANZI__*/;           // разбор: HZ.c[знак]=[№ключа,форма,состав,тип,смысл,звук,рус.,пиньинь,№в др.словарях,англ.?], HZ.p[компонент]=[пиньинь,рус.]
const LESSONS = /*__LESSONS__*/;    // уроки 1–30: t название, sub, o порядок слов, b блоки тренировки
const TESTS = /*__TESTS__*/;        // настоящие проверочные / диктанты / контрольные
const RADS = /*__RADS__*/;          // 214 ключей: [номер, черт, пиньинь, рус. название (таблица ДВФУ), формы]
const PALL = /*__PALL__*/;          // система Палладия (таблица курса): слог без тона → кириллица
const RAD2 = /*__RAD2__*/;          // пособие Петросяна (по Канси): №ключа → {m значение, s упрощ., e пример, ep пиньинь, er перевод}
const EVO = '子牛马鱼羊鹿虎象龟步日月山水火雨从车采为';   // таблица «Эволюция графических стилей» (материал курса)
// Черты по таблице курса (24 черты). Ключ — код порядка черт (cnchar, уточнённый по форме черты).
const STROKE_TABLE = [
  ['Основные черты',[[1,'горизонтальная','二五百'],[2,'вертикальная','千士巾'],[3,'откидная вправо','欠又文'],[4,'откидная влево','成石九'],
    [5,'наклонная пересекающаяся','戈戰戒'],[6,'восходящая','冰決波'],[7,'точка вправо','六玉交'],[8,'точка влево','心小亦']]],
  ['Черты с крюком',[[9,'горизонтальная с крюком вниз','皮軍罕'],[10,'вертикальная с крюком влево','水月則'],[11,'вертикальная с крюком вправо','艮衣長'],
    [12,'вертикальная изогнутая с крюком вверх','也巳兒'],[13,'наклонная пересекающаяся','民划戎']]],
  ['Ломаные черты',[[14,'горизонтальная ломаная с вертикальной','口日田'],[15,'горизонтальная ломаная с откидной влево','又久夕'],
    [16,'трижды ломанная с откидной влево','建延廷'],[17,'вертикальная ломаная с горизонтальной','山世凶'],
    [18,'откидная влево ломаная с горизонтальной','厶紅允'],[19,'откидная влево ломаная с откидной вправо','女好妥']]],
  ['Ломаные черты с крюком',[[20,'горизонтальная ломаная с вертикальной и крюком влево','刁力那'],[21,'горизонтальная ломаная с вертикальной и крюком вправо','话讨许'],
    [22,'горизонтальная трижды ломаная с вертикальной и крюком влево','乃鼎汤'],[23,'горизонтальная ломаная с откидной вправо и крюком вверх','汽九肌'],
    [24,'вертикальная дважды ломаная с крюком влево','朽馬与']]],
];
const STROKE_NO = {j:1,f:2,l:3,s:4,i:6,k:7,d:8,E:9,g:10,h:11,u:12,y:13,c:14,e:15,a:16,b:17,n:18,m:19,r:20,p:21,w:22,o:23,z:24};
const STROKE_EXTRA = {Y:'лежачая с крюком (卧钩, как в 心)',t:'изогнутая с крюком (弯钩, как в 子)',v:'горизонтальная дважды ломаная (横折折 / 横折弯)',
  x:'вертикальная дважды ломаная (竖折撇 / 竖折折)',q:'горизонтальная трижды ломаная (横折折折)'};   // нет в таблице курса
const STROKE_NAME = {}; STROKE_TABLE.forEach(([,rows])=>rows.forEach(([n,name])=>{ STROKE_NAME[n]=name; }));
function strokesOf(ch){ const h=HZ.c[ch]; return h&&h[10] ? [...h[10]].map(c=>STROKE_NO[c]?{n:STROKE_NO[c],name:STROKE_NAME[STROKE_NO[c]]}:{n:0,name:STROKE_EXTRA[c]||'черта'}) : []; }
function strokeImg(n,h){ return n?`<img class="sti" src="strokes/${String(n).padStart(2,'0')}.png" alt="" style="height:${h||20}px">`:''; }
// Палладий по таблице курса; слоги через пробел, эрхуа (nǎr) — с «р» на конце
function palladius(p){
  const out=[];
  for(const tok of (p||'').trim().split(/\s+/)){
    let t=toneless(tok); if(!t) continue;
    let er=''; if(t.length>2&&t.endsWith('r')&&!PALL[t]&&PALL[t.slice(0,-1)]){ t=t.slice(0,-1); er='р'; }
    const c=PALL[t]; if(!c) return '';
    out.push(c.toLowerCase()+er);
  }
  return out.join(' ');
}

const WORDS = DB_RAW.words;
const CHARS = DB_RAW.chars;
WORDS.forEach((w,i)=>{ w.id=i; w.key=w.key||w.s; });   // ключ карточки: иероглифы; у омографов — «还:hái»
const BYS = {};                     // иероглифы слова → первое слово с ними
WORDS.forEach(w=>{ if(!(w.s in BYS)) BYS[w.s]=w; });
const BYK = {};                     // ключ карточки → слово
WORDS.forEach(w=>{ BYK[w.key]=w; });
const NL = 30;                      // уроков в томе 1
const RIDX = {};                    // форма ключа → индекс в RADS
RADS.forEach((r,i)=>{ for(const ch of r[4]) if(!(ch in RIDX)) RIDX[ch]=i; });
{ const A={'丷':'八','⺊':'卜','母':'毋','㔾':'卩','乛':'乙','⺀':'冫','民':'氏','旡':'无','虎':'虍'};
  for(const k in A) if(RIDX[A[k]]!=null) RIDX[k]=RIDX[A[k]]; }
const isHan = c => c>='一' && c<='鿿';
const hanOf = s => [...s].filter(isHan);
function radOf(c){ const h=HZ.c[c]; return h? h[0] : 0; }           // номер ключа Канси
function lessonWords(L){ return ((LESSONS[L]||{}).o||[]).map(k=>BYK[k]).filter(Boolean); }
function lessonExtras(L){ return ((LESSONS[L]||{}).x||[]).map(x=>({...x,words:x.o.map(k=>BYK[k]).filter(Boolean)})); }   // список группы, презентации
function lessonTitle(L){ return (LESSONS[L]&&LESSONS[L].t) || ('Урок '+L); }

// Разбор на ключи (kondr_chars.json): KC.c[знак]=[[форма,№],…], KC.order — порядок изучения 214 ключей
const KC = /*__KCHARS__*/;
function keysOf(ch){ return (KC.c[ch]&&KC.c[ch].length) ? KC.c[ch] : (HZ.c[ch]?[[HZ.c[ch][1],HZ.c[ch][0]]]:[]); }
// Пиньинь иероглифа — словарный (587 знаков уроков — из kondr_1-30.json), перевод — из разбора приложения
function charPy(ch){ return (KC.py&&KC.py[ch]) || (HZ.c[ch]&&HZ.c[ch][7]) || ''; }
function charRu(ch){ return (HZ.c[ch]&&HZ.c[ch][6]) || (KC.ru&&KC.ru[ch]) || ''; }
// чтение знака в слове w (если в слове он читается иначе, чем в словаре: 乐 yuè в 音乐, lè в 快乐); 一/不 и лёгкий тон — словарное
function charPyIn(ch,w){
  const d=charPy(ch); if(!w) return d;
  const cs=hanOf(w.s), sy=w.p.trim().split(/\s+/); if(sy.length!==cs.length) return d;
  const y=sy[cs.indexOf(ch)]; if(!y||'一不'.includes(ch)||syllTone(y)===5||toneless(y)===toneless(d)) return d;
  return y;
}

// Где иероглиф и ключ появляются впервые; порядок новых слов курса (уроки 1→30, затем наборы группы урока)
const CHAR_L={}, RAD_L={}, KEY_L={}, LESSON_CHARS={}, LESSON_RADS={}, LESSON_KEYS={}, WORD_L={}, EXTRA_OF={};
const COURSE=[];                    // ключи карточек слов в порядке курса
for(let L=1;L<=NL;L++){
  LESSON_CHARS[L]=[]; LESSON_RADS[L]=[]; LESSON_KEYS[L]=[];
  const add=w=>{
    hanOf(w.s).forEach(c=>{
      if(c in CHAR_L) return;
      CHAR_L[c]=L; LESSON_CHARS[L].push(c);
      const k=radOf(c);
      if(k && !(k in RAD_L)){ RAD_L[k]=L; LESSON_RADS[L].push(k); }
      keysOf(c).forEach(([,n])=>{ if(n&&!(n in KEY_L)){ KEY_L[n]=L; LESSON_KEYS[L].push(n); } });
    });
    if(!(w.key in WORD_L)){ WORD_L[w.key]=L; COURSE.push(w.key); }
  };
  lessonWords(L).forEach(add);
  lessonExtras(L).forEach(x=>x.words.forEach(w=>{ if(!(w.key in EXTRA_OF)) EXTRA_OF[w.key]=x.title; add(w); }));   // после урока — слова группы
}
const KEY_ORDER = (KC.order&&KC.order.length===214) ? KC.order.slice() : RADS.map(r=>r[0]);   // колода «Ключи»: все 214
// Иероглифы уроков, в которых встречается ключ (для карточки ключа)
const KEY_CHARS = {};
Object.keys(CHAR_L).sort((a,b)=>CHAR_L[a]-CHAR_L[b]).forEach(c=>keysOf(c).forEach(([,n])=>{ (KEY_CHARS[n]=KEY_CHARS[n]||[]); if(!KEY_CHARS[n].includes(c)) KEY_CHARS[n].push(c); }));
// Путь, раздел «Ключи»: 11 юнитов по ~20 ключей в порядке изучения
const KEY_UNITS=[]; for(let i=0;i<11;i++) KEY_UNITS.push(KEY_ORDER.slice(Math.round(i*214/11),Math.round((i+1)*214/11)));
