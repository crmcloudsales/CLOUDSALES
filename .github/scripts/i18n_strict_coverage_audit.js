const fs=require('fs'),vm=require('vm');
function literalAfter(src,marker){
  const m=src.indexOf(marker);if(m<0)throw Error('missing '+marker);
  const start=src.indexOf('{',m+marker.length);if(start<0)throw Error('missing object after '+marker);
  let depth=0,quote=null,esc=false;
  for(let i=start;i<src.length;i++){
    const ch=src[i];
    if(quote){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote)quote=null;continue}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw Error('unterminated object after '+marker);
}
function obj(code){return vm.runInNewContext('('+code+')')}
const c=fs.readFileSync('web/cloudsales-i18n-v1.js','utf8');
const T=obj(literalAfter(c,'const T='));
const FINAL=obj(literalAfter(c,'const CS_FINAL_TRANSLATIONS='));
for(const [lc,map] of Object.entries(FINAL))T[lc]=Object.assign(T[lc]||{},map);
const EN_FULL=obj(literalAfter(c,'const EN_FULL='));
const p=fs.readFileSync('web/pwa-i18n-runtime-v1.js','utf8');
const EN=obj(literalAfter(p,'const EN='));
const L=obj(literalAfter(p,'const L='));
const locales=['fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];
let fail=0;
console.log('COMMERCIAL_BASE_KEYS',Object.keys(EN_FULL).length);
for(const lc of locales){const miss=Object.keys(EN_FULL).filter(k=>!(k in (T[lc]||{})));console.log('COMMERCIAL',lc,'translated',Object.keys(EN_FULL).length-miss.length,'missing',miss.length);console.log('MISSING_COMMERCIAL_'+lc,JSON.stringify(miss));fail+=miss.length}
console.log('PWA_BASE_KEYS',Object.keys(EN).length);
for(const lc of locales){const miss=Object.keys(EN).filter(k=>!(k in (L[lc]||{})));console.log('PWA',lc,'translated',Object.keys(EN).length-miss.length,'missing',miss.length);console.log('MISSING_PWA_'+lc,JSON.stringify(miss));fail+=miss.length}
console.log('TOTAL_MISSING',fail);
process.exitCode=fail?2:0;
