import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ThemeDefinition } from '../theme';
import { FONT } from '../load-hook-fonts';

/**
 * 6 layout headline baru. Tiap layout adalah "bahan" yang berbeda, bukan variasi warna:
 *
 *  sticky_note  catatan tempel tulisan tangan, menempel dengan selotip   -> rumah tangga, dapur, organizer
 *  receipt      struk thermal yang dicetak baris demi baris             -> promo, bundle, harga, event
 *  chat_thread  percakapan: ada yang bertanya, kamu yang menjawab        -> ibu & bayi, kesehatan, curhat problem-solution
 *  type_stack   tipografi poster tanpa kotak, kata naik dari topeng      -> fashion, snack, fitness, umum
 *  label_tape   pita label-maker, tercetak per baris                    -> gadget, alat, elektronik, otomotif
 *  quiet_serif  serif italic besar, satu garis tipis, ruang kosong      -> skincare, parfum, perhiasan, premium
 *
 * Aturan yang dipakai di semua layout (supaya tidak terbaca buatan mesin):
 *  - Tidak ada label huruf kapital ber-letter-spacing di atas judul. Teks badge dinormalkan
 *    ke huruf kecil biasa (sentence case) dan diberi peran struktural di tiap layout
 *    (nama chip percakapan, cap stempel, pita merah, dst).
 *  - Tidak ada satu kata berwarna di tengah kalimat. Penekanan datang dari ukuran, bahan, atau posisi.
 *  - Tidak ada glow, tidak ada gradient pengisi, tidak ada kartu kaca.
 *  - Gerak hanya satu momen masuk per layout, sesuai bahannya (menempel, dicetak, mengetik, naik dari topeng).
 *
 * Isi data tetap tiga field yang sama: badge, line1, highlightLine. Tidak ada perubahan JSON.
 */

export type HookLayout =
    | 'sticky_note'
    | 'receipt'
    | 'chat_thread'
    | 'type_stack'
    | 'label_tape'
    | 'quiet_serif';

export const HOOK_LAYOUTS: HookLayout[] = [
    'sticky_note',
    'receipt',
    'chat_thread',
    'type_stack',
    'label_tape',
    'quiet_serif',
];

/** Mengembalikan null jika bukan layout baru (berarti pakai gaya lama di AffiliateVideo.tsx). */
export const resolveHookLayout = (raw?: string): HookLayout | null => {
    const s = (raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
    switch (s) {
        case 'sticky_note':
        case 'sticky':
        case 'post_it':
        case 'note':
            return 'sticky_note';
        case 'receipt':
        case 'struk':
        case 'nota':
            return 'receipt';
        case 'chat_thread':
        case 'chat':
        case 'dm':
            return 'chat_thread';
        case 'type_stack':
        case 'big_type':
        case 'poster':
            return 'type_stack';
        case 'label_tape':
        case 'label':
        case 'dymo':
            return 'label_tape';
        case 'quiet_serif':
        case 'serif':
        case 'whisper':
            return 'quiet_serif';
        default:
            return null;
    }
};

export interface HeadlineLayoutProps {
    badge?: string;
    line1: string;
    highlightLine: string;
    durationInFrames: number;
    variant: 'hook' | 'solution';
    theme: ThemeDefinition;
    urgencyTag?: string;
}

// ------------------------------------------------------------
// Helper bersama
// ------------------------------------------------------------

/** "IBU-IBU WAJIB TAU" -> "Ibu-ibu wajib tau". Teks yang sudah bercampur huruf dibiarkan. */
const tidy = (s?: string): string => {
    if (!s) return '';
    const t = s.trim();
    const letters = t.replace(/[^\p{L}]/gu, '');
    if (letters.length > 2 && t === t.toUpperCase() && t !== t.toLowerCase()) {
        const l = t.toLowerCase();
        return l.charAt(0).toUpperCase() + l.slice(1);
    }
    return t;
};

/** Potong teks jadi baris pendek, dipakai layout yang menyusun potongan (label_tape). */
const wrapLines = (text: string, maxChars: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
        if (cur && (cur + ' ' + w).length > maxChars) {
            lines.push(cur);
            cur = w;
        } else {
            cur = cur ? cur + ' ' + w : w;
        }
    }
    if (cur) lines.push(cur);
    return lines;
};

