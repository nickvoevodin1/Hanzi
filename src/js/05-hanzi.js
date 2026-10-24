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
    <div><span class="lbl">Ключ:</span> <b class="han">${esc(form)}</b> — №${kx} <span class="han">${r[4][0]}</span> ${esc(r[2])}, ${esc(radName(kx))}${alt?` <span class="lbl">(в других словарях — №${alt} ${RADS[alt-1]?esc(RADS[alt-1][4][0]):''})</span>`:''}</div>
    <div><span class="lbl">Состав:</span> ${sostav}</div>
    ${type?`<div class="lbl">Тип: ${TYPES[type]}${type==='p'&&(sem||phon)?` — смысловая часть <b class="han">${esc(sem||'—')}</b>, звуковая <b class="han">${esc(phon||'—')}</b>`:''}</div>`:''}
    ${(()=>{ const st=strokesOf(ch); return st.length?`<details class="strk"><summary>Порядок черт (${st.length}) — по таблице черт курса</summary><ol>${st.map(x=>`<li>${strokeImg(x.n,18)}${esc(x.name)}${x.n?` <span class="lbl">№${x.n}</span>`:' <span class="lbl">(нет в таблице)</span>'}</li>`).join('')}</ol></details>`:''; })()}
    ${EVO.includes(ch)?`<div class="evo"><div class="lbl">Эволюция написания (таблица курса):</div><img src="evolution/${ch.codePointAt(0).toString(16)}.jpg" loading="lazy" alt="эволюция ${ch}"><div class="evocap"><span>Инь, гадат. надписи</span><span>Чжоу, бронза</span><span>сяо-чжуань</span><span>лишу</span><span>кайшу</span><span>цаошу</span><span>синшу</span><span>сокращ.</span></div></div>`:''}
    ${opts&&opts.actions?`<div class="actionrow" style="margin-top:6px"><button class="say" data-say="${ch}">🔊 Слушать</button><button class="say" data-draw="${ch}">笔 Прописи</button></div>`:''}
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
// глобально: тап по иероглифу — разбор; кнопки 🔊 / 笔 внутри разбора
document.addEventListener('click',e=>{
  const h=e.target.closest('[data-c]'); if(h){ e.preventDefault(); e.stopPropagation(); openChar(h.dataset.c); return; }
  const sb=e.target.closest('[data-say]'); if(sb){ Speech.say(sb.dataset.say, sb.dataset.rate?+sb.dataset.rate:undefined); return; }
  const db=e.target.closest('[data-draw]'); if(db){ closeSheet(); go('draw',{chars:[db.dataset.draw], title:db.dataset.draw, back:State.route}); }
},true);

