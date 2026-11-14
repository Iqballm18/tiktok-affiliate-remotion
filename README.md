# 🎬 TikTok & Instagram Reels Affiliate Remotion Studio

Pipeline otomasi video editorial motion untuk **TikTok Shop** & **Instagram Reels Affiliate** berbasis **Remotion 4.0**, **Node.js**, dan **Whisper AI**. Menghasilkan 2 variasi video A/B testing siap tayang dengan subtitle karaoke sinkron kata-per-kata, penunjuk keranjang belanja multi-platform, cover studio 9:16, dan bebas dari tampilan AI-slop.

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
*(Port 3000 bebas untuk editor visual Remotion Studio: `npm run dev`)*.

**Fitur Web Studio:**
- **Studio Produksi**: Kustomisasi judul output, pilih video mentah & voiceover dari dropdown (auto-sync realtime tanpa perlu refresh browser), pilih platform target (TikTok, Reels, atau Both), atur timeline klip, dan monitor render realtime.
- **Koreksi Subtitle Whisper**: Dengarkan audio sinkron, satukan kata yang terpotong dengan tombol **[🔗 Gabung Bawah]**, pisahkan kata (**[✂ Pisah]**), atau hapus kata (**[✕ Hapus]**).
- **Cover Studio**: Buat thumbnail/cover video beresolusi tinggi (1080x1920) dengan safe zone grid profil IG (4:5) & TikTok (3:4) serta 3 pilihan template visual (`hook_card`, `big_headline`, `promo_split`).
- **Galeri Output**: Tinjau hasil video langsung di phone player 9:16, unduh file MP4, atau unduh cover JPG.

### 3. Generate Naskah & JSON via Google Gemini
Unggah video produk mentah ke Google Gemini dengan instruksi master prompt di **[`docs/prompt-gemini.md`](docs/prompt-gemini.md)**. Gemini akan menghasilkan:
* Naskah Voiceover ElevenLabs (v1 & v2)
* Rekomendasi Caption TikTok / Instagram Reels & Hashtag
* Format JSON Data Produk lengkap (copywriting, timestamp klip, layout kartu, dan subtitle)

### 4. Simpan Audio Voiceover
Salin naskah dari Gemini ke ElevenLabs, lalu unduh audio ke folder `public/`:
* `public/voiceover_v1.mp3`
* `public/voiceover_v2.mp3`  
*(Bisa juga langsung ditarik ke area dropzone Web Studio)*.

### 5. Import JSON, Atur Platform & Mulai Render
Di Web Studio:
1. Klik **Import JSON Gemini**, tempel JSON, lalu klik **Terapkan ke Studio**.
2. Masukkan judul render pada **Nama Video Output** (misal: `Harpic Power Plus 10x 200ml`).
3. Tentukan target platform: **TikTok**, **Instagram Reels**, atau **Keduanya (Dual-Platform)**.
4. Pilih file video produk dan audio voiceover dari dropdown.
5. Periksa kata di tab **Koreksi Subtitle Whisper**.
6. Klik **Lihat Frame** untuk pratinjau tampilan visual seketika (~2 detik).
7. Klik **Mulai Render Video**. Hasil render akan tersimpan di folder `out/`.

---

## 🎯 Render Multi-Platform (TikTok & Instagram Reels)

Studio ini mendukung rendering terpisah atau simultan untuk kedua platform affiliate utama:

| Target Platform | Tampilan Penunjuk Keranjang (CTA) | Suffix File Output |
| :--- | :--- | :--- |
| **TikTok** | Ikon Keranjang Kuning + `"KERANJANG KUNING DI SINI"` + Tag `TIKTOK` | `<Nama> v1 (TikTok).mp4` |
| **Instagram Reels** | Ikon Tas Belanja + `"KERANJANG BELANJA DI SINI"` + Tag `REELS` | `<Nama> v1 (Reels).mp4` |
| **Both (Dual)** | Merender 2 video sekaligus dengan penunjuk keranjang masing-masing | *(2 file terpisah di atas)* |
| **Universal** | Ikon Tas/Keranjang + `"CEK KERANJANG DI SINI"` + Tag `TIKTOK · REELS` | `<Nama> v1 (Multi-Platform).mp4` |

> [!NOTE]
> Instagram Reels sekarang sudah mendukung keranjang belanja langsung di video, sehingga tidak perlu lagi mencantumkan instruksi manual "link bio". Penunjuk keranjang Reels otomatis mengarahkan penonton ke pojok kiri-bawah video.

---

## 💻 Eksekusi Render via Terminal CLI

Anda juga dapat merender langsung dari command line tanpa membuka antarmuka web:

