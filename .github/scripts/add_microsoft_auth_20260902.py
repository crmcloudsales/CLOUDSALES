from pathlib import Path

p = Path('web/auth-runtime-v2.js')
s = p.read_text()

s = s.replace("const VERSION = '2026.09.02.1';", "const VERSION = '2026.09.02.2';")

needle = "tabs.insertAdjacentElement('afterend',wrap); node('googleAuthBtn').onclick=startGoogleAuth; return wrap;"
if needle not in s:
    raise SystemExit('google binding marker not found')
s = s.replace(needle, "tabs.insertAdjacentElement('afterend',wrap); node('googleAuthBtn').onclick=startGoogleAuth; node('microsoftAuthBtn').onclick=startMicrosoftAuth; return wrap;", 1)

needle = "<span id=\"googleAuthLabel\">Continuar con Google</span></button><div style=\"display:flex;align-items:center;gap:10px;color:#777;font-size:10px\">"
button = "<span id=\"googleAuthLabel\">Continuar con Google</span></button><button id=\"microsoftAuthBtn\" type=\"button\" class=\"btn block\" style=\"display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;font-weight:850\"><span aria-hidden=\"true\" style=\"display:grid;grid-template-columns:repeat(2,7px);grid-template-rows:repeat(2,7px);gap:2px;width:16px;height:16px\"><i style=\"background:#f25022\"></i><i style=\"background:#7fba00\"></i><i style=\"background:#00a4ef\"></i><i style=\"background:#ffb900\"></i></span><span id=\"microsoftAuthLabel\">Continuar con Microsoft</span></button><div style=\"display:flex;align-items:center;gap:10px;color:#777;font-size:10px\">"
if needle not in s:
    raise SystemExit('google button marker not found')
s = s.replace(needle, button, 1)

needle = "  function ensureForgot() {"
ms = """  function startMicrosoftAuth(){
    const btn=node('microsoftAuthBtn'); if(btn){btn.disabled=true;const l=node('microsoftAuthLabel');if(l)l.textContent='Abriendo Microsoft…'}
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    location.assign(`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}`);
  }
"""
if 'function startMicrosoftAuth()' not in s:
    if needle not in s:
        raise SystemExit('ensureForgot marker not found')
    s = s.replace(needle, ms + needle, 1)

s = s.replace("message('Acceso con Google confirmado. Preparando CloudSales…',true)", "message('Acceso seguro confirmado. Preparando CloudSales…',true)", 1)

required = [
    'microsoftAuthBtn',
    'Continuar con Microsoft',
    'provider=azure',
    "encodeURIComponent('email')",
    'startMicrosoftAuth',
    "const VERSION = '2026.09.02.2';",
]
for marker in required:
    if marker not in s:
        raise SystemExit(f'missing marker: {marker}')

p.write_text(s)
print('Microsoft OAuth patch applied')
