const DB_NAME = "natural-reader-db";
const DB_VERSION = 1;
const DOC_STORE = "documents";
const SETTINGS_STORE = "settings";

const state = {
  db: null,
  docs: [],
  currentDoc: null,
  currentIndex: 0,
  isPlaying: false,
  voices: [],
  selectedVoiceURI: "",
  speed: 1,
  sleepMinutes: 0,
  sleepTimer: null,
  estimatedParagraphStart: 0,
  estimatedParagraphDuration: 0,
  lastStartedAt: 0
};

const $ = (id) => document.getElementById(id);

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
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        db.createObjectStore(DOC_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = "readonly") {
  return state.db.transaction(storeName, mode).objectStore(storeName);
}

function getAllDocs() {
  return new Promise((resolve, reject) => {
    const req = tx(DOC_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function putDoc(doc) {
  return new Promise((resolve, reject) => {
    const req = tx(DOC_STORE, "readwrite").put(doc);
    req.onsuccess = () => resolve(doc);
    req.onerror = () => reject(req.error);
  });
}

function deleteDoc(id) {
  return new Promise((resolve, reject) => {
    const req = tx(DOC_STORE, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getSetting(key, fallback) {
  return new Promise((resolve) => {
    const req = tx(SETTINGS_STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? fallback);
    req.onerror = () => resolve(fallback);
  });
}

function setSetting(key, value) {
  return new Promise((resolve) => {
    const req = tx(SETTINGS_STORE, "readwrite").put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

function normalizeParagraphs(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split(/\n{2,}/)
    .map(p => p.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(p => p.length > 1)
    .flatMap(p => chunkParagraph(p, 700));
}

function chunkParagraph(text, maxLen = 700) {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = (current + " " + s).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
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

function fileType(file) {
  return file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX";
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
      type: fileType(file),
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

function docProgress(doc) {
  if (!doc.paragraphs?.length) return 0;
  return Math.min(100, Math.round((doc.currentIndex / Math.max(1, doc.paragraphs.length - 1)) * 100));
}

function renderLibrary() {
  state.docs.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
  library.innerHTML = "";
  documentCount.textContent = `${state.docs.length} ${state.docs.length === 1 ? "document" : "documents"}`;
  emptyState.classList.toggle("hidden", state.docs.length > 0);

  for (const doc of state.docs) {
    const card = document.createElement("div");
    card.className = "doc-card";
    const p = docProgress(doc);
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function openDocument(id) {
  stopSpeech();
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

function showScreen(which) {
  homeScreen.classList.toggle("active", which === "home");
  readerScreen.classList.toggle("active", which === "reader");
}

function renderReaderText() {
  readerContent.innerHTML = "";
  state.currentDoc.paragraphs.forEach((text, index) => {
    const p = document.createElement("p");
    p.textContent = text;
    p.dataset.index = index;
    p.addEventListener("click", () => {
      setCurrentIndex(index, true);
      speakCurrent();
    });
    readerContent.appendChild(p);
  });
  highlightCurrent();
}

function highlightCurrent() {
  readerContent.querySelectorAll("p.active").forEach(el => el.classList.remove("active"));
  const current = readerContent.querySelector(`p[data-index="${state.currentIndex}"]`);
  if (current) current.classList.add("active");
}

function scrollToCurrent(smooth = true) {
  const current = readerContent.querySelector(`p[data-index="${state.currentIndex}"]`);
  if (current) current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
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

async function persistPosition() {
  if (!state.currentDoc) return;
  state.currentDoc.currentIndex = state.currentIndex;
  state.currentDoc.approxOffsetSec = estimateElapsedInParagraph();
  state.currentDoc.lastOpenedAt = Date.now();
  await putDoc(state.currentDoc);
}

function estimateDuration(text) {
  const words = Math.max(1, text.trim().split(/\s+/).length);
  const wpm = 175 * state.speed;
  return Math.max(2, words / wpm * 60);
}

function estimateElapsedInParagraph() {
  if (!state.lastStartedAt || !state.isPlaying) return state.currentDoc?.approxOffsetSec || 0;
  return Math.min(state.estimatedParagraphDuration, (Date.now() - state.lastStartedAt) / 1000 + state.estimatedParagraphStart);
}

function selectedVoice() {
  return state.voices.find(v => v.voiceURI === state.selectedVoiceURI) ||
         state.voices.find(v => /^en(-|_)/i.test(v.lang) && /premium|enhanced|natural|siri/i.test(v.name)) ||
         state.voices.find(v => /^en(-|_)/i.test(v.lang)) ||
         state.voices[0];
}

function cancelSpeech() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function stopSpeech() {
  persistPosition();
  cancelSpeech();
  state.isPlaying = false;
  state.lastStartedAt = 0;
  playBtn.textContent = "▶";
}

function pauseSpeech() {
  if (!state.isPlaying) return;
  const elapsed = estimateElapsedInParagraph();
  state.currentDoc.approxOffsetSec = elapsed;
  cancelSpeech();
  state.isPlaying = false;
  state.lastStartedAt = 0;
  playBtn.textContent = "▶";
  persistPosition();
}

function speechTextFromOffset(text, offsetSec) {
  if (!offsetSec || offsetSec <= 1) return text;
  const duration = estimateDuration(text);
  const fraction = Math.min(.9, offsetSec / Math.max(1, duration));
  let charIndex = Math.floor(text.length * fraction);
  const nextSpace = text.indexOf(" ", charIndex);
  if (nextSpace > -1) charIndex = nextSpace + 1;
  return text.slice(charIndex);
}

function speakCurrent(useSavedOffset = true) {
  if (!state.currentDoc || !("speechSynthesis" in window)) {
    alert("Speech synthesis is not available in this browser.");
    return;
  }
  cancelSpeech();
  const text = state.currentDoc.paragraphs[state.currentIndex];
  const startOffset = useSavedOffset ? (state.currentDoc.approxOffsetSec || 0) : 0;
  const spokenText = speechTextFromOffset(text, startOffset);
  const utter = new SpeechSynthesisUtterance(spokenText);
  const voice = selectedVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }
  utter.rate = state.speed;
  utter.pitch = 1;
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
  utter.onerror = (e) => {
    console.warn("Speech error", e);
    state.isPlaying = false;
    playBtn.textContent = "▶";
  };
  speechSynthesis.speak(utter);
}

async function setCurrentIndex(index, resetOffset = true) {
  if (!state.currentDoc) return;
  cancelSpeech();
  state.currentIndex = Math.max(0, Math.min(index, state.currentDoc.paragraphs.length - 1));
  if (resetOffset) state.currentDoc.approxOffsetSec = 0;
  state.isPlaying = false;
  playBtn.textContent = "▶";
  updateReaderProgress();
  scrollToCurrent();
  await persistPosition();
}

function jumpApproxSeconds(delta) {
  if (!state.currentDoc) return;
  const text = state.currentDoc.paragraphs[state.currentIndex];
  const duration = estimateDuration(text);
  let offset = state.currentDoc.approxOffsetSec || estimateElapsedInParagraph();
  offset = Math.max(0, offset + delta);

  let idx = state.currentIndex;
  while (offset > duration && idx < state.currentDoc.paragraphs.length - 1) {
    offset -= duration;
    idx++;
  }
  if (offset <= 0 && delta < 0 && idx > 0) {
    idx--;
    offset = Math.max(0, estimateDuration(state.currentDoc.paragraphs[idx]) + offset);
  }
  state.currentIndex = idx;
  state.currentDoc.approxOffsetSec = offset;
  updateReaderProgress();
  if (state.isPlaying) speakCurrent(true);
  else persistPosition();
}

function loadVoices() {
  state.voices = speechSynthesis.getVoices().slice().sort((a,b) => {
    const ae = /^en/i.test(a.lang) ? 0 : 1;
    const be = /^en/i.test(b.lang) ? 0 : 1;
    return ae - be || a.name.localeCompare(b.name);
  });
  voiceSelect.innerHTML = "";
  state.voices.forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${v.name} (${v.lang})${v.default ? " — default" : ""}`;
    voiceSelect.appendChild(o);
  });
  const preferred = selectedVoice();
  if (!state.selectedVoiceURI && preferred) state.selectedVoiceURI = preferred.voiceURI;
  if (state.selectedVoiceURI) voiceSelect.value = state.selectedVoiceURI;
  updateVoiceLabel();
}

function updateVoiceLabel() {
  $("voiceLabel").textContent = selectedVoice()?.name || "System voice";
  $("speedLabel").textContent = `${Number(state.speed).toFixed(state.speed % 1 ? 2 : 1).replace(/0$/, "")}×`;
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
    }, state.sleepMinutes * 60 * 1000);
  }
}

async function renameDocument(id) {
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  const next = prompt("Rename document", doc.name);
  if (next && next.trim()) {
    doc.name = next.trim();
    await putDoc(doc);
    renderLibrary();
  }
}

async function removeDocument(id) {
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  if (!confirm(`Delete "${doc.name}"?`)) return;
  await deleteDoc(id);
  state.docs = state.docs.filter(d => d.id !== id);
  renderLibrary();
}

library.addEventListener("click", async (e) => {
  const open = e.target.closest("[data-open]")?.dataset.open;
  const rename = e.target.closest("[data-rename]")?.dataset.rename;
  const del = e.target.closest("[data-delete]")?.dataset.delete;
  if (open) openDocument(open);
  if (rename) renameDocument(rename);
  if (del) removeDocument(del);
});

fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));

$("backBtn").addEventListener("click", async () => {
  stopSpeech();
  clearTimeout(state.sleepTimer);
  state.sleepTimer = null;
  await persistPosition();
  renderLibrary();
  showScreen("home");
});

playBtn.addEventListener("click", () => {
  if (state.isPlaying) pauseSpeech();
  else speakCurrent(true);
});

$("prevBtn").addEventListener("click", async () => {
  await setCurrentIndex(state.currentIndex - 1, true);
  speakCurrent(false);
});
$("nextBtn").addEventListener("click", async () => {
  await setCurrentIndex(state.currentIndex + 1, true);
  speakCurrent(false);
});
$("rewindBtn").addEventListener("click", () => jumpApproxSeconds(-15));
$("forwardBtn").addEventListener("click", () => jumpApproxSeconds(15));

$("settingsBtn").addEventListener("click", () => settingsPanel.classList.remove("hidden"));
$("closeSettingsBtn").addEventListener("click", () => settingsPanel.classList.add("hidden"));
$("sheetCloseX").addEventListener("click", () => settingsPanel.classList.add("hidden"));

voiceSelect.addEventListener("change", async () => {
  state.selectedVoiceURI = voiceSelect.value;
  await setSetting("voiceURI", state.selectedVoiceURI);
  updateVoiceLabel();
  if (state.isPlaying) speakCurrent(true);
});

speedSelect.addEventListener("change", async () => {
  state.speed = Number(speedSelect.value);
  await setSetting("speed", state.speed);
  updateVoiceLabel();
  if (state.isPlaying) speakCurrent(true);
});

sleepSelect.addEventListener("change", () => setSleepTimer(Number(sleepSelect.value)));

$("continueBtn").addEventListener("click", () => {
  resumePanel.classList.add("hidden");
  scrollToCurrent(false);
});
$("restartBtn").addEventListener("click", async () => {
  resumePanel.classList.add("hidden");
  state.currentIndex = 0;
  state.currentDoc.approxOffsetSec = 0;
  await persistPosition();
  updateReaderProgress();
  scrollToCurrent(false);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) persistPosition();
});
window.addEventListener("pagehide", () => persistPosition());

async function init() {
  state.db = await openDb();
  state.docs = await getAllDocs();
  state.selectedVoiceURI = await getSetting("voiceURI", "");
  state.speed = Number(await getSetting("speed", 1));
  speedSelect.value = String(state.speed);

  renderLibrary();

  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  } else {
    $("voiceLabel").textContent = "Speech unavailable";
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.warn);
  }
}

init().catch(err => {
  console.error(err);
  alert("Natural Reader could not start. Try reloading the page.");
});
