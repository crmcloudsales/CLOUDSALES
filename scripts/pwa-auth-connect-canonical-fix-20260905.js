const fs=require('fs');
const p='web/pwa.html';
let s=fs.readFileSync(p,'utf8');

const oldAuth="function showAuth(){auth.classList.remove('hidden');onboard.classList.add('hidden');shell.classList.add('hidden')}function showOnboard(){auth.classList.add('hidden');onboard.classList.remove('hidden');shell.classList.add('hidden')}function showApp(){auth.classList.add('hidden');onboard.classList.add('hidden');shell.classList.remove('hidden')}";
const newAuth="function showAuth(){auth.classList.remove('hidden');onboard.classList.add('hidden');shell.classList.add('hidden');try{window.csNativeAuthReset&&window.csNativeAuthReset()}catch{}}function showOnboard(){auth.classList.add('hidden');onboard.classList.remove('hidden');shell.classList.add('hidden');try{window.csNativeAuthReset&&window.csNativeAuthReset()}catch{}}function showApp(){auth.classList.add('hidden');onboard.classList.add('hidden');shell.classList.remove('hidden');try{window.csNativeAuthenticatedBoot&&window.csNativeAuthenticatedBoot()}catch{}}";
if(!s.includes(oldAuth)) throw Error('auth functions anchor missing');
s=s.replace(oldAuth,newAuth);

const start=s.indexOf('function renderConnect(){');
const end=s.indexOf('async function renderFiles()',start);
if(start<0||end<0) throw Error('renderConnect block missing');
const connectFn=`function renderConnect(){
 const ps=catalog?.providers||state.providers||[];
 const wanted=['zernio','buffer','youtube','google_business_profile'];
 const labels={zernio:'Instagram / Facebook',buffer:'LinkedIn / TikTok / Threads',youtube:'YouTube',google_business_profile:'Google Business Profile'};
 const desc={zernio:'Redes sociales · conexión autorizada',buffer:'Redes sociales · conexión autorizada',youtube:'Video · Google OAuth',google_business_profile:'Perfil de negocio · Google OAuth'};
 const visible=ps.filter(p=>wanted.includes(String(p.provider_key||'')));
 connectGrid.innerHTML=visible.length?visible.map(p=>{const c=p.connection||currentOrg.connections?.find(x=>x.provider_key===p.provider_key),r=p.readiness;const connected=c?.status==='connected';return \`<div class="provider"><div class="providerTop"><b>\${esc(labels[p.provider_key]||providerName(p))}</b><span class="tag \${connected?'connected':''}">\${connected?'Connected':esc(r?.status||p.availability||'Available')}</span></div><p>\${esc(desc[p.provider_key]||'Redes sociales')}</p>\${connected?'<button class="btn small" disabled>Conectado</button>':\`<button class="btn small providerConnect" data-provider="\${esc(p.provider_key)}">Conectar</button>\`}</div>\`}).join(''):'<div class="notice">Tus conexiones de redes sociales aparecerán aquí.</div>';
 document.querySelectorAll('.providerConnect').forEach(b=>b.onclick=()=>connectProvider(b.dataset.provider));
}`;
s=s.slice(0,start)+connectFn+s.slice(end);

// Force the newest native shell on installed PWAs.
s=s.replace(/<script src="\/native-shell-runtime-v1\.js(?:\?[^\"]*)?"/g,'<script src="/native-shell-runtime-v1.js?v=202609050508"');
fs.writeFileSync(p,s);

const n='web/native-shell-runtime-v1.js';
let j=fs.readFileSync(n,'utf8');
j=j.replace("const ID='cs-native-shell-v7';","const ID='cs-native-shell-v8';");
const bootTail="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();";
if(!j.includes(bootTail)) throw Error('native boot tail missing');
const replacement=`function csNativeAuthReset(){document.getElementById('csNativeBottom')?.remove();document.getElementById('csNativeMoreButton')?.remove();document.getElementById('csNativeMore')?.remove();document.documentElement.classList.remove('cs-native-app')}
async function csNativeAuthenticatedBoot(){if(!document.querySelector('.shell:not(.hidden)'))return;await boot()}
window.csNativeAuthReset=csNativeAuthReset;window.csNativeAuthenticatedBoot=csNativeAuthenticatedBoot;
const shellObserver=new MutationObserver(()=>{const sh=document.querySelector('.shell');if(sh&&!sh.classList.contains('hidden'))csNativeAuthenticatedBoot();else csNativeAuthReset()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const sh=document.querySelector('.shell');if(sh)shellObserver.observe(sh,{attributes:true,attributeFilter:['class']});if(sh&&!sh.classList.contains('hidden'))csNativeAuthenticatedBoot()},{once:true});else{const sh=document.querySelector('.shell');if(sh)shellObserver.observe(sh,{attributes:true,attributeFilter:['class']});if(sh&&!sh.classList.contains('hidden'))csNativeAuthenticatedBoot()}`;
j=j.replace(bootTail,replacement);
fs.writeFileSync(n,j);

const sw='web/sw.js';let w=fs.readFileSync(sw,'utf8');
w=w.replace(/const CACHE='[^']+';/,"const CACHE='cloudsales-pwa-2026.09.05.2-auth-social-canonical';");
fs.writeFileSync(sw,w);

for(const bad of ['Amazon SES','HubSpot','Resend']){
  const rc=connectFn.includes(bad);
  if(rc) throw Error('hidden provider leaked into connect surface: '+bad);
}
if(!connectFn.includes("wanted=['zernio','buffer','youtube','google_business_profile']"))throw Error('social filter missing');
if(!newAuth.includes('csNativeAuthReset'))throw Error('auth reset missing');
if(!j.includes('csNativeAuthenticatedBoot'))throw Error('authenticated boot missing');
console.log('PWA_AUTH_SOCIAL_CANONICAL_PASS');