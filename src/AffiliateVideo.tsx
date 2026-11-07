import React from 'react';
import {
    AbsoluteFill,
    Sequence,
    OffthreadVideo,
    Audio,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    CalculateMetadataFunction,
} from 'remotion';
import { z } from 'zod';
import { getTheme, ThemeDefinition } from './theme';
import { TikTokSafeZone } from './components/TikTokSafeZone';
import { FloatingWatermark } from './components/FloatingWatermark';
import { HookSubtitle } from './components/HookSubtitle';
import { HookBadge, resolveBadgeVariant } from './components/HookBadge';
import { HeadlineLayout, resolveHookSelection } from './components/HookLayouts';
import { resolvePreset, resolveVariantVersion, VariantVersion } from './presets';
import { loadThemeFonts } from './load-theme-fonts';
import { FONT } from './load-hook-fonts';
import { Caption } from '@remotion/captions';
import { AffiliateHook, HookStyleName, HookStyles } from './affiliate-styles/hooks';
import { AffiliateSubtitles, SubtitleStyleName, SubtitleStyles, toSubWords } from './affiliate-styles/subtitles';
import { PALETTES, PaletteName, Palette } from './affiliate-styles/tokens';
import { DEFAULT_PRESET, PRESETS as STYLE_PRESETS } from './affiliate-styles/registry';

// Muat Inter + JetBrains Mono sekali saat bundle dibuka (render tetap menunggu via delayRender).
loadThemeFonts();

// Daftar transisi dipakai skema Zod (di bawah) sekaligus sistem transisi (LAYER 2).
export const TRANSITION_TYPES = [
    'zoom_flash', // zoom punch + lens flare (default hook)
    'whip_pan', // geser cepat + motion blur + streak
    'light_leak', // kebocoran cahaya hangat
    'glitch', // RGB-split, jitter, slice digital
    'blur_zoom', // zoom menembus + speed lines
    'push_up', // geser vertikal ala scroll TikTok
    'flash_cut', // kilatan putih + hard cut
    'shutter', // rana kamera menutup lalu membuka
    'split_wipe', // belahan layar menyapu dengan garis aksen (bang-motion)
    'iris_pop', // bukaan fokus lingkar kamera dari tengah (bang-motion)
    'tilt_whip', // banting sudut kamera miring + motion blur (bang-motion)
    'none',
] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];
export const timedSubtitleSchema = z.object({
    text: z.string(),
    startSec: z.number().optional(),
    endSec: z.number().optional(),
});

export const captionSchema = z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number(),
    timestampMs: z.number().nullable().default(null),
    confidence: z.number().nullable().default(null),
    pageBreakAfter: z.boolean().optional(),
});

export const clipItemSchema = z.object({
    src: z.string(),
    startSec: z.number(),
    endSec: z.number(),
    muted: z.boolean().optional(),
    volume: z.number().optional(),
    objectPosition: z.string().optional(),
    isPlaceholder: z.boolean().optional(),
});

export const affiliateSchema = z.object({
    // Preset desain: skincare | gadget | flash_sale | lifestyle | household | parenting | podcast_hook | luxury.
    // Mengisi themeStyle, cardStyle, hookVariant, badgeStyle, captionStyle, captionVariant, dan transisi yang kosong.
    // Field eksplisit di bawah selalu menang atas preset.
    preset: z.string().optional(),
    // Versi preset: v1 | v2 | v3.
    presetVariant: z.enum(['v1', 'v2', 'v3']).optional(),
    // Palet warna flat motion-graphics: pastel_rose | fresh_mint | sale_yellow | tech_blue | ink_mono
    palette: z.string().optional(),
    // Gaya animasi hook flat: marker_highlight | stack_slam | struck_swap | tilt_card | mask_wipe
    hookStyle: z.string().optional(),
    // Gaya subtitle kata-per-kata flat: karaoke_block | pop_scale | highlighter_bar | fill_sweep | typewriter_band | sticker_label
    subtitleStyle: z.string().optional(),
    themeStyle: z.string().optional(),
    // Layout hook. Baru: sticky_note | receipt | chat_thread | type_stack | label_tape | quiet_serif
    // (beserta alias spesifik: kinetic_pill, strike_box, white_catalog, comment_reply, grid_memo, paper_pocket, cyber_tape).
    // Lama: unified_glass | editorial_minimal | creator_aesthetic | clean_capsule | tiktok_native_ugc | top_banner_promo.
    cardStyle: z.string().optional(),
    // Versi desain hook di dalam cardStyle: v1 | v2 | v3.
    hookVariant: z.enum(['v1', 'v2', 'v3']).optional(),
    // Gaya subtitle: outline_pop | marker_sweep | reveal | plate (atau alias: pill_sparkle, under_draw, dim_focus, paper_ink).
    captionStyle: z.string().optional(),
    // Versi desain subtitle di dalam captionStyle: v1 | v2 | v3.
    captionVariant: z.enum(['v1', 'v2', 'v3']).optional(),
    // Alasan singkat pemilihan desain oleh Gemini. Hanya catatan, tidak memengaruhi render.
    designReason: z.string().optional(),
    // Gaya badge: sticker | alert | marker | glass. Kosong = otomatis (hook: sticker, demo & spec: glass).
    badgeStyle: z.string().optional(),
    showProgressBar: z.boolean().optional(),
    enableSfx: z.boolean().optional(),
    sfxPreset: z.enum(['viral', 'beauty', 'tech', 'minimal']).optional(),
    ctaSound: z.enum(['kaching', 'ding', 'glockenspiel', 'sparkle', 'notify']).optional(),
    // SFX khas per layout kartu hook (struk = tick printer, catatan tempel = kertas, chat = notifikasi). Default aktif.
    cardSfx: z.boolean().optional(),
    sfxVolume: z.number().optional(),
    showSafeZoneGuide: z.boolean().optional(),
    watermarkText: z.string().optional(),
    showWatermark: z.boolean().optional(),
    watermarkOpacity: z.number().optional(),
    watermarkPosition: z.enum(['floating', 'top_left', 'top_right', 'mid_left', 'mid_right']).optional(),
    bgmTrack: z.string().optional(),
    bgmVolume: z.number().optional(),
    unmuteHook: z.boolean().optional(),
    hookVolume: z.number().optional(),
    showHookHeadline: z.boolean().optional(),
    karaokeHighlight: z.boolean().optional(),
    // Transisi hook -> klip produk pertama. Lihat TRANSITION_TYPES.
    hookTransition: z.enum(TRANSITION_TYPES).optional(),
    // Transisi antarklip produk (demo -> spec -> CTA). 'auto' = dipilih dari preset SFX/tema & transitionVariant.
    clipTransition: z.enum([...TRANSITION_TYPES, 'auto']).optional(),
    // Versi gerak transisi: v1 | v2 | v3.
    transitionVariant: z.enum(['v1', 'v2', 'v3']).optional(),
    hookSubtitle: z.string().optional(),
    hookSubtitles: z.array(z.union([z.string(), timedSubtitleSchema])).optional(),
    hookCaptions: z.array(captionSchema).optional(),
    voiceOver: z.string().optional(),
    voiceOverVolume: z.number().optional(),
    voiceOverDelaySec: z.number().optional(),
    voiceOverCaptions: z.array(captionSchema).optional(),
    badgeText: z.string(),
    demoBadge: z.string().optional(),
    specBadge: z.string().optional(),
    hookLine1: z.string(),
    hookHighlight: z.string(),
    demoLine1: z.string(),
    demoHighlight: z.string(),
    specLine1: z.string(),
    specHighlight: z.string(),
    ctaText: z.string(),
    // Label kecil di atas teks CTA (mis. "PROMO 11.11"). Kosong = tidak ditampilkan.
    // Isi hanya jika klaimnya benar; klaim promo palsu bisa melanggar kebijakan iklan TikTok.
    ctaLabel: z.string().optional(),
    // Tag di ujung kanan strip top_banner_promo (mis. "STOK TERBATAS"). Kosong = tidak ditampilkan.
    urgencyTag: z.string().optional(),
    fps: z.number().optional(),
    clips: z.array(clipItemSchema),
});

export type ClipItem = z.infer<typeof clipItemSchema>;
export type AffiliateProps = z.infer<typeof affiliateSchema>;

export const defaultAffiliateProps: AffiliateProps = {
    themeStyle: 'editorial',
    cardStyle: 'unified_glass',
    showProgressBar: true,
    enableSfx: true,
    showSafeZoneGuide: false,
    watermarkText: '@inanikma_ | @spillbyna_',
    showWatermark: true,
    watermarkOpacity: 0.70,
    unmuteHook: false,
    hookVolume: 1.0,
    hookTransition: 'zoom_flash',
    badgeText: 'KAHF FACE WASH & SUNSCREEN 🔥',
    hookLine1: 'Wajah Kusam dan Berminyak?',
    hookHighlight: 'Bersihkan Pakai Kahf Ini Bro!',
    demoLine1: 'Busa Lembut Angkat Kotoran',
    demoHighlight: 'Bikin Kulit Segar Seharian',
    specLine1: 'Ekstrak Alami HydroBalance',
    specHighlight: 'Jaga Kelembapan Tanpa Kering',
    ctaText: 'Cek Promo di Keranjang Kuning',
    clips: [
        {
            src: 'sample.mp4',
            startSec: 0,
            endSec: 5,
            isPlaceholder: true,
        },
        {
            src: 'sample.mp4',
            startSec: 5,
            endSec: 12,
            isPlaceholder: true,
        },
        {
            src: 'sample.mp4',
            startSec: 12,
            endSec: 19,
            isPlaceholder: true,
        },
        {
            src: 'sample.mp4',
            startSec: 19,
            endSec: 24,
            isPlaceholder: true,
        },
    ],
};

export const calculateAffiliateMetadata: CalculateMetadataFunction<AffiliateProps> = ({ props }) => {
    const fps = props.fps || 60;
    const totalClipsSec = props.clips.reduce(
        (acc, c) => acc + Math.max(0, c.endSec - c.startSec),
        0
    );
    const durationInSeconds = Math.max(1, totalClipsSec);

    return {
        fps,
        durationInFrames: Math.round(durationInSeconds * fps),
    };
};

// ==========================================
// LAYER 0: RETENTION PROGRESS BAR (TikTok Story Style)
// ==========================================
const VideoProgressBar: React.FC<{
    theme: ThemeDefinition;
    durationInFrames: number;
}> = ({ theme, durationInFrames }) => {
    const frame = useCurrentFrame();
    const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
        extrapolateRight: 'clamp',
    });

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                zIndex: 200,
                overflow: 'hidden',
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: theme.colors.indicatorColor,
                    boxShadow: `0 0 16px ${theme.colors.indicatorColor}`,
                }}
            />
        </div>
    );
};

