(()=>{
'use strict';
const ID='cs-pwa-native-compat-v1';
const MOBILE=()=>matchMedia('(max-width:860px)').matches;
function css(){if(document.getElementById(ID+'-css'))return;const s=document.createElement('style');s.id=ID+'-css';s.textContent=`
@media(max-width:860px){
html.cs-native-app .csNativeLegacy{display:none!important}
html.cs-native-app .content,html.cs-native-app .page,html.cs-native-app .csNativeScreen{min-height:0!important}
html.cs-native-app button,html.cs-native-app input,html.cs-native-app textarea,html.cs-native-app select{font-family:inherit}
html.cs-native-app .csNHeader p,html.cs-native-app .csNHero p,html.cs-native-app .csNRow p,html.cs-native-app .csNEmpty,html.cs-native-app .csNCloudyHero p{font-size:max(11px,.82rem)!important}
html.cs-native-app .csNBottom button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
}
`;document.head.appendChild(s)}
function lang(){const l=document.documentElement.lang||document.documentElement.dataset.csLocale||navigator.language||'es-MX';const m={'es':'es-MX','en':'en-US','fr':'fr-FR','it':'it-IT','pt':'pt-BR','de':'de-DE','ar':'ar-AE','ru':'ru-RU','he':'he-IL','zh':'zh-CN','ja':'ja-JP'};return m[String(l).split('-')[0]]||l}
let wake=null,wakeOn=false,restartTimer=null;
function supported(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function activeUser(){try{return Boolean(session?.access_token&&currentOrg?.id&&!document.hidden&&MOBILE())}catch{return false}}
function startWake(){const SR=supported();if(!SR||wakeOn||!activeUser())return;try{wake=new SR();wake.lang=lang();wake.continuous=true;wake.interimResults=false;wake.maxAlternatives=1;wake.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const text=String(e.results[i]?.[0]?.transcript||'').toLocaleLowerCase();if(/\bcloudy\b/i.test(text)){try{window.csNativeRoute?.('cloudy')}catch{}setTimeout(()=>document.getElementById('cloudyMic')?.click(),220);break}}};wake.onend=()=>{wakeOn=false;if(activeUser())restartTimer=setTimeout(startWake,1400)};wake.onerror=()=>{};wake.start();wakeOn=true}catch{wakeOn=false}}
function stopWake(){clearTimeout(restartTimer);restartTimer=null;if(wakeOn){try{wake?.stop()}catch{}}wakeOn=false;wake=null}
function syncWake(){if(activeUser())startWake();else stopWake()}
function normalizeLegacy(){if(!MOBILE())return;document.querySelectorAll('.csNativeLegacy').forEach(x=>x.style.display='none');document.querySelectorAll('[data-page="cloudy"] b,.sidebar [data-page="cloudy"] .navicon').forEach(x=>{if(/[☁☂]/.test(x.textContent||''))x.textContent='AI'})}
function boot(){css();normalizeLegacy();setTimeout(normalizeLegacy,350);document.addEventListener('visibilitychange',syncWake);window.addEventListener('focus',syncWake);window.addEventListener('blur',stopWake);document.addEventListener('click',e=>{if(e.target.closest('#csNativeBottom,[data-page]'))setTimeout(normalizeLegacy,20)});setTimeout(syncWake,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