const ring = (px: number, color = 'rgba(0, 0, 0, 0.9)'): string =>
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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Kemajuan 0..1 antara dua frame, dengan easing opsional. */
const prog = (
    frame: number,
    start: number,
    len: number,
    easing?: (t: number) => number,
): number =>
    interpolate(frame, [start, start + Math.max(1, len)], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing,
    });

/** Kuantisasi: gerak bertahap seperti mesin cetak, bukan mulus. */
const stepped = (p: number, steps: number) => Math.round(p * steps) / steps;

const useBase = (durationInFrames: number, theme: ThemeDefinition) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const exit = interpolate(
        frame,
        [durationInFrames - Math.round(0.2 * fps), durationInFrames],
        [0, 1],
        {
            easing: theme.easings.inCubic,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        },
    );
    return { frame, fps, exit };
};

const Shell: React.FC<{
    exit: number;
    top?: number;
    left?: number;
    right?: number;
    children: React.ReactNode;
}> = ({ exit, top = 200, left = 56, right = 56, children }) => (
    <div
        style={{
            position: 'absolute',
            top,
            left,
            right,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            opacity: 1 - exit,
            transform: `translateY(${-exit * 24}px)`,
        }}
    >
        {children}
    </div>
);

// ------------------------------------------------------------
// 1. STICKY NOTE
// ------------------------------------------------------------
const StickyNote: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);

    const slap = spring({
        fps,
        frame: frame - delay,
        config: { damping: 13, stiffness: 240, mass: 0.7 },
    });
    const rot = interpolate(slap, [0, 1], [-9, -2.2]);
    const scale = interpolate(slap, [0, 1], [1.18, 1]);

    const write1 = prog(frame, delay + Math.round(0.2 * fps), Math.round(0.5 * fps), p.theme.easings.outExpo);
    const write2 = prog(frame, delay + Math.round(0.55 * fps), Math.round(0.45 * fps), p.theme.easings.outExpo);
    const under = prog(frame, delay + Math.round(0.95 * fps), Math.round(0.4 * fps), p.theme.easings.outExpo);

    const badge = tidy(p.badge);

    return (
        <Shell exit={exit} top={210} left={64}>
            <div
                style={{
                    position: 'relative',
                    width: 790,
                    opacity: clamp01(slap * 3),
                    transform: `rotate(${rot}deg) scale(${scale})`,
                    transformOrigin: '50% 0%',
                }}
            >
                {/* selotip */}
                <div
                    style={{
                        position: 'absolute',
                        top: -22,
                        left: '50%',
                        width: 150,
                        height: 44,
                        marginLeft: -75,
                        backgroundColor: 'rgba(255, 255, 255, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.7)',
                        transform: 'rotate(3deg)',
                        zIndex: 2,
                    }}
                />
                <div
                    style={{
                        backgroundColor: '#F6E27F',
                        padding: '48px 44px 40px',
                        boxShadow: '0 2px 0 rgba(0, 0, 0, 0.10), 0 26px 30px -14px rgba(0, 0, 0, 0.6)',
                    }}
                >
                    <div style={{ clipPath: `inset(0 ${(1 - write1) * 100}% 0 0)` }}>
                        <span
                            style={{
                                fontFamily: FONT.hand,
                                fontSize: 58,
                                fontWeight: 700,
                                lineHeight: 1.08,
                                color: '#2A2823',
                            }}
                        >
                            {tidy(p.line1)}
                        </span>
                    </div>

                    <div style={{ position: 'relative', marginTop: 14, display: 'inline-block' }}>
                        <div style={{ clipPath: `inset(0 ${(1 - write2) * 100}% 0 0)` }}>
                            <span
                                style={{
                                    fontFamily: FONT.grotesk,
                                    fontSize: isHook ? 64 : 56,
                                    fontWeight: 800,
                                    letterSpacing: -1.4,
                                    lineHeight: 1.04,
                                    color: '#141412',
                                }}
                            >
                                {tidy(p.highlightLine)}
                            </span>
                        </div>
                        {/* garis bawah gambar tangan, menggarisbawahi seluruh baris */}
                        <svg
                            viewBox="0 0 500 24"
                            preserveAspectRatio="none"
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: -18,
                                width: '100%',
                                height: 22,
                                overflow: 'visible',
                            }}
                        >
                            <path
                                d="M2 15 C 90 4, 170 22, 270 9 S 430 15, 498 6"
                                fill="none"
                                stroke="#D8412F"
                                strokeWidth={6}
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                pathLength={1}
                                strokeDasharray={1}
                                strokeDashoffset={1 - under}
                            />
                        </svg>
                    </div>
                </div>

                {badge ? (
                    <div
                        style={{
                            position: 'absolute',
                            right: -14,
                            bottom: -28,
                            backgroundColor: '#FFFFFF',
                            color: '#1B1B19',
                            fontFamily: FONT.grotesk,
                            fontSize: 30,
                            fontWeight: 700,
                            padding: '8px 20px',
                            transform: 'rotate(3deg)',
                            boxShadow: '0 10px 18px -6px rgba(0, 0, 0, 0.5)',
                            opacity: clamp01(prog(frame, delay + Math.round(0.3 * fps), Math.round(0.2 * fps))),
                        }}
                    >
                        {badge}
                    </div>
                ) : null}
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// 2. RECEIPT
// ------------------------------------------------------------
const PAPER = '#F2F3EF';
const INK = '#1E2022';

