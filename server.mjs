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
import os from 'os';
import { renderProductVariant, renderProductStill, renderProductCover, syncPublicToBundle, syncSingleFileToCachedBundle, getOrBuildBundle, makeCancelSignal, cleanupRemotionTemp, warmupRemotionBrowser, closeRemotionBrowser } from './render.mjs';
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
const UPLOAD_HISTORY_PATH = path.join(__dirname, 'config', 'upload-history.json');

function loadUploadHistory() {
  try {
    if (!fs.existsSync(UPLOAD_HISTORY_PATH)) return {};
    const raw = fs.readFileSync(UPLOAD_HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUploadHistoryEntry(filename, entry) {
  if (!filename) return;
  try {
    const dir = path.dirname(UPLOAD_HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const history = loadUploadHistory();
    history[filename] = {
      ...(history[filename] || {}),
      ...entry,
      uploadedAt: entry.uploadedAt || new Date().toISOString()
    };
    fs.writeFileSync(UPLOAD_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[UPLOAD HISTORY] Gagal menyimpan riwayat:', err.message);
  }
}

function syncBundlePublic() {
  getOrBuildBundle().then(b => syncPublicToBundle(b)).catch(() => { });
}

function safeReplaceFile(src, dest) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.copyFileSync(src, dest);
      try { if (fs.existsSync(src)) fs.unlinkSync(src); } catch (_) { }
      return true;
    } catch (_) {
      try {
        fs.renameSync(src, dest);
        return true;
      } catch (_) { }
    }
    if (attempt < 2) {
      const start = Date.now();
      while (Date.now() - start < 100) { }
    }
  }
  return false;
}

const broadcastSSE = broadcast;

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

function cleanupOrphanedRenderFiles() {
  try {
    if (!fs.existsSync(OUT_DIR)) return;
    const files = fs.readdirSync(OUT_DIR);
    for (const f of files) {
      if (f.includes('.remotion-in-progress')) {
        try { fs.unlinkSync(path.join(OUT_DIR, f)); } catch (_) { }
      }
    }
  } catch (_) { }
}
cleanupOrphanedRenderFiles();

// Global Render State
const renderState = {
  isRendering: false,
  cancelToken: null,
  cancelFn: null,
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
  lastOutputs: [],
  lastError: null,
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

// =============================================================
// Integrasi Langsung ke Database Supabase (affiliate-list-video)
// =============================================================
function parseSimpleEnvFile(filePath) {
  const out = {};
  try {
    if (!fs.existsSync(filePath)) return out;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key) out[key] = val;
    }
  } catch (_) { }
  return out;
}

function resolveSupabaseCredentials() {
  const candidates = [
    {
      source: 'process.env',
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  ];

  const envPaths = [
    { source: '.env.local', file: path.join(__dirname, '.env.local') },
    { source: '.env', file: path.join(__dirname, '.env') },
    { source: 'affiliate-list-video/.env.local', file: path.resolve(__dirname, '../../affiliate-list-video/.env.local') },
    { source: 'affiliate-list-video/.env.local', file: path.resolve(__dirname, '../affiliate-list-video/.env.local') },
  ];

  for (const ep of envPaths) {
    const parsed = parseSimpleEnvFile(ep.file);
    if (parsed.SUPABASE_URL || parsed.NEXT_PUBLIC_SUPABASE_URL) {
      candidates.push({
        source: ep.source,
        url: parsed.SUPABASE_URL || parsed.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: parsed.SUPABASE_ANON_KEY || parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      });
    }
  }

  try {
    const cfg = loadConfig();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      candidates.push({
        source: 'config.json',
        url: cfg.supabaseUrl,
        anonKey: cfg.supabaseAnonKey,
      });
    }
  } catch (_) { }

  const found = candidates.find(c => c.url && c.anonKey);
  if (!found) {
    return { configured: false, url: '', anonKey: '', host: '', source: '' };
  }

  const cleanUrl = String(found.url).trim().replace(/\/+$/, '');
  let host = '';
  try {
    host = new URL(cleanUrl).host;
  } catch (_) {
    host = cleanUrl;
  }

  return {
    configured: true,
    url: cleanUrl,
    anonKey: String(found.anonKey).trim(),
    host,
    source: found.source,
  };
}

function parseRenderedVideoFilename(filename) {
  const cleanTitle = String(filename || '').replace(/\.mp4$/i, '').trim();

  let platformTarget = 'Multi-Platform';
  const platformMatch = cleanTitle.match(/\((Multi-Platform|TikTok|Reels|Shopee[^)]*)\)\s*$/i);
  if (platformMatch && platformMatch[1]) {
    platformTarget = platformMatch[1];
  }

  const withoutPlatform = cleanTitle
    .replace(/\s*\((Multi-Platform|TikTok|Reels|Shopee[^)]*)\)\s*$/i, '')
    .trim();

  let variantKey = '';
  const variantMatch = withoutPlatform.match(/\s+(v[12])$/i);
  if (variantMatch && variantMatch[1]) {
    variantKey = variantMatch[1].toLowerCase();
  }

  const baseProductName = withoutPlatform.replace(/\s+v[12]$/i, '').trim();

  return {
    cleanTitle,
    baseProductName,
    variantKey,
    platformTarget,
  };
}

function normalizeMatchKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildAffiliateVideoRecordInput(targetFilename, uploadMeta = {}) {
  const cfg = loadConfig();
  const parsed = parseRenderedVideoFilename(targetFilename);
  const normBase = normalizeMatchKey(parsed.baseProductName);

  let matchedProd = null;
  try {
    const summaries = listProducts();
    for (const item of summaries) {
      let detail = null;
      try {
        detail = loadProduct(item.id);
      } catch (_) {
        continue;
      }
      if (!detail) continue;
      const normDetailName = normalizeMatchKey(detail.name || item.name || '');
      const normCustom = normalizeMatchKey(detail.customOutputName || '');
      if (
        (normDetailName && normDetailName === normBase) ||
        (normCustom && normCustom === normBase) ||
        (normDetailName && normBase.includes(normDetailName)) ||
        (normDetailName && normDetailName.includes(normBase))
      ) {
        matchedProd = { ...detail, id: detail.id || item.id };
        break;
      }
    }
  } catch (_) { }

  const vKey = parsed.variantKey || 'v1';
  const variantObj = matchedProd?.variants?.[vKey] || null;
  const defaultWatermark = cfg.defaultWatermark || '@spillbyna | @inanikmatul01';
  const defaultFolderUrl = cfg.gdriveFolderUrl || 'https://drive.google.com/drive/my-drive';

  const candidateCover = uploadMeta.coverFilename || `${parsed.cleanTitle}-cover.jpg`;
  const hasLocalCover = fs.existsSync(path.join(OUT_DIR, candidateCover));

  return {
    title: parsed.cleanTitle,
    product_name: matchedProd?.name || parsed.baseProductName,
    variant_key: parsed.variantKey,
    variant_title: variantObj?.title || '',
    platform_target: parsed.platformTarget,
    watermark_text: variantObj?.watermarkText || defaultWatermark,
    is_uploaded: false,
    gdrive_video_url: uploadMeta.url || '',
    gdrive_thumbnail_url: uploadMeta.coverUrl || '',
    gdrive_caption_url: uploadMeta.captionUrl || '',
    gdrive_folder_url: uploadMeta.folderUrl || defaultFolderUrl,
    studio_product_id: matchedProd?.id || '',
    studio_video_filename: targetFilename,
    studio_cover_filename: (uploadMeta.coverUrl || hasLocalCover) ? candidateCover : '',
    caption_notes: variantObj?.tiktokCaption || variantObj?.voiceOverScript || '',
    upload_date: null,
  };
}

