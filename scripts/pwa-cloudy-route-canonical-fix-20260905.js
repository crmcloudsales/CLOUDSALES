const fs=require('fs');const p='web/native-shell-runtime-v1.js';let s=fs.readFileSync(p,'utf8');
// Cloudy is voice-first everywhere: route requests activate voice and never open a Cloudy page.
s=s.replace("function route(page){closeMore();if(page==='inventory')ensureInventory();", "function route(page){closeMore();if(page==='cloudy'){activateCloudyVoice();return}if(page==='inventory')ensureInventory();");
s=s.replace(/\(\)=>route\('cloudy'\)/g,'activateCloudyVoice');
s=s.replace("setTimeout(()=>{renderHome();buildCloudy();renderMarketing();markRoute()},120)","setTimeout(()=>{renderHome();renderMarketing();markRoute()},120)");
s=s.replace("if(page==='cloudy')buildCloudy();","");
fs.writeFileSync(p,s);
if(!s.includes("if(page==='cloudy'){activateCloudyVoice();return}"))throw Error('cloudy route guard missing');
if(s.includes("()=>route('cloudy')"))throw Error('legacy Cloudy route remains');
if(s.includes("renderHome();buildCloudy();renderMarketing()"))throw Error('legacy Cloudy boot remains');
console.log('CLOUDY_VOICE_ONLY_CANONICAL_PASS');