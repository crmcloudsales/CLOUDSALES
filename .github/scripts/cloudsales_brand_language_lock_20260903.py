from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
web = ROOT / 'web'

runtime = web / 'commercial-brand-runtime-v2.js'
guard = web / 'cloudsales-brand-language-guard-v1.js'
commercial = web / 'commercial.html'
story = web / 'commercial-sales-story-v1.js'

START = '/* CLOUDSALES_CANONICAL_BRAND_LANGUAGE_GUARD_START */'
END = '/* CLOUDSALES_CANONICAL_BRAND_LANGUAGE_GUARD_END */'

# 1) Make the canonical guard part of an already-served production runtime.
# This avoids introducing a new public asset dependency in the Cloudflare release.
r = runtime.read_text(encoding='utf-8')
g = guard.read_text(encoding='utf-8').strip()
if START in r and END in r:
    before, rest = r.split(START, 1)
    _, after = rest.split(END, 1)
    r = before.rstrip() + '\n' + START + '\n' + g + '\n' + END + after
else:
    r = r.rstrip() + '\n' + START + '\n' + g + '\n' + END + '\n'
runtime.write_text(r, encoding='utf-8')

# 2) Keep the raw/base document internally one language (English).
# Localized visible copy is handled by the i18n/runtime layer.
h = commercial.read_text(encoding='utf-8')
h = h.replace('<meta name="theme-color" content="#07070d">', '<meta name="theme-color" content="#08070D">')
h = h.replace(
    '<meta property="og:description" content="Mejores leads. Menos junk. Más citas. Controla tu operación comercial desde tu celular con CloudSales y Cloudy.">',
    '<meta property="og:description" content="Better leads. Less junk. More appointments. Control your commercial operation from your phone with CloudSales and Cloudy.">'
)
commercial.write_text(h, encoding='utf-8')

# 3) Remove avoidable mixed-language wording from Spanish commercial story copy.
s = story.read_text(encoding='utf-8')
s = s.replace("setupKicker:'PARTE 1 · SETUP + PROTECCIÓN'", "setupKicker:'PARTE 1 · CONFIGURACIÓN + PROTECCIÓN'")
s = s.replace("['Atención y troubleshooting'", "['Atención y resolución de problemas'")
s = s.replace('Compara lead quality, costo por lead calificado', 'Compara calidad de prospectos, costo por prospecto calificado')
story.write_text(s, encoding='utf-8')

# Guards: fail rather than silently shipping a partial branding change.
assert '#2D0A4A' in runtime
assert '#F955B6' in runtime
assert '#F3F4F8' in runtime
assert "csLanguageIntegrity='strict'" in runtime
assert 'CLOUDSALES_CANONICAL_BRAND_LANGUAGE_GUARD_START' in runtime
assert 'PARTE 1 · SETUP + PROTECCIÓN' not in story
assert 'Atención y troubleshooting' not in story
assert '<meta name="theme-color" content="#08070D">' in commercial
assert 'Better leads. Less junk. More appointments.' in commercial
