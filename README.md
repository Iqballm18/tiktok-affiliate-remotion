# 🎬 TikTok Affiliate Remotion Studio

Pipeline otomasi video editorial motion untuk TikTok Affiliate berbasis **Remotion 4.0**, **Node.js**, dan **Whisper AI**. Menghasilkan 2 variasi video A/B testing siap tayang dengan subtitle karaoke sinkron kata-per-kata tanpa tampilan AI-slop.

---

## ⚡ Panduan Mulai Cepat (5 Langkah)

### 1. Periksa Kesiapan Sistem
Jalankan diagnosa kesehatan sistem untuk memastikan Node.js, FFmpeg, yt-dlp, dan model Whisper telah siap:
```bash
npm run doctor
```

### 2. Jalankan Web Studio Dashboard
Buka antarmuka visual Web Studio:
```bash
npm run web
```
Akses dashboard di browser: **[http://localhost:3100](http://localhost:3100)**  
*(Port 3000 bebas untuk Remotion Studio visual editor: `npm run dev`)*.

Fitur Web Studio:
- **Studio Produksi**: Kustomisasi judul output video langsung di web, pilih file video & voiceover dari dropdown/unggah langsung, atur timeline klip, dan live monitor render realtime.
- **Koreksi Subtitle Whisper**: Dengarkan audio sinkron, satukan kata yang terpotong dengan tombol **[🔗 Gabung Bawah]**, pisahkan kata (**[✂ Pisah]**), atau hapus kata (**[✕ Hapus]**).
- **Galeri Output**: Tinjau hasil video langsung di phone player 9:16 atau unduh MP4.

### 3. Generate Naskah & JSON via Google Gemini
Unggah video produk mentah ke Google Gemini dengan instruksi master prompt di **[`docs/prompt-gemini.md`](docs/prompt-gemini.md)**. Gemini akan menghasilkan:
* Naskah Voiceover ElevenLabs (v1 & v2)
* Rekomendasi Caption TikTok & Hashtag
* Format JSON Data Produk (hanya copywriting dan timestamp klip — nama file video dan voiceover bebas ditentukan di Web Studio!)

### 4. Simpan Audio Voiceover
Salin naskah dari Gemini ke ElevenLabs, lalu unduh audio ke folder `public/`:
* `public/voiceover_v1.mp3`
* `public/voiceover_v2.mp3`
*(Bisa juga langsung ditarik ke area dropzone Web Studio)*.

### 5. Import JSON, Atur Nama Output & Mulai Render
Di Web Studio:
1. Klik **Import JSON Gemini**, tempel JSON, lalu klik **Terapkan ke Studio**.
2. Masukkan judul render pada **Nama Video Output** (misal: `Labore Barrier Revive Cream`).
3. Pilih file video produk dan audio voiceover dari dropdown.
4. Periksa kata di tab **Koreksi Subtitle Whisper** jika ada kata yang perlu digabung (misal "kera" + "njang" → "keranjang").
5. Klik **Lihat Frame** untuk pratinjau tampilan visual seketika (~2 detik).
6. Klik **Mulai Render Video**. Hasil render akan tersimpan di folder `out/<Nama Video Output> v1.mp4`.

---

## 💻 Eksekusi Render via Terminal CLI

Anda juga dapat merender langsung dari command line tanpa membuka web:

```bash
# Render Variasi 1 saja
node render.mjs blackmores v1

# Render Variasi 2 saja
node render.mjs blackmores v2

# Render kedua variasi (v1 dan v2)
node render.mjs blackmores all

# Render mode cepat 30fps
node render.mjs blackmores all --fps=30

# Render frame gambar tunggal (pratinjau cepat)
node render.mjs blackmores v1 --still --frame=60

# Render massal semua produk di folder products/
node render.mjs --batch
```

---

## 📁 Struktur Data Produk (`products/*.json`)

Setiap produk disimpan sebagai satu file JSON independen di folder `products/`, memisahkan data teks dan visual dari skrip eksekusi.

Contoh konfigurasi produk (`products/blackmores.json`):
```json
{
  "id": "blackmores",
  "name": "Blackmores Pregnancy & Breast-Feeding Gold",
  "videoSource": "blackmores.mp4",
  "variants": {
    "v1": {
      "preset": "skincare",
      "voiceOver": "voiceover_v1.mp3",
      "badgeText": "BLACKMORES PREGNANCY",
      "hookLine1": "Lagi cari vitamin bumil busui?",
      "hookHighlight": "Penuhi Nutrisi Lengkap Si Kecil!",
      "demoLine1": "Minyak Ikan Tidak Berbau Amis",
      "demoHighlight": "Kapsul Lembut Nyaman Ditelan",
      "specLine1": "Kaya Asam Folat Kalsium DHA",
      "specHighlight": "Terdaftar Resmi Kalbe Dan Halal",
      "ctaText": "Cek Promo di Keranjang Kuning",
      "clips": [
        { "src": "blackmores.mp4", "startSec": 2, "endSec": 8 },
        { "src": "blackmores.mp4", "startSec": 98, "endSec": 106 },
        { "src": "blackmores.mp4", "startSec": 26, "endSec": 34 },
        { "src": "blackmores.mp4", "startSec": 108, "endSec": 114 }
      ]
    }
  }
}
```

### Field desain & opsional

| Field | Keterangan |
| --- | --- |
| `preset` | `skincare`, `gadget`, `flash_sale`, atau `lifestyle`. Mengisi `themeStyle`, `cardStyle`, `badgeStyle` yang kosong. |
| `themeStyle`, `cardStyle`, `badgeStyle` | Opsional. Jika diisi, menimpa preset. `badgeStyle`: `sticker`, `alert`, `marker`, `glass`. |
| `ctaLabel` | Label kecil di atas teks CTA (mis. `PROMO 11.11`). Kosong = tidak tampil. |
| `urgencyTag` | Tag di strip `top_banner_promo` (mis. `STOK TERBATAS`). Kosong = tidak tampil. |

Isi `ctaLabel` dan `urgencyTag` hanya jika klaimnya benar. Klaim promo atau stok terbatas yang palsu bisa melanggar kebijakan iklan TikTok.

Untuk A/B test badge, beri v1 dan v2 `badgeStyle` berbeda dengan `cardStyle` yang sama. Gaya `top_banner_promo` tidak memakai badge.

Untuk draf cepat, render dengan `npm run render:fast` (30 fps).

---

## 📖 Dokumentasi Lanjutan

* **[`docs/prompt-gemini.md`](docs/prompt-gemini.md)**: Master prompt Gemini untuk generate naskah ElevenLabs & JSON produk otomatis.
* **[`docs/sfx-transitions.md`](docs/sfx-transitions.md)**: Katalog 8 transisi (`hookTransition` / `clipTransition`), 8 SFX baru, dan SFX khas per layout kartu.
* **[`docs/architecture.md`](docs/architecture.md)**: Arsitektur 5-Layer Stack, Auto-Fit Duration, dan alur subtitle karaoke Whisper AI.
* **[`config.json`](config.json)**: Konfigurasi global (watermark default, port web studio, FPS default).
