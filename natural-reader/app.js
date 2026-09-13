const DB_NAME = "natural-reader-db";
const DB_VERSION = 1;
const DOC_STORE = "documents";
const SETTINGS_STORE = "settings";

const AI_VOICES = [
  ["af_heart", "AI • Heart — US female"],
  ["af_bella", "AI • Bella — US female"],
  ["af_sarah", "AI • Sarah — US female"],
  ["am_michael", "AI • Michael — US male"],
  ["am_fenrir", "AI • Fenrir — US male"],
  ["bf_emma", "AI • Emma — UK female"],
  ["bm_george", "AI • George — UK male"],
  ["bm_fable", "AI • Fable — UK male"]
];

const state = {
  db: null,
  docs: [],
  currentDoc: null,
  currentIndex: 0,
  isPlaying: false,
  voices: [],
  selectedVoiceURI: "",
  voiceChoice: "ai:af_heart",
  speed: 1,
  sleepMinutes: 0,
  sleepTimer: null,
  estimatedParagraphStart: 0,
  estimatedParagraphDuration: 0,
  lastStartedAt: 0,
  aiTts: null,
  aiLoading: null,
  aiAudio: null,
  aiAudioIndex: -1,
  aiAudioStartOffset: 0,
  aiObjectUrl: ""
};