const Zigzag: React.FC<{ width: number; color: string }> = ({ width, color }) => {
    const step = 20;
    const n = Math.ceil(width / step);
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) pts.push(`${i * step},${i % 2 === 0 ? 0 : 14}`);
    return (
        <svg width={width} height={14} viewBox={`0 0 ${width} 14`} style={{ display: 'block' }}>
            <polygon points={`0,0 ${pts.join(' ')} ${n * step},0`} fill={color} />
        </svg>
    );
};

const Receipt: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const W = 740;

    // Struk keluar dari printer: terungkap dari atas ke bawah dalam langkah-langkah kecil.
    const print = stepped(prog(frame, delay, Math.round(0.7 * fps)), 28);
    const badge = tidy(p.badge);
    const tag = tidy(p.urgencyTag);

    return (
        <Shell exit={exit} top={196} left={64}>
            <div
                style={{
                    width: W,
                    filter: 'drop-shadow(0 20px 22px rgba(0, 0, 0, 0.5))',
                    transform: 'rotate(1.1deg)',
                    transformOrigin: 'top left',
                }}
            >
                <div style={{ clipPath: `inset(0 0 ${(1 - print) * 100}% 0)` }}>
                    <div style={{ backgroundColor: PAPER, padding: '30px 36px 26px' }}>
                        {badge ? (
                            <div
                                style={{
                                    fontFamily: FONT.mono,
                                    fontSize: 27,
                                    fontWeight: 500,
                                    color: '#55595C',
                                    textAlign: 'center',
                                    paddingBottom: 14,
                                    marginBottom: 18,
                                    borderBottom: '2px dashed #A4A8AA',
                                }}
                            >
                                {badge}
                            </div>
                        ) : null}

                        <div
                            style={{
                                fontFamily: FONT.mono,
                                fontSize: 36,
                                fontWeight: 500,
                                lineHeight: 1.28,
                                color: INK,
                            }}
                        >
                            {tidy(p.line1)}
                        </div>

                        <div
                            style={{
                                margin: '18px 0',
                                borderTop: '2px dashed #A4A8AA',
                            }}
                        />

                        {/* baris total dicetak terbalik, seperti printer thermal untuk angka penting */}
                        <div
                            style={{
                                backgroundColor: INK,
                                color: PAPER,
                                fontFamily: FONT.grotesk,
                                fontSize: isHook ? 54 : 48,
                                fontWeight: 800,
                                letterSpacing: -1,
                                lineHeight: 1.08,
                                padding: '14px 20px 16px',
                                margin: '0 -10px',
                            }}
                        >
                            {tidy(p.highlightLine)}
                        </div>

                        {tag ? (
                            <div
                                style={{
                                    marginTop: 16,
                                    textAlign: 'right',
                                    fontFamily: FONT.mono,
                                    fontSize: 26,
                                    fontWeight: 500,
                                    color: '#B63A22',
                                }}
                            >
                                {tag}
                            </div>
                        ) : null}
                    </div>
                    <Zigzag width={W} color={PAPER} />
                </div>
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// 3. CHAT THREAD
// ------------------------------------------------------------
const TypingDots: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center', height: 30 }}>
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    backgroundColor: '#868A90',
                    transform: `translateY(${Math.sin((frame / fps) * 9 + i * 0.9) * 6}px)`,
                }}
            />
        ))}
    </div>
);

