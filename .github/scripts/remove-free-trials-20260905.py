from pathlib import Path
import re

ROOT = Path('.')


def patch(path, fn):
    p = ROOT / path
    if not p.exists():
        return
    before = p.read_text(encoding='utf-8')
    after = fn(before)
    if after != before:
        p.write_text(after, encoding='utf-8')
        print('patched', path)


def story(s):
    reps = {
        "pricingLead:'Todos los planes incluyen 7 días de prueba. Elige el nivel que encaja hoy; Cloudy te ayuda a crecer sin obligarte a comprar una torre de herramientas desde el primer día.'": "pricingLead:'Elige el nivel que encaja hoy; Cloudy te ayuda a crecer sin obligarte a comprar una torre de herramientas desde el primer día.'",
        "finalKicker:'PRUÉBALO EN TU NEGOCIO'": "finalKicker:'ACTIVA CLOUDSALES EN TU NEGOCIO'",
        "finalTitle:'No compres otra promesa. Mira a Cloudy trabajar durante 7 días.'": "finalTitle:'Activa CloudSales y pon a Cloudy a trabajar.'",
        "finalLead:'Conecta tu operación, deja que Cloudy te muestre qué puede organizar, proteger y mejorar, y decide con datos si CloudSales merece quedarse.'": "finalLead:'Conecta tu operación y deja que Cloudy organice, proteja y mejore el trabajo que autorizas.'",
        "trial:'7 DÍAS CLOUDY GRATIS'": "activate:'ACTIVAR CLOUDSALES'",
        "pricingLead:'Every plan includes a 7-day trial. Choose the level that fits today; Cloudy helps you grow without forcing you to buy a tower of tools on day one.'": "pricingLead:'Choose the level that fits today; Cloudy helps you grow without forcing you to buy a tower of tools on day one.'",
        "finalKicker:'TRY IT IN YOUR BUSINESS'": "finalKicker:'ACTIVATE CLOUDSALES FOR YOUR BUSINESS'",
        "finalTitle:'Do not buy another promise. Watch Cloudy work for 7 days.'": "finalTitle:'Activate CloudSales and put Cloudy to work.'",
        "finalLead:'Connect your operation, let Cloudy show you what it can organize, protect and improve, and decide with real data whether CloudSales earns its place.'": "finalLead:'Connect your operation and let Cloudy organize, protect and improve the work you authorize.'",
        "trial:'7 DAYS OF CLOUDY FREE'": "activate:'ACTIVATE CLOUDSALES'",
        'x.trial': 'x.activate',
        'csTrial': 'csActivation',
        'csHeroTrial': 'csHeroActivation',
        'csFinalTrial': 'csFinalActivation',
        'data-cs-trial-button': 'data-cs-plan-button',
        "b.dataset.csTrialButton='1'": "b.dataset.csPlanButton='1'",
        "`PROBAR ${label} 7 DÍAS`": "`ELEGIR ${label}`",
        "`TRY ${label} FREE FOR 7 DAYS`": "`CHOOSE ${label}`",
    }
    for a,b in reps.items(): s=s.replace(a,b)
    return s


def commercial(s):
    s = re.sub(r'<div class="csPcTrial">.*?</div>', '', s)
    s = re.sub(r'<p class="csPcFine">Tu prueba gratuita dura 7 días\..*?</p>', '<p class="csPcFine">Tu acceso al plan comienza cuando el pago queda confirmado.</p>', s)
    s = re.sub(r'<div id="trialPricingBanner" class="trialBanner" data-trial-copy="pricing">.*?</div>', '', s)
    s = re.sub(r'<div class="trialMini" data-trial-copy="plan">.*?</div>', '', s)
    s = re.sub(r'<details><summary>¿CloudSales tiene prueba gratis\?</summary><p>.*?</p></details>', '<details><summary>¿Cuándo se cobra mi plan?</summary><p>La mensualidad se cobra al activar Basic, Pro o Premium. El acceso pagado se habilita según el estado confirmado del pago.</p></details>', s)
    s = re.sub(r'<div data-cs-trial-seo="1".*?</div>', '', s)
    s = re.sub(r'\.trialBanner\{[^}]*\}', '', s)
    s = re.sub(r'\.trialMini\{[^}]*\}', '', s)
    s = re.sub(r'\.trialCheckout\{[^}]*\}', '', s)
    s = s.replace('trialMini','billingMini').replace('trialBanner','billingBanner').replace('trialCheckout','billingCheckout')
    s = s.replace('csPcTrial','csPcStatus')
    return story(s)


def subscribe(s):
    s = re.sub(r'\.trialHero\{[^}]*\}', '', s)
    s = re.sub(r'\.trial\{[^}]*\}', '', s)
    s = re.sub(r'<div class="trialHero">.*?</div>', '', s)
    s = re.sub(r'<div class="trial">.*?</div>', '', s)
    s = s.replace('Empieza tus 7 días gratis.', 'Elige tu plan de CloudSales.')
    s = s.replace('/mes después de la prueba', '/mes')
    return s


def terms(s):
    s = s.replace('By creating an account, starting a trial or subscription,', 'By creating an account, starting a subscription,')
    s = s.replace('billing frequency, trial terms and any minimum commitment', 'billing frequency and any minimum commitment')
    s = re.sub(r'<h2>13\. Trials, introductory offers and promotions</h2><p>.*?</p>', '<h2>13. Promotions and discounts</h2><p>Any discount or promotion applies only if expressly shown at checkout or in a written offer. Unless a different paid billing arrangement is expressly stated, the subscription fee is due when the paid plan is activated. CloudSales subscriptions are paid from activation.</p>', s, flags=re.S)
    s = s.replace('CloudSales does not provide free trial periods.', 'CloudSales subscriptions are paid from activation.')
    return s


def stripe_fn(s):
    s = re.sub(r",trialDays=mode==='subscription'\?Math\.max\(0,Math\.min\(90,Number\(item\.metadata\?\.trial_days\|\|0\)\)\):0", '', s)
    s = s.replace(',trial_days:trialDays', '')
    s = s.replace(',trial:{enabled:trialDays>0,days:trialDays,auto_charge_after_trial:trialDays>0}', '')
    s = re.sub(r"if\(trialDays>0\)\{enc\(form,'subscription_data\[trial_period_days\]',trialDays\);enc\(form,'payment_method_collection','always'\);enc\(form,'metadata\[trial_days\]',trialDays\);enc\(form,'subscription_data\[metadata\]\[trial_days\]',trialDays\)\}", "enc(form,'payment_method_collection','always')", s)
    return s


def active_only(s):
    s=s.replace('["active", "trialing"]', '["active"]')
    s=s.replace('["active","trialing"]', '["active"]')
    s=s.replace("['active', 'trialing']", "['active']")
    s=s.replace("['active','trialing']", "['active']")
    return s

patch('web/commercial.html', commercial)
patch('web/commercial-sales-story-v1.js', story)
patch('web/subscribe.html', subscribe)
patch('web/terms.html', terms)
patch('supabase/functions/stripe-checkout-start/index.ts', stripe_fn)
patch('supabase/functions/highlevel-temp-bootstrap/index.ts', active_only)
patch('supabase/functions/cloudy-orchestrator/index.ts', active_only)
patch('supabase/functions/cloudy-core-command/index.ts', active_only)
patch('web/releases/2026.08.27.2.md', lambda s: s.replace('- No free trial CTA. Primary CTA is **Descargar la app**.', '- Primary CTA is **Descargar la app**.'))

phrase_replacements = [
    ('7-day free trial','paid subscription'),('7 day free trial','paid subscription'),('7-day trial','paid subscription'),
    ('7 days free','paid access'),('7 DAYS FREE','PAID ACCESS'),('7 DAYS OF CLOUDY FREE','ACTIVATE CLOUDSALES'),
    ('7 días de prueba gratis','suscripción de pago'),('7 días de prueba','suscripción de pago'),('7 días gratis','acceso de pago'),
    ('prueba gratuita','suscripción de pago'),('prueba gratis','suscripción de pago'),
]
for base in [Path('web'), Path('supabase/functions'), Path('config')]:
    if not base.exists(): continue
    for p in base.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in {'.html','.js','.ts','.json','.md','.yml','.yaml'}: continue
        try: s=p.read_text(encoding='utf-8')
        except Exception: continue
        t=s
        for a,b in phrase_replacements: t=t.replace(a,b)
        t=active_only(t)
        if t!=s:
            p.write_text(t,encoding='utf-8'); print('phrase-cleaned',p)

forbidden = re.compile(r'free\s+trial|prueba\s+gratis|prueba\s+gratuita|\btrial_days\b|\btrial_period_days\b|\btrial_ends_at\b|\btrial_started_at\b|\btrialing\b|auto_charge_after_trial', re.I)
remaining=[]
for base in [Path('web'),Path('supabase/functions'),Path('config')]:
    if not base.exists(): continue
    for p in base.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in {'.html','.js','.ts','.json','.md','.yml','.yaml'}: continue
        try:
            for i,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
                if forbidden.search(line): remaining.append(f'{p}:{i}:{line[:240]}')
        except Exception: pass
if remaining:
    print('\nREMAINING_FREE_TRIAL_REFERENCES')
    print('\n'.join(remaining[:250]))
else:
    print('ZERO_ACTIVE_FREE_TRIAL_REFERENCES')
