from pathlib import Path
p=Path('supabase/functions/cloudflare-pwa-release-v12/index.ts')
s=p.read_text(encoding='utf-8')
s=s.replace('async function digest(a:Uint8Array){return[...new Uint8Array(await crypto.subtle.digest("SHA-256",a))].map(x=>x.toString(16).padStart(2,"0")).join("")}', 'async function digest(a:Uint8Array){const b=Uint8Array.from(a);return[...new Uint8Array(await crypto.subtle.digest("SHA-256",b.buffer))].map(x=>x.toString(16).padStart(2,"0")).join("")}')
s=s.replace('text:new TextDecoder().decode(a).slice(0,12000)', 'text:new TextDecoder().decode(a).slice(0,200000)')
s=s.replace('root:root.status===200&&root.text.includes("Tu negocio, operado por IA")', 'root:root.status===200&&root.text.includes("CloudSales — Cloudy runs your business")')
p.write_text(s,encoding='utf-8')
print('PWA release type and smoke checks updated')
