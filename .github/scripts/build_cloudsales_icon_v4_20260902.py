from pathlib import Path
from PIL import Image
import base64, io, json, re, hashlib

ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'web'
AS=WEB/'assets'
PARTS=AS/'icon-v4-source-parts'
encoded=''.join((PARTS/f'part-{i:02d}.b64').read_text().strip() for i in range(4))
assert len(encoded)==13912, len(encoded)
raw=base64.b64decode(encoded, validate=True)
assert hashlib.sha256(raw).hexdigest()=='adfcf827665adc949bde470b890e92cd78f27872794887f2b8eafeb91152ca76'
im=Image.open(io.BytesIO(raw)).convert('RGB')
if im.size!=(512,512):
    im=im.resize((512,512),Image.Resampling.LANCZOS)
out512=AS/'cloudsales-app-icon-official-v4.png'
out192=AS/'cloudsales-app-icon-official-v4-192.png'
im.save(out512,'PNG',optimize=True)
im.resize((192,192),Image.Resampling.LANCZOS).save(out192,'PNG',optimize=True)

# New physical icon paths so Android/WebAPK cannot reuse the old immutable asset.
m=WEB/'manifest.webmanifest'
data=json.loads(m.read_text())
data['icons']=[
 {'src':'/cloudsales-app-icon-official-v4-192.png?v=2026090207','sizes':'192x192','type':'image/png','purpose':'any'},
 {'src':'/cloudsales-app-icon-official-v4.png?v=2026090207','sizes':'512x512','type':'image/png','purpose':'any'},
 {'src':'/cloudsales-app-icon-official-v4.png?v=2026090207','sizes':'512x512','type':'image/png','purpose':'maskable'},
]
m.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

p=WEB/'pwa.html'; s=p.read_text()
s=re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/png" href="/cloudsales-app-icon-official-v4.png?v=2026090207">', s, count=1)
s=re.sub(r'<link rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="/cloudsales-app-icon-official-v4.png?v=2026090207">', s, count=1)
p.write_text(s)

sw=WEB/'sw.js'; x=sw.read_text()
x=re.sub(r"const CACHE='[^']+';", "const CACHE='cloudsales-pwa-2026.09.02.7';", x, count=1)
lines=x.splitlines()
for entry in ["  '/cloudsales-app-icon-official-v4.png',","  '/cloudsales-app-icon-official-v4-192.png',"]:
    if entry not in lines:
        try: idx=next(i for i,l in enumerate(lines) if "manifest.webmanifest" in l)
        except StopIteration: idx=5
        lines.insert(idx,entry)
x='\n'.join(lines)+'\n'
sw.write_text(x)

# Patch release source to serve the new physical icon names and mobile polish runtime.
f=ROOT/'supabase/functions/cloudflare-pwa-brand-release/index.ts'
r=f.read_text()
r=r.replace('const VERSION="2026.09.02.6";','const VERSION="2026.09.02.7";')
if '"/pwa-polish-runtime-v1.js",' not in r:
    r=r.replace('  "/native-shell-runtime-v1.js",','  "/native-shell-runtime-v1.js",\n  "/pwa-polish-runtime-v1.js",')
r=r.replace('cloudsales-favicon-official-v2.png','cloudsales-favicon-official-v4.png')
r=r.replace('cloudsales-app-icon-official-v2-192.png','cloudsales-app-icon-official-v4-192.png')
r=r.replace('cloudsales-app-icon-official-v2.png','cloudsales-app-icon-official-v4.png')
f.write_text(r)

assert out512.exists() and out192.exists()
assert 'official-v4' in m.read_text()
assert 'cloudsales-pwa-2026.09.02.7' in sw.read_text()
assert '/pwa-polish-runtime-v1.js' in f.read_text()
assert 'cloudsales-app-icon-official-v4.png' in f.read_text()
print('CloudSales icon v4 built from verified user-supplied source and production release patched')
