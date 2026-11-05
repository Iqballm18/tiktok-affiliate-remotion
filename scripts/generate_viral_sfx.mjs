import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../public/sfx');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function createWavBuffer(samples, sampleRate = 44100) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34);

    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1.0, Math.min(1.0, samples[i]));
        if (s > 0.95) s = 0.95 + (s - 0.95) * 0.2;
        if (s < -0.95) s = -0.95 + (s + 0.95) * 0.2;
        const intVal = Math.round(s * 32767);
        buffer.writeInt16LE(intVal, 44 + i * 2);
    }
    return buffer;
}

const SR = 44100;

// 1. kaching.wav (Cash Register / Keranjang Kuning Checkout Ding + Coin Jingle)
function genKaching() {
    const duration = 0.85;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        let s = 0;

        // Primary Bell Ping (C7 2093Hz + G7 3136Hz)
        if (t >= 0 && t < 0.6) {
            const bellDecay = Math.exp(-t * 8.5);
            const bell = 0.65 * Math.sin(2 * Math.PI * 2093 * t) +
                         0.35 * Math.sin(2 * Math.PI * 3136 * t) +
                         0.15 * Math.sin(2 * Math.PI * 4186 * t);
            s += bell * bellDecay;
        }

        // Mechanical Latch click at 0.03s
        if (t >= 0.03 && t < 0.06) {
            const dt = t - 0.03;
            const click = (Math.random() * 2 - 1) * Math.exp(-dt * 150) * 0.35;
            s += click;
        }

        // Coins Clinking Cascade
        const coinEvents = [
            { start: 0.10, freq: 3600, decay: 45, amp: 0.28 },
            { start: 0.16, freq: 4400, decay: 50, amp: 0.26 },
            { start: 0.23, freq: 5200, decay: 55, amp: 0.24 },
            { start: 0.31, freq: 3900, decay: 40, amp: 0.22 },
            { start: 0.40, freq: 4800, decay: 50, amp: 0.18 },
            { start: 0.48, freq: 5600, decay: 60, amp: 0.15 },
        ];

        for (const c of coinEvents) {
            if (t >= c.start && t < c.start + 0.15) {
                const dt = t - c.start;
                const coin = (Math.sin(2 * Math.PI * c.freq * dt) + 0.3 * (Math.random() * 2 - 1)) *
                             Math.exp(-dt * c.decay) * c.amp;
                s += coin;
            }
        }

        samples[i] = s * 0.85;
    }
    return samples;
}

// 2. camera-shutter.wav (Mechanical Camera Snap for Spec Showcase)
function genCameraShutter() {
    const duration = 0.32;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        let s = 0;

        // Slap 1: Mirror lift (0ms - 30ms)
        if (t < 0.035) {
            const dt = t;
            const pop = Math.sin(2 * Math.PI * 240 * dt) * Math.exp(-dt * 120);
            const noise = (Math.random() * 2 - 1) * Math.exp(-dt * 160) * 0.4;
            s += (pop + noise) * 0.7;
        }

        // Slap 2: Curtain click (60ms - 110ms)
        if (t >= 0.060 && t < 0.130) {
            const dt = t - 0.060;
            const snap = Math.sin(2 * Math.PI * 2800 * dt) * Math.exp(-dt * 90) * 0.6;
            const noise = (Math.random() * 2 - 1) * Math.exp(-dt * 110) * 0.55;
            s += (snap + noise) * 0.85;
        }

        // Soft winding release (120ms - 280ms)
        if (t >= 0.120 && t < 0.280) {
            const dt = t - 0.120;
            const flutter = Math.sin(2 * Math.PI * 50 * dt);
            const hum = (Math.random() * 2 - 1) * (0.5 + 0.5 * flutter) * Math.exp(-dt * 18) * 0.14;
            s += hum;
        }

        samples[i] = s * 0.85;
    }
    return samples;
}

// 3. bubble-pop.wav (Cute resonant water drop pop for beauty/skincare)
function genBubblePop() {
    const duration = 0.13;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const progress = t / duration;
        // Pitch rises fast then settles
        const freq = 450 + 1200 * Math.sin(progress * Math.PI * 0.5);
        const env = Math.sin(progress * Math.PI) * Math.exp(-progress * 4.5);
        const s = Math.sin(2 * Math.PI * freq * t) * env;
        samples[i] = s * 0.88;
    }
    return samples;
}

