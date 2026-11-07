# Integrasi gaya hook & subtitle baru

Salin folder ini ke `src/affiliate-styles/` di project `tiktok-affiliate-remotion`.

Isi folder:

| File | Fungsi |
|---|---|
| `tokens.ts` | 5 palet flat, safe zone TikTok, font |
| `hooks.tsx` | 5 animasi hook + `AffiliateHook` |
| `subtitles.tsx` | 6 gaya subtitle + `AffiliateSubtitles` + adapter Whisper `toSubWords` |
| `registry.ts` | Label untuk dropdown Web Studio dan preset per kategori produk |
| `StyleGallery.tsx` | Komposisi pratinjau semua gaya di Remotion Studio |

## Gaya yang tersedia

**Hook**

| Nama | Gerakan | Cocok untuk |
|---|---|---|
| `marker_highlight` | Kartu kertas, kalimat utama ditandai stabilo yang tergambar | Skincare, bumil/busui |
| `stack_slam` | Dua plat menghantam layar bergantian, getar singkat | Flash sale, produk viral |
| `struck_swap` | Masalah dicoret, solusi menggantikan | Problem-solution |
| `tilt_card` | Kartu blur-in dengan tilt 3D, stiker badge | Review, vitamin |
| `mask_wipe` | Teks naik dari balik garis potong, plat menyapu | Gadget, fashion |

**Subtitle**

| Nama | Efek | Cocok untuk |
|---|---|---|
| `karaoke_block` | Kata aktif jadi blok warna | Default aman |
| `pop_scale` | Satu kata besar memantul | Voiceover cepat |
| `highlighter_bar` | Plat gelap, stabilo menyapu kata aktif | Edukatif |
| `fill_sweep` | Warna mengisi kata sesuai durasi ucap | Storytelling |
| `typewriter_band` | Pita tipis, serif miring | Premium |
| `sticker_label` | Label bergaris, miring bergantian | Review santai |

## Langkah 1: Daftarkan galeri pratinjau

Di `src/Root.tsx`:

```tsx
import {Composition} from 'remotion';
import {StyleGallery, GALLERY_DURATION} from './affiliate-styles/StyleGallery';

<Composition
  id="StyleGallery"
  component={StyleGallery}
  durationInFrames={GALLERY_DURATION}
  fps={30}
  width={1080}
  height={1920}
/>
```

Jalankan `npm run dev` (port 3000), pilih `StyleGallery`, dan lihat semua gaya berurutan.

## Langkah 2: Tambah field di JSON produk

Tiga field opsional. Jika tidak diisi, dipakai default.

```json
"v1": {
  "palette": "pastel_rose",
  "hookStyle": "marker_highlight",
  "subtitleStyle": "highlighter_bar",
  "hookLine1": "Lagi cari vitamin bumil busui?",
  "hookHighlight": "Penuhi Nutrisi Lengkap Si Kecil!"
}
```

Nilai valid: lihat `PaletteName`, `HookStyleName`, dan `SubtitleStyleName`.
A/B testing v1 vs v2 jadi lebih bermakna kalau kedua variasi memakai `hookStyle` berbeda.

## Langkah 3: Pasang di `AffiliateVideo.tsx`

Saya tidak bisa membaca `src/` Anda, jadi nama variabel di bawah adalah asumsi.
Sesuaikan dengan kode yang ada.

Layer 3 (hook), ganti komponen hook lama:

```tsx
import {AffiliateHook} from './affiliate-styles/hooks';
import {PALETTES, PaletteName} from './affiliate-styles/tokens';
import {DEFAULT_PRESET} from './affiliate-styles/registry';

const palette = PALETTES[(variant.palette as PaletteName) ?? DEFAULT_PRESET.palette];
const hookFrames = Math.round(fps * 3);

<Sequence from={0} durationInFrames={hookFrames}>
  <AffiliateHook
    variant={variant.hookStyle ?? DEFAULT_PRESET.hookStyle}
    line1={variant.hookLine1}
    highlight={variant.hookHighlight}
    badge={variant.badgeText}
    palette={palette}
    durationInFrames={hookFrames}
  />
</Sequence>
```

Layer 2.5 (subtitle), ganti komponen karaoke lama:

```tsx
import {AffiliateSubtitles, toSubWords} from './affiliate-styles/subtitles';

<AffiliateSubtitles
  variant={variant.subtitleStyle ?? DEFAULT_PRESET.subtitleStyle}
  words={toSubWords(whisperWords)}  // hasil koreksi Web Studio
  palette={palette}
/>
```

`toSubWords` menerima `{text|word, startMs, endMs}` atau `{text|word, start, end}` (detik).
Jika JSON Whisper Anda berbeda, ubah fungsi itu saja.

## Langkah 4 (opsional): Dropdown di Web Studio

`registry.ts` mengekspor `HOOK_STYLE_INFO`, `SUBTITLE_STYLE_INFO`, dan `PRESETS`.
Pakai untuk mengisi dropdown pilihan gaya dan tombol "Terapkan preset kategori".

## Langkah 5 (opsional): Perbarui `docs/prompt-gemini.md`

Minta Gemini menambahkan tiga field di JSON keluaran, dan beri tabel "Cocok untuk" di atas
sebagai panduan memilih gaya dari kategori produk.

## Aturan dari skill yang diikuti

- Tanpa neon, glow, bayangan berwarna, gradien dekoratif. Semua warna flat.
  Satu-satunya `linear-gradient` adalah trik satu warna agar lebar stabilo bisa dianimasikan.
- Teks hook adalah copywriting, bukan pengulangan voiceover.
  Skill melarang menampilkan ulang narasi di layar. Subtitle tetap ada karena itu fitur utama project Anda.
- Mobile-first: headline 54-100px, subtitle 62-150px.
- Teks dijauhkan dari area UI TikTok lewat `SAFE` di `tokens.ts` (bawah 440px, atas 160px, sisi 120px).
- Setiap hook memudar di frame terakhir agar bisa dipotong bersih.

## Yang perlu dicek

- Kode ini belum dirender di project Anda. Cek dulu lewat `StyleGallery`.
- Font Poppins dan Playfair Display perlu di-load (mis. `@remotion/google-fonts`).
  Tanpa itu, fallback sistem dipakai dan tampilan akan sedikit berbeda.
- Teks hook yang sangat panjang (lebih dari sekitar 60 karakter) bisa terlalu tinggi. Pangkas copy-nya.
