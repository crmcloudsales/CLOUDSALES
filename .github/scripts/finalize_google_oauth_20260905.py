from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

# 1) Keep the installer on the currently locked CloudSales isotipo aliases.
replace_once(
    "web/install.js",
    "const ICON = '/cloudsales-app-icon-official-v2.png?v=2026082903';",
    "const ICON = '/icon-512.png?v=202609050933';",
)

# 2) Update the production gate so it validates the current canonical assets,
# not the deleted v2 icon generation.
gate = Path(".github/workflows/cloudsales-runtime-gate.yml")
text = gate.read_text(encoding="utf-8")
text = text.replace(
    "for(const p of ['web/assets/cloudsales-app-icon-official-v2.png','web/assets/cloudsales-app-icon-official-v2-192.png','web/assets/cloudsales-logo-official-v2.png'])",
    "for(const p of ['web/assets/cloudsales-isotipo-official-192.png','web/assets/cloudsales-isotipo-official-512.png','web/favicon.png'])",
)
text = text.replace(
    "if(!icons.some(x=>x.includes('/cloudsales-app-icon-official-v2-192.png'))||!icons.some(x=>x.includes('/cloudsales-app-icon-official-v2.png'))||icons.some(x=>/icon\\.svg/i.test(x)))throw new Error('manifest_icon_identity_invalid');",
    "if(!icons.some(x=>x.includes('/icon-192.png'))||!icons.some(x=>x.includes('/icon-512.png'))||icons.some(x=>/icon\\.svg/i.test(x)))throw new Error('manifest_icon_identity_invalid');",
)
text = text.replace(
    "must('web/install.js',['beforeinstallprompt','/cloudsales-app-icon-official-v2.png','promptInstall']);",
    "must('web/install.js',['beforeinstallprompt','/icon-512.png','promptInstall']);",
)
gate.write_text(text, encoding="utf-8")

# 3) Expose one unified Google connection and finish OAuth after the provider
# returns to the PWA. The callback relay never exposes the authorization code;
# it stores the code server-side and only returns state + attempt identifiers.
connect = Path("web/connect-center-runtime-v1.js")
text = connect.read_text(encoding="utf-8")
text = text.replace(
    "    items:[\n      ['whatsapp','WhatsApp','meta_whatsapp','whatsapp.com'],",
    "    items:[\n      ['google_workspace','Google Workspace','google_workspace','google.com'],\n      ['whatsapp','WhatsApp','meta_whatsapp','whatsapp.com'],",
    1,
)

marker = "function boot(){\n  css();relabel();account();render();"
callback = r'''async function completeOAuthCallback(attempt=0){
  let u;try{u=new URL(location.href)}catch{return}
  const oauthAttempt=u.searchParams.get('oauth_attempt_id')||'';
  const provider=u.searchParams.get('provider')||'';
  const oauthState=u.searchParams.get('state')||'';
  const providerError=u.searchParams.get('error')||'';
  if(!oauthAttempt||!provider||!oauthState)return;

  const clean=()=>{
    try{
      const next=new URL(location.href);
      ['oauth_attempt_id','provider','state','status','error'].forEach(k=>next.searchParams.delete(k));
      next.hash='connect';
      history.replaceState({},'',next.pathname+(next.search||'')+next.hash);
    }catch{}
  };

  if(providerError){
    clean();
    alert('La autorización fue cancelada o Google devolvió un error. Puedes intentar conectar de nuevo.');
    return;
  }

  const organization=org();
  if((!organization?.id||typeof api!=='function')&&attempt<20){
    setTimeout(()=>completeOAuthCallback(attempt+1),250);
    return;
  }
  if(!organization?.id||typeof api!=='function')return;

  const lock=`${provider}:${oauthAttempt}`;
  try{
    if(sessionStorage.getItem('cs_oauth_callback_lock')===lock)return;
    sessionStorage.setItem('cs_oauth_callback_lock',lock);
    await api('connection-complete-v4',{
      organization_id:organization.id,
      provider_key:provider,
      oauth_attempt_id:oauthAttempt,
      state:oauthState
    });
    clean();
    try{if(typeof loadState==='function')await loadState()}catch{}
    try{if(typeof loadCatalog==='function')await loadCatalog()}catch{}
    try{if(typeof go==='function')go('connect')}catch{}
    render();
    alert(provider==='google_workspace'?'Google quedó conectado a CloudSales.':'Integración conectada correctamente.');
  }catch(err){
    sessionStorage.removeItem('cs_oauth_callback_lock');
    clean();
    alert('CloudSales recibió la autorización, pero no pudo terminar la conexión. Intenta conectar de nuevo.');
  }
}

function boot(){
  void completeOAuthCallback();
  css();relabel();account();render();'''
if callback not in text:
    if marker not in text:
        raise SystemExit("connect-center boot marker not found")
    text = text.replace(marker, callback, 1)
connect.write_text(text, encoding="utf-8")

print("CloudSales final Google OAuth patch applied")