// 4. swoosh-deep.wav (Cinematic Deep Bass Whoosh for tech & dramatic hooks)
function genSwooshDeep() {
    const duration = 0.50;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let noiseState = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;
        // Hann envelope
        const env = Math.pow(Math.sin(norm * Math.PI), 2.2);

        // Low-frequency noise filter
        const white = Math.random() * 2 - 1;
        const alpha = 0.08 + 0.12 * Math.sin(norm * Math.PI);
        noiseState = noiseState + alpha * (white - noiseState);

        // Sub bass sine drop (85Hz -> 42Hz)
        const subFreq = 85 - 43 * norm;
        const sub = Math.sin(2 * Math.PI * subFreq * t) * 0.45;

        samples[i] = (noiseState * 1.6 + sub) * env * 0.85;
    }
    return samples;
}

// 5. glockenspiel.wav (Bright melodic double chime for solution reveal)
function genGlockenspiel() {
    const duration = 0.70;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        let s = 0;

        // Note 1: E6 (1318.5 Hz) at t=0
        if (t < 0.6) {
            const dt = t;
            const env = Math.exp(-dt * 7.5);
            const n1 = 0.7 * Math.sin(2 * Math.PI * 1318.5 * dt) +
                       0.3 * Math.sin(2 * Math.PI * 2637 * dt);
            s += n1 * env * 0.55;
        }

        // Note 2: B6 (1975.5 Hz) at t=0.085s
        if (t >= 0.085) {
            const dt = t - 0.085;
            const env = Math.exp(-dt * 6.8);
            const n2 = 0.75 * Math.sin(2 * Math.PI * 1975.5 * dt) +
                       0.25 * Math.sin(2 * Math.PI * 3951 * dt);
            s += n2 * env * 0.65;
        }

        samples[i] = s * 0.85;
    }
    return samples;
}

// 6. click-tactile.wav (Modern Apple-style tactile click)
function genClickTactile() {
    const duration = 0.055;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const env = Math.exp(-t * 180);
        const impulse = (Math.random() * 2 - 1) * Math.exp(-t * 400) * 0.5;
        const tone = Math.sin(2 * Math.PI * 2400 * t) * env * 0.6;
        samples[i] = (impulse + tone) * 0.9;
    }
    return samples;
}

// 7. swish-fast.wav (Ultra-fast snappy whip transition)
function genSwishFast() {
    const duration = 0.17;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let filter = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;
        const env = Math.sin(norm * Math.PI);

        // Center frequency moves from 1000 to 4200 to 600
        const freq = 1000 + 3200 * Math.sin(norm * Math.PI);
        const alpha = Math.min(0.6, (2 * Math.PI * freq) / SR);
        const white = Math.random() * 2 - 1;
        filter += alpha * (white - filter);

        samples[i] = filter * Math.pow(env, 2) * 1.1;
    }
    return samples;
}

// 8. sparkle.wav (Crystal shimmer sparkle for skincare glow / premium texture)
function genSparkle() {
    const duration = 0.75;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    const notes = [
        { t: 0.00, f: 2093, a: 0.22 }, // C7
        { t: 0.05, f: 2637, a: 0.24 }, // E7
        { t: 0.11, f: 3136, a: 0.26 }, // G7
        { t: 0.18, f: 3951, a: 0.28 }, // B7
        { t: 0.26, f: 4186, a: 0.30 }, // C8
        { t: 0.35, f: 5274, a: 0.25 }, // E8
    ];

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        let s = 0;
        for (const n of notes) {
            if (t >= n.t) {
                const dt = t - n.t;
                const env = Math.exp(-dt * 9.0);
                s += Math.sin(2 * Math.PI * n.f * dt) * env * n.a;
            }
        }
        samples[i] = s * 0.85;
    }
    return samples;
}

