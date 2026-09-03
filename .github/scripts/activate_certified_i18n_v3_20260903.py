from pathlib import Path
import json,re

LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja']
TAG='<script src="/cloudsales-static-i18n-v2.js?v=2026.09.03.3"></script>'

def must(s,old,new,label):
    if old in s: return s.replace(old,new,1)
    if new in s: return s
    raise SystemExit('missing marker: '+label)

# Gate: all 11 catalogs must be exact, populated and share the same source-key sets.
base=Path('web/i18n/catalog-v1')
ck=pk=None
for lc in LOCALES:
    p=base/f'{lc}.json'
    if not p.exists(): raise SystemExit('missing catalog '+lc)
    j=json.loads(p.read_text(encoding='utf-8'))
    if j.get('locale')!=lc or not isinstance(j.get('commercial'),dict) or not isinstance(j.get('pwa'),dict): raise SystemExit('invalid catalog '+lc)
    if len(j['commercial'])!=1139 or len(j['pwa'])!=756: raise SystemExit(f'coverage mismatch {lc}')
    if any(not str(v).strip() for v in j['commercial'].values()) or any(not str(v).strip() for v in j['pwa'].values()): raise SystemExit('blank translation '+lc)
    a,b=set(j['commercial']),set(j['pwa'])
    if ck is None: ck,pk=a,b
    elif a!=ck or b!=pk: raise SystemExit('key set mismatch '+lc)
if not (base/'CERTIFIED').exists(): raise SystemExit('certification marker missing')

# Static catalog layer becomes authoritative. Legacy runtimes may still expose
# selectors/events, but they must not mutate copy before the certified layer.
for fname in ['web/cloudsales-i18n-v1.js','web/pwa-i18n-runtime-v1.js']:
    p=Path(fname); s=p.read_text(encoding='utf-8')
    if "if(window.CloudSalesStaticI18n?.version)return;" not in s:
        s=s.replace("'use strict';","'use strict';\nif(window.CloudSalesStaticI18n?.version)return;",1)
    p.write_text(s,encoding='utf-8')

# Inject the authoritative runtime into canonical source, not as a late visual patch.
for fname in ['web/commercial.html','web/pwa.html']:
    p=Path(fname); s=p.read_text(encoding='utf-8')
    if '/cloudsales-static-i18n-v2.js' not in s:
        if fname.endswith('commercial.html') and '/cloudsales-i18n-v1.js' in s:
            s=re.sub(r'(<script[^>]+src=["\']/cloudsales-i18n-v1\.js[^>]*></script>)',TAG+r'\1',s,count=1)
        else:
            s=s.replace('</body>',TAG+'</body>',1)
    p.write_text(s,encoding='utf-8')

# Release every installed PWA onto a fresh cache namespace containing all 11 catalogs.
p=Path('web/sw.js'); s=p.read_text(encoding='utf-8')
s=re.sub(r"const CACHE='cloudsales-pwa-[^']+';","const CACHE='cloudsales-pwa-2026.09.03.3-i18n-certified';",s,count=1)
p.write_text(s,encoding='utf-8')

# Commercial Cloudflare release v11: same pinned source contains pages, runtime,
# catalogs and official marketing assets. No catalog depends on GitHub at runtime.
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts'); s=p.read_text(encoding='utf-8')
s=s.replace('VERSION="2026.09.03.10"','VERSION="2026.09.03.11"',1)
s=must(s,"ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing'];","ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing'],I18N_LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];",'commercial locales')

# Normalize browser color handling on every page served through CloudSales.
marker="function brand(src:string,isRoot=false){let h=src.replace(/CloudSales CRM/g,'CloudSales')"
replacement="function brand(src:string,isRoot=false){let h=src.replace(/CloudSales CRM/g,'CloudSales')"
if marker not in s: raise SystemExit('brand function marker missing')
# Insert immediately after the first brand cleanup statement terminator by replacing a stable tail.
tail=".replace(/<link\\s+rel=[\"']apple-touch-icon[\"'][^>]*>/gi,'');h=h.replace('</head>',"
newtail=".replace(/<link\\s+rel=[\"']apple-touch-icon[\"'][^>]*>/gi,'');h=h.replace(/<meta\\s+name=[\"']color-scheme[\"'][^>]*>/i,'<meta name=\"color-scheme\" content=\"light dark\">');if(!/<meta\\s+name=[\"']color-scheme[\"']/i.test(h))h=h.replace('</head>','<meta name=\"color-scheme\" content=\"light dark\"></head>');h=h.replace('</head>',"
s=must(s,tail,newtail,'commercial color scheme')

