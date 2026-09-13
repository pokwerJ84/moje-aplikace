(() => {
  const ENDPOINT = "https://pornzqperiptczusueso.supabase.co/functions/v1/poky-tts";
  const API_KEY = "sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n";
  const MODE_KEY = "pokyTtsMode";
  const CLOUD_VOICE_KEY = "pokyCloudVoice";
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") return;

  const nativeSpeak = synth.speak.bind(synth);
  const nativeCancel = synth.cancel.bind(synth);
  const nativePause = synth.pause?.bind(synth);
  const nativeResume = synth.resume?.bind(synth);
  const nativeGetVoices = synth.getVoices.bind(synth);

  const novelty = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|princess/i;
  let mode = localStorage.getItem(MODE_KEY) || "premium";
  if (!["free", "standard", "premium"].includes(mode)) mode = "premium";
  let cloudVoice = localStorage.getItem(CLOUD_VOICE_KEY) || "natural";

  let audio = new Audio();
  audio.preload = "auto";
  audio.playsInline = true;
  let objectUrl = "";
  let requestId = 0;
  let activeUtterance = null;
  let cancelled = false;

  function systemVoices() {
    const all = nativeGetVoices();
    const english = all.filter(v => /^en(-|_)/i.test(v.lang));
    const clean = english.filter(v => !novelty.test(v.name));
    return clean.length ? clean : (english.length ? english.slice(0, 8) : all.slice(0, 8));
  }

  synth.getVoices = systemVoices;

  const modeLabel = () => mode === "free" ? "Free / iPhone" : mode === "standard" ? "Standard Cloud" : "Premium Cloud";
  const cloudVoiceLabel = () => ({ natural: "Natural", calm: "Calm", male: "Male" }[cloudVoice] || "Natural");

  function setStatus(text) {
    const el = document.getElementById("voiceLabel");
    if (el) el.textContent = text;
  }

  function setIdleStatus() {
    setStatus(mode === "free" ? "Free / iPhone" : `${modeLabel()} · ${cloudVoiceLabel()}`);
  }

  function cleanupUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function resetCloudAudio() {
    try { audio.pause(); } catch (_) {}
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    cleanupUrl();
  }

  function unlockAudio() {
    try {
      if (!audio.src) audio.src = SILENT_WAV;
      audio.muted = true;
      const p = audio.play();
      if (p?.catch) p.catch(() => {});
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    } catch (_) {}
  }

  async function responseError(response) {
    try {
      const data = await response.json();
      return data?.detail || data?.error || `HTTP ${response.status}`;
    } catch (_) {
      return `HTTP ${response.status}`;
    }
  }

  function fmt(n) {
    return new Intl.NumberFormat().format(Number(n || 0));
  }

  function renderUsage(used = 0, remaining = 900000, limit = 900000) {
    const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
    const usedEl = document.getElementById("usageUsed");
    const remainEl = document.getElementById("usageRemaining");
    const pctEl = document.getElementById("usagePercent");
    const bar = document.getElementById("usageBar");
    const modeEl = document.getElementById("usageMode");
    if (usedEl) usedEl.textContent = `${fmt(used)} / ${fmt(limit)} chars`;
    if (remainEl) remainEl.textContent = `${fmt(remaining)} remaining`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (bar) bar.style.width = `${pct}%`;
    if (modeEl) modeEl.textContent = modeLabel();
  }

  async function refreshUsage() {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": API_KEY },
        body: JSON.stringify({ action: "usage" })
      });
      if (!response.ok) return;
      const data = await response.json();
      renderUsage(data.charsUsed, data.charsRemaining, data.limit);
    } catch (_) {}
  }

  function populateVoiceSelect() {
    const select = document.getElementById("voiceSelect");
    if (!select) return;
    select.innerHTML = "";

    if (mode === "free") {
      const voices = systemVoices();
      voices.forEach(v => {
        const o = document.createElement("option");
        o.value = `system:${v.voiceURI}`;
        o.textContent = `${v.name} (${v.lang})`;
        select.appendChild(o);
      });
      const saved = localStorage.getItem("pokySystemVoiceURI");
      if (saved && voices.some(v => v.voiceURI === saved)) select.value = `system:${saved}`;
    } else {
      const options = mode === "premium"
        ? [["natural","Natural"],["calm","Calm"],["male","Male"]]
        : [["natural","Natural"],["male","Male"]];
      options.forEach(([value, label]) => {
        const o = document.createElement("option");
        o.value = `cloud:${value}`;
        o.textContent = label;
        select.appendChild(o);
      });
      if (!options.some(([value]) => value === cloudVoice)) cloudVoice = "natural";
      select.value = `cloud:${cloudVoice}`;
    }
  }

  function syncModeUI() {
    const modeSelect = document.getElementById("voiceModeSelect");
    if (modeSelect) modeSelect.value = mode;
    populateVoiceSelect();
    setIdleStatus();
    refreshUsage();
  }

  synth.cancel = function () {
    requestId += 1;
    cancelled = true;
    resetCloudAudio();
    nativeCancel();
    activeUtterance = null;
    setIdleStatus();
  };

  synth.pause = function () {
    if (mode === "free") return nativePause?.();
    if (!audio.paused) audio.pause();
  };

  synth.resume = function () {
    if (mode === "free") return nativeResume?.();
    if (audio.src && audio.paused && activeUtterance) audio.play().catch(() => {});
  };

  synth.speak = function (utterance) {
    const text = String(utterance?.text || "").trim();
    if (!text) return;

    if (mode === "free") {
      const select = document.getElementById("voiceSelect");
      const uri = select?.value?.startsWith("system:") ? select.value.slice(7) : localStorage.getItem("pokySystemVoiceURI");
      const selected = systemVoices().find(v => v.voiceURI === uri) || systemVoices()[0];
      if (selected) {
        utterance.voice = selected;
        utterance.lang = selected.lang;
      }
      setStatus(`Free / iPhone · ${selected?.name || "System"}`);
      return nativeSpeak(utterance);
    }

    unlockAudio();
    const myId = ++requestId;
    cancelled = false;
    activeUtterance = utterance;
    resetCloudAudio();
    setStatus(`${modeLabel()} · loading…`);

    (async () => {
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": API_KEY },
          body: JSON.stringify({ text, mode, voice: cloudVoice })
        });
        if (!response.ok) throw new Error(await responseError(response));
        if (myId !== requestId || cancelled) return;

        const used = Number(response.headers.get("x-tts-chars-used") || 0);
        const remaining = Number(response.headers.get("x-tts-chars-remaining") || 0);
        if (used || remaining) renderUsage(used, remaining, used + remaining);

        const blob = await response.blob();
        if (!blob.size) throw new Error("Poky Voice returned empty audio.");

        cleanupUrl();
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        audio.playbackRate = Math.max(0.75, Math.min(1.5, Number(utterance.rate || 1)));
        audio.muted = false;

        let started = false;
        audio.onplaying = () => {
          if (started || myId !== requestId || cancelled) return;
          started = true;
          setIdleStatus();
          try { utterance.onstart?.({ type: "start" }); } catch (_) {}
        };
        audio.onended = () => {
          if (myId !== requestId || cancelled) return;
          activeUtterance = null;
          cleanupUrl();
          setIdleStatus();
          refreshUsage();
          try { utterance.onend?.({ type: "end" }); } catch (_) {}
        };
        audio.onerror = () => {
          if (myId !== requestId || cancelled) return;
          setStatus("Poky Voice · error");
          try { utterance.onerror?.({ type: "error", error: "audio-playback" }); } catch (_) {}
        };
        await audio.play();
      } catch (error) {
        if (myId !== requestId || cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setStatus("Poky Voice · error");
        try { utterance.onerror?.({ type: "error", error: message }); } catch (_) {}
        alert(`Poky Voice error:\n${message}`);
      }
    })();
  };

  window.addEventListener("DOMContentLoaded", () => {
    const modeSelect = document.getElementById("voiceModeSelect");
    const voiceSelect = document.getElementById("voiceSelect");

    modeSelect?.addEventListener("change", () => {
      synth.cancel();
      mode = modeSelect.value;
      localStorage.setItem(MODE_KEY, mode);
      syncModeUI();
    });

    voiceSelect?.addEventListener("change", () => {
      if (voiceSelect.value.startsWith("cloud:")) {
        cloudVoice = voiceSelect.value.slice(6);
        localStorage.setItem(CLOUD_VOICE_KEY, cloudVoice);
      } else if (voiceSelect.value.startsWith("system:")) {
        localStorage.setItem("pokySystemVoiceURI", voiceSelect.value.slice(7));
      }
      setIdleStatus();
    });

    syncModeUI();
  });

  window.__pokyCloudTTS = { refreshUsage, version: "v10", get mode() { return mode; } };
})();
