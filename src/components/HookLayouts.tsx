import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ThemeDefinition } from '../theme';
import { FONT } from '../load-hook-fonts';
import { VariantVersion, resolveVariantVersion } from '../presets';

/**
 * Sistem Layout Hook Multi-Versi (6 keluarga desain x 3 versi = 18 variasi visual):
 * Diperkaya dengan resep gerak sinematik `bang-motion` (anti-PPT, tipografi hidup,
 * sorotan pill + sparkle, garis coret strike + bingkai teknis box, kertas katalog, & kontras kantong teks).
 *
 * 1. sticky_note :
 *    - v1: Catatan tempel kuning klasik + selotip atas + garis bawah merah tulisan tangan
 *    - v2: Memo buku kotak-kotak (grid paper) + pin paku payung merah + coretan stabilo kuning
 *    - v3: Dua lembar catatan bertumpuk (kraft gelap & koral hangat) + penjepit kertas logam
 *
 * 2. receipt :
 *    - v1: Struk kasir thermal klasik keluar bertahap + blok total hitam terbalik + gerigi zigzag
 *    - v2: Kupon tiket diskon sobek (merah crimson + garis gunting + blok harga emas)
 *    - v3: Kartu Katalog Putih (bang-motion 08-white-catalog: indeks 01 // SPEC, garis tabel presisi, pill aksen)
 *
 * 3. chat_thread :
 *    - v1: Percakapan WA/iMessage (balon putih mengetik -> balon jawaban hijau)
 *    - v2: Stiker Balasan Komentar TikTok FYP ("Membalas komentar @..." + kartu jawaban kreator)
 *    - v3: Dark Glass Voice DM (gelembung pesan gelap + gelombang suara audio hidup + jawaban gradien)
 *
 * 4. type_stack :
 *    - v1: Tipografi poster tanpa kotak, kata naik dari balik mask + garis kuas tangan
 *    - v2: Bang-Motion Kinetic Pill + Sparkle (resep #1 Opener B: kalimat + kapsul aksen mengembang dari kiri + bintang berputar)
 *    - v3: Bang-Motion Strike & Box Frame (resep .hl.strike & .hl.box: baris 1 dicoret -> baris 2 dibingkai kotak siku teknis)
 *
 * 5. label_tape :
 *    - v1: Pita emboss Dymo (hitam, putih, merah) keluar per baris dengan hentakan klik
 *    - v2: Cyber Industrial Spec Bar (pita sudut miring chamfered + strip garis teknis + highlight lime/aksen)
 *    - v3: Frosted Split Tag (label indeks kaca gelap `[01]` + pita putih/aksen bersih)
 *
 * 6. quiet_serif :
 *    - v1: Editorial serif italic besar + satu garis tipis + peredam kontras lembut
 *    - v2: Luxury Magazine Masthead (garis aksen vertikal di kiri + serif italic dua warna)
 *    - v3: Warm Paper Pocket (bang-motion kontras terang 1b: kartu kertas krem hangat bertinta hitam + garis bawah aksen)
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

export interface ResolvedHookSelection {
    layout: HookLayout;
    impliedVersion?: VariantVersion;
}

/**
 * Mengembalikan layout beserta versi implisit jika nama alias spesifik dipakai
 * (mis. `kinetic_pill` -> `{ layout: 'type_stack', impliedVersion: 'v2' }`).
 */
export const resolveHookSelection = (raw?: string): ResolvedHookSelection | null => {
    const s = (raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
    switch (s) {
        case 'sticky_note':
        case 'sticky':
        case 'post_it':
        case 'note':
            return { layout: 'sticky_note' };
        case 'grid_memo':
        case 'memo_pin':
            return { layout: 'sticky_note', impliedVersion: 'v2' };
        case 'dual_note':
        case 'layered_note':
            return { layout: 'sticky_note', impliedVersion: 'v3' };

        case 'receipt':
        case 'struk':
        case 'nota':
            return { layout: 'receipt' };
        case 'promo_coupon':
        case 'coupon':
        case 'kupon':
            return { layout: 'receipt', impliedVersion: 'v2' };
        case 'white_catalog':
        case 'catalog':
        case 'katalog':
            return { layout: 'receipt', impliedVersion: 'v3' };

        case 'chat_thread':
        case 'chat':
        case 'dm':
            return { layout: 'chat_thread' };
        case 'comment_reply':
        case 'tiktok_reply':
        case 'balas_komentar':
            return { layout: 'chat_thread', impliedVersion: 'v2' };
        case 'voice_dm':
        case 'dark_chat':
            return { layout: 'chat_thread', impliedVersion: 'v3' };

        case 'type_stack':
        case 'big_type':
        case 'poster':
            return { layout: 'type_stack' };
        case 'kinetic_pill':
        case 'pill_sparkle':
        case 'bang_pill':
            return { layout: 'type_stack', impliedVersion: 'v2' };
        case 'strike_box':
        case 'strike_replace':
        case 'bang_box':
            return { layout: 'type_stack', impliedVersion: 'v3' };

        case 'label_tape':
        case 'label':
        case 'dymo':
            return { layout: 'label_tape' };
        case 'cyber_tape':
        case 'spec_bar':
            return { layout: 'label_tape', impliedVersion: 'v2' };
        case 'frosted_tag':
        case 'split_tag':
            return { layout: 'label_tape', impliedVersion: 'v3' };

        case 'quiet_serif':
        case 'serif':
        case 'whisper':
            return { layout: 'quiet_serif' };
        case 'magazine_serif':
        case 'masthead':
            return { layout: 'quiet_serif', impliedVersion: 'v2' };
        case 'paper_pocket':
        case 'warm_paper':
            return { layout: 'quiet_serif', impliedVersion: 'v3' };

        default:
            return null;
    }
};

/** Backward-compatible helper yang mengembalikan nama HookLayout saja. */
export const resolveHookLayout = (raw?: string): HookLayout | null => {
    const res = resolveHookSelection(raw);
    return res ? res.layout : null;
};

export interface HeadlineLayoutProps {
    badge?: string;
    line1: string;
    highlightLine: string;
    durationInFrames: number;
    variant: 'hook' | 'solution';
    theme: ThemeDefinition;
    urgencyTag?: string;
    hookVariant?: VariantVersion;
}

// ------------------------------------------------------------
// Helper bersama
// ------------------------------------------------------------

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
}> = ({ exit, top = 200, left = 64, right = 110, children }) => (
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

/** Sparkle 4-sudut khas resep #1 `bang-motion` */
const SparkleStar: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
    size = 34,
    color = '#FFFFFF',
    style,
}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
        <path d="M12 0 C13.2 7.5 16.5 10.8 24 12 C16.5 13.2 13.2 16.5 12 24 C10.8 16.5 7.5 13.2 0 12 C7.5 10.8 10.8 7.5 12 0 Z" />
    </svg>
);

