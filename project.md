# Project: Answ — AI Answer Solver (Ekstensi Chrome)

Dokumen ini berfungsi sebagai panduan teknis, rencana kerja, dan standar operasional untuk tim engineer dalam membangun ekstensi Chrome pemindai soal berbasis AI.

---

## 🗺️ 1. Mapping Arsitektur & Alur Data (Manifest V3)

Ekstensi ini dibangun menggunakan arsitektur Google Chrome Extensions Manifest V3. Komponen utamanya terbagi menjadi empat: `Popup`, `Content Script`, `Background Script (Service Worker)`, dan `Gemini API`.

### Komponen Utama:

1. **Popup (`popup.html` & `popup.js`)**:
   - Muncul saat ikon ekstensi diklik di toolbar Chrome.
   - UI card-based dengan gradient header, status bar, textarea input API key, dan daftar key tersimpan.
   - Setiap key memiliki dot status indicator: idle (abu), checking (kuning berkedip), valid (hijau), invalid (merah).
   - Tombol **Cek** untuk memvalidasi API key via Gemini API.
   - Tombol **Cek Semua** untuk memvalidasi seluruh key sekaligus secara sequential (dengan summary toast).
   - Tombol **Hapus** untuk menghapus key dari daftar.
   - Tombol **Hapus Semua** untuk menghapus seluruh key dengan konfirmasi dialog.
   - Tombol **Mulai Seleksi** hijau solid untuk memulai mode seleksi soal.
   - Shortcut `Ctrl+Enter` untuk menyimpan key dari textarea.
   - Tombol batch (Cek Semua / Hapus Semua) hanya muncul saat ada key tersimpan.
   - Komunikasi dengan background script via `chrome.runtime.sendMessage`:
     - `GET_KEYS` — ambil daftar API key tersimpan
     - `UPDATE_KEYS` — simpan/hapus API key ke `chrome.storage.local`
     - `CHECK_API_KEY` — validasi key dengan panggilan ringan ke Gemini API
     - `START_SELECTION` — mulai mode seleksi di tab aktif

