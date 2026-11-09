import { loadFont as loadBricolage } from '@remotion/google-fonts/BricolageGrotesque';
import { loadFont as loadInstrumentSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';
import { loadFont as loadDMMono } from '@remotion/google-fonts/DMMono';
import { loadFont as loadInstrumentSans } from '@remotion/google-fonts/InstrumentSans';
import { loadFont as loadPlexMono } from '@remotion/google-fonts/IBMPlexMono';

/**
 * Font untuk layout hook baru dan subtitle baru.
 *
 * Kenapa bukan Inter lagi: Inter adalah font bawaan hampir semua template AI. Setiap layout
 * sekarang punya bahan tipografinya sendiri:
 *  - Bricolage Grotesque : grotesk dengan karakter, tebal dan rapat, dipakai hampir di semua layout
 *  - Instrument Serif    : serif condensed, khusus layout quiet_serif
 *  - Caveat              : tulisan tangan, khusus sticky_note
 *  - DM Mono             : struk thermal, khusus receipt
 *  - Instrument Sans / IBM Plex Mono : font dashboard web, untuk penunjuk keranjang CTA
 *
 * Remotion menahan render sampai font selesai dimuat (delayRender dipanggil di dalam loadFont).
 * Butuh: npm i @remotion/google-fonts@4.0.539 --save-exact
 */
const bricolage = loadBricolage('normal', {
    weights: ['500', '600', '700', '800'],
    subsets: ['latin'],
});
const serif = loadInstrumentSerif('italic', { weights: ['400'], subsets: ['latin'] });
const hand = loadCaveat('normal', { weights: ['600', '700'], subsets: ['latin'] });
const mono = loadDMMono('normal', { weights: ['400', '500'], subsets: ['latin'] });

const instrumentSans = loadInstrumentSans('normal', { weights: ['600', '700'], subsets: ['latin'] });
const plexMono = loadPlexMono('normal', { weights: ['500', '600'], subsets: ['latin'] });

export const FONT = {
    grotesk: `${bricolage.fontFamily}, "Helvetica Neue", Arial, sans-serif`,
    serifItalic: `${serif.fontFamily}, Georgia, serif`,
    hand: `${hand.fontFamily}, "Comic Sans MS", cursive`,
    mono: `${mono.fontFamily}, "Courier New", monospace`,
    // Font dashboard web (Instrument Sans + IBM Plex Mono), dipakai penunjuk keranjang CTA.
    ui: `${instrumentSans.fontFamily}, "Helvetica Neue", Arial, sans-serif`,
    plex: `${plexMono.fontFamily}, "Courier New", monospace`,
};
