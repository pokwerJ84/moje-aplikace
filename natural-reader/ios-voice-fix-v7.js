(() => {
  const BAD = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;
  const GOOD = /\b(Samantha|Ava|Daniel|Karen|Moira|Tessa|Serena|Siri)\b|premium|enhanced|natural/i;

  function availableVoices() {
    if (!("speechSynthesis" in window)) return [];
    return speechSynthesis.getVoices().filter(v => !BAD.test(v.name));
  }

  function preferredVoice() {
    const voices = availableVoices();
    return voices.find(v => /^en(-|_)/i.test(v.lang) && GOOD.test(v.name)) ||
           voices.find(v => /^en-US$/i.test(v.lang)) ||
           voices.find(v => /^en(-|_)/i.test(v.lang)) ||
           voices[0] || null;
  }

  function repairVoiceSelection() {
    const select = document.getElementById("voiceSelect");
    if (!select || !("speechSynthesis" in window)) return false;
    const voices = availableVoices();
    if (!voices.length) return false;

    const current = voices.find(v => v.voiceURI === select.value);
    const mustReplace = !current || BAD.test(current.name);

    // Hide known novelty/problematic voices from the UI.
    [...select.options].forEach(option => {
      const v = speechSynthesis.getVoices().find(x => x.voiceURI === option.value);
      if (v && BAD.test(v.name)) option.remove();
    });

    if (mustReplace) {
      const best = preferredVoice();
      if (best) {
        select.value = best.voiceURI;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        try { localStorage.setItem("poky-last-good-voice", best.voiceURI); } catch (_) {}
      }
    }
    return true;
  }

  function wakeSpeechEngine() {
    if (!("speechSynthesis" in window)) return;
    try { speechSynthesis.resume(); } catch (_) {}
  }

  function scheduleRepair() {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const done = repairVoiceSelection();
      if (done || tries > 20) clearInterval(timer);
    }, 250);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#playBtn")) {
      repairVoiceSelection();
      wakeSpeechEngine();
      setTimeout(wakeSpeechEngine, 50);
      setTimeout(wakeSpeechEngine, 250);
    }
  }, true);

  window.addEventListener("focus", () => {
    repairVoiceSelection();
    wakeSpeechEngine();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      repairVoiceSelection();
      wakeSpeechEngine();
    }
  });

  if ("speechSynthesis" in window) {
    const prior = speechSynthesis.onvoiceschanged;
    speechSynthesis.onvoiceschanged = () => {
      try { if (typeof prior === "function") prior(); } catch (_) {}
      setTimeout(repairVoiceSelection, 50);
    };
  }

  window.addEventListener("load", scheduleRepair, { once: true });
})();
