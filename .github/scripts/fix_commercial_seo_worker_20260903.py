from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()
# Replace fragile inline generated single-quoted robots/sitemap response with safely JSON-encoded constants in generated worker.
old="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){return`const P=${JSON.stringify(P)},CSP=${JSON.stringify(CSP)},ICON=${JSON.stringify(icon)},LOGO=${JSON.stringify(logo)},WIDGET=${JSON.stringify(widget)},I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)},BRAND_RUNTIME=${JSON.stringify(brandRuntime)},V=${JSON.stringify(VERSION)},HL=${JSON.stringify(HL)},OMNI=${JSON.stringify(OMNI)},DOMAIN_API=${JSON.stringify(`${SUPA}/functions/v1/cloudsales-web`)};"
new="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){const robots='User-agent: *\\nAllow: /\\nSitemap: https://cloudsales.app/sitemap.xml\\n',sitemap='<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://cloudsales.app/</loc></url><url><loc>https://cloudsales.app/crm</loc></url><url><loc>https://cloudsales.app/domains</loc></url><url><loc>https://cloudsales.app/academy</loc></url><url><loc>https://cloudsales.app/services</loc></url><url><loc>https://cloudsales.app/affiliate</loc></url><url><loc>https://cloudsales.app/terms</loc></url><url><loc>https://cloudsales.app/privacy</loc></url><url><loc>https://cloudsales.app/cloudco</loc></url></urlset>';return`const P=${JSON.stringify(P)},CSP=${JSON.stringify(CSP)},ICON=${JSON.stringify(icon)},LOGO=${JSON.stringify(logo)},WIDGET=${JSON.stringify(widget)},I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)},BRAND_RUNTIME=${JSON.stringify(brandRuntime)},ROBOTS=${JSON.stringify(robots)},SITEMAP=${JSON.stringify(sitemap)},V=${JSON.stringify(VERSION)},HL=${JSON.stringify(HL)},OMNI=${JSON.stringify(OMNI)},DOMAIN_API=${JSON.stringify(`${SUPA}/functions/v1/cloudsales-web`)};"
if old not in s:
    raise SystemExit('worker header anchor not found')
s=s.replace(old,new,1)
# Replace existing fragile inline route handlers regardless of their line-continuation formatting.
start="if(p==='/robots.txt')return r("
idx=s.find(start)
if idx<0: raise SystemExit('robots handler not found')
end_marker="if(p==='/api/domain-quote')"
end=s.find(end_marker,idx)
if end<0: raise SystemExit('domain quote marker not found')
s=s[:idx]+"if(p==='/robots.txt')return r(ROBOTS,'text/plain; charset=utf-8','public,max-age=3600');if(p==='/sitemap.xml')return r(SITEMAP,'application/xml; charset=utf-8','public,max-age=3600');"+s[end:]
# Bump release version so live verification can distinguish this build.
s=s.replace('VERSION="2026.09.02.6"','VERSION="2026.09.03.3"',1)
# Add /crm to validation set so its branding/runtime is smoke-tested directly.
s=s.replace("ROUTES=['/','/cloudco'","ROUTES=['/','/crm','/cloudco'",1)
# Add sitemap/robots checks to release smoke tests.
needle="const lp=await Promise.all(ROUTES.map(x=>tc(`https://cloudsales.app${x}`))),root=lp[0],www=await tc('https://www.cloudsales.app/')"
replacement="const lp=await Promise.all(ROUTES.map(x=>tc(`https://cloudsales.app${x}`))),root=lp[0],sitemapLive=await tc('https://cloudsales.app/sitemap.xml'),robotsLive=await tc('https://cloudsales.app/robots.txt'),www=await tc('https://www.cloudsales.app/')"
if needle not in s: raise SystemExit('live checks anchor not found')
s=s.replace(needle,replacement,1)
needle2="const tests={release:root.status===200&&root.release===VERSION,"
replacement2="const tests={release:root.status===200&&root.release===VERSION,sitemap:sitemapLive.status===200&&/application\\/xml/i.test(sitemapLive.type)&&sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>'),robots:robotsLive.status===200&&robotsLive.text.includes('Sitemap: https://cloudsales.app/sitemap.xml'),"
if needle2 not in s: raise SystemExit('tests anchor not found')
s=s.replace(needle2,replacement2,1)
p.write_text(s)
print('fixed generated worker SEO strings and added release smoke tests')
