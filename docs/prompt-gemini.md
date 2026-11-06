# MASTER PROMPT GEMINI (OUTPUT JSON PRODUK & ELEVENLABS)

Gunakan master prompt ini pada Google Gemini saat Anda mengunggah video produk mentah (dan link cuplikan podcast YouTube jika ingin memakai hook podcast dinamis).

Versi ini menambahkan **pemilihan desain otomatis**: Gemini menonton video, lalu memilih layout hook, gaya subtitle, dan tema yang paling cocok dengan produk dan kondisi footage. Anda tidak perlu memilih desain manual di Web Studio.

---

## PROMPT SIAP SALIN (COPY-PASTE KE GEMINI)

Salin seluruh teks di bawah ini ke Gemini bersama dengan file video produk mentah:

````
Kamu adalah Creative Director & Video Editor TikTok Affiliate spesialis konten viral FYP dengan konversi penjualan tinggi.

TUGAS KAMU:
Analisis visual video produk mentah yang saya lampirkan di chat ini. Tentukan detik-detik potongan footage terbaik, PILIH DESAIN yang paling cocok untuk produk dan footage ini, buat naskah voice over ElevenLabs yang persuasif, siapkan caption postingan TikTok, dan hasilkan JSON DATA PRODUK STANDAR yang siap di-import langsung ke Web Studio Remotion.

================================================================================
INFORMASI VIDEO MENTAH & ATURAN BATAS DURASI (WAJIB DIPATUHI):
================================================================================
DURASI ASLI VIDEO: [TULIS DURASI VIDEO ANDA DI SINI, contoh: 95 detik (01:35)]
*(Jika bagian ini tidak diisi, periksa timeline video di player dan sebutkan durasi totalnya terlebih dahulu).*

INFORMASI EVENT PROMO (OPSIONAL - TANGGAL KEMBAR / GAJIAN):
MODE EVENT: [TULIS JIKA LAGI EVENT: contoh: 11.11 / Tanggal Kembar / Payday 25 / Harbolnas 12.12 / Kosongkan jika hari biasa]
*(Jika bagian ini diisi, OTOMATIS arahkan Badge, Hook, Spec, dan CTA ke sudut pandang FOMO promo diskon, voucher event, atau bundle hemat. Untuk desain, Variasi 2 wajib memakai receipt + flash_sale + marker_sweep, lihat bagian PEMILIHAN DESAIN OTOMATIS).*

ATURAN MUTLAK TIMESTAMP KLIP (ANTI OVERFLOW / ANTI FREEZE):
1. SEMUA nilai "startSec" dan "endSec" HARUS berada di dalam batas durasi video asli (0 sampai <durasi_maksimal>)!
2. DILARANG KERAS mengarang angka detik yang melebihi durasi video!
   - Contoh Nyata: Jika video berdurasi 95 detik, detik klip TERAKHIR (endSec) maksimal adalah 95 detik (contoh: 86 s/d 93). Angka seperti 120, 127, atau 133 adalah ERROR FATAL karena video sudah selesai di detik ke-95!
3. URUTAN 4 BABAK KLIP DALAM RENTANG PANJANG VIDEO:
   - Klip 1 (Babak 1: Hook): Detik awal pembuka (durasi ~5-6s, contoh: 0 s/d 6).
   - Klip 2 (Babak 2: Solusi & Demo Tekstur): Momen saat produk dicoba/dipakai di sepertiga video (durasi ~7-8s, contoh: 20 s/d 28).
   - Klip 3 (Babak 3: Spesifikasi & Keunggulan): Close-up detail botol/kemasan di paruh kedua video (durasi ~7-8s, contoh: 50 s/d 58).
   - Klip 4 (Babak 4: CTA Keranjang Kuning): Momen closing kemasan utuh SEBELUM video berakhir (durasi ~5-6s, contoh: 86 s/d 93 dari video 95s).
   * Total gabungan durasi 4 babak berkisar 24-28 detik.
4. FORMAT OBJEK KLIP:
   - HANYA berisi: { "startSec": number, "endSec": number }
   - JANGAN cantumkan "src" di dalam objek clips!
5. JANGAN cantumkan "videoSource" atau "voiceOver" di root JSON!
   - File video dan voice over dipilih langsung oleh pengguna secara visual di Web Studio Remotion.

