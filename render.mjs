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
import { renderMedia, renderStill, selectComposition, makeCancelSignal } from '@remotion/renderer';
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
  if (!fs.existsSync(bundlePublic)) {
    fs.mkdirSync(bundlePublic, { recursive: true });
  }

  try {
    fs.cpSync(PUBLIC_DIR, bundlePublic, {
      recursive: true,
      force: true,
      dereference: true,
    });
    // onLog('[SYNC] File media public/ terbaru disinkronkan ke bundle Remotion.');
  } catch (err) {
    onLog(`[WARN] Gagal menyinkronkan file public ke bundle: ${err.message}`);
  }
}

export function invalidateBundle() {
  cachedBundleLocation = null;
  lastBundleBuiltTime = 0;
}

export async function getOrBuildBundle(onLog = console.log, forceRebuild = false) {
  const needsRebuild = forceRebuild || !cachedBundleLocation || !fs.existsSync(cachedBundleLocation) || hasSrcFilesChanged(lastBundleBuiltTime);
  if (!needsRebuild) {
    syncPublicToBundle(cachedBundleLocation, onLog);
    return cachedBundleLocation;
  }
  onLog('[BUNDLER] Mempersiapkan bundle Remotion (Webpack/Rspack)...');
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (p) => {
      if (p % 25 === 0 || p === 100) {
        onLog(`[BUNDLER] Progres bundling: ${p}%`);
      }
    },
  });
  cachedBundleLocation = bundleLocation;
  lastBundleBuiltTime = Date.now();
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

  // 2. Build or reuse bundle & sinkronkan aset public/ terbaru
  const bundleLocation = await getOrBuildBundle(onLog);
  syncPublicToBundle(bundleLocation, onLog);

  // 3. Select composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'TikTokAffiliate',
    inputProps: props,
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Sanitize filename
  const rawTitle = customOutputName || product.name;
  const cleanProductName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const outFileName = `${cleanProductName} ${variantKey}.mp4`;
  const outputLocation = path.join(OUT_DIR, outFileName);

  onLog(`[RENDER] Menyimpan video ke: out/${outFileName}`);

  // 4. Siapkan opsi akselerasi GPU (Chromium GPU Compositing & ANGLE Direct3D 11 via AMD Radeon)
  const enableGpu = useGpu !== undefined ? !!useGpu : !!config.enableGpuRender;

  // Di Remotion 4.0, chromiumOptions.gl = 'angle' mengarahkan Chromium headless
  // untuk menggunakan backend Direct3D 11 yang mempercepat WebGL, backdrop blur,
  // dan layer compositing langsung melalui GPU AMD Radeon RX 6600.
  const chromiumOptions = enableGpu ? {
    gl: 'angle',
  } : {
    gl: null,
  };

  if (enableGpu) {
    onLog(`[GPU] 🎮 Akselerasi GPU Radeon AKTIF (Chromium ANGLE D3D11 / WebGL Compositing)`);
    onLog(`[GPU] Pipeline: AMD Radeon GPU Rendering + Multi-thread Fast Encoder`);
  } else {
    onLog(`[CPU] Render menggunakan mode CPU standar (libx264, crf=20)`);
    onLog(`[CPU] Tips: Aktifkan GPU Rendering di modal untuk mempercepat render frame`);
  }

  // 4. Render media dengan konfigurasi optimal untuk Intel i5-12400 (12 Threads) & RX 6600
  let lastLoggedFrame = -1;
  const startTime = Date.now();
  const cpuCount = os.cpus()?.length || 8;
  const optimalConcurrency = Math.max(4, Math.min(10, cpuCount > 4 ? cpuCount - 2 : 4));

  const renderResult = await renderMedia({
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
    chromiumOptions,
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
        customOutputName: rawTitle,
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
  syncPublicToBundle(bundleLocation, onLog);

  onProgress({ step: 'select', message: 'Memuat komposisi cover 1080x1920...', percent: 70 });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'TikTokAffiliate',
    inputProps: props,
  });

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const rawTitle = customOutputName || product.name;
  let cleanProductName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const vRegex = new RegExp(`\\s+${variantKey}$`, 'i');
  cleanProductName = cleanProductName.replace(vRegex, '').trim();
  const coverFileName = `${cleanProductName} ${variantKey}-cover.jpg`;
  const coverLocation = path.join(OUT_DIR, coverFileName);

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
    chromiumOptions: enableGpu ? { gl: 'angle' } : { gl: null },
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
  onLog = console.log,
  onProgress = () => { },
}) {
  onProgress({ step: 'sync', message: 'Menyelaraskan media & membaca props...', percent: 20 });
  const product = typeof productOrId === 'string' ? loadProduct(productOrId) : productOrId;
  const config = loadConfig();
  const enableGpu = config.enableGpuRender !== false;
  const { props } = resolveVariantProps(product, variantKey, renderMode ? { renderMode } : {});
  const targetFrame = renderMode === 'cover' ? 0 : parseInt(frame, 10);

  onProgress({ step: 'bundle', message: 'Mempersiapkan bundle Remotion (Webpack)...', percent: 45 });
  const bundleLocation = await getOrBuildBundle(onLog);
  syncPublicToBundle(bundleLocation, onLog);

  onProgress({ step: 'select', message: 'Memuat komposisi video 1080x1920...', percent: 65 });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'TikTokAffiliate',
    inputProps: props,
  });

  const maxFrame = Math.max(0, (composition.durationInFrames || 1) - 1);
  const safeFrame = renderMode === 'cover' ? 0 : Math.max(0, Math.min(maxFrame, Number.isFinite(targetFrame) ? targetFrame : 0));

  // Simpan ke direktori temp OS agar out/previews/ TIDAK PERNAH menumpuk file sampah
  const tempPreviewDir = path.join(os.tmpdir(), 'remotion_previews');
  if (!fs.existsSync(tempPreviewDir)) fs.mkdirSync(tempPreviewDir, { recursive: true });
  const previewPath = path.join(tempPreviewDir, `preview_live_${Date.now()}.png`);

  onProgress({ step: 'render', message: `Merender frame ${safeFrame} di Chromium headless...`, percent: 85 });
  onLog(`[STILL] Merender still ${renderMode === 'cover' ? 'cover' : `frame ${safeFrame}`} untuk pratinjau cepat...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: previewPath,
    inputProps: props,
    frame: safeFrame,
    imageFormat: 'png',
    chromiumOptions: enableGpu ? { gl: 'angle' } : { gl: null },
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
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat render:', err.message);
    process.exit(1);
  }
}

