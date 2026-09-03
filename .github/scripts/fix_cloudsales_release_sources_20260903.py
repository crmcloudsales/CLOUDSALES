from pathlib import Path

ROOT=Path('.')
p=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'
s=p.read_text(encoding='utf-8')

old="const result:any={service:SERVICE,version:VERSION},old:Record<string,any>={};try{const pages:Record<string,string>={},csps:Record<string,string>={};for(const route of ROUTES){const source=route==='/domains'?`${RAW}/commercial/domains-v2.html`:route==='/'?`${RAW}/commercial.html`:`https://cloudsales.app${route}`;let h=brand(await txt(source),route==='/');"
new="const result:any={service:SERVICE,version:VERSION},old:Record<string,any>={};try{const pages:Record<string,string>={},csps:Record<string,string>={};const SOURCE_FILES:Record<string,string>={'/':'commercial.html','/crm':'commercial.html','/cloudco':'cloudco.html','/academy':'academy.html','/services':'services.html','/affiliate':'affiliate.html','/terms':'terms.html','/privacy':'privacy.html','/domains':'commercial/domains-v2.html'};for(const route of ROUTES){const source=`${RAW}/${SOURCE_FILES[route]}`;let h=brand(await txt(source),route==='/');"
if old not in s:
    raise SystemExit('canonical source mapping needle not found')
s=s.replace(old,new,1)
s=s.replace('VERSION="2026.09.03.4"','VERSION="2026.09.03.5"',1)

oldtests="const tests={release:root.status===200&&root.release===VERSION,sitemap:sitemapLive.status===200&&/application\\/xml/i.test(sitemapLive.type)&&sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>'),robots:robotsLive.status===200&&robotsLive.text.includes('Sitemap: https://cloudsales.app/sitemap.xml'),all_commercial_routes_branded:routeChecks.every(x=>x.logo&&x.favicon&&!x.legacy),install_links:['?install=ios','?install=android','?install=desktop'].every(x=>root.text.includes(x)),exact_icon_bytes:li.hash===expected.icon,exact_logo_bytes:ll.hash===expected.logo,highlevel_webhook:highlevel.status>=400&&highlevel.status<500&&!/text\\/html/i.test(highlevel.type),omni_webhook:omni.status>=400&&omni.status<500&&!/text\\/html/i.test(omni.type),www_redirect:www.status===301&&www.location.startsWith('https://cloudsales.app')};"
newtests="const obsoleteTrial=/(?:14\\s*d[ií]as|14\\s*days|14[-\\s]day|14\\s*jours|14\\s*giorni|14\\s*Tage|14\\s*дней|14\\s*ימים|14\\s*天|14日間|14\\s*يو)/i,obsoleteSeat=/(?:individual subscription per person|suscripción individual por persona|Extra Premium seat|Asiento Premium adicional)/i;const tests={release:root.status===200&&root.release===VERSION,sitemap:sitemapLive.status===200&&/application\\/xml/i.test(sitemapLive.type)&&sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>'),robots:robotsLive.status===200&&robotsLive.text.includes('Sitemap: https://cloudsales.app/sitemap.xml'),all_commercial_routes_branded:routeChecks.every(x=>x.logo&&x.favicon&&!x.legacy),install_links:['?install=ios','?install=android','?install=desktop'].every(x=>root.text.includes(x)),exact_icon_bytes:li.hash===expected.icon,exact_logo_bytes:ll.hash===expected.logo,highlevel_webhook:highlevel.status>=400&&highlevel.status<500&&!/text\\/html/i.test(highlevel.type),omni_webhook:omni.status>=400&&omni.status<500&&!/text\\/html/i.test(omni.type),www_redirect:www.status===301&&www.location.startsWith('https://cloudsales.app'),no_obsolete_14_day_trial:lp.every(x=>!obsoleteTrial.test(x.text)),no_obsolete_seat_copy:lp.every(x=>!obsoleteSeat.test(x.text)),root_canonical_brand:['#2D0A4A','#F955B6','#F3F4F8','<meta name=\\\"color-scheme\\\" content=\\\"dark\\\">'].every(x=>root.text.includes(x)),root_canonical_message:root.text.includes('La IA trabaja por ti.')&&root.text.includes('Tú mantienes el control.'),root_premium_truth:root.text.includes('Premium $147/mes · Incluye 2 usuarios')};"
if oldtests not in s:
    raise SystemExit('tests needle not found')
s=s.replace(oldtests,newtests,1)
p.write_text(s,encoding='utf-8')

# Keep the permanent finalizer aligned with release 2026.09.03.5.
f=ROOT/'.github/scripts/finalize_cloudsales_commercial_20260903.py'
x=f.read_text(encoding='utf-8')
x=x.replace("r=r.replace('VERSION=\"2026.09.03.3\"','VERSION=\"2026.09.03.4\"')","r=r.replace('VERSION=\"2026.09.03.3\"','VERSION=\"2026.09.03.5\"').replace('VERSION=\"2026.09.03.4\"','VERSION=\"2026.09.03.5\"')")
x=x.replace("assert 'VERSION=\"2026.09.03.4\"' in rel","assert 'VERSION=\"2026.09.03.5\"' in rel")
f.write_text(x,encoding='utf-8')

assert "'/crm':'commercial.html'" in p.read_text(encoding='utf-8')
assert 'VERSION="2026.09.03.5"' in p.read_text(encoding='utf-8')
assert 'no_obsolete_14_day_trial' in p.read_text(encoding='utf-8')
assert 'root_premium_truth' in p.read_text(encoding='utf-8')
print('CLOUDSALES_RELEASE_SOURCE_MAPPING_FIXED')
