from pathlib import Path

SITEKEY='0x4AAAAAAEiK97f4nFyAgMYx'

# Persist Turnstile in the source landing and make its fallback submit send the token.
p=Path('web/clients/pennyworth/landing-edge.html')
s=p.read_text()
if 'challenges.cloudflare.com/turnstile/v0/api.js' not in s:
    s=s.replace('</head>',f'<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n</head>',1)
if 'class="cf-turnstile"' not in s:
    marker='<button class="submit" id="send" type="submit">SOLICITAR INFORMACIÓN</button>'
    if marker not in s:
        raise SystemExit('landing submit marker missing')
    widget=f'<div class="cf-turnstile" data-sitekey="{SITEKEY}" data-theme="dark" style="margin-top:14px"></div>'+marker
    s=s.replace(marker,widget,1)
if 'turnstile_token:turnstileToken' not in s:
    old='const ch=await challenge(id),a=qp();'
    if old not in s:
        raise SystemExit('landing challenge marker missing')
    s=s.replace(old,"const turnstileToken=String(new FormData(f).get('cf-turnstile-response')||'');if(!turnstileToken)throw Error('turnstile_required');const ch=await challenge(id),a=qp();",1)
    body='idempotency_key:id,challenge:ch,form_answers:'
    if body not in s:
        raise SystemExit('landing payload marker missing')
    s=s.replace(body,'idempotency_key:id,challenge:ch,turnstile_token:turnstileToken,form_answers:',1)
    s=s.replace("}catch{show('No pudimos validar la solicitud. Intenta nuevamente.',false)}finally{","}catch(err){show(err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);if(window.turnstile)turnstile.reset()}finally{",1)
s=s.replace('while(n<900000)','while(n<100000)')
p.write_text(s)

# Repair the Worker template used for present/future Pennyworth deployments.
p=Path('web/clients/pennyworth/worker-edge-template.mjs')
s=p.read_text()
if 'turnstile_token:turnstileToken' not in s:
    old='const ch=await challenge(id),a=qp();'
    if old not in s:
        raise SystemExit('worker client challenge marker missing')
    s=s.replace(old,"const turnstileToken=String(new FormData(form).get('cf-turnstile-response')||'');if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();",1)
    body='idempotency_key:id,challenge:ch,form_id:formId'
    if body not in s:
        raise SystemExit('worker client payload marker missing')
    s=s.replace(body,'idempotency_key:id,challenge:ch,turnstile_token:turnstileToken,form_id:formId',1)
    catch="show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false)"
    repl="show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);if(window.turnstile)turnstile.reset()"
    if catch not in s:
        raise SystemExit('worker client catch marker missing')
    s=s.replace(catch,repl,1)

# Critical mobile/shared-form fix: an already-rendered Turnstile iframe becomes invalid when the
# physical form card is moved into/out of the floating CHAT/WhatsApp panel. Own the lifecycle
# explicitly and re-render a fresh widget every time the form changes DOM location.
if 'pennyworth_turnstile_lifecycle_v2' not in s:
    css='.pwFormHost .submit.chat{background:#635BFF;color:#fff}.pwFormHost .submit.whatsapp{background:#25D366;color:#fff}'
    if css not in s:
        raise SystemExit('worker turnstile css anchor missing')
    s=s.replace(css,css+'.pwTurnstileMount{min-height:65px;margin-top:14px;display:flex;align-items:center}',1)

    anchor="function show(t,ok){status.className='status '+(ok?'ok':'err');status.textContent=t}function clearStatus(){status.className='status';status.textContent=''}"
    if anchor not in s:
        raise SystemExit('worker turnstile lifecycle anchor missing')
    lifecycle=anchor+"\nconst pennyworth_turnstile_lifecycle_v2='active',turnstileSeed=form.querySelector('.cf-turnstile'),TURNSTILE_SITEKEY=turnstileSeed?.dataset?.sitekey||'"+SITEKEY+"';let turnstileGeneration=0,turnstileWidget=null;function remountTurnstile(){const current=form.querySelector('.cf-turnstile,.pwTurnstileMount');if(!current)return;const fresh=document.createElement('div');fresh.className='pwTurnstileMount';fresh.dataset.pwTurnstile='1';current.replaceWith(fresh);const generation=++turnstileGeneration;turnstileWidget=null;const render=()=>{if(generation!==turnstileGeneration||!fresh.isConnected)return;if(!window.turnstile){setTimeout(render,120);return}try{turnstileWidget=window.turnstile.render(fresh,{sitekey:TURNSTILE_SITEKEY,theme:'dark',callback:()=>clearStatus(),'expired-callback':()=>show('La verificación expiró. Confirma nuevamente.',false),'error-callback':()=>show('No pudimos cargar la verificación de seguridad. Intenta nuevamente.',false)})}catch{setTimeout(render,180)}};render()}remountTurnstile();"
    s=s.replace(anchor,lifecycle,1)

    old_restore="function restoreForm(){if(anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);card.style.display='';host.style.display='';chatBox.classList.remove('active');if(title)title.textContent=original.title;if(sub)sub.textContent=original.sub;send.textContent=original.button;send.classList.remove('chat','whatsapp')}"
    new_restore="function restoreForm(){if(anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);card.style.display='';host.style.display='';chatBox.classList.remove('active');if(title)title.textContent=original.title;if(sub)sub.textContent=original.sub;send.textContent=original.button;send.classList.remove('chat','whatsapp');remountTurnstile()}"
    if old_restore not in s:
        raise SystemExit('worker restore form anchor missing')
    s=s.replace(old_restore,new_restore,1)

    move='host.appendChild(card);host.style.display='
    if move not in s:
        raise SystemExit('worker modal move anchor missing')
    s=s.replace(move,'host.appendChild(card);remountTurnstile();host.style.display=',1)

    success="}else{form.reset();show('Gracias. Tu solicitud fue recibida correctamente.',true)}}catch(err){"
    if success not in s:
        raise SystemExit('worker landing success anchor missing')
    s=s.replace(success,"}else{form.reset();remountTurnstile();show('Gracias. Tu solicitud fue recibida correctamente.',true)}}catch(err){",1)

    s=s.replace(";if(window.turnstile)turnstile.reset()",";remountTurnstile()",1)

