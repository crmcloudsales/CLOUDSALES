from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'
s=p.read_text(encoding='utf-8')
needle="if(!q||q.command_type!==COMMAND||q.status!=='queued'||new Date(q.expires_at).getTime()<=Date.now())return json({error:'invalid_command'},403);"
insert=needle+"const requestedRef=String(q.input?.source_commit||'');const sourceRef=/^[0-9a-f]{40}$/i.test(requestedRef)?requestedRef:'main',RAW=`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/${sourceRef}/web`;"
if 'const requestedRef=String(q.input?.source_commit' not in s:
    if needle not in s:
        raise SystemExit('release command validation anchor not found')
    s=s.replace(needle,insert,1)

s=s.replace('VERSION="2026.09.03.6"','VERSION="2026.09.03.7"',1)

assert 'VERSION="2026.09.03.7"' in s
assert "const requestedRef=String(q.input?.source_commit||'')" in s
assert "RAW=`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/${sourceRef}/web`" in s
assert 'no_obsolete_14_day_trial' in s
assert 'root_canonical_brand' in s
p.write_text(s,encoding='utf-8')
print('CloudSales release source is now pinned to the exact requested commit SHA.')
