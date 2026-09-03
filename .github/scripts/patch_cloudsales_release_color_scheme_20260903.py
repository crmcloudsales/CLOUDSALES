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

# Keep the dormant finalizer guard consistent as well, so a future manual rerun
# cannot reject or roll back the Samsung-safe canonical source.
wf = Path('.github/workflows/finalize-cloudsales-commercial-20260903.yml')
w = wf.read_text(encoding='utf-8')
w_old = '<meta name="color-scheme" content="dark">'
w_new = '<meta name="color-scheme" content="light dark">'
if w_old in w:
    w = w.replace(w_old, w_new)
elif w_new not in w:
    raise SystemExit('finalizer color-scheme marker not found')
wf.write_text(w, encoding='utf-8')

print('CloudSales release/finalizer color-scheme guards aligned to canonical UI')
