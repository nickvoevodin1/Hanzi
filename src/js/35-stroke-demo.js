/* Небольшой показ черт справа от образца в тетради. Ничего не оценивает. */
let NOTEBOOK_DEMO_ID=0;
function notebookStrokeDemo(host,info){
  const forms=uniq([...info.hz].filter(c=>isHan(c)||FORM_CODES[c]));if(!forms.length)return;
  host.className='notebook-stroke-demo';host.setAttribute('aria-label','Как писать: порядок и направление черт');
  const selector=el('div','notebook-stroke-selector');
  forms.forEach((ch,i)=>{const b=el('button','chip han'+(i===0?' on':''),ch);b.setAttribute('aria-label','Показать написание '+ch);b.onclick=()=>run(i);selector.appendChild(b);});
  if(forms.length>1)host.appendChild(selector);
  const stage=el('div','notebook-stroke-stage'),pad=el('div','notebook-stroke-pad');stage.appendChild(pad);host.appendChild(stage);
  const caption=el('div','notebook-stroke-caption');caption.setAttribute('aria-live','polite');host.appendChild(caption);
  const replay=el('button','say',IC('play',14)+' Ещё раз');replay.setAttribute('aria-label','Повторить порядок черт');host.appendChild(replay);
  host.appendChild(el('small','notebook-stroke-help','Точка — начало, стрелка — направление'));
  let token=0,current=0,hw=null;const marker='nb-arrow-'+(++NOTEBOOK_DEMO_ID);
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  function arrow(data,j,size){
    stage.querySelector('.notebook-stroke-arrow')?.remove();
    const points=data.medians?.[j];if(!points?.length)return;
    const scale=(size-20)/1024,coords=points.map(([x,y])=>[x*scale+10,size-(124*scale+10)-y*scale]);
    const first=coords[0];stage.insertAdjacentHTML('beforeend',`<svg class="notebook-stroke-arrow" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#1899d6"/></marker></defs><polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#1899d6" stroke-width="2" stroke-dasharray="3 3" marker-end="url(#${marker})"/><circle cx="${first[0]}" cy="${first[1]}" r="3" fill="#ff9600"/></svg>`);
  }
  async function run(i,auto){
    const my=++token;current=i;hw?.cancelQuiz?.();hw?.pauseAnimation?.();pad.replaceChildren();stage.querySelector('.notebook-stroke-arrow')?.remove();
    [...selector.children].forEach((b,n)=>b.classList.toggle('on',i===n));caption.textContent='Загружаем черты…';
    const ch=forms[i];if(window.HZREADY)await window.HZREADY;if(my!==token||!host.isConnected)return;
    const data=await hwLoad(ch);if(my!==token||!host.isConnected)return;
    if(!data||!canHW()){caption.textContent='Показ черт недоступен';return;}
    const size=136,names=strokesOf(ch),n=data.strokes.length;
    try{hw=HanziWriter.create(pad,ch,{width:size,height:size,padding:10,showCharacter:false,showOutline:true,strokeColor:HWC.stroke,outlineColor:HWC.outline,strokeAnimationSpeed:.7,delayBetweenStrokes:0,charDataLoader:(c,ok)=>ok(data)});
      if(auto&&reducedMotion()){await hw.showCharacter?.();caption.textContent=n+' '+plural(n,'черта','черты','черт');return;}
      while(document.getElementById('splash')&&!document.getElementById('splash').classList.contains('out')){if(my!==token||!host.isConnected)return;await delay(150);}
      for(let j=0;j<n;j++){
        if(my!==token||!host.isConnected)return;
        caption.textContent=(j+1)+'/'+n+(names.length===n&&names[j]?.name?' · '+names[j].name:' · черта');arrow(data,j,size);
        await hw.animateStroke(j);if(my!==token||!host.isConnected)return;await delay(300);
      }
      if(my===token&&host.isConnected){stage.querySelector('.notebook-stroke-arrow')?.remove();caption.textContent=n+' '+plural(n,'черта','черты','черт')+' · готово';}
    }catch(e){if(my===token&&host.isConnected)caption.textContent='Показ черт недоступен';}
  }
  replay.onclick=()=>run(current,false);run(0,true);
}
