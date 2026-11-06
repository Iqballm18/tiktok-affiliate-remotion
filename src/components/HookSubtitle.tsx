import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { Caption, createTikTokStyleCaptions } from '@remotion/captions';
import { ThemeDefinition } from '../theme';
import { FONT } from '../load-hook-fonts';
import { VariantVersion, resolveVariantVersion } from '../presets';

export interface TimedSubtitle {
    text: string;
    startSec?: number;
    endSec?: number;
}

/**
 * Sistem Subtitle / Caption Multi-Versi (4 keluarga gaya x 3 versi = 12 desain):
 * Diperkaya dengan menu penekanan `bang-motion` (pill + sparkle, under draw, dim-to-full, paper ink).
 *
 *  1. outline_pop :
 *     - v1: Classic TikTok Pop (kontur tegas, kata aktif terangkat & berwarna aksen)
 *     - v2: Kinetic Bounce 3D (kata aktif melompat + miring tipis + bayangan 3D tebal)
 *     - v3: Dot Indicator Pop (kata aktif berwarna aksen dengan indikator garis pendek di bawahnya)
 *
 *  2. marker_sweep :
 *     - v1: Stabilo Sweep (stabilo miring -8deg menyapu di belakang kata aktif & jejak samar di kata lewat)
 *     - v2: Bang-Motion Expanding Pill + Sparkle (.hl.pill: kapsul mengembang dari kiri + bintang ✦ di sudut kata aktif)
 *     - v3: Bang-Motion Underline Draw (.hl.under: garis bawah tebal warna aksen menggambar cepat dari kiri)
 *
 *  3. reveal :
 *     - v1: Word-by-Word Appear (kata muncul satu per satu saat diucapkan)
 *     - v2: Bang-Motion Dim-to-Full (semua kata sudah tampil redup 30%, menyala terang 100% saat diucapkan)
 *     - v3: Directional Blur-In (kata muncul dari efek blur vertikal ke tajam saat diucapkan)
 *
 *  4. plate :
 *     - v1: Dark Solid Plate (pelat gelap solid dengan garis bawah pada kata aktif)
 *     - v2: Warm Paper Ink Plate (kontras terang bang-motion: pelat kertas krem terang bertinta hitam + sorotan aksen)
 *     - v3: Frosted Capsule Chip (pelat kapsul gelap membulat dengan kata aktif di dalam chip warna aksen)
 */
export type CaptionStyle = 'outline_pop' | 'marker_sweep' | 'reveal' | 'plate';

export interface ResolvedCaptionSelection {
    style: CaptionStyle;
    impliedVersion?: VariantVersion;
}

