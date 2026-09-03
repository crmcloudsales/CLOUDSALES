from pathlib import Path
import re

LOCALES = "['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja']"
SCRIPT = '<script src="/cloudsales-static-i18n-v2.js?v=2026.09.03.2" defer></script>'


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise RuntimeError(f'missing marker: {label}')


def inject_html(path, pwa=False):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if pwa:
        s = s.replace('<meta name="theme-color" content="#08080f"<meta name="color-scheme" content="dark">>', '<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="light dark">')
        s = s.replace('<meta name="theme-color" content="#08080f"><meta name="color-scheme" content="dark">', '<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="light dark">')
    if '/cloudsales-static-i18n-v2.js' not in s:
        if '</body>' not in s.lower():
            raise RuntimeError(f'no body close in {path}')
        idx = s.lower().rfind('</body>')
        s = s[:idx] + SCRIPT + s[idx:]
    p.write_text(s, encoding='utf-8')


for f in [
    'web/commercial.html','web/cloudco.html','web/academy.html','web/services.html',
    'web/affiliate.html','web/terms.html','web/privacy.html','web/commercial/domains-v2.html',
    'web/usage-pricing.html'
]:
    inject_html(f)
inject_html('web/pwa.html', pwa=True)

# Remove the last remaining silent English fallbacks from legacy runtimes.
p = Path('web/pwa-i18n-runtime-v1.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "function tr(text,lc){if(lc==='es')return text;return (L[lc]||{})[text]||EN[text]||text}",
    "function tr(text,lc){if(lc==='es')return text;if(lc==='en')return EN[text]||text;return (L[lc]||{})[text]||text}",
    'pwa strict fallback'
)
p.write_text(s, encoding='utf-8')

p = Path('web/cloudsales-i18n-v1.js')
s = p.read_text(encoding='utf-8')
old_set = "const localized=new Set(['/','/crm','/domains','/services','/academy','/affiliate'])"
new_set = "const localized=new Set(['/','/crm','/domains','/services','/academy','/affiliate','/cloudco','/terms','/privacy','/usage-pricing'])"
s = s.replace(old_set, new_set)
s = s.replace("tr=x=>locale==='es'?x:(d[x]||EN_FULL[x]||x)", "tr=x=>locale==='es'?x:(locale==='en'?(d[x]||EN_FULL[x]||x):(d[x]||x))")
p.write_text(s, encoding='utf-8')

# Commercial Cloudflare release helper: serve the certified runtime + catalogs.
p = Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('VERSION="2026.09.03.10"', 'VERSION="2026.09.03.11"')
if 'const I18N_LOCALES=' not in s:
    marker = "const U=Deno.env.get(\"SUPABASE_URL\")!,K=Deno.env.get(\"SUPABASE_SERVICE_ROLE_KEY\")!,db=createClient(U,K,{auth:{persistSession:false,autoRefreshToken:false}}),ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing'];"
    add = marker + f"\nconst I18N_LOCALES={LOCALES};\nasync function loadI18nCatalogs(raw:string,surface:'commercial'|'pwa'){{const out:Record<string,string>={{}};for(const lc of I18N_LOCALES){{const j=JSON.parse(await txt(`${{raw}}/i18n/catalog-v1/${{lc}}.json`));if(j?.locale!==lc||!j?.[surface])throw new Error(`i18n_invalid_${{surface}}_${{lc}}`);out[`/i18n/catalog-v1/${{lc}}.json`]=JSON.stringify({{version:j.version,locale:lc,[surface]:j[surface]}})}}out['/i18n/catalog-v1/manifest.json']=await txt(`${{raw}}/i18n/catalog-v1/manifest.json`);return out}}"
    s = replace_once(s, marker, add, 'site i18n helpers')
s = replace_once(
    s,
    "function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string){",
    "function worker(P:Record<string,string>,CSP:Record<string,string>,icon:string,logo:string,widget:string,i18n:string,cl:string,brandRuntime:string,staticI18n:string,catalogs:Record<string,string>){",
    'site worker signature'
)
s = replace_once(
    s,
    "BRAND_RUNTIME=${JSON.stringify(brandRuntime)},ROBOTS=",
    "BRAND_RUNTIME=${JSON.stringify(brandRuntime)},STATIC_I18N=${JSON.stringify(staticI18n)},CATALOGS=${JSON.stringify(catalogs)},ROBOTS=",
    'site worker constants'
)
s = replace_once(
    s,
    "if(p==='/cloudsales-i18n-v1.js')return r(I18N,'application/javascript','public,max-age=300');",
    "if(p==='/cloudsales-i18n-v1.js')return r(I18N,'application/javascript','public,max-age=300');if(p==='/cloudsales-static-i18n-v2.js')return r(STATIC_I18N,'application/javascript','public,max-age=300');if(CATALOGS[p])return r(CATALOGS[p],'application/json; charset=utf-8','public,max-age=300');",
    'site catalog routes'
)
if "cloudsales-static-i18n-v2.js?v=${VERSION}" not in s:
    s = replace_once(
        s,
        "if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);return h}",
        "if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);if(!h.includes('/cloudsales-static-i18n-v2.js'))h=h.replace('</body>',`<script src=\"/cloudsales-static-i18n-v2.js?v=${VERSION}\" defer></script></body>`);return h}",
        'site brand injection'
    )
