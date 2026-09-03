from pathlib import Path
import re

# commercial.html legacy/static Dynamics references
p=Path('web/commercial.html')
s=p.read_text()
s=s.replace(",'Dynamics 365':'microsoft.com'",'').replace("'Dynamics 365':'microsoft.com',",'')
s=s.replace(",['Dynamics 365','microsoft.com']",'').replace("['Dynamics 365','microsoft.com'],",'')
s=s.replace('<div class="crm">Dynamics 365</div>','')
s=s.replace('<div class="crm">Microsoft Dynamics 365</div>','')
s=s.replace(',Microsoft Dynamics 365','').replace('Microsoft Dynamics 365,','').replace(', Dynamics 365','').replace('Dynamics 365,','')
s=re.sub(r'<div class="crm"[^>]*>\s*(?:Microsoft\s+)?Dynamics\s*365\s*</div>','',s,flags=re.I)
p.write_text(s)

# v2 runtime array + obsolete SVG entry
p=Path('web/commercial-brand-runtime-v2.js')
s=p.read_text()
s=s.replace(",'Dynamics 365'",'').replace("'Dynamics 365',",'')
s=re.sub(r"\n\s*'Dynamics 365':'<svg[\s\S]*?</svg>',",'',s,count=1)
s=s.replace('Microsoft Dynamics 365,','').replace(', Microsoft Dynamics 365','')
p.write_text(s)

print('removed Dynamics 365 from commercial source, runtime, and static CRM grid')
