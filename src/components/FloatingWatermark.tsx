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
        return renderWatermarkBadge(text, 560, 120, opacity, frame);
    }
    if (position === 'mid_left') {
        return renderWatermarkBadge(text, 64, 680, opacity, frame);
    }
    if (position === 'mid_right') {
        return renderWatermarkBadge(text, 540, 680, opacity, frame);
    }

    // Default 'floating': Bagi total durasi menjadi 5 interval posisi dinamis
    const intervalLength = Math.floor(durationInFrames / 5);

    // Titik-titik posisi aman (DIJAMIN 100% TIDAK PERNAH MENABRAK ATAU TERTUTUP SUBTITLE):
    // - Subtitle Karaoke berada di bottom: 460 (y: 1320 - 1460).
    // - Headline Card berada di atas (y: 190 - 560).
    // - CTA Keranjang berada di bawah (y: 1450 - 1620).
    // Oleh karena itu, Watermark diletakkan di zona bersih (y: 660 s/d 840) pada Babak 1-3,
    // dan di area atas (y: 260) pada Babak 4 (saat headline sudah hilang).
    const waypoints: Waypoint[] = [
        { startFrame: 0, endFrame: intervalLength, x: 75, y: 680 }, // Interval 1 (Hook): Tengah Kiri (Di bawah Headline, jauh di atas Subtitle)
        { startFrame: intervalLength, endFrame: intervalLength * 2, x: 520, y: 680 }, // Interval 2 (Demo): Tengah Kanan (Aman)
        { startFrame: intervalLength * 2, endFrame: intervalLength * 3, x: 75, y: 840 }, // Interval 3 (Spec): Tengah Kiri (Area bersih)
        { startFrame: intervalLength * 3, endFrame: intervalLength * 4, x: 520, y: 840 }, // Interval 4 (Spec/Proof): Tengah Kanan (Jauh di atas Subtitle)
        { startFrame: intervalLength * 4, endFrame: durationInFrames, x: 75, y: 260 }, // Interval 5 (CTA): Atas Kiri (Headline sudah hilang, CTA di bawah)
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
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(12, 10, 18, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            }}
        >
            {/* Subtle lock/shield icon indicator */}
            <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span
                style={{
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    color: '#FFFFFF',
                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
                    whiteSpace: 'nowrap',
                }}
            >
                {text}
            </span>
        </div>
    );
}
