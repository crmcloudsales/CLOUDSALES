from pathlib import Path
import re

PATH = Path('web/commercial.html')
html = PATH.read_text(encoding='utf-8')

MARKER = 'cs-brand-ui-canonical-20260903'
if MARKER in html:
    print('Canonical CloudSales UI hardening already installed')
    raise SystemExit(0)

# Samsung Internet can apply a dark-mode color transformation unless the site
# declares both schemes and supplies its own dark-mode styling. CloudSales is
# intentionally dark, so advertise both schemes while keeping the actual UI
# explicitly dark below.
html = re.sub(
    r'<meta\s+name=["\']color-scheme["\']\s+content=["\'][^"\']*["\']\s*/?>',
    '<meta name="color-scheme" content="light dark">',
    html,
    count=1,
    flags=re.I,
)

BOOTSTRAP = r'''<script id="cs-brand-ui-bootstrap-20260903">
(()=>{
  'use strict';
  const root=document.documentElement;
  root.classList.add('cs-brand-v20260903');
  const samsung=/SamsungBrowser/i.test(navigator.userAgent||'');
  if(samsung) root.classList.add('cs-samsung-internet');

  function directSamsungGradient(){
    if(!samsung) return;
    document.querySelectorAll('.hero h1 .grad,.hero h1 span.grad').forEach(el=>{
      const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt || el.dataset.csDirectBrand===txt) return;
      el.dataset.csDirectBrand=txt;
      if(/^You stay in control\.?$/i.test(txt)){
        el.innerHTML='<span class="cs-direct-lilac">You stay in </span><span class="cs-direct-pink">control.</span>';
      }else if(/^Tú mantienes el control\.?$/i.test(txt)){
        el.innerHTML='<span class="cs-direct-lilac">Tú mantienes el </span><span class="cs-direct-pink">control.</span>';
      }else{
        el.classList.add('cs-direct-brand');
      }
    });
  }

  function apply(){
    directSamsungGradient();
    const theme=document.querySelector('meta[name="theme-color"]');
    if(theme) theme.setAttribute('content','#08070D');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  setTimeout(apply,80); setTimeout(apply,320); setTimeout(apply,1000);
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['lang']});
  window.addEventListener('cloudsales:locale',()=>setTimeout(apply,0));
})();
</script>'''