const ChatThread: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const t0 = Math.round((isHook ? 0.04 : 0.14) * fps);
    const tReply = t0 + Math.round(0.55 * fps); // pertanyaan muncul setelah "mengetik"
    const tAnswer = tReply + Math.round(0.45 * fps);

    const chipIn = clamp01(prog(frame, t0, Math.round(0.2 * fps)));
    const typingIn = spring({ fps, frame: frame - (t0 + Math.round(0.1 * fps)), config: p.theme.springs.snappy });
    const q = spring({ fps, frame: frame - tReply, config: p.theme.springs.snappy });
    const a = spring({
        fps,
        frame: frame - tAnswer,
        config: { damping: 13, stiffness: 230, mass: 0.7 },
    });
    const isTyping = frame < tReply;
    const badge = tidy(p.badge);

    return (
        <Shell exit={exit} top={206} left={56} right={56}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {badge ? (
                    <div
                        style={{
                            alignSelf: 'center',
                            backgroundColor: 'rgba(16, 16, 18, 0.66)',
                            color: '#FFFFFF',
                            fontFamily: FONT.grotesk,
                            fontSize: 28,
                            fontWeight: 600,
                            padding: '8px 22px',
                            borderRadius: 999,
                            opacity: chipIn,
                        }}
                    >
                        {badge}
                    </div>
                ) : null}

                <div
                    style={{
                        alignSelf: 'flex-start',
                        maxWidth: 780,
                        backgroundColor: '#FFFFFF',
                        color: '#141416',
                        borderRadius: '34px 34px 34px 8px',
                        padding: isTyping ? '24px 30px' : '20px 30px',
                        boxShadow: '0 10px 26px rgba(0, 0, 0, 0.38)',
                        transformOrigin: 'left bottom',
                        opacity: clamp01((isTyping ? typingIn : q) * 3),
                        transform: `scale(${0.7 + 0.3 * (isTyping ? typingIn : q)})`,
                    }}
                >
                    {isTyping ? (
                        <TypingDots frame={frame} fps={fps} />
                    ) : (
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 44,
                                fontWeight: 600,
                                letterSpacing: -0.6,
                                lineHeight: 1.16,
                            }}
                        >
                            {tidy(p.line1)}
                        </span>
                    )}
                </div>

                <div
                    style={{
                        alignSelf: 'flex-end',
                        maxWidth: 840,
                        backgroundColor: '#0B7A55',
                        color: '#FFFFFF',
                        borderRadius: '34px 34px 8px 34px',
                        padding: '22px 34px 24px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                        transformOrigin: 'right bottom',
                        opacity: clamp01(a * 3),
                        transform: `scale(${0.7 + 0.3 * a})`,
                    }}
                >
                    <span
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: isHook ? 58 : 52,
                            fontWeight: 800,
                            letterSpacing: -1.2,
                            lineHeight: 1.06,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </span>
                </div>
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// 4. TYPE STACK
// ------------------------------------------------------------
const MaskedWords: React.FC<{
    text: string;
    frame: number;
    fps: number;
    start: number;
    stagger: number;
    style: React.CSSProperties;
    easing: (t: number) => number;
}> = ({ text, frame, fps, start, stagger, style, easing }) => (
    <div
        style={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: Math.round((typeof style.fontSize === 'number' ? style.fontSize : 40) * 0.26),
        }}
    >
        {text.split(/\s+/).filter(Boolean).map((w, i) => {
            const p = prog(frame, start + i * stagger, Math.round(0.32 * fps), easing);
            return (
                <span
                    key={i}
                    style={{
                        display: 'inline-block',
                        overflow: 'hidden',
                        paddingTop: '0.08em',
                        paddingBottom: '0.16em',
                        marginBottom: '-0.12em',
                    }}
                >
                    <span
                        style={{
                            display: 'inline-block',
                            transform: `translateY(${(1 - p) * 112}%)`,
                            ...style,
                        }}
                    >
                        {w}
                    </span>
                </span>
            );
        })}
    </div>
);

