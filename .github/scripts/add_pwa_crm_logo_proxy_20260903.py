from pathlib import Path

p=Path('supabase/functions/cloudflare-pwa-brand-release/index.ts')
s=p.read_text(encoding='utf-8')
route="if(p==='/manifest.webmanifest')return r(MANIFEST,'application/manifest+json','no-store',false);"
insert=route+"if(p==='/crm-logo'){const d=String(u.searchParams.get('domain')||'').toLowerCase(),ok=new Set(['gohighlevel.com','hubspot.com','salesforce.com','zoho.com','pipedrive.com','twenty.com','microsoft.com','monday.com','freshworks.com','close.com','copper.com']);if(!ok.has(d))return new Response('not found',{status:404,headers:{...H,'content-type':'text/plain','cache-control':'no-store'}});const q=await fetch('https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=128',{headers:{accept:'image/*'}});if(!q.ok)return new Response('not found',{status:404,headers:{...H,'content-type':'text/plain','cache-control':'no-store'}});return new Response(q.body,{status:200,headers:{...H,'content-type':q.headers.get('content-type')||'image/png','cache-control':'public,max-age=86400,stale-while-revalidate=604800'}})}"
if insert not in s:
    if route not in s: raise SystemExit('PWA worker route marker missing')
    s=s.replace(route,insert,1)

marker="const staticLive=await check('/cloudsales-static-i18n-v2.js'),catalogLive=await Promise.all(I18N_LOCALES.map(lc=>check(`/i18n/catalog-v1/${lc}.json`)));const tests={"
new="const staticLive=await check('/cloudsales-static-i18n-v2.js'),catalogLive=await Promise.all(I18N_LOCALES.map(lc=>check(`/i18n/catalog-v1/${lc}.json`))),crmLogoLive=await check('/crm-logo?domain=hubspot.com');const tests={crm_logo_proxy:crmLogoLive.status===200,"
if new not in s:
    if marker not in s: raise SystemExit('PWA certification smoke marker missing')
    s=s.replace(marker,new,1)
p.write_text(s,encoding='utf-8')
print('PWA same-origin CRM logo proxy added')
