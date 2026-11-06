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
import { HeadlineLayout, resolveHookLayout } from './components/HookLayouts';
import { resolvePreset } from './presets';
import { loadThemeFonts } from './load-theme-fonts';
import { FONT } from './load-hook-fonts';
import { Caption } from '@remotion/captions';

// Muat Inter + JetBrains Mono sekali saat bundle dibuka (render tetap menunggu via delayRender).
loadThemeFonts();

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
    // Preset desain: skincare | gadget | flash_sale | lifestyle. Mengisi themeStyle, cardStyle,
    // dan badgeStyle yang kosong. Field eksplisit di bawah selalu menang atas preset.
    preset: z.string().optional(),
    themeStyle: z.string().optional(),
    // Layout hook. Baru: sticky_note | receipt | chat_thread | type_stack | label_tape | quiet_serif.
    // Lama: unified_glass | editorial_minimal | creator_aesthetic | clean_capsule | tiktok_native_ugc | top_banner_promo.
    cardStyle: z.string().optional(),
    // Gaya subtitle: outline_pop | marker_sweep | reveal | plate. Kosong = outline_pop (atau dari preset).
    captionStyle: z.string().optional(),
    // Alasan singkat pemilihan desain oleh Gemini. Hanya catatan, tidak memengaruhi render.
    designReason: z.string().optional(),
    // Gaya badge: sticker | alert | marker | glass. Kosong = otomatis (hook: sticker, demo & spec: glass).
    badgeStyle: z.string().optional(),
    showProgressBar: z.boolean().optional(),
    enableSfx: z.boolean().optional(),
    sfxPreset: z.enum(['viral', 'beauty', 'tech', 'minimal']).optional(),
    ctaSound: z.enum(['kaching', 'ding', 'glockenspiel', 'sparkle']).optional(),
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
    hookTransition: z.enum(['zoom_flash', 'whip_pan', 'light_leak', 'none']).optional(),
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
    const fps = 60;
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
    hookTransition?: 'zoom_flash' | 'whip_pan' | 'light_leak' | 'none';
    clipStartFrame?: number;
    voStartFrame?: number;
    captions?: Caption[];
}> = ({
    clip,
    durationInFrames,
    theme,
    isHookClip,
    isFirstProductClip,
    hookTransition = 'zoom_flash',
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

        let snapScale = 1.0;
        let cutBrightness = 1.0;
        let blurAmount = 0;
        let translateX = 0;

        if (isHookClip && hookTransition !== 'none') {
            // Outro transition pada klip YouTube hook menjelang pergantian ke klip produk
            const outroDuration = Math.min(14, Math.round(0.22 * fps));
            const outroStart = Math.max(0, durationInFrames - outroDuration);

            if (hookTransition === 'whip_pan') {
                translateX = interpolate(
                    frame,
                    [outroStart, durationInFrames],
                    [0, -140],
                    {
                        easing: theme.easings.inCubic,
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    }
                );
                blurAmount = interpolate(
                    frame,
                    [outroStart, durationInFrames],
                    [0, 8],
                    {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    }
                );
            } else {
                // zoom_flash & light_leak: Zoom punch-in dramatis ke pembicara sebelum cut
                const punchScale = interpolate(
                    frame,
                    [outroStart, durationInFrames],
                    [1.0, 1.07],
                    {
                        easing: theme.easings.inCubic,
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    }
                );
                snapScale *= punchScale;
                blurAmount = interpolate(
                    frame,
                    [outroStart, durationInFrames],
                    [0, 5],
                    {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    }
                );
            }
        } else if (isFirstProductClip && hookTransition !== 'none') {
            // Intro transition pada klip produk pertama saat masuk dari YouTube hook
            const introDuration = Math.min(14, Math.round(0.24 * fps));

            if (hookTransition === 'whip_pan') {
                translateX = interpolate(
                    frame,
                    [0, introDuration],
                    [140, 0],
                    {
                        easing: theme.easings.outExpo,
                        extrapolateRight: 'clamp',
                    }
                );
                blurAmount = interpolate(
                    frame,
                    [0, introDuration],
                    [8, 0],
                    {
                        easing: theme.easings.outExpo,
                        extrapolateRight: 'clamp',
                    }
                );
                cutBrightness = interpolate(
                    frame,
                    [0, Math.round(0.12 * fps)],
                    [1.25, 1.0],
                    {
                        easing: theme.easings.outExpo,
                        extrapolateRight: 'clamp',
                    }
                );
            } else {
                // zoom_flash & light_leak: Spring zoom settle dari 1.09 ke 1.0 + settling blur & brightness
                const settleSpring = spring({
                    fps,
                    frame,
                    config: { damping: 16, mass: 0.75, stiffness: 210 },
                });
                const enterScale = interpolate(settleSpring, [0, 1], [1.09, 1.0], {
                    extrapolateRight: 'clamp',
                });
                snapScale *= enterScale;

                blurAmount = interpolate(
                    frame,
                    [0, Math.round(0.12 * fps)],
                    [7, 0],
                    {
                        easing: theme.easings.outExpo,
                        extrapolateRight: 'clamp',
                    }
                );
                cutBrightness = interpolate(
                    frame,
                    [0, Math.round(0.12 * fps)],
                    [1.32, 1.0],
                    {
                        easing: theme.easings.outExpo,
                        extrapolateRight: 'clamp',
                    }
                );
            }
        } else {
            // Standar cut antarklip produk berikutnya
            snapScale = interpolate(frame, [0, Math.round(0.1 * fps)], [1.03, 1.0], {
                easing: theme.easings.outExpo,
                extrapolateRight: 'clamp',
            });
            cutBrightness = interpolate(frame, [0, Math.round(0.08 * fps)], [1.16, 1.0], {
                easing: theme.easings.outExpo,
                extrapolateRight: 'clamp',
            });
        }

        // Dynamic Keyword Punch-In Zoom saat kata kunci penting diucapkan oleh Voice Over
        const keywordPunch = computeKeywordPunchScale(
            clipStartFrame + frame,
            fps,
            voStartFrame,
            captions
        );
        snapScale *= keywordPunch;

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
                    transform: `scale(${kenBurnsScale * snapScale}) translateX(${translateX}px) translateY(${driftY}px)`,
                    filter:
                        blurAmount > 0
                            ? `brightness(${cutBrightness}) blur(${blurAmount}px)`
                            : `brightness(${cutBrightness})`,
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
// LAYER 2.5: TRANSISI KHUSUS HOOK (YOUTUBE/PODCAST) KE PRODUK
// ==========================================
const HookTransitionOverlay: React.FC<{
    theme: ThemeDefinition;
    type: 'zoom_flash' | 'whip_pan' | 'light_leak';
}> = ({ theme, type }) => {
    const frame = useCurrentFrame();
    const midPoint = 8;
    const totalFrames = 18;

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
    badgeStyle,
    urgencyTag,
}) => {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();

        // Layout baru ditangani komponen tersendiri (HookLayouts.tsx). Gaya lama jatuh ke bawah.
        const hookLayout = resolveHookLayout(cardStyle);
        if (hookLayout) {
            return (
                <HeadlineLayout
                    layout={hookLayout}
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

    if (cardStyle === 'sticky_note') {
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
    } else if (cardStyle === 'receipt') {
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
    } else if (cardStyle === 'label_tape') {
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
    } else if (cardStyle === 'quiet_serif') {
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
    themeStyle: themeStyleProp,
    cardStyle: cardStyleProp,
    captionStyle: captionStyleProp,
    badgeStyle: badgeStyleProp,
    showProgressBar,
    enableSfx,
    sfxPreset,
    ctaSound,
    sfxVolume,
    showSafeZoneGuide,
    watermarkText,
    showWatermark,
    watermarkOpacity,
    watermarkPosition,
    bgmTrack,
    bgmVolume,
    unmuteHook,
    hookVolume,
    showHookHeadline,
    karaokeHighlight,
    hookTransition = 'zoom_flash',
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
    const preset = resolvePreset(presetKey);
    const themeStyle = themeStyleProp ?? preset?.themeStyle;
    const cardStyle = cardStyleProp ?? preset?.cardStyle;
    const captionStyle = captionStyleProp ?? preset?.captionStyle;
    const badgeStyle = badgeStyleProp ?? preset?.badgeStyle;
    const theme = getTheme(themeStyle);
    let accumulatedFrames = 0;

    // Deteksi preset SFX aktif secara otomatis berdasarkan themeStyle jika tidak diset
    const activePreset: 'viral' | 'beauty' | 'tech' | 'minimal' =
        sfxPreset ||
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
                            hookTransition={hookTransition}
                            clipStartFrame={fromFrame}
                            voStartFrame={voStartFrame}
                            captions={voiceOverCaptions as Caption[] | undefined}
                        />
                    </Sequence>
                );
            })}

            {/* TRANSISI DINAMIS HOOK YOUTUBE KE PRODUK (OVERLAY LENS FLARE / WHIP STREAK) */}
            {hookTransition !== 'none' && clips.length > 1 && (
                <Sequence
                    from={Math.max(0, hookDuration - 8)}
                    durationInFrames={18}
                >
                    <HookTransitionOverlay
                        theme={theme}
                        type={hookTransition}
                    />
                </Sequence>
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

                    {/* Transisi Audio: Hook YouTube ke Produk (Whoosh mendahului cut visual agar apex audio pas) */}
                    <Sequence from={Math.max(0, hookDuration - 7)} durationInFrames={Math.round(0.45 * fps)}>
                        <Audio src={staticFile('sfx/swish-fast.wav')} volume={0.55 * vol} />
                    </Sequence>
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
                    <Sequence from={hookDuration + demoDuration} durationInFrames={Math.round(0.4 * fps)}>
                        <Audio src={staticFile('sfx/transition.wav')} volume={0.45 * vol} />
                    </Sequence>
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
                                ctaSound === 'ding'
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
                    <EditorialHeadline
                        badge={badgeText}
                        line1={hookLine1}
                        highlightLine={hookHighlight}
                        durationInFrames={hookDuration}
                        variant="hook"
                        theme={theme}
                        cardStyle={cardStyle}
                        badgeStyle={badgeStyle}
                        urgencyTag={urgencyTag}
                    />
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
                    <HookSubtitle
                        captions={voiceOverCaptions as Caption[]}
                        durationInFrames={Math.max(
                            1,
                            totalDurationInFrames - voStartFrame
                        )}
                        theme={theme}
                        karaokeHighlight={karaokeHighlight}
                        captionStyle={captionStyle}
                        // Naikkan caption saat kartu CTA muncul supaya keduanya tidak bersentuhan.
                        liftFromFrame={ctaStartFrame - voStartFrame}
                        liftPx={CAPTION_LIFT_IN_CTA}
                    />
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