// ==========================================
// LAYER 4 & 5: COLOR GRADE + VIGNETTE
// ==========================================
const CinematicOverlays: React.FC<{ theme: ThemeDefinition }> = ({ theme }) => {
    return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
            {/* L4: Subtle Scrim adaptif mengikuti tema */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(
            180deg,
            ${theme.colors.scrimTop} 0%,
            rgba(0, 0, 0, 0.00) 25%,
            rgba(0, 0, 0, 0.00) 75%,
            ${theme.colors.scrimBottom} 100%
          )`,
                }}
            />

            {/* L5a: Soft Vignette */}
            <AbsoluteFill
                style={{
                    boxShadow: `inset 0 0 90px ${theme.colors.vignetteColor}`,
                }}
            />
        </AbsoluteFill>
    );
};

// ==========================================
// SISTEM TRANSISI (efek keluar klip A + efek masuk klip B + overlay + SFX)
// ==========================================
type ActiveTransition = Exclude<TransitionType, 'none'>;
type SfxPresetId = 'viral' | 'beauty' | 'tech' | 'minimal';

// Pilihan otomatis transisi antarklip produk (demo -> spec -> CTA) berdasarkan preset SFX/tema & transitionVariant.
const AUTO_CLIP_TRANSITION: Record<SfxPresetId, Record<VariantVersion, TransitionType>> = {
    beauty: { v1: 'light_leak', v2: 'shutter', v3: 'split_wipe' },
    tech: { v1: 'glitch', v2: 'split_wipe', v3: 'tilt_whip' },
    viral: { v1: 'push_up', v2: 'flash_cut', v3: 'whip_pan' },
    minimal: { v1: 'blur_zoom', v2: 'split_wipe', v3: 'shutter' },
};

// SFX per transisi. `at` = detik relatif ke titik cut (negatif = sebelum cut, agar puncak suara jatuh PAS di cut).
// Volume sudah disetel relatif antar-file (glitch.wav jauh lebih keras dari whoosh, jadi dikecilkan).
interface SfxCue {
    file: string;
    at: number;
    vol: number;
}
const TRANSITION_SFX: Record<TransitionType, SfxCue[]> = {
    zoom_flash: [
        { file: 'swish-fast', at: -0.117, vol: 0.55 },
        { file: 'boom-sub', at: 0, vol: 0.3 },
    ],
    whip_pan: [{ file: 'swish-fast', at: -0.117, vol: 0.55 }],
    light_leak: [{ file: 'shimmer-up', at: -0.12, vol: 0.35 }],
    glitch: [{ file: 'glitch', at: -0.1, vol: 0.38 }],
    blur_zoom: [
        { file: 'reverse-swell', at: -0.5, vol: 0.45 },
        { file: 'boom-sub', at: 0, vol: 0.4 },
    ],
    push_up: [{ file: 'swipe-soft', at: -0.1, vol: 0.6 }],
    flash_cut: [
        { file: 'swipe-soft', at: -0.08, vol: 0.4 },
        { file: 'boom-sub', at: 0, vol: 0.45 },
    ],
    shutter: [{ file: 'camera-shutter', at: -0.03, vol: 0.5 }],
    split_wipe: [
        { file: 'swipe-soft', at: -0.09, vol: 0.55 },
        { file: 'click-tactile', at: 0, vol: 0.38 },
    ],
    iris_pop: [
        { file: 'shimmer-up', at: -0.1, vol: 0.35 },
        { file: 'pop', at: 0, vol: 0.45 },
    ],
    tilt_whip: [
        { file: 'swish-fast', at: -0.11, vol: 0.55 },
        { file: 'boom-sub', at: 0, vol: 0.3 },
    ],
    none: [{ file: 'transition', at: 0, vol: 0.45 }],
};

// SFX khas layout kartu hook, diputar saat kartu muncul. Tipis & pendek: pelengkap, bukan fokus.
const CARD_SFX: Record<string, SfxCue[]> = {
    receipt: [
        { file: 'tick', at: 0.3, vol: 0.4 },
        { file: 'tick', at: 0.42, vol: 0.4 },
        { file: 'tick', at: 0.54, vol: 0.4 },
    ],
    promo_coupon: [
        { file: 'tick', at: 0.3, vol: 0.4 },
        { file: 'paper-flip', at: 0.45, vol: 0.45 },
    ],
    white_catalog: [{ file: 'click-tactile', at: 0.3, vol: 0.45 }],
    label_tape: [
        { file: 'tick', at: 0.3, vol: 0.45 },
        { file: 'tick', at: 0.5, vol: 0.45 },
    ],
    cyber_tape: [
        { file: 'click-tactile', at: 0.28, vol: 0.45 },
        { file: 'tick', at: 0.46, vol: 0.4 },
    ],
    sticky_note: [{ file: 'paper-flip', at: 0.25, vol: 0.45 }],
    grid_memo: [{ file: 'paper-flip', at: 0.25, vol: 0.45 }],
    chat_thread: [{ file: 'notify-ping', at: 0.35, vol: 0.4 }],
    comment_reply: [{ file: 'notify-ping', at: 0.28, vol: 0.45 }],
};

interface TransitionFx {
    scale: number;
    x: number;
    y: number;
    rotate: number;
    blur: number;
    brightness: number;
    hue: number;
    contrast: number;
    saturate: number;
}

// Noise deterministik per frame (render harus identik antar-run, jadi tidak boleh Math.random).
const frameNoise = (seed: number): number => {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Efek visual pada klip yang sedang KELUAR (frame mendekati akhir klip).
const computeOutFx = (
    type: TransitionType,
    frame: number,
    durationInFrames: number,
    fps: number,
    theme: ThemeDefinition,
    ver: VariantVersion = 'v1'
): Partial<TransitionFx> => {
    const outroDuration = Math.min(14, Math.round(0.22 * fps));
    const outroStart = Math.max(0, durationInFrames - outroDuration);
    const range: [number, number] = [outroStart, durationInFrames];
    const eased = { easing: theme.easings.inCubic, ...CLAMP };
    const dir = ver === 'v2' ? -1 : 1;

    switch (type) {
        case 'whip_pan':
            return {
                x: interpolate(frame, range, [0, -140 * dir], eased),
                y: ver === 'v3' ? interpolate(frame, range, [0, -70], eased) : 0,
                blur: interpolate(frame, range, [0, 8], CLAMP),
            };
        case 'tilt_whip':
            return {
                x: interpolate(frame, range, [0, -110 * dir], eased),
                rotate: interpolate(frame, range, [0, -4.5 * dir], eased),
                scale: interpolate(frame, range, [1.0, 1.12], eased),
                blur: interpolate(frame, range, [0, 9], CLAMP),
            };
        case 'split_wipe':
            return {
                x: ver === 'v3' ? 0 : interpolate(frame, range, [0, -45 * dir], eased),
                y: ver === 'v3' ? interpolate(frame, range, [0, -45], eased) : 0,
                scale: interpolate(frame, range, [1.0, 1.04], eased),
            };
        case 'iris_pop':
            return {
                scale: interpolate(frame, range, [1.0, ver === 'v2' ? 0.92 : 1.16], eased),
                blur: interpolate(frame, range, [0, 6], CLAMP),
            };
        case 'zoom_flash':
        case 'light_leak':
            return {
                scale: interpolate(frame, range, [1.0, ver === 'v2' ? 1.12 : 1.07], eased),
                blur: interpolate(frame, range, [0, 5], CLAMP),
            };
        case 'glitch': {
            const amp = interpolate(frame, range, [0, 1], CLAMP);
            return glitchFx(frame, amp * (ver === 'v2' ? 1.25 : 1));
        }
        case 'blur_zoom':
            return {
                scale: interpolate(frame, range, [1.0, ver === 'v2' ? 0.86 : 1.28], eased),
                blur: interpolate(frame, range, [0, 14], eased),
                brightness: interpolate(frame, range, [1.0, 1.12], CLAMP),
            };
        case 'push_up':
            return {
                y: interpolate(frame, range, [0, -260 * dir], eased),
                scale: ver === 'v3' ? interpolate(frame, range, [1.0, 0.94], eased) : 1,
                blur: interpolate(frame, range, [0, 6], CLAMP),
                brightness: interpolate(frame, range, [1.0, 0.8], CLAMP),
            };
        case 'flash_cut': {
            const r: [number, number] = [Math.max(0, durationInFrames - Math.round(0.1 * fps)), durationInFrames];
            return { brightness: interpolate(frame, r, [1.0, 1.9], eased) };
        }
        case 'shutter':
            return {
                scale: interpolate(frame, range, [1.0, 0.985], eased),
                brightness: interpolate(frame, range, [1.0, 0.5], eased),
            };
        default:
            return {};
    }
};

// Efek visual pada klip yang sedang MASUK (frame awal klip).
const computeInFx = (
    type: TransitionType,
    frame: number,
    fps: number,
    theme: ThemeDefinition,
    ver: VariantVersion = 'v1'
): Partial<TransitionFx> => {
    const introDuration = Math.min(14, Math.round(0.24 * fps));
    const settle = Math.round(0.12 * fps);
    const easedIntro = { easing: theme.easings.outExpo, extrapolateRight: 'clamp' } as const;
    const dir = ver === 'v2' ? -1 : 1;

    switch (type) {
        case 'whip_pan':
            return {
                x: interpolate(frame, [0, introDuration], [140 * dir, 0], easedIntro),
                y: ver === 'v3' ? interpolate(frame, [0, introDuration], [70, 0], easedIntro) : 0,
                blur: interpolate(frame, [0, introDuration], [8, 0], easedIntro),
                brightness: interpolate(frame, [0, settle], [1.25, 1.0], easedIntro),
            };
        case 'tilt_whip':
            return {
                x: interpolate(frame, [0, introDuration], [110 * dir, 0], easedIntro),
                rotate: interpolate(frame, [0, introDuration], [4.5 * dir, 0], easedIntro),
                scale: interpolate(frame, [0, introDuration], [1.14, 1.0], easedIntro),
                blur: interpolate(frame, [0, introDuration], [9, 0], easedIntro),
            };
        case 'split_wipe':
            return {
                x: ver === 'v3' ? 0 : interpolate(frame, [0, introDuration], [50 * dir, 0], easedIntro),
                y: ver === 'v3' ? interpolate(frame, [0, introDuration], [50, 0], easedIntro) : 0,
                scale: interpolate(frame, [0, introDuration], [1.06, 1.0], easedIntro),
                brightness: interpolate(frame, [0, settle], [1.18, 1.0], easedIntro),
            };
        case 'iris_pop': {
            const popSpring = spring({
                fps,
                frame,
                config: { damping: 14, mass: 0.7, stiffness: 220 },
            });
            return {
                scale: interpolate(popSpring, [0, 1], [ver === 'v2' ? 1.18 : 0.9, 1.0], { extrapolateRight: 'clamp' }),
                blur: interpolate(frame, [0, settle], [6, 0], easedIntro),
                brightness: interpolate(frame, [0, settle], [1.22, 1.0], easedIntro),
            };
        }
        case 'zoom_flash':
        case 'light_leak': {
            const settleSpring = spring({
                fps,
                frame,
                config: { damping: 16, mass: 0.75, stiffness: 210 },
            });
            return {
                scale: interpolate(settleSpring, [0, 1], [ver === 'v2' ? 1.14 : 1.09, 1.0], { extrapolateRight: 'clamp' }),
                blur: interpolate(frame, [0, settle], [7, 0], easedIntro),
                brightness: interpolate(frame, [0, settle], [1.32, 1.0], easedIntro),
            };
        }
        case 'glitch': {
            const amp = 1 - interpolate(frame, [0, introDuration], [0, 1], CLAMP);
            return { ...glitchFx(frame, amp * (ver === 'v2' ? 1.25 : 1)), brightness: 1 + amp * 0.25 };
        }
        case 'blur_zoom':
            return {
                scale: interpolate(frame, [0, introDuration], [ver === 'v2' ? 0.86 : 1.28, 1.0], easedIntro),
                blur: interpolate(frame, [0, introDuration], [14, 0], easedIntro),
                brightness: interpolate(frame, [0, introDuration], [1.2, 1.0], easedIntro),
            };
        case 'push_up':
            return {
                y: interpolate(frame, [0, introDuration], [260 * dir, 0], easedIntro),
                scale: ver === 'v3' ? interpolate(frame, [0, introDuration], [1.06, 1.0], easedIntro) : 1,
                blur: interpolate(frame, [0, introDuration], [6, 0], easedIntro),
                brightness: interpolate(frame, [0, introDuration], [0.85, 1.0], easedIntro),
            };
        case 'flash_cut':
            return {
                scale: interpolate(frame, [0, Math.round(0.14 * fps)], [1.05, 1.0], easedIntro),
                brightness: interpolate(frame, [0, Math.round(0.14 * fps)], [2.4, 1.0], easedIntro),
            };
        case 'shutter':
            return {
                scale: interpolate(frame, [0, introDuration], [1.05, 1.0], easedIntro),
                brightness: interpolate(frame, [0, introDuration], [0.4, 1.0], easedIntro),
            };
        default:
            return {
                scale: interpolate(frame, [0, Math.round(0.1 * fps)], [1.03, 1.0], easedIntro),
                brightness: interpolate(frame, [0, Math.round(0.08 * fps)], [1.16, 1.0], easedIntro),
            };
    }
};

// Glitch dipakai dua arah (keluar: amp naik, masuk: amp turun) dengan formula yang sama.
const glitchFx = (frame: number, amp: number): Partial<TransitionFx> => ({
    x: (frameNoise(frame) - 0.5) * 2 * amp * 46,
    y: (frameNoise(frame + 91) - 0.5) * amp * 14,
    scale: 1 + amp * 0.03 * frameNoise(frame + 53),
    hue: (frameNoise(frame + 37) - 0.5) * amp * 70,
    contrast: 1 + amp * 0.35,
    saturate: 1 + amp * 0.8,
    blur: amp * 1.5,
});

// Gabungkan efek keluar + masuk. Di luar jendelanya masing-masing, hasil interpolate yang
// di-clamp otomatis netral, jadi keduanya aman dihitung setiap frame.
const composeFx = (
    inType: TransitionType | undefined,
    outType: TransitionType | undefined,
    frame: number,
    durationInFrames: number,
    fps: number,
    theme: ThemeDefinition,
    ver: VariantVersion = 'v1'
): TransitionFx => {
    const fx: TransitionFx = { scale: 1, x: 0, y: 0, rotate: 0, blur: 0, brightness: 1, hue: 0, contrast: 1, saturate: 1 };
    const merge = (p: Partial<TransitionFx>) => {
        if (p.scale !== undefined) fx.scale *= p.scale;
        if (p.x !== undefined) fx.x += p.x;
        if (p.y !== undefined) fx.y += p.y;
        if (p.rotate !== undefined) fx.rotate += p.rotate;
        if (p.blur !== undefined) fx.blur = Math.max(fx.blur, p.blur);
        if (p.brightness !== undefined) fx.brightness *= p.brightness;
        if (p.hue !== undefined) fx.hue += p.hue;
        if (p.contrast !== undefined) fx.contrast *= p.contrast;
        if (p.saturate !== undefined) fx.saturate *= p.saturate;
    };
    if (outType && outType !== 'none') merge(computeOutFx(outType, frame, durationInFrames, fps, theme, ver));
    if (inType) merge(computeInFx(inType, frame, fps, theme, ver));
    return fx;
};

// ==========================================
// LAYER 2: FOOTAGE DENGAN SUBTLE KEN BURNS & TRANSISI DINAMIS
// ==========================================
// ==========================================
// DYNAMIC KEYWORD PUNCH-IN ZOOM HELPER
// ==========================================
const KEYWORD_PUNCH_REGEX = /(\d+|wajib|parah|diskon|promo|hemat|murah|gratis|ampuh|solusi|nyesel|racun|viral|keranjang|habis|terbukti|langsung|praktis|awet|wangi|bersih|glowing|kuat|bebas|cepat|instan|asli|resmi|bpom)/i;

function computeKeywordPunchScale(
    globalFrame: number,
    fps: number,
    voStartFrame: number,
    captions?: Caption[]
): number {
    if (!captions || captions.length === 0 || globalFrame < voStartFrame) {
        return 1.0;
    }
    const currentMs = ((globalFrame - voStartFrame) / fps) * 1000;

    // Pilih kata kunci pemicu dengan jeda minimal 2400ms agar tidak berkedip terlalu rapat
    let lastTriggerMs = -9999;
    for (const c of captions) {
        const cleanWord = (c.text || '').trim();
        if (!cleanWord) continue;
        if (c.startMs - lastTriggerMs < 2400) continue;

        if (KEYWORD_PUNCH_REGEX.test(cleanWord)) {
            lastTriggerMs = c.startMs;
            const elapsed = currentMs - c.startMs;
            const punchDurationMs = 620;
            if (elapsed >= 0 && elapsed <= punchDurationMs) {
                return interpolate(
                    elapsed,
                    [0, 140, 380, punchDurationMs],
                    [1.0, 1.055, 1.05, 1.0],
                    {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    }
                );
            }
        }
    }
    return 1.0;
}

const FootageClip: React.FC<{
    clip: ClipItem;
    durationInFrames: number;
    theme: ThemeDefinition;
    isHookClip?: boolean;
    isFirstProductClip?: boolean;
    // Transisi di awal klip ini (dari klip sebelumnya). undefined = tanpa efek masuk, 'none' = cut standar.
    inType?: TransitionType;
    // Transisi di akhir klip ini (ke klip berikutnya). undefined/'none' = tanpa efek keluar.
    outType?: TransitionType;
    transitionVariant?: VariantVersion;
    clipStartFrame?: number;
    voStartFrame?: number;
    captions?: Caption[];
}> = ({
    clip,
    durationInFrames,
    theme,
    isHookClip,
    isFirstProductClip,
    inType,
    outType,
    transitionVariant = 'v1',
    clipStartFrame = 0,
    voStartFrame = 0,
    captions,
}) => {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();

        // Continuous Ken Burns: Smooth linear push-in / pull-out across the entire clip duration
        // Alternating motion so footage never feels like a static screenshot
        const kenBurnsScale = isHookClip
            ? interpolate(frame, [0, durationInFrames], [1.00, 1.06], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            })
            : isFirstProductClip
                ? interpolate(frame, [0, durationInFrames], [1.01, 1.065], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                })
                : interpolate(frame, [0, durationInFrames], [1.055, 1.01], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });

        // Subtle organic vertical drift so the footage breathes continuously
        const driftY = interpolate(
            frame,
            [0, durationInFrames],
            [0, isFirstProductClip ? -14 : 14],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

        const fx = composeFx(inType, outType, frame, durationInFrames, fps, theme, transitionVariant);

        // Dynamic Keyword Punch-In Zoom saat kata kunci penting diucapkan oleh Voice Over
        const keywordPunch = computeKeywordPunchScale(
            clipStartFrame + frame,
            fps,
            voStartFrame,
            captions
        );

        // Default: muted: true jika tidak didefinisikan (agar rekaman b-roll produk hening tanpa noise),
        // atau muted: false jika klip memiliki suara penting (seperti klip podcast/YouTube sebagai hook)
        const isMuted = clip.muted !== false;
        const clipVolume = clip.volume ?? (isMuted ? 0 : 1);
        const objectPosition = clip.objectPosition || 'center';

        // Audio Easing & Fade-out untuk klip bersuara (podcast/YouTube hook):
        // Fade-in di 6 frame pertama dan fade-out di 15 frame terakhir (0.25 detik)
        // agar dialog narasumber tidak terputus secara mendadak/kasar saat transisi ke klip produk
        const fadeOutFrames = Math.min(Math.round(0.25 * fps), Math.round(durationInFrames * 0.2));
        const fadeInFrames = Math.min(Math.round(0.1 * fps), 6);

        const audioFade = interpolate(
            frame,
            [0, fadeInFrames, Math.max(fadeInFrames, durationInFrames - fadeOutFrames), durationInFrames],
            [0, 1, 1, 0],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

        const effectiveVolume = isMuted ? 0 : clipVolume * audioFade;

        return (
            <AbsoluteFill
                style={{
                    transform: `scale(${kenBurnsScale * fx.scale * keywordPunch}) translateX(${fx.x}px) translateY(${driftY + fx.y}px) rotate(${fx.rotate}deg)`,
                    filter: [
                        `brightness(${fx.brightness})`,
                        fx.blur > 0 ? `blur(${fx.blur}px)` : '',
                        fx.hue !== 0 ? `hue-rotate(${fx.hue}deg)` : '',
                        fx.contrast !== 1 ? `contrast(${fx.contrast})` : '',
                        fx.saturate !== 1 ? `saturate(${fx.saturate})` : '',
                    ]
                        .filter(Boolean)
                        .join(' '),
                }}
            >
                {clip.isPlaceholder || !clip.src ? (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 100%), ${theme.colors.bg}`,
                            color: theme.colors.textPrimary,
                            fontFamily: theme.fonts.display,
                            padding: 40,
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
                        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Pratinjau Footage Video
                        </div>
                        <div style={{ fontSize: 16, marginTop: 8, opacity: 0.65, fontFamily: theme.fonts.display }}>
                            {clip.src ? `File '${clip.src}' belum diunggah` : 'Placeholder Klip'}
                        </div>
                    </div>
                ) : (
                    <OffthreadVideo
                        src={staticFile(clip.src)}
                        startFrom={Math.round(clip.startSec * fps)}
                        endAt={Math.round(clip.endSec * fps)}
                        muted={isMuted}
                        volume={effectiveVolume}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition,
                        }}
                    />
                )}
            </AbsoluteFill>
        );
    };

