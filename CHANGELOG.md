# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-06-21

### Added
- Tombol "Cek Semua" — validasi semua API key sekaligus secara sequential (cegah rate limit)
- Tombol "Hapus Semua" — hapus seluruh API key tersimpan dengan konfirmasi dialog
- Summary toast setelah "Cek Semua": menampilkan jumlah valid/invalid dari total key
- Real-time status update: dot status berubah satu per satu saat "Cek Semua" berjalan

### Changed
- Popup UI: card-label "Key Tersimpan" jadi flexbox dengan tombol batch di samping kanan
- Show/hide tombol batch (Cek Semua / Hapus Semua): muncul hanya saat ada key, sembunyi saat kosong

### Fixed
- `keyStatuses` di-reset saat semua key dihapus (mencegah stale entries)

## [0.7.0] - 2026-06-21

### Added
- Popup UI didesain ulang dengan layout card-based, gradient header, dan spacing lebih rapi
- Status bar dengan dot indikator (hijau = ada key / merah = belum ada key)
- Key list dengan dot status: idle (abu), checking (kuning berkedip), valid (hijau), invalid (merah)
- Empty state dengan ikon gembok saat belum ada API key tersimpan
- Animasi pulse pada dot status "checking"
- Shortcut `Ctrl+Enter` untuk menyimpan API key dari textarea

### Changed
- Popup UI redesign total: layout card-based dengan shadow ringan, border-radius 12px
- Status key: dari text icon (✓/✗/◐) → dot lingkaran dengan warna dan animasi
- Tombol "Mulai Seleksi": warna hijau solid lebih menonjol dengan hover/active state
- Tombol hapus: background merah ringan (`#fef2f2`) lebih soft
- Event handler key list: dari `querySelector` langsung → `data-action` attribute delegation
- Font key list: monospace (`SF Mono`, `Fira Code`) untuk konsistensi
- Textarea API key: border fokus dengan shadow indigo, placeholder lebih jelas
- Warna background popup: abu-abu terang (`#f1f5f9`) dengan card putih

### Removed
- Ikon ekstensi seluruhnya — `icons/` directory dihapus, referensi `default_icon` & `icons` di manifest.json dihapus (Chrome auto-generate dari inisial "A")
- File `icons/icon-*.webp` (16/48/128px — tidak lagi diperlukan)

## [0.6.0] - 2026-06-21

### Added
- API key check: tombol "Cek" per key, status indicator (✓/✗/◐), validasi via Gemini API
- Ikon WebP (16/48/128px) dari `icon.jpeg` — 48-71% lebih kecil dari JPEG
- File `project.md` sebagai dokumentasi teknis proyek (rename dari `blueprint.md`)

### Changed
- Ikon ekstensi: SVG → WebP (berdasarkan `icon.jpeg`, kompresi quality 50)
- Ikon ekstensi: JPEG → WebP (format lebih ringan, loading lebih cepat)
- Background.js: filter placeholder key di fallback `api.json`, tambah handler `CHECK_API_KEY`
- Background.js: `keysInUse.clear()` saat `UPDATE_KEYS` agar stale entry tidak numpuk
- Popup.js: render status icon per key, hapus variabel `removed` yang tak terpakai

### Removed
- File `scripts/` (generate-icons.js, resize-icon.js, convert-icon-format.js)
- File `package.json` & `package-lock.json` (tidak diperlukan untuk extension)
- File `icons/icon.jpeg` (source 467KB — sudah digantikan WebP)
- File `api.json` (sudah tidak digunakan, storage via chrome.storage)
- File `blueprint.md` (rename ke `project.md`)

## [0.5.0] - 2026-06-21

### Added
- Popup UI untuk input dan manajemen API key (`popup.html`, `popup.js`)
- Simpan/load API key via `chrome.storage.local` (tidak perlu edit file)
- Tampilan daftar key tersimpan dengan tombol hapus
- Integrasi multi API key tanpa batasan jumlah
- Tombol "Mulai Seleksi" di popup
- Ikon ekstensi (SVG) untuk 16px, 48px, 128px
- `README.md` dengan dokumentasi lengkap
- File `api.json` sebagai template fallback

### Changed
- Background: load API key dari `chrome.storage.local` (bukan `fetch(api.json)`)
- Manifest: version → 0.5.0, tambah `default_popup` dan `icons`
- Service worker: handle pesan `GET_KEYS`, `UPDATE_KEYS`, `START_SELECTION` dari popup
- Fallback ke `api.json` jika storage kosong (backward compatibility)

### Removed
- `chrome.action.onClicked` listener (digantikan oleh popup)

## [0.4.0] - 2026-06-20

### Changed
- Background kotak jawaban dari efek glassmorphism (blur/transparan) menjadi putih solid (`#ffffff`)
- Warna font pada kotak jawaban menjadi hitam (`#000000`)
- Hapus `box-shadow` dan `backdrop-filter` pada kotak jawaban
- Border kotak jawaban menyesuaikan tema gelap/terang (light/dark mode)

## [0.3.0] - 2026-06-20

### Added
- Fitur `Escape` untuk cancel seleksi overlay dan tutup kotak jawaban
- Background auto-adaptasi tema sistem (gelap/terang) via `prefers-color-scheme`
- Render notasi LaTeX native: `\\frac`, `\\sqrt`, `\\binom`, simbol Yunani, operator matematika, superskrip/subskrip, panah
- Inject content script otomatis jika halaman belum di-refresh (via `chrome.scripting.executeScript`)
- Konfigurasi API key dari file `api.json` (bisa diedit kapan saja tanpa reload ekstensi)

### Changed
- Hapus popup HTML/JS — klik ikon ekstensi langsung memulai seleksi
- Hapus loading indicator "Memproses..."
- Hapus efek blur/glassmorphism, background solid mengikuti tema
- Model Gemini: `gemini-1.5-flash` → `gemini-2.5-flash`
- Endpoint API: `v1beta` → `v1` (stable)

### Removed
- Popup HTML/JS (`popup.html`, `popup.js`) — tidak perlu konfigurasi manual
- Ketergantungan `chrome.storage` untuk penyimpanan API key

## [0.2.0] - 2026-06-20

### Added
- Popup UI untuk input dan simpan API Key sendiri (`popup.html`, `popup.js`)
- Tombol "Start Selection" di popup sebagai alternatif trigger (selain Alt+X)
- Error handling yang menampilkan pesan error asli dari Gemini API

### Changed
- Endpoint API: `v1beta/gemini-1.5-flash` → `v1/gemini-2.0-flash`
- Trigger klik ikon ekstensi: dari `action.onClicked` → popup dengan tombol
- Struktur file: tambah `popup.html` dan `popup.js`

## [0.1.0] - 2026-06-20

### Added
- Inisiasi proyek ekstensi Chrome Manifest V3
- Struktur file dasar: `manifest.json`, `background.js`, `content_script.js`, `content.css`
- Area seleksi dengan overlay transparan (shortcut Alt+X, mouse drag)
- Border seleksi dashed hijau (`#00ff88`) dengan background transparan
- Validasi area minimum seleksi (10px × 10px)
- Pemotongan gambar via Canvas API di Service Worker
- Integrasi Google Gemini API (`gemini-1.5-flash`, endpoint `v1beta`)
- UI jawaban dengan efek glassmorphism (blur, transparan, border tipis)
- Fitur draggable pada kotak jawaban (JavaScript murni)
- Auto-close jawaban saat klik di luar area kotak
- Dokumentasi: `blueprint.md`, `CHANGELOG.md`, `.gitignore`
