from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()

s=s.replace("function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string){return`const P=${JSON.stringify(P)},CSP=${JSON.stringify(CSP)},ICON=${JSON.stringify(icon)},LOGO=${JSON.stringify(logo)},WIDGET=${JSON.stringify(widget)},I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)},V=", "function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){return`const P=${JSON.stringify(P)},CSP=${JSON.stringify(CSP)},ICON=${JSON.stringify(icon)},LOGO=${JSON.stringify(logo)},WIDGET=${JSON.stringify(widget)},I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)},BRAND_RUNTIME=${JSON.stringify(brandRuntime)},V=",1)

s=s.replace("if(p==='/cloudsales-i18n-v1.js')return r(I18N,'application/javascript','public,max-age=300');", "if(p==='/cloudsales-i18n-v1.js')return r(I18N,'application/javascript','public,max-age=300');if(p==='/commercial-brand-runtime-v2.js')return r(BRAND_RUNTIME,'application/javascript','public,max-age=300');",1)

old="const source=route==='/domains'?`${RAW}/commercial/domains-v2.html`:`https://cloudsales.app${route}`;"
new="const source=route==='/domains'?`${RAW}/commercial/domains-v2.html`:route==='/'?`${RAW}/commercial.html`:`https://cloudsales.app${route}`;"
if old not in s: raise SystemExit('source selector anchor missing')
s=s.replace(old,new,1)

old="widget=await txt(`${RAW}/webchat.js`),i18n=await txt(`${RAW}/cloudsales-i18n-v1.js`),cl=await bytes('https://cloudsales.app/cloudco-assets/cloudco-logo-official.webp')"
new="widget=await txt(`${RAW}/webchat.js`),i18n=await txt(`${RAW}/cloudsales-i18n-v1.js`),brandRuntime=await txt(`${RAW}/commercial-brand-runtime-v2.js`),cl=await bytes('https://cloudsales.app/cloudco-assets/cloudco-logo-official.webp')"
if old not in s: raise SystemExit('asset fetch anchor missing')
s=s.replace(old,new,1)

old="worker(pages,csps,b64(icon),b64(logo),widget,i18n,b64(cl))"
new="worker(pages,csps,b64(icon),b64(logo),widget,i18n,b64(cl),brandRuntime)"
if old not in s: raise SystemExit('worker call anchor missing')
s=s.replace(old,new,1)

# Use current v4 app icon bytes for the commercial favicon payload.
s=s.replace("bytes(`${RAW}/assets/cloudsales-app-icon-official-v2.png`)","bytes(`${RAW}/assets/cloudsales-app-icon-official-v4.png`)",1)

assert "route==='/'?`${RAW}/commercial.html`" in s
assert "commercial-brand-runtime-v2.js" in s
assert "BRAND_RUNTIME" in s
assert "cloudsales-app-icon-official-v4.png" in s
p.write_text(s)
print('commercial release v6 patched')
