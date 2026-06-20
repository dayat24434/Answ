# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-20

### Added
- Popup UI untuk input dan simpan API Key sendiri
- Tombol "Start Selection" di popup sebagai alternatif trigger
- Error handling menampilkan pesan error asli dari Gemini API

### Changed
- Endpoint API: `v1beta/gemini-1.5-flash` → `v1/gemini-2.0-flash`
- Trigger klik ikon: dari `action.onClicked` → popup dengan tombol
- Struktur file: tambah `popup.html` dan `popup.js`

## [0.1.0] - 2026-06-20

### Added
- Inisiasi proyek ekstensi Chrome Manifest V3
- Struktur file dasar: `manifest.json`, `background.js`, `content_script.js`, `content.css`
- Area seleksi dengan overlay transparan (shortcut Alt+X, mouse drag)
- Pemotongan gambar via Canvas API di Service Worker
- Integrasi Google Gemini API
- UI jawaban glassmorphism dengan fitur draggable
- Auto-close jawaban saat klik di luar area
