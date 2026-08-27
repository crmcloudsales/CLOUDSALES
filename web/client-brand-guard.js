(()=>{'use strict';
const exact=new Map([['HighLevel','CloudSales CRM'],['GoHighLevel','CloudSales'],['LeadConnector','CloudSales'],['highlevel','CloudSales CRM']]);
function cleanText(s){let out=String(s??'');for(const [a,b] of exact)out=out.split(a).join(b);return out}
function hideInternal(){const loc=document.getElementById('hlLocation');if(loc){const card=loc.closest('.card');if(card)card.style.display='none';let prev=card?.previousElementSibling;if(prev?.classList?.contains('sectionHead'))prev.style.display='none'}document.querySelectorAll('[data-provider="highlevel"]').forEach(x=>{const card=x.closest('.provider');if(card)card.style.display='none'})}
function sanitize(root=document.body){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(w.nextNode())nodes.push(w.currentNode);for(const n of nodes){const v=n.nodeValue||'';const c=cleanText(v);if(c!==v)n.nodeValue=c}hideInternal()}
const oldAlert=window.alert?.bind(window);if(oldAlert)window.alert=(m)=>oldAlert(cleanText(m));
const oldConfirm=window.confirm?.bind(window);if(oldConfirm)window.confirm=(m)=>oldConfirm(cleanText(m));
function boot(){sanitize();const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===Node.TEXT_NODE){const v=n.nodeValue||'';const c=cleanText(v);if(c!==v)n.nodeValue=c}else if(n.nodeType===Node.ELEMENT_NODE)sanitize(n)}hideInternal()});mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();