# Certified runtime must precede the legacy event bridge when present.
ret="if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);return h}"
retnew="if(!h.includes('/cloudsales-static-i18n-v2.js')){const st=`<script src=\"/cloudsales-static-i18n-v2.js?v=${VERSION}\"></script>`;if(h.includes('/cloudsales-i18n-v1.js'))h=h.replace(/<script[^>]+src=[\"']\\/cloudsales-i18n-v1\\.js[^>]*><\\/script>/i,m=>st+m);else h=h.replace('</body>',st+'</body>')}if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);return h}"
s=must(s,ret,retnew,'commercial static runtime injection')

oldsig="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){"
newsig="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,staticI18n:string,catalogs:Record<string,string>,marketing:Record<string,string>,cl:string,brandRuntime:string){"
s=must(s,oldsig,newsig,'commercial worker signature')
oldconst="I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)}"
newconst="I18N=${JSON.stringify(i18n)},STATIC_I18N=${JSON.stringify(staticI18n)},CATALOGS=${JSON.stringify(catalogs)},MARKETING=${JSON.stringify(marketing)},CL=${JSON.stringify(cl)}"
s=must(s,oldconst,newconst,'commercial worker constants')
route="if(p==='/robots.txt')return r(ROBOTS,'text/plain; charset=utf-8','public,max-age=3600');"
insert="if(p==='/cloudsales-static-i18n-v2.js')return r(STATIC_I18N,'application/javascript; charset=utf-8','no-cache');if(CATALOGS[p])return r(CATALOGS[p],'application/json; charset=utf-8','no-cache');if(MARKETING[p])return img(MARKETING[p],'image/webp');"+route
s=must(s,route,insert,'commercial static routes')

fetchmark="widget=await txt(`${RAW}/webchat.js`),i18n=await txt(`${RAW}/cloudsales-i18n-v1.js`),brandRuntime="
fetchnew="widget=await txt(`${RAW}/webchat.js`),i18n=await txt(`${RAW}/cloudsales-i18n-v1.js`),staticI18n=await txt(`${RAW}/cloudsales-static-i18n-v2.js`),brandRuntime="
s=must(s,fetchmark,fetchnew,'commercial static source')

before_upload="cl=await bytes('https://cloudsales.app/cloudco-assets/cloudco-logo-official.webp'),expected="
add="cl=await bytes('https://cloudsales.app/cloudco-assets/cloudco-logo-official.webp'),catalogs:Record<string,string>={},marketing:Record<string,string>={};catalogs['/i18n/catalog-v1/manifest.json']=await txt(`${RAW}/i18n/catalog-v1/manifest.json`);for(const lc of I18N_LOCALES){const raw=await txt(`${RAW}/i18n/catalog-v1/${encodeURIComponent(lc)}.json`),j=JSON.parse(raw);if(j?.locale!==lc||Object.keys(j?.commercial||{}).length!==1139||Object.keys(j?.pwa||{}).length!==756)throw new Error(`catalog_invalid_${lc}`);catalogs[`/i18n/catalog-v1/${lc}.json`]=raw}marketing['/assets/marketing/agentcloud-official.webp']=b64(await bytes(`${RAW}/assets/marketing/agentcloud-official.webp`));marketing['/assets/marketing/cloudy-official.webp']=b64(await bytes(`${RAW}/assets/marketing/cloudy-official.webp`));const expected="
s=must(s,before_upload,add,'commercial catalogs and marketing source')
s=must(s,"worker(pages,csps,b64(icon),b64(logo),widget,i18n,b64(cl),brandRuntime)","worker(pages,csps,b64(icon),b64(logo),widget,i18n,staticI18n,catalogs,marketing,b64(cl),brandRuntime)",'commercial worker call')

# Extend release smoke tests to prove every language and the broken AgentCloud asset.
needle="li=await bc('https://cloudsales.app/cloudsales-favicon-official-v2.png'),ll=await bc('https://cloudsales.app/cloudsales-logo-official-v2.png');"
ext="li=await bc('https://cloudsales.app/cloudsales-favicon-official-v2.png'),ll=await bc('https://cloudsales.app/cloudsales-logo-official-v2.png'),staticLive=await tc('https://cloudsales.app/cloudsales-static-i18n-v2.js'),agentLive=await tc('https://cloudsales.app/assets/marketing/agentcloud-official.webp'),catalogLive=await Promise.all(I18N_LOCALES.map(lc=>tc(`https://cloudsales.app/i18n/catalog-v1/${lc}.json`)));"
s=must(s,needle,ext,'commercial smoke inputs')
crit="root_premium_truth:root.text.includes('Premium $147/mes · Incluye 2 usuarios')"
critnew=crit+",i18n_static_runtime:staticLive.status===200&&staticLive.text.includes('cs-static-i18n-v2'),i18n_all_11:catalogLive.length===11&&catalogLive.every(x=>x.status===200&&x.text.includes('\\\"commercial\\\"')&&x.text.includes('\\\"pwa\\\"')),agentcloud_asset:agentLive.status===200&&/image\\/webp/i.test(agentLive.type),all_routes_color_scheme:lp.every(x=>x.text.includes('<meta name=\\\"color-scheme\\\" content=\\\"light dark\\\">')),no_dead_subscribe:!root.text.includes('/subscribe?plan=pro')"
s=must(s,crit,critnew,'commercial certification smoke')
p.write_text(s,encoding='utf-8')

