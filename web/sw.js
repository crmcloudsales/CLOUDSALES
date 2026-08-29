const CACHE='cloudsales-pwa-2026.08.29.8';
const CORE=[
  '/',
  '/manifest.webmanifest',
  '/install.js',
  '/auth-runtime-v2.js',
  '/app-runtime-v14.js',
  '/meta-runtime-v1.js',
  '/cloudy-runtime-v3.js',
  '/works-runtime-v1.js',
  '/ad-spend-runtime-v1.js',
  '/ai-chat-runtime-v2.js',
  '/ai-chat-backfill-v1.js',
  '/ai-chat-channels-v1.js',
  '/calendar-runtime-v1.js',
  '/ai-chat-calendar-bridge-v1.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

const put=async(request,response)=>{
  if(response?.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
};

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    for(const url of CORE){
      try{ await cache.add(url); }
      catch(error){ console.warn('CloudSales precache skipped',url,error); }
    }
  }));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  ]));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  const critical=event.request.mode==='navigate'||url.pathname==='/'||url.pathname==='/sw.js'||url.pathname==='/manifest.webmanifest';
  if(critical){
    event.respondWith((async()=>{
      try{return await put(event.request,await fetch(event.request,{cache:'no-cache'}));}
      catch(error){
        const cached=await caches.match(event.request);
        if(cached) return cached;
        if(event.request.mode==='navigate') return await caches.match('/');
        throw error;
      }
    })());
    return;
  }
  const network=fetch(event.request,{cache:'no-cache'}).then(r=>put(event.request,r));
  event.waitUntil(network.catch(()=>null));
  event.respondWith(caches.match(event.request).then(cached=>cached||network));
});
