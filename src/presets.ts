/**
 * Preset desain: satu pilihan menggantikan kombinasi tema x layout hook x gaya subtitle.
 *
 * Field eksplisit di JSON (themeStyle / cardStyle / badgeStyle / captionStyle) selalu menang atas preset,
 * jadi preset hanya mengisi nilai yang belum ditentukan.
 *
 * Layout hook (cardStyle) yang tersedia:
 *   baru  : sticky_note, receipt, chat_thread, type_stack, label_tape, quiet_serif
 *   lama  : unified_glass, editorial_minimal, creator_aesthetic, clean_capsule,
 *           tiktok_native_ugc, top_banner_promo
 *
 * Gaya subtitle (captionStyle): outline_pop, marker_sweep, reveal, plate
 */
export type PresetId =
    | 'skincare'
    | 'gadget'
    | 'flash_sale'
    | 'lifestyle'
    | 'household'
    | 'parenting';

export interface DesignPreset {
    id: PresetId;
    name: string;
    description: string;
    themeStyle: string;
    cardStyle: string;
    badgeStyle: string;
    captionStyle: string;
}

export const PRESETS: Record<PresetId, DesignPreset> = {
    skincare: {
        id: 'skincare',
        name: 'Skincare',
        description: 'Serif italic besar, satu garis tipis, subtitle muncul tenang kata demi kata.',
        themeStyle: 'pastel',
        cardStyle: 'quiet_serif',
        badgeStyle: 'marker',
        captionStyle: 'reveal',
    },
    gadget: {
        id: 'gadget',
        name: 'Gadget',
        description: 'Pita label-maker tercetak per baris, subtitle berkontur tegas.',
        themeStyle: 'editorial',
        cardStyle: 'label_tape',
        badgeStyle: 'alert',
        captionStyle: 'outline_pop',
    },
    flash_sale: {
        id: 'flash_sale',
        name: 'Flash Sale',
        description: 'Struk thermal dicetak, total dalam blok terbalik, subtitle dengan sapuan stabilo.',
        themeStyle: 'flash_sale',
        cardStyle: 'receipt',
        badgeStyle: 'sticker',
        captionStyle: 'marker_sweep',
    },
    lifestyle: {
        id: 'lifestyle',
        name: 'Lifestyle',
        description: 'Tipografi poster tanpa kotak, kata naik dari topeng, garis tangan di bawah judul.',
        themeStyle: 'minimal',
        cardStyle: 'type_stack',
        badgeStyle: 'sticker',
        captionStyle: 'outline_pop',
    },
    household: {
        id: 'household',
        name: 'Rumah tangga',
        description: 'Catatan tempel tulisan tangan dengan selotip, untuk produk dapur dan perlengkapan rumah.',
        themeStyle: 'minimal',
        cardStyle: 'sticky_note',
        badgeStyle: 'sticker',
        captionStyle: 'outline_pop',
    },
    parenting: {
        id: 'parenting',
        name: 'Ibu & bayi',
        description: 'Percakapan chat: pertanyaan masuk, jawabanmu membalas. Hangat dan personal.',
        themeStyle: 'pastel',
        cardStyle: 'chat_thread',
        badgeStyle: 'glass',
        captionStyle: 'reveal',
    },
};

export const resolvePreset = (raw?: string): DesignPreset | undefined => {
    if (!raw) return undefined;
    const key = raw.toLowerCase().trim().replace(/[-\s]/g, '_') as PresetId;
    return PRESETS[key];
};