# PWA release v3: serve the exact same 11 catalogs and runtime from app.cloudsales.app.
p=Path('supabase/functions/cloudflare-pwa-brand-release/index.ts'); s=p.read_text(encoding='utf-8')
s=s.replace('const VERSION="2026.09.03.2";','const VERSION="2026.09.03.3";',1)
s=must(s,'const SERVED_SCRIPTS=["/install.js",...PAGE_RUNTIMES];','const I18N_LOCALES=["es","en","fr","it","pt-BR","de","ar-AE","ru","he","zh-CN","ja"];\nconst SERVED_SCRIPTS=["/install.js","/cloudsales-static-i18n-v2.js",...PAGE_RUNTIMES];','pwa locale list')
oldsig="function worker(page:string,manifest:string,sw:string,scripts:Record<string,string>,i512:string,i192:string,logo:string,policy:string){"
newsig="function worker(page:string,manifest:string,sw:string,scripts:Record<string,string>,catalogs:Record<string,string>,i512:string,i192:string,logo:string,policy:string){"
s=must(s,oldsig,newsig,'pwa worker signature')
oldconst="SCRIPTS=${JSON.stringify(scripts)},I512=${JSON.stringify(i512)}"
newconst="SCRIPTS=${JSON.stringify(scripts)},CATALOGS=${JSON.stringify(catalogs)},I512=${JSON.stringify(i512)}"
s=must(s,oldconst,newconst,'pwa worker constants')
route="if(p==='/manifest.webmanifest')return r(MANIFEST,'application/manifest+json','no-store',false);"
route_new=route+"if(CATALOGS[p])return r(CATALOGS[p],'application/json; charset=utf-8','no-cache',false);"
s=must(s,route,route_new,'pwa catalog routes')
fetch="sw=await text(`${RAW}/sw.js`),scripts:Record<string,string>={};for(const p of SERVED_SCRIPTS)scripts[p]=await text(`${RAW}${p}`);"
fetchnew="sw=await text(`${RAW}/sw.js`),scripts:Record<string,string>={},catalogs:Record<string,string>={};for(const p of SERVED_SCRIPTS)scripts[p]=await text(`${RAW}${p}`);catalogs['/i18n/catalog-v1/manifest.json']=await text(`${RAW}/i18n/catalog-v1/manifest.json`);for(const lc of I18N_LOCALES){const raw=await text(`${RAW}/i18n/catalog-v1/${encodeURIComponent(lc)}.json`),j=JSON.parse(raw);if(j?.locale!==lc||Object.keys(j?.commercial||{}).length!==1139||Object.keys(j?.pwa||{}).length!==756)throw new Error(`catalog_invalid_${lc}`);catalogs[`/i18n/catalog-v1/${lc}.json`]=raw}"
s=must(s,fetch,fetchnew,'pwa catalogs source')
s=must(s,"worker(page,manifest,sw,scripts,b64(i512),b64(i192),b64(logo),policy)","worker(page,manifest,sw,scripts,catalogs,b64(i512),b64(i192),b64(logo),policy)",'pwa worker call')

# Extend PWA smoke without disturbing the existing deep runtime checks.
root_marker="const[root,m,installer,auth,ops,meta,cloudy,works,adspend,aiChat,aiChannels,calendar,calendarBridge,contactProfile,swLive]=await Promise.all(["
if root_marker not in s: raise SystemExit('pwa smoke marker missing')
# Add independent checks immediately before tests object.
tests_marker="const tests={"
s=s.replace(tests_marker,"const staticLive=await check('/cloudsales-static-i18n-v2.js'),catalogLive=await Promise.all(I18N_LOCALES.map(lc=>check(`/i18n/catalog-v1/${lc}.json`)));const tests={",1)
first="canonical_brand:"
s=s.replace(first,"i18n_static_runtime:staticLive.status===200&&staticLive.body.includes('cs-static-i18n-v2'),i18n_all_11:catalogLive.length===11&&catalogLive.every(x=>x.status===200&&x.body.includes('\\\"commercial\\\"')&&x.body.includes('\\\"pwa\\\"')),service_worker_i18n:swLive.body.includes('i18n/catalog-v1')&&swLive.body.includes('i18n-certified'),"+first,1)
p.write_text(s,encoding='utf-8')

print('Certified CloudSales 11-language activation prepared for commercial site and PWA')
