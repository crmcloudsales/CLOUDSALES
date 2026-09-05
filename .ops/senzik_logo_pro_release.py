from pathlib import Path
import re

landing = Path('web/clients/senzik/landing-edge.html')
s = landing.read_text()

# Keep the exact Senzik vector geometry already proxied from the official site.
# If a raster experiment ever reached source, normalize it back to the vector-mask lockup.
s = re.sub(
    r'<img\s+class="brandMark"[^>]*>',
    '<span class="brandMark" aria-hidden="true"></span>',
    s,
    count=1,
)
if '<span class="brandMark" aria-hidden="true"></span>' not in s:
    raise SystemExit('Senzik brandMark vector placeholder not found')

s = re.sub(
    r'<!--\s*senzik-future-investment-v[^>]*-->',
    '<!-- senzik-future-investment-v5-user-gold-pro-vector -->',
    s,
    count=1,
)
if 'senzik-future-investment-v5-user-gold-pro-vector' not in s:
    s = s.replace(
        '</head>',
        '<!-- senzik-future-investment-v5-user-gold-pro-vector -->\n</head>',
        1,
    )

# Metallic gold treatment modeled on the user-approved logo image, but rendered
# through the official SVG mask so it stays transparent and perfectly sharp at any DPI.
override = '''
/* user-approved SENZIK gold PRO logo: transparent vector web treatment */
.brand{min-width:92px!important;display:flex!important;align-items:center!important}
.brandMark{
  display:block!important;
  width:88px!important;
  height:88px!important;
  background:linear-gradient(112deg,
    #6b3700 0%,
    #a85f00 8%,
    #e8a91f 16%,
    #ffe27a 23%,
    #fff3b0 28%,
    #cf8600 36%,
    #7d4100 44%,
    #b86e00 51%,
    #f6c84e 60%,
    #fff0a0 66%,
    #b56a00 75%,
    #764000 82%,
    #e7aa25 90%,
    #ffd85d 96%,
    #9a5500 100%)!important;
  background-size:180% 100%!important;
  background-position:52% 50%!important;
  -webkit-mask:url("/senzik-logo.svg") center/contain no-repeat!important;
  mask:url("/senzik-logo.svg") center/contain no-repeat!important;
  filter:drop-shadow(0 0 1px rgba(255,238,155,.75)) drop-shadow(0 0 14px rgba(218,171,49,.22))!important;
  transition:transform .3s ease,filter .3s ease!important;
}
.brand:hover .brandMark{
  transform:translateY(-1px) scale(1.015)!important;
  filter:drop-shadow(0 0 1px rgba(255,244,188,.9)) drop-shadow(0 0 20px rgba(235,190,62,.34))!important;
}
.navin{min-height:108px!important}
@media(max-width:760px){
  .brand{min-width:70px!important}
  .brandMark{width:70px!important;height:70px!important}
  .navin{min-height:88px!important}
}
'''

# Replace any earlier PRO override, otherwise append it at the end of the stylesheet
# so it wins over legacy sizing rules without touching the rest of the site.
s = re.sub(
    r'/\* user-approved SENZIK gold PRO logo:[\s\S]*?(?=</style>)',
    override,
    s,
    count=1,
)
if 'user-approved SENZIK gold PRO logo: transparent vector web treatment' not in s:
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
    'class="brandMark"',
    'mask:url("/senzik-logo.svg")',
    'senzik-future-investment-v5-user-gold-pro-vector',
]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit('Required Senzik contract missing: ' + ', '.join(missing))

landing.write_text(s)
print('Senzik gold PRO vector logo treatment applied successfully')
