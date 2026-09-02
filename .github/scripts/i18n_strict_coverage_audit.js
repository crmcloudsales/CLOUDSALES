const fs=require('fs'),vm=require('vm');
function extract(src,start,end){const a=src.indexOf(start);if(a<0)throw Error('missing '+start);const b=src.indexOf(end,a+start.length);if(b<0)throw Error('missing '+end);return src.slice(a+start.length,b).trim()}
function obj(code){return vm.runInNewContext('('+code+')')}
const c=fs.readFileSync('web/cloudsales-i18n-v1.js','utf8');
const T=obj(extract(c,'const T=',';\nconst EN_FULL='));
const EN_FULL=obj(extract(c,'const EN_FULL=',';\n\nconst TRIAL_COPY='));
const p=fs.readFileSync('web/pwa-i18n-runtime-v1.js','utf8');
const EN=obj(extract(p,'const EN=',';\nconst L='));
const L=obj(extract(p,'const L=',';\nfunction locale'));
const locales=['fr','it','pt-BR','de','ar-AE','ru','he','zh-CN','ja'];
let fail=0;
console.log('COMMERCIAL_BASE_KEYS',Object.keys(EN_FULL).length);
for(const lc of locales){const miss=Object.keys(EN_FULL).filter(k=>!(k in (T[lc]||{})));console.log('COMMERCIAL',lc,'translated',Object.keys(EN_FULL).length-miss.length,'missing',miss.length);console.log('MISSING_COMMERCIAL_'+lc,JSON.stringify(miss));if(miss.length)fail+=miss.length}
console.log('PWA_BASE_KEYS',Object.keys(EN).length);
for(const lc of locales){const miss=Object.keys(EN).filter(k=>!(k in (L[lc]||{})));console.log('PWA',lc,'translated',Object.keys(EN).length-miss.length,'missing',miss.length);console.log('MISSING_PWA_'+lc,JSON.stringify(miss));if(miss.length)fail+=miss.length}
console.log('TOTAL_MISSING',fail);
process.exit(0);
