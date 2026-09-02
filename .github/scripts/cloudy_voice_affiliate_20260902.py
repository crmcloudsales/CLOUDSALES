from pathlib import Path
import re

# ---------- Cloudy voice-first ----------
p=Path('web/cloudy-runtime-v3.js')
s=p.read_text()
s=s.replace("const VERSION = '2026.08.29.1';","const VERSION = '2026.09.02.2';",1)
s=s.replace("  const LOCALE = 'es-MX';\n", "", 1)
s=s.replace("  let autoVoice = localStorage.getItem('cs_cloudy_auto_voice') === '1';", "  let autoVoice = true;\n  let handsFree = false;", 1)

anchor="  const normalize = value => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();\n"
insert=r'''  const VOICE_COPY={
    es:{ready:'Listo',listening:'Escuchando…',transcribing:'Entendiendo…',thinking:'Pensando…',speaking:'Hablando…',error:'Inténtalo de nuevo',noSpeech:'No escuché una frase',didntUnderstand:'No pude entenderte. Inténtalo de nuevo.',permission:'Necesito permiso del micrófono para escucharte.',tap:'Toca una vez y habla con Cloudy.'},
    en:{ready:'Ready',listening:'Listening…',transcribing:'Understanding…',thinking:'Thinking…',speaking:'Speaking…',error:'Try again',noSpeech:'I did not hear a phrase',didntUnderstand:'I could not understand you. Try again.',permission:'I need microphone permission to hear you.',tap:'Tap once and talk to Cloudy.'},
    fr:{ready:'Prêt',listening:'J’écoute…',transcribing:'Compréhension…',thinking:'Réflexion…',speaking:'Je parle…',error:'Réessayez',noSpeech:'Je n’ai pas entendu de phrase',didntUnderstand:'Je ne vous ai pas compris. Réessayez.',permission:'J’ai besoin de l’autorisation du microphone.',tap:'Touchez une fois et parlez à Cloudy.'},
    it:{ready:'Pronto',listening:'Ascolto…',transcribing:'Comprendo…',thinking:'Penso…',speaking:'Parlo…',error:'Riprova',noSpeech:'Non ho sentito una frase',didntUnderstand:'Non ho capito. Riprova.',permission:'Ho bisogno del permesso del microfono.',tap:'Tocca una volta e parla con Cloudy.'},
    'pt-BR':{ready:'Pronto',listening:'Ouvindo…',transcribing:'Entendendo…',thinking:'Pensando…',speaking:'Falando…',error:'Tente novamente',noSpeech:'Não ouvi uma frase',didntUnderstand:'Não consegui entender. Tente novamente.',permission:'Preciso da permissão do microfone.',tap:'Toque uma vez e fale com a Cloudy.'},
    de:{ready:'Bereit',listening:'Ich höre zu…',transcribing:'Verstehe…',thinking:'Denke nach…',speaking:'Spreche…',error:'Erneut versuchen',noSpeech:'Ich habe keinen Satz gehört',didntUnderstand:'Ich konnte Sie nicht verstehen. Versuchen Sie es erneut.',permission:'Ich benötige Mikrofonzugriff.',tap:'Einmal tippen und mit Cloudy sprechen.'},
    'ar-AE':{ready:'جاهز',listening:'أستمع…',transcribing:'أفهم…',thinking:'أفكر…',speaking:'أتحدث…',error:'حاول مرة أخرى',noSpeech:'لم أسمع جملة',didntUnderstand:'لم أفهمك. حاول مرة أخرى.',permission:'أحتاج إلى إذن الميكروفون.',tap:'اضغط مرة واحدة وتحدث مع Cloudy.'},
    ru:{ready:'Готово',listening:'Слушаю…',transcribing:'Понимаю…',thinking:'Думаю…',speaking:'Говорю…',error:'Попробуйте снова',noSpeech:'Я не услышал фразу',didntUnderstand:'Я не понял. Попробуйте снова.',permission:'Нужен доступ к микрофону.',tap:'Нажмите один раз и говорите с Cloudy.'},
    he:{ready:'מוכן',listening:'מקשיב…',transcribing:'מבין…',thinking:'חושב…',speaking:'מדבר…',error:'נסה שוב',noSpeech:'לא שמעתי משפט',didntUnderstand:'לא הצלחתי להבין. נסה שוב.',permission:'נדרשת הרשאת מיקרופון.',tap:'לחץ פעם אחת ודבר עם Cloudy.'},
    'zh-CN':{ready:'就绪',listening:'正在听…',transcribing:'正在理解…',thinking:'思考中…',speaking:'正在说话…',error:'请重试',noSpeech:'没有听到完整语句',didntUnderstand:'我没有听清，请再试一次。',permission:'需要麦克风权限才能听到你。',tap:'点一下，然后直接和 Cloudy 说话。'},
    ja:{ready:'準備完了',listening:'聞いています…',transcribing:'理解中…',thinking:'考えています…',speaking:'話しています…',error:'もう一度',noSpeech:'音声が聞こえませんでした',didntUnderstand:'聞き取れませんでした。もう一度お話しください。',permission:'マイクの許可が必要です。',tap:'一度タップして Cloudy に話しかけてください。'}
  };
  const VOICE_LOCALE={es:'es-MX',en:'en-US',fr:'fr-FR',it:'it-IT','pt-BR':'pt-BR',de:'de-DE','ar-AE':'ar-AE',ru:'ru-RU',he:'he-IL','zh-CN':'zh-CN',ja:'ja-JP'};
  function localeKey(){const raw=localStorage.getItem('cs_locale')||document.documentElement.dataset.csLocale||document.documentElement.lang||'es';return VOICE_COPY[raw]?raw:(raw.startsWith('pt')?'pt-BR':raw.startsWith('zh')?'zh-CN':raw.startsWith('ar')?'ar-AE':raw.startsWith('he')?'he':raw.split('-')[0] in VOICE_COPY?raw.split('-')[0]:'es')}
  function localeTag(){return VOICE_LOCALE[localeKey()]||'es-MX'}
  function vc(key){const lang=localeKey();return VOICE_COPY[lang]?.[key]||VOICE_COPY.es[key]||key}
  const MIC_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"></path></svg>';
'''
if anchor not in s: raise SystemExit('cloudy normalize anchor not found')
s=s.replace(anchor,anchor+insert,1)

