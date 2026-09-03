from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
html=ROOT/'web/commercial.html'
release=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'

h=html.read_text(encoding='utf-8')
h=re.sub(r'<script\s+src=["\']/commercial-brand-runtime-v2\.js(?:\?[^"\']*)?["\']\s*></script>','',h,flags=re.I)
html.write_text(h,encoding='utf-8')

s=release.read_text(encoding='utf-8')
# Do not inject the compatibility runtime into fresh HTML. Keep the Worker endpoint
# available because old cached documents can still request it safely.
s=re.sub(r"if\(!h\.includes\('/commercial-brand-runtime-v2\.js'\)\)h=h\.replace\('</body>',`<script src=\"/commercial-brand-runtime-v2\.js\?v=\$\{VERSION\}\"></script></body>`\);",'',s)
release.write_text(s,encoding='utf-8')

assert '/commercial-brand-runtime-v2.js?v=2026090206' not in h
assert "if(!h.includes('/commercial-brand-runtime-v2.js'))" not in s
assert "if(p==='/commercial-brand-runtime-v2.js')" in s
assert "no_obsolete_14_day_trial" in s
assert "root_premium_truth" in s
print('Legacy visual runtime removed from active CloudSales HTML; compatibility endpoint retained.')
