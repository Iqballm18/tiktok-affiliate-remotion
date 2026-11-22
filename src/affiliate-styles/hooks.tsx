import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT, Palette, SAFE } from './tokens';

export interface HookProps {
  line1: string; // hookLine1
  highlight: string; // hookHighlight
  badge?: string; // badgeText (opsional)
  palette: Palette;
  durationInFrames?: number; // lama hook tampil, default 90
}

export type HookStyleName =
  | 'marker_highlight'
  | 'stack_slam'
  | 'struck_swap'
  | 'tilt_card'
  | 'mask_wipe'
  | 'split_versus'
  | 'floating_tag';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const f30 = (framesAt30: number, fps: number) => Math.max(1, Math.round(framesAt30 * (fps / 30)));

const useIn = (delay = 0, damping = 14, stiffness = 150) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - (delay === 0 ? 0 : f30(delay, fps)),
    fps,
    config: { damping, stiffness, mass: 0.8 },
  });
};

const useExit = (durationInFrames: number, exitFrames = 8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ef = f30(exitFrames, fps);
  const t = interpolate(
    frame,
    [durationInFrames - ef, durationInFrames],
    [0, 1],
    CLAMP,
  );
  return { opacity: 1 - t, y: -28 * t };
};

const shake = (frame: number, delay: number, fps = 30, amp = 9) => {
  const d = delay === 0 ? 0 : f30(delay, fps);
  const span = f30(7, fps);
  const f = frame - d;
  if (f < 0 || f > span) return 0;
  return Math.sin((f / (fps / 30)) * 2.4) * amp * (1 - f / span);
};