# Replace setStatus entirely.
pat=r"  function setStatus\(next, detail = ''\) \{.*?\n  \}\n\n  function injectStyles"
rep=r'''  function setStatus(next, detail = '') {
    state = next;
    const status = el('cloudyStatus');
    const mic = el('micBtn');
    const send = el('sendCloudy');
    const labels = {idle:vc('ready'),listening:vc('listening'),transcribing:vc('transcribing'),thinking:vc('thinking'),speaking:vc('speaking'),error:vc('error')};
    if (status) status.textContent = detail || labels[next] || next;
    if (mic) {
      mic.dataset.state = next;
      mic.dataset.handsFree = handsFree ? '1' : '0';
      mic.setAttribute('aria-label', next === 'listening' ? vc('listening') : vc('tap'));
      mic.innerHTML = next === 'transcribing' || next === 'thinking' ? '<span class="csVoiceThinking">•••</span>' : MIC_SVG;
      mic.classList.toggle('csMicLive', next === 'listening');
      mic.classList.toggle('csMicSpeaking', next === 'speaking');
    }
    if (send) send.disabled = next === 'thinking' || next === 'transcribing';
    document.documentElement.dataset.cloudyState = next;
  }

  function injectStyles'''
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit('setStatus patch failed')

# Replace styles payload by appending voice-first CSS before closing template.
marker="      @media(max-width:700px){.cloudyTop{flex-wrap:wrap}.cloudyTop .csVoiceControls{margin-left:auto}.csVoiceToggle{padding:6px 9px}.composer{align-items:flex-end}.composer textarea{min-height:48px;max-height:120px}}\n"
add="""      @media(max-width:700px){.cloudyTop{flex-wrap:nowrap}.cloudyTop .csVoiceControls{margin-left:auto}.composer{justify-content:center;align-items:center;padding:15px!important}.composer textarea,.composer #sendCloudy{display:none!important}#micBtn{width:82px!important;height:82px!important;min-width:82px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,#8d47ff,#ff2b9b)!important;border:1px solid #f17bd366!important;box-shadow:0 12px 38px #c13a9b45!important;padding:0!important}#micBtn svg{width:34px;height:34px;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#micBtn.csMicLive{animation:csMicPulse 1.15s ease-in-out infinite}#micBtn.csMicSpeaking{box-shadow:0 0 0 8px #8d47ff18,0 12px 38px #c13a9b55}.csCloudyHint{font-size:11px!important;padding:0 15px 13px!important}.cloudyPanel{grid-template-rows:auto 1fr auto auto!important}.messages{padding-bottom:8px!important}.msg{font-size:13px!important;padding:11px 13px!important;margin:7px 0!important}}
      @keyframes csMicPulse{50%{transform:scale(1.06);box-shadow:0 0 0 10px #ff2b9b18,0 12px 38px #c13a9b65}}
"""
if marker not in s: raise SystemExit('cloudy mobile css marker not found')
s=s.replace(marker,add,1)

