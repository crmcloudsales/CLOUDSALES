from pathlib import Path
p=Path('supabase/functions/cloudflare-site-brand-release/index.ts')
s=p.read_text(encoding='utf-8')
s=s.replace('VERSION="2026.09.03.8"','VERSION="2026.09.03.9"',1)
# The professionalizer was intentionally idempotent for HTML, but its first two
# workflow registrations both saw the sitemap insertion point. Collapse the
# duplicate same-origin CRM proxy if present.
needle="if(p==='/crm-logo'){"
first=s.find(needle)
second=s.find(needle,first+1) if first>=0 else -1
if first>=0 and second>=0:
    block=s[first:second]
    if s.startswith(block,second):
        s=s[:second]+s[second+len(block):]
# Fix the smoke assertion: usage-pricing must exist and /crm must not be indexed.
bad="sitemap:sitemapLive.status===200&&/application\\/xml/i.test(sitemapLive.type)&&sitemapLive.text.includes('<loc>https://cloudsales.app/usage-pricing</loc>')&&!sitemapLive.text.includes('<loc>https://cloudsales.app/usage-pricing</loc>')&&!sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>')"
good="sitemap:sitemapLive.status===200&&/application\\/xml/i.test(sitemapLive.type)&&sitemapLive.text.includes('<loc>https://cloudsales.app/usage-pricing</loc>')&&!sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>')"
if bad in s:s=s.replace(bad,good,1)
elif good not in s:raise SystemExit('sitemap smoke expression not found')
assert s.count(needle)==1, s.count(needle)
assert 'VERSION="2026.09.03.9"' in s
assert good in s and bad not in s
p.write_text(s,encoding='utf-8')
print('PROFESSIONAL_RELEASE_SMOKE_FIXED')
