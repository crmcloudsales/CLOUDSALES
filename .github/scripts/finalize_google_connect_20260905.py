from pathlib import Path

p=Path('web/connect-center-runtime-v1.js')
s=p.read_text(encoding='utf-8')

old_connect="""async function connect(provider,key=''){
  if(provider==='highlevel'&&document.getElementById('hlLocation')){legacyHighLevel(true);return}
  if(provider==='telnyx'){
    try{if(!connection('telnyx')&&!(await ensureLegal('telnyx')))return;openTelnyx(key==='whatsapp'?'whatsapp':'telnyx')}catch(e){alert(e?.message||String(e))}
    return;
  }
  try{
    if(typeof connectProvider==='function'){connectProvider(provider);return}
    if(typeof window.connectProvider==='function'){window.connectProvider(provider);return}
  }catch{}
  alert('Esta integración todavía necesita habilitar su flujo de autorización.');
}
"""
new_connect="""const GOOGLE_PROVIDERS=new Set(['google_workspace','youtube','google_business_profile','google_ads']);
const GOOGLE_WORKSPACE_CAPABILITIES=['drive','gmail','calendar','contacts','tasks','youtube','business_profile','analytics','search_console','tag_manager','merchant','photos'];

async function connect(provider,key=''){
  if(provider==='highlevel'&&document.getElementById('hlLocation')){legacyHighLevel(true);return}
  if(provider==='telnyx'){
    try{if(!connection('telnyx')&&!(await ensureLegal('telnyx')))return;openTelnyx(key==='whatsapp'?'whatsapp':'telnyx')}catch(e){alert(e?.message||String(e))}
    return;
  }
  if(GOOGLE_PROVIDERS.has(provider)){
    try{
      if(!(await ensureLegal(provider)))return;
      const body={organization_id:org().id,provider_key:provider};
      if(provider==='google_workspace')body.capabilities=GOOGLE_WORKSPACE_CAPABILITIES;
      const d=await api('connection-start-v4',body);
      if(!d?.authorization_url)throw new Error(d?.error||'google_authorization_url_missing');
      try{sessionStorage.setItem('cs_oauth_return_tab',activeTab)}catch{}
      location.assign(d.authorization_url);
    }catch(e){
      const code=String(e?.message||e||'');
      if(code.includes('google_ads_developer_token')||code.includes('google_ads_platform_not_configured'))alert('Google Ads necesita primero el Developer Token de CloudSales. Las demás integraciones de Google pueden conectarse ahora.');
      else alert('No pudimos iniciar la conexión con Google. '+code);
    }
    return;
  }
  try{
    if(typeof connectProvider==='function'){connectProvider(provider);return}
    if(typeof window.connectProvider==='function'){window.connectProvider(provider);return}
  }catch{}
  alert('Esta integración todavía necesita habilitar su flujo de autorización.');
}
"""
if new_connect not in s:
    if old_connect not in s: raise SystemExit('connect block not found')
    s=s.replace(old_connect,new_connect,1)

old_boot="""function boot(){
  css();relabel();account();render();
"""
new_boot="""async function completeOAuthCallback(attempt=0){
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

  if(providerError){clean();alert('La autorización fue cancelada o Google devolvió un error. Puedes intentar conectar de nuevo.');return}
  const organization=org();
  if((!organization?.id||typeof api!=='function')&&attempt<24){setTimeout(()=>completeOAuthCallback(attempt+1),250);return}
  if(!organization?.id||typeof api!=='function')return;

  const lock=`${provider}:${oauthAttempt}`;
  try{
    if(sessionStorage.getItem('cs_oauth_callback_lock')===lock)return;
    sessionStorage.setItem('cs_oauth_callback_lock',lock);
    await api('connection-complete-v4',{organization_id:organization.id,provider_key:provider,oauth_attempt_id:oauthAttempt,state:oauthState});
    clean();
    sessionStorage.removeItem('cs_oauth_callback_lock');
    try{if(typeof loadState==='function')await loadState()}catch{}
    try{if(typeof loadCatalog==='function')await loadCatalog()}catch{}
    try{activeTab=sessionStorage.getItem('cs_oauth_return_tab')||'other';sessionStorage.removeItem('cs_oauth_return_tab')}catch{activeTab='other'}
    try{if(typeof go==='function')go('connect')}catch{}
    render();
    alert(provider==='google_workspace'?'Google quedó conectado a CloudSales.':'Integración conectada correctamente.');
  }catch(e){
    sessionStorage.removeItem('cs_oauth_callback_lock');
    clean();
    alert('CloudSales recibió la autorización, pero no pudo terminar la conexión. Intenta conectar de nuevo.');
  }
}

function boot(){
  void completeOAuthCallback();
  css();relabel();account();render();
"""
if new_boot not in s:
    if old_boot not in s: raise SystemExit('boot block not found')
    s=s.replace(old_boot,new_boot,1)

p.write_text(s,encoding='utf-8')
print('Google Connect runtime finalized')
