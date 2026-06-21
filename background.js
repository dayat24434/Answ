const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
let API_KEYS = [];
let keysInUse = new Set();

// --- Load API keys from chrome.storage ---
async function loadApiKeys() {
  try {
    const result = await chrome.storage.local.get(['apiKeys']);
    if (result.apiKeys && Array.isArray(result.apiKeys) && result.apiKeys.length > 0) {
      API_KEYS = result.apiKeys;
    } else {
      // Fallback: coba load dari api.json (untuk backward compatibility)
      try {
        const res = await fetch(chrome.runtime.getURL('api.json'));
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Saring key yang merupakan placeholder/template
          API_KEYS = data.filter(k => {
            const upper = k.toUpperCase();
            return !upper.includes('GEMINI_API_KEY') && !upper.includes('API_KEY_ANDA');
          });
          if (API_KEYS.length > 0) {
            // Simpan ke chrome.storage
            await chrome.storage.local.set({ apiKeys: API_KEYS });
          }
        }
      } catch (e2) {
        console.warn('api.json tidak ditemukan atau kosong.');
      }
    }
  } catch (e) {
    console.error('Gagal load API keys dari storage:', e);
  }
}

let keysLoaded = loadApiKeys();

// --- Start selection on current tab ---
async function startSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });
  } catch {
    // Content script belum terdaftar, inject manual
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

// --- Message handler ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CAPTURE_AND_SOLVE':
      handleCaptureAndSolve(request.coords, sender.tab.id, sendResponse);
      return true;

    case 'GET_KEYS':
      keysLoaded.then(() => {
        sendResponse({ keys: API_KEYS });
      });
      return true;

    case 'UPDATE_KEYS':
      if (Array.isArray(request.keys)) {
        API_KEYS = request.keys;
        keysInUse.clear();
        chrome.storage.local.set({ apiKeys: request.keys }).then(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Invalid keys format' });
      }
      return true;

    case 'START_SELECTION':
      startSelection().then(() => {
        sendResponse({ success: true });
      }).catch(() => {
        sendResponse({ success: false, error: 'Gagal memulai seleksi' });
      });
      return true;

    case 'CHECK_API_KEY':
      checkApiKey(request.key).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ valid: false, error: err.message });
      });
      return true;
  }
});

// --- Capture & Solve ---
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

// --- Crop image using OffscreenCanvas ---
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

// --- Blob to Base64 ---
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- Fetch answer from Gemini API ---
async function fetchGeminiAnswer(base64Image) {
  if (API_KEYS.length === 0) {
    await keysLoaded;
  }

  if (API_KEYS.length === 0) {
    throw new Error('Tidak ada API key terdaftar. Buka popup ekstensi untuk menambahkan API key.');
  }

  // Coba key yang sedang tidak dipakai
  const keysToTry = API_KEYS.filter(k => !keysInUse.has(k));
  if (keysToTry.length === 0) {
    throw new Error('Semua API key sedang dipakai. Tunggu beberapa saat lalu coba lagi.');
  }

  for (const key of keysToTry) {
    keysInUse.add(key);
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
      keysInUse.delete(key);
    }
  }
  throw new Error('Semua API key gagal.');
}

// --- Check if an API key is valid ---
async function checkApiKey(key) {
  try {
    const response = await fetch(`${API_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Katakan "OK"' }]
        }]
      })
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 403 || response.status === 401) {
      return { valid: false, error: 'API Key tidak valid atau tidak memiliki akses.' };
    } else if (response.status === 429) {
      return { valid: false, error: 'Terlalu banyak permintaan (rate limit).' };
    } else {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${response.status}`;
      return { valid: false, error: msg };
    }
  } catch (e) {
    return { valid: false, error: 'Gagal terhubung ke server Gemini.' };
  }
}
