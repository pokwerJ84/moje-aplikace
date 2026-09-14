(() => {
  const ENDPOINT = "https://pornzqperiptczusueso.supabase.co/functions/v1/poky-tts";
  const API_KEY = "sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n";
  const MODE_KEY = "pokyTtsMode";
  const CLOUD_VOICE_KEY = "pokyCloudVoice";
  const LANGUAGE_KEY = "pokyTtsLanguage";
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") return;

  let mode = localStorage.getItem(MODE_KEY) || "premium";
  if (!["free", "standard", "premium"].includes(mode)) mode = "premium";
  let cloudVoice = localStorage.getItem(CLOUD_VOICE_KEY) || "natural";
  let languageSetting = localStorage.getItem(LANGUAGE_KEY) || "auto";
  if (!["auto", "en-US", "cs-CZ"].includes(languageSetting)) languageSetting = "auto";

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
  const languageLabel = (lang = languageSetting) => lang === "cs-CZ" ? "Čeština" : lang === "en-US" ? "English" : "Auto Mixed";

  const CZECH_WORDS = new Set(["a","aby","ale","ani","ano","asi","bez","by","byl","byla","byli","co","do","ho","i","jak","je","jeho","její","jen","jsem","jsi","jsme","jsou","k","když","který","která","které","má","mám","mezi","mi","může","na","nad","ne","nebo","není","o","od","po","pod","pro","před","se","si","s","ta","tak","také","ten","to","u","už","v","ve","z","za","že"]);
  const ENGLISH_HINTS = new Set([
    "ai","api","app","application","automotive","backup","battery","business","cloud","control","cooling","customer","dashboard","data","delivery","device","document","download","email","engine","fan","file","forecast","hardware","interface","learning","machine","management","market","meeting","model","motor","network","order","power","premium","production","project","reader","report","sales","sample","server","settings","software","standard","supplier","system","testing","update","upload","usage","user","voice","web","workflow"
  ]);

  function detectLanguage(text) {
    if (languageSetting !== "auto") return languageSetting;
    const sample = String(text || "").toLowerCase();
    if (/[áčďéěíňóřšťúůýž]/i.test(sample)) return "cs-CZ";
    const words = sample.match(/[a-zá-ž]+/gi) || [];
    let score = 0;
    for (const w of words) if (CZECH_WORDS.has(w)) score += 1;
    return score >= 3 ? "cs-CZ" : "en-US";
  }

  function isEnglishToken(word) {
    const clean = word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    if (!clean) return false;
    const low = clean.toLowerCase();
    if (ENGLISH_HINTS.has(low)) return true;
    if (/^[A-Z]{2,6}$/.test(clean)) return true;
    if (/^[A-Za-z]+[A-Z][A-Za-z0-9]*$/.test(clean)) return true;
    if (/^(https?|www)\b/i.test(clean)) return true;
    return false;
  }

  function splitMixedSegments(text) {
    const overall = detectLanguage(text);
    if (languageSetting !== "auto" || overall !== "cs-CZ") return [{ text, language: overall }];

    const parts = String(text).split(/(\s+)/);
    const tagged = parts.map((part) => ({
      text: part,
      language: /^\s+$/.test(part) ? null : (isEnglishToken(part) ? "en-US" : "cs-CZ")
    }));

    // Spaces inherit the previous language; if there is no previous token, use Czech.
    let previous = "cs-CZ";
    for (const item of tagged) {
      if (item.language) previous = item.language;
      else item.language = previous;
    }

    const merged = [];
    for (const item of tagged) {
      if (!item.text) continue;
      const last = merged[merged.length - 1];
      if (last && last.language === item.language) last.text += item.text;
      else merged.push({ text: item.text, language: item.language });
    }

    // Avoid tiny one-word switches unless the word is a very confident acronym or dictionary hit.
    return merged.filter(s => s.text.trim()).map(s => ({ text: s.text.trim(), language: s.language }));
  }

  function setStatus(text) {
    const el = document.getElementById("voiceLabel");
    if (el) el.textContent = text;
  }

  function setIdleStatus(actualLanguage = null, mixed = false) {
    const lang = mixed ? "Auto Mixed" : (actualLanguage ? languageLabel(actualLanguage) : languageLabel());
    setStatus(`${modeLabel()} · ${cloudVoiceLabel()} · ${lang}`);
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

  function fmt(n) { return new Intl.NumberFormat().format(Number(n || 0)); }

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
    if (mode === "premium") return [["natural","Natural"],["calm","Calm"],["male","Male"]];
    if (languageSetting === "en-US") return [["natural","Natural"],["male","Male"]];
    return [["natural","Natural"]];
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
    const languageSelect = document.getElementById("languageSelect");
    if (modeSelect) modeSelect.value = mode;
    if (languageSelect) languageSelect.value = languageSetting;
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

  synth.pause = function () { if (!audio.paused) audio.pause(); };
  synth.resume = function () { if (audio.src && audio.paused && activeUtterance) audio.play().catch(() => {}); };

  async function fetchSegment(segment) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": API_KEY },
      body: JSON.stringify({ text: segment.text, mode, voice: cloudVoice, language: segment.language })
    });
    if (!response.ok) throw new Error(await responseError(response));

    const used = Number(response.headers.get("x-tts-chars-used") || 0);
    const remaining = Number(response.headers.get("x-tts-chars-remaining") || 0);
    const limit = Number(response.headers.get("x-tts-limit") || (used + remaining) || 900000);
    renderUsage(used, remaining, limit);

    const blob = await response.blob();
    if (!blob.size) throw new Error("Poky Voice returned empty audio.");
    return blob;
  }

  function playBlob(blob, utterance, myId, first, label) {
    return new Promise((resolve, reject) => {
      if (myId !== requestId || cancelled) return resolve();
      cleanupUrl();
      objectUrl = URL.createObjectURL(blob);
      audio.src = objectUrl;
      audio.playbackRate = Math.max(0.75, Math.min(1.5, Number(utterance.rate || 1)));
      audio.muted = false;
      audio.onplaying = () => {
        if (myId !== requestId || cancelled) return;
        setStatus(`${modeLabel()} · ${cloudVoiceLabel()} · ${label}`);
        if (first) {
          try { utterance.onstart?.({ type: "start" }); } catch (_) {}
        }
      };
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("audio-playback"));
      audio.play().catch(reject);
    });
  }

  synth.speak = function (utterance) {
    const text = String(utterance?.text || "").trim();
    if (!text) return;

    const segments = splitMixedSegments(text);
    const mixed = segments.some(s => s.language === "cs-CZ") && segments.some(s => s.language === "en-US");
    unlockAudio();
    const myId = ++requestId;
    cancelled = false;
    activeUtterance = utterance;
    resetCloudAudio();
    setStatus(`${modeLabel()} · loading · ${mixed ? "Auto Mixed" : languageLabel(segments[0]?.language)}`);

    (async () => {
      try {
        for (let i = 0; i < segments.length; i++) {
          if (myId !== requestId || cancelled) return;
          const segment = segments[i];
          const blob = await fetchSegment(segment);
          if (myId !== requestId || cancelled) return;
          await playBlob(blob, utterance, myId, i === 0, languageLabel(segment.language));
        }
        if (myId !== requestId || cancelled) return;
        activeUtterance = null;
        cleanupUrl();
        setIdleStatus(null, mixed);
        refreshUsage();
        try { utterance.onend?.({ type: "end" }); } catch (_) {}
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
    const languageSelect = document.getElementById("languageSelect");

    modeSelect?.addEventListener("change", () => {
      synth.cancel();
      mode = modeSelect.value;
      localStorage.setItem(MODE_KEY, mode);
      syncModeUI();
    });

    languageSelect?.addEventListener("change", () => {
      synth.cancel();
      languageSetting = languageSelect.value;
      localStorage.setItem(LANGUAGE_KEY, languageSetting);
      populateVoiceSelect();
      setIdleStatus();
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

  window.__pokyCloudTTS = { refreshUsage, version: "v14", get mode() { return mode; }, get language() { return languageSetting; } };
})();
