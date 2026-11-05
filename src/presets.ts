/**
 * Preset desain: satu pilihan menggantikan kombinasi 4 tema x 6 gaya kartu x 4 gaya badge.
 *
 * Field eksplisit di JSON (themeStyle / cardStyle / badgeStyle) selalu menang atas preset,
 * jadi preset hanya mengisi nilai yang belum ditentukan.
 */
export type PresetId = 'skincare' | 'gadget' | 'flash_sale' | 'lifestyle';

export interface DesignPreset {
    id: PresetId;
    name: string;
    description: string;
    themeStyle: string;
    cardStyle: string;
    badgeStyle: string;
}

export const PRESETS: Record<PresetId, DesignPreset> = {
    skincare: {
        id: 'skincare',
        name: 'Skincare',
        description: 'Pastel lembut, teks mengambang ala kreator, badge stabilo.',
        themeStyle: 'pastel',
        cardStyle: 'creator_aesthetic',
        badgeStyle: 'marker',
    },
    gadget: {
        id: 'gadget',
        name: 'Gadget',
        description: 'Editorial gelap dengan aksen lime, badge ala LIVE.',
        themeStyle: 'editorial',
        cardStyle: 'editorial_minimal',
        badgeStyle: 'alert',
    },
    flash_sale: {
        id: 'flash_sale',
        name: 'Flash Sale',
        description: 'Merah-emas berenergi tinggi, highlight kuning stabilo ala CapCut, badge stiker.',
        themeStyle: 'flash_sale',
        cardStyle: 'tiktok_native_ugc',
        badgeStyle: 'sticker',
    },
    lifestyle: {
        id: 'lifestyle',
        name: 'Lifestyle',
        description: 'Monokrom bersih untuk fashion, rumah, dan produk harian.',
        themeStyle: 'minimal',
        cardStyle: 'unified_glass',
        badgeStyle: 'sticker',
    },
};

export const resolvePreset = (raw?: string): DesignPreset | undefined => {
    if (!raw) return undefined;
    const key = raw.toLowerCase().trim().replace(/[-\s]/g, '_') as PresetId;
    return PRESETS[key];
};
