from pathlib import Path
p=Path('web/pwa.html')
s=p.read_text()
marker='</body>'
insert='''\n<script src="/cloudy-runtime-v3.js?v=20260904.1"></script>\n<script src="/cloudy-productivity-runtime-v1.js?v=20260904.1"></script>\n'''
if '/cloudy-productivity-runtime-v1.js' not in s:
    if marker not in s:
        raise SystemExit('pwa body marker missing')
    s=s.replace(marker,insert+marker,1)
p.write_text(s)
