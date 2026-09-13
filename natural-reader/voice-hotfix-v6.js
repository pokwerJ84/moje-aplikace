(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!('speechSynthesis' in window)) return;

  let hotfixSpeaking = false;
  let currentUtterance = null;

  function getVoices() {
    const voices = speechSynthesis.getVoices() || [];
    const en = voices.filter(v => /^en(-|_)/i.test(v.lang));
    return en.length ? en : voices;
  }

  function bestVoice() {
    const select = document.getElementById('voiceSelect');
    const voices = getVoices();
    const selected = select ? voices.find(v => v.voiceURI === select.value) : null;
    if (selected) return selected;
    return voices.find(v => /premium|enhanced|natural|siri|samantha|ava|daniel/i.test(v.name)) || voices[0] || null;
  }

  function activeText() {
    const active = document.querySelector('#readerContent p.active');
    if (active?.textContent?.trim()) return active.textContent.trim();
    const first = document.querySelector('#readerContent p');
    return first?.textContent?.trim() || '';
  }

  function setButton(playing) {
    const btn = document.getElementById('playBtn');
    if (btn) btn.textContent = playing ? '❚❚' : '▶';
  }

  function stop() {
    speechSynthesis.cancel();
    hotfixSpeaking = false;
    currentUtterance = null;
    setButton(false);
  }

  function speakActive() {
    const text = activeText();
    if (!text) return;
    speechSynthesis.cancel();
    try { speechSynthesis.resume(); } catch (_) {}

    const utter = new SpeechSynthesisUtterance(text);
    const voice = bestVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || 'en-US';
      const label = document.getElementById('voiceLabel');
      if (label) label.textContent = voice.name;
      const select = document.getElementById('voiceSelect');
      if (select && select.value !== voice.voiceURI) select.value = voice.voiceURI;
      try { localStorage.setItem('poky-last-working-voice', voice.voiceURI); } catch (_) {}
    } else {
      utter.lang = 'en-US';
    }
    const speed = Number(document.getElementById('speedSelect')?.value || 1);
    utter.rate = Number.isFinite(speed) ? speed : 1;
    utter.pitch = 1;
    utter.volume = 1;
    utter.onstart = () => { hotfixSpeaking = true; setButton(true); };
    utter.onend = () => {
      hotfixSpeaking = false;
      setButton(false);
      const next = document.getElementById('nextBtn');
      const active = document.querySelector('#readerContent p.active');
      if (active?.nextElementSibling && next) {
        next.click();
        setTimeout(() => { speechSynthesis.cancel(); speakActive(); }, 120);
      }
    };
    utter.onerror = () => { hotfixSpeaking = false; setButton(false); };
    currentUtterance = utter;
    setTimeout(() => {
      try { speechSynthesis.resume(); } catch (_) {}
      speechSynthesis.speak(utter);
    }, isIOS ? 80 : 0);
  }

  function install() {
    const oldBtn = document.getElementById('playBtn');
    if (!oldBtn || oldBtn.dataset.voiceHotfix === '1') return;
    const btn = oldBtn.cloneNode(true);
    btn.dataset.voiceHotfix = '1';
    oldBtn.replaceWith(btn);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (hotfixSpeaking || speechSynthesis.speaking) stop();
      else speakActive();
    });

    document.getElementById('voiceSelect')?.addEventListener('change', () => {
      if (hotfixSpeaking || speechSynthesis.speaking) {
        stop();
        setTimeout(speakActive, 80);
      }
    });

    document.getElementById('readerContent')?.addEventListener('click', () => {
      setTimeout(() => {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          speakActive();
        }
      }, 120);
    });

    const saved = (() => { try { return localStorage.getItem('poky-last-working-voice'); } catch (_) { return ''; } })();
    if (saved) {
      const select = document.getElementById('voiceSelect');
      if (select && [...select.options].some(o => o.value === saved)) select.value = saved;
    }
  }

  window.addEventListener('load', () => setTimeout(install, 350));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try { speechSynthesis.resume(); } catch (_) {}
      setTimeout(install, 100);
    }
  });
  speechSynthesis.addEventListener?.('voiceschanged', () => setTimeout(install, 100));
})();
