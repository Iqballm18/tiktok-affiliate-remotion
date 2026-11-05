import React from 'react';
import { AbsoluteFill } from 'remotion';

export const TikTokSafeZone: React.FC = () => {
    return (
        <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 999 }}>
            {/* 1. Safe Zone Outline Box */}
            <div
                style={{
                    position: 'absolute',
                    top: 180,
                    bottom: 320,
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
                    SAFE ZONE (AREA BEBAS ICON TIKTOK)
                </div>
            </div>

            {/* 2. Top Bar Mock (Search & Tabs) */}
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
                {/* TikTok Yellow Basket Pill (Keranjang Kuning Asli) */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: 'rgba(254, 226, 226, 0.95)',
                        border: '1.5px solid #F59E0B',
                        padding: '10px 20px',
                        borderRadius: 10,
                        width: 'fit-content',
                    }}
                >
                    <span style={{ fontSize: 26 }}>🛒</span>
                    <span style={{ color: '#B45309', fontSize: 22, fontWeight: 800 }}>
                        Keranjang Kuning • Beli Sekarang
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

