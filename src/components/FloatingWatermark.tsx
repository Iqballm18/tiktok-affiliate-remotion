import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export type WatermarkPosition = 'floating' | 'top_left' | 'top_right' | 'mid_left' | 'mid_right';

interface FloatingWatermarkProps {
    text?: string;
    opacity?: number;
    position?: WatermarkPosition;
}

interface Waypoint {
    startFrame: number;
    endFrame: number;
    x: number;
    y: number;
}

interface WatermarkItem {
    platform: 'tiktok' | 'instagram' | 'none';
    handle: string;
}

export const TikTokIcon: React.FC<{ size?: number; color?: string }> = ({
    size = 20,
    color = '#FFFFFF',
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.83 4.46 6.3 6.3 0 0 0 1.85-4.49V8.62a8.17 8.17 0 0 0 4.77 1.52v-3.45z" />
    </svg>
);

export const InstagramIcon: React.FC<{ size?: number; color?: string }> = ({
    size = 20,
    color = '#FFFFFF',
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);

export function parseWatermarkItems(rawText: string): WatermarkItem[] {
    const raw = (rawText || '').trim();
    if (!raw) {
        return [
            { platform: 'tiktok', handle: 'inanikma_' },
            { platform: 'instagram', handle: 'spillbyna_' },
        ];
    }

    const parts = raw.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
        return [
            { platform: 'tiktok', handle: 'inanikma_' },
            { platform: 'instagram', handle: 'spillbyna_' },
        ];
    }

    return parts.map((part) => {
        const clean = part.replace(/^@/, '').trim();
        const lower = clean.toLowerCase();

        // 1. Akun TikTok (khusus @inanikma_ atau prefix tiktok/tt)
        if (
            lower.includes('inanikma') ||
            lower.startsWith('tt:') ||
            lower.startsWith('tiktok:')
        ) {
            const handle = clean
                .replace(/^(tt|tiktok):/i, '')
                .replace(/^@/, '')
                .trim();
            return { platform: 'tiktok', handle };
        }

        // 2. Akun Instagram (khusus @spillbyna_ atau prefix ig/instagram)
        if (
            lower.includes('spillbyna') ||
            lower.startsWith('ig:') ||
            lower.startsWith('instagram:')
        ) {
            const handle = clean
                .replace(/^(ig|instagram):/i, '')
                .replace(/^@/, '')
                .trim();
            return { platform: 'instagram', handle };
        }

        // 3. Fallback jika ada format lain
        return { platform: 'none', handle: part };
    });
}

export const FloatingWatermark: React.FC<FloatingWatermarkProps> = ({
    text = '@inanikma_ | @spillbyna_',
    opacity = 0.7,
    position = 'floating',
}) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    // Fixed corner positions if requested
    if (position === 'top_left') {
        return renderWatermarkBadge(text, 64, 120, opacity, frame);
    }
    if (position === 'top_right') {
        return renderWatermarkBadge(text, 520, 120, opacity, frame);
    }
    if (position === 'mid_left') {
        return renderWatermarkBadge(text, 80, 760, opacity, frame);
    }
    if (position === 'mid_right') {
        return renderWatermarkBadge(text, 520, 760, opacity, frame);
    }

    // Default 'floating': Bagi total durasi menjadi 5 interval posisi dinamis
    const intervalLength = Math.floor(durationInFrames / 5);

    // Titik-titik posisi aman (DIJAMIN 100% TIDAK PERNAH MENABRAK HEADLINE CARD MAUPUN SUBTITLE):
    // - Headline Card berada di atas (y: 190 - 685). JANGAN gunakan y < 720 selama babak 1-3.
    // - Subtitle Karaoke berada di bottom: 460 (y: 1150 - 1460). JANGAN gunakan y > 1050.
    // - CTA Keranjang berada di bawah (y: 1400 - 1750).
    // Koridor steril teraman di layar 1080x1920 adalah y: 760 s/d 920.
    // Seluruh 5 interval ditempatkan di koridor ini bergantian kiri-kanan agar dinamis tanpa pernah menabrak teks apa pun.
    const waypoints: Waypoint[] = [
        { startFrame: 0, endFrame: intervalLength, x: 80, y: 760 }, // Interval 1 (Hook): Tengah Kiri
        { startFrame: intervalLength, endFrame: intervalLength * 2, x: 520, y: 800 }, // Interval 2 (Demo): Tengah Kanan
        { startFrame: intervalLength * 2, endFrame: intervalLength * 3, x: 80, y: 890 }, // Interval 3 (Spec): Tengah Kiri Bawah
        { startFrame: intervalLength * 3, endFrame: intervalLength * 4, x: 520, y: 920 }, // Interval 4 (Spec/Proof): Tengah Kanan Bawah
        { startFrame: intervalLength * 4, endFrame: durationInFrames, x: 520, y: 760 }, // Interval 5 (CTA): Tengah Kanan Atas
    ];

    // Temukan waypoint aktif saat ini
    const currentWaypoint =
        waypoints.find((wp) => frame >= wp.startFrame && frame < wp.endFrame) ||
        waypoints[waypoints.length - 1];

    const localFrame = frame - currentWaypoint.startFrame;
    const intervalDuration = currentWaypoint.endFrame - currentWaypoint.startFrame;
    const fadeFrames = 22; // ~0.36 detik untuk fade-in dan fade-out halus

    // Fade-in di awal interval, dan Fade-out sebelum berpindah posisi
    let currentOpacity = opacity;
    if (localFrame < fadeFrames) {
        currentOpacity = interpolate(localFrame, [0, fadeFrames], [0, opacity], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
    } else if (localFrame > intervalDuration - fadeFrames) {
        currentOpacity = interpolate(
            localFrame,
            [intervalDuration - fadeFrames, intervalDuration],
            [opacity, 0],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );
    }

    return renderWatermarkBadge(
        text,
        currentWaypoint.x,
        currentWaypoint.y,
        currentOpacity,
        frame
    );
};

function renderWatermarkBadge(
    text: string,
    x: number,
    y: number,
    opacity: number,
    frame: number
) {
    // Efek mengambang (floating/drifting) halus agar dinamis
    const driftX = Math.sin(frame / 40) * 8;
    const driftY = Math.cos(frame / 45) * 6;
    const items = parseWatermarkItems(text);

    return (
        <div
            style={{
                position: 'absolute',
                left: x + driftX,
                top: y + driftY,
                opacity,
                pointerEvents: 'none',
                zIndex: 90, // z-index tinggi di atas seluruh layer
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '7px 16px',
                borderRadius: 999,
                background: 'rgba(12, 10, 18, 0.82)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
        >
            {items.map((item, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <div
                            style={{
                                width: 1,
                                height: 16,
                                background: 'rgba(255, 255, 255, 0.35)',
                                margin: '0 1px',
                            }}
                        />
                    )}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                        }}
                    >
                        {item.platform === 'tiktok' && (
                            <TikTokIcon size={20} color="#FFFFFF" />
                        )}
                        {item.platform === 'instagram' && (
                            <InstagramIcon size={20} color="#FFFFFF" />
                        )}
                        <span
                            style={{
                                fontFamily:
                                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                fontSize: 21,
                                fontWeight: 700,
                                letterSpacing: 0.3,
                                color: '#FFFFFF',
                                textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.handle}
                        </span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
