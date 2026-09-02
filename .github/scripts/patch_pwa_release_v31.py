from pathlib import Path
p=Path('supabase/functions/cloudflare-pwa-brand-release/index.ts')
s=p.read_text()
s=s.replace('const SERVICE="cloudsales-pwa-v30";','const SERVICE="cloudsales-pwa-v31";')
s=s.replace('const VERSION="2026.09.01.5";','const VERSION="2026.09.02.6";')
s=s.replace('const COMMAND="cloudsales_pwa_meta_ads_oauth_v30";','const COMMAND="cloudsales_pwa_icon_safearea_v31";')
s=s.replace('await new Promise(r=>setTimeout(r,7000));','await new Promise(r=>setTimeout(r,15000));')
for marker in ['cloudsales-pwa-v31','2026.09.02.6','cloudsales_pwa_icon_safearea_v31','setTimeout(r,15000)']:
    if marker not in s: raise SystemExit('missing '+marker)
p.write_text(s)
print('patched release source to v31')