function generateNextCatalogCode(existingItems) {
  let maxNumber = 0;
  for (const item of existingItems) {
    const match = String(item?.catalog_code || '').match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  return `VID-${String(maxNumber + 1).padStart(3, '0')}`;
}

async function supabaseRestRequest(creds, method, queryPath, bodyObj = null) {
  const endpoint = `${creds.url}/rest/v1/${queryPath}`;
  const headers = {
    apikey: creds.anonKey,
    Authorization: `Bearer ${creds.anonKey}`,
    'Content-Type': 'application/json',
  };
  if (method !== 'GET') {
    headers.Prefer = 'return=representation';
  }

  const res = await fetch(endpoint, {
    method,
    headers,
    body: bodyObj !== null ? JSON.stringify(bodyObj) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!res.ok) {
    const errDetail = (data && typeof data === 'object' && (data.message || data.error || data.details))
      ? `${data.message || data.error}${data.details ? ` (${data.details})` : ''}`
      : String(text || `HTTP ${res.status}`).slice(0, 240);
    throw new Error(`Supabase API gagal (${res.status}): ${errDetail}`);
  }

  return data;
}

function resolveAffiliateWebUrl() {
  let raw = process.env.AFFILIATE_WEB_URL || '';
  if (!raw) {
    try {
      const cfg = loadConfig();
      raw = cfg.affiliateWebUrl || '';
    } catch (_) { }
  }
  return String(raw || 'https://affiliate-ina.vercel.app').trim().replace(/\/+$/, '');
}

async function upsertViaAffiliateWebApi(webBaseUrl, validEntries, logFn = appendLog) {
  const endpoint = `${webBaseUrl}/api/videos`;
  const batchPayloads = validEntries.map(({ filename, meta }) => ({
    filename,
    input: buildAffiliateVideoRecordInput(filename, meta),
  }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: batchPayloads.map(b => b.input) }),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!res.ok || !data || !Array.isArray(data.items)) {
    const detail = (data && data.error) ? data.error : String(text || `HTTP ${res.status}`).slice(0, 240);
    throw new Error(`Endpoint ${endpoint} gagal (${res.status}): ${detail}`);
  }

  const syncedAt = new Date().toISOString();
  const returnedItems = data.items;
  const results = [];
  let webHost = webBaseUrl;
  try { webHost = new URL(webBaseUrl).host; } catch (_) { }

  for (const { filename, input } of batchPayloads) {
    const inFile = String(input.studio_video_filename || '').toLowerCase();
    const inUrl = String(input.gdrive_video_url || '').trim();
    const inTitle = String(input.title || '').trim().toLowerCase();

    const savedRow = returnedItems.find(item => {
      if (inFile && item.studio_video_filename && String(item.studio_video_filename).toLowerCase() === inFile) return true;
      if (inUrl && item.gdrive_video_url && String(item.gdrive_video_url).trim() === inUrl) return true;
      return String(item.title || '').trim().toLowerCase() === inTitle;
    });

    const catalogCode = savedRow?.catalog_code || '';
    const supabaseId = savedRow?.id || '';

    saveUploadHistoryEntry(filename, {
      supabaseSynced: true,
      supabaseId,
      catalogCode,
      supabaseSyncedAt: syncedAt,
    });

    if (typeof logFn === 'function') {
      logFn(`[SUPABASE CLOUD] ${filename} tersimpan ke database via ${webHost}${catalogCode ? ` (${catalogCode})` : ''}.`);
    }

    results.push({
      filename,
      action: 'synced',
      id: supabaseId,
      catalogCode,
    });
  }

  return {
    ok: true,
    insertedCount: Number(data.insertedCount || 0),
    updatedCount: Number(data.updatedCount || 0),
    results,
  };
}

async function upsertVideosToAffiliateSupabase(entries, logFn = appendLog) {
  const validEntries = (Array.isArray(entries) ? entries : []).filter(
    e => e && e.filename && e.meta && String(e.meta.url || '').trim()
  );

  if (validEntries.length === 0) {
    return { ok: true, insertedCount: 0, updatedCount: 0, results: [] };
  }

  const creds = resolveSupabaseCredentials();
  const webBaseUrl = resolveAffiliateWebUrl();

  // Jika kredensial lokal .env.local kosong/tertimpa, gunakan API produksi affiliate-ina.vercel.app secara otomatis
  if (!creds.configured) {
    if (!webBaseUrl) {
      throw new Error('Kredensial Supabase maupun affiliateWebUrl belum dikonfigurasi.');
    }
    return upsertViaAffiliateWebApi(webBaseUrl, validEntries, logFn);
  }

  const existingRows = await supabaseRestRequest(
    creds,
    'GET',
    'affiliate_videos?select=*&order=created_at.desc'
  );
  let workingItems = Array.isArray(existingRows) ? [...existingRows] : [];

  let insertedCount = 0;
  let updatedCount = 0;
  const results = [];

  for (const { filename, meta } of validEntries) {
    const incoming = buildAffiliateVideoRecordInput(filename, meta);
    const incomingFile = (incoming.studio_video_filename || '').toLowerCase();
    const incomingDriveUrl = (incoming.gdrive_video_url || '').trim();
    const incomingTitle = (incoming.title || '').trim().toLowerCase();

    const existing = workingItems.find(item => {
      if (incomingFile && item.studio_video_filename && String(item.studio_video_filename).toLowerCase() === incomingFile) {
        return true;
      }
      if (incomingDriveUrl && item.gdrive_video_url && String(item.gdrive_video_url).trim() === incomingDriveUrl) {
        return true;
      }
      return String(item.title || '').trim().toLowerCase() === incomingTitle;
    });

    const syncedAt = new Date().toISOString();

    if (existing) {
      const patch = {
        product_name: incoming.product_name || existing.product_name || '',
        variant_key: incoming.variant_key || existing.variant_key || '',
        variant_title: incoming.variant_title || existing.variant_title || '',
        platform_target: incoming.platform_target || existing.platform_target || 'Multi-Platform',
        watermark_text: incoming.watermark_text || existing.watermark_text || '',
        gdrive_video_url: incoming.gdrive_video_url || existing.gdrive_video_url || '',
        gdrive_thumbnail_url: incoming.gdrive_thumbnail_url || existing.gdrive_thumbnail_url || '',
        gdrive_caption_url: incoming.gdrive_caption_url || existing.gdrive_caption_url || '',
        gdrive_folder_url: incoming.gdrive_folder_url || existing.gdrive_folder_url || '',
        studio_product_id: incoming.studio_product_id || existing.studio_product_id || '',
        studio_video_filename: incoming.studio_video_filename || existing.studio_video_filename || '',
        studio_cover_filename: incoming.studio_cover_filename || existing.studio_cover_filename || '',
        caption_notes: existing.caption_notes || incoming.caption_notes || '',
        updated_at: syncedAt,
      };

      const updatedArr = await supabaseRestRequest(
        creds,
        'PATCH',
        `affiliate_videos?id=eq.${encodeURIComponent(existing.id)}`,
        patch
      );
      const savedRow = (Array.isArray(updatedArr) && updatedArr[0]) ? updatedArr[0] : { ...existing, ...patch };
      workingItems = workingItems.map(it => (it.id === existing.id ? savedRow : it));
      updatedCount++;

      saveUploadHistoryEntry(filename, {
        supabaseSynced: true,
        supabaseId: savedRow.id,
        catalogCode: savedRow.catalog_code || existing.catalog_code || '',
        supabaseSyncedAt: syncedAt,
      });

      if (typeof logFn === 'function') {
        logFn(`[SUPABASE UPDATE] ${filename} diperbarui di affiliate_videos (${savedRow.catalog_code || existing.catalog_code}).`);
      }

      results.push({
        filename,
        action: 'updated',
        id: savedRow.id,
        catalogCode: savedRow.catalog_code || existing.catalog_code || '',
      });
    } else {
      const catalogCode = generateNextCatalogCode(workingItems);
      const insertPayload = {
        ...incoming,
        catalog_code: catalogCode,
      };

      const createdArr = await supabaseRestRequest(
        creds,
        'POST',
        'affiliate_videos',
        insertPayload
      );
      const savedRow = (Array.isArray(createdArr) && createdArr[0]) ? createdArr[0] : { ...insertPayload };
      workingItems = [savedRow, ...workingItems];
      insertedCount++;

      saveUploadHistoryEntry(filename, {
        supabaseSynced: true,
        supabaseId: savedRow.id || '',
        catalogCode: savedRow.catalog_code || catalogCode,
        supabaseSyncedAt: syncedAt,
      });

      if (typeof logFn === 'function') {
        logFn(`[SUPABASE INSERT] ${filename} ditambahkan ke affiliate_videos (${savedRow.catalog_code || catalogCode}).`);
      }

      results.push({
        filename,
        action: 'inserted',
        id: savedRow.id || '',
        catalogCode: savedRow.catalog_code || catalogCode,
      });
    }
  }

  return {
    ok: true,
    insertedCount,
    updatedCount,
    results,
  };
}

// =============================================================
// Real-time File System Watcher & Live Browser Synchronization
// Mendeteksi berkas yang ditambah / dihapus / diubah di folder:
// - public/ (assets: audio, video, json, image, font, sfx)
// - products/ (daftar konfigurasi json produk)
// - out/ (video render MP4, cover JPG, preview frame)
// Browser akan otomatis memperbarui daftar tanpa perlu refresh (F5).
// =============================================================
const fileWatcher = (() => {
  const watchTargets = [
    { dir: PUBLIC_DIR, scope: 'assets' },
    { dir: PRODUCTS_DIR, scope: 'products' },
    { dir: OUT_DIR, scope: 'videos' },
  ];

  let debounceTimer = null;
  const pendingScopes = new Set();
  const watchers = [];

  function notifyFileChange(scope, filename = '') {
    if (filename) {
      const lower = filename.toLowerCase();
      // Filter out temporary / noisy internal files
      if (
        lower.startsWith('.') ||
        lower.includes('/.') ||
        lower.includes('\\.') ||
        lower.includes('.remotion-in-progress') ||
        lower.includes('.crdownload') ||
        lower.includes('.part') ||
        lower.endsWith('.tmp') ||
        lower.endsWith('.swp') ||
        lower.startsWith('~')
      ) {
        return;
      }
    }

    pendingScopes.add(scope);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const scopes = Array.from(pendingScopes);
      pendingScopes.clear();
      if (scopes.length === 0) return;

      if (scopes.includes('assets')) {
        // Jangan panggil syncBundlePublic() di sini karena fs.cpSync sinkron memblokir server;
        // render.mjs sudah otomatis menyinkronkan public/ saat render/preview dijalankan.
      }

      broadcast('files_changed', {
        scopes,
        timestamp: Date.now(),
      });
    }, 300);
  }

  for (const { dir, scope } of watchTargets) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const w = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        notifyFileChange(scope, filename ? filename.replace(/\\/g, '/') : '');
      });
      watchers.push(w);
    } catch (err) {
      console.warn(`[WATCHER WARN] Gagal memantau direktori ${dir}:`, err.message);
    }
  }

  return { notifyFileChange, watchers };
})();

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
      lastOutputs: renderState.lastOutputs || [],
      lastError: renderState.lastError || null,
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
        fileWatcher.notifyFileChange('products', saved.id);
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
      fileWatcher.notifyFileChange('products', id);
      if (deleteAssets) fileWatcher.notifyFileChange('assets', id);
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
      const images = [];

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
              } catch { }
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
          } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
            images.push({
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
        } catch { }
      }
      for (const vo of voiceOvers) {
        if (/bgm|music|backsound|soundtrack|instrumental/i.test(vo.name)) {
          bgms.push({ name: vo.name, displayName: vo.displayName || vo.name });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ voiceOvers, videos, transcripts, bgms, images }));
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
    const tempPath = `${targetPath}.part`;

    appendLog(`[UPLOAD] Menerima unggahan file: public/${relPath}...`);
    // Gunakan buffer 4MB dan tulis ke file .part terlebih dahulu agar fs.watch tidak memicu scan/sync di tengah upload
    const writeStream = fs.createWriteStream(tempPath, { highWaterMark: 4 * 1024 * 1024 });

    const cleanupTemp = () => {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) { }
    };

    req.on('aborted', () => {
      writeStream.destroy();
      cleanupTemp();
    });

    req.pipe(writeStream);
    writeStream.on('finish', async () => {
      try {
        await fs.promises.rename(tempPath, targetPath);
        const stat = await fs.promises.stat(targetPath);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
        appendLog(`[UPLOAD] File tersimpan: public/${relPath} (${sizeMB} MB)`);
        syncSingleFileToCachedBundle(relPath);
        fileWatcher.notifyFileChange('assets', relPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, filename: relPath, sizeMB }));
      } catch (err) {
        cleanupTemp();
        appendLog(`[ERROR] Gagal memfinalisasi unggahan: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    writeStream.on('error', (err) => {
      cleanupTemp();
      appendLog(`[ERROR] Gagal menyimpan unggahan: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
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
            } catch { }
          }
          appendLog(`[WHISPER] Transkripsi selesai (code ${code}). Kata tersinkron: ${wordsCount}`);
          syncBundlePublic();
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
            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) { }
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
                  const timer = setTimeout(() => {
                    appendLog(`[WARN] FFmpeg potong napas timeout 20s, lanjut ke Whisper.`);
                    try { child.kill(); } catch (_) { }
                    resolve();
                  }, 20000);

                  child.on('error', err => {
                    clearTimeout(timer);
                    appendLog(`[WARN] FFmpeg error: ${err.message}`);
                    resolve();
                  });

                  child.on('close', code => {
                    clearTimeout(timer);
                    try {
                      if (code === 0 && fs.existsSync(tempPath)) {
                        const replaced = safeReplaceFile(tempPath, inputPath);
                        if (!replaced) {
                          appendLog(`[WARN] File audio sedang dipakai browser/aplikasi lain, pemotongan napas dilewati.`);
                        } else {
                          syncBundlePublic();
                          const newDur = getVideoDurationSec(relFilename) || oldDur;
                          appendLog(`[SMART-VO 1/3] Jeda napas dipotong: ${oldDur.toFixed(1)}s → ${newDur.toFixed(1)}s`);
                        }
                      } else {
                        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) { }
                        appendLog(`[SMART-VO 1/3] Lewati potong napas (FFmpeg kode ${code})`);
                      }
                    } catch (e) {
                      appendLog(`[WARN] Potong napas gagal: ${e.message}`);
                    } finally {
                      resolve();
                    }
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
              const timer = setTimeout(() => {
                appendLog(`[WARN] Whisper AI melebihi batas waktu 120s.`);
                try { child.kill(); } catch (_) { }
                resolve();
              }, 120000);

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
              child.on('error', err => {
                clearTimeout(timer);
                appendLog(`[ERROR] Gagal memanggil Whisper: ${err.message}`);
                resolve();
              });
              child.on('close', code => {
                clearTimeout(timer);
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
              const relJsonFile = path.relative(PUBLIC_DIR, jsonPath).replace(/\\/g, '/');

              // Broadcast SSE ke browser agar reload otomatis
              broadcast('transcribe-done', {
                file: relFilename,
                filename: relFilename,
                jsonFile: relJsonFile,
                wordsCount
              });
            }

            appendLog(`[SMART-VO] Selesai sempurna! ${wordsCount} kata siap dipakai untuk subtitle karaoke.`, true);
          } catch (err) {
            appendLog(`[SMART-VO ERROR] ${err.message}`);
            broadcast('transcribe-error', { file: relFilename, error: err.message });
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
      const allOutFiles = fs.readdirSync(OUT_DIR);
      const files = allOutFiles.filter(f => f.endsWith('.mp4'));
      const videoList = files.map(name => {
        const fullPath = path.join(OUT_DIR, name);
        const stat = fs.statSync(fullPath);
        const baseName = name.replace(/\.mp4$/i, '');
        const candidateCover = `${baseName}-cover.jpg`;
        const hasCover = allOutFiles.includes(candidateCover);
        return {
          name,
          size: stat.size,
          mtime: stat.mtimeMs,
          coverFile: hasCover ? candidateCover : null,
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
      const baseNoExt = safeFilename.replace(/\.mp4$/i, '');
      const coverPath = path.join(OUT_DIR, `${baseNoExt}-cover.jpg`);
      if (fs.existsSync(coverPath)) {
        try { fs.unlinkSync(coverPath); } catch (_) { }
      }
      appendLog(`[HAPUS] Video out/${safeFilename} berhasil dihapus.`);
      fileWatcher.notifyFileChange('videos', safeFilename);
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
      fileWatcher.notifyFileChange('videos', safeFilename);
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
      syncBundlePublic();
      appendLog(`[HAPUS] Berkas public/${normalizedFile} berhasil dihapus.`);
      fileWatcher.notifyFileChange('assets', normalizedFile);
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
  function streamFileToGoogleDrive(sessionUrl, fullPath, mimeType = 'video/mp4', onProgress) {
    if (typeof mimeType === 'function') {
      onProgress = mimeType;
      mimeType = 'video/mp4';
    }
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
            'Content-Type': mimeType || 'video/mp4'
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

  // Helper: Upload companion file (cover image) to Google Drive
  async function uploadCompanionFileToDrive({ filename, fullPath, mimeType = 'image/jpeg', label = 'COVER', webhookUrl, cfg, appendLog }) {
    const stat = fs.statSync(fullPath);
    const sizeKB = Math.max(1, Math.round(stat.size / 1024));
    appendLog(`[GDRIVE ${label}] Memulai upload ${filename} (${sizeKB} KB)...`);

    // 1. Coba Resumable Session lebih dulu
    let sessionUrl = null;
    try {
      const initRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          filename,
          fileSize: stat.size,
          mimeType,
          folderId: '1PfohGzGpodBfZNutWbgZXSlryqu3Xw2D'
        })
      });
      const initText = await initRes.text();
      try {
        const initData = JSON.parse(initText);
        if (initData.success && initData.sessionUrl) {
          sessionUrl = initData.sessionUrl;
        }
      } catch (_) { }
    } catch (_) { }

    if (sessionUrl) {
      appendLog(`[GDRIVE ${label}] Mengunggah via Resumable API direct...`);
      const driveFile = await streamFileToGoogleDrive(sessionUrl, fullPath, mimeType);
      const finalFileId = driveFile.id;
      const finalUrl = finalFileId ? `https://drive.google.com/file/d/${finalFileId}/view` : cfg.gdriveFolderUrl;
      appendLog(`[GDRIVE ${label} SUKSES] ${filename} tersimpan! Link: ${finalUrl}`);
      return { success: true, url: finalUrl };
    }

    // 2. Fallback Base64
    appendLog(`[GDRIVE ${label}] Mengunggah via streaming payload...`);
    const fileBuf = fs.readFileSync(fullPath);
    const params = new URLSearchParams();
    params.append('data', fileBuf.toString('base64'));
    params.append('filename', filename);
    params.append('mimetype', mimeType);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const resText = await res.text();
    let data = {};
    try { data = JSON.parse(resText); } catch (_) { }

    if (data.success || data.status === 'success' || data.url) {
      const finalUrl = data.url || data.fileUrl || cfg.gdriveFolderUrl;
      appendLog(`[GDRIVE ${label} SUKSES] ${filename} tersimpan! Link: ${finalUrl}`);
      return { success: true, url: finalUrl };
    } else {
      throw new Error(data.error || data.message || `Gagal mengunggah ${filename}`);
    }
  }

  async function finalizeGDriveUpload({
    targetFilename,
    finalUrl,
    hasCover,
    candidateCover,
    coverFullPath,
    webhookUrl,
    cfg,
    appendLog,
    defaultDoneMsg
  }) {
    let coverResult = null;
    if (hasCover) {
      broadcast('gdrive_upload_progress', {
        filename: targetFilename,
        step: 'uploading_cover',
        percent: 94,
        message: `Video terunggah. Mengunggah companion cover thumbnail (${candidateCover})...`
      });
      try {
        coverResult = await uploadCompanionFileToDrive({
          filename: candidateCover,
          fullPath: coverFullPath,
          mimeType: 'image/jpeg',
          label: 'COVER',
          webhookUrl,
          cfg,
          appendLog
        });
      } catch (coverErr) {
        appendLog(`[GDRIVE WARN] Gagal mengunggah cover ${candidateCover}: ${coverErr.message}`);
      }
    }

    const coverUploaded = Boolean(coverResult?.success);
    const historyMeta = {
      url: finalUrl,
      coverUrl: coverResult?.url || null,
      coverFilename: hasCover ? candidateCover : null,
      coverUploaded,
      folderUrl: cfg.gdriveFolderUrl
    };

    saveUploadHistoryEntry(targetFilename, historyMeta);

    // Otomatis simpan / perbarui ke database Supabase (langsung atau via API affiliate-ina.vercel.app)
    let supabaseSynced = false;
    let catalogCode = '';
    let supabaseAction = '';
    let supabaseError = null;

    const supaCreds = resolveSupabaseCredentials();
    const webBridgeUrl = resolveAffiliateWebUrl();
    if (supaCreds.configured || webBridgeUrl) {
      broadcast('gdrive_upload_progress', {
        filename: targetFilename,
        step: 'syncing_supabase',
        percent: 98,
        message: 'Menyimpan metadata video ke database affiliate-list-video...'
      });
      try {
        const syncRes = await upsertVideosToAffiliateSupabase(
          [{ filename: targetFilename, meta: historyMeta }],
          appendLog
        );
        const firstItem = syncRes.results?.[0];
        if (firstItem) {
          supabaseSynced = true;
          catalogCode = firstItem.catalogCode || '';
          supabaseAction = firstItem.action || 'synced';
        }
      } catch (supaErr) {
        supabaseError = supaErr.message;
        appendLog(`[SUPABASE WARN] Gagal menyinkronkan ${targetFilename} ke database: ${supaErr.message}`);
      }
    } else {
      appendLog(`[SUPABASE WARN] Sinkronisasi dilewati karena kredensial Supabase dan affiliateWebUrl kosong.`);
    }

    const baseDoneMsg = coverUploaded
      ? 'Selesai! Video dan Cover berhasil disimpan di Google Drive'
      : defaultDoneMsg.replace(/\.$/, '');
    const doneMsg = supabaseSynced
      ? `${baseDoneMsg} serta tercatat di Supabase (${catalogCode}).`
      : `${baseDoneMsg}.`;

    broadcast('gdrive_upload_progress', {
      filename: targetFilename,
      step: 'done',
      percent: 100,
      message: doneMsg,
      url: finalUrl,
      coverUrl: coverResult?.url || null,
      coverFilename: hasCover ? candidateCover : null,
      coverUploaded,
      folderUrl: cfg.gdriveFolderUrl,
      supabaseSynced,
      catalogCode,
      supabaseAction,
      supabaseError
    });

    return {
      success: true,
      filename: targetFilename,
      url: finalUrl,
      coverUrl: coverResult?.url || null,
      coverUploaded,
      folderUrl: cfg.gdriveFolderUrl,
      supabaseSynced,
      catalogCode,
      supabaseAction,
      supabaseError
    };
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

        const baseName = targetFilename.replace(/\.mp4$/i, '');
        const candidateCover = `${baseName}-cover.jpg`;
        const coverFullPath = path.join(OUT_DIR, candidateCover);
        const hasCover = fs.existsSync(coverFullPath);

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
          } catch (_) { }
        } catch (_) { }

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

          const payload = await finalizeGDriveUpload({
            targetFilename,
            finalUrl,
            hasCover,
            candidateCover,
            coverFullPath,
            webhookUrl,
            cfg,
            appendLog,
            defaultDoneMsg: `Selesai! File asli 100% (${originalMB} MB) tersimpan di Google Drive tanpa kompresi.`
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ...payload,
            uncompressed: true,
            sizeMB: originalMB
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
          try { fs.unlinkSync(uploadFilePath); } catch (_) { }
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

          const payload = await finalizeGDriveUpload({
            targetFilename,
            finalUrl,
            hasCover,
            candidateCover,
            coverFullPath,
            webhookUrl,
            cfg,
            appendLog,
            defaultDoneMsg: `Selesai! Video berhasil disimpan di Google Drive.`
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
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
        const { filename, index, words: clientWords } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File ${filename} tidak ditemukan` }));
          return;
        }

        const words = Array.isArray(clientWords) && clientWords.length > 0
          ? clientWords
          : JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
        const { filename, index, part1, part2, words: clientWords } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        const words = Array.isArray(clientWords) && clientWords.length > 0
          ? clientWords
          : JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
        const { filename, index, words: clientWords } = JSON.parse(body);
        const filePath = resolvePublicFilePath(filename);
        const words = Array.isArray(clientWords) && clientWords.length > 0
          ? clientWords
          : JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
        const { productId, productData, variantKey, frame, renderMode } = JSON.parse(body);
        const targetProduct = productData || productId || 'blackmores';
        const targetFrame = renderMode === 'cover' ? 0 : (frame ? parseInt(frame, 10) : 60);
        const targetVariant = variantKey || 'v1';
        const prodName = productData?.name || productId;

        appendLog(`[PREVIEW] Merender pratinjau ${renderMode === 'cover' ? 'cover' : `frame ${targetFrame}`} untuk ${prodName} (${targetVariant})...`);

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
          renderMode,
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
          } catch (_) { }
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
        const { productData, variantKey, frame, renderMode } = JSON.parse(body);
        if (!productData) return sendJson(400, { error: 'productData wajib diisi.' });
        const targetMode = renderMode === 'cover' ? 'cover' : 'video';
        const targetFrame = targetMode === 'cover' ? 0 : Math.max(0, parseInt(frame, 10) || 0);
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
              } else if (f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.tsx') || f.toLowerCase().endsWith('.ts')) {
                transcriptStamp = Math.max(transcriptStamp, st.mtimeMs);
              }
            }
          };
          checkStamp(PUBLIC_DIR);
          checkStamp(path.join(__dirname, 'src'));
        } catch (_) { }

        const key = crypto
          .createHash('sha1')
          .update(JSON.stringify({ productData, targetVariant, targetFrame, targetMode, transcriptStamp }))
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
            renderMode: targetMode,
            onLog: () => { },
            onProgress: () => { },
          });
          if (!result.previewPath || !fs.existsSync(result.previewPath)) {
            throw new Error('Frame pratinjau tidak ditemukan setelah render.');
          }
          const dataUrl = `data:image/png;base64,${fs.readFileSync(result.previewPath).toString('base64')}`;
          try { fs.unlinkSync(result.previewPath); } catch (_) { }
          return dataUrl;
        });
        liveChain = job.catch(() => { });

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

  // 12c. API: Render Cover / Thumbnail JPG (1080x1920) ke out/
  if (pathname === '/api/render-cover' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const sendJson = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      try {
        const { productId, productData, variantKey, customOutputName, videoName, imageDataUrl } = JSON.parse(body || '{}');

        let targetProduct = productData || (productId ? loadProduct(productId) : null);
        let targetVariant = variantKey;
        let targetOutputName = customOutputName;

        let detectedPlatformSuffix = '';
        if (!targetProduct && videoName) {
          const cleanName = path.basename(videoName).replace(/\.mp4$/i, '');
          const match = cleanName.match(/^(.*?)\s+(v\d+)(?:\s*\((.*?)\))?$/i);
          const parsedTitle = match ? match[1].trim() : cleanName;
          const parsedVariant = match ? match[2].toLowerCase() : 'v1';
          if (match && match[3]) detectedPlatformSuffix = ` (${match[3].trim()})`;
          if (!targetVariant) targetVariant = parsedVariant;
          if (!targetOutputName) targetOutputName = parsedTitle;

          // Cari di daftar produk
          const productList = listProducts();
          const found = productList.find(p => p.name.trim().toLowerCase() === parsedTitle.toLowerCase())
            || productList.find(p => parsedTitle.toLowerCase().includes(p.name.trim().toLowerCase()) || p.name.trim().toLowerCase().includes(parsedTitle.toLowerCase()));
          if (found) {
            targetProduct = loadProduct(found.id);
          } else {
            targetProduct = { id: 'custom', name: parsedTitle, variants: {} };
          }
        }

        if (!targetProduct) {
          const allProds = listProducts();
          targetProduct = allProds.length > 0 ? loadProduct(allProds[0].id) : { id: 'default', name: 'Produk', variants: {} };
        }
        if (!targetVariant) targetVariant = 'v1';
        if (productId && productData) saveProduct(productId, productData);

        // Safety guard: jika targetOutputName milik produk lain, kembalikan ke targetProduct.name
        if (targetOutputName && targetProduct && targetOutputName.toLowerCase() !== (targetProduct.name || '').trim().toLowerCase()) {
          try {
            const allProducts = listProducts();
            const activeId = productId || targetProduct.id;
            const matchedOther = allProducts.find(p =>
              p.id !== activeId &&
              (p.name.trim().toLowerCase() === targetOutputName.toLowerCase() || p.id === targetOutputName)
            );
            if (matchedOther) {
              appendLog(`[SAFETY] Cover targetOutputName "${targetOutputName}" terdeteksi milik produk lain (${matchedOther.name}). Mengalihkan ke "${targetProduct.name}".`);
              targetOutputName = targetProduct.name;
            }
          } catch (e) { }
        }

        // Jalur Instan (< 20ms): jika kanvas thumbnail mengirimkan imageDataUrl JPEG 1080x1920 langsung
        if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/jpeg;base64,')) {
          if (!fs.existsSync(OUT_DIR)) {
            fs.mkdirSync(OUT_DIR, { recursive: true });
          }
          const rawTitle = targetOutputName || targetProduct.name || 'Produk';
          let cleanProductName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
          const vRegex = new RegExp(`\\s+${targetVariant}(?:\\s*\\([^)]+\\))?$`, 'i');
          cleanProductName = cleanProductName.replace(vRegex, '').trim();
          const coverFileName = `${cleanProductName} ${targetVariant}${detectedPlatformSuffix}-cover.jpg`;
          const coverLocation = path.join(OUT_DIR, coverFileName);
          const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');
          await fs.promises.writeFile(coverLocation, Buffer.from(base64Data, 'base64'));
          appendLog(`[COVER INSTAN] Thumbnail disimpan ke: out/${coverFileName}`);
          fileWatcher.notifyFileChange('videos', coverFileName);
          sendJson(200, {
            success: true,
            coverFileName,
            coverUrl: `/out/${encodeURIComponent(coverFileName)}`,
          });
          return;
        }

        const job = liveChain.then(async () => {
          return await renderProductCover({
            productOrId: targetProduct,
            variantKey: targetVariant,
            customOutputName: targetOutputName || targetProduct.name,
            platformSuffix: detectedPlatformSuffix,
            onLog: appendLog,
            onProgress: () => { },
          });
        });
        liveChain = job.catch(() => { });

        const result = await job;
        sendJson(200, {
          success: true,
          coverFileName: result.coverFileName,
          coverUrl: `/out/${encodeURIComponent(result.coverFileName)}`,
        });
      } catch (err) {
        appendLog(`[ERROR COVER] ${err.message}`);
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
        const { productId, productData, target, fps, customOutputName, useGpu, quality, autoRenderCover } = JSON.parse(body);

        let product;
        if (productData) {
          product = productData;
          if (productId) saveProduct(productId, productData);
        } else {
          product = loadProduct(productId || 'blackmores');
        }

        let resolvedTitle = (customOutputName || product.name || 'video').trim();

        // Safety guard: jika customOutputName adalah nama produk LAIN yang tersimpan di server,
        // cegah video tersimpan ke nama produk sebelumnya dan kembalikan ke product.name
        if (resolvedTitle && resolvedTitle.toLowerCase() !== (product.name || '').trim().toLowerCase()) {
          try {
            const allProducts = listProducts();
            const activeId = productId || product.id;
            const matchedOther = allProducts.find(p =>
              p.id !== activeId &&
              (p.name.trim().toLowerCase() === resolvedTitle.toLowerCase() || p.id === resolvedTitle)
            );
            if (matchedOther) {
              appendLog(`[SAFETY] customOutputName "${resolvedTitle}" terdeteksi milik produk lain (${matchedOther.name} [${matchedOther.id}]). Mengalihkan nama berkas kembali ke produk aktif: "${product.name}".`, true);
              resolvedTitle = (product.name || 'video').trim();
            }
          } catch (e) {
            // Ignore safety guard check error
          }
        }

        renderState.isRendering = true;
        renderState.activeProduct = resolvedTitle;
        renderState.activeVariant = target || 'v1';
        renderState.fps = parseInt(fps || '60', 10);
        renderState.lastOutputs = [];
        renderState.lastError = null;
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

              const { cancelSignal, cancel } = makeCancelSignal();
              renderState.cancelFn = cancel;

              const vResult = await renderProductVariant({
                productOrId: product,
                variantKey: vk,
                fpsOverride: renderState.fps,
                customOutputName: resolvedTitle,
                useGpu,
                quality,
                autoRenderCover: autoRenderCover !== false,
                cancelSignal,
                onLog: appendLog,
                onProgress: (prog) => {
                  renderState.currentProgress = prog;
                  broadcast('progress', prog);
                },
              });
              if (vResult?.outFileName) renderedOutputs.push(vResult.outFileName);
            }

            renderState.cancelFn = null;
            if (!renderState.isRendering) {
              cleanupOrphanedRenderFiles();
              return;
            }
            renderState.lastOutputs = renderedOutputs;
            renderState.isRendering = false;
            appendLog(`[RENDER SELESAI] Semua variasi berhasil diproduksi!`);
            broadcast('done', { code: 0, outputs: renderedOutputs });
          } catch (err) {
            renderState.cancelFn = null;
            cleanupOrphanedRenderFiles();
            if (!renderState.isRendering) return; // already handled by cancel
            renderState.lastError = err.message;
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
      if (typeof renderState.cancelFn === 'function') {
        try { renderState.cancelFn(); } catch (_) { }
        renderState.cancelFn = null;
      }
      setTimeout(cleanupOrphanedRenderFiles, 800);
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

  // 16. Static: Out Videos & Covers
  if (pathname.startsWith('/out/')) {
    const filename = path.basename(decodeURIComponent(pathname));
    const filePath = path.join(OUT_DIR, filename);
    const ext = path.extname(filePath).toLowerCase();
    const outMime = {
      '.mp4': 'video/mp4',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }[ext] || 'video/mp4';
    serveStaticFile(req, res, filePath, outMime);
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

  // 17b. Static: Dedicated Merger Workspace (merger/inputs & merger/outputs)
  if (pathname.startsWith('/merger/inputs/') || pathname.startsWith('/merger/outputs/')) {
    const isOut = pathname.startsWith('/merger/outputs/');
    const subDir = isOut ? path.join(__dirname, 'merger', 'outputs') : path.join(__dirname, 'merger', 'inputs');
    const filename = path.basename(decodeURIComponent(pathname));
    const filePath = path.resolve(subDir, filename);
    if (!filePath.startsWith(subDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Akses ditolak');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
    };
    serveStaticFile(req, res, filePath, mimeMap[ext] || 'video/mp4');
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

  if (pathname === '/api/upload-history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadUploadHistory()));
    return;
  }

  if (pathname === '/api/supabase-status' && req.method === 'GET') {
    const creds = resolveSupabaseCredentials();
    const webBaseUrl = resolveAffiliateWebUrl();
    const shouldPing = urlObj.searchParams.get('ping') === '1';

    if (!creds.configured && webBaseUrl) {
      let webHost = webBaseUrl;
      try { webHost = new URL(webBaseUrl).host; } catch (_) { }
      if (!shouldPing) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ configured: true, connected: true, mode: 'vercel-api', host: webHost, source: 'config.affiliateWebUrl' }));
        return;
      }
      try {
        const pingRes = await fetch(`${webBaseUrl}/api/videos`);
        const pingJson = await pingRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          configured: true,
          connected: pingRes.ok && Array.isArray(pingJson?.items),
          mode: 'vercel-api',
          host: webHost,
          source: 'config.affiliateWebUrl',
          totalRows: Array.isArray(pingJson?.items) ? pingJson.items.length : 0,
        }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          configured: true,
          connected: false,
          mode: 'vercel-api',
          host: webHost,
          source: 'config.affiliateWebUrl',
          error: err.message,
        }));
      }
      return;
    }

    if (!creds.configured) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ configured: false, connected: false, host: '', source: '' }));
      return;
    }
    if (!shouldPing) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ configured: true, connected: true, host: creds.host, source: creds.source }));
      return;
    }

    try {
      const rows = await supabaseRestRequest(creds, 'GET', 'affiliate_videos?select=id&order=created_at.desc');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        configured: true,
        connected: true,
        host: creds.host,
        source: creds.source,
        totalRows: Array.isArray(rows) ? rows.length : 0,
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        configured: true,
        connected: false,
        host: creds.host,
        source: creds.source,
        error: err.message,
      }));
    }
    return;
  }

  if (pathname === '/api/supabase-sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const history = loadUploadHistory();
        const targetVideo = payload.videoName ? path.basename(String(payload.videoName)) : '';

        let entries = [];
        if (targetVideo) {
          const histEntry = history[targetVideo];
          if (!histEntry || !histEntry.url) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: `Video "${targetVideo}" belum memiliki link Google Drive. Unggah ke Google Drive terlebih dahulu.`
            }));
            return;
          }
          entries = [{ filename: targetVideo, meta: histEntry }];
        } else {
          const forceAll = Boolean(payload.forceAll);
          entries = Object.entries(history)
            .filter(([, info]) => {
              if (!info || typeof info !== 'object' || !String(info.url || '').trim()) return false;
              return forceAll ? true : !info.supabaseSynced;
            })
            .map(([fname, info]) => ({ filename: fname, meta: info }));
        }

        if (entries.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            insertedCount: 0,
            updatedCount: 0,
            totalProcessed: 0,
            results: [],
            history: loadUploadHistory(),
          }));
          return;
        }

        appendLog(`[SUPABASE SYNC] Menyinkronkan ${entries.length} video Google Drive ke database affiliate_videos...`);
        const syncRes = await upsertVideosToAffiliateSupabase(entries, appendLog);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          insertedCount: syncRes.insertedCount,
          updatedCount: syncRes.updatedCount,
          totalProcessed: syncRes.results.length,
          results: syncRes.results,
          history: loadUploadHistory(),
        }));
      } catch (err) {
        appendLog(`[SUPABASE ERROR] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/cleanup-temp' && req.method === 'POST') {
    const result = cleanupRemotionTemp({
      maxAgeMs: 0, // hapus semua temp remotion yang sudah tidak dipakai
      onLog: (msg) => appendLog(msg)
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...result }));
    return;
  }

  // 19. API: Folder Khusus Alat Gabung Video (Terpisah di merger/inputs & merger/outputs)
  const MERGER_DIR = path.join(__dirname, 'merger');
  const MERGER_INPUTS_DIR = path.join(MERGER_DIR, 'inputs');
  const MERGER_OUTPUTS_DIR = path.join(MERGER_DIR, 'outputs');

  if (pathname === '/api/merger/upload' && req.method === 'POST') {
    const rawFilename = urlObj.searchParams.get('filename') || `clip-${Date.now()}.mp4`;
    const safeFilename = path.basename(rawFilename).replace(/[^\w.-]/g, '_');
    if (!fs.existsSync(MERGER_INPUTS_DIR)) {
      fs.mkdirSync(MERGER_INPUTS_DIR, { recursive: true });
    }
    const targetPath = path.join(MERGER_INPUTS_DIR, safeFilename);
    const tempPath = `${targetPath}.part`;

    appendLog(`[MERGER UPLOAD] Menerima file bahan gabungan: merger/inputs/${safeFilename}...`);
    const writeStream = fs.createWriteStream(tempPath, { highWaterMark: 4 * 1024 * 1024 });

    const cleanupTemp = () => {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) { }
    };

    req.on('aborted', () => {
      writeStream.destroy();
      cleanupTemp();
    });

    req.pipe(writeStream);
    writeStream.on('finish', async () => {
      try {
        await fs.promises.rename(tempPath, targetPath);
        const stat = await fs.promises.stat(targetPath);
        const sizeMB = +(stat.size / (1024 * 1024)).toFixed(1);
        appendLog(`[MERGER UPLOAD] Tersimpan di merger/inputs/${safeFilename} (${sizeMB} MB)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, fileName: safeFilename, sizeMB }));
      } catch (err) {
        cleanupTemp();
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    writeStream.on('error', (err) => {
      cleanupTemp();
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/merger/sources' && req.method === 'GET') {
    try {
      if (!fs.existsSync(MERGER_INPUTS_DIR)) fs.mkdirSync(MERGER_INPUTS_DIR, { recursive: true });
      if (!fs.existsSync(MERGER_OUTPUTS_DIR)) fs.mkdirSync(MERGER_OUTPUTS_DIR, { recursive: true });

      const videoExts = new Set(['.mp4', '.mov', '.mkv', '.webm']);
      const scanIsolatedDir = (dirPath, bucket) => {
        const list = [];
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const ext = path.extname(entry.name).toLowerCase();
          if (!videoExts.has(ext) || entry.name.endsWith('.part') || entry.name.startsWith('.')) continue;
          const full = path.join(dirPath, entry.name);
          try {
            const stat = fs.statSync(full);
            const dur = getVideoDurationSec(full);
            list.push({
              bucket,
              fileName: entry.name,
              sizeMB: +(stat.size / (1024 * 1024)).toFixed(1),
              durationSec: dur ? Math.round(dur * 10) / 10 : null,
              mtimeMs: stat.mtimeMs,
              previewUrl: `/merger/${bucket}/${encodeURIComponent(entry.name)}`,
            });
          } catch (_) { }
        }
        list.sort((a, b) => b.mtimeMs - a.mtimeMs);
        return list;
      };

      const inputs = scanIsolatedDir(MERGER_INPUTS_DIR, 'inputs');
      const outputs = scanIsolatedDir(MERGER_OUTPUTS_DIR, 'outputs');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ inputs, outputs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/merger/file' && req.method === 'DELETE') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { bucket, fileName } = JSON.parse(body || '{}');
        const baseDir = bucket === 'outputs' ? MERGER_OUTPUTS_DIR : MERGER_INPUTS_DIR;
        const safeName = path.basename(String(fileName || ''));
        const target = path.resolve(baseDir, safeName);
        if (!safeName || !target.startsWith(baseDir) || !fs.existsSync(target)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File tidak ditemukan' }));
          return;
        }
        fs.unlinkSync(target);
        appendLog(`[MERGER] Menghapus file merger/${bucket === 'outputs' ? 'outputs' : 'inputs'}/${safeName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 20. API: Gabungkan Beberapa Video Menjadi Satu ke merger/outputs/ (FFmpeg Merger)
  if (pathname === '/api/merge-videos' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const sendJson = (code, obj) => {
        if (!res.headersSent) {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        }
      };

      try {
        const payload = JSON.parse(body || '{}');
        const rawClips = Array.isArray(payload.clips) ? payload.clips : [];
        if (rawClips.length < 2) {
          sendJson(400, { error: 'Pilih minimal 2 klip video untuk digabungkan.' });
          return;
        }

        const resolveMergerInputPath = (fileName) => {
          const safeName = path.basename(String(fileName || ''));
          const resolved = path.resolve(MERGER_INPUTS_DIR, safeName);
          if (!safeName || !resolved.startsWith(MERGER_INPUTS_DIR)) {
            throw new Error('Path video di luar folder merger/inputs.');
          }
          if (!fs.existsSync(resolved)) {
            throw new Error(`File video tidak ditemukan di merger/inputs: ${safeName}`);
          }
          return resolved;
        };

        const probeMediaInfo = (filePath) => new Promise((resolve) => {
          const child = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'stream=codec_type,width,height:format=duration',
            '-of', 'json',
            filePath,
          ], { windowsHide: true });
          let out = '';
          child.stdout.on('data', d => { out += d.toString(); });
          child.on('close', () => {
            try {
              const parsed = JSON.parse(out || '{}');
              const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
              const vStream = streams.find(s => s.codec_type === 'video') || {};
              const hasAudio = streams.some(s => s.codec_type === 'audio');
              const duration = parseFloat(parsed.format?.duration) || getVideoDurationSec(filePath) || 5;
              resolve({
                width: parseInt(vStream.width, 10) || 1080,
                height: parseInt(vStream.height, 10) || 1920,
                duration: Math.max(0.2, duration),
                hasAudio,
              });
            } catch {
              resolve({ width: 1080, height: 1920, duration: getVideoDurationSec(filePath) || 5, hasAudio: true });
            }
          });
          child.on('error', () => {
            resolve({ width: 1080, height: 1920, duration: getVideoDurationSec(filePath) || 5, hasAudio: true });
          });
        });

        const resolvedClips = [];
        for (const c of rawClips) {
          const fullPath = resolveMergerInputPath(c.fileName || c.relPath);
          const info = await probeMediaInfo(fullPath);
          const startSec = Math.max(0, parseFloat(c.startSec) || 0);
          const rawEnd = c.endSec !== undefined && c.endSec !== null && c.endSec !== '' ? parseFloat(c.endSec) : null;
          const endSec = (rawEnd !== null && !isNaN(rawEnd) && rawEnd > startSec)
            ? Math.min(info.duration, rawEnd)
            : null;
          const effectiveDur = Math.max(0.2, (endSec !== null ? endSec : info.duration) - startSec);
          resolvedClips.push({
            ...c,
            fullPath,
            info,
            startSec,
            endSec,
            effectiveDur,
            muted: Boolean(c.muted),
          });
        }

        const rawOutName = String(payload.outputName || `gabungan-${Date.now()}`)
          .replace(/\.mp4$/i, '')
          .replace(/[^\w\s.-]/g, '')
          .trim()
          .replace(/\s+/g, '-') || `gabungan-${Date.now()}`;
        const outFileName = `${rawOutName}.mp4`;

        if (!fs.existsSync(MERGER_OUTPUTS_DIR)) {
          fs.mkdirSync(MERGER_OUTPUTS_DIR, { recursive: true });
        }

        const finalOutputPath = path.join(MERGER_OUTPUTS_DIR, outFileName);
        const tempOutputPath = path.join(os.tmpdir(), `merge_out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp4`);
        const totalExpectedSec = resolvedClips.reduce((acc, c) => acc + c.effectiveDur, 0);
        const previewUrl = `/merger/outputs/${encodeURIComponent(outFileName)}`;

        const mode = payload.mode === 'fast_copy' ? 'fast_copy' : 'smart_normalize';
        const hasTrimOrMute = resolvedClips.some(c => c.startSec > 0 || c.endSec !== null || c.muted);

        appendLog(`[MERGER] Menggabungkan ${resolvedClips.length} video (${totalExpectedSec.toFixed(1)}s) -> merger/outputs/${outFileName}...`);
        broadcast('merger_progress', { percent: 5, step: 'Menyiapkan klip sumber...' });

        let ffmpegArgs = [];
        let concatListPath = null;

        if (mode === 'fast_copy' && !hasTrimOrMute) {
          concatListPath = path.join(os.tmpdir(), `merge_list_${Date.now()}.txt`);
          const listContent = resolvedClips
            .map(c => `file '${c.fullPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
            .join('\n');
          fs.writeFileSync(concatListPath, listContent, 'utf8');
          ffmpegArgs = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concatListPath,
            '-c', 'copy',
            '-movflags', '+faststart',
            '-progress', 'pipe:1',
            '-nostats',
            tempOutputPath,
          ];
        } else {
          const resChoice = payload.resolution || '1080x1920';
          let targetW = 1080;
          let targetH = 1920;
          if (resChoice === '1920x1080') {
            targetW = 1920;
            targetH = 1080;
          } else if (resChoice === 'match_first') {
            targetW = Math.max(2, Math.floor(resolvedClips[0].info.width / 2) * 2);
            targetH = Math.max(2, Math.floor(resolvedClips[0].info.height / 2) * 2);
          }
          const targetFps = parseInt(payload.fps, 10) === 60 ? 60 : 30;
          const fitMode = payload.fitMode || 'cover_crop';

          ffmpegArgs = ['-y'];
          for (const c of resolvedClips) {
            if (c.startSec > 0) {
              ffmpegArgs.push('-ss', c.startSec.toFixed(3));
            }
            if (c.endSec !== null) {
              ffmpegArgs.push('-t', c.effectiveDur.toFixed(3));
            }
            ffmpegArgs.push('-i', c.fullPath);
          }

          const filterParts = [];
          resolvedClips.forEach((c, idx) => {
            if (fitMode === 'blur_pad') {
              filterParts.push(
                `[${idx}:v]split=2[bg${idx}][fg${idx}];` +
                `[bg${idx}]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=20:5[bgb${idx}];` +
                `[fg${idx}]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fgs${idx}];` +
                `[bgb${idx}][fgs${idx}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=${targetFps},format=yuv420p[v${idx}]`
              );
            } else if (fitMode === 'contain_black') {
              filterParts.push(
                `[${idx}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${targetFps},format=yuv420p[v${idx}]`
              );
            } else {
              filterParts.push(
                `[${idx}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},setsar=1,fps=${targetFps},format=yuv420p[v${idx}]`
              );
            }

            if (!c.muted && c.info.hasAudio) {
              filterParts.push(
                `[${idx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a${idx}]`
              );
            } else {
              filterParts.push(
                `anullsrc=channel_layout=stereo:sample_rate=44100:d=${c.effectiveDur.toFixed(3)}[a${idx}]`
              );
            }
          });

          const concatInputs = resolvedClips.map((_, idx) => `[v${idx}][a${idx}]`).join('');
          filterParts.push(`${concatInputs}concat=n=${resolvedClips.length}:v=1:a=1[outv][outa]`);

          ffmpegArgs.push(
            '-filter_complex', filterParts.join(';'),
            '-map', '[outv]',
            '-map', '[outa]',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-progress', 'pipe:1',
            '-nostats',
            tempOutputPath
          );
        }

        await new Promise((resolve, reject) => {
          const child = spawn('ffmpeg', ffmpegArgs, { windowsHide: true });
          let errLog = '';

          child.stdout.on('data', chunk => {
            const text = chunk.toString();
            const match = text.match(/out_time_us=(\d+)/) || text.match(/out_time_ms=(\d+)/);
            if (match && totalExpectedSec > 0) {
              const curSec = parseInt(match[1], 10) / 1_000_000;
              const pct = Math.max(8, Math.min(96, Math.round((curSec / totalExpectedSec) * 100)));
              broadcast('merger_progress', {
                percent: pct,
                step: `Menggabungkan video (${curSec.toFixed(1)}s / ${totalExpectedSec.toFixed(1)}s)...`,
              });
            }
          });

          child.stderr.on('data', chunk => {
            errLog += chunk.toString();
            if (errLog.length > 4000) errLog = errLog.slice(-4000);
          });

          child.on('error', err => reject(new Error(`Gagal menjalankan FFmpeg: ${err.message}`)));
          child.on('close', code => {
            if (code === 0 && fs.existsSync(tempOutputPath)) {
              resolve();
            } else {
              const tail = errLog.trim().split('\n').slice(-4).join(' ');
              const hint = mode === 'fast_copy'
                ? ' (Coba ubah Mode Penggabungan ke Normalisasi Seragam karena codec/resolusi antar video berbeda)'
                : '';
              reject(new Error(`FFmpeg gagal (kode ${code})${hint}: ${tail}`));
            }
          });
        });

        if (concatListPath && fs.existsSync(concatListPath)) {
          try { fs.unlinkSync(concatListPath); } catch (_) { }
        }

        safeReplaceFile(tempOutputPath, finalOutputPath);
        const outStat = fs.statSync(finalOutputPath);
        const sizeMB = +(outStat.size / (1024 * 1024)).toFixed(1);

        appendLog(`[MERGER SUKSES] Video gabungan tersimpan: merger/outputs/${outFileName} (${sizeMB} MB, ${totalExpectedSec.toFixed(1)}s)`);
        broadcast('merger_progress', { percent: 100, step: 'Penggabungan selesai!' });

        sendJson(200, {
          success: true,
          fileName: outFileName,
          folderPath: `merger/outputs/${outFileName}`,
          sizeMB,
          durationSec: +totalExpectedSec.toFixed(1),
          previewUrl,
        });
      } catch (err) {
        appendLog(`[MERGER ERROR] ${err.message}`);
        sendJson(500, { error: err.message });
      }
    });
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

// Nonaktifkan requestTimeout default (5 menit) agar upload file video besar tidak terputus
server.requestTimeout = 0;

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎬 TikTok Affiliate Video Studio (Remotion 4.0 Pure Node)`);
  console.log(`🌐 Server berjalan di: http://localhost:${PORT}`);
  console.log(`   (Port 3000 bebas untuk Remotion Studio: npm run dev)`);
  console.log(`======================================================\n`);
  setTimeout(() => {
    warmupRemotionBrowser((msg) => console.log(msg));
  }, 1000);
  setTimeout(() => {
    cleanupRemotionTemp({
      maxAgeMs: 2 * 60 * 60 * 1000, // bersihkan temp > 2 jam saat startup
      onLog: (msg) => console.log(msg)
    });
  }, 4000);
});

process.on('SIGINT', () => {
  closeRemotionBrowser().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  closeRemotionBrowser().finally(() => process.exit(0));
});
