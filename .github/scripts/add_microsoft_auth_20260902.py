# Deterministic one-time patch for CloudSales Microsoft OAuth and account chooser.
from pathlib import Path

p = Path('web/auth-runtime-v2.js')
s = p.read_text()

# Runtime may already be patched; make this script idempotent.
s = s.replace("const VERSION = '2026.09.02.1';", "const VERSION = '2026.09.02.3';")
s = s.replace("const VERSION = '2026.09.02.2';", "const VERSION = '2026.09.02.3';")

if 'microsoftAuthBtn' not in s:
    needle = "tabs.insertAdjacentElement('afterend',wrap); node('googleAuthBtn').onclick=startGoogleAuth; return wrap;"
    if needle not in s:
        raise SystemExit('google binding marker not found')
    s = s.replace(needle, "tabs.insertAdjacentElement('afterend',wrap); node('googleAuthBtn').onclick=startGoogleAuth; node('microsoftAuthBtn').onclick=startMicrosoftAuth; return wrap;", 1)

    needle = "<span id=\"googleAuthLabel\">Continuar con Google</span></button><div style=\"display:flex;align-items:center;gap:10px;color:#777;font-size:10px\">"
    button = "<span id=\"googleAuthLabel\">Continuar con Google</span></button><button id=\"microsoftAuthBtn\" type=\"button\" class=\"btn block\" style=\"display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;font-weight:850\"><span aria-hidden=\"true\" style=\"display:grid;grid-template-columns:repeat(2,7px);grid-template-rows:repeat(2,7px);gap:2px;width:16px;height:16px\"><i style=\"background:#f25022\"></i><i style=\"background:#7fba00\"></i><i style=\"background:#00a4ef\"></i><i style=\"background:#ffb900\"></i></span><span id=\"microsoftAuthLabel\">Continuar con Microsoft</span></button><div style=\"display:flex;align-items:center;gap:10px;color:#777;font-size:10px\">"
    if needle not in s:
        raise SystemExit('google button marker not found')
    s = s.replace(needle, button, 1)

if 'function startMicrosoftAuth()' not in s:
    needle = "  function ensureForgot() {"
    ms = """  function startMicrosoftAuth(){
    const btn=node('microsoftAuthBtn'); if(btn){btn.disabled=true;const l=node('microsoftAuthLabel');if(l)l.textContent='Abriendo Microsoft…'}
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    location.assign(`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}&prompt=select_account`);
  }
"""
    if needle not in s:
        raise SystemExit('ensureForgot marker not found')
    s = s.replace(needle, ms + needle, 1)

# Always show the provider account chooser.
s = s.replace("provider=google&redirect_to=${encodeURIComponent(redirect)}`", "provider=google&redirect_to=${encodeURIComponent(redirect)}&prompt=select_account`")
s = s.replace("provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}`", "provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}&prompt=select_account`")

# Friendly OAuth error handling for cancelled/expired/provider failures.
if 'function consumeOAuthError()' not in s:
    marker = "  function oauthSessionFromHash(){"
    block = """  function consumeOAuthError(){
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    const code=h.get('error_code')||h.get('error')||'';
    const desc=h.get('error_description')||'';
    if(!code) return false;
    history.replaceState(null,'',location.pathname+location.search);
    const text=String(desc||code).replace(/\+/g,' ');
    if(/cancel|access_denied/i.test(text)) message('Inicio de sesión cancelado. Puedes elegir otra cuenta e intentarlo nuevamente.');
    else if(/expired|otp_expired/i.test(text)) message('El enlace de acceso expiró. Solicita uno nuevo e inténtalo nuevamente.');
    else message('No pudimos completar el acceso con ese proveedor. Elige otra cuenta o intenta nuevamente.');
    return true;
  }
"""
    if marker not in s:
        raise SystemExit('oauth session marker not found')
    s = s.replace(marker, block + marker, 1)

needle = "    syncUi();\n    if(oauthSessionFromHash()){consumeGoogleCallback();document.documentElement.dataset.authRuntime=VERSION;return true;}"
if needle in s:
    s = s.replace(needle, "    syncUi();\n    if(consumeOAuthError()){document.documentElement.dataset.authRuntime=VERSION;return true;}\n    if(oauthSessionFromHash()){consumeGoogleCallback();document.documentElement.dataset.authRuntime=VERSION;return true;}", 1)

s = s.replace("message('Acceso con Google confirmado. Preparando CloudSales…',true)", "message('Acceso seguro confirmado. Preparando CloudSales…',true)", 1)

required = [
    'microsoftAuthBtn',
    'Continuar con Microsoft',
    'provider=azure',
    "encodeURIComponent('email')",
    'startMicrosoftAuth',
    'prompt=select_account',
    'consumeOAuthError',
    "const VERSION = '2026.09.02.3';",
]
for marker in required:
    if marker not in s:
        raise SystemExit(f'missing marker: {marker}')

p.write_text(s)
print('Microsoft OAuth + account chooser patch applied')
