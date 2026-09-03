from pathlib import Path

release = Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s = release.read_text(encoding='utf-8')
old = '<meta name=\\"color-scheme\\" content=\\"dark\\">'
new = '<meta name=\\"color-scheme\\" content=\\"light dark\\">'
if old in s:
    s = s.replace(old, new)
elif new not in s:
    raise SystemExit('release color-scheme smoke marker not found')
release.write_text(s, encoding='utf-8')
print('CloudSales production release color-scheme guard aligned to canonical UI')
