from pathlib import Path
p=Path('web/auth-runtime-v2.js')
s=p.read_text()
old="btn.onclick=async function(...args){\n      const r=original?await original.apply(this,args):null;"
new="btn.onclick=async function(...args){\n      try{await prepareCheckoutUi()}catch{}\n      const r=original?await original.apply(this,args):null;"
if new not in s:
    if old not in s: raise SystemExit('checkout onboarding wrapper marker missing')
    s=s.replace(old,new,1)
if 'try{await prepareCheckoutUi()}catch{}' not in s: raise SystemExit('plan lock hardening missing')
p.write_text(s)
