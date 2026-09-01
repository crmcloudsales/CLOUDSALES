(() => {
  'use strict';
  const ID='cs-dashboard-v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v||0).toLocaleString();
  const cash=(v,c='USD')=>`${c} ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const arr=v=>Array.isArray(v)?v:[];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function css(){
    if(document.getElementById(ID+'-css')) return;
    const s=document.createElement('style');s.id=ID+'-css';s.textContent=`
    .csCommand{margin-top:18px;display:grid;gap:14px}.csBrief{position:relative;overflow:hidden;border:1px solid #4a2a48;border-radius:24px;padding:20px;background:radial-gradient(520px 210px at 95% 0,#762b7650,transparent 66%),linear-gradient(145deg,#15111b,#0f0f17)}
    .csBriefTop{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.csBrief h2{margin:0;font-size:25px;letter-spacing:-.035em}.csBrief p{color:#aaa9b8;margin:6px 0 0;line-height:1.5;font-size:13px;max-width:760px}.csLive{font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#93efba;border:1px solid #315b43;border-radius:999px;padding:6px 8px;background:#102018}
    .csQuickActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.csQuickActions button{border:1px solid #3b3443;background:#17141e;color:#f5f1f8;border-radius:999px;padding:9px 12px;font-size:11px;font-weight:800}.csQuickActions button:first-child{border:0;background:linear-gradient(135deg,#ff2b9b,#9a48ff)}
    .csKpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.csKpi{border:1px solid #2b2b39;background:linear-gradient(180deg,#13131d,#0f0f16);border-radius:18px;padding:15px;min-width:0}.csKpiTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.csKpi i{font-style:normal;font-size:16px}.csKpi strong{display:block;font-size:28px;letter-spacing:-.04em;margin-top:8px}.csKpi span{display:block;font-size:9px;color:#858596;text-transform:uppercase;letter-spacing:.07em;margin-top:4px}.csSpark{height:3px;border-radius:99px;margin-top:10px;background:#272735;overflow:hidden}.csSpark b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8d5cff,#ff2b9b)}
    .csCharts{display:grid;grid-template-columns:1.4fr 1fr;gap:12px}.csChart{border:1px solid #2b2b39;background:#101018;border-radius:20px;padding:17px;min-width:0}.csChart h3{margin:0;font-size:15px}.csChartSub{font-size:10px;color:#858596;margin-top:4px}.csLine{height:150px;margin-top:10px}.csLine svg{width:100%;height:100%;overflow:visible}.csAxis{stroke:#292936;stroke-width:1}.csPath{fill:none;stroke:#ff4daf;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.csArea{fill:url(#csgrad)}
    .csBars{display:grid;gap:9px;margin-top:13px}.csBarRow{display:grid;grid-template-columns:90px 1fr auto;gap:9px;align-items:center;font-size:10px}.csBarRow label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#aaa}.csBar{height:8px;background:#242431;border-radius:999px;overflow:hidden}.csBar b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6b5cff,#ff4da8)}.csBarRow em{font-style:normal;color:#ddd;font-weight:800}
    .csBottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.csDonutWrap{display:flex;align-items:center;gap:16px;margin-top:13px}.csDonut{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#5de6a2 var(--q),#292936 0)}.csDonut:after{content:'';width:66px;height:66px;border-radius:50%;background:#101018;position:absolute}.csDonut{position:relative}.csDonut b{z-index:1;font-size:19px}.csList{display:grid;gap:8px;margin-top:12px}.csListRow{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #242431;padding-top:8px;font-size:10px}.csListRow:first-child{border-top:0;padding-top:0}.csListRow span{color:#9493a3}.csEmpty{display:grid;place-items:center;min-height:112px;text-align:center;color:#858596;font-size:11px;line-height:1.5;border:1px dashed #30303e;border-radius:14px;margin-top:12px;padding:14px}
    @media(max-width:1050px){.csKpis{grid-template-columns:repeat(3,1fr)}.csCharts{grid-template-columns:1fr}.csBottom{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.csBrief{padding:16px}.csBrief h2{font-size:21px}.csKpis{grid-template-columns:1fr 1fr}.csKpi strong{font-size:24px}.csBottom{grid-template-columns:1fr}.csBarRow{grid-template-columns:74px 1fr auto}.csQuickActions{display:grid;grid-template-columns:1fr 1fr}.csQuickActions button{padding:10px 8px}.csChart{padding:14px}}
    `;document.head.appendChild(s);
  }

  function metric(){return (typeof currentOrg!=='undefined'&&currentOrg?.metrics)||{};}
  function data(){
    const sn=typeof snapshot!=='undefined'&&snapshot?snapshot:{};
    const contacts=arr(sn.contacts), opportunities=arr(sn.opportunities), appointments=arr(sn.appointments), events=arr(sn.events), m=metric();
    const accepted=Number(m.leads_accepted_30d||0), attempts=Number(m.lead_attempts_30d||contacts.length||0), junk=Math.max(0,attempts-accepted);
    const qualified=contacts.filter(x=>Number(x.quality_score||0)>=70||['qualified','opportunity','customer'].includes(String(x.lifecycle_stage||'').toLowerCase())).length;
    const won=opportunities.filter(x=>String(x.status||x.stage||'').toLowerCase()==='won').length||Number(m.won_30d||0);
    const open=opportunities.filter(x=>!['won','lost'].includes(String(x.status||x.stage||'').toLowerCase()));
    const pipelineValue=open.reduce((a,x)=>a+Number(x.value||0),0);
    const avgQuality=Math.round(Number(m.avg_quality_score_30d||0)||contacts.reduce((a,x)=>a+Number(x.quality_score||0),0)/(contacts.length||1));
    return {contacts,opportunities,appointments,events,m,accepted,attempts,junk,qualified,won,pipelineValue,avgQuality};
  }

  function series7(contacts){
    const out=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const n=d.getTime(),e=n+86400000;out.push({label:d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2),value:contacts.filter(x=>{const t=new Date(x.created_at||x.updated_at||0).getTime();return t>=n&&t<e}).length});}return out;
  }
  function lineSvg(s){
    const max=Math.max(1,...s.map(x=>x.value)),W=520,H=130,p=8,pts=s.map((x,i)=>[p+i*((W-p*2)/(s.length-1||1)),H-p-(x.value/max)*(H-p*2)]);const d=pts.map((v,i)=>(i?'L':'M')+v[0].toFixed(1)+' '+v[1].toFixed(1)).join(' ');const area=`${d} L ${pts[pts.length-1][0]} ${H-p} L ${pts[0][0]} ${H-p} Z`;return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="csgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2b9b" stop-opacity=".28"/><stop offset="1" stop-color="#ff2b9b" stop-opacity="0"/></linearGradient></defs><line class="csAxis" x1="0" y1="${H-p}" x2="${W}" y2="${H-p}"/><path class="csArea" d="${area}"/><path class="csPath" d="${d}"/></svg><div style="display:flex;justify-content:space-between;color:#707080;font-size:8px;margin-top:2px">${s.map(x=>`<span>${esc(x.label)}</span>`).join('')}</div>`;
  }
  function bars(items,empty){if(!items.length)return `<div class="csEmpty">${esc(empty)}</div>`;const max=Math.max(1,...items.map(x=>x.value));return `<div class="csBars">${items.slice(0,6).map(x=>`<div class="csBarRow"><label>${esc(x.label)}</label><div class="csBar"><b style="width:${clamp(x.value/max*100,3,100)}%"></b></div><em>${num(x.value)}</em></div>`).join('')}</div>`;}
  function sources(contacts){const m={};contacts.forEach(x=>{const k=String(x.primary_source_provider||x.source||'CloudSales');m[k]=(m[k]||0)+1});return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);}
  function stages(opps){const m={};opps.forEach(x=>{const k=String(x.stage||x.status||'new');m[k]=(m[k]||0)+1});return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);}
  function brief(d){
    if(!d.attempts&&!d.contacts.length&&!d.opportunities.length) return 'Conecta tu CRM o agrega tu primer lead. En cuanto haya actividad, Cloudy resumirá aquí qué requiere atención.';
    const parts=[];if(d.qualified)parts.push(`${d.qualified} lead${d.qualified===1?'':'s'} con alta intención`);if(d.appointments.length)parts.push(`${d.appointments.length} cita${d.appointments.length===1?'':'s'} en el workspace`);if(d.junk)parts.push(`${d.junk} registro${d.junk===1?'':'s'} no aceptado${d.junk===1?'':'s'}`);if(d.pipelineValue)parts.push(`${cash(d.pipelineValue)} en pipeline abierto`);return parts.length?`Hoy debes concentrarte en ${parts.join(', ')}.`:'CloudSales está listo. A medida que entren leads y oportunidades, este resumen priorizará lo importante.';
  }
  function go(page,prompt){
    if(typeof go==='function'){go(page);if(prompt&&typeof askCloudy==='function')setTimeout(()=>askCloudy(prompt),120);return;}
    const b=document.querySelector(`[data-page="${page}"]`);if(b)b.click();
    if(prompt){const input=document.getElementById('cloudyInput');if(input){input.value=prompt;document.getElementById('sendCloudy')?.click();}}
  }
  function render(){
    const page=document.getElementById('page-home');if(!page||typeof currentOrg==='undefined'||!currentOrg)return;
    css();let root=document.getElementById(ID);if(!root){root=document.createElement('div');root.id=ID;root.className='csCommand';const anchor=document.getElementById('csOpsCenter')||page.querySelector('.metrics');(anchor||page).insertAdjacentElement('afterend',root);}
    const d=data(),s7=series7(d.contacts),source=sources(d.contacts),stage=stages(d.opportunities),quality=clamp(d.avgQuality,0,100),appt=d.appointments.length;
    root.innerHTML=`
      <section class="csBrief"><div class="csBriefTop"><div><h2>Cloudy Brief</h2><p>${esc(brief(d))}</p></div><span class="csLive">● Live workspace</span></div><div class="csQuickActions"><button data-cs="hot">Review hot leads</button><button data-cs="follow">Send follow-ups</button><button data-cs="pipe">Open pipeline</button><button data-cs="cloudy">Ask Cloudy</button></div></section>
      <div class="csKpis">
        <div class="csKpi"><div class="csKpiTop"><i>✦</i></div><strong>${num(d.qualified)}</strong><span>Qualified Leads</span><div class="csSpark"><b style="width:${clamp(d.qualified/(d.contacts.length||1)*100,4,100)}%"></b></div></div>
        <div class="csKpi"><div class="csKpiTop"><i>🛡</i></div><strong>${num(d.junk)}</strong><span>Junk Not Accepted</span><div class="csSpark"><b style="width:${clamp(d.junk/(d.attempts||1)*100,4,100)}%"></b></div></div>
        <div class="csKpi"><div class="csKpiTop"><i>◫</i></div><strong>${num(appt)}</strong><span>Appointments</span><div class="csSpark"><b style="width:${clamp(appt/10*100,4,100)}%"></b></div></div>
        <div class="csKpi"><div class="csKpiTop"><i>↗</i></div><strong>${cash(d.pipelineValue)}</strong><span>Open Pipeline</span><div class="csSpark"><b style="width:${d.pipelineValue?74:4}%"></b></div></div>
        <div class="csKpi"><div class="csKpiTop"><i>◎</i></div><strong>${quality}</strong><span>Lead Quality</span><div class="csSpark"><b style="width:${Math.max(4,quality)}%"></b></div></div>
        <div class="csKpi"><div class="csKpiTop"><i>✓</i></div><strong>${num(d.won)}</strong><span>Won</span><div class="csSpark"><b style="width:${clamp(d.won/(d.opportunities.length||1)*100,4,100)}%"></b></div></div>
      </div>
      <div class="csCharts"><section class="csChart"><h3>Lead Activity</h3><div class="csChartSub">New lead records · last 7 days</div><div class="csLine">${lineSvg(s7)}</div></section><section class="csChart"><h3>Pipeline by Stage</h3><div class="csChartSub">Where opportunities are right now</div>${bars(stage,'Your pipeline chart will appear after opportunities are created or synced.')}</section></div>
      <div class="csBottom"><section class="csChart"><h3>Lead Quality</h3><div class="csChartSub">Average quality score</div><div class="csDonutWrap"><div class="csDonut" style="--q:${quality}%"><b>${quality}</b></div><div><b style="font-size:13px">${quality>=80?'Strong signal':quality>=60?'Needs attention':'Building signal'}</b><div class="csChartSub" style="margin-top:5px">Quality improves as CloudSales receives more real conversion outcomes.</div></div></div></section><section class="csChart"><h3>Lead Sources</h3><div class="csChartSub">Where your contacts are coming from</div>${bars(source,'Connect lead sources to compare quality and volume by channel.')}</section><section class="csChart"><h3>Today’s Focus</h3><div class="csChartSub">What Cloudy should help you move next</div><div class="csList"><div class="csListRow"><span>High-intent leads</span><b>${num(d.qualified)}</b></div><div class="csListRow"><span>Appointments</span><b>${num(appt)}</b></div><div class="csListRow"><span>Open opportunities</span><b>${num(d.opportunities.length-d.won)}</b></div><div class="csListRow"><span>Pending approvals</span><b>${num(currentOrg.cloudy?.pending_approvals?.length||0)}</b></div></div></section></div>`;
    root.querySelector('[data-cs="hot"]')?.addEventListener('click',()=>go('leads','Show me the highest-intent leads and tell me who needs attention first.'));
    root.querySelector('[data-cs="follow"]')?.addEventListener('click',()=>go('cloudy','Review leads that need follow-up and prepare the next best action for each one.'));
    root.querySelector('[data-cs="pipe"]')?.addEventListener('click',()=>go('pipeline'));
    root.querySelector('[data-cs="cloudy"]')?.addEventListener('click',()=>go('cloudy'));
  }
  function schedule(){clearTimeout(window.__csDashT);window.__csDashT=setTimeout(render,140);}
  document.addEventListener('click',e=>{if(e.target.closest('[data-page="home"],[data-go="home"]'))setTimeout(schedule,180)});
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(()=>{if(document.getElementById('page-home')?.classList.contains('active'))render()},5000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();