// ============================================================
// 1. STICKY NOTE (v1: Yellow Post-it | v2: Grid Memo Pin | v3: Dual Layered Notes)
// ============================================================
const StickyNote: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);

    const slap = spring({
        fps,
        frame: frame - delay,
        config: { damping: 13, stiffness: 240, mass: 0.7 },
    });
    const write1 = prog(frame, delay + Math.round(0.18 * fps), Math.round(0.45 * fps), p.theme.easings.outExpo);
    const write2 = prog(frame, delay + Math.round(0.48 * fps), Math.round(0.45 * fps), p.theme.easings.outExpo);
    const under = prog(frame, delay + Math.round(0.85 * fps), Math.round(0.4 * fps), p.theme.easings.outExpo);
    const badge = tidy(p.badge);

    // v2: Grid Memo Paper + Push Pin Merah + Stabilo Kuning (`bang-motion` .hl.marker)
    if (ver === 'v2') {
        const rot = interpolate(slap, [0, 1], [6, 1.2]);
        const scale = interpolate(slap, [0, 1], [1.14, 1]);
        return (
            <Shell exit={exit} top={206} left={60}>
                <div
                    style={{
                        position: 'relative',
                        width: 810,
                        opacity: clamp01(slap * 3),
                        transform: `rotate(${rot}deg) scale(${scale})`,
                        transformOrigin: '50% 0%',
                    }}
                >
                    {/* Push Pin 3D Merah di Atas */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -18,
                            left: '50%',
                            marginLeft: -18,
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 35% 35%, #FF6B6B 0%, #DC2626 65%, #7F1D1D 100%)',
                            boxShadow: '0 8px 14px rgba(0, 0, 0, 0.48), inset 0 2px 4px rgba(255, 255, 255, 0.45)',
                            zIndex: 3,
                        }}
                    />
                    <div
                        style={{
                            backgroundColor: '#FAF9F5',
                            backgroundImage:
                                'linear-gradient(rgba(59, 130, 246, 0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.13) 1px, transparent 1px)',
                            backgroundSize: '28px 28px',
                            borderTop: '6px solid #1E293B',
                            borderRadius: '4px 4px 10px 10px',
                            padding: '44px 42px 38px',
                            boxShadow: '0 22px 38px rgba(0, 0, 0, 0.55)',
                        }}
                    >
                        {badge ? (
                            <div
                                style={{
                                    display: 'inline-block',
                                    fontFamily: FONT.mono,
                                    fontSize: 23,
                                    fontWeight: 700,
                                    color: '#DC2626',
                                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                    border: '1.5px solid rgba(220, 38, 38, 0.35)',
                                    padding: '4px 14px',
                                    borderRadius: 6,
                                    marginBottom: 14,
                                }}
                            >
                                📌 {badge}
                            </div>
                        ) : null}

                        <div style={{ clipPath: `inset(0 ${(1 - write1) * 100}% 0 0)` }}>
                            <span
                                style={{
                                    fontFamily: FONT.grotesk,
                                    fontSize: 42,
                                    fontWeight: 600,
                                    lineHeight: 1.2,
                                    color: '#334155',
                                }}
                            >
                                {tidy(p.line1)}
                            </span>
                        </div>

                        <div style={{ position: 'relative', marginTop: 14, display: 'inline-block' }}>
                            {/* Stabilo kuning menyapu miring ala bang-motion .hl.marker */}
                            <span
                                style={{
                                    position: 'absolute',
                                    left: -10,
                                    right: -10,
                                    top: '18%',
                                    bottom: '-4%',
                                    backgroundColor: '#FDE047',
                                    borderRadius: 6,
                                    transform: `skewX(-6deg) scaleX(${write2})`,
                                    transformOrigin: 'left center',
                                }}
                            />
                            <span
                                style={{
                                    position: 'relative',
                                    fontFamily: FONT.grotesk,
                                    fontSize: isHook ? 60 : 54,
                                    fontWeight: 800,
                                    letterSpacing: -1.3,
                                    lineHeight: 1.06,
                                    color: '#0F172A',
                                }}
                            >
                                {tidy(p.highlightLine)}
                            </span>
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    // v3: Dual Layered Notes (Kartu Kraft Gelap + Kartu Koral/Kuning Tumpuk)
    if (ver === 'v3') {
        const card2Spring = spring({
            fps,
            frame: frame - (delay + Math.round(0.32 * fps)),
            config: { damping: 12, stiffness: 220, mass: 0.65 },
        });
        return (
            <Shell exit={exit} top={200} left={58}>
                <div style={{ position: 'relative', width: 840 }}>
                    {/* Kartu 1: Gelap di atas */}
                    <div
                        style={{
                            backgroundColor: '#18181B',
                            color: '#F4F4F5',
                            padding: '28px 36px 32px',
                            borderRadius: 10,
                            border: '2px solid rgba(255,255,255,0.16)',
                            transform: `rotate(1.4deg) scale(${interpolate(slap, [0, 1], [0.9, 1])})`,
                            opacity: clamp01(slap * 3),
                            boxShadow: '0 18px 32px rgba(0, 0, 0, 0.5)',
                            maxWidth: 760,
                        }}
                    >
                        {badge ? (
                            <div
                                style={{
                                    fontFamily: FONT.hand,
                                    fontSize: 34,
                                    fontWeight: 700,
                                    color: '#FDE047',
                                    marginBottom: 4,
                                }}
                            >
                                ✦ {badge}
                            </div>
                        ) : null}
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 42,
                                fontWeight: 600,
                                lineHeight: 1.18,
                                color: '#FFFFFF',
                            }}
                        >
                            {tidy(p.line1)}
                        </div>
                    </div>

                    {/* Kartu 2: Catatan Tempel Terang Menumpuk di Bawah */}
                    <div
                        style={{
                            marginTop: -12,
                            marginLeft: 28,
                            backgroundColor: '#FEF08A',
                            color: '#18181B',
                            padding: '26px 36px',
                            borderRadius: 8,
                            transform: `rotate(-2.1deg) scale(${interpolate(card2Spring, [0, 1], [1.18, 1])})`,
                            opacity: clamp01(card2Spring * 3),
                            boxShadow: '0 22px 36px rgba(0, 0, 0, 0.55)',
                            maxWidth: 790,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: isHook ? 58 : 52,
                                fontWeight: 800,
                                letterSpacing: -1.2,
                                lineHeight: 1.06,
                                color: '#111827',
                            }}
                        >
                            {tidy(p.highlightLine)}
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    // v1: Classic Yellow Sticky Note
    const rot = interpolate(slap, [0, 1], [-9, -2.2]);
    const scale = interpolate(slap, [0, 1], [1.18, 1]);

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

// ============================================================
// 2. RECEIPT (v1: Thermal Cashier | v2: Red Promo Coupon | v3: White Catalog Index)
// ============================================================
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
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const W = 760;

    const badge = tidy(p.badge);
    const tag = tidy(p.urgencyTag);

    // v2: Red Promo Coupon / Tiket Diskon Sobek
    if (ver === 'v2') {
        const pop = spring({
            fps,
            frame: frame - delay,
            config: { damping: 14, stiffness: 230, mass: 0.7 },
        });
        const highlightSweep = prog(frame, delay + Math.round(0.28 * fps), Math.round(0.4 * fps), p.theme.easings.outExpo);
        return (
            <Shell exit={exit} top={194} left={60}>
                <div
                    style={{
                        width: W,
                        opacity: clamp01(pop * 3),
                        transform: `rotate(-1.2deg) scale(${interpolate(pop, [0, 1], [0.88, 1])})`,
                        filter: 'drop-shadow(0 20px 28px rgba(0, 0, 0, 0.55))',
                    }}
                >
                    {/* Header Merah Tiket Promo */}
                    <div
                        style={{
                            backgroundColor: '#E11D48',
                            color: '#FFFFFF',
                            padding: '14px 32px',
                            borderRadius: '14px 14px 0 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontFamily: FONT.mono,
                            fontSize: 24,
                            fontWeight: 700,
                        }}
                    >
                        <span>🎟️ {badge || 'VOUCHER SPESIAL'}</span>
                        {tag ? (
                            <span
                                style={{
                                    backgroundColor: '#FFE600',
                                    color: '#111111',
                                    padding: '2px 12px',
                                    borderRadius: 999,
                                    fontSize: 20,
                                    fontWeight: 800,
                                }}
                            >
                                {tag}
                            </span>
                        ) : null}
                    </div>

                    {/* Badan Tiket */}
                    <div
                        style={{
                            backgroundColor: '#FFFDF9',
                            padding: '26px 34px 30px',
                            borderRadius: '0 0 14px 14px',
                            border: '2px solid #18181B',
                            borderTop: '3px dashed #E11D48',
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 38,
                                fontWeight: 600,
                                lineHeight: 1.22,
                                color: '#1E293B',
                                marginBottom: 18,
                            }}
                        >
                            {tidy(p.line1)}
                        </div>

                        <div
                            style={{
                                backgroundColor: '#FFD23F',
                                color: '#0F172A',
                                border: '2.5px solid #0F172A',
                                borderRadius: 10,
                                padding: '14px 22px',
                                fontFamily: FONT.grotesk,
                                fontSize: isHook ? 54 : 48,
                                fontWeight: 800,
                                letterSpacing: -1.1,
                                lineHeight: 1.08,
                                boxShadow: '5px 5px 0 #0F172A',
                                clipPath: `inset(0 ${(1 - highlightSweep) * 100}% 0 0)`,
                            }}
                        >
                            {tidy(p.highlightLine)}
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    // v3: White Catalog Index (Gaya 08 `bang-motion` White Catalog)
    if (ver === 'v3') {
        const cardIn = prog(frame, delay, Math.round(0.38 * fps), p.theme.easings.outExpo);
        const pillIn = prog(frame, delay + Math.round(0.32 * fps), Math.round(0.45 * fps), p.theme.easings.outExpo);
        return (
            <Shell exit={exit} top={198} left={60}>
                <div
                    style={{
                        width: 800,
                        backgroundColor: '#FFFFFF',
                        border: '2.5px solid #111111',
                        boxShadow: '10px 10px 0 rgba(0, 0, 0, 0.82)',
                        opacity: cardIn,
                        transform: `translateY(${(1 - cardIn) * 22}px)`,
                    }}
                >
                    {/* Baris Indeks Katalog */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '2px solid #111111',
                            padding: '10px 24px',
                            backgroundColor: '#F4F4F0',
                            fontFamily: FONT.mono,
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#111111',
                        }}
                    >
                        <span>{isHook ? '01 // HOOK' : '02 // DETAIL'}</span>
                        <span>{badge || 'CATALOG ITEM'}</span>
                    </div>

                    <div style={{ padding: '26px 32px 30px' }}>
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 38,
                                fontWeight: 500,
                                color: '#3F3F46',
                                lineHeight: 1.22,
                                marginBottom: 16,
                            }}
                        >
                            {tidy(p.line1)}
                        </div>

                        {/* Sorotan Pill Mengembang dari Kiri */}
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <span
                                style={{
                                    position: 'absolute',
                                    inset: '-4px -14px',
                                    backgroundColor: '#111111',
                                    borderRadius: 8,
                                    transform: `scaleX(${pillIn})`,
                                    transformOrigin: 'left center',
                                }}
                            />
                            <span
                                style={{
                                    position: 'relative',
                                    fontFamily: FONT.grotesk,
                                    fontSize: isHook ? 54 : 48,
                                    fontWeight: 800,
                                    letterSpacing: -1.2,
                                    lineHeight: 1.08,
                                    color: pillIn > 0.35 ? '#FFFFFF' : '#111111',
                                }}
                            >
                                {tidy(p.highlightLine)}
                            </span>
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    // v1: Classic Thermal Cashier Receipt
    const print = stepped(prog(frame, delay, Math.round(0.7 * fps)), 28);

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

// ============================================================
// 3. CHAT THREAD (v1: WA/iMessage | v2: TikTok Comment Reply | v3: Dark Voice DM)
// ============================================================
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
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const t0 = Math.round((isHook ? 0.04 : 0.14) * fps);
    const badge = tidy(p.badge);

    // v2: Stiker Balasan Komentar TikTok FYP ("Membalas komentar @...")
    if (ver === 'v2') {
        const stickerIn = spring({ fps, frame: frame - t0, config: p.theme.springs.snappy });
        const replyIn = spring({
            fps,
            frame: frame - (t0 + Math.round(0.38 * fps)),
            config: { damping: 13, stiffness: 230, mass: 0.7 },
        });

        if (!isHook) {
            // Babak 2 (Demo) & Babak 3 (Spec): Tidak lagi mengulang stiker "Membalas komentar @..."
            // Tampilkan kartu highlight & pembuktian fitur yang bersih dan elegan agar mata penonton fokus ke produk
            return (
                <Shell exit={exit} top={196} left={56} right={56}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, width: '100%' }}>
                        {badge ? (
                            <div
                                style={{
                                    backgroundColor: '#0F172A',
                                    color: p.theme.colors.accent,
                                    border: `2px solid ${p.theme.colors.accent}`,
                                    borderRadius: 999,
                                    padding: '8px 22px',
                                    fontFamily: FONT.grotesk,
                                    fontSize: 24,
                                    fontWeight: 800,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
                                    opacity: clamp01(stickerIn * 3),
                                    transform: `translateY(${(1 - stickerIn) * 12}px)`,
                                }}
                            >
                                {badge}
                            </div>
                        ) : null}
                        <div
                            style={{
                                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                                color: '#FFFFFF',
                                borderRadius: 18,
                                padding: '16px 26px',
                                maxWidth: 840,
                                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
                                opacity: clamp01(stickerIn * 3),
                            }}
                        >
                            <span style={{ fontFamily: FONT.grotesk, fontSize: 38, fontWeight: 700, lineHeight: 1.18 }}>
                                {tidy(p.line1)}
                            </span>
                        </div>
                        <div
                            style={{
                                alignSelf: 'flex-start',
                                backgroundColor: p.theme.colors.accent,
                                color: p.theme.colors.accentText,
                                borderRadius: 20,
                                padding: '18px 28px',
                                maxWidth: 860,
                                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                                border: '2.5px solid rgba(0, 0, 0, 0.85)',
                                opacity: clamp01(replyIn * 3),
                                transform: `translateY(${(1 - replyIn) * 14}px)`,
                            }}
                        >
                            <span style={{ fontFamily: FONT.grotesk, fontSize: 48, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.08 }}>
                                {tidy(p.highlightLine)}
                            </span>
                        </div>
                    </div>
                </Shell>
            );
        }

        return (
            <Shell exit={exit} top={196} left={56} right={56}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, width: '100%' }}>
                    {/* Kotak Komentar Penonton TikTok */}
                    <div
                        style={{
                            backgroundColor: '#FFFFFF',
                            color: '#111111',
                            borderRadius: '22px 22px 22px 6px',
                            padding: '20px 28px 22px',
                            maxWidth: 790,
                            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.45)',
                            transformOrigin: 'left bottom',
                            opacity: clamp01(stickerIn * 3),
                            transform: `scale(${0.8 + 0.2 * stickerIn})`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    backgroundColor: '#FF2E54',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: FONT.grotesk,
                                    fontSize: 18,
                                    fontWeight: 800,
                                }}
                            >
                                💬
                            </div>
                            <span
                                style={{
                                    fontFamily: FONT.grotesk,
                                    fontSize: 24,
                                    fontWeight: 600,
                                    color: '#64748B',
                                }}
                            >
                                Membalas komentar <strong style={{ color: '#0F172A' }}>{badge || 'netizen'}</strong>
                            </span>
                        </div>
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 42,
                                fontWeight: 700,
                                letterSpacing: -0.6,
                                lineHeight: 1.16,
                                color: '#0F172A',
                            }}
                        >
                            {tidy(p.line1)}
                        </div>
                    </div>

                    {/* Balasan Kreator */}
                    <div
                        style={{
                            alignSelf: 'flex-end',
                            backgroundColor: p.theme.colors.accent,
                            color: p.theme.colors.accentText,
                            borderRadius: '24px 24px 6px 24px',
                            padding: '20px 32px 22px',
                            maxWidth: 830,
                            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.5)',
                            border: '2.5px solid rgba(0, 0, 0, 0.85)',
                            transformOrigin: 'right bottom',
                            opacity: clamp01(replyIn * 3),
                            transform: `scale(${0.8 + 0.2 * replyIn})`,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: isHook ? 54 : 48,
                                fontWeight: 800,
                                letterSpacing: -1.1,
                                lineHeight: 1.08,
                            }}
                        >
                            {tidy(p.highlightLine)}
                        </span>
                    </div>
                </div>
            </Shell>
        );
    }

    // v3: Dark Glass Voice/DM Thread (Mode Gelap + Audio Waveform)
    if (ver === 'v3') {
        const qIn = spring({ fps, frame: frame - t0, config: p.theme.springs.snappy });
        const aIn = spring({
            fps,
            frame: frame - (t0 + Math.round(0.36 * fps)),
            config: { damping: 14, stiffness: 220, mass: 0.7 },
        });
        return (
            <Shell exit={exit} top={198} left={56} right={56}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                        style={{
                            alignSelf: 'flex-start',
                            maxWidth: 800,
                            backgroundColor: 'rgba(15, 17, 23, 0.92)',
                            border: '1.5px solid rgba(255, 255, 255, 0.18)',
                            color: '#F8FAFC',
                            borderRadius: '28px 28px 28px 8px',
                            padding: '20px 28px',
                            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.55)',
                            opacity: clamp01(qIn * 3),
                            transform: `translateY(${(1 - qIn) * 18}px)`,
                        }}
                    >
                        {badge ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                {/* Gelombang audio bergerak */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 18 }}>
                                    {[0, 1, 2, 3, 4].map((bar) => {
                                        const h = 6 + Math.abs(Math.sin((frame / fps) * 8 + bar * 1.1)) * 12;
                                        return (
                                            <span
                                                key={bar}
                                                style={{
                                                    width: 3,
                                                    height: h,
                                                    borderRadius: 2,
                                                    backgroundColor: p.theme.colors.accent,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <span
                                    style={{
                                        fontFamily: FONT.mono,
                                        fontSize: 22,
                                        fontWeight: 700,
                                        color: p.theme.colors.accent,
                                    }}
                                >
                                    {badge}
                                </span>
                            </div>
                        ) : null}
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 42,
                                fontWeight: 600,
                                lineHeight: 1.18,
                                color: '#E2E8F0',
                            }}
                        >
                            {tidy(p.line1)}
                        </span>
                    </div>

                    <div
                        style={{
                            alignSelf: 'flex-end',
                            maxWidth: 840,
                            backgroundColor: '#FFFFFF',
                            color: '#090A0F',
                            borderRadius: '28px 28px 8px 28px',
                            padding: '22px 32px',
                            boxShadow: `0 16px 36px rgba(0, 0, 0, 0.55), 0 0 0 3px ${p.theme.colors.accent}`,
                            opacity: clamp01(aIn * 3),
                            transform: `translateY(${(1 - aIn) * 18}px) scale(${0.92 + 0.08 * aIn})`,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: isHook ? 56 : 50,
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
    }

    // v1: Classic iMessage / WhatsApp Bubble
    const tReply = t0 + Math.round(0.55 * fps);
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

// ============================================================
// 4. TYPE STACK (v1: Masked Poster | v2: Bang-Motion Pill + Sparkle | v3: Strike & Box Frame)
// ============================================================
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
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const stagger = Math.round(0.05 * fps);
    const l1Words = p.line1.split(/\s+/).filter(Boolean).length;
    const hlStart = delay + Math.round(0.1 * fps) + l1Words * stagger;
    const badge = tidy(p.badge);

    // v2: Bang-Motion Kinetic Pill + Sparkle (Resep #1 `techniques.md` Opener B)
    if (ver === 'v2') {
        const pillExpand = prog(frame, hlStart, Math.round(0.42 * fps), p.theme.easings.outExpo);
        const textRise = prog(frame, hlStart + Math.round(0.06 * fps), Math.round(0.42 * fps), p.theme.easings.outExpo);
        const sparklePop = spring({
            fps,
            frame: frame - (hlStart + Math.round(0.22 * fps)),
            config: { damping: 10, stiffness: 260, mass: 0.5 },
        });
        return (
            <Shell exit={exit} top={202}>
                {/* Kantong teks radial lembut sesuai hukum 1b bang-motion */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-50px -48px',
                        background:
                            'radial-gradient(ellipse 85% 75% at 40% 50%, rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0) 75%)',
                        pointerEvents: 'none',
                    }}
                />
                {badge ? (
                    <div
                        style={{
                            position: 'relative',
                            fontFamily: FONT.grotesk,
                            fontSize: 28,
                            fontWeight: 700,
                            color: p.theme.colors.accent,
                            backgroundColor: 'rgba(10, 10, 14, 0.82)',
                            border: `1.5px solid ${p.theme.colors.accent}`,
                            padding: '6px 18px',
                            borderRadius: 999,
                            marginBottom: 14,
                        }}
                    >
                        ✦ {badge}
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
                        fontSize: 48,
                        fontWeight: 600,
                        letterSpacing: -0.9,
                        lineHeight: 1.14,
                        color: '#FFFFFF',
                        textShadow: `${ring(2.5)}, 0 4px 18px rgba(0, 0, 0, 0.75)`,
                    }}
                />

                {/* Sorotan Pill Mengembang dari Kiri + Bintang Sparkle di Sudut */}
                <div
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        marginTop: 14,
                        padding: '12px 30px 16px',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 22,
                            background: p.theme.colors.highlightBg || p.theme.colors.accent,
                            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.48), 0 0 0 3px rgba(0, 0, 0, 0.85)',
                            transform: `scaleX(${pillExpand})`,
                            transformOrigin: '0% 50%',
                        }}
                    />
                    <span
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            fontFamily: FONT.grotesk,
                            fontSize: isHook ? 64 : 56,
                            fontWeight: 800,
                            letterSpacing: -1.5,
                            lineHeight: 1.06,
                            color: p.theme.colors.highlightText || p.theme.colors.accentText,
                            opacity: textRise,
                            transform: `translateY(${(1 - textRise) * 24}px)`,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </span>
                    <SparkleStar
                        size={42}
                        color="#FFFFFF"
                        style={{
                            position: 'absolute',
                            top: -18,
                            right: -18,
                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
                            opacity: clamp01(sparklePop * 2),
                            transform: `scale(${sparklePop}) rotate(${interpolate(sparklePop, [0, 1], [-45, 0])}deg)`,
                        }}
                    />
                </div>
            </Shell>
        );
    }

    // v3: Bang-Motion Strike & Box Frame (Resep `.hl.strike` + `.hl.box`)
    if (ver === 'v3') {
        const strikeDraw = prog(
            frame,
            hlStart - Math.round(0.1 * fps),
            Math.round(0.32 * fps),
            p.theme.easings.outExpo,
        );
        const boxDraw = prog(frame, hlStart + Math.round(0.08 * fps), Math.round(0.45 * fps), p.theme.easings.outExpo);
        return (
            <Shell exit={exit} top={202}>
                {badge ? (
                    <div
                        style={{
                            fontFamily: FONT.mono,
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            backgroundColor: '#EF4444',
                            padding: '5px 16px',
                            borderRadius: 6,
                            marginBottom: 12,
                        }}
                    >
                        {badge}
                    </div>
                ) : null}

                {/* Baris 1: Dicoret Garis Strike Merah */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
                    <MaskedWords
                        text={tidy(p.line1)}
                        frame={frame}
                        fps={fps}
                        start={delay}
                        stagger={stagger}
                        easing={p.theme.easings.outExpo}
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: 44,
                            fontWeight: 600,
                            letterSpacing: -0.7,
                            lineHeight: 1.15,
                            color: strikeDraw > 0.5 ? 'rgba(255, 255, 255, 0.72)' : '#FFFFFF',
                            textShadow: `${ring(2.5)}, 0 4px 16px rgba(0, 0, 0, 0.75)`,
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            left: -6,
                            right: -6,
                            top: '52%',
                            height: 6,
                            backgroundColor: '#FF2E54',
                            borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                            transform: `rotate(-1.5deg) scaleX(${strikeDraw})`,
                            transformOrigin: 'left center',
                        }}
                    />
                </div>

                {/* Baris 2: Dibingkai Kotak Teknis (.hl.box) dengan Siku Sudut */}
                <div
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        backgroundColor: 'rgba(9, 10, 15, 0.86)',
                        padding: '18px 28px',
                        borderRadius: 10,
                        border: `3px solid ${p.theme.colors.accent}`,
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                        opacity: boxDraw,
                        transform: `translateY(${(1 - boxDraw) * 18}px) scale(${0.94 + 0.06 * boxDraw})`,
                    }}
                >
                    <span
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: isHook ? 60 : 54,
                            fontWeight: 800,
                            letterSpacing: -1.3,
                            lineHeight: 1.06,
                            color: p.theme.colors.accent,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </span>
                </div>
            </Shell>
        );
    }

    // v1: Classic Masked Poster Stack + Hand Underline
    const stamp = spring({
        fps,
        frame: frame - (delay + Math.round(0.08 * fps)),
        config: { damping: 11, stiffness: 260, mass: 0.6 },
    });
    const under = prog(frame, hlStart + Math.round(0.35 * fps), Math.round(0.4 * fps), p.theme.easings.outExpo);

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
                        fontSize: isHook ? 64 : 54,
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