// 9. riser.wav (1.0s subtle tension riser before CTA)
function genRiser() {
    const duration = 1.0;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let phase = 0;
    let noiseFilter = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;

        // Exponential pitch rise 180Hz -> 1100Hz
        const f = 180 * Math.pow(1100 / 180, norm);
        phase += (2 * Math.PI * f) / SR;

        // Noise element
        const white = Math.random() * 2 - 1;
        noiseFilter += 0.15 * (white - noiseFilter);

        // Volume builds from quiet to punchy
        const amp = Math.pow(norm, 1.8) * 0.75;
        const flutter = 0.85 + 0.15 * Math.sin(2 * Math.PI * (4 + 14 * norm) * t);

        const tone = (Math.sin(phase) + 0.3 * Math.sin(phase * 2) + 0.4 * noiseFilter) * flutter;
        samples[i] = tone * amp * 0.75;
    }
    return samples;
}

// 10. impact-soft.wav (Subtle low-boom impact for dramatic hook accent)
function genImpactSoft() {
    const duration = 0.55;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let phase = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;

        // Pitch drop 130Hz -> 42Hz
        const f = 42 + 88 * Math.exp(-t * 18);
        phase += (2 * Math.PI * f) / SR;

        const env = Math.exp(-t * 6.5);
        const sub = Math.sin(phase) * env * 0.85;
        samples[i] = sub;
    }
    return samples;
}

// 11. ding.wav (Dual Harmonic chime bell G6 1568Hz + C7 2093Hz)
function genDing() {
    const duration = 0.75;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const env = Math.exp(-t * 5.2);
        const s = (0.55 * Math.sin(2 * Math.PI * 1568 * t) +
                   0.45 * Math.sin(2 * Math.PI * 2093 * t) +
                   0.15 * Math.sin(2 * Math.PI * 3136 * t)) * env;
        samples[i] = s * 0.85;
    }
    return samples;
}

// 12. pop.wav (Classic bubble pop)
function genPop() {
    const duration = 0.09;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const freq = 850 * Math.exp(-t * 22) + 200;
        const env = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 28);
        samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
    }
    return samples;
}

// 13. whoosh.wav (Kinetic Airy Sweep)
function genWhoosh() {
    const duration = 0.32;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let filter = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;
        const env = Math.pow(Math.sin(norm * Math.PI), 2);
        const white = Math.random() * 2 - 1;
        const cutoff = 400 + 2600 * Math.sin(norm * Math.PI);
        const alpha = Math.min(0.5, (2 * Math.PI * cutoff) / SR);
        filter += alpha * (white - filter);
        samples[i] = filter * env * 0.85;
    }
    return samples;
}

// 14. transition.wav (Airy Transition Swoop)
function genTransition() {
    const duration = 0.22;
    const len = Math.floor(duration * SR);
    const samples = new Float32Array(len);

    let filter = 0;
    for (let i = 0; i < len; i++) {
        const t = i / SR;
        const norm = t / duration;
        const env = Math.sin(norm * Math.PI);
        const white = Math.random() * 2 - 1;
        const cutoff = 600 + 3200 * Math.sin(norm * Math.PI);
        const alpha = Math.min(0.55, (2 * Math.PI * cutoff) / SR);
        filter += alpha * (white - filter);
        samples[i] = filter * env * 0.85;
    }
    return samples;
}

const list = [
    { name: 'kaching.wav', gen: genKaching },
    { name: 'camera-shutter.wav', gen: genCameraShutter },
    { name: 'bubble-pop.wav', gen: genBubblePop },
    { name: 'swoosh-deep.wav', gen: genSwooshDeep },
    { name: 'glockenspiel.wav', gen: genGlockenspiel },
    { name: 'click-tactile.wav', gen: genClickTactile },
    { name: 'swish-fast.wav', gen: genSwishFast },
    { name: 'sparkle.wav', gen: genSparkle },
    { name: 'riser.wav', gen: genRiser },
    { name: 'impact-soft.wav', gen: genImpactSoft },
    { name: 'ding.wav', gen: genDing },
    { name: 'pop.wav', gen: genPop },
    { name: 'whoosh.wav', gen: genWhoosh },
    { name: 'transition.wav', gen: genTransition },
];

for (const item of list) {
    const samples = item.gen();
    const buf = createWavBuffer(samples, SR);
    const filePath = path.join(outDir, item.name);
    fs.writeFileSync(filePath, buf);
    console.log(`✓ Generated ${item.name} (${(samples.length / SR).toFixed(2)}s, ${buf.length} bytes)`);
}

console.log(`\nAll ${list.length} viral TikTok SFX generated successfully in public/sfx/!`);

