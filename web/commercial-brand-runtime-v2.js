(()=>{
'use strict';
/*
 CloudSales cross-browser brand hardening.
 Canonical brand remains in the CloudSales commercial source. This runtime exists
 only to protect the approved visual system from browser-level dark-mode color
 transformations and to keep the mobile presentation consistent across Samsung
 Internet, Chrome and Safari. It never changes pricing, business copy or another
 product's assets.
*/
const VERSION='2026.09.03.7';
const BRAND={
  purple:'#2D0A4A',
  pink:'#F955B6',
  white:'#F3F4F8',
  canvas:'#08070D',
  panel:'#121019',
  panel2:'#17141F',
  line:'#3B3442',
  muted:'#B8B3BE',
  violet:'#C13BE4'
};
const ua=navigator.userAgent||'';
const isSamsung=/SamsungBrowser/i.test(ua);

function ensureMeta(){
  let scheme=document.querySelector('meta[name="color-scheme"]');
  if(!scheme){scheme=document.createElement('meta');scheme.name='color-scheme';document.head.appendChild(scheme)}
  /* Samsung Internet uses the declared schemes together with prefers-color-scheme
     to decide whether it should apply its own Force Dark transformation. */
  scheme.content='light dark';
  let theme=document.querySelector('meta[name="theme-color"]');
  if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.appendChild(theme)}
  theme.content=BRAND.canvas;
  document.documentElement.style.colorScheme='dark';
  document.documentElement.dataset.csBrandUi=VERSION;
  if(isSamsung) document.documentElement.classList.add('cs-samsung-internet');
}

function css(){
  let style=document.getElementById('cloudsales-browser-ui-hardening-v3');
  if(!style){style=document.createElement('style');style.id='cloudsales-browser-ui-hardening-v3';document.head.appendChild(style)}
  style.textContent=`
:root{
  --cs-brand-purple:${BRAND.purple};
  --cs-brand-pink:${BRAND.pink};
  --cs-brand-white:${BRAND.white};
  --cs-brand-canvas:${BRAND.canvas};
  --cs-brand-panel:${BRAND.panel};
  --cs-brand-panel-2:${BRAND.panel2};
  --cs-brand-line:${BRAND.line};
  --cs-brand-muted:${BRAND.muted};
  --cs-brand-violet:${BRAND.violet};
  color-scheme:dark!important;
}
html,body{
  background-color:${BRAND.canvas}!important;
  color:${BRAND.white}!important;
  forced-color-adjust:none!important;
}
body{
  background-image:
    radial-gradient(980px 560px at 50% -190px,rgba(45,10,74,.96) 0%,rgba(45,10,74,.58) 31%,rgba(8,7,13,0) 72%),
    radial-gradient(580px 360px at 96% 24%,rgba(249,85,182,.075),rgba(8,7,13,0) 74%)!important;
  background-attachment:scroll!important;
}
.nav{
  background:rgba(8,7,13,.94)!important;
  border-bottom-color:rgba(249,85,182,.13)!important;
  box-shadow:0 10px 34px rgba(0,0,0,.18)!important;
}
.brand img{
  width:auto!important;
  height:39px!important;
  max-width:210px!important;
  object-fit:contain!important;
  filter:none!important;
  opacity:1!important;
}
.hero h1,.section h2,.card h3,.personText h3,.mission strong{
  color:${BRAND.white}!important;
  opacity:1!important;
}
.hero h1{
  text-wrap:balance;
  text-shadow:0 1px 1px rgba(0,0,0,.08)!important;
}
.grad,.hero h1 .grad,.hero h1 span.grad,.cs-crm-call strong{
  background-image:linear-gradient(90deg,${BRAND.white} 0%,#F7D7EC 34%,#F2A8D5 58%,${BRAND.pink} 100%)!important;
  background-color:${BRAND.pink}!important;
  -webkit-background-clip:text!important;
  background-clip:text!important;
  -webkit-text-fill-color:transparent!important;
  color:transparent!important;
  opacity:1!important;
  filter:none!important;
}
.hero p,.lead,.card p,.faq p,.micro,.benefit span,.outcome span,.csStoryLead,.csBmpIntro{
  color:${BRAND.muted}!important;
  opacity:1!important;
}
.hero p{color:#C3BEC9!important}
.eyebrow{
  color:#F7F3F8!important;
  background:rgba(45,10,74,.22)!important;
  border-color:rgba(249,85,182,.24)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.025)!important;
}
.btn{
  min-height:46px;
  color:${BRAND.white}!important;
  border-color:#403846!important;
  background:#121019!important;
  box-shadow:none;
}
.btn.primary,.csHeroTrial,.csFinalTrial,.csFooterCrmBtn{
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  background-color:${BRAND.pink}!important;
  background-image:linear-gradient(115deg,${BRAND.pink} 0%,#ED4FC3 42%,#D442D6 70%,${BRAND.violet} 100%)!important;
  border:1px solid rgba(255,255,255,.08)!important;
  box-shadow:0 12px 34px rgba(249,85,182,.28),inset 0 1px 0 rgba(255,255,255,.18)!important;
  opacity:1!important;
  filter:none!important;
}
.btn.primary:hover{box-shadow:0 14px 40px rgba(249,85,182,.34),inset 0 1px 0 rgba(255,255,255,.2)!important}
.card,.crm,.faq details,.included,.mission,.outcome,.benefit,.download a,.checkcard,.csStoryCard,.csSaving{
  background:linear-gradient(180deg,rgba(20,17,25,.97),rgba(12,10,16,.98))!important;
  border-color:#3D3543!important;
  color:${BRAND.white}!important;
}
.outcome{
  border-color:rgba(249,85,182,.18)!important;
  box-shadow:0 14px 38px rgba(0,0,0,.22)!important;
}
.outcome b,.benefit b{color:${BRAND.white}!important}
.plan.featured{
  border-color:rgba(249,85,182,.58)!important;
  box-shadow:0 0 0 1px rgba(249,85,182,.22),0 28px 74px rgba(249,85,182,.11)!important;
}
.badge,.trialMini{
  background:rgba(45,10,74,.62)!important;
  border-color:rgba(249,85,182,.28)!important;
  color:#F89CD1!important;
}
.trialBanner{
  background:linear-gradient(135deg,rgba(45,10,74,.62),rgba(17,14,21,.96))!important;
  border-color:rgba(249,85,182,.25)!important;
  color:#F7E8F1!important;
}
.bigPeople .person{
  border-color:rgba(249,85,182,.08)!important;
  background:
    radial-gradient(440px 320px at 82% 74%,rgba(249,85,182,.10),rgba(45,10,74,.06) 44%,rgba(8,7,13,0) 72%),
    transparent!important;
  box-shadow:none!important;
}
.person img,.cloudyImg,.agentsImg{
  filter:drop-shadow(0 24px 34px rgba(0,0,0,.48)) drop-shadow(0 0 28px rgba(249,85,182,.055))!important;
  opacity:1!important;
}
.csHookPanel,.csFinalBox,.csBmp{
  background:radial-gradient(560px 280px at 100% 0,rgba(249,85,182,.075),transparent 72%),linear-gradient(145deg,rgba(45,10,74,.36),rgba(13,11,17,.98))!important;
  border-color:rgba(249,85,182,.20)!important;
}
.cs-crm-band{background:#0C0911!important;border-color:#332A39!important}
.cs-crm-item{background:#141019!important;border-color:#3A3040!important;color:${BRAND.white}!important}
.cs-crm-call{background:linear-gradient(90deg,rgba(249,85,182,.075),rgba(45,10,74,.30))!important;border-color:rgba(249,85,182,.20)!important}

/* Samsung Internet can apply its own color transformation in dark mode. On that
   browser the critical gradient text uses direct brand colors, so it cannot turn
   into the near-black magenta seen on real devices. */
.cs-samsung-internet .grad,
.cs-samsung-internet .hero h1 .grad,
.cs-samsung-internet .hero h1 span.grad,
.cs-samsung-internet .cs-crm-call strong{
  background:none!important;
  background-image:none!important;
  color:${BRAND.pink}!important;
  -webkit-text-fill-color:${BRAND.pink}!important;
  text-shadow:0 0 28px rgba(249,85,182,.10)!important;
}
.cs-samsung-internet .hero h1{color:${BRAND.white}!important;-webkit-text-fill-color:${BRAND.white}!important}
.cs-samsung-internet .hero h1 .grad{color:${BRAND.pink}!important;-webkit-text-fill-color:${BRAND.pink}!important}
.cs-samsung-internet .hero p{color:#C8C3CD!important;-webkit-text-fill-color:#C8C3CD!important}
.cs-samsung-internet .eyebrow{color:#F7F3F8!important;-webkit-text-fill-color:#F7F3F8!important}
.cs-samsung-internet .btn.primary{color:#fff!important;-webkit-text-fill-color:#fff!important}

@media (prefers-color-scheme:dark){
  html,body{background-color:${BRAND.canvas}!important;color:${BRAND.white}!important}
  .hero h1,.section h2{color:${BRAND.white}!important}
  .btn.primary{background-color:${BRAND.pink}!important}
}
@media (max-width:620px){
  .wrap{width:min(var(--max),calc(100% - 28px))!important}
  .navin{height:66px!important;gap:10px!important}
  .brand img{height:34px!important;max-width:174px!important}
  .hero{padding-top:48px!important;padding-bottom:58px!important}
  .hero h1{font-size:clamp(48px,14.2vw,62px)!important;line-height:.96!important;letter-spacing:-.058em!important;margin:20px 0!important}
  .hero p{font-size:18px!important;line-height:1.52!important}
  .eyebrow{font-size:11px!important;line-height:1.28!important;padding:9px 12px!important}
  .actions{gap:10px!important;margin-top:24px!important}
  .actions .btn{min-height:50px!important;padding:13px 18px!important}
  .outcomeStrip{gap:10px!important;margin-top:24px!important}
  .outcome{padding:15px 16px!important;border-radius:18px!important}
  .outcome b{font-size:18px!important}
  .section{padding:72px 0!important}
  .section h2{line-height:1.03!important}
  .bigPeople .person{border-radius:24px!important}
}
@media (max-width:390px){
  .hero h1{font-size:46px!important}
  .actions .btn{padding-left:16px!important;padding-right:16px!important}
}
`;
}

function normalizeHighLevel(){
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0 && /^highlevel$/i.test((el.textContent||'').trim())) el.textContent='HighLevel';
  });
}

function hardenSamsungHero(){
  if(!isSamsung) return;
  document.querySelectorAll('.hero h1 .grad,.hero h1 span.grad').forEach(el=>{
    el.style.background='none';
    el.style.backgroundImage='none';
    el.style.color=BRAND.pink;
    el.style.webkitTextFillColor=BRAND.pink;
    el.style.opacity='1';
    el.style.filter='none';
  });
}

function apply(){
  ensureMeta();
  css();
  normalizeHighLevel();
  hardenSamsungHero();
}

function boot(){
  apply();
  setTimeout(apply,80);
  setTimeout(apply,300);
  setTimeout(apply,900);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
window.addEventListener('cloudsales:locale',()=>setTimeout(apply,0));
new MutationObserver(()=>setTimeout(hardenSamsungHero,0)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['lang','class']});
})();
