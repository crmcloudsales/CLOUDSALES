from pathlib import Path

WORKER=Path('web/clients/pennyworth/worker-edge-template.mjs')
PROVISION=Path('supabase/functions/pennyworth-provision/index.ts')

s=WORKER.read_text()
if 'pennyworth_chat_ux_v3' not in s:
    css_anchor='.pwTurnstileMount{min-height:65px;margin-top:14px;display:flex;align-items:center}\n'
    if css_anchor not in s:
        raise SystemExit('chat ux css anchor missing')
    css=(
        '.pwPanelNotice{display:none;position:sticky;top:76px;z-index:6;margin:0 12px 10px;padding:11px 12px;border-radius:12px;font-size:12px;line-height:1.4}\n'
        '.pwPanelNotice.err{display:block;background:#2a1217;border:1px solid #63313b;color:#ffc0cb}.pwPanelNotice.ok{display:block;background:#10271b;border:1px solid #2a6042;color:#b9f3d0}.pwFormHost .status{display:none!important}\n'
        '.pwChoice{position:relative;width:100%}.pwChoiceButton{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#242428;color:#fff;border:1px solid #414148;border-radius:13px;padding:13px;font:inherit;font-size:16px;text-align:left;cursor:pointer}.pwChoiceButton:after{content:"⌄";color:#9b9ba4}.pwChoice.open .pwChoiceButton{border-color:#6b6b78}.pwChoiceMenu{display:none;margin-top:6px;max-height:290px;overflow:auto;background:#202023;border:1px solid #414148;border-radius:14px;padding:6px;box-shadow:0 18px 45px rgba(0,0,0,.48)}.pwChoice.open .pwChoiceMenu{display:block}.pwChoiceOption{width:100%;display:block;border:0;background:transparent;color:#fff;text-align:left;padding:13px 12px;border-radius:10px;font:inherit;font-size:15px;line-height:1.35;cursor:pointer}.pwChoiceOption[aria-selected="true"]{background:#303038}.pwChoiceOption:active{background:#373740}\n'
    )
    s=s.replace(css_anchor,css_anchor+css,1)

    old_mobile='#pwUnifiedPanel{left:12px;right:12px;bottom:150px;width:auto;max-height:calc(100vh - 170px)}'
    new_mobile='#pwUnifiedPanel{left:12px;right:12px;top:12px;bottom:150px;width:auto;height:auto;max-height:none}'
    if old_mobile in s:
        s=s.replace(old_mobile,new_mobile,1)

    panel_anchor='<div class="pwFormHost"></div>'
    if panel_anchor not in s:
        raise SystemExit('panel form host anchor missing')
    s=s.replace(panel_anchor,'<div id="pwPanelNotice" class="pwPanelNotice" role="alert" aria-live="assertive"></div>'+panel_anchor,1)

    var_anchor="waLaunch=document.getElementById('pwWaLaunch');"
    if var_anchor not in s:
        raise SystemExit('panel vars anchor missing')
    s=s.replace(var_anchor,"waLaunch=document.getElementById('pwWaLaunch'),panelNotice=document.getElementById('pwPanelNotice');",1)

    show_anchor="function show(t,ok){status.className='status '+(ok?'ok':'err');status.textContent=t}function clearStatus(){status.className='status';status.textContent=''}"
    if show_anchor not in s:
        raise SystemExit('show/clear status anchor missing')
    show_new=(
        "const pennyworth_chat_ux_v3='active';"
        "function show(t,ok){status.className='status '+(ok?'ok':'err');status.textContent=t;if(panel.classList.contains('open')&&panelNotice){panelNotice.className='pwPanelNotice '+(ok?'ok':'err');panelNotice.textContent=t;if(!ok)panel.scrollTo({top:0,behavior:'auto'})}}"
        "function clearStatus(){status.className='status';status.textContent='';if(panelNotice){panelNotice.className='pwPanelNotice';panelNotice.textContent=''}}"
    )
    s=s.replace(show_anchor,show_new,1)

    lines=s.splitlines()
    replaced=False
    for i,line in enumerate(lines):
        if line.startswith("const pennyworth_turnstile_lifecycle_v2="):
            lines[i]=( 
                "const pennyworth_turnstile_lifecycle_v2='active',turnstileSeed=form.querySelector('.cf-turnstile'),TURNSTILE_SITEKEY=turnstileSeed?.dataset?.sitekey||'0x4AAAAAAEiK97f4nFyAgMYx';"
                "let turnstileGeneration=0,turnstileWidget=null,turnstileValue='',turnstileWaiters=[];"
                "function resolveTurnstileWaiters(v){const w=turnstileWaiters.splice(0);for(const fn of w){try{fn(v)}catch{}}}"
                "function setTurnstileValue(v){turnstileValue=String(v||'');if(turnstileValue)resolveTurnstileWaiters(turnstileValue)}"
                "function failTurnstile(message){turnstileValue='';resolveTurnstileWaiters('');show(message,false)}"
                "function remountTurnstile(){const current=form.querySelector('.cf-turnstile,.pwTurnstileMount');if(!current)return;"
                "if(turnstileWidget!==null&&window.turnstile){try{window.turnstile.remove(turnstileWidget)}catch{}}"
                "const fresh=document.createElement('div');fresh.className='pwTurnstileMount';fresh.dataset.pwTurnstile='1';current.replaceWith(fresh);"
                "const generation=++turnstileGeneration;turnstileWidget=null;turnstileValue='';let attempts=0;"
                "const render=()=>{if(generation!==turnstileGeneration||!fresh.isConnected)return;if(!window.turnstile){if(++attempts<80)setTimeout(render,120);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.');return;}"
                "const doRender=()=>{if(generation!==turnstileGeneration||!fresh.isConnected)return;try{turnstileWidget=window.turnstile.render(fresh,{sitekey:TURNSTILE_SITEKEY,theme:'dark',appearance:'always',callback:(token)=>{if(generation!==turnstileGeneration)return;setTurnstileValue(token);clearStatus()},'expired-callback':()=>{turnstileValue='';show('La verificación expiró. Confirma nuevamente.',false)},'error-callback':()=>failTurnstile('No pudimos cargar la verificación de seguridad. Intenta nuevamente.')})}catch{if(++attempts<80)setTimeout(render,180);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.')}};"
                "try{if(window.turnstile.ready)window.turnstile.ready(doRender);else doRender()}catch{setTimeout(render,180)}};render()}"
                "async function ensureTurnstileToken(timeout=6500){const direct=turnstileValue||String(new FormData(form).get('cf-turnstile-response')||'');if(direct)return direct;return await new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(String(v||''))};const timer=setTimeout(()=>finish(''),timeout);turnstileWaiters.push(finish);try{if(window.turnstile&&turnstileWidget!==null&&window.turnstile.execute)window.turnstile.execute(turnstileWidget)}catch{}})}"
                "remountTurnstile();"
            )
            replaced=True
            break
    if not replaced:
        raise SystemExit('turnstile lifecycle line missing')
    s='\n'.join(lines)+'\n'

    lifecycle_marker='remountTurnstile();\nfunction propertyLabel()'
    if lifecycle_marker not in s:
        raise SystemExit('choice insertion anchor missing')
    choices=(
        "remountTurnstile();\n"
        "const pwChoiceState=new Map();"
        "function enhanceChoice(sel){if(!sel||pwChoiceState.has(sel))return;sel.style.display='none';const wrap=document.createElement('div');wrap.className='pwChoice';const button=document.createElement('button');button.type='button';button.className='pwChoiceButton';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');const menu=document.createElement('div');menu.className='pwChoiceMenu';menu.setAttribute('role','listbox');sel.insertAdjacentElement('afterend',wrap);wrap.append(button,menu);"
        "const sync=()=>{const o=sel.options[sel.selectedIndex];button.textContent=o?.textContent||'Selecciona una opción'};const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false')};const build=()=>{menu.replaceChildren();[...sel.options].forEach((o,i)=>{const opt=document.createElement('button');opt.type='button';opt.className='pwChoiceOption';opt.setAttribute('role','option');opt.setAttribute('aria-selected',i===sel.selectedIndex?'true':'false');opt.textContent=o.textContent||o.value;opt.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));sync();close();button.focus()});menu.appendChild(opt)})};"
        "button.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();const willOpen=!wrap.classList.contains('open');document.querySelectorAll('.pwChoice.open').forEach(x=>{x.classList.remove('open');x.querySelector('.pwChoiceButton')?.setAttribute('aria-expanded','false')});if(willOpen){build();wrap.classList.add('open');button.setAttribute('aria-expanded','true')}});sel.addEventListener('change',sync);pwChoiceState.set(sel,{sync,close,build});sync()}"
        "['delivery','interest'].forEach(id=>enhanceChoice(document.getElementById(id)));document.addEventListener('click',e=>{if(!e.target.closest?.('.pwChoice'))document.querySelectorAll('.pwChoice.open').forEach(x=>{x.classList.remove('open');x.querySelector('.pwChoiceButton')?.setAttribute('aria-expanded','false')})});\n"
        "function propertyLabel()"
    )
    s=s.replace(lifecycle_marker,choices,1)

    prop_anchor="sel.value=o.value}setPropertyBadge(label)"
    if prop_anchor not in s:
        raise SystemExit('property select sync anchor missing')
    s=s.replace(prop_anchor,"sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}setPropertyBadge(label)",1)

    open_anchor="function openPanel(next){intent=next;intentStarted=Date.now();active=true;panel.classList.add('open');"
    if open_anchor not in s:
        raise SystemExit('open panel anchor missing')
    s=s.replace(open_anchor,"function openPanel(next){intent=next;intentStarted=Date.now();active=true;clearStatus();panel.classList.add('open');",1)

    token_anchor="const turnstileToken=String(new FormData(form).get('cf-turnstile-response')||'');if(!turnstileToken)throw new Error('turnstile_required');"
    if token_anchor not in s:
        raise SystemExit('submit turnstile token anchor missing')
    s=s.replace(token_anchor,"const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');",1)

