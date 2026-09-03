from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()
old="if(p==='/cloudsales-logo-official-v2.png')return img(LOGO);"
new="if(['/cloudsales-logo-official-v2.png','/assets/cloudsales-logo-official-v2.png'].includes(p))return img(LOGO);"
if old not in s and new not in s:
    raise SystemExit('logo route anchor missing')
if old in s:
    s=s.replace(old,new,1)
assert new in s
p.write_text(s)
print('official logo alias added')
