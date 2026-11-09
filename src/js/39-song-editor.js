/* Фрагмент песни с пары хранится только в прогрессе пользователя. */
function renderClassSongEditor(host,config,onSaved){
  const blockId=config.blockId, existing=State.meta.classroom?.materials?.[blockId]?.listening;
  const details=el('details','hero class-song-editor'); details.style.marginTop='14px';
  details.appendChild(el('summary','','Песня с пары · добавить свой фрагмент'));
  const form=el('form'); form.style.marginTop='12px';
  form.innerHTML='<p class="note">Добавь ссылку на песню и небольшой фрагмент. Каждой китайской строке соответствует строка пиньиня и перевода. Перевод можно заполнить позже; без него фрагмент остаётся свободной практикой.</p>';
  const field=(name,label,value,area)=>{ const wrap=el('label','class-song-field',esc(label)); const input=el(area?'textarea':'input','tinput'); input.name=name; input.value=value||''; input.maxLength=area?1800:600; if(area) input.rows=4; else input.type=name==='url'?'url':'text'; wrap.appendChild(input); form.appendChild(wrap); return input; };
  const title=field('title','Название',existing?.title||'Песня с пары');
  const url=field('url','Ссылка на песню или аудиофайл',existing?.audioUrl||existing?.url||'');
  const zh=field('zh','Китайский фрагмент · одна фраза на строку',(existing?.segments||[]).map(x=>x.zh).join('\n'),true);
  const py=field('py','Пиньинь · необязательно',(existing?.segments||[]).map(x=>x.py||'').join('\n'),true);
  const ru=field('ru','Перевод · для самопроверки',(existing?.segments||[]).map(x=>x.ru||'').join('\n'),true);
  const error=el('p','note'); error.setAttribute('role','alert'); form.appendChild(error);
  const saveButton=el('button','btn','Сохранить фрагмент'); saveButton.type='submit'; form.appendChild(saveButton);
  form.onsubmit=e=>{ e.preventDefault(); error.textContent='';
    const lines=zh.value.split('\n').map(x=>x.trim()).filter(Boolean); if(!lines.length){ error.textContent='Добавь хотя бы одну китайскую строку.'; return; }
    let address=null; if(url.value.trim()){ try{ address=new URL(url.value.trim()); if(address.protocol!=='https:') throw new Error(); }catch(e){ error.textContent='Нужна полная ссылка, начинающаяся с https://.'; return; } }
    const pys=py.value.split('\n'), rus=ru.value.split('\n'), segments=lines.map((text,i)=>({zh:text,py:(pys[i]||'').trim(),ru:(rus[i]||'').trim()}));
    const data={title:title.value.trim()||'Песня с пары',zh:lines.join('。'),py:segments.map(x=>x.py).join(' '),ru:segments.map(x=>x.ru).join(' '),kind:'user',custom:true,segments};
    if(address){ if(/\.(mp3|m4a|ogg|wav|aac|webm)$/i.test(address.pathname)) data.audioUrl=address.href; else data.url=address.href; }
    const state=State.meta.classroom||(State.meta.classroom={}); state.materials=state.materials||{}; state.materials[blockId]=state.materials[blockId]||{}; state.materials[blockId].listening=data;
    save('meta'); toast('Фрагмент сохранён'); if(onSaved) onSaved(data); else render();
  };
  if(existing){ const reset=el('button','linkbtn','Вернуть учебный аудиофрагмент'); reset.type='button'; reset.onclick=()=>{ delete State.meta.classroom.materials[blockId].listening; save('meta'); if(onSaved) onSaved(null); else render(); }; form.appendChild(reset); }
  details.appendChild(form); host.appendChild(details); return details;
}
