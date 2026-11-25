#!/usr/bin/env node

/**
 * render.mjs — Pure Node.js Render Pipeline for TikTok Affiliate Remotion
 * Replaces bash/heredoc with programmatic @remotion/renderer & @remotion/bundler
 * 
 * Usage:
 *   node render.mjs <product-id-or-json> [v1|v2|all] [--fps=30|60] [--still --frame=120]
 *   node render.mjs --batch
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition, makeCancelSignal, openBrowser } from '@remotion/renderer';
import { loadProduct, resolveVariantProps, listProducts, loadConfig } from './scripts/product-helper.mjs';

export { makeCancelSignal };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENTRY_POINT = path.resolve(__dirname, 'src/index.ts');
const OUT_DIR = path.resolve(__dirname, 'out');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// In-memory bundle cache across multiple renders
let cachedBundleLocation = null;
let lastBundleBuiltTime = 0;

// Persistent Headless Chromium pool so Live Preview, Cover, and Render do not cold-launch Chrome per call
const REMOTION_TIMEOUT_MS = 60000;
const BROWSER_IDLE_TTL_MS = 15 * 60 * 1000;
let sharedBrowser = null;
let sharedBrowserGlMode = null;
let sharedBrowserPromise = null;
let sharedBrowserIdleTimer = null;

function touchBrowserIdleTimer() {
  if (sharedBrowserIdleTimer) clearTimeout(sharedBrowserIdleTimer);
  sharedBrowserIdleTimer = setTimeout(() => {
    closeRemotionBrowser().catch(() => { });
  }, BROWSER_IDLE_TTL_MS);
  if (typeof sharedBrowserIdleTimer.unref === 'function') {
    sharedBrowserIdleTimer.unref();
  }
}

export async function closeRemotionBrowser() {
  if (sharedBrowserIdleTimer) {
    clearTimeout(sharedBrowserIdleTimer);
    sharedBrowserIdleTimer = null;
  }
  const inst = sharedBrowser;
  sharedBrowser = null;
  sharedBrowserGlMode = null;
  sharedBrowserPromise = null;
  if (inst) {
    try {
      await inst.close({ silent: true });
    } catch (_) { }
  }
}

export async function getOrOpenRemotionBrowser({ enableGpu = true, onLog = null, forceRestart = false } = {}) {
  const desiredGl = enableGpu ? 'angle' : null;

  if (forceRestart) {
    await closeRemotionBrowser();
  }

  if (sharedBrowser && sharedBrowserGlMode === desiredGl) {
    touchBrowserIdleTimer();
    return sharedBrowser;
  }

  if (sharedBrowser && sharedBrowserGlMode !== desiredGl) {
    await closeRemotionBrowser();
  }

  if (sharedBrowserPromise) {
    return sharedBrowserPromise;
  }

  sharedBrowserPromise = (async () => {
    const tryOpen = async (glValue) => {
      const inst = await openBrowser('chrome', {
        chromiumOptions: { gl: glValue },
      });
      const clearRef = () => {
        if (sharedBrowser === inst) {
          sharedBrowser = null;
          sharedBrowserGlMode = null;
        }
      };
      if (typeof inst.once === 'function') {
        inst.once('closed', clearRef);
        inst.once('closed-silent', clearRef);
      }
      return { inst, glValue };
    };

    try {
      let opened;
      try {
        opened = await tryOpen(desiredGl);
      } catch (firstErr) {
        if (onLog) {
          onLog(`[BROWSER WARN] Gagal membuka Chromium dengan gl=${desiredGl} (${firstErr.message}). Mencoba mode kompatibilitas...`);
        }
        opened = await tryOpen(undefined);
      }
      sharedBrowser = opened.inst;
      sharedBrowserGlMode = desiredGl;
      touchBrowserIdleTimer();
      return sharedBrowser;
    } finally {
      sharedBrowserPromise = null;
    }
  })();

  return sharedBrowserPromise;
}

export async function warmupRemotionBrowser(onLog = console.log) {
  try {
    const cfg = loadConfig();
    const enableGpu = cfg.enableGpuRender !== false;
    await getOrOpenRemotionBrowser({ enableGpu, onLog });
    onLog('[BROWSER] Instance Chromium Headless siap digunakan (warm pool aktif).');
  } catch (err) {
    onLog(`[BROWSER WARN] Pemanasan awal Chromium tertunda: ${err.message}`);
  }
}

async function withSharedBrowser({ enableGpu = true, onLog = console.log }, taskFn) {
  let browser = await getOrOpenRemotionBrowser({ enableGpu, onLog });
  try {
    const res = await taskFn(browser);
    touchBrowserIdleTimer();
    return res;
  } catch (err) {
    const msg = String(err?.message || '');
    const isBrowserConnErr =
      msg.includes('Timed out') ||
      msg.includes('connect to the browser') ||
      msg.includes('Target closed') ||
      msg.includes('Session closed') ||
      msg.includes('Connection closed') ||
      msg.includes('Missing target') ||
      msg.includes('ECONNREFUSED');

    if (!isBrowserConnErr) {
      throw err;
    }

    onLog(`[BROWSER RETRY] Koneksi Chromium terputus (${msg.slice(0, 120)}). Membuka ulang browser dan mengulangi...`);
    browser = await getOrOpenRemotionBrowser({ enableGpu, onLog, forceRestart: true });
    const retryRes = await taskFn(browser);
    touchBrowserIdleTimer();
    return retryRes;
  }
}

function hasSrcFilesChanged(sinceTime) {
  if (!sinceTime) return true;
  const srcDir = path.resolve(__dirname, 'src');
  try {
    const checkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (checkDir(fullPath)) return true;
        } else {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > sinceTime) return true;
        }
      }
      return false;
    };
    return checkDir(srcDir);
  } catch (_) {
    return true;
  }
}

/**
 * Menyinkronkan seluruh isi folder public/ ke dalam folder bundle Remotion.
 * Ini memastikan audio voiceover baru, transkrip json baru, atau video baru
 * langsung terbarui di Remotion tanpa perlu rebuild bundle Webpack yang memakan waktu.
 */