const Frame: React.FC<{
  durationInFrames: number;
  align?: 'flex-start' | 'center';
  children: React.ReactNode;
}> = ({ durationInFrames, align = 'flex-start', children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(durationInFrames);
  const idleY = Math.sin(frame / (fps * 0.5)) * 2.5;
  return (
    <AbsoluteFill
      style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        padding: `${SAFE.top}px ${SAFE.right}px 0 ${SAFE.left}px`,
        alignItems: align,
        opacity: exit.opacity,
        transform: `translateY(${exit.y + idleY}px)`,
        fontFamily: FONT.display,
        pointerEvents: 'none',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 1. MARKER HIGHLIGHT                                                 */
/* Kartu kertas; kalimat utama ditandai stabilo yang tergambar.        */
/* Cocok: skincare, bumil/busui, produk rumah tangga                   */
/* ------------------------------------------------------------------ */
export const MarkerHighlightHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = useIn(0);
  const hl = useIn(10);
  const marker = interpolate(frame, [f30(18, fps), f30(38, fps)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          boxSizing: 'border-box',
          background: palette.paper,
          color: palette.ink,
          padding: '24px 32px 28px',
          borderRadius: 20,
          opacity: Math.min(1, card * 2),
          transform: `translateY(${(1 - card) * -50}px) scale(${0.92 + 0.08 * card})`,
          maxWidth: '100%',
        }}
      >
        {badge ? (
          <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.7, marginBottom: 8 }}>
            {badge}
          </div>
        ) : null}
        <div style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.22, wordBreak: 'break-word' }}>{line1}</div>
        <div
          style={{
            marginTop: 10,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.15,
            wordBreak: 'break-word',
            opacity: Math.min(1, hl * 2),
            transform: `translateY(${(1 - hl) * 24}px)`,
          }}
        >
          <span
            style={{
              // Satu warna flat; ini cara menganimasikan lebar stabilo
              // yang tetap benar saat teks turun beberapa baris.
              backgroundImage: `linear-gradient(${palette.accent}, ${palette.accent})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '0 88%',
              backgroundSize: `${marker * 100}% 62%`,
              WebkitBoxDecorationBreak: 'clone',
              boxDecorationBreak: 'clone',
              padding: '0 8px',
              margin: '0 -8px',
            }}
          >
            {highlight}
          </span>
        </div>
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 2. STACK SLAM                                                       */
/* Dua plat menghantam layar bergantian dengan getar singkat.          */
/* Cocok: flash sale, produk viral, promo tanggal kembar               */
/* ------------------------------------------------------------------ */
export const StackSlamHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = useIn(0, 10, 230);
  const b = useIn(9, 10, 230);
  const badgeIn = useIn(14, 12, 200);

  const slam = (p: number, dx: number, rot: number) => ({
    opacity: Math.min(1, p * 3),
    transform: `translate(${dx}px, ${(1 - p) * -90}px) scale(${1 + (1 - p) * 0.3}) rotate(${rot}deg)`,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      {badge ? (
        <div
          style={{
            background: palette.alert,
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            padding: '6px 16px',
            borderRadius: 8,
            marginBottom: 8,
            alignSelf: 'flex-start',
            opacity: Math.min(1, badgeIn * 2),
            transform: `scale(${0.8 + 0.2 * badgeIn}) rotate(-2deg)`,
          }}
        >
          {badge}
        </div>
      ) : null}
      <div
        style={{
          boxSizing: 'border-box',
          ...slam(a, shake(frame, 0, fps), 0),
          background: palette.ink,
          color: palette.paper,
          fontSize: 42,
          fontWeight: 800,
          lineHeight: 1.15,
          wordBreak: 'break-word',
          padding: '14px 22px',
          borderRadius: 12,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        }}
      >
        {line1}
      </div>
      <div
        style={{
          boxSizing: 'border-box',
          ...slam(b, shake(frame, 9, fps), -1.5),
          background: palette.accent,
          color: palette.accentInk,
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.1,
          wordBreak: 'break-word',
          padding: '16px 26px',
          borderRadius: 14,
          marginTop: 8,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        }}
      >
        {highlight}
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 3. STRUCK SWAP                                                      */
/* Masalah dicoret, solusi menggantikannya. Narasi "sebelum/sesudah".  */
/* Cocok: problem-solution (jerawat, bau, boros, ribet)                */
/* ------------------------------------------------------------------ */
export const StruckSwapHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const first = useIn(0);
  const second = useIn(36, 11, 190);
  const strike = interpolate(frame, [f30(20, fps), f30(32, fps)], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    ...CLAMP,
  });
  const dim = interpolate(frame, [f30(34, fps), f30(46, fps)], [0, 1], CLAMP);

  return (
    <Frame durationInFrames={durationInFrames}>
      {badge ? (
        <div
          style={{
            background: palette.ink,
            color: palette.paper,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: 999,
            marginBottom: 8,
            opacity: Math.min(1, first * 2),
          }}
        >
          {badge}
        </div>
      ) : null}
      <div
        style={{
          boxSizing: 'border-box',
          position: 'relative',
          background: palette.paper,
          color: palette.ink,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.24,
          textAlign: 'left',
          wordBreak: 'break-word',
          padding: '16px 24px',
          borderRadius: 14,
          maxWidth: '100%',
          opacity: Math.min(1, first * 2) * (1 - 0.45 * dim),
          transform: `translateX(${(1 - first) * -80}px) scale(${1 - 0.06 * dim})`,
          transformOrigin: 'left center',
        }}
      >
        <span
          style={{
            backgroundImage: `linear-gradient(${palette.alert}, ${palette.alert})`,
            backgroundSize: `${strike * 100}% 5px`,
            backgroundPosition: 'left 56%',
            backgroundRepeat: 'no-repeat',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {line1}
        </span>
      </div>
      <div
        style={{
          boxSizing: 'border-box',
          marginTop: 10,
          background: palette.accent,
          color: palette.accentInk,
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1.1,
          textAlign: 'left',
          wordBreak: 'break-word',
          padding: '18px 28px',
          borderRadius: 16,
          maxWidth: '100%',
          opacity: Math.min(1, second * 3),
          transform: `scale(${0.7 + 0.3 * second}) rotate(${-1.5 * second}deg)`,
          transformOrigin: 'left center',
        }}
      >
        {highlight}
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 4. TILT CARD                                                        */
/* Kartu kertas blur-in dengan tilt 3D halus + stiker badge + push.    */
/* Cocok: review jujur, rekomendasi, vitamin/suplemen                  */
/* ------------------------------------------------------------------ */
export const TiltCardHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = useIn(0, 18, 110);
  const sticker = useIn(14, 9, 200);
  const underline = interpolate(frame, [f30(22, fps), f30(42, fps)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });
  const push = 1 + (frame / (fps / 30)) * 0.0006;

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          position: 'relative',
          maxWidth: '100%',
          boxSizing: 'border-box',
          paddingTop: badge ? 20 : 0,
        }}
      >
        {badge ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 24,
              zIndex: 2,
              background: palette.accent,
              color: palette.accentInk,
              fontSize: 22,
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: 8,
              transform: `scale(${sticker}) rotate(-4deg)`,
            }}
          >
            {badge}
          </div>
        ) : null}
        <div
          style={{
            boxSizing: 'border-box',
            maxWidth: '100%',
            background: palette.paper,
            color: palette.ink,
            padding: '24px 28px 26px',
            borderRadius: 18,
            opacity: Math.min(1, p * 1.6),
            filter: `blur(${(1 - Math.min(1, p)) * 14}px)`,
            transform: `perspective(1400px) rotateX(${(1 - p) * 12}deg) rotateY(${-3 + (1 - p) * -8}deg) scale(${push})`,
            transformOrigin: 'center center',
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.22, wordBreak: 'break-word' }}>
            {line1}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.15,
              wordBreak: 'break-word',
            }}
          >
            <span
              style={{
                backgroundImage: `linear-gradient(${palette.accent}, ${palette.accent})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '0 100%',
                backgroundSize: `${underline * 100}% 22%`,
                WebkitBoxDecorationBreak: 'clone',
                boxDecorationBreak: 'clone',
              }}
            >
              {highlight}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 5. MASK WIPE                                                        */
/* Teks naik dari balik garis potong, plat aksen menyapu dari kiri.    */
/* Cocok: gadget, fashion, lifestyle. Gaya editorial yang tenang.      */
/* ------------------------------------------------------------------ */
export const MaskWipeHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise1 = useIn(0, 20, 120);
  const rise2 = useIn(8, 20, 120);
  const wipe = interpolate(frame, [f30(12, fps), f30(30, fps)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      {badge ? (
        <div
          style={{
            background: palette.paper,
            color: palette.ink,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: 6,
            marginBottom: 8,
            opacity: Math.min(1, rise1 * 2),
            transform: `translateY(${(1 - rise1) * 18}px)`,
          }}
        >
          {badge}
        </div>
      ) : null}
      <div style={{ boxSizing: 'border-box', overflow: 'hidden', borderRadius: 8, maxWidth: '100%' }}>
        <div
          style={{
            boxSizing: 'border-box',
            background: palette.ink,
            color: palette.paper,
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.2,
            wordBreak: 'break-word',
            padding: '14px 22px',
            transform: `translateY(${(1 - rise1) * 105}%)`,
          }}
        >
          {line1}
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', overflow: 'hidden', borderRadius: 8, marginTop: 8, maxWidth: '100%' }}>
        <div
          style={{
            boxSizing: 'border-box',
            background: palette.accent,
            color: palette.accentInk,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.1,
            wordBreak: 'break-word',
            padding: '16px 26px',
            transform: `translateY(${(1 - rise2) * 105}%)`,
            clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
          }}
        >
          {highlight}
        </div>
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 6. SPLIT VERSUS                                                     */
/* Komparasi dua blok kontras: Cara Biasa (❌) vs Solusi Produk (✅).  */
/* Cocok: produk pembersih, alat praktis, problem-solver               */
/* ------------------------------------------------------------------ */
export const SplitVersusHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const topIn = useIn(0, 14, 170);
  const botIn = useIn(12, 12, 200);

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: 18,
          overflow: 'hidden',
          border: `3px solid ${palette.ink}`,
        }}
      >
        {badge ? (
          <div
            style={{
              background: palette.ink,
              color: palette.paper,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              padding: '8px 20px',
            }}
          >
            ⚡ {badge}
          </div>
        ) : null}
        <div
          style={{
            background: palette.paper,
            color: palette.ink,
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: Math.min(1, topIn * 2),
            transform: `translateX(${(1 - topIn) * -40}px)`,
            borderBottom: `2px dashed ${palette.ink}`,
          }}
        >
          <span
            style={{
              background: palette.alert,
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            ✕
          </span>
          <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {line1}
          </span>
        </div>
        <div
          style={{
            background: palette.accent,
            color: palette.accentInk,
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: Math.min(1, botIn * 2.5),
            transform: `scale(${0.92 + 0.08 * botIn})`,
          }}
        >
          <span
            style={{
              background: palette.ink,
              color: palette.paper,
              fontSize: 22,
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            ✓
          </span>
          <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.12, wordBreak: 'break-word' }}>
            {highlight}
          </span>
        </div>
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */
/* 7. FLOATING TAG                                                     */
/* Kartu bersih dengan pita label gantung di sudut + pill highlight.   */
/* Cocok: kuliner, hampers, fashion, produk rumah tangga estetik       */
/* ------------------------------------------------------------------ */
export const FloatingTagHook: React.FC<HookProps> = ({
  line1,
  highlight,
  badge,
  palette,
  durationInFrames = 90,
}) => {
  const card = useIn(0, 14, 160);
  const pill = useIn(10, 12, 200);
  const tag = useIn(6, 10, 220);

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          maxWidth: '100%',
          background: palette.paper,
          color: palette.ink,
          border: `3px solid ${palette.ink}`,
          borderRadius: 20,
          padding: '28px 28px 24px',
          opacity: Math.min(1, card * 2),
          transform: `translateY(${(1 - card) * -36}px) scale(${0.94 + 0.06 * card})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -18,
            right: 22,
            background: palette.alert,
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '5px 16px',
            borderRadius: 999,
            transform: `scale(${tag}) rotate(3deg)`,
          }}
        >
          {badge || '★ REKOMENDASI'}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.22, wordBreak: 'break-word' }}>
          {line1}
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'inline-block',
            background: palette.accent,
            color: palette.accentInk,
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.12,
            padding: '10px 20px',
            borderRadius: 12,
            wordBreak: 'break-word',
            transform: `scale(${0.88 + 0.12 * pill})`,
            transformOrigin: 'left center',
          }}
        >
          {highlight}
        </div>
      </div>
    </Frame>
  );
};

/* ------------------------------------------------------------------ */

export const HookStyles: Record<HookStyleName, React.FC<HookProps>> = {
  marker_highlight: MarkerHighlightHook,
  stack_slam: StackSlamHook,
  struck_swap: StruckSwapHook,
  tilt_card: TiltCardHook,
  mask_wipe: MaskWipeHook,
  split_versus: SplitVersusHook,
  floating_tag: FloatingTagHook,
};

export const AffiliateHook: React.FC<HookProps & { variant: HookStyleName }> = ({
  variant,
  ...props
}) => {
  const Component = HookStyles[variant] ?? MarkerHighlightHook;
  return <Component {...props} />;
};
