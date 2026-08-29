(() => {
  'use strict';

  const VERSION = '2026.08.29.1';
  const FUNCTION_BASE = 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  const LOCALE = 'es-MX';
  const MAX_LOCAL_MESSAGES = 40;
  const SILENCE_MS = 1050;
  const MAX_RECORD_MS = 30000;
  const MIN_RECORD_MS = 350;

  let recorder = null;
  let stream = null;
  let audioContext = null;
  let analyser = null;
  let animationFrame = null;
  let chunks = [];
  let recordStartedAt = 0;
  let speechStarted = false;
  let lastSpeechAt = 0;
  let noiseFloor = 0.008;
  let calibration = [];
  let currentAudio = null;
  let currentAudioUrl = null;
  let currentTurnController = null;
  let state = 'idle';
  let voiceTurn = false;
  let autoVoice = localStorage.getItem('cs_cloudy_auto_voice') === '1';
  let initializedOrg = null;
  let lastAssistant = '';

  const el = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function authToken() {
    try { return typeof session !== 'undefined' ? session?.access_token || '' : ''; }
    catch { return ''; }
  }

  function orgId() {
    try { return typeof currentOrg !== 'undefined' ? currentOrg?.id || '' : ''; }
    catch { return ''; }
  }

  function transcriptKey(org = orgId()) { return `cs_cloudy_transcript:${org}`; }
  function sessionKey(org = orgId()) { return `cs_cloudy_session:${org}`; }

  function setStatus(next, detail = '') {
    state = next;
    const status = el('cloudyStatus');
    const mic = el('micBtn');
    const send = el('sendCloudy');
    const labels = {
      idle: 'Listo',
      listening: 'Escuchando…',
      transcribing: 'Entendiendo tu voz…',
      thinking: 'Pensando…',
      speaking: 'Hablando…',
      error: 'Error',
    };
    if (status) status.textContent = detail || labels[next] || next;
    if (mic) {
      mic.dataset.state = next;
      mic.setAttribute('aria-label', next === 'listening' ? 'Detener grabación' : 'Hablar con Cloudy');
      mic.textContent = next === 'listening' ? '■' : next === 'transcribing' ? '…' : next === 'speaking' ? '↯' : '🎤';
      mic.classList.toggle('csMicLive', next === 'listening');
    }
    if (send) send.disabled = next === 'thinking' || next === 'transcribing';
    document.documentElement.dataset.cloudyState = next;
  }

  function injectStyles() {
    if (el('cs-cloudy-v3-css')) return;
    const style = document.createElement('style');
    style.id = 'cs-cloudy-v3-css';
    style.textContent = `
      .cloudyTop .csVoiceControls{display:flex;align-items:center;gap:7px;margin-left:8px}
      .csVoiceToggle{border:1px solid #343443;background:#12121b;color:#aaa;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800}
      .csVoiceToggle.active{color:#fff;border-color:#8d4f8a;background:#2a1630}
      #micBtn{min-width:48px;transition:.18s transform,.18s background,.18s box-shadow}
      #micBtn.csMicLive{background:linear-gradient(135deg,#ff2b9b,#8d5cff);border-color:transparent;box-shadow:0 0 0 5px #ff2b9b20,0 0 30px #ff2b9b35;transform:scale(1.04)}
      .csCloudyHint{font-size:10px;color:#77778a;padding:0 15px 10px;text-align:center}
      .csCloudyWave{display:none;align-items:center;gap:3px;height:13px}.csCloudyWave.active{display:flex}.csCloudyWave i{width:3px;height:4px;border-radius:3px;background:#ff64b7;animation:csWave .72s ease-in-out infinite alternate}.csCloudyWave i:nth-child(2){animation-delay:.12s}.csCloudyWave i:nth-child(3){animation-delay:.24s}.csCloudyWave i:nth-child(4){animation-delay:.36s}
      @keyframes csWave{to{height:13px}}
      .msg.cloudy[data-speaking="1"]{border-color:#62375f;box-shadow:0 0 24px #ff2b9b12}
      @media(max-width:700px){.cloudyTop{flex-wrap:wrap}.cloudyTop .csVoiceControls{margin-left:auto}.csVoiceToggle{padding:6px 9px}.composer{align-items:flex-end}.composer textarea{min-height:48px;max-height:120px}}
    `;
    document.head.appendChild(style);
  }

  function injectVoiceControls() {
    const top = document.querySelector('#page-cloudy .cloudyTop');
    if (!top || el('csVoiceControls')) return;
    const wrap = document.createElement('div');
    wrap.id = 'csVoiceControls';
    wrap.className = 'csVoiceControls';
    wrap.innerHTML = `<div id="csCloudyWave" class="csCloudyWave" aria-hidden="true"><i></i><i></i><i></i><i></i></div><button id="csVoiceToggle" class="csVoiceToggle ${autoVoice ? 'active' : ''}" type="button">🔊 ${autoVoice ? 'Voz ON' : 'Voz Auto'}</button>`;
    const status = el('cloudyStatus');
    if (status) top.insertBefore(wrap, status);
    else top.appendChild(wrap);
    el('csVoiceToggle')?.addEventListener('click', () => {
      autoVoice = !autoVoice;
      localStorage.setItem('cs_cloudy_auto_voice', autoVoice ? '1' : '0');
      const button = el('csVoiceToggle');
      if (button) {
        button.classList.toggle('active', autoVoice);
        button.textContent = `🔊 ${autoVoice ? 'Voz ON' : 'Voz Auto'}`;
      }
      if (!autoVoice) stopSpeaking();
    });
    const composer = document.querySelector('#page-cloudy .composer');
    if (composer && !el('csCloudyHint')) {
      const hint = document.createElement('div');
      hint.id = 'csCloudyHint';
      hint.className = 'csCloudyHint';
      hint.textContent = 'Toca 🎤 y habla. Cloudy detecta cuando terminas, responde en pantalla y puede contestarte con voz.';
      composer.insertAdjacentElement('afterend', hint);
    }
  }

  function persistedMessages() {
    try {
      const value = JSON.parse(localStorage.getItem(transcriptKey()) || '[]');
      return Array.isArray(value) ? value.slice(-MAX_LOCAL_MESSAGES) : [];
    } catch { return []; }
  }

  function saveMessage(role, content) {
    const text = String(content || '').trim();
    if (!text) return;
    const items = persistedMessages();
    items.push({ role, content: text, at: Date.now() });
    localStorage.setItem(transcriptKey(), JSON.stringify(items.slice(-MAX_LOCAL_MESSAGES)));
  }

  function renderHistory() {
    const box = el('messages');
    if (!box) return;
    const items = persistedMessages();
    if (!items.length) return;
    box.innerHTML = '';
    for (const item of items) {
      box.insertAdjacentHTML('beforeend', `<div class="msg ${item.role === 'user' ? 'user' : 'cloudy'}">${escapeHtml(item.content)}</div>`);
      if (item.role !== 'user') lastAssistant = item.content;
    }
    box.scrollTop = box.scrollHeight;
  }

  function addMessage(role, content, options = {}) {
    const box = el('messages');
    if (!box) return null;
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'cloudy'}`;
    div.textContent = String(content || '');
    if (options.speaking) div.dataset.speaking = '1';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    if (options.persist !== false) saveMessage(role, content);
    if (role !== 'user') lastAssistant = String(content || '');
    return div;
  }

  async function refreshIfNeeded() {
    try {
      if (typeof refresh === 'function') return await refresh();
    } catch {}
    return false;
  }

  async function fetchAuthorized(url, init = {}, retry = true) {
    const token = authToken();
    if (!token) throw new Error('Inicia sesión para hablar con Cloudy.');
    const headers = new Headers(init.headers || {});
    headers.set('authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (response.status === 401 && retry && await refreshIfNeeded()) return fetchAuthorized(url, init, false);
    return response;
  }

  function restoreSessionForOrg() {
    const org = orgId();
    if (!org) return;
    initializedOrg = org;
    const stored = localStorage.getItem(sessionKey(org));
    try { cloudySession = stored || null; } catch {}
    renderHistory();
  }

  function rememberSession(id) {
    if (!id || !orgId()) return;
    localStorage.setItem(sessionKey(), id);
    try { cloudySession = id; } catch {}
  }

  function stopSpeaking() {
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {}
      currentAudio = null;
    }
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
    document.querySelectorAll('.msg.cloudy[data-speaking="1"]').forEach(node => delete node.dataset.speaking);
    el('csCloudyWave')?.classList.remove('active');
    if (state === 'speaking') setStatus('idle');
  }

  async function speak(text, messageNode = null) {
    const content = String(text || '').trim();
    if (!content || !orgId()) return;
    stopSpeaking();
    setStatus('speaking');
    if (messageNode) messageNode.dataset.speaking = '1';
    el('csCloudyWave')?.classList.add('active');
    try {
      const response = await fetchAuthorized(`${FUNCTION_BASE}cloudy-voice?mode=tts&organization_id=${encodeURIComponent(orgId())}&locale=${encodeURIComponent(LOCALE)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'tts', organization_id: orgId(), locale: LOCALE, text: content.slice(0, 2800) }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `tts_${response.status}`);
      const blob = await response.blob();
      currentAudioUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(currentAudioUrl);
      currentAudio.preload = 'auto';
      currentAudio.onended = () => stopSpeaking();
      currentAudio.onerror = () => stopSpeaking();
      await currentAudio.play();
    } catch (error) {
      console.warn('Cloudy TTS unavailable', error);
      stopSpeaking();
    }
  }

  async function sendTurn(text, options = {}) {
    const value = String(text || '').trim();
    if (!value || !orgId()) return;
    if (state === 'thinking' || state === 'transcribing') return;

    const input = el('cloudyInput');
    if (input) input.value = '';
    addMessage('user', value);
    setStatus('thinking');
    currentTurnController = new AbortController();

    try {
      let activeSession = null;
      try { activeSession = typeof cloudySession !== 'undefined' ? cloudySession : null; } catch {}
      const response = await fetchAuthorized(`${FUNCTION_BASE}cloudy-chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: currentTurnController.signal,
        body: JSON.stringify({
          organization_id: orgId(),
          message: value,
          locale: 'es',
          session_id: activeSession || undefined,
          input_mode: options.voice ? 'voice' : 'text',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `cloudy_${response.status}`);
      rememberSession(data.session_id);
      const reply = String(data.reply || 'Listo.').trim();
      const duplicate = normalize(reply) && normalize(reply) === normalize(lastAssistant);
      const node = addMessage('assistant', reply);
      setStatus('idle', data.approval_required ? 'Esperando tu aprobación' : 'Listo');
      if ((options.voice || autoVoice) && !duplicate) await speak(reply, node);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      addMessage('assistant', `No pude completar ese turno: ${String(error?.message || error)}`);
      setStatus('error');
      setTimeout(() => { if (state === 'error') setStatus('idle'); }, 1800);
    } finally {
      currentTurnController = null;
      voiceTurn = false;
    }
  }

  function chooseMimeType() {
    const options = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    return options.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
  }

  function cleanupRecorder() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    try { audioContext?.close(); } catch {}
    audioContext = null;
    analyser = null;
    recorder = null;
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    try { recorder.stop(); } catch { cleanupRecorder(); setStatus('idle'); }
  }

  function monitorVoice() {
    if (!analyser || !recorder || recorder.state !== 'recording') return;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = (buffer[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const elapsed = performance.now() - recordStartedAt;
    if (elapsed < 450) {
      calibration.push(rms);
      if (calibration.length > 30) calibration.shift();
      noiseFloor = Math.max(0.006, calibration.reduce((a, b) => a + b, 0) / Math.max(1, calibration.length));
    }
    const threshold = Math.max(0.018, noiseFloor * 2.6);
    if (rms > threshold) {
      speechStarted = true;
      lastSpeechAt = performance.now();
    }
    if (speechStarted && elapsed > MIN_RECORD_MS && performance.now() - lastSpeechAt > SILENCE_MS) {
      stopRecording();
      return;
    }
    if (elapsed > MAX_RECORD_MS) {
      stopRecording();
      return;
    }
    animationFrame = requestAnimationFrame(monitorVoice);
  }

  async function transcribe(blob) {
    setStatus('transcribing');
    const response = await fetchAuthorized(`${FUNCTION_BASE}cloudy-voice?mode=transcribe&organization_id=${encodeURIComponent(orgId())}&locale=${encodeURIComponent(LOCALE)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: blob,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `transcription_${response.status}`);
    return String(data.text || '').trim();
  }

  async function startRecording() {
    if (state === 'speaking') stopSpeaking();
    if (state === 'listening') { stopRecording(); return; }
    if (state === 'thinking' || state === 'transcribing') return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      addMessage('assistant', 'Este navegador no permite grabación de audio para Cloudy. Puedes seguir escribiendo normalmente.');
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      chunks = [];
      speechStarted = false;
      lastSpeechAt = 0;
      calibration = [];
      recordStartedAt = performance.now();
      const mimeType = chooseMimeType();
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => { cleanupRecorder(); setStatus('error'); };
      recorder.onstop = async () => {
        const duration = performance.now() - recordStartedAt;
        const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' });
        cleanupRecorder();
        if (duration < MIN_RECORD_MS || blob.size < 700 || !speechStarted) {
          setStatus('idle', 'No escuché una frase');
          setTimeout(() => { if (state === 'idle') setStatus('idle'); }, 1200);
          return;
        }
        try {
          const transcript = await transcribe(blob);
          if (!transcript) { setStatus('idle', 'No pude entender el audio'); return; }
          const input = el('cloudyInput');
          if (input) input.value = transcript;
          voiceTurn = true;
          setStatus('idle');
          await sendTurn(transcript, { voice: true });
        } catch (error) {
          addMessage('assistant', `No pude entender el audio: ${String(error?.message || error)}`);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 1600);
        }
      };
      recorder.start(180);
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      setStatus('listening');
      animationFrame = requestAnimationFrame(monitorVoice);
    } catch (error) {
      cleanupRecorder();
      const denied = String(error?.name || '').includes('NotAllowed');
      addMessage('assistant', denied ? 'Necesito permiso del micrófono para escucharte. Puedes habilitarlo en los permisos de CloudSales.' : `No pude abrir el micrófono: ${String(error?.message || error)}`);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1800);
    }
  }

  function bind() {
    injectStyles();
    injectVoiceControls();
    const send = el('sendCloudy');
    const mic = el('micBtn');
    const input = el('cloudyInput');
    if (!send || !mic || !input) return false;

    send.onclick = () => sendTurn(input.value, { voice: false });
    mic.onclick = () => startRecording();
    input.onkeydown = event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendTurn(input.value, { voice: false });
      }
    };

    input.addEventListener('input', () => {
      input.style.height = '48px';
      input.style.height = `${Math.min(120, Math.max(48, input.scrollHeight))}px`;
    });

    document.querySelectorAll('[data-page="cloudy"],[data-go="cloudy"]').forEach(button => {
      button.addEventListener('click', () => setTimeout(() => {
        if (initializedOrg !== orgId()) restoreSessionForOrg();
      }, 0));
    });
    el('orgSelect')?.addEventListener('change', () => {
      stopSpeaking();
      if (state === 'listening') stopRecording();
      initializedOrg = null;
      setTimeout(restoreSessionForOrg, 80);
    });

    if (orgId()) restoreSessionForOrg();
    document.documentElement.dataset.cloudyRuntime = VERSION;
    setStatus('idle');
    return true;
  }

  let attempts = 0;
  function boot() {
    attempts += 1;
    if (bind() || attempts > 40) return;
    setTimeout(boot, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
