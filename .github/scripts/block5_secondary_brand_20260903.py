from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
FILES=[
 'web/academy.html','web/services.html','web/affiliate.html','web/terms.html','web/privacy.html','web/usage-pricing.html','web/commercial/domains-v2.html'
]
STYLE=r'''<style id="cs-secondary-brand-20260903">
:root{--cs-purple:#2D0A4A;--cs-pink:#F955B6;--cs-white:#F3F4F8;--cs-canvas:#08070D;--cs-panel:#121019;--cs-panel2:#17141F;--cs-line:#3B3442;--cs-muted:#B8B3BE;color-scheme:dark!important}
html,body{background-color:#08070D!important;color:#F3F4F8!important;color-scheme:dark!important;forced-color-adjust:none!important}body{background-image:radial-gradient(980px 540px at 56% -180px,rgba(45,10,74,.93),transparent 72%),radial-gradient(650px 420px at 104% 30%,rgba(249,85,182,.055),transparent 76%)!important;-webkit-font-smoothing:antialiased!important;text-rendering:optimizeLegibility!important}
.nav,.top{background:rgba(8,7,13,.90)!important;border-bottom:1px solid rgba(249,85,182,.11)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;box-shadow:0 14px 38px rgba(0,0,0,.15)!important}.ni,.navin{min-height:72px!important}.brand img,.brand.csOfficialLogo,.csOfficialLogo{height:38px!important;width:auto!important;max-width:195px!important;object-fit:contain!important}.brand.csLogoLink{display:flex!important;align-items:center!important}.links{gap:15px!important}.links>a:not(.btn){color:#C5C0CA!important}.links>a:not(.btn):hover{color:#fff!important}
.btn,.button{min-height:47px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid #403846!important;background:rgba(18,16,25,.88)!important;color:#F3F4F8!important;border-radius:999px!important;padding:12px 19px!important;font-weight:860!important;text-decoration:none!important;box-shadow:none!important}.btn.primary,.button.primary{background:linear-gradient(115deg,#F955B6 0%,#EC4CC5 44%,#D443D7 72%,#C13BE4 100%)!important;border:1px solid rgba(255,255,255,.10)!important;color:#fff!important;box-shadow:0 14px 38px rgba(249,85,182,.22)!important}.btn:hover,.button:hover{transform:translateY(-1px)!important;border-color:#5B4D61!important}
.hero{position:relative!important;padding-top:92px!important;padding-bottom:76px!important}.hero h1{color:#F3F4F8!important;-webkit-text-fill-color:#F3F4F8!important;text-wrap:balance!important}.hero h1 span,.grad{background:linear-gradient(90deg,#F3F4F8 0%,#F3B6DA 50%,#F955B6 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important}.hero p,.lead{color:#B8B3BE!important;line-height:1.62!important}.tag,.kicker,.badge{color:#F490CA!important;border-color:rgba(249,85,182,.22)!important}.section{border-top:1px solid rgba(255,255,255,.06)!important}.section h2{color:#F3F4F8!important;text-wrap:balance!important}
.card,.step,.panel,.li,.pill,.box,.call,.callout,.pricebox,.metric,.result,.purchase,.checkout,.afterpay,.helpbox,.sitebrief{border-color:rgba(255,255,255,.085)!important;background:linear-gradient(180deg,rgba(20,17,25,.92),rgba(10,9,14,.98))!important;box-shadow:none!important}.cards,.steps,.pillgrid,.portal,.products{gap:12px!important}.cards .card,.steps .step,.pillgrid .pill{transition:border-color .18s ease,background .18s ease,transform .18s ease}.cards .card:hover,.steps .step:hover,.pillgrid .pill:hover{border-color:rgba(249,85,182,.24)!important;background:linear-gradient(180deg,rgba(249,85,182,.035),rgba(10,9,14,.98))!important}.card p,.step p,.pill span,.li span,.fine,.note,.meta,p,li{color:#B8B3BE}.price{color:#F3F4F8!important}.n{background:linear-gradient(135deg,#F955B6,#C13BE4)!important;color:white!important}.big{color:#F955B6!important;text-shadow:0 0 52px rgba(249,85,182,.13)!important}
.input,.select,.textarea,.row input{background:#0B0A10!important;border-color:#3B3442!important;color:#F3F4F8!important}.input:focus,.select:focus,.textarea:focus,.row input:focus{border-color:rgba(249,85,182,.52)!important;outline:none!important}.free,.offerbar,.notice{background:linear-gradient(135deg,rgba(45,10,74,.34),rgba(17,14,21,.95))!important;border-color:rgba(249,85,182,.19)!important}.free strong,.offerbar b{color:#F8D9EB!important}.footer,.foot{background:#07060B!important;border-top-color:rgba(255,255,255,.07)!important;color:#8F8997!important}.footer a,.foot a{color:#C2BCC7!important}
main.wrap{max-width:940px!important}.top .brand{display:inline-flex!important;align-items:center!important}.top .brand img{height:38px!important;width:auto!important}.top+.wrap,main.wrap{padding-top:8px}.notice{border-radius:20px!important}.pricebox{border-radius:20px!important}
@media(max-width:800px){.hero{padding-top:64px!important;padding-bottom:58px!important}.hero h1{font-size:clamp(46px,13vw,64px)!important}.ni,.navin{min-height:64px!important}.brand img,.brand.csOfficialLogo,.csOfficialLogo{height:33px!important;max-width:165px!important}.cards,.steps,.pillgrid,.portal{grid-template-columns:1fr!important}.section{padding-top:70px!important;padding-bottom:70px!important}}
@media(forced-colors:active){.hero h1 span,.grad{background:none!important;color:#F955B6!important;-webkit-text-fill-color:#F955B6!important}}
</style>'''

def patch(path):
    s=path.read_text(encoding='utf-8')
    s=re.sub(r'<meta\s+name=["\']color-scheme["\']\s+content=["\'][^"\']*["\']\s*/?>','<meta name="color-scheme" content="dark">',s,count=1,flags=re.I)
    if 'name="color-scheme"' not in s:
        s=s.replace('</head>','<meta name="color-scheme" content="dark"></head>',1)
    if 'cs-secondary-brand-20260903' not in s:
        s=s.replace('</head>',STYLE+'</head>',1)
    # Replace old icon+wordmark nav with the canonical image asset when that exact legacy pattern is present.
    s=re.sub(r'<a class="brand" href="/">\s*<img src="/icon\.svg" alt="">\s*CloudSales\s*</a>',
             '<a class="brand csLogoLink" href="/" aria-label="CloudSales"><img class="csOfficialLogo" src="/assets/cloudsales-logo-official-v2.png" alt="CloudSales"></a>',s,flags=re.I)
    # Legal pages used a text imitation of the mark; use the actual official logo.
    s=re.sub(r'<a class="brand" href="/">Cloud<b>Sales</b></a>',
             '<a class="brand csLogoLink" href="/" aria-label="CloudSales"><img class="csOfficialLogo" src="/assets/cloudsales-logo-official-v2.png" alt="CloudSales"></a>',s,flags=re.I)
    # Domains: eliminate a raw.githubusercontent dependency for a brand-critical asset.
    s=s.replace('https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/assets/cloudsales-logo-official-v2.png','/assets/cloudsales-logo-official-v2.png')
    path.write_text(s,encoding='utf-8')

for f in FILES:
    p=ROOT/f
    if not p.exists(): raise SystemExit('missing '+f)
    patch(p)

for f in FILES:
    s=(ROOT/f).read_text(encoding='utf-8')
    assert 'cs-secondary-brand-20260903' in s,f
    assert '<meta name="color-scheme" content="dark">' in s,f
    assert '#2D0A4A' in s and '#F955B6' in s and '#F3F4F8' in s,f
assert 'raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/assets/cloudsales-logo-official-v2.png' not in (ROOT/'web/commercial/domains-v2.html').read_text(encoding='utf-8')
print('BLOCK5_SECONDARY_BRAND_OK')