# Replace voice controls with wave only + simple localized hint.
pat=r"  function injectVoiceControls\(\) \{.*?\n  \}\n\n  function persistedMessages"
rep=r'''  function injectVoiceControls() {
    const top = document.querySelector('#page-cloudy .cloudyTop');
    if (!top || el('csVoiceControls')) return;
    const wrap = document.createElement('div');
    wrap.id = 'csVoiceControls';
    wrap.className = 'csVoiceControls';
    wrap.innerHTML = `<div id="csCloudyWave" class="csCloudyWave" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
    const status = el('cloudyStatus');
    if (status) top.insertBefore(wrap, status); else top.appendChild(wrap);
    const composer = document.querySelector('#page-cloudy .composer');
    if (composer && !el('csCloudyHint')) {
      const hint = document.createElement('div'); hint.id='csCloudyHint'; hint.className='csCloudyHint'; hint.textContent=vc('tap'); composer.insertAdjacentElement('afterend',hint);
    }
  }

  function persistedMessages'''
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit('injectVoiceControls patch failed')

# TTS locale and natural conversation continuation.
s=s.replace("locale=${encodeURIComponent(LOCALE)}", "locale=${encodeURIComponent(localeTag())}")
s=s.replace("locale: LOCALE, text: content.slice(0, 2800)", "locale: localeTag(), text: content.slice(0, 2800)")
s=s.replace("      currentAudio.onended = () => stopSpeaking();", "      currentAudio.onended = () => { const resume=handsFree; stopSpeaking(); if(resume) setTimeout(()=>startRecording(),260); };",1)
s=s.replace("          locale: 'es',", "          locale: localeKey(),",1)
s=s.replace("      addMessage('assistant', `No pude completar ese turno: ${String(error?.message || error)}`);", "      addMessage('assistant', vc('error'));",1)
s=s.replace("locale=${encodeURIComponent(LOCALE)}", "locale=${encodeURIComponent(localeTag())}")

# Friendly recording errors and hands-free stop conditions.
s=s.replace("          setStatus('idle', 'No escuché una frase');", "          handsFree=false; setStatus('idle', vc('noSpeech'));",1)
s=s.replace("          if (!transcript) { setStatus('idle', 'No pude entender el audio'); return; }", "          if (!transcript) { handsFree=false; setStatus('idle', vc('didntUnderstand')); return; }",1)
s=s.replace("          addMessage('assistant', `No pude entender el audio: ${String(error?.message || error)}`);", "          handsFree=false; addMessage('assistant', vc('didntUnderstand'));",1)
s=s.replace("      addMessage('assistant', denied ? 'Necesito permiso del micrófono para escucharte. Puedes habilitarlo en los permisos de CloudSales.' : `No pude abrir el micrófono: ${String(error?.message || error)}`);", "      handsFree=false; addMessage('assistant', denied ? vc('permission') : vc('error'));",1)

