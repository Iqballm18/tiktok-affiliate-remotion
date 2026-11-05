# ARSITEKTUR TIKTOK AFFILIATE REMOTION ENGINE

Arsitektur sistem motion video otomatis berbasis Remotion 4.0 dan Node.js, dirancang untuk memproduksi video TikTok Affiliate berestetika editorial tinggi tanpa tampilan AI-slop.

---

## 🏗️ Struktur 5-Layer Composition (`AffiliateVideo.tsx`)

Setiap video dirender dengan tumpukan 5 lapisan dinamis:

```
[Layer 4]  Floating Watermark (Rotasi sudut dinamis + opasitas halus)
[Layer 3]  Typography & Editorial Cards (Badge, Hook, Demo, Spec, CTA)
[Layer 2.5] Subtitle Karaoke Sinkron (Whisper AI kata-per-kata presisi milidetik)
[Layer 2]  Audio & SFX Layer (Voiceover AI ElevenLabs + preset SFX beauty/tech/viral)
[Layer 1]  Video Footage Multi-Clip (Ken Burns push-in zoom, transisi lens flare/whip-pan)
[Layer 0]  Retention Progress Bar (TikTok Story style progress bar di bagian atas)
```

---

## 🚀 Alur Kerja Produksi Video Baru

1. **Unggah Footage Mentah**:
   - Letakkan video produk di folder `public/` (atau seret langsung ke dropzone di Web Studio).
2. **Generate Naskah & JSON via Gemini**:
   - Kirim video ke Google Gemini dengan prompt dari [`docs/prompt-gemini.md`](./prompt-gemini.md).
3. **Generate Voiceover (ElevenLabs)**:
   - Salin naskah dari Gemini ke ElevenLabs, unduh audio sebagai `public/voiceover_v1.mp3` dan `public/voiceover_v2.mp3`.
4. **Import JSON ke Web Studio**:
   - Buka Web Studio di `http://localhost:3100`, klik **Import JSON Gemini**, tempel JSON, dan klik **Terapkan ke Studio**.
5. **Render Video Cepat**:
   - Klik **Lihat Frame** untuk pratinjau instan (2 detik).
   - Klik **Mulai Render Video** untuk mengekspor ke `out/<nama-produk> v1.mp4`.

---

## ⚡ Fitur Utama Engine

### 1. Auto-Fit Duration (Anti-Truncate)
Jika durasi audio voiceover lebih panjang dari total potongan video klip, engine secara otomatis memperpanjang detik akhir klip CTA sehingga suara narator dijamin tidak pernah terpotong.

### 2. Pure Node.js Pipeline (`render.mjs`)
- Menggunakan `@remotion/bundler` dan `@remotion/renderer` langsung dari Node.
- Menghilangkan dependensi pada Git Bash, masalah escaping kutip di Windows, dan file sementara `--props`.
- Kompatibel penuh lintas sistem operasi (Windows, Linux, macOS).

### 3. Pemisahan Port Independen
- **Web Studio**: Port `3100` (`npm run web` / `npm start`)
- **Remotion Studio**: Port `3000` (`npm run dev`)
- Keduanya dapat dijalankan bersamaan tanpa konflik port.

