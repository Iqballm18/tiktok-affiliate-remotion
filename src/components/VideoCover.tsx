import React from 'react';
import { AbsoluteFill, Freeze, Img, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { ThemeDefinition } from '../theme';
import { Palette } from '../affiliate-styles/tokens';
import { FONT } from '../load-hook-fonts';
import { TikTokIcon, InstagramIcon, parseWatermarkItems } from './FloatingWatermark';

/**
 * Cover / thumbnail video untuk TikTok & Instagram Reels.
 *
 * Cover TIDAK diambil dari potongan video hasil render. Cover digambar ulang sebagai satu frame diam
 * memakai bahan yang sama dengan video (tema, palet, kartu hook, footage mentah, watermark),
 * sehingga tampilannya selaras dengan video tetapi bersih dari transisi, subtitle, dan progress bar.
 *
 * Zona aman grid profil: Instagram memotong cover 9:16 menjadi 4:5 (y 285-1635) dan TikTok menjadi
 * 3:4 (y 240-1680). Semua teks penting dijaga di antara y 300-1600.
 */

export const COVER_TEMPLATES = ['hook_card', 'big_headline', 'promo_split'] as const;
export type CoverTemplate = (typeof COVER_TEMPLATES)[number];

export const resolveCoverTemplate = (raw?: string): CoverTemplate =>
    raw === 'hook_card' || raw === 'big_headline' || raw === 'promo_split' ? raw : 'hook_card';

export type CoverBackground =
    | { kind: 'image'; src: string }
    | { kind: 'video'; src: string; frameSec: number; objectPosition?: string }
    | { kind: 'none' };

export interface VideoCoverProps {
    template: CoverTemplate;
    theme: ThemeDefinition;
    palette: Palette;
    title: string;
    subtitle?: string;
    badge?: string;
    cta?: string;
    background: CoverBackground;
    /** Kartu hook yang sama persis dengan di video (dipakai template hook_card). */
    hookCard?: React.ReactNode;
    /** Frame saat kartu hook sudah selesai beranimasi masuk. */
    hookFreezeFrame?: number;
    watermark?: string;
}

const GRID_TOP = 300;
const GRID_BOTTOM = 1600;

/** Ukuran font mengecil otomatis untuk kalimat panjang supaya tetap muat 2-3 baris. */
const fitSize = (text: string, max: number, min: number, idealChars: number) => {
    const len = Math.max(1, text.trim().length);
    if (len <= idealChars) return max;
    return Math.max(min, Math.round(max * Math.sqrt(idealChars / len)));
};

const Background: React.FC<{ bg: CoverBackground; theme: ThemeDefinition; zoom?: number }> = ({ bg, theme, zoom = 1.04 }) => {
    const { fps } = useVideoConfig();
    if (bg.kind === 'image') {
        return (
            <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
                <Img src={staticFile(bg.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </AbsoluteFill>
        );
    }
    if (bg.kind === 'video') {
        return (
            <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
                <Freeze frame={0}>
                    <OffthreadVideo
                        src={staticFile(bg.src)}
                        startFrom={Math.max(0, Math.round(bg.frameSec * fps))}
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: bg.objectPosition || 'center',
                        }}
                    />
                </Freeze>
            </AbsoluteFill>
        );
    }
    return (
        <AbsoluteFill
            style={{
                background: `radial-gradient(circle at 50% 38%, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.55) 100%), ${theme.colors.bg}`,
            }}
        />
    );
};

const Watermark: React.FC<{ text?: string }> = ({ text = '@inanikma_ | @spillbyna_' }) => {
    if (!text) return null;
    const items = parseWatermarkItems(text);
    if (!items || items.length === 0) return null;

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: GRID_BOTTOM - 20, // y ≈ 1580 (masuk dalam zona aman grid profil IG 4:5 & TikTok 3:4)
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 90,
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '8px 20px',
                    borderRadius: 999,
                    background: 'rgba(12, 10, 18, 0.85)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.55)',
                }}
            >
                {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && (
                            <div
                                style={{
                                    width: 1.5,
                                    height: 18,
                                    background: 'rgba(255, 255, 255, 0.35)',
                                    margin: '0 2px',
                                }}
                            />
                        )}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            {item.platform === 'tiktok' && (
                                <TikTokIcon size={24} color="#FFFFFF" />
                            )}
                            {item.platform === 'instagram' && (
                                <InstagramIcon size={24} color="#FFFFFF" />
                            )}
                            <span
                                style={{
                                    fontFamily:
                                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                    fontSize: 23,
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
        </div>
    );
};