# Add toggle function and bind mic to one-tap continuous session.
anchor="  function bind() {\n"
insert=r'''  function toggleVoiceSession(){
    if(handsFree){handsFree=false;if(state==='listening')stopRecording();if(state==='speaking')stopSpeaking();setStatus('idle');return}
    handsFree=true;startRecording();
  }

'''
if anchor not in s: raise SystemExit('bind anchor not found')
s=s.replace(anchor,insert+anchor,1)
s=s.replace("    mic.onclick = () => startRecording();", "    mic.onclick = () => toggleVoiceSession();",1)
# Always speak replies from Cloudy while runtime is voice-first.
s=s.replace("      if ((options.voice || autoVoice) && !duplicate) await speak(reply, node);", "      if (!duplicate) await speak(reply, node);",1)

# Update hint on locale changes.
s=s.replace("    setStatus('idle');\n    return true;", "    window.addEventListener('cloudsales:locale',()=>{const h=el('csCloudyHint');if(h)h.textContent=vc('tap');setStatus(state==='idle'?'idle':state)});\n    setStatus('idle');\n    return true;",1)

for m in ["2026.09.02.2","handsFree","VOICE_COPY","toggleVoiceSession","vc('didntUnderstand')","MIC_SVG"]:
    if m not in s: raise SystemExit('missing cloudy marker '+m)
p.write_text(s)

# ---------- Affiliate + referral promo in PWA ----------
p=Path('web/pwa.html')
s=p.read_text()

# Add styles for dual acquisition cards.
style_anchor=".affiliateHero{border:1px solid #493149;background:linear-gradient(135deg,#201123,#0f0f17);border-radius:27px;padding:25px}"
style_add=style_anchor+".affiliateAcqGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}.affiliateRefer{border:1px solid #3b3150;background:radial-gradient(420px 200px at 100% 0,#54285d55,transparent 70%),#111119;border-radius:27px;padding:25px;display:flex;flex-direction:column;justify-content:center}.affiliateRefer h2{font-size:28px;line-height:1.05;letter-spacing:-.035em;margin:8px 0 12px}.affiliateTerms{font-size:10px;color:#77778a;margin-top:10px}.affiliateHold{margin-top:12px;border:1px solid #3b3244;background:#17131b;border-radius:14px;padding:11px 13px;font-size:11px;color:#bbb7c5;line-height:1.45}@media(max-width:760px){.affiliateAcqGrid{grid-template-columns:1fr;gap:8px}.affiliateHero,.affiliateRefer{padding:18px!important;border-radius:20px!important}.affiliateRefer h2{font-size:22px!important}}"
if style_anchor not in s: raise SystemExit('affiliate style anchor not found')
s=s.replace(style_anchor,style_add,1)

