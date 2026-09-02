from pathlib import Path

# Wire new polish runtime into the PWA and force a service-worker refresh.
p=Path('web/pwa.html'); s=p.read_text()
marker='<script src="/pwa-polish-runtime-v1.js?v=2026090205"></script>'
if marker not in s:
    s=s.replace('</body>', marker+'</body>', 1)
# favicon uses canonical PWA icon asset instead of legacy SVG
s=s.replace('<link rel="icon" href="/icon.svg"><link rel="apple-touch-icon" href="/icon.svg">','<link rel="icon" type="image/png" href="/cloudsales-app-icon-official-v2.png?v=2026090205"><link rel="apple-touch-icon" href="/cloudsales-app-icon-official-v2.png?v=2026090205">')
p.write_text(s)

sw=Path('web/sw.js'); x=sw.read_text()
x=x.replace("const CACHE='cloudsales-pwa-2026.09.02.1';","const CACHE='cloudsales-pwa-2026.09.02.5';")
if "'/pwa-polish-runtime-v1.js'," not in x:
    x=x.replace("  '/native-shell-runtime-v1.js',", "  '/native-shell-runtime-v1.js',\n  '/pwa-polish-runtime-v1.js',")
x=x.replace("native-shell|workspace-polish", "native-shell|pwa-polish|workspace-polish")
sw.write_text(x)

# Make contact-profile text meet the 14px minimum and expose a stable opener.
cp=Path('web/contact-profile-runtime-v1.js'); c=cp.read_text()
c=c.replace("const VERSION='2026.08.30.2';", "const VERSION='2026.09.02.5';")
# Override tiny labels without changing larger values.
if '.cpWho span{font-size:14px!important}' not in c:
    c=c.replace("`;document.head.appendChild(s)}", ".cpWho span,.cpMetric span,.cpNote small,.cpFile small,.cpStatus,.cpEmpty{font-size:14px!important}`;document.head.appendChild(s)}", 1)
if 'window.CloudSalesContactProfileOpen=open;' not in c:
    c=c.replace("function watch(){", "window.CloudSalesContactProfileOpen=open;\n  function watch(){", 1)
cp.write_text(c)

# Force provider logo decoration to run against Twenty as well through the provider catalog; UI runtime handles display.
print('pwa polish wiring applied')