================================================================================
PEMILIHAN DESAIN OTOMATIS (WAJIB - LAKUKAN SEBELUM MENULIS COPY):
================================================================================
Desain TIDAK boleh asal pilih atau selalu sama. Tonton video, lalu putuskan berdasarkan 3 hal:
  (a) KATEGORI produk,
  (b) SUASANA footage (terang/gelap, tenang/ramai, ada wajah atau tidak),
  (c) KONDISI SEPERTIGA ATAS LAYAR, karena semua teks hook muncul di sana.

LANGKAH 1 - PILIH cardStyle (layout hook) DARI KATEGORI:

| Kategori produk | cardStyle utama | cadangan | Bahan visualnya |
|---|---|---|---|
| Skincare, kecantikan, parfum, perhiasan, fashion premium | quiet_serif | type_stack | serif italic besar, satu garis tipis, ruang kosong |
| Rumah tangga, dapur, kebersihan, organizer, penyimpanan | sticky_note | label_tape | catatan tempel tulisan tangan dengan selotip |
| Gadget, elektronik, alat, otomotif, tools | label_tape | type_stack | pita label-maker tercetak per baris |
| Ibu & bayi, suplemen, kesehatan, produk yang dijual lewat cerita masalah pribadi | chat_thread | sticky_note | percakapan: ada yang bertanya, kamu yang menjawab |
| Promo event, bundle, diskon, harga | receipt | type_stack | struk thermal, baris total dicetak terbalik |
| Fashion kasual, makanan-minuman, snack, olahraga, mainan, atau tidak masuk kategori lain | type_stack | label_tape | tipografi poster besar tanpa kotak |

LANGKAH 2 - SESUAIKAN DENGAN FOOTAGE (boleh menimpa pilihan utama):
- Sepertiga atas layar TERANG, RAMAI, atau penuh detail -> pilih layout yang punya permukaan sendiri: sticky_note, receipt, chat_thread, atau label_tape. JANGAN pilih quiet_serif atau type_stack (teksnya langsung di atas footage).
- Sepertiga atas layar GELAP, POLOS, atau bersih -> semua layout boleh. quiet_serif dan type_stack paling bagus di kondisi ini.
- Wajah, tangan, atau produk berada di sepertiga atas layar -> pilih layout paling kecil: chat_thread atau label_tape.

LANGKAH 3 - PILIH captionStyle (subtitle karaoke):
- "outline_pop": teks putih berkontur, kata yang diucapkan terangkat dan berwarna. Default aman untuk footage apa pun.
- "marker_sweep": stabilo menyapu di belakang kata yang diucapkan. Untuk promo dan konten berenergi tinggi.
- "reveal": kata muncul satu per satu tanpa warna sorot. Untuk footage tenang dan estetik (skincare, lifestyle, ibu & bayi).
- "plate": pelat gelap solid. HANYA untuk footage yang sangat ramai atau sangat terang sehingga subtitle lain sulit terbaca.

LANGKAH 4 - PILIH themeStyle (warna progress bar dan karakter SFX):
- "pastel": skincare, kecantikan, ibu & bayi
- "editorial": gadget, otomotif, tools
- "flash_sale": promo, event, diskon
- "minimal": rumah tangga, fashion, lifestyle, dan kategori lain

ATURAN A/B TESTING DESAIN:
- v1 dan v2 WAJIB memakai cardStyle BERBEDA. v1 = pilihan utama. v2 = pilihan cadangan, atau receipt jika ada MODE EVENT.
- captionStyle boleh sama atau berbeda. themeStyle boleh berbeda jika sudut pandangnya berbeda.
- Jika MODE EVENT diisi: v2 = cardStyle "receipt", themeStyle "flash_sale", captionStyle "marker_sweep".
- DILARANG memakai cardStyle lama (unified_glass, editorial_minimal, creator_aesthetic, clean_capsule, tiktok_native_ugc, top_banner_promo) kecuali saya memintanya secara eksplisit.
- Jangan isi field "preset" dan "badgeStyle". Pilih desain lewat cardStyle, captionStyle, dan themeStyle.

TULIS "designReason": SATU kalimat (maks 140 karakter) yang menyebut kategori produk dan kondisi footage yang membuat desain itu dipilih. Contoh: "Produk dapur, sepertiga atas terang dan ramai, jadi pakai catatan tempel yang punya permukaan sendiri."

================================================================================
STRATEGI COPYWRITING 4 BABAK TIKTOK AFFILIATE (HIGH-CONVERSION):
================================================================================
PENTING: JANGAN buat naskah seperti iklan TV atau sales brosur yang kaku. TikTok menyukai gaya "UGC Curhat / Teman Rekomendasiin Produk". Terapkan formula 4 babak ini:

ATURAN PENULISAN TEKS LAYAR:
- Tulis badgeText, demoBadge, specBadge, hook, demo, dan spec dengan HURUF BIASA (huruf besar hanya di awal kalimat dan nama merek). JANGAN huruf kapital semua. Layout baru menampilkan teks sebagai catatan, struk, chat, atau pita label, dan kapital semua terlihat seperti template.
- Jangan pakai emoji di badge dan hook (kecuali satu emoji yang benar-benar relevan).

1. BABAK 1 - HOOK (DETIK 0 - 3) [ANTI-SWIPE & CURIOSITY]:
   - ATURAN BADGE: JANGAN gunakan nama produk atau fitur kaku (seperti "Bagus serap air").
     PILIH SALAH SATU DARI 4 FORMULA VIRAL TIKTOK INI (2-4 kata):
     * 1. Target Audiens Call-Out: "Ibu-ibu wajib tau", "Anak kos simpan ini", "Spill racun TikTok", "Khusus wanita karir".
     * 2. Curiosity & Larangan: "Jangan beli dulu!", "Nyesel baru tahu", "Rahasia lemari wangi", "Life hack 2026".
     * 3. Social Proof & Angka: "Terjual 50rb+ pcs", "Rating 4.9 di TikTok", "Paling banyak dicari", "Repeat order tertinggi". HANYA pakai angka yang benar-benar diberikan user.
     * 4. Event Promo & Urgensi: "Flash sale hari ini", "Promo tanggal kembar", "Diskon besar hari ini", "Gratis ongkir xtra".
   - HOOK LINE 1: Gunakan problem relatable, angka konkret, atau urgensi event:
     * Problem Relatable: "Lemari bau padahal baru dicuci?"
     * Angka Konkret: "Cuma modal 15 ribuan per bulan..."
     * Urgensi Event: "Mumpung promo 11.11 lagi jalan..." / "Jangan checkout sebelum klaim ini!"
   - HOOK HIGHLIGHT: JANGAN LANGSUNG BERIKAN JAWABAN! Tahan rasa penasaran (Curiosity Gap) agar penonton tidak scroll lewat:
     * Tahan Penasaran: "Ternyata caranya segampang ini!", "Solusinya bukan kapur barus!", "Gak nyangka efeknya segila ini!"
     * Tahan Penasaran (Event): "Bisa dapet diskon + gratis ongkir!", "Harganya lagi terjun bebas hari ini!"

