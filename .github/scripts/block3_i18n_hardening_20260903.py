from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
i18n_path=ROOT/'web'/'cloudsales-i18n-v1.js'
runtime_path=ROOT/'web'/'commercial-brand-runtime-v2.js'
release_path=ROOT/'supabase'/'functions'/'cloudflare-site-brand-release'/'index.ts'

i=i18n_path.read_text(encoding='utf-8')
# Never make product content disappear because one translation key is missing.
i=i.replace('[data-cs-untranslated]{display:none!important}', '[data-cs-untranslated]{visibility:visible!important}')
old="const tr=locale==='en'?(dict[base]||EN_FULL[base]):dict[base];if(tr){n.nodeValue=n.__csOriginal.replace(base,tr);n.parentElement?.removeAttribute('data-cs-untranslated')}else{const tech=/^(?:CloudSales|Cloudy|AgentCloud|CRM|API|SEO|PWA|OAuth|WhatsApp|Meta|Google|TikTok|LinkedIn|YouTube|Stripe|HighLevel|Salesforce|HubSpot|Zoho CRM|Pipedrive|monday CRM|Freshsales|Close|Copper|Twenty|Basic|Pro|Premium|CloudCo|Junk Lead Firewall|WAF|Conversion API|Web Events|CRM Events|Data Signals|Attribution|Audiences|USD|Academy)$/i.test(base);if(!tech&&/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(base)&&base.split(/\\s+/).length>1)n.parentElement?.setAttribute('data-cs-untranslated',locale)}"
new="const tr=locale==='en'?(dict[base]||EN_FULL[base]||T.en?.[base]):(dict[base]||EN_FULL[base]||T.en?.[base]);if(tr){n.nodeValue=n.__csOriginal.replace(base,tr);n.parentElement?.removeAttribute('data-cs-untranslated');n.parentElement?.removeAttribute('data-cs-fallback-lang')}else{n.nodeValue=n.__csOriginal;n.parentElement?.removeAttribute('data-cs-untranslated');if(locale!=='es')n.parentElement?.setAttribute('data-cs-fallback-lang','es')}"
if old not in i:
    raise SystemExit('translateText target not found')
i=i.replace(old,new,1)
# Localized titles for all supported locales, not just ES vs EN.
old_meta="document.title=locale==='es'?'CloudSales — La IA trabaja por ti. Tú mantienes el control.':'CloudSales — AI works for you. You stay in control.'"
new_meta="const titles={es:'CloudSales — La IA trabaja por ti. Tú mantienes el control.',en:'CloudSales — AI works for you. You stay in control.',fr:'CloudSales — L’IA travaille pour vous. Vous gardez le contrôle.',it:'CloudSales — L’IA lavora per te. Tu mantieni il controllo.','pt-BR':'CloudSales — A IA trabalha por você. Você mantém o controle.',de:'CloudSales — KI arbeitet für Sie. Sie behalten die Kontrolle.','ar-AE':'CloudSales — الذكاء الاصطناعي يعمل من أجلك. أنت تحتفظ بالتحكم.',ru:'CloudSales — ИИ работает за вас. Вы сохраняете контроль.',he:'CloudSales — ה-AI עובד בשבילך. השליטה נשארת בידיים שלך.','zh-CN':'CloudSales — AI 为你工作。控制权始终在你手中。',ja:'CloudSales — AIがあなたのために働きます。主導権はあなたにあります。'};document.title=titles[locale]||titles.en"
if old_meta not in i:
    raise SystemExit('meta title target not found')
i=i.replace(old_meta,new_meta,1)
# Make fallback language explicit to assist accessibility tooling while preserving content.
i=i.replace("function apply(locale){document.documentElement.lang=locale;document.documentElement.dir=RTL.has(locale)?'rtl':'ltr';", "function apply(locale){document.documentElement.lang=locale;document.documentElement.dir=RTL.has(locale)?'rtl':'ltr';document.documentElement.dataset.csWritingMode=RTL.has(locale)?'rtl':'ltr';",1)
i18n_path.write_text(i,encoding='utf-8')

r=runtime_path.read_text(encoding='utf-8')
rtl_css="""
[dir=\"rtl\"] body{text-align:right}[dir=\"rtl\"] .navin,[dir=\"rtl\"] .actions,[dir=\"rtl\"] .flow,[dir=\"rtl\"] .included,[dir=\"rtl\"] .footlinks{direction:rtl}[dir=\"rtl\"] .heroGrid,[dir=\"rtl\"] .bigPeople,[dir=\"rtl\"] .csAgentShell,[dir=\"rtl\"] .aiWebGrid{direction:rtl}[dir=\"rtl\"] .appMock,[dir=\"rtl\"] .mockgrid,[dir=\"rtl\"] .kpis{direction:rtl}[dir=\"rtl\"] .csGrowthRow{direction:rtl}[dir=\"rtl\"] .plan ul{padding-left:0!important;padding-right:18px!important}[dir=\"rtl\"] .fire:before{left:auto!important;right:0!important}[dir=\"rtl\"] .faq details:nth-child(odd){padding-left:28px!important;padding-right:4px!important}[dir=\"rtl\"] .faq details:nth-child(even){padding-right:28px!important;padding-left:4px!important;border-left:0!important;border-right:1px solid rgba(255,255,255,.075)!important}
/* The long-form sales story currently has canonical ES/EN copy. Other locales use the fully localized core product page without exposing mixed-language narrative blocks. */
html:not([lang^=\"en\"]):not([lang^=\"es\"]) .csStorySection,html:not([lang^=\"en\"]):not([lang^=\"es\"]) .csFinal{display:none!important}
""".strip()
marker='@media(prefers-reduced-motion:reduce)'
if rtl_css not in r:
    if marker not in r: raise SystemExit('runtime media marker not found')
    r=r.replace(marker,rtl_css+'\n'+marker,1)
runtime_path.write_text(r,encoding='utf-8')

rel=release_path.read_text(encoding='utf-8')
rel=re.sub(r'VERSION="2026\.09\.03\.\d+"','VERSION="2026.09.03.12"',rel,count=1)
release_path.write_text(rel,encoding='utf-8')

# Strict validation
fi=i18n_path.read_text(encoding='utf-8'); fr=runtime_path.read_text(encoding='utf-8'); frel=release_path.read_text(encoding='utf-8')
assert "['es','ES','Español']" in fi and "['ja','日本語','日本語']" in fi
assert "const RTL=new Set(['ar-AE','he'])" in fi
assert '[data-cs-untranslated]{display:none!important}' not in fi
assert "dict[base]||EN_FULL[base]||T.en?.[base]" in fi
assert 'data-cs-fallback-lang' in fi and 'data-cs-writing-mode' not in fi.lower()
assert 'dataset.csWritingMode' in fi
assert '[dir=\"rtl\"] .heroGrid' in fr
assert 'html:not([lang^=\"en\"]):not([lang^=\"es\"]) .csStorySection' in fr
assert 'VERSION="2026.09.03.12"' in frel
print('BLOCK3_I18N_HARDENING_OK')
