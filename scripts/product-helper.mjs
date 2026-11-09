import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT_DIR, 'products');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');

const videoDurationCache = new Map();

/**
 * Get video duration in seconds via ffprobe (cached)
 */
export function getVideoDurationSec(filename) {
  if (!filename) return null;
  const filePath = path.isAbsolute(filename) ? filename : path.join(PUBLIC_DIR, filename);
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  const cacheKey = `${filePath}:${stat.mtimeMs}`;
  if (videoDurationCache.has(cacheKey)) {
    return videoDurationCache.get(cacheKey);
  }

  try {
    const stdout = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 }
    ).toString().trim();
    const sec = parseFloat(stdout);
    if (!isNaN(sec) && sec > 0) {
      videoDurationCache.set(cacheKey, sec);
      return sec;
    }
  } catch { }
  return null;
}

/**
 * Load global configuration
 */
export function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      // Fallback
    }
  }
  return {
    defaultWatermark: '@inanikma_ | @spillbyna_',
    webPort: 3100,
    defaultFps: 60,
    defaultTheme: 'pastel',
    autoFitVoiceOver: true,
  };
}

/**
 * List all available products in products/ directory
 * Diurutkan berdasarkan waktu modifikasi terbaru (file baru otomatis di paling atas).
 */
export function listProducts() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    return [];
  }
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));
  const products = [];
  for (const f of files) {
    try {
      const fullPath = path.join(PRODUCTS_DIR, f);
      const stat = fs.statSync(fullPath);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      // Selalu gunakan base nama file sebagai ID kanonik untuk mencegah mismatch loadProduct
      const fileId = path.basename(f, '.json');
      const id = fileId;
      products.push({
        id,
        filename: f,
        name: data.name || id,
        videoSource: data.videoSource || '',
        variantKeys: Object.keys(data.variants || {}),
        variantsCount: Object.keys(data.variants || {}).length,
        mtime: stat.mtimeMs,
      });
    } catch (e) {
      console.warn(`[WARN] Gagal membaca produk ${f}:`, e.message);
    }
  }
  // Sort descending: file produk paling baru ditambahkan/dimodifikasi ada di awal
  products.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  return products;
}

/**
 * Load single product JSON by ID or filename
 */
export function loadProduct(idOrPath) {
  let targetPath = idOrPath;
  if (!targetPath.endsWith('.json')) {
    targetPath = path.join(PRODUCTS_DIR, `${idOrPath}.json`);
  }
  if (!path.isAbsolute(targetPath) && !fs.existsSync(targetPath)) {
    targetPath = path.join(PRODUCTS_DIR, path.basename(targetPath));
  }
  if (!fs.existsSync(targetPath)) {
    // Coba cari case-insensitive atau cari di dalam file data.id
    const files = fs.existsSync(PRODUCTS_DIR) ? fs.readdirSync(PRODUCTS_DIR) : [];
    const lower = path.basename(idOrPath, '.json').toLowerCase();
    const matched = files.find(f => path.basename(f, '.json').toLowerCase() === lower);
    if (matched) {
      targetPath = path.join(PRODUCTS_DIR, matched);
    } else {
      // Fallback: cari file yang didalamnya terdapat data.id === idOrPath
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        try {
          const d = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, f), 'utf8'));
          if (d.id === idOrPath) {
            targetPath = path.join(PRODUCTS_DIR, f);
            break;
          }
        } catch (_) { }
      }
    }
  }
  if (!fs.existsSync(targetPath)) {
    throw new Error(`File produk tidak ditemukan: ${targetPath}`);
  }
  const raw = fs.readFileSync(targetPath, 'utf8');
  const data = JSON.parse(raw);
  // Selalu pastikan data.id konsisten dengan nama file
  data.id = path.basename(targetPath, '.json');
  return data;
}

/**
 * Save product JSON to products/<id>.json
 */
