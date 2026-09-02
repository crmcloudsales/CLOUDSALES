from pathlib import Path
p=Path('web/auth-runtime-v2.js')
s=p.read_text()
s=s.replace("const VERSION = '2026.09.02.3';","const VERSION = '2026.09.02.4';",1)
old="""  function startGoogleAuth(){
    const btn=node('googleAuthBtn'); if(btn){btn.disabled=true;const l=node('googleAuthLabel');if(l)l.textContent='Abriendo Google…'}
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    location.assign(`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}&prompt=select_account`);
  }
  function startMicrosoftAuth(){
    const btn=node('microsoftAuthBtn'); if(btn){btn.disabled=true;const l=node('microsoftAuthLabel');if(l)l.textContent='Abriendo Microsoft…'}
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    location.assign(`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}&prompt=select_account`);
  }
"""
new="""  async function oauthProviderReady(provider){
    try{
      const r=await fetch('https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/settings',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)return null;
      const d=await r.json();
      return Boolean(d?.external?.[provider]);
    }catch{return null}
  }
  function resetOAuthButton(kind){
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
    if(btn)btn.disabled=false;if(label)label.textContent=isMs?'Continuar con Microsoft':'Continuar con Google';
  }
  async function startOAuth(kind){
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
    if(btn)btn.disabled=true;if(label)label.textContent=isMs?'Comprobando Microsoft…':'Comprobando Google…';
    const ready=await oauthProviderReady(kind);
    if(ready===false){
      resetOAuthButton(kind);
      message(`${isMs?'Microsoft':'Google'} todavía no está habilitado para acceso en CloudSales. Puedes entrar con email mientras terminamos la conexión.`,false);
      return;
    }
    if(label)label.textContent=isMs?'Abriendo Microsoft…':'Abriendo Google…';
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    const url=isMs
      ?`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}&prompt=select_account`
      :`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}&prompt=select_account`;
    location.assign(url);
  }
  function startGoogleAuth(){return startOAuth('google')}
  function startMicrosoftAuth(){return startOAuth('azure')}
"""
if old not in s: raise SystemExit('oauth functions not found')
s=s.replace(old,new,1)
for marker in ["oauthProviderReady","startOAuth('google')","startOAuth('azure')","2026.09.02.4"]:
    assert marker in s, marker
p.write_text(s)
print('oauth guard applied')