export const resolveCaptionSelection = (raw?: string): ResolvedCaptionSelection => {
    const s = (raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
    switch (s) {
        case 'marker_sweep':
        case 'marker':
        case 'sweep':
        case 'stabilo':
            return { style: 'marker_sweep' };
        case 'pill_sparkle':
        case 'pill_pop':
        case 'bang_pill':
            return { style: 'marker_sweep', impliedVersion: 'v2' };
        case 'under_draw':
        case 'underline':
        case 'bang_under':
            return { style: 'marker_sweep', impliedVersion: 'v3' };

        case 'reveal':
        case 'typewriter':
        case 'quiet':
            return { style: 'reveal' };
        case 'dim_focus':
        case 'dim_to_full':
            return { style: 'reveal', impliedVersion: 'v2' };
        case 'blur_in':
        case 'kinetic_reveal':
            return { style: 'reveal', impliedVersion: 'v3' };

        case 'plate':
        case 'box':
        case 'classic':
            return { style: 'plate' };
        case 'paper_ink':
        case 'light_plate':
            return { style: 'plate', impliedVersion: 'v2' };
        case 'frosted_chip':
        case 'capsule_plate':
            return { style: 'plate', impliedVersion: 'v3' };

        case 'kinetic_bounce':
        case 'bounce_pop':
            return { style: 'outline_pop', impliedVersion: 'v2' };
        case 'dot_pop':
            return { style: 'outline_pop', impliedVersion: 'v3' };

        case 'outline_pop':
        case 'outline':
        case 'native':
        default:
            return { style: 'outline_pop' };
    }
};

export const resolveCaptionStyle = (raw?: string): CaptionStyle =>
    resolveCaptionSelection(raw).style;

export interface HookSubtitleProps {
    text?: string;
    subtitles?: (string | TimedSubtitle)[];
    captions?: Caption[];
    durationInFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight?: boolean;
    /** Gaya subtitle: outline_pop | marker_sweep | reveal | plate (atau alias spesifik). */
    captionStyle?: string;
    /** Versi subtitle di dalam gaya tersebut: v1 | v2 | v3. */
    captionVariant?: VariantVersion;
    /** Frame (relatif ke Sequence caption) saat caption mulai naik, mis. awal babak CTA. */
    liftFromFrame?: number;
    /** Seberapa jauh (px) caption naik mulai liftFromFrame. */
    liftPx?: number;
}

interface ProcessedChunk {
    text: string;
    words: string[];
    startFrame: number;
    endFrame: number;
}

type WordState = 'active' | 'past' | 'upcoming';

interface RenderWord {
    text: string;
    state: WordState;
    /** 0..1: seberapa jauh kata ini sudah diucapkan (hanya bermakna untuk kata aktif). */
    progress: number;
}

const splitTextIntoChunks = (fullText: string): string[] => {
    const rawWords = fullText.trim().split(/\s+/).filter(Boolean);
    if (rawWords.length <= 4) return [rawWords.join(' ')];

    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const w of rawWords) {
        currentChunk.push(w);
        const hasPunctuation = /[.,?!]$/.test(w);
        if (currentChunk.length >= 4 || (hasPunctuation && currentChunk.length >= 2)) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        if (chunks.length > 0 && currentChunk.length <= 2) {
            chunks[chunks.length - 1] += ' ' + currentChunk.join(' ');
        } else {
            chunks.push(currentChunk.join(' '));
        }
    }

    return chunks;
};

const accentFor = (theme: ThemeDefinition): string => {
    switch (theme.id) {
        case 'pastel':
            return '#FF8FA3';
        case 'flash_sale':
            return '#FFD23F';
        case 'minimal':
            return '#FFE600';
        case 'editorial':
        default:
            return '#FFC83D';
    }
};

const ring = (px: number, color = 'rgba(0, 0, 0, 0.92)'): string =>
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

const FONT_SIZE = 64;

const baseWordStyle: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: FONT.grotesk,
    fontSize: FONT_SIZE,
    fontWeight: 800,
    letterSpacing: -1.2,
    lineHeight: 1.12,
};

