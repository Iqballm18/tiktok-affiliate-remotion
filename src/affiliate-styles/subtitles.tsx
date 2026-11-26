import React, {useMemo} from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {FONT, Palette, SAFE, withAlpha} from './tokens';

/* ------------------------------------------------------------------ */
/* Tipe & adapter                                                      */
/* ------------------------------------------------------------------ */

export interface SubWord {
  text: string;
  start: number; // detik
  end: number; // detik
}

export interface SubtitleProps {
  words: SubWord[];
  palette: Palette;
  fontSize?: number;
  bottom?: number; // jarak dari bawah layar, default SAFE.bottom
  maxWords?: number; // kata per potongan, default 3
  uppercase?: boolean;
  /** Frame (relatif ke Sequence caption) saat subtitle mulai naik agar tidak menutupi kartu CTA. */
  liftFromFrame?: number;
  /** Seberapa jauh (px) subtitle naik mulai liftFromFrame. */
  liftPx?: number;
}

export type SubtitleStyleName =
  | 'karaoke_block'
  | 'pop_scale'
  | 'highlighter_bar'
  | 'fill_sweep'
  | 'typewriter_band'
  | 'sticker_label'
  | 'glass_pill';

export interface RawCaptionWord {
  text?: string;
  word?: string;
  startMs?: number;
  endMs?: number;
  start?: number;
  end?: number;
  [key: string]: unknown;
}

/**
 * Adapter untuk output Whisper. Menerima:
 *  - { text|word, startMs, endMs }  (@remotion/captions)
 *  - { text|word, start, end }      (detik)
 * Sesuaikan jika format JSON Whisper di project Anda berbeda.
 */
export const toSubWords = (raw?: RawCaptionWord[] | null): SubWord[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((w) => {
      const text = String(w.text ?? w.word ?? '').trim();
      const start = w.startMs != null ? w.startMs / 1000 : Number(w.start ?? 0);
      const end = w.endMs != null ? w.endMs / 1000 : Number(w.end ?? start + 0.3);
      return {text, start, end};
    })
    .filter((w) => w.text.length > 0);
};

/* ------------------------------------------------------------------ */
/* Pemotongan kata & state                                             */
/* ------------------------------------------------------------------ */

interface Chunk {
  words: SubWord[];
  start: number;
  end: number;
  index: number;
}

const chunkWords = (words: SubWord[], maxWords: number, maxChars = 22, maxGap = 0.5): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: SubWord[] = [];
  const flush = () => {
    if (!cur.length) return;
    chunks.push({
      words: cur,
      start: cur[0].start,
      end: cur[cur.length - 1].end,
      index: chunks.length,
    });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (prev && (w.start - prev.end > maxGap || cur.length >= maxWords || chars > maxChars)) {
      flush();
    }
    cur.push(w);
    if (/[.!?,]$/.test(w.text) || i === words.length - 1) flush();
  });
  return chunks;
};

const useSubtitleState = (words: SubWord[], maxWords: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => chunkWords(words, maxWords), [words, maxWords]);

  let ci = -1;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const next = chunks[i + 1];
    const hideAt = next ? Math.min(c.end + 0.65, next.start) : c.end + 0.65;
    if (t >= c.start - 0.04 && t < hideAt) {
      ci = i;
      break;
    }
  }
  if (ci < 0) return null;

  const chunk = chunks[ci];
  let wordIndex = -1;
  chunk.words.forEach((w, i) => {
    if (t >= w.start) wordIndex = i;
  });
  return {chunk, wordIndex, t, frame, fps};
};

const chunkSpring = (s: NonNullable<ReturnType<typeof useSubtitleState>>) =>
  spring({
    frame: Math.max(0, Math.round((s.t - s.chunk.start) * s.fps)),
    fps: s.fps,
    config: {damping: 16, stiffness: 280, mass: 0.5},
  });

