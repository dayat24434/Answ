content = """# Blueprint Pengembangan Ekstensi Google Chrome: Stealth AI Quiz Solver (Gemini API)

Dokumen ini berfungsi sebagai panduan teknis, rencana kerja, dan standar operasional untuk tim engineer dalam membangun ekstensi Chrome pemindai soal berbasis AI dengan tampilan transparan (stealth mode).

---

## 🗺️ 1. Mapping Arsitektur & Alur Data (Manifest V3)

Ekstensi ini dibangun menggunakan arsitektur Google Chrome Extensions Manifest V3. Komponen utamanya terbagi menjadi tiga: `Content Script`, `Background Script (Service Worker)`, dan `Gemini API`.

### Komponen Utama:
1. **Content Script (`content_script.js` & `content.css`)**:
   - Berjalan di konteks halaman web yang sedang aktif.
   - Mendengarkan shortcut keyboard (`Alt + X`).
   - Menangani UI seleksi (klik & seret kursor) untuk menentukan area soal.
   - Menyuntikkan (*injecting*) komponen UI jawaban dengan gaya transparan (*glassmorphism*).
   - Mengatur fitur agar UI jawaban dapat digeser (*draggable*).

2. **Background Script (`background.js` - Service Worker)**:
   - Berjalan di latar belakang browser, tidak memiliki akses langsung ke DOM halaman web.
   - Menerima pesan koordinat seleksi dari Content Script.
   - Mengambil tangkapan layar menggunakan API `chrome.tabs.captureVisibleTab`.
   - Memotong gambar (*cropping*) sesuai koordinat menggunakan Canvas API dan mengubahnya menjadi format *Base64 string*.
   - Melakukan panggilan API (*fetch request*) ke Google Gemini API secara aman.

3. **Gemini API (Google AI Studio)**:
   - Menerima payload berupa gambar Base64 dan prompt instruksi teks.
   - Memproses gambar menggunakan model multimodal (misalnya, `gemini-1.5-flash`).
   - Mengembalikan jawaban teks ke Background Script.

### Alur Data Sekilas (Flowchart Teks):
`[User Shortcut]` -> **Content Script** (Capture Area) -> *Send Message (Coordinates)* -> **Background Script** (Capture & Crop Image) -> *Fetch API* -> **Gemini Server** -> **Background Script** (Receive Response) -> *Send Message (Answer)* -> **Content Script** (Render Stealth UI).

---

## 📋 2. Rencana Kerja Pengerjaan (Development Plan)

### Fase 1: Inisiasi Proyek & Struktur Dasar (Setup)
- [ ] Membuat direktori proyek dan menginisialisasi Git repository.
- [ ] Menyusun `manifest.json` (Manifest V3) dengan deklarasi perizinan:
  - `activeTab`
  - `scripting`
  - `captureVisibleTab`
  - `storage`
- [ ] Membuat file kosong: `background.js`, `content_script.js`, `content.css`, dan `CHANGELOG.md`.
- [ ] Memuat ekstensi ke Google Chrome melalui `chrome://extensions` (Developer Mode -> Load Unpacked).

### Fase 2: Implementasi Area Seleksi (Screencapture UI)
- [ ] Menambahkan *event listener* global untuk shortcut keyboard (`Alt + X`) pada `content_script.js`.
- [ ] Membuat *overlay canvas* transparan penuh layar saat shortcut ditekan untuk membekukan interaksi halaman asli.
- [ ] Mengimplementasikan logika *mouse events* (`mousedown`, `mousemove`, `mouseup`) untuk menggambar kotak seleksi visual di layar.
- [ ] Menyimpan koordinat awal dan akhir (X, Y, Width, Height) saat *mouse up*.

### Fase 3: Logika Pemotongan Gambar & Message Passing
- [ ] Implementasi `chrome.runtime.sendMessage` untuk mengirim data koordinat dari Content Script ke Background Script.
- [ ] Di `background.js`, tangkap layar penuh menggunakan `chrome.tabs.captureVisibleTab(null, {format: 'png'})`.
- [ ] Gunakan fungsi Canvas untuk memuat gambar penuh dan memotongnya berdasarkan koordinat seleksi.
- [ ] Konversikan hasil potongan gambar menjadi format data URL Base64.

### Fase 4: Integrasi Google Gemini API
- [ ] Menyusun fungsi asynchronous `fetchGeminiAnswer(base64Image)` di dalam `background.js`.
- [ ] Menggunakan endpoint resmi Gemini API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AQ.Ab8RN6KIXXyyFBzPnt0VI5JkTGa1yzbkxShlWYUa1dp-AQUa0A`).
- [ ] Mengonstruksi JSON payload dengan format multimodal yang tepat (menyertakan objek `inlineData` untuk gambar Base64 dan `text` untuk sistem prompt).
- [ ] Menambahkan sistem prompt internal (System Instruction), misal: *"Kamu adalah asisten ujian virtual. Jawablah soal pada gambar ini secara instan, singkat, padat, dan langsung ke inti jawaban/opsi yang benar tanpa bertele-tele."*
- [ ] Mengirimkan teks respons kembali ke Content Script melalui callback message passing.

### Fase 5: UI/UX Stealth & Optimalisasi Interaksi
- [ ] Merancang kotak tampilan jawaban di `content.css` dengan tema *Glassmorphism*:
  - `background: rgba(255, 255, 255, 0.25);`
  - `backdrop-filter: blur(8px);`
  - `border: 1px solid rgba(255, 255, 255, 0.18);`
  - `box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);`
- [ ] Mengimplementasikan fitur *Draggable* pada kotak jawaban menggunakan JavaScript murni agar user bisa menggeser kotak jika menghalangi soal lain.
- [ ] Menambahkan fungsi otomatis menutup kotak jika pengguna melakukan klik di luar area kotak jawaban.
- [ ] Mengamankan API Key dengan memastikannya hanya berada di scope service worker (`background.js`), atau menyediakan halaman `options.html` opsional agar pengguna bisa memasukkan API key mereka sendiri (disimpan di `chrome.storage.local`).

---

## 🔑 3. Kebutuhan Eksternal & Konfigurasi (Prerequisites)

1. **Gemini API Key**:
   - Didapatkan secara mandiri melalui Google AI Studio ([aistudio.google.com](https://aistudio.google.com/)).
   - Untuk tahap pengembangan, simpan di dalam `chrome.storage.local` melalui konsol, atau deklarasikan di variabel internal `background.js` (pastikan masuk ke `.gitignore` sebelum dipublikasikan).
2. **Google Chrome Versi Terbaru**:
   - Diperlukan dukungan Manifest V3 yang stabil dan fitur penangkapan tab yang optimal.
3. **Node.js & Bundler (Opsional)**:
   - Disarankan menggunakan Vanilla JS (JavaScript murni) terlebih dahulu untuk mempermudah proses debugging ekstensi tanpa tahapan build yang rumit.

---

## 📝 4. Aturan Penulisan Sejarah Perubahan (Changelog Guidelines)

Setiap engineer **WAJIB** memperbarui file `CHANGELOG.md` setiap kali melakukan perubahan signifikan pada repositori. Format yang digunakan mengacu pada standar *Keep a Changelog* dengan penomoran versi *Semantic Versioning* (MAJOR.MINOR.PATCH).

### Contoh Format Penulisan di `CHANGELOG.md`: