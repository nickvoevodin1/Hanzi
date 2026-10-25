/*==================================================================
  РАЗБОР ИЕРОГЛИФА: ключ, состав, смысл/звук
==================================================================*/
const TYPES={p:'смысл + звук',i:'составной по смыслу',g:'рисунок (пиктограмма)'};
const IDC=/[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻]/g;
function radName(n){ const r=RADS[n-1]; return r? '«'+r[3]+'»' : ''; }
function compLabel(p,ch){
  if(p==='？') return '<span class="lbl">часть без отдельного названия</span>';
  let n=null;
  if(p==='阝'){ const h=HZ.c[ch]; n = h&&(h[0]===163||h[0]===170) ? h[0] : (h&&h[2].startsWith('⿰阝')?170:163); }   // слева — «холм», справа — «город»
  else if(RIDX[p]!=null) n=RADS[RIDX[p]][0];
  const self=HZ.c[p];
  if(self && p!==ch){
    const m=self[6]||(n?RADS[n-1][3]:'');
    return `<b class="han hz" data-c="${p}">${p}</b> <span class="lbl">${esc(self[7])}${m?' · '+esc(m):''}${n?' · ключ '+n:''}</span>`;
  }
  if(n) return `<b class="han">${p}</b> <span class="lbl">ключ ${n} ${esc(radName(n))}</span>`;
  const c=HZ.p[p];
  if(c) return `<b class="han">${p}</b> <span class="lbl">${esc(c[0])}${c[1]?' · '+esc(c[1]):''}</span>`;
  return `<b class="han">${p}</b>`;
}
function charBox(ch,opts){
  const h=HZ.c[ch]; if(!h) return '';
  const [kx,form,ids,type,sem,phon,ru0,py,alt]=h; const r=RADS[kx-1];
  const ru = ru0 || (RIDX[ch]!=null&&RADS[RIDX[ch]][0]===kx ? 'ключ «'+RADS[kx-1][3]+'»' : '');
  const parts=(ids||'').replace(IDC,'').split('').filter(Boolean);
  const isSelf = parts.length===0 || RIDX[ch]!=null && RADS[RIDX[ch]][0]===kx;
  let sostav;
  if(!parts.length || parts.every(p=>p==='？')) sostav = isSelf ? 'сам является ключом, не делится' : 'не делится';
  else sostav = parts.map(p=>compLabel(p,ch)).join(' + ');
  const strokes = CHARS[ch] ? CHARS[ch][0]+' черт' : '';
  const where = CHAR_L[ch] ? 'урок '+CHAR_L[ch] : '';
  return `<div class="bk">
    <div class="bkh"><span class="han">${ch}</span><span style="font-size:17px">${pinyinHTML(py)}</span>${palladius(py.split(' / ')[0])?`<span class="lbl">${esc(palladius(py.split(' / ')[0]))}</span>`:''}<span class="lbl">${[strokes,where].filter(Boolean).join(' · ')}</span></div>
    ${ru?`<div style="font-weight:650">${esc(ru)}</div>`:(h[9]?`<div class="lbl">${esc(h[9])}</div>`:'')}
    ${ET[ch]?etymParts(ch):`<div><span class="lbl">Ключ:</span> <b class="han">${esc(form)}</b> — №${kx} <span class="han">${r[4][0]}</span> ${esc(r[2])}, ${esc(radName(kx))}${alt?` <span class="lbl">(в других словарях — №${alt} ${RADS[alt-1]?esc(RADS[alt-1][4][0]):''})</span>`:''}</div>
    <div><span class="lbl">Состав:</span> ${sostav}</div>
    ${type?`<div class="lbl">Тип: ${TYPES[type]}${type==='p'&&(sem||phon)?` — смысловая часть <b class="han">${esc(sem||'—')}</b>, звуковая <b class="han">${esc(phon||'—')}</b>`:''}</div>`:''}`}
    ${(()=>{ const st=strokesOf(ch); return st.length?`<details class="strk"><summary>Порядок черт (${st.length}) — по таблице черт курса</summary><ol>${st.map(x=>`<li>${strokeImg(x.n,18)}${esc(x.name)}${x.n?` <span class="lbl">№${x.n}</span>`:' <span class="lbl">(нет в таблице)</span>'}</li>`).join('')}</ol></details>`:''; })()}
    ${EVO.includes(ch)?`<div class="evo"><div class="lbl">Эволюция написания (таблица курса):</div><img src="evolution/${ch.codePointAt(0).toString(16)}.jpg" loading="lazy" alt="эволюция ${ch}"><div class="evocap"><span>Инь, гадат. надписи</span><span>Чжоу, бронза</span><span>сяо-чжуань</span><span>лишу</span><span>кайшу</span><span>цаошу</span><span>синшу</span><span>сокращ.</span></div></div>`:''}
    ${opts&&opts.actions?`<div class="actionrow" style="margin-top:6px"><button class="say" data-say="${ch}">${SPK()} Слушать</button><button class="say" data-draw="${ch}">${IC('brushW',18)} Прописи</button></div>`:''}
  </div>`;
}
function hzBtn(c){ const b=el('button','han',c); b.dataset.c=c; b.setAttribute('aria-label','разбор '+c); return b; }
function breakdown(s){ const cs=[...new Set(hanOf(s))].filter(c=>HZ.c[c]); return cs.length? `<div class="bks">${cs.map(c=>charBox(c)).join('')}</div>` : ''; }
function openSheet(html){
  $('#sheetc').innerHTML=html+'<div class="actionrow"><button class="btn ghost" id="sheetClose">Закрыть</button></div>';
  $('#sheet').hidden=false; $('#sheetClose').onclick=closeSheet;
}
function closeSheet(){ $('#sheet').hidden=true; }
function openChar(ch){
  const words=WORDS.filter(w=>w.s.includes(ch)).sort((a,b)=>((WORD_L[a.key]||99)-(WORD_L[b.key]||99))||(a.s.length-b.s.length)).slice(0,10);
  openSheet(charBox(ch,{actions:true}) + (words.length?`<p class="eyebrow">Слова с ${ch}</p><div class="rowlist">${words.map(w=>`<button class="witem" data-word="${w.id}"><div class="hzw han">${esc(w.d||w.s)}</div><div class="mid"><div class="py">${pinyinHTML(w.p)}</div><div class="tr">${esc(meaning(w))}</div></div>${WORD_L[w.key]?`<span class="pill k">ур. ${WORD_L[w.key]}</span>`:''}</button>`).join('')}</div>`:''));
}
$('#sheet').addEventListener('click',e=>{
  if(e.target.id==='sheet'){ closeSheet(); return; }
  const wb=e.target.closest('[data-word]'); if(wb){ closeSheet(); go('card',{id:+wb.dataset.word, from:State.route}); }
});
// глобально: тап по иероглифу — разбор; кнопки «Слушать» / «Прописи» внутри разбора
document.addEventListener('click',e=>{
  const h=e.target.closest('[data-c]'); if(h){ e.preventDefault(); e.stopPropagation(); openChar(h.dataset.c); return; }
  const sb=e.target.closest('[data-say]'); if(sb){ Speech.say(sb.dataset.say, sb.dataset.rate?+sb.dataset.rate:undefined, sb.dataset.py); return; }
  const db=e.target.closest('[data-draw]'); if(db){ closeSheet(); go('draw',{chars:[db.dataset.draw], title:db.dataset.draw, back:State.route}); }
},true);


