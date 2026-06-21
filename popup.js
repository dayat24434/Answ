const keyInput = document.getElementById('keyInput');
const keyList = document.getElementById('keyList');
const keyCount = document.getElementById('keyCount');
const btnSave = document.getElementById('btnSave');
const btnStart = document.getElementById('btnStart');
const btnCheckAll = document.getElementById('btnCheckAll');
const btnDeleteAll = document.getElementById('btnDeleteAll');
const toast = document.getElementById('toast');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

let currentKeys = [];
let keyStatuses = {}; // { keyIndex: 'idle' | 'checking' | 'valid' | 'invalid' }

// --- Toast ---
let toastTimer = null;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// --- Load keys from background ---
async function loadKeys() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_KEYS' });
    if (res && Array.isArray(res.keys)) {
      currentKeys = res.keys;
    }
  } catch (e) {
    currentKeys = [];
  }
  renderKeys();
}

// --- Render key list ---
function renderKeys() {
  const count = currentKeys.length;
  keyCount.textContent = `${count} key`;

  if (count === 0) {
    keyList.innerHTML = `
      <div class="empty-state">
        <div class="ico">&#128274;</div>
        <p>Belum ada API key</p>
        <div class="sub">Tambahkan key di atas</div>
      </div>
    `;
    btnCheckAll.style.display = 'none';
    btnDeleteAll.style.display = 'none';
    statusText.textContent = 'Belum ada API key';
    statusDot.className = 'dot off';
    return;
  }

  btnCheckAll.style.display = '';
  btnDeleteAll.style.display = '';
  statusText.textContent = `${count} API key tersedia`;
  statusDot.className = 'dot on';

  // Init statuses for new keys
  currentKeys.forEach((_, i) => {
    if (!(i in keyStatuses)) keyStatuses[i] = 'idle';
  });
  // Clean up stale statuses
  Object.keys(keyStatuses).forEach(k => {
    if (parseInt(k) >= currentKeys.length) delete keyStatuses[k];
  });

  let html = '';
  currentKeys.forEach((key, i) => {
    const masked = key.length > 12
      ? key.slice(0, 6) + '••••' + key.slice(-4)
      : key.slice(0, 4) + '••••';
    const status = keyStatuses[i] || 'idle';
    html += `
      <div class="key-item">
        <span class="status-dot-item ${status}"></span>
        <span class="key-text" title="${key}">${masked}</span>
        <div class="actions">
          <button class="btn btn-outline btn-xs" data-action="check" data-index="${i}" ${status === 'checking' ? 'disabled' : ''}>Cek</button>
          <button class="btn btn-danger btn-xs" data-action="delete" data-index="${i}">Hapus</button>
        </div>
      </div>
    `;
  });
  keyList.innerHTML = html;

  // Attach check handlers
  keyList.querySelectorAll('[data-action="check"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      checkKey(idx);
    });
  });

  // Attach delete handlers
  keyList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      deleteKey(idx);
    });
  });
}

// --- Save keys ---
async function saveKeys() {
  const raw = keyInput.value.trim();
  if (!raw) {
    showToast('Masukkan minimal satu API key', 'error');
    return;
  }

  const newKeys = raw.split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (newKeys.length === 0) {
    showToast('Tidak ada key yang valid', 'error');
    return;
  }

  const merged = [...currentKeys];
  let added = 0;
  for (const key of newKeys) {
    if (!merged.includes(key)) {
      merged.push(key);
      added++;
    }
  }

  try {
    const res = await chrome.runtime.sendMessage({ type: 'UPDATE_KEYS', keys: merged });
    if (res && res.success) {
      currentKeys = merged;
      renderKeys();
      keyInput.value = '';
      showToast(`${added} key ditambahkan (total: ${merged.length})`);
    } else {
      showToast('Gagal menyimpan key', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke background', 'error');
  }
}

// --- Delete key ---
async function deleteKey(index) {
  const updated = currentKeys.filter((_, i) => i !== index);

  try {
    const res = await chrome.runtime.sendMessage({ type: 'UPDATE_KEYS', keys: updated });
    if (res && res.success) {
      currentKeys = updated;
      renderKeys();
      showToast('Key dihapus');
    } else {
      showToast('Gagal menghapus key', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke background', 'error');
  }
}

// --- Check API key validity ---
async function checkKey(index) {
  const key = currentKeys[index];
  if (!key) return;

  keyStatuses[index] = 'checking';
  renderKeys();

  try {
    const res = await chrome.runtime.sendMessage({ type: 'CHECK_API_KEY', key });
    keyStatuses[index] = res?.valid ? 'valid' : 'invalid';
    if (res?.valid) {
      showToast('API key valid!', 'success');
    } else {
      showToast(res?.error || 'API key tidak valid', 'error');
    }
  } catch (e) {
    keyStatuses[index] = 'invalid';
    showToast('Gagal memeriksa key', 'error');
  }
  renderKeys();
}

// --- Check all keys ---
async function checkAllKeys() {
  const indices = currentKeys.map((_, i) => i);
  if (indices.length === 0) return;

  // Set all to checking
  indices.forEach(i => { keyStatuses[i] = 'checking'; });
  renderKeys();

  let valid = 0, invalid = 0;

  for (const i of indices) {
    const key = currentKeys[i];
    if (!key) continue;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CHECK_API_KEY', key });
      keyStatuses[i] = res?.valid ? 'valid' : 'invalid';
      if (res?.valid) valid++; else invalid++;
    } catch {
      keyStatuses[i] = 'invalid';
      invalid++;
    }
    renderKeys();
  }

  showToast(`${valid} valid, ${invalid} tidak valid dari ${indices.length} key`, invalid > 0 ? 'error' : 'success');
}

// --- Delete all keys ---
async function deleteAllKeys() {
  if (currentKeys.length === 0) return;

  if (!confirm('Hapus semua API key yang tersimpan?')) return;

  try {
    const res = await chrome.runtime.sendMessage({ type: 'UPDATE_KEYS', keys: [] });
    if (res && res.success) {
      currentKeys = [];
      keyStatuses = {};
      renderKeys();
      showToast('Semua API key dihapus');
    } else {
      showToast('Gagal menghapus key', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke background', 'error');
  }
}

// --- Start Selection ---
async function startSelection() {
  if (currentKeys.length === 0) {
    showToast('Tambahkan API key terlebih dahulu', 'error');
    return;
  }

  try {
    await chrome.runtime.sendMessage({ type: 'START_SELECTION' });
    window.close();
  } catch (e) {
    showToast('Gagal memulai seleksi', 'error');
  }
}

// --- Event listeners ---
btnSave.addEventListener('click', saveKeys);
btnStart.addEventListener('click', startSelection);
btnCheckAll.addEventListener('click', checkAllKeys);
btnDeleteAll.addEventListener('click', deleteAllKeys);

keyInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    saveKeys();
  }
});

// --- Init ---
loadKeys();
