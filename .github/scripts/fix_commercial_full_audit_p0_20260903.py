from pathlib import Path
import re

# A commercial CTA must never resolve to a dead route. The plan buttons already
# open the accessible Stripe checkout, so hero/final trial CTAs should take the
# visitor to the canonical pricing selector.
for name in ['web/commercial.html','web/commercial-sales-story-v1.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace('/subscribe?plan=pro','#pricing')
    p.write_text(s,encoding='utf-8')

# Cross-browser rendering is part of the brand contract on every commercial
# subpage, not only the homepage. Preserve each page's own visual identity while
# explicitly declaring browser color-scheme support.
for name in [
    'web/cloudco.html','web/academy.html','web/services.html','web/affiliate.html',
    'web/terms.html','web/privacy.html','web/usage-pricing.html','web/commercial/domains-v2.html'
]:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    if re.search(r'<meta\s+name=["\']color-scheme["\'][^>]*>',s,re.I):
        s=re.sub(r'<meta\s+name=["\']color-scheme["\'][^>]*>', '<meta name="color-scheme" content="light dark">',s,count=1,flags=re.I)
    else:
        s=s.replace('</head>','<meta name="color-scheme" content="light dark"></head>',1)
    p.write_text(s,encoding='utf-8')

print('CloudSales commercial full-audit P0 source corrections applied')