const TypeStack: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const stagger = Math.round(0.05 * fps);
    const l1Words = p.line1.split(/\s+/).filter(Boolean).length;
    const hlStart = delay + Math.round(0.1 * fps) + l1Words * stagger;

    const stamp = spring({
        fps,
        frame: frame - (delay + Math.round(0.08 * fps)),
        config: { damping: 11, stiffness: 260, mass: 0.6 },
    });
    const under = prog(frame, hlStart + Math.round(0.35 * fps), Math.round(0.4 * fps), p.theme.easings.outExpo);
    const badge = tidy(p.badge);

    return (
        <Shell exit={exit} top={206}>
            {badge ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
                    <div
                        style={{
                            flexShrink: 0,
                            backgroundColor: '#FFFFFF',
                            color: '#E8452B',
                            border: '4px solid #E8452B',
                            borderRadius: 12,
                            fontFamily: FONT.grotesk,
                            fontSize: 30,
                            fontWeight: 800,
                            lineHeight: 1,
                            padding: '10px 16px',
                            opacity: clamp01(stamp * 2),
                            transform: `rotate(${interpolate(stamp, [0, 1], [10, -5])}deg) scale(${interpolate(
                                stamp,
                                [0, 1],
                                [2.1, 1],
                            )})`,
                        }}
                    >
                        {badge}
                    </div>
                </div>
            ) : null}

            <MaskedWords
                text={tidy(p.line1)}
                frame={frame}
                fps={fps}
                start={delay}
                stagger={stagger}
                easing={p.theme.easings.outExpo}
                style={{
                    fontFamily: FONT.grotesk,
                    fontSize: 46,
                    fontWeight: 600,
                    letterSpacing: -0.8,
                    lineHeight: 1.1,
                    color: '#FFFFFF',
                    textShadow: `${ring(2)}, 0 3px 16px rgba(0, 0, 0, 0.7)`,
                }}
            />

            <div style={{ position: 'relative', display: 'inline-block', marginTop: 8, paddingBottom: 26 }}>
                <MaskedWords
                    text={tidy(p.highlightLine)}
                    frame={frame}
                    fps={fps}
                    start={hlStart}
                    stagger={Math.round(0.07 * fps)}
                    easing={p.theme.easings.outExpo}
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: isHook ? 100 : 86,
                        fontWeight: 800,
                        letterSpacing: -3,
                        lineHeight: 0.98,
                        color: '#FFFFFF',
                        textShadow: `${ring(3.5)}, 0 6px 24px rgba(0, 0, 0, 0.7)`,
                    }}
                />
                <svg
                    viewBox="0 0 500 24"
                    preserveAspectRatio="none"
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: 24,
                        overflow: 'visible',
                        filter: 'drop-shadow(0 2px 0 rgba(0, 0, 0, 0.7))',
                    }}
                >
                    <path
                        d="M2 14 C 80 4, 170 20, 262 9 S 430 16, 498 7"
                        fill="none"
                        stroke="#FF5A36"
                        strokeWidth={9}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={1 - under}
                    />
                </svg>
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// 5. LABEL TAPE
// ------------------------------------------------------------
type TapeKind = 'black' | 'white' | 'red';

