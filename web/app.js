/* tasteskill / app.js
   TikTok Affiliate Video Studio — Pure Node & Product-Driven Controller
   Supports product JSONs, instant still preview, Gemini JSON import, direct uploads,
   supercharged Whisper AI subtitle corrections (merge, split, delete), and custom video output naming */

(function () {
  'use strict';

  // Application State
  const state = {
    products: [],
    activeProductId: null,
    currentProduct: null,
    activeVariantKey: 'v1',
    assets: {
      voiceOvers: [],
      videos: [],
      transcripts: []
    },
    activeTranscriptFile: null,
    activeTranscriptWords: [],
    isRendering: false,
    importedProductCandidate: null,
    defaultWatermark: ''
  };

  // Helper DOM selector
  const $ = id => document.getElementById(id);

  const el = {
    // Header Navigation & Studio Tabs
    mainStudioTabs: $('mainStudioTabs'),
    tabStudio: $('tabStudio'),
    tabSubtitles: $('tabSubtitles'),
    tabPublic: $('tabPublic'),
    headerPublicCount: $('headerPublicCount'),

    // Global Header Actions
    btnOpenGDriveModal: $('btnOpenGDriveModal'),
    gdriveHeaderStatusDot: $('gdriveHeaderStatusDot'),
    btnOpenImportModal: $('btnOpenImportModal'),
    btnPreviewStill: $('btnPreviewStill'),
    btnStartRender: $('btnStartRender'),
    btnCancelRender: $('btnCancelRender'),
    renderStatusPill: $('renderStatusPill'),
    activeProductBreadcrumb: $('activeProductBreadcrumb'),
    headerProgressStrip: $('headerProgressStrip'),
    headerProgressFill: $('headerProgressFill'),

    // Product Base Form
    selectProduct: $('selectProduct'),
    btnNewProduct: $('btnNewProduct'),
    btnSaveProduct: $('btnSaveProduct'),
    inputProductName: $('inputProductName'),
    inputCustomOutputName: $('inputCustomOutputName'),
    selectProductVideo: $('selectProductVideo'),
    selectVoiceOver: $('selectVoiceOver'),
    labelVoiceOver: $('labelVoiceOver'),
    pillVoiceOverStatus: $('pillVoiceOverStatus'),
    btnJumpToSubtitle: $('btnJumpToSubtitle'),
    selectBgmTrack: $('selectBgmTrack'),
    inputWatermark: $('inputWatermark'),
    selectWatermarkPosition: $('selectWatermarkPosition'),

    // Variant Form
    variantSegmented: $('variantSegmented'),
    durationMatchPill: $('durationMatchPill'),
    selectThemeStyle: $('selectThemeStyle'),
    selectCardStyle: $('selectCardStyle'),
    inputVoiceOverDelay: $('inputVoiceOverDelay'),
    storyboardContainer: $('storyboardContainer'),
    clipsTableBody: $('clipsTableBody'),

    // Timeline segments
    barClip0: $('barClip0'),
    barClip1: $('barClip1'),
    barClip2: $('barClip2'),
    barClip3: $('barClip3'),

    // Headlines & Badges
    inputBadgeText: $('inputBadgeText'),
    inputHookLine1: $('inputHookLine1'),
    inputHookHighlight: $('inputHookHighlight'),
    inputDemoLine1: $('inputDemoLine1'),
    inputDemoHighlight: $('inputDemoHighlight'),
    inputSpecLine1: $('inputSpecLine1'),
    inputSpecHighlight: $('inputSpecHighlight'),
    inputCtaText: $('inputCtaText'),

    // Live Char Counters
    countHookLine1: $('countHookLine1'),
    countHookHighlight: $('countHookHighlight'),
    countDemoLine1: $('countDemoLine1'),
    countDemoHighlight: $('countDemoHighlight'),
    countSpecLine1: $('countSpecLine1'),
    countSpecHighlight: $('countSpecHighlight'),

    // Monitor & Console
    selectFps: $('selectFps'),
    selectRenderScope: $('selectRenderScope'),
    monitorSubText: $('monitorSubText'),
    progressStep: $('progressStep'),
    progressPercent: $('progressPercent'),
    progressBarFill: $('progressBarFill'),
    progressFrames: $('progressFrames'),
    progressEta: $('progressEta'),
    consoleBox: $('consoleBox'),

    // Player (9:16 Mockup)
    selectOutputVideo: $('selectOutputVideo'),
    phoneBezel: $('phoneBezel'),
    videoPreview: $('videoPreview'),
    playerStillImage: $('playerStillImage'),
    btnExitStillView: $('btnExitStillView'),
    btnToggleSafeArea: $('btnToggleSafeArea'),
    tiktokSafeAreaOverlay: $('tiktokSafeAreaOverlay'),
    btnToggleLoop: $('btnToggleLoop'),
    playerEmptyMsg: $('playerEmptyMsg'),
    videoMetaText: $('videoMetaText'),
    btnOpenExternal: $('btnOpenExternal'),
    btnDownloadVideo: $('btnDownloadVideo'),
    btnUploadToGDrive: $('btnUploadToGDrive'),

    // Upload Dropzone
    fileDropzone: $('fileDropzone'),
    fileUploadInput: $('fileUploadInput'),
    uploadStatusBox: $('uploadStatusBox'),

    // Subtitle Editor
    selectTranscriptFile: $('selectTranscriptFile'),
    subtitleAudioPlayer: $('subtitleAudioPlayer'),
    inputReferenceScript: $('inputReferenceScript'),
    btnClearReferenceScript: $('btnClearReferenceScript'),
    btnAutoCorrectSubtitles: $('btnAutoCorrectSubtitles'),
    autoCorrectFeedback: $('autoCorrectFeedback'),
    btnTranscribeCurrentVO: $('btnTranscribeCurrentVO'),
    btnSaveSubtitles: $('btnSaveSubtitles'),
    wordsTableBody: $('wordsTableBody'),

    // Galeri & Berkas Media Browser
    btnOpenOutFolder: $('btnOpenOutFolder'),
    btnOpenPublicFolder: $('btnOpenPublicFolder'),
    btnRefreshPublicBrowser: $('btnRefreshPublicBrowser'),
    inputPublicSearch: $('inputPublicSearch'),
    btnClearPublicSearch: $('btnClearPublicSearch'),
    countPublicPreviews: $('countPublicPreviews'),
    countPublicVideos: $('countPublicVideos'),
    countPublicMedia: $('countPublicMedia'),
    countPublicSfx: $('countPublicSfx'),
    publicPreviewsView: $('publicPreviewsView'),
    publicVideosView: $('publicVideosView'),
    publicMediaView: $('publicMediaView'),
    publicSfxView: $('publicSfxView'),
    publicPreviewsGrid: $('publicPreviewsGrid'),
    publicVideosTableBody: $('publicVideosTableBody'),
    publicMediaTableBody: $('publicMediaTableBody'),
    publicSfxTableBody: $('publicSfxTableBody'),

    // Modals
    modalImportGemini: $('modalImportGemini'),
    btnCloseImportModal: $('btnCloseImportModal'),
    textareaGeminiJson: $('textareaGeminiJson'),
    btnValidateJson: $('btnValidateJson'),
    btnApplyImportedJson: $('btnApplyImportedJson'),
    importFeedback: $('importFeedback'),

    modalStillPreview: $('modalStillPreview'),
    btnCloseStillModal: $('btnCloseStillModal'),
    btnCloseStillModal2: $('btnCloseStillModal2'),
    selectPreviewSecond: $('selectPreviewSecond'),
    btnRefreshStill: $('btnRefreshStill'),
    btnRefreshStillIcon: $('btnRefreshStillIcon'),
    btnRefreshStillText: $('btnRefreshStillText'),
    stillModalStatusPill: $('stillModalStatusPill'),
    stillProgressBox: $('stillProgressBox'),
    stillSpinner: $('stillSpinner'),
    stillProgressStepText: $('stillProgressStepText'),
    stillTimerText: $('stillTimerText'),
    stillProgressBarFill: $('stillProgressBarFill'),
    stillProgressDetailText: $('stillProgressDetailText'),
    stillPercentText: $('stillPercentText'),
    stillFeedbackBanner: $('stillFeedbackBanner'),
    stillLoadingText: $('stillLoadingText'),
    stillLoadingSubtext: $('stillLoadingSubtext'),
    stillImagePreview: $('stillImagePreview'),
    stillImageContainer: $('stillImageContainer'),
    stillEmptyPlaceholder: $('stillEmptyPlaceholder'),
    stillMetaInfo: $('stillMetaInfo'),
    btnDownloadStill: $('btnDownloadStill'),
    toastContainer: $('toastContainer'),

    // Google Drive Link Modal & Live Upload Progress Elements
    modalGDriveConfig: $('modalGDriveConfig'),
    btnCloseGDriveModal: $('btnCloseGDriveModal'),
    btnCloseGDriveModal2: $('btnCloseGDriveModal2'),
    inputGDriveUrl: $('inputGDriveUrl'),
    inputGDriveWebhookUrl: $('inputGDriveWebhookUrl'),
    pillGDriveStatus: $('pillGDriveStatus'),
    btnTestGDriveLink: $('btnTestGDriveLink'),
    btnSaveGDriveLink: $('btnSaveGDriveLink'),
    gdriveSaveFeedback: $('gdriveSaveFeedback'),
    gdriveUploadProgressBox: $('gdriveUploadProgressBox'),
    uploadPulseDot: $('uploadPulseDot'),
    gdriveUploadTitle: $('gdriveUploadTitle'),
    gdriveUploadPercent: $('gdriveUploadPercent'),
    gdriveUploadBarFill: $('gdriveUploadBarFill'),
    gdriveUploadStatusText: $('gdriveUploadStatusText'),
    gdriveUploadSizeText: $('gdriveUploadSizeText'),
    gdriveUploadSuccessActions: $('gdriveUploadSuccessActions'),
    btnGdriveViewUploaded: $('btnGdriveViewUploaded'),
    btnGdriveDismissProgress: $('btnGdriveDismissProgress'),

    // Gallery Tab Upload Progress Box Elements
    gdriveGalleryUploadProgressBox: $('gdriveGalleryUploadProgressBox'),
    uploadGalleryPulseDot: $('uploadGalleryPulseDot'),
    gdriveGalleryUploadTitle: $('gdriveGalleryUploadTitle'),
    gdriveGalleryUploadPercent: $('gdriveGalleryUploadPercent'),
    gdriveGalleryUploadBarFill: $('gdriveGalleryUploadBarFill'),
    gdriveGalleryUploadStatusText: $('gdriveGalleryUploadStatusText'),
    gdriveGalleryUploadSizeText: $('gdriveGalleryUploadSizeText'),
    gdriveGalleryUploadSuccessActions: $('gdriveGalleryUploadSuccessActions'),
    btnGdriveGalleryViewUploaded: $('btnGdriveGalleryViewUploaded'),
    btnGdriveGalleryDismissProgress: $('btnGdriveGalleryDismissProgress'),

    // Modal Konfirmasi Render Video
    modalRenderConfirm: $('modalRenderConfirm'),
    btnCloseRenderConfirmModal: $('btnCloseRenderConfirmModal'),
    btnCancelRenderConfirm: $('btnCancelRenderConfirm'),
    btnExecuteRenderConfirm: $('btnExecuteRenderConfirm'),
    renderModalProductName: $('renderModalProductName'),
    renderModalOutputName: $('renderModalOutputName'),
    renderModalFps: $('renderModalFps'),
    renderModalV1Title: $('renderModalV1Title'),
    renderModalV2Title: $('renderModalV2Title'),
    chkGpuRender: $('chkGpuRender'),
    gpuRenderToggleRow: $('gpuRenderToggleRow'),
  };

  // -------------------------------------------------------------
  // Helpers & Formatting
  // -------------------------------------------------------------
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  function parseTimeInput(val) {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    const s = val.trim();
    if (s.includes(':')) {
      const parts = s.split(':');
      const min = parseFloat(parts[0]) || 0;
      const sec = parseFloat(parts[1]) || 0;
      return Math.round((min * 60 + sec) * 100) / 100;
    }
    return Math.round((parseFloat(s) || 0) * 100) / 100;
  }

  function formatTimeDisplay(sec) {
    if (isNaN(sec) || sec < 0) return '0';
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const s = (sec % 60).toFixed(1).padStart(4, '0');
      return `${m}:${s}`;
    }
    return Number.isInteger(sec) ? String(sec) : sec.toFixed(1);
  }

  function appendLog(line, isAccent = false) {
    if (!el.consoleBox) return;
    const now = new Date().toTimeString().split(' ')[0];
    const item = document.createElement('div');
    item.className = 'log-line';
    const timeSpan = `<span class="log-time">[${now}]</span>`;
    if (isAccent) {
      item.innerHTML = `${timeSpan}<span class="log-accent">${escapeHtml(line)}</span>`;
    } else {
      item.innerHTML = `${timeSpan}${escapeHtml(line)}`;
    }
    el.consoleBox.appendChild(item);
    el.consoleBox.scrollTop = el.consoleBox.scrollHeight;
  }

  // -------------------------------------------------------------
  // Tab Switching Logic
  // -------------------------------------------------------------
  function switchTab(targetTab) {
    document.querySelectorAll('.studio-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === targetTab);
    });

    el.tabStudio.classList.toggle('active', targetTab === 'studio');
    el.tabSubtitles.classList.toggle('active', targetTab === 'subtitles');
    if (el.tabPublic) el.tabPublic.classList.toggle('active', targetTab === 'public');
    window.location.hash = targetTab;

    if (targetTab === 'public') {
      loadPublicBrowser();
    } else if (targetTab === 'subtitles') {
      // Selalu muat transkrip yang cocok dengan voiceover variasi yang sedang diedit di Studio
      const curVO = el.selectVoiceOver.value;
      const matchingJson = curVO ? curVO.replace(/\.[^/.]+$/, '.json') : null;
      const exists = state.assets.transcripts.find(t => t.name === matchingJson);
      if (exists) {
        el.selectTranscriptFile.value = matchingJson;
        loadTranscript(matchingJson);
      } else if (!state.activeTranscriptFile && state.assets.transcripts.length > 0) {
        el.selectTranscriptFile.value = state.assets.transcripts[0].name;
        loadTranscript(state.assets.transcripts[0].name);
      }
    }
  }

  el.mainStudioTabs.addEventListener('click', e => {
    const btn = e.target.closest('.studio-tab-btn');
    if (btn && btn.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });

  // -------------------------------------------------------------
  // Asset Management (public/ folder)
  // -------------------------------------------------------------
  async function loadAssets() {
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Gagal memuat assets');
      const data = await res.json();
      state.assets = data;

      // Update Video selector
      el.selectProductVideo.innerHTML = '';
      if (data.videos.length === 0) {
        el.selectProductVideo.innerHTML = '<option value="">(Belum ada video di public/)</option>';
      } else {
        data.videos.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.name;
          opt.textContent = v.name;
          el.selectProductVideo.appendChild(opt);
        });
      }

      // Update Voiceover selector
      el.selectVoiceOver.innerHTML = '';
      if (data.voiceOvers.length === 0) {
        el.selectVoiceOver.innerHTML = '<option value="">(Belum ada audio di public/)</option>';
      } else {
        data.voiceOvers.forEach(vo => {
          const opt = document.createElement('option');
          opt.value = vo.name;
          const status = vo.hasTranscript ? `(${vo.wordsCount} kata)` : '(belum ada json)';
          opt.textContent = `${vo.name} ${status}`;
          el.selectVoiceOver.appendChild(opt);
        });
      }

      // Update Transcript selector
      el.selectTranscriptFile.innerHTML = '';
      if (data.transcripts.length === 0) {
        el.selectTranscriptFile.innerHTML = '<option value="">(Belum ada transkrip json)</option>';
      } else {
        data.transcripts.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.name;
          opt.textContent = t.name;
          el.selectTranscriptFile.appendChild(opt);
        });
      }

      // Update BGM selector
      if (el.selectBgmTrack) {
        el.selectBgmTrack.innerHTML = '<option value="">(Tanpa BGM / Hening)</option>';
        if (data.bgms && data.bgms.length > 0) {
          data.bgms.forEach(bgm => {
            const opt = document.createElement('option');
            opt.value = bgm.name;
            opt.textContent = `🎵 ${bgm.displayName || bgm.name}`;
            el.selectBgmTrack.appendChild(opt);
          });
        }
        // Also list general audio files
        data.voiceOvers.forEach(vo => {
          if (!data.bgms?.some(b => b.name === vo.name)) {
            const opt = document.createElement('option');
            opt.value = vo.name;
            opt.textContent = `🎵 ${vo.name}`;
            el.selectBgmTrack.appendChild(opt);
          }
        });
      }

      // Retain selections if product is loaded
      if (state.currentProduct) {
        if (state.currentProduct.videoSource) {
          el.selectProductVideo.value = state.currentProduct.videoSource;
        }
        const v = state.currentProduct.variants?.[state.activeVariantKey];
        if (v && v.voiceOver) {
          el.selectVoiceOver.value = v.voiceOver;
        }
      }
    } catch (err) {
      console.error(err);
      appendLog(`[ERROR] Gagal memuat daftar media: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Product Management (products/ folder)
  // -------------------------------------------------------------
  async function loadProductsList() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal memuat daftar produk');
      const products = await res.json();
      state.products = products;

      el.selectProduct.innerHTML = '';
      if (products.length === 0) {
        el.selectProduct.innerHTML = '<option value="">(Belum ada produk tersimpan)</option>';
        return;
      }

      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.id})`;
        el.selectProduct.appendChild(opt);
      });

      const targetId = state.activeProductId || products[0].id;
      await selectProduct(targetId);
    } catch (err) {
      console.error(err);
      appendLog(`[ERROR] Gagal memuat produk: ${err.message}`);
    }
  }

  async function selectProduct(id) {
    if (!id) return;
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error(`Produk '${id}' tidak ditemukan`);
      const prod = await res.json();
      state.activeProductId = id;
      state.currentProduct = prod;

      el.selectProduct.value = id;
      renderProductToForm(prod);
      appendLog(`[PRODUK] Berhasil memuat data: ${prod.name}`);
    } catch (err) {
      alert(err.message);
    }
  }

  function renderProductToForm(prod) {
    el.activeProductBreadcrumb.textContent = `${prod.name} · ID: ${prod.id}`;
    el.inputProductName.value = prod.name || '';

    // Set custom output name default to product name
    if (!el.inputCustomOutputName.value || el.inputCustomOutputName.value === prod.name) {
      el.inputCustomOutputName.value = prod.name || '';
    }

    if (prod.videoSource && el.selectProductVideo.querySelector(`option[value="${prod.videoSource}"]`)) {
      el.selectProductVideo.value = prod.videoSource;
    }

    renderVariant(state.activeVariantKey);
  }

  function renderVariant(variantKey) {
    state.activeVariantKey = variantKey;
    const v = state.currentProduct?.variants?.[variantKey];
    if (!v) return;

    // Segmented button active state
    document.querySelectorAll('#variantSegmented button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.variant === variantKey);
    });

    el.selectThemeStyle.value = v.themeStyle || 'pastel';
    el.selectCardStyle.value = v.cardStyle || 'creator_aesthetic';

    // Update label Voice Over sesuai varian aktif
    if (el.labelVoiceOver) {
      el.labelVoiceOver.textContent = `🎙️ Voice Over untuk ${variantKey.toUpperCase()} (${variantKey === 'v1' ? 'Variasi 1' : 'Variasi 2'})`;
    }

    // Smart auto-detection of Voice Over jika belum diset
    let targetVO = v.voiceOver;
    if (!targetVO || !el.selectVoiceOver.querySelector(`option[value="${targetVO}"]`)) {
      const match = state.assets.voiceOvers.find(vo => vo.name.toLowerCase().includes(variantKey));
      if (match) {
        targetVO = match.name;
        v.voiceOver = targetVO;
      } else if (state.assets.voiceOvers.length > 0) {
        targetVO = state.assets.voiceOvers[0].name;
        v.voiceOver = targetVO;
      }
    }
    if (targetVO && el.selectVoiceOver.querySelector(`option[value="${targetVO}"]`)) {
      el.selectVoiceOver.value = targetVO;
    }
    updateVoiceOverStatusPill(el.selectVoiceOver.value);

    if (el.selectBgmTrack) {
      el.selectBgmTrack.value = v.bgmTrack || '';
    }
    el.inputVoiceOverDelay.value = v.voiceOverDelaySec || 0;
    el.inputWatermark.value = v.watermarkText || state.defaultWatermark || '';
    if (el.selectWatermarkPosition) el.selectWatermarkPosition.value = v.watermarkPosition || 'floating';

    // Headlines
    el.inputBadgeText.value = v.badgeText || '';
    el.inputHookLine1.value = v.hookLine1 || '';
    el.inputHookHighlight.value = v.hookHighlight || '';
    el.inputDemoLine1.value = v.demoLine1 || '';
    el.inputDemoHighlight.value = v.demoHighlight || '';
    el.inputSpecLine1.value = v.specLine1 || '';
    el.inputSpecHighlight.value = v.specHighlight || '';
    el.inputCtaText.value = v.ctaText || 'Cek Promo di Keranjang Kuning';
    // Naskah acuan dibiarkan kosong secara default sesuai permintaan user agar tidak perlu repot menghapus teks lama
    // if (el.inputReferenceScript) el.inputReferenceScript.value = '';

    updateCharCounters();

    // Clips table
    renderClipsTable(v.clips || []);
    checkDurationMatch(v);
  }

  function renderClipsTable(clips) {
    const totalClips = 4;
    let totalSec = 0;
    const clipDurations = [];

    for (let i = 0; i < totalClips; i++) {
      const c = clips[i] || { startSec: i * 5, endSec: (i + 1) * 5 };
      const dur = Math.max(0, c.endSec - c.startSec);
      clipDurations.push(dur);
      totalSec += dur;

      const startInp = document.querySelector(`.clip-time-input[data-clip="${i}"][data-field="start"]`);
      const endInp = document.querySelector(`.clip-time-input[data-clip="${i}"][data-field="end"]`);
      const durEl = $(`clipDur_${i}`);

      if (startInp) startInp.value = formatTimeDisplay(c.startSec);
      if (endInp) endInp.value = formatTimeDisplay(c.endSec);
      if (durEl) durEl.textContent = `${dur.toFixed(1)}s`;
    }

    // Update timeline strip widths
    if (totalSec > 0) {
      if (el.barClip0) el.barClip0.style.width = `${(clipDurations[0] / totalSec) * 100}%`;
      if (el.barClip1) el.barClip1.style.width = `${(clipDurations[1] / totalSec) * 100}%`;
      if (el.barClip2) el.barClip2.style.width = `${(clipDurations[2] / totalSec) * 100}%`;
      if (el.barClip3) el.barClip3.style.width = `${(clipDurations[3] / totalSec) * 100}%`;
    }

    updateThemeVisualPreview();
  }

  // Visual Theme Presets & Card Style Info for Live Studio Preview
  const THEME_PRESETS = {
    editorial: {
      name: 'Editorial Dark',
      tag: 'EDITORIAL',
      accentColor: '#E2FF32', // Acid Lime Neon
      textColor: '#F8FAFC',
      mutedColor: '#94A3B8',
      cardBg: 'rgba(12, 14, 20, 0.78)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.16)',
      cardShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
      badgeBg: 'rgba(12, 14, 20, 0.92)',
      badgeBorder: '1.5px solid rgba(226, 255, 50, 0.55)',
      badgeColor: '#F8FAFC',
      dotColor: '#E2FF32',
      highlightColor: '#E2FF32',
      highlightShadow: '0 2px 14px rgba(226, 255, 50, 0.35)',
      desc: 'Kombinasi elegan gelap dengan tipografi Acid Lime neon berenergi tinggi. Kontras tajam yang sangat menyerap perhatian di detik-detik awal feed TikTok (stopping power maksimal).'
    },
    pastel: {
      name: 'Pastel Clean Beauty',
      tag: 'PASTEL',
      accentColor: '#FF4D6D', // Soft Rose Coral
      textColor: '#0F172A',
      mutedColor: '#64748B',
      cardBg: 'rgba(255, 255, 255, 0.90)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.95)',
      cardShadow: '0 16px 36px rgba(225, 29, 72, 0.12), 0 6px 18px rgba(0, 0, 0, 0.08)',
      badgeBg: 'rgba(255, 255, 255, 0.96)',
      badgeBorder: '1.5px solid rgba(255, 77, 109, 0.45)',
      badgeColor: '#E11D48',
      dotColor: '#FF4D6D',
      highlightColor: '#E11D48',
      highlightShadow: '0 2px 12px rgba(225, 29, 72, 0.25)',
      desc: 'Nuansa cerah, lembut, dan bersih khas beauty/skincare & home aesthetic. Kartu putih frosted dengan aksen Soft Rose coral yang ramah, hangat, dan estetik.'
    },
    minimal: {
      name: 'Minimalist Monochrome',
      tag: 'MINIMAL',
      accentColor: '#FFFFFF',
      textColor: '#FFFFFF',
      mutedColor: '#CBD5E1',
      cardBg: 'rgba(0, 0, 0, 0.65)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.25)',
      cardShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      badgeBg: 'rgba(0, 0, 0, 0.75)',
      badgeBorder: '1.5px solid rgba(255, 255, 255, 0.4)',
      badgeColor: '#FFFFFF',
      dotColor: '#FFFFFF',
      highlightColor: '#FFFFFF',
      highlightShadow: '0 2px 12px rgba(255, 255, 255, 0.3)',
      desc: 'Hitam-putih monokrom mewah ala desainer high-end. Bersih, tanpa distraksi warna, menonjolkan kejelasan video produk di belakangnya.'
    },
    flash_sale: {
      name: 'Flash Sale Viral Pro',
      tag: 'FLASH SALE',
      accentColor: '#FF2E54', // TikTok Crimson Red
      textColor: '#FFFFFF',
      mutedColor: '#CBD5E1',
      cardBg: 'rgba(16, 14, 20, 0.85)',
      cardBorder: '1px solid rgba(255, 46, 84, 0.35)',
      cardShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 46, 84, 0.2)',
      badgeBg: 'rgba(18, 18, 24, 0.92)',
      badgeBorder: '1.5px solid rgba(255, 46, 84, 0.7)',
      badgeColor: '#FFFFFF',
      dotColor: '#FFDE59', // Gold
      highlightColor: '#FF2E54',
      highlightShadow: '0 2px 16px rgba(255, 46, 84, 0.4)',
      desc: 'Aksen TikTok Coral Crimson & titik indikator Golden urgency. Memberikan dorongan FOMO dan urgensi checkout keranjang kuning yang agresif.'
    }
  };

  const CARD_SHAPE_INFO = {
    unified_glass: {
      name: 'Unified Glass',
      shapeClass: 'shape-glass',
      descSuffix: 'Format kartu kaca satu pulau (Apple dynamic island style) dengan rounded sudut luas dan frosted backdrop blur.'
    },
    editorial_minimal: {
      name: 'Editorial Minimal',
      shapeClass: 'shape-two_tier',
      descSuffix: 'Format 2-tier terpisah proporsional: badge pill mengambang independen di atas kartu teks naskah.'
    },
    creator_aesthetic: {
      name: 'Creator Aesthetic',
      shapeClass: 'shape-floating',
      descSuffix: 'Gaya konten kreator organik dengan kartu berbingkai difusi halus tipis tanpa kesan kaku AI-generated.'
    },
    clean_capsule: {
      name: 'Clean Capsule',
      shapeClass: 'shape-capsule',
      descSuffix: 'Bentuk kapsul pill melengkung penuh, sangat ringkas dan menyisakan banyak area visual untuk footage produk.'
    },
    tiktok_native_ugc: {
      name: 'TikTok Native UGC',
      shapeClass: 'shape-tiktok_ugc',
      descSuffix: 'Subtitle khas CapCut & TikTok: teks putih tebal dengan stempel highlight kuning stabilo FYP yang sangat dipercaya audiens.'
    },
    top_banner_promo: {
      name: 'Top-Banner Promo',
      shapeClass: 'shape-top_banner',
      descSuffix: 'Banner strip promo flash sale di bagian atas layar untuk mengunci urgensi diskon & menyisakan seluruh layar untuk video.'
    }
  };

  function updateThemeVisualPreview() {
    const wrap = $('themeLivePreviewWrap');
    if (!wrap) return;

    const themeKey = el.selectThemeStyle ? el.selectThemeStyle.value : 'editorial';
    const cardKey = el.selectCardStyle ? el.selectCardStyle.value : 'unified_glass';

    const theme = THEME_PRESETS[themeKey] || THEME_PRESETS.editorial;
    const card = CARD_SHAPE_INFO[cardKey] || CARD_SHAPE_INFO.unified_glass;

    const tagEl = $('livePreviewTag');
    const containerEl = $('livePreviewContainer') || $('livePreviewCard');
    const textBoxEl = $('livePreviewTextBox');
    const badgeEl = $('livePreviewBadge');
    const dotEl = $('livePreviewDot');
    const badgeText = $('livePreviewBadgeText');
    const line1El = $('livePreviewLine1');
    const highlightEl = $('livePreviewHighlight');
    const descEl = $('livePreviewDesc');

    if (tagEl) {
      tagEl.textContent = `${theme.tag} • ${card.name.toUpperCase()}`;
    }

    if (containerEl) {
      containerEl.className = 'theme-mockup-container ' + card.shapeClass;

      if (card.shapeClass === 'shape-two_tier') {
        // 2-Tier: Container is transparent, TextBox has the surface card!
        containerEl.style.background = 'transparent';
        containerEl.style.border = 'none';
        containerEl.style.boxShadow = 'none';

        if (textBoxEl) {
          textBoxEl.style.background = theme.cardBg;
          textBoxEl.style.border = theme.cardBorder;
          textBoxEl.style.boxShadow = theme.cardShadow;
        }
      } else if (card.shapeClass === 'shape-floating' || card.shapeClass === 'shape-tiktok_ugc') {
        // Floating / TikTok UGC: Text on footage, no card box
        containerEl.style.background = 'transparent';
        containerEl.style.border = 'none';
        containerEl.style.boxShadow = 'none';

        if (textBoxEl) {
          textBoxEl.style.background = 'transparent';
          textBoxEl.style.border = 'none';
          textBoxEl.style.boxShadow = 'none';
        }
      } else if (card.shapeClass === 'shape-top_banner') {
        // Top Banner Strip: Banner at top, TextBox below
        containerEl.style.background = 'transparent';
        containerEl.style.border = 'none';
        containerEl.style.boxShadow = 'none';

        if (textBoxEl) {
          textBoxEl.style.background = theme.cardBg;
          textBoxEl.style.border = theme.cardBorder;
          textBoxEl.style.boxShadow = theme.cardShadow;
        }
      } else {
        // Unified Glass & Clean Capsule: Container has the frosted island card
        containerEl.style.background = theme.cardBg;
        containerEl.style.border = theme.cardBorder;
        containerEl.style.boxShadow = theme.cardShadow;

        if (textBoxEl) {
          textBoxEl.style.background = 'transparent';
          textBoxEl.style.border = 'none';
          textBoxEl.style.boxShadow = 'none';
        }
      }
    }

    if (badgeEl) {
      if (card.shapeClass === 'shape-floating') {
        badgeEl.style.background = 'rgba(0, 0, 0, 0.72)';
        badgeEl.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        badgeEl.style.color = '#FFFFFF';
      } else if (card.shapeClass === 'shape-tiktok_ugc') {
        badgeEl.style.background = 'rgba(0, 0, 0, 0.78)';
        badgeEl.style.border = '1.5px solid rgba(255, 255, 255, 0.4)';
        badgeEl.style.color = '#FFFFFF';
      } else if (card.shapeClass === 'shape-top_banner') {
        badgeEl.style.background = 'linear-gradient(90deg, #FF0050 0%, #FF2E54 50%, #FF6B00 100%)';
        badgeEl.style.border = 'none';
        badgeEl.style.color = '#FFFFFF';
      } else {
        badgeEl.style.background = theme.badgeBg;
        badgeEl.style.border = theme.badgeBorder;
        badgeEl.style.color = theme.badgeColor;
      }
    }

    if (dotEl) {
      if (card.shapeClass === 'shape-floating') {
        dotEl.style.background = '#FFFFFF';
        dotEl.style.color = '#FFFFFF';
        dotEl.style.boxShadow = '0 0 10px #FFFFFF';
      } else if (card.shapeClass === 'shape-tiktok_ugc') {
        dotEl.style.background = '#FF0050';
        dotEl.style.color = '#FF0050';
        dotEl.style.boxShadow = '0 0 10px #FF0050';
      } else if (card.shapeClass === 'shape-top_banner') {
        dotEl.style.background = '#FFE600';
        dotEl.style.color = '#FFE600';
        dotEl.style.boxShadow = '0 0 10px #FFE600';
      } else {
        dotEl.style.background = theme.dotColor;
        dotEl.style.color = theme.dotColor;
        dotEl.style.boxShadow = `0 0 8px ${theme.dotColor}`;
      }
    }

    // Ambil teks headline aktif dari input form bila ada
    const curBadge = el.inputBadgeText ? el.inputBadgeText.value.trim() : '';
    const curLine1 = el.inputHookLine1 ? el.inputHookLine1.value.trim() : '';
    const curHighlight = el.inputHookHighlight ? el.inputHookHighlight.value.trim() : '';

    if (badgeText) {
      if (card.shapeClass === 'shape-top_banner') {
        badgeText.innerHTML = `<span>⚡ ${escapeHtml(curBadge || 'FLASH SALE HARI INI')}</span><span style="font-size:9.5px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:999px; color:#FFE600; font-weight:800; margin-left: auto;">LIMITED</span>`;
      } else {
        badgeText.textContent = curBadge || 'IBU-IBU WAJIB TAU';
      }
    }

    if (line1El) {
      line1El.textContent = curLine1 || 'Nyesel baru tahu sekarang...';
      if (card.shapeClass === 'shape-floating' || card.shapeClass === 'shape-tiktok_ugc') {
        line1El.style.color = '#FFFFFF';
        line1El.style.textShadow = '0 2px 8px rgba(0, 0, 0, 0.95), 0 4px 20px rgba(0, 0, 0, 0.75)';
      } else {
        line1El.style.color = theme.textColor;
        line1El.style.textShadow = 'none';
      }
    }

    if (highlightEl) {
      highlightEl.textContent = curHighlight || 'Lemari Bebas Apek Seharian!';
      if (card.shapeClass === 'shape-tiktok_ugc') {
        highlightEl.style.color = '#000000';
        highlightEl.style.textShadow = 'none';
      } else if (card.shapeClass === 'shape-floating') {
        highlightEl.style.color = theme.highlightColor;
        highlightEl.style.textShadow = '0 3px 14px rgba(0, 0, 0, 0.85)';
      } else {
        highlightEl.style.color = theme.highlightColor;
        highlightEl.style.textShadow = theme.highlightShadow;
      }
    }

    if (descEl) {
      descEl.innerHTML = `<strong>${theme.name}:</strong> ${theme.desc}<br><span style="color:var(--text-faint); margin-top:3px; display:inline-block;">📐 <strong>Bentuk Kartu:</strong> ${card.descSuffix}</span>`;
    }
  }

  function checkDurationMatch(v) {
    if (!v) return;
    const totalClipDuration = (v.clips || []).reduce((acc, c) => acc + Math.max(0, c.endSec - c.startSec), 0);
    const voFile = el.selectVoiceOver.value;
    const voAsset = state.assets.voiceOvers.find(vo => vo.name === voFile);

    if (totalClipDuration <= 0) {
      el.durationMatchPill.textContent = 'Durasi: 0s';
      el.durationMatchPill.className = 'pill rose';
      return;
    }

    el.durationMatchPill.textContent = `Total Klip: ${totalClipDuration.toFixed(1)}s`;
    el.durationMatchPill.className = 'pill emerald';
  }

  function updateVoiceOverStatusPill(voName) {
    if (!el.pillVoiceOverStatus) return;
    if (!voName) {
      el.pillVoiceOverStatus.textContent = 'Tanpa Voiceover';
      el.pillVoiceOverStatus.className = 'pill neutral';
      return;
    }
    const jsonBase = voName.replace(/\.[^/.]+$/, '');
    const voAsset = state.assets?.voiceOvers?.find(vo => vo.name === voName);
    const hasJson = voAsset ? voAsset.hasTranscript : state.assets?.transcripts?.some(t => t.name === `${jsonBase}.json`);
    const count = voAsset?.wordsCount || 0;

    if (hasJson) {
      el.pillVoiceOverStatus.textContent = `🟢 Transkrip Tersedia (${count} kata) · Klik untuk edit`;
      el.pillVoiceOverStatus.className = 'pill emerald';
    } else {
      el.pillVoiceOverStatus.textContent = `🟡 Transkrip Belum Dibuat · Klik untuk transkrip`;
      el.pillVoiceOverStatus.className = 'pill amber';
    }
  }

  function updateCharCounters() {
    const limits = [
      { input: el.inputHookLine1, counter: el.countHookLine1 },
      { input: el.inputHookHighlight, counter: el.countHookHighlight },
      { input: el.inputDemoLine1, counter: el.countDemoLine1 },
      { input: el.inputDemoHighlight, counter: el.countDemoHighlight },
      { input: el.inputSpecLine1, counter: el.countSpecLine1 },
      { input: el.inputSpecHighlight, counter: el.countSpecHighlight }
    ];

    limits.forEach(({ input, counter }) => {
      if (!input || !counter) return;
      const len = (input.value || '').length;
      counter.textContent = `${len}/38`;
      counter.classList.toggle('warning', len > 34 && len <= 38);
      counter.classList.toggle('danger', len > 38);
    });
  }

  function syncFormToVariant() {
    if (!state.currentProduct) return;
    state.currentProduct.name = el.inputProductName.value.trim() || state.currentProduct.name;
    state.currentProduct.videoSource = el.selectProductVideo.value;

    const v = state.currentProduct.variants?.[state.activeVariantKey];
    if (!v) return;

    v.themeStyle = el.selectThemeStyle.value;
    v.cardStyle = el.selectCardStyle.value;
    v.voiceOver = el.selectVoiceOver.value;
    if (el.selectBgmTrack) v.bgmTrack = el.selectBgmTrack.value || undefined;
    v.voiceOverDelaySec = parseFloat(el.inputVoiceOverDelay.value) || 0;
    v.watermarkText = el.inputWatermark.value;
    if (el.selectWatermarkPosition) v.watermarkPosition = el.selectWatermarkPosition.value;

    v.badgeText = el.inputBadgeText.value.trim();
    v.hookLine1 = el.inputHookLine1.value.trim();
    v.hookHighlight = el.inputHookHighlight.value.trim();
    v.demoLine1 = el.inputDemoLine1.value.trim();
    v.demoHighlight = el.inputDemoHighlight.value.trim();
    v.specLine1 = el.inputSpecLine1.value.trim();
    v.specHighlight = el.inputSpecHighlight.value.trim();
    v.ctaText = el.inputCtaText.value.trim();
    if (el.inputReferenceScript && el.inputReferenceScript.value.trim()) {
      v.voiceOverScript = el.inputReferenceScript.value.trim();
    }

    // Read clips table
    if (!v.clips || v.clips.length < 4) {
      v.clips = [
        { src: state.currentProduct.videoSource, startSec: 0, endSec: 5 },
        { src: state.currentProduct.videoSource, startSec: 5, endSec: 12 },
        { src: state.currentProduct.videoSource, startSec: 12, endSec: 19 },
        { src: state.currentProduct.videoSource, startSec: 19, endSec: 24 }
      ];
    }

    document.querySelectorAll('.clip-time-input').forEach(inp => {
      const idx = parseInt(inp.dataset.clip, 10);
      const field = inp.dataset.field;
      const parsed = parseTimeInput(inp.value);
      if (field === 'start') v.clips[idx].startSec = parsed;
      if (field === 'end') v.clips[idx].endSec = parsed;
      v.clips[idx].src = v.clips[idx].src || state.currentProduct.videoSource;
    });
  }

  // -------------------------------------------------------------
  // Form Listeners
  // -------------------------------------------------------------
  el.variantSegmented.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.variant) return;
    syncFormToVariant();
    renderVariant(btn.dataset.variant);
  });

  // Storyboard Clips Time Change Listener
  document.addEventListener('change', e => {
    const inp = e.target.closest('.clip-time-input');
    if (!inp) return;
    const parsed = parseTimeInput(inp.value);
    inp.value = formatTimeDisplay(parsed);
    syncFormToVariant();
    const v = state.currentProduct?.variants?.[state.activeVariantKey];
    if (v) {
      const idx = parseInt(inp.dataset.clip, 10);
      const dur = Math.max(0, v.clips[idx].endSec - v.clips[idx].startSec);
      const durEl = $(`clipDur_${idx}`);
      if (durEl) durEl.textContent = `${dur.toFixed(1)}s`;
      checkDurationMatch(v);

      // Re-calculate timeline strip widths
      const totalClips = 4;
      let totalSec = 0;
      const clipDurations = [];
      for (let i = 0; i < totalClips; i++) {
        const c = v.clips[i] || { startSec: i * 5, endSec: (i + 1) * 5 };
        const d = Math.max(0, c.endSec - c.startSec);
        clipDurations.push(d);
        totalSec += d;
      }
      if (totalSec > 0) {
        if (el.barClip0) el.barClip0.style.width = `${(clipDurations[0] / totalSec) * 100}%`;
        if (el.barClip1) el.barClip1.style.width = `${(clipDurations[1] / totalSec) * 100}%`;
        if (el.barClip2) el.barClip2.style.width = `${(clipDurations[2] / totalSec) * 100}%`;
        if (el.barClip3) el.barClip3.style.width = `${(clipDurations[3] / totalSec) * 100}%`;
      }
    }
  });

  // Smart Linking Studio ⇄ Subtitle Editor
  function jumpToSubtitleForCurrentVoiceOver() {
    const voName = el.selectVoiceOver ? el.selectVoiceOver.value : '';
    if (!voName) {
      showToast({
        type: 'warn',
        title: 'Voiceover Belum Dipilih',
        message: 'Silakan pilih file audio voiceover terlebih dahulu di Studio.',
        duration: 3500
      });
      return;
    }

    const jsonBase = voName.replace(/\.[^/.]+$/, '');
    const jsonName = `${jsonBase}.json`;

    switchTab('subtitles');

    if (el.selectTranscriptFile) {
      el.selectTranscriptFile.value = jsonName;
      if (el.selectTranscriptFile._syncCustomSelect) el.selectTranscriptFile._syncCustomSelect();
      loadSubtitleFile(jsonName);
    }

    showToast({
      type: 'info',
      title: '🎙️ Beralih ke Editor Subtitle',
      message: `Membuka transkrip untuk audio ${voName}`,
      duration: 3500
    });
  }

  if (el.btnJumpToSubtitle) {
    el.btnJumpToSubtitle.addEventListener('click', jumpToSubtitleForCurrentVoiceOver);
  }
  if (el.pillVoiceOverStatus) {
    el.pillVoiceOverStatus.addEventListener('click', jumpToSubtitleForCurrentVoiceOver);
  }

  // Quick Preset Badge Chips Handler
  document.addEventListener('click', e => {
    const chip = e.target.closest('.badge-chip');
    if (!chip || !el.inputBadgeText) return;
    const badgeVal = chip.dataset.badge;
    if (!badgeVal) return;
    el.inputBadgeText.value = badgeVal;
    syncFormToVariant();
    showToast({
      type: 'info',
      title: 'Badge Diterapkan',
      message: `Badge Babak 1 diubah menjadi: "${badgeVal}"`,
      duration: 2200
    });
  });

  // Mini Still Preview per Storyboard Card (Render directly on phone mockup)
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-preview-babak');
    if (!btn) return;
    const clipIdx = parseInt(btn.dataset.clip, 10);
    syncFormToVariant();

    const v = state.currentProduct?.variants?.[state.activeVariantKey];
    if (!v || !v.clips || !v.clips[clipIdx]) {
      showToast({ type: 'error', title: 'Error', message: 'Data klip babak belum tersedia.' });
      return;
    }

    const startSec = v.clips[clipIdx].startSec || 0;
    const targetSec = clipIdx === 0 ? 1 : Math.max(0.1, startSec + 0.2);
    const frame = Math.max(1, Math.round(targetSec * 60));
    const variantKey = state.activeVariantKey || 'v1';

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="animation: spin 0.8s linear infinite; display: inline-block;">⏳</span> Merender...`;

    showToast({
      type: 'info',
      title: `📸 Pratinjau Babak ${clipIdx + 1}`,
      message: `Merender frame detik ${targetSec.toFixed(1)} (${variantKey.toUpperCase()})...`,
      duration: 3500
    });

    try {
      const res = await fetch('/api/preview-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: state.activeProductId,
          productData: state.currentProduct,
          variantKey: variantKey,
          frame
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal merender frame babak');

      // Show in player phone bezel directly
      if (el.playerStillImage) {
        const imgSrc = data.previewUrl && data.previewUrl.startsWith('data:') ? data.previewUrl : `${data.previewUrl}?t=${Date.now()}`;
        el.playerStillImage.src = imgSrc;
        el.playerStillImage.style.display = 'block';
        if (el.videoPreview) el.videoPreview.style.display = 'none';
        if (el.playerEmptyMsg) el.playerEmptyMsg.style.display = 'none';
        if (el.btnExitStillView) el.btnExitStillView.style.display = 'inline-flex';
        if (el.videoMetaText) {
          el.videoMetaText.textContent = `Pratinjau Babak ${clipIdx + 1} (${variantKey.toUpperCase()}) · Detik ${targetSec.toFixed(1)} (Frame ${frame}) · 1080×1920`;
        }
      }

      showToast({
        type: 'success',
        title: `✓ Babak ${clipIdx + 1} Ditampilkan`,
        message: `Frame berhasil dimuat di layar HP sebelah kanan.`,
        duration: 4000
      });
    } catch (err) {
      showToast({ type: 'error', title: '✕ Gagal Render Frame', message: err.message, duration: 5000 });
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });

  if (el.btnExitStillView) {
    el.btnExitStillView.addEventListener('click', () => {
      if (el.playerStillImage) el.playerStillImage.style.display = 'none';
      if (el.btnExitStillView) el.btnExitStillView.style.display = 'none';
      if (el.videoPreview) el.videoPreview.style.display = 'block';
      if (!el.videoPreview.src) {
        if (el.playerEmptyMsg) el.playerEmptyMsg.style.display = 'flex';
      }
    });
  }

  // -------------------------------------------------------------
  // Player Size Switcher (S / M / L) with localStorage persistence
  // -------------------------------------------------------------
  function setPlayerSize(size) {
    if (!el.phoneBezel) return;
    el.phoneBezel.classList.remove('size-sm', 'size-md', 'size-lg');
    el.phoneBezel.classList.add(`size-${size}`);
    document.querySelectorAll('.player-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    try {
      localStorage.setItem('studio_player_size', size);
    } catch (_) {}
  }

  // Load saved size or default to 'md' (340px desktop standard)
  const savedPlayerSize = (() => {
    try { return localStorage.getItem('studio_player_size'); } catch (_) { return null; }
  })() || 'md';
  setPlayerSize(savedPlayerSize);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.player-size-btn');
    if (btn && btn.dataset.size) {
      setPlayerSize(btn.dataset.size);
    }
  });

  // TikTok Safe Area Toggle
  if (el.btnToggleSafeArea) {
    el.btnToggleSafeArea.addEventListener('click', () => {
      if (!el.phoneBezel) return;
      const isShowing = el.phoneBezel.classList.toggle('show-safe-area');
      el.btnToggleSafeArea.classList.toggle('active', isShowing);
      if (isShowing) {
        el.btnToggleSafeArea.innerHTML = `👁️ Safe Area <strong>(ON)</strong>`;
        showToast({
          type: 'info',
          title: '🎯 Safe Area TikTok Aktif',
          message: 'Zona aman teks & elemen UI TikTok (Like, Profil, Keranjang Kuning) ditampilkan.',
          duration: 3000
        });
      } else {
        el.btnToggleSafeArea.innerHTML = `👁️ Safe Area TikTok`;
      }
    });
  }

  // Player Tools (Loop & Speed Selector)
  if (el.videoPreview) el.videoPreview.loop = true;

  if (el.btnToggleLoop) {
    el.btnToggleLoop.addEventListener('click', () => {
      if (!el.videoPreview) return;
      el.videoPreview.loop = !el.videoPreview.loop;
      el.btnToggleLoop.classList.toggle('active', el.videoPreview.loop);
      if (el.videoPreview.loop) {
        el.btnToggleLoop.innerHTML = `<span>🔁</span> Loop Aktif`;
      } else {
        el.btnToggleLoop.innerHTML = `<span>➡️</span> Sekali Putar`;
      }
    });
  }

  let activePlaybackRate = 1.0;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const spd = parseFloat(btn.dataset.speed);
      activePlaybackRate = spd;
      if (el.videoPreview) el.videoPreview.playbackRate = spd;
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  if (el.videoPreview) {
    el.videoPreview.addEventListener('play', () => {
      if (activePlaybackRate !== 1.0) el.videoPreview.playbackRate = activePlaybackRate;
    });
    el.videoPreview.addEventListener('loadedmetadata', () => {
      if (activePlaybackRate !== 1.0) el.videoPreview.playbackRate = activePlaybackRate;
    });
  }

  [el.inputHookLine1, el.inputHookHighlight, el.inputDemoLine1, el.inputDemoHighlight, el.inputSpecLine1, el.inputSpecHighlight].forEach(input => {
    input.addEventListener('input', updateCharCounters);
  });

  [el.inputBadgeText, el.inputHookLine1, el.inputHookHighlight].forEach(inp => {
    if (inp) inp.addEventListener('input', updateThemeVisualPreview);
  });

  el.selectThemeStyle?.addEventListener('change', () => {
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  el.selectCardStyle?.addEventListener('change', () => {
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  el.selectProduct.addEventListener('change', () => {
    selectProduct(el.selectProduct.value);
  });

  el.selectProductVideo.addEventListener('change', () => {
    if (state.currentProduct) {
      state.currentProduct.videoSource = el.selectProductVideo.value;
      // Also update clips src
      ['v1', 'v2'].forEach(vk => {
        const v = state.currentProduct.variants?.[vk];
        if (v && v.clips) {
          v.clips.forEach(c => { c.src = el.selectProductVideo.value; });
        }
      });
    }
  });

  el.selectVoiceOver.addEventListener('change', () => {
    syncFormToVariant();
    const v = state.currentProduct?.variants?.[state.activeVariantKey];
    if (v) {
      v.voiceOver = el.selectVoiceOver.value;
      checkDurationMatch(v);
    }
    updateVoiceOverStatusPill(el.selectVoiceOver.value);
  });

  // New Product Action
  el.btnNewProduct.addEventListener('click', () => {
    const name = prompt('Masukkan nama produk baru:');
    if (!name) return;
    const safeId = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    const vo1 = state.assets.voiceOvers.find(vo => vo.name.includes('v1'))?.name || state.assets.voiceOvers[0]?.name || '';
    const vo2 = state.assets.voiceOvers.find(vo => vo.name.includes('v2'))?.name || state.assets.voiceOvers[1]?.name || vo1;

    const newProd = {
      id: safeId,
      name,
      videoSource: state.assets.videos[0]?.name || '',
      variants: {
        v1: {
          title: 'Problem-Solution (Pastel)',
          themeStyle: 'pastel',
          cardStyle: 'creator_aesthetic',
          voiceOver: vo1,
          voiceOverDelaySec: 0,
          watermarkText: el.inputWatermark.value || state.defaultWatermark || '',
          badgeText: name.toUpperCase(),
          hookLine1: 'Masalah yang sering dialami?',
          hookHighlight: 'Ini Solusi Terbaiknya!',
          demoLine1: 'Tekstur Nyaman & Formula Lembut',
          demoHighlight: 'Terbukti Efektif Sejak Hari Pertama',
          specLine1: 'Kandungan Lengkap & Teruji Klinis',
          specHighlight: 'Terdaftar Resmi & Aman Digunakan',
          ctaText: 'Cek Promo di Keranjang Kuning',
          clips: [
            { src: state.assets.videos[0]?.name || '', startSec: 0, endSec: 5 },
            { src: state.assets.videos[0]?.name || '', startSec: 5, endSec: 12 },
            { src: state.assets.videos[0]?.name || '', startSec: 12, endSec: 19 },
            { src: state.assets.videos[0]?.name || '', startSec: 19, endSec: 24 }
          ]
        },
        v2: {
          title: 'Value & Quality (Minimal)',
          themeStyle: 'minimal',
          cardStyle: 'editorial_minimal',
          voiceOver: vo2,
          voiceOverDelaySec: 0,
          watermarkText: el.inputWatermark.value || state.defaultWatermark || '',
          badgeText: name.toUpperCase(),
          hookLine1: 'Kenapa produk ini wajib punya?',
          hookHighlight: 'Kualitas Premium Terpercaya!',
          demoLine1: 'Kemasan Rapi & Mudah Dipakai',
          demoHighlight: 'Cocok Untuk Penggunaan Harian',
          specLine1: 'Formula Pilihan Terbaik',
          specHighlight: 'Hemat Pemakaian Jangka Panjang',
          ctaText: 'Checkout di Keranjang Kuning',
          clips: [
            { src: state.assets.videos[0]?.name || '', startSec: 0, endSec: 5 },
            { src: state.assets.videos[0]?.name || '', startSec: 5, endSec: 12 },
            { src: state.assets.videos[0]?.name || '', startSec: 12, endSec: 19 },
            { src: state.assets.videos[0]?.name || '', startSec: 19, endSec: 24 }
          ]
        }
      }
    };
    state.activeProductId = safeId;
    state.currentProduct = newProd;
    renderProductToForm(newProd);
    appendLog(`[PRODUK] Membuat template produk baru: ${name}`);
  });

  // Save Product Button
  el.btnSaveProduct.addEventListener('click', async () => {
    syncFormToVariant();
    if (!state.currentProduct) return;
    const id = state.activeProductId || 'product';
    try {
      el.btnSaveProduct.disabled = true;
      el.btnSaveProduct.textContent = 'Menyimpan...';
      const res = await fetch(`/api/products/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.currentProduct)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      appendLog(`[SUKSES] Produk '${state.currentProduct.name}' berhasil disimpan ke products/${id}.json`, true);
      await loadProductsList();
      el.selectProduct.value = id;
    } catch (err) {
      alert('Gagal menyimpan produk: ' + err.message);
    } finally {
      el.btnSaveProduct.disabled = false;
      el.btnSaveProduct.textContent = 'Simpan Produk';
    }
  });

  // -------------------------------------------------------------
  // Modal 1: Import JSON Gemini (Decoupled from Video/VO files)
  // -------------------------------------------------------------
  el.btnOpenImportModal.addEventListener('click', () => {
    el.modalImportGemini.style.display = 'flex';
    el.importFeedback.style.display = 'none';
    el.btnApplyImportedJson.disabled = true;
  });

  el.btnCloseImportModal.addEventListener('click', () => {
    el.modalImportGemini.style.display = 'none';
  });

  el.btnValidateJson.addEventListener('click', async () => {
    const raw = el.textareaGeminiJson.value.trim();
    if (!raw) {
      alert('Silakan tempelkan JSON dari Gemini terlebih dahulu.');
      return;
    }
    try {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error('Format JSON tidak valid: ' + e.message);
      }

      // If user provided Gemini JSON without videoSource or voiceOver, inject current ones
      if (!parsed.videoSource && state.currentProduct?.videoSource) {
        parsed.videoSource = state.currentProduct.videoSource;
      } else if (!parsed.videoSource && state.assets.videos.length > 0) {
        parsed.videoSource = state.assets.videos[0].name;
      }

      const res = await fetch('/api/products-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();

      el.importFeedback.style.display = 'block';
      if (data.valid) {
        state.importedProductCandidate = parsed;
        el.importFeedback.className = 'feedback-banner success';
        el.importFeedback.innerHTML = `<strong>✓ JSON Valid!</strong> Produk: <code>${parsed.name}</code> (${Object.keys(parsed.variants || {}).join(', ')}). Klik "Terapkan ke Studio" untuk memuat teks dan klip.`;
        el.btnApplyImportedJson.disabled = false;
      } else {
        el.importFeedback.className = 'feedback-banner error';
        el.importFeedback.innerHTML = `<strong>✕ JSON Bermasalah:</strong><ul style="margin: 4px 0 0 16px;">${(data.errors || []).map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
        el.btnApplyImportedJson.disabled = true;
      }
    } catch (err) {
      el.importFeedback.style.display = 'block';
      el.importFeedback.className = 'feedback-banner error';
      el.importFeedback.textContent = err.message;
      el.btnApplyImportedJson.disabled = true;
    }
  });

  el.btnApplyImportedJson.addEventListener('click', () => {
    if (!state.importedProductCandidate) return;
    const candidate = state.importedProductCandidate;

    // Retain currently selected video and voiceover from UI if candidate omitted them
    const currentVideo = el.selectProductVideo.value || state.currentProduct?.videoSource;
    const currentVO = el.selectVoiceOver.value;

    candidate.videoSource = candidate.videoSource || currentVideo;

    // Check and auto-clamp clips against actual video duration
    const vidObj = state.assets.videos.find(v => v.name === candidate.videoSource);
    const maxDur = vidObj?.durationSec;
    let clampedCount = 0;

    ['v1', 'v2'].forEach(vk => {
      const v = candidate.variants?.[vk];
      if (v) {
        // Smart matching: varian v1 mencari audio v1, varian v2 mencari audio v2
        if (!v.voiceOver) {
          const match = state.assets.voiceOvers.find(vo => vo.name.toLowerCase().includes(vk));
          v.voiceOver = match ? match.name : currentVO;
        }
        if (Array.isArray(v.clips)) {
          v.clips.forEach((c, idx) => {
            c.src = c.src || candidate.videoSource;
            if (maxDur && c.endSec > maxDur) {
              const desiredLen = Math.max(2, c.endSec - c.startSec);
              c.endSec = Math.floor(maxDur * 10) / 10;
              c.startSec = Math.max(0, Math.round((c.endSec - desiredLen) * 10) / 10);
              clampedCount++;
            }
          });
        }
      }
    });

    state.currentProduct = candidate;
    state.activeProductId = candidate.id || 'imported';

    renderProductToForm(candidate);
    el.modalImportGemini.style.display = 'none';

    if (clampedCount > 0) {
      appendLog(`[AUTO-CLAMP] ${clampedCount} klip otomatis disesuaikan agar tidak melebihi durasi video (${maxDur}s)`, true);
      alert(`Catatan: ${clampedCount} klip dari Gemini memiliki detik yang melebihi panjang asli video (${maxDur}s). Studio telah otomatis menyesuaikannya ke akhir video agar render tidak freeze.`);
    } else {
      appendLog(`[IMPORT] Berhasil menerapkan copywriting & klip Gemini untuk '${candidate.name}'`, true);
    }
  });

  // -------------------------------------------------------------
  // Toast Notification System (Melayang di Pojok Kanan Atas)
  // -------------------------------------------------------------
  function showToast({ type = 'info', title = '', message = '', duration = 4000, actionLabel, onAction, showProgress = false }) {
    if (!el.toastContainer) return null;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      info: 'ℹ️',
      success: '✓',
      warn: '⚠️',
      error: '✕',
      upload: '⚡'
    };

    let actionBtnHtml = '';
    if (actionLabel) {
      actionBtnHtml = `<button class="btn small toast-action-btn" style="margin-top: 6px; font-size: 11px; padding: 2px 10px; height: 24px; font-weight: 600;">${escapeHtml(actionLabel)}</button>`;
    }

    let progressHtml = '';
    if (showProgress) {
      progressHtml = `
        <div class="toast-progress-wrap" style="margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span class="toast-progress-status" style="color: var(--text-muted); font-size: 11px;">Mempersiapkan data...</span>
            <span class="toast-progress-pct num" style="color: #34d399; font-weight: 700; font-size: 11px;">0%</span>
          </div>
          <div class="upload-progress-track" style="height: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; overflow: hidden; margin: 0;">
            <div class="toast-progress-fill" style="height: 100%; width: 0%; border-radius: 999px; background: linear-gradient(90deg, #10b981, #06b6d4); transition: width 150ms ease;"></div>
          </div>
        </div>
      `;
    }

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || '🔔'}</div>
      <div class="toast-content" style="flex: 1;">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
        ${progressHtml}
        ${actionBtnHtml}
      </div>
      <button class="toast-close" title="Tutup">✕</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    if (actionLabel && onAction) {
      const actBtn = toast.querySelector('.toast-action-btn');
      if (actBtn) {
        actBtn.addEventListener('click', () => {
          onAction();
          removeToast(toast);
        });
      }
    }

    el.toastContainer.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }

    return toast;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }

  // -------------------------------------------------------------
  // Custom In-App Confirmation Dialog (Replaces native confirm())
  // -------------------------------------------------------------
  function showConfirmDialog({
    title = 'Konfirmasi Aksi',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    subtext = '',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    isDanger = true
  }) {
    return new Promise(resolve => {
      const modal = $('modalConfirmDialog');
      const titleEl = $('confirmDialogTitle');
      const msgEl = $('confirmDialogMessage');
      const subEl = $('confirmDialogSubtext');
      const okBtn = $('btnConfirmOk');
      const cancelBtn = $('btnConfirmCancel');
      const iconWrap = $('confirmDialogIcon');

      if (!modal) {
        resolve(window.confirm(message.replace(/<[^>]+>/g, '')));
        return;
      }

      titleEl.textContent = title;
      msgEl.innerHTML = message;
      if (subtext) {
        subEl.textContent = subtext;
        subEl.style.display = 'block';
      } else {
        subEl.style.display = 'none';
      }

      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      if (isDanger) {
        okBtn.className = 'btn small danger';
        iconWrap.className = 'confirm-icon-wrap';
      } else {
        okBtn.className = 'btn small primary';
        iconWrap.className = 'confirm-icon-wrap info';
      }

      function cleanup(result) {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBackdrop(e) { if (e.target === modal) cleanup(false); }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);

      modal.style.display = 'flex';
      okBtn.focus();
    });
  }

  // -------------------------------------------------------------
  // Modal 2: Instant Frame Preview (renderStill) with Rich Progress & Notifications
  // -------------------------------------------------------------
  let stillTimerInterval = null;
  let stillStartTime = 0;
  let activeStillToast = null;

  function setStillLoadingUI(isLoading, stage = '', percent = 0, message = '') {
    if (isLoading) {
      // Button states
      if (el.btnRefreshStill) {
        el.btnRefreshStill.disabled = true;
        if (el.btnRefreshStillIcon) el.btnRefreshStillIcon.textContent = '⏳';
        if (el.btnRefreshStillText) el.btnRefreshStillText.textContent = 'Merender...';
      }
      if (el.btnPreviewStill) {
        el.btnPreviewStill.disabled = true;
        el.btnPreviewStill.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 0.8s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          Merender Frame...
        `;
      }
      if (el.stillModalStatusPill) {
        el.stillModalStatusPill.textContent = '● Merender Frame';
        el.stillModalStatusPill.className = 'pill amber';
      }

      if (el.stillProgressBox) el.stillProgressBox.style.display = 'block';
      if (el.stillFeedbackBanner) el.stillFeedbackBanner.style.display = 'none';
      if (el.stillEmptyPlaceholder) el.stillEmptyPlaceholder.style.display = 'none';
      if (el.stillLoadingText) el.stillLoadingText.style.display = 'block';
      if (el.btnDownloadStill) el.btnDownloadStill.style.display = 'none';

      updateStillProgress(stage || 'init', percent || 15, message || 'Mempersiapkan render frame...');
    } else {
      // Re-enable buttons
      if (el.btnRefreshStill) {
        el.btnRefreshStill.disabled = false;
        if (el.btnRefreshStillIcon) el.btnRefreshStillIcon.textContent = '📸';
        if (el.btnRefreshStillText) el.btnRefreshStillText.textContent = 'Render Frame';
      }
      if (el.btnPreviewStill) {
        el.btnPreviewStill.disabled = false;
        el.btnPreviewStill.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          Lihat Frame
        `;
      }
    }
  }

  function updateStillProgress(stage, percent, message) {
    if (el.stillProgressBarFill) el.stillProgressBarFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (el.stillPercentText) el.stillPercentText.textContent = `${Math.round(percent)}%`;
    if (el.stillProgressStepText) el.stillProgressStepText.textContent = message || 'Sedang memproses...';

    const stageMap = {
      init: 'Tahap 1: Sinkronisasi aset media & naskah...',
      sync: 'Tahap 1: Sinkronisasi folder public/ & naskah...',
      bundle: 'Tahap 2: Menyiapkan Webpack bundle Remotion...',
      select: 'Tahap 3: Memuat komposisi video 1080×1920...',
      render: 'Tahap 4: Chromium Puppeteer sedang menggambar frame...',
      done: 'Selesai: Menampilkan gambar HD...'
    };
    if (el.stillProgressDetailText) {
      el.stillProgressDetailText.textContent = stageMap[stage] || message || 'Memproses...';
    }
    if (el.stillLoadingSubtext) {
      el.stillLoadingSubtext.textContent = message || 'Sedang memproses still frame...';
    }
  }

  function handleStillProgressSSE(data) {
    if (data.isRendering) {
      updateStillProgress(data.step, data.percent, data.message);
    }
  }

  el.btnPreviewStill.addEventListener('click', () => {
    el.modalStillPreview.style.display = 'flex';
    requestStillFrame();
  });

  [el.btnCloseStillModal, el.btnCloseStillModal2].forEach(b => {
    b.addEventListener('click', () => {
      el.modalStillPreview.style.display = 'none';
    });
  });

  el.btnRefreshStill.addEventListener('click', requestStillFrame);

  async function requestStillFrame() {
    syncFormToVariant();

    const frame = parseInt(el.selectPreviewSecond.value, 10) || 60;
    const sec = Math.round(frame / 60);
    const variantKey = state.activeVariantKey || 'v1';

    // Start timer & UI loading
    clearInterval(stillTimerInterval);
    stillStartTime = Date.now();
    if (el.stillTimerText) el.stillTimerText.textContent = '0.0s';
    stillTimerInterval = setInterval(() => {
      const elapsed = ((Date.now() - stillStartTime) / 1000).toFixed(1);
      if (el.stillTimerText) el.stillTimerText.textContent = `${elapsed}s`;
    }, 100);

    setStillLoadingUI(true, 'sync', 15, `Merender Detik ${sec} (${variantKey.toUpperCase()})...`);
    el.stillImagePreview.style.display = 'none';

    // Show floating toast notification
    if (activeStillToast) removeToast(activeStillToast);
    activeStillToast = showToast({
      type: 'info',
      title: '📸 Merender Frame Video',
      message: `Sedang memproses Detik ke-${sec} (Variasi ${variantKey.toUpperCase()})...`,
      duration: 3500
    });

    try {
      const res = await fetch('/api/preview-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: state.activeProductId,
          productData: state.currentProduct,
          variantKey: variantKey,
          frame
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal merender frame');

      const elapsed = ((Date.now() - stillStartTime) / 1000).toFixed(1);
      clearInterval(stillTimerInterval);
      if (el.stillTimerText) el.stillTimerText.textContent = `${elapsed}s`;

      updateStillProgress('done', 100, `Frame berhasil dibuat (${elapsed}s)!`);

      if (el.stillModalStatusPill) {
        el.stillModalStatusPill.textContent = '● Selesai';
        el.stillModalStatusPill.className = 'pill emerald';
      }

      // Load image
      const imgSrc = data.previewUrl && data.previewUrl.startsWith('data:') ? data.previewUrl : `${data.previewUrl}?t=${Date.now()}`;
      el.stillImagePreview.src = imgSrc;
      el.stillImagePreview.onload = () => {
        el.stillLoadingText.style.display = 'none';
        el.stillImagePreview.style.display = 'block';
        if (el.btnDownloadStill) {
          el.btnDownloadStill.href = data.previewUrl;
          el.btnDownloadStill.style.display = 'inline-flex';
        }
        if (el.stillMetaInfo) {
          el.stillMetaInfo.textContent = `Varian: ${variantKey.toUpperCase()} · Frame: ${frame} (Detik ${sec}) · Waktu: ${elapsed}s · 1080×1920`;
        }
      };

      // Success floating toast notification
      if (activeStillToast) removeToast(activeStillToast);
      activeStillToast = showToast({
        type: 'success',
        title: '✓ Pratinjau Frame Siap!',
        message: `Detik ke-${sec} (${variantKey.toUpperCase()}) selesai dalam ${elapsed}s.`,
        duration: 5000,
        actionLabel: 'Lihat Frame',
        onAction: () => {
          el.modalStillPreview.style.display = 'flex';
        }
      });

      appendLog(`[PREVIEW SELESAI] Still frame ${frame} untuk ${variantKey} berhasil dirender dalam ${elapsed}s`, true);
    } catch (err) {
      clearInterval(stillTimerInterval);

      if (el.stillModalStatusPill) {
        el.stillModalStatusPill.textContent = '● Gagal';
        el.stillModalStatusPill.className = 'pill rose';
      }
      if (el.stillLoadingText) el.stillLoadingText.style.display = 'none';
      if (el.stillEmptyPlaceholder) el.stillEmptyPlaceholder.style.display = 'block';

      if (el.stillFeedbackBanner) {
        el.stillFeedbackBanner.style.display = 'block';
        el.stillFeedbackBanner.className = 'feedback-banner error';
        el.stillFeedbackBanner.innerHTML = `<strong>✕ Gagal Merender Frame:</strong> ${escapeHtml(err.message)}`;
      }

      if (activeStillToast) removeToast(activeStillToast);
      activeStillToast = showToast({
        type: 'error',
        title: '✕ Gagal Merender Frame',
        message: err.message,
        duration: 6000
      });

      appendLog(`[ERROR PREVIEW] ${err.message}`);
    } finally {
      setStillLoadingUI(false);
    }
  }

  // -------------------------------------------------------------
  // Google Drive Integration & Automatic Webhook Uploader (Solusi 2)
  // -------------------------------------------------------------
  let currentGDriveUrl = 'https://drive.google.com/drive/my-drive';
  let currentWebhookUrl = '';

  async function loadGDriveLink() {
    try {
      const res = await fetch('/api/gdrive-link');
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) currentGDriveUrl = data.url;
      if (data.webhookUrl !== undefined) currentWebhookUrl = data.webhookUrl;
      if (el.inputGDriveUrl) el.inputGDriveUrl.value = currentGDriveUrl;
      if (el.inputGDriveWebhookUrl) el.inputGDriveWebhookUrl.value = currentWebhookUrl;
      if (el.pillGDriveStatus) {
        if (currentWebhookUrl) {
          el.pillGDriveStatus.textContent = '● Webhook Aktif';
          el.pillGDriveStatus.className = 'pill emerald';
        } else {
          el.pillGDriveStatus.textContent = '○ Webhook Belum Diisi';
          el.pillGDriveStatus.className = 'pill rose';
        }
      }
    } catch (_) { }
  }

  async function saveGDriveLink() {
    if (!el.btnSaveGDriveLink) return;
    try {
      el.btnSaveGDriveLink.disabled = true;
      el.btnSaveGDriveLink.textContent = 'Menyimpan...';

      let inputUrl = el.inputGDriveUrl?.value.trim() || '';
      if (!inputUrl) inputUrl = 'https://drive.google.com/drive/my-drive';
      let inputWebhook = el.inputGDriveWebhookUrl?.value.trim() || '';

      const res = await fetch('/api/gdrive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl, webhookUrl: inputWebhook })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        currentGDriveUrl = data.url;
        currentWebhookUrl = data.webhookUrl;
        showToast({
          type: 'success',
          title: '✓ Pengaturan Tersimpan',
          message: 'Konfigurasi Google Drive & Webhook berhasil disimpan!'
        });
        if (el.pillGDriveStatus) {
          el.pillGDriveStatus.textContent = currentWebhookUrl ? '● Webhook Aktif' : '○ Webhook Belum Diisi';
          el.pillGDriveStatus.className = currentWebhookUrl ? 'pill emerald' : 'pill rose';
        }
        if (el.gdriveSaveFeedback) {
          el.gdriveSaveFeedback.className = 'feedback-banner success';
          el.gdriveSaveFeedback.style.display = 'block';
          el.gdriveSaveFeedback.textContent = '✓ Pengaturan Google Drive berhasil disimpan!';
          setTimeout(() => { if (el.gdriveSaveFeedback) el.gdriveSaveFeedback.style.display = 'none'; }, 3000);
        }
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Gagal Menyimpan', message: err.message });
    } finally {
      el.btnSaveGDriveLink.disabled = false;
      el.btnSaveGDriveLink.textContent = 'Simpan Pengaturan';
    }
  }

  function openGDriveFolderInBrowser() {
    const url = currentGDriveUrl || 'https://drive.google.com/drive/my-drive';
    window.open(url, '_blank');
  }

  async function openVideoFileInExplorer(videoName) {
    if (!videoName) {
      showToast({ type: 'warning', title: 'Pilih Video', message: 'Silakan pilih video terlebih dahulu.' });
      return;
    }
    try {
      const res = await fetch('/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          type: 'info',
          title: '📂 File Disorot di Laptop',
          message: `File terpilih di Windows Explorer. Tarik (drag & drop) file ke browser Google Drive!`,
          duration: 5000
        });
      } else {
        throw new Error(data.error || 'Gagal membuka file di laptop');
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Gagal Membuka File', message: err.message });
    }
  }

  let isUploadingToGDrive = false;
  let activeUploadToast = null;
  let activeUploadVideoName = null;

  function handleGDriveUploadProgressSSE(data) {
    const filename = data.filename || activeUploadVideoName || 'Video';
    const percent = typeof data.percent === 'number' ? data.percent : 0;
    const message = data.message || 'Mengunggah ke Google Drive...';
    const sizeText = (data.sentMB && data.totalMB)
      ? `${data.sentMB} MB / ${data.totalMB} MB`
      : `${percent}%`;

    // 1. Update Floating Toast Notification (Melayang di atas semua tab)
    if (activeUploadToast) {
      const pctEl = activeUploadToast.querySelector('.toast-progress-pct');
      const fillEl = activeUploadToast.querySelector('.toast-progress-fill');
      const statusEl = activeUploadToast.querySelector('.toast-progress-status');
      if (pctEl) pctEl.textContent = `${percent}%`;
      if (fillEl) fillEl.style.width = `${percent}%`;
      if (statusEl) {
        statusEl.textContent = (data.sentMB && data.totalMB)
          ? `${message} (${data.sentMB} / ${data.totalMB} MB)`
          : message;
      }
    }

    // 2. Helper to sync either progress box (Studio Tab or Gallery Tab)
    function syncProgressBox(box, titleEl, pctEl, fillEl, statusEl, sizeEl, pulseEl, actionsEl, viewBtnEl) {
      if (!box) return;
      box.style.display = 'block';

      if (data.step === 'init' || data.step === 'compress' || data.step === 'compress_done' ||
          data.step === 'packaging' || data.step === 'uploading' || data.step === 'processing') {
        if (actionsEl) actionsEl.style.display = 'none';
        if (pulseEl) {
          pulseEl.style.display = 'inline-block';
          pulseEl.style.background = '#34d399';
        }
        if (titleEl) titleEl.textContent = `Mengunggah: ${filename}`;
        if (pctEl) pctEl.textContent = `${percent}%`;
        if (fillEl) {
          fillEl.style.width = `${percent}%`;
          fillEl.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
        }
        if (statusEl) statusEl.textContent = message;
        if (sizeEl) sizeEl.textContent = sizeText;
      } else if (data.step === 'done') {
        if (pulseEl) pulseEl.style.background = '#10b981';
        if (pctEl) pctEl.textContent = '100%';
        if (fillEl) {
          fillEl.style.width = '100%';
          fillEl.style.background = '#10b981';
        }
        if (statusEl) statusEl.textContent = '✓ Video berhasil tersimpan di Google Drive!';
        if (sizeEl) sizeEl.textContent = '100% Selesai';
        if (actionsEl) actionsEl.style.display = 'flex';
        if (viewBtnEl && data.url) viewBtnEl.href = data.url;
      } else if (data.step === 'error') {
        if (pulseEl) pulseEl.style.background = '#f43f5e';
        if (fillEl) fillEl.style.background = '#f43f5e';
        if (statusEl) statusEl.textContent = `✕ Gagal: ${message}`;
        if (actionsEl) actionsEl.style.display = 'flex';
      }
    }

    // Sync Studio Box (Tab 1)
    syncProgressBox(
      el.gdriveUploadProgressBox,
      el.gdriveUploadTitle,
      el.gdriveUploadPercent,
      el.gdriveUploadBarFill,
      el.gdriveUploadStatusText,
      el.gdriveUploadSizeText,
      el.uploadPulseDot,
      el.gdriveUploadSuccessActions,
      el.btnGdriveViewUploaded
    );

    // Sync Gallery Box (Tab 3)
    syncProgressBox(
      el.gdriveGalleryUploadProgressBox,
      el.gdriveGalleryUploadTitle,
      el.gdriveGalleryUploadPercent,
      el.gdriveGalleryUploadBarFill,
      el.gdriveGalleryUploadStatusText,
      el.gdriveGalleryUploadSizeText,
      el.uploadGalleryPulseDot,
      el.gdriveGalleryUploadSuccessActions,
      el.btnGdriveGalleryViewUploaded
    );

    // 3. Sync Table Row Buttons in Gallery & Player Button
    const safeTarget = (window.CSS && CSS.escape) ? CSS.escape(filename) : filename.replace(/"/g, '\\"');
    const rowButtons = document.querySelectorAll(`.btn-upload-gdrive-row[data-video="${safeTarget}"]`);

    if (data.step === 'done') {
      if (activeUploadToast) {
        removeToast(activeUploadToast);
        activeUploadToast = null;
      }
      showToast({
        type: 'success',
        title: '🎉 Upload Berhasil!',
        message: `Video '${filename}' berhasil tersimpan di Google Drive!`,
        duration: 9000,
        actionLabel: '🔗 Buka Video',
        onAction: () => {
          if (data.url) window.open(data.url, '_blank');
        }
      });

      rowButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<span>✓</span> Selesai';
        btn.style.color = '#10b981';
      });

      if (el.btnUploadToGDrive) {
        el.btnUploadToGDrive.disabled = false;
        el.btnUploadToGDrive.innerHTML = '<span>⚡</span> Upload ke Drive';
      }
    } else if (data.step === 'error') {
      if (activeUploadToast) {
        removeToast(activeUploadToast);
        activeUploadToast = null;
      }
      showToast({
        type: 'error',
        title: '✕ Gagal Upload ke Drive',
        message: message,
        duration: 8000
      });

      rowButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span> Upload';
        btn.style.color = '#34d399';
      });

      if (el.btnUploadToGDrive) {
        el.btnUploadToGDrive.disabled = false;
        el.btnUploadToGDrive.innerHTML = '<span>⚡</span> Upload ke Drive';
      }
    } else {
      // In-Progress (uploading / packaging / compressing)
      rowButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span> ${percent}%`;
        btn.style.color = '#38bdf8';
      });

      if (el.btnUploadToGDrive) {
        el.btnUploadToGDrive.disabled = true;
        el.btnUploadToGDrive.innerHTML = `<span>⏳</span> ${percent}%`;
      }
    }
  }

  async function uploadVideoToGDrive(videoName) {
    if (!videoName) {
      showToast({ type: 'warning', title: 'Pilih Video', message: 'Silakan pilih video yang ingin diunggah terlebih dahulu.' });
      return;
    }
    if (isUploadingToGDrive) {
      showToast({ type: 'warning', title: 'Sedang Mengunggah', message: 'Proses unggah video lain sedang berjalan, harap tunggu hingga selesai.' });
      return;
    }

    activeUploadVideoName = videoName;
    isUploadingToGDrive = true;

    // 1. Initialize Studio Progress Box
    if (el.gdriveUploadProgressBox) {
      el.gdriveUploadProgressBox.style.display = 'block';
      if (el.gdriveUploadTitle) el.gdriveUploadTitle.textContent = `Mengunggah: ${videoName}`;
      if (el.gdriveUploadPercent) el.gdriveUploadPercent.textContent = '5%';
      if (el.gdriveUploadBarFill) {
        el.gdriveUploadBarFill.style.width = '5%';
        el.gdriveUploadBarFill.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
      }
      if (el.gdriveUploadStatusText) el.gdriveUploadStatusText.textContent = 'Menyiapkan berkas video...';
      if (el.gdriveUploadSizeText) el.gdriveUploadSizeText.textContent = 'Memulai...';
      if (el.gdriveUploadSuccessActions) el.gdriveUploadSuccessActions.style.display = 'none';
      if (el.uploadPulseDot) {
        el.uploadPulseDot.style.display = 'inline-block';
        el.uploadPulseDot.style.background = '#34d399';
      }
    }

    // 2. Initialize Gallery Progress Box (Langsung tampak di Tab 3 Galeri)
    if (el.gdriveGalleryUploadProgressBox) {
      el.gdriveGalleryUploadProgressBox.style.display = 'block';
      if (el.gdriveGalleryUploadTitle) el.gdriveGalleryUploadTitle.textContent = `Mengunggah: ${videoName}`;
      if (el.gdriveGalleryUploadPercent) el.gdriveGalleryUploadPercent.textContent = '5%';
      if (el.gdriveGalleryUploadBarFill) {
        el.gdriveGalleryUploadBarFill.style.width = '5%';
        el.gdriveGalleryUploadBarFill.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
      }
      if (el.gdriveGalleryUploadStatusText) el.gdriveGalleryUploadStatusText.textContent = 'Menyiapkan berkas video...';
      if (el.gdriveGalleryUploadSizeText) el.gdriveGalleryUploadSizeText.textContent = 'Memulai...';
      if (el.gdriveGalleryUploadSuccessActions) el.gdriveGalleryUploadSuccessActions.style.display = 'none';
      if (el.uploadGalleryPulseDot) {
        el.uploadGalleryPulseDot.style.display = 'inline-block';
        el.uploadGalleryPulseDot.style.background = '#34d399';
      }
    }

    // 3. Update Row Button in Table
    const safeTarget = (window.CSS && CSS.escape) ? CSS.escape(videoName) : videoName.replace(/"/g, '\\"');
    document.querySelectorAll(`.btn-upload-gdrive-row[data-video="${safeTarget}"]`).forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> 5%';
      btn.style.color = '#38bdf8';
    });

    if (el.btnUploadToGDrive) {
      el.btnUploadToGDrive.disabled = true;
      el.btnUploadToGDrive.innerHTML = '<span>⏳</span> 5%';
    }

    // 4. Show Floating Toast with Live Progress Bar
    if (activeUploadToast) {
      removeToast(activeUploadToast);
      activeUploadToast = null;
    }
    activeUploadToast = showToast({
      type: 'upload',
      title: '⚡ Mengunggah ke Google Drive...',
      message: videoName,
      duration: 0,
      showProgress: true
    });

    try {
      const res = await fetch('/api/gdrive-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoName })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        handleGDriveUploadProgressSSE({
          filename: videoName,
          step: 'done',
          percent: 100,
          url: data.url
        });
      } else {
        throw new Error(data.error || 'Gagal mengunggah ke Google Drive');
      }
    } catch (err) {
      handleGDriveUploadProgressSSE({
        filename: videoName,
        step: 'error',
        percent: 0,
        message: err.message
      });
    } finally {
      isUploadingToGDrive = false;
    }
  }

  // Dismiss button for Studio GDrive upload progress box
  if (el.btnGdriveDismissProgress) {
    el.btnGdriveDismissProgress.addEventListener('click', () => {
      if (el.gdriveUploadProgressBox) el.gdriveUploadProgressBox.style.display = 'none';
    });
  }

  // Dismiss button for Gallery GDrive upload progress box
  if (el.btnGdriveGalleryDismissProgress) {
    el.btnGdriveGalleryDismissProgress.addEventListener('click', () => {
      if (el.gdriveGalleryUploadProgressBox) el.gdriveGalleryUploadProgressBox.style.display = 'none';
    });
  }

  // Header GDrive Button
  if (el.btnOpenGDriveModal) {
    el.btnOpenGDriveModal.addEventListener('click', () => {
      if (el.modalGDriveConfig) el.modalGDriveConfig.style.display = 'flex';
      loadGDriveLink();
    });
  }
  if (el.btnCloseGDriveModal) {
    el.btnCloseGDriveModal.addEventListener('click', () => {
      if (el.modalGDriveConfig) el.modalGDriveConfig.style.display = 'none';
    });
  }
  if (el.btnCloseGDriveModal2) {
    el.btnCloseGDriveModal2.addEventListener('click', () => {
      if (el.modalGDriveConfig) el.modalGDriveConfig.style.display = 'none';
    });
  }
  if (el.btnTestGDriveLink) {
    el.btnTestGDriveLink.addEventListener('click', () => {
      const url = el.inputGDriveUrl?.value.trim() || currentGDriveUrl || 'https://drive.google.com/drive/my-drive';
      window.open(url, '_blank');
    });
  }
  if (el.btnSaveGDriveLink) {
    el.btnSaveGDriveLink.addEventListener('click', saveGDriveLink);
  }

  // Player Buttons (Upload ke Drive)
  if (el.btnUploadToGDrive) {
    el.btnUploadToGDrive.addEventListener('click', () => {
      const vid = el.selectOutputVideo?.value;
      uploadVideoToGDrive(vid);
    });
  }

  // Action Delegation for Gallery Video Rows
  document.addEventListener('click', e => {
    const btnUpload = e.target.closest('.btn-upload-gdrive-row');
    if (btnUpload && btnUpload.dataset.video) {
      uploadVideoToGDrive(btnUpload.dataset.video);
      return;
    }
  });

  // -------------------------------------------------------------
  // Direct Media Upload (public/ folder)
  // -------------------------------------------------------------
  el.fileDropzone.addEventListener('click', () => el.fileUploadInput.click());

  el.fileDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    el.fileDropzone.classList.add('dragover');
  });

  el.fileDropzone.addEventListener('dragleave', () => {
    el.fileDropzone.classList.remove('dragover');
  });

  el.fileDropzone.addEventListener('drop', e => {
    e.preventDefault();
    el.fileDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  el.fileUploadInput.addEventListener('change', () => {
    if (el.fileUploadInput.files.length > 0) {
      handleFileUpload(el.fileUploadInput.files[0]);
    }
  });

  async function handleFileUpload(file) {
    if (!file) return;
    el.uploadStatusBox.style.display = 'block';
    el.uploadStatusBox.className = 'feedback-banner warn';
    el.uploadStatusBox.textContent = `Mengunggah ${file.name} (${formatBytes(file.size)})...`;

    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah');

      el.uploadStatusBox.className = 'feedback-banner success';
      el.uploadStatusBox.innerHTML = `✓ Berhasil mengunggah <strong>public/${data.filename}</strong> (${data.sizeMB} MB).`;
      appendLog(`[UPLOAD SELESAI] File public/${data.filename} siap digunakan!`, true);

      await loadAssets();

      // If video file, auto-select as product video
      if (file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
        el.selectProductVideo.value = data.filename;
        if (state.currentProduct) {
          state.currentProduct.videoSource = data.filename;
          ['v1', 'v2'].forEach(vk => {
            const v = state.currentProduct.variants?.[vk];
            if (v && v.clips) {
              v.clips.forEach(c => { c.src = data.filename; });
            }
          });
        }
        syncFormToVariant();
        if (state.activeProductId && state.currentProduct) {
          fetch(`/api/products/${state.activeProductId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.currentProduct)
          }).catch(console.error);
        }
      }

      // If audio file, auto-select for active variant and offer auto-transcribe
      if (file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
        el.selectVoiceOver.value = data.filename;
        const v = state.currentProduct?.variants?.[state.activeVariantKey];
        if (v) {
          v.voiceOver = data.filename;
          checkDurationMatch(v);
        }
        updateVoiceOverStatusPill(data.filename);
        syncFormToVariant();

        // Auto-save product so change is immediately persisted
        if (state.activeProductId && state.currentProduct) {
          fetch(`/api/products/${state.activeProductId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.currentProduct)
          }).catch(console.error);
        }

        const okTranscribe = await showConfirmDialog({
          title: 'Transkrip Otomatis Whisper AI',
          message: `File audio <strong>${escapeHtml(file.name)}</strong> berhasil diunggah dan otomatis dipilih untuk ${state.activeVariantKey.toUpperCase()}.`,
          subtext: 'Apakah Anda ingin langsung menjalankan transkripsi kata otomatis via Whisper AI sekarang?',
          confirmText: 'Transkrip Sekarang',
          cancelText: 'Nanti Saja',
          isDanger: false
        });
        if (okTranscribe) {
          triggerTranscribe(file.name);
        }
      }
    } catch (err) {
      el.uploadStatusBox.className = 'feedback-banner error';
      el.uploadStatusBox.textContent = 'Gagal unggah: ' + err.message;
    }
  }

  // -------------------------------------------------------------
  // Supercharged Whisper Subtitle Editor (Merge, Split, Delete)
  // -------------------------------------------------------------
  async function triggerTranscribe(filename) {
    appendLog(`[WHISPER] Menjalankan transkripsi otomatis untuk public/${filename}...`);
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai transkripsi');
      alert(`Transkripsi untuk ${filename} dimulai di latar belakang. Silakan pantau monitor log.`);
    } catch (err) {
      alert('Error transcribe: ' + err.message);
    }
  }

  el.btnTranscribeCurrentVO.addEventListener('click', () => {
    const vo = el.selectVoiceOver.value;
    if (!vo) {
      alert('Pilih file voice over terlebih dahulu pada dropdown di atas.');
      return;
    }
    triggerTranscribe(vo);
  });

  async function loadTranscript(filename) {
    if (!filename) return;
    state.activeTranscriptFile = filename;
    el.wordsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 25px;">Memuat kata subtitle...</td></tr>';

    // Link audio player to matching audio if available
    const baseAudioName = filename.replace(/\.[^/.]+$/, '');
    const matchingAudio = state.assets.voiceOvers.find(vo => vo.name.startsWith(baseAudioName));
    if (matchingAudio) {
      el.subtitleAudioPlayer.src = `/public/${encodeURIComponent(matchingAudio.name)}`;
    } else {
      el.subtitleAudioPlayer.removeAttribute('src');
    }

    try {
      const res = await fetch(`/api/transcript?file=${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error('Gagal memuat subtitle');
      const words = await res.json();
      state.activeTranscriptWords = words;
      renderWordsTable();
    } catch (err) {
      el.wordsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--accent-rose);">Error: ${err.message}</td></tr>`;
    }
  }

  function renderWordsTable() {
    const words = state.activeTranscriptWords;
    el.wordsTableBody.innerHTML = '';

    if (!Array.isArray(words) || words.length === 0) {
      el.wordsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Tidak ada kata dalam subtitle ini.</td></tr>';
      return;
    }

    words.forEach((w, idx) => {
      const startSec = (w.startMs / 1000).toFixed(2);
      const endSec = (w.endMs / 1000).toFixed(2);
      const durMs = Math.round(w.endMs - w.startMs);
      const tr = document.createElement('tr');
      tr.id = `wordRow_${idx}`;

      const isLast = idx === words.length - 1;

      tr.innerHTML = `
        <td class="num" style="text-align: center; color: var(--text-faint);">${idx + 1}</td>
        <td class="num">
          <button class="btn small icon-only btn-seek-start" data-time="${startSec}" title="Putar dari Mulai" style="width: auto; padding: 0 6px; font-family: var(--font-mono);">
            ▶ ${startSec}s
          </button>
        </td>
        <td class="num">
          <button class="btn small icon-only btn-seek-end" data-time="${endSec}" title="Putar ke Selesai" style="width: auto; padding: 0 6px; font-family: var(--font-mono);">
            ${endSec}s
          </button>
        </td>
        <td class="num" style="color: var(--text-muted); font-size: 11px;">${durMs}ms</td>
        <td>
          <input type="text" class="word-edit-input" data-index="${idx}" value="${escapeHtml(w.text)}">
        </td>
        <td>
          <div class="btn-action-cell">
            <button class="btn small btn-merge-word" data-index="${idx}" ${isLast ? 'disabled' : ''} title="Satukan dengan baris bawah">
              🔗 Gabung Bawah
            </button>
            <button class="btn small btn-split-word" data-index="${idx}" title="Pisahkan menjadi 2 kata">
              ✂ Pisah
            </button>
            <button class="btn small danger btn-delete-word" data-index="${idx}" title="Hapus kata ini">
              ✕
            </button>
          </div>
        </td>
      `;
      el.wordsTableBody.appendChild(tr);
    });
  }

  el.selectTranscriptFile.addEventListener('change', () => {
    loadTranscript(el.selectTranscriptFile.value);
  });

  // Inline Word Edit
  el.wordsTableBody.addEventListener('input', e => {
    const inp = e.target.closest('.word-edit-input');
    if (!inp) return;
    const idx = parseInt(inp.dataset.index, 10);
    if (state.activeTranscriptWords[idx]) {
      state.activeTranscriptWords[idx].text = inp.value;
    }
  });

  // Table Action Buttons: Merge, Split, Delete, Audio Seek
  el.wordsTableBody.addEventListener('click', async e => {
    // 1. Audio Seek / Play
    const btnSeek = e.target.closest('.btn-seek-start, .btn-seek-end');
    if (btnSeek && btnSeek.dataset.time) {
      const sec = parseFloat(btnSeek.dataset.time);
      if (!isNaN(sec) && el.subtitleAudioPlayer.src) {
        el.subtitleAudioPlayer.currentTime = sec;
        el.subtitleAudioPlayer.play().catch(() => { });
      }
      return;
    }

    // 2. Word Merge (Join with Next Row)
    const btnMerge = e.target.closest('.btn-merge-word');
    if (btnMerge) {
      const idx = parseInt(btnMerge.dataset.index, 10);
      if (isNaN(idx) || !state.activeTranscriptFile) return;

      btnMerge.disabled = true;
      btnMerge.textContent = 'Menggabung...';

      try {
        const res = await fetch('/api/transcript/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: state.activeTranscriptFile,
            index: idx
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menggabungkan kata');

        state.activeTranscriptWords = data.words;
        renderWordsTable();
        appendLog(`[SUBTITLE] Kata baris #${idx + 1} berhasil digabungkan dengan baris bawah di ${state.activeTranscriptFile}`, true);
      } catch (err) {
        alert('Gagal menggabungkan kata: ' + err.message);
        renderWordsTable();
      }
      return;
    }

    // 3. Word Split
    const btnSplit = e.target.closest('.btn-split-word');
    if (btnSplit) {
      const idx = parseInt(btnSplit.dataset.index, 10);
      if (isNaN(idx) || !state.activeTranscriptFile) return;

      const currentWord = state.activeTranscriptWords[idx]?.text || '';
      const parts = currentWord.trim().split(/\s+/);
      let p1 = parts[0] || '';
      let p2 = parts.slice(1).join(' ') || '';

      const userInput = prompt(`Pisahkan kata "${currentWord}" menjadi 2 bagian (dipisahkan spasi):`, `${p1} ${p2}`.trim());
      if (!userInput) return;

      const userParts = userInput.trim().split(/\s+/);
      p1 = userParts[0] || '';
      p2 = userParts.slice(1).join(' ') || '';

      try {
        const res = await fetch('/api/transcript/split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: state.activeTranscriptFile,
            index: idx,
            part1: p1,
            part2: p2
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memisahkan kata');

        state.activeTranscriptWords = data.words;
        renderWordsTable();
        appendLog(`[SUBTITLE] Kata baris #${idx + 1} berhasil dipisahkan menjadi "${p1}" dan "${p2}"`, true);
      } catch (err) {
        alert('Gagal memisahkan kata: ' + err.message);
      }
      return;
    }

    // 4. Word Delete
    const btnDel = e.target.closest('.btn-delete-word');
    if (btnDel) {
      const idx = parseInt(btnDel.dataset.index, 10);
      if (isNaN(idx) || !state.activeTranscriptFile) return;

      const currentWord = state.activeTranscriptWords[idx]?.text || '';
      const ok = await showConfirmDialog({
        title: 'Hapus Kata Subtitle?',
        message: `Hapus kata #${idx + 1}: <strong>"${escapeHtml(currentWord)}"</strong>?`,
        subtext: 'Kata ini akan dihapus dari file transkrip JSON.',
        confirmText: 'Hapus Kata',
        isDanger: true
      });
      if (!ok) return;

      try {
        const res = await fetch('/api/transcript/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: state.activeTranscriptFile,
            index: idx
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menghapus kata');

        state.activeTranscriptWords = data.words;
        renderWordsTable();
        appendLog(`[SUBTITLE] Kata baris #${idx + 1} berhasil dihapus dari ${state.activeTranscriptFile}`, true);
      } catch (err) {
        alert('Gagal menghapus kata: ' + err.message);
      }
      return;
    }
  });

  // Save All Modified Words
  el.btnSaveSubtitles.addEventListener('click', async () => {
    if (!state.activeTranscriptFile || !state.activeTranscriptWords) return;
    try {
      el.btnSaveSubtitles.disabled = true;
      el.btnSaveSubtitles.textContent = 'Menyimpan...';
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: state.activeTranscriptFile,
          words: state.activeTranscriptWords
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      appendLog(`[SUBTITLE] Berhasil menyimpan ${data.count} kata ke ${state.activeTranscriptFile}`, true);
      alert('Perubahan kata subtitle berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      el.btnSaveSubtitles.disabled = false;
      el.btnSaveSubtitles.textContent = '💾 Simpan Perubahan Subtitle';
    }
  });

  // Kosongkan Naskah Acuan
  if (el.btnClearReferenceScript) {
    el.btnClearReferenceScript.addEventListener('click', () => {
      if (el.inputReferenceScript) {
        el.inputReferenceScript.value = '';
        el.inputReferenceScript.focus();
        showToast({ type: 'info', title: 'Naskah Dikosongkan', message: 'Kolom naskah narasi acuan telah dibersihkan.' });
      }
    });
  }

  // Auto-Correct Subtitles via Reference Script (Ground-Truth Gemini)
  el.btnAutoCorrectSubtitles.addEventListener('click', async () => {
    if (!state.activeTranscriptFile) {
      alert('Pilih file transkrip JSON terlebih dahulu di atas.');
      return;
    }

    const script = el.inputReferenceScript.value.trim();
    if (!script) {
      alert('Tempelkan naskah voice over asli dari Gemini ke kotak naskah acuan di atas terlebih dahulu.');
      return;
    }

    try {
      el.btnAutoCorrectSubtitles.disabled = true;
      el.btnAutoCorrectSubtitles.textContent = 'Mengoreksi...';
      el.autoCorrectFeedback.style.display = 'none';

      const res = await fetch('/api/transcript/auto-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: state.activeTranscriptFile,
          referenceScript: script
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengoreksi subtitle');

      state.activeTranscriptWords = data.words;
      renderWordsTable();

      const st = data.stats || {};
      el.autoCorrectFeedback.style.display = 'block';
      el.autoCorrectFeedback.innerHTML = `✓ <strong>Auto-Correct Berhasil:</strong> ${st.correctedCount || 0} kata dikoreksi (${st.mergedCount || 0} kata digabung, ${st.splitCount || 0} dipisah) dengan timing suara tetap presisi!`;

      appendLog(`[AUTO-CORRECT] Berhasil menyelaraskan ${data.words.length} kata pada ${state.activeTranscriptFile} berdasarkan naskah narasi Gemini`, true);
    } catch (err) {
      alert('Error auto-correct: ' + err.message);
    } finally {
      el.btnAutoCorrectSubtitles.disabled = false;
      el.btnAutoCorrectSubtitles.textContent = '✨ Auto-Correct Subtitle via Naskah';
    }
  });

  // -------------------------------------------------------------
  // Render Execution & Realtime SSE Stream (With Confirmation Modal)
  // -------------------------------------------------------------
  function updateRenderScopeCards(selectedVal) {
    document.querySelectorAll('.render-scope-card').forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      const isMatch = radio && radio.value === selectedVal;
      card.classList.toggle('active', isMatch);
      if (isMatch && radio) radio.checked = true;
    });
  }

  // Handle clicking radio cards inside Render Modal
  document.addEventListener('click', e => {
    const card = e.target.closest('.render-scope-card');
    if (card) {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateRenderScopeCards(radio.value);
      }
    }
  });

  // Open Render Confirmation Modal
  el.btnStartRender.addEventListener('click', () => {
    if (state.isRendering) {
      if (el.consoleBox) {
        el.consoleBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    syncFormToVariant();
    if (!state.currentProduct) {
      showToast({ type: 'warn', title: 'Pilih Produk', message: 'Silakan pilih atau simpan produk terlebih dahulu.' });
      return;
    }

    // Populate Modal Info
    if (el.renderModalProductName) {
      el.renderModalProductName.textContent = state.currentProduct.name || 'Produk';
    }
    if (el.renderModalOutputName) {
      const customName = el.inputCustomOutputName?.value.trim() || state.currentProduct.name || 'video';
      el.renderModalOutputName.textContent = customName + '.mp4';
      el.renderModalOutputName.title = customName + '.mp4';
    }
    if (el.renderModalFps && el.selectFps) {
      el.renderModalFps.value = el.selectFps.value || '60';
    }

    const v1Title = state.currentProduct.variants?.v1?.title || 'Problem-Solution (Pastel)';
    const v2Title = state.currentProduct.variants?.v2?.title || 'Value & Quality (Bold)';
    if (el.renderModalV1Title) el.renderModalV1Title.textContent = `${v1Title} • Pastel Aesthetic`;
    if (el.renderModalV2Title) el.renderModalV2Title.textContent = `${v2Title} • Editorial Minimal`;

    // Default select active variant card
    const activeKey = state.activeVariantKey || 'v1';
    const targetRadio = document.querySelector(`input[name="renderTargetOption"][value="${activeKey}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
      updateRenderScopeCards(activeKey);
    } else {
      updateRenderScopeCards('all');
    }

    if (el.modalRenderConfirm) {
      el.modalRenderConfirm.style.display = 'flex';
    }
  });

  // Close Render Modal Handlers
  if (el.btnCloseRenderConfirmModal) {
    el.btnCloseRenderConfirmModal.addEventListener('click', () => {
      if (el.modalRenderConfirm) el.modalRenderConfirm.style.display = 'none';
    });
  }
  if (el.btnCancelRenderConfirm) {
    el.btnCancelRenderConfirm.addEventListener('click', () => {
      if (el.modalRenderConfirm) el.modalRenderConfirm.style.display = 'none';
    });
  }
  if (el.modalRenderConfirm) {
    el.modalRenderConfirm.addEventListener('click', e => {
      if (e.target === el.modalRenderConfirm) {
        el.modalRenderConfirm.style.display = 'none';
      }
    });
  }

  // GPU Render Toggle Listener
  if (el.chkGpuRender) {
    el.chkGpuRender.addEventListener('change', async () => {
      const isGpu = el.chkGpuRender.checked;
      if (el.gpuRenderToggleRow) {
        el.gpuRenderToggleRow.classList.toggle('gpu-active', isGpu);
      }
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enableGpuRender: isGpu })
        });
        showToast({
          type: 'info',
          title: isGpu ? 'GPU Render Aktif' : 'CPU Render Aktif',
          message: isGpu
            ? 'AMD Radeon GPU (AMF h264) akan digunakan untuk proses render.'
            : 'Render akan menggunakan CPU (libx264).'
        });
      } catch (_) {}
    });
  }

  // Execute Render from Confirmation Modal
  if (el.btnExecuteRenderConfirm) {
    el.btnExecuteRenderConfirm.addEventListener('click', async () => {
      if (state.isRendering) return;
      if (el.modalRenderConfirm) el.modalRenderConfirm.style.display = 'none';

      const target = document.querySelector('input[name="renderTargetOption"]:checked')?.value || 'all';
      const fps = el.renderModalFps?.value || el.selectFps?.value || '60';
      if (el.selectFps) el.selectFps.value = fps;

      const useGpu = el.chkGpuRender ? el.chkGpuRender.checked : false;
      const customOutputName = el.inputCustomOutputName?.value.trim() || state.currentProduct.name;

      // Scroll smoothly down to Monitor Render Real-Time
      if (el.consoleBox) {
        el.consoleBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      try {
        el.btnStartRender.disabled = true;
        el.btnCancelRender.style.display = 'inline-flex';
        el.renderStatusPill.textContent = '● Merender';
        el.renderStatusPill.className = 'pill amber';

        if (el.headerProgressStrip) {
          el.headerProgressStrip.style.display = 'block';
          if (el.headerProgressFill) el.headerProgressFill.style.width = '4%';
        }

        const labelTarget = target === 'all'
          ? 'Semua Variasi (v1 & v2)'
          : (target === 'v2' ? 'Hanya Variasi 2 (Bold)' : 'Hanya Variasi 1 (Pastel)');
        const engineLabel = useGpu ? '🎮 AMD Radeon GPU' : '💻 CPU';
        appendLog(`[STUDIO] Memulai render [${engineLabel}]: ${labelTarget} (${fps}fps) dengan judul "${customOutputName}"...`, true);

        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: state.activeProductId,
            productData: state.currentProduct,
            target,
            fps,
            customOutputName,
            useGpu
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memulai render');
      } catch (err) {
        alert('Error saat render: ' + err.message);
        el.btnStartRender.disabled = false;
        el.btnCancelRender.style.display = 'none';
        el.renderStatusPill.textContent = '● Gagal';
        el.renderStatusPill.className = 'pill rose';
        if (el.headerProgressStrip) el.headerProgressStrip.style.display = 'none';
      }
    });
  }

  el.btnCancelRender.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: 'Batalkan Proses Render?',
      message: 'Apakah Anda yakin ingin membatalkan proses render video yang sedang berjalan?',
      subtext: 'Proses render Chromium akan dihentikan seketika.',
      confirmText: 'Ya, Batalkan Render',
      isDanger: true
    });
    if (!ok) return;
    try {
      await fetch('/api/cancel', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  });

  // SSE Stream Listener
  function initSSE() {
    const es = new EventSource('/api/events');

    es.addEventListener('log', e => {
      const data = JSON.parse(e.data);
      appendLog(data.text);
    });

    es.addEventListener('status', e => {
      const data = JSON.parse(e.data);
      state.isRendering = data.isRendering;
      el.btnCancelRender.style.display = data.isRendering ? 'inline-flex' : 'none';
      if (!data.isRendering) {
        el.btnStartRender.disabled = false;
        el.renderStatusPill.textContent = '● Siap';
        el.renderStatusPill.className = 'pill emerald';
        if (el.headerProgressStrip) el.headerProgressStrip.style.display = 'none';
        if (el.btnStartRender) {
          el.btnStartRender.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Mulai Render Video
          `;
        }
      }
    });

    es.addEventListener('progress', e => {
      const p = JSON.parse(e.data);
      const pct = Math.min(100, Math.max(0, p.percent || 0));
      el.progressStep.textContent = `Status: ${p.step || 'Merender Frame'}`;
      el.progressPercent.textContent = `${pct.toFixed(1)}%`;
      el.progressBarFill.style.width = `${pct}%`;
      el.progressFrames.textContent = `${p.frame || 0} / ${p.totalFrames || 0} frame`;
      el.progressEta.textContent = `Estimasi: ${p.eta || '-'}`;

      // Floating Mini-Progress Bar under Header
      if (el.headerProgressStrip) {
        el.headerProgressStrip.style.display = 'block';
        if (el.headerProgressFill) el.headerProgressFill.style.width = `${pct}%`;
      }

      // Live progress on master header button
      if (el.btnStartRender) {
        el.btnStartRender.disabled = false;
        el.btnStartRender.innerHTML = `
          <span style="animation: spin 0.8s linear infinite; display: inline-block;">⏳</span>
          Merender ${Math.round(pct)}% (${p.frame || 0}/${p.totalFrames || 0})
        `;
      }
      if (el.renderStatusPill) {
        el.renderStatusPill.textContent = `● Merender ${Math.round(pct)}%`;
        el.renderStatusPill.className = 'pill amber';
      }
    });

    es.addEventListener('done', e => {
      const data = JSON.parse(e.data);
      state.isRendering = false;
      el.btnStartRender.disabled = false;
      el.btnCancelRender.style.display = 'none';

      // Finish floating mini progress bar smoothly
      if (el.headerProgressFill) el.headerProgressFill.style.width = '100%';
      setTimeout(() => {
        if (el.headerProgressStrip) el.headerProgressStrip.style.display = 'none';
        if (el.headerProgressFill) el.headerProgressFill.style.width = '0%';
      }, 1400);

      // Reset master render button
      if (el.btnStartRender) {
        el.btnStartRender.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Mulai Render Video
        `;
      }

      if (data.cancelled) {
        el.renderStatusPill.textContent = '● Dibatalkan';
        el.renderStatusPill.className = 'pill neutral';
        appendLog('[CANCEL] Render dibatalkan oleh pengguna.');
      } else if (data.code === 0) {
        el.renderStatusPill.textContent = '● Selesai';
        el.renderStatusPill.className = 'pill emerald';
        el.progressBarFill.style.width = '100%';
        appendLog('[FINISH] Render selesai sempurna! Video siap diputar di galeri.', true);
        loadVideos();

        const firstOut = data.outputs?.[0];
        showToast({
          type: 'success',
          title: '🎉 Render Selesai Sempurna!',
          message: 'Video siap! Klik tombol untuk langsung upload ke Google Drive.',
          duration: 10000,
          actionLabel: '⚡ Upload ke Drive',
          onAction: () => {
            if (firstOut) uploadVideoToGDrive(firstOut);
            else openGDriveFolderInBrowser();
          }
        });
      } else {
        el.renderStatusPill.textContent = '● Gagal';
        el.renderStatusPill.className = 'pill rose';
        appendLog(`[ERROR] Render gagal dengan error: ${data.error || 'Unknown error'}`);
      }
    });

    es.addEventListener('transcribe-done', e => {
      const data = JSON.parse(e.data);
      appendLog(`[TRANSKRIBSI SELESAI] File ${data.jsonFile} (${data.wordsCount} kata)`, true);
      loadAssets();
    });

    es.addEventListener('still_progress', e => {
      const data = JSON.parse(e.data);
      handleStillProgressSSE(data);
    });

    es.addEventListener('gdrive_upload_progress', e => {
      const data = JSON.parse(e.data);
      handleGDriveUploadProgressSSE(data);
    });

    es.onerror = () => {
      // Reconnection handled automatically by browser
    };
  }

  // -------------------------------------------------------------
  // Video Output Selector & Player
  // -------------------------------------------------------------
  async function loadVideos() {
    try {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Gagal memuat galeri video');
      const videos = await res.json();
      state.videos = videos;

      el.selectOutputVideo.innerHTML = '<option value="">Pilih video yang sudah dirender...</option>';
      videos.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${formatBytes(v.size)})`;
        el.selectOutputVideo.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function playVideo(videoName) {
    if (!videoName) {
      el.videoPreview.pause();
      el.videoPreview.removeAttribute('src');
      el.playerEmptyMsg.style.display = 'flex';
      el.videoMetaText.textContent = '-';
      el.btnOpenExternal.style.display = 'none';
      el.btnDownloadVideo.style.display = 'none';
      if (el.btnUploadToGDrive) el.btnUploadToGDrive.style.display = 'none';
      return;
    }

    const videoUrl = `/out/${encodeURIComponent(videoName)}`;
    el.videoPreview.src = videoUrl;
    el.playerEmptyMsg.style.display = 'none';
    el.videoPreview.play().catch(() => { });

    el.selectOutputVideo.value = videoName;
    el.btnOpenExternal.style.display = 'inline-flex';
    el.btnOpenExternal.href = videoUrl;
    el.btnDownloadVideo.style.display = 'inline-flex';
    el.btnDownloadVideo.href = videoUrl;
    if (el.btnUploadToGDrive) el.btnUploadToGDrive.style.display = 'inline-flex';

    const vidObj = (state.videos || []).find(v => v.name === videoName);
    el.videoMetaText.textContent = vidObj ? `${videoName} · ${formatBytes(vidObj.size)}` : videoName;
  }

  el.selectOutputVideo.addEventListener('change', () => playVideo(el.selectOutputVideo.value));

  // -------------------------------------------------------------
  // Galeri Video & Berkas Media (Previews, Videos, Raw Assets)
  // -------------------------------------------------------------
  let publicState = {
    previews: [],
    videos: [],
    media: [],
    sfx: []
  };

  async function loadPublicBrowser() {
    try {
      const [resPreviews, resVideos, resRaw] = await Promise.all([
        fetch('/api/previews').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/videos').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/public-files').then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      const mediaFiles = resRaw.filter(f => f.category !== 'SFX Audio' && f.category !== 'BGM Music');
      const sfxFiles = resRaw.filter(f => f.category === 'SFX Audio' || f.category === 'BGM Music');

      publicState.previews = resPreviews;
      publicState.videos = resVideos;
      publicState.media = mediaFiles;
      publicState.sfx = sfxFiles;

      if (el.countPublicPreviews) el.countPublicPreviews.textContent = resPreviews.length;
      if (el.countPublicVideos) el.countPublicVideos.textContent = resVideos.length;
      if (el.countPublicMedia) el.countPublicMedia.textContent = mediaFiles.length;
      if (el.countPublicSfx) el.countPublicSfx.textContent = sfxFiles.length;
      if (el.headerPublicCount) el.headerPublicCount.textContent = resPreviews.length + resVideos.length + mediaFiles.length;

      // Render 1: Still Previews Grid
      if (el.publicPreviewsGrid) {
        el.publicPreviewsGrid.innerHTML = '';
        if (resPreviews.length === 0) {
          el.publicPreviewsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-faint); background: var(--bg-surface); border-radius: var(--radius-card); border: 1px dashed var(--border-subtle);">
              <div style="font-size: 28px; margin-bottom: 8px;">📸</div>
              <p style="font-weight: 500; color: var(--text-muted); margin-bottom: 4px;">Belum ada frame pratinjau yang dirender</p>
              <p style="font-size: 12px; color: var(--text-faint);">Klik tombol <strong>"Lihat Frame"</strong> di kanan atas studio untuk menghasilkan still frame resolusi penuh.</p>
            </div>
          `;
        } else {
          resPreviews.forEach(p => {
            const dateStr = new Date(p.mtime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
              <div class="preview-card-img-wrap" data-img="${escapeHtml(p.url)}" title="Klik untuk memperbesar">
                <img class="preview-card-img" src="${escapeHtml(p.url)}" alt="${escapeHtml(p.name)}" loading="lazy">
                <span class="preview-card-badge">STILL FRAME</span>
              </div>
              <div class="preview-card-info">
                <div class="preview-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                <div class="preview-card-meta">
                  <span>${formatBytes(p.size)}</span>
                  <span>${dateStr}</span>
                </div>
                <div class="preview-card-actions">
                  <button class="btn small btn-preview-card-view" data-url="${escapeHtml(p.url)}" data-name="${escapeHtml(p.name)}">Lihat Frame</button>
                  <button class="btn small danger btn-preview-card-del" data-name="${escapeHtml(p.name)}" title="Hapus preview">Hapus</button>
                </div>
              </div>
            `;
            el.publicPreviewsGrid.appendChild(card);
          });
        }
      }

      // Render 2: Rendered Videos Table in Public Tab
      if (el.publicVideosTableBody) {
        el.publicVideosTableBody.innerHTML = '';
        if (resVideos.length === 0) {
          el.publicVideosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Belum ada video di folder out/</td></tr>';
        } else {
          resVideos.forEach(v => {
            const isV1 = v.name.includes('v1');
            const isV2 = v.name.includes('v2');
            const variantPill = isV1
              ? '<span class="pill emerald">Variasi 1 (Pastel)</span>'
              : (isV2 ? '<span class="pill amber">Variasi 2 (Bold)</span>' : '<span class="pill neutral">Video MP4</span>');
            const dateStr = new Date(v.mtime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight: 500;">${escapeHtml(v.name)}</td>
              <td>${variantPill}</td>
              <td class="num" style="text-align: right;">${formatBytes(v.size)}</td>
              <td class="num">${dateStr}</td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn small btn-play-public-video" data-video="${escapeHtml(v.name)}">Putar</button>
                  <button class="btn small btn-upload-gdrive-row" data-video="${escapeHtml(v.name)}" style="color: #34d399;" title="Unggah video ini langsung ke Google Drive">⚡ Upload</button>
                  <a class="btn small" href="/out/${encodeURIComponent(v.name)}" download>Unduh</a>
                  <button class="btn small danger btn-del-public-video" data-video="${escapeHtml(v.name)}">Hapus</button>
                </div>
              </td>
            `;
            el.publicVideosTableBody.appendChild(tr);
          });
        }
      }

      // Render 3: Berkas Media Produk (Video Mentah, Voiceover, Transkrip)
      if (el.publicMediaTableBody) {
        el.publicMediaTableBody.innerHTML = '';
        if (mediaFiles.length === 0) {
          el.publicMediaTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Tidak ada berkas media di folder public/</td></tr>';
        } else {
          mediaFiles.forEach(f => {
            let catPill = '<span class="pill neutral">Berkas</span>';
            let actionHtml = `<div style="display: flex; gap: 6px;"><a class="btn small" href="${escapeHtml(f.url)}" target="_blank" download="${escapeHtml(f.name)}">Unduh</a><button class="btn small danger btn-del-public-file" data-file="${escapeHtml(f.name)}" title="Hapus berkas ini">Hapus</button></div>`;

            if (f.category.includes('Video')) {
              catPill = '<span class="pill rose">Video Mentah</span>';
              actionHtml = `
                <div style="display: flex; gap: 6px;">
                  <a class="btn small" href="${escapeHtml(f.url)}" target="_blank">Lihat</a>
                  <a class="btn small primary" href="${escapeHtml(f.url)}" download="${escapeHtml(f.name)}">Unduh</a>
                  <button class="btn small danger btn-del-public-file" data-file="${escapeHtml(f.name)}" title="Hapus video ini">Hapus</button>
                </div>
              `;
            } else if (f.category.includes('Audio')) {
              catPill = '<span class="pill emerald">Voiceover Audio</span>';
              actionHtml = `
                <div style="display: flex; gap: 6px;">
                  <button class="btn small btn-play-audio-preview" data-src="${escapeHtml(f.url)}">▶️ Putar</button>
                  <a class="btn small primary" href="${escapeHtml(f.url)}" download="${escapeHtml(f.name)}">Unduh</a>
                  <button class="btn small danger btn-del-public-file" data-file="${escapeHtml(f.name)}" title="Hapus audio ini">Hapus</button>
                </div>
              `;
            } else if (f.category.includes('Transkrip')) {
              catPill = '<span class="pill amber">Transkrip JSON</span>';
              actionHtml = `
                <div style="display: flex; gap: 6px;">
                  <a class="btn small" href="${escapeHtml(f.url)}" target="_blank">Buka JSON</a>
                  <a class="btn small primary" href="${escapeHtml(f.url)}" download="${escapeHtml(f.name)}">Unduh</a>
                  <button class="btn small danger btn-del-public-file" data-file="${escapeHtml(f.name)}" title="Hapus transkrip ini">Hapus</button>
                </div>
              `;
            }

            const dateStr = new Date(f.mtime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight: 500; word-break: break-all;">${escapeHtml(f.name)}</td>
              <td>${catPill}</td>
              <td class="num" style="text-align: right;">${formatBytes(f.size)}</td>
              <td class="num">${dateStr}</td>
              <td>${actionHtml}</td>
            `;
            el.publicMediaTableBody.appendChild(tr);
          });
        }
      }

      // Render 4: Efek Suara SFX (public/sfx/)
      if (el.publicSfxTableBody) {
        el.publicSfxTableBody.innerHTML = '';
        if (sfxFiles.length === 0) {
          el.publicSfxTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Folder public/sfx/ kosong</td></tr>';
        } else {
          sfxFiles.forEach(f => {
            const cleanName = f.name.replace(/^sfx\//, '');
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight: 500;">
                <span style="color: var(--accent-gold); margin-right: 6px;">🔊</span>
                ${escapeHtml(cleanName)}
              </td>
              <td><span class="pill neutral">Sound FX (WAV)</span></td>
              <td class="num" style="text-align: right;">${formatBytes(f.size)}</td>
              <td style="text-align: center;">
                <button class="btn small btn-play-audio-preview" data-src="${escapeHtml(f.url)}" style="margin: 0 auto;">
                  ▶️ Tes Suara
                </button>
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <a class="btn small" href="${escapeHtml(f.url)}" download="${escapeHtml(cleanName)}">Unduh</a>
                  <button class="btn small danger btn-del-public-file" data-file="${escapeHtml(f.name)}" title="Hapus efek suara">Hapus</button>
                </div>
              </td>
            `;
            el.publicSfxTableBody.appendChild(tr);
          });
        }
      }

      filterPublicBrowser();
    } catch (err) {
      console.error('Error loading public browser:', err);
    }
  }

  // Segmented view filter for Menu Public
  document.querySelectorAll('.public-view-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.public-view-filter').forEach(b => {
        b.classList.remove('primary', 'active');
      });
      btn.classList.add('primary', 'active');
      const view = btn.dataset.view;
      if (el.publicVideosView) el.publicVideosView.style.display = view === 'videos' ? 'block' : 'none';
      if (el.publicPreviewsView) el.publicPreviewsView.style.display = view === 'previews' ? 'block' : 'none';
      if (el.publicMediaView) el.publicMediaView.style.display = view === 'media' ? 'block' : 'none';
      if (el.publicSfxView) el.publicSfxView.style.display = view === 'sfx' ? 'block' : 'none';
      filterPublicBrowser();
    });
  });

  // Instant Search Filter for Menu Public (Videos, Previews, Media, SFX)
  function filterPublicBrowser() {
    const q = (el.inputPublicSearch ? el.inputPublicSearch.value : '').trim().toLowerCase();
    if (el.btnClearPublicSearch) {
      el.btnClearPublicSearch.style.display = q ? 'block' : 'none';
    }

    // Filter Videos Table
    if (el.publicVideosTableBody) {
      let visible = 0;
      el.publicVideosTableBody.querySelectorAll('tr').forEach(tr => {
        if (tr.classList.contains('no-search-results')) return;
        if (tr.querySelector('td[colspan]')) return;
        const match = tr.textContent.toLowerCase().includes(q);
        tr.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      let noRes = el.publicVideosTableBody.querySelector('.no-search-results');
      if (visible === 0 && q) {
        if (!noRes) {
          noRes = document.createElement('tr');
          noRes.className = 'no-search-results';
          el.publicVideosTableBody.appendChild(noRes);
        }
        noRes.innerHTML = `<td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Tidak ada video yang cocok dengan "<strong>${escapeHtml(q)}</strong>"</td>`;
        noRes.style.display = '';
      } else if (noRes) {
        noRes.style.display = 'none';
      }
    }

    // Filter Previews Grid
    if (el.publicPreviewsGrid) {
      let visible = 0;
      el.publicPreviewsGrid.querySelectorAll('.preview-card').forEach(card => {
        const match = card.textContent.toLowerCase().includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      let noRes = el.publicPreviewsGrid.querySelector('.no-search-results-grid');
      if (visible === 0 && q) {
        if (!noRes) {
          noRes = document.createElement('div');
          noRes.className = 'no-search-results-grid';
          noRes.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-faint);';
          el.publicPreviewsGrid.appendChild(noRes);
        }
        noRes.innerHTML = `Tidak ada preview frame yang cocok dengan "<strong>${escapeHtml(q)}</strong>"`;
        noRes.style.display = '';
      } else if (noRes) {
        noRes.style.display = 'none';
      }
    }

    // Filter Media Table
    if (el.publicMediaTableBody) {
      let visible = 0;
      el.publicMediaTableBody.querySelectorAll('tr').forEach(tr => {
        if (tr.classList.contains('no-search-results')) return;
        if (tr.querySelector('td[colspan]')) return;
        const match = tr.textContent.toLowerCase().includes(q);
        tr.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      let noRes = el.publicMediaTableBody.querySelector('.no-search-results');
      if (visible === 0 && q) {
        if (!noRes) {
          noRes = document.createElement('tr');
          noRes.className = 'no-search-results';
          el.publicMediaTableBody.appendChild(noRes);
        }
        noRes.innerHTML = `<td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Tidak ada berkas media yang cocok dengan "<strong>${escapeHtml(q)}</strong>"</td>`;
        noRes.style.display = '';
      } else if (noRes) {
        noRes.style.display = 'none';
      }
    }

    // Filter SFX Table
    if (el.publicSfxTableBody) {
      let visible = 0;
      el.publicSfxTableBody.querySelectorAll('tr').forEach(tr => {
        if (tr.classList.contains('no-search-results')) return;
        if (tr.querySelector('td[colspan]')) return;
        const match = tr.textContent.toLowerCase().includes(q);
        tr.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      let noRes = el.publicSfxTableBody.querySelector('.no-search-results');
      if (visible === 0 && q) {
        if (!noRes) {
          noRes = document.createElement('tr');
          noRes.className = 'no-search-results';
          el.publicSfxTableBody.appendChild(noRes);
        }
        noRes.innerHTML = `<td colspan="5" style="text-align:center; padding: 24px; color: var(--text-faint);">Tidak ada efek suara SFX yang cocok dengan "<strong>${escapeHtml(q)}</strong>"</td>`;
        noRes.style.display = '';
      } else if (noRes) {
        noRes.style.display = 'none';
      }
    }
  }

  if (el.inputPublicSearch) {
    el.inputPublicSearch.addEventListener('input', filterPublicBrowser);
  }
  if (el.btnClearPublicSearch) {
    el.btnClearPublicSearch.addEventListener('click', () => {
      if (el.inputPublicSearch) {
        el.inputPublicSearch.value = '';
        filterPublicBrowser();
        el.inputPublicSearch.focus();
      }
    });
  }

  // Global Audio Preview Player (for voiceover & SFX preview in tables)
  let activePreviewAudio = null;
  let activePreviewBtn = null;

  document.addEventListener('click', e => {
    const playBtn = e.target.closest('.btn-play-audio-preview');
    if (playBtn && playBtn.dataset.src) {
      const src = playBtn.dataset.src;
      if (activePreviewAudio && activePreviewBtn === playBtn && !activePreviewAudio.paused) {
        activePreviewAudio.pause();
        activePreviewBtn.innerHTML = '▶️ Putar';
        return;
      }

      if (activePreviewAudio) {
        activePreviewAudio.pause();
        if (activePreviewBtn) activePreviewBtn.innerHTML = '▶️ Putar';
      }

      activePreviewAudio = new Audio(src);
      activePreviewBtn = playBtn;
      playBtn.innerHTML = '⏸️ Berhenti';

      activePreviewAudio.play().catch(() => { });
      activePreviewAudio.onended = () => {
        playBtn.innerHTML = '▶️ Putar';
      };
      activePreviewAudio.onerror = () => {
        playBtn.innerHTML = '▶️ Putar';
      };
    }
  });

  // Action Delegation for Previews Grid (Perbesar & Hapus)
  if (el.publicPreviewsGrid) {
    el.publicPreviewsGrid.addEventListener('click', async e => {
      const imgWrap = e.target.closest('.preview-card-img-wrap');
      const viewBtn = e.target.closest('.btn-preview-card-view');
      if (imgWrap || viewBtn) {
        const url = (imgWrap ? imgWrap.dataset.img : null) || (viewBtn ? viewBtn.dataset.url : null);
        if (url) {
          el.stillImagePreview.src = url;
          el.stillImagePreview.style.display = 'block';
          el.stillLoadingText.style.display = 'none';
          el.stillEmptyPlaceholder.style.display = 'none';
          if (el.btnDownloadStill) {
            el.btnDownloadStill.style.display = 'inline-flex';
            el.btnDownloadStill.href = url;
          }
          el.stillFeedbackBanner.style.display = 'none';
          el.modalStillPreview.style.display = 'flex';
        }
        return;
      }

      const delBtn = e.target.closest('.btn-preview-card-del');
      if (delBtn && delBtn.dataset.name) {
        const previewName = delBtn.dataset.name;
        const ok = await showConfirmDialog({
          title: 'Hapus Frame Pratinjau?',
          message: `Hapus gambar frame <strong>${escapeHtml(previewName)}</strong>?`,
          subtext: 'Berkas gambar ini akan dihapus permanen dari out/previews/.',
          confirmText: 'Hapus Frame',
          isDanger: true
        });
        if (!ok) return;
        try {
          const res = await fetch(`/api/previews?file=${encodeURIComponent(previewName)}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal menghapus frame');
          showToast({ type: 'success', title: 'Frame Dihapus', message: `${previewName} telah dihapus.` });
          await loadPublicBrowser();
        } catch (err) {
          showToast({ type: 'error', title: 'Gagal Hapus', message: err.message });
        }
      }
    });
  }

  // Action Delegation for Public Videos Table
  if (el.publicVideosTableBody) {
    el.publicVideosTableBody.addEventListener('click', async e => {
      const playBtn = e.target.closest('.btn-play-public-video');
      if (playBtn && playBtn.dataset.video) {
        switchTab('studio');
        playVideo(playBtn.dataset.video);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const delBtn = e.target.closest('.btn-del-public-video');
      if (delBtn && delBtn.dataset.video) {
        const videoName = delBtn.dataset.video;
        const ok = await showConfirmDialog({
          title: 'Hapus Video Hasil Render?',
          message: `Hapus berkas video <strong>${escapeHtml(videoName)}</strong>?`,
          subtext: 'Berkas video MP4 ini akan dihapus permanen dari folder out/ dan tidak dapat dipulihkan.',
          confirmText: 'Hapus Video',
          isDanger: true
        });
        if (!ok) return;
        try {
          const res = await fetch(`/api/videos?file=${encodeURIComponent(videoName)}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
          showToast({ type: 'success', title: 'Video Dihapus', message: `${videoName} berhasil dihapus dari out/` });
          if (el.selectOutputVideo.value === videoName) {
            playVideo('');
          }
          await loadVideos();
          await loadPublicBrowser();
        } catch (err) {
          showToast({ type: 'error', title: 'Gagal Hapus', message: err.message });
        }
      }
    });
  }

  // Action Delegation for Deleting Public Media & SFX Files
  async function handlePublicFileDelete(fileName) {
    const ok = await showConfirmDialog({
      title: 'Hapus Berkas Media?',
      message: `Apakah Anda yakin ingin menghapus <strong>${escapeHtml(fileName)}</strong>?`,
      subtext: 'Berkas ini akan dihapus permanen dari folder public/ dan tidak dapat dipulihkan.',
      confirmText: 'Hapus Berkas',
      isDanger: true
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/public-files?file=${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus berkas');
      showToast({ type: 'success', title: 'Berkas Dihapus', message: `${fileName} berhasil dihapus dari folder public/` });
      await loadAssets();
      await loadPublicBrowser();
    } catch (err) {
      showToast({ type: 'error', title: 'Gagal Hapus', message: err.message });
    }
  }

  if (el.publicMediaTableBody) {
    el.publicMediaTableBody.addEventListener('click', async e => {
      const delBtn = e.target.closest('.btn-del-public-file');
      if (delBtn && delBtn.dataset.file) {
        await handlePublicFileDelete(delBtn.dataset.file);
      }
    });
  }

  if (el.publicSfxTableBody) {
    el.publicSfxTableBody.addEventListener('click', async e => {
      const delBtn = e.target.closest('.btn-del-public-file');
      if (delBtn && delBtn.dataset.file) {
        await handlePublicFileDelete(delBtn.dataset.file);
      }
    });
  }

  // Open Folder Handlers (Windows Explorer)
  if (el.btnOpenOutFolder) {
    el.btnOpenOutFolder.addEventListener('click', async () => {
      try {
        await fetch('/api/open-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'out' })
        });
        showToast({ type: 'info', title: 'Folder out/ Dibuka', message: 'Membuka folder out/ di Windows File Explorer.' });
      } catch (err) {
        showToast({ type: 'error', title: 'Gagal Membuka Folder', message: err.message });
      }
    });
  }

  if (el.btnOpenPublicFolder) {
    el.btnOpenPublicFolder.addEventListener('click', async () => {
      try {
        await fetch('/api/open-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'public' })
        });
        showToast({ type: 'info', title: 'Folder public/ Dibuka', message: 'Membuka folder public/ di Windows File Explorer.' });
      } catch (err) {
        showToast({ type: 'error', title: 'Gagal Membuka Folder', message: err.message });
      }
    });
  }

  if (el.btnRefreshPublicBrowser) {
    el.btnRefreshPublicBrowser.addEventListener('click', async () => {
      await loadPublicBrowser();
      showToast({ type: 'info', title: 'Data Diperbarui', message: 'Menu Public telah disegarkan.' });
    });
  }

  // -------------------------------------------------------------
  // Custom Select Dropdown System (Anti-Slop Modern Studio Design)
  // -------------------------------------------------------------
  function upgradeSelectToCustom(selectEl) {
    if (!selectEl || selectEl.dataset.customized === 'true') return;
    selectEl.dataset.customized = 'true';

    // Create wrapper
    const wrap = document.createElement('div');
    wrap.className = 'custom-select-wrap';
    if (selectEl.id) wrap.id = 'customWrap_' + selectEl.id;

    // Inherit inline styling / layout properties
    if (selectEl.style.width) wrap.style.width = selectEl.style.width;
    if (selectEl.style.flex) wrap.style.flex = selectEl.style.flex;
    if (selectEl.style.maxWidth) wrap.style.maxWidth = selectEl.style.maxWidth;

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    if (selectEl.style.height) trigger.style.height = selectEl.style.height;
    if (selectEl.style.fontSize) trigger.style.fontSize = selectEl.style.fontSize;
    if (selectEl.disabled) trigger.disabled = true;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'custom-select-value';

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'custom-select-arrow';
    arrowSpan.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    trigger.appendChild(valueSpan);
    trigger.appendChild(arrowSpan);

    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    dropdown.appendChild(optionsList);

    function rebuildOptions() {
      optionsList.innerHTML = '';
      const opts = Array.from(selectEl.options);

      const selectedOpt = selectEl.options[selectEl.selectedIndex] || opts[0];
      valueSpan.textContent = selectedOpt ? selectedOpt.textContent : (selectEl.value || '-- Pilih --');
      valueSpan.title = valueSpan.textContent;

      if (opts.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'custom-select-empty';
        emptyItem.textContent = '(Tidak ada pilihan)';
        optionsList.appendChild(emptyItem);
        return;
      }

      opts.forEach(opt => {
        const item = document.createElement('div');
        const isSelected = opt.value === selectEl.value || (!selectEl.value && opt === selectedOpt);
        item.className = 'custom-select-option' + (isSelected ? ' is-selected' : '');
        item.dataset.value = opt.value;

        if (opt.dataset.color || opt.dataset.sub || opt.dataset.shape) {
          item.classList.add('has-rich-meta');
          const richLeft = document.createElement('div');
          richLeft.className = 'custom-select-rich-left';

          if (opt.dataset.color) {
            const swatch = document.createElement('span');
            swatch.className = 'custom-select-swatch';
            swatch.style.background = opt.dataset.color;
            swatch.style.color = opt.dataset.color;
            if (opt.dataset.bg === '#F8FAFC') {
              swatch.style.borderColor = '#cbd5e1';
            }
            richLeft.appendChild(swatch);
          } else if (opt.dataset.shape) {
            const shapeIcon = document.createElement('span');
            shapeIcon.className = 'custom-select-shape-icon';
            if (opt.dataset.shape === 'glass') shapeIcon.textContent = '🪟';
            else if (opt.dataset.shape === 'two_tier') shapeIcon.textContent = '📑';
            else if (opt.dataset.shape === 'floating') shapeIcon.textContent = '✨';
            else if (opt.dataset.shape === 'capsule') shapeIcon.textContent = '💊';
            else if (opt.dataset.shape === 'tiktok_ugc') shapeIcon.textContent = '🏷️';
            else if (opt.dataset.shape === 'top_banner') shapeIcon.textContent = '⚡';
            else shapeIcon.textContent = '📐';
            richLeft.appendChild(shapeIcon);
          }

          const labelBox = document.createElement('div');
          labelBox.className = 'custom-select-label-box';

          const mainLabel = document.createElement('span');
          mainLabel.className = 'custom-select-main-label';
          mainLabel.textContent = opt.textContent;
          labelBox.appendChild(mainLabel);

          if (opt.dataset.sub) {
            const subLabel = document.createElement('span');
            subLabel.className = 'custom-select-sub-label';
            subLabel.textContent = opt.dataset.sub;
            labelBox.appendChild(subLabel);
          }

          richLeft.appendChild(labelBox);
          item.appendChild(richLeft);
        } else {
          const textSpan = document.createElement('span');
          textSpan.textContent = opt.textContent;
          item.appendChild(textSpan);
        }

        if (isSelected) {
          const checkSpan = document.createElement('span');
          checkSpan.className = 'custom-select-check';
          checkSpan.textContent = '✓';
          item.appendChild(checkSpan);
        }

        item.addEventListener('click', e => {
          e.stopPropagation();
          selectEl.value = opt.value;
          syncState();
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          closeDropdown();
        });

        optionsList.appendChild(item);
      });
    }

    function syncState() {
      const opts = Array.from(selectEl.options);
      let match = opts.find(o => o.value === selectEl.value);
      if (!match && selectEl.selectedIndex >= 0) match = selectEl.options[selectEl.selectedIndex];

      if (match && match.dataset.color) {
        valueSpan.innerHTML = `<span class="custom-select-swatch" style="width:11px;height:11px;display:inline-block;margin-right:7px;background:${match.dataset.color};color:${match.dataset.color};border-radius:50%;vertical-align:middle;box-shadow:0 0 6px currentColor;"></span><span>${escapeHtml(match.textContent)}</span>`;
      } else if (match && match.dataset.shape) {
        let icon = '🪟';
        if (match.dataset.shape === 'two_tier') icon = '📑';
        else if (match.dataset.shape === 'floating') icon = '✨';
        else if (match.dataset.shape === 'capsule') icon = '💊';
        else if (match.dataset.shape === 'tiktok_ugc') icon = '🏷️';
        else if (match.dataset.shape === 'top_banner') icon = '⚡';
        valueSpan.innerHTML = `<span style="margin-right:6px;font-size:12px;">${icon}</span><span>${escapeHtml(match.textContent)}</span>`;
      } else {
        valueSpan.textContent = match ? match.textContent : (selectEl.value || '-- Pilih --');
      }
      valueSpan.title = match ? match.textContent : (selectEl.value || '');
      trigger.disabled = selectEl.disabled;

      optionsList.querySelectorAll('.custom-select-option').forEach(item => {
        const isMatch = item.dataset.value === String(selectEl.value);
        item.classList.toggle('is-selected', isMatch);
        let check = item.querySelector('.custom-select-check');
        if (isMatch && !check) {
          const c = document.createElement('span');
          c.className = 'custom-select-check';
          c.textContent = '✓';
          item.appendChild(c);
        } else if (!isMatch && check) {
          check.remove();
        }
      });
    }

    selectEl._syncCustomSelect = syncState;
    selectEl._rebuildCustomSelect = rebuildOptions;

    // Observe changes to select's children (<option> additions/removals)
    const observer = new MutationObserver(() => {
      rebuildOptions();
      syncState();
    });
    observer.observe(selectEl, { childList: true, subtree: true });

    // Intercept property setter for .value so programmatic assignments sync trigger
    const valDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (valDescriptor && !selectEl._valueIntercepted) {
      selectEl._valueIntercepted = true;
      Object.defineProperty(selectEl, 'value', {
        get() {
          return valDescriptor.get.call(this);
        },
        set(v) {
          valDescriptor.set.call(this, v);
          syncState();
        }
      });
    }

    function openDropdown() {
      document.querySelectorAll('.custom-select-wrap.is-open').forEach(w => {
        if (w !== wrap) w.classList.remove('is-open');
      });
      syncState();
      wrap.classList.add('is-open');
    }

    function closeDropdown() {
      wrap.classList.remove('is-open');
    }

    function toggleDropdown() {
      if (wrap.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      toggleDropdown();
    });

    selectEl.addEventListener('change', () => {
      syncState();
    });

    // Hide native select visually but keep in DOM for forms
    selectEl.style.position = 'absolute';
    selectEl.style.opacity = '0';
    selectEl.style.pointerEvents = 'none';
    selectEl.style.width = '1px';
    selectEl.style.height = '1px';
    selectEl.style.overflow = 'hidden';
    selectEl.style.clip = 'rect(0 0 0 0)';
    selectEl.tabIndex = -1;

    // Insert into DOM
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);

    rebuildOptions();
  }

  // Global click-outside closer for custom selects
  document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select-wrap')) {
      document.querySelectorAll('.custom-select-wrap.is-open').forEach(w => w.classList.remove('is-open'));
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-select-wrap.is-open').forEach(w => w.classList.remove('is-open'));
    }
  });

  function initAllCustomSelects() {
    document.querySelectorAll('select.input, select').forEach(upgradeSelectToCustom);
  }

  async function loadAppConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.defaultWatermark) {
          state.defaultWatermark = cfg.defaultWatermark;
        }
        // Sync GPU render toggle checkbox dengan nilai dari config.json
        const gpuEnabled = !!cfg.enableGpuRender;
        const chk = document.getElementById('chkGpuRender');
        const row = document.getElementById('gpuRenderToggleRow');
        if (chk) chk.checked = gpuEnabled;
        if (row) row.classList.toggle('gpu-active', gpuEnabled);
      }
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    initAllCustomSelects();
    await loadAppConfig();
    await loadAssets();
    await loadProductsList();
    await loadVideos();
    await loadPublicBrowser();
    await loadGDriveLink();
    initSSE();
    initAllCustomSelects();

    const hash = window.location.hash.replace('#', '');
    if (['studio', 'subtitles', 'public'].includes(hash)) {
      switchTab(hash);
    }
  }

  init();
})();
