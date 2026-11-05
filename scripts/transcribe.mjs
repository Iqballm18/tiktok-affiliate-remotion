import { transcribe, toCaptions, downloadWhisperModel, installWhisperCpp } from '@remotion/install-whisper-cpp';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Script Otomatis Transkripsi Audio Video Menggunakan Whisper AI (OpenAI / Remotion)
 * Menghasilkan file JSON dengan timestamp kata-per-kata berpresisi milidetik.
 *
 * Penggunaan:
 *   node scripts/transcribe.mjs public/hook_podcast_v1.mp4 [--lang id] [--model base] [--force]
 */

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Penggunaan: node scripts/transcribe.mjs <inputFile> [--lang id] [--model base] [--force]');
  process.exit(1);
}

const inputFile = args[0];
const langIndex = args.indexOf('--lang');
const language = langIndex !== -1 && args[langIndex + 1] ? args[langIndex + 1] : 'id';

const modelIndex = args.indexOf('--model');
const model = modelIndex !== -1 && args[modelIndex + 1] ? args[modelIndex + 1] : 'small';

const isForce = args.includes('--force');

if (!fs.existsSync(inputFile)) {
  console.error(`[ERROR] File input tidak ditemukan: ${inputFile}`);
  process.exit(1);
}

const parsedPath = path.parse(inputFile);
const outputFile = path.join(parsedPath.dir, `${parsedPath.name}.json`);

if (fs.existsSync(outputFile) && !isForce) {
  console.log(`[SKIP] Transkripsi ${outputFile} sudah ada. Gunakan --force untuk mentranskripsi ulang.`);
  process.exit(0);
}

// 1. Pastikan folder & binary whisper.cpp tersedia
const whisperFolder = path.resolve('whisper.cpp');
const whisperExe = process.platform === 'win32'
  ? path.join(whisperFolder, 'main.exe')
  : path.join(whisperFolder, 'main');

if (!fs.existsSync(whisperExe)) {
  console.log('[WHISPER] Mengunduh binary whisper.cpp...');
  await installWhisperCpp({
    version: '1.5.5',
    to: 'whisper.cpp',
    printOutput: true,
  });
}

// 2. Pastikan model whisper tersedia
console.log(`[WHISPER] Memeriksa model '${model}'...`);
await downloadWhisperModel({
  model,
  folder: 'whisper.cpp',
  printOutput: true,
});

// 3. Ekstrak audio ke 16kHz mono WAV via ffmpeg
const tempWav = path.resolve(`temp_audio_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
console.log(`[AUDIO] Mengekstrak audio ke 16kHz mono WAV...`);
try {
  execSync(`ffmpeg -i "${inputFile}" -ar 16000 -ac 1 -c:a pcm_s16le "${tempWav}" -y`, {
    stdio: 'ignore',
  });
} catch (e) {
  console.error(`[ERROR] Gagal mengekstrak audio dengan ffmpeg:`, e.message);
  process.exit(1);
}

// 4. Jalankan transcribe menggunakan Whisper AI
console.log(`[TRANSCRIBE] Menjalankan Whisper AI (model: ${model}, bahasa: ${language})...`);
try {
  const result = await transcribe({
    inputPath: tempWav,
    whisperPath: 'whisper.cpp',
    whisperCppVersion: '1.5.5',
    model,
    language,
    tokenLevelTimestamps: true,
    printOutput: false,
  });

  const { captions } = toCaptions({ whisperCppOutput: result });

  // 5. Gabungkan BPE sub-tokens Whisper menjadi kata utuh & lekatkan tanda baca
  const mergedWords = [];
  for (const token of captions) {
    const rawText = token.text;
    const trimmed = rawText.trim();
    if (!trimmed) continue;

    const isPurePunctuation = /^[.,!?;:–—"'()]+$/.test(trimmed);
    const isContinuation = !rawText.startsWith(' ') && mergedWords.length > 0;

      if ((isContinuation || isPurePunctuation) && mergedWords.length > 0) {
        const prev = mergedWords[mergedWords.length - 1];
        prev.text += trimmed;
        prev.endMs = Math.max(prev.endMs, token.endMs);
      } else {
        mergedWords.push({
          text: ' ' + trimmed,
          startMs: token.startMs,
          endMs: token.endMs,
          timestampMs: token.timestampMs ?? Math.round((token.startMs + token.endMs) / 2),
          confidence: token.confidence ?? null,
        });
      }
    }

    const cleanWords = mergedWords.filter((w) => w.text.trim().length > 0);

    // Simpan hasil ke file JSON di sebelah file video
    fs.writeFileSync(outputFile, JSON.stringify(cleanWords, null, 2), 'utf8');
    console.log(`[SUCCESS] Berhasil mentranskrip ${cleanWords.length} kata ke ${outputFile}`);
  } catch (err) {
    console.error(`[ERROR] Transkripsi gagal:`, err);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempWav)) {
      fs.unlinkSync(tempWav);
    }
  }

