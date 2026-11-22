import React from 'react';
import { AbsoluteFill, Freeze, Img, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { ThemeDefinition } from '../theme';
import { Palette } from '../affiliate-styles/tokens';
import { FONT } from '../load-hook-fonts';
import { TikTokIcon, InstagramIcon, ShopeeIcon, parseWatermarkItems } from './FloatingWatermark';

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

export const COVER_TEMPLATES = [
    'hook_card',
    'big_headline',
    'promo_split',
    'studio_poster',
    'magazine_box',
    'diagonal_split',
    'polaroid_review',
    'top_banner_hero',
] as const;
export type CoverTemplate = (typeof COVER_TEMPLATES)[number];

export const resolveCoverTemplate = (raw?: string): CoverTemplate => {
    if (
        raw === 'hook_card' ||
        raw === 'big_headline' ||
        raw === 'promo_split' ||
        raw === 'studio_poster' ||
        raw === 'magazine_box' ||
        raw === 'diagonal_split' ||
        raw === 'polaroid_review' ||
        raw === 'top_banner_hero'
    ) {
        return raw;
    }
    if (raw === 'bold_title') return 'big_headline';
    if (raw === 'clean_minimal') return 'studio_poster';
    return 'hook_card';
};

export type CoverFocusMode = 'auto' | 'center_close' | 'lower_product' | 'upper_face' | 'full';

export const resolveFocusTransform = (focus?: string, splitWindow = false): { zoom: number; objectPosition: string; origin: string } => {
    const mode = (focus || 'auto') as CoverFocusMode;
    if (mode === 'full') {
        return { zoom: 1.02, objectPosition: '50% 50%', origin: '50% 50%' };
    }
    if (mode === 'center_close') {
        return { zoom: splitWindow ? 1.38 : 1.26, objectPosition: '50% 52%', origin: '50% 52%' };
    }
    if (mode === 'lower_product') {
        return { zoom: splitWindow ? 1.34 : 1.22, objectPosition: '50% 70%', origin: '50% 70%' };
    }
    if (mode === 'upper_face') {
        return { zoom: splitWindow ? 1.28 : 1.18, objectPosition: '50% 32%', origin: '50% 32%' };
    }
    // default 'auto': fokus area produk di tengah-bawah sedikit dengan zoom proporsional pada jendela split
    return {
        zoom: splitWindow ? 1.28 : 1.08,
        objectPosition: splitWindow ? '50% 56%' : '50% 50%',
        origin: splitWindow ? '50% 56%' : '50% 50%',
    };
};

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
    focus?: string;
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

const Background: React.FC<{
    bg: CoverBackground;
    theme: ThemeDefinition;
    zoom?: number;
    focus?: string;
    splitWindow?: boolean;
}> = ({ bg, theme, zoom, focus, splitWindow = false }) => {
    const { fps } = useVideoConfig();
    const f = resolveFocusTransform(focus, splitWindow);
    const finalZoom = zoom !== undefined ? zoom * (f.zoom / 1.02) : f.zoom;
    const objPos = bg.kind === 'video' && bg.objectPosition && bg.objectPosition !== 'center'
        ? bg.objectPosition
        : f.objectPosition;

    if (bg.kind === 'image') {
        return (
            <AbsoluteFill style={{ transform: `scale(${finalZoom})`, transformOrigin: f.origin }}>
                <Img
                    src={staticFile(bg.src)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objPos }}
                />
            </AbsoluteFill>
        );
    }
    if (bg.kind === 'video') {
        return (
            <AbsoluteFill style={{ transform: `scale(${finalZoom})`, transformOrigin: f.origin }}>
                <Freeze frame={0}>
                    <OffthreadVideo
                        src={staticFile(bg.src)}
                        startFrom={Math.max(0, Math.round(bg.frameSec * fps))}
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
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

const Watermark: React.FC<{ text?: string }> = ({ text = '@spillbyna | @inanikmatul01' }) => {
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
                            {item.platform === 'shopee' && (
                                <ShopeeIcon size={24} color="#FFFFFF" />
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
const PromoSplitCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, cta, focus, watermark }) => {
    const panelTop = 1010;
    const titleSize = fitSize(title, 100, 66, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.paper }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: panelTop + 40, overflow: 'hidden' }}>
                <Background bg={background} theme={theme} focus={focus} splitWindow />
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

// ------------------------------------------------------------
// 4. STUDIO POSTER: desain grafis mandiri (tanpa potongan video)
//    Jika ada foto produk terpisah (kind: 'image'), foto ditampilkan
//    di dalam bingkai kartu; jika tidak, murni poster tipografi.
// ------------------------------------------------------------
const StudioPosterCover: React.FC<VideoCoverProps> = ({ background, palette, title, subtitle, badge, cta, watermark }) => {
    const hasPhoto = background.kind === 'image';
    const titleSize = fitSize(title, hasPhoto ? 78 : 108, 56, hasPhoto ? 22 : 18);

    return (
        <AbsoluteFill
            style={{
                backgroundColor: palette.ink,
                overflow: 'hidden',
            }}
        >
            {/* Latar tekstur grid tipis + aksen geometris palet */}
            <AbsoluteFill
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
                    backgroundSize: '54px 54px',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: -140,
                    right: -120,
                    width: 520,
                    height: 520,
                    borderRadius: 999,
                    backgroundColor: palette.accent,
                    opacity: 0.16,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: -160,
                    left: -140,
                    width: 560,
                    height: 560,
                    borderRadius: 999,
                    backgroundColor: palette.accent,
                    opacity: 0.10,
                }}
            />

            {/* Kontainer utama dalam zona aman grid IG 4:5 & TikTok 3:4 (y: 300..1600) */}
            <div
                style={{
                    position: 'absolute',
                    left: 84,
                    right: 84,
                    top: GRID_TOP + 24,
                    bottom: 1920 - GRID_BOTTOM + 76,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 28,
                }}
            >
                {badge ? <BadgePill text={badge} palette={palette} /> : null}

                {hasPhoto ? (
                    <div
                        style={{
                            width: '100%',
                            height: 500,
                            borderRadius: 28,
                            overflow: 'hidden',
                            border: `4px solid ${palette.accent}`,
                            backgroundColor: palette.paper,
                            boxShadow: '0 22px 48px rgba(0,0,0,0.45)',
                        }}
                    >
                        <Img
                            src={staticFile(background.src)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                ) : null}

                <div
                    style={{
                        backgroundColor: palette.paper,
                        color: palette.ink,
                        borderRadius: 32,
                        padding: hasPhoto ? '38px 40px' : '52px 44px',
                        boxShadow: '0 24px 54px rgba(0,0,0,0.42)',
                        borderTop: `10px solid ${palette.accent}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: titleSize,
                            fontWeight: 900,
                            letterSpacing: -1.5,
                            lineHeight: 1.08,
                            color: palette.ink,
                            wordBreak: 'break-word',
                        }}
                    >
                        {title}
                    </div>

                    {subtitle ? (
                        <div
                            style={{
                                fontFamily: FONT.grotesk,
                                fontSize: hasPhoto ? 34 : 40,
                                fontWeight: 600,
                                lineHeight: 1.25,
                                color: palette.ink,
                                opacity: 0.78,
                                wordBreak: 'break-word',
                            }}
                        >
                            {subtitle}
                        </div>
                    ) : null}

                    {cta ? (
                        <div
                            style={{
                                alignSelf: 'flex-start',
                                marginTop: 8,
                                backgroundColor: palette.accent,
                                color: palette.accentInk,
                                fontFamily: FONT.grotesk,
                                fontSize: 34,
                                fontWeight: 800,
                                padding: '14px 28px',
                                borderRadius: 14,
                            }}
                        >
                            {cta} →
                        </div>
                    ) : null}
                </div>
            </div>

            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

// ------------------------------------------------------------
// 5. MAGAZINE BOX: halaman katalog kertas dengan bingkai fokus produk
// ------------------------------------------------------------
const MagazineBoxCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, cta, focus, watermark }) => {
    const titleSize = fitSize(title, 86, 56, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.paper }}>
            <div
                style={{
                    position: 'absolute',
                    left: 84,
                    right: 84,
                    top: GRID_TOP + 10,
                    bottom: 1920 - GRID_BOTTOM + 70,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `4px solid ${palette.ink}`, paddingBottom: 18 }}>
                    <span style={{ fontFamily: FONT.grotesk, fontSize: 28, fontWeight: 900, color: palette.ink, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        {badge || 'PILIHAN UTAMA'}
                    </span>
                    <span style={{ fontFamily: FONT.grotesk, fontSize: 24, fontWeight: 700, color: palette.ink, opacity: 0.65 }}>
                        REKOMENDASI
                    </span>
                </div>

                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: 670,
                        borderRadius: 28,
                        overflow: 'hidden',
                        border: `5px solid ${palette.ink}`,
                        backgroundColor: palette.ink,
                    }}
                >
                    <Background bg={background} theme={theme} focus={focus} splitWindow />
                    {cta ? (
                        <div
                            style={{
                                position: 'absolute',
                                right: 24,
                                bottom: 24,
                                backgroundColor: palette.accent,
                                color: palette.accentInk,
                                fontFamily: FONT.grotesk,
                                fontSize: 30,
                                fontWeight: 900,
                                padding: '12px 24px',
                                borderRadius: 999,
                                border: `3px solid ${palette.ink}`,
                            }}
                        >
                            {cta}
                        </div>
                    ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                        style={{
                            fontFamily: FONT.grotesk,
                            fontSize: titleSize,
                            fontWeight: 900,
                            lineHeight: 1.06,
                            letterSpacing: -1.5,
                            color: palette.ink,
                        }}
                    >
                        {title}
                    </div>
                    {subtitle ? (
                        <div style={{ fontFamily: FONT.grotesk, fontSize: 38, fontWeight: 600, lineHeight: 1.22, color: palette.ink, opacity: 0.78 }}>
                            {subtitle}
                        </div>
                    ) : null}
                </div>
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

// ------------------------------------------------------------
// 6. DIAGONAL SPLIT: foto produk di atas + potongan diagonal tajam
// ------------------------------------------------------------
const DiagonalSplitCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, cta, focus, watermark }) => {
    const titleSize = fitSize(title, 94, 62, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.ink, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1160, overflow: 'hidden' }}>
                <Background bg={background} theme={theme} focus={focus} splitWindow />
            </div>
            <div
                style={{
                    position: 'absolute',
                    left: -120,
                    right: -120,
                    top: 980,
                    height: 1100,
                    backgroundColor: palette.ink,
                    borderTop: `18px solid ${palette.accent}`,
                    transform: 'rotate(-5deg)',
                }}
            />
            {badge ? (
                <div style={{ position: 'absolute', left: 80, top: GRID_TOP + 20 }}>
                    <BadgePill text={badge} palette={palette} />
                </div>
            ) : null}
            <div
                style={{
                    position: 'absolute',
                    left: 84,
                    right: 84,
                    top: 1055,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                }}
            >
                {subtitle ? (
                    <div style={{ fontFamily: FONT.grotesk, fontSize: 40, fontWeight: 700, color: palette.accent, lineHeight: 1.2 }}>
                        {subtitle}
                    </div>
                ) : null}
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: titleSize,
                        fontWeight: 900,
                        lineHeight: 1.06,
                        letterSpacing: -1.5,
                        color: palette.paper,
                    }}
                >
                    {title}
                </div>
                {cta ? (
                    <div
                        style={{
                            alignSelf: 'flex-start',
                            marginTop: 8,
                            backgroundColor: palette.accent,
                            color: palette.accentInk,
                            fontFamily: FONT.grotesk,
                            fontSize: 34,
                            fontWeight: 800,
                            padding: '14px 28px',
                            borderRadius: 12,
                        }}
                    >
                        {cta}
                    </div>
                ) : null}
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

// ------------------------------------------------------------
// 7. POLAROID REVIEW: bingkai foto polaroid miring + highlight ulasan
// ------------------------------------------------------------
const PolaroidReviewCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, focus, watermark }) => {
    const titleSize = fitSize(title, 82, 54, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.ink, overflow: 'hidden' }}>
            <div
                style={{
                    position: 'absolute',
                    left: 110,
                    right: 110,
                    top: GRID_TOP + 24,
                    backgroundColor: palette.paper,
                    borderRadius: 24,
                    padding: '28px 28px 34px',
                    transform: 'rotate(-2deg)',
                    boxShadow: '0 26px 56px rgba(0,0,0,0.48)',
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: 640, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' }}>
                    <Background bg={background} theme={theme} focus={focus} splitWindow />
                </div>
                <div style={{ marginTop: 20, fontFamily: FONT.grotesk, fontSize: 30, fontWeight: 800, color: palette.ink, textAlign: 'center', letterSpacing: 1 }}>
                    {badge || 'REVIEW JUJUR PRODUK'}
                </div>
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: 84,
                    right: 84,
                    top: 1135,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 18,
                }}
            >
                <div
                    style={{
                        backgroundColor: palette.accent,
                        color: palette.accentInk,
                        fontFamily: FONT.grotesk,
                        fontSize: titleSize,
                        fontWeight: 900,
                        lineHeight: 1.08,
                        padding: '18px 32px',
                        borderRadius: 20,
                    }}
                >
                    {title}
                </div>
                {subtitle ? (
                    <div style={{ fontFamily: FONT.grotesk, fontSize: 38, fontWeight: 600, color: palette.paper, opacity: 0.9, lineHeight: 1.22 }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

// ------------------------------------------------------------
// 8. TOP BANNER HERO: panel judul di atas + visual fokus produk di bawah
// ------------------------------------------------------------
const TopBannerHeroCover: React.FC<VideoCoverProps> = ({ background, theme, palette, title, subtitle, badge, focus, watermark }) => {
    const headerBottom = 860;
    const titleSize = fitSize(title, 90, 60, 20);
    return (
        <AbsoluteFill style={{ backgroundColor: palette.paper }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: headerBottom - 36, bottom: 0, overflow: 'hidden' }}>
                <Background bg={background} theme={theme} focus={focus} splitWindow />
            </div>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    height: headerBottom,
                    backgroundColor: palette.paper,
                    borderBottomLeftRadius: 44,
                    borderBottomRightRadius: 44,
                    borderBottom: `10px solid ${palette.accent}`,
                    padding: `${GRID_TOP + 16}px 80px 36px`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 18,
                    boxShadow: '0 18px 42px rgba(0,0,0,0.32)',
                }}
            >
                {badge ? <BadgePill text={badge} palette={palette} /> : null}
                <div
                    style={{
                        fontFamily: FONT.grotesk,
                        fontSize: titleSize,
                        fontWeight: 900,
                        lineHeight: 1.06,
                        letterSpacing: -1.5,
                        color: palette.ink,
                    }}
                >
                    {title}
                </div>
                {subtitle ? (
                    <div style={{ fontFamily: FONT.grotesk, fontSize: 38, fontWeight: 600, color: palette.ink, opacity: 0.78, lineHeight: 1.2 }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            <Watermark text={watermark} />
        </AbsoluteFill>
    );
};

export const VideoCover: React.FC<VideoCoverProps> = (props) => {
    switch (props.template) {
        case 'studio_poster':
            return <StudioPosterCover {...props} />;
        case 'magazine_box':
            return <MagazineBoxCover {...props} />;
        case 'diagonal_split':
            return <DiagonalSplitCover {...props} />;
        case 'polaroid_review':
            return <PolaroidReviewCover {...props} />;
        case 'top_banner_hero':
            return <TopBannerHeroCover {...props} />;
        case 'hook_card':
            return props.hookCard ? <HookCardCover {...props} /> : <BigHeadlineCover {...props} />;
        case 'promo_split':
            return <PromoSplitCover {...props} />;
        case 'big_headline':
        default:
            return <BigHeadlineCover {...props} />;
    }
};

