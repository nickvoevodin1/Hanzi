/* Авторский ритмический фон для коротких учебных фраз. Это озвученный
   речитатив, а не запись певца. Музыка синтезируется локально. */
let CLASS_AUDIO_STOP=null;
function stopClassListening(){ if(CLASS_AUDIO_STOP){ const stop=CLASS_AUDIO_STOP; CLASS_AUDIO_STOP=null; stop(); } }
function playClassListening(listening){
  stopClassListening(); Speech.stop();
  if(listening.audioUrl){
    try{ const address=new URL(listening.audioUrl); if(address.protocol==='https:'){ const audio=new Audio(address.href); const stop=()=>{ audio.pause(); Speech.stop(); }; CLASS_AUDIO_STOP=stop; audio.play().catch(()=>toast('Не удалось включить аудио. Открой ссылку на песню.')); return stop; } }catch(e){}
  }
  let context=null, interval=null, closed=false;
  const stop=()=>{ closed=true; clearInterval(interval); if(context){ context.close().catch(()=>{}); context=null; } Speech.stop(); };
  CLASS_AUDIO_STOP=stop;
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(AudioContext){
      context=new AudioContext(); context.resume().catch(()=>{});
      const gain=context.createGain(); gain.gain.value=.028; gain.connect(context.destination);
      const notes=[60,64,67,62,65,69,67,64,62,65,60,67]; let tick=0;
      const note=()=>{ if(closed||!context) return; const osc=context.createOscillator(), env=context.createGain(), now=context.currentTime;
        osc.type='sine'; osc.frequency.value=440*Math.pow(2,(notes[tick++%notes.length]-69)/12);
        env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(.7,now+.025); env.gain.exponentialRampToValueAtTime(.001,now+.48);
        osc.connect(env); env.connect(gain); osc.start(now); osc.stop(now+.5);
      }; note(); interval=setInterval(note,560);
    }
  }catch(e){ context=null; }
  const text=listening.zh||(listening.segments||[]).map(x=>x.zh).join('。');
  const py=listening.py||(listening.segments||[]).map(x=>x.py||'').join(' ');
  if(text) Speech.say(text,undefined,py);
  setTimeout(()=>{ if(CLASS_AUDIO_STOP===stop) stopClassListening(); },Math.min(60000,Math.max(10000,[...text].length*800)));
  return stop;
}
