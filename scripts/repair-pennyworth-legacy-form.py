from pathlib import Path

p=Path('web/clients/pennyworth/landing.html')
s=p.read_text()

# Keep the archived/noindex landing safe to republish: same Turnstile + signed light challenge contract.
s=s.replace('<meta name="theme-color" content="#0a0a0d"<meta name="color-scheme" content="dark">>','<meta name="theme-color" content="#0a0a0d"><meta name="color-scheme" content="dark">')

if 'async function challenge(id)' not in s:
    marker="f.onsubmit=async e=>{"
    helper="async function digest(v){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}async function challenge(id){const r=await fetch('/challenge?id='+encodeURIComponent(id),{cache:'no-store'}),c=await r.json();if(!r.ok)throw Error('challenge');for(let n=0;n<100000;n++){const h=await digest(id+'.'+c.nonce+'.'+c.ts+'.'+c.sig+'.'+n);if(h.startsWith(c.prefix||'00'))return{...c,n}}throw Error('challenge')}"
    if marker not in s:
        raise SystemExit('legacy submit marker missing')
    s=s.replace(marker,helper+marker,1)

old="try{const a=qp(),r=await fetch('/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({first_name:document.getElementById('first').value,last_name:document.getElementById('last').value,phone:document.getElementById('phone').value,email:document.getElementById('email').value,website:document.getElementById('website').value,turnstile_token:turn,started_at:start,idempotency_key:crypto.randomUUID(),attribution:a})})"
new="try{const id=crypto.randomUUID(),ch=await challenge(id),a=qp(),r=await fetch('/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({first_name:document.getElementById('first').value,last_name:document.getElementById('last').value,phone:document.getElementById('phone').value,email:document.getElementById('email').value,website:document.getElementById('website').value,turnstile_token:turn,started_at:start,idempotency_key:id,challenge:ch,form_id:'pennyworth_shared_landing_form_v2',form_answers:{channel:'landing_form',interest:'General inquiry'},attribution:a})})"
if old in s:
    s=s.replace(old,new,1)
elif "idempotency_key:id,challenge:ch" not in s:
    raise SystemExit('legacy payload marker missing')

p.write_text(s)

assert 'turnstile_token:turn' in s
assert "fetch('/challenge?id='" in s
assert 'idempotency_key:id,challenge:ch' in s
assert 'while(n<900000)' not in s
