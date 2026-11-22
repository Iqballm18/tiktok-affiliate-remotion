/**
 * Sistem Multi-Preset Desain (dengan dukungan multi-versi v1, v2, v3 untuk Hook, Caption, dan Transisi).
 * Diadaptasi dari prinsip gerak sinematik `bang-motion` (anti-PPT, tipografi hidup, kontras kantong teks).
 *
 * Urutan prioritas (yang lebih spesifik selalu menang):
 *   field eksplisit di JSON (cardStyle, hookVariant, captionStyle, captionVariant, hookTransition, dst.)
 *   > konfigurasi versi preset (PRESETS[preset].versions[presetVariant])
 *   > default preset (PRESETS[preset])
 */
export type PresetId =
    | 'skincare'
    | 'gadget'
    | 'flash_sale'
    | 'lifestyle'
    | 'household'
    | 'parenting'
    | 'podcast_hook'
    | 'luxury'
    | 'food_kuliner'
    | 'muslim_hampers';

export type VariantVersion = 'v1' | 'v2' | 'v3';

export const VARIANT_VERSIONS: VariantVersion[] = ['v1', 'v2', 'v3'];

export const resolveVariantVersion = (raw?: string, fallback: VariantVersion = 'v1'): VariantVersion => {
    const s = (raw || '').toLowerCase().trim();
    if (s === 'v2' || s === '2' || s === 'ver2' || s === 'version2') return 'v2';
    if (s === 'v3' || s === '3' || s === 'ver3' || s === 'version3') return 'v3';
    if (s === 'v1' || s === '1' || s === 'ver1' || s === 'version1') return 'v1';
    return fallback;
};

export interface PresetVersionConfig {
    label: string;
    description: string;
    themeStyle: string;
    cardStyle: string;
    hookVariant: VariantVersion;
    badgeStyle: string;
    captionStyle: string;
    captionVariant: VariantVersion;
    hookTransition: string;
    clipTransition: string;
    transitionVariant: VariantVersion;
    palette?: string;
    hookStyle?: string;
    subtitleStyle?: string;
    sfxPreset?: 'viral' | 'beauty' | 'tech' | 'minimal';
}

export interface DesignPreset {
    id: PresetId;
    name: string;
    description: string;
    themeStyle: string;
    cardStyle: string;
    hookVariant: VariantVersion;
    badgeStyle: string;
    captionStyle: string;
    captionVariant: VariantVersion;
    hookTransition: string;
    clipTransition: string;
    transitionVariant: VariantVersion;
    palette?: string;
    hookStyle?: string;
    subtitleStyle?: string;
    versions: Record<VariantVersion, PresetVersionConfig>;
}

