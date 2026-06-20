const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
let API_KEYS = [];
let keyIndex = 0;

function getNextKey() {
  if (API_KEYS.length === 0) return '';
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
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
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content_script.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' }).catch(() => {});
  }
}

chrome.action.onClicked.addListener(startSelection);

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-question') startSelection();
});

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
  const maxTries = Math.max(API_KEYS.length, 1);
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const key = getNextKey();
    if (!key) break;
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
  }
  throw new Error('Semua API key gagal.');
}
