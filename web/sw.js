const CACHE='cloudsales-pwa-2026.09.05.1948-senzik-pro-paypal';
const LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];
const I18N=[
  '/cloudsales-static-i18n-v2.js',
  '/i18n/catalog-v1/manifest.json',
  ...LOCALES.map(l=>`/i18n/catalog-v1/${l}.json`)
];
const CORE=[
  '/',
  '/icon-512.png',
  '/icon-192.png',
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
  '/canonical-pwa-runtime-v1.js',
  '/pwa-polish-runtime-v1.js',
  '/workspace-polish-runtime-v1.js',
  '/pwa-i18n-runtime-v1.js',
  '/cloudy-executive-runtime-v1.js',
  '/billing-runtime-v1.js',
  '/member-runtime-v1.js',
  '/connect-center-runtime-v1.js',
  '/cloudy-voice-client-policy-v1.js',
  '/pwa-ui-runtime-v1.js',
  '/pwa-connect-fix-runtime-v1.js',
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

function injectPwaUi(html){
  if(!html.includes('id="shell"')||!html.includes('id="page-cloudy"')) return html;
  if(html.includes('/pwa-ui-runtime-v1.js')) return html;
  const scripts='<script src="/cloudy-voice-client-policy-v1.js?v=20260905.6"></script><script src="/pwa-ui-runtime-v1.js?v=20260905.6"></script><script src="/pwa-connect-fix-runtime-v1.js?v=20260905.6"></script>';
  return html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
}

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

  const runtimeScript=/\/(?:auth|app|meta|cloudy|works|ad-spend|ai-chat|calendar|contact-profile|dashboard|sales-analytics|native-shell|canonical-pwa|pwa-polish|workspace-polish|pwa-i18n|cloudsales-static-i18n|cloudy-executive|billing|member|connect-center|pwa-ui|pwa-connect-fix|cloudy-voice-client-policy)[^/]*\.js$/.test(url.pathname);
  const i18nCatalog=url.pathname.startsWith('/i18n/catalog-v1/');

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const r=await fetch(event.request,{cache:'no-store'});
        const ct=r.headers.get('content-type')||'';
        if(r.ok&&ct.includes('text/html')){
          const html=injectPwaUi(await r.text());
          return new Response(html,{status:r.status,statusText:r.statusText,headers:r.headers});
        }
        return r;
      }catch(error){
        const cached=await caches.match('/');
        if(cached){
          const html=injectPwaUi(await cached.text());
          return new Response(html,{status:200,headers:{'content-type':'text/html;charset=utf-8'}});
        }
        throw error;
      }
    })());
    return;
  }

  const networkFirst=url.pathname==='/'||url.pathname==='/sw.js'||url.pathname==='/manifest.webmanifest'||url.pathname==='/install.js'||runtimeScript||i18nCatalog;
  if(networkFirst){
    event.respondWith((async()=>{
      try{return await put(event.request,await fetch(event.request,{cache:'no-store'}));}
      catch(error){
        const cached=await caches.match(event.request);
        if(cached) return cached;
        throw error;
      }
    })());
    return;
  }

  const network=fetch(event.request,{cache:'no-cache'}).then(r=>put(event.request,r));
  event.waitUntil(network.catch(()=>null));
  event.respondWith(caches.match(event.request).then(cached=>cached||network));
});