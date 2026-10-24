/*==================================================================
  СТАРТ
==================================================================*/
(async function(){
  await loadState();
  applyFreezes();
  Speech.setPref(State.settings.voiceName);
  window.HZDATA=null;
  fetch('./hanzi-data.json').then(r=>r.ok?r.json():null).then(d=>{ window.HZDATA=d||{}; }).catch(()=>{ window.HZDATA={}; });
  if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('./service-worker.js'); }catch(e){} }
  go('path');
})();