// ============================================================
// 5. LABEL TAPE (v1: Dymo Emboss | v2: Cyber Industrial Spec | v3: Frosted Split Tag)
// ============================================================
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
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const delay = Math.round((isHook ? 0.04 : 0.16) * fps);
    const gap = Math.round(0.16 * fps);
    const badge = tidy(p.badge);

    // v2: Cyber Industrial Spec Bar (Chamfered Tech Bars)
    if (ver === 'v2') {
        const bar1 = prog(frame, delay, Math.round(0.28 * fps), p.theme.easings.outExpo);
        const bar2 = prog(frame, delay + Math.round(0.2 * fps), Math.round(0.32 * fps), p.theme.easings.outExpo);
        const bar3 = prog(frame, delay + Math.round(0.42 * fps), Math.round(0.35 * fps), p.theme.easings.outExpo);
        return (
            <Shell exit={exit} top={202}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                    {badge ? (
                        <div
                            style={{
                                backgroundColor: p.theme.colors.accent,
                                color: p.theme.colors.accentText,
                                fontFamily: FONT.mono,
                                fontSize: 24,
                                fontWeight: 700,
                                padding: '6px 20px',
                                clipPath: `polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)`,
                                opacity: bar1,
                                transform: `translateX(${(1 - bar1) * -30}px)`,
                            }}
                        >
                            // {badge}
                        </div>
                    ) : null}

                    <div
                        style={{
                            backgroundColor: 'rgba(12, 14, 20, 0.92)',
                            borderLeft: `6px solid ${p.theme.colors.accent}`,
                            color: '#F8FAFC',
                            padding: '16px 28px',
                            fontFamily: FONT.grotesk,
                            fontSize: 42,
                            fontWeight: 700,
                            letterSpacing: -0.6,
                            lineHeight: 1.15,
                            boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                            clipPath: `inset(0 ${(1 - bar2) * 100}% 0 0)`,
                        }}
                    >
                        {tidy(p.line1)}
                    </div>

                    <div
                        style={{
                            backgroundColor: '#F8FAFC',
                            color: '#090A0F',
                            borderLeft: '8px solid #090A0F',
                            padding: '18px 30px',
                            fontFamily: FONT.grotesk,
                            fontSize: isHook ? 58 : 52,
                            fontWeight: 800,
                            letterSpacing: -1.2,
                            lineHeight: 1.06,
                            boxShadow: `8px 8px 0 ${p.theme.colors.accent}, 0 16px 32px rgba(0,0,0,0.55)`,
                            clipPath: `inset(0 ${(1 - bar3) * 100}% 0 0)`,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </div>
                </div>
            </Shell>
        );
    }

    // v3: Frosted Split Tag
    if (ver === 'v3') {
        const s1 = prog(frame, delay, Math.round(0.32 * fps), p.theme.easings.outExpo);
        const s2 = prog(frame, delay + Math.round(0.24 * fps), Math.round(0.36 * fps), p.theme.easings.outExpo);
        return (
            <Shell exit={exit} top={204}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: 'rgba(15, 17, 23, 0.88)',
                            border: '1.5px solid rgba(255, 255, 255, 0.24)',
                            borderRadius: 10,
                            overflow: 'hidden',
                            boxShadow: '0 14px 30px rgba(0,0,0,0.45)',
                            opacity: s1,
                            transform: `translateY(${(1 - s1) * 16}px)`,
                        }}
                    >
                        {badge ? (
                            <span
                                style={{
                                    backgroundColor: p.theme.colors.accent,
                                    color: p.theme.colors.accentText,
                                    fontFamily: FONT.mono,
                                    fontSize: 24,
                                    fontWeight: 700,
                                    padding: '16px 20px',
                                    alignSelf: 'stretch',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {badge}
                            </span>
                        ) : null}
                        <span
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: 40,
                                fontWeight: 600,
                                color: '#FFFFFF',
                                padding: '14px 26px',
                                lineHeight: 1.18,
                            }}
                        >
                            {tidy(p.line1)}
                        </span>
                    </div>

                    <div
                        style={{
                            backgroundColor: p.theme.colors.accent,
                            color: p.theme.colors.accentText,
                            borderRadius: 10,
                            padding: '18px 30px',
                            fontFamily: FONT.grotesk,
                            fontSize: isHook ? 58 : 52,
                            fontWeight: 800,
                            letterSpacing: -1.2,
                            lineHeight: 1.06,
                            boxShadow: '0 16px 34px rgba(0,0,0,0.55)',
                            opacity: s2,
                            transform: `translateY(${(1 - s2) * 18}px)`,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </div>
                </div>
            </Shell>
        );
    }

    // v1: Classic Dymo Label Tape
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

// ============================================================
// 6. QUIET SERIF (v1: Editorial Rule | v2: Magazine Masthead | v3: Warm Paper Pocket)
// ============================================================
const QuietSerif: React.FC<HeadlineLayoutProps> = (p) => {
    const { frame, fps, exit } = useBase(p.durationInFrames, p.theme);
    const isHook = p.variant === 'hook';
    const ver = resolveVariantVersion(p.hookVariant, 'v1');
    const delay = Math.round((isHook ? 0.06 : 0.18) * fps);
    const ease = p.theme.easings.outExpo;

    const a = prog(frame, delay, Math.round(0.5 * fps), ease);
    const rule = prog(frame, delay + Math.round(0.3 * fps), Math.round(0.6 * fps), ease);
    const b = prog(frame, delay + Math.round(0.55 * fps), Math.round(0.7 * fps), ease);
    const c = prog(frame, delay + Math.round(0.95 * fps), Math.round(0.4 * fps), ease);
    const badge = tidy(p.badge);

    // v2: Luxury Magazine Masthead (Garis Vertikal Kiri + Editorial Dua Warna)
    if (ver === 'v2') {
        return (
            <Shell exit={exit} top={206} left={60} right={60}>
                <div
                    style={{
                        position: 'absolute',
                        inset: '-60px -56px',
                        background:
                            'radial-gradient(ellipse 85% 75% at 35% 45%, rgba(0, 0, 0, 0.54), rgba(0, 0, 0, 0) 75%)',
                        opacity: clamp01(a * 1.5),
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'relative',
                        borderLeft: `4px solid ${p.theme.colors.accent}`,
                        paddingLeft: 28,
                    }}
                >
                    {badge ? (
                        <div
                            style={{
                                fontFamily: FONT.mono,
                                fontSize: 24,
                                fontWeight: 600,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                color: p.theme.colors.accent,
                                marginBottom: 10,
                                opacity: a,
                            }}
                        >
                            {badge}
                        </div>
                    ) : null}

                    <div
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: 42,
                            fontWeight: 500,
                            lineHeight: 1.2,
                            color: 'rgba(255, 255, 255, 0.94)',
                            textShadow: '0 2px 14px rgba(0, 0, 0, 0.75)',
                            opacity: a,
                            transform: `translateY(${(1 - a) * 14}px)`,
                            marginBottom: 10,
                        }}
                    >
                        {tidy(p.line1)}
                    </div>

                    <div
                        style={{
                            fontFamily: FONT.serifItalic,
                            fontSize: isHook ? 66 : 56,
                            fontWeight: 400,
                            letterSpacing: -1.4,
                            lineHeight: 0.98,
                            color: '#FFFFFF',
                            textShadow: '0 4px 28px rgba(0, 0, 0, 0.75)',
                            opacity: b,
                            transform: `translateY(${(1 - b) * 20}px)`,
                        }}
                    >
                        {tidy(p.highlightLine)}
                    </div>
                </div>
            </Shell>
        );
    }

    // v3: Warm Paper Pocket (Kartu Kertas Krem Hangat — Kontras Terang `bang-motion` 1b)
    if (ver === 'v3') {
        return (
            <Shell exit={exit} top={202} left={60} right={60}>
                <div
                    style={{
                        backgroundColor: '#F7F4EB',
                        color: '#18181B',
                        borderRadius: 14,
                        padding: '30px 38px 34px',
                        boxShadow: '0 22px 44px rgba(0, 0, 0, 0.52), inset 0 0 0 1.5px rgba(24, 24, 27, 0.14)',
                        opacity: a,
                        transform: `translateY(${(1 - a) * 20}px)`,
                        maxWidth: 860,
                    }}
                >
                    {badge ? (
                        <div
                            style={{
                                display: 'inline-block',
                                fontFamily: FONT.grotesk,
                                fontSize: 24,
                                fontWeight: 700,
                                color: '#9A3412',
                                borderBottom: '2px solid #9A3412',
                                paddingBottom: 3,
                                marginBottom: 14,
                            }}
                        >
                            {badge}
                        </div>
                    ) : null}

                    <div
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: 38,
                            fontWeight: 500,
                            lineHeight: 1.24,
                            color: '#3F3F46',
                            marginBottom: 12,
                        }}
                    >
                        {tidy(p.line1)}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                            style={{
                                fontFamily: FONT.serifItalic,
                                fontSize: isHook ? 56 : 48,
                                fontWeight: 400,
                                letterSpacing: -1.2,
                                lineHeight: 1.02,
                                color: '#111111',
                            }}
                        >
                            {tidy(p.highlightLine)}
                        </span>
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: -6,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: p.theme.colors.accent,
                                transform: `scaleX(${rule})`,
                                transformOrigin: 'left center',
                            }}
                        />
                    </div>
                </div>
            </Shell>
        );
    }

    // v1: Classic Quiet Serif
    return (
        <Shell exit={exit} top={214} left={64} right={64}>
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
                        fontSize: isHook ? 68 : 58,
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
