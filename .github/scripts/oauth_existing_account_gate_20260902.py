from pathlib import Path
p=Path('web/auth-runtime-v2.js')
s=p.read_text()
s=s.replace("const VERSION = '2026.09.02.4';","const VERSION = '2026.09.02.5';",1)
old="""  async function consumeGoogleCallback(){
    const s=oauthSessionFromHash(); if(!s) return false;
    try{history.replaceState(null,'',location.pathname+location.search);message('Acceso seguro confirmado. Preparando CloudSales…',true);await finishLogin({session:s});return true}catch(err){message(friendly(err));return false}
  }
"""
new="""  async function consumeGoogleCallback(){
    const s=oauthSessionFromHash(); if(!s) return false;
    const intent=localStorage.getItem('cs_oauth_intent')||'signin';
    localStorage.removeItem('cs_oauth_intent');
    try{
      history.replaceState(null,'',location.pathname+location.search);
      message('Acceso seguro confirmado. Preparando CloudSales…',true);
      await finishLogin({session:s});
      if(intent==='signin' && (typeof currentOrg==='undefined' || !currentOrg?.id)){
        try{clearSession?.()}catch{}
        try{if(typeof showAuth==='function')showAuth()}catch{}
        message('Esta cuenta no existe, intenta con otro método.');
        return false;
      }
      return true;
    }catch(err){message(friendly(err));return false}
  }
"""
if old not in s: raise SystemExit('consume callback marker not found')
s=s.replace(old,new,1)
old2="""  async function startOAuth(kind){
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
"""
new2="""  async function startOAuth(kind){
    const currentMode=typeof mode!=='undefined'?mode:'signin';
    localStorage.setItem('cs_oauth_intent',currentMode==='signup'?'signup':'signin');
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
"""
if old2 not in s: raise SystemExit('startOAuth marker not found')
s=s.replace(old2,new2,1)
for marker in ["cs_oauth_intent","Esta cuenta no existe, intenta con otro método.","2026.09.02.5"]:
    assert marker in s,marker
p.write_text(s)
print('oauth existing-account gate applied')