// ==========================================
// LAYER 2.5: OVERLAY TRANSISI (hook -> produk dan antarklip produk)
// ==========================================
// Durasi overlay dalam detik (0.3s = 18 frame @60fps), puncak tepat di titik cut (0.133s = 8 frame).
const TRANSITION_OVERLAY_SEC = 0.3;
const TRANSITION_PEAK_SEC = 0.1333;
const transitionOverlayFrames = (fps: number) => Math.round(TRANSITION_OVERLAY_SEC * fps);
const transitionPeakFrames = (fps: number) => Math.round(TRANSITION_PEAK_SEC * fps);

const TransitionOverlay: React.FC<{
    theme: ThemeDefinition;
    type: ActiveTransition;
    version?: VariantVersion;
}> = ({ theme, type, version = 'v1' }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const midPoint = transitionPeakFrames(fps);
    const totalFrames = transitionOverlayFrames(fps);

    // Naik ke puncak di midPoint lalu turun: 0 -> 1 -> 0
    const pulse = interpolate(frame, [0, midPoint, totalFrames], [0, 1, 0], CLAMP);

    if (type === 'split_wipe') {
        const sweep = interpolate(frame, [0, totalFrames], [-15, 115], CLAMP);
        const angle = version === 'v2' ? -16 : version === 'v3' ? 90 : 0;
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '-25%',
                        bottom: '-25%',
                        left: `${sweep}%`,
                        width: 90,
                        marginLeft: -45,
                        background: `linear-gradient(90deg, transparent 0%, ${theme.colors.accent} 45%, #FFFFFF 50%, ${theme.colors.indicatorColor} 55%, transparent 100%)`,
                        boxShadow: `0 0 32px 6px ${theme.colors.accent}`,
                        transform: `rotate(${angle}deg)`,
                        opacity: Math.min(1, pulse * 1.5),
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'iris_pop') {
        const radius = interpolate(frame, [0, midPoint, totalFrames], [85, 8, 110], {
            easing: theme.easings.outExpo,
            ...CLAMP,
        });
        return (
            <AbsoluteFill
                style={{
                    pointerEvents: 'none',
                    background: `radial-gradient(circle at 50% 50%, transparent ${radius}%, ${theme.colors.accent} ${radius + 2}%, rgba(9, 10, 15, 0.92) ${radius + 12}%)`,
                    opacity: pulse * 0.9,
                }}
            />
        );
    }

    if (type === 'tilt_whip') {
        const dir = version === 'v2' ? -1 : 1;
        const streakX = interpolate(frame, [0, totalFrames], [-120 * dir, 120 * dir], CLAMP);
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '-20%',
                        bottom: '-20%',
                        left: `${streakX}%`,
                        width: '75%',
                        background: `linear-gradient(90deg, transparent 0%, ${theme.colors.accent} 45%, #FFFFFF 50%, transparent 100%)`,
                        opacity: pulse * 0.72,
                        filter: 'blur(18px)',
                        transform: `rotate(${14 * dir}deg)`,
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'glitch') {
        const bars = Array.from({ length: 7 }, (_, i) => {
            const seed = frame * 7 + i * 13;
            return {
                top: frameNoise(seed) * 96,
                height: 1.5 + frameNoise(seed + 3) * 8,
                shift: (frameNoise(seed + 5) - 0.5) * 36,
                visible: frameNoise(seed + 9) > 0.3,
                color: i % 2 === 0 ? '#00FFF0' : '#FF2BD6',
            };
        });
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'screen' }}>
                {bars.map((b, i) =>
                    b.visible ? (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${b.shift}%`,
                                width: '100%',
                                top: `${b.top}%`,
                                height: `${b.height}%`,
                                background: b.color,
                                opacity: pulse * 0.4,
                            }}
                        />
                    ) : null
                )}
                {/* Kilatan statis tipis di puncak */}
                <AbsoluteFill style={{ background: '#FFFFFF', opacity: pulse * pulse * 0.12 }} />
            </AbsoluteFill>
        );
    }

    if (type === 'blur_zoom') {
        const grow = interpolate(frame, [0, totalFrames], [0.9, 1.4], CLAMP);
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', overflow: 'hidden' }}>
                {/* Speed lines radial yang memudar di tengah */}
                <AbsoluteFill
                    style={{
                        background:
                            'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg 3.2deg, rgba(255,255,255,0.4) 3.6deg 4deg)',
                        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 18%, #000 82%)',
                        maskImage: 'radial-gradient(circle at 50% 50%, transparent 18%, #000 82%)',
                        opacity: pulse * 0.7,
                        transform: `scale(${grow})`,
                    }}
                />
                <AbsoluteFill
                    style={{
                        background:
                            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.5) 100%)',
                        opacity: pulse * 0.55,
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'push_up') {
        // Garis aksen menyapu naik mengikuti arah geser klip
        const lineY = interpolate(frame, [0, totalFrames], [112, -12], CLAMP);
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${lineY}%`,
                        height: 140,
                        marginTop: -70,
                        background: `linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.18) 45%, ${theme.colors.indicatorColor} 50%, rgba(255,255,255,0.18) 55%, transparent 100%)`,
                        opacity: Math.min(1, pulse * 1.4) * 0.7,
                        filter: 'blur(10px)',
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'flash_cut') {
        const flash = interpolate(
            frame,
            [0, midPoint - 1, midPoint, midPoint + 4, totalFrames],
            [0, 0.5, 0.95, 0.2, 0],
            CLAMP
        );
        return <AbsoluteFill style={{ pointerEvents: 'none', background: '#FFFFFF', opacity: flash }} />;
    }

    if (type === 'shutter') {
        // Dua lembar rana: menutup menuju tengah (inCubic) lalu membuka (outExpo)
        const closing = interpolate(frame, [0, midPoint], [0, 50], {
            easing: theme.easings.inCubic,
            ...CLAMP,
        });
        const opening = interpolate(frame, [midPoint, totalFrames], [50, 0], {
            easing: theme.easings.outExpo,
            ...CLAMP,
        });
        const h = frame < midPoint ? closing : opening;
        const edge = `0 0 18px 4px ${theme.colors.indicatorColor}`;
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: `${h}%`,
                        background: '#050505',
                        boxShadow: h > 0.5 ? edge : 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${h}%`,
                        background: '#050505',
                        boxShadow: h > 0.5 ? edge : 'none',
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'whip_pan') {
        const streakX = interpolate(frame, [0, totalFrames], [-120, 120], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
        const streakOpacity = interpolate(
            frame,
            [0, midPoint, totalFrames],
            [0, 0.75, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
            <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${streakX}%`,
                        width: '70%',
                        background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 30%, ${theme.colors.indicatorColor} 50%, rgba(255, 255, 255, 0.45) 60%, transparent 100%)`,
                        opacity: streakOpacity,
                        filter: 'blur(16px)',
                        transform: 'skewX(-20deg)',
                    }}
                />
            </AbsoluteFill>
        );
    }

    if (type === 'light_leak') {
        const leakOpacity = interpolate(
            frame,
            [0, midPoint, totalFrames],
            [0, 0.65, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const leakScale = interpolate(frame, [0, totalFrames], [0.8, 1.35], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });

        return (
            <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-20%',
                        width: '140%',
                        height: '140%',
                        background: `radial-gradient(ellipse at 40% 40%, rgba(255, 255, 255, 0.95) 0%, ${theme.colors.accent} 35%, rgba(255, 200, 120, 0.4) 55%, transparent 75%)`,
                        opacity: leakOpacity,
                        transform: `scale(${leakScale})`,
                        filter: 'blur(32px)',
                    }}
                />
            </AbsoluteFill>
        );
    }

    // Default: 'zoom_flash' (Cinematic Zoom Punch + Optical Lens Flare Flash)
    const flashOpacity = interpolate(
        frame,
        [0, midPoint - 2, midPoint, midPoint + 3, totalFrames],
        [0, 0.28, 0.72, 0.35, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const flareScale = interpolate(
        frame,
        [0, midPoint, totalFrames],
        [0.6, 1.15, 1.45],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const beamWidth = interpolate(
        frame,
        [midPoint - 3, midPoint, midPoint + 4],
        [10, 100, 10],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
            {/* Center optical flash glow */}
            <div
                style={{
                    position: 'absolute',
                    top: '25%',
                    left: '5%',
                    right: '5%',
                    height: '50%',
                    background: `radial-gradient(circle at 50% 50%, #FFFFFF 0%, ${theme.colors.indicatorColor} 30%, ${theme.colors.accent} 55%, transparent 75%)`,
                    opacity: flashOpacity,
                    transform: `scale(${flareScale})`,
                    filter: 'blur(26px)',
                }}
            />

            {/* Horizontal anamorphic lens flare streak */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${50 - beamWidth / 2}%`,
                    width: `${beamWidth}%`,
                    height: 8,
                    marginTop: -4,
                    background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 30%, #FFFFFF 50%, rgba(255, 255, 255, 0.85) 70%, transparent 100%)`,
                    boxShadow: `0 0 24px 8px ${theme.colors.indicatorColor}`,
                    opacity: flashOpacity * 1.3,
                    filter: 'blur(2px)',
                }}
            />
        </AbsoluteFill>
    );
};

