from pathlib import Path

files=['web/commercial.html','web/domains.html','web/commercial/domains-v2.html','web/pwa.html']
for name in files:
    p=Path(name); s=p.read_text()
    s=s.replace('<html lang="es">','<html lang="en" class="cs-i18n-pending">',1)
    s=s.replace('<html lang="en">','<html lang="en" class="cs-i18n-pending">',1) if 'class="cs-i18n-pending"' not in s.split('>')[0] else s
    if 'cs-i18n-boot-20260902' not in s:
        boot='<style id="cs-i18n-boot-20260902">html.cs-i18n-pending body{visibility:hidden}</style><script id="cs-i18n-boot-20260902">setTimeout(()=>document.documentElement.classList.remove(\'cs-i18n-pending\'),1800)</script>'
        s=s.replace('</head>',boot+'</head>',1)
    p.write_text(s)

# Make commercial runtime reveal only after locale application.
p=Path('web/cloudsales-i18n-v1.js'); s=p.read_text()
needle="function apply(locale){document.documentElement.lang=locale;document.documentElement.dir=RTL.has(locale)?'rtl':'ltr';translateText(locale);meta(locale);mount(locale);document.documentElement.dataset.csLocale=locale;attrs(locale);applyTrialCopy(locale);window.dispatchEvent"
if needle in s:
    s=s.replace(needle,"function apply(locale){document.documentElement.lang=locale;document.documentElement.dir=RTL.has(locale)?'rtl':'ltr';translateText(locale);meta(locale);mount(locale);document.documentElement.dataset.csLocale=locale;attrs(locale);applyTrialCopy(locale);document.documentElement.classList.remove('cs-i18n-pending');window.dispatchEvent",1)
else:
    if "classList.remove('cs-i18n-pending')" not in s: raise SystemExit('commercial apply marker missing')
p.write_text(s)

# PWA runtime reveal after translation.
p=Path('web/pwa-i18n-runtime-v1.js'); s=p.read_text()
needle="window.dispatchEvent(new CustomEvent('cloudsales:locale',{detail:{locale:lc}}));return lc"
if needle in s:
    s=s.replace(needle,"document.documentElement.classList.remove('cs-i18n-pending');window.dispatchEvent(new CustomEvent('cloudsales:locale',{detail:{locale:lc}}));return lc",1)
elif "classList.remove('cs-i18n-pending')" not in s: raise SystemExit('pwa apply marker missing')
p.write_text(s)

# PWA title is English base.
p=Path('web/pwa.html'); s=p.read_text().replace('<title>CloudSales — Cloudy opera tu negocio</title>','<title>CloudSales — Cloudy runs your business</title>',1); p.write_text(s)

for name in files:
    s=Path(name).read_text()
    assert '<html lang="en" class="cs-i18n-pending">' in s, name
    assert 'cs-i18n-boot-20260902' in s, name
assert "classList.remove('cs-i18n-pending')" in Path('web/cloudsales-i18n-v1.js').read_text()
assert "classList.remove('cs-i18n-pending')" in Path('web/pwa-i18n-runtime-v1.js').read_text()
print('OK')
