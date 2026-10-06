const CACHE='hanzi-v16';
const CORE=['./','./index.html','./manifest.json','./hanzi-data.json','./icon-192.png','./icon-512.png','./icon-maskable.png',
  './strokes/01.png','./strokes/02.png','./strokes/03.png','./strokes/04.png','./strokes/05.png','./strokes/06.png','./strokes/07.png','./strokes/08.png','./strokes/09.png','./strokes/10.png','./strokes/11.png','./strokes/12.png','./strokes/13.png','./strokes/14.png','./strokes/15.png','./strokes/16.png','./strokes/17.png','./strokes/18.png','./strokes/19.png','./strokes/20.png','./strokes/21.png','./strokes/22.png','./strokes/23.png','./strokes/24.png','./evolution/4e3a.jpg','./evolution/4ece.jpg','./evolution/5b50.jpg','./evolution/5c71.jpg','./evolution/65e5.jpg','./evolution/6708.jpg','./evolution/6b65.jpg','./evolution/6c34.jpg','./evolution/706b.jpg','./evolution/725b.jpg','./evolution/7f8a.jpg','./evolution/864e.jpg','./evolution/8c61.jpg','./evolution/8f66.jpg','./evolution/91c7.jpg','./evolution/96e8.jpg','./evolution/9a6c.jpg','./evolution/9c7c.jpg','./evolution/9e7f.jpg','./evolution/9f9f.jpg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;}).catch(()=>r)));
  }else{
    e.respondWith(fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;}).catch(()=>caches.match(req)));
  }
});