from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
p = ROOT / 'supabase/functions/cloudflare-site-brand-release/index.ts'
s = p.read_text(encoding='utf-8')

s = s.replace('VERSION="2026.09.03.5"', 'VERSION="2026.09.03.6"')
s = s.replace('14\\s*天|7日間|14\\s*يو', '14\\s*天|14日間|14\\s*يو')
s = s.replace(
    'obsoleteSeat=/(?:individual subscription per person|Incluye 2 usuarios|Extra Premium seat|Asiento Premium adicional)/i',
    'obsoleteSeat=/(?:individual subscription per person|individual subscription per user|suscripci[oó]n individual por persona)/i'
)

assert 'VERSION="2026.09.03.6"' in s
assert '14\\s*天|14日間|14\\s*يو' in s
assert 'obsoleteSeat=/(?:individual subscription per person|individual subscription per user|suscripci[oó]n individual por persona)/i' in s
assert "root_premium_truth:root.text.includes('Premium $147/mes · Incluye 2 usuarios')" in s
assert 'no_obsolete_14_day_trial:lp.every' in s

p.write_text(s, encoding='utf-8')
print('CloudSales release smoke checks aligned with canonical commercial policy')