export const PRESETS: Record<PresetId, DesignPreset> = {
    skincare: {
        id: 'skincare',
        name: 'Skincare & Clean Beauty',
        description: 'Serif italic elegan, sapuan lembut, dan subtitle tenang untuk kecantikan & perawatan diri.',
        themeStyle: 'pastel',
        cardStyle: 'quiet_serif',
        hookVariant: 'v1',
        badgeStyle: 'marker',
        captionStyle: 'reveal',
        captionVariant: 'v1',
        hookTransition: 'light_leak',
        clipTransition: 'blur_zoom',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Editorial Italic & Reveal',
                description: 'Serif italic besar dengan satu garis tipis dan subtitle muncul kata demi kata.',
                themeStyle: 'pastel',
                cardStyle: 'quiet_serif',
                hookVariant: 'v1',
                badgeStyle: 'marker',
                captionStyle: 'reveal',
                captionVariant: 'v1',
                hookTransition: 'light_leak',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Magazine Masthead & Dim-to-Full',
                description: 'Gaya majalah high-fashion dengan garis aksen kiri dan subtitle redup-ke-penuh ala bang-motion.',
                themeStyle: 'pastel',
                cardStyle: 'quiet_serif',
                hookVariant: 'v2',
                badgeStyle: 'glass',
                captionStyle: 'reveal',
                captionVariant: 'v2',
                hookTransition: 'shutter',
                clipTransition: 'light_leak',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Warm Paper Pocket & Pill Sparkle',
                description: 'Kartu kertas krem hangat bertinta gelap dengan subtitle kapsul bintang (bang-motion pill).',
                themeStyle: 'pastel',
                cardStyle: 'quiet_serif',
                hookVariant: 'v3',
                badgeStyle: 'sticker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v2',
                hookTransition: 'split_wipe',
                clipTransition: 'light_leak',
                transitionVariant: 'v3',
            },
        },
    },

    gadget: {
        id: 'gadget',
        name: 'Gadget, Tech & Otomotif',
        description: 'Pita label-maker, bar spesifikasi industrial, dan transisi presisi untuk produk elektronik & alat.',
        themeStyle: 'editorial',
        cardStyle: 'label_tape',
        hookVariant: 'v1',
        badgeStyle: 'alert',
        captionStyle: 'outline_pop',
        captionVariant: 'v1',
        hookTransition: 'glitch',
        clipTransition: 'whip_pan',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Dymo Emboss & Outline Pop',
                description: 'Pita label timbul klasik tercetak per baris dengan transisi glitch & whip pan.',
                themeStyle: 'editorial',
                cardStyle: 'label_tape',
                hookVariant: 'v1',
                badgeStyle: 'alert',
                captionStyle: 'outline_pop',
                captionVariant: 'v1',
                hookTransition: 'glitch',
                clipTransition: 'whip_pan',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Cyber Spec Bar & Underline Draw',
                description: 'Bar spesifikasi bersudut tajam dengan garis bawah aktif yang menggambar cepat.',
                themeStyle: 'editorial',
                cardStyle: 'label_tape',
                hookVariant: 'v2',
                badgeStyle: 'sticker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v3',
                hookTransition: 'whip_pan',
                clipTransition: 'split_wipe',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Strike-Box Frame & Frosted Plate',
                description: 'Coretan masalah lalu kotak garis teknis (bang-motion .hl.box) dengan pelat subtitle kaca.',
                themeStyle: 'editorial',
                cardStyle: 'type_stack',
                hookVariant: 'v3',
                badgeStyle: 'alert',
                captionStyle: 'plate',
                captionVariant: 'v3',
                hookTransition: 'tilt_whip',
                clipTransition: 'glitch',
                transitionVariant: 'v3',
            },
        },
    },

    flash_sale: {
        id: 'flash_sale',
        name: 'Flash Sale & Event Promo',
        description: 'Struk kasir, kupon sobek, dan energi tinggi untuk promo tanggal kembar, bundle, & diskon.',
        themeStyle: 'flash_sale',
        cardStyle: 'receipt',
        hookVariant: 'v1',
        badgeStyle: 'sticker',
        captionStyle: 'marker_sweep',
        captionVariant: 'v1',
        hookTransition: 'zoom_flash',
        clipTransition: 'push_up',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Thermal Receipt & Stabilo Sweep',
                description: 'Struk kasir dicetak bertahap dengan blok total terbalik & sapuan stabilo miring.',
                themeStyle: 'flash_sale',
                cardStyle: 'receipt',
                hookVariant: 'v1',
                badgeStyle: 'sticker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v1',
                hookTransition: 'zoom_flash',
                clipTransition: 'push_up',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Red Promo Coupon & Pill Sparkle',
                description: 'Tiket kupon sobek merah-emas dengan kapsul kata aktif berbintang & transisi kilat.',
                themeStyle: 'flash_sale',
                cardStyle: 'receipt',
                hookVariant: 'v2',
                badgeStyle: 'alert',
                captionStyle: 'marker_sweep',
                captionVariant: 'v2',
                hookTransition: 'push_up',
                clipTransition: 'flash_cut',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Top Promo Strip & Kinetic Bounce',
                description: 'Banner promo di tepi atas layar, ruang video maksimal, dan subtitle memantul 3D.',
                themeStyle: 'flash_sale',
                cardStyle: 'top_banner_promo',
                hookVariant: 'v3',
                badgeStyle: 'sticker',
                captionStyle: 'outline_pop',
                captionVariant: 'v2',
                hookTransition: 'flash_cut',
                clipTransition: 'whip_pan',
                transitionVariant: 'v3',
            },
        },
    },

    lifestyle: {
        id: 'lifestyle',
        name: 'Lifestyle, Fashion & Kuliner',
        description: 'Tipografi poster sinematik tanpa kotak berat, menonjolkan visual produk & estetika video.',
        themeStyle: 'minimal',
        cardStyle: 'type_stack',
        hookVariant: 'v1',
        badgeStyle: 'sticker',
        captionStyle: 'outline_pop',
        captionVariant: 'v1',
        hookTransition: 'whip_pan',
        clipTransition: 'blur_zoom',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Poster Masked Stack & Brush Line',
                description: 'Kata naik dari balik mask dengan garis kuas tangan di bawah highlight.',
                themeStyle: 'minimal',
                cardStyle: 'type_stack',
                hookVariant: 'v1',
                badgeStyle: 'sticker',
                captionStyle: 'outline_pop',
                captionVariant: 'v1',
                hookTransition: 'whip_pan',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Bang-Motion Kinetic Pill & Sparkle',
                description: 'Kalimat sentence-case dengan pill warna aksen mengembang dari kiri + bintang berputar.',
                themeStyle: 'minimal',
                cardStyle: 'type_stack',
                hookVariant: 'v2',
                badgeStyle: 'marker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v2',
                hookTransition: 'split_wipe',
                clipTransition: 'push_up',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — White Catalog Index & Paper Ink',
                description: 'Kartu indeks katalog putih bersih (gaya 08 bang-motion) dengan pelat subtitle kertas terang.',
                themeStyle: 'minimal',
                cardStyle: 'receipt',
                hookVariant: 'v3',
                badgeStyle: 'glass',
                captionStyle: 'plate',
                captionVariant: 'v2',
                hookTransition: 'shutter',
                clipTransition: 'split_wipe',
                transitionVariant: 'v3',
            },
        },
    },

    household: {
        id: 'household',
        name: 'Rumah Tangga & Dapur',
        description: 'Catatan tempel fisik, memo kertas kotak-kotak, dan suasana hangat untuk perlengkapan rumah.',
        themeStyle: 'minimal',
        cardStyle: 'sticky_note',
        hookVariant: 'v1',
        badgeStyle: 'sticker',
        captionStyle: 'outline_pop',
        captionVariant: 'v1',
        hookTransition: 'zoom_flash',
        clipTransition: 'push_up',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Classic Yellow Sticky Note',
                description: 'Catatan tempel kuning dengan selotip atas dan garis bawah merah tulisan tangan.',
                themeStyle: 'minimal',
                cardStyle: 'sticky_note',
                hookVariant: 'v1',
                badgeStyle: 'sticker',
                captionStyle: 'outline_pop',
                captionVariant: 'v1',
                hookTransition: 'zoom_flash',
                clipTransition: 'push_up',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Grid Memo Pin & Stabilo',
                description: 'Kertas buku kotak-kotak dengan pin merah 3D dan coretan stabilo kuning di kalimat utama.',
                themeStyle: 'minimal',
                cardStyle: 'sticky_note',
                hookVariant: 'v2',
                badgeStyle: 'marker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v1',
                hookTransition: 'push_up',
                clipTransition: 'split_wipe',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Dual Layered Kraft & Coral Notes',
                description: 'Dua lembar catatan bertumpuk miring berlawanan arah dengan klip kertas logam.',
                themeStyle: 'pastel',
                cardStyle: 'sticky_note',
                hookVariant: 'v3',
                badgeStyle: 'sticker',
                captionStyle: 'outline_pop',
                captionVariant: 'v2',
                hookTransition: 'whip_pan',
                clipTransition: 'light_leak',
                transitionVariant: 'v3',
            },
        },
    },

    parenting: {
        id: 'parenting',
        name: 'Ibu, Bayi & Curhat Solusi',
        description: 'Percakapan dua arah, balasan komentar TikTok, dan cerita personal yang hangat.',
        themeStyle: 'pastel',
        cardStyle: 'chat_thread',
        hookVariant: 'v1',
        badgeStyle: 'glass',
        captionStyle: 'reveal',
        captionVariant: 'v1',
        hookTransition: 'light_leak',
        clipTransition: 'push_up',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Chat Bubble Q&A (iMessage/WA)',
                description: 'Balon pertanyaan dengan indikator mengetik, dibalas balon jawaban hijau.',
                themeStyle: 'pastel',
                cardStyle: 'chat_thread',
                hookVariant: 'v1',
                badgeStyle: 'glass',
                captionStyle: 'reveal',
                captionVariant: 'v1',
                hookTransition: 'light_leak',
                clipTransition: 'push_up',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — TikTok Comment Reply Sticker',
                description: 'Stiker "Membalas komentar @..." asli FYP TikTok diikuti kartu jawaban kreator.',
                themeStyle: 'pastel',
                cardStyle: 'chat_thread',
                hookVariant: 'v2',
                badgeStyle: 'sticker',
                captionStyle: 'outline_pop',
                captionVariant: 'v1',
                hookTransition: 'push_up',
                clipTransition: 'light_leak',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Dark Voice DM & Blur-In Reveal',
                description: 'Gelembung pesan mode gelap dengan gelombang suara hidup dan subtitle blur-in.',
                themeStyle: 'editorial',
                cardStyle: 'chat_thread',
                hookVariant: 'v3',
                badgeStyle: 'alert',
                captionStyle: 'reveal',
                captionVariant: 'v3',
                hookTransition: 'zoom_flash',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v3',
            },
        },
    },

    podcast_hook: {
        id: 'podcast_hook',
        name: 'Dark Podcast & Edukasi Hook',
        description: 'Gaya klip podcast/narasumber dengan kontras gelap elegan, bingkai kutipan, dan transisi cepat.',
        themeStyle: 'editorial',
        cardStyle: 'chat_thread',
        hookVariant: 'v3',
        badgeStyle: 'alert',
        captionStyle: 'outline_pop',
        captionVariant: 'v2',
        hookTransition: 'blur_zoom',
        clipTransition: 'whip_pan',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Dark Voice Thread & Kinetic Pop',
                description: 'Kartu kutipan audio gelap dengan indikator waveform dan subtitle memantul.',
                themeStyle: 'editorial',
                cardStyle: 'chat_thread',
                hookVariant: 'v3',
                badgeStyle: 'alert',
                captionStyle: 'outline_pop',
                captionVariant: 'v2',
                hookTransition: 'blur_zoom',
                clipTransition: 'whip_pan',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Strike Myth & Box Truth',
                description: 'Mitos/masalah dicoret lalu fakta solusi dibingkai kotak teknis.',
                themeStyle: 'editorial',
                cardStyle: 'type_stack',
                hookVariant: 'v3',
                badgeStyle: 'marker',
                captionStyle: 'marker_sweep',
                captionVariant: 'v3',
                hookTransition: 'tilt_whip',
                clipTransition: 'split_wipe',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Frosted Split Tag & Plate',
                description: 'Pita label kaca gelap dengan pelat subtitle kontras tinggi untuk footage podcast ramai.',
                themeStyle: 'editorial',
                cardStyle: 'label_tape',
                hookVariant: 'v3',
                badgeStyle: 'glass',
                captionStyle: 'plate',
                captionVariant: 'v1',
                hookTransition: 'shutter',
                clipTransition: 'push_up',
                transitionVariant: 'v3',
            },
        },
    },

    luxury: {
        id: 'luxury',
        name: 'Aesthetic Minimal & Luxury',
        description: 'Monokrom bersih, ruang bernapas lega, dan penekanan tipografi halus tanpa ornamen ramai.',
        themeStyle: 'minimal',
        cardStyle: 'quiet_serif',
        hookVariant: 'v2',
        badgeStyle: 'glass',
        captionStyle: 'reveal',
        captionVariant: 'v2',
        hookTransition: 'shutter',
        clipTransition: 'split_wipe',
        transitionVariant: 'v1',
        versions: {
            v1: {
                label: 'v1 — Luxury Masthead & Dim-to-Full',
                description: 'Tipografi serif majalah dengan garis aksen vertikal dan subtitle redup-ke-terang.',
                themeStyle: 'minimal',
                cardStyle: 'quiet_serif',
                hookVariant: 'v2',
                badgeStyle: 'glass',
                captionStyle: 'reveal',
                captionVariant: 'v2',
                hookTransition: 'shutter',
                clipTransition: 'split_wipe',
                transitionVariant: 'v1',
            },
            v2: {
                label: 'v2 — Warm Paper Card & Ink Plate',
                description: 'Kontras kartu kertas krem hangat di atas footage dengan pelat subtitle tinta hitam.',
                themeStyle: 'minimal',
                cardStyle: 'quiet_serif',
                hookVariant: 'v3',
                badgeStyle: 'marker',
                captionStyle: 'plate',
                captionVariant: 'v2',
                hookTransition: 'light_leak',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v2',
            },
            v3: {
                label: 'v3 — Clean Catalog & Kinetic Pill',
                description: 'Indeks katalog minimalis dengan sorotan kapsul mengembang dari kiri.',
                themeStyle: 'minimal',
                cardStyle: 'receipt',
                hookVariant: 'v3',
                badgeStyle: 'glass',
                captionStyle: 'marker_sweep',
                captionVariant: 'v2',
                hookTransition: 'split_wipe',
                clipTransition: 'shutter',
                transitionVariant: 'v3',
            },
        },
    },
    food_kuliner: {
        id: 'food_kuliner',
        name: 'Food, Snack & Kuliner',
        description: 'Nuansa hangat menggugah selera dengan Floating Tag e-commerce dan subtitle Glass Pill transparan.',
        themeStyle: 'viral',
        cardStyle: 'FloatingTag',
        hookVariant: 'v1',
        badgeStyle: 'pill',
        captionStyle: 'glass_pill',
        captionVariant: 'v1',
        hookTransition: 'whip_pan',
        clipTransition: 'blur_zoom',
        transitionVariant: 'v1',
        palette: 'warm_kuliner',
        hookStyle: 'floating_tag',
        subtitleStyle: 'glass_pill',
        versions: {
            v1: {
                label: 'v1 — Warm Appetite Tag & Glass Pill',
                description: 'Kartu harga/ulasan melayang bernuansa saffron-terracotta dengan kapsul subtitle kaca buram.',
                themeStyle: 'viral',
                cardStyle: 'FloatingTag',
                hookVariant: 'v1',
                badgeStyle: 'pill',
                captionStyle: 'glass_pill',
                captionVariant: 'v1',
                hookTransition: 'whip_pan',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v1',
                palette: 'warm_kuliner',
                hookStyle: 'floating_tag',
                subtitleStyle: 'glass_pill',
            },
            v2: {
                label: 'v2 — Tilt Review Card & Karaoke Block',
                description: 'Kartu review jujur miring dengan sorotan kata aktif tegas untuk video mukbang/review cepat.',
                themeStyle: 'viral',
                cardStyle: 'TiltCard',
                hookVariant: 'v2',
                badgeStyle: 'marker',
                captionStyle: 'karaoke_block',
                captionVariant: 'v2',
                hookTransition: 'flash_zoom',
                clipTransition: 'whip_pan',
                transitionVariant: 'v2',
                palette: 'warm_kuliner',
                hookStyle: 'tilt_card',
                subtitleStyle: 'karaoke_block',
            },
            v3: {
                label: 'v3 — Promo Slam & Pop Scale',
                description: 'Gaya promo kuliner/bundling hemat dengan energi tinggi.',
                themeStyle: 'viral',
                cardStyle: 'StackSlam',
                hookVariant: 'v3',
                badgeStyle: 'stamp',
                captionStyle: 'pop_scale',
                captionVariant: 'v3',
                hookTransition: 'flash_zoom',
                clipTransition: 'flash_zoom',
                transitionVariant: 'v3',
                palette: 'warm_kuliner',
                hookStyle: 'stack_slam',
                subtitleStyle: 'pop_scale',
            },
        },
    },
    muslim_hampers: {
        id: 'muslim_hampers',
        name: 'Muslim Fashion & Hampers',
        description: 'Palet hijau sage & emas hangat dengan tipografi bersih untuk fashion muslim, mukena, dan hampers.',
        themeStyle: 'pastel',
        cardStyle: 'FloatingTag',
        hookVariant: 'v1',
        badgeStyle: 'glass',
        captionStyle: 'glass_pill',
        captionVariant: 'v1',
        hookTransition: 'light_leak',
        clipTransition: 'blur_zoom',
        transitionVariant: 'v1',
        palette: 'sage_hampers',
        hookStyle: 'floating_tag',
        subtitleStyle: 'glass_pill',
        versions: {
            v1: {
                label: 'v1 — Sage Boutique Tag & Glass Pill',
                description: 'Label butik mengambang dengan aksen emas hangat dan subtitle kapsul kaca lembut.',
                themeStyle: 'pastel',
                cardStyle: 'FloatingTag',
                hookVariant: 'v1',
                badgeStyle: 'glass',
                captionStyle: 'glass_pill',
                captionVariant: 'v1',
                hookTransition: 'light_leak',
                clipTransition: 'blur_zoom',
                transitionVariant: 'v1',
                palette: 'sage_hampers',
                hookStyle: 'floating_tag',
                subtitleStyle: 'glass_pill',
            },
            v2: {
                label: 'v2 — Editorial Mask Wipe & Highlighter',
                description: 'Tirai editorial membuka headline dengan sorotan stabilo lembut.',
                themeStyle: 'pastel',
                cardStyle: 'MaskWipe',
                hookVariant: 'v2',
                badgeStyle: 'marker',
                captionStyle: 'highlighter_bar',
                captionVariant: 'v2',
                hookTransition: 'split_wipe',
                clipTransition: 'light_leak',
                transitionVariant: 'v2',
                palette: 'sage_hampers',
                hookStyle: 'mask_wipe',
                subtitleStyle: 'highlighter_bar',
            },
            v3: {
                label: 'v3 — Catalog Typewriter & Fill Sweep',
                description: 'Tampilan katalog koleksi Lebaran/hampers dengan sapuan warna teks halus.',
                themeStyle: 'minimal',
                cardStyle: 'MarkerHighlight',
                hookVariant: 'v3',
                badgeStyle: 'outline',
                captionStyle: 'fill_sweep',
                captionVariant: 'v3',
                hookTransition: 'shutter',
                clipTransition: 'split_wipe',
                transitionVariant: 'v3',
                palette: 'sage_hampers',
                hookStyle: 'marker_highlight',
                subtitleStyle: 'fill_sweep',
            },
        },
    },
};

