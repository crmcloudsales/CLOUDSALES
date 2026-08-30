from pathlib import Path

p=Path('web/clients/pennyworth/worker-edge-template.mjs')
s=p.read_text()

old=" if(!d?.inventory?.length)return;\n const sec=document.getElementById('properties'),grid=sec?.querySelector('.grid3');if(!grid)return;"
new=" if(!d?.inventory?.length)return;\n window.PENNYWORTH_INVENTORY_MAP=Object.fromEntries(d.inventory.map(i=>[String(i.id),i]));\n const sec=document.getElementById('properties'),grid=sec?.querySelector('.grid3');if(!grid)return;"
if old in s:s=s.replace(old,new,1)
elif 'PENNYWORTH_INVENTORY_MAP' not in s:raise SystemExit('inventory map marker missing')

old=" const note=sec.querySelector('.section-head .muted');if(note)note.textContent='Inventario vigente administrado desde CloudSales. Precios y disponibilidad pueden cambiar; confirma siempre la información con un asesor.';\n}).catch(()=>{})})();</script>`;"
new=" const note=sec.querySelector('.section-head .muted');if(note)note.textContent='Inventario vigente administrado desde CloudSales. Precios y disponibilidad pueden cambiar; confirma siempre la información con un asesor.';\n const q=new URL(location.href).searchParams,initial=q.get('inventory_id')||q.get('property_id');if(initial&&typeof window.PENNYWORTH_SELECT_PROPERTY==='function')window.PENNYWORTH_SELECT_PROPERTY({inventory_id:initial});\n}).catch(()=>{})})();</script>`;"
if old in s:s=s.replace(old,new,1)

old=".pwFormHost{padding:12px}.pwFormHost .form-card{box-shadow:none;margin:0;border-color:#303632}.pwFormHost .form-card h3{font-size:22px}.pwFormHost .sub{font-size:13px}.pwFormHost .fine{font-size:10px}.pwFormHost .submit.chat{background:#635BFF;color:#fff}.pwFormHost .submit.whatsapp{background:#25D366;color:#fff}"
if old in s and '.pwPropertyPicked{' not in s:s=s.replace(old,old+"\n.pwPropertyPicked{margin:0 0 12px;padding:10px 12px;border:1px solid rgba(198,170,120,.38);border-radius:12px;background:rgba(198,170,120,.08);font-size:11px;line-height:1.45;color:#e9dcc3}.pwPropertyPicked b{display:block;color:#fff;font-size:12px;margin-bottom:2px}",1)

old="let intent='landing',intentStarted=Date.now(),chatSession='',chatAfter='',chatPoller=null,chatPolling=false,active=false;"
new="let intent='landing',intentStarted=Date.now(),chatSession='',chatAfter='',chatPoller=null,chatPolling=false,active=false,selectedInventoryId='',selectedPropertyKey='';"
if old in s:s=s.replace(old,new,1)

marker="function show(t,ok){status.className='status '+(ok?'ok':'err');status.textContent=t}function clearStatus(){status.className='status';status.textContent=''}"
helper="""function propertyLabel(){const p=selectedInventoryId?window.PENNYWORTH_INVENTORY_MAP?.[selectedInventoryId]:null;if(p?.name)return String(p.name);if(selectedPropertyKey==='idilik')return'IDILIK Residences';return''}\nfunction setPropertyBadge(label){let b=document.getElementById('pwPropertyPicked');if(!label){b?.remove();return}if(!b){b=document.createElement('div');b.id='pwPropertyPicked';b.className='pwPropertyPicked';const grid=form.querySelector('.form-grid')||form.firstElementChild||form;b.innerHTML='<b>Propiedad seleccionada</b><span></span>';grid.parentNode?.insertBefore(b,grid)}const sp=b.querySelector('span');if(sp)sp.textContent=label}\nfunction selectProperty(ctx={}){const inv=String(ctx.inventory_id||'').trim(),key=String(ctx.property_key||'').trim().toLowerCase();if(inv){selectedInventoryId=inv;selectedPropertyKey=''}else if(key){selectedPropertyKey=key;selectedInventoryId=''}const label=propertyLabel()||(key==='idilik'?'IDILIK Residences':inv?'Propiedad seleccionada':'');if(label){const sel=document.getElementById('interest');if(sel){let o=[...sel.options].find(x=>x.dataset.pwProperty==='1');if(!o){o=document.createElement('option');o.dataset.pwProperty='1';sel.prepend(o)}o.value='Propiedad: '+label;o.textContent='Propiedad: '+label;sel.value=o.value}setPropertyBadge(label)}}\nwindow.PENNYWORTH_SELECT_PROPERTY=selectProperty;\n{const q=new URL(location.href).searchParams,k=(q.get('property')||q.get('property_key')||'').toLowerCase(),inv=q.get('inventory_id')||q.get('property_id')||'';if(k==='idilik')selectProperty({property_key:'idilik'});if(inv)selectProperty({inventory_id:inv})}\ndocument.addEventListener('click',e=>{const inv=e.target.closest?.('[data-inventory-id]');if(inv?.dataset?.inventoryId){selectProperty({inventory_id:inv.dataset.inventoryId});return}const idilik=e.target.closest?.('.idilik a[href=\"#contact\"]');if(idilik)selectProperty({property_key:'idilik'})},true);\n"""
if marker in s and 'window.PENNYWORTH_SELECT_PROPERTY=selectProperty' not in s:s=s.replace(marker,marker+'\n'+helper,1)
elif 'window.PENNYWORTH_SELECT_PROPERTY=selectProperty' not in s:raise SystemExit('contact helper marker missing')

