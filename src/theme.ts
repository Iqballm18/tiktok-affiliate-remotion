import { Easing, SpringConfig } from 'remotion';

export type ThemeStyle = 'editorial' | 'pastel' | 'flash_sale' | 'minimal';

export interface ThemeColors {
    bg: string;
    surface: string;
    surfaceBorder: string;
    boxShadow: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    accentText: string;
    ctaBg: string;
    ctaText: string;
    ctaSubtext: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    indicatorColor: string;
    highlightBg: string;
    highlightText: string;
    solutionHighlightBg: string;
    solutionHighlightText: string;
    scrimTop: string;
    scrimBottom: string;
    vignetteColor: string;
}

export interface ThemeDefinition {
    id: ThemeStyle;
    name: string;
    colors: ThemeColors;
    fonts: {
        display: string;
        mono: string;
    };
    springs: {
        snappy: SpringConfig;
        smooth: SpringConfig;
        pill: SpringConfig;
    };
    easings: {
        outExpo: (t: number) => number;
        inCubic: (t: number) => number;
    };
}

const sharedEasings = {
    outExpo: Easing.bezier(0.16, 1, 0.3, 1),
    inCubic: Easing.bezier(0.32, 0, 0.67, 0),
};

const sharedFonts = {
    display: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", monospace',
};