export function syncPublicToBundle(bundleLocation, onLog = console.log) {
  if (!bundleLocation || !fs.existsSync(bundleLocation)) return;
  const bundlePublic = path.join(bundleLocation, 'public');

  try {
    const lstat = fs.lstatSync(bundlePublic);
    if (lstat.isSymbolicLink()) {
      // Sudah tertaut langsung ke PUBLIC_DIR via junction/symlink (0 ms)
      return;
    }
    // @remotion/bundler membuat folder public/ kosong secara bawaan meskipun publicDir: null.
    // Hapus folder reguler tersebut terlebih dahulu agar junction 0ms ke PUBLIC_DIR berhasil dibuat!
    fs.rmSync(bundlePublic, { recursive: true, force: true });
  } catch (_) { }

  // Gunakan directory junction agar 2.8+ GB media di public/ tidak pernah disalin ke drive C:
  try {
    fs.symlinkSync(PUBLIC_DIR, bundlePublic, 'junction');
    return;
  } catch (jErr) {
    onLog(`[WARN] Junction public gagal (${jErr.message}), menyalin fallback...`);
  }

  if (!fs.existsSync(bundlePublic)) {
    fs.mkdirSync(bundlePublic, { recursive: true });
  }

  try {
    fs.cpSync(PUBLIC_DIR, bundlePublic, {
      recursive: true,
      force: true,
      dereference: true,
    });
  } catch (err) {
    onLog(`[WARN] Gagal menyinkronkan file public ke bundle: ${err.message}`);
  }
}

export function invalidateBundle() {
  cachedBundleLocation = null;
  lastBundleBuiltTime = 0;
}

/**
 * Menyalin satu file dari public/ ke bundle Remotion yang sudah aktif di memori
 * secara asinkron tanpa memicu rebuild bundle atau menyalin ulang seluruh folder public/.
 */
export async function syncSingleFileToCachedBundle(relPath) {
  if (!relPath || !cachedBundleLocation || !fs.existsSync(cachedBundleLocation)) return;
  const bundlePublic = path.join(cachedBundleLocation, 'public');
  try {
    if (fs.existsSync(bundlePublic) && fs.lstatSync(bundlePublic).isSymbolicLink()) {
      return; // Sudah tertaut langsung ke PUBLIC_DIR
    }
  } catch (_) { }
  const src = path.resolve(PUBLIC_DIR, relPath);
  const dest = path.resolve(bundlePublic, relPath);
  if (!src.startsWith(PUBLIC_DIR) || !fs.existsSync(src)) return;
  try {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
  } catch { }
}

function detachBundlePublicJunction(bundleDir) {
  const pub = path.join(bundleDir, 'public');
  try {
    if (fs.lstatSync(pub).isSymbolicLink()) {
      try { fs.rmdirSync(pub); } catch (_) { fs.unlinkSync(pub); }
    }
  } catch (_) { }
}

