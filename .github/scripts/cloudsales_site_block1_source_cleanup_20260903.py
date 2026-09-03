from pathlib import Path
import re

PATH = Path('web/commercial.html')
s = PATH.read_text(encoding='utf-8')
original = s

# 1) Canonical dark color scheme. Browser auto-darkening must not become a second brand runtime.
s = s.replace('<meta name="color-scheme" content="light dark">', '<meta name="color-scheme" content="dark">')

# 2) Retire the 2026-09-02 inline repair runtime. The canonical HTML must not rely on a legacy DOM repair layer.
s, removed_repair = re.subn(
    r'<script\s+id=["\']cs-commercial-repair-20260902-js["\'][^>]*>.*?</script>',
    '',
    s,
    flags=re.I | re.S,
)

# 3) Dynamics 365 was explicitly removed from every CloudSales commercial surface.
# Remove common HTML tiles/list items first, then clean residual literal references in this commercial source.
patterns = [
    r'<[^>]+(?:data-crm=["\'][^"\']*(?:Microsoft\s+)?Dynamics\s*365[^"\']*["\'])[^>]*>.*?</[^>]+>',
    r'<div\s+class=["\'][^"\']*crm[^"\']*["\'][^>]*>\s*(?:Microsoft\s+)?Dynamics\s*365\s*</div>',
    r'<span[^>]*>\s*(?:Microsoft\s+)?Dynamics\s*365\s*</span>',
]
for pat in patterns:
    s = re.sub(pat, '', s, flags=re.I | re.S)
s = re.sub(r'\s*(?:Microsoft\s+)?Dynamics\s*365\s*[,·|]?\s*', ' ', s, flags=re.I)

# 4) Remove any active reference to the retired visual branding runtime if an old tag is reintroduced.
s = re.sub(
    r'<script[^>]+src=["\'][^"\']*commercial-brand-runtime-v2\.js[^"\']*["\'][^>]*>\s*</script>',
    '',
    s,
    flags=re.I,
)

# 5) Developer-outsourcing is not a CloudSales commercial offer. Remove whole obvious commercial blocks
# carrying those phrases rather than silently leaving a CTA behind.
blocked = re.compile(
    r'(hire\s+developers?|developers?\s+for\s+hire|contratar\s+desarrolladores?|'
    r'software\s+development\s+services?|development\s+outsourcing|outsourcing\s+de\s+desarrollo)',
    re.I,
)
for tag in ('section', 'article', 'div', 'li'):
    block_re = re.compile(rf'<{tag}\b[^>]*>.*?</{tag}>', re.I | re.S)
    s = block_re.sub(lambda m: '' if blocked.search(re.sub(r'<[^>]+>', ' ', m.group(0))) else m.group(0), s)

# 6) Hard source invariants for this first block.
required = [
    '#2D0A4A', '#F955B6', '#F3F4F8',
    '$47', '$97', '$147',
    '7-day',
    'cloudsales-logo-official-v2.png',
    'cloudsales-app-icon-official-v4.png',
]
for token in required:
    if token not in s:
        raise SystemExit(f'BLOCK1_REQUIRED_TOKEN_MISSING: {token}')

for pat, label in [
    (r'\b(?:Microsoft\s+)?Dynamics\s*365\b', 'Dynamics 365'),
    (r'\b14\s*(?:day|days|d[ií]as|jours|giorni|Tage)\b', 'obsolete 14-day trial'),
    (r'hire\s+developers?|developers?\s+for\s+hire|contratar\s+desarrolladores?|software\s+development\s+services?|development\s+outsourcing', 'developer outsourcing'),
    (r'commercial-brand-runtime-v2\.js', 'retired visual runtime'),
    (r'id=["\']cs-commercial-repair-20260902-js["\']', 'legacy inline repair runtime'),
]:
    if re.search(pat, s, re.I):
        raise SystemExit(f'BLOCK1_FORBIDDEN_SOURCE: {label}')

# Premium public truth: 147 and 2 users must remain in the canonical source.
if not re.search(r'Premium[^\n]{0,300}\$147', s, re.I | re.S):
    raise SystemExit('BLOCK1_PREMIUM_147_NOT_FOUND')
if not re.search(r'(?:Premium[^\n]{0,900}(?:2\s+(?:users?|usuarios)))|(?:2\s+(?:users?|usuarios)[^\n]{0,900}Premium)', s, re.I | re.S):
    raise SystemExit('BLOCK1_PREMIUM_2_USERS_NOT_FOUND')

# Do not advertise the deprecated public extra-seat offer.
if re.search(r'(?:extra|additional|adicional)\s+(?:premium\s+)?(?:seat|user|usuario)[^\n<]{0,80}\$?47|\$47[^\n<]{0,80}(?:extra|additional|adicional)\s+(?:seat|user|usuario)', s, re.I):
    raise SystemExit('BLOCK1_DEPRECATED_EXTRA_SEAT_PUBLIC_COPY')

if s == original:
    print('BLOCK1_NO_CHANGES_NEEDED')
else:
    PATH.write_text(s, encoding='utf-8')
    print(f'BLOCK1_OK removed_legacy_repair={removed_repair} bytes_before={len(original)} bytes_after={len(s)}')
