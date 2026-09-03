from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'.github/scripts/build_i18n_catalog_locale_20260903.mjs'
s=p.read_text(encoding='utf-8')
old="function numbers(s){return [...s.matchAll(/(?:[$€£¥]\\s*)?\\d+(?:[.,]\\d+)?\\s*%?/g)].map(m=>m[0].replace(/\\s+/g,'')).sort()}\nfunction validatePreservation(source,target){const a=numbers(source),b=numbers(target);if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('numeric_preservation_failed: '+source.slice(0,80)+' => '+target.slice(0,80));for(const brand of ['CloudSales','Cloudy','AgentCloud','CloudCo','LISTIA','Stripe','PayPal','Binance'])if(source.includes(brand)&&!target.includes(brand))throw new Error('brand_preservation_failed_'+brand)}"
new="function numbers(s){return [...s.matchAll(/(?:[$€£¥]\\s*)?\\d+(?:[.,]\\d+)?\\s*%?/g)].map(m=>m[0].replace(/\\s+/g,'')).sort()}\nfunction protectSensitive(text){const tokens=[];const protectedText=String(text).replace(/(?:[$€£¥]\\s*)?\\d+(?:[.,]\\d+)?\\s*%?/g,m=>{const id=`__CSNUM_${tokens.length}__`;tokens.push(m);return id});return{protectedText,tokens}}\nfunction restoreSensitive(text,tokens){let out=String(text);for(let i=0;i<tokens.length;i++)out=out.split(`__CSNUM_${i}__`).join(tokens[i]);return out}\nfunction validatePreservation(source,target){const a=numbers(source),b=numbers(target);if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('numeric_preservation_failed: '+source.slice(0,80)+' => '+target.slice(0,80));for(const brand of ['CloudSales','Cloudy','AgentCloud','CloudCo','LISTIA','Stripe','PayPal','Binance'])if(source.includes(brand)&&!target.includes(brand))throw new Error('brand_preservation_failed_'+brand)}"
if old not in s and 'function protectSensitive(text)' not in s: raise SystemExit('numeric helper target not found')
if old in s:s=s.replace(old,new,1)
old_user="const user=JSON.stringify({target_locale:locale,items:items.map(x=>({id:x.id,text:x.text}))});"
new_user="const protectedItems=items.map(x=>{const p=protectSensitive(x.text);return{id:x.id,text:p.protectedText,tokens:p.tokens}});const user=JSON.stringify({target_locale:locale,items:protectedItems.map(x=>({id:x.id,text:x.text}))});"
if old_user not in s and 'const protectedItems=items.map' not in s: raise SystemExit('user payload target not found')
if old_user in s:s=s.replace(old_user,new_user,1)
old_loop="for(const x of items){if(typeof tr[x.id]!=='string'||!tr[x.id].trim())throw new Error('missing_'+x.id);validatePreservation(x.text,tr[x.id])}return tr"
new_loop="const restored={};const protectedById=new Map(protectedItems.map(x=>[x.id,x]));for(const x of items){if(typeof tr[x.id]!=='string'||!tr[x.id].trim())throw new Error('missing_'+x.id);const px=protectedById.get(x.id);for(let i=0;i<(px?.tokens?.length||0);i++)if(!tr[x.id].includes(`__CSNUM_${i}__`))throw new Error('numeric_placeholder_missing_'+x.id+'_'+i);const value=restoreSensitive(tr[x.id],px?.tokens||[]);validatePreservation(x.text,value);restored[x.id]=value}return restored"
if old_loop not in s and 'const protectedById=new Map' not in s: raise SystemExit('restore loop target not found')
if old_loop in s:s=s.replace(old_loop,new_loop,1)
p.write_text(s,encoding='utf-8')
final=p.read_text(encoding='utf-8')
for marker in ['function protectSensitive(text)','function restoreSensitive(text,tokens)','const protectedItems=items.map','const protectedById=new Map','numeric_placeholder_missing_']: assert marker in final,marker
print('I18N_NUMERIC_PRESERVATION_FIX_OK')