```bash
# Render Variasi 1 untuk TikTok saja
node render.mjs harpic-power-plus-10x-200ml v1 --platform=tiktok

# Render Variasi 1 untuk Instagram Reels saja
node render.mjs harpic-power-plus-10x-200ml v1 --platform=instagram

# Render DUAL PLATFORM (menghasilkan 2 file video: TikTok dan Reels sekaligus)
node render.mjs harpic-power-plus-10x-200ml v1 --platform=both

# Render semua variasi (v1 & v2) multi-platform
node render.mjs harpic-power-plus-10x-200ml all --platform=both

# Render mode draf cepat 30fps
node render.mjs harpic-power-plus-10x-200ml v1 --fps=30

# Render still frame tunggal (pratinjau cepat visual tanpa encode video penuh)
node render.mjs harpic-power-plus-10x-200ml v1 --still --frame=450

# Render cover/thumbnail 1080x1920
node render.mjs harpic-power-plus-10x-200ml v1 --cover

# Render massal semua produk di folder products/ untuk kedua platform
node render.mjs --batch --platform=both
```

---

## 🖼️ Fitur Cover Studio

Setiap varian video dapat dibuatkan thumbnail mandiri (1080x1920) dengan kualitas tinggi tanpa transisi, subtitle karaoke, maupun progress bar yang mengganggu:

* **3 Template Cover Visual**:
  * `hook_card`: Kartu hook video dirender statis di atas footage produk.
  * `big_headline`: Tipografi tebal mencolok dengan headline besar.
  * `promo_split`: Format kartu promosi terbagi dengan badge diskon.
* **Zona Aman Grid Profil**:
  * Instagram Reels 4:5 (`y: 285 - 1635`)
  * TikTok 3:4 (`y: 240 - 1680`)
  * Teks penting dan badge otomatis dijaga agar tetap terbaca jelas saat tampil di grid profil.

---

## 🛡️ Watermark Multi-Platform Bebas Tabrakan

Floating watermark (`@handle` TikTok dan Instagram) dirancang khusus dengan koridor gerak steril:
* **Area Headline Card (Atas):** `y: 190 - 650` *(steril)*
* **Area Subtitle Karaoke & CTA (Bawah):** `y > 1050` *(steril)*

---

## ✨ Fitur Produksi & Otomasi Terbaru

* **Sub-Segment Unmute & Auto-Ducking Cerdas:** Aktifkan suara asli video hanya pada jendela detik aksi tertentu (`unmuteStartSec` – `unmuteEndSec`) tanpa pustaka SFX buatan, serta pengecilan volume otomatis (`autoDucking`) saat VoiceOver berbicara.
* **Mode Before vs After Split-Screen:** Perbandingan visual `slider_lr` (geser kiri-kanan) atau `split_tb` (atas-bawah) pada babak pilihan langsung dari Storyboard.
* **Floating Social Proof Badge:** Pill badge kepercayaan (`socialProofText`, mis. `⭐ 4.9 • 10rb+ Terjual`) di Babak 3 & 4 pada zona aman tanpa menabrak headline maupun watermark.
* **Visual Video Trimmer:** Set detik Mulai, Selesai, serta Unmute Mulai/Selesai langsung dari playhead video di Web Studio.
* **Auto-Cleanup Temp Remotion:** Pembersihan otomatis folder temp `remotion-webpack-bundle-*` saat startup, rebuild bundle, maupun tombol **Bersihkan Temp** di header.
* **Sinkronisasi Caption & Riwayat Upload Drive:** Setiap upload ke Google Drive otomatis menyertakan file pendamping `-caption.txt` dan menyimpan status upload permanen di `config/upload-history.json`.
* **Safe Zone Asimetris, Segmented Progress Bar & Blur Backdrop:** Margin kanan bebas sidebar UI TikTok/Reels (`right: 170`), kartu CTA tanpa panah ganda yang mengikuti palet video, progress bar 4 segmen per babak, opsi `blur_backdrop` untuk klip 16:9, opsi `productHeadlineMaxSec` auto-hide kartu Demo/Spec, serta panduan Safe Zone & grid crop 4:5 Instagram / TikTok.
* **Koridor Watermark:** Bergantian secara dinamis di rentang **`y: 760 s/d 920`**.
* Dilengkapi ikon vektor resmi TikTok dan Instagram dengan efek floating/drifting halus.

---

## 📁 Struktur Data Produk (`products/*.json`)

Setiap produk disimpan sebagai satu file JSON independen di folder `products/`:

