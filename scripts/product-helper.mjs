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
  const filePath = path.isAbsolute(filename) ? filename : path.join(PUBLIC_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) return null;

  if (videoDurationCache.has(filePath)) {
    return videoDurationCache.get(filePath);
  }

  try {
    const stdout = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 }
    ).toString().trim();
    const sec = parseFloat(stdout);
    if (!isNaN(sec) && sec > 0) {
      videoDurationCache.set(filePath, sec);
      return sec;
    }
  } catch {}
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
    defaultWatermark: 'video milik @inanikma_',
    webPort: 3100,
    defaultFps: 60,
    defaultTheme: 'pastel',
    autoFitVoiceOver: true,
  };
}

/**
 * List all available products in products/ directory
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
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const id = data.id || path.basename(f, '.json');
      products.push({
        id,
        filename: f,
        name: data.name || id,
        videoSource: data.videoSource || '',
        variantKeys: Object.keys(data.variants || {}),
        variantsCount: Object.keys(data.variants || {}).length,
      });
    } catch (e) {
      console.warn(`[WARN] Gagal membaca produk ${f}:`, e.message);
    }
  }
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
    throw new Error(`File produk tidak ditemukan: ${targetPath}`);
  }
  const raw = fs.readFileSync(targetPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data.id) {
    data.id = path.basename(targetPath, '.json');
  }
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
    props.watermarkText = config.defaultWatermark || 'video milik @inanikma_';
  }
  if (!props.watermarkPosition) {
    props.watermarkPosition = variant.watermarkPosition || 'floating';
  }

  // Ensure clips src points to valid source video and clamp bounds within video duration
  if (Array.isArray(props.clips)) {
    props.clips = props.clips.map((c, idx) => {
      const src = c.src || product.videoSource || '';
      const exists = src && fs.existsSync(path.join(PUBLIC_DIR, src));
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
  if (props.voiceOver) {
    const voPath = path.join(PUBLIC_DIR, props.voiceOver);
    if (!fs.existsSync(voPath)) {
      console.warn(`[WARNING] File audio public/${props.voiceOver} tidak ditemukan! Voice over dinonaktifkan.`);
      delete props.voiceOver;
    } else {
      const voBase = props.voiceOver.replace(/\.[^/.]+$/, '');
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
    const bgmPath = path.join(PUBLIC_DIR, props.bgmTrack);
    if (!fs.existsSync(bgmPath)) {
      console.warn(`[WARNING] File audio BGM public/${props.bgmTrack} tidak ditemukan! BGM dinonaktifkan.`);
      delete props.bgmTrack;
    }
  } else if (config.defaultBgmTrack) {
    const defaultBgm = path.join(PUBLIC_DIR, config.defaultBgmTrack);
    if (fs.existsSync(defaultBgm)) {
      props.bgmTrack = config.defaultBgmTrack;
    }
  } else if (fs.existsSync(path.join(PUBLIC_DIR, 'bgm.mp3'))) {
    props.bgmTrack = 'bgm.mp3';
  } else if (fs.existsSync(path.join(PUBLIC_DIR, 'bgm'))) {
    try {
      const bgmFiles = fs.readdirSync(path.join(PUBLIC_DIR, 'bgm')).filter(f => /\.(mp3|wav|m4a|aac)$/i.test(f));
      if (bgmFiles.length > 0) {
        props.bgmTrack = `bgm/${bgmFiles[0]}`;
      }
    } catch {}
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

  // Auto-fit duration logic
  if (config.autoFitVoiceOver !== false && props.voiceOverCaptions && props.voiceOverCaptions.length > 0) {
    const lastWord = props.voiceOverCaptions[props.voiceOverCaptions.length - 1];
    if (lastWord && lastWord.endMs) {
      const voEndSec = (lastWord.endMs / 1000) + (props.voiceOverDelaySec || 0);
      const currentTotalSec = props.clips.reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);
      if (currentTotalSec < voEndSec) {
        const diff = Math.ceil(voEndSec - currentTotalSec + 1); // +1s buffer
        console.log(`[AUTO-FIT] Durasi voiceover (${voEndSec.toFixed(1)}s) melebihi klip (${currentTotalSec.toFixed(1)}s). Menambah ${diff}s ke klip terakhir agar audio tidak terpotong.`);
        if (props.clips.length > 0) {
          props.clips[props.clips.length - 1].endSec += diff;
        }
      }
    }
  }

  // Calculate total duration
  const totalClipsSec = props.clips.reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);
  const fps = options.fps || config.defaultFps || 60;
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
          const filePath = path.join(PUBLIC_DIR, path.basename(videoTarget));
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
      const voPath = path.join(PUBLIC_DIR, variant.voiceOver);
      if (!fs.existsSync(voPath)) {
        warnings.push(`${prefix} File voiceover '${variant.voiceOver}' belum ada di folder public/.`);
      }
    }

    // Check bgm
    if (variant.bgmTrack) {
      const bgmPath = path.join(PUBLIC_DIR, variant.bgmTrack);
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