// ==========================================
// ==========================================
// LAYER 3: STAGGERED KINETIC TYPOGRAPHY (Anti AI-Slop / Human Art Direction)
// Mendukung 4 gaya desain elegan & proporsional:
// 1. "unified_glass"    : Apple / visionOS single frosted glass card (terpadu, rapi, mewah)
// 2. "editorial_minimal": Two-tier clean editorial cards (proporsional, harmonis)
// 3. "creator_aesthetic": Authentic vlog subtitle (teks putih bersih, bayangan difusi lembut)
// 4. "clean_capsule"    : Dynamic modern pill capsule (ringkas, modern, menyisakan ruang footage)
// 5. "tiktok_native_ugc": TikTok / CapCut native subtitle (teks putih + highlight kuning stabilo FYP)
// 6. "top_banner_promo" : Promo flash sale banner strip di atas (mengunci FOMO & hemat ruang layar)
// ==========================================
// Outline gelap 8 arah + bayangan lembut untuk teks berwarna aksen (lime, kuning, putih).
// Tanpa ini teks aksen hanya ditopang bayangan dan kontrasnya lemah di footage terang.
const outlineShadow = (px: number, color = 'rgba(0, 0, 0, 0.85)'): string =>
    [
        [-px, 0],
        [px, 0],
        [0, -px],
        [0, px],
        [-px, -px],
        [px, -px],
        [-px, px],
        [px, px],
    ]
        .map(([x, y]) => `${x}px ${y}px 0 ${color}`)
        .join(', ');

const HIGHLIGHT_SHADOW = `${outlineShadow(2.5)}, 0 4px 20px rgba(0, 0, 0, 0.65)`;

