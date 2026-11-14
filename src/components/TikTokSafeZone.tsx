import React from 'react';
import { AbsoluteFill } from 'remotion';

export const TikTokSafeZone: React.FC<{ platform?: 'universal' | 'tiktok' | 'instagram' }> = ({
    platform = 'universal',
}) => {
    const isReels = platform === 'instagram';
    const isUniversal = platform === 'universal';
    const platformLabel = isReels
        ? 'SAFE ZONE · INSTAGRAM REELS'
        : isUniversal
            ? 'SAFE ZONE · TIKTOK & REELS'
            : 'SAFE ZONE · TIKTOK';
    const bottomSafe = isReels ? 360 : 320;

    return (
        <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 999 }}>
            {/* Garis tipis Grid Profil 4:5 IG Reels (y: 285-1635) */}
            {(isReels || isUniversal) && (
                <div
                    style={{
                        position: 'absolute',
                        top: 285,
                        bottom: 285,
                        left: 14,
                        right: 14,
                        border: '1.5px dotted rgba(245, 133, 41, 0.55)',
                        borderRadius: 12,
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            top: -12,
                            right: 16,
                            backgroundColor: 'rgba(19, 19, 18, 0.85)',
                            color: '#F58529',
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'sans-serif',
                            padding: '1px 8px',
                            borderRadius: 4,
                        }}
                    >
                        CROP GRID IG 4:5 (y:285-1635)
                    </span>
                </div>
            )}

            {/* 1. Safe Zone Outline Box */}
            <div
                style={{
                    position: 'absolute',
                    top: 180,
                    bottom: bottomSafe,
                    left: 48,
                    right: 170,
                    border: '2px dashed rgba(34, 197, 94, 0.75)',
                    borderRadius: 20,
                    boxShadow: 'inset 0 0 20px rgba(34, 197, 94, 0.15)',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -14,
                        left: 20,
                        backgroundColor: '#22C55E',
                        color: '#000000',
                        fontSize: 16,
                        fontWeight: 800,
                        fontFamily: 'sans-serif',
                        padding: '2px 12px',
                        borderRadius: 6,
                        letterSpacing: 1,
                    }}
                >
                    {platformLabel}
                </div>
            </div>

            {/* 2. Top Bar Mock (TikTok Search/Tabs atau Reels Header) */}
            {isReels ? (
                <div
                    style={{
                        position: 'absolute',
                        top: 76,
                        left: 48,
                        right: 48,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: 'rgba(255, 255, 255, 0.82)',
                        fontSize: 30,
                        fontWeight: 800,
                        fontFamily: 'sans-serif',
                    }}
                >
                    <span>Reels</span>
                    <span style={{ fontSize: 26 }}>📷</span>
                </div>
            ) : (
                <div
                    style={{
                        position: 'absolute',
                        top: 80,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 32,
                        color: 'rgba(255, 255, 255, 0.65)',
                        fontSize: 28,
                        fontWeight: 700,
                        fontFamily: 'sans-serif',
                    }}
                >
                    <span>Live</span>
                    <span style={{ color: '#FFFFFF', borderBottom: '3px solid #FFF', paddingBottom: 6 }}>
                        Untuk Anda
                    </span>
                    <span>Mengikuti</span>
                </div>
            )}

            {/* 3. Right Sidebar Mock (Profile, Like, Comment, Bookmark, Share, Disc) */}
            <div
                style={{
                    position: 'absolute',
                    right: 32,
                    bottom: 340,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 36,
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Profile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            border: '2px solid #FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                        }}
                    >
                        👤
                    </div>
                </div>

                {/* Like */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 44 }}>❤️</div>
                    <span>42.8K</span>
                </div>

                {/* Comment */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 40 }}>💬</div>
                    <span>1.2K</span>
                </div>

                {/* Bookmark */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 40 }}>🔖</div>
                    <span>8.5K</span>
                </div>

                {/* Share */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 40 }}>↗️</div>
                    <span>2.4K</span>
                </div>

                {/* Spinning Sound Disc */}
                <div
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: '#1E1E1E',
                        border: '8px solid #2B2B2B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                    }}
                >
                    💿
                </div>
            </div>

            {/* 4. Bottom Mock (Keranjang Kuning, Username, Caption, Music) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 70,
                    left: 48,
                    right: 170,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    color: '#FFFFFF',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Platform Basket / Product Pill */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: isReels ? 'rgba(19, 19, 18, 0.92)' : 'rgba(254, 226, 226, 0.95)',
                        border: isReels ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid #F59E0B',
                        padding: '10px 20px',
                        borderRadius: 10,
                        width: 'fit-content',
                    }}
                >
                    <span style={{ fontSize: 26 }}>{isReels ? '🛍️' : '🛒'}</span>
                    <span style={{ color: isReels ? '#FFFFFF' : '#B45309', fontSize: 22, fontWeight: 800 }}>
                        {isReels ? 'Lihat Produk • Keranjang Reels' : 'Keranjang Kuning • Beli Sekarang'}
                    </span>
                </div>

                {/* Account Name */}
                <div style={{ fontSize: 28, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    @affiliate_tiktok_creator
                </div>

                {/* Caption */}
                <div
                    style={{
                        fontSize: 22,
                        lineHeight: 1.3,
                        color: 'rgba(255, 255, 255, 0.9)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    }}
                >
                    Review jujur pemakaian produk ini! Hasilnya beneran kelihatan... #tiktokshop #affiliate
                </div>

                {/* Audio Ticker */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 20,
                        color: 'rgba(255, 255, 255, 0.8)',
                    }}
                >
                    <span>🎵</span>
                    <span>Sound Asli - Rekomendasi FYP TikTok</span>
                </div>
            </div>
        </AbsoluteFill>
    );
};

