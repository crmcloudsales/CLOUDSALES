(()=>{
'use strict';
const ID='cs-static-i18n-v2';
if(window.CloudSalesStaticI18n?.version)return;
const VERSION='2026.09.03.1';
const STORE='cs_locale';
const LANGS=['es','en','fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];
const RTL=new Set(['ar-AE','he']);
const SURFACE=location.hostname.toLowerCase().startsWith('app.')?'pwa':'commercial';
const textSource=new WeakMap();
const attrSource=new WeakMap();
const META_SELECTOR='meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]';
let active='',catalog=null,loading=null,applying=false,observer=null,titleSource=document.title||'';

function canonical(v){
  let x=String(v||'').trim();
  const low=x.toLowerCase();
  if(/^es(?:-|$)/.test(low))return'es';
  if(/^en(?:-|$)/.test(low))return'en';
  if(/^fr(?:-|$)/.test(low))return'fr';
  if(/^it(?:-|$)/.test(low))return'it';
  if(/^pt(?:-|$)/.test(low))return'pt-BR';
  if(/^de(?:-|$)/.test(low))return'de';
  if(/^ar(?:-|$)/.test(low))return'ar-AE';
  if(/^ru(?:-|$)/.test(low))return'ru';
  if(/^he(?:-|$)/.test(low)||/^iw(?:-|$)/.test(low))return'he';
  if(/^zh(?:-|$)/.test(low))return'zh-CN';
  if(/^ja(?:-|$)/.test(low))return'ja';
  return LANGS.includes(x)?x:'en';
}
function detect(){
  try{const q=new URL(location.href).searchParams.get('lang');if(q)return canonical(q)}catch{}
  try{const x=localStorage.getItem(STORE);if(x)return canonical(x)}catch{}
  const d=document.documentElement.dataset.csLocale||document.documentElement.lang;if(d)return canonical(d);
  return canonical(navigator.languages?.[0]||navigator.language||'en');
}
function norm(v){return String(v??'').replace(/\s+/g,' ').trim()}
function mapped(v){
  if(!catalog)return String(v??'');
  const k=norm(v);if(!k)return String(v??'');
  const t=catalog[k];return typeof t==='string'&&t.trim()?t:String(v??'');
}
function preserveWhitespace(source,target){
  const s=String(source??''),t=String(target??'');
  const a=s.match(/^\s*/)?.[0]||'',b=s.match(/\s*$/)?.[0]||'';
  return a+t+b;
}
function sourceForText(node){
  const p=node.parentElement;
  const explicit=p?.getAttribute?.('data-i18n-static');
  if(explicit)return explicit;
  if(!textSource.has(node))textSource.set(node,node.nodeValue||'');
  return textSource.get(node)||'';
}
function translateTextNode(node){
  const p=node.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA'].includes(p.tagName))return;
  if(p.closest('[data-cs-i18n-ignore],.cs-i18n-ignore'))return;
  const src=sourceForText(node),base=norm(src);if(!base)return;
  const tr=mapped(base);const next=tr===base?src:preserveWhitespace(src,tr);
  if(node.nodeValue!==next)node.nodeValue=next;
}
function sourceForAttr(el,name){
  let m=attrSource.get(el);if(!m){m={};attrSource.set(el,m)}
  if(!(name in m))m[name]=el.getAttribute(name)||'';
  return m[name];
}
function translateAttrs(el){
  if(!(el instanceof Element)||el.closest?.('[data-cs-i18n-ignore],.cs-i18n-ignore'))return;
  for(const name of ['placeholder','aria-label','title','alt']){
    if(!el.hasAttribute(name))continue;
    const src=sourceForAttr(el,name),base=norm(src);if(!base)continue;
    const tr=mapped(base);if(el.getAttribute(name)!==tr)el.setAttribute(name,tr);
  }
  if(el instanceof HTMLInputElement&&['button','submit','reset'].includes(el.type)&&el.value){
    const name='value',src=sourceForAttr(el,name),base=norm(src),tr=mapped(base);if(el.value!==tr)el.value=tr;
  }
}
function translateSubtree(root){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return}
  if(root instanceof Element)translateAttrs(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){return n.nodeValue?.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes)translateTextNode(n);
  if(root.querySelectorAll)for(const el of root.querySelectorAll('[placeholder],[aria-label],[title],[alt],input[type="button"],input[type="submit"],input[type="reset"]'))translateAttrs(el);
}
function translateHead(){
  if(!titleSource)titleSource=document.title||'';
  const tt=mapped(norm(titleSource));if(tt&&document.title!==tt)document.title=tt;
  for(const el of document.querySelectorAll(META_SELECTOR)){
    const src=sourceForAttr(el,'content'),base=norm(src),tr=mapped(base);if(base&&el.getAttribute('content')!==tr)el.setAttribute('content',tr);
  }
}
function apply(){
  if(!catalog||applying)return;applying=true;
  try{
    document.documentElement.lang=active;
    document.documentElement.dir=RTL.has(active)?'rtl':'ltr';
    document.documentElement.dataset.csLocale=active;
    document.documentElement.dataset.csI18nCertified='1';
    document.documentElement.dataset.csI18nSurface=SURFACE;
    translateHead();translateSubtree(document.body);
    document.documentElement.classList.remove('cs-i18n-pending');
    window.dispatchEvent(new CustomEvent('cloudsales:static-i18n-ready',{detail:{locale:active,surface:SURFACE,version:VERSION}}));
  }finally{applying=false}
}
async function fetchCatalog(locale){
  const r=await fetch(`/i18n/catalog-v1/${encodeURIComponent(locale)}.json?v=${encodeURIComponent(VERSION)}`,{headers:{accept:'application/json'},cache:'no-cache'});
  if(!r.ok)throw new Error(`catalog_${locale}_${r.status}`);
  const j=await r.json();
  if(j?.locale!==locale||!j?.[SURFACE]||typeof j[SURFACE]!=='object')throw new Error(`catalog_invalid_${locale}_${SURFACE}`);
  return j[SURFACE];
}
async function load(locale){
  const lc=canonical(locale);if(loading&&active===lc)return loading;active=lc;
  document.documentElement.dataset.csI18nStatus='loading';
  loading=fetchCatalog(lc).then(x=>{catalog=x;document.documentElement.dataset.csI18nStatus='ready';apply();return x}).catch(e=>{catalog=null;document.documentElement.dataset.csI18nStatus='failed';console.error(`[${ID}]`,e);throw e}).finally(()=>{loading=null});
  return loading;
}
function startObserver(){
  if(observer)return;observer=new MutationObserver(records=>{
    if(applying||!catalog)return;applying=true;
    try{for(const rec of records){if(rec.type==='characterData')translateTextNode(rec.target);else if(rec.type==='attributes')translateAttrs(rec.target);else for(const n of rec.addedNodes)translateSubtree(n)}translateHead()}finally{applying=false}
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','alt','value']});
}
function syncLegacy(locale){
  try{
    if(SURFACE==='pwa'&&window.CloudSalesPwaI18n?.getLocale?.()!==locale)window.CloudSalesPwaI18n?.setLocale?.(locale);
    if(SURFACE==='commercial'&&window.CloudSalesI18n?.getLocale?.()!==locale)window.CloudSalesI18n?.setLocale?.(locale);
  }catch{}
}
async function setLocale(locale,{sync=true}={}){
  const lc=canonical(locale);try{localStorage.setItem(STORE,lc)}catch{}
  try{const u=new URL(location.href);u.searchParams.set('lang',lc);history.replaceState(null,'',u)}catch{}
  if(sync)syncLegacy(lc);
  return load(lc);
}
function boot(){startObserver();load(detect()).catch(()=>{});}
window.addEventListener('cloudsales:locale',e=>{const lc=canonical(e?.detail?.locale||detect());if(lc!==active||!catalog)load(lc).catch(()=>{});else queueMicrotask(apply)});
window.addEventListener('pageshow',()=>{if(catalog)apply()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.CloudSalesStaticI18n={version:VERSION,surface:SURFACE,languages:[...LANGS],getLocale:()=>active||detect(),setLocale,t:(s)=>mapped(s),apply:()=>apply()};
})();