WORKER.write_text(s)

p=PROVISION
ps=p.read_text()
if "chat_ux_v3_missing" not in ps:
    anchor="if(!rawTmpl.includes('pennyworth_turnstile_lifecycle_v2')||!rawTmpl.includes('remountTurnstile'))throw new Error('turnstile_lifecycle_missing');"
    if anchor not in ps:
        raise SystemExit('provision turnstile lifecycle assertion missing')
    ps=ps.replace(anchor,anchor+"\n  if(!rawTmpl.includes('pennyworth_chat_ux_v3')||!rawTmpl.includes('ensureTurnstileToken')||!rawTmpl.includes('pwChoiceButton'))throw new Error('chat_ux_v3_missing');",1)
p.write_text(ps)

worker=WORKER.read_text()
assert 'pennyworth_chat_ux_v3' in worker
assert "appearance:'always'" in worker
assert 'ensureTurnstileToken' in worker
assert 'pwPanelNotice' in worker
assert 'pwChoiceButton' in worker
assert "top:12px;bottom:150px" in worker
assert "sel.dispatchEvent(new Event('change',{bubbles:true}))" in worker
assert "const turnstileToken=await ensureTurnstileToken()" in worker
assert 'chat_ux_v3_missing' in PROVISION.read_text()
print('Pennyworth chat UX v3 patch applied and verified')
