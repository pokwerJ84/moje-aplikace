(() => {
  const ENDPOINT = "https://pornzqperiptczusueso.supabase.co/functions/v1/poky-tts";
  const API_KEY = "sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n";
  const MODE_KEY = "pokyTtsMode";
  const CLOUD_VOICE_KEY = "pokyCloudVoice";
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") return;

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
  let rebuildingVoiceSelect = false;

  const modeLabel = () => mode === "free" ? "Free Cloud" : mode === "standard" ? "Standard Cloud" : "Premium Cloud";
  const cloudVoiceLabel = () => ({ natural: "Natural", calm: "Calm", male: "Male" }[cloudVoice] || "Natural");

  function setStatus(text) {
    const el = document.getElementById("voiceLabel");
    if (el) el.textContent = text;
  }

  function setIdleStatus() {
    setStatus(`${modeLabel()} · ${cloudVoiceLabel()}`);
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
        body: JSON.stringify({ action: "usage", mode })
      });
      if (!response.ok) return;
      const data = await response.json();
      renderUsage(data.charsUsed, data.charsRemaining, data.limit);
    } catch (_) {}
  }

  function cloudOptions() {
    return mode === "premium"
      ? [["natural","Natural"],["calm","Calm"],["male","Male"]]
      : [["natural","Natural"],["male","Male"]];
  }

  function populateVoiceSelect() {
    const select = document.getElementById("voiceSelect");
    if (!select || rebuildingVoiceSelect) return;
    rebuildingVoiceSelect = true;
    const options = cloudOptions();
    select.innerHTML = "";
    options.forEach(([value, label]) => {
      const o = document.createElement("option");
      o.value = `cloud:${value}`;
      o.textContent = label;
      select.appendChild(o);
    });
    if (!options.some(([value]) => value === cloudVoice)) cloudVoice = "natural";
    select.value = `cloud:${cloudVoice}`;
    rebuildingVoiceSelect = false;
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
    activeUtterance = null;
    setIdleStatus();
  };

  synth.pause = function () {
    if (!audio.paused) audio.pause();
  };

  synth.resume = function () {
    if (audio.src && audio.paused && activeUtterance) audio.play().catch(() => {});
  };

  // IMPORTANT: do not replace getVoices(). app.js needs a real SpeechSynthesisVoice
  // object when it assigns utterance.voice on iOS. We only replace the visible select UI.
  synth.speak = function (utterance) {
    const text = String(utterance?.text || "").trim();
    if (!text) return;

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
        const limit = Number(response.headers.get("x-tts-limit") || (used + remaining) || 900000);
        renderUsage(used, remaining, limit);

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
      if (rebuildingVoiceSelect) return;
      if (voiceSelect.value.startsWith("cloud:")) {
        cloudVoice = voiceSelect.value.slice(6);
        localStorage.setItem(CLOUD_VOICE_KEY, cloudVoice);
      }
      setIdleStatus();
    });

    const observer = new MutationObserver(() => {
      if (!rebuildingVoiceSelect) {
        const first = voiceSelect?.options?.[0]?.value || "";
        if (first && !first.startsWith("cloud:")) populateVoiceSelect();
      }
    });
    if (voiceSelect) observer.observe(voiceSelect, { childList: true });

    syncModeUI();
    setTimeout(syncModeUI, 300);
    setTimeout(syncModeUI, 1000);
  });

  window.__pokyCloudTTS = { refreshUsage, version: "v12", get mode() { return mode; } };
})();
