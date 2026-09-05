from pathlib import Path
import base64
import re

landing = Path('web/clients/senzik/landing-edge.html')
asset = Path('web/clients/senzik/assets/logo-gold-pro-192.webp.b64')

s = landing.read_text()
b64 = ''.join(asset.read_text().split())
raw = base64.b64decode(b64, validate=True)
if not (len(raw) > 15000 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'):
    raise SystemExit('Invalid optimized Senzik WebP asset')

data = 'data:image/webp;base64,' + b64
old = '<span class="brandMark" aria-hidden="true"></span>'
new = (
    '<img class="brandMark" src="' + data + '" width="88" height="88" '
    'alt="Senzik Residences" decoding="async" fetchpriority="high">'
)

if old in s:
    s = s.replace(old, new, 1)
elif 'data:image/webp;base64,' not in s:
    raise SystemExit('Senzik brandMark placeholder not found')

s = re.sub(
    r'<!--\s*senzik-future-investment-v[^>]*-->',
    '<!-- senzik-future-investment-v5-user-gold-pro-logo -->',
    s,
    count=1,
)
if 'senzik-future-investment-v5-user-gold-pro-logo' not in s:
    s = s.replace(
        '</head>',
        '<!-- senzik-future-investment-v5-user-gold-pro-logo -->\n</head>',
        1,
    )

override = '''
/* user-approved SENZIK gold PRO logo: transparent web asset */
.brand{min-width:92px!important;display:flex!important;align-items:center!important}
.brandMark{display:block!important;width:88px!important;height:88px!important;object-fit:contain!important;background:none!important;-webkit-mask:none!important;mask:none!important;filter:drop-shadow(0 0 14px rgba(218,171,49,.22))!important;transition:transform .3s ease,filter .3s ease!important}
.brand:hover .brandMark{transform:translateY(-1px) scale(1.015)!important;filter:drop-shadow(0 0 20px rgba(235,190,62,.34))!important}
.navin{min-height:108px!important}
@media(max-width:760px){.brand{min-width:70px!important}.brandMark{width:70px!important;height:70px!important}.navin{min-height:88px!important}}
'''
if 'user-approved SENZIK gold PRO logo: transparent web asset' not in s:
    s = s.replace('</style>', override + '</style>', 1)

forbidden = [
    'autorización municipal',
    'área privativa total',
    'área común total',
    '¿Cuándo buscas entrega?',
    'name="budget"',
    'Presupuesto</label>',
]
found = [item for item in forbidden if item in s]
if found:
    raise SystemExit('Forbidden legacy Senzik content remains: ' + ', '.join(found))

required = [
    'id="leadForm"',
    'name="country_state"',
    'Contenido del proyecto basado exclusivamente',
    'data:image/webp;base64,',
    'senzik-future-investment-v5-user-gold-pro-logo',
]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit('Required Senzik contract missing: ' + ', '.join(missing))

landing.write_text(s)
print('Senzik PRO logo applied; validated WebP bytes:', len(raw))