const SubtitleCard: React.FC<{
    words: RenderWord[];
    localFrame: number;
    durationFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight: boolean;
    style: CaptionStyle;
    version: VariantVersion;
    extraBottom?: number;
}> = ({ words, localFrame, durationFrames, theme, karaokeHighlight, style, version, extraBottom = 0 }) => {
    const { fps } = useVideoConfig();
    const accent = accentFor(theme);

    const enterSpring = spring({ fps, frame: localFrame, config: theme.springs.snappy });
    const enterY = interpolate(enterSpring, [0, 1], [14, 0]);
    const exitProgress = interpolate(localFrame, [durationFrames - 4, durationFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const renderWord = (word: RenderWord, idx: number): React.ReactNode => {
        const active = karaokeHighlight && word.state === 'active';
        const past = karaokeHighlight && word.state === 'past';
        const upcoming = karaokeHighlight && word.state === 'upcoming';

        // ============================================================
        // GAYA 1: MARKER SWEEP (v1: Stabilo | v2: Pill + Sparkle | v3: Underline Draw)
        // ============================================================
        if (style === 'marker_sweep') {
            const sweep = active ? Math.min(1, word.progress * 1.65) : past ? 1 : 0;

            // v2: Bang-Motion Expanding Pill + Sparkle (.hl.pill)
            if (version === 'v2') {
                return (
                    <span
                        key={idx}
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            margin: '0 9px',
                        }}
                    >
                        {active && (
                            <span
                                style={{
                                    position: 'absolute',
                                    left: -14,
                                    right: -14,
                                    top: 2,
                                    bottom: 2,
                                    borderRadius: 16,
                                    backgroundColor: accent,
                                    border: '2.5px solid rgba(0, 0, 0, 0.9)',
                                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
                                    transform: `scaleX(${sweep})`,
                                    transformOrigin: 'left center',
                                }}
                            />
                        )}
                        <span
                            style={{
                                ...baseWordStyle,
                                position: 'relative',
                                color: active ? '#111111' : '#FFFFFF',
                                textShadow: active
                                    ? 'none'
                                    : `${ring(3.5)}, 0 4px 16px rgba(0, 0, 0, 0.6)`,
                            }}
                        >
                            {word.text}
                        </span>
                        {active && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: -14,
                                    right: -18,
                                    fontSize: 26,
                                    color: '#FFFFFF',
                                    textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                                    transform: `scale(${sweep}) rotate(${(1 - sweep) * -35}deg)`,
                                }}
                            >
                                ✦
                            </span>
                        )}
                    </span>
                );
            }

            // v3: Bang-Motion Underline Draw (.hl.under)
            if (version === 'v3') {
                return (
                    <span
                        key={idx}
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            margin: '0 9px',
                        }}
                    >
                        <span
                            style={{
                                ...baseWordStyle,
                                position: 'relative',
                                color: active ? accent : '#FFFFFF',
                                textShadow: `${ring(3.5)}, 0 4px 16px rgba(0, 0, 0, 0.6)`,
                            }}
                        >
                            {word.text}
                        </span>
                        <span
                            style={{
                                position: 'absolute',
                                left: -4,
                                right: -4,
                                bottom: -4,
                                height: active ? 10 : 6,
                                borderRadius: 6,
                                backgroundColor: accent,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.55)',
                                opacity: active ? 1 : past ? 0.55 : 0,
                                transform: `scaleX(${sweep})`,
                                transformOrigin: 'left center',
                            }}
                        />
                    </span>
                );
            }

            // v1: Classic Skewed Stabilo Marker
            const barOpacity = active ? 1 : past ? 0.55 : 0;
            return (
                <span
                    key={idx}
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        margin: '0 9px',
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            left: -10,
                            right: -10,
                            bottom: 0,
                            height: '62%',
                            borderRadius: 6,
                            backgroundColor: accent,
                            opacity: barOpacity,
                            transform: `skewX(-8deg) scaleX(${sweep})`,
                            transformOrigin: 'left center',
                        }}
                    />
                    <span
                        style={{
                            ...baseWordStyle,
                            position: 'relative',
                            color: '#FFFFFF',
                            textShadow: `${ring(2.5)}, 0 4px 14px rgba(0, 0, 0, 0.55)`,
                        }}
                    >
                        {word.text}
                    </span>
                </span>
            );
        }

        // ============================================================
        // GAYA 2: REVEAL (v1: Word Appear | v2: Dim-to-Full | v3: Blur-In Kinetic)
        // ============================================================
        if (style === 'reveal') {
            const appear = upcoming ? 0 : active ? Math.min(1, word.progress * 5) : 1;

            // v2: Bang-Motion Dim-to-Full (`tanpa` sorotan: kata redup -> menyala penuh)
            if (version === 'v2') {
                return (
                    <span
                        key={idx}
                        style={{
                            ...baseWordStyle,
                            margin: '0 9px',
                            fontWeight: 700,
                            color: active ? accent : '#FFFFFF',
                            opacity: !karaokeHighlight ? 1 : upcoming ? 0.32 : 1,
                            transform: active ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
                            textShadow: `${ring(3.5)}, 0 5px 20px rgba(0, 0, 0, 0.65)`,
                        }}
                    >
                        {word.text}
                    </span>
                );
            }

            // v3: Directional Blur-In Reveal
            if (version === 'v3') {
                const blurPx = upcoming ? 10 : active ? Math.max(0, (1 - appear) * 8) : 0;
                return (
                    <span
                        key={idx}
                        style={{
                            ...baseWordStyle,
                            margin: '0 9px',
                            fontWeight: 700,
                            color: active ? accent : '#FFFFFF',
                            opacity: karaokeHighlight ? appear : 1,
                            filter: blurPx > 0.2 ? `blur(${blurPx}px)` : 'none',
                            transform: `translateY(${karaokeHighlight ? (1 - appear) * 16 : 0}px) scaleY(${karaokeHighlight ? 1 + (1 - appear) * 0.25 : 1
                                })`,
                            textShadow: `${ring(3.5)}, 0 5px 20px rgba(0, 0, 0, 0.6)`,
                        }}
                    >
                        {word.text}
                    </span>
                );
            }

            // v1: Classic Word-by-Word Appear
            return (
                <span
                    key={idx}
                    style={{
                        ...baseWordStyle,
                        margin: '0 9px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        opacity: karaokeHighlight ? appear : 1,
                        transform: `translateY(${karaokeHighlight ? (1 - appear) * 12 : 0}px)`,
                        textShadow: `${ring(3.5)}, 0 5px 20px rgba(0, 0, 0, 0.6)`,
                    }}
                >
                    {word.text}
                </span>
            );
        }

        // ============================================================
        // GAYA 3: PLATE (v1: Dark Solid | v2: Warm Paper Ink | v3: Frosted Capsule Chip)
        // ============================================================
        if (style === 'plate') {
            // v2: Warm Paper Ink Plate (Kontras Terang `bang-motion`)
            if (version === 'v2') {
                return (
                    <span
                        key={idx}
                        style={{
                            ...baseWordStyle,
                            fontSize: 52,
                            margin: '0 6px',
                            padding: '2px 10px',
                            borderRadius: 8,
                            backgroundColor: active ? '#111111' : 'transparent',
                            color: active ? '#F7F4EB' : upcoming ? 'rgba(17, 17, 17, 0.48)' : '#111111',
                        }}
                    >
                        {word.text}
                    </span>
                );
            }

            // v3: Frosted Capsule Chip
            if (version === 'v3') {
                return (
                    <span
                        key={idx}
                        style={{
                            ...baseWordStyle,
                            fontSize: 50,
                            margin: '0 6px',
                            padding: '3px 12px',
                            borderRadius: 999,
                            backgroundColor: active ? accent : 'transparent',
                            color: active ? '#090A0F' : '#FFFFFF',
                            opacity: upcoming ? 0.55 : 1,
                        }}
                    >
                        {word.text}
                    </span>
                );
            }

            // v1: Classic Dark Plate + Bottom Bar
            return (
                <span
                    key={idx}
                    style={{
                        ...baseWordStyle,
                        fontSize: 52,
                        margin: '0 8px',
                        color: '#FFFFFF',
                        opacity: upcoming ? 0.6 : 1,
                        boxShadow: active ? `inset 0 -8px 0 ${accent}` : 'none',
                    }}
                >
                    {word.text}
                </span>
            );
        }

        // ============================================================
        // GAYA 4: OUTLINE POP (v1: Classic Pop | v2: Kinetic Bounce 3D | v3: Dot Indicator Pop)
        // ============================================================
        if (version === 'v2') {
            return (
                <span
                    key={idx}
                    style={{
                        ...baseWordStyle,
                        margin: '0 10px',
                        color: active ? accent : '#FFFFFF',
                        transform: active
                            ? 'translateY(-9px) scale(1.13) rotate(-2deg)'
                            : 'translateY(0) scale(1) rotate(0deg)',
                        textShadow: active
                            ? `${ring(4.5)}, 0 10px 0 rgba(0, 0, 0, 0.9), 0 14px 24px rgba(0, 0, 0, 0.7)`
                            : `${ring(4.5)}, 0 6px 18px rgba(0, 0, 0, 0.6)`,
                    }}
                >
                    {word.text}
                </span>
            );
        }

        if (version === 'v3') {
            return (
                <span
                    key={idx}
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        margin: '0 9px',
                    }}
                >
                    <span
                        style={{
                            ...baseWordStyle,
                            color: active ? accent : '#FFFFFF',
                            transform: active ? 'translateY(-6px) scale(1.06)' : 'translateY(0) scale(1)',
                            textShadow: `${ring(4.5)}, 0 6px 18px rgba(0, 0, 0, 0.6)`,
                        }}
                    >
                        {word.text}
                    </span>
                    {active && (
                        <span
                            style={{
                                position: 'absolute',
                                left: '25%',
                                right: '25%',
                                bottom: -6,
                                height: 7,
                                borderRadius: 999,
                                backgroundColor: accent,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.8)',
                            }}
                        />
                    )}
                </span>
            );
        }

        // v1: Classic Outline Pop
        return (
            <span
                key={idx}
                style={{
                    ...baseWordStyle,
                    margin: '0 9px',
                    color: active ? accent : '#FFFFFF',
                    transform: active ? 'translateY(-5px) scale(1.07)' : 'translateY(0) scale(1)',
                    textShadow: `${ring(4.5)}, 0 6px 18px rgba(0, 0, 0, 0.6)`,
                }}
            >
                {word.text}
            </span>
        );
    };

    const isPlate = style === 'plate';
    const plateContainerStyle: React.CSSProperties =
        !isPlate
            ? {}
            : version === 'v2'
                ? {
                    backgroundColor: '#F7F4EB',
                    border: '2.5px solid #111111',
                    borderRadius: 14,
                    padding: '14px 26px 16px',
                    boxShadow: '6px 6px 0 rgba(0, 0, 0, 0.85), 0 14px 30px rgba(0, 0, 0, 0.45)',
                }
                : version === 'v3'
                    ? {
                        backgroundColor: 'rgba(12, 14, 20, 0.88)',
                        border: '1.5px solid rgba(255, 255, 255, 0.24)',
                        borderRadius: 999,
                        padding: '12px 28px 14px',
                        boxShadow: '0 14px 32px rgba(0, 0, 0, 0.55)',
                    }
                    : {
                        backgroundColor: 'rgba(12, 12, 14, 0.94)',
                        borderRadius: 10,
                        padding: '16px 26px 18px',
                        boxShadow: '0 14px 30px rgba(0, 0, 0, 0.5)',
                    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 460 + extraBottom,
                left: 48,
                right: 48,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 50,
                opacity: enterSpring * (1 - exitProgress),
                transform: `translateY(${enterY}px)`,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    rowGap: isPlate ? 4 : 0,
                    maxWidth: 940,
                    textAlign: 'center',
                    ...plateContainerStyle,
                }}
            >
                {words.map(renderWord)}
            </div>
        </div>
    );
};