# Inject 11-language affiliate acquisition helper before renderAffiliate.
needle="async function renderAffiliate(){"
helper=r'''const AFFILIATE_COPY={
'es':{invite:'Invita a tus colegas a utilizar CloudSales y recibe un mes gratis por cada suscripción.',terms:'Aplican términos y condiciones.',hold:'Las recompensas y pagos se habilitan 45 días después de que la suscripción referida permanezca activa y al corriente.',cta:'Invitar colegas'},
'en':{invite:'Invite your colleagues to use CloudSales and receive one free month for every subscription.',terms:'Terms and conditions apply.',hold:'Rewards and payouts become eligible 45 days after the referred subscription remains active and in good standing.',cta:'Invite colleagues'},
'fr':{invite:'Invitez vos collègues à utiliser CloudSales et recevez un mois gratuit pour chaque abonnement.',terms:'Conditions générales applicables.',hold:'Les récompenses et paiements deviennent éligibles 45 jours après que l’abonnement parrainé reste actif et en règle.',cta:'Inviter des collègues'},
'it':{invite:'Invita i tuoi colleghi a usare CloudSales e ricevi un mese gratis per ogni abbonamento.',terms:'Si applicano termini e condizioni.',hold:'Premi e pagamenti diventano disponibili 45 giorni dopo che l’abbonamento segnalato rimane attivo e in regola.',cta:'Invita colleghi'},
'pt-BR':{invite:'Convide seus colegas para usar o CloudSales e receba um mês grátis por cada assinatura.',terms:'Aplicam-se termos e condições.',hold:'Recompensas e pagamentos ficam disponíveis 45 dias após a assinatura indicada permanecer ativa e em dia.',cta:'Convidar colegas'},
'de':{invite:'Laden Sie Kollegen zu CloudSales ein und erhalten Sie für jedes Abonnement einen Gratismonat.',terms:'Es gelten die Allgemeinen Geschäftsbedingungen.',hold:'Prämien und Auszahlungen werden 45 Tage nach fortbestehendem, ordnungsgemäßem Abonnement verfügbar.',cta:'Kollegen einladen'},
'ar-AE':{invite:'ادعُ زملاءك لاستخدام CloudSales واحصل على شهر مجاني مقابل كل اشتراك.',terms:'تطبق الشروط والأحكام.',hold:'تصبح المكافآت والمدفوعات مستحقة بعد 45 يومًا من بقاء الاشتراك المُحال نشطًا وفي وضع جيد.',cta:'دعوة الزملاء'},
'ru':{invite:'Приглашайте коллег в CloudSales и получайте бесплатный месяц за каждую подписку.',terms:'Применяются условия и положения.',hold:'Вознаграждения и выплаты становятся доступными через 45 дней, если подписка приглашённого пользователя остаётся активной и оплаченной.',cta:'Пригласить коллег'},
'he':{invite:'הזמינו עמיתים להשתמש ב-CloudSales וקבלו חודש חינם עבור כל מנוי.',terms:'בכפוף לתנאים ולהגבלות.',hold:'תגמולים ותשלומים יהיו זמינים לאחר 45 יום שבהם המנוי שהופנה נשאר פעיל ותקין.',cta:'הזמנת עמיתים'},
'zh-CN':{invite:'邀请同事使用 CloudSales，每成功订阅一位即可获得一个月免费使用期。',terms:'适用条款和条件。',hold:'被推荐订阅保持有效且状态正常 45 天后，奖励和付款才可发放。',cta:'邀请同事'},
'ja':{invite:'同僚を CloudSales に招待すると、1件のサブスクリプションにつき1か月無料になります。',terms:'利用規約が適用されます。',hold:'紹介されたサブスクリプションが有効かつ正常な状態で45日間継続した後、特典と支払いが利用可能になります。',cta:'同僚を招待'}
};
function affiliateLocale(){const raw=localStorage.getItem('cs_locale')||document.documentElement.dataset.csLocale||'es';return AFFILIATE_COPY[raw]?raw:(raw.startsWith('pt')?'pt-BR':raw.startsWith('zh')?'zh-CN':raw.startsWith('ar')?'ar-AE':raw.split('-')[0] in AFFILIATE_COPY?raw.split('-')[0]:'es')}
function affiliatePromo(ref=''){const c=AFFILIATE_COPY[affiliateLocale()]||AFFILIATE_COPY.es;return `<div class="affiliateRefer"><div style="font-size:10px;color:#ff8dcc;font-weight:900">CLOUDSALES REFERRALS</div><h2>${esc(c.invite)}</h2>${ref?`<button id="inviteColleagues" class="btn primary">${esc(c.cta)}</button>`:''}<div class="affiliateTerms">* ${esc(c.terms)}</div></div><div class="affiliateHold">${esc(c.hold)}</div>`}
function affiliateInvite(url){const c=AFFILIATE_COPY[affiliateLocale()]||AFFILIATE_COPY.es;if(navigator.share)return navigator.share({title:'CloudSales',text:c.invite,url}).catch(()=>{});return navigator.clipboard?.writeText(url)}
'''
if needle not in s: raise SystemExit('renderAffiliate anchor not found')
s=s.replace(needle,helper+needle,1)

