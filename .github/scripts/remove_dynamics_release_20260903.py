from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text()
s=s.replace(",['Dynamics 365','microsoft.com']",'').replace("['Dynamics 365','microsoft.com'],",'')
s=s.replace(',Microsoft Dynamics 365','').replace('Microsoft Dynamics 365,','').replace(', Dynamics 365','').replace('Dynamics 365,','')
p.write_text(s)
print('removed Dynamics 365 from Cloudflare commercial release source')