old="deliveryValue=document.getElementById('delivery')?.value||'',interestValue=document.getElementById('interest').value,website=document.getElementById('website').value;"
new="deliveryValue=document.getElementById('delivery')?.value||'',interestValue=document.getElementById('interest').value,inventoryId=selectedInventoryId,propertyKey=selectedPropertyKey,website=document.getElementById('website').value;"
if old in s:s=s.replace(old,new,1)
old="form_answers:{channel,interest:interestValue,delivery_timeline:deliveryValue,distribution_target:'listia_subscriber_pool'}"
new="form_answers:{channel,interest:interestValue,delivery_timeline:deliveryValue,inventory_id:inventoryId,property_key:propertyKey,distribution_target:'listia_subscriber_pool'}"
if old in s:s=s.replace(old,new,1)
elif 'inventory_id:inventoryId' not in s:raise SystemExit('form answers marker missing')

marker='function clean(v,n){return String(v??"").trim().slice(0,n)}\n'
server='''\nconst STATIC_PROPERTIES={idilik:{source:"pennyworth_static",property_key:"idilik",inventory_id:null,sku:null,name:"IDILIK Residences",public_slug:"idilik-residences",price_min:4450000,price_max:null,currency:"MXN",short_description:"Residencias en Playa del Carmen con acceso controlado, lobby de doble altura, seguridad 24/7, concierge, spa equipado y rooftop con vistas panorámicas.",property_url:"https://pennyworth.cloudsales.app/#idilik",attributes:{location:"Playa del Carmen",city:"Playa del Carmen",bedrooms:"1 y 2 habitaciones, opciones lock-off y penthouses",amenities:["Spa","Rooftop","Concierge","Seguridad 24/7"],price_reference_date:"2026-08-11",brochure_url:"https://drive.google.com/file/d/1HP8eWMOKqzAwuFJ12ySHOKhLp5_t8bp4/view",prices_url:"https://drive.google.com/file/d/1EQO_dGNShUJcgsJ6gxMRqPA5jlbPR416/view",availability_url:"https://drive.google.com/file/d/1Hr18YvL7FNZJgwqjg0kbE1ZzeokkPYyu/view"}}};\nfunction safeInventoryAttrs(raw){const out={};if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;for(const[k,v]of Object.entries(raw).slice(0,40)){const key=clean(k,80);if(!key)continue;if(typeof v==="number"||typeof v==="boolean")out[key]=v;else if(Array.isArray(v))out[key]=v.slice(0,15).map(x=>clean(x,120));else if(v!==null&&v!==undefined)out[key]=clean(typeof v==="object"?JSON.stringify(v):v,400)}return out}\nasync function resolvePropertyContext(inventoryId,propertyKey,hostname){const id=clean(inventoryId,80),key=clean(propertyKey,80).toLowerCase();if(id){try{const r=await fetch(`${PUBLIC_DATA}?hostname=${encodeURIComponent(hostname)}`,{headers:{accept:"application/json"}});if(r.ok){const d=await r.json(),i=Array.isArray(d?.inventory)?d.inventory.find(x=>String(x?.id||"")===id):null;if(i)return{source:"cloudsales_inventory",inventory_id:clean(i.id,80),property_key:null,sku:clean(i.sku,120)||null,name:clean(i.name,240)||null,public_slug:clean(i.public_slug,180)||null,price_min:Number.isFinite(Number(i.price_min))?Number(i.price_min):null,price_max:Number.isFinite(Number(i.price_max))?Number(i.price_max):null,currency:clean(i.currency,20)||null,short_description:clean(i.short_description,700)||null,property_url:`https://${hostname}/#properties`,attributes:safeInventoryAttrs(i.attributes),media:Array.isArray(i.media)?i.media.slice(0,3).map(m=>({url:clean(m?.url,1000)||null,alt:clean(m?.alt,180)||null})):[]}}}catch{}}\n if(key&&STATIC_PROPERTIES[key])return STATIC_PROPERTIES[key];return null}\n'''
if marker in s and 'async function resolvePropertyContext(' not in s:s=s.replace(marker,marker+server,1)
elif 'async function resolvePropertyContext(' not in s:raise SystemExit('server helper marker missing')

old=' const interest=clean(answers.interest,180),deliveryRaw=clean(answers.delivery_timeline,80),delivery=["Inmediata","Hasta 6 meses","6 meses o más"].includes(deliveryRaw)?deliveryRaw:"",message=clean(answers.message,900),consent=answers.consent===true;'
if old in s and 'const property=await resolvePropertyContext' not in s:s=s.replace(old,old+'\n const property=await resolvePropertyContext(answers.inventory_id,answers.property_key,u.hostname);',1)

old='form_answers:isGate?{channel:clean(answers.channel,40),interest,message,consent:true,distribution_target:"listia_subscriber_pool"}:isShared?{channel:clean(answers.channel,40),interest,delivery_timeline:delivery,distribution_target:"listia_subscriber_pool"}:(b.form_answers||null),'
new='form_answers:isGate?{channel:clean(answers.channel,40),interest,message,consent:true,property,distribution_target:"listia_subscriber_pool"}:isShared?{channel:clean(answers.channel,40),interest,delivery_timeline:delivery,property,distribution_target:"listia_subscriber_pool"}:(b.form_answers||null),'
if old in s:s=s.replace(old,new,1)
elif 'delivery_timeline:delivery,property,' not in s:raise SystemExit('server payload marker missing')

assert 'PENNYWORTH_INVENTORY_MAP' in s
assert 'window.PENNYWORTH_SELECT_PROPERTY=selectProperty' in s
assert 'inventory_id:inventoryId' in s
assert 'async function resolvePropertyContext(' in s
assert 'delivery_timeline:delivery,property,' in s
p.write_text(s)
