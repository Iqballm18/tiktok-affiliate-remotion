import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {FONT, Palette, SAFE} from './tokens';

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
  | 'mask_wipe';

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const useIn = (delay = 0, damping = 14, stiffness = 150) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping, stiffness, mass: 0.8},
  });
};

const useExit = (durationInFrames: number, exitFrames = 8) => {
  const frame = useCurrentFrame();
  const t = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [0, 1],
    CLAMP,
  );
  return {opacity: 1 - t, y: -28 * t};
};

const shake = (frame: number, delay: number, amp = 9) => {
  const f = frame - delay;
  if (f < 0 || f > 7) return 0;
  return Math.sin(f * 2.4) * amp * (1 - f / 7);
};

const Frame: React.FC<{
  durationInFrames: number;
  align?: 'flex-start' | 'center';
  children: React.ReactNode;
}> = ({durationInFrames, align = 'flex-start', children}) => {
  const exit = useExit(durationInFrames);
  return (
    <AbsoluteFill
      style={{
        padding: `${SAFE.top}px ${SAFE.side}px 0 ${SAFE.side}px`,
        alignItems: align,
        opacity: exit.opacity,
        transform: `translateY(${exit.y}px)`,
        fontFamily: FONT.display,
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
  const card = useIn(0);
  const hl = useIn(10);
  const marker = interpolate(frame, [18, 38], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
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
          <div style={{fontSize: 22, fontWeight: 700, opacity: 0.7, marginBottom: 8}}>
            {badge}
          </div>
        ) : null}
        <div style={{fontSize: 38, fontWeight: 600, lineHeight: 1.22}}>{line1}</div>
        <div
          style={{
            marginTop: 10,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.15,
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
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const a = useIn(0, 10, 230);
  const b = useIn(9, 10, 230);

  const slam = (p: number, dx: number, rot: number) => ({
    opacity: Math.min(1, p * 3),
    transform: `translate(${dx}px, ${(1 - p) * -90}px) scale(${1 + (1 - p) * 0.3}) rotate(${rot}deg)`,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          ...slam(a, shake(frame, 0), 0),
          background: palette.ink,
          color: palette.paper,
          fontSize: 42,
          fontWeight: 800,
          lineHeight: 1.15,
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
          ...slam(b, shake(frame, 9), -1.5),
          background: palette.accent,
          color: palette.accentInk,
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.1,
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
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const first = useIn(0);
  const second = useIn(36, 11, 190);
  const strike = interpolate(frame, [20, 32], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    ...CLAMP,
  });
  const dim = interpolate(frame, [34, 46], [0, 1], CLAMP);

  return (
    <Frame durationInFrames={durationInFrames}>
      <div
        style={{
          position: 'relative',
          background: palette.paper,
          color: palette.ink,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.2,
          padding: '16px 24px',
          borderRadius: 14,
          maxWidth: '100%',
          opacity: Math.min(1, first * 2) * (1 - 0.45 * dim),
          transform: `translateX(${(1 - first) * -80}px) scale(${1 - 0.06 * dim})`,
          transformOrigin: 'left center',
        }}
      >
        {line1}
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: '50%',
            height: 6,
            marginTop: -3,
            background: palette.alert,
            borderRadius: 4,
            transformOrigin: 'left center',
            transform: `scaleX(${strike}) rotate(-1deg)`,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          background: palette.accent,
          color: palette.accentInk,
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1.1,
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
  const p = useIn(0, 18, 110);
  const sticker = useIn(14, 9, 200);
  const underline = interpolate(frame, [22, 42], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });
  const push = 1 + frame * 0.0006;

  return (
    <Frame durationInFrames={durationInFrames}>
      <div style={{position: 'relative', maxWidth: '100%', paddingTop: badge ? 20 : 0}}>
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
            background: palette.paper,
            color: palette.ink,
            padding: '26px 30px 26px',
            borderRadius: 18,
            opacity: Math.min(1, p * 1.6),
            filter: `blur(${(1 - Math.min(1, p)) * 14}px)`,
            transform: `perspective(1400px) rotateX(${(1 - p) * 16}deg) rotateY(${-5 + (1 - p) * -10}deg) scale(${push})`,
            transformOrigin: 'left center',
          }}
        >
          <div style={{fontSize: 38, fontWeight: 600, lineHeight: 1.22}}>{line1}</div>
          <div style={{marginTop: 10, fontSize: 52, fontWeight: 900, lineHeight: 1.15}}>
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
  palette,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const rise1 = useIn(0, 20, 120);
  const rise2 = useIn(8, 20, 120);
  const wipe = interpolate(frame, [12, 30], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CLAMP,
  });

  return (
    <Frame durationInFrames={durationInFrames}>
      <div style={{overflow: 'hidden', borderRadius: 8, maxWidth: '100%'}}>
        <div
          style={{
            background: palette.ink,
            color: palette.paper,
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.2,
            padding: '14px 22px',
            transform: `translateY(${(1 - rise1) * 105}%)`,
          }}
        >
          {line1}
        </div>
      </div>
      <div style={{overflow: 'hidden', borderRadius: 8, marginTop: 8, maxWidth: '100%'}}>
        <div
          style={{
            background: palette.accent,
            color: palette.accentInk,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.1,
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

export const HookStyles: Record<HookStyleName, React.FC<HookProps>> = {
  marker_highlight: MarkerHighlightHook,
  stack_slam: StackSlamHook,
  struck_swap: StruckSwapHook,
  tilt_card: TiltCardHook,
  mask_wipe: MaskWipeHook,
};

export const AffiliateHook: React.FC<HookProps & {variant: HookStyleName}> = ({
  variant,
  ...props
}) => {
  const Component = HookStyles[variant] ?? MarkerHighlightHook;
  return <Component {...props} />;
};
