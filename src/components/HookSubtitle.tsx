import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { Caption, createTikTokStyleCaptions } from '@remotion/captions';
import { ThemeDefinition } from '../theme';

export interface TimedSubtitle {
    text: string;
    startSec?: number;
    endSec?: number;
}

export interface HookSubtitleProps {
    text?: string;
    subtitles?: (string | TimedSubtitle)[];
    captions?: Caption[];
    durationInFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight?: boolean;
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
        // Pecah tiap 3-4 kata, atau jika ada tanda baca jeda (. , ? !)
        const hasPunctuation = /[.,?!]$/.test(w);
        if (currentChunk.length >= 4 || (hasPunctuation && currentChunk.length >= 2)) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        if (chunks.length > 0 && currentChunk.length <= 2) {
            // Gabung sisa kata yang terlalu pendek ke chunk sebelumnya
            chunks[chunks.length - 1] += ' ' + currentChunk.join(' ');
        } else {
            chunks.push(currentChunk.join(' '));
        }
    }

    return chunks;
};

/** Warna stabilo kata aktif mengikuti tema. */
const getKaraokeColor = (theme: ThemeDefinition): string =>
    theme.id === 'pastel'
        ? '#FF2E63'
        : theme.id === 'minimal'
          ? '#FFD166'
          : theme.colors.indicatorColor || '#FFE500';

/** Pilih teks hitam/putih agar kontras di atas warna stabilo (luminansi relatif WCAG). */
const readableTextOn = (hex: string): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return '#0B0B10';
    const n = parseInt(m[1], 16);
    const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return lum > 0.4 ? '#0B0B10' : '#FFFFFF';
};

// Padding/margin negatif dibuat KONSTAN untuk semua kata: hanya warna latar yang berubah
// saat kata aktif, sehingga lebar baris tidak pernah bergeser (sebelumnya bobot font
// 700 -> 900 membuat kata melebar dan seluruh kalimat bergeser tiap kata berganti).
const PILL_PAD_X = 10;
const PILL_PAD_Y = 2;

/**
 * Kartu subtitle bersama untuk mode Whisper (word-level) maupun mode teks manual.
 * Sebelumnya dua blok ~70 baris yang identik disalin di komponen ini.
 */
