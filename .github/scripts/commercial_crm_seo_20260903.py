from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()
old="if(u.hostname==='www.cloudsales.app')return Response.redirect('https://cloudsales.app'+u.pathname+u.search,301);if(p==='/api/domain-quote')"
new="if(u.hostname==='www.cloudsales.app')return Response.redirect('https://cloudsales.app'+u.pathname+u.search,301);if(p==='/robots.txt')return r('User-agent: *\\nAllow: /\\nSitemap: https://cloudsales.app/sitemap.xml\\n','text/plain; charset=utf-8','public,max-age=3600');if(p==='/sitemap.xml')return r('<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://cloudsales.app/</loc></url><url><loc>https://cloudsales.app/crm</loc></url><url><loc>https://cloudsales.app/domains</loc></url><url><loc>https://cloudsales.app/academy</loc></url><url><loc>https://cloudsales.app/services</loc></url><url><loc>https://cloudsales.app/affiliate</loc></url><url><loc>https://cloudsales.app/terms</loc></url><url><loc>https://cloudsales.app/privacy</loc></url><url><loc>https://cloudsales.app/cloudco</loc></url></urlset>','application/xml; charset=utf-8','public,max-age=3600');if(p==='/api/domain-quote')"
if old not in s:
    raise SystemExit('worker route anchor not found')
s=s.replace(old,new,1)
p.write_text(s)
print('added robots.txt and sitemap.xml with /crm')