export const HookSubtitle: React.FC<HookSubtitleProps> = ({
    text,
    subtitles,
    captions,
    durationInFrames,
    theme,
    karaokeHighlight = true,
    captionStyle,
    captionVariant,
    liftFromFrame,
    liftPx = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const resolved = resolveCaptionSelection(captionStyle);
    const style = resolved.style;
    const version = resolveVariantVersion(captionVariant || resolved.impliedVersion, 'v1');

    const extraBottom =
        liftFromFrame !== undefined && liftPx > 0
            ? liftPx *
            interpolate(frame, [liftFromFrame, liftFromFrame + Math.round(0.25 * fps)], [0, 1], {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            })
            : 0;

    // 0. Whisper captions (timestamp per kata)
    const tikTokPages = React.useMemo(() => {
        if (!captions || captions.length === 0) return null;
        return createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: 1000,
            breakOnSilenceAfterMilliseconds: 700,
        }).pages;
    }, [captions]);

    // 1. Subtitle manual -> chunk
    const chunks: ProcessedChunk[] = React.useMemo(() => {
        if (tikTokPages && tikTokPages.length > 0) return [];
        const rawChunks: { text: string; startFrame?: number; endFrame?: number; weight: number }[] = [];

        if (Array.isArray(subtitles) && subtitles.length > 0) {
            for (const item of subtitles) {
                if (typeof item === 'string') {
                    for (const tc of splitTextIntoChunks(item)) {
                        rawChunks.push({ text: tc, weight: Math.max(1, tc.split(' ').length) });
                    }
                } else if (item && typeof item === 'object' && item.text) {
                    const sf = item.startSec !== undefined ? Math.round(item.startSec * fps) : undefined;
                    const ef = item.endSec !== undefined ? Math.round(item.endSec * fps) : undefined;
                    rawChunks.push({
                        text: item.text,
                        startFrame: sf,
                        endFrame: ef,
                        weight: Math.max(1, item.text.split(' ').length),
                    });
                }
            }
        } else if (text && text.trim().length > 0) {
            for (const tc of splitTextIntoChunks(text)) {
                rawChunks.push({ text: tc, weight: Math.max(1, tc.split(' ').length) });
            }
        }

        if (rawChunks.length === 0) return [];

        const totalWeight = rawChunks.reduce((acc, c) => acc + c.weight, 0);
        let currentFrameCursor = 0;

        return rawChunks.map((c) => {
            let startFrame = c.startFrame;
            let endFrame = c.endFrame;

            if (startFrame === undefined) {
                startFrame = currentFrameCursor;
                const chunkDur = Math.round((c.weight / totalWeight) * durationInFrames);
                endFrame = Math.min(durationInFrames, startFrame + chunkDur);
                currentFrameCursor = endFrame;
            } else if (endFrame === undefined) {
                endFrame = durationInFrames;
            }

            return {
                text: c.text,
                words: c.text.trim().split(/\s+/).filter(Boolean),
                startFrame,
                endFrame,
            };
        });
    }, [tikTokPages, text, subtitles, durationInFrames, fps]);

    // Mode Whisper
    if (tikTokPages && tikTokPages.length > 0) {
        const currentMs = (frame / fps) * 1000;
        const activePage = tikTokPages.find(
            (p) => currentMs >= p.startMs && currentMs < p.startMs + p.durationMs,
        );

        if (!activePage) return null;

        const words: RenderWord[] = activePage.tokens.map((token) => {
            const state: WordState =
                currentMs >= token.fromMs && currentMs < token.toMs
                    ? 'active'
                    : currentMs >= token.toMs
                        ? 'past'
                        : 'upcoming';
            const span = Math.max(1, token.toMs - token.fromMs);
            return {
                text: token.text.trim(),
                state,
                progress:
                    state === 'active'
                        ? Math.min(1, Math.max(0, (currentMs - token.fromMs) / span))
                        : state === 'past'
                            ? 1
                            : 0,
            };
        });

        return (
            <SubtitleCard
                words={words}
                localFrame={((currentMs - activePage.startMs) / 1000) * fps}
                durationFrames={(activePage.durationMs / 1000) * fps}
                theme={theme}
                karaokeHighlight={karaokeHighlight}
                style={style}
                version={version}
                extraBottom={extraBottom}
            />
        );
    }

    if (chunks.length === 0) return null;

    const activeChunkIndex = chunks.findIndex((c) => frame >= c.startFrame && frame < c.endFrame);
    if (activeChunkIndex === -1) return null;

    const currentChunk = chunks[activeChunkIndex];
    const chunkLocalFrame = frame - currentChunk.startFrame;
    const chunkDuration = Math.max(1, currentChunk.endFrame - currentChunk.startFrame);

    const progressInChunk = Math.min(1, Math.max(0, chunkLocalFrame / chunkDuration));
    const scaled = progressInChunk * currentChunk.words.length;
    const activeWordIndex = Math.min(currentChunk.words.length - 1, Math.floor(scaled));

    const words: RenderWord[] = currentChunk.words.map((w, wIdx) => ({
        text: w,
        state: wIdx === activeWordIndex ? 'active' : wIdx < activeWordIndex ? 'past' : 'upcoming',
        progress:
            wIdx === activeWordIndex
                ? Math.min(1, Math.max(0, scaled - wIdx))
                : wIdx < activeWordIndex
                    ? 1
                    : 0,
    }));

    return (
        <SubtitleCard
            words={words}
            localFrame={chunkLocalFrame}
            durationFrames={chunkDuration}
            theme={theme}
            karaokeHighlight={karaokeHighlight}
            style={style}
            version={version}
            extraBottom={extraBottom}
        />
    );
};
