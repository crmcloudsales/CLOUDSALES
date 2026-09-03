from pathlib import Path
import re

CANVAS='#08070D'; PURPLE='#2D0A4A'; PANEL='#121019'; RAISED='#17141F'; LINE='#37323F'; WHITE='#F3F4F8'; MUTED='#AAA7B2'; PINK='#F955B6'; VIOLET='#C13BE4'; LILAC='#F7D7EC'

pwa = Path('web/pwa.html')
s = pwa.read_text(encoding='utf-8')

# Repair malformed mobile/browser metadata and make the brand declaration explicit.
s = s.replace('<meta name="theme-color" content="#08080f"<meta name="color-scheme" content="dark">>', '<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="light dark">')
s = s.replace('<meta name="theme-color" content="#08080f"><meta name="color-scheme" content="dark">', '<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="light dark">')
s = s.replace('<meta name="theme-color" content="#08070D"<meta name="color-scheme" content="dark">>', '<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="light dark">')
s = s.replace('<html lang="en" class="cs-i18n-pending">', '<html lang="en" class="cs-i18n-pending cs-brand-pwa-v20260903">', 1)
if 'cs-brand-pwa-v20260903' not in s:
    s = s.replace('<html lang="en"', '<html lang="en" class="cs-brand-pwa-v20260903"', 1)

# Replace only known historical CloudSales UI palette values. Functional status colors
# (green/red/blue) and third-party provider colors are intentionally not touched.
repls = {
    '#08080f':'#08070D', '#080810':'#08070D', '#08080d':'#08070D',
    '#111119':'#121019', '#171721':'#17141F', '#2a2a38':'#37323F', '#9695a7':'#AAA7B2',
    '#8d5cff':'#C13BE4', '#8d47ff':'#C13BE4', '#805cff':'#C13BE4', '#6b5cff':'#C13BE4', '#bd2cff':'#C13BE4',
    '#ff3ca5':'#F955B6', '#ff4daf':'#F955B6', '#ff72bd':'#F955B6', '#ff2b9b':'#F955B6',
    '#39153f':'#2D0A4A', '#35143b':'#2D0A4A', '#4a1b50':'#2D0A4A', '#542252':'#2D0A4A', '#5d235f':'#2D0A4A', '#672563':'#2D0A4A', '#61256d':'#2D0A4A', '#54285d':'#2D0A4A',
    '#211525':'#17141F', '#251528':'#17141F', '#211425':'#17141F', '#2a1630':'#17141F', '#281526':'#17141F', '#201123':'#17141F', '#1d111b':'#17141F', '#221225':'#17141F', '#1d1320':'#17141F', '#211323':'#17141F',
}
for a,b in repls.items():
    s = s.replace(a,b).replace(a.upper(),b)

STYLE = r'''<style id="cs-pwa-brand-canonical-20260903">
/* CloudSales canonical PWA brand lock — same visual family as cloudsales.app. */
html.cs-brand-pwa-v20260903{
  --bg:#08070D!important;--panel:#121019!important;--p2:#17141F!important;--line:#37323F!important;
  --text:#F3F4F8!important;--muted:#AAA7B2!important;--pink:#F955B6!important;--vio:#C13BE4!important;
  color-scheme:dark!important;background:#08070D!important;forced-color-adjust:none!important;
}
html.cs-brand-pwa-v20260903 body{background:#08070D!important;color:#F3F4F8!important}
html.cs-brand-pwa-v20260903 body .auth,
html.cs-brand-pwa-v20260903 body .onboard{
  background:radial-gradient(760px 520px at 50% 12%,rgba(45,10,74,.74),rgba(45,10,74,.24) 42%,rgba(8,7,13,0) 73%),#08070D!important;
}
html.cs-brand-pwa-v20260903 body .authbox,
html.cs-brand-pwa-v20260903 body .onbox,
html.cs-brand-pwa-v20260903 body .card,
html.cs-brand-pwa-v20260903 body .health,
html.cs-brand-pwa-v20260903 body .provider,
html.cs-brand-pwa-v20260903 body .file,
html.cs-brand-pwa-v20260903 body .install,
html.cs-brand-pwa-v20260903 body .tablewrap,
html.cs-brand-pwa-v20260903 body .modalbox,
html.cs-brand-pwa-v20260903 body .cloudyPanel,
html.cs-brand-pwa-v20260903 body .stage,
html.cs-brand-pwa-v20260903 body .deal,
html.cs-brand-pwa-v20260903 body .csPanel3,
html.cs-brand-pwa-v20260903 body .csKpi3,
html.cs-brand-pwa-v20260903 body .wpStat,
html.cs-brand-pwa-v20260903 body .wpState{
  background:linear-gradient(180deg,rgba(18,16,25,.98),rgba(10,9,14,.99))!important;
  border-color:#37323F!important;color:#F3F4F8!important;
}
html.cs-brand-pwa-v20260903 body .topbar{
  background:rgba(8,7,13,.95)!important;border-bottom-color:rgba(249,85,182,.12)!important;
}
html.cs-brand-pwa-v20260903 body .sidebar{
  background:#0B0910!important;border-right-color:#27222D!important;
}
html.cs-brand-pwa-v20260903 body .bottomnav{
  background:rgba(12,9,17,.96)!important;border-color:#37323F!important;box-shadow:0 18px 60px rgba(0,0,0,.52)!important;
}
html.cs-brand-pwa-v20260903 body .bottomnav button.active,
html.cs-brand-pwa-v20260903 body .navbtn.active,
html.cs-brand-pwa-v20260903 body .navbtn:hover,
html.cs-brand-pwa-v20260903 body .tabs button.active,
html.cs-brand-pwa-v20260903 body .csWindowTabs button.active,
html.cs-brand-pwa-v20260903 body .csLeadWindowTabs button.active{
  background:#17141F!important;color:#F3F4F8!important;border-color:rgba(249,85,182,.38)!important;
}
html.cs-brand-pwa-v20260903 body .bottomnav .csCloudyNav{
  background:linear-gradient(135deg,#F955B6 0%,#ED4FC3 46%,#C13BE4 100%)!important;
  border-color:rgba(247,215,236,.44)!important;color:#fff!important;
  box-shadow:0 12px 34px rgba(249,85,182,.34),inset 0 1px 0 rgba(255,255,255,.18)!important;
}
html.cs-brand-pwa-v20260903 body .btn.primary,
html.cs-brand-pwa-v20260903 body .install-primary,
html.cs-brand-pwa-v20260903 body .csQ3 button:first-child{
  background:linear-gradient(135deg,#F955B6 0%,#ED4FC3 46%,#C13BE4 100%)!important;
  color:#fff!important;border-color:transparent!important;
  box-shadow:0 13px 36px rgba(249,85,182,.28),inset 0 1px 0 rgba(255,255,255,.16)!important;
}
html.cs-brand-pwa-v20260903 body .planpick.active{
  background:linear-gradient(145deg,rgba(45,10,74,.48),#17141F)!important;
  border-color:#F955B6!important;box-shadow:0 0 0 1px rgba(249,85,182,.14)!important;
}
html.cs-brand-pwa-v20260903 body .heroCard,
html.cs-brand-pwa-v20260903 body #page-home.csHomeWindowed .heroCard,
html.cs-brand-pwa-v20260903 body .affiliateHero,
html.cs-brand-pwa-v20260903 body .affiliateRefer,
html.cs-brand-pwa-v20260903 body .wpSettingsHero,
html.cs-brand-pwa-v20260903 body .csBrief3{
  background:
    radial-gradient(560px 310px at 100% 0,rgba(249,85,182,.10),rgba(45,10,74,.15) 42%,rgba(8,7,13,0) 72%),
    linear-gradient(145deg,rgba(45,10,74,.30),#121019 56%,#0B0910)!important;
  border-color:rgba(249,85,182,.18)!important;
}
html.cs-brand-pwa-v20260903 body .trialOnboard,
html.cs-brand-pwa-v20260903 body .affiliateHold,
html.cs-brand-pwa-v20260903 body .wpConnectHint{
  background:linear-gradient(135deg,rgba(45,10,74,.42),rgba(18,16,25,.98))!important;
  border-color:rgba(249,85,182,.22)!important;color:#EDE7EF!important;
}
html.cs-brand-pwa-v20260903 body .orb{
  background:radial-gradient(circle at 30% 25%,#F3F4F8 0 7%,#F7D7EC 15%,#F955B6 38%,#C13BE4 66%,#2D0A4A 100%)!important;
  box-shadow:0 0 28px rgba(249,85,182,.20)!important;
}
html.cs-brand-pwa-v20260903 body .cloudyBubble,
html.cs-brand-pwa-v20260903 body .msg.user{
  background:#17141F!important;border-color:rgba(249,85,182,.32)!important;
}
html.cs-brand-pwa-v20260903 body .field input:focus,
html.cs-brand-pwa-v20260903 body .field textarea:focus,
html.cs-brand-pwa-v20260903 body .field select:focus,
html.cs-brand-pwa-v20260903 body input:focus,
html.cs-brand-pwa-v20260903 body textarea:focus,
html.cs-brand-pwa-v20260903 body select:focus{
  border-color:#F955B6!important;box-shadow:0 0 0 3px rgba(249,85,182,.10)!important;outline:none!important;
}
html.cs-brand-pwa-v20260903 body :focus-visible{outline:2px solid #F955B6!important;outline-offset:2px!important}
html.cs-brand-pwa-v20260903 body .muted,
html.cs-brand-pwa-v20260903 body .metric span,
html.cs-brand-pwa-v20260903 body .sectionHead p,
html.cs-brand-pwa-v20260903 body .card p,
html.cs-brand-pwa-v20260903 body .provider p,
html.cs-brand-pwa-v20260903 body .file span,
html.cs-brand-pwa-v20260903 body .csSub3,
html.cs-brand-pwa-v20260903 body .wpStat span,
html.cs-brand-pwa-v20260903 body .wpState{color:#AAA7B2!important}
html.cs-brand-pwa-v20260903 body .trialPlanNote,
html.cs-brand-pwa-v20260903 body a[href*="usage-pricing"]{color:#F955B6!important}
html.cs-brand-pwa-v20260903 body .csTrack3 i,
html.cs-brand-pwa-v20260903 body .csBar3 b{
  background:linear-gradient(90deg,#C13BE4,#F955B6)!important;
}
html.cs-brand-pwa-v20260903 body .csLine3 svg path[stroke]{stroke:#F955B6!important}
@media (prefers-color-scheme:dark){
  html.cs-brand-pwa-v20260903,html.cs-brand-pwa-v20260903 body{background:#08070D!important;color:#F3F4F8!important}
}
</style>'''

