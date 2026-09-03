from pathlib import Path
p=Path('web/commercial-brand-runtime-v2.js')
s=p.read_text()
s=s.replace("const LOGO='/assets/cloudsales-logo-official-v2.png?v=2026090206';","const LOGO='/cloudsales-logo-official-v2.png?v=2026090206';",1)
assert "const LOGO='/cloudsales-logo-official-v2.png?v=2026090206';" in s
p.write_text(s)
print('commercial logo route fixed')
