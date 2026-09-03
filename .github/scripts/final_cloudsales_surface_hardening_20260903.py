from pathlib import Path
import re

ROOT=Path('.')

# 1) Every HTML surface that explicitly declares a dark CloudSales theme must also
# declare dark color-scheme so Samsung/Chrome/Safari do not auto-darken it again.
for p in (ROOT/'web').rglob('*.html'):
    s=p.read_text(encoding='utf-8')
    m=re.search(r'<meta\s+name=["\']theme-color["\']\s+content=["\']([^"\']+)["\']',s,re.I)
    if not m: continue
    color=m.group(1).strip().lower()
    if color in {'#fff','#ffffff','white'}:
        scheme='light'
    else:
        scheme='dark'
    tag=f'<meta name="color-scheme" content="{scheme}">'
    if 'name="color-scheme"' not in s and "name='color-scheme'" not in s:
        s=s.replace(m.group(0),m.group(0)+tag,1)
    if scheme=='dark' and 'data-cs-color-scheme-guard="1"' not in s:
        guard='<style data-cs-color-scheme-guard="1">html,body{color-scheme:dark!important;forced-color-adjust:none!important}@media(forced-colors:active){.grad{background:none!important;color:#F955B6!important;-webkit-text-fill-color:#F955B6!important}}</style>'
        s=s.replace('</head>',guard+'</head>',1)
    p.write_text(s,encoding='utf-8')

# 2) Only the two primary commercial routes participate in the 11-language
# preference. Secondary pages without a language selector keep their own complete
# source language instead of partially inheriting a stored locale.
p=ROOT/'web/cloudsales-i18n-v1.js'
s=p.read_text(encoding='utf-8')
old="function detect(){const q=new URLSearchParams(location.search).get('lang');if(q)return canonicalLocale(q);try{const s=localStorage.getItem(STORE);if(s)return canonicalLocale(s)}catch{}return 'en'}"
new="function detect(){const path=(location.pathname||'/').replace(/\\/+$/,'')||'/';const primary=path==='/'||path==='/crm';if(!primary)return canonicalLocale(document.documentElement.lang||'es');const q=new URLSearchParams(location.search).get('lang');if(q)return canonicalLocale(q);try{const s=localStorage.getItem(STORE);if(s)return canonicalLocale(s)}catch{}return canonicalLocale(document.documentElement.lang||'en')}"
if old not in s:
    raise SystemExit('i18n detect needle not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 3) Source guards.
for rel in ['commercial.html','academy.html','services.html','affiliate.html','terms.html','privacy.html','commercial/domains-v2.html']:
    x=(ROOT/'web'/rel).read_text(encoding='utf-8')
    assert 'name="color-scheme" content="dark"' in x, rel
assert "const primary=path==='/'||path==='/crm'" in (ROOT/'web/cloudsales-i18n-v1.js').read_text(encoding='utf-8')
print('FINAL_SURFACE_HARDENING_OK')