export function saveProduct(id, productData) {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
  const safeId = (id || productData.id || 'product').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  productData.id = safeId;
  const filePath = path.join(PRODUCTS_DIR, `${safeId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(productData, null, 2), 'utf8');
  return { id: safeId, filePath };
}

/**
 * Delete product JSON and optionally its associated public folder (products/<id>)
 */
export function deleteProduct(id, deleteAssets = false) {
  const safeId = path.basename(id, '.json').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const filePath = path.join(PRODUCTS_DIR, `${safeId}.json`);
  let deletedFile = false;
  let deletedAssets = false;

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    deletedFile = true;
  }

  if (deleteAssets) {
    const productAssetsDir = path.join(PUBLIC_DIR, 'products', safeId);
    if (fs.existsSync(productAssetsDir)) {
      fs.rmSync(productAssetsDir, { recursive: true, force: true });
      deletedAssets = true;
    }
  }

  return { success: true, id: safeId, deletedFile, deletedAssets };
}

/**
 * Resolve full Remotion inputProps for a variant
 */
export function resolveVariantProps(product, variantKey = 'v1', options = {}) {
  const config = loadConfig();
  const variant = product.variants?.[variantKey];
  if (!variant) {
    throw new Error(`Varian '${variantKey}' tidak ditemukan pada produk '${product.name || product.id}'`);
  }

  // Clone to avoid mutating original
  const props = JSON.parse(JSON.stringify(variant));

  // Merge default watermark if absent
  if (!props.watermarkText) {
    props.watermarkText = config.defaultWatermark || '@inanikma_ | @spillbyna_';
  }
  if (!props.watermarkPosition) {
    props.watermarkPosition = variant.watermarkPosition || 'floating';
  }

  // Helper cari file aset di public/ (mendukung path relatif langsung, subfolder produk, atau fallback di root public/)
  const resolvePublicPath = (filename) => {
    if (!filename) return null;
    const directPath = path.join(PUBLIC_DIR, filename);
    if (fs.existsSync(directPath)) return { relative: filename.replace(/\\/g, '/'), full: directPath };
    const baseName = path.basename(filename);
    if (product?.id) {
      const prodRel = `products/${product.id}/${baseName}`;
      const prodPath = path.join(PUBLIC_DIR, prodRel);
      if (fs.existsSync(prodPath)) return { relative: prodRel, full: prodPath };
    }
    const rootPath = path.join(PUBLIC_DIR, baseName);
    if (fs.existsSync(rootPath)) return { relative: baseName, full: rootPath };
    return null;
  };

  // Ensure clips src points to valid source video and clamp bounds within video duration
  if (Array.isArray(props.clips)) {
    props.clips = props.clips.map((c, idx) => {
      let src = c.src || product.videoSource || '';
      // Cegah bug klip tertinggal mengarah ke folder produk lain
      if (c.src && product.videoSource && c.src !== product.videoSource) {
        const cMatch = String(c.src).match(/products\/([^/]+)\//);
        const pMatch = String(product.videoSource).match(/products\/([^/]+)\//);
        if (cMatch && pMatch && cMatch[1] !== pMatch[1]) {
          src = product.videoSource;
        }
      }
      const resolved = resolvePublicPath(src);
      const exists = Boolean(resolved);
      if (resolved) src = resolved.relative;
      let startSec = c.startSec || 0;
      let endSec = c.endSec || (startSec + 5);

      if (exists) {
        const videoDuration = getVideoDurationSec(src);
        if (videoDuration && videoDuration > 0) {
          if (endSec > videoDuration) {
            const desiredDuration = Math.max(2, endSec - startSec);
            endSec = Math.floor(videoDuration * 10) / 10;
            startSec = Math.max(0, Math.round((endSec - desiredDuration) * 10) / 10);
            console.warn(`[AUTO-CLAMP] Klip #${idx + 1} (${c.startSec}-${c.endSec}s) melebihi durasi video (${videoDuration.toFixed(1)}s). Disesuaikan otomatis menjadi ${startSec}-${endSec}s.`);
          }
        }
      }

      return {
        ...c,
        src,
        startSec,
        endSec,
        isPlaceholder: c.isPlaceholder || !exists,
      };
    });
  } else {
    props.clips = [];
  }

  // Resolve Voice Over & Captions (Selalu baca data terbaru dari folder public/)
  delete props.voiceOverCaptions;
  if (props.voiceOver && product?.id) {
    const voMatch = String(props.voiceOver).match(/^products\/([^/]+)\//);
    if (voMatch && voMatch[1] !== product.id) {
      console.warn(`[SAFETY] VoiceOver '${props.voiceOver}' milik produk lain (${voMatch[1]}). Mencari VO milik '${product.id}'...`);
      props.voiceOver = '';
    }
  }
  if (!props.voiceOver && product?.id) {
    const prodDir = path.join(PUBLIC_DIR, 'products', product.id);
    if (fs.existsSync(prodDir)) {
      try {
        const audioFiles = fs.readdirSync(prodDir).filter(f => /\.(mp3|wav|m4a|aac)$/i.test(f));
        const matchedVo = audioFiles.find(f => f.toLowerCase().includes(variantKey.toLowerCase())) || audioFiles[0];
        if (matchedVo) {
          props.voiceOver = `products/${product.id}/${matchedVo}`;
        }
      } catch (_) { }
    }
  }
  if (props.voiceOver) {
    const voResolved = resolvePublicPath(props.voiceOver);
    if (!voResolved) {
      console.warn(`[WARNING] File audio public/${props.voiceOver} tidak ditemukan! Voice over dinonaktifkan.`);
      delete props.voiceOver;
    } else {
      props.voiceOver = voResolved.relative;
      const voBase = voResolved.relative.replace(/\.[^/.]+$/, '');
      const voJsonPath = path.join(PUBLIC_DIR, `${voBase}.json`);
      if (fs.existsSync(voJsonPath)) {
        try {
          props.voiceOverCaptions = JSON.parse(fs.readFileSync(voJsonPath, 'utf8'));
          console.log(`[CAPTIONS] Menyematkan ${props.voiceOverCaptions.length} kata caption (${voBase}.json) untuk audio '${props.voiceOver}' pada props ${variantKey}.`);
        } catch (e) {
          console.warn(`[WARN] Gagal membaca subtitle voiceover ${voJsonPath}:`, e.message);
        }
      } else {
        console.warn(`[CAPTIONS] File caption public/${voBase}.json belum ditemukan untuk audio '${props.voiceOver}'. Video akan dirender tanpa subtitle karaoke.`);
      }
    }
  }

  // Resolve Background Music (BGM)
  if (props.bgmTrack) {
    const bgmResolved = resolvePublicPath(props.bgmTrack);
    if (!bgmResolved) {
      console.warn(`[WARNING] File audio BGM public/${props.bgmTrack} tidak ditemukan! BGM dinonaktifkan.`);
      delete props.bgmTrack;
    } else {
      props.bgmTrack = bgmResolved.relative;
    }
  } else if (config.defaultBgmTrack) {
    const defaultBgm = resolvePublicPath(config.defaultBgmTrack);
    if (defaultBgm) {
      props.bgmTrack = defaultBgm.relative;
    }
  } else if (fs.existsSync(path.join(PUBLIC_DIR, 'bgm.mp3'))) {
    props.bgmTrack = 'bgm.mp3';
  } else if (fs.existsSync(path.join(PUBLIC_DIR, 'bgm'))) {
    try {
      const bgmFiles = fs.readdirSync(path.join(PUBLIC_DIR, 'bgm')).filter(f => /\.(mp3|wav|m4a|aac)$/i.test(f));
      if (bgmFiles.length > 0) {
        props.bgmTrack = `bgm/${bgmFiles[0]}`;
      }
    } catch { }
  }
  if (props.bgmTrack && props.bgmVolume === undefined) {
    props.bgmVolume = config.defaultBgmVolume ?? 0.12;
  }

  // Resolve Hook captions if podcast hook
  if (props.unmuteHook && props.clips?.[0]?.src) {
    const hookBase = props.clips[0].src.replace(/\.[^/.]+$/, '');
    const hookJsonPath = path.join(PUBLIC_DIR, `${hookBase}.json`);
    if (fs.existsSync(hookJsonPath)) {
      try {
        props.hookCaptions = JSON.parse(fs.readFileSync(hookJsonPath, 'utf8'));
        console.log(`[CAPTIONS] Menyematkan ${props.hookCaptions.length} kata caption hook ke props ${variantKey}.`);
      } catch (e) {
        console.warn(`[WARN] Gagal membaca subtitle hook ${hookJsonPath}:`, e.message);
      }
    }
  }

  // Auto-fit duration logic (dengan penjagaan batas durasi video asli & pemangkasan jeda kosong / dead air)
  if (config.autoFitVoiceOver !== false && props.voiceOverCaptions && props.voiceOverCaptions.length > 0) {
    const lastWord = props.voiceOverCaptions[props.voiceOverCaptions.length - 1];
    if (lastWord && lastWord.endMs) {
      const voEndSec = (lastWord.endMs / 1000) + (props.voiceOverDelaySec || 0);
      const currentTotalSec = props.clips.reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);

      // Konfigurasi buffer napas ending (default 1.4s) & ambang batas dead air (default 2.5s)
      const tailBufferSec = typeof config.deadAirBufferSec === 'number' ? config.deadAirBufferSec : 1.4;
      const deadAirThresholdSec = typeof config.deadAirThresholdSec === 'number' ? config.deadAirThresholdSec : 2.5;
      const minLastClipSec = typeof config.minLastClipSec === 'number' ? config.minLastClipSec : 3.0;

      if (currentTotalSec < voEndSec && props.clips.length > 0) {
        const diff = Math.ceil((voEndSec - currentTotalSec + tailBufferSec) * 10) / 10;
        const lastClip = props.clips[props.clips.length - 1];
        const lastVidDur = lastClip.src ? getVideoDurationSec(lastClip.src) : null;
        if (lastVidDur && lastVidDur > 0) {
          const maxEnd = Math.floor(lastVidDur * 10) / 10;
          const targetSpan = (lastClip.endSec - lastClip.startSec) + diff;
          if (lastClip.endSec + diff <= maxEnd) {
            lastClip.endSec = Math.round((lastClip.endSec + diff) * 10) / 10;
          } else {
            lastClip.endSec = maxEnd;
            lastClip.startSec = Math.max(0, Math.round((maxEnd - targetSpan) * 10) / 10);
          }
        } else {
          lastClip.endSec = Math.round((lastClip.endSec + diff) * 10) / 10;
        }
        console.log(`[AUTO-FIT] Durasi voiceover (${voEndSec.toFixed(1)}s) melebihi klip (${currentTotalSec.toFixed(1)}s). Klip terakhir disesuaikan ke ${lastClip.startSec}-${lastClip.endSec}s (sisa napas ${tailBufferSec}s).`);
      } else if (currentTotalSec > voEndSec + deadAirThresholdSec && props.clips.length > 0) {
        // Hanya pangkas jika ada jeda hening berlebih (> 2.5s). Berikan ruang napas 1.4s agar ending tidak patah
        const excessSec = Math.round((currentTotalSec - (voEndSec + tailBufferSec)) * 10) / 10;
        const lastClip = props.clips[props.clips.length - 1];
        const currentClipDur = lastClip.endSec - lastClip.startSec;

        // Jaga agar durasi klip terakhir (Babak 4 / CTA) tidak dipangkas terlalu pendek (minimal minLastClipSec)
        const maxCanTrim = Math.max(0, currentClipDur - minLastClipSec);
        const actualTrimSec = Math.min(excessSec, maxCanTrim);

        if (actualTrimSec >= 0.4) {
          lastClip.endSec = Math.round((lastClip.endSec - actualTrimSec) * 10) / 10;
          const newTotalSec = props.clips.reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);
          console.log(`[AUTO-TRIM DEAD AIR] Durasi klip (${currentTotalSec.toFixed(1)}s) memiliki jeda hening berlebih dibanding voiceover (${voEndSec.toFixed(1)}s). Memangkas ${actualTrimSec.toFixed(1)}s (Total akhir: ${newTotalSec.toFixed(1)}s, sisa napas ${(newTotalSec - voEndSec).toFixed(1)}s agar ending halus & tidak patah).`);
        }
      }
    }
  }

  // Target Platform CTA (universal | tiktok | instagram)
  props.ctaPlatform = options.ctaPlatform || variant.ctaPlatform || config.defaultCtaPlatform || 'universal';

  // Resolve Cover Image if specified
  if (props.coverImage) {
    const coverImgResolved = resolvePublicPath(props.coverImage);
    if (!coverImgResolved) {
      console.warn(`[WARNING] File gambar cover public/${props.coverImage} tidak ditemukan! Beralih ke frame video.`);
      delete props.coverImage;
    } else {
      props.coverImage = coverImgResolved.relative;
    }
  }
  if (options.renderMode) {
    props.renderMode = options.renderMode;
  }

  // Calculate total duration
  const totalClipsSec = props.clips.reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);
  const fps = options.fps ? parseInt(options.fps, 10) : (config.defaultFps || 60);
  props.fps = fps;
  const durationInFrames = Math.round(Math.max(1, totalClipsSec) * fps);

  return {
    props,
    totalClipsSec,
    durationInFrames,
    fps,
  };
}

