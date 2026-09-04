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
p.write_text(s)

# Contract assertions: fail rather than silently publish a broken browser/server pair.
assert 'turnstile_token:turnstileToken' in Path('web/clients/pennyworth/landing-edge.html').read_text()
worker=Path('web/clients/pennyworth/worker-edge-template.mjs').read_text()
assert 'turnstile_token:turnstileToken' in worker
assert 'prefix:"00"' in worker
assert 'while(n<900000)' not in worker
assert 'turnstile_client_submit_missing' in Path('supabase/functions/pennyworth-provision/index.ts').read_text()
