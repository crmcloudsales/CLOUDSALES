# One-time deterministic compact mobile auth patch.
from pathlib import Path

p=Path('web/pwa.html')
s=p.read_text()
marker='</style><style id="cs-i18n-boot-20260902">'
if marker not in s:
    raise SystemExit('style marker not found')
css='''
/* CloudSales mobile auth: keep Sign in / Create account the same compact height. */
@media(max-width:580px){
  .auth{min-height:100dvh;padding:10px 12px;align-items:center;overflow:hidden}
  .authbox{height:min(700px,calc(100dvh - 20px));min-height:0;padding:20px 22px;border-radius:24px;overflow:hidden;display:flex;flex-direction:column}
  .authbox>.logo{min-height:42px;margin:0 0 2px}
  .authbox>.logo img{height:42px!important;width:auto!important}
  .auth h1{font-size:32px;line-height:1.03;margin:14px 0 7px}
  .authbox>p.muted{font-size:14px;line-height:1.35;margin:0 0 8px}
  .tabs{margin:10px 0 9px;padding:3px;border-radius:13px}
  .tabs button{padding:8px 6px}
  #googleAuthWrap{gap:7px!important;margin:0 0 8px!important}
  #googleAuthWrap .btn{padding:9px 13px!important;min-height:42px;font-size:14px}
  #googleAuthWrap>div:last-child{margin:0!important;line-height:1}
  .authbox .field{gap:4px;margin:7px 0}
  .authbox .field label{font-size:10px}
  .authbox .field input{height:44px;padding:9px 12px;border-radius:12px}
  #signupEmailNotice{margin:5px 0 6px!important;padding:8px 10px!important;font-size:10px!important;line-height:1.28!important;border-radius:12px!important}
  #authBtn{min-height:44px;padding:9px 14px;margin-top:5px}
  #authMsg{margin-top:5px;min-height:0;font-size:10px;line-height:1.25}
  .authbox>div:last-child{margin-top:8px!important;font-size:9px!important;line-height:1.3}
}
'''
if 'CloudSales mobile auth: keep Sign in / Create account the same compact height.' not in s:
    s=s.replace(marker,css+marker,1)
p.write_text(s)
print('compact auth css applied')