const $ = id => document.getElementById(id);
const homeScreen = $("homeScreen");
const readerScreen = $("readerScreen");
const library = $("library");
const emptyState = $("emptyState");
const documentCount = $("documentCount");
const fileInput = $("fileInput");
const importStatus = $("importStatus");
const readerContent = $("readerContent");
const playBtn = $("playBtn");
const progressBar = $("progressBar");
const progressText = $("progressText");
const paragraphText = $("paragraphText");
const voiceSelect = $("voiceSelect");
const speedSelect = $("speedSelect");
const sleepSelect = $("sleepSelect");
const settingsPanel = $("settingsPanel");
const resumePanel = $("resumePanel");

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) db.createObjectStore(DOC_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function store(name, mode = "readonly") {
  return state.db.transaction(name, mode).objectStore(name);
}

function getAllDocs() {
  return new Promise((resolve, reject) => {
    const req = store(DOC_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function putDoc(doc) {
  return new Promise((resolve, reject) => {
    const req = store(DOC_STORE, "readwrite").put(doc);
    req.onsuccess = () => resolve(doc);
    req.onerror = () => reject(req.error);
  });
}

function removeDoc(id) {
  return new Promise((resolve, reject) => {
    const req = store(DOC_STORE, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getSetting(key, fallback) {
  return new Promise(resolve => {
    const req = store(SETTINGS_STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? fallback);
    req.onerror = () => resolve(fallback);
  });
}

function setSetting(key, value) {
  return new Promise(resolve => {
    const req = store(SETTINGS_STORE, "readwrite").put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

function chunkParagraph(text, maxLen = 520) {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [text];
  const out = [];
  let current = "";
  for (const sentence of sentences) {
    const next = (current + " " + sentence).trim();
    if (next.length > maxLen && current) {
      out.push(current.trim());
      current = sentence.trim();
    } else {
      current = next;
    }
  }
  if (current) out.push(current.trim());
  return out;
}

function normalizeParagraphs(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split(/\n{2,}/)
    .map(p => p.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(p => p.length > 1)
    .flatMap(p => chunkParagraph(p));
}

function naturalizeText(text) {
  let t = String(text || "")
    .replace(/[•●▪◦]/g, ". ")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s*\/\s*/g, " or ")
    .replace(/\s+/g, " ")
    .trim();
  if (t && !/[.!?。！？:]$/.test(t) && t.length < 120) t += ".";
  return t;
}

async function extractDocx(arrayBuffer) {
  if (!window.mammoth) throw new Error("DOCX reader did not load.");
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return normalizeParagraphs(result.value || "");
}

async function extractPdf(arrayBuffer) {
  const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const paragraphs = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    let lastY = null;
    let line = "";
    const lines = [];
    for (const item of content.items) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 4) {
        if (line.trim()) lines.push(line.trim());
        line = item.str;
      } else {
        line += (line ? " " : "") + item.str;
      }
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    const cleaned = lines
      .filter(x => !/^\s*\d+\s*$/.test(x))
      .filter(x => x.length > 1)
      .join("\n");
    paragraphs.push(...normalizeParagraphs(cleaned));
  }
  return paragraphs;
}

async function handleFile(file) {
  if (!file) return;
  const ext = file.name.toLowerCase().split(".").pop();
  if (!["pdf", "docx"].includes(ext)) {
    alert("Please choose a PDF or DOCX file.");
    return;
  }
  importStatus.textContent = `Importing ${file.name}…`;
  importStatus.classList.remove("hidden");
  try {
    const buffer = await file.arrayBuffer();
    const paragraphs = ext === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);
    if (!paragraphs.length) throw new Error("No readable text found.");
    const now = Date.now();
    const doc = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.(pdf|docx)$/i, ""),
      originalName: file.name,
      type: ext === "pdf" ? "PDF" : "DOCX",
      paragraphs,
      currentIndex: 0,
      approxOffsetSec: 0,
      createdAt: now,
      lastOpenedAt: now
    };
    await putDoc(doc);
    state.docs.unshift(doc);
    renderLibrary();
    importStatus.textContent = `Added ${doc.name}`;
    setTimeout(() => importStatus.classList.add("hidden"), 1800);
  } catch (err) {
    console.error(err);
    importStatus.textContent = `Could not import this file: ${err.message || "Unknown error"}`;
  } finally {
    fileInput.value = "";
  }
}

function formatDate(ts) {
  if (!ts) return "Never opened";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(ts));
}

function progressFor(doc) {
  if (!doc.paragraphs?.length) return 0;
  return Math.min(100, Math.round((doc.currentIndex / Math.max(1, doc.paragraphs.length - 1)) * 100));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function renderLibrary() {
  state.docs.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
  library.innerHTML = "";
  documentCount.textContent = `${state.docs.length} ${state.docs.length === 1 ? "document" : "documents"}`;
  emptyState.classList.toggle("hidden", state.docs.length > 0);
  for (const doc of state.docs) {
    const p = progressFor(doc);
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-row" data-open="${doc.id}">
        <div class="doc-icon">${doc.type === "PDF" ? "📄" : "📝"}</div>
        <div class="doc-info">
          <div class="doc-name">${escapeHtml(doc.name)}</div>
          <div class="doc-meta">${doc.type} · ${p}% · Last opened ${formatDate(doc.lastOpenedAt)}</div>
        </div>
      </div>
      <div class="card-progress"><div style="width:${p}%"></div></div>
      <div class="card-actions">
        <button data-rename="${doc.id}">Rename</button>
        <button data-delete="${doc.id}">Delete</button>
      </div>`;
    library.appendChild(card);
  }
}

function showScreen(which) {
  homeScreen.classList.toggle("active", which === "home");
  readerScreen.classList.toggle("active", which === "reader");
}

async function openDocument(id) {
  stopSpeech(true);
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  state.currentDoc = doc;
  state.currentIndex = Math.max(0, Math.min(doc.currentIndex || 0, doc.paragraphs.length - 1));
  doc.lastOpenedAt = Date.now();
  await putDoc(doc);
  $("readerTitle").textContent = doc.name;
  $("readerMeta").textContent = `${doc.type} · ${doc.paragraphs.length} paragraphs`;
  renderReaderText();
  updateReaderProgress();
  showScreen("reader");
  if (state.currentIndex > 0) {
    $("resumeText").textContent = `You stopped around paragraph ${state.currentIndex + 1} of ${doc.paragraphs.length}.`;
    resumePanel.classList.remove("hidden");
  } else {
    scrollToCurrent(false);
  }
}

function renderReaderText() {
  readerContent.innerHTML = "";
  state.currentDoc.paragraphs.forEach((text, index) => {
    const p = document.createElement("p");
    p.textContent = text;
    p.dataset.index = index;
    p.addEventListener("click", async () => {
      await setCurrentIndex(index, true);
      speakCurrent();
    });
    readerContent.appendChild(p);
  });
  highlightCurrent();
}

function highlightCurrent() {
  readerContent.querySelectorAll("p.active").forEach(el => el.classList.remove("active"));
  readerContent.querySelector(`p[data-index="${state.currentIndex}"]`)?.classList.add("active");
}

function scrollToCurrent(smooth = true) {
  readerContent.querySelector(`p[data-index="${state.currentIndex}"]`)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
}

function updateReaderProgress() {
  if (!state.currentDoc) return;
  const total = state.currentDoc.paragraphs.length;
  const pct = total <= 1 ? 0 : Math.round((state.currentIndex / (total - 1)) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}%`;
  paragraphText.textContent = `Paragraph ${state.currentIndex + 1} of ${total}`;
  highlightCurrent();
}

function estimateDuration(text) {
  const words = Math.max(1, String(text).trim().split(/\s+/).length);
  return Math.max(2, words / (175 * state.speed) * 60);
}

function estimateElapsed() {
  if (state.aiAudio && state.aiAudioIndex === state.currentIndex) {
    return Math.max(0, state.aiAudioStartOffset + (state.aiAudio.currentTime || 0));
  }
  if (!state.lastStartedAt || !state.isPlaying) return state.currentDoc?.approxOffsetSec || 0;
  return Math.min(state.estimatedParagraphDuration, (Date.now() - state.lastStartedAt) / 1000 + state.estimatedParagraphStart);
}

async function persistPosition() {
  if (!state.currentDoc) return;
  state.currentDoc.currentIndex = state.currentIndex;
  state.currentDoc.approxOffsetSec = estimateElapsed();
  state.currentDoc.lastOpenedAt = Date.now();
  await putDoc(state.currentDoc);
}

function isAiChoice() {
  return String(state.voiceChoice).startsWith("ai:");
}

function aiVoiceId() {
  return isAiChoice() ? state.voiceChoice.slice(3) : "af_heart";
}

function selectedSystemVoice() {
  const uri = String(state.voiceChoice).startsWith("sys:") ? state.voiceChoice.slice(4) : state.selectedVoiceURI;
  return state.voices.find(v => v.voiceURI === uri) ||
    state.voices.find(v => /^en/i.test(v.lang) && /premium|enhanced|natural|siri|ava|samantha|daniel/i.test(v.name)) ||
    state.voices.find(v => /^en/i.test(v.lang)) || state.voices[0];
}

function updateVoiceLabel(labelOverride = "") {
  if (labelOverride) {
    $("voiceLabel").textContent = labelOverride;
  } else if (isAiChoice()) {
    const id = aiVoiceId();
    $("voiceLabel").textContent = AI_VOICES.find(v => v[0] === id)?.[1].replace("AI • ", "") || "Natural AI";
  } else {
    $("voiceLabel").textContent = selectedSystemVoice()?.name || "Device voice";
  }
  $("speedLabel").textContent = `${Number(state.speed).toFixed(state.speed % 1 ? 2 : 1).replace(/0$/, "")}×`;
}

function populateVoices() {
  voiceSelect.innerHTML = "";
  const aiGroup = document.createElement("optgroup");
  aiGroup.label = "Natural AI — best quality";
  for (const [id, label] of AI_VOICES) {
    const o = document.createElement("option");
    o.value = `ai:${id}`;
    o.textContent = label.replace("AI • ", "");
    aiGroup.appendChild(o);
  }
  voiceSelect.appendChild(aiGroup);

  if (state.voices.length) {
    const sysGroup = document.createElement("optgroup");
    sysGroup.label = "Device voices — faster";
    for (const v of state.voices) {
      const o = document.createElement("option");
      o.value = `sys:${v.voiceURI}`;
      o.textContent = `${v.name} (${v.lang})${/premium|enhanced|natural|siri/i.test(v.name) ? " — enhanced" : ""}`;
      sysGroup.appendChild(o);
    }
    voiceSelect.appendChild(sysGroup);
  }

  if (![...voiceSelect.options].some(o => o.value === state.voiceChoice)) {
    state.voiceChoice = "ai:af_heart";
  }
  voiceSelect.value = state.voiceChoice;
  updateVoiceLabel();
}

function loadDeviceVoices() {
  if (!("speechSynthesis" in window)) return;
  state.voices = speechSynthesis.getVoices().slice().sort((a, b) => {
    const score = v => (/^en/i.test(v.lang) ? 100 : 0) + (/premium|enhanced|natural|siri/i.test(v.name) ? 50 : 0) + (/ava|samantha|daniel/i.test(v.name) ? 20 : 0);
    return score(b) - score(a) || a.name.localeCompare(b.name);
  });
  populateVoices();
}

async function ensureAiTts() {
  if (state.aiTts) return state.aiTts;
  if (state.aiLoading) return state.aiLoading;
  updateVoiceLabel("Downloading AI voice…");
  playBtn.textContent = "…";
  state.aiLoading = (async () => {
    const { KokoroJP } = await import("https://cdn.jsdelivr.net/npm/kokoro-js-jp@0.2.0/dist/kokoro-jp.web.js");
    return KokoroJP.load({ japanese: false });
  })();
  try {
    state.aiTts = await state.aiLoading;
    updateVoiceLabel();
    return state.aiTts;
  } finally {
    state.aiLoading = null;
  }
}

function clearAiAudio() {
  if (state.aiAudio) {
    state.aiAudio.pause();
    state.aiAudio.src = "";
  }
  state.aiAudio = null;
  state.aiAudioIndex = -1;
  state.aiAudioStartOffset = 0;
  if (state.aiObjectUrl) URL.revokeObjectURL(state.aiObjectUrl);
  state.aiObjectUrl = "";
}

function stopSpeech(clearAudio = true) {
  if (state.currentDoc) persistPosition();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (clearAudio) clearAiAudio();
  else state.aiAudio?.pause();
  state.isPlaying = false;
  state.lastStartedAt = 0;
  playBtn.textContent = "▶";
}

function pauseSpeech() {
  if (!state.isPlaying) return;
  if (state.currentDoc) state.currentDoc.approxOffsetSec = estimateElapsed();
  if (state.aiAudio && state.aiAudioIndex === state.currentIndex) state.aiAudio.pause();
  else if ("speechSynthesis" in window) speechSynthesis.cancel();
  state.isPlaying = false;
  state.lastStartedAt = 0;
  playBtn.textContent = "▶";
  persistPosition();
}

function textFromOffset(text, offsetSec) {
  if (!offsetSec || offsetSec <= 1) return naturalizeText(text);
  const duration = estimateDuration(text);
  const fraction = Math.min(.9, offsetSec / Math.max(1, duration));
  let i = Math.floor(text.length * fraction);
  const next = text.indexOf(" ", i);
  if (next >= 0) i = next + 1;
  return naturalizeText(text.slice(i));
}

function speakSystem(useSavedOffset = true) {
  if (!state.currentDoc || !("speechSynthesis" in window)) return;
  clearAiAudio();
  speechSynthesis.cancel();
  const text = state.currentDoc.paragraphs[state.currentIndex];
  const startOffset = useSavedOffset ? (state.currentDoc.approxOffsetSec || 0) : 0;
  const utter = new SpeechSynthesisUtterance(textFromOffset(text, startOffset));
  const voice = selectedSystemVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }
  utter.rate = state.speed;
  utter.pitch = 0.98;
  utter.onstart = () => {
    state.isPlaying = true;
    state.estimatedParagraphStart = startOffset;
    state.estimatedParagraphDuration = estimateDuration(text);
    state.lastStartedAt = Date.now();
    playBtn.textContent = "❚❚";
    highlightCurrent();
    scrollToCurrent();
  };
  utter.onend = async () => {
    if (!state.isPlaying) return;
    state.currentDoc.approxOffsetSec = 0;
    if (state.currentIndex < state.currentDoc.paragraphs.length - 1) {
      state.currentIndex++;
      await persistPosition();
      updateReaderProgress();
      speakCurrent(false);
    } else {
      state.isPlaying = false;
      playBtn.textContent = "▶";
      await persistPosition();
    }
  };
  utter.onerror = () => {
    state.isPlaying = false;
    playBtn.textContent = "▶";
  };
  speechSynthesis.speak(utter);
}

async function speakAi(useSavedOffset = true) {
  if (!state.currentDoc) return;

  if (state.aiAudio && state.aiAudioIndex === state.currentIndex && state.aiAudio.paused && !state.aiAudio.ended) {
    state.aiAudio.playbackRate = state.speed;
    state.isPlaying = true;
    playBtn.textContent = "❚❚";
    await state.aiAudio.play();
    return;
  }

  clearAiAudio();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const text = state.currentDoc.paragraphs[state.currentIndex];
  const startOffset = useSavedOffset ? (state.currentDoc.approxOffsetSec || 0) : 0;
  const spokenText = textFromOffset(text, startOffset);

  try {
    const tts = await ensureAiTts();
    updateVoiceLabel("Generating natural speech…");
    playBtn.textContent = "…";
    const result = await tts.speak(spokenText, aiVoiceId());
    const blob = result.toBlob();
    state.aiObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(state.aiObjectUrl);
    state.aiAudio = audio;
    state.aiAudioIndex = state.currentIndex;
    state.aiAudioStartOffset = startOffset;
    audio.playbackRate = state.speed;
    audio.preservesPitch = true;
    audio.onplay = () => {
      state.isPlaying = true;
      state.lastStartedAt = Date.now();
      state.estimatedParagraphStart = startOffset;
      state.estimatedParagraphDuration = audio.duration || estimateDuration(text);
      playBtn.textContent = "❚❚";
      updateVoiceLabel();
      highlightCurrent();
      scrollToCurrent();
    };
    audio.ontimeupdate = () => {
      if (state.currentDoc) state.currentDoc.approxOffsetSec = startOffset + (audio.currentTime || 0);
    };
    audio.onended = async () => {
      if (!state.isPlaying) return;
      clearAiAudio();
      state.currentDoc.approxOffsetSec = 0;
      if (state.currentIndex < state.currentDoc.paragraphs.length - 1) {
        state.currentIndex++;
        await persistPosition();
        updateReaderProgress();
        speakAi(false);
      } else {
        state.isPlaying = false;
        playBtn.textContent = "▶";
        await persistPosition();
      }
    };
    await audio.play();
  } catch (err) {
    console.error("Natural AI voice failed", err);
    updateVoiceLabel("AI unavailable — using device voice");
    const fallback = selectedSystemVoice();
    if (fallback) {
      state.voiceChoice = `sys:${fallback.voiceURI}`;
      voiceSelect.value = state.voiceChoice;
      await setSetting("voiceChoice", state.voiceChoice);
      speakSystem(useSavedOffset);
    } else {
      state.isPlaying = false;
      playBtn.textContent = "▶";
      alert("Natural AI voice could not load on this device.");
    }
  }
}

function speakCurrent(useSavedOffset = true) {
  return isAiChoice() ? speakAi(useSavedOffset) : speakSystem(useSavedOffset);
}

async function setCurrentIndex(index, resetOffset = true) {
  if (!state.currentDoc) return;
  stopSpeech(true);
  state.currentIndex = Math.max(0, Math.min(index, state.currentDoc.paragraphs.length - 1));
  if (resetOffset) state.currentDoc.approxOffsetSec = 0;
  updateReaderProgress();
  scrollToCurrent();
  await persistPosition();
}

function jumpSeconds(delta) {
  if (!state.currentDoc) return;
  if (state.aiAudio && state.aiAudioIndex === state.currentIndex && Number.isFinite(state.aiAudio.duration)) {
    state.aiAudio.currentTime = Math.max(0, Math.min(state.aiAudio.duration - .05, state.aiAudio.currentTime + delta));
    state.currentDoc.approxOffsetSec = state.aiAudioStartOffset + state.aiAudio.currentTime;
    persistPosition();
    return;
  }
  const text = state.currentDoc.paragraphs[state.currentIndex];
  const duration = estimateDuration(text);
  let offset = Math.max(0, (state.currentDoc.approxOffsetSec || estimateElapsed()) + delta);
  let idx = state.currentIndex;
  if (offset > duration && idx < state.currentDoc.paragraphs.length - 1) {
    idx++;
    offset = 0;
  } else if (delta < 0 && offset <= 0 && idx > 0) {
    idx--;
    offset = Math.max(0, estimateDuration(state.currentDoc.paragraphs[idx]) - 15);
  }
  state.currentIndex = idx;
  state.currentDoc.approxOffsetSec = offset;
  updateReaderProgress();
  if (state.isPlaying) speakCurrent(true);
  else persistPosition();
}

function setSleepTimer(minutes) {
  clearTimeout(state.sleepTimer);
  state.sleepTimer = null;
  state.sleepMinutes = Number(minutes);
  $("timerLabel").textContent = state.sleepMinutes ? `• ${state.sleepMinutes}m timer` : "";
  if (state.sleepMinutes > 0) {
    state.sleepTimer = setTimeout(() => {
      pauseSpeech();
      state.sleepMinutes = 0;
      sleepSelect.value = "0";
      $("timerLabel").textContent = "";
    }, state.sleepMinutes * 60000);
  }
}

async function renameDocument(id) {
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  const next = prompt("Rename document", doc.name);
  if (next?.trim()) {
    doc.name = next.trim();
    await putDoc(doc);
    renderLibrary();
  }
}

async function deleteDocument(id) {
  const doc = state.docs.find(d => d.id === id);
  if (!doc || !confirm(`Delete "${doc.name}"?`)) return;
  await removeDoc(id);
  state.docs = state.docs.filter(d => d.id !== id);
  renderLibrary();
}

library.addEventListener("click", e => {
  const open = e.target.closest("[data-open]")?.dataset.open;
  const rename = e.target.closest("[data-rename]")?.dataset.rename;
  const del = e.target.closest("[data-delete]")?.dataset.delete;
  if (open) openDocument(open);
  if (rename) renameDocument(rename);
  if (del) deleteDocument(del);
});

fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));

$("backBtn").addEventListener("click", async () => {
  stopSpeech(true);
  clearTimeout(state.sleepTimer);
  await persistPosition();
  renderLibrary();
  showScreen("home");
});

playBtn.addEventListener("click", () => state.isPlaying ? pauseSpeech() : speakCurrent(true));
$("prevBtn").addEventListener("click", async () => { await setCurrentIndex(state.currentIndex - 1, true); speakCurrent(false); });
$("nextBtn").addEventListener("click", async () => { await setCurrentIndex(state.currentIndex + 1, true); speakCurrent(false); });
$("rewindBtn").addEventListener("click", () => jumpSeconds(-15));
$("forwardBtn").addEventListener("click", () => jumpSeconds(15));
$("settingsBtn").addEventListener("click", () => settingsPanel.classList.remove("hidden"));
$("closeSettingsBtn").addEventListener("click", () => settingsPanel.classList.add("hidden"));
$("sheetCloseX").addEventListener("click", () => settingsPanel.classList.add("hidden"));

voiceSelect.addEventListener("change", async () => {
  stopSpeech(true);
  state.voiceChoice = voiceSelect.value;
  if (state.voiceChoice.startsWith("sys:")) state.selectedVoiceURI = state.voiceChoice.slice(4);
  await setSetting("voiceChoice", state.voiceChoice);
  await setSetting("voiceURI", state.selectedVoiceURI);
  updateVoiceLabel();
});

speedSelect.addEventListener("change", async () => {
  state.speed = Number(speedSelect.value);
  await setSetting("speed", state.speed);
  if (state.aiAudio) state.aiAudio.playbackRate = state.speed;
  updateVoiceLabel();
  if (state.isPlaying && !state.aiAudio) speakCurrent(true);
});

sleepSelect.addEventListener("change", () => setSleepTimer(sleepSelect.value));
$("continueBtn").addEventListener("click", () => { resumePanel.classList.add("hidden"); scrollToCurrent(false); });
$("restartBtn").addEventListener("click", async () => {
  resumePanel.classList.add("hidden");
  state.currentIndex = 0;
  state.currentDoc.approxOffsetSec = 0;
  await persistPosition();
  updateReaderProgress();
  scrollToCurrent(false);
});

document.addEventListener("visibilitychange", () => { if (document.hidden) persistPosition(); });
window.addEventListener("pagehide", () => persistPosition());

async function init() {
  state.db = await openDb();
  state.docs = await getAllDocs();
  state.selectedVoiceURI = await getSetting("voiceURI", "");
  state.voiceChoice = await getSetting("voiceChoice", "ai:af_heart");
  state.speed = Number(await getSetting("speed", 1));
  speedSelect.value = String(state.speed);
  renderLibrary();
  if ("speechSynthesis" in window) {
    loadDeviceVoices();
    speechSynthesis.onvoiceschanged = loadDeviceVoices;
  } else {
    populateVoices();
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(console.warn);
}

init().catch(err => {
  console.error(err);
  alert("Natural Reader could not start. Try reloading the page.");
});