const PRESET_DEFAULT_PALETTE: Record<PresetId, string> = {
    skincare: 'pastel_rose',
    gadget: 'tech_blue',
    flash_sale: 'sale_yellow',
    lifestyle: 'pastel_rose',
    household: 'fresh_mint',
    parenting: 'fresh_mint',
    podcast_hook: 'ink_mono',
    luxury: 'ink_mono',
    food_kuliner: 'warm_kuliner',
    muslim_hampers: 'sage_hampers',
};

const PRESET_ALIASES: Record<string, PresetId> = {
    skincare: 'skincare',
    beauty: 'skincare',
    clean_beauty: 'skincare',
    beauty_skincare: 'skincare',
    aestheticminimal: 'luxury',
    aesthetic_minimal: 'luxury',
    luxury: 'luxury',
    gadget: 'gadget',
    tech: 'gadget',
    gadget_tech: 'gadget',
    flash_sale: 'flash_sale',
    flashsale: 'flash_sale',
    flash_sale_viral: 'flash_sale',
    highenergyaffiliate: 'flash_sale',
    high_energy_affiliate: 'flash_sale',
    lifestyle: 'lifestyle',
    fashion_lifestyle: 'lifestyle',
    household: 'household',
    cleanbookreview: 'household',
    clean_book_review: 'household',
    parenting: 'parenting',
    health_supplement: 'parenting',
    podcast_hook: 'podcast_hook',
    problem_solution: 'podcast_hook',
    darkpodcasthook: 'podcast_hook',
    dark_podcast_hook: 'podcast_hook',
    food_kuliner: 'food_kuliner',
    kuliner: 'food_kuliner',
    food: 'food_kuliner',
    muslim_hampers: 'muslim_hampers',
    hampers: 'muslim_hampers',
    muslim: 'muslim_hampers',
};

/**
 * Menerima nama preset seperti `"skincare"`, `"flash_sale:v2"`, atau `"HighEnergyAffiliate"`.
 */
export const resolvePreset = (raw?: string, versionRaw?: string): PresetVersionConfig | undefined => {
    if (!raw) return undefined;
    const parts = raw.trim().split(':');
    const rawKey = parts[0].toLowerCase().trim().replace(/[-\s]/g, '_');
    const inlineVer = parts[1] ? resolveVariantVersion(parts[1]) : undefined;
    const presetId = PRESET_ALIASES[rawKey];
    if (!presetId) return undefined;
    const base = PRESETS[presetId];
    if (!base) return undefined;
    const ver = resolveVariantVersion(versionRaw || inlineVer, 'v1');
    const chosen = base.versions[ver] || base.versions.v1;
    return {
        ...chosen,
        palette: chosen.palette || base.palette || PRESET_DEFAULT_PALETTE[presetId],
        hookStyle: chosen.hookStyle || base.hookStyle,
        subtitleStyle: chosen.subtitleStyle || base.subtitleStyle,
    };
};