const TAPE: Record<TapeKind, { bg: string; fg: string; shadow: string }> = {
    black: { bg: '#151515', fg: '#F5F5F1', shadow: '0 1.5px 0 #000, 0 -1px 0 rgba(255, 255, 255, 0.18)' },
    white: { bg: '#F3F3EE', fg: '#111111', shadow: '0 1px 0 rgba(255, 255, 255, 0.8)' },
    red: { bg: '#C9302C', fg: '#FFF4F2', shadow: '0 1.5px 0 rgba(90, 0, 0, 0.7)' },
};

const Strip: React.FC<{
    text: string;
    kind: TapeKind;
    size: number;
    rot: number;
    at: number;
    frame: number;
    fps: number;
}> = ({ text, kind, size, rot, at, frame, fps }) => {
    const t = TAPE[kind];
    const len = Math.round(0.2 * fps);
    const out = stepped(prog(frame, at, len), 9);
    // satu "klik" kecil setelah pita selesai keluar
    const click = Math.max(0, 1 - (frame - at - len) / Math.max(1, Math.round(0.12 * fps)));
    const clicked = frame >= at + len ? 1 + 0.03 * click : 1;
    return (
        <div
            style={{
                display: 'inline-block',
                transform: `rotate(${rot}deg) scale(${clicked})`,
                transformOrigin: 'left center',
                filter: 'drop-shadow(0 10px 12px rgba(0, 0, 0, 0.42))',
            }}
        >
            <div
                style={{
                    clipPath: `inset(0 ${(1 - out) * 100}% 0 0)`,
                    backgroundColor: t.bg,
                    color: t.fg,
                    borderRadius: 4,
                    boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.12)',
                    padding: `${Math.round(size * 0.2)}px ${Math.round(size * 0.5)}px ${Math.round(size * 0.24)}px`,
                    fontFamily: FONT.grotesk,
                    fontSize: size,
                    fontWeight: 800,
                    letterSpacing: -0.4,
                    lineHeight: 1.05,
                    textShadow: t.shadow,
                    whiteSpace: 'nowrap',
                }}
            >
                {text}
            </div>
        </div>
    );
};

