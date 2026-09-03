from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
html_path = ROOT / 'web' / 'commercial.html'
release_path = ROOT / 'supabase' / 'functions' / 'cloudflare-site-brand-release' / 'index.ts'

html = html_path.read_text(encoding='utf-8')

# Canonical dark scheme. CloudSales owns its dark visual system; do not invite browser auto-remapping.
html = re.sub(r'<meta\s+name=["\']color-scheme["\']\s+content=["\'][^"\']*["\']\s*/?>',
              '<meta name="color-scheme" content="dark">', html, count=1, flags=re.I)

# Use repository-owned, approved character assets instead of remote fallbacks.
html = html.replace('https://storage.googleapis.com/msgsndr/yj3Po5FyURrYozdJzG88/media/69829e15cf8ac04a787ed009.png',
                    '/assets/marketing/agentcloud-official.webp')
html = html.replace('https://storage.googleapis.com/msgsndr/yj3Po5FyURrYozdJzG88/media/6983a5b80a7fd17e424e3f2b.png',
                    '/assets/marketing/cloudy-official.webp')
html = html.replace(' onerror="this.style.display=\'none\'"', '')

runtime_tag = '<script src="/commercial-brand-runtime-v2.js?v=20260903-block2"></script>'
if runtime_tag not in html:
    if '</body>' not in html:
        raise SystemExit('commercial.html has no </body>')
    html = html.replace('</body>', runtime_tag + '</body>', 1)

# Keep only one runtime include if an earlier version was injected by another repair.
html = re.sub(r'(?:<script\s+src=["\']/commercial-brand-runtime-v2\.js(?:\?[^"\']*)?["\']></script>\s*)+',
              runtime_tag, html, count=1, flags=re.I)

html_path.write_text(html, encoding='utf-8')

release = release_path.read_text(encoding='utf-8')
release = re.sub(r'VERSION="2026\.09\.03\.\d+"', 'VERSION="2026.09.03.11"', release, count=1)
release = release.replace("['Microsoft Dynamics 365','microsoft.com'],", '')
release = release.replace("'microsoft.com',", '')
release = release.replace("'<meta name=\\\"color-scheme\\\" content=\\\"light dark\\\">'",
                          "'<meta name=\\\"color-scheme\\\" content=\\\"dark\\\">'")
release_path.write_text(release, encoding='utf-8')

# Assertions are intentionally strict so a partial transformation never becomes a deploy candidate.
final_html = html_path.read_text(encoding='utf-8')
final_release = release_path.read_text(encoding='utf-8')
assert runtime_tag in final_html
assert '<meta name="color-scheme" content="dark">' in final_html
assert '/assets/marketing/cloudy-official.webp' in final_html
assert '/assets/marketing/agentcloud-official.webp' in final_html
assert 'Microsoft Dynamics 365' not in final_release
assert "'microsoft.com'" not in final_release
assert 'VERSION="2026.09.03.11"' in final_release
assert 'content=\\\"dark\\\"' in final_release
print('BLOCK2_UI_SOURCE_OK')
