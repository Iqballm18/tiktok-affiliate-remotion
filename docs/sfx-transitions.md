# SFX & Transisi

Dokumen ini menjelaskan sistem transisi antarklip dan pemetaan SFX. Semua field bersifat opsional di JSON varian (`products/*.json`); tanpa field apa pun, video tetap dirender dengan default yang aman.

## Field baru

| Field | Nilai | Default | Fungsi |
|---|---|---|---|
| `hookTransition` | `zoom_flash` `whip_pan` `light_leak` `glitch` `blur_zoom` `push_up` `flash_cut` `shutter` `none` | `zoom_flash` | Transisi hook → klip produk pertama |
| `clipTransition` | semua nilai di atas + `auto` | `auto` | Transisi demo → spec → CTA |
| `ctaSound` | `kaching` `ding` `glockenspiel` `sparkle` `notify` | otomatis dari preset | Suara saat CTA muncul |
| `cardSfx` | `true` / `false` | `true` | SFX khas layout kartu hook |

`clipTransition: "auto"` memilih dari preset SFX: `beauty` → `light_leak`, `tech` → `glitch`, `viral` → `push_up`, `minimal` → `blur_zoom`. Isi `"none"` untuk kembali ke cut standar seperti sebelumnya.

## Katalog transisi

| Transisi | Karakter | Cocok untuk | SFX pasangan |
|---|---|---|---|
| `zoom_flash` | Zoom punch + lens flare | Hook podcast → produk, momen "reveal" | swish-fast + boom-sub |
| `whip_pan` | Geser cepat + motion blur | Konten energik, unboxing | swish-fast |
| `light_leak` | Kebocoran cahaya hangat | Skincare, makeup, parenting | shimmer-up |
| `glitch` | RGB-split, jitter, slice digital | Gadget, elektronik, tech | glitch |
| `blur_zoom` | Zoom menembus + speed lines | Lifestyle, perpindahan babak dramatis | reverse-swell + boom-sub |
| `push_up` | Geser vertikal ala scroll TikTok | Flash sale, format native FYP | swipe-soft |
| `flash_cut` | Kilatan putih + hard cut | Before/after, hasil akhir, reveal harga | swipe-soft + boom-sub |
| `shutter` | Rana kamera menutup lalu membuka | Fotografi, produk visual, "snap" momen | camera-shutter |

Cara kerja: tiap titik cut punya efek **keluar** pada klip A (zoom/geser/blur), efek **masuk** pada klip B (settle), overlay visual di atasnya, dan SFX yang puncaknya dijatuhkan tepat di cut (suara mulai sebelum cut bila perlu, mis. `reverse-swell` mulai 0,5 detik sebelumnya).

## SFX baru (8 file, `public/sfx/`)

Dibuat lewat `node scripts/generate_transition_sfx.mjs` (sintesis murni, RNG ber-seed, hasil identik tiap dijalankan, tanpa aset berhak cipta). 14 SFX lama tidak berubah.

| File | Durasi | Dipakai untuk |
|---|---|---|
| `boom-sub.wav` | 0,70s | Dentuman bass di zoom punch / flash cut / blur zoom |
| `glitch.wav` | 0,32s | Transisi `glitch` |
| `reverse-swell.wav` | 0,55s | Build-up 0,5s sebelum cut pada `blur_zoom` |
| `swipe-soft.wav` | 0,28s | `push_up`, `flash_cut` |
| `shimmer-up.wav` | 0,85s | `light_leak` |
| `tick.wav` | 0,04s | Layout `receipt` (3 tick printer) dan `label_tape` (2 tick) |
| `notify-ping.wav` | 0,55s | Layout `chat_thread`; juga `ctaSound: "notify"` |
| `paper-flip.wav` | 0,32s | Layout `sticky_note` |

## SFX khas layout kartu hook

Diputar tipis (vol 0,4-0,45) saat kartu hook muncul, otomatis mengikuti `cardStyle` (atau dari `preset`):

| `cardStyle` | SFX |
|---|---|
| `receipt` | 3× `tick` (struk dicetak) |
| `label_tape` | 2× `tick` |
| `sticky_note` | `paper-flip` |
| `chat_thread` | `notify-ping` |

Layout lain tidak punya SFX khas. Matikan dengan `"cardSfx": false`. Waktu pemutaran (0,25-0,54s) adalah perkiraan; setel `at` di `CARD_SFX` (`src/AffiliateVideo.tsx`) kalau terasa meleset dari animasi kartu.

## Mengatur volume

`sfxVolume` (0-2, default 1) menskalakan semua SFX sekaligus. Volume relatif antar-file ada di `TRANSITION_SFX` dan `CARD_SFX`. Pada titik cut terakhir (spec → CTA), SFX transisi otomatis dikecilkan ke 60% karena bersamaan dengan riser dan ka-ching.

## Contoh

```json
"v1": {
  "preset": "skincare",
  "sfxPreset": "beauty",
  "hookTransition": "light_leak",
  "clipTransition": "light_leak",
  "ctaSound": "notify"
}
```