const BadgePill: React.FC<{ text: string; palette: Palette; inverted?: boolean }> = ({ text, palette, inverted }) => (
    <div
        style={{
            alignSelf: 'flex-start',
            display: 'inline-block',
            backgroundColor: inverted ? palette.ink : palette.accent,
            color: inverted ? palette.paper : palette.accentInk,
            fontFamily: FONT.grotesk,
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: 0.5,
            padding: '12px 26px',
            borderRadius: 999,
            textTransform: 'uppercase',
        }}
    >
        {text}
    </div>
);

// ------------------------------------------------------------
// 1. HOOK CARD: kartu hook dari video, dibekukan saat sudah tampil penuh
// ------------------------------------------------------------
const HookCardCover: React.FC<VideoCoverProps> = ({ background, theme, hookCard, hookFreezeFrame = 90, watermark }) => (
    <AbsoluteFill>
        <Background bg={background} theme={theme} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.35) 100%)' }} />
        {/* Di video kartu hook berada di y≈200 (zona UI TikTok). Untuk cover digeser turun supaya masuk grid 4:5 & 3:4. */}
        <AbsoluteFill style={{ transform: 'translateY(170px)' }}>
            <Freeze frame={hookFreezeFrame}>{hookCard}</Freeze>
        </AbsoluteFill>
        <Watermark text={watermark} />
    </AbsoluteFill>
);

// ------------------------------------------------------------
// 2. BIG HEADLINE: footage + judul besar berblok aksen di tengah frame
// ------------------------------------------------------------
const BigHeadlineCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, watermark }) => {
    const titleSize = fitSize(title, 128, 78, 18);
    const subSize = fitSize(subtitle || '', 52, 38, 26);
    return (
        <AbsoluteFill>
            <Background bg={background} theme={theme} />
            <AbsoluteFill
                style={{
                    background:
                        'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.78) 78%, rgba(0,0,0,0.88) 100%)',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 80,
                    right: 80,
                    bottom: 1920 - GRID_BOTTOM + 70,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 26,
                }}
            >
                {badge ? <BadgePill text={badge} palette={palette} /> : null}
                {subtitle ? (
                    <div
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: subSize,
                            fontWeight: 600,
                            lineHeight: 1.18,
                            color: '#FFFFFF',
                            textShadow: '0 3px 14px rgba(0,0,0,0.6)',
                        }}
                    >
                        {subtitle}
                    </div>
                ) : null}
                <div style={{ lineHeight: 1.12 }}>
                    <span
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: titleSize,
                            fontWeight: 800,
                            letterSpacing: -2,
                            color: palette.accentInk,
                            backgroundColor: palette.accent,
                            padding: '4px 20px',
                            boxDecorationBreak: 'clone',
                            WebkitBoxDecorationBreak: 'clone',
                            borderRadius: 12,
                        }}
                    >
                        {title}
                    </span>
                </div>
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

// ------------------------------------------------------------
// 3. PROMO SPLIT: foto produk di atas, panel kertas berisi judul & CTA di bawah
// ------------------------------------------------------------
const PromoSplitCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, cta, watermark }) => {
    const panelTop = 1010;
    const titleSize = fitSize(title, 100, 66, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.paper }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: panelTop + 40, overflow: 'hidden' }}>
                <Background bg={background} theme={theme} zoom={1.02} />
                {badge ? (
                    <div style={{ position: 'absolute', left: 80, top: GRID_TOP + 20 }}>
                        <BadgePill text={badge} palette={palette} />
                    </div>
                ) : null}
            </div>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: panelTop,
                    bottom: 0,
                    backgroundColor: palette.paper,
                    borderTopLeftRadius: 44,
                    borderTopRightRadius: 44,
                    padding: '64px 80px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 22,
                }}
            >
                {subtitle ? (
                    <div style={{ fontFamily: FONT.grotesk, fontSize: 44, fontWeight: 600, lineHeight: 1.2, color: palette.ink, opacity: 0.78 }}>
                        {subtitle}
                    </div>
                ) : null}
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: titleSize,
                        fontWeight: 800,
                        letterSpacing: -1.5,
                        lineHeight: 1.06,
                        color: palette.ink,
                    }}
                >
                    {title}
                </div>
                {cta ? (
                    <div
                        style={{
                            alignSelf: 'flex-start',
                            marginTop: 10,
                            backgroundColor: palette.accent,
                            color: palette.accentInk,
                            fontFamily: FONT.grotesk,
                            fontSize: 38,
                            fontWeight: 800,
                            padding: '16px 30px',
                            borderRadius: 14,
                        }}
                    >
                        {cta} →
                    </div>
                ) : null}
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

export const VideoCover: React.FC<VideoCoverProps> = (props) => {
    switch (props.template) {
        case 'hook_card':
            return props.hookCard ? <HookCardCover {...props} /> : <BigHeadlineCover {...props} />;
        case 'promo_split':
            return <PromoSplitCover {...props} />;
        case 'big_headline':
        default:
            return <BigHeadlineCover {...props} />;
    }
};

