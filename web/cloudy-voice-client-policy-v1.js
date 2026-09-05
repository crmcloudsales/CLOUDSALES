(()=>{
'use strict';
const ID='cs-cloudy-voice-policy-v1';
const FORBIDDEN=/listia|catalina|paulina|monica|sabina|female|mujer|lucia|sofia|carmen|elena/i;
const MALE=/ram[oó]n|raul|raúl|jorge|diego|carlos|enrique|pablo|miguel|andr[eé]s|alejandro|antonio|juan|luis|mateo|sergio|manuel|male|mascul/i;
let last='';
function locale(){const raw=localStorage.getItem('cs_locale')||document.documentElement.dataset.csLocale||document.documentElement.lang||'es';return String(raw).toLowerCase()}
function spanish(){return locale().startsWith('es')}
function voices(){try{return speechSynthesis.getVoices()||[]}catch{return[]}}
function maleVoice(){const vs=voices().filter(v=>/^es([_-]|$)/i.test(v.lang||'')&&!FORBIDDEN.test(`${v.name} ${v.voiceURI}`));return vs.find(v=>/ram[oó]n/i.test(`${v.name} ${v.voiceURI}`))||vs.find(v=>MALE.test(`${v.name} ${v.voiceURI}`))||null}
function setSpeaking(on){const b=document.querySelector('#csNativeBottom .csNCloudy');if(b)b.classList.toggle('csPwaMaleSpeaking',on);document.documentElement.dataset.csPwaMaleSpeaking=on?'1':'0'}
function speak(text,done=()=>{}){if(!spanish()||!('speechSynthesis'in window)){done();return}const v=maleVoice();if(!v){console.warn('Cloudy male voice unavailable; forbidden to fall back to Listia/Catalina or an unverified generic voice.');done();return}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.lang='es-MX';u.voice=v;u.rate=.98;u.pitch=.92;u.onstart=()=>setSpeaking(true);u.onend=()=>{setSpeaking(false);done()};u.onerror=()=>{setSpeaking(false);done()};speechSynthesis.speak(u)}catch{setSpeaking(false);done()}}
function startMic(){const mic=document.getElementById('micBtn');if(mic)mic.click()}
function click(ev){const b=ev.target.closest?.('#csNativeBottom .csNCloudy');if(!b)return;ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();if(spanish())speak('Te escucho.',startMic);else startMic()}
function watch(){const box=document.getElementById('messages');if(!box||box.dataset.csMaleVoiceWatch==='1')return;box.dataset.csMaleVoiceWatch='1';new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes){if(!(n instanceof HTMLElement)||!n.classList.contains('msg')||!n.classList.contains('cloudy'))continue;const text=(n.textContent||'').trim();if(!text||text===last)continue;last=text;if(spanish())speak(text)}}}).observe(box,{childList:true})}
function css(){if(document.getElementById(ID+'-css'))return;const s=document.createElement('style');s.id=ID+'-css';s.textContent='.csNCloudy.csPwaMaleSpeaking .csCloudyHead{box-shadow:0 0 0 5px rgba(15,13,21,.96),0 0 0 9px rgba(249,85,182,.13),0 0 38px rgba(249,85,182,.58)!important}.csNCloudy.csPwaMaleSpeaking .csCloudyHead:before{animation:csOrbSpeak .42s ease-in-out infinite alternate!important}';document.head.appendChild(s)}
function boot(){css();document.addEventListener('click',click,true);watch();new MutationObserver(watch).observe(document.body,{childList:true,subtree:true});try{speechSynthesis.onvoiceschanged=()=>maleVoice()}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