const isSpecToken = (text: string): boolean => {
  const clean = text.replace(/[.,!?()"':;-]/g, '').trim();
  if (!clean) return false;
  if (/\d/.test(clean)) return true;
  return /^(rp|gratis|diskon|promo|bpom|halal|ori|original|garansi|viral|terlaris|best)$/i.test(clean);
};

type State = NonNullable<ReturnType<typeof useSubtitleState>>;

const wordSpring = (s: State, w: SubWord, damping = 12, stiffness = 210) =>
  spring({
    frame: s.frame - Math.round(w.start * s.fps),
    fps: s.fps,
    config: {damping, stiffness, mass: 0.7},
  });

const Layer: React.FC<{bottom: number; children: React.ReactNode}> = ({bottom, children}) => (
  <AbsoluteFill
    style={{
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: bottom,
      paddingLeft: SAFE.side,
      paddingRight: SAFE.side,
      fontFamily: FONT.display,
      pointerEvents: 'none',
    }}
  >
    {children}
  </AbsoluteFill>
);

const Row: React.FC<{children: React.ReactNode; gap?: string}> = ({children, gap = '6px 14px'}) => (
  <div style={{boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap, maxWidth: '100%'}}>
    {children}
  </div>
);

const outline = (size: number, color: string): React.CSSProperties => ({
  WebkitTextStroke: `${size}px ${color}`,
  paintOrder: 'stroke fill',
});

/* ------------------------------------------------------------------ */
/* 1. KARAOKE BLOCK                                                    */
/* Teks putih ber-outline, kata aktif jadi blok warna solid.           */
/* Aman dibaca di footage apa pun. Pilihan default.                    */
/* ------------------------------------------------------------------ */
export const KaraokeBlockSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 50,
  bottom = SAFE.bottom,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const cIn = chunkSpring(s);
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          transform: `translateY(${(1 - cIn) * 10}px) scale(${0.96 + 0.04 * cIn})`,
          opacity: Math.min(1, cIn * 1.35),
        }}
      >
        <Row>
          {s.chunk.words.map((w, i) => {
            const active = i === s.wordIndex;
            const spec = !active && isSpecToken(w.text);
            const p = active ? Math.min(1.15, wordSpring(s, w)) : 0;
            return (
              <span
                key={i}
                style={{
                  fontSize,
                  fontWeight: 900,
                  lineHeight: 1.15,
                  textTransform: uppercase ? 'uppercase' : 'none',
                  padding: '2px 12px',
                  borderRadius: 10,
                  color: active ? palette.accentInk : spec ? palette.accent : palette.paper,
                  background: active ? palette.accent : 'transparent',
                  textDecoration: spec ? 'underline' : 'none',
                  textDecorationThickness: spec ? '3px' : undefined,
                  textUnderlineOffset: spec ? '5px' : undefined,
                  transform: active ? `scale(${1 + 0.08 * p}) rotate(${-2 * p}deg)` : 'none',
                  ...(active ? {} : outline(fontSize * 0.11, palette.ink)),
                }}
              >
                {w.text}
              </span>
            );
          })}
        </Row>
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 2. POP SCALE                                                        */
/* Satu kata besar, memantul tiap kata baru. Ritme cepat, retensi      */
/* tinggi. Cocok untuk voiceover cepat dan produk viral.               */
/* ------------------------------------------------------------------ */
export const PopScaleSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 76,
  bottom = SAFE.bottom + 36,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s || s.wordIndex < 0) return null;
  const wi = s.wordIndex;
  const w = s.chunk.words[wi];
  const p = wordSpring(s, w, 12, 240);
  const flip = (s.chunk.index + wi) % 2 === 0;
  const clampedP = Math.min(1, Math.max(0, p));
  return (
    <Layer bottom={bottom}>
      <div
        key={`${s.chunk.index}-${wi}`}
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1.05,
          textAlign: 'center',
          maxWidth: '100%',
          wordBreak: 'break-word',
          textTransform: uppercase ? 'uppercase' : 'none',
          color: flip ? palette.paper : palette.accent,
          ...outline(fontSize * 0.1, palette.ink),
          filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45))',
          opacity: Math.min(1, clampedP * 2.4),
          transform: `scale(${0.74 + 0.26 * p}) rotate(${(1 - clampedP) * (flip ? -4 : 4)}deg)`,
        }}
      >
        {w.text}
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 3. HIGHLIGHTER BAR                                                  */
/* Plat gelap rata; kata aktif ditandai stabilo yang menyapu.          */
/* Bersih dan terbaca. Cocok untuk skincare, edukatif.                 */
/* ------------------------------------------------------------------ */
export const HighlighterBarSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 44,
  bottom = SAFE.bottom,
  maxWords = 4,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const cIn = chunkSpring(s);
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          background: withAlpha(palette.ink, 0.92),
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
          borderRadius: 16,
          padding: '14px 22px',
          maxWidth: '100%',
          transform: `translateY(${(1 - cIn) * 10}px) scale(${0.96 + 0.04 * cIn})`,
          opacity: Math.min(1, cIn * 1.35),
        }}
      >
        <Row gap="4px 8px">
          {s.chunk.words.map((w, i) => {
            const active = i === s.wordIndex;
            const spec = !active && isSpecToken(w.text);
            const p = active ? Math.min(1, wordSpring(s, w, 16, 240)) : i < s.wordIndex ? 1 : 0;
            const wordBaseStyle: React.CSSProperties = {
              fontSize,
              fontWeight: 800,
              lineHeight: 1.2,
              textTransform: uppercase ? 'uppercase' : 'none',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            };
            return (
              <span
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  opacity: i > s.wordIndex ? 0.62 : 1,
                }}
              >
                <span
                  style={{
                    ...wordBaseStyle,
                    color: spec ? palette.accent : palette.paper,
                    textDecoration: spec ? 'underline' : 'none',
                    textDecorationThickness: spec ? '3px' : undefined,
                    textUnderlineOffset: spec ? '4px' : undefined,
                    display: 'inline-block',
                  }}
                >
                  {w.text}
                </span>
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${p * 100}%`,
                      overflow: 'hidden',
                      borderRadius: 6,
                      background: palette.accent,
                    }}
                  >
                    <span style={{...wordBaseStyle, color: palette.accentInk, display: 'inline-block'}}>
                      {w.text}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </Row>
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 4. FILL SWEEP                                                       */
/* Karaoke sungguhan: warna mengisi tiap kata mengikuti durasi ucap.   */
/* Cocok untuk narasi tenang dan storytelling.                         */
/* ------------------------------------------------------------------ */
export const FillSweepSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 50,
  bottom = SAFE.bottom,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const cIn = chunkSpring(s);
  const base: React.CSSProperties = {
    fontSize,
    fontWeight: 900,
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    textTransform: uppercase ? 'uppercase' : 'none',
    ...outline(fontSize * 0.11, palette.ink),
  };
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.38))',
          transform: `translateY(${(1 - cIn) * 10}px) scale(${0.96 + 0.04 * cIn})`,
          opacity: Math.min(1, cIn * 1.35),
        }}
      >
        <Row gap="6px 18px">
          {s.chunk.words.map((w, i) => {
            const dur = Math.max(w.end - w.start, 0.14);
            const progress = interpolate((s.t - w.start) / dur, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span key={i} style={{position: 'relative', display: 'inline-block'}}>
                <span style={{...base, color: palette.paper}}>{w.text}</span>
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `${progress * 100}%`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{...base, color: palette.accent}}>{w.text}</span>
                </span>
              </span>
            );
          })}
        </Row>
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 5. TYPEWRITER BAND                                                  */
/* Pita gelap mengambang di safe zone + serif miring editorial.        */
/* Nuansa editorial/premium. Cocok untuk fashion, parfum, lifestyle.   */
/* ------------------------------------------------------------------ */
export const TypewriterBandSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 46,
  bottom = SAFE.bottom,
  maxWords = 4,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const fadeFrames = Math.max(4, Math.round(0.14 * s.fps));
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          boxSizing: 'border-box',
          maxWidth: '100%',
          background: withAlpha(palette.ink, 0.86),
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.34)',
          borderRadius: 12,
          padding: '14px 28px',
          textAlign: 'center',
          fontFamily: FONT.serif,
        }}
      >
        <Row gap="4px 14px">
          {s.chunk.words.map((w, i) => {
            const shown = i <= s.wordIndex;
            const age = s.frame - Math.round(w.start * s.fps);
            const t = interpolate(age, [0, fadeFrames], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const last = i === s.wordIndex;
            return (
              <span
                key={i}
                style={{
                  fontSize,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  textTransform: uppercase ? 'uppercase' : 'none',
                  color: last ? palette.accent : palette.paper,
                  opacity: shown ? t : 0, // kata disimpan agar layout tidak bergeser
                  transform: `translateY(${(1 - (shown ? t : 0)) * 10}px)`,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </Row>
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 6. STICKER LABEL                                                    */
/* Label kertas bergaris tebal, miring bergantian tiap potongan.       */
/* Kesan "ditempel tangan". Cocok untuk gadget & review santai.        */
/* ------------------------------------------------------------------ */
export const StickerLabelSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 46,
  bottom = SAFE.bottom,
  maxWords = 3,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const p = spring({
    frame: s.frame - Math.round(s.chunk.start * s.fps),
    fps: s.fps,
    config: {damping: 12, stiffness: 220, mass: 0.7},
  });
  const tilt = s.chunk.index % 2 === 0 ? -1.6 : 1.6;
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          background: palette.paper,
          border: `3.5px solid ${palette.ink}`,
          boxShadow: '6px 6px 0 rgba(0, 0, 0, 0.78), 0 12px 24px rgba(0, 0, 0, 0.26)',
          borderRadius: 14,
          padding: '10px 20px',
          maxWidth: '100%',
          opacity: Math.min(1, p * 2),
          transform: `translateY(${(1 - p) * 24}px) scale(${0.86 + 0.14 * p}) rotate(${tilt}deg)`,
        }}
      >
        <Row gap="2px 8px">
          {s.chunk.words.map((w, i) => {
            const active = i === s.wordIndex;
            const spec = !active && isSpecToken(w.text);
            return (
              <span
                key={i}
                style={{
                  fontSize,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  textTransform: uppercase ? 'uppercase' : 'none',
                  color: active ? palette.accentInk : palette.ink,
                  background: active ? palette.accent : 'transparent',
                  textDecoration: spec ? 'underline' : 'none',
                  textDecorationThickness: spec ? '3px' : undefined,
                  textUnderlineOffset: spec ? '4px' : undefined,
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
              >
                {w.text}
              </span>
            );
          })}
        </Row>
      </div>
    </Layer>
  );
};

/* ------------------------------------------------------------------ */

/* ============================================================================
 * 7. GLASS PILL — kapsul kaca buram (frosted glass) + active word pill
 *    Cocok untuk: kuliner, hampers, lifestyle estetik, ASMR.
 * ==========================================================================*/
export const GlassPillSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  bottom = SAFE.bottom,
  fontSize = 44,
  maxWords = 4,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const cIn = chunkSpring(s);

  return (
    <Layer bottom={bottom}>
      <div
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px 4px',
          maxWidth: '100%',
          padding: '12px 20px',
          borderRadius: 999,
          backgroundColor: 'rgba(16, 14, 12, 0.76)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.24)',
          boxShadow: '0 14px 34px rgba(0, 0, 0, 0.34)',
          transform: `translateY(${(1 - cIn) * 12}px) scale(${0.95 + 0.05 * cIn})`,
          opacity: Math.min(1, cIn * 1.35),
        }}
      >
        {s.chunk.words.map((w, i) => {
          const active = i === s.wordIndex;
          const passed = i < s.wordIndex;
          const spec = !active && isSpecToken(w.text);
          const p = active ? Math.min(1.08, wordSpring(s, w, 15, 250)) : 0;
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                fontFamily: FONT.display,
                fontSize,
                fontWeight: 800,
                lineHeight: 1.15,
                textTransform: uppercase ? 'uppercase' : 'none',
                padding: '4px 12px',
                borderRadius: 999,
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: palette.accent,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.24)',
                    opacity: Math.min(1, p * 2.2),
                    transform: `scale(${0.86 + 0.14 * Math.min(1, p)})`,
                  }}
                />
              )}
              <span
                style={{
                  position: 'relative',
                  color: active
                    ? palette.accentInk
                    : spec
                    ? palette.accent
                    : passed
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.72)',
                  textDecoration: spec ? 'underline' : 'none',
                  textDecorationThickness: spec ? '3px' : undefined,
                  textUnderlineOffset: spec ? '4px' : undefined,
                }}
              >
                {w.text}
              </span>
            </span>
          );
        })}
      </div>
    </Layer>
  );
};

export const SubtitleStyles: Record<SubtitleStyleName, React.FC<SubtitleProps>> = {
  karaoke_block: KaraokeBlockSubtitle,
  pop_scale: PopScaleSubtitle,
  highlighter_bar: HighlighterBarSubtitle,
  fill_sweep: FillSweepSubtitle,
  typewriter_band: TypewriterBandSubtitle,
  sticker_label: StickerLabelSubtitle,
  glass_pill: GlassPillSubtitle,
};

export const AffiliateSubtitles: React.FC<SubtitleProps & {variant: SubtitleStyleName}> = ({
  variant,
  bottom,
  liftFromFrame,
  liftPx = 0,
  ...props
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const Component = SubtitleStyles[variant] ?? KaraokeBlockSubtitle;
  const baseBottom = bottom ?? (variant === 'pop_scale' ? SAFE.bottom + 40 : SAFE.bottom);
  const extraBottom =
    liftFromFrame !== undefined && liftPx > 0
      ? interpolate(
          frame,
          [liftFromFrame - Math.round(0.12 * fps), liftFromFrame + Math.round(0.22 * fps)],
          [0, liftPx],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        )
      : 0;
  return <Component {...props} bottom={baseBottom + extraBottom} />;
};
