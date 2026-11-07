import type {HookStyleName} from './hooks';
import type {SubtitleStyleName} from './subtitles';
import type {PaletteName} from './tokens';

// Dipakai Web Studio untuk mengisi dropdown, dan prompt Gemini untuk memilih gaya.

export const HOOK_STYLE_INFO: Record<HookStyleName, {label: string; bestFor: string}> = {
  marker_highlight: {label: 'Marker Highlight', bestFor: 'Skincare, bumil/busui, rumah tangga'},
  stack_slam: {label: 'Stack Slam', bestFor: 'Flash sale, produk viral, promo'},
  struck_swap: {label: 'Struck Swap (coret lalu ganti)', bestFor: 'Problem-solution, sebelum/sesudah'},
  tilt_card: {label: 'Tilt Card', bestFor: 'Review jujur, vitamin, rekomendasi'},
  mask_wipe: {label: 'Mask Wipe', bestFor: 'Gadget, fashion, lifestyle'},
};

export const SUBTITLE_STYLE_INFO: Record<SubtitleStyleName, {label: string; bestFor: string}> = {
  karaoke_block: {label: 'Karaoke Block', bestFor: 'Default aman untuk semua footage'},
  pop_scale: {label: 'Pop Scale (satu kata)', bestFor: 'Voiceover cepat, produk viral'},
  highlighter_bar: {label: 'Highlighter Bar', bestFor: 'Edukatif, skincare, penjelasan'},
  fill_sweep: {label: 'Fill Sweep', bestFor: 'Narasi tenang, storytelling'},
  typewriter_band: {label: 'Typewriter Band', bestFor: 'Premium, fashion, parfum'},
  sticker_label: {label: 'Sticker Label', bestFor: 'Gadget, review santai'},
};

export interface StylePreset {
  palette: PaletteName;
  hookStyle: HookStyleName;
  subtitleStyle: SubtitleStyleName;
}

// Titik awal per kategori. Semua tetap bisa ditimpa di JSON produk.
export const PRESETS: Record<string, StylePreset> = {
  beauty_skincare: {palette: 'pastel_rose', hookStyle: 'marker_highlight', subtitleStyle: 'highlighter_bar'},
  health_supplement: {palette: 'fresh_mint', hookStyle: 'tilt_card', subtitleStyle: 'karaoke_block'},
  flash_sale_viral: {palette: 'sale_yellow', hookStyle: 'stack_slam', subtitleStyle: 'pop_scale'},
  problem_solution: {palette: 'ink_mono', hookStyle: 'struck_swap', subtitleStyle: 'fill_sweep'},
  gadget_tech: {palette: 'tech_blue', hookStyle: 'mask_wipe', subtitleStyle: 'sticker_label'},
  fashion_lifestyle: {palette: 'pastel_rose', hookStyle: 'mask_wipe', subtitleStyle: 'typewriter_band'},
};

export const DEFAULT_PRESET: StylePreset = PRESETS.beauty_skincare;
