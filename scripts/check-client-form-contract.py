from pathlib import Path

ROOT=Path('web/clients')
fail=[]

def must(text, token, label):
    if token not in text:
        fail.append(f'{label}: missing {token}')

def html_contract(client, path):
    text=path.read_text()
    if '<form' not in text.lower():
        return
    must(text,'website',f'{client}:{path.name}')
    if client=='acanto':
        must(text,'turnstile_token:token',f'{client}:{path.name}')
        must(text,'turnstile.render',f'{client}:{path.name}')
    elif client=='meza':
        must(text,"fd.get('cf-turnstile-response')",f'{client}:{path.name}')
        must(text,'turnstile_token:token',f'{client}:{path.name}')
        must(text,'cf-turnstile',f'{client}:{path.name}')
    elif client=='pennyworth':
        must(text,"cf-turnstile-response",f'{client}:{path.name}')
        must(text,'turnstile_token:turnstileToken',f'{client}:{path.name}')
        must(text,'cf-turnstile',f'{client}:{path.name}')
        if 'while(n<900000)' in text:
            fail.append(f'{client}:{path.name}: heavy proof-of-work is forbidden')

def worker_contract(client, path):
    text=path.read_text()
    if '/lead' not in text and '/api/lead' not in text:
        return
    must(text,'INTAKE',f'{client}:{path.name}')
    must(text,'website',f'{client}:{path.name}')
    if client in {'acanto','meza'}:
        must(text,'turnstile_token',f'{client}:{path.name}')
        must(text,'TURNSTILE_SECRET',f'{client}:{path.name}')
        must(text,'siteverify',f'{client}:{path.name}')
    if client=='pennyworth':
        must(text,'turnstile_token:turnstileToken',f'{client}:{path.name}')
        if 'while(n<900000)' in text or 'prefix:"000"' in text:
            fail.append(f'{client}:{path.name}: heavy proof-of-work is forbidden')

for client in ('pennyworth','acanto','meza'):
    base=ROOT/client
    if not base.exists():
        fail.append(f'{client}: client directory missing')
        continue
    for path in base.rglob('*.html'):
        html_contract(client,path)
    for path in base.rglob('worker-edge-template.mjs'):
        worker_contract(client,path)

prov=Path('supabase/functions/pennyworth-provision/index.ts')
if not prov.exists():
    fail.append('pennyworth provisioner missing')
else:
    text=prov.read_text()
    must(text,'turnstile_client_submit_missing','pennyworth-provision')
    must(text,'TURNSTILE_SECRET','pennyworth-provision')
    must(text,'siteverify','pennyworth-provision')
    must(text,"replaceAll('while(n<900000)','while(n<100000)')",'pennyworth-provision')

if fail:
    print('FORM RELIABILITY CONTRACT FAILED')
    for item in fail:
        print(' -',item)
    raise SystemExit(1)
print('FORM RELIABILITY CONTRACT PASSED: Pennyworth, Acanto, Meza')
# CI canary: changing this file intentionally triggers the cross-client contract workflow.
