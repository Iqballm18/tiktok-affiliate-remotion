// server.mjs — TikTok Affiliate Remotion Web Server
// Native Node.js Server with SSE, Direct Node Rendering, Video Streaming & Product Management

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  loadConfig,
  listProducts,
  loadProduct,
  saveProduct,
  deleteProduct,
  validateProduct,
  getVideoDurationSec,
} from './scripts/product-helper.mjs';
import { renderProductVariant, renderProductStill, syncPublicToBundle, getOrBuildBundle } from './render.mjs';
import { alignWhisperWithScript } from './scripts/align-captions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = loadConfig();

// Pratinjau langsung: antrean render satu-per-satu + cache hasil (maks 24 frame terakhir).
const LIVE_CACHE_MAX = 24;
const liveCache = new Map();
let liveChain = Promise.resolve();
const PORT = parseInt(process.env.PORT || config.webPort || '3100', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

function syncBundlePublic() {
  getOrBuildBundle().then(b => syncPublicToBundle(b)).catch(() => {});
}

function safeReplaceFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    try { if (fs.existsSync(src)) fs.unlinkSync(src); } catch (_) {}
    return true;
  } catch (_) {
    try {
      fs.renameSync(src, dest);
      return true;
    } catch (_) {
      return false;
    }
  }
}

function resolvePublicFilePath(rel) {
  const normalized = path.normalize(String(rel || '')).replace(/^(\.\.[\/\\])+/, '');
  let targetPath = path.resolve(PUBLIC_DIR, normalized);
  if (!targetPath.startsWith(PUBLIC_DIR)) {
    throw new Error('Akses di luar folder public ditolak');
  }
  if (!fs.existsSync(targetPath)) {
    const baseName = path.basename(normalized);
    const fallback = path.resolve(PUBLIC_DIR, baseName);
    if (fallback.startsWith(PUBLIC_DIR) && fs.existsSync(fallback)) {
      targetPath = fallback;
    } else {
      // Cari rekursif di subfolder public/ (misalnya public/products/<productId>/...)
      function searchDir(dir) {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = searchDir(full);
            if (found) return found;
          } else if (entry.name.toLowerCase() === baseName.toLowerCase()) {
            return full;
          }
        }
        return null;
      }
      const foundInSub = searchDir(PUBLIC_DIR);
      if (foundInSub) {
        targetPath = foundInSub;
      }
    }
  }
  return targetPath;
}
const OUT_DIR = path.join(__dirname, 'out');
const WEB_DIR = path.join(__dirname, 'web');
const PRODUCTS_DIR = path.join(__dirname, 'products');

// Ensure essential directories exist
for (const dir of [PUBLIC_DIR, OUT_DIR, WEB_DIR, PRODUCTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Global Render State
const renderState = {
  isRendering: false,
  cancelToken: null,
  activeProduct: null,
  activeVariant: 'v1',
  fps: config.defaultFps || 60,
  currentProgress: {
    step: 'Idle',
    frame: 0,
    totalFrames: 0,
    percent: 0,
    eta: '-',
  },
  logs: [],
};

// Connected SSE clients
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload, err => {
        if (err) sseClients.delete(client);
      });
    } catch {
      sseClients.delete(client);
    }
  }
}

function appendLog(line) {
  renderState.logs.push(line);
  if (renderState.logs.length > 500) renderState.logs.shift();
  broadcast('log', { text: line, timestamp: Date.now() });
}

// Serve static file with Range Request support for Video Scrubbing
function serveStaticFile(req, res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File tidak ditemukan: ' + path.basename(filePath));
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range && contentType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. SSE Stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');

    res.write(`event: status\ndata: ${JSON.stringify({ isRendering: renderState.isRendering, ...renderState.currentProgress })}\n\n`);
    for (const log of renderState.logs.slice(-30)) {
      res.write(`event: log\ndata: ${JSON.stringify({ text: log })}\n\n`);
    }

    sseClients.add(res);
    res.on('error', () => { sseClients.delete(res); });
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. API: Global Config
  if (pathname === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadConfig()));
    return;
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newCfg = JSON.parse(body || '{}');
        const configPath = path.join(__dirname, 'config.json');
        let cfg = {};
        if (fs.existsSync(configPath)) {
          cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        Object.assign(cfg, newCfg);
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config: cfg }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. API: Status
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      isRendering: renderState.isRendering,
      activeProduct: renderState.activeProduct,
      activeVariant: renderState.activeVariant,
      fps: renderState.fps,
      progress: renderState.currentProgress,
    }));
    return;
  }

  // 4. API: Products CRUD
  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      const list = listProducts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/products/') && req.method === 'GET') {
    const id = pathname.replace('/api/products/', '');
    try {
      const prod = loadProduct(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(prod));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/products/') && req.method === 'POST') {
    const id = pathname.replace('/api/products/', '');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const productData = JSON.parse(body);
        const saved = saveProduct(id, productData);
        // Pastikan folder aset khusus produk di public/products/<id> juga tersedia
        const productDir = path.join(PUBLIC_DIR, 'products', saved.id);
        if (!fs.existsSync(productDir)) {
          fs.mkdirSync(productDir, { recursive: true });
        }
        appendLog(`[PRODUK] Berhasil menyimpan produk '${productData.name || id}' (${saved.filePath})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: saved.id }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/products/', '');
    const deleteAssets = urlObj.searchParams.get('deleteAssets') === 'true';
    try {
      const result = deleteProduct(id, deleteAssets);
      appendLog(`[PRODUK] Berhasil menghapus produk '${id}' (hapus aset: ${deleteAssets ? 'Ya' : 'Tidak'})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. API: Import & Validate JSON (from Gemini)
  if (pathname === '/api/products-import' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const validation = validateProduct(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          product: parsed,
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          valid: false,
          errors: [`Format JSON tidak valid: ${err.message}`],
          warnings: [],
        }));
      }
    });
    return;
  }

  // 6. API: Get Available Assets in public/ (Mendukung filter productId)
  if (pathname === '/api/assets' && req.method === 'GET') {
    try {
      const productId = urlObj.searchParams.get('productId') || '';
      const safeProductId = productId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const voiceOvers = [];
      const videos = [];
      const transcripts = [];

      // Helper untuk scan folder dan mengisi daftar aset
      const scanDir = (dirPath, relPrefix = '', scopeLabel = '') => {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath);
        for (const f of entries) {
          const fullPath = path.join(dirPath, f);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) continue;

          const relName = relPrefix ? `${relPrefix}/${f}` : f;
          const ext = path.extname(f).toLowerCase();

          if (ext === '.mp3' || ext === '.wav') {
            const jsonName = relName.replace(/\.[^/.]+$/, '.json');
            const jsonPath = path.join(PUBLIC_DIR, jsonName);
            let wordsCount = 0;
            if (fs.existsSync(jsonPath)) {
              try {
                const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                if (Array.isArray(data)) wordsCount = data.length;
              } catch {}
            }
            voiceOvers.push({
              name: relName,
              displayName: scopeLabel ? `[${scopeLabel}] ${f}` : f,
              scope: scopeLabel || 'global',
              wordsCount,
              hasTranscript: fs.existsSync(jsonPath),
            });
          } else if (ext === '.mp4' || ext === '.mov') {
            const dur = getVideoDurationSec(relName);
            videos.push({
              name: relName,
              displayName: scopeLabel ? `[${scopeLabel}] ${f}` : f,
              scope: scopeLabel || 'global',
              durationSec: dur ? Math.round(dur * 10) / 10 : null,
            });
          } else if (ext === '.json') {
            transcripts.push({
              name: relName,
              displayName: scopeLabel ? `[${scopeLabel}] ${f}` : f,
              scope: scopeLabel || 'global',
            });
          }
        }
      };

      // 1. Scan folder khusus produk jika productId diberikan
      if (safeProductId) {
        const productDir = path.join(PUBLIC_DIR, 'products', safeProductId);
        scanDir(productDir, `products/${safeProductId}`, 'Produk');
      }

      // 2. Scan root public/ (aset umum / legacy)
      scanDir(PUBLIC_DIR, '', safeProductId ? 'Umum' : '');

      // Scan BGM files (in public/ or public/bgm/)
      const bgms = [];
      const bgmDir = path.join(PUBLIC_DIR, 'bgm');
      if (fs.existsSync(bgmDir)) {
        try {
          for (const bf of fs.readdirSync(bgmDir)) {
            if (/\.(mp3|wav|m4a|aac)$/i.test(bf)) {
              bgms.push({ name: `bgm/${bf}`, displayName: bf });
            }
          }
        } catch {}
      }
      for (const vo of voiceOvers) {
        if (/bgm|music|backsound|soundtrack|instrumental/i.test(vo.name)) {
          bgms.push({ name: vo.name, displayName: vo.displayName || vo.name });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ voiceOvers, videos, transcripts, bgms }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 7. API: Upload File (Mendukung upload ke folder produk: public/products/<productId>/)
  if (pathname === '/api/upload' && req.method === 'POST') {
    const rawFilename = urlObj.searchParams.get('filename') || 'upload.mp4';
    const productId = urlObj.searchParams.get('productId') || '';
    const safeFilename = path.basename(rawFilename).replace(/[^\w.-]/g, '_');

    let targetDir = PUBLIC_DIR;
    let relPath = safeFilename;

    if (productId) {
      const safeProductId = productId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      targetDir = path.join(PUBLIC_DIR, 'products', safeProductId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      relPath = `products/${safeProductId}/${safeFilename}`;
    }

    const targetPath = path.join(targetDir, safeFilename);

    appendLog(`[UPLOAD] Menerima unggahan file: public/${relPath}...`);
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);
    writeStream.on('finish', () => {
      const stat = fs.statSync(targetPath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
      appendLog(`[UPLOAD] File tersimpan: public/${relPath} (${sizeMB} MB)`);
      syncBundlePublic();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, filename: relPath, sizeMB }));
    });
    writeStream.on('error', (err) => {
      appendLog(`[ERROR] Gagal menyimpan unggahan: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // 8. API: Trigger Whisper Transcription
  if (pathname === '/api/transcribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, model } = JSON.parse(body);
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameter filename wajib diisi' }));
          return;
        }

        // Cari file secara path relatif langsung, atau lewat resolvePublicFilePath yang mendukung subfolder produk
        let inputPath = resolvePublicFilePath(filename);
        let relFilename = path.relative(PUBLIC_DIR, inputPath).replace(/\\/g, '/');
        if (!fs.existsSync(inputPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File public/${filename} tidak ditemukan` }));
          return;
        }

        appendLog(`[WHISPER] Memulai auto-transcribe: public/${relFilename}...`);
        const whisperModel = model || 'small';
        const child = spawn('node', ['scripts/transcribe.mjs', inputPath, '--model', whisperModel, '--force'], {
          cwd: __dirname,
          windowsHide: true,
        });

        child.stdout.on('data', chunk => {
          for (const l of chunk.toString().split('\n')) {
            const line = l.trim();
            if (line) appendLog(`[WHISPER] ${line}`);
          }
        });

        child.stderr.on('data', chunk => {
          for (const l of chunk.toString().split('\n')) {
            const line = l.trim();
            if (line) appendLog(`[WHISPER ERR] ${line}`);
          }
        });

        child.on('close', code => {
          const jsonFile = relFilename.replace(/\.[^/.]+$/, '.json');
          const jsonPath = path.join(path.dirname(inputPath), path.basename(jsonFile));
          let wordsCount = 0;
          if (fs.existsSync(jsonPath)) {
            try {
              wordsCount = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).length;
            } catch {}
          }
          appendLog(`[WHISPER] Transkripsi selesai (code ${code}). Kata tersinkron: ${wordsCount}`);
          broadcast('transcribe-done', { filename: relFilename, jsonFile, wordsCount });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Transkripsi dimulai di latar belakang' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 8b. API: Auto-Cut Jeda Napas (Silence Remover via FFmpeg)
  if (pathname === '/api/trim-silence' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename } = JSON.parse(body);
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameter filename wajib diisi' }));
          return;
        }

        let inputPath = resolvePublicFilePath(filename);
        let relFilename = path.relative(PUBLIC_DIR, inputPath).replace(/\\/g, '/');
        if (!fs.existsSync(inputPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File public/${filename} tidak ditemukan` }));
          return;
        }

        const oldDuration = getVideoDurationSec(relFilename) || 0;
        const ext = path.extname(inputPath) || '.mp3';
        const tempPath = path.join(path.dirname(inputPath), `_trim_${Date.now()}${ext}`);

        appendLog(`[AUDIO-TRIM] Memotong jeda napas pada public/${relFilename} (durasi awal: ${oldDuration.toFixed(1)}s)...`);

        const afFilter = 'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,silenceremove=stop_periods=-1:stop_duration=0.22:stop_threshold=-40dB';
        const child = spawn('ffmpeg', ['-y', '-i', inputPath, '-af', afFilter, tempPath], {
          cwd: __dirname,
          windowsHide: true,
        });

        let errLog = '';
        child.stderr.on('data', d => { errLog += d.toString(); });

        child.on('close', code => {
          if (code !== 0 || !fs.existsSync(tempPath)) {
            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
            appendLog(`[ERROR] Gagal memotong jeda napas: code ${code}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `FFmpeg gagal (code ${code}): ${errLog.slice(-200)}` }));
            return;
          }

          const replaced = safeReplaceFile(tempPath, inputPath);
          if (!replaced) {
            appendLog(`[WARN] Tidak dapat menimpa file audio (mungkin sedang dibuka oleh pemutar musik).`);
          }
          syncBundlePublic();
          const newDuration = getVideoDurationSec(relFilename) || oldDuration;
          const savedSec = Math.max(0, Math.round((oldDuration - newDuration) * 100) / 100);

          appendLog(`[AUDIO-TRIM] Selesai! Durasi: ${oldDuration.toFixed(1)}s → ${newDuration.toFixed(1)}s (hemat ${savedSec}s)`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            filename: relFilename,
            oldDuration: Math.round(oldDuration * 10) / 10,
            newDuration: Math.round(newDuration * 10) / 10,
            savedSec,
          }));
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 8c. API: Smart VO Processing Pipeline (Trim Silence + Whisper Transcribe + Auto-Correct)
  if (pathname === '/api/smart-process-vo' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, model, referenceScript, doTrim } = JSON.parse(body);
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameter filename wajib diisi' }));
          return;
        }

        let inputPath = resolvePublicFilePath(filename);
        let relFilename = path.relative(PUBLIC_DIR, inputPath).replace(/\\/g, '/');
        if (!fs.existsSync(inputPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File public/${filename} tidak ditemukan` }));
          return;
        }

        appendLog(`[SMART-VO] Memulai pipeline cerdas untuk public/${relFilename}...`);

        // Langsung respon HTTP agar UI tidak timeout saat proses panjang
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pipeline VO cerdas dimulai di latar belakang',
          file: relFilename
        }));

        // Jalankan pipeline bertahap
        (async () => {
          try {
            // Tahap 1: FFmpeg Trim Silence (Opsional tapi default true)
            if (doTrim) {
              const oldDur = getVideoDurationSec(relFilename);
              if (oldDur > 0) {
                appendLog(`[SMART-VO 1/3] Memotong jeda napas (${oldDur.toFixed(1)}s)...`);
                const ext = path.extname(inputPath);
                const tempPath = inputPath.replace(new RegExp(`\\${ext}$`), `.smart-trimmed${ext}`);
                await new Promise(resolve => {
                  const filter = 'silenceremove=start_periods=1:start_duration=0.08:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.08:start_threshold=-45dB:detection=peak,areverse';
                  const child = spawn('ffmpeg', ['-y', '-i', inputPath, '-af', filter, '-c:a', 'libmp3lame', '-q:a', '2', tempPath], {
                    windowsHide: true
                  });
                  child.on('close', code => {
                    if (code === 0 && fs.existsSync(tempPath)) {
                      const replaced = safeReplaceFile(tempPath, inputPath);
          if (!replaced) {
            appendLog(`[WARN] Tidak dapat menimpa file audio (mungkin sedang dibuka oleh pemutar musik).`);
          }
                      syncBundlePublic();
                      const newDur = getVideoDurationSec(relFilename) || oldDur;
                      appendLog(`[SMART-VO 1/3] Jeda napas dipotong: ${oldDur.toFixed(1)}s → ${newDur.toFixed(1)}s`);
                    } else {
                      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                      appendLog(`[SMART-VO 1/3] Lewati potong napas (FFmpeg selesai dengan kode ${code})`);
                    }
                    resolve();
                  });
                });
              }
            }

            // Tahap 2: Whisper Transcribe
            appendLog(`[SMART-VO 2/3] Mentranskripsi kata dengan Whisper AI...`);
            const whisperModel = model || 'small';
            await new Promise((resolve, reject) => {
              const child = spawn('node', ['scripts/transcribe.mjs', inputPath, '--model', whisperModel, '--force'], {
                cwd: __dirname,
                windowsHide: true
              });
              child.stdout.on('data', chunk => {
                for (const l of chunk.toString().split('\n')) {
                  const line = l.trim();
                  if (line) appendLog(`[WHISPER] ${line}`);
                }
              });
              child.stderr.on('data', chunk => {
                for (const l of chunk.toString().split('\n')) {
                  const line = l.trim();
                  if (line) appendLog(`[WHISPER] ${line}`);
                }
              });
              child.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Whisper gagal dengan kode exit ${code}`));
              });
            });

            // Cari file JSON hasil transcribe
            let baseName = path.basename(inputPath).replace(/\.[^/.]+$/, '');
            let jsonPath = path.join(path.dirname(inputPath), `${baseName}.json`);
            if (!fs.existsSync(jsonPath)) {
              jsonPath = path.join(PUBLIC_DIR, `${baseName}.json`);
            }

            let wordsCount = 0;
            if (fs.existsSync(jsonPath)) {
              let words = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

              // Tahap 3: Auto-koreksi teks jika referenceScript disediakan
              if (referenceScript && referenceScript.trim()) {
                appendLog(`[SMART-VO 3/3] Melakukan auto-correct subtitle terhadap naskah Gemini...`);
                const { alignedWords, stats } = alignWhisperWithScript(words, referenceScript);
                fs.writeFileSync(jsonPath, JSON.stringify(alignedWords, null, 2), 'utf8');
                words = alignedWords;
                appendLog(`[SMART-VO 3/3] Sukses auto-correct: ${stats.correctedCount} kata diperbaiki (${stats.mergedCount} digabung, ${stats.splitCount} dipecah).`);
              } else {
                appendLog(`[SMART-VO 3/3] Naskah acuan kosong, subtitle tetap memakai teks asli Whisper.`);
              }

              wordsCount = words.length;
              syncBundlePublic();

              // Broadcast SSE ke browser agar reload otomatis
              broadcastSSE('transcribe-done', {
                file: relFilename,
                jsonFile: path.basename(jsonPath),
                wordsCount
              });
            }

            appendLog(`[SMART-VO] Selesai sempurna! ${wordsCount} kata siap dipakai untuk subtitle karaoke.`, true);
          } catch (err) {
            appendLog(`[SMART-VO ERROR] ${err.message}`);
          }
        })();

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 8d. API: Get Master Gemini Prompt with injected duration and event mode
  if (pathname === '/api/gemini-prompt' && req.method === 'GET') {
    try {
      const promptPath = path.join(__dirname, 'docs', 'prompt-gemini.md');
      if (!fs.existsSync(promptPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'docs/prompt-gemini.md tidak ditemukan' }));
        return;
      }
      let content = fs.readFileSync(promptPath, 'utf8');
      const fenceMatch = content.match(/````([\s\S]*?)````/);
      let promptText = fenceMatch ? fenceMatch[1].trim() : content;

      const durParam = urlObj.searchParams.get('duration');
      const eventParam = urlObj.searchParams.get('event');

      if (durParam) {
        const sec = parseFloat(durParam) || 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const timeFmt = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        promptText = promptText.replace(
          /DURASI ASLI VIDEO: \[.*?\]/g,
          `DURASI ASLI VIDEO: ${sec.toFixed(0)} detik (${timeFmt})`
        );
      }
      if (eventParam && eventParam.trim()) {
        promptText = promptText.replace(
          /MODE EVENT: \[.*?\]/g,
          `MODE EVENT: ${eventParam.trim()}`
        );
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ prompt: promptText }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9. API: Get Rendered Videos in out/
  if (pathname === '/api/videos' && req.method === 'GET') {
    try {
      if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
      const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.mp4'));
      const videoList = files.map(name => {
        const fullPath = path.join(OUT_DIR, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          size: stat.size,
          mtime: stat.mtimeMs,
        };
      }).sort((a, b) => b.mtime - a.mtime);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(videoList));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9b. API: Delete Rendered Video in out/
  if (pathname === '/api/videos' && req.method === 'DELETE') {
    const filename = urlObj.searchParams.get('file');
    if (!filename) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter file wajib disertakan' }));
      return;
    }
    const safeFilename = path.basename(filename);
    const targetPath = path.join(OUT_DIR, safeFilename);
    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File video ${safeFilename} tidak ditemukan` }));
      return;
    }

    try {
      fs.unlinkSync(targetPath);
      appendLog(`[HAPUS] Video out/${safeFilename} berhasil dihapus.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, filename: safeFilename }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9c. API: Get Preview Frame PNGs in out/previews/
  if (pathname === '/api/previews' && req.method === 'GET') {
    try {
      const previewDir = path.join(OUT_DIR, 'previews');
      if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
      const files = fs.readdirSync(previewDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
      const previewList = files.map(name => {
        const fullPath = path.join(previewDir, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          url: `/out/previews/${encodeURIComponent(name)}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        };
      }).sort((a, b) => b.mtime - a.mtime);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(previewList));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9d. API: Delete Preview Frame in out/previews/
  if (pathname === '/api/previews' && req.method === 'DELETE') {
    const filename = urlObj.searchParams.get('file');
    if (!filename) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter file wajib disertakan' }));
      return;
    }
    const safeFilename = path.basename(filename);
    const targetPath = path.join(OUT_DIR, 'previews', safeFilename);
    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File preview ${safeFilename} tidak ditemukan` }));
      return;
    }

    try {
      fs.unlinkSync(targetPath);
      appendLog(`[HAPUS] Preview out/previews/${safeFilename} berhasil dihapus.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, filename: safeFilename }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9e. API: Get Public Folder Files
  if (pathname === '/api/public-files' && req.method === 'GET') {
    try {
      if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
      const fileList = [];

      const walkDir = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir);
        for (const f of entries) {
          const fullPath = path.join(dir, f);
          const stat = fs.statSync(fullPath);
          const relPath = prefix ? `${prefix}/${f}` : f;
          if (stat.isDirectory()) {
            walkDir(fullPath, relPath);
            continue;
          }

          const ext = path.extname(f).toLowerCase();
          let category = 'Dokumen Lain';
          if (prefix === 'sfx') category = 'SFX Audio';
          else if (prefix === 'bgm') category = 'BGM Music';
          else if (prefix.startsWith('products/')) category = 'Aset Produk';
          else if (ext === '.mp4' || ext === '.mov') category = 'Video Mentah';
          else if (ext === '.mp3' || ext === '.wav') category = 'Audio Voiceover';
          else if (ext === '.json') category = 'Transkrip Subtitle';

          fileList.push({
            name: relPath,
            category,
            size: stat.size,
            mtime: stat.mtimeMs,
            url: `/public/${encodeURI(relPath)}`,
          });
        }
      };

      walkDir(PUBLIC_DIR);

      fileList.sort((a, b) => b.mtime - a.mtime);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fileList));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9f. API: Delete Public Media / SFX File
  if (pathname === '/api/public-files' && req.method === 'DELETE') {
    const filename = urlObj.searchParams.get('file');
    if (!filename) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter file wajib disertakan' }));
      return;
    }

    // Normalize path and protect against traversal
    const normalizedFile = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    const targetPath = path.resolve(PUBLIC_DIR, normalizedFile);

    if (!targetPath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Akses ditolak: File di luar direktori public' }));
      return;
    }

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File ${normalizedFile} tidak ditemukan` }));
      return;
    }

    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Tidak dapat menghapus folder/direktori' }));
        return;
      }

      fs.unlinkSync(targetPath);
      appendLog(`[HAPUS] Berkas public/${normalizedFile} berhasil dihapus.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, filename: normalizedFile }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9f. API: Open Folder in Windows Explorer
  if (pathname === '/api/open-folder' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { folder } = JSON.parse(body || '{}');
        const targetDir = folder === 'public'
          ? PUBLIC_DIR
          : (folder === 'previews' ? path.join(OUT_DIR, 'previews') : OUT_DIR);
        exec(`explorer "${targetDir}"`, (err) => {
          if (err) console.warn('Gagal membuka explorer:', err.message);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, folder: targetDir }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 9g. API: Google Drive Folder Shortcut Link (Get)
  if (pathname === '/api/gdrive-link' && req.method === 'GET') {
    try {
      const configPath = path.join(__dirname, 'config.json');
      let cfg = {};
      if (fs.existsSync(configPath)) {
        cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        url: cfg.gdriveFolderUrl || 'https://drive.google.com/drive/my-drive',
        webhookUrl: cfg.gdriveWebhookUrl || ''
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9h. API: Google Drive Folder Shortcut Link (Save)
  if (pathname === '/api/gdrive-link' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { url, webhookUrl } = JSON.parse(body || '{}');
        const configPath = path.join(__dirname, 'config.json');
        let cfg = {};
        if (fs.existsSync(configPath)) {
          cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        if (url !== undefined) cfg.gdriveFolderUrl = String(url || '').trim() || 'https://drive.google.com/drive/my-drive';
        if (webhookUrl !== undefined) cfg.gdriveWebhookUrl = String(webhookUrl || '').trim();
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          url: cfg.gdriveFolderUrl,
          webhookUrl: cfg.gdriveWebhookUrl
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 9i. API: Open Specific File in Windows Explorer (Selects/Highlights File for Instant Drag & Drop)
  if (pathname === '/api/open-file' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { file, videoName } = JSON.parse(body || '{}');
        const targetFilename = path.basename(file || videoName || '');
        if (!targetFilename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nama file wajib diisi' }));
          return;
        }

        const fullPath = path.join(OUT_DIR, targetFilename);
        if (!fs.existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File tidak ditemukan di: ${fullPath}` }));
          return;
        }

        // Windows Explorer /select highlights the exact file
        exec(`explorer /select,"${fullPath}"`, (err) => {
          if (err) console.warn('Gagal membuka explorer /select:', err.message);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, file: fullPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Helper: Streaming upload to Google Apps Script with byte tracking and 302 redirect following
  function sendStreamingUploadToAppsScript(webhookUrl, postData, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(webhookUrl);
        const totalBytes = Buffer.byteLength(postData);
        const buf = Buffer.from(postData, 'utf-8');

        const req = https.request(parsedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': totalBytes
          }
        }, (res) => {
          if (res.statusCode === 302 && res.headers.location) {
            https.get(res.headers.location, (res2) => {
              let result = '';
              res2.on('data', c => { result += c; });
              res2.on('end', () => {
                try {
                  const json = JSON.parse(result);
                  resolve(json);
                } catch (_) {
                  reject(new Error('Respon tidak valid dari Google Apps Script: ' + result.slice(0, 200)));
                }
              });
              res2.on('error', reject);
            }).on('error', reject);
          } else {
            let result = '';
            res.on('data', c => { result += c; });
            res.on('end', () => {
              try {
                const json = JSON.parse(result);
                resolve(json);
              } catch (_) {
                reject(new Error('Respon tidak valid dari Google Apps Script: ' + result.slice(0, 200)));
              }
            });
            res.on('error', reject);
          }
        });

        req.on('error', reject);

        let sent = 0;
        const chunkSize = 256 * 1024; // 256 KB

        function writeNext() {
          while (sent < totalBytes) {
            const end = Math.min(sent + chunkSize, totalBytes);
            const chunk = buf.slice(sent, end);
            sent = end;
            const ok = req.write(chunk);
            if (typeof onProgress === 'function') {
              onProgress(sent, totalBytes);
            }
            if (!ok) {
              req.once('drain', writeNext);
              return;
            }
          }
          req.end();
        }

        writeNext();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Helper: Resumable streaming upload direct to Google Drive API (0% compression, 100% original file)
  function streamFileToGoogleDrive(sessionUrl, fullPath, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(sessionUrl);
        const stat = fs.statSync(fullPath);
        const totalBytes = stat.size;
        const fileStream = fs.createReadStream(fullPath, { highWaterMark: 256 * 1024 });

        const req = https.request(parsedUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': totalBytes,
            'Content-Type': 'video/mp4'
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              try {
                const json = JSON.parse(body);
                resolve(json);
              } catch (_) {
                resolve({ success: true, raw: body });
              }
            } else {
              reject(new Error(`Google Drive API gagal (HTTP ${res.statusCode}): ${body.slice(0, 300)}`));
            }
          });
        });

        req.on('error', reject);

        let sent = 0;
        fileStream.on('data', (chunk) => {
          sent += chunk.length;
          if (typeof onProgress === 'function') {
            onProgress(sent, totalBytes);
          }
        });

        fileStream.pipe(req);
      } catch (err) {
        reject(err);
      }
    });
  }

  // 9j. API: Direct Upload Video to Google Drive via Apps Script Webhook
  if (pathname === '/api/gdrive-upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { videoName } = JSON.parse(body || '{}');
        const targetFilename = path.basename(videoName || '');
        if (!targetFilename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nama video wajib ditentukan' }));
          return;
        }

        const fullPath = path.join(OUT_DIR, targetFilename);
        if (!fs.existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File ${targetFilename} tidak ditemukan di out/` }));
          return;
        }

        const configPath = path.join(__dirname, 'config.json');
        let cfg = {};
        if (fs.existsSync(configPath)) {
          cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const webhookUrl = cfg.gdriveWebhookUrl;
        if (!webhookUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL Google Apps Script Webhook belum dikonfigurasi di config.json' }));
          return;
        }

        appendLog(`[GDRIVE] Memulai proses unggah: ${targetFilename}...`);
        broadcast('gdrive_upload_progress', {
          filename: targetFilename,
          step: 'init',
          percent: 5,
          message: `Menyiapkan ${targetFilename}...`
        });

        const stat = fs.statSync(fullPath);
        const originalMB = (stat.size / (1024 * 1024)).toFixed(1);

        // ========================================================
        // LANGKAH 1: Uji Resumable Upload (100% File Asli Tanpa Kompresi)
        // ========================================================
        appendLog(`[GDRIVE] Memeriksa sesi Resumable Upload (File Asli ${originalMB} MB)...`);
        let sessionUrl = null;

        try {
          const initRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createSession',
              filename: targetFilename,
              fileSize: stat.size,
              mimeType: 'video/mp4',
              folderId: '1PfohGzGpodBfZNutWbgZXSlryqu3Xw2D'
            })
          });
          const initText = await initRes.text();
          try {
            const initData = JSON.parse(initText);
            if (initData.success && initData.sessionUrl) {
              sessionUrl = initData.sessionUrl;
            }
          } catch (_) {}
        } catch (_) {}

        if (sessionUrl) {
          // ========================================================
          // MODE 1: RESUMABLE UPLOAD AKTIF (100% FILE ASLI, 0% KOMPRESI!)
          // ========================================================
          appendLog(`[GDRIVE ASLI] Mengunggah file asli 100% (${originalMB} MB) langsung ke Google Drive API (Tanpa Kompresi)...`);
          broadcast('gdrive_upload_progress', {
            filename: targetFilename,
            step: 'uploading',
            percent: 10,
            message: `Mengunggah file asli 100% (${originalMB} MB) tanpa kompresi...`
          });

          let lastBroadcastTime = 0;
          const driveFile = await streamFileToGoogleDrive(sessionUrl, fullPath, (sentBytes, totalBytes) => {
            const now = Date.now();
            if (now - lastBroadcastTime > 250 || sentBytes === totalBytes) {
              lastBroadcastTime = now;
              const pct = Math.min(98, Math.round((sentBytes / totalBytes) * 100));
              const sentMB = (sentBytes / (1024 * 1024)).toFixed(1);
              const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
              broadcast('gdrive_upload_progress', {
                filename: targetFilename,
                step: 'uploading',
                percent: pct,
                sentMB,
                totalMB,
                actualFileMB: originalMB,
                message: `Mengunggah file asli: ${sentMB} MB / ${totalMB} MB (${pct}%) — File Asli 100%`
              });
            }
          });

          const finalFileId = driveFile.id;
          const finalUrl = finalFileId
            ? `https://drive.google.com/file/d/${finalFileId}/view`
            : cfg.gdriveFolderUrl;

          appendLog(`[GDRIVE SUKSES] File asli 100% (${originalMB} MB) berhasil diunggah tanpa kompresi! Link: ${finalUrl}`);
          broadcast('gdrive_upload_progress', {
            filename: targetFilename,
            step: 'done',
            percent: 100,
            message: `Selesai! File asli 100% (${originalMB} MB) tersimpan di Google Drive tanpa kompresi.`,
            url: finalUrl,
            folderUrl: cfg.gdriveFolderUrl
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            filename: targetFilename,
            uncompressed: true,
            sizeMB: originalMB,
            url: finalUrl,
            folderUrl: cfg.gdriveFolderUrl
          }));
          return;
        }

        // ========================================================
        // MODE 2: FALLBACK LEGACY BASE64 (Jika Webhook Belum Diupdate)
        // ========================================================
        appendLog(`[GDRIVE FALLBACK] Webhook belum mendukung Resumable Upload. Menjalankan fallback kompatibilitas...`);
        let uploadFilePath = fullPath;
        let isTempFile = false;

        // If file > 28MB, optimize it to safely stay under Google Apps Script's payload ceiling
        if (stat.size > 28 * 1024 * 1024) {
          appendLog(`[GDRIVE] Ukuran video (${originalMB} MB) > 28MB. Mengoptimalkan ukuran sebelum diunggah...`);
          broadcast('gdrive_upload_progress', {
            filename: targetFilename,
            step: 'compress',
            percent: 15,
            message: `Mengoptimalkan video (${originalMB} MB) agar sesuai batas Apps Script...`
          });

          const tempOptimizedPath = path.join(OUT_DIR, `temp_upload_${Date.now()}.mp4`);
          await new Promise((resolve, reject) => {
            const cmd = `npx remotion ffmpeg -y -i "${fullPath}" -vcodec libx264 -crf 22 -preset fast -acodec copy "${tempOptimizedPath}"`;
            exec(cmd, (err) => {
              if (err) reject(new Error('Gagal mengoptimasi video: ' + err.message));
              else resolve();
            });
          });
          uploadFilePath = tempOptimizedPath;
          isTempFile = true;
          const optStat = fs.statSync(uploadFilePath);
          const optMB = (optStat.size / (1024 * 1024)).toFixed(1);
          appendLog(`[GDRIVE] Optimasi selesai: ${optMB} MB.`);
          broadcast('gdrive_upload_progress', {
            filename: targetFilename,
            step: 'compress_done',
            percent: 30,
            message: `Optimasi selesai: ${optMB} MB. Mengemas data...`
          });
        }

        broadcast('gdrive_upload_progress', {
          filename: targetFilename,
          step: 'packaging',
          percent: 38,
          message: 'Meng-encode paket data Base64...'
        });

        const fileBuffer = fs.readFileSync(uploadFilePath);
        const actualFileMB = (fileBuffer.length / (1024 * 1024)).toFixed(1);
        appendLog(`[GDRIVE] Mengirim paket video (${actualFileMB} MB) ke Google Drive...`);

        const params = new URLSearchParams();
        params.append('data', fileBuffer.toString('base64'));
        params.append('filename', targetFilename);
        params.append('mimetype', 'video/mp4');

        const postData = params.toString();

        let lastBroadcastTime = 0;
        const uploadData = await sendStreamingUploadToAppsScript(webhookUrl, postData, (sentBytes, totalBytes) => {
          const now = Date.now();
          if (now - lastBroadcastTime > 300 || sentBytes === totalBytes) {
            lastBroadcastTime = now;
            const uploadPct = Math.min(92, Math.round(40 + (sentBytes / totalBytes) * 52));
            const sentMB = (sentBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            broadcast('gdrive_upload_progress', {
              filename: targetFilename,
              step: 'uploading',
              percent: uploadPct,
              sentMB,
              totalMB,
              actualFileMB,
              message: `Mengunggah ke Google Drive: ${sentMB} MB / ${totalMB} MB (${uploadPct}%)`
            });
          }
        });

        if (isTempFile && fs.existsSync(uploadFilePath)) {
          try { fs.unlinkSync(uploadFilePath); } catch (_) {}
        }

        broadcast('gdrive_upload_progress', {
          filename: targetFilename,
          step: 'processing',
          percent: 96,
          message: 'Menyimpan dan memproses berkas di Google Drive...'
        });

        if (uploadData.success || uploadData.status === 'success' || uploadData.url) {
          const finalUrl = uploadData.url || uploadData.fileUrl || cfg.gdriveFolderUrl;
          appendLog(`[GDRIVE SUKSES] Video ${targetFilename} berhasil diunggah! Link: ${finalUrl}`);

          broadcast('gdrive_upload_progress', {
            filename: targetFilename,
            step: 'done',
            percent: 100,
            message: `Selesai! Video berhasil disimpan di Google Drive.`,
            url: finalUrl,
            folderUrl: cfg.gdriveFolderUrl
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            filename: targetFilename,
            url: finalUrl,
            folderUrl: cfg.gdriveFolderUrl
          }));
        } else {
          throw new Error(uploadData.error || uploadData.message || 'Gagal mengunggah ke Google Drive');
        }
      } catch (err) {
        appendLog(`[GDRIVE ERROR] ${err.message}`);
        broadcast('gdrive_upload_progress', {
          step: 'error',
          percent: 0,
          message: err.message
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 10. API: Get Transcript JSON
  if (pathname === '/api/transcript' && req.method === 'GET') {
    const filename = urlObj.searchParams.get('file');
    if (!filename) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parameter file wajib diisi' }));
      return;
    }

    const filePath = resolvePublicFilePath(filename);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File ${filename} tidak ditemukan` }));
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 11. API: Save Transcript JSON
  if (pathname === '/api/transcript' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, words } = JSON.parse(body);
        if (!filename || !Array.isArray(words)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Data tidak valid' }));
          return;
        }

        const filePath = resolvePublicFilePath(filename);
        fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
        appendLog(`[TRANSKRIPSI] Menyimpan ${words.length} kata ke public/${filename}`);
        syncBundlePublic();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: words.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 11b. API: Merge Word with Next Word
  if (pathname === '/api/transcript/merge' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, index } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File ${filename} tidak ditemukan` }));
          return;
        }

        const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const idx = parseInt(index, 10);
        if (idx < 0 || idx >= words.length - 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Indeks tidak valid untuk penggabungan kata' }));
          return;
        }

        const current = words[idx];
        const next = words[idx + 1];
        current.text = `${current.text.trimEnd()} ${next.text.trimStart()}`.trim();
        current.endMs = next.endMs;
        if (next.confidence && current.confidence) {
          current.confidence = Math.min(current.confidence, next.confidence);
        }

        words.splice(idx + 1, 1);
        fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
        appendLog(`[SUBTITLE GABUNG] Menggabungkan kata baris #${idx + 1} dengan baris bawah di ${filename}`);
        syncBundlePublic();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: words.length, words }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 11c. API: Split Word
  if (pathname === '/api/transcript/split' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, index, part1, part2 } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const idx = parseInt(index, 10);
        if (idx < 0 || idx >= words.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Indeks tidak valid' }));
          return;
        }

        const orig = words[idx];
        const totalDuration = orig.endMs - orig.startMs;
        const midMs = Math.round(orig.startMs + totalDuration / 2);

        const w1 = {
          ...orig,
          text: (part1 || orig.text).trim(),
          endMs: midMs,
        };
        const w2 = {
          ...orig,
          text: (part2 || '').trim(),
          startMs: midMs,
          endMs: orig.endMs,
        };

        words.splice(idx, 1, w1, w2);
        fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
        appendLog(`[SUBTITLE PISAH] Memisahkan kata baris #${idx + 1} di ${filename}`);
        syncBundlePublic();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: words.length, words }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 11d. API: Delete Word
  if (pathname === '/api/transcript/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, index } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const idx = parseInt(index, 10);
        if (idx < 0 || idx >= words.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Indeks tidak valid' }));
          return;
        }

        words.splice(idx, 1);
        fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
        appendLog(`[SUBTITLE HAPUS] Menghapus kata baris #${idx + 1} di ${filename}`);
        syncBundlePublic();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: words.length, words }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 11e. API: Auto-Correct Transcript via Reference Script (Gemini Naskah)
  if (pathname === '/api/transcript/auto-correct' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, referenceScript } = JSON.parse(body);
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameter filename wajib diisi' }));
          return;
        }

        const filePath = resolvePublicFilePath(filename);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File ${filename} tidak ditemukan` }));
          return;
        }

        const whisperWords = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { alignedWords, stats } = alignWhisperWithScript(whisperWords, referenceScript);

        fs.writeFileSync(filePath, JSON.stringify(alignedWords, null, 2), 'utf8');
        appendLog(`[AUTO-CORRECT] Mengoreksi ${stats.correctedCount} kata (${stats.mergedCount} gabung, ${stats.splitCount} pisah) di ${filename}`, true);
        syncBundlePublic();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: alignedWords.length, stats, words: alignedWords }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 12. API: Instant Frame Preview (renderStill)
  if (pathname === '/api/preview-still' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { productId, productData, variantKey, frame } = JSON.parse(body);
        const targetProduct = productData || productId || 'blackmores';
        const targetFrame = frame ? parseInt(frame, 10) : 60;
        const targetVariant = variantKey || 'v1';
        const prodName = productData?.name || productId;

        appendLog(`[PREVIEW] Merender pratinjau frame ${targetFrame} untuk ${prodName} (${targetVariant})...`);

        broadcast('still_progress', {
          isRendering: true,
          step: 'init',
          percent: 10,
          message: 'Mempersiapkan pratinjau frame...',
          frame: targetFrame,
          variantKey: targetVariant,
        });

        const result = await renderProductStill({
          productOrId: targetProduct,
          variantKey: targetVariant,
          frame: targetFrame,
          onLog: appendLog,
          onProgress: (prog) => {
            broadcast('still_progress', {
              isRendering: true,
              frame: targetFrame,
              variantKey: targetVariant,
              ...prog,
            });
          },
        });

        // Konversi frame ke Base64 Data URL & langsung hapus berkas temp dari disk!
        // Ini menjamin folder out/previews TIDAK PERNAH menimbun berkas gambar pratinjau.
        let previewDataUrl = '';
        if (result.previewPath && fs.existsSync(result.previewPath)) {
          const imgBuffer = fs.readFileSync(result.previewPath);
          previewDataUrl = `data:image/png;base64,${imgBuffer.toString('base64')}`;
          try {
            fs.unlinkSync(result.previewPath);
          } catch (_) {}
        }

        broadcast('still_progress', {
          isRendering: false,
          step: 'done',
          percent: 100,
          message: 'Pratinjau frame berhasil dibuat!',
          frame: targetFrame,
          variantKey: targetVariant,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          previewUrl: previewDataUrl,
        }));
      } catch (err) {
        appendLog(`[ERROR PREVIEW] ${err.message}`);
        broadcast('still_progress', {
          isRendering: false,
          step: 'error',
          percent: 0,
          message: `Gagal merender frame: ${err.message}`,
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 12b. API: Pratinjau Langsung (renderStill, diantrekan + di-cache)
  // Dipakai panel "Pratinjau Langsung" di Web Studio. Gambar yang dikembalikan dirender oleh
  // komposisi Remotion yang sama dengan render akhir, jadi tampilannya identik dengan video.
  if (pathname === '/api/preview-live' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const sendJson = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      try {
        if (renderState.isRendering) {
          return sendJson(409, { error: 'Render video sedang berjalan. Pratinjau dilanjutkan setelah render selesai.' });
        }
        const { productData, variantKey, frame } = JSON.parse(body);
        if (!productData) return sendJson(400, { error: 'productData wajib diisi.' });
        const targetFrame = Math.max(0, parseInt(frame, 10) || 0);
        const targetVariant = variantKey || 'v1';

        // Kunci cache menyertakan waktu ubah file JSON transkrip di public/, sehingga hasil lama
        // otomatis tidak dipakai setelah subtitle dikoreksi.
        let transcriptStamp = 0;
        try {
          const checkStamp = (dir) => {
            if (!fs.existsSync(dir)) return;
            for (const f of fs.readdirSync(dir)) {
              const fp = path.join(dir, f);
              const st = fs.statSync(fp);
              if (st.isDirectory()) {
                checkStamp(fp);
              } else if (f.toLowerCase().endsWith('.json')) {
                transcriptStamp = Math.max(transcriptStamp, st.mtimeMs);
              }
            }
          };
          checkStamp(PUBLIC_DIR);
        } catch (_) {}

        const key = crypto
          .createHash('sha1')
          .update(JSON.stringify({ productData, targetVariant, targetFrame, transcriptStamp }))
          .digest('hex');

        if (liveCache.has(key)) {
          return sendJson(200, { success: true, cached: true, previewUrl: liveCache.get(key) });
        }

        // Antrean berurutan: Chromium hanya merender satu frame pada satu waktu.
        const job = liveChain.then(async () => {
          const result = await renderProductStill({
            productOrId: productData,
            variantKey: targetVariant,
            frame: targetFrame,
            onLog: () => {},
            onProgress: () => {},
          });
          if (!result.previewPath || !fs.existsSync(result.previewPath)) {
            throw new Error('Frame pratinjau tidak ditemukan setelah render.');
          }
          const dataUrl = `data:image/png;base64,${fs.readFileSync(result.previewPath).toString('base64')}`;
          try { fs.unlinkSync(result.previewPath); } catch (_) {}
          return dataUrl;
        });
        liveChain = job.catch(() => {});

        const dataUrl = await job;
        liveCache.set(key, dataUrl);
        while (liveCache.size > LIVE_CACHE_MAX) liveCache.delete(liveCache.keys().next().value);
        sendJson(200, { success: true, cached: false, previewUrl: dataUrl });
      } catch (err) {
        appendLog(`[PREVIEW-LIVE] ${err.message}`);
        sendJson(500, { error: err.message });
      }
    });
    return;
  }

  // 13. API: Start Render (Pure Node via renderProductVariant)
  if (pathname === '/api/render' && req.method === 'POST') {
    if (renderState.isRendering) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proses render sedang berlangsung. Harap tunggu atau batalkan terlebih dahulu.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { productId, productData, target, fps, customOutputName, useGpu } = JSON.parse(body);

        let product;
        if (productData) {
          product = productData;
          if (productId) saveProduct(productId, productData);
        } else {
          product = loadProduct(productId || 'blackmores');
        }

        const resolvedTitle = (customOutputName || product.name).trim();

        renderState.isRendering = true;
        renderState.activeProduct = resolvedTitle;
        renderState.activeVariant = target || 'v1';
        renderState.fps = parseInt(fps || '60', 10);
        renderState.currentProgress = {
          step: 'Mempersiapkan Bundle & Props',
          frame: 0,
          totalFrames: 0,
          percent: 0,
          eta: 'Menghitung...',
        };

        broadcast('status', { isRendering: true, ...renderState.currentProgress });

        // Run render in background asynchronously
        (async () => {
          try {
            const variantsToRender = target === 'all'
              ? Object.keys(product.variants || {})
              : (target === '2' ? ['v2'] : (target === '1' ? ['v1'] : [target || 'v1']));

            const renderedOutputs = [];
            for (const vk of variantsToRender) {
              if (!renderState.isRendering) break; // cancelled
              appendLog(`[RENDER] Memulai rendering varian ${vk} untuk ${resolvedTitle}...`);
              
              const vResult = await renderProductVariant({
                productOrId: product,
                variantKey: vk,
                fpsOverride: renderState.fps,
                customOutputName: resolvedTitle,
                useGpu,
                onLog: appendLog,
                onProgress: (prog) => {
                  renderState.currentProgress = prog;
                  broadcast('progress', prog);
                },
              });
              if (vResult?.outFileName) renderedOutputs.push(vResult.outFileName);
            }

            renderState.isRendering = false;
            appendLog(`[RENDER SELESAI] Semua variasi berhasil diproduksi!`);
            broadcast('done', { code: 0, outputs: renderedOutputs });
          } catch (err) {
            renderState.isRendering = false;
            appendLog(`[RENDER ERROR] ${err.message}`);
            broadcast('done', { code: 1, error: err.message });
          }
        })();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Render dimulai di latar belakang' }));
      } catch (err) {
        renderState.isRendering = false;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 14. API: Cancel Render
  if (pathname === '/api/cancel' && req.method === 'POST') {
    if (renderState.isRendering) {
      appendLog('[WEB STUDIO] Membatalkan proses render...');
      renderState.isRendering = false;
      broadcast('done', { code: -1, cancelled: true });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Render dibatalkan' }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tidak ada proses render yang sedang berjalan' }));
    }
    return;
  }

  // 15. Static: Out Previews (Images)
  if (pathname.startsWith('/out/previews/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(OUT_DIR, 'previews', filename);
    serveStaticFile(req, res, filePath, 'image/png');
    return;
  }

  // 16. Static: Out Videos
  if (pathname.startsWith('/out/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(OUT_DIR, filename);
    serveStaticFile(req, res, filePath, 'video/mp4');
    return;
  }

  // 17. Static: Public Assets (supports nested public/products/<id>/...)
  if (pathname.startsWith('/public/')) {
    const rel = decodeURIComponent(pathname.slice('/public/'.length));
    const filePath = resolvePublicFilePath(rel);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
    };
    serveStaticFile(req, res, filePath, mimeMap[ext] || 'application/octet-stream');
    return;
  }

  // 18. Static: Web Frontend
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(req, res, path.join(WEB_DIR, 'index.html'), 'text/html; charset=utf-8');
    return;
  }
  if (pathname === '/app.css') {
    serveStaticFile(req, res, path.join(WEB_DIR, 'app.css'), 'text/css; charset=utf-8');
    return;
  }
  if (pathname === '/app.js') {
    serveStaticFile(req, res, path.join(WEB_DIR, 'app.js'), 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/favicon.svg' || pathname === '/favicon.ico') {
    serveStaticFile(req, res, path.join(WEB_DIR, 'favicon.svg'), 'image/svg+xml');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

// Handle unexpected stream / SSE socket errors cleanly without crashing
process.on('uncaughtException', (err) => {
  if (err.code === 'EOF' || err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  console.error('[UNCAUGHT ERROR]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎬 TikTok Affiliate Video Studio (Remotion 4.0 Pure Node)`);
  console.log(`🌐 Server berjalan di: http://localhost:${PORT}`);
  console.log(`   (Port 3000 bebas untuk Remotion Studio: npm run dev)`);
  console.log(`======================================================\n`);
});
