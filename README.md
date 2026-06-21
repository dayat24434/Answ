# Answ — AI Answer Solver

Ekstensi Chrome untuk memindai soal dan mendapatkan jawaban instan dari Google Gemini AI.

## Fitur

- **Seleksi Area Soal** — Pilih area soal di halaman web dengan drag mouse
- **Jawaban Instan** — Dapatkan jawaban langsung dari AI tanpa perlu mengetik ulang soal
- **Multi API Key** — Tambahkan banyak API key tanpa batasan; otomatis dirotasi jika ada yang sibuk/gagal
- **Stealth Mode** — UI jawaban minimalis, draggable, dan auto-close saat klik di luar
- **LaTeX Rendering** — Mendukung notasi matematika: pecahan, akar, binomial, simbol Yunani, dll
- **Dark Mode** — Otomatis menyesuaikan tema gelap/terang sistem
- **Shortcut Keyboard** — `Alt+X` untuk memulai seleksi, `Esc` untuk batal/tutup

## Cara Install

1. Buka `chrome://extensions` di Google Chrome
2. Aktifkan **Developer Mode** (pojok kanan atas)
3. Klik **Load Unpacked**
4. Pilih folder proyek ini

## Cara Mendapatkan API Key

1. Buka [Google AI Studio](https://aistudio.google.com/)
2. Klik **Get API Key** di sidebar kiri
3. Klik **Create API Key** (pilih project Google Cloud atau buat baru)
4. Salin API key yang muncul

## Cara Penggunaan

1. **Klik ikon ekstensi** Answ di toolbar Chrome
2. **Masukkan API key** di kolom yang tersedia (satu per baris, bisa banyak)
3. Klik **Simpan**
4. Klik **Mulai Seleksi**
5. **Drag mouse** pada area soal yang ingin dijawab
6. Jawaban akan muncul di kotap floating yang bisa digeser

Alternatif: Tekan `Alt+X` di halaman web mana pun untuk memulai seleksi langsung.

## Struktur File

```
├── manifest.json          # Konfigurasi ekstensi
├── background.js          # Service Worker (capture, crop, API call, message handler)
├── popup.html             # Popup UI input & manajemen API key
├── popup.js               # Logic popup
├── content_script.js      # Content script (seleksi, rendering jawaban, LaTeX)
├── content.css            # Style tambahan
├── project.md             # Dokumentasi teknis proyek
├── CHANGELOG.md           # Riwayat perubahan
├── README.md              # Dokumentasi ini
└── .gitignore             # Ignore config & sensitive files
```

## Persyaratan

- Google Chrome versi terbaru (Manifest V3)
- Koneksi internet
- API key Google Gemini

## Lisensi

Proyek ini bersifat pribadi/internal.

---

> Dokumentasi teknis lebih lengkap: [`project.md`](project.md)
