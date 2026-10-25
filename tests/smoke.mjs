// Все экраны открываются, навигация, разбор по тапу, настройки, поиск.
import {load} from './env.mjs';
const A=await load({writer:true}); const {T,ev,ok,txt,doc,click}=A;
const routes=["go('path')","go('practice')","go('cards')","go('decomp')","go('sent')","go('addsent')","go('mock')","go('progress')","go('settings')",
  "go('lessons')","go('lesson',{L:1})","go('lesson',{L:30,tab:'chars'})","go('lesson',{L:18,tab:'rads'})",
  "go('card',{id:BYS['睡觉'].id})","go('card',{id:BYS['爱好'].id})","go('tests')","go('test',{home:1,tid:'pr18'})","go('test',{home:1,tid:'L1'})",
  "go('keys')","go('keys',{scope:'all'})","go('radical',{n:9})","go('radical',{n:213})","go('dict')","go('list',{hsk:6})",
  "go('draw',{chars:['好'],title:'t'})","go('draw',{chars:['丨'],title:'t'})","go('extra',{L:16,id:'g16'})","go('extra',{L:17,id:'p17'})",
  "go('strokes')","go('card',{id:BYK['还:hái'].id})","go('card',{id:BYK['姥姥'].id})","go('card',{id:BYK['T恤'].id})"];
for(const r of routes) await T(r,()=>{ ev(r); ok(txt().length>20,'пустой экран'); });
await T('nav',()=>{ for(const n of ['practice','dict','progress','settings','path']){ doc.querySelector(`.nav [data-nav="${n}"]`).click(); ok(doc.querySelector('.nav .on').dataset.nav===n,'вкладка '+n); ok(ev("State.route.name")===n,'экран '+n); } });
await T('top-bar',()=>{ ok(doc.getElementById('dayChip').textContent.length>3,'тип дня'); ok(doc.querySelector('#stRing svg'),'кольцо XP'); ok(/\d/.test(doc.getElementById('stStreak').textContent),'серия'); });
await T('no-export-no-theme',()=>{ ev("go('settings')"); ok(!/Экспорт|Импорт|Тема/.test(txt()),'остались экспорт/темы'); ok(!doc.querySelector('[data-theme]'),'data-theme'); });
await T('sheet',()=>{ ev("go('card',{id:BYS['睡觉'].id})"); const h=doc.querySelector('#screen [data-c="觉"]'); ok(h,'нет кликабельного 觉');
  ok(doc.getElementById('sheet').hidden,'шторка открыта заранее');
  h.dispatchEvent(new A.w.MouseEvent('click',{bubbles:true})); ok(!doc.getElementById('sheet').hidden,'шторка не открылась');
  const t=doc.getElementById('sheetc').textContent; ok(/Ключ/.test(t)&&/147/.test(t)&&/фоноидеограмма/.test(t)&&/фонетик/.test(t)&&/Пособию по иероглифике/.test(t),'нет разбора: '+t.slice(0,80));
  A.key('Escape'); ok(doc.getElementById('sheet').hidden,'Escape не закрыл'); });
await T('card-decomp',()=>{ ev("go('card',{id:BYS['谢谢'].id})"); ok(/Разбор на ключи/.test(txt())&&/Ключ: 讠 №149 yán «речь»/.test(txt())&&/射/.test(txt()),'разбор на ключи на карточке'); });
await T('sheet-word',()=>{ ev("openChar('好')"); const b=doc.querySelector('#sheet [data-word]'); ok(b,'нет слов'); b.click(); ok(ev("State.route.name")==='card','не перешли к слову'); });
await T('settings-group-lesson',()=>{ ev("go('settings')"); const inc=doc.querySelectorAll('.stepper button[aria-label="больше"]')[0]; inc.click();
  ok(ev("State.settings.semester.groupLesson")===19,'урок группы'); ev("State.settings.semester.groupLesson=18"); });
await T('settings-exam',()=>{ ev("go('settings')"); const d=doc.querySelectorAll('#screen input[type=date]'), inl=doc.querySelectorAll('#screen input.inl');
  const ed=d[d.length-1]; ed.value='2026-12-15'; inl[1].value='19, 20, 21'; click(/Добавить контрольную/);
  const e=ev("State.settings.semester.exams"); ok(e.length===1&&e[0].lessons.join()==='19,20,21'&&e[0].date==='2026-12-15','контрольная: '+JSON.stringify(e));
  ev("State.settings.semester.exams=[]"); });
await T('path-home',()=>{ ev("go('path')"); const t=txt(); ok(/Выучено 0 из \d+ слов/.test(t),'карточка семестра'); ok(/Урок дня/.test(t)&&/Повторения/.test(t),'план дня');
  ok(/Уроки 1–30/.test(t)&&/Ключи · все 214/.test(t),'разделы пути'); ok(doc.querySelector('.pnode.cur'),'нет текущего узла'); });
await T('dict-search',()=>{ ev("go('dict')"); const i=doc.querySelector('.search'); i.value='shuijiao'; i.dispatchEvent(new A.w.Event('input'));
  ok(/睡觉/.test(txt()),'поиск по пиньиню'); i.value='кровать'; i.dispatchEvent(new A.w.Event('input')); ok(/床/.test(txt()),'поиск по-русски'); });
await T('extra-in-lessons',()=>{ ev("go('lessons')"); ok(/Список группы · уроки 1–16/.test(txt()),'нет строки списка группы'); ok(click(/Список группы/),'не открыть'); ok(ev("State.route.name")==='extra','экран'); ok(/姥姥/.test(txt()),'слова'); });
await T('homograph-session',()=>{ ev("State.cards={}; startSession(['还','还:hái'],'recog','t')"); ok(/huán/.test(txt()),'还 huán'); click(/Запомнил/); A.key(' '); A.key('ArrowRight'); ok(/hái/.test(txt()),'还 hái: '+txt().slice(0,80)); });
await T('stroke-order-ui',()=>{ ev("openChar('心')"); const t=doc.getElementById('sheetc').textContent; ok(/Порядок черт \(4\)/.test(t)&&/точка влево/.test(t)&&/лежачая с крюком/.test(t),'порядок черт: '+t.slice(0,200)); ev("closeSheet()"); });
await T('evolution-ui',()=>{ ev("openChar('马')"); ok(doc.querySelector('#sheetc .evo img[src="evolution/9a6c.jpg"]'),'нет эволюции 马'); ev("closeSheet()"); });
await T('palladius-ui',()=>{ ev("go('card',{id:BYK['北京'].id})"); ok(/по Палладию: бэй цзин/.test(txt()),'Палладий на карточке'); });
A.finish('smoke: экраны, навигация, разбор по тапу, настройки, поиск');