const LabelTape: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const gap = Math.round(0.16 * fps);

    const badge = tidy(p.badge);
    const l1 = wrapLines(tidy(p.line1), 26);
    const hl = wrapLines(tidy(p.highlightLine), 17);

    let i = 0;
    const next = () => delay + gap * i++;
    const rots = [-1.6, 0.9, -0.7, 1.2, -1.0];

    return (
        <Shell exit={exit} top={206}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                {badge ? (
                    <Strip text={badge} kind="red" size={32} rot={-2.2} at={next()} frame={frame} fps={fps} />
                ) : null}
                {l1.map((line, k) => (
                    <Strip
                        key={`l1-${k}`}
                        text={line}
                        kind="black"
                        size={42}
                        rot={rots[(k + 1) % rots.length]}
                        at={next()}
                        frame={frame}
                        fps={fps}
                    />
                ))}
                {hl.map((line, k) => (
                    <Strip
                        key={`hl-${k}`}
                        text={line}
                        kind="white"
                        size={isHook ? 70 : 62}
                        rot={rots[(k + 3) % rots.length]}
                        at={next()}
                        frame={frame}
                        fps={fps}
                    />
                ))}
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// 6. QUIET SERIF
// ------------------------------------------------------------
const QuietSerif: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const delay = Math.round((isHook ? 0.06 : 0.18) * fps);
    const ease = p.theme.easings.outExpo;

    const a = prog(frame, delay, Math.round(0.5 * fps), ease);
    const rule = prog(frame, delay + Math.round(0.3 * fps), Math.round(0.6 * fps), ease);
    const b = prog(frame, delay + Math.round(0.55 * fps), Math.round(0.7 * fps), ease);
    const c = prog(frame, delay + Math.round(0.95 * fps), Math.round(0.4 * fps), ease);
    const badge = tidy(p.badge);

    return (
        <Shell exit={exit} top={214} left={64} right={64}>
            {/* peredam terang lokal supaya teks putih tipis tetap terbaca di footage terang */}
            <div
                style={{
                    position: 'absolute',
                    inset: '-70px -64px -60px -64px',
                    background:
                        'radial-gradient(ellipse 80% 70% at 30% 45%, rgba(0, 0, 0, 0.46), rgba(0, 0, 0, 0) 72%)',
                    opacity: clamp01(a * 1.5),
                    pointerEvents: 'none',
                }}
            />
            <div style={{ position: 'relative', width: '100%' }}>
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: 42,
                        fontWeight: 500,
                        letterSpacing: -0.4,
                        lineHeight: 1.2,
                        color: 'rgba(255, 255, 255, 0.94)',
                        textShadow: '0 2px 14px rgba(0, 0, 0, 0.7), 0 1px 2px rgba(0, 0, 0, 0.6)',
                        opacity: a,
                        transform: `translateY(${(1 - a) * 14}px)`,
                    }}
                >
                    {tidy(p.line1)}
                </div>

                <div
                    style={{
                        height: 2,
                        width: `${rule * 100}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        margin: '20px 0 14px',
                        boxShadow: '0 1px 6px rgba(0, 0, 0, 0.5)',
                    }}
                />

                <div
                    style={{
                        fontFamily: FONT.serifItalic,
                        fontSize: isHook ? 118 : 100,
                        fontWeight: 400,
                        letterSpacing: -1.5,
                        lineHeight: 0.98,
                        color: '#FFFFFF',
                        textShadow: '0 3px 26px rgba(0, 0, 0, 0.65), 0 1px 3px rgba(0, 0, 0, 0.55)',
                        opacity: b,
                        transform: `translateY(${(1 - b) * 22}px)`,
                    }}
                >
                    {tidy(p.highlightLine)}
                </div>

                {badge ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            marginTop: 22,
                            opacity: c,
                        }}
                    >
                        <span style={{ width: 36, height: 2, backgroundColor: 'rgba(255, 255, 255, 0.85)' }} />
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 30,
                                fontWeight: 600,
                                color: 'rgba(255, 255, 255, 0.92)',
                                textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
                            }}
                        >
                            {badge}
                        </span>
                    </div>
                ) : null}
            </div>
        </Shell>
    );
};

// ------------------------------------------------------------
// Dispatcher
// ------------------------------------------------------------
export const HeadlineLayout: React.FC<HeadlineLayoutProps & { layout: HookLayout }> = ({
    layout,
    ...props
}) => {
    switch (layout) {
        case 'sticky_note':
            return <StickyNote {...props} />;
        case 'receipt':
            return <Receipt {...props} />;
        case 'chat_thread':
            return <ChatThread {...props} />;
        case 'type_stack':
            return <TypeStack {...props} />;
        case 'label_tape':
            return <LabelTape {...props} />;
        case 'quiet_serif':
            return <QuietSerif {...props} />;
    }
};
