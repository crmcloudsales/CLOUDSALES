# One-time deterministic PWA activation resilience patch.
from pathlib import Path

p=Path('web/pwa.html')
s=p.read_text()

old="""const d=await api('bootstrap-tenant',{name,slug:name,country_code:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',plan_key:selectedPlan,industry:industry.value});await api('legal-api',{organization_id:d.organization.id,action:'accept_required',accept:true});await loadState();showApp();renderAll()"""
new="""const d=await api('bootstrap-tenant',{name,slug:name,country_code:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',plan_key:selectedPlan,industry:industry.value});await api('legal-api',{organization_id:d.organization.id,action:'accept_required',accept:true});const ready=await loadState();if(!ready||!currentOrg?.id)throw Error('El workspace se creó, pero CloudSales todavía no pudo cargarlo. Reintenta en unos segundos.');showApp();renderAll()"""
if old not in s: raise SystemExit('createBiz marker not found')
s=s.replace(old,new,1)

old="""async function boot(){try{if(!session){const x=localStorage.getItem('cs_session');if(x)session=JSON.parse(x)}if(!session){showAuth();return}if(session.expires_at&&session.expires_at*1000<Date.now()+60000){if(!(await refresh()))return}const ok=await loadState();if(!ok)return;await Promise.all([loadWorkspace(),loadCatalog()]);showApp();renderAll();routeHash()}catch{clearSession();showAuth()}}"""
new="""async function boot(){try{if(!session){const x=localStorage.getItem('cs_session');if(x)session=JSON.parse(x)}if(!session){showAuth();return}if(session.expires_at&&session.expires_at*1000<Date.now()+60000){if(!(await refresh()))return}const ok=await loadState();if(!ok)return;await Promise.all([loadWorkspace(),loadCatalog()]);showApp();renderAll();routeHash()}catch(e){const code=String(e?.message||'');if(Number(e?.status)===401||code==='invalid_session'||code==='missing_authorization'){clearSession();showAuth();return}showAuth();authMsg.className='err';authMsg.innerHTML='CloudSales no pudo cargar tu workspace por un error temporal. <button id=\"retryBoot\" type=\"button\" class=\"btn small\" style=\"margin-top:8px\">Reintentar</button>';setTimeout(()=>{const b=document.getElementById('retryBoot');if(b)b.onclick=()=>boot()},0)}}"""
if old not in s: raise SystemExit('boot marker not found')
s=s.replace(old,new,1)

for marker in ['retryBoot','error temporal','const ready=await loadState()']:
    if marker not in s: raise SystemExit('missing '+marker)

p.write_text(s)
print('PWA activation resilience patch applied')
