/**
 * Generator SFX tambahan untuk transisi & UI (sintesis murni, tanpa aset berhak cipta).
 *
 * Terpisah dari generate_viral_sfx.mjs supaya 14 WAV lama tidak ter-generate ulang.
 * Memakai RNG ber-seed sehingga hasilnya identik setiap dijalankan.
 *
 * Jalankan: node scripts/generate_transition_sfx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/sfx');
fs.mkdirSync(outDir, { recursive: true });

const SR = 44100;

// RNG deterministik (mulberry32)
function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function wavBuffer(samples) {
    const dataSize = samples.length * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SR, 24);
    buf.writeUInt32LE(SR * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    return buf;
}

// Normalisasi puncak + fade pendek di tepi agar tidak ada klik saat dipotong Sequence.
function finalize(samples, { peak = 0.9, fadeIn = 0.002, fadeOut = 0.01 } = {}) {
    let max = 0;
    for (const s of samples) max = Math.max(max, Math.abs(s));
    const gain = max > 0 ? peak / max : 1;
    const fi = Math.floor(fadeIn * SR);
    const fo = Math.floor(fadeOut * SR);
    for (let i = 0; i < samples.length; i++) {
        let g = gain;
        if (i < fi) g *= i / fi;
        if (i > samples.length - fo) g *= (samples.length - i) / fo;
        samples[i] *= g;
    }
    return samples;
}

// 1. boom-sub: dentuman bass sub untuk zoom punch / flash cut (low-end "thump")
function genBoomSub() {
    const dur = 0.7;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(101);
    let lp = 0;
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 38 + 95 * Math.exp(-t * 14); // 133Hz -> 38Hz
        phase += (2 * Math.PI * f) / SR;
        const body = Math.sin(phase) * Math.exp(-t * 5.2);
        lp += 0.12 * ((rng() * 2 - 1) - lp);
        const knock = lp * Math.exp(-t * 60) * 1.4;
        out[i] = body * 0.95 + knock * 0.5;
    }
    return finalize(out, { fadeIn: 0.001, fadeOut: 0.04 });
}

// 2. glitch: stutter digital berbunyi bitcrush untuk transisi tech/glitch
function genGlitch() {
    const dur = 0.32;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(202);
    let i = 0;
    while (i < out.length) {
        const segLen = Math.floor((0.012 + rng() * 0.03) * SR);
        const gate = rng() > 0.25 ? 1 : 0;
        const freq = 180 + rng() * 2600;
        const noiseMix = rng() * 0.6;
        const crush = 4 + Math.floor(rng() * 10); // sample-and-hold
        let held = 0;
        for (let k = 0; k < segLen && i < out.length; k++, i++) {
            const t = i / SR;
            if (k % crush === 0) {
                const sq = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
                held = sq * (1 - noiseMix) + (rng() * 2 - 1) * noiseMix;
            }
            const env = Math.sin(Math.PI * (i / out.length)) ** 0.7;
            out[i] = held * gate * env * 0.6;
        }
    }
    return finalize(out, { fadeOut: 0.015 });
}

// 3. reverse-swell: gelombang naik yang puncaknya jatuh tepat di titik cut (reverse cymbal)
function genReverseSwell() {
    const dur = 0.55;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(303);
    let lp = 0;
    let hp = 0;
    let prev = 0;
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const n = t / dur;
        const env = n ** 3;
        const white = rng() * 2 - 1;
        const alpha = 0.04 + 0.5 * n; // cutoff naik
        lp += alpha * (white - lp);
        hp = 0.92 * (hp + lp - prev);
        prev = lp;
        const tone = Math.sin(2 * Math.PI * (300 + 1500 * n * n) * t) * 0.18 * n;
        out[i] = (hp * 1.8 + tone) * env;
    }
    return finalize(out, { fadeIn: 0.01, fadeOut: 0.004 });
}

// 4. swipe-soft: usapan kain/jari lembut untuk push_up & geser halaman
function genSwipeSoft() {
    const dur = 0.28;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(404);
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < out.length; i++) {
        const n = i / out.length;
        const env = Math.sin(Math.PI * n) ** 1.6;
        const alpha = 0.05 + 0.3 * Math.sin(Math.PI * n);
        lp += alpha * ((rng() * 2 - 1) - lp);
        lp2 += 0.25 * (lp - lp2);
        out[i] = (lp - lp2) * 4.5 * env;
    }
    return finalize(out, { peak: 0.8 });
}

// 5. shimmer-up: arpeggio kristal naik (pentatonik) untuk light_leak & kulit glowing
function genShimmerUp() {
    const dur = 0.85;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(505);
    const notes = [1046.5, 1318.5, 1568, 1975.5, 2637, 3136]; // C6 E6 G6 B6 E7 G7
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let s = 0;
        notes.forEach((f, idx) => {
            const start = idx * 0.07;
            if (t >= start) {
                const dt = t - start;
                const env = Math.exp(-dt * 8);
                s += (Math.sin(2 * Math.PI * f * dt) + 0.3 * Math.sin(2 * Math.PI * f * 2 * dt)) * env * (0.35 + idx * 0.05);
            }
        });
        s += (rng() * 2 - 1) * 0.04 * Math.exp(-t * 4) * Math.sin(Math.PI * Math.min(1, t / 0.2));
        out[i] = s;
    }
    return finalize(out, { fadeOut: 0.05 });
}

// 6. tick: klik pendek bernada tinggi (printer thermal struk / teks muncul)
function genTick() {
    const dur = 0.045;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(606);
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const click = (rng() * 2 - 1) * Math.exp(-t * 500) * 0.5;
        const tone = Math.sin(2 * Math.PI * 3300 * t) * Math.exp(-t * 260);
        out[i] = click + tone * 0.7;
    }
    return finalize(out, { fadeIn: 0.0005, fadeOut: 0.005, peak: 0.75 });
}

// 7. notify-ping: dua nada lembut seperti pesan masuk (chat_thread / CTA alternatif)
function genNotifyPing() {
    const dur = 0.55;
    const out = new Float32Array(Math.floor(dur * SR));
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let s = 0;
        const n1 = Math.exp(-t * 9);
        s += (Math.sin(2 * Math.PI * 1568 * t) + 0.25 * Math.sin(2 * Math.PI * 3136 * t)) * n1 * 0.7;
        if (t >= 0.11) {
            const dt = t - 0.11;
            const n2 = Math.exp(-dt * 8);
            s += (Math.sin(2 * Math.PI * 2093 * dt) + 0.25 * Math.sin(2 * Math.PI * 4186 * dt)) * n2 * 0.8;
        }
        out[i] = s;
    }
    return finalize(out, { fadeOut: 0.06 });
}

// 8. paper-flip: kertas dibalik / catatan tempel ditempel (sticky_note, household)
function genPaperFlip() {
    const dur = 0.32;
    const out = new Float32Array(Math.floor(dur * SR));
    const rng = makeRng(808);
    let hp = 0;
    let prev = 0;
    const bursts = [0.0, 0.045, 0.09, 0.16];
    for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let env = 0;
        bursts.forEach((b, idx) => {
            if (t >= b) env += Math.exp(-(t - b) * (38 - idx * 5)) * (0.9 - idx * 0.18);
        });
        const white = rng() * 2 - 1;
        hp = 0.85 * (hp + white - prev);
        prev = white;
        out[i] = hp * env * 0.7;
    }
    return finalize(out, { fadeOut: 0.03, peak: 0.8 });
}

const list = [
    { name: 'boom-sub.wav', gen: genBoomSub },
    { name: 'glitch.wav', gen: genGlitch },
    { name: 'reverse-swell.wav', gen: genReverseSwell },
    { name: 'swipe-soft.wav', gen: genSwipeSoft },
    { name: 'shimmer-up.wav', gen: genShimmerUp },
    { name: 'tick.wav', gen: genTick },
    { name: 'notify-ping.wav', gen: genNotifyPing },
    { name: 'paper-flip.wav', gen: genPaperFlip },
];

for (const item of list) {
    const samples = item.gen();
    const buf = wavBuffer(samples);
    fs.writeFileSync(path.join(outDir, item.name), buf);
    console.log(`✓ ${item.name} (${(samples.length / SR).toFixed(2)}s, ${buf.length} bytes)`);
}
console.log(`\n${list.length} SFX transisi/UI ditulis ke public/sfx/`);