2. **Content Script (`content_script.js` & `content.css`)**:
   - Berjalan di konteks halaman web yang sedang aktif (auto-inject via manifest).
   - Mendengarkan shortcut keyboard (`Alt + X`) dan pesan `START_SELECTION` dari background script.
   - Menangani UI seleksi (klik & seret kursor) untuk menentukan area soal.
   - Membuat overlay transparan dengan border dashed hijau (`#00ff88`).
   - Validasi area minimum seleksi (10px × 10px).
   - Mengirim koordinat seleksi ke background via `CAPTURE_AND_SOLVE`.
   - Menyuntikkan (*injecting*) komponen UI jawaban dengan gaya solid (putih/*light* atau menyesuaikan tema sistem/*dark mode*).
   - Merender notasi LaTeX secara native: `\frac`, `\sqrt`, `\binom`, simbol Yunani, operator matematika, superskrip/subskrip, panah, dll.
   - Mengatur fitur agar UI jawaban dapat digeser (*draggable*).
   - Auto-close jawaban saat klik di luar area kotak atau tekan `Esc`.

3. **Background Script (`background.js` - Service Worker)**:
   - Berjalan di latar belakang browser, tidak memiliki akses langsung ke DOM halaman web.
   - **Load API key** dari `chrome.storage.local` saat startup (dengan promise `keysLoaded` untuk mencegah race condition).
   - **Fallback** ke file `api.json` jika storage kosong (backward compatibility).
   - **Message handler** untuk berbagai tipe pesan:
     - `GET_KEYS` — kirim daftar API key ke popup
     - `UPDATE_KEYS` — simpan daftar key baru ke storage & clear `keysInUse`
     - `START_SELECTION` — mulai seleksi di tab aktif (auto-inject content script jika belum terdaftar)
     - `CHECK_API_KEY` — validasi API key dengan panggilan ringan ke Gemini, deteksi 401/403/429
     - `CAPTURE_AND_SOLVE` — capture, crop, dan kirim ke Gemini untuk dijawab
   - Mengambil tangkapan layar menggunakan API `chrome.tabs.captureVisibleTab`.
   - Memotong gambar (*cropping*) sesuai koordinat menggunakan `OffscreenCanvas` API dan `createImageBitmap`.
   - Mengubah hasil potongan menjadi format *Base64 string*.
   - Mendukung **rotasi multi API key** — mengambil daftar key dari `API_KEYS` array dan mendistribusikan penggunaan agar tidak terjadi bentrok (menggunakan `Set` untuk tracking key yang sedang dipakai).
   - Auto-inject content script ke halaman jika belum terdaftar (via `chrome.scripting.executeScript`).

4. **Gemini API (Google AI Studio)**:
   - Menerima payload berupa gambar Base64 dan prompt instruksi teks.
   - Memproses gambar menggunakan model multimodal `gemini-2.5-flash`.
   - **Endpoint stabil:** `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`
   - Mengembalikan jawaban teks ke Background Script.

### Alur Data Sekilas (Flowchart Teks):

```
[User: Klik Ikon Ekstensi → Popup terbuka]
       │
       ▼
Popup → Input API key → Simpan ke chrome.storage.local
       │
[User: Klik "Mulai Seleksi" / Tekan Alt+X]
       │
       ▼
Content Script → Buat overlay seleksi transparan
       │
[User: Mouse Drag → Select Area Soal]
       │
       ▼
Content Script → Kirim koordinat via chrome.runtime.sendMessage
       │
       ▼
Background Script → captureVisibleTab → crop via OffscreenCanvas → Base64
       │
       ▼
Background Script → fetch Gemini API (dengan key rotation otomatis)
       │
       ▼
Background Script → Parse response → Kirim jawaban ke Content Script
       │
       ▼
Content Script → Render jawaban (dengan parsing LaTeX) → Tampilkan UI draggable
       │
[User: Klik di luar / Esc → Tutup jawaban]
```

---

## 📋 2. Rencana Kerja Pengerjaan (Development Plan)

### Fase 1: Inisiasi Proyek & Struktur Dasar (Setup)
- [x] Membuat direktori proyek dan menginisialisasi Git repository.
- [x] Menyusun `manifest.json` (Manifest V3) dengan deklarasi perizinan:
  - `activeTab`, `scripting`, `storage`, `tabs`
  - `host_permissions` untuk `https://generativelanguage.googleapis.com/*` dan `<all_urls>`
- [x] Membuat file: `background.js`, `content_script.js`, `content.css`, `CHANGELOG.md`, `project.md`.
- [x] Memuat ekstensi ke Google Chrome melalui `chrome://extensions` (Developer Mode → Load Unpacked).

### Fase 2: Implementasi Area Seleksi (Screencapture UI)
- [x] Menambahkan *event listener* global untuk shortcut keyboard (`Alt + X`) pada `content_script.js`.
- [x] Membuat *overlay* transparan penuh layar saat shortcut ditekan untuk membekukan interaksi halaman asli.
- [x] Mendengarkan pesan `START_SELECTION` dari background script.
- [x] Mengimplementasikan logika *mouse events* (`mousedown`, `mousemove`, `mouseup`) untuk menggambar kotak seleksi visual (border dashed hijau).
- [x] Menyimpan koordinat awal dan akhir (X, Y, Width, Height) saat *mouse up*.
- [x] Validasi area minimum (10px × 10px) — seleksi terlalu kecil diabaikan.

### Fase 3: Logika Pemotongan Gambar & Message Passing
- [x] Implementasi `chrome.runtime.sendMessage` untuk mengirim data koordinat dari Content Script ke Background Script.
- [x] Di `background.js`, tangkap layar penuh menggunakan `chrome.tabs.captureVisibleTab(null, {format: 'png'})`.
- [x] Gunakan `createImageBitmap` + `OffscreenCanvas` untuk memuat gambar penuh dan memotongnya berdasarkan koordinat seleksi.
- [x] Konversikan hasil potongan gambar menjadi format Base64 via `canvas.convertToBlob` → `arrayBuffer` → `btoa`.

### Fase 4: Integrasi Google Gemini API
- [x] Menyusun fungsi asynchronous `fetchGeminiAnswer(base64Image)` di dalam `background.js`.
- [x] Menggunakan endpoint stabil Gemini API (`v1/models/gemini-2.5-flash:generateContent`).
- [x] Mengonstruksi JSON payload dengan format multimodal yang tepat (menyertakan objek `inline_data` untuk gambar Base64 dan `text` untuk sistem prompt).
- [x] Menambahkan sistem prompt internal:
  > *"Kamu adalah asisten ujian virtual. Jawablah soal pada gambar ini secara instan, singkat, padat, dan langsung ke inti jawaban/opsi yang benar tanpa bertele-tele."*
- [x] Mengirimkan teks respons kembali ke Content Script melalui callback message passing.
- [x] Implementasi **multi API key rotation**:
  - API key disimpan di array `API_KEYS` di memory.
  - Background script melacak key yang sedang dipakai dengan `Set`.
  - Jika key gagal, coba key berikutnya secara otomatis.
  - Jika semua key habis/sibuk, tampilkan pesan error yang jelas.

### Fase 5: UI/UX Stealth & Optimalisasi Interaksi
- [x] Merancang kotak tampilan jawaban di `content_script.js` dengan gaya solid:
  - Background putih (`#ffffff`) dengan font hitam (`#000000`).
  - Border 1px solid menyesuaikan tema gelap/terang.
  - Border-radius 12px, padding 16px 20px.
  - Max-width 400px, font system-ui.
- [x] Deteksi tema otomatis: `window.matchMedia('(prefers-color-scheme: dark)')` — border menyesuaikan.
- [x] Render notasi LaTeX secara native (tanpa library eksternal).
- [x] Mengimplementasikan fitur *Draggable* pada kotak jawaban menggunakan JavaScript murni.
- [x] Menambahkan fungsi otomatis menutup kotak jika pengguna melakukan klik di luar area kotak jawaban.
- [x] Escape (`Esc`) untuk cancel seleksi overlay dan/atau tutup jawaban.
- [x] Auto-inject content script ke halaman jika belum terdaftar (via `chrome.scripting.executeScript`).
- [x] Guard terhadap double-injection content script (`window.__stealth_ans_initialized`).

### Fase 6: Popup UI & Manajemen API Key
- [x] Membuat popup UI (`popup.html`, `popup.js`) untuk input dan manajemen API key.
- [x] API key disimpan di `chrome.storage.local` — tidak perlu edit file, aman.
- [x] Daftar key tersimpan dengan tombol hapus per key.
- [x] Multi API key tanpa batasan jumlah.
- [x] Tombol "Mulai Seleksi" di popup.
- [x] Background script: load API key dari `chrome.storage.local` (bukan `fetch(api.json)`).
- [x] Fallback ke `api.json` jika storage kosong (backward compatibility).
- [x] Service worker: handle pesan `GET_KEYS`, `UPDATE_KEYS`, `START_SELECTION` dari popup.

### Fase 7: API Key Validation & UI Redesign
- [x] Validasi API key via Gemini API — deteksi 401/403/429, tampilkan pesan error jelas.
- [x] Popup UI redesign: card-based layout, gradient header, spacing lebih rapi.
- [x] Status bar dengan dot indikator (hijau = ada key / merah = belum ada key).
- [x] Dot status indicators per key: idle (abu), checking (kuning berkedip), valid (hijau), invalid (merah).
- [x] Animasi pulse pada dot "checking".
- [x] Empty state dengan ikon gembok saat belum ada key.
- [x] Event delegation via `data-action` attribute untuk tombol Cek/Hapus.
- [x] Shortcut `Ctrl+Enter` untuk menyimpan key.
- [x] Ikon ekstensi dihapus — Chrome auto-generate dari inisial "A".

### Fase 8: Batch Actions — Cek Semua & Hapus Semua
- [x] Tombol "Cek Semua" — validasi sequential semua key dengan real-time status update.
- [x] Tombol "Hapus Semua" — hapus semua key dengan konfirmasi `confirm()` dialog.
- [x] Summary toast setelah Cek Semua: "X valid, Y tidak valid dari Z key".
- [x] Show/hide tombol batch: muncul hanya saat ada key, sembunyi saat kosong.
- [x] `keyStatuses` di-reset saat semua key dihapus (mencegah stale entries).

---

## 🔑 3. Kebutuhan Eksternal & Konfigurasi (Prerequisites)

1. **Gemini API Key**:
   - Didapatkan secara mandiri melalui Google AI Studio ([aistudio.google.com](https://aistudio.google.com/)).
   - Masukkan melalui popup ekstensi → otomatis tersimpan di `chrome.storage.local`.
   - Tidak perlu membuat file konfigurasi manual.
   - File `api.json` (opsional) dapat digunakan sebagai fallback untuk backward compatibility.

2. **Google Chrome Versi Terbaru**:
   - Diperlukan dukungan Manifest V3 yang stabil dan fitur penangkapan tab yang optimal.

3. **Node.js & Bundler (Opsional)**:
   - Proyek menggunakan Vanilla JS (JavaScript murni) — tidak perlu build step.
   - `node_modules/` ada di proyek hanya untuk dev tools (icon generation dll).

### Struktur File Proyek

```
answ/
├── manifest.json          # Konfigurasi ekstensi Manifest V3
├── background.js          # Service Worker (capture, crop, API call, message handler)
├── popup.html             # Popup UI — input & manajemen API key
├── popup.js               # Logic popup — load/save/delete/check API key
├── content_script.js      # Content script (UI seleksi, rendering jawaban, LaTeX)
├── content.css            # Style tambahan untuk UI ekstensi
├── project.md             # Dokumentasi teknis proyek (file ini)
├── CHANGELOG.md           # Riwayat perubahan versi
├── README.md              # Dokumentasi pengguna
└── .gitignore             # Ignore config files & sensitive data
```

---

## 📝 4. Aturan Penulisan Sejarah Perubahan (Changelog Guidelines)

Setiap engineer **WAJIB** memperbarui file `CHANGELOG.md` setiap kali melakukan perubahan signifikan pada repositori. Format yang digunakan mengacu pada standar *Keep a Changelog* dengan penomoran versi *Semantic Versioning* (MAJOR.MINOR.PATCH).

### Contoh Format Penulisan di `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - YYYY-MM-DD

### Added
- Fitur baru yang ditambahkan.
- Penjelasan singkat fitur.

### Changed
- Perubahan pada fitur yang sudah ada.

### Fixed
- Perbaikan bug.

### Removed
- Fitur yang dihapus.
```

### Aturan:
- Gunakan bahasa Indonesia untuk deskripsi perubahan (kecuali istilah teknis).
- Sertakan tanggal perubahan dalam format `YYYY-MM-DD`.
- Gunakan label: `Added`, `Changed`, `Fixed`, `Removed`, `Security`.
- Untuk perubahan yang belum dirilis, gunakan header `[Unreleased]`.
