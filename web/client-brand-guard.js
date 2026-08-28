(()=>{'use strict';
const exact=new Map([['HighLevel','CloudSales CRM'],['GoHighLevel','CloudSales'],['LeadConnector','CloudSales'],['highlevel','CloudSales CRM']]);
function cleanText(s){let out=String(s??'');for(const [a,b] of exact)out=out.split(a).join(b);return out}
function cleanNode(n){if(!n||n.nodeType!==Node.TEXT_NODE)return;const v=n.nodeValue||'',c=cleanText(v);if(c!==v)n.nodeValue=c}
function hideInternal(){const loc=document.getElementById('hlLocation');if(loc){const card=loc.closest('.card');if(card)card.style.display='none';let prev=card?.previousElementSibling;if(prev?.classList?.contains('sectionHead'))prev.style.display='none'}document.querySelectorAll('[data-provider="highlevel"]').forEach(x=>{const card=x.closest('.provider');if(card)card.style.display='none'})}
function sanitize(root=document.getElementById('shell')||document.body){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(w.nextNode())nodes.push(w.currentNode);for(const n of nodes)cleanNode(n);hideInternal()}
const oldAlert=window.alert?.bind(window);if(oldAlert)window.alert=(m)=>oldAlert(cleanText(m));
const oldConfirm=window.confirm?.bind(window);if(oldConfirm)window.confirm=(m)=>oldConfirm(cleanText(m));
function boot(){sanitize();const root=document.getElementById('shell');if(!root)return;const mo=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')cleanNode(m.target);for(const n of m.addedNodes){if(n.nodeType===Node.TEXT_NODE)cleanNode(n);else if(n.nodeType===Node.ELEMENT_NODE)sanitize(n)}}hideInternal()});mo.observe(root,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();