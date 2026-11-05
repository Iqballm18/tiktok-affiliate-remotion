#!/usr/bin/env node

/**
 * doctor.mjs — TikTok Affiliate Remotion System Health Checker
 * Verifies Node, ffmpeg, yt-dlp, whisper.cpp, models, and directory health.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const checks = [];

function check(name, testFn) {
  try {
    const result = testFn();
    checks.push({ name, ok: true, detail: result });
  } catch (err) {
    checks.push({ name, ok: false, detail: err.message, fix: err.fix });
  }
}

console.log('\n======================================================');
console.log('🩺 SISTEM DIAGNOSTIK: TIKTOK AFFILIATE REMOTION');
console.log('======================================================\n');

// 1. Node.js Version Check
check('Node.js Environment', () => {
  const version = process.version;
  const major = parseInt(version.replace('v', '').split('.')[0], 10);
  if (major < 20) {
    const err = new Error(`Node ${version} terlalu lama.`);
    err.fix = 'Install Node.js versi LTS (v20.19+, v22+, atau v24+) dari https://nodejs.org';
    throw err;
  }
  return `${version} (OK)`;
});

// 2. FFmpeg Check
check('FFmpeg CLI', () => {
  try {
    const out = execSync('ffmpeg -version', { stdio: 'pipe' }).toString();
    const firstLine = out.split('\n')[0].trim();
    return firstLine;
  } catch {
    const err = new Error('ffmpeg tidak ditemukan di PATH sistem.');
    err.fix = 'Install FFmpeg melalui winget (winget install Gyan.FFmpeg) atau unduh dari https://ffmpeg.org';
    throw err;
  }
});

// 3. FFprobe Check
check('FFprobe CLI', () => {
  try {
    const out = execSync('ffprobe -version', { stdio: 'pipe' }).toString();
    const firstLine = out.split('\n')[0].trim();
    return firstLine;
  } catch {
    const err = new Error('ffprobe tidak ditemukan di PATH sistem.');
    err.fix = 'Pastikan ffprobe satu folder dengan ffmpeg dan terdaftar di PATH sistem.';
    throw err;
  }
});

// 4. yt-dlp Check
check('yt-dlp (YouTube Hook Downloader)', () => {
  try {
    const out = execSync('yt-dlp --version', { stdio: 'pipe' }).toString().trim();
    return `v${out}`;
  } catch {
    const err = new Error('yt-dlp tidak ditemukan di PATH.');
    err.fix = 'Install yt-dlp via winget (winget install yt-dlp) atau pip install yt-dlp';
    throw err;
  }
});

// 5. Whisper.cpp Binary
check('Whisper.cpp Engine', () => {
  const whisperDir = path.join(ROOT, 'whisper.cpp');
  const binName = process.platform === 'win32' ? 'main.exe' : 'main';
  const binPath = path.join(whisperDir, binName);
  if (!fs.existsSync(binPath)) {
    const err = new Error(`Binary ${binName} tidak ditemukan di folder whisper.cpp/`);
    err.fix = 'Jalankan `npm run transcribe` atau biarkan Whisper installer mengunduh binary otomatis.';
    throw err;
  }
  return `Terpasang (${binPath})`;
});

// 6. Whisper.cpp AI Models
check('Whisper AI Speech Models', () => {
  const whisperDir = path.join(ROOT, 'whisper.cpp');
  const models = ['ggml-small.bin', 'ggml-base.bin'].filter(m => fs.existsSync(path.join(whisperDir, m)));
  if (models.length === 0) {
    const err = new Error('Belum ada model Whisper AI (.bin) di whisper.cpp/');
    err.fix = 'Unduh model via: node scripts/transcribe.mjs <file> --model small';
    throw err;
  }
  return `Tersedia: ${models.join(', ')}`;
});

// 7. Folder Structure
check('Struktur Folder Kerja', () => {
  const requiredDirs = ['public', 'out', 'products', 'web'];
  for (const d of requiredDirs) {
    const p = path.join(ROOT, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  return 'public/, out/, products/, web/ (Lengkap)';
});

// Print Results Table
let allOk = true;
for (const c of checks) {
  const icon = c.ok ? '✅' : '❌';
  console.log(`${icon} [${c.name}]`);
  console.log(`   └─ ${c.detail}`);
  if (!c.ok) {
    allOk = false;
    if (c.fix) {
      console.log(`   💡 Solusi: ${c.fix}`);
    }
  }
}

console.log('\n------------------------------------------------------');
if (allOk) {
  console.log('🎉 SEMUA KOMPONEN SIAP! Sistem dapat merender video dengan lancar.');
} else {
  console.log('⚠️ Ada beberapa dependensi yang perlu dilengkapi sebelum render.');
}
console.log('------------------------------------------------------\n');

process.exit(allOk ? 0 : 1);

