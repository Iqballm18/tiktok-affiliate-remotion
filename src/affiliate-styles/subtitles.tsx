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
}

export type SubtitleStyleName =
  | 'karaoke_block'
  | 'pop_scale'
  | 'highlighter_bar'
  | 'fill_sweep'
  | 'typewriter_band'
  | 'sticker_label';

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
    const hideAt = next ? Math.min(c.end + 0.35, next.start) : c.end + 0.35;
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
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: bottom,
      paddingLeft: SAFE.side,
      paddingRight: SAFE.side,
      fontFamily: FONT.display,
    }}
  >
    {children}
  </AbsoluteFill>
);

const Row: React.FC<{children: React.ReactNode; gap?: string}> = ({children, gap = '6px 14px'}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap, maxWidth: '100%'}}>
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
  fontSize = 76,
  bottom = SAFE.bottom,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  return (
    <Layer bottom={bottom}>
      <Row>
        {s.chunk.words.map((w, i) => {
          const active = i === s.wordIndex;
          const p = active ? Math.min(1.15, wordSpring(s, w)) : 0;
          return (
            <span
              key={i}
              style={{
                fontSize,
                fontWeight: 900,
                lineHeight: 1.15,
                textTransform: uppercase ? 'uppercase' : 'none',
                padding: '0 16px',
                borderRadius: 16,
                color: active ? palette.accentInk : palette.paper,
                background: active ? palette.accent : 'transparent',
                transform: active ? `scale(${1 + 0.08 * p}) rotate(${-2 * p}deg)` : 'none',
                ...(active ? {} : outline(fontSize * 0.11, palette.ink)),
              }}
            >
              {w.text}
            </span>
          );
        })}
      </Row>
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
  fontSize = 150,
  bottom = SAFE.bottom + 40,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  const wi = Math.max(0, s.wordIndex);
  const w = s.chunk.words[wi];
  const p = wordSpring(s, w, 9, 230);
  const flip = (s.chunk.index + wi) % 2 === 0;
  return (
    <Layer bottom={bottom}>
      <div
        key={`${s.chunk.index}-${wi}`}
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          textAlign: 'center',
          textTransform: uppercase ? 'uppercase' : 'none',
          color: flip ? palette.paper : palette.accent,
          ...outline(fontSize * 0.1, palette.ink),
          transform: `scale(${0.55 + 0.45 * p}) rotate(${flip ? -3 : 3}deg)`,
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
  fontSize = 64,
  bottom = SAFE.bottom,
  maxWords = 4,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          background: withAlpha(palette.ink, 0.9),
          borderRadius: 26,
          padding: '22px 34px',
          maxWidth: '100%',
        }}
      >
        <Row gap="4px 12px">
          {s.chunk.words.map((w, i) => {
            const active = i === s.wordIndex;
            const p = active ? Math.min(1, wordSpring(s, w, 16, 240)) : i < s.wordIndex ? 1 : 0;
            return (
              <span
                key={i}
                style={{
                  fontSize,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textTransform: uppercase ? 'uppercase' : 'none',
                  padding: '0 10px',
                  borderRadius: 8,
                  color: active ? palette.accentInk : palette.paper,
                  opacity: i > s.wordIndex ? 0.6 : 1,
                  backgroundImage: `linear-gradient(${palette.accent}, ${palette.accent})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${active ? p * 100 : 0}% 100%`,
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
/* 4. FILL SWEEP                                                       */
/* Karaoke sungguhan: warna mengisi tiap kata mengikuti durasi ucap.   */
/* Cocok untuk narasi tenang dan storytelling.                         */
/* ------------------------------------------------------------------ */
export const FillSweepSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 72,
  bottom = SAFE.bottom,
  maxWords = 3,
  uppercase = true,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
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
    </Layer>
  );
};

/* ------------------------------------------------------------------ */
/* 5. TYPEWRITER BAND                                                  */
/* Pita gelap tipis + serif miring; kata muncul saat diucapkan.        */
/* Nuansa editorial/premium. Cocok untuk fashion, parfum, lifestyle.   */
/* ------------------------------------------------------------------ */
export const TypewriterBandSubtitle: React.FC<SubtitleProps> = ({
  words,
  palette,
  fontSize = 62,
  bottom = SAFE.bottom,
  maxWords = 5,
  uppercase = false,
}) => {
  const s = useSubtitleState(words, maxWords);
  if (!s) return null;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', fontFamily: FONT.serif}}>
      <div
        style={{
          marginBottom: bottom - 24,
          background: withAlpha(palette.ink, 0.62),
          padding: `26px ${SAFE.side}px`,
          textAlign: 'center',
        }}
      >
        <Row gap="4px 16px">
          {s.chunk.words.map((w, i) => {
            const shown = i <= s.wordIndex;
            const age = s.frame - Math.round(w.start * s.fps);
            const t = interpolate(age, [0, 5], [0, 1], {
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
                  fontWeight: 500,
                  lineHeight: 1.25,
                  textTransform: uppercase ? 'uppercase' : 'none',
                  color: last ? palette.accent : palette.paper,
                  opacity: shown ? t : 0, // kata disimpan agar layout tidak bergeser
                  transform: `translateY(${(1 - (shown ? t : 0)) * 12}px)`,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </Row>
      </div>
    </AbsoluteFill>
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
  fontSize = 68,
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
  const tilt = s.chunk.index % 2 === 0 ? -1.8 : 1.8;
  return (
    <Layer bottom={bottom}>
      <div
        style={{
          background: palette.paper,
          border: `6px solid ${palette.ink}`,
          borderRadius: 20,
          padding: '16px 32px',
          maxWidth: '100%',
          opacity: Math.min(1, p * 2),
          transform: `translateY(${(1 - p) * 26}px) scale(${0.85 + 0.15 * p}) rotate(${tilt}deg)`,
        }}
      >
        <Row gap="2px 14px">
          {s.chunk.words.map((w, i) => {
            const active = i === s.wordIndex;
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
                  borderRadius: 10,
                  padding: '0 10px',
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

export const SubtitleStyles: Record<SubtitleStyleName, React.FC<SubtitleProps>> = {
  karaoke_block: KaraokeBlockSubtitle,
  pop_scale: PopScaleSubtitle,
  highlighter_bar: HighlighterBarSubtitle,
  fill_sweep: FillSweepSubtitle,
  typewriter_band: TypewriterBandSubtitle,
  sticker_label: StickerLabelSubtitle,
};

export const AffiliateSubtitles: React.FC<SubtitleProps & {variant: SubtitleStyleName}> = ({
  variant,
  ...props
}) => {
  const Component = SubtitleStyles[variant] ?? KaraokeBlockSubtitle;
  return <Component {...props} />;
};
