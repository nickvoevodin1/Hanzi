/*==================================================================
  СТАРТ
==================================================================*/
// Убираем заставку сразу после готовности; даём анимации спокойно проиграться перед открытием приложения.
const Splash={
  hide(){ const sp=document.getElementById('splash'); if(!sp) return;
    const wait=Math.max(0,6000-performance.now());
    setTimeout(()=>{ sp.classList.add('out'); const m=document.querySelector('meta[name=theme-color]'); if(m) m.content='#ffffff'; setTimeout(()=>sp.remove(),320); },wait);
  },
  fail(){ const status=document.getElementById('splashStatus'), retry=document.getElementById('splashRetry');
    if(status) status.textContent='Не удалось открыть приложение. Попробуй ещё раз.';
    if(retry) retry.hidden=false;
  }
};
// Обновления: проверка при запуске, при каждом возвращении в приложение и раз в 30 мин; когда новая версия
// встала, service worker сам перезагружает окно (место в уроке сохраняет Resume на pagehide).
const APP_VER='v25';
function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>{ try{ reg.update(); }catch(e){} };
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') check(); });
    setInterval(check,30*60e3);
  }).catch(()=>{});
}
(async function(){
  await loadState();
  applyFreezes();
  Speech.setPref(State.settings.voiceName);
  window.HZDATA=null;
  fetch('./hanzi-data.json').then(r=>r.ok?r.json():null).then(d=>{ window.HZDATA=d||{}; }).catch(()=>{ window.HZDATA={}; });
  registerSW();
  if(!Resume.restore()) go('path');      // вернуться туда, где был (урок, карточки, экран), если свернул приложение
  Splash.hide();
})().catch(()=>Splash.fail());
