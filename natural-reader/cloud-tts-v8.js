(() => {
  const ENDPOINT = "https://pornzqperiptczusueso.supabase.co/functions/v1/poky-tts";
  const API_KEY = "sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n";
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") return;

  let audio = new Audio();
  audio.preload = "auto";
  audio.playsInline = true;
  let objectUrl = "";
  let requestId = 0;
  let activeUtterance = null;
  let cancelled = false;

  function setStatus(text) {
    const label = document.getElementById("voiceLabel");
    if (label) label.textContent = text;
  }

  function cleanupUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function resetAudio() {
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

  synth.cancel = function () {
    requestId += 1;
    cancelled = true;
    resetAudio();
    activeUtterance = null;
    setStatus("Poky Voice");
  };

  synth.pause = function () {
    if (audio && !audio.paused) audio.pause();
  };

  synth.resume = function () {
    if (audio?.src && audio.paused && activeUtterance) {
      audio.play().catch(() => {});
    }
  };

  synth.speak = function (utterance) {
    const text = String(utterance?.text || "").trim();
    if (!text) return;

    unlockAudio();
    const myId = ++requestId;
    cancelled = false;
    activeUtterance = utterance;
    resetAudio();
    setStatus("Poky Voice · loading…");

    (async () => {
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": API_KEY
          },
          body: JSON.stringify({ text, voice: "natural" })
        });

        if (!response.ok) throw new Error(await responseError(response));
        if (myId !== requestId || cancelled) return;

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
          setStatus("Poky Voice · Natural");
          try { utterance.onstart?.({ type: "start" }); } catch (_) {}
        };

        audio.onended = () => {
          if (myId !== requestId || cancelled) return;
          activeUtterance = null;
          cleanupUrl();
          setStatus("Poky Voice · Natural");
          try { utterance.onend?.({ type: "end" }); } catch (_) {}
        };

        audio.onerror = () => {
          if (myId !== requestId || cancelled) return;
          setStatus("Poky Voice · error");
          try { utterance.onerror?.({ type: "error", error: "audio-playback" }); } catch (_) {}
        };

        try {
          await audio.play();
        } catch (error) {
          throw new Error(`iPhone blocked audio playback: ${error?.message || error}`);
        }
      } catch (error) {
        if (myId !== requestId || cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        console.error("Poky Voice error", message);
        setStatus("Poky Voice · error");
        try { utterance.onerror?.({ type: "error", error: message }); } catch (_) {}
        alert(`Poky Voice error:\n${message}`);
      }
    })();
  };

  window.__pokyCloudTTS = {
    get audio() { return audio; },
    version: "v8"
  };

  window.addEventListener("DOMContentLoaded", () => setStatus("Poky Voice · Natural"));
})();
