from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()
old="brandRuntime=await txt(`${RAW}/commercial-brand-runtime-v2.js`)"
new="brandRuntime=(await txt(`${RAW}/commercial-brand-runtime-v2.js`)).replace('/assets/cloudsales-logo-official-v2.png','/cloudsales-logo-official-v2.png')"
if old not in s:
    raise SystemExit('brandRuntime fetch anchor missing')
s=s.replace(old,new,1)
assert "replace('/assets/cloudsales-logo-official-v2.png','/cloudsales-logo-official-v2.png')" in s
p.write_text(s)
print('release runtime guard added')
