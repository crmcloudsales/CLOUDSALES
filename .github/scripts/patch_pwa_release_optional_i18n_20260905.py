from pathlib import Path
p=Path('supabase/functions/cloudflare-pwa-release-v12/index.ts')
s=p.read_text()
old='for(const lc of LOCALES){const raw=await text(`${RAW}/i18n/catalog-v1/${encodeURIComponent(lc)}.json`),parsed=JSON.parse(raw);if(parsed?.locale!==lc||!parsed?.pwa)throw new Error(`catalog_invalid_${lc}`);catalogs[lc]=raw}'
new='for(const lc of LOCALES){try{const raw=await text(`${RAW}/i18n/catalog-v1/${encodeURIComponent(lc)}.json`),parsed=JSON.parse(raw);if(parsed?.locale===lc&&parsed?.pwa)catalogs[lc]=raw}catch{}}'
if new not in s:
    if old not in s: raise SystemExit('locale block not found')
    s=s.replace(old,new,1)
p.write_text(s)
print('made optional legacy locale catalogs')
