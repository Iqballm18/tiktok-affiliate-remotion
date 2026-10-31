import React from 'react';
import {
    AbsoluteFill,
    Sequence,
    OffthreadVideo,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
} from 'remotion';

export interface ClipItem {
    src: string;
    startSec: number; // Detik mulai di video asli
    endSec: number;   // Detik selesai di video asli
}

export interface AffiliateProps {
    badgeText: string;
    hookLine1: string;
    hookHighlight: string;
    solutionLine1: string;
    solutionLine2: string;
    ctaText: string;
    clips: ClipItem[];
}

// Komponen Kartu Teks dengan Animasi Pop-Up (Spring)
const AnimatedTextCard: React.FC<{
    badge?: string;
    line1: string;
    line2: string;
    highlightSecondLine?: boolean;
}> = ({ badge, line1, line2, highlightSecondLine }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Efek membal (bounce) saat muncul
    const scale = spring({
        fps,
        frame,
        config: { damping: 12, stiffness: 160, mass: 0.8 },
    });

    const opacity = interpolate(frame, [0, 8], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <div
            style={{
                position: 'absolute',
                top: 220,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 48px',
                transform: `scale(${scale})`,
                opacity,
            }}
        >
            {badge && (
                <div
                    style={{
                        backgroundColor: '#FF2A5F',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: 28,
                        padding: '8px 24px',
                        borderRadius: 999,
                        marginBottom: -14,
                        zIndex: 2,
                        boxShadow: '0 6px 16px rgba(255,42,95,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}
                >
                    {badge}
                </div>
            )}

            <div
                style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(8px)',
                    border: '3px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 28,
                    padding: '28px 36px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                    textAlign: 'center',
                    maxWidth: 940,
                }}
            >
                <div
                    style={{
                        color: '#FFFFFF',
                        fontSize: 48,
                        fontWeight: 800,
                        lineHeight: 1.35,
                        fontFamily: 'Inter, Arial, sans-serif',
                    }}
                >
                    {line1}
                </div>

                <div
                    style={{
                        marginTop: 10,
                        display: 'inline-block',
                        backgroundColor: highlightSecondLine ? '#FACC15' : 'transparent',
                        color: highlightSecondLine ? '#0F172A' : '#38BDF8',
                        padding: highlightSecondLine ? '6px 20px' : '0',
                        borderRadius: 14,
                        fontSize: 50,
                        fontWeight: 900,
                        lineHeight: 1.3,
                        fontFamily: 'Inter, Arial, sans-serif',
                    }}
                >
                    {line2}
                </div>
            </div>
        </div>
    );
};

// Komponen CTA Keranjang Kuning Berdenyut + Panah Goyang
const AnimatedCTA: React.FC<{ text: string }> = ({ text }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enterScale = spring({
        fps,
        frame,
        config: { damping: 10, stiffness: 150 },
    });

    // Efek denyut (pulse) & panah menunjuk ke kiri bawah
    const pulse = 1 + Math.sin(frame / 4) * 0.04;
    const arrowOffset = Math.sin(frame / 3) * 10;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 340,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: `scale(${enterScale * pulse})`,
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #FF8A00 0%, #FF3D00 100%)',
                    color: '#FFFFFF',
                    fontSize: 44,
                    fontWeight: 900,
                    fontFamily: 'Inter, Arial, sans-serif',
                    padding: '24px 42px',
                    borderRadius: 999,
                    border: '4px solid #FFF',
                    boxShadow: '0 16px 35px rgba(255, 61, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                <span>🛒 {text}</span>
                <span
                    style={{
                        display: 'inline-block',
                        transform: `translate(${-arrowOffset}px, ${arrowOffset}px)`,
                    }}
                >
                    ↙
                </span>
            </div>
        </div>
    );
};

export const AffiliateVideo: React.FC<AffiliateProps> = ({
    badgeText,
    hookLine1,
    hookHighlight,
    solutionLine1,
    solutionLine2,
    ctaText,
    clips,
}) => {
    const { fps } = useVideoConfig();
    let accumulatedFrames = 0;

    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* 1. RANGKAIAN KLIP VIDEO (TRIM & CONCAT OTOMATIS) */}
            {clips.map((clip, idx) => {
                const durationInFrames = Math.round((clip.endSec - clip.startSec) * fps);
                const fromFrame = accumulatedFrames;
                accumulatedFrames += durationInFrames;

                return (
                    <Sequence key={idx} from={fromFrame} durationInFrames={durationInFrames}>
                        <OffthreadVideo
                            src={staticFile(clip.src)}
                            startFrom={Math.round(clip.startSec * fps)}
                            endAt={Math.round(clip.endSec * fps)}
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </Sequence>
                );
            })}

            {/* 2. TEKS HOOK (Detik 0 - 4) */}
            <Sequence from={0} durationInFrames={4 * fps}>
                <AnimatedTextCard
                    badge={badgeText}
                    line1={hookLine1}
                    line2={hookHighlight}
                    highlightSecondLine={true}
                />
            </Sequence>

            {/* 3. TEKS SOLUSI / KEUNGGULAN (Detik 4 - 10) */}
            <Sequence from={4 * fps} durationInFrames={6 * fps}>
                <AnimatedTextCard
                    badge="KEUNGGULAN PRODUK"
                    line1={solutionLine1}
                    line2={solutionLine2}
                    highlightSecondLine={false}
                />
            </Sequence>

            {/* 4. TOMBOL CTA KERANJANG KUNING (Detik 10 - 14) */}
            <Sequence from={10 * fps} durationInFrames={4 * fps}>
                <AnimatedCTA text={ctaText} />
            </Sequence>
        </AbsoluteFill>
    );
};