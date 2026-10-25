/*==================================================================
  СТАРТ
==================================================================*/
// Экран загрузки: держим не меньше 0,9 с от открытия (чтобы не мигал), потом плавно убираем; статус-бар — снова белый
const Splash={hide(){ const sp=document.getElementById('splash'); if(!sp) return;
  const wait=Math.max(0,900-(performance.now?performance.now():0));
  setTimeout(()=>{ sp.classList.add('out'); const m=document.querySelector('meta[name=theme-color]'); if(m) m.content='#ffffff'; setTimeout(()=>sp.remove(),400); },wait); }};
(async function(){
  await loadState();
  applyFreezes();
  Speech.setPref(State.settings.voiceName);
  window.HZDATA=null;
  fetch('./hanzi-data.json').then(r=>r.ok?r.json():null).then(d=>{ window.HZDATA=d||{}; }).catch(()=>{ window.HZDATA={}; });
  if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('./service-worker.js'); }catch(e){} }
  if(!Resume.restore()) go('path');      // вернуться туда, где был (урок, карточки, экран), если свернул приложение
  Splash.hide();
})();