const SubtitleCard: React.FC<{
    words: RenderWord[];
    localFrame: number;
    durationFrames: number;
    theme: ThemeDefinition;
    karaokeHighlight: boolean;
    extraBottom?: number;
}> = ({ words, localFrame, durationFrames, theme, karaokeHighlight, extraBottom = 0 }) => {
    const { fps } = useVideoConfig();

    const activeColor = getKaraokeColor(theme);
    const activeTextColor = readableTextOn(activeColor);

    const enterSpring = spring({
        fps,
        frame: localFrame,
        config: theme.springs.snappy,
    });
    const enterY = interpolate(enterSpring, [0, 1], [16, 0]);

    // Fast exit di ~4 frame terakhir
    const exitProgress = interpolate(
        localFrame,
        [durationFrames - 4, durationFrames],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 460 + extraBottom, // Posisi aman di atas caption TikTok, jauh di bawah headline
                left: 48,
                right: 48,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 50,
                opacity: enterSpring * (1 - exitProgress),
                transform: `translateY(${enterY}px) scale(${0.96 + enterSpring * 0.04})`,
            }}
        >
            <div
                style={{
                    // Tanpa backdropFilter (mahal saat render 60 fps); latar dibuat sedikit lebih pekat.
                    backgroundColor: 'rgba(10, 9, 16, 0.86)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: 26,
                    padding: '16px 34px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px 20px',
                    maxWidth: 960,
                }}
            >
                {words.map((word, idx) => {
                    const isActive = karaokeHighlight && word.state === 'active';
                    const isPast = karaokeHighlight && word.state === 'past';

                    return (
                        <span
                            key={idx}
                            style={{
                                display: 'inline-block',
                                fontFamily: theme.fonts.display,
                                fontSize: 44,
                                fontWeight: 800, // konstan: jangan ubah per kata (lihat catatan di atas)
                                letterSpacing: -0.6,
                                lineHeight: 1.2,
                                padding: `${PILL_PAD_Y}px ${PILL_PAD_X}px`,
                                margin: `-${PILL_PAD_Y}px -${PILL_PAD_X}px`,
                                borderRadius: 14,
                                backgroundColor: isActive ? activeColor : 'transparent',
                                color: isActive
                                    ? activeTextColor
                                    : isPast || !karaokeHighlight
                                      ? '#FFFFFF'
                                      : 'rgba(255, 255, 255, 0.62)',
                                transform: isActive ? 'scale(1.06)' : 'scale(1)',
                                boxShadow: isActive ? `0 6px 18px ${activeColor}66` : 'none',
                                textShadow: isActive ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.8)',
                            }}
                        >
                            {word.text}
                        </span>
                    );
                })}
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
    liftFromFrame,
    liftPx = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const extraBottom =
        liftFromFrame !== undefined && liftPx > 0
            ? liftPx *
              interpolate(frame, [liftFromFrame, liftFromFrame + Math.round(0.25 * fps)], [0, 1], {
                  easing: Easing.out(Easing.cubic),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
              })
            : 0;

    // 0. JIKA MENGGUNAKAN CAPTIONS WHISPER AI (Word-level millisecond timestamps)
    const tikTokPages = React.useMemo(() => {
        if (!captions || captions.length === 0) return null;
        return createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: 1000,
            breakOnSilenceAfterMilliseconds: 700,
        }).pages;
    }, [captions]);

    // 1. Olah input text / subtitles menjadi array ProcessedChunk (Manual fallback)
    const chunks: ProcessedChunk[] = React.useMemo(() => {
        if (tikTokPages && tikTokPages.length > 0) return [];
        const rawChunks: { text: string; startFrame?: number; endFrame?: number; weight: number }[] = [];

        if (Array.isArray(subtitles) && subtitles.length > 0) {
            for (const item of subtitles) {
                if (typeof item === 'string') {
                    const textChunks = splitTextIntoChunks(item);
                    for (const tc of textChunks) {
                        rawChunks.push({
                            text: tc,
                            weight: Math.max(1, tc.split(' ').length),
                        });
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
            const textChunks = splitTextIntoChunks(text);
            for (const tc of textChunks) {
                rawChunks.push({
                    text: tc,
                    weight: Math.max(1, tc.split(' ').length),
                });
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

    // Mode Whisper captions (timestamp per kata)
    if (tikTokPages && tikTokPages.length > 0) {
        const currentMs = (frame / fps) * 1000;
        const activePage = tikTokPages.find(
            (p) => currentMs >= p.startMs && currentMs < p.startMs + p.durationMs
        );

        if (!activePage) return null;

        const words: RenderWord[] = activePage.tokens.map((token) => ({
            text: token.text.trim(),
            state:
                currentMs >= token.fromMs && currentMs < token.toMs
                    ? 'active'
                    : currentMs >= token.toMs
                      ? 'past'
                      : 'upcoming',
        }));

        return (
            <SubtitleCard
                words={words}
                localFrame={((currentMs - activePage.startMs) / 1000) * fps}
                durationFrames={(activePage.durationMs / 1000) * fps}
                theme={theme}
                karaokeHighlight={karaokeHighlight}
                extraBottom={extraBottom}
            />
        );
    }

    // Jika tidak ada subtitel manual, jangan render apapun
    if (chunks.length === 0) return null;

    // 2. Temukan chunk yang sedang aktif pada frame saat ini
    const activeChunkIndex = chunks.findIndex(
        (c) => frame >= c.startFrame && frame < c.endFrame
    );

    if (activeChunkIndex === -1) return null;

    const currentChunk = chunks[activeChunkIndex];
    const chunkLocalFrame = frame - currentChunk.startFrame;
    const chunkDuration = Math.max(1, currentChunk.endFrame - currentChunk.startFrame);

    // 3. Karaoke Timing: tentukan kata mana yang aktif saat ini
    const progressInChunk = Math.min(1, Math.max(0, chunkLocalFrame / chunkDuration));
    const activeWordIndex = Math.min(
        currentChunk.words.length - 1,
        Math.floor(progressInChunk * currentChunk.words.length)
    );

    const words: RenderWord[] = currentChunk.words.map((w, wIdx) => ({
        text: w,
        state: wIdx === activeWordIndex ? 'active' : wIdx < activeWordIndex ? 'past' : 'upcoming',
    }));

    return (
        <SubtitleCard
            words={words}
            localFrame={chunkLocalFrame}
            durationFrames={chunkDuration}
            theme={theme}
            karaokeHighlight={karaokeHighlight}
            extraBottom={extraBottom}
        />
    );
};