if 'id="cs-pwa-brand-canonical-20260903"' not in s:
    pos = s.lower().rfind('</head>')
    if pos < 0: raise RuntimeError('pwa.html missing </head>')
    s = s[:pos] + STYLE + s[pos:]

pwa.write_text(s, encoding='utf-8')

# Align UI runtimes that inject brand accents after first paint. Keep functional
# success/error/info colors untouched.
files = [
    'web/install.js','web/native-shell-runtime-v1.js','web/pwa-polish-runtime-v1.js',
    'web/workspace-polish-runtime-v1.js','web/dashboard-runtime-v3.js',
    'web/sales-analytics-runtime-v1.js','web/contact-profile-runtime-v1.js',
    'web/ai-chat-runtime-v2.js','web/calendar-runtime-v1.js','web/meta-runtime-v1.js',
    'web/app-runtime-v14.js','web/cloudy-runtime-v3.js','web/works-runtime-v1.js',
    'web/ad-spend-runtime-v1.js','web/cloudy-executive-runtime-v1.js'
]
js_repls = {
    '#08080f':'#08070D','#080810':'#08070D','#08080d':'#08070D',
    '#111119':'#121019','#171721':'#17141F','#2a2a38':'#37323F','#9695a7':'#AAA7B2',
    '#8d5cff':'#C13BE4','#8d47ff':'#C13BE4','#805cff':'#C13BE4','#6b5cff':'#C13BE4','#bd2cff':'#C13BE4',
    '#ff3ca5':'#F955B6','#ff4daf':'#F955B6','#ff72bd':'#F955B6','#ff2b9b':'#F955B6',
    '#39153f':'#2D0A4A','#35143b':'#2D0A4A','#4a1b50':'#2D0A4A','#542252':'#2D0A4A','#5d235f':'#2D0A4A','#672563':'#2D0A4A','#61256d':'#2D0A4A','#54285d':'#2D0A4A',
    '#211525':'#17141F','#251528':'#17141F','#211425':'#17141F','#2a1630':'#17141F','#281526':'#17141F','#201123':'#17141F','#1d111b':'#17141F','#221225':'#17141F','#1d1320':'#17141F','#211323':'#17141F',
}
for fn in files:
    p=Path(fn)
    if not p.exists(): continue
    t=p.read_text(encoding='utf-8')
    for a,b in js_repls.items():
        t=t.replace(a,b).replace(a.upper(),b)
    p.write_text(t,encoding='utf-8')

# Bump the official PWA release so clients receive a new HTML/runtime version.
rel=Path('supabase/functions/cloudflare-pwa-brand-release/index.ts')
r=rel.read_text(encoding='utf-8')
r=r.replace('const VERSION="2026.09.02.7";', 'const VERSION="2026.09.03.2";')
if 'const VERSION="2026.09.03.2";' not in r:
    raise RuntimeError('PWA release version marker not found')
# Stronger smoke checks: verify the canonical brand marker and actual tokens are in the live root.
needle='const tests={release:root.status===200&&root.release===VERSION,'
if needle in r and 'canonical_brand:root.body.includes' not in r:
    r=r.replace(needle, 'const tests={canonical_brand:root.body.includes(\'cs-pwa-brand-canonical-20260903\')&&root.body.includes(\'#F955B6\')&&root.body.includes(\'#C13BE4\')&&root.body.includes(\'#08070D\'),theme_color:root.body.includes(\'<meta name="theme-color" content="#08070D">\')&&root.body.includes(\'<meta name="color-scheme" content="light dark">\'),release:root.status===200&&root.release===VERSION,',1)
rel.write_text(r,encoding='utf-8')

print('CloudSales PWA canonical branding applied to source and release guard.')