/**
 * Validate product data against affiliate video requirements
 */
export function validateProduct(productData) {
  const errors = [];
  const warnings = [];

  if (!productData || typeof productData !== 'object') {
    return { valid: false, errors: ['Data produk harus berupa objek JSON yang valid'], warnings: [] };
  }

  if (!productData.name || typeof productData.name !== 'string') {
    errors.push('Nama produk (name) wajib diisi.');
  }

  if (!productData.variants || typeof productData.variants !== 'object' || Object.keys(productData.variants).length === 0) {
    errors.push('Produk harus memiliki minimal satu varian (contoh: "v1").');
    return { valid: false, errors, warnings };
  }

  for (const [varKey, variant] of Object.entries(productData.variants)) {
    const prefix = `[${varKey}]`;
    if (!variant.badgeText) errors.push(`${prefix} badgeText wajib diisi.`);
    if (!variant.hookLine1) errors.push(`${prefix} hookLine1 wajib diisi.`);
    if (!variant.hookHighlight) errors.push(`${prefix} hookHighlight wajib diisi.`);
    if (!variant.demoLine1) errors.push(`${prefix} demoLine1 wajib diisi.`);
    if (!variant.demoHighlight) errors.push(`${prefix} demoHighlight wajib diisi.`);
    if (!variant.specLine1) errors.push(`${prefix} specLine1 wajib diisi.`);
    if (!variant.specHighlight) errors.push(`${prefix} specHighlight wajib diisi.`);
    if (!variant.ctaText) errors.push(`${prefix} ctaText wajib diisi.`);

    // Safe zone character length checks (maksimal ~38 karakter per baris agar tidak overflow)
    const checkLen = (field, val, max = 38) => {
      if (val && typeof val === 'string' && val.length > max) {
        warnings.push(`${prefix} ${field} (${val.length} karakter) melebihi batas rekomendasi ${max} karakter: "${val}"`);
      }
    };
    checkLen('hookLine1', variant.hookLine1);
    checkLen('hookHighlight', variant.hookHighlight);
    checkLen('demoLine1', variant.demoLine1);
    checkLen('demoHighlight', variant.demoHighlight);
    checkLen('specLine1', variant.specLine1);
    checkLen('specHighlight', variant.specHighlight);

    // Check clips
    if (!Array.isArray(variant.clips) || variant.clips.length === 0) {
      errors.push(`${prefix} clips wajib berupa array potongan video minimal 1 klip.`);
    } else {
      let clipIdx = 0;
      for (const clip of variant.clips) {
        clipIdx++;
        if (typeof clip.startSec !== 'number' || typeof clip.endSec !== 'number') {
          errors.push(`${prefix} Klip #${clipIdx} harus memiliki startSec dan endSec (angka detik).`);
        } else if (clip.endSec <= clip.startSec) {
          errors.push(`${prefix} Klip #${clipIdx} endSec (${clip.endSec}) harus lebih besar dari startSec (${clip.startSec}).`);
        }
        const videoTarget = clip.src || productData.videoSource;
        if (videoTarget) {
          let filePath = path.join(PUBLIC_DIR, videoTarget);
          if (!fs.existsSync(filePath) && productData.id) {
            const subPath = path.join(PUBLIC_DIR, 'products', productData.id, path.basename(videoTarget));
            if (fs.existsSync(subPath)) filePath = subPath;
          }
          if (!fs.existsSync(filePath)) {
            const rootFallback = path.join(PUBLIC_DIR, path.basename(videoTarget));
            if (fs.existsSync(rootFallback)) filePath = rootFallback;
          }
          if (!fs.existsSync(filePath)) {
            warnings.push(`${prefix} File video '${videoTarget}' belum ada di folder public/. Harap unggah sebelum render.`);
          } else {
            const vidDur = getVideoDurationSec(filePath);
            if (vidDur && clip.endSec > vidDur) {
              warnings.push(`${prefix} Klip #${clipIdx} (${clip.startSec}s - ${clip.endSec}s) melebihi durasi video mentah (${vidDur.toFixed(1)}s). Studio akan otomatis menyesuaikannya ke akhir video.`);
            }
          }
        }
      }
    }

    // Check voiceover
    if (variant.voiceOver) {
      let voPath = path.join(PUBLIC_DIR, variant.voiceOver);
      if (!fs.existsSync(voPath) && productData.id) {
        const subVo = path.join(PUBLIC_DIR, 'products', productData.id, path.basename(variant.voiceOver));
        if (fs.existsSync(subVo)) voPath = subVo;
      }
      if (!fs.existsSync(voPath)) {
        const rootVo = path.join(PUBLIC_DIR, path.basename(variant.voiceOver));
        if (fs.existsSync(rootVo)) voPath = rootVo;
      }
      if (!fs.existsSync(voPath)) {
        warnings.push(`${prefix} File voiceover '${variant.voiceOver}' belum ada di folder public/.`);
      }
    }

    // Check bgm
    if (variant.bgmTrack) {
      let bgmPath = path.join(PUBLIC_DIR, variant.bgmTrack);
      if (!fs.existsSync(bgmPath)) {
        const rootBgm = path.join(PUBLIC_DIR, path.basename(variant.bgmTrack));
        if (fs.existsSync(rootBgm)) bgmPath = rootBgm;
      }
      if (!fs.existsSync(bgmPath)) {
        warnings.push(`${prefix} File BGM '${variant.bgmTrack}' belum ada di folder public/.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
