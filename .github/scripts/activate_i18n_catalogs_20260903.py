from pathlib import Path
import re, json

LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja']

def must_replace(s, old, new, label):
    if old not in s:
        if new in s:
            return s
        raise SystemExit(f'missing marker: {label}')
    return s.replace(old,new,1)

# 1) PWA v1 may provide legacy partial dictionaries, but it must never silently
# fall back from a selected non-English language to English. Catalog v1 is the
# authoritative completion layer.
p=Path('web/pwa-i18n-runtime-v1.js'); s=p.read_text()
s=must_replace(s,"function tr(text,lc){if(lc==='es')return text;return (L[lc]||{})[text]||EN[text]||text}","function tr(text,lc){if(lc==='es')return text;if(lc==='en')return EN[text]||text;return (L[lc]||{})[text]||text}",'pwa english fallback')
p.write_text(s)

# 2) The brand guard is visual/canonical only. It must no longer hide content
# merely because the locale is not ES/EN; catalog v1 supplies all 11 languages.
p=Path('web/cloudsales-brand-language-guard-v1.js'); s=p.read_text()
pat=r"function unsupported\(\)\{[\s\S]*?\}\nfunction apply"
rep="function unsupported(){document.documentElement.dataset.csLanguageIntegrity='catalog-v1';document.documentElement.dataset.csBrandCanonical=VERSION;showWithheld()}\nfunction apply"
ns,n=re.subn(pat,rep,s,count=1)
if n!=1 and "dataset.csLanguageIntegrity='catalog-v1'" not in s: raise SystemExit('brand guard unsupported marker not found')
if n==1:s=ns
p.write_text(s)

# 3) Commercial release: ship the strict overlay + all 11 static catalogs in
# the same pinned Cloudflare Worker release.
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts'); s=p.read_text()
s=s.replace('VERSION="2026.09.03.10"','VERSION="2026.09.03.11"',1)
routes="ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing'];"
route_new="ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing'],I18N_LOCALES=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];"
s=must_replace(s,routes,route_new,'commercial locale list')

brand_tail="return h}\nasync function policy"
brand_new="if(!h.includes('/cloudsales-i18n-complete-v2.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-complete-v2.js?v=${VERSION}\"></script></body>`);return h}\nasync function policy"
s=must_replace(s,brand_tail,brand_new,'commercial overlay injection')

old_sig="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){"
new_sig="function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,complete:string,catalogs:Record<string,string>,cl:string,brandRuntime:string){"
s=must_replace(s,old_sig,new_sig,'worker signature')

old_const="I18N=${JSON.stringify(i18n)},CL=${JSON.stringify(cl)}"
new_const="I18N=${JSON.stringify(i18n)},COMPLETE=${JSON.stringify(complete)},CATALOGS=${JSON.stringify(catalogs)},CL=${JSON.stringify(cl)}"
s=must_replace(s,old_const,new_const,'worker catalog constants')

route_marker="if(p==='/robots.txt')return r(ROBOTS,'text/plain; charset=utf-8','public,max-age=3600');"
route_insert="if(p==='/cloudsales-i18n-complete-v2.js')return r(COMPLETE,'application/javascript; charset=utf-8','public,max-age=300');if(p.startsWith('/i18n/catalog-v1/')&&p.endsWith('.json')){const lc=decodeURIComponent(p.slice('/i18n/catalog-v1/'.length,-5)),x=CATALOGS[lc];return x?r(x,'application/json; charset=utf-8','public,max-age=3600,stale-while-revalidate=86400'):r('{\"error\":\"not_found\"}','application/json','no-store',{'x-robots-tag':'noindex'},null,404)}"+route_marker
s=must_replace(s,route_marker,route_insert,'worker catalog routes')

# Add the overlay source to the release inputs.
pat=r"(i18n=await txt\(`\$\{RAW\}/cloudsales-i18n-v1\.js`\)),"
if not re.search(pat,s):
    if "complete=await txt(`${RAW}/cloudsales-i18n-complete-v2.js`)" not in s: raise SystemExit('i18n source marker not found')
else:
    s=re.sub(pat,r"\1,complete=await txt(`${RAW}/cloudsales-i18n-complete-v2.js`),",s,count=1)

upload_marker=";result.upload=await upload(token,worker("
if upload_marker in s:
    validation=";const catalogs:Record<string,string>={};for(const lc of I18N_LOCALES){const raw=await txt(`${RAW}/i18n/catalog-v1/${encodeURIComponent(lc)}.json`),parsed=JSON.parse(raw);if(parsed?.locale!==lc||!parsed?.commercial||Object.keys(parsed.commercial).length<250)throw new Error(`catalog_invalid_${lc}`);catalogs[lc]=raw}"
    s=s.replace(upload_marker,validation+";result.upload=await upload(token,worker(",1)
elif "const catalogs:Record<string,string>={}" not in s: raise SystemExit('upload marker not found')

s=must_replace(s,"widget,i18n,b64(cl),brandRuntime","widget,i18n,complete,catalogs,b64(cl),brandRuntime",'worker call')

# Ensure source tests can detect the certified overlay.
if 'i18n_overlay_source:' not in s:
    s=s.replace("root_premium_truth:root.text.includes('Premium $147/mes · Incluye 2 usuarios')","root_premium_truth:root.text.includes('Premium $147/mes · Incluye 2 usuarios'),i18n_overlay_source:root.text.includes('/cloudsales-i18n-complete-v2.js?v='+VERSION)",1)
p.write_text(s)

# 4) Static catalog invariant before any activation commit.
base=Path('web/i18n/catalog-v1')
counts=None
for lc in LOCALES:
    f=base/f'{lc}.json'
    if not f.exists(): raise SystemExit(f'missing catalog {lc}')
    j=json.loads(f.read_text())
    if j.get('locale')!=lc or not isinstance(j.get('commercial'),dict) or not isinstance(j.get('pwa'),dict): raise SystemExit(f'invalid catalog {lc}')
    c=(len(j['commercial']),len(j['pwa']))
    if c[0]<250 or c[1]<100: raise SystemExit(f'catalog too small {lc} {c}')
    if counts is None: counts=c
    elif c!=counts: raise SystemExit(f'catalog count mismatch {lc} {c} != {counts}')
    if any(not str(v).strip() for v in j['commercial'].values()) or any(not str(v).strip() for v in j['pwa'].values()): raise SystemExit(f'blank translation {lc}')
print('I18N activation ready',counts)
