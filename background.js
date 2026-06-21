const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
let API_KEYS = [];
let keysInUse = new Set();

/** Cari API key yang sedang tidak dipakai oleh pengguna lain */
function findAvailableKey() {
  for (const key of API_KEYS) {
    if (!keysInUse.has(key)) return key;
  }
  return null;
}

async function loadApiKeys() {
  try {
    const res = await fetch('api.json');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) API_KEYS = data;
  } catch (e) {
    console.error('Gagal load api.json:', e);
  }
}
loadApiKeys();

async function startSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_script.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' }).catch(() => {});
      }, 50);
    } catch (e) {
      console.error('Gagal inject content script:', e);
    }
  }
}

chrome.action.onClicked.addListener(startSelection);


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_AND_SOLVE') {
    handleCaptureAndSolve(request.coords, sender.tab.id, sendResponse);
    return true;
  }
});

async function handleCaptureAndSolve(coords, tabId, sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const croppedBase64 = await cropImage(dataUrl, coords);
    const answer = await fetchGeminiAnswer(croppedBase64);
    sendResponse({ success: true, answer });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function cropImage(dataUrl, coords) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const img = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(coords.width, coords.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, coords.x, coords.y, coords.width, coords.height, 0, 0, coords.width, coords.height);
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToBase64(croppedBlob);
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchGeminiAnswer(base64Image) {
  if (API_KEYS.length === 0) await loadApiKeys();

  if (API_KEYS.length === 0) {
    throw new Error('Tidak ada API key terdaftar. Periksa api.json.');
  }

  // Hanya coba key yang sedang tidak dipakai
  const keysToTry = API_KEYS.filter(k => !keysInUse.has(k));
  if (keysToTry.length === 0) {
    throw new Error('Semua API key sedang dipakai pengguna lain. Coba lagi nanti.');
  }

  for (const key of keysToTry) {
    keysInUse.add(key); // kunci agar tidak dipakai user lain
    try {
      const response = await fetch(`${API_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Kamu adalah asisten ujian virtual. Jawablah soal pada gambar ini secara instan, singkat, padat, dan langsung ke inti jawaban/opsi yang benar tanpa bertele-tele.' },
              { inline_data: { mime_type: 'image/png', data: base64Image } }
            ]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada jawaban.';
      }
    } finally {
      keysInUse.delete(key); // lepas kunci setelah selesai (sukses/gagal)
    }
  }
  throw new Error('Semua API key gagal.');
}
