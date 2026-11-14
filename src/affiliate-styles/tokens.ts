// Token desain bersama untuk hook & subtitle affiliate.
// Aturan dari skill motion-graphics: tanpa neon, tanpa glow, tanpa bayangan berwarna,
// tanpa gradien dekoratif. Semua warna di sini flat.

export const SAFE = {
  top: 160, // area UI atas TikTok (search, following/for you)
  bottom: 440, // caption + tombol produk keranjang kuning
  side: 120, // legacy simetris (tetap dipertahankan untuk kompatibilitas)
  left: 64, // margin kiri bersih
  right: 168, // margin kanan bebas sidebar like/komen/share TikTok & Reels
} as const;

export type PaletteName =
  | 'pastel_rose'
  | 'fresh_mint'
  | 'sale_yellow'
  | 'tech_blue'
  | 'ink_mono'
  | 'editorial'
  | 'pastel'
  | 'flash_sale'
  | 'minimal';

export interface Palette {
  ink: string; // teks gelap / plat gelap
  paper: string; // teks terang / plat terang
  accent: string; // penanda utama (marker, blok kata aktif)
  accentInk: string; // warna teks di atas accent
  alert: string; // coret / harga lama / masalah
}

export const PALETTES: Record<PaletteName, Palette> = {
  editorial: {
    ink: '#0F172A',
    paper: '#FFFFFF',
    accent: '#E2FF32', // Neon Lime / Acid Lime (Hijau Stabilo!)
    accentInk: '#090A0F',
    alert: '#E5484D',
  },
  pastel: {
    ink: '#2D2A32',
    paper: '#FFF8F5',
    accent: '#FF4D6D', // Rose Coral
    accentInk: '#FFFFFF',
    alert: '#D6455D',
  },
  flash_sale: {
    ink: '#141414',
    paper: '#FFFFFF',
    accent: '#FF2E54', // Crimson Red
    accentInk: '#FFFFFF',
    alert: '#E5484D',
  },
  minimal: {
    ink: '#111111',
    paper: '#FFFFFF',
    accent: '#111111',
    accentInk: '#FFFFFF',
    alert: '#DC2626',
  },
  pastel_rose: {
    ink: '#2D2A32',
    paper: '#FFF8F5',
    accent: '#F2A7BD',
    accentInk: '#2D2A32',
    alert: '#D6455D',
  },
  fresh_mint: {
    ink: '#17302B',
    paper: '#F4FBF7',
    accent: '#8FD6B5',
    accentInk: '#17302B',
    alert: '#D6455D',
  },
  sale_yellow: {
    ink: '#141414',
    paper: '#FFFFFF',
    accent: '#FFD23F',
    accentInk: '#141414',
    alert: '#E5484D',
  },
  tech_blue: {
    ink: '#0F1B2D',
    paper: '#F3F6FA',
    accent: '#3D6DF2',
    accentInk: '#FFFFFF',
    alert: '#E5484D',
  },
  ink_mono: {
    ink: '#1A1A1A',
    paper: '#F6F6F4',
    accent: '#E8E3D5',
    accentInk: '#1A1A1A',
    alert: '#C8372D',
  },
};

import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadPlayfairDisplay } from '@remotion/google-fonts/PlayfairDisplay';

const poppins = loadPoppins('normal', {
  weights: ['500', '600', '700', '800', '900'],
  subsets: ['latin'],
});

const playfair = loadPlayfairDisplay('italic', {
  weights: ['500', '600', '700'],
  subsets: ['latin'],
});

// Pastikan font ini di-load di project Anda (mis. @remotion/google-fonts).
// Jika tidak, fallback sistem tetap dipakai.
export const FONT = {
  display: `${poppins.fontFamily}, 'Poppins', 'Inter', 'Helvetica Neue', Arial, sans-serif`,
  serif: `${playfair.fontFamily}, 'Playfair Display', Georgia, 'Times New Roman', serif`,
} as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
