from pathlib import Path
import re

ROOT=Path('.')
p=ROOT/'web/commercial.html'
s=p.read_text()

# Canonical favicon and full transparent CloudSales logo in commercial chrome.
s=re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/png" href="/assets/cloudsales-app-icon-official-v4.png?v=2026090206">', s, count=1)
# Header/footer brand images: full official transparent logo; runtime also enforces this.
s=re.sub(r'(<a class="brand"[^>]*>\s*<img )src="[^"]+"', r'\1src="/assets/cloudsales-logo-official-v2.png?v=2026090206"', s, count=1)
s=s.replace('<div class="brand"><img src="/icon.svg" alt=""><span>Cloud<b>Sales</b></span></div>', '<div class="brand"><img src="/assets/cloudsales-logo-official-v2.png?v=2026090206" alt="CloudSales"></div>')

# Move the CRM marquee from the bottom of main to immediately below the primary nav/header.
if '<section class="cs-crm-band"' in s:
    m=re.search(r'(<section class="cs-crm-band".*?</section>)(</main>)',s,flags=re.S)
    if m:
        band=m.group(1)
        s=s[:m.start(1)]+s[m.end(1):]
        if band not in s.split('</header>',1)[0]:
            s=s.replace('</header>', '</header>'+band, 1)

# Correct HighLevel casing in all rendered source variants.
s=re.sub(r'>HIGHLEVEL<', '>HighLevel<', s, flags=re.I)

# Wire brand/runtime after the localization runtime so it can normalize translated content too.
tag='<script src="/commercial-brand-runtime-v2.js?v=2026090206"></script>'
if tag not in s:
    s=s.replace('</body>', tag+'</body>', 1)

p.write_text(s)

# Eliminate stale 14-day trial copy from CloudSales-owned commercial surfaces, excluding tenant/client pages.
files=[]
for pat in ('web/*.html','web/*.js','web/commercial/*.html','web/commercial/*.js'):
    files += list(ROOT.glob(pat))
files=list(dict.fromkeys(files))
subs=[
    (re.compile(r'14[-\s]?day free trial',re.I),'7-day free trial'),
    (re.compile(r'14\s+days\s+free',re.I),'7 days free'),
    (re.compile(r'14[-\s]?day trial',re.I),'7-day trial'),
    (re.compile(r'14\s+d[ií]as\s+de\s+prueba\s+gratis',re.I),'7 días de prueba gratis'),
    (re.compile(r'14\s+d[ií]as\s+gratis',re.I),'7 días gratis'),
    (re.compile(r'prueba\s+gratis\s+de\s+14\s+d[ií]as',re.I),'prueba gratis de 7 días'),
]
for f in files:
    if '/clients/' in str(f).replace('\\','/'):
        continue
    try: x=f.read_text()
    except UnicodeDecodeError: continue
    y=x
    for rx,repl in subs: y=rx.sub(repl,y)
    if y!=x: f.write_text(y)

# Also normalize stale copy in the commercial Cloudflare renderer itself.
cf=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'
if cf.exists():
    x=cf.read_text()
    for rx,repl in subs: x=rx.sub(repl,x)
    x=re.sub(r'VERSION="[^"]+"','VERSION="2026.09.02.6"',x,count=1)
    # Ensure the new runtime is injected into commercial HTML produced by the worker.
    if 'commercial-brand-runtime-v2.js' not in x:
        needle="if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);"
        if needle in x:
            x=x.replace(needle, needle+"if(!h.includes('/commercial-brand-runtime-v2.js'))h=h.replace('</body>',`<script src=\"/commercial-brand-runtime-v2.js?v=${VERSION}\"></script></body>`);")
    cf.write_text(x)

# Guards.
s=(ROOT/'web/commercial.html').read_text()
assert '/assets/cloudsales-logo-official-v2.png?v=2026090206' in s
assert 'commercial-brand-runtime-v2.js?v=2026090206' in s
assert s.find('cs-crm-band') < s.find('<main')
assert '>HIGHLEVEL<' not in s
assert not re.search(r'14[-\s]?day|14\s+d[ií]as',s,re.I)
print('commercial branding unified')