STYLE = r'''<style id="cs-brand-ui-canonical-20260903">
/* CloudSales canonical commercial UI — 2026-09-03
   Brand source of truth: #2D0A4A / #F955B6 / #F3F4F8.
   Neutral blacks, panels and muted text are interface colors, not brand colors. */
html.cs-brand-v20260903{
  --cs-purple:#2D0A4A;
  --cs-pink:#F955B6;
  --cs-white:#F3F4F8;
  --cs-canvas:#08070D;
  --cs-panel:#121019;
  --cs-panel-2:#17141F;
  --cs-line:#3C3442;
  --cs-muted:#B8B3BE;
  --cs-violet:#C13BE4;
  color-scheme:dark!important;
  background:#08070D!important;
  forced-color-adjust:none!important;
}
html.cs-brand-v20260903 body{
  background-color:#08070D!important;
  color:#F3F4F8!important;
  background-image:
    radial-gradient(980px 560px at 50% -190px,rgba(45,10,74,.98) 0%,rgba(45,10,74,.64) 31%,rgba(8,7,13,0) 72%),
    radial-gradient(650px 420px at 98% 25%,rgba(249,85,182,.08),rgba(8,7,13,0) 74%)!important;
  background-attachment:scroll!important;
  -webkit-font-smoothing:antialiased!important;
  text-rendering:optimizeLegibility!important;
}
html.cs-brand-v20260903 body .nav{
  background:rgba(8,7,13,.95)!important;
  border-bottom-color:rgba(249,85,182,.14)!important;
  box-shadow:0 12px 38px rgba(0,0,0,.18)!important;
  backdrop-filter:blur(16px)!important;
  -webkit-backdrop-filter:blur(16px)!important;
}
html.cs-brand-v20260903 body .brand img{
  width:auto!important;
  height:39px!important;
  max-width:210px!important;
  object-fit:contain!important;
  object-position:left center!important;
  filter:none!important;
  opacity:1!important;
}
html.cs-brand-v20260903 body .hero h1,
html.cs-brand-v20260903 body .section h2,
html.cs-brand-v20260903 body .card h3,
html.cs-brand-v20260903 body .personText h3,
html.cs-brand-v20260903 body .mission strong{
  color:#F3F4F8!important;
  -webkit-text-fill-color:#F3F4F8!important;
  opacity:1!important;
}
html.cs-brand-v20260903 body .hero h1{
  text-wrap:balance!important;
  text-shadow:0 1px 1px rgba(0,0,0,.08)!important;
}
html.cs-brand-v20260903 body .hero h1 .grad,
html.cs-brand-v20260903 body .hero h1 span.grad,
html.cs-brand-v20260903 body .grad,
html.cs-brand-v20260903 body .cs-crm-call strong{
  background-color:#F955B6!important;
  background-image:linear-gradient(90deg,#F3F4F8 0%,#F7D7EC 34%,#F2A8D5 58%,#F955B6 100%)!important;
  -webkit-background-clip:text!important;
  background-clip:text!important;
  -webkit-text-fill-color:transparent!important;
  color:transparent!important;
  opacity:1!important;
  filter:none!important;
}
html.cs-brand-v20260903 body .hero p,
html.cs-brand-v20260903 body .lead,
html.cs-brand-v20260903 body .card p,
html.cs-brand-v20260903 body .faq p,
html.cs-brand-v20260903 body .micro,
html.cs-brand-v20260903 body .benefit span,
html.cs-brand-v20260903 body .outcome span,
html.cs-brand-v20260903 body .csStoryLead,
html.cs-brand-v20260903 body .csBmpIntro{
  color:#B8B3BE!important;
  -webkit-text-fill-color:#B8B3BE!important;
  opacity:1!important;
}
html.cs-brand-v20260903 body .hero p{
  color:#C7C2CC!important;
  -webkit-text-fill-color:#C7C2CC!important;
}
html.cs-brand-v20260903 body .eyebrow{
  color:#F7F3F8!important;
  -webkit-text-fill-color:#F7F3F8!important;
  background:rgba(45,10,74,.24)!important;
  border-color:rgba(249,85,182,.28)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03)!important;
}
html.cs-brand-v20260903 body .btn{
  min-height:46px!important;
  color:#F3F4F8!important;
  -webkit-text-fill-color:#F3F4F8!important;
  border-color:#403846!important;
  background:#121019!important;
  filter:none!important;
  opacity:1!important;
}
html.cs-brand-v20260903 body .btn.primary,
html.cs-brand-v20260903 body .csHeroTrial,
html.cs-brand-v20260903 body .csFinalTrial,
html.cs-brand-v20260903 body .csFooterCrmBtn{
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  background-color:#F955B6!important;
  background-image:linear-gradient(115deg,#F955B6 0%,#ED4FC3 42%,#D442D6 70%,#C13BE4 100%)!important;
  border:1px solid rgba(255,255,255,.09)!important;
  box-shadow:0 13px 36px rgba(249,85,182,.31),inset 0 1px 0 rgba(255,255,255,.18)!important;
  opacity:1!important;
  filter:none!important;
}
html.cs-brand-v20260903 body .btn.primary:hover{
  box-shadow:0 15px 42px rgba(249,85,182,.37),inset 0 1px 0 rgba(255,255,255,.20)!important;
}
html.cs-brand-v20260903 body .card,
html.cs-brand-v20260903 body .crm,
html.cs-brand-v20260903 body .faq details,
html.cs-brand-v20260903 body .included,
html.cs-brand-v20260903 body .mission,
html.cs-brand-v20260903 body .outcome,
html.cs-brand-v20260903 body .benefit,
html.cs-brand-v20260903 body .download a,
html.cs-brand-v20260903 body .checkcard,
html.cs-brand-v20260903 body .csStoryCard,
html.cs-brand-v20260903 body .csSaving{
  background:linear-gradient(180deg,rgba(20,17,25,.97),rgba(12,10,16,.985))!important;
  border-color:#3D3543!important;
  color:#F3F4F8!important;
}
html.cs-brand-v20260903 body .outcome{
  border-color:rgba(249,85,182,.18)!important;
  box-shadow:0 14px 38px rgba(0,0,0,.22)!important;
}
html.cs-brand-v20260903 body .outcome b,
html.cs-brand-v20260903 body .benefit b{color:#F3F4F8!important;-webkit-text-fill-color:#F3F4F8!important}
html.cs-brand-v20260903 body .plan.featured{
  border-color:rgba(249,85,182,.62)!important;
  box-shadow:0 0 0 1px rgba(249,85,182,.24),0 28px 76px rgba(249,85,182,.12)!important;
}
html.cs-brand-v20260903 body .badge,
html.cs-brand-v20260903 body .trialMini{
  background:rgba(45,10,74,.62)!important;
  border-color:rgba(249,85,182,.30)!important;
  color:#F89CD1!important;
  -webkit-text-fill-color:#F89CD1!important;
}
html.cs-brand-v20260903 body .trialBanner{
  background:linear-gradient(135deg,rgba(45,10,74,.64),rgba(17,14,21,.97))!important;
  border-color:rgba(249,85,182,.27)!important;
  color:#F7E8F1!important;
}
/* Characters are product actors, not flyer/card art. Keep the official files
   untouched and integrate them into the page with controlled light only. */
html.cs-brand-v20260903 body .bigPeople .person{
  border-color:rgba(249,85,182,.07)!important;
  background:
    radial-gradient(460px 330px at 82% 74%,rgba(249,85,182,.10),rgba(45,10,74,.07) 44%,rgba(8,7,13,0) 73%),
    transparent!important;
  box-shadow:none!important;
}
html.cs-brand-v20260903 body .person img,
html.cs-brand-v20260903 body .cloudyImg,
html.cs-brand-v20260903 body .agentsImg{
  filter:drop-shadow(0 24px 36px rgba(0,0,0,.50)) drop-shadow(0 0 30px rgba(249,85,182,.06))!important;
  opacity:1!important;
}
html.cs-brand-v20260903 body .csHookPanel,
html.cs-brand-v20260903 body .csFinalBox,
html.cs-brand-v20260903 body .csBmp{
  background:radial-gradient(580px 300px at 100% 0,rgba(249,85,182,.08),transparent 72%),linear-gradient(145deg,rgba(45,10,74,.37),rgba(13,11,17,.985))!important;
  border-color:rgba(249,85,182,.21)!important;
}
html.cs-brand-v20260903 body .cs-crm-band{background:#0C0911!important;border-color:#332A39!important}
html.cs-brand-v20260903 body .cs-crm-item{background:#141019!important;border-color:#3A3040!important;color:#F3F4F8!important}
html.cs-brand-v20260903 body .cs-crm-call{background:linear-gradient(90deg,rgba(249,85,182,.08),rgba(45,10,74,.32))!important;border-color:rgba(249,85,182,.22)!important}

/* Real-device Samsung Internet fallback. Do not rely on transparent clipped
   text because Force Dark may remap the composited result to near-black. */
html.cs-brand-v20260903.cs-samsung-internet body .hero h1 .grad,
html.cs-brand-v20260903.cs-samsung-internet body .hero h1 span.grad,
html.cs-brand-v20260903.cs-samsung-internet body .grad,
html.cs-brand-v20260903.cs-samsung-internet body .cs-crm-call strong{
  background:none!important;
  background-image:none!important;
  color:#F955B6!important;
  -webkit-text-fill-color:#F955B6!important;
  opacity:1!important;
  filter:none!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .hero h1{
  color:#F3F4F8!important;
  -webkit-text-fill-color:#F3F4F8!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .hero h1 .grad .cs-direct-lilac{
  color:#F1C9E8!important;
  -webkit-text-fill-color:#F1C9E8!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .hero h1 .grad .cs-direct-pink,
html.cs-brand-v20260903.cs-samsung-internet body .hero h1 .grad.cs-direct-brand{
  color:#F955B6!important;
  -webkit-text-fill-color:#F955B6!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .hero p{
  color:#CBC6CF!important;
  -webkit-text-fill-color:#CBC6CF!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .eyebrow{
  color:#F7F3F8!important;
  -webkit-text-fill-color:#F7F3F8!important;
}
html.cs-brand-v20260903.cs-samsung-internet body .btn.primary{
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  background-color:#F955B6!important;
}

@media (prefers-color-scheme:dark){
  html.cs-brand-v20260903,html.cs-brand-v20260903 body{background-color:#08070D!important;color:#F3F4F8!important}
  html.cs-brand-v20260903 body .hero h1,html.cs-brand-v20260903 body .section h2{color:#F3F4F8!important}
  html.cs-brand-v20260903 body .btn.primary{background-color:#F955B6!important}
}
@media (max-width:620px){
  html.cs-brand-v20260903 body .wrap{width:min(var(--max),calc(100% - 28px))!important}
  html.cs-brand-v20260903 body .navin{height:66px!important;gap:10px!important}
  html.cs-brand-v20260903 body .brand img{height:34px!important;max-width:174px!important}
  html.cs-brand-v20260903 body .hero{padding-top:48px!important;padding-bottom:58px!important}
  html.cs-brand-v20260903 body .hero h1{font-size:clamp(48px,14.2vw,62px)!important;line-height:.96!important;letter-spacing:-.058em!important;margin:20px 0!important}
  html.cs-brand-v20260903 body .hero p{font-size:18px!important;line-height:1.52!important}
  html.cs-brand-v20260903 body .eyebrow{font-size:11px!important;line-height:1.28!important;padding:9px 12px!important}
  html.cs-brand-v20260903 body .actions{gap:10px!important;margin-top:24px!important}
  html.cs-brand-v20260903 body .actions .btn{min-height:50px!important;padding:13px 18px!important}
  html.cs-brand-v20260903 body .outcomeStrip{gap:10px!important;margin-top:24px!important}
  html.cs-brand-v20260903 body .outcome{padding:15px 16px!important;border-radius:18px!important}
  html.cs-brand-v20260903 body .outcome b{font-size:18px!important}
  html.cs-brand-v20260903 body .section{padding:72px 0!important}
  html.cs-brand-v20260903 body .section h2{line-height:1.03!important}
  html.cs-brand-v20260903 body .bigPeople .person{border-radius:24px!important}
}
@media (max-width:390px){
  html.cs-brand-v20260903 body .hero h1{font-size:46px!important}
  html.cs-brand-v20260903 body .actions .btn{padding-left:16px!important;padding-right:16px!important}
}
</style>'''

if '</head>' not in html.lower():
    raise RuntimeError('web/commercial.html has no closing head')

# Insert last in the source head so canonical brand rules are part of first
# paint, not a later runtime patch.
pos = html.lower().rfind('</head>')
html = html[:pos] + '\n' + BOOTSTRAP + '\n' + STYLE + '\n' + html[pos:]

# When the official full logo is already the nav asset, an adjacent synthetic
# text wordmark duplicates the brand on wider screens. Hide/remove only that
# known legacy duplicate; never modify the logo image itself.
html = re.sub(
    r'(<a[^>]+class=["\'][^"\']*brand[^"\']*["\'][^>]*>\s*<img[^>]+cloudsales-logo-official-v2\.png[^>]*>)\s*<span>Cloud<b>Sales</b></span>',
    r'\1',
    html,
    count=1,
    flags=re.I,
)

PATH.write_text(html, encoding='utf-8')
print('Installed canonical CloudSales brand/UI hardening in web/commercial.html')