# Replace the source-load/upload statement with catalog-aware version.
pattern = re.compile(r"const \[icon,logo\]=await Promise\.all\(\[bytes\(`\$\{RAW\}/assets/cloudsales-app-icon-official-v4\.png`\),bytes\(`\$\{RAW\}/assets/cloudsales-logo-official-v2\.png`\)\]\),widget=await txt\(`\$\{RAW\}/webchat\.js`\),i18n=await txt\(`\$\{RAW\}/cloudsales-i18n-v1\.js`\),brandRuntime=\(await txt\(`\$\{RAW\}/commercial-brand-runtime-v2\.js`\)\)\.replace\('/assets/cloudsales-logo-official-v2\.png','/cloudsales-logo-official-v2\.png'\),cl=await bytes\('https://cloudsales\.app/cloudco-assets/cloudco-logo-official\.webp'\),expected=\{icon:await hex\(icon\),logo:await hex\(logo\)\};result\.upload=await upload\(token,worker\(pages,csps,b64\(icon\),b64\(logo\),widget,i18n,b64\(cl\),brandRuntime\)\);")
replacement = "const [icon,logo]=await Promise.all([bytes(`${RAW}/assets/cloudsales-app-icon-official-v4.png`),bytes(`${RAW}/assets/cloudsales-logo-official-v2.png`)]),widget=await txt(`${RAW}/webchat.js`),i18n=await txt(`${RAW}/cloudsales-i18n-v1.js`),brandRuntime=(await txt(`${RAW}/commercial-brand-runtime-v2.js`)).replace('/assets/cloudsales-logo-official-v2.png','/cloudsales-logo-official-v2.png'),staticI18n=await txt(`${RAW}/cloudsales-static-i18n-v2.js`),catalogs=await loadI18nCatalogs(RAW,'commercial'),cl=await bytes('https://cloudsales.app/cloudco-assets/cloudco-logo-official.webp'),expected={icon:await hex(icon),logo:await hex(logo)};result.upload=await upload(token,worker(pages,csps,b64(icon),b64(logo),widget,i18n,b64(cl),brandRuntime,staticI18n,catalogs));"
if 'loadI18nCatalogs(RAW,\'commercial\')' not in s:
    s, n = pattern.subn(replacement, s, count=1)
    if n != 1:
        raise RuntimeError('site source/upload marker not found')
s = replace_once(
    s,
    "www=await tc('https://www.cloudsales.app/'),highlevel=",
    "www=await tc('https://www.cloudsales.app/'),staticI18nLive=await tc('https://cloudsales.app/cloudsales-static-i18n-v2.js'),catalogManifest=await tc('https://cloudsales.app/i18n/catalog-v1/manifest.json'),catalogFr=await tc('https://cloudsales.app/i18n/catalog-v1/fr.json'),highlevel=",
    'site smoke fetch'
)
s = replace_once(
    s,
    "const tests={release:",
    "const tests={static_i18n_runtime:staticI18nLive.status===200&&staticI18nLive.text.includes('cs-static-i18n-v2'),i18n_manifest:catalogManifest.status===200&&catalogManifest.text.includes('\\\"fr\\\"'),i18n_fr_catalog:catalogFr.status===200&&(catalogFr.text.includes('\\\"locale\\\":\\\"fr\\\"')||catalogFr.text.includes('\\\"locale\\\": \\\"fr\\\"')),all_routes_static_i18n:lp.every(x=>x.text.includes('/cloudsales-static-i18n-v2.js')),release:",
    'site smoke tests'
)
p.write_text(s, encoding='utf-8')

# PWA Cloudflare release helper: serve only the PWA half of every certified catalog.
p = Path('supabase/functions/cloudflare-pwa-brand-release/index.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('const VERSION="2026.09.02.7";', 'const VERSION="2026.09.03.1";')
if '"/cloudsales-static-i18n-v2.js"' not in s:
    s = replace_once(s, '  "/pwa-i18n-runtime-v1.js",', '  "/pwa-i18n-runtime-v1.js",\n  "/cloudsales-static-i18n-v2.js",', 'pwa runtime list')
if 'const I18N_LOCALES=' not in s:
    marker = 'const SERVED_SCRIPTS=["/install.js",...PAGE_RUNTIMES];'
    add = marker + f"\nconst I18N_LOCALES={LOCALES};\nasync function loadI18nCatalogs(raw:string){{const out:Record<string,string>={{}};for(const lc of I18N_LOCALES){{const j=JSON.parse(await text(`${{raw}}/i18n/catalog-v1/${{lc}}.json`));if(j?.locale!==lc||!j?.pwa)throw new Error(`pwa_i18n_invalid_${{lc}}`);out[`/i18n/catalog-v1/${{lc}}.json`]=JSON.stringify({{version:j.version,locale:lc,pwa:j.pwa}})}}out['/i18n/catalog-v1/manifest.json']=await text(`${{raw}}/i18n/catalog-v1/manifest.json`);return out}}"
    s = replace_once(s, marker, add, 'pwa i18n helpers')
s = replace_once(
    s,
    'function worker(page:string,manifest:string,sw:string,scripts:Record<string,string>,i512:string,i192:string,logo:string,policy:string){',
    'function worker(page:string,manifest:string,sw:string,scripts:Record<string,string>,i512:string,i192:string,logo:string,policy:string,catalogs:Record<string,string>){',
    'pwa worker signature'
)
s = replace_once(
    s,
    'LOGO=${JSON.stringify(logo)},CSP=',
    'LOGO=${JSON.stringify(logo)},CATALOGS=${JSON.stringify(catalogs)},CSP=',
    'pwa worker constants'
)
s = replace_once(
    s,
    "if(SCRIPTS[p])return r(SCRIPTS[p],'application/javascript; charset=utf-8','no-cache',false);",
    "if(SCRIPTS[p])return r(SCRIPTS[p],'application/javascript; charset=utf-8','no-cache',false);if(CATALOGS[p])return r(CATALOGS[p],'application/json; charset=utf-8','public,max-age=300',false);",
    'pwa catalog routes'
)
if 'catalogs=await loadI18nCatalogs(RAW)' not in s:
    s = replace_once(
        s,
        "const page=brand(await text(`${RAW}/pwa.html`)),policy=await csp(page),manifest=await text(`${RAW}/manifest.webmanifest`),sw=await text(`${RAW}/sw.js`),scripts:Record<string,string>={};for(const p of SERVED_SCRIPTS)scripts[p]=await text(`${RAW}${p}`);",
        "const page=brand(await text(`${RAW}/pwa.html`)),policy=await csp(page),manifest=await text(`${RAW}/manifest.webmanifest`),sw=await text(`${RAW}/sw.js`),scripts:Record<string,string>={};for(const p of SERVED_SCRIPTS)scripts[p]=await text(`${RAW}${p}`);const catalogs=await loadI18nCatalogs(RAW);",
        'pwa source load'
    )
s = replace_once(
    s,
    'worker(page,manifest,sw,scripts,b64(i512),b64(i192),b64(logo),policy)',
    'worker(page,manifest,sw,scripts,b64(i512),b64(i192),b64(logo),policy,catalogs)',
    'pwa worker call'
)
# Add smoke fetches and gates without disturbing the existing product checks.
s = replace_once(
    s,
    'contactProfile,swLive]=await Promise.all([',
    'contactProfile,staticI18nLive,catalogManifest,catalogFr,swLive]=await Promise.all([',
    'pwa smoke variable list'
)
s = replace_once(
    s,
    'check("/contact-profile-runtime-v1.js"),check("/sw.js")]);',
    'check("/contact-profile-runtime-v1.js"),check("/cloudsales-static-i18n-v2.js"),check("/i18n/catalog-v1/manifest.json"),check("/i18n/catalog-v1/fr.json"),check("/sw.js")]);',
    'pwa smoke promises'
)
s = replace_once(
    s,
    'const tests={release:',
    'const tests={static_i18n_runtime:staticI18nLive.status===200&&staticI18nLive.body.includes("cs-static-i18n-v2"),i18n_manifest:catalogManifest.status===200&&catalogManifest.body.includes("fr"),i18n_fr_catalog:catalogFr.status===200&&(catalogFr.body.includes("\\\"locale\\\":\\\"fr\\\"")||catalogFr.body.includes("\\\"locale\\\": \\\"fr\\\"")),root_static_i18n:root.body.includes(`/cloudsales-static-i18n-v2.js?v=${VERSION}`),release:',
    'pwa smoke tests'
)
p.write_text(s, encoding='utf-8')

print('Certified 11-language runtime wired to all commercial pages and PWA release sources.')