/*==================================================================
  РАЗБОР ИЕРОГЛИФА ПО ТИПУ (etym.json) — как в «Пособии по иероглифике» Кондрашевского:
  изобразительный / условный знак / идеограмма (и/г) / фоноидеограмма (ф/и = ключ-смысл + фонетик-звук).
  Ключ — номер(а) из 214, под которыми знак ищут в словарях (по пособию); части — в упрощённом написании.
==================================================================*/
const ETYPE={g:'изобразительный',z:'условный знак',i:'идеограмма',p:'фоноидеограмма'};
const ETYPE_HINT={g:'рисунок предмета',z:'условные черты или точки указывают смысл',i:'смысл складывается из смыслов частей',p:'ключ даёт смысл, фонетик — только звучание'};
function keyStr(f,n){ const r=RADS[n-1]; return r?`<span class="han">${esc(f)}</span> (${n}, ${esc(r[2])}, «${esc(r[3])}»)`:`<span class="han">${esc(f)}</span>`; }
function idsParts(ch){ const h=HZ.c[ch]; return ((h&&h[2])||'').replace(IDC,'').split('').filter(p=>p&&p!=='？'); }
function roleText(p,t){
  const [f,role,n]=p, r=n?RADS[n-1]:null, key=r?`ключ №${n} «${esc(r[3])}»`:'';
  if(role==='s') return 'ключ — даёт смысл'+(r?` (№${n} «${esc(r[3])}»)`:'');
  if(role==='f') return 'фонетик — даёт только звучание'+(r?` (сам по себе — ${key})`:'');
  if(role==='m') return 'смысловая часть'+(r?` — ${key}`:'');
  if(role==='x') return 'условный знак упрощения — ни смысла, ни звука';
  return (t==='g'?'рисунок — на части не делится':t==='z'?'условный знак':'в нынешнем написании на части не делится')+(r?` · сам — ${key}`:'');
}
function partPlain(p){ const [f,role,n,py,ru]=p, r=n?RADS[n-1]:null;
  if(role==='f') return `${esc(f)} ${esc(py)} — фонетик (звук)`;
  if(role==='x') return `${esc(f)} — условный знак`;
  return `${esc(f)} ${r?'— ключ '+n+' «'+esc(r[3])+'»':'«'+esc(ru)+'»'}`; }
