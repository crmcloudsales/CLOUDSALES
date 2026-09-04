const CACHE='cloudsales-pwa-2026.09.04.3-billing-refresh';
const LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];
const I18N=[
  '/cloudsales-static-i18n-v2.js',
  '/i18n/catalog-v1/manifest.json',
  ...LOCALES.map(l=>`/i18n/catalog-v1/${l}.json`)
];
const CORE=[
  '/',
  '/cloudsales-app-icon-official-v4.png',
  '/cloudsales-app-icon-official-v4-192.png',
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
  '/contact-profile-runtime-v1.js',
  '/dashboard-runtime-v3.js',
  '/sales-analytics-runtime-v1.js',
  '/native-shell-runtime-v1.js',
  '/pwa-polish-runtime-v1.js',
  '/workspace-polish-runtime-v1.js',
  '/pwa-i18n-runtime-v1.js',
  '/cloudy-executive-runtime-v1.js',
  '/billing-runtime-v1.js',
  '/member-runtime-v1.js',
  ...I18N,
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
      try{ await cache.add(new Request(url,{cache:'reload'})); }
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

  const runtimeScript=/\/(?:auth|app|meta|cloudy|works|ad-spend|ai-chat|calendar|contact-profile|dashboard|sales-analytics|native-shell|pwa-polish|workspace-polish|pwa-i18n|cloudsales-static-i18n|cloudy-executive|billing|member)[^/]*\.js$/.test(url.pathname);
  const i18nCatalog=url.pathname.startsWith('/i18n/catalog-v1/');
  const networkFirst=event.request.mode==='navigate'||url.pathname==='/'||url.pathname==='/sw.js'||url.pathname==='/manifest.webmanifest'||url.pathname==='/install.js'||runtimeScript||i18nCatalog;

  if(networkFirst){
    event.respondWith((async()=>{
      try{return await put(event.request,await fetch(event.request,{cache:'no-store'}));}
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
