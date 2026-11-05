import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
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
}

interface ProcessedChunk {
    text: string;
    words: string[];
    startFrame: number;
    endFrame: number;
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

export const HookSubtitle: React.FC<HookSubtitleProps> = ({
    text,
    subtitles,
    captions,
    durationInFrames,
    theme,
    karaokeHighlight = true,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Aksen warna aktif mengikuti tema (kuning cerah di editorial/flash_sale, rose coral di pastel, gold di minimal)
    const activeHighlightColor =
        theme.id === 'pastel'
            ? '#FF2E63'
            : theme.id === 'minimal'
              ? '#FFD166'
              : theme.colors.indicatorColor || '#FFE500';

    // 0. JIKA MENGGUNAKAN CAPTIONS WHISPER AI (Word-level millisecond timestamps)
    const tikTokPages = React.useMemo(() => {
        if (!captions || captions.length === 0) return null;
        return createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: 1500,
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
                            weight: tc.split(/\s+/).length,
                        });
                    }
                } else if (item && typeof item.text === 'string') {
                    const sf = item.startSec !== undefined ? Math.round(item.startSec * fps) : undefined;
                    const ef = item.endSec !== undefined ? Math.round(item.endSec * fps) : undefined;
                    const wordsInItem = item.text.trim().split(/\s+/).filter(Boolean);

                    if (wordsInItem.length > 4 && sf !== undefined && ef !== undefined && ef > sf) {
                        const subChunks = splitTextIntoChunks(item.text);
                        const subDuration = (ef - sf) / subChunks.length;
                        subChunks.forEach((sc, scIdx) => {
                            const subStart = Math.round(sf + scIdx * subDuration);
                            const subEnd = Math.round(sf + (scIdx + 1) * subDuration);
                            rawChunks.push({
                                text: sc,
                                startFrame: subStart,
                                endFrame: subEnd,
                                weight: sc.split(/\s+/).length,
                            });
                        });
                    } else {
                        rawChunks.push({
                            text: item.text,
                            startFrame: sf,
                            endFrame: ef,
                            weight: wordsInItem.length,
                        });
                    }
                }
            }
        } else if (typeof text === 'string' && text.trim().length > 0) {
            const textChunks = splitTextIntoChunks(text);
            for (const tc of textChunks) {
                rawChunks.push({
                    text: tc,
                    weight: tc.split(/\s+/).length,
                });
            }
        }

        if (rawChunks.length === 0) return [];

        const totalWeight = rawChunks.reduce((acc, c) => acc + c.weight, 0);
        let currentFrame = 0;

        return rawChunks.map((chunk) => {
            const chunkDuration = chunk.endFrame !== undefined && chunk.startFrame !== undefined
                ? chunk.endFrame - chunk.startFrame
                : Math.round((chunk.weight / totalWeight) * durationInFrames);

            const startFrame = chunk.startFrame !== undefined ? chunk.startFrame : currentFrame;
            const endFrame = chunk.endFrame !== undefined ? chunk.endFrame : startFrame + chunkDuration;

            currentFrame = endFrame;

            return {
                text: chunk.text,
                words: chunk.text.split(/\s+/).filter(Boolean),
                startFrame,
                endFrame,
            };
        });
    }, [tikTokPages, text, subtitles, durationInFrames, fps]);

    // Jika mode Whisper captions aktif:
    if (tikTokPages && tikTokPages.length > 0) {
        const currentMs = (frame / fps) * 1000;
        const activePage = tikTokPages.find(
            (p) => currentMs >= p.startMs && currentMs < p.startMs + p.durationMs
        );

        if (!activePage) return null;

        const pageLocalMs = currentMs - activePage.startMs;
        const pageLocalFrame = (pageLocalMs / 1000) * fps;
        const pageDurationFrames = (activePage.durationMs / 1000) * fps;

        const enterSpring = spring({
            fps,
            frame: pageLocalFrame,
            config: theme.springs.snappy,
        });

        const enterY = interpolate(enterSpring, [0, 1], [16, 0]);

        const exitProgress = interpolate(
            pageLocalFrame,
            [pageDurationFrames - 4, pageDurationFrames],
            [0, 1],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: 460,
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
                        backgroundColor: 'rgba(12, 10, 18, 0.78)',
                        backdropFilter: 'blur(20px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.20)',
                        borderRadius: 22,
                        padding: '14px 28px',
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px 14px',
                        maxWidth: 960,
                    }}
                >
                    {activePage.tokens.map((token, tIdx) => {
                        const isTokenActive =
                            karaokeHighlight &&
                            currentMs >= token.fromMs &&
                            currentMs < token.toMs;
                        const isTokenPast =
                            karaokeHighlight && currentMs >= token.toMs;

                        return (
                            <span
                                key={tIdx}
                                style={{
                                    fontFamily: theme.fonts.display,
                                    fontSize: 42,
                                    fontWeight: isTokenActive ? 900 : 700,
                                    letterSpacing: -0.6,
                                    lineHeight: 1.25,
                                    color: isTokenActive
                                        ? activeHighlightColor
                                        : isTokenPast
                                          ? '#FFFFFF'
                                          : karaokeHighlight
                                            ? 'rgba(255, 255, 255, 0.70)'
                                            : '#FFFFFF',
                                    transform: isTokenActive ? 'scale(1.08)' : 'scale(1.0)',
                                    display: 'inline-block',
                                    textShadow: isTokenActive
                                        ? `0 0 16px ${activeHighlightColor}88, 0 2px 8px rgba(0,0,0,0.9)`
                                        : '0 2px 8px rgba(0, 0, 0, 0.8)',
                                }}
                            >
                                {token.text.trim()}
                            </span>
                        );
                    })}
                </div>
            </div>
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

    // Animasi Entrance untuk chunk baru
    const enterSpring = spring({
        fps,
        frame: chunkLocalFrame,
        config: theme.springs.snappy,
    });

    const enterY = interpolate(enterSpring, [0, 1], [16, 0]);

    // Fast Exit di akhir durasi chunk (3 frame terakhir)
    const exitProgress = interpolate(
        chunkLocalFrame,
        [chunkDuration - 4, chunkDuration],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    // 3. Karaoke Timing: tentukan kata mana yang aktif saat ini
    const progressInChunk = Math.min(1, Math.max(0, chunkLocalFrame / chunkDuration));
    const activeWordIndex = Math.min(
        currentChunk.words.length - 1,
        Math.floor(progressInChunk * currentChunk.words.length)
    );

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 460, // Posisi aman di atas caption TikTok, jauh di bawah headline
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
                    backgroundColor: 'rgba(12, 10, 18, 0.78)',
                    backdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.20)',
                    borderRadius: 22,
                    padding: '14px 28px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px 14px',
                    maxWidth: 960,
                }}
            >
                {/* Teks Subtitel (Karaoke Word-by-Word atau Clean Phrase) */}
                {currentChunk.words.map((word, wIdx) => {
                    const isActive = karaokeHighlight ? wIdx === activeWordIndex : false;
                    const isPast = karaokeHighlight ? wIdx < activeWordIndex : false;

                    return (
                        <span
                            key={wIdx}
                            style={{
                                fontFamily: theme.fonts.display,
                                fontSize: 42,
                                fontWeight: isActive ? 900 : 700,
                                letterSpacing: -0.6,
                                lineHeight: 1.25,
                                color: isActive
                                    ? activeHighlightColor
                                    : isPast
                                      ? '#FFFFFF'
                                      : karaokeHighlight
                                        ? 'rgba(255, 255, 255, 0.70)'
                                        : '#FFFFFF',
                                transform: isActive ? 'scale(1.08)' : 'scale(1.0)',
                                display: 'inline-block',
                                textShadow: isActive
                                    ? `0 0 16px ${activeHighlightColor}88, 0 2px 8px rgba(0,0,0,0.9)`
                                    : '0 2px 8px rgba(0, 0, 0, 0.8)',
                            }}
                        >
                            {word}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};