# Rewrite renderAffiliate function with dual cards, keeping existing backend API.
pat=r"async function renderAffiliate\(\)\{.*?\}async function createAffiliate"
rep=r'''async function renderAffiliate(){try{const d=await direct('affiliate-api',{action:'dashboard'});if(!d.profile){affiliateRoot.innerHTML=`<div class="affiliateAcqGrid"><div class="affiliateHero"><div style="font-size:11px;color:#ff8dcc;font-weight:900">CLOUDSALES AFFILIATE PROGRAM</div><h2>Recibe 40%.</h2><p class="muted">Activa tu perfil y obtén tu link personal.</p><button id="affiliateCreate" class="btn primary">Activar mi perfil</button></div>${affiliatePromo('')}</div>`;$('affiliateCreate').onclick=createAffiliate;return}const a=d.dashboard||{},p=d.profile;affiliateRoot.innerHTML=`<div class="affiliateAcqGrid"><div class="affiliateHero"><div style="font-size:11px;color:#ff8dcc;font-weight:900">TU AFFILIATE PORTAL</div><h2>40% de comisión.</h2><div class="field"><label>Tu link</label><input id="refUrl" value="${esc(p.referral_url)}" readonly></div><button id="copyRef" class="btn small">Copiar link</button><div class="affiliateMetrics"><div class="metric"><b>${a.clicks||0}</b><span>Clicks</span></div><div class="metric"><b>${a.conversions||0}</b><span>Ventas</span></div><div class="metric"><b>$${Number(a.commission_pending||0).toFixed(2)}</b><span>Pendiente</span></div><div class="metric"><b>$${Number(a.commission_paid||0).toFixed(2)}</b><span>Pagado</span></div></div></div>${affiliatePromo(p.referral_url)}</div><div class="sectionHead"><div><h2>Método de pago</h2><p>Las tarifas de PayPal/Binance/terceros corren por cuenta del afiliado.</p></div></div><div class="card"><div class="field"><label>Proveedor</label><select id="payProvider"><option value="paypal" ${p.payout_provider==='paypal'?'selected':''}>PayPal</option><option value="binance" ${p.payout_provider==='binance'?'selected':''}>Binance</option></select></div><div class="field"><label>Email / ID de recepción</label><input id="payId" value="${esc(p.payout_identifier||'')}"></div><button id="savePayout" class="btn primary">Guardar método</button></div><div class="sectionHead"><div><h2>Comisiones recientes</h2></div></div><div class="files">${(a.recent_commissions||[]).slice(0,20).map(c=>`<div class="file"><div><b>$${Number(c.amount_usd).toFixed(2)}</b><span>${esc(c.status)} · disponible ${new Date(c.available_at).toLocaleDateString()}</span></div></div>`).join('')||'<div class="notice">Todavía no hay comisiones.</div>'}</div>`;copyRef.onclick=()=>navigator.clipboard.writeText(refUrl.value);const invite=$('inviteColleagues');if(invite)invite.onclick=()=>affiliateInvite(p.referral_url);savePayout.onclick=async()=>{await direct('affiliate-api',{action:'payout.update',provider:payProvider.value,identifier:payId.value});alert('Método guardado.')}}catch(e){affiliateRoot.innerHTML='<div class="notice">No pudimos cargar el portal de afiliados.</div>'}}async function createAffiliate'''
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit('renderAffiliate rewrite failed')

# Re-render affiliate immediately when language changes.
boot_anchor="window.addEventListener('hashchange',routeHash);"
if boot_anchor in s:
    s=s.replace(boot_anchor,boot_anchor+"window.addEventListener('cloudsales:locale',()=>{if(location.hash.includes('affiliate'))renderAffiliate()});",1)

for m in ['AFFILIATE_COPY','affiliatePromo','45 días','inviteColleagues','affiliateAcqGrid']:
    if m not in s: raise SystemExit('missing pwa marker '+m)
p.write_text(s)

print('Cloudy voice-first + affiliate referral acquisition patch applied')
