import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ThemeDefinition } from '../theme';

/**
 * Badge di atas headline (hook / demo / spec).
 *
 * Sebelumnya blok badge ini disalin 6x di AffiliateVideo.tsx dengan ukuran font
 * yang tidak konsisten (23/24/25px) dan warna yang di-hardcode. Sekarang satu
 * komponen dengan 4 varian:
 *
 *  - "sticker" : label solid warna aksen, miring ~-2.5deg, bayangan keras, kilau
 *                sekali lewat. Paling "menghentikan scroll", default untuk hook.
 *  - "alert"   : kapsul gelap dengan titik merah berdenyut (ala LIVE badge).
 *  - "marker"  : teks putih dengan stabilo aksen yang tersapu dari kiri ke kanan.
 *  - "glass"   : chip kaca yang sudah dirapikan (default untuk demo / spec).
 */
export type BadgeVariant = 'sticker' | 'alert' | 'marker' | 'glass';

export const resolveBadgeVariant = (
    raw: string | undefined,
    fallback: BadgeVariant,
): BadgeVariant => {
    const s = (raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
    switch (s) {
        case 'sticker':
        case 'label':
            return 'sticker';
        case 'alert':
        case 'live':
        case 'pulse':
            return 'alert';
        case 'marker':
        case 'highlight':
        case 'stabilo':
            return 'marker';
        case 'glass':
        case 'chip':
        case 'classic':
            return 'glass';
        default:
            return fallback;
    }
};

export interface HookBadgeProps {
    text: string;
    variant: BadgeVariant;
    theme: ThemeDefinition;
    /** Frame (relatif ke Sequence) saat badge mulai masuk. */
    delayFrames?: number;
    /** Warna titik pada varian "alert". Default merah TikTok. */
    dotColor?: string;
}

const BoltIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M13.5 1.5 4 13.5h6.2L9 22.5l10-12.5h-6.4L13.5 1.5Z" />
    </svg>
);

export const HookBadge: React.FC<HookBadgeProps> = ({
    text,
    variant,
    theme,
    delayFrames = 0,
    dotColor = '#FF2E54',
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const local = frame - delayFrames;
    const enter = spring({ fps, frame: local, config: theme.springs.pill });
    const clampedEnter = Math.min(1, Math.max(0, enter));

    // Ukuran dasar. Canvas 1080px ditonton ~390pt di HP, jadi teks badge harus
    // >= 30px supaya tetap terbaca (sebelumnya 23-25px, terlalu kecil).
    const fontSize = 32;

    if (variant === 'sticker') {
        // Kilau tunggal yang lewat sekali setelah badge selesai masuk.
        const shineStart = Math.round(0.35 * fps);
        const shine = interpolate(local, [shineStart, shineStart + Math.round(0.5 * fps)], [-40, 140], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
        // Goyang halus agar terasa seperti stiker tempel, bukan kotak statis.
        const wiggle = Math.sin(local / (fps * 0.22)) * 0.5;
        const rotate = interpolate(enter, [0, 1], [-9, -2.5]) + wiggle;
        const scale = interpolate(enter, [0, 1], [0.6, 1]);

        return (
            <div
                style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    gap: 12,
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: theme.colors.accent,
                    color: theme.colors.accentText,
                    border: '3px solid rgba(0, 0, 0, 0.9)',
                    borderRadius: 14,
                    padding: '10px 22px 10px 16px',
                    boxShadow: '6px 6px 0 rgba(0, 0, 0, 0.88), 0 14px 30px rgba(0, 0, 0, 0.35)',
                    opacity: clampedEnter,
                    transform: `rotate(${rotate}deg) scale(${scale})`,
                    transformOrigin: 'left center',
                }}
            >
                <BoltIcon size={fontSize - 2} color={theme.colors.accentText} />
                <span
                    style={{
                        fontFamily: theme.fonts.display,
                        fontSize,
                        fontWeight: 900,
                        letterSpacing: 0.4,
                        lineHeight: 1.1,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {text}
                </span>
                <span
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${shine}%`,
                        width: '28%',
                        background:
                            'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        transform: 'skewX(-18deg)',
                        pointerEvents: 'none',
                    }}
                />
            </div>
        );
    }

    if (variant === 'alert') {
        // Titik berdenyut: cincin membesar lalu memudar tiap ~1 detik.
        const cycle = (local / fps) % 1;
        const ringScale = 1 + cycle * 1.8;
        const ringOpacity = (1 - cycle) * 0.65;

        return (
            <div
                style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: 'rgba(8, 8, 12, 0.90)',
                    border: '2px solid rgba(255, 255, 255, 0.22)',
                    borderRadius: 16,
                    padding: '10px 22px 10px 18px',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.38)',
                    opacity: clampedEnter,
                    transform: `translateY(${(1 - clampedEnter) * 14}px) scale(${0.9 + clampedEnter * 0.1})`,
                    transformOrigin: 'left center',
                }}
            >
                <span style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
                    <span
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                            opacity: ringOpacity,
                            transform: `scale(${ringScale})`,
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                            boxShadow: `0 0 12px ${dotColor}`,
                        }}
                    />
                </span>
                <span
                    style={{
                        fontFamily: theme.fonts.display,
                        fontSize,
                        fontWeight: 800,
                        letterSpacing: 1.1,
                        lineHeight: 1.1,
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {text}
                </span>
            </div>
        );
    }

    if (variant === 'marker') {
        // Stabilo tersapu dari kiri ke kanan di belakang teks.
        const sweep = interpolate(local, [Math.round(0.06 * fps), Math.round(0.06 * fps) + Math.round(0.3 * fps)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: theme.easings.outExpo,
        });

        return (
            <div
                style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    position: 'relative',
                    padding: '6px 20px',
                    opacity: clampedEnter,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: theme.colors.accent,
                        borderRadius: 8,
                        transform: `skewX(-6deg) scaleX(${sweep})`,
                        transformOrigin: 'left center',
                        boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)',
                    }}
                />
                <span
                    style={{
                        position: 'relative',
                        fontFamily: theme.fonts.display,
                        fontSize,
                        fontWeight: 900,
                        letterSpacing: 0.6,
                        lineHeight: 1.15,
                        color: theme.colors.accentText,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        // Teks terungkap bersama sapuan stabilo; tanpa ini teks gelap
                        // terlihat di footage gelap sebelum latarnya muncul.
                        clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`,
                    }}
                >
                    {text}
                </span>
            </div>
        );
    }

    // "glass": chip kaca rapi untuk babak demo / spec (lebih tenang dari hook).
    return (
        <div
            style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                gap: 12,
                backgroundColor: theme.colors.badgeBg,
                border: `2px solid ${theme.colors.badgeBorder}`,
                borderRadius: 999,
                padding: '9px 24px 9px 18px',
                boxShadow: `0 10px 28px rgba(0, 0, 0, 0.28), 0 0 18px ${theme.colors.indicatorColor}33`,
                opacity: clampedEnter,
                transform: `translateY(${(1 - clampedEnter) * 14}px) scale(${0.88 + clampedEnter * 0.12})`,
                transformOrigin: 'left center',
            }}
        >
            <span
                style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: theme.colors.indicatorColor,
                    boxShadow: `0 0 12px ${theme.colors.indicatorColor}`,
                    flexShrink: 0,
                }}
            />
            <span
                style={{
                    fontFamily: theme.fonts.display,
                    fontSize: fontSize - 4,
                    fontWeight: 800,
                    letterSpacing: 1.4,
                    lineHeight: 1.1,
                    color: theme.colors.badgeText,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                }}
            >
                {text}
            </span>
        </div>
    );
};