s=s.replace('while(n<900000)','while(n<100000)')
s=s.replace('prefix:"000"','prefix:"00"')
s=s.replace('startsWith("000")','startsWith("00")')
s=s.replace('challenge:"pow-hmac"','challenge:"light-pow-hmac"')
p.write_text(s)

# Make the provisioner enforce the browser/server contract before future publishes.
p=Path('supabase/functions/pennyworth-provision/index.ts')
s=p.read_text()
anchor='function patchTurnstileTemplate(raw:string){let x=raw;'
if anchor not in s:
    raise SystemExit('provision patch function missing')
if 'turnstile_client_submit_missing' not in s:
    block='''function patchTurnstileTemplate(raw:string){let x=raw;
 if(!x.includes('turnstile_token:turnstileToken')){
  const clientChallenge='const ch=await challenge(id),a=qp();';
  if(!x.includes(clientChallenge))throw new Error('turnstile_client_challenge_marker_missing');
  x=x.replace(clientChallenge,"const turnstileToken=String(new FormData(form).get('cf-turnstile-response')||'');if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();");
  const clientPayload='idempotency_key:id,challenge:ch,form_id:formId';
  if(!x.includes(clientPayload))throw new Error('turnstile_client_payload_marker_missing');
  x=x.replace(clientPayload,'idempotency_key:id,challenge:ch,turnstile_token:turnstileToken,form_id:formId');
 }
 x=x.replaceAll('while(n<900000)','while(n<100000)').replace('prefix:"000"','prefix:"00"').replace('startsWith("000")','startsWith("00")');'''
    s=s.replace(anchor,block,1)
    needle="const code=rawTmpl.split('__HTML_JSON__').join(JSON.stringify(html)),challengeSecret=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID();"
    if needle not in s:
        raise SystemExit('provision code marker missing')
    s=s.replace(needle,"if(!rawTmpl.includes('turnstile_token:turnstileToken'))throw new Error('turnstile_client_submit_missing');\n  const code=rawTmpl.split('__HTML_JSON__').join(JSON.stringify(html)),challengeSecret=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID();",1)
    s=s.replace("anti_bot:'turnstile_pow_hmac_honeypot_rate_limit_server_validation'","anti_bot:'turnstile_honeypot_rate_limit_server_validation_light_pow'")

if "turnstile_lifecycle_missing" not in s:
    needle="if(!rawTmpl.includes('turnstile_token:turnstileToken'))throw new Error('turnstile_client_submit_missing');"
    if needle not in s:
        raise SystemExit('provision lifecycle assertion anchor missing')
    s=s.replace(needle,needle+"\n  if(!rawTmpl.includes('pennyworth_turnstile_lifecycle_v2')||!rawTmpl.includes('remountTurnstile'))throw new Error('turnstile_lifecycle_missing');",1)
p.write_text(s)

# Contract assertions: fail rather than silently publish a broken browser/server pair.
assert 'turnstile_token:turnstileToken' in Path('web/clients/pennyworth/landing-edge.html').read_text()
worker=Path('web/clients/pennyworth/worker-edge-template.mjs').read_text()
assert 'turnstile_token:turnstileToken' in worker
assert 'pennyworth_turnstile_lifecycle_v2' in worker
assert 'remountTurnstile' in worker
assert 'host.appendChild(card);remountTurnstile();' in worker
assert "send.classList.remove('chat','whatsapp');remountTurnstile()" in worker
assert 'prefix:"00"' in worker
assert 'while(n<900000)' not in worker
prov=Path('supabase/functions/pennyworth-provision/index.ts').read_text()
assert 'turnstile_client_submit_missing' in prov
assert 'turnstile_lifecycle_missing' in prov