// Ключ(и) знака по пособию: «讠 149 yán «речь»»; у знаков вне пособия — ключ Канси
function keyLine(ch,plain){
  const e=ET[ch], b=e&&e[5], h=HZ.c[ch];
  const one=n=>{ const r=RADS[n-1]; if(!r) return ''; const f=keyForm(ch,n);
    return plain?`${esc(f)} ${n} «${esc(r[3])}»`:`<span class="han">${esc(f)}</span> №${n} ${pinyinHTML(r[2])} «${esc(r[3])}»`; };
  if(b&&b[0].length){ const kx=h&&!b[0].includes(h[0])?h[0]:0;   // словарь Канси относит знак к другому ключу
    return (b[0].length>1?'Ключ (в разных словарях): ':'Ключ: ')+b[0].map(one).join(plain?' / ':' · ')
      +(kx?(plain?` (Канси: ${esc(h[1])} ${kx})`:` <span class="lbl">· в словаре Канси — <span class="han">${esc(h[1])}</span> №${kx}</span>`):''); }
  return h?'Ключ по словарю Канси: '+(plain?`${esc(h[1])} ${h[0]}`:`<span class="han">${esc(h[1])}</span> №${h[0]}`):'';
}
function srcLine(ch){
  const e=ET[ch], b=e&&e[5];
  if(!e) return 'тип не определён';
  if(b) return `по «Пособию по иероглифике» Кондрашевского, урок ${b[1]}`+(b[2]?'':' (тип в пособии не указан — по 汉典)');
  return e[4]?'в пособии нет — разбор автоматический (汉典 + Make Me a Hanzi)':'в пособии нет — по 汉典 и Make Me a Hanzi';
}
function decompHTML(ch,o){
  o=o||{}; const e=ET[ch];
  const py=charPyIn(ch,o.w), alt=py!==charPy(ch)?' <span class="lbl">(в словаре: '+esc(charPy(ch))+')</span>':'';
  if(!e){
    const ip=idsParts(ch);
    if(o.plain) return `<span class="han">${esc(ch)}</span> ${esc(py)} — ${esc(charRu(ch))}`;
    return `<div class="dec"><div class="dh"><span class="han hz" data-c="${ch}">${ch}</span><b>${pinyinHTML(py)}</b>${alt}<span>— ${esc(charRu(ch))}</span></div>
      <div class="ds">тип не определён · ${keyLine(ch)}${ip.length?' · состав: '+ip.map(esc).join(' + '):''}</div></div>`;
  }
  const [t,parts]=e, whole=parts.length===1&&parts[0][1]==='w';
  if(o.plain) return `<span class="han">${esc(ch)}</span> ${esc(py)} — ${esc(charRu(ch))} · <b>${ETYPE[t]}</b> · ${keyLine(ch,1)}${whole?'':'<br>'+parts.map(partPlain).join(' + ')}`;
  return `<div class="dec"><div class="dh"><span class="han hz" data-c="${ch}">${ch}</span><b>${pinyinHTML(py)}</b>${alt}<span>— ${esc(charRu(ch))}</span></div>
    ${etymParts(ch,o)}</div>`;
}
// тип + ключ + части с ролями + примечание + источник (для разбора и шторки иероглифа)
function etymParts(ch,o){
  const e=ET[ch]; if(!e) return ''; o=o||{};
  const [t,parts,note,disp]=e;
  const rows=parts.map(p=>`<div class="dp ${p[1]}"><span class="han">${esc(p[0])}</span><div><b>${roleText(p,t)}</b>${p[1]!=='w'?`<br><span class="lbl">${p[3]?pinyinHTML(p[3]):''}${p[4]&&(p[1]!=='s'||!p[2])?' «'+esc(p[4])+'»':''}${p[5]?' · как фонетик даёт: '+esc(p[5]):''}</span>`:''}</div></div>`).join('');
  return `<div class="tline"><span class="tpill ${t}">${ETYPE[t]}</span>${o.short?'':`<span class="lbl">${ETYPE_HINT[t]}</span>`}</div>
    <div class="ds dkey">${keyLine(ch)}</div>
    <div class="dparts">${rows}</div>
    <div class="ds">${note?esc(note)+' · ':''}${disp?'<span class="disp">мнения расходятся</span> · ':''}<span class="lbl">${srcLine(ch)}</span></div>`;
}
// «Сообщить об ошибке разбора» — список хранится в meta.reports, виден в Повторении
function reportDecomp(ch){
  openSheet(`<h2 class="title">Ошибка в разборе ${esc(ch)}</h2>${decompHTML(ch)}<p class="note">Что не так? (например: «喝 = 口 + 曷, а не 口 + 日»)</p><textarea class="tinput" id="repTx" placeholder="комментарий"></textarea>
    <div class="actionrow"><button class="btn" id="repOk">Сохранить</button></div>`);
  $('#repOk').onclick=()=>{ State.meta.reports.push({ch,date:todayStr(),note:$('#repTx').value.trim()}); save('meta'); closeSheet(); toast('Сохранено — список в «Повторении»'); };
}
