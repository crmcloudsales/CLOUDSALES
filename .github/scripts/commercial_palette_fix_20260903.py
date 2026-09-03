from pathlib import Path
p=Path('web/commercial-brand-runtime-v2.js')
s=p.read_text()
s=s.replace("const VERSION='2026.09.02.7';","const VERSION='2026.09.03.1';",1)
s=s.replace("const LOGO='/cloudsales-logo-official-v2.png?v=2026090207';","const LOGO='/cloudsales-logo-official-v2.png?v=2026090301';",1)
s=s.replace("pink:'#ff2b9b',violet:'#8c5cff',blue:'#3f8cff'","pink:'#F52AB6',violet:'#C52DE8',blue:'#A878F4'",1)
s=s.replace("body{background-image:radial-gradient(900px 540px at 50% -180px,#351437 0,transparent 72%)!important}","body{background-image:radial-gradient(900px 540px at 50% -180px,#2b102f 0,transparent 72%)!important}",1)
s=s.replace("background:linear-gradient(90deg,#f8f7fb 0%,#ff2b9b 48%,#8c5cff 100%)!important","background:linear-gradient(90deg,#FAF9FC 0%,#E8C6F7 34%,#E59AE0 64%,#F078C8 100%)!important",1)
s=s.replace("background:linear-gradient(135deg,#ff2b9b 0%,#c52dca 54%,#8c5cff 100%)!important","background:linear-gradient(135deg,#F52AB6 0%,#D52BDA 55%,#C12DF0 100%)!important",1)
s=s.replace("box-shadow:0 14px 38px #ff2b9b33!important","box-shadow:0 14px 38px #F52AB638!important",1)
s=s.replace("border-color:#a9428f!important;box-shadow:0 0 0 1px #a9428f,0 30px 90px #ff2b9b1c!important","border-color:#D653BC!important;box-shadow:0 0 0 1px #D653BC,0 30px 90px #F52AB620!important",1)
s=s.replace("background:linear-gradient(90deg,#ff2b9b16,#8c5cff1a)!important","background:linear-gradient(90deg,#F52AB618,#C52DE81a)!important",1)
s=s.replace("border-color:#663a62!important","border-color:#674267!important",1)
s=s.replace("background:linear-gradient(90deg,#ff5faf,#ca75ff,#7ba8ff)!important","background:linear-gradient(90deg,#F78ACB,#E7B7F4,#F2A0D6)!important",1)
# Keep CRM SVGs and layout unchanged; this patch is palette-only.
for marker in ["2026.09.03.1","#E8C6F7","#F078C8","#F52AB6","#C12DF0"]:
    if marker not in s: raise SystemExit('missing '+marker)
p.write_text(s)
print('commercial palette corrected')
