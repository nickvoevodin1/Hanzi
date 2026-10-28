// Кэш приложения. Страница (index.html) — сначала из сети (новая версия видна сразу; без сети или >4 с — из кэша);
// остальное — из кэша. При установке файлы берутся мимо HTTP-кэша браузера (cache:'reload'), иначе туда попадала старая версия.
const CACHE='hanzi-v21';
const CORE=['./','./index.html','./manifest.json','./hanzi-data.json','./lib/hanzi-writer.min.js','./icon-192.png','./icon-512.png','./icon-maskable.png','./icon-maskable-192.png','./icon-180.png','./icon-32.png',
  './fonts/nunito-cyrillic-700-normal.woff2','./fonts/nunito-cyrillic-800-normal.woff2','./fonts/nunito-cyrillic-900-normal.woff2','./fonts/nunito-latin-700-normal.woff2','./fonts/nunito-latin-800-normal.woff2','./fonts/nunito-latin-900-normal.woff2','./fonts/nunito-latin-ext-700-normal.woff2','./fonts/nunito-latin-ext-800-normal.woff2','./fonts/nunito-latin-ext-900-normal.woff2',
  './strokes/01.png','./strokes/02.png','./strokes/03.png','./strokes/04.png','./strokes/05.png','./strokes/06.png','./strokes/07.png','./strokes/08.png','./strokes/09.png','./strokes/10.png','./strokes/11.png','./strokes/12.png','./strokes/13.png','./strokes/14.png','./strokes/15.png','./strokes/16.png','./strokes/17.png','./strokes/18.png','./strokes/19.png','./strokes/20.png','./strokes/21.png','./strokes/22.png','./strokes/23.png','./strokes/24.png','./evolution/4e3a.jpg','./evolution/4ece.jpg','./evolution/5b50.jpg','./evolution/5c71.jpg','./evolution/65e5.jpg','./evolution/6708.jpg','./evolution/6b65.jpg','./evolution/6c34.jpg','./evolution/706b.jpg','./evolution/725b.jpg','./evolution/7f8a.jpg','./evolution/864e.jpg','./evolution/8c61.jpg','./evolution/8f66.jpg','./evolution/91c7.jpg','./evolution/96e8.jpg','./evolution/9a6c.jpg','./evolution/9c7c.jpg','./evolution/9e7f.jpg','./evolution/9f9f.jpg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>
  fetch(new Request(u,{cache:'reload'})).then(r=>{ if(r.ok) return c.put(u,r); }).catch(()=>{})))));});
// Новая версия встала вместо старой → открытые окна перезагружаются сразу (место в уроке сохраняет приложение),
// иначе установленное приложение показывало бы старую версию до второго запуска. При первой установке — без перезагрузки.
// (перезагрузку нельзя ждать внутри waitUntil: запрос страницы ждёт конца активации — взаимная блокировка)
self.addEventListener('activate',e=>{ let upd=false;
  e.waitUntil(caches.keys().then(ks=>{ upd=ks.some(k=>k!==CACHE&&k.startsWith('hanzi-'));
    return Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))).then(()=>self.clients.claim()); })
    .then(()=>{ if(upd) setTimeout(()=>self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.navigate(c.url).catch(()=>{}))),50); }));
});
const isPage=(req,url)=>req.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin&&isPage(req,url)){
    // 'no-cache' — условный запрос: если страница не менялась, сервер отвечает 304 и ничего не качается;
    // плохая сеть (>4 с) или её нет — страница из кэша
    const cached=()=>caches.match('./index.html').then(r=>r||caches.match('./'));
    const net=fetch(req,{cache:'no-cache'}).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(CACHE).then(c=>c.put('./index.html',cp)); } return res; });
    e.respondWith(Promise.race([net,new Promise(r=>setTimeout(r,4000))]).then(res=>res||cached().then(c=>c||net)).catch(()=>cached()));
  }else if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return res; })));
  }else{
    e.respondWith(fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;}).catch(()=>caches.match(req)));
  }
});