export const THEMES: Record<ThemeStyle, ThemeDefinition> = {
    // ==========================================
    // 1. EDITORIAL (Tech, Gadget, Elegan Gelap)
    // ==========================================
    editorial: {
        id: 'editorial',
        name: 'Editorial Dark',
        colors: {
            bg: '#090A0F',
            surface: 'rgba(12, 14, 20, 0.78)',
            surfaceBorder: 'rgba(255, 255, 255, 0.16)',
            boxShadow: '0 24px 50px rgba(0, 0, 0, 0.55)',
            textPrimary: '#F8FAFC',
            textMuted: '#94A3B8',
            accent: '#E2FF32',         // Acid Lime
            accentText: '#090A0F',
            ctaBg: 'rgba(12, 14, 20, 0.88)',
            ctaText: '#F8FAFC',
            ctaSubtext: '#E2FF32',
            badgeBg: 'rgba(12, 14, 20, 0.88)',
            badgeBorder: 'rgba(226, 255, 50, 0.45)',
            badgeText: '#F8FAFC',
            indicatorColor: '#E2FF32',
            highlightBg: '#E2FF32',
            highlightText: '#090A0F',
            solutionHighlightBg: '#FFFFFF',
            solutionHighlightText: '#090A0F',
            scrimTop: 'rgba(9, 10, 15, 0.16)',
            scrimBottom: 'rgba(9, 10, 15, 0.20)',
            vignetteColor: 'rgba(0, 0, 0, 0.12)',
        },
        fonts: sharedFonts,
        springs: {
            snappy: { damping: 16, stiffness: 220, mass: 0.7 } as SpringConfig,
            smooth: { damping: 22, stiffness: 140, mass: 0.9 } as SpringConfig,
            pill: { damping: 14, stiffness: 180, mass: 0.6 } as SpringConfig,
        },
        easings: sharedEasings,
    },

    // ==========================================
    // 2. PASTEL (Clean Beauty, Skincare, Tumbler Aesthetic)
    // ==========================================
    pastel: {
        id: 'pastel',
        name: 'Pastel Clean Beauty',
        colors: {
            bg: '#F8FAFC',
            surface: 'rgba(255, 255, 255, 0.88)',
            surfaceBorder: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 20px 45px rgba(225, 29, 72, 0.10), 0 8px 24px rgba(0, 0, 0, 0.08)',
            textPrimary: '#0F172A',     // Charcoal gelap pekat (sangat terbaca)
            textMuted: '#64748B',
            accent: '#FF4D6D',         // Soft Rose Coral
            accentText: '#FFFFFF',
            ctaBg: 'rgba(255, 255, 255, 0.94)',
            ctaText: '#0F172A',
            ctaSubtext: '#FF4D6D',
            badgeBg: 'rgba(255, 255, 255, 0.95)',
            badgeBorder: 'rgba(255, 77, 109, 0.35)',
            badgeText: '#E11D48',
            indicatorColor: '#FF4D6D',
            highlightBg: 'linear-gradient(135deg, #FF4D6D 0%, #FF758F 100%)',
            highlightText: '#FFFFFF',
            solutionHighlightBg: '#0F172A',
            solutionHighlightText: '#FFFFFF',
            scrimTop: 'rgba(15, 23, 42, 0.10)',
            scrimBottom: 'rgba(15, 23, 42, 0.15)',
            vignetteColor: 'rgba(255, 255, 255, 0.08)',
        },
        fonts: sharedFonts,
        springs: {
            snappy: { damping: 18, stiffness: 200, mass: 0.7 } as SpringConfig,
            smooth: { damping: 24, stiffness: 130, mass: 0.9 } as SpringConfig,
            pill: { damping: 15, stiffness: 170, mass: 0.6 } as SpringConfig,
        },
        easings: sharedEasings,
    },

    // ==========================================
    // 3. FLASH SALE (E-Commerce Promo / High-Energy Viral)
    // Tampilan modern & bold (Crimson Ember + Golden Highlight)
    // ==========================================
    flash_sale: {
        id: 'flash_sale',
        name: 'Flash Sale Viral Pro',
        colors: {
            bg: '#0A0A0D',
            surface: 'rgba(16, 14, 20, 0.82)',
            surfaceBorder: 'rgba(255, 46, 84, 0.28)',
            boxShadow: '0 24px 50px rgba(0, 0, 0, 0.55), 0 0 35px rgba(255, 46, 84, 0.15)',
            textPrimary: '#FFFFFF',
            textMuted: '#CBD5E1',
            accent: '#FF2E54',         // TikTok Coral Crimson
            accentText: '#FFFFFF',
            ctaBg: 'linear-gradient(135deg, #FF2E54 0%, #FF4D30 100%)',
            ctaText: '#FFFFFF',
            ctaSubtext: '#FFDE59',     // Gold checkout highlight
            badgeBg: 'rgba(18, 18, 24, 0.88)',
            badgeBorder: 'rgba(255, 46, 84, 0.65)',
            badgeText: '#FFFFFF',
            indicatorColor: '#FFDE59',
            highlightBg: 'linear-gradient(135deg, #FF2E54 0%, #FF5A36 100%)',
            highlightText: '#FFFFFF',
            solutionHighlightBg: 'linear-gradient(135deg, #FF8C00 0%, #FF3D00 100%)',
            solutionHighlightText: '#FFFFFF',
            scrimTop: 'rgba(10, 10, 14, 0.16)',
            scrimBottom: 'rgba(10, 10, 14, 0.22)',
            vignetteColor: 'rgba(0, 0, 0, 0.16)', // Bersih tanpa haze pink murahan
        },
        fonts: sharedFonts,
        springs: {
            snappy: { damping: 18, stiffness: 220, mass: 0.65 } as SpringConfig, // Snappy & energetic tanpa goyang berlebih
            smooth: { damping: 22, stiffness: 150, mass: 0.85 } as SpringConfig,
            pill: { damping: 16, stiffness: 190, mass: 0.6 } as SpringConfig,
        },
        easings: sharedEasings,
    },

    // ==========================================
    // 4. MINIMAL (Clean Luxury Monochrome / Fashion)
    // ==========================================
    minimal: {
        id: 'minimal',
        name: 'Minimalist Monochrome',
        colors: {
            bg: '#000000',
            surface: 'rgba(0, 0, 0, 0.55)',
            surfaceBorder: 'rgba(255, 255, 255, 0.25)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.50)',
            textPrimary: '#FFFFFF',
            textMuted: '#CBD5E1',
            accent: '#FFFFFF',
            accentText: '#000000',
            ctaBg: 'rgba(15, 15, 20, 0.88)',
            ctaText: '#FFFFFF',
            ctaSubtext: '#E2E8F0',
            badgeBg: 'rgba(0, 0, 0, 0.65)',
            badgeBorder: 'rgba(255, 255, 255, 0.35)',
            badgeText: '#FFFFFF',
            indicatorColor: '#FFFFFF',
            highlightBg: '#FFFFFF',
            highlightText: '#000000',
            solutionHighlightBg: '#FFFFFF',
            solutionHighlightText: '#000000',
            scrimTop: 'rgba(0, 0, 0, 0.12)',
            scrimBottom: 'rgba(0, 0, 0, 0.16)',
            vignetteColor: 'rgba(0, 0, 0, 0.10)',
        },
        fonts: sharedFonts,
        springs: {
            snappy: { damping: 16, stiffness: 200, mass: 0.7 } as SpringConfig,
            smooth: { damping: 22, stiffness: 140, mass: 0.9 } as SpringConfig,
            pill: { damping: 14, stiffness: 180, mass: 0.6 } as SpringConfig,
        },
        easings: sharedEasings,
    },
};

export const getTheme = (style?: string): ThemeDefinition => {
    if (!style) return THEMES.editorial;

    const normalized = style.toLowerCase().trim().replace(/[-\s]/g, '_');

    switch (normalized) {
        case 'pastel':
        case 'clean_beauty':
        case 'skincare':
        case 'beauty':
            return THEMES.pastel;

        case 'flash_sale':
        case 'flashsale':
        case 'promo':
        case 'diskon':
        case 'hard_sell':
            return THEMES.flash_sale;

        case 'minimal':
        case 'minimalist':
        case 'luxury':
        case 'monochrome':
            return THEMES.minimal;

        case 'editorial':
        case 'tech':
        case 'dark':
        default:
            return THEMES.editorial;
    }
};

// Default export untuk backward compatibility
export const THEME = THEMES.editorial;