function getDirSizeBytes(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const p = path.join(dirPath, e.name);
      if (e.isDirectory()) total += getDirSizeBytes(p);
      else total += fs.statSync(p).size;
    }
  } catch (_) { }
  return total;
}

/**
 * Membersihkan folder sementara Remotion (remotion-webpack-bundle-* & remotion_previews lama)
 * di direktori temp OS agar penyimpanan C: tidak penuh.
 */
export function cleanupRemotionTemp({ maxAgeMs = 1000 * 60 * 60 * 2, onLog = () => {} } = {}) {
  const tmpDir = os.tmpdir();
  const now = Date.now();
  let deletedCount = 0;
  let freedBytes = 0;

  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(tmpDir, entry.name);
      if (cachedBundleLocation && path.resolve(fullPath) === path.resolve(cachedBundleLocation)) {
        continue;
      }

      if (
        entry.isDirectory() &&
        (entry.name.startsWith('remotion-webpack-bundle-') || entry.name.startsWith('puppeteer_dev_chrome_profile-'))
      ) {
        try {
          const st = fs.statSync(fullPath);
          if (now - st.mtimeMs >= maxAgeMs) {
            const sz = getDirSizeBytes(fullPath);
            if (entry.name.startsWith('remotion-webpack-bundle-')) {
              detachBundlePublicJunction(fullPath);
            }
            fs.rmSync(fullPath, { recursive: true, force: true });
            deletedCount++;
            freedBytes += sz;
          }
        } catch (_) { }
      }
    }

    // Bersihkan pratinjau still yang lebih tua dari maxAgeMs (atau minimal > 15 menit)
    const previewDir = path.join(tmpDir, 'remotion_previews');
    if (fs.existsSync(previewDir)) {
      const pEntries = fs.readdirSync(previewDir, { withFileTypes: true });
      const previewMaxAge = Math.min(maxAgeMs, 1000 * 60 * 30);
      for (const pe of pEntries) {
        if (!pe.isFile()) continue;
        const pPath = path.join(previewDir, pe.name);
        try {
          const st = fs.statSync(pPath);
          if (now - st.mtimeMs >= previewMaxAge) {
            freedBytes += st.size;
            fs.unlinkSync(pPath);
            deletedCount++;
          }
        } catch (_) { }
      }
    }
  } catch (_) { }

  const freedMB = +(freedBytes / (1024 * 1024)).toFixed(1);
  if (deletedCount > 0) {
    onLog(`[CLEANUP] Membersihkan ${deletedCount} cache temp Remotion (${freedMB} MB dibebaskan).`);
  }
  return { deletedCount, freedBytes, freedMB };
}

export async function getOrBuildBundle(onLog = console.log, forceRebuild = false) {
  const needsRebuild = forceRebuild || !cachedBundleLocation || !fs.existsSync(cachedBundleLocation) || hasSrcFilesChanged(lastBundleBuiltTime);
  if (!needsRebuild) {
    syncPublicToBundle(cachedBundleLocation, onLog);
    return cachedBundleLocation;
  }
  const prevBundle = cachedBundleLocation;
  onLog('[BUNDLER] Mempersiapkan bundle Remotion (Webpack/Rspack)...');
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: null,
    onProgress: (p) => {
      if (p % 25 === 0 || p === 100) {
        onLog(`[BUNDLER] Progres bundling: ${p}%`);
      }
    },
  });
  cachedBundleLocation = bundleLocation;
  lastBundleBuiltTime = Date.now();
  if (prevBundle && prevBundle !== bundleLocation && fs.existsSync(prevBundle)) {
    try {
      detachBundlePublicJunction(prevBundle);
      fs.rmSync(prevBundle, { recursive: true, force: true });
    } catch (_) { }
  }
  cleanupRemotionTemp({ maxAgeMs: 1000 * 60 * 60 * 2, onLog });
  syncPublicToBundle(bundleLocation, onLog);
  onLog('[BUNDLER] Bundle berhasil dibuat.');
  return bundleLocation;
}

/**
 * Programmatic render of a single product variant
 */
export async function renderProductVariant({
  productOrId,
  variantKey = 'v1',
  fpsOverride,
  customOutputName,
  useGpu,
  quality = 'balanced',
  autoRenderCover = true,
  onProgress,
  onLog = console.log,
  cancelSignal,
  cancelToken,
}) {
  const product = typeof productOrId === 'string' ? loadProduct(productOrId) : productOrId;
  const config = loadConfig();
  const fps = fpsOverride ? parseInt(fpsOverride, 10) : (config.defaultFps || 60);

  let crf = 20;
  let jpegQuality = 90;
  let qualityLabel = 'Standar Optimal (CRF 20 - Rekomendasi TikTok)';

  if (quality === 'high' || quality === 'ultra') {
    crf = 17;
    jpegQuality = 95;
    qualityLabel = 'Tinggi Ultra-Jernih (CRF 17 - Detail Tajam)';
  } else if (quality === 'eco' || quality === 'fast' || quality === 'low') {
    crf = 24;
    jpegQuality = 82;
    qualityLabel = 'Hemat Ringan (CRF 24 - Render Cepat)';
  }

  onLog(`\n==================================================`);
  onLog(`🎬 Menyiapkan Render: ${customOutputName || product.name}`);
  onLog(`📌 Variasi: ${variantKey}`);
  onLog(`⚡ FPS: ${fps}`);
  onLog(`🎯 Kualitas: ${qualityLabel}`);
  onLog(`==================================================`);

  // 1. Resolve props, auto-fit duration & captions
  const { props, totalClipsSec, durationInFrames } = resolveVariantProps(product, variantKey, { fps });
  onLog(`[PROPS] Durasi video: ${totalClipsSec.toFixed(1)}s (${durationInFrames} frames @ ${fps}fps)`);

  // 2. Build or reuse bundle & tautkan aset public/ via junction 0ms
  const bundleLocation = await getOrBuildBundle(onLog);

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Sanitize filename & tambahkan platform suffix agar tidak saling menimpa
  const rawTitle = customOutputName || product.name;
  let cleanProductName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const vRegex = new RegExp(`\\s+${variantKey}(?:\\s*\\([^)]+\\))?$`, 'i');
  cleanProductName = cleanProductName.replace(vRegex, '').trim();

  const outFileName = `${cleanProductName} ${variantKey}.mp4`;
  const outputLocation = path.join(OUT_DIR, outFileName);

  onLog(`[RENDER] Menyimpan video ke: out/${outFileName}`);

  // 3. Siapkan opsi akselerasi GPU (Chromium GPU Compositing & ANGLE Direct3D 11 via AMD Radeon)
  const enableGpu = useGpu !== undefined ? !!useGpu : !!config.enableGpuRender;
  const chromiumOptions = enableGpu ? { gl: 'angle' } : { gl: null };

  if (enableGpu) {
    onLog(`[GPU] 🎮 Akselerasi GPU Radeon AKTIF (Chromium ANGLE D3D11 / WebGL Compositing)`);
    onLog(`[GPU] Pipeline: AMD Radeon GPU Rendering + Multi-thread Fast Encoder`);
  } else {
    onLog(`[CPU] Render menggunakan mode CPU standar (libx264, crf=20)`);
    onLog(`[CPU] Tips: Aktifkan GPU Rendering di modal untuk mempercepat render frame`);
  }

  // 4. Render media menggunakan warm browser pool & konfigurasi multi-thread
  let lastLoggedFrame = -1;
  const startTime = Date.now();
  const cpuCount = os.cpus()?.length || 8;
  const optimalConcurrency = Math.max(4, Math.min(10, cpuCount > 4 ? cpuCount - 2 : 4));

  await withSharedBrowser({ enableGpu, onLog }, async (puppeteerInstance) => {
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'TikTokAffiliate',
      inputProps: props,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
    });

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      crf,
      x264Preset: 'veryfast',
      imageFormat: 'jpeg',
      jpegQuality,
      outputLocation,
      inputProps: props,
      concurrency: optimalConcurrency,
      offthreadVideoThreads: Math.max(2, Math.min(6, Math.floor(cpuCount / 2))),
      disallowParallelEncoding: false,
      cancelSignal: cancelSignal || cancelToken,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
      onProgress: (prog) => {
        const rendered = prog.renderedFrames;
        const total = prog.totalFrames || durationInFrames;
        const percent = total > 0 ? (rendered / total) * 100 : 0;

        // Calculate simple ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const fpsRendered = rendered > 0 && elapsed > 0 ? rendered / elapsed : 0;
        const remainingFrames = total - rendered;
        const etaSeconds = fpsRendered > 0 ? Math.round(remainingFrames / fpsRendered) : 0;
        const etaStr = etaSeconds > 60 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : `${etaSeconds}s`;

        if (rendered !== lastLoggedFrame && (rendered % 60 === 0 || rendered === total)) {
          lastLoggedFrame = rendered;
          onLog(`[REMOTION] Frame ${rendered}/${total} (${percent.toFixed(1)}%) — ETA: ${etaStr}`);
        }

        if (typeof onProgress === 'function') {
          onProgress({
            step: rendered >= total ? 'Meng-encode Video' : 'Merender Frame Remotion',
            frame: rendered,
            totalFrames: total,
            percent,
            eta: etaStr,
            encodedFrames: prog.encodedFrames,
          });
        }
      },
    });
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const stat = fs.existsSync(outputLocation) ? fs.statSync(outputLocation) : { size: 0 };
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

  onLog(`[SUCCESS] Selesai dalam ${durationSec}s! File: out/${outFileName} (${sizeMB} MB)`);

  // Otomatis buat cover/thumbnail pendamping yang selaras dengan varian video ini
  let coverFileName = null;
  if (autoRenderCover !== false && props.autoRenderCover !== false) {
    try {
      const coverRes = await renderProductCover({
        productOrId: product,
        variantKey,
        customOutputName: cleanProductName,
        platformSuffix: '',
        onLog,
      });
      coverFileName = coverRes.coverFileName;
    } catch (coverErr) {
      onLog(`[WARN COVER] Gagal membuat cover otomatis: ${coverErr.message}`);
    }
  }

  return {
    success: true,
    outFileName,
    outputLocation,
    coverFileName,
    sizeMB,
    durationSec,
  };
}

/**
 * Render cover / thumbnail 1080x1920 (JPG) yang selaras dengan desain varian video
 */
export async function renderProductCover({
  productOrId,
  variantKey = 'v1',
  customOutputName,
  platformSuffix = '',
  onLog = console.log,
  onProgress = () => { },
}) {
  onProgress({ step: 'sync', message: 'Menyiapkan desain cover...', percent: 20 });
  const product = typeof productOrId === 'string' ? loadProduct(productOrId) : productOrId;
  const config = loadConfig();
  const enableGpu = config.enableGpuRender !== false;
  const { props } = resolveVariantProps(product, variantKey, { renderMode: 'cover' });

  onProgress({ step: 'bundle', message: 'Mempersiapkan bundle Remotion...', percent: 45 });
  const bundleLocation = await getOrBuildBundle(onLog);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const rawTitle = customOutputName || product.name;
  let cleanProductName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const vRegex = new RegExp(`\\s+${variantKey}(?:\\s*\\([^)]+\\))?$`, 'i');
  cleanProductName = cleanProductName.replace(vRegex, '').trim();
  const coverFileName = `${cleanProductName} ${variantKey}${platformSuffix}-cover.jpg`;
  const coverLocation = path.join(OUT_DIR, coverFileName);
  const chromiumOptions = enableGpu ? { gl: 'angle' } : { gl: null };

  await withSharedBrowser({ enableGpu, onLog }, async (puppeteerInstance) => {
    onProgress({ step: 'select', message: 'Memuat komposisi cover 1080x1920...', percent: 70 });
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'TikTokAffiliate',
      inputProps: props,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
    });

    onProgress({ step: 'render', message: 'Merender cover 1080x1920...', percent: 85 });
    onLog(`[COVER] Merender thumbnail cover ke: out/${coverFileName}`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: coverLocation,
      inputProps: props,
      frame: 0,
      imageFormat: 'jpeg',
      jpegQuality: 95,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
    });
  });

  onProgress({ step: 'done', message: 'Cover berhasil dibuat!', percent: 100 });
  onLog(`[COVER] Thumbnail selesai: out/${coverFileName}`);
  return {
    success: true,
    coverFileName,
    coverLocation,
  };
}

/**
 * Render single still frame for instant visual preview
 */
export async function renderProductStill({
  productOrId,
  variantKey = 'v1',
  frame = 60,
  renderMode,
  ctaPlatform,
  onLog = console.log,
  onProgress = () => { },
}) {
  onProgress({ step: 'sync', message: 'Menyelaraskan media & membaca props...', percent: 20 });
  const product = typeof productOrId === 'string' ? loadProduct(productOrId) : productOrId;
  const config = loadConfig();
  const enableGpu = config.enableGpuRender !== false;
  const chromiumOptions = enableGpu ? { gl: 'angle' } : { gl: null };
  const resolveOpts = {};
  if (renderMode) resolveOpts.renderMode = renderMode;
  const { props } = resolveVariantProps(product, variantKey, resolveOpts);
  const targetFrame = renderMode === 'cover' ? 0 : parseInt(frame, 10);

  onProgress({ step: 'bundle', message: 'Mempersiapkan bundle Remotion (Webpack)...', percent: 45 });
  const bundleLocation = await getOrBuildBundle(onLog);

  // Simpan ke direktori temp OS agar out/previews/ TIDAK PERNAH menumpuk file sampah
  const tempPreviewDir = path.join(os.tmpdir(), 'remotion_previews');
  if (!fs.existsSync(tempPreviewDir)) fs.mkdirSync(tempPreviewDir, { recursive: true });
  const previewPath = path.join(tempPreviewDir, `preview_live_${Date.now()}.png`);

  await withSharedBrowser({ enableGpu, onLog }, async (puppeteerInstance) => {
    onProgress({ step: 'select', message: 'Memuat komposisi video 1080x1920...', percent: 65 });
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'TikTokAffiliate',
      inputProps: props,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
    });

    const maxFrame = Math.max(0, (composition.durationInFrames || 1) - 1);
    const safeFrame = renderMode === 'cover' ? 0 : Math.max(0, Math.min(maxFrame, Number.isFinite(targetFrame) ? targetFrame : 0));

    onProgress({ step: 'render', message: `Merender frame ${safeFrame} di Chromium headless...`, percent: 85 });
    onLog(`[STILL] Merender still ${renderMode === 'cover' ? 'cover' : `frame ${safeFrame}`} untuk pratinjau cepat...`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: previewPath,
      inputProps: props,
      frame: safeFrame,
      imageFormat: 'png',
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: REMOTION_TIMEOUT_MS,
    });
  });

  onProgress({ step: 'done', message: 'Pratinjau frame berhasil dibuat!', percent: 100 });
  onLog(`[STILL] Pratinjau frame selesai.`);
  return {
    previewPath,
    previewFilename: path.basename(previewPath),
  };
}

// CLI Execution if run directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Penggunaan CLI render.mjs:
  node render.mjs <product-id> [target: v1|v2|all] [--fps=30|60]
  node render.mjs <product-id> [target] --still --frame=120
  node render.mjs --batch [--fps=30|60]

Contoh:
  node render.mjs blackmores v1
  node render.mjs blackmores all --fps=30
  node render.mjs labore v1 --still --frame=60
  node render.mjs --batch
`);
    process.exit(0);
  }

  // Parse flags
  const isBatch = args.includes('--batch');
  const isStill = args.includes('--still');
  const fpsArg = args.find(a => a.startsWith('--fps='));
  const fps = fpsArg ? fpsArg.split('=')[1] : (args.find(a => a === '30' || a === '60') || null);
  const qualityArg = args.find(a => a.startsWith('--quality='));
  const quality = qualityArg ? qualityArg.split('=')[1] : 'balanced';
  const frameArg = args.find(a => a.startsWith('--frame='));
  const frame = frameArg ? parseInt(frameArg.split('=')[1], 10) : 60;

  try {
    if (isBatch) {
      console.log('[BATCH] Memulai render massal semua produk di products/ ...');
      const products = listProducts();
      for (const p of products) {
        console.log(`\n--- Memproses Produk: ${p.name} (${p.id}) ---`);
        for (const vk of p.variantKeys) {
          await renderProductVariant({
            productOrId: p.id,
            variantKey: vk,
            fpsOverride: fps,
            quality,
          });
        }
      }
      console.log('\n[BATCH] Semua produk selesai dirender!');
      await closeRemotionBrowser();
      process.exit(0);
    }

    const productId = args[0];
    const target = args[1] && !args[1].startsWith('--') ? args[1] : 'all';

    if (isStill) {
      const vk = target === 'all' || target === 'v2' ? 'v2' : 'v1';
      await renderProductStill({
        productOrId: productId,
        variantKey: vk,
        frame,
      });
      await closeRemotionBrowser();
      process.exit(0);
    }

    const product = loadProduct(productId);
    const variantsToRender = target === 'all'
      ? Object.keys(product.variants || {})
      : (target === '1' ? ['v1'] : (target === '2' ? ['v2'] : [target]));

    for (const vk of variantsToRender) {
      await renderProductVariant({
        productOrId: product,
        variantKey: vk,
        fpsOverride: fps,
        quality,
      });
    }

    console.log('\n🎉 Render selesai sempurna!');
    await closeRemotionBrowser();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat render:', err.message);
    await closeRemotionBrowser();
    process.exit(1);
  }
}