```json
{
  "id": "harpic-power-plus-10x-200ml",
  "name": "Harpic Power Plus 10X Advanced Original 200ml",
  "videoSource": "products/harpic-power-plus-10x-200ml/Harpic.mov",
  "variants": {
    "v1": {
      "title": "Problem-Solution & Social Proof",
      "palette": "tech_blue",
      "cardStyle": "sticky_note",
      "hookVariant": "v2",
      "captionStyle": "highlighter_bar",
      "ctaPlatform": "both",
      "badgeText": "Ibu-ibu wajib tau",
      "hookLine1": "Kloset kuning & berkerak parah?",
      "hookHighlight": "Jangan disikat capek-capek!",
      "demoBadge": "Corong leher angsa",
      "demoLine1": "Corong leher angsa jangkau sela",
      "demoHighlight": "Kerak dan kuman rontok seketika!",
      "specBadge": "Aman di porselen",
      "specLine1": "Aman porselen gak bikin rusak",
      "specHighlight": "Basmi 99% kuman membandel!",
      "ctaText": "Lagi promo diskon, langsung cek yuk!",
      "clips": [
        { "startSec": 30, "endSec": 36, "src": "products/harpic-power-plus-10x-200ml/Harpic.mov" },
        { "startSec": 0, "endSec": 7, "src": "products/harpic-power-plus-10x-200ml/Harpic.mov" },
        { "startSec": 10, "endSec": 17, "src": "products/harpic-power-plus-10x-200ml/Harpic.mov" },
        { "startSec": 38, "endSec": 44, "src": "products/harpic-power-plus-10x-200ml/Harpic.mov" }
      ],
      "voiceOver": "products/harpic-power-plus-10x-200ml/harpic_v1.mp3",
      "watermarkText": "@inanikma_ | @spillbyna_",
      "watermarkPosition": "floating",
      "coverTemplate": "hook_card"
    }
  }
}
```

### Parameter Konfigurasi Desain

| Parameter | Pilihan Nilai | Keterangan |
| :--- | :--- | :--- |
| `cardStyle` / `hookStyle` | `sticky_note`, `receipt`, `chat_thread`, `type_stack`, `label_tape`, `quiet_serif` | Layout kartu hook & headline editorial |
| `hookVariant` | `v1`, `v2`, `v3` | Varian gerak/animasi per kartu |
| `captionStyle` / `subtitleStyle` | `highlighter_bar`, `pop_scale`, `pill_bounce`, `marker_sweep`, `minimal_clean`, `outline_pop` | Gaya animasi subtitle karaoke sinkron kata |
| `palette` | `tech_blue`, `sale_yellow`, `beauty_rose`, `eco_green`, `editorial`, `luxury_dark`, dll. | Palet warna harmonis video |
| `ctaPlatform` | `tiktok`, `instagram`, `both`, `universal` | Penyesuaian ikon, badge, dan teks CTA penunjuk keranjang |
| `watermarkPosition` | `floating`, `top_left`, `top_right`, `mid_left`, `mid_right` | Mode posisi watermark akun media sosial |
| `coverTemplate` | `hook_card`, `big_headline`, `promo_split` | Template visual untuk cover thumbnail 1080x1920 |
| `clips[].muted` | `true`, `false` | Buka suara rekaman video asli (`false`) untuk momen semprotan / buka tutup ASMR |
| `clips[].volume` | `0.1` - `1.0` | Pengatur volume suara asli rekaman (default `0.8` saat aktif) |

---

## 🚀 Fitur Unggulan Sistem

1. **Auto-Trim Dead Air Cerdas**: Memangkas jeda hening berlebih di akhir video dengan sisa jeda napas yang pas (~1.4s s/d 2.3s) agar transisi ke ending tidak patah.
2. **Auto-Sync File System**: Web dashboard otomatis mendeteksi penambahan atau penghapusan file di `public/` tanpa perlu me-refresh tab browser.
3. **Web-Themed CTA Pointer**: Desain badge penunjuk keranjang belanja memakai token tema web (`#131312` ground, `#3b3b36` border, `#ece8de` text, `#f2a93b` amber signal block) dengan panah SVG diagonal `↙` yang presisi.
4. **Natural Audio / ASMR Unmute**: Fitur unmute selektif per klip untuk mempertahankan suara rekaman asli video (semprotan botol, buka tutup kemasan, klik pengunci) yang di-mix otomatis dengan voiceover AI dan fade-in/fade-out halus.
5. **Akselerasi GPU Hardware**: Chromium headless memanfaatkan ANGLE Direct3D 11 untuk layer compositing, blur, dan efek transisi cepat.

---

## 📖 Dokumentasi Terkait

* **[`docs/prompt-gemini.md`](docs/prompt-gemini.md)**: Master prompt Gemini untuk naskah ElevenLabs & format JSON otomatis.
* **[`docs/sfx-transitions.md`](docs/sfx-transitions.md)**: Katalog 8 transisi video dan kumpulan SFX bawaan.
* **[`docs/architecture.md`](docs/architecture.md)**: Arsitektur 5-Layer Stack, sinkronisasi Whisper AI kata-per-kata.
* **[`config.json`](config.json)**: Pengaturan global (akselerasi GPU, watermark default, port Web Studio).
