import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {AffiliateHook, HookStyleName} from './hooks';
import {AffiliateSubtitles, SubtitleStyleName, SubWord} from './subtitles';
import {FONT, PALETTES, PaletteName} from './tokens';

// Pratinjau semua gaya berurutan di Remotion Studio (npm run dev).
// Latar abu flat menggantikan footage; ganti dengan <OffthreadVideo> jika ingin uji di footage asli.

export const HOOK_FRAMES = 90;
export const SUB_FRAMES = 150;

const HOOKS: {variant: HookStyleName; palette: PaletteName}[] = [
  {variant: 'marker_highlight', palette: 'pastel_rose'},
  {variant: 'stack_slam', palette: 'sale_yellow'},
  {variant: 'struck_swap', palette: 'ink_mono'},
  {variant: 'tilt_card', palette: 'fresh_mint'},
  {variant: 'mask_wipe', palette: 'tech_blue'},
];

const SUBS: {variant: SubtitleStyleName; palette: PaletteName}[] = [
  {variant: 'karaoke_block', palette: 'fresh_mint'},
  {variant: 'pop_scale', palette: 'sale_yellow'},
  {variant: 'highlighter_bar', palette: 'pastel_rose'},
  {variant: 'fill_sweep', palette: 'ink_mono'},
  {variant: 'typewriter_band', palette: 'pastel_rose'},
  {variant: 'sticker_label', palette: 'tech_blue'},
];

const SAMPLE =
  'Kulit kusam dan kering bikin nggak pede, coba krim ini selama tujuh hari dan lihat bedanya'.split(' ');
const SAMPLE_WORDS: SubWord[] = SAMPLE.map((text, i) => ({
  text,
  start: 0.2 + i * 0.3,
  end: 0.2 + i * 0.3 + 0.26,
}));

const Backdrop: React.FC<{name: string; children: React.ReactNode}> = ({name, children}) => (
  <AbsoluteFill style={{background: '#4A4A4A'}}>
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 60,
        color: '#CFCFCF',
        fontFamily: FONT.display,
        fontSize: 30,
      }}
    >
      {name}
    </div>
    {children}
  </AbsoluteFill>
);

export const StyleGallery: React.FC = () => (
  <Series>
    {HOOKS.map(({variant, palette}) => (
      <Series.Sequence key={variant} durationInFrames={HOOK_FRAMES + 20}>
        <Backdrop name={`hook: ${variant}`}>
          <AffiliateHook
            variant={variant}
            palette={PALETTES[palette]}
            badge="Pilihan bumil"
            line1="Lagi cari krim yang nggak bikin kulit makin kering?"
            highlight="Ini jawabannya!"
            durationInFrames={HOOK_FRAMES}
          />
        </Backdrop>
      </Series.Sequence>
    ))}
    {SUBS.map(({variant, palette}) => (
      <Series.Sequence key={variant} durationInFrames={SUB_FRAMES}>
        <Backdrop name={`subtitle: ${variant}`}>
          <AffiliateSubtitles
            variant={variant}
            palette={PALETTES[palette]}
            words={SAMPLE_WORDS}
          />
        </Backdrop>
      </Series.Sequence>
    ))}
  </Series>
);

export const GALLERY_DURATION = HOOKS.length * (HOOK_FRAMES + 20) + SUBS.length * SUB_FRAMES;
