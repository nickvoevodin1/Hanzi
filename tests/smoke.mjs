// Все экраны открываются, навигация, разбор по тапу, настройки.
import {load} from './env.mjs';
const A=await load({writer:true}); const {T,ev,ok,txt,doc,click}=A;
const routes=["go('home')","go('lessons')","go('lesson',{L:1})","go('lesson',{L:30,tab:'chars'})","go('lesson',{L:18,tab:'rads'})",
  "go('card',{id:BYS['睡觉'].id})","go('card',{id:BYS['爱好'].id})","go('tests')","go('test',{home:1,tid:'pr18'})","go('test',{home:1,tid:'L1'})",
  "go('keys')","go('keys',{scope:'all'})","go('radical',{n:9})","go('radical',{n:213})","go('dict')","go('list',{hsk:6})","go('settings')",
  "go('draw',{chars:['好'],title:'t'})","go('draw',{chars:['丨'],title:'t'})"];
for(const r of routes) await T(r,()=>{ ev(r); ok(txt().length>20,'пустой экран'); });
await T('nav',()=>{ for(const n of ['lessons','tests','keys','dict','home']){ doc.querySelector(`.nav [data-nav="${n}"]`).click(); ok(doc.querySelector('.nav .on').dataset.nav===n,'вкладка '+n); } });
await T('no-export-no-theme',()=>{ ev("go('settings')"); ok(!/Экспорт|Импорт|Тема/.test(txt()),'остались экспорт/темы'); ok(!doc.querySelector('[data-theme]'),'data-theme'); });
await T('sheet',()=>{ ev("go('card',{id:BYS['睡觉'].id})"); const h=doc.querySelector('#screen [data-c="觉"]'); ok(h,'нет кликабельного 觉');
  ok(doc.getElementById('sheet').hidden,'шторка открыта заранее');
  h.dispatchEvent(new A.w.MouseEvent('click',{bubbles:true})); ok(!doc.getElementById('sheet').hidden,'шторка не открылась');
  const t=doc.getElementById('sheetc').textContent; ok(/Ключ/.test(t)&&/147/.test(t)&&/Состав/.test(t),'нет разбора: '+t.slice(0,80));
  A.key('Escape'); ok(doc.getElementById('sheet').hidden,'Escape не закрыл'); });
await T('sheet-word',()=>{ ev("openChar('好')"); const b=doc.querySelector('#sheet [data-word]'); ok(b,'нет слов'); b.click(); ok(ev("State.route.name")==='card','не перешли к слову'); });
await T('settings-lesson',()=>{ ev("go('settings')"); const inc=doc.querySelector('.stepper button[aria-label="больше"]'); inc.click();
  ok(ev("State.settings.lesson")===19,'урок группы'); ok(/урок группы 19/.test(doc.getElementById('topSub').textContent),'шапка'); ev("State.settings.lesson=18"); });
await T('home-cards',()=>{ ev("go('home')"); const t=txt(); ok(/Догнать группу/.test(t)&&/уроки 1–18/.test(t),'нет блока курса'); ok(/Учить \(\d+\)/.test(t),'нет кнопки'); });
await T('dict-search',()=>{ ev("go('dict')"); const i=doc.querySelector('.search'); i.value='shuijiao'; i.dispatchEvent(new A.w.Event('input'));
  ok(/睡觉/.test(txt()),'поиск по пиньиню'); i.value='кровать'; i.dispatchEvent(new A.w.Event('input')); ok(/床/.test(txt()),'поиск по-русски'); });
A.finish('smoke: экраны, навигация, разбор по тапу, настройки, поиск');