// Hierarki teks: baris pertama sengaja lebih kecil agar mata jatuh ke baris sorotan.
const LINE1_SIZE = 40;
const HIGHLIGHT_SIZE_HOOK = 62;
const HIGHLIGHT_SIZE_SOLUTION = 56;

// Caption naik sekian px pada babak CTA (kartu CTA berakhir ~449px dari bawah, caption di 460px).
const CAPTION_LIFT_IN_CTA = 150;

type CardStyleMode =
    | 'unified_glass'
    | 'editorial_minimal'
    | 'creator_aesthetic'
    | 'clean_capsule'
    | 'tiktok_native_ugc'
    | 'top_banner_promo';

const resolveStyleMode = (raw?: string): CardStyleMode => {
    const s = (raw || 'unified_glass').toLowerCase().trim();
    if (s === 'tiktok_native_ugc' || s === 'tiktok_ugc' || s === 'capcut' || s === 'ugc_yellow' || s === 'yellow_tag') {
        return 'tiktok_native_ugc';
    }
    if (s === 'top_banner_promo' || s === 'top_banner' || s === 'banner_promo' || s === 'flash_banner' || s === 'promo_strip') {
        return 'top_banner_promo';
    }
    if (s === 'creator_aesthetic' || s === 'ugc_native' || s === 'ugc' || s === 'vlog') {
        return 'creator_aesthetic';
    }
    if (s === 'editorial_minimal' || s === 'editorial' || s === 'classic' || s === 'layout_shift') {
        return 'editorial_minimal';
    }
    if (s === 'clean_capsule' || s === 'capsule' || s === 'marker' || s === 'sticker_tilt' || s === 'center_hook') {
        return 'clean_capsule';
    }
    return 'unified_glass';
};

