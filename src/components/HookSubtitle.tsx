import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { Caption, createTikTokStyleCaptions } from '@remotion/captions';
import { ThemeDefinition } from '../theme';
import { FONT } from '../load-hook-fonts';

export interface TimedSubtitle {
    text: string;
    startSec?: number;
    endSec?: number;
}

/**
 * Gaya subtitle:
 *  - outline_pop  (default) teks putih dengan kontur gelap, kata yang sedang diucapkan terangkat dan berwarna.
 *                 Gaya subtitle asli TikTok/CapCut, terbaca di footage apa pun.
 *  - marker_sweep stabilo menyapu di belakang kata yang diucapkan, lalu tertinggal samar sebagai
 *                 penanda "sudah dibaca". Cocok untuk promo dan konten berenergi tinggi.
 *  - reveal       kata muncul satu per satu saat diucapkan, tanpa warna sorot. Tenang, cocok untuk
 *                 skincare dan lifestyle.
 *  - plate        satu pelat gelap solid, kata aktif bergaris bawah. Untuk footage yang sangat ramai.
 */
export type CaptionStyle = 'outline_pop' | 'marker_sweep' | 'reveal' | 'plate';

export const resolveCaptionStyle = (raw?: string): CaptionStyle => {
    const s = (raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
    switch (s) {
        case 'marker_sweep':
        case 'marker':
        case 'sweep':
        case 'stabilo':
            return 'marker_sweep';
        case 'reveal':
        case 'typewriter':
        case 'quiet':
            return 'reveal';
        case 'plate':
        case 'box':
        case 'classic':
            return 'plate';
        case 'outline_pop':
        case 'outline':
        case 'native':
        default:
            return 'outline_pop';
    }
};

export interface HookSubtitleProps {
    text?: string;
    subtitles?: (string | TimedSubtitle)[];
    captions?: Caption[];
    durationInFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight?: boolean;
    /** Gaya subtitle: outline_pop | marker_sweep | reveal | plate. Kosong = outline_pop. */
    captionStyle?: string;
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

/**
 * Memecah kalimat panjang menjadi kelompok 3-5 kata (chunk)
 * agar nyaman dibaca dan tidak memenuhi layar secara masif.
 */
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

/**
 * Warna kata aktif per tema. Sengaja bukan hijau-lime neon: lime di atas hitam adalah
 * kombinasi paling umum di desain buatan AI. Dipilih hangat agar kontras dengan
 * kulit, makanan, dan kemasan yang dominan di footage affiliate.
 */
const accentFor = (theme: ThemeDefinition): string => {
    switch (theme.id) {
        case 'pastel':
            return '#FF8FA3';
        case 'flash_sale':
            return '#FFD23F';
        case 'minimal':
            return '#FFFFFF';
        case 'editorial':
        default:
            return '#FFC83D';
    }
};

/** Kontur gelap 8 arah, lebih aman dari -webkit-text-stroke yang membuat sudut huruf lancip. */
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
    // Lebar kata tidak pernah berubah antar state: hanya transform/warna/opacity yang bergerak,
    // jadi baris tidak bergeser saat kata berganti.
};

const SubtitleCard: React.FC<{
    words: RenderWord[];
    localFrame: number;
    durationFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight: boolean;
    style: CaptionStyle;
    extraBottom?: number;
}> = ({ words, localFrame, durationFrames, theme, karaokeHighlight, style, extraBottom = 0 }) => {
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

        if (style === 'marker_sweep') {
            // Stabilo menyapu selama kata diucapkan; kata yang sudah lewat menyisakan jejak samar.
            const sweep = active ? Math.min(1, word.progress * 1.6) : past ? 1 : 0;
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
                            // kontur lebih tipis dari outline_pop supaya stabilo di belakang tetap terlihat
                            textShadow: `${ring(2.5)}, 0 4px 14px rgba(0, 0, 0, 0.55)`,
                        }}
                    >
                        {word.text}
                    </span>
                </span>
            );
        }

        if (style === 'reveal') {
            // Kata hadir saat diucapkan. Tata letak sudah dipesan (opacity 0, bukan dihapus) agar tidak melompat.
            const appear = upcoming ? 0 : active ? Math.min(1, word.progress * 5) : 1;
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

        if (style === 'plate') {
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

        // outline_pop
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

    const plate = style === 'plate';

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 460 + extraBottom, // di atas caption TikTok, jauh di bawah headline
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
                    rowGap: plate ? 4 : 0,
                    maxWidth: 940,
                    textAlign: 'center',
                    ...(plate
                        ? {
                              backgroundColor: 'rgba(12, 12, 14, 0.94)',
                              borderRadius: 10,
                              padding: '16px 26px 18px',
                              boxShadow: '0 14px 30px rgba(0, 0, 0, 0.5)',
                          }
                        : {}),
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
    liftFromFrame,
    liftPx = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const style = resolveCaptionStyle(captionStyle);

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
                    state === 'active' ? Math.min(1, Math.max(0, (currentMs - token.fromMs) / span)) : state === 'past' ? 1 : 0,
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

    // Timing karaoke manual: bagi rata durasi chunk ke tiap kata
    const progressInChunk = Math.min(1, Math.max(0, chunkLocalFrame / chunkDuration));
    const scaled = progressInChunk * currentChunk.words.length;
    const activeWordIndex = Math.min(currentChunk.words.length - 1, Math.floor(scaled));

    const words: RenderWord[] = currentChunk.words.map((w, wIdx) => ({
        text: w,
        state: wIdx === activeWordIndex ? 'active' : wIdx < activeWordIndex ? 'past' : 'upcoming',
        progress:
            wIdx === activeWordIndex ? Math.min(1, Math.max(0, scaled - wIdx)) : wIdx < activeWordIndex ? 1 : 0,
    }));

    return (
        <SubtitleCard
            words={words}
            localFrame={chunkLocalFrame}
            durationFrames={chunkDuration}
            theme={theme}
            karaokeHighlight={karaokeHighlight}
            style={style}
            extraBottom={extraBottom}
        />
    );
};
