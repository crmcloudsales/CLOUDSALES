from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'web'

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')

def must(s,*need):
    for x in need:
        assert x in s, f'missing: {x}'

def must_not(s,*bad):
    for x in bad:
        assert x not in s, f'forbidden: {x}'

commercial=text('web/commercial.html')
brand=text('web/commercial-brand-runtime-v2.js')
i18n=text('web/cloudsales-i18n-v1.js')
auth=text('web/auth-runtime-v2.js')
release=text('supabase/functions/cloudflare-site-brand-release/index.ts')

# Canonical visual/product contract.
must(commercial,'<meta name="color-scheme" content="dark">','#2D0A4A','#F955B6','#F3F4F8','/assets/marketing/cloudy-official.webp','/assets/marketing/agentcloud-official.webp','/commercial-brand-runtime-v2.js?v=20260903-block2')
must(brand,"const VERSION='2026.09.03.8'",'cs-ui-block2','#2D0A4A','#F955B6','#F3F4F8','cs-samsung-internet')
must_not(commercial,'Microsoft Dynamics 365','software development services','hire developers','contratar desarrolladores')
must_not(release,'Microsoft Dynamics 365',"'microsoft.com'")

# Commercial truth.
must(commercial,'$47 <small>USD / mes</small>','$97 <small>USD / mes</small>','$147 <small>USD / mes</small>','Premium $147/mes · Incluye 2 usuarios','7 días de prueba gratis')
for pat in [r'14\s*d[ií]as',r'14\s*days',r'14[-\s]day']:
    assert not re.search(pat,'\n'.join([commercial,i18n,auth]),re.I),pat
for item in ['plan_basic','plan_pro','plan_premium']:
    assert commercial.count(f'data-item="{item}"')==1,item

# Checkout/auth wiring.
for x in ['stripe-checkout-start','d.checkout_url','d.client_secret','d.publishable_key','affiliate_code:ref','patchHostedCheckout()','checkoutReturnBridge()']:
    must(i18n,x)
for x in ['checkout-status','claim-checkout',"plan_basic:'basic'","plan_pro:'pro'","plan_premium:'premium'",'prepareCheckoutUi','claimCheckoutIfReady']:
    must(auth,x)

# 11-language baseline + RTL behavior.
for lc in ['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja']:
    must(i18n,"['"+lc+"'")
must(i18n,"const RTL=new Set(['ar-AE','he'])",'dataset.csWritingMode','data-cs-fallback-lang')
must_not(i18n,'[data-cs-untranslated]{display:none!important}')
must(brand,'[dir="rtl"] .heroGrid')

# Secondary CloudSales routes use one visual system; CloudCo intentionally stays distinct.
secondary=['academy.html','services.html','affiliate.html','terms.html','privacy.html','usage-pricing.html','commercial/domains-v2.html']
for f in secondary:
    s=(WEB/f).read_text(encoding='utf-8')
    must(s,'cs-secondary-brand-20260903','<meta name="color-scheme" content="dark">','#2D0A4A','#F955B6','#F3F4F8')
    must_not(s,'raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/assets/cloudsales-logo-official-v2.png')
for f in ['academy.html','services.html']:
    s=(WEB/f).read_text(encoding='utf-8')
    must(s,'id="cs-secondary-checkout-20260903"','stripe-checkout-start','d.checkout_url','d.publishable_key','d.client_secret','affiliate_code:affiliateRef()')
for f in ['academy.html','services.html','affiliate.html','terms.html','privacy.html','usage-pricing.html']:
    must((WEB/f).read_text(encoding='utf-8'),'/assets/cloudsales-logo-official-v2.png')
cloudco=text('web/cloudco.html')
must(cloudco,'/cloudco-assets/cloudco-logo-official.webp','--blue:#1769ff','background:#ffffff')
must_not(cloudco,'cs-secondary-brand-20260903')

# Release source is exact-SHA capable and includes every public route.
must(release,"const sourceRef=/^[0-9a-f]{40}$/i.test(requestedRef)?requestedRef:'main'", "'/':'commercial.html'", "'/crm':'commercial.html'", "'/cloudco':'cloudco.html'", "'/academy':'academy.html'", "'/services':'services.html'", "'/affiliate':'affiliate.html'", "'/terms':'terms.html'", "'/privacy':'privacy.html'", "'/domains':'commercial/domains-v2.html'", "'/usage-pricing':'usage-pricing.html'")

print('BLOCK6_PREFLIGHT_SOURCE_OK')