const EditorialHeadline: React.FC<{
    badge?: string;
    line1: string;
    highlightLine: string;
    durationInFrames: number;
    variant: 'hook' | 'solution';
    theme: ThemeDefinition;
    cardStyle?: string;
    hookVariant?: VariantVersion;
    badgeStyle?: string;
    urgencyTag?: string;
}> = ({
    badge,
    line1,
    highlightLine,
    durationInFrames,
    variant,
    theme,
    cardStyle = 'unified_glass',
    hookVariant,
    badgeStyle,
    urgencyTag,
}) => {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();

        // Layout baru ditangani komponen tersendiri (HookLayouts.tsx). Gaya lama jatuh ke bawah.
        const hookSelection = resolveHookSelection(cardStyle);
        if (hookSelection) {
            return (
                <HeadlineLayout
                    layout={hookSelection.layout}
                    hookVariant={resolveVariantVersion(hookVariant || hookSelection.impliedVersion, 'v1')}
                    badge={badge}
                    line1={line1}
                    highlightLine={highlightLine}
                    durationInFrames={durationInFrames}
                    variant={variant}
                    theme={theme}
                    urgencyTag={urgencyTag}
                />
            );
        }

        const mode = resolveStyleMode(cardStyle);
        const badgeVariant = resolveBadgeVariant(
            badgeStyle,
            variant === 'hook' ? 'sticker' : 'glass'
        );

        const staggerStep = Math.round(0.05 * fps);
        const exitStart = durationInFrames - Math.round(0.22 * fps);

        // Fast Exit
        const exitProgress = interpolate(
            frame,
            [exitStart, durationInFrames],
            [0, 1],
            {
                easing: theme.easings.inCubic,
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

        // Idle breathing halus (2.5px)
        const breatheY = Math.sin(frame / (fps * 0.5)) * 2.5;

        const isHook = variant === 'hook';
        const highlightSize = isHook ? HIGHLIGHT_SIZE_HOOK : HIGHLIGHT_SIZE_SOLUTION;

        // Staggered Entrance: Memberi jeda waktu agar penonton menangkap visual footage terlebih dahulu
        // Di Babak Hook: jeda 4 frame (~0.06s) agar pattern interrupt footage terlihat pertama
        // Di Babak Demo/Spec: jeda 12 frame (~0.20s) agar aksi produk dinikmati sebelum teks muncul
        const cardEntranceDelay = isHook ? Math.round(0.06 * fps) : Math.round(0.18 * fps);

        // Entrance untuk Badge
        const badgeSpring = spring({
            fps,
            frame: frame - cardEntranceDelay,
            config: theme.springs.pill,
        });

        const words = line1.split(' ');

        // Entrance untuk Baris Highlight
        const highlightDelay = cardEntranceDelay + Math.round(0.08 * fps) + words.length * staggerStep;
        const highlightSpring = spring({
            fps,
            frame: frame - highlightDelay,
            config: theme.springs.snappy,
        });

        const highlightY = interpolate(highlightSpring, [0, 1], [24, 0], {
            extrapolateRight: 'clamp',
        });
        const highlightScale = interpolate(highlightSpring, [0, 1], [0.94, 1], {
            extrapolateRight: 'clamp',
        });

        // ==========================================
        // STYLE: TOP BANNER PROMO (Flash Sale Strip + Clean Floating Text)
        // ==========================================
        if (mode === 'top_banner_promo') {
            return (
                <div
                    style={{
                        position: 'absolute',
                        top: 135,
                        left: 48,
                        right: 48,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        transform: `translateY(${breatheY - exitProgress * 28}px) scale(${1 - exitProgress * 0.05})`,
                        opacity: 1 - exitProgress,
                    }}
                >
                    {/* Top Strip Banner */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'linear-gradient(90deg, #FF0050 0%, #FF2E54 50%, #FF6B00 100%)',
                            borderRadius: 18,
                            padding: '12px 24px',
                            boxShadow: '0 12px 32px rgba(255, 0, 80, 0.38), 0 2px 8px rgba(0, 0, 0, 0.3)',
                            opacity: badgeSpring,
                            transform: `translateY(${(1 - badgeSpring) * 16}px) scale(${0.92 + badgeSpring * 0.08})`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>⚡</span>
                            <span
                                style={{
                                    fontFamily: theme.fonts.display,
                                    fontSize: 24,
                                    fontWeight: 900,
                                    letterSpacing: 1.2,
                                    color: '#FFFFFF',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {badge || 'CEK KERANJANG KUNING'}
                            </span>
                        </div>
                        {urgencyTag ? (
                            <span
                                style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                    color: '#FFE600',
                                    fontFamily: theme.fonts.mono,
                                    fontSize: 18,
                                    fontWeight: 800,
                                    padding: '4px 14px',
                                    borderRadius: 999,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {urgencyTag}
                            </span>
                        ) : null}
                    </div>

                    {/* Floating Text (Tanpa background box yang menutupi video) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                        {words.map((word, i) => {
                            const delay = Math.round(0.04 * fps) + i * staggerStep;
                            const p = spring({
                                fps,
                                frame: frame - delay,
                                config: theme.springs.smooth,
                            });
                            const y = interpolate(p, [0, 1], [18, 0], { extrapolateRight: 'clamp' });

                            return (
                                <span
                                    key={i}
                                    style={{
                                        display: 'inline-block',
                                        fontFamily: theme.fonts.display,
                                        fontSize: LINE1_SIZE,
                                        fontWeight: 800,
                                        letterSpacing: -0.8,
                                        lineHeight: 1.22,
                                        color: '#FFFFFF',
                                        textShadow:
                                            '0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 24px rgba(0, 0, 0, 0.85)',
                                        opacity: p,
                                        transform: `translateY(${y}px)`,
                                    }}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            opacity: highlightSpring,
                            transform: `translateY(${highlightY}px) scale(${highlightScale})`,
                            marginTop: 2,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: theme.fonts.display,
                                fontSize: highlightSize,
                                fontWeight: 900,
                                letterSpacing: -1.0,
                                lineHeight: 1.12,
                                display: 'inline-block',
                                color: isHook ? theme.colors.accent : (theme.colors.indicatorColor || theme.colors.accent),
                                textShadow: HIGHLIGHT_SHADOW,
                            }}
                        >
                            {highlightLine}
                        </span>
                    </div>
                </div>
            );
        }

        // ==========================================
        // STYLE: TIKTOK NATIVE UGC (CapCut Style / Highlight Kuning Stabilo)
        // ==========================================
        if (mode === 'tiktok_native_ugc') {
            return (
                <div
                    style={{
                        position: 'absolute',
                        top: 200,
                        left: 56,
                        right: 56,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 12,
                        transform: `translateY(${breatheY - exitProgress * 28}px) scale(${1 - exitProgress * 0.05})`,
                        opacity: 1 - exitProgress,
                    }}
                >
                    {badge ? (
                        <HookBadge
                            text={badge}
                            variant={badgeVariant}
                            theme={theme}
                            delayFrames={cardEntranceDelay}
                        />
                    ) : null}

                    {/* Floating Text (Tanpa background box yang menutupi video) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                        {words.map((word, i) => {
                            const delay = Math.round(0.04 * fps) + i * staggerStep;
                            const p = spring({
                                fps,
                                frame: frame - delay,
                                config: theme.springs.smooth,
                            });
                            const y = interpolate(p, [0, 1], [18, 0], { extrapolateRight: 'clamp' });

                            return (
                                <span
                                    key={i}
                                    style={{
                                        display: 'inline-block',
                                        fontFamily: theme.fonts.display,
                                        fontSize: LINE1_SIZE,
                                        fontWeight: 800,
                                        letterSpacing: -0.8,
                                        lineHeight: 1.22,
                                        color: '#FFFFFF',
                                        textShadow:
                                            '0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 24px rgba(0, 0, 0, 0.85)',
                                        opacity: p,
                                        transform: `translateY(${y}px)`,
                                    }}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            opacity: highlightSpring,
                            transform: `translateY(${highlightY}px) scale(${highlightScale})`,
                            marginTop: 4,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: theme.fonts.display,
                                fontSize: highlightSize,
                                fontWeight: 900,
                                letterSpacing: -0.8,
                                lineHeight: 1.15,
                                display: 'inline-block',
                                backgroundColor: '#FFE600',
                                color: '#000000',
                                padding: '6px 18px',
                                borderRadius: 8,
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            {highlightLine}
                        </span>
                    </div>
                </div>
            );
        }

        // ==========================================
        // ALL OTHER STYLES (Unified, Editorial, Creator, Capsule):
        // FULL FLOATING TYPOGRAPHY: Tanpa background box / border lebar yang menutupi video!
        // Teks putih tajam berbayangan pekat + baris highlight warna aksen berkilau
        // ==========================================
        return (
            <div
                style={{
                    position: 'absolute',
                    top: 200,
                    left: 56,
                    right: 56,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 12,
                    transform: `translateY(${breatheY - exitProgress * 28}px) scale(${1 - exitProgress * 0.05})`,
                    opacity: 1 - exitProgress,
                }}
            >
                {badge ? (
                    <HookBadge
                        text={badge}
                        variant={badgeVariant}
                        theme={theme}
                        delayFrames={cardEntranceDelay}
                    />
                ) : null}

                {/* Staggered Floating Line 1 (Putih bersih dengan bayangan tajam, 100% terbaca di atas video) */}
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px 12px',
                    }}
                >
                    {words.map((word, i) => {
                        const delay = Math.round(0.04 * fps) + i * staggerStep;
                        const p = spring({
                            fps,
                            frame: frame - delay,
                            config: theme.springs.smooth,
                        });
                        const y = interpolate(p, [0, 1], [20, 0], { extrapolateRight: 'clamp' });

                        return (
                            <span
                                key={i}
                                style={{
                                    display: 'inline-block',
                                    fontFamily: theme.fonts.display,
                                    fontSize: LINE1_SIZE,
                                    fontWeight: 800,
                                    letterSpacing: -0.8,
                                    lineHeight: 1.25,
                                    color: '#FFFFFF',
                                    textShadow:
                                        '0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 24px rgba(0, 0, 0, 0.85)',
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                }}
                            >
                                {word}
                            </span>
                        );
                    })}
                </div>

                {/* Floating Highlight Line (Aksen warna tema bersinar, tanpa kotak latar padat yang menutupi video) */}
                <div
                    style={{
                        opacity: highlightSpring,
                        transform: `translateY(${highlightY}px) scale(${highlightScale})`,
                        marginTop: 2,
                    }}
                >
                    <span
                        style={{
                            fontFamily: theme.fonts.display,
                            fontSize: highlightSize,
                            fontWeight: 900,
                            letterSpacing: -1.4,
                            lineHeight: 1.12,
                            display: 'inline-block',
                            color: isHook ? theme.colors.accent : (theme.colors.indicatorColor || theme.colors.accent),
                            textShadow: HIGHLIGHT_SHADOW,
                        }}
                    >
                        {highlightLine}
                    </span>
                </div>
            </div>
        );
    };

// ==========================================
// EDITORIAL LOWER-THIRD CTA (Selaras Layout Hook + Panah Keranjang Kuning)
// ==========================================
const EditorialCTA: React.FC<{
    text: string;
    label?: string;
    durationInFrames: number;
    theme: ThemeDefinition;
    cardStyle?: string;
}> = ({ text, label, durationInFrames, theme, cardStyle }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({
        fps,
        frame,
        config: theme.springs.snappy,
    });

    const badgeEnter = spring({
        fps,
        frame: frame - Math.round(0.1 * fps),
        config: theme.springs.pill,
    });

    const exitStart = durationInFrames - Math.round(0.2 * fps);
    const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
        easing: theme.easings.inCubic,
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Gerakan panah diagonal halus menunjuk Keranjang Kuning TikTok di kiri bawah
    const arrowNudge = Math.sin(frame / (fps * 0.20)) * 9;
    const y = interpolate(enter, [0, 1], [45, 0]);
    const subLabel = label || 'KLIK IKON DI KIRI BAWAH';

    // Panah Penunjuk Keranjang Kuning TikTok (Kiri Bawah)
    const renderYellowBasketPointer = () => (
        <div
            style={{
                marginTop: 18,
                marginLeft: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transform: `translate(${-arrowNudge * 0.6}px, ${arrowNudge}px) scale(${badgeEnter})`,
            }}
        >
            <div
                style={{
                    backgroundColor: '#FFE600',
                    color: '#0B0C10',
                    border: '2.5px solid #0B0C10',
                    borderRadius: 999,
                    padding: '10px 22px',
                    fontFamily: FONT.grotesk,
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: -0.3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '4px 4px 0px #0B0C10, 0 8px 20px rgba(0,0,0,0.45)',
                }}
            >
                <span style={{ fontSize: 28, lineHeight: 1 }}>↙</span>
                <span>KERANJANG KUNING DI SINI</span>
            </div>
        </div>
    );

    let cardContent: React.ReactNode;
    const resolvedCard = resolveHookSelection(cardStyle)?.layout ?? cardStyle;

    if (resolvedCard === 'sticky_note') {
        // Gaya Catatan Tempel Fisik
        cardContent = (
            <div
                style={{
                    position: 'relative',
                    backgroundColor: '#FEF08A',
                    color: '#18181B',
                    padding: '28px 34px',
                    borderRadius: 6,
                    transform: 'rotate(-1.2deg)',
                    boxShadow: '0 18px 36px rgba(0,0,0,0.42), 0 3px 8px rgba(0,0,0,0.2)',
                    maxWidth: 860,
                }}
            >
                {/* Selotip atas */}
                <div
                    style={{
                        position: 'absolute',
                        top: -15,
                        left: '38%',
                        width: 140,
                        height: 32,
                        backgroundColor: 'rgba(255,255,255,0.58)',
                        transform: 'rotate(1.8deg)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                />
                <div
                    style={{
                        fontFamily: FONT.hand,
                        fontSize: 34,
                        fontWeight: 700,
                        color: '#DC2626',
                        marginBottom: 4,
                    }}
                >
                    {subLabel}
                </div>
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: 44,
                        fontWeight: 800,
                        letterSpacing: -1,
                        lineHeight: 1.12,
                        color: '#111827',
                    }}
                >
                    {text}
                </div>
            </div>
        );
    } else if (resolvedCard === 'receipt') {
        // Gaya Struk Thermal Belanja
        cardContent = (
            <div
                style={{
                    backgroundColor: '#FAF8F3',
                    color: '#111111',
                    padding: '22px 28px',
                    borderRadius: 4,
                    borderTop: '4px dashed #111111',
                    borderBottom: '4px dashed #111111',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.48)',
                    maxWidth: 860,
                }}
            >
                <div
                    style={{
                        fontFamily: FONT.mono,
                        fontSize: 20,
                        fontWeight: 500,
                        letterSpacing: 1.5,
                        color: '#52525B',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                    }}
                >
                    *** {subLabel} ***
                </div>
                <div
                    style={{
                        backgroundColor: '#111111',
                        color: '#FAF8F3',
                        padding: '14px 20px',
                        fontFamily: FONT.grotesk,
                        fontSize: 40,
                        fontWeight: 800,
                        letterSpacing: -0.8,
                        lineHeight: 1.15,
                    }}
                >
                    {text}
                </div>
            </div>
        );
    } else if (resolvedCard === 'label_tape') {
        // Gaya Pita Emboss Dymo
        cardContent = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <div
                    style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.accentText,
                        padding: '6px 16px',
                        fontFamily: FONT.mono,
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        transform: 'rotate(-0.8deg)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                    }}
                >
                    {subLabel}
                </div>
                <div
                    style={{
                        backgroundColor: '#111215',
                        color: '#FFFFFF',
                        padding: '18px 28px',
                        border: '1.5px solid rgba(255,255,255,0.22)',
                        fontFamily: FONT.grotesk,
                        fontSize: 42,
                        fontWeight: 800,
                        letterSpacing: -0.8,
                        lineHeight: 1.15,
                        boxShadow: '0 14px 32px rgba(0,0,0,0.55)',
                    }}
                >
                    {text}
                </div>
            </div>
        );
    } else if (resolvedCard === 'quiet_serif') {
        // Gaya Editorial Luxury Serif
        cardContent = (
            <div
                style={{
                    backgroundColor: 'rgba(12, 12, 16, 0.84)',
                    borderTop: `2px solid ${theme.colors.accent}`,
                    padding: '24px 32px',
                    borderRadius: 12,
                    boxShadow: '0 18px 42px rgba(0,0,0,0.5)',
                    maxWidth: 880,
                }}
            >
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: 19,
                        fontWeight: 600,
                        letterSpacing: 2.5,
                        color: theme.colors.accent,
                        textTransform: 'uppercase',
                        marginBottom: 6,
                    }}
                >
                    {subLabel}
                </div>
                <div
                    style={{
                        fontFamily: FONT.serifItalic,
                        fontSize: 52,
                        fontStyle: 'italic',
                        color: '#FFFFFF',
                        lineHeight: 1.08,
                    }}
                >
                    {text}
                </div>
            </div>
        );
    } else {
        // Default / Chat Thread / Type Stack / Floating Clean
        cardContent = (
            <div
                style={{
                    background: 'rgba(12, 14, 20, 0.90)',
                    border: `2px solid ${theme.colors.accent}`,
                    borderRadius: 24,
                    padding: '20px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55)',
                }}
            >
                <div
                    style={{
                        width: 68,
                        height: 68,
                        borderRadius: 18,
                        backgroundColor: theme.colors.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${badgeEnter})`,
                        flexShrink: 0,
                    }}
                >
                    <span
                        style={{
                            fontSize: 38,
                            fontWeight: 900,
                            color: theme.colors.accentText,
                            transform: `translate(${-arrowNudge * 0.5}px, ${arrowNudge * 0.5}px)`,
                            display: 'inline-block',
                        }}
                    >
                        ↙
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                        style={{
                            fontFamily: FONT.mono,
                            fontSize: 19,
                            fontWeight: 700,
                            letterSpacing: 1.6,
                            color: theme.colors.accent,
                            textTransform: 'uppercase',
                        }}
                    >
                        {subLabel}
                    </span>
                    <span
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: 40,
                            fontWeight: 800,
                            letterSpacing: -1,
                            color: '#FFFFFF',
                            lineHeight: 1.15,
                        }}
                    >
                        {text}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 330,
                left: 56,
                right: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                opacity: enter * (1 - exit),
                transform: `translateY(${y + exit * 30}px) scale(${0.95 + enter * 0.05})`,
            }}
        >
            {cardContent}
            {renderYellowBasketPointer()}
        </div>
    );
};

// ==========================================
// MAIN COMPOSITION (5-LAYER STACK)
// ==========================================
export const AffiliateVideo: React.FC<AffiliateProps> = ({
    preset: presetKey,
    presetVariant,
    themeStyle: themeStyleProp,
    cardStyle: cardStyleProp,
    hookVariant: hookVariantProp,
    captionStyle: captionStyleProp,
    captionVariant: captionVariantProp,
    badgeStyle: badgeStyleProp,
    showProgressBar,
    enableSfx,
    sfxPreset,
    ctaSound,
    cardSfx,
    sfxVolume,
    showSafeZoneGuide,
    watermarkText,
    showWatermark,
    watermarkOpacity,
    palette: paletteProp,
    hookStyle: hookStyleProp,
    subtitleStyle: subtitleStyleProp,
    watermarkPosition,
    bgmTrack,
    bgmVolume,
    unmuteHook,
    hookVolume,
    showHookHeadline,
    karaokeHighlight,
    hookTransition: hookTransitionProp,
    clipTransition: clipTransitionProp,
    transitionVariant: transitionVariantProp,
    hookSubtitle,
    hookSubtitles,
    hookCaptions,
    voiceOver,
    voiceOverVolume,
    voiceOverDelaySec,
    voiceOverCaptions,
    badgeText,
    demoBadge,
    specBadge,
    hookLine1,
    hookHighlight,
    demoLine1,
    demoHighlight,
    specLine1,
    specHighlight,
    ctaText,
    ctaLabel,
    urgencyTag,
    clips,
}) => {
    const { fps } = useVideoConfig();
    // Preset mengisi yang kosong; field eksplisit selalu menang.
    const preset = resolvePreset(presetKey, presetVariant);
    const flatStylePreset = presetKey && presetKey in STYLE_PRESETS ? STYLE_PRESETS[presetKey as keyof typeof STYLE_PRESETS] : null;

    const useNewHook = Boolean(
        (hookStyleProp && hookStyleProp in HookStyles) ||
        (cardStyleProp && cardStyleProp in HookStyles) ||
        (flatStylePreset && !cardStyleProp)
    );
    const finalHookStyle: HookStyleName = (
        (hookStyleProp && hookStyleProp in HookStyles ? (hookStyleProp as HookStyleName) : null) ||
        (cardStyleProp && cardStyleProp in HookStyles ? (cardStyleProp as HookStyleName) : null) ||
        flatStylePreset?.hookStyle ||
        DEFAULT_PRESET.hookStyle
    );

    const useNewSubtitle = Boolean(
        (subtitleStyleProp && subtitleStyleProp in SubtitleStyles) ||
        (captionStyleProp && captionStyleProp in SubtitleStyles) ||
        (flatStylePreset && !captionStyleProp)
    );
    const finalSubtitleStyle: SubtitleStyleName = (
        (subtitleStyleProp && subtitleStyleProp in SubtitleStyles ? (subtitleStyleProp as SubtitleStyleName) : null) ||
        (captionStyleProp && captionStyleProp in SubtitleStyles ? (captionStyleProp as SubtitleStyleName) : null) ||
        flatStylePreset?.subtitleStyle ||
        DEFAULT_PRESET.subtitleStyle
    );

    const finalPaletteName: PaletteName = (
        (paletteProp && paletteProp in PALETTES ? (paletteProp as PaletteName) : null) ||
        flatStylePreset?.palette ||
        DEFAULT_PRESET.palette
    );
    const finalPalette: Palette = PALETTES[finalPaletteName] ?? PALETTES.pastel_rose;
    const themeStyle = themeStyleProp ?? preset?.themeStyle;
    const cardStyle = cardStyleProp ?? preset?.cardStyle;
    const hookVariant: VariantVersion = resolveVariantVersion(hookVariantProp ?? preset?.hookVariant);
    const captionStyle = captionStyleProp ?? preset?.captionStyle;
    const captionVariant: VariantVersion = resolveVariantVersion(captionVariantProp ?? preset?.captionVariant);
    const badgeStyle = badgeStyleProp ?? preset?.badgeStyle;
    const transitionVariant: VariantVersion = resolveVariantVersion(transitionVariantProp ?? preset?.transitionVariant);
    const hookTransition = (hookTransitionProp ?? preset?.hookTransition ?? 'zoom_flash') as TransitionType;
    const clipTransition = (clipTransitionProp ?? preset?.clipTransition ?? 'auto') as TransitionType | 'auto';
    const theme = getTheme(themeStyle);
    let accumulatedFrames = 0;

    // Deteksi preset SFX aktif secara otomatis berdasarkan themeStyle jika tidak diset
    const activePreset: SfxPresetId =
        sfxPreset ||
        preset?.sfxPreset ||
        (themeStyle === 'pastel'
            ? 'beauty'
            : themeStyle === 'minimal'
                ? 'minimal'
                : themeStyle === 'editorial'
                    ? 'tech'
                    : 'viral');

    // Faktor pengali volume SFX (default 1.0)
    const vol = Math.max(0, Math.min(2.0, sfxVolume ?? 1.0));

    // Durasi dinamis per babak otomatis sinkron dengan durasi klip video yang dimasukkan:
    // - Klip 0 = Babak 1 (Hook)      : default 5s (atau 6-8s jika ada video podcast YouTube)
    // - Klip 1 = Babak 2 (Demo)      : default 7s (atau 7-8s)
    // - Klip 2 = Babak 3 (Spec)      : default 7s (atau 7-8s)
    // - Klip 3 = Babak 4 (CTA)       : default 5s (atau 6-7s)
    // Total durasi otomatis menyesuaikan (misal 24 detik untuk video standar, atau 30 detik untuk podcast hook)
    const hookDuration = Math.round(
        (clips[0] ? Math.max(1, clips[0].endSec - clips[0].startSec) : 5) * fps
    );
    const demoDuration = Math.round(
        (clips[1] ? Math.max(1, clips[1].endSec - clips[1].startSec) : 7) * fps
    );
    const specDuration = Math.round(
        (clips[2] ? Math.max(1, clips[2].endSec - clips[2].startSec) : 7) * fps
    );
    const ctaDuration = Math.round(
        (clips[3] ? Math.max(1, clips[3].endSec - clips[3].startSec) : 5) * fps
    );

    // Waktu mulai narasi AI (Voiceover):
    // - Jika ditentukan eksplisit (voiceOverDelaySec), pakai nilai tersebut.
    // - Jika unmuteHook (Mode B: YouTube podcast hook), voiceover mulai setelah hook selesai (hookDuration).
    // - Jika video produk standar (Mode A), voiceover mulai dari detik 0 (0 frame).
    const voStartFrame =
        voiceOverDelaySec !== undefined
            ? Math.round(voiceOverDelaySec * fps)
            : unmuteHook
                ? hookDuration
                : 0;

    const ctaStartFrame = hookDuration + demoDuration + specDuration;

    const totalClipsSec = clips.reduce(
        (acc, c) => acc + Math.max(0, c.endSec - c.startSec),
        0
    );
    const durationInSeconds = Math.max(1, totalClipsSec);
    const totalDurationInFrames = Math.round(durationInSeconds * fps);

    // Transisi: boundary i (i >= 1) = titik cut tempat klip ke-i dimulai.
    // Boundary 1 (hook -> produk) memakai hookTransition; sisanya memakai clipTransition.
    const resolvedClipTransition: TransitionType =
        clipTransition === 'auto'
            ? AUTO_CLIP_TRANSITION[activePreset][transitionVariant]
            : clipTransition;
    const boundaryType = (i: number): TransitionType =>
        i === 1 ? hookTransition : resolvedClipTransition;
    const boundaries: { index: number; frame: number; type: TransitionType }[] = [];
    {
        let cursor = 0;
        for (let i = 1; i < clips.length; i++) {
            cursor += Math.round((clips[i - 1].endSec - clips[i - 1].startSec) * fps);
            boundaries.push({ index: i, frame: cursor, type: boundaryType(i) });
        }
    }

    return (
        <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
            {/* L1 & L2: FOOTAGE DENGAN KEN BURNS PUSH-IN */}
            {clips.map((clip, idx) => {
                const durationInFrames = Math.round((clip.endSec - clip.startSec) * fps);
                const fromFrame = accumulatedFrames;
                accumulatedFrames += durationInFrames;

                // Opsi unmuteHook: otomatis un-mute klip 1 (Hook YouTube/Podcast), sementara klip produk tetap hening
                const isClipMuted =
                    idx === 0
                        ? (unmuteHook === true ? false : (clip.muted !== false))
                        : (clip.muted !== false);

                const clipVol =
                    idx === 0 && (unmuteHook || clip.muted === false)
                        ? (hookVolume ?? clip.volume ?? 1.0)
                        : (clip.volume ?? (isClipMuted ? 0 : 1.0));

                const resolvedClip = {
                    ...clip,
                    muted: isClipMuted,
                    volume: clipVol,
                };

                return (
                    <Sequence key={idx} from={fromFrame} durationInFrames={durationInFrames}>
                        <FootageClip
                            clip={resolvedClip}
                            durationInFrames={durationInFrames}
                            theme={theme}
                            isHookClip={idx === 0}
                            isFirstProductClip={idx === 1}
                            inType={
                                idx === 0
                                    ? hookTransition === 'none'
                                        ? 'none'
                                        : undefined
                                    : boundaryType(idx)
                            }
                            outType={idx < clips.length - 1 ? boundaryType(idx + 1) : undefined}
                            transitionVariant={transitionVariant}
                            clipStartFrame={fromFrame}
                            voStartFrame={voStartFrame}
                            captions={voiceOverCaptions as Caption[] | undefined}
                        />
                    </Sequence>
                );
            })}

            {/* OVERLAY TRANSISI DI SETIAP TITIK CUT (hook -> produk, demo -> spec, spec -> CTA) */}
            {boundaries.map(
                (b) =>
                    b.type !== 'none' && (
                        <Sequence
                            key={`transition-${b.index}`}
                            from={Math.max(0, b.frame - transitionPeakFrames(fps))}
                            durationInFrames={transitionOverlayFrames(fps)}
                        >
                            <TransitionOverlay theme={theme} type={b.type} version={transitionVariant} />
                        </Sequence>
                    )
            )}

            {/* L4 & L5: COLOR GRADE, VIGNETTE */}
            <CinematicOverlays theme={theme} />

            {/* PROGRESS BAR DI TEPI PALING ATAS (RETENSI PENONTON TIKTOK) */}
            {showProgressBar !== false && (
                <VideoProgressBar theme={theme} durationInFrames={totalDurationInFrames} />
            )}

            {/* AUDIO SOUND EFFECTS (MICRO-SFX VIRAL TIKTOK) */}
            {enableSfx !== false && (
                <>
                    {/* Babak 1: Hook (Otomatis ducking jika klip 1 bersuara seperti podcast YouTube) */}
                    {activePreset === 'tech' && (
                        <Sequence durationInFrames={Math.round(0.6 * fps)}>
                            <Audio
                                src={staticFile('sfx/impact-soft.wav')}
                                volume={
                                    0.45 *
                                    vol *
                                    (unmuteHook || clips[0]?.muted === false ? 0.3 : 1.0)
                                }
                            />
                        </Sequence>
                    )}
                    <Sequence durationInFrames={Math.round(0.4 * fps)}>
                        <Audio
                            src={staticFile(
                                activePreset === 'beauty'
                                    ? 'sfx/bubble-pop.wav'
                                    : activePreset === 'tech' || activePreset === 'minimal'
                                        ? 'sfx/click-tactile.wav'
                                        : 'sfx/pop.wav'
                            )}
                            volume={
                                0.65 *
                                vol *
                                (unmuteHook || clips[0]?.muted === false ? 0.35 : 1.0)
                            }
                        />
                    </Sequence>
                    <Sequence from={Math.round(0.12 * fps)} durationInFrames={Math.round(0.55 * fps)}>
                        <Audio
                            src={staticFile(
                                activePreset === 'tech'
                                    ? 'sfx/swoosh-deep.wav'
                                    : 'sfx/whoosh.wav'
                            )}
                            volume={
                                0.50 *
                                vol *
                                (unmuteHook || clips[0]?.muted === false ? 0.3 : 1.0)
                            }
                        />
                    </Sequence>

                    {/* SFX transisi di setiap titik cut: mengikuti jenis transisi, puncak suara dibuat jatuh pas di cut.
                        Boundary terakhir (spec -> CTA) dikecilkan karena berbarengan dengan riser & ka-ching. */}
                    {boundaries.map((b) => (
                        <React.Fragment key={`tsfx-${b.index}`}>
                            {TRANSITION_SFX[b.type].map((cue, ci) => (
                                <Sequence
                                    key={ci}
                                    from={Math.max(0, b.frame + Math.round(cue.at * fps))}
                                    durationInFrames={Math.round(1.0 * fps)}
                                >
                                    <Audio
                                        src={staticFile(`sfx/${cue.file}.wav`)}
                                        volume={cue.vol * vol * (b.index > 1 && b.index === clips.length - 1 ? 0.6 : 1)}
                                    />
                                </Sequence>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* SFX khas layout kartu hook (tick struk, kertas, notifikasi chat) */}
                    {cardSfx !== false &&
                        (CARD_SFX[cardStyle ?? ''] ?? []).map((cue, ci) => (
                            <Sequence
                                key={`csfx-${ci}`}
                                from={Math.round(cue.at * fps)}
                                durationInFrames={Math.round(0.8 * fps)}
                            >
                                <Audio
                                    src={staticFile(`sfx/${cue.file}.wav`)}
                                    volume={
                                        cue.vol *
                                        vol *
                                        (unmuteHook || clips[0]?.muted === false ? 0.35 : 1.0)
                                    }
                                />
                            </Sequence>
                        ))}
                    <Sequence from={hookDuration} durationInFrames={Math.round(0.35 * fps)}>
                        <Audio
                            src={staticFile(
                                activePreset === 'beauty'
                                    ? 'sfx/bubble-pop.wav'
                                    : 'sfx/click-tactile.wav'
                            )}
                            volume={0.65 * vol}
                        />
                    </Sequence>
                    <Sequence from={hookDuration + Math.round(0.15 * fps)} durationInFrames={Math.round(0.6 * fps)}>
                        <Audio
                            src={staticFile(
                                activePreset === 'beauty'
                                    ? 'sfx/sparkle.wav'
                                    : 'sfx/whoosh.wav'
                            )}
                            volume={0.50 * vol}
                        />
                    </Sequence>

                    {/* Babak 3: Spesifikasi & Fitur */}
                    <Sequence from={hookDuration + demoDuration + 4} durationInFrames={Math.round(0.5 * fps)}>
                        <Audio
                            src={staticFile(
                                activePreset === 'beauty'
                                    ? 'sfx/sparkle.wav'
                                    : activePreset === 'minimal'
                                        ? 'sfx/glockenspiel.wav'
                                        : 'sfx/camera-shutter.wav'
                            )}
                            volume={0.65 * vol}
                        />
                    </Sequence>
                    <Sequence from={hookDuration + demoDuration + Math.round(0.15 * fps)} durationInFrames={Math.round(0.5 * fps)}>
                        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45 * vol} />
                    </Sequence>

                    {/* Pre-CTA Tension Riser (0.8s sebelum kartu Keranjang Kuning muncul) */}
                    {(activePreset === 'viral' || activePreset === 'tech') && (
                        <Sequence
                            from={Math.max(
                                0,
                                hookDuration + demoDuration + specDuration - Math.round(0.8 * fps)
                            )}
                            durationInFrames={Math.round(0.85 * fps)}
                        >
                            <Audio src={staticFile('sfx/riser.wav')} volume={0.35 * vol} />
                        </Sequence>
                    )}

                    {/* Babak 4: CTA Keranjang Kuning (Viral Cash Register Ka-ching / Chime) */}
                    <Sequence from={hookDuration + demoDuration + specDuration} durationInFrames={Math.round(1.2 * fps)}>
                        <Audio
                            src={staticFile(
                                ctaSound === 'notify'
                                    ? 'sfx/notify-ping.wav'
                                    : ctaSound === 'ding'
                                    ? 'sfx/ding.wav'
                                    : ctaSound === 'glockenspiel'
                                        ? 'sfx/glockenspiel.wav'
                                        : ctaSound === 'sparkle'
                                            ? 'sfx/sparkle.wav'
                                            : ctaSound === 'kaching'
                                                ? 'sfx/kaching.wav'
                                                : activePreset === 'minimal'
                                                    ? 'sfx/ding.wav'
                                                    : activePreset === 'beauty'
                                                        ? 'sfx/glockenspiel.wav'
                                                        : 'sfx/kaching.wav'
                            )}
                            volume={0.80 * vol}
                        />
                    </Sequence>
                </>
            )}

            {/* L2.4: BACKGROUND MUSIC (BGM DENGAN SMART AUDIO DUCKING) */}
            {bgmTrack && (
                <Sequence durationInFrames={totalDurationInFrames} name="BackgroundMusic">
                    <Audio
                        src={staticFile(bgmTrack)}
                        loop
                        volume={(f) => {
                            const baseVol = bgmVolume ?? 0.12;
                            // Duck volume saat voice over aktif (mulai voStartFrame hingga mendekati akhir)
                            const isVoActive = Boolean(
                                voiceOver &&
                                f >= voStartFrame &&
                                f < totalDurationInFrames - Math.round(0.5 * fps)
                            );
                            return isVoActive ? baseVol * 0.45 : baseVol;
                        }}
                    />
                </Sequence>
            )}

            {/* L2.5: VOICE OVER AUDIO TRACK (Narator AI / Voiceover) */}
            {voiceOver && (
                <Sequence
                    from={voStartFrame}
                    name="VoiceOver"
                >
                    <Audio
                        src={staticFile(voiceOver)}
                        volume={voiceOverVolume ?? 1.0}
                    />
                </Sequence>
            )}

            {/* L3: STAGGERED GRAPHICS & TYPOGRAPHY */}
            {/* 1. Babak 1: Hook (0 - 5 dtk / dinamis) */}
            <Sequence durationInFrames={hookDuration}>
                {/* Sembunyikan headline card jika klip YouTube podcast (unmuteHook: true) agar wajah narasumber tidak terpotong */}
                {(showHookHeadline ?? !unmuteHook) && (
                    useNewHook ? (
                        <AffiliateHook
                            variant={finalHookStyle}
                            line1={hookLine1}
                            highlight={hookHighlight}
                            badge={badgeText}
                            palette={finalPalette}
                            durationInFrames={hookDuration}
                        />
                    ) : (
                        <EditorialHeadline
                            badge={badgeText}
                            line1={hookLine1}
                            highlightLine={hookHighlight}
                            durationInFrames={hookDuration}
                            variant="hook"
                            theme={theme}
                            cardStyle={cardStyle}
                            hookVariant={hookVariant}
                            badgeStyle={badgeStyle}
                            urgencyTag={urgencyTag}
                        />
                    )
                )}
                {(hookCaptions || hookSubtitle || (hookSubtitles && hookSubtitles.length > 0)) && (
                    <HookSubtitle
                        text={hookSubtitle}
                        subtitles={hookSubtitles}
                        captions={hookCaptions as Caption[] | undefined}
                        durationInFrames={hookDuration}
                        theme={theme}
                        karaokeHighlight={karaokeHighlight}
                        captionStyle={captionStyle}
                        captionVariant={captionVariant}
                    />
                )}
            </Sequence>

            {/* 2. Babak 2: Demo Bukti (5 - 12 dtk) */}
            <Sequence from={hookDuration} durationInFrames={demoDuration}>
                <EditorialHeadline
                    badge={demoBadge}
                    line1={demoLine1}
                    highlightLine={demoHighlight}
                    durationInFrames={demoDuration}
                    variant="solution"
                    theme={theme}
                    cardStyle={cardStyle}
                    hookVariant={hookVariant}
                    badgeStyle={badgeStyle}
                    urgencyTag={urgencyTag}
                />
            </Sequence>

            {/* 3. Babak 3: Spesifikasi & Fitur (12 - 19 dtk) */}
            <Sequence from={hookDuration + demoDuration} durationInFrames={specDuration}>
                <EditorialHeadline
                    badge={specBadge}
                    line1={specLine1}
                    highlightLine={specHighlight}
                    durationInFrames={specDuration}
                    variant="solution"
                    theme={theme}
                    cardStyle={cardStyle}
                    hookVariant={hookVariant}
                    badgeStyle={badgeStyle}
                    urgencyTag={urgencyTag}
                />
            </Sequence>

            {/* 4. Babak 4: CTA Keranjang Kuning (19 - 24 dtk) */}
            <Sequence
                from={hookDuration + demoDuration + specDuration}
                durationInFrames={ctaDuration}
            >
                <EditorialCTA
                    text={ctaText}
                    label={ctaLabel}
                    durationInFrames={ctaDuration}
                    theme={theme}
                    cardStyle={cardStyle}
                />
            </Sequence>

            {/* L3.5: VOICE OVER CAPTIONS (Subtitle Karaoke Sinkron untuk Voice Over Produk) */}
            {voiceOverCaptions && voiceOverCaptions.length > 0 && (
                <Sequence
                    from={voStartFrame}
                    durationInFrames={Math.max(
                        1,
                        totalDurationInFrames - voStartFrame
                    )}
                    name="VoiceOverCaptions"
                >
                    {useNewSubtitle ? (
                        <AffiliateSubtitles
                            variant={finalSubtitleStyle}
                            words={toSubWords(voiceOverCaptions)}
                            palette={finalPalette}
                        />
                    ) : (
                        <HookSubtitle
                            captions={voiceOverCaptions as Caption[]}
                            durationInFrames={Math.max(
                                1,
                                totalDurationInFrames - voStartFrame
                            )}
                            theme={theme}
                            karaokeHighlight={karaokeHighlight}
                            captionStyle={captionStyle}
                            captionVariant={captionVariant}
                            // Naikkan caption saat kartu CTA muncul supaya keduanya tidak bersentuhan.
                            liftFromFrame={ctaStartFrame - voStartFrame}
                            liftPx={CAPTION_LIFT_IN_CTA}
                        />
                    )}
                </Sequence>
            )}

            {/* FLOATING WATERMARK (BERPINDAH-PINDAH & OPACITY HALUS) */}
            {showWatermark !== false && (
                <FloatingWatermark
                    text={watermarkText || '@inanikma_ | @spillbyna_'}
                    opacity={watermarkOpacity ?? 0.70}
                    position={watermarkPosition}
                />
            )}

            {/* TIKTOK UI SAFE ZONE (PANDUAN VISUAL DI STUDIO) */}
            {showSafeZoneGuide && <TikTokSafeZone />}
        </AbsoluteFill>
    );
};