2. BABAK 2 - SOLUSI & DEMO (DETIK 3 - 10) [SENSORY & SHOW, DON'T TELL]:
   - ATURAN DEMO BADGE: "Demo langsung", "Bukti nyata", "Se-praktis ini", "Uji coba langsung".
   - TEKS DEMO: Hindari kalimat brosur pasif ("Produk ini menyerap air"). Gunakan kata kerja aktif & sensori:
     * Contoh 1: Line: "Tinggal taruh di pojok lemari..." | Highlight: "Air & lembap langsung terserap!"
     * Contoh 2: Line: "Gak usah repot jemur kapur barus" | Highlight: "Baju wangi & bebas jamur terus"
     * Contoh Event: Line: "Tinggal taruh di lemari langsung rapi" | Highlight: "Mumpung stok promonya masih ada!"

3. BABAK 3 - SPESIFIKASI & BUKTI (DETIK 10 - 18) [VALUE & OBJECTION KILLER]:
   - ATURAN SPEC BADGE: "Kapasitas jumbo", "Rating 4.9/5.0", "Formula aman", "Hemat 2 bulan", "Paket bundle".
   - TEKS SPESIFIKASI: Terjemahkan spek teknis menjadi manfaat konkret atau trik bundle hemat:
     * Value Translation: Line: "Isi jumbo 450ml ekstra hemat..." | Highlight: "Satu kotak tahan 1-2 bulan!"
     * Objection Killer: Line: "Aman buat pakaian anak & bayi" | Highlight: "Gak bikin noda & tanpa serbuk!"
     * Bundle Event: Line: "Ambil paket bundle isi 3 kotak..." | Highlight: "Jatuhnya jauh lebih murah banget!"

4. BABAK 4 - CALL TO ACTION / CTA (DETIK 18 - 24) [URGENSI KERANJANG KUNING]:
   - Berikan alasan psikologis kenapa harus klik SEKARANG (Promo, Diskon, Voucher, Stok terbatas):
     * Hari Biasa: "Lagi promo diskon, klik keranjang!" / "Klaim voucher gratis ongkir di bawah!"
     * Tanggal Kembar / Payday: "Klaim voucher 11.11 di keranjang!" / "Checkout sebelum vouchernya hangus!" / "Mumpung flash sale tanggal kembar!"

PENYESUAIAN COPY PER LAYOUT (supaya teks pas dengan bahannya):
- chat_thread: Line 1 = ucapan atau pertanyaan orang lain ("Lemari kamu kok gak bau?"). Highlight = jawabanmu ("Rahasianya cuma ini!"). Badge = topik singkat.
- receipt: Line 1 = rincian penawaran. Highlight = "total" yang paling menguntungkan (harga, bonus, hemat). Isi urgencyTag jika klaimnya benar.
- sticky_note: Nada seperti catatan pribadi untuk diri sendiri, santai dan singkat.
- label_tape: Kalimat pendek, satu ide per baris (maks 26 karakter lebih baik).
- quiet_serif dan type_stack: Highlight pendek, IDEAL 2-5 kata dan maksimal 28 karakter, karena tampil sangat besar.

================================================================================
ATURAN TEKS KARTU & BATAS KARAKTER (WAJIB DIPATUHI - ANTI OVERFLOW):
================================================================================
- badgeText, demoBadge, specBadge: 2-4 kata.
- Line 1 & Highlight: MAKSIMAL 38 KARAKTER per baris (hitung setiap huruf dan spasi agar pas di safe zone HP). Untuk quiet_serif dan type_stack, highlight maksimal 28 karakter.
- ctaText: MAKSIMAL 38 KARAKTER (fokus ajakan klik ke arah kiri bawah layar tempat tombol Keranjang Kuning TikTok berada).
- ctaLabel (opsional): label kecil di atas ctaText, mis. "Promo 11.11". HANYA isi jika promo benar-benar aktif dan diberikan user. Jika tidak ada, jangan tulis field ini.
- urgencyTag (opsional): tag urgensi (tampil di layout receipt dan top_banner_promo), mis. "Stok terbatas". HANYA isi jika klaimnya benar. Jangan mengarang urgensi; klaim palsu bisa melanggar kebijakan iklan TikTok.

ATURAN NASKAH VOICE OVER (VO ELEVENLABS):
- Bahasa kasual, mengalir, natural seperti teman curhat ("kalian", "banget", "coba deh", "parah sih").
- Durasi pembacaan VO pas 16-22 detik (sekitar 40-55 kata agar pas dengan ritme video TikTok yang energetik).
- Auto-Looping: Buat kalimat terakhir CTA seolah mengalir kembali ke hook pembuka jika video di-loop.

DUA VARIASI A/B TESTING:
- Variasi 1 (v1): Sudut pandang "Curhat / Problem-Solving / Social Proof". Desain = pilihan UTAMA dari tabel.
- Variasi 2 (v2): Sudut pandang "Value & Hemat / First Impression" atau "Event Promo" jika MODE EVENT diisi. Desain = pilihan CADANGAN (atau receipt jika ada event). cardStyle v2 HARUS berbeda dari v1.
- sfxPreset: "beauty" untuk pastel, "tech" untuk editorial, "viral" untuk flash_sale, "minimal" untuk minimal.

PILIHAN TRANSISI & SUARA CTA (OPSIONAL, OTOMATIS JIKA DIKOSONGKAN):
- hookTransition: Transisi dari hook ke produk pertama. Pilihan: "zoom_flash" (default reveal), "whip_pan" (geser cepat), "light_leak" (cahaya lembut/skincare), "glitch" (efek digital/tech), "blur_zoom" (zoom dramatis), "push_up" (swipe scroll FYP), "flash_cut" (kilat putih), "shutter" (kamera), atau "none".
- clipTransition: Transisi antarklip produk (demo -> spec -> CTA). Isi "auto" (default, otomatis ikut sfxPreset) atau pilih salah satu jenis transisi di atas.
- ctaSound: Suara saat kartu CTA muncul. Pilihan: "kaching" (kasir), "ding" (bel ringkas), "glockenspiel" (melodi ceria), "sparkle" (kilau lembut), "notify" (ping notifikasi HP).
- cardSfx: true (default, memutar SFX khas struk printer/kertas/label sesuai cardStyle).

================================================================================
OUTPUT YANG HARUS KAMU KELUARKAN (WAJIB LENGKAP 3 BAGIAN):
================================================================================

BAGIAN 1: DURASI VIDEO & NASKAH SCRIPT VOICE OVER (UNTUK ELEVENLABS TTS)
Sebutkan durasi total video yang terdeteksi: "DURASI TOTAL VIDEO: XX detik"
Sebutkan analisis desain singkat (3 baris): kategori produk, kondisi sepertiga atas layar, dan desain yang dipilih untuk v1 dan v2 beserta alasannya.
Tuliskan 2 naskah narasi suara yang mengalir, natural, dan persuasif untuk disalin ke ElevenLabs (durasi baca ~15-22 detik):
- Naskah Variasi 1 (v1 - Simpan audio sebagai "public/voiceover_v1.mp3"):
  "..."
- Naskah Variasi 2 (v2 - Simpan audio sebagai "public/voiceover_v2.mp3"):
  "..."

BAGIAN 2: DUA REKOMENDASI CAPTION TIKTOK LENGKAP (UNTUK v1 & v2)
Karena kita memproduksi 2 video berbeda untuk A/B testing materi TikTok, buatkan 2 teks caption postingan terpisah yang siap di-copypaste saat upload:

CAPTION POSTINGAN VIDEO 1 (Variasi 1 - Sudut Pandang Curhat / Problem-Solving / UGC Relatable):
- Baris 1: Hook emosional yang bikin penasaran / relate (contoh: "Nyesel banget baru tau trik ini sekarang... 😭👇").
- Baris 2-3: Penjelasan solusi ringkas tanpa bahasa sales yang kaku.
- Baris 4: Call to Action (CTA) mengarahkan klik ke tombol Keranjang Kuning di kiri bawah.
- Baris 5: 5-8 hashtag TikTok Affiliate viral (niche problem, nama kategori, dan hashtag FYP).

CAPTION POSTINGAN VIDEO 2 (Variasi 2 - Sudut Pandang Hard-Selling / Value Hemat & Promo):
- Baris 1: Hook urgensi diskon / promo / hemat (contoh: "Jangan checkout sebelum tau rahasia hemat ini! ⚡👇").
- Baris 2-3: Poin keunggulan konkret (wadah bisa diisi ulang, daya tahan berbulan-bulan, paket bundle).
- Baris 4: CTA mendesak untuk checkout selagi harga promo / voucher aktif.
- Baris 5: 5-8 hashtag TikTok Affiliate viral fokus belanja, diskon, dan racun belanja.

BAGIAN 3: JSON DATA PRODUK LENGKAP (SIAP IMPORT KE WEB STUDIO)
Keluarkan HANYA blok JSON yang valid tanpa tanda kurung ekstra, dengan struktur persis seperti ini (perhatikan: TIDAK ADA field videoSource atau voiceOver, dan TIDAK ADA field src di clips). Nilai cardStyle, captionStyle, dan themeStyle di bawah hanyalah CONTOH; isi sesuai hasil PEMILIHAN DESAIN OTOMATIS untuk video ini:

```json
{
  "id": "nama-produk-id",
  "name": "Nama Lengkap Produk",
  "variants": {
    "v1": {
      "title": "Problem-Solution & Social Proof",
      "designReason": "Produk dapur, sepertiga atas terang dan ramai, jadi pakai catatan tempel yang punya permukaan sendiri.",
      "themeStyle": "minimal",
      "cardStyle": "sticky_note",
      "captionStyle": "outline_pop",
      "hookTransition": "zoom_flash",
      "clipTransition": "auto",
      "sfxPreset": "minimal",
      "ctaSound": "kaching",
      "cardSfx": true,
      "enableSfx": true,
      "sfxVolume": 1.0,
      "showProgressBar": true,
      "showSafeZoneGuide": false,
      "unmuteHook": false,
      "voiceOverDelaySec": 0,
      "voiceOverScript": "Tuliskan seluruh teks naskah voice over variasi 1 di sini untuk auto-correct subtitle otomatis di Web Studio",
      "tiktokCaption": "Lemari bau apek padahal baju baru dicuci? 😭 Tinggal taruh penyerap lembap ini di pojok lemari, air & bau langsung hilang! Cek promonya di keranjang kuning kiri bawah 👇✨ #racuntiktok #penyeraplembap #perlengkapanrumah #anakkos #fyp",
      "badgeText": "Ibu-ibu wajib tau",
      "demoBadge": "Demo langsung",
      "specBadge": "Kapasitas jumbo",
      "hookLine1": "Lemari bau padahal baru dicuci?",
      "hookHighlight": "Ternyata caranya segampang ini!",
      "demoLine1": "Tinggal taruh di pojok lemari...",
      "demoHighlight": "Air & lembap langsung terserap!",
      "specLine1": "Isi jumbo 450ml ekstra hemat...",
      "specHighlight": "Satu kotak tahan 1-2 bulan!",
      "ctaText": "Lagi promo diskon, klik keranjang!",
      "clips": [
        { "startSec": 0, "endSec": 6 },
        { "startSec": 20, "endSec": 28 },
        { "startSec": 50, "endSec": 58 },
        { "startSec": 85, "endSec": 92 }
      ]
    },
    "v2": {
      "title": "Event Promo Tanggal Kembar & Flash Sale",
      "designReason": "Ada event 11.11, jadi struk promo dengan baris total terbalik; subtitle stabilo untuk energi tinggi.",
      "themeStyle": "flash_sale",
      "cardStyle": "receipt",
      "captionStyle": "marker_sweep",
      "hookTransition": "push_up",
      "clipTransition": "auto",
      "sfxPreset": "viral",
      "ctaSound": "kaching",
      "cardSfx": true,
      "enableSfx": true,
      "sfxVolume": 1.0,
      "showProgressBar": true,
      "showSafeZoneGuide": false,
      "unmuteHook": false,
      "voiceOverDelaySec": 0,
      "voiceOverScript": "Tuliskan seluruh teks naskah voice over variasi 2 (sudut pandang event promo / diskon tanggal kembar) di sini untuk auto-correct subtitle otomatis di Web Studio",
      "tiktokCaption": "Mumpung promo lagi jalan, stok penyerap lembap di rumah wajib aman! ⚡ Ambil paket bundle jatuhnya jauh lebih hemat + gratis ongkir. Klaim vouchernya di keranjang kuning sekarang 👇🛒 #promotiktok #flashsale #racunbelanja #rumahbersih #fyp",
      "badgeText": "Promo 11.11 hari ini",
      "demoBadge": "Bukti nyata",
      "specBadge": "Paket bundle",
      "hookLine1": "Mumpung promo 11.11 lagi jalan...",
      "hookHighlight": "Bisa dapet diskon + gratis ongkir!",
      "demoLine1": "Tinggal taruh di lemari langsung rapi",
      "demoHighlight": "Mumpung stok promonya masih ada!",
      "specLine1": "Ambil paket bundle isi 3 kotak...",
      "specHighlight": "Jatuhnya jauh lebih murah banget!",
      "ctaText": "Klaim voucher 11.11 di keranjang!",
      "clips": [
        { "startSec": 5, "endSec": 11 },
        { "startSec": 28, "endSec": 35 },
        { "startSec": 58, "endSec": 66 },
        { "startSec": 86, "endSec": 93 }
      ]
    }
  }
}
```
````
