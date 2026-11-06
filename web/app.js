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
    btnRefreshProducts: $('btnRefreshProducts'),
    btnNewProduct: $('btnNewProduct'),
    btnDeleteProduct: $('btnDeleteProduct'),
    btnSaveProduct: $('btnSaveProduct'),
    chkUploadToProductFolder: $('chkUploadToProductFolder'),
    uploadSubText: $('uploadSubText'),
    inputProductName: $('inputProductName'),
    inputCustomOutputName: $('inputCustomOutputName'),
    selectProductVideo: $('selectProductVideo'),
    selectVoiceOver: $('selectVoiceOver'),
    labelVoiceOver: $('labelVoiceOver'),
    pillVoiceOverStatus: $('pillVoiceOverStatus'),
    btnTrimSilence: $('btnTrimSilence'),
    btnJumpToSubtitle: $('btnJumpToSubtitle'),
    selectBgmTrack: $('selectBgmTrack'),
    inputWatermark: $('inputWatermark'),
    selectWatermarkPosition: $('selectWatermarkPosition'),

    // Tiktok Caption & Batch Render Queue
    inputTiktokCaption: $('inputTiktokCaption'),
    btnAutoGenCaption: $('btnAutoGenCaption'),
    btnCopyTiktokCaption: $('btnCopyTiktokCaption'),
    btnOpenBatchModal: $('btnOpenBatchModal'),
    modalBatchRender: $('modalBatchRender'),
    btnCloseBatchModal: $('btnCloseBatchModal'),
    btnCancelBatchModal: $('btnCancelBatchModal'),
    btnBatchSelectAll: $('btnBatchSelectAll'),
    btnBatchSelectNone: $('btnBatchSelectNone'),
    batchProductList: $('batchProductList'),
    selectBatchVariants: $('selectBatchVariants'),
    selectBatchFps: $('selectBatchFps'),
    chkBatchUploadGdrive: $('chkBatchUploadGdrive'),
    batchQueueStatus: $('batchQueueStatus'),
    btnStartBatchRender: $('btnStartBatchRender'),

    // Variant Form
    variantSegmented: $('variantSegmented'),
    durationMatchPill: $('durationMatchPill'),
    selectThemeStyle: $('selectThemeStyle'),
    selectCardStyle: $('selectCardStyle'),
    selectPreset: $('selectPreset'),
    selectCaptionStyle: $('selectCaptionStyle'),
    designReasonBox: $('designReasonBox'),
    designReasonText: $('designReasonText'),
    selectBadgeStyle: $('selectBadgeStyle'),
    inputCtaLabel: $('inputCtaLabel'),
    inputUrgencyTag: $('inputUrgencyTag'),
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
      const pid = state.activeProductId ? encodeURIComponent(state.activeProductId) : '';
      const url = pid ? `/api/assets?productId=${pid}` : '/api/assets';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal memuat assets');
      const data = await res.json();
      state.assets = data;

      // Update Video selector
      el.selectProductVideo.innerHTML = '';
      if (data.videos.length === 0) {
        el.selectProductVideo.innerHTML = '<option value="">(Belum ada video di folder aset/public)</option>';
      } else {
        data.videos.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.name;
          const durText = v.durationSec ? ` [${v.durationSec}s]` : '';
          opt.textContent = `${v.displayName || v.name}${durText}`;
          el.selectProductVideo.appendChild(opt);
        });
      }

      // Update Voiceover selector
      el.selectVoiceOver.innerHTML = '';
      if (data.voiceOvers.length === 0) {
        el.selectVoiceOver.innerHTML = '<option value="">(Belum ada audio di folder aset/public)</option>';
      } else {
        data.voiceOvers.forEach(vo => {
          const opt = document.createElement('option');
          opt.value = vo.name;
          const status = vo.hasTranscript ? `(${vo.wordsCount} kata)` : '(belum ada json)';
          opt.textContent = `${vo.displayName || vo.name} ${status}`;
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
          opt.textContent = t.displayName || t.name;
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
            opt.textContent = bgm.displayName || bgm.name;
            el.selectBgmTrack.appendChild(opt);
          });
        }
        // Also list general audio files
        data.voiceOvers.forEach(vo => {
          if (!data.bgms?.some(b => b.name === vo.name)) {
            const opt = document.createElement('option');
            opt.value = vo.name;
            opt.textContent = vo.displayName || vo.name;
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

      // Prioritas pemilihan:
      // 1. state.activeProductId jika masih ada di list
      // 2. localStorage 'studio_active_product' jika valid
      // 3. Produk paling pertama (yang paling baru diubah/dibuat)
      const savedPid = localStorage.getItem('studio_active_product');
      let targetId = state.activeProductId;
      if (!targetId || !products.some(p => p.id === targetId)) {
        if (savedPid && products.some(p => p.id === savedPid)) {
          targetId = savedPid;
        } else {
          targetId = products[0].id;
        }
      }

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
      try { localStorage.setItem('studio_active_product', id); } catch (_) {}

      el.selectProduct.value = id;
      renderProductToForm(prod);
      appendLog(`[PRODUK] Berhasil memuat data: ${prod.name}`);

      // Refresh asset options to prioritize current product assets
      await loadAssets();
    } catch (err) {
      alert(err.message);
    }
  }

  function renderProductToForm(prod) {
    el.activeProductBreadcrumb.textContent = `${prod.name} · ID: ${prod.id}`;
    if (el.uploadSubText) {
      el.uploadSubText.innerHTML = `Tarik &amp; lepas file ke workspace: <code>public/products/${escapeHtml(prod.id)}/</code>`;
    }
    el.inputProductName.value = prod.name || '';
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
    if (el.selectPreset) el.selectPreset.value = v.preset || '';
    if (el.selectCaptionStyle) el.selectCaptionStyle.value = v.captionStyle || '';
    if (el.designReasonBox && el.designReasonText) {
      if (v.designReason) {
        el.designReasonText.textContent = v.designReason;
        el.designReasonBox.style.display = 'block';
      } else {
        el.designReasonBox.style.display = 'none';
      }
    }
    if (el.selectBadgeStyle) el.selectBadgeStyle.value = v.badgeStyle || '';

    // Update label Voice Over sesuai varian aktif
    if (el.labelVoiceOver) {
      el.labelVoiceOver.textContent = `Voice Over untuk ${variantKey.toUpperCase()} (${variantKey === 'v1' ? 'Variasi 1' : 'Variasi 2'})`;
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
    if (el.inputCtaLabel) el.inputCtaLabel.value = v.ctaLabel || '';
    if (el.inputUrgencyTag) el.inputUrgencyTag.value = v.urgencyTag || '';
    if (el.inputTiktokCaption) el.inputTiktokCaption.value = v.tiktokCaption || '';
    if (el.inputReferenceScript) el.inputReferenceScript.value = v.voiceOverScript || '';

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

  // Cermin dari src/presets.ts. Ubah di kedua tempat jika preset berubah.
  const DESIGN_PRESETS = {
    skincare: { themeStyle: 'pastel', cardStyle: 'quiet_serif', badgeStyle: 'marker', captionStyle: 'reveal' },
    gadget: { themeStyle: 'editorial', cardStyle: 'label_tape', badgeStyle: 'alert', captionStyle: 'outline_pop' },
    flash_sale: { themeStyle: 'flash_sale', cardStyle: 'receipt', badgeStyle: 'sticker', captionStyle: 'marker_sweep' },
    lifestyle: { themeStyle: 'minimal', cardStyle: 'type_stack', badgeStyle: 'sticker', captionStyle: 'outline_pop' },
    household: { themeStyle: 'minimal', cardStyle: 'sticky_note', badgeStyle: 'sticker', captionStyle: 'outline_pop' },
    parenting: { themeStyle: 'pastel', cardStyle: 'chat_thread', badgeStyle: 'glass', captionStyle: 'reveal' }
  };

  // ===========================================================================
  // PRATINJAU LANGSUNG
  // Gambar dirender oleh server memakai komposisi Remotion yang sama dengan render
  // akhir (endpoint /api/preview-live), jadi hook, subtitle, dan CTA yang terlihat
  // di sini identik dengan hasil video. Tidak ada lagi tiruan CSS yang bisa melenceng.
  // ===========================================================================
  const LIVE_FPS = 60;
  const LIVE_DEBOUNCE_MS = 700;
  const CAPTION_STYLES = [
    { id: 'outline_pop', label: 'Outline' },
    { id: 'marker_sweep', label: 'Stabilo' },
    { id: 'reveal', label: 'Reveal' },
    { id: 'plate', label: 'Pelat' }
  ];

  const live = {
    moment: 'hook',
    subtitleIndex: 0,
    auto: true,
    armed: false, // pratinjau otomatis baru aktif setelah pengguna mengubah sesuatu
    timer: null,
    busy: false,
    queued: false,
    cache: new Map(),
    words: [],
    wordsFor: ''
  };

  try {
    live.auto = localStorage.getItem('studio.livePreviewAuto') !== '0';
  } catch (_) { /* penyimpanan lokal tidak tersedia */ }

  const svgIcon = name => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function liveRefs() {
    return {
      root: $('livePreview'),
      stage: $('livePreviewStage'),
      img: $('livePreviewImg'),
      status: $('livePreviewStatus'),
      meta: $('livePreviewMeta'),
      moments: $('liveMoments'),
      auto: $('chkLiveAuto'),
      refresh: $('btnLiveRefresh'),
      subtitleBox: $('liveSubtitleControls'),
      slider: $('liveSubtitleSlider'),
      excerpt: $('liveSubtitleExcerpt'),
      captionBox: $('liveCaptionStyles')
    };
  }

  function activeCaptionStyle() {
    const picked = el.selectCaptionStyle?.value;
    if (picked) return picked;
    const preset = DESIGN_PRESETS[el.selectPreset?.value || ''];
    return preset?.captionStyle || 'outline_pop';
  }

  async function loadLiveWords() {
    const voName = el.selectVoiceOver?.value || '';
    const base = voName.replace(/\.[^/.]+$/, '');
    if (!base) { live.words = []; live.wordsFor = ''; return; }
    const hasJson = state.assets?.transcripts?.some(t => t.name === `${base}.json`);
    if (!hasJson) { live.words = []; live.wordsFor = base; return; }
    try {
      const res = await fetch(`/api/transcript?file=${encodeURIComponent(base + '.json')}`);
      const words = res.ok ? await res.json() : [];
      live.words = Array.isArray(words) ? words : [];
    } catch (_) {
      live.words = [];
    }
    live.wordsFor = base;
  }

  // Menentukan frame yang dirender untuk momen terpilih. Mengembalikan { frame, sec } atau { blocked }.
  async function planLiveFrame(v) {
    const clips = v.clips || [];
    const dur = i => Math.max(0, (clips[i]?.endSec || 0) - (clips[i]?.startSec || 0));
    const d = [0, 1, 2, 3].map(dur);
    const start = [0, d[0], d[0] + d[1], d[0] + d[1] + d[2]];
    const total = d.reduce((a, b) => a + b, 0);
    if (total <= 0) return { blocked: 'Durasi klip masih 0 detik. Isi waktu mulai dan selesai tiap babak.' };

    // Beri waktu animasi masuk selesai, tetapi tetap di dalam babaknya.
    const settle = (i, wanted) => start[i] + Math.min(Math.max(wanted, 0.3), Math.max(0.3, d[i] - 0.3));
    let sec;
    let note = '';

    if (live.moment === 'subtitle') {
      await loadLiveWords();
      if (!live.words.length) {
        return {
          blocked: 'Subtitle butuh transkrip voice over. Pilih voice over yang sudah punya transkrip, atau buat dulu di tab Koreksi Subtitle.'
        };
      }
      live.subtitleIndex = Math.min(Math.max(0, live.subtitleIndex), live.words.length - 1);
      const w = live.words[live.subtitleIndex];
      const delay = parseFloat(el.inputVoiceOverDelay?.value) || 0;
      sec = delay + (w.startMs + w.endMs) / 2000;
      if (sec >= total) {
        sec = total - 0.05;
        note = 'Kata ini jatuh setelah video berakhir, jadi frame terakhir yang ditampilkan.';
      }
    } else if (live.moment === 'demo') {
      sec = settle(1, 1.6);
    } else if (live.moment === 'spec') {
      sec = settle(2, 1.6);
    } else if (live.moment === 'cta') {
      sec = settle(3, 1.8);
    } else {
      sec = settle(0, Math.min(2.2, Math.max(1.2, d[0] * 0.55)));
    }

    sec = Math.min(Math.max(sec, 0), total - 1 / LIVE_FPS);
    return { frame: Math.round(sec * LIVE_FPS), sec, note };
  }

  function setLiveState(kind, message) {
    const r = liveRefs();
    if (!r.stage) return;
    r.stage.dataset.state = kind;
    if (r.status) r.status.textContent = message || '';
  }

  function renderLiveSide(plan) {
    const r = liveRefs();
    if (!r.root) return;

    r.moments?.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.moment === live.moment);
    });

    const isSub = live.moment === 'subtitle';
    if (r.subtitleBox) r.subtitleBox.hidden = !isSub;
    if (isSub && r.slider) {
      const n = live.words.length;
      r.slider.max = String(Math.max(0, n - 1));
      r.slider.value = String(live.subtitleIndex);
      r.slider.disabled = n === 0;
      if (r.excerpt) {
        const from = Math.max(0, live.subtitleIndex - 3);
        const to = Math.min(n, live.subtitleIndex + 4);
        r.excerpt.textContent = n
          ? live.words.slice(from, to).map(w => w.text).join(' ')
          : 'Belum ada transkrip.';
      }
    }

    const current = activeCaptionStyle();
    r.captionBox?.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.style === current);
    });

    if (r.meta && plan && plan.frame !== undefined) {
      const variant = (state.activeVariantKey || 'v1').toUpperCase();
      r.meta.textContent = `${variant} · detik ${plan.sec.toFixed(1)} · frame ${plan.frame}` + (plan.note ? ` · ${plan.note}` : '');
    }
  }

  function scheduleLivePreview(delay) {
    const r = liveRefs();
    if (!r.root || !state.currentProduct) return;
    clearTimeout(live.timer);
    const hasImage = !!r.img?.getAttribute('src');
    if (!live.armed) { setLiveState(hasImage ? 'stale' : 'idle', hasImage ? 'Perubahan belum dirender' : 'Tekan Segarkan untuk melihat frame pertama.'); return; }
    if (!live.auto) { setLiveState(hasImage ? 'stale' : 'idle', 'Perubahan belum dirender. Tekan Segarkan.'); return; }
    live.timer = setTimeout(runLivePreview, delay === undefined ? LIVE_DEBOUNCE_MS : delay);
  }

  async function runLivePreview() {
    const r = liveRefs();
    if (!r.root || !state.currentProduct) return;
    if (live.busy) { live.queued = true; return; }

    syncFormToVariant();
    const variantKey = state.activeVariantKey || 'v1';
    const v = state.currentProduct.variants?.[variantKey];
    if (!v) return;

    const plan = await planLiveFrame(v);
    renderLiveSide(plan);
    if (plan.blocked) { setLiveState('blocked', plan.blocked); return; }

    const payload = { productData: state.currentProduct, variantKey, frame: plan.frame };
    const key = JSON.stringify(payload);

    if (live.cache.has(key)) {
      r.img.src = live.cache.get(key);
      setLiveState('ready', '');
      return;
    }

    live.busy = true;
    setLiveState(r.img.getAttribute('src') ? 'loading-stale' : 'loading', 'Merender frame...');
    try {
      const res = await fetch('/api/preview-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: key
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal merender pratinjau.');
      live.cache.set(key, data.previewUrl);
      while (live.cache.size > 12) live.cache.delete(live.cache.keys().next().value);
      r.img.src = data.previewUrl;
      setLiveState('ready', '');
    } catch (err) {
      setLiveState('error', err.message);
    } finally {
      live.busy = false;
      if (live.queued) { live.queued = false; scheduleLivePreview(0); }
    }
  }

  // Dipanggil dari banyak tempat (input, preset, klip). Namanya dipertahankan.
  function updateThemeVisualPreview() {
    scheduleLivePreview();
  }

  function initLivePreview() {
    const r = liveRefs();
    if (!r.root) return;

    // Pratinjau otomatis hanya jalan setelah ada perubahan dari pengguna (bukan saat halaman dimuat).
    const arm = e => { if (!e || e.isTrusted) live.armed = true; };
    document.addEventListener('input', arm, true);
    document.addEventListener('change', arm, true);

    r.moments?.addEventListener('click', e => {
      const b = e.target.closest('button[data-moment]');
      if (!b) return;
      live.moment = b.dataset.moment;
      live.armed = true;
      scheduleLivePreview(0);
    });

    if (r.auto) {
      r.auto.checked = live.auto;
      r.auto.addEventListener('change', () => {
        live.auto = r.auto.checked;
        try { localStorage.setItem('studio.livePreviewAuto', live.auto ? '1' : '0'); } catch (_) { /* abaikan */ }
        if (live.auto) { live.armed = true; scheduleLivePreview(0); }
      });
    }

    r.refresh?.addEventListener('click', () => {
      live.armed = true;
      clearTimeout(live.timer);
      runLivePreview();
    });

    r.slider?.addEventListener('input', () => {
      live.subtitleIndex = parseInt(r.slider.value, 10) || 0;
      live.armed = true;
      renderLiveSide();
      scheduleLivePreview();
    });

    if (r.captionBox) {
      r.captionBox.innerHTML = CAPTION_STYLES
        .map(s => `<button type="button" data-style="${s.id}">${s.label}</button>`)
        .join('');
      r.captionBox.addEventListener('click', e => {
        const b = e.target.closest('button[data-style]');
        if (!b || !el.selectCaptionStyle) return;
        el.selectCaptionStyle.value = b.dataset.style;
        if (el.selectPreset) el.selectPreset.value = '';
        live.armed = true;
        syncFormToVariant();
        triggerAutoSave();
        renderLiveSide();
        scheduleLivePreview(0);
      });
    }

    // Setelah voice over diganti, daftar kata subtitle ikut berganti.
    el.selectVoiceOver?.addEventListener('change', () => { live.subtitleIndex = 0; });
    renderLiveSide();
  }

  // ===========================================================================
  // BANK HOOK & CTA
  // Daftar ini sengaja berupa data biasa supaya mudah Anda ubah. Tidak ada API yang
  // memberi daftar "sedang tren" secara langsung, jadi isinya dikurasi dari pola yang
  // lazim dipakai kreator affiliate Indonesia ditambah momen belanja musiman.
  // Teks dengan tanda [kurung siku] adalah placeholder: ganti dengan data asli sebelum render.
  // Isi klaim angka, rating, promo, dan stok hanya bila memang benar (kebijakan iklan TikTok).
  // ===========================================================================
  const HOOK_BANK = [
    {
      id: 'musiman',
      label: 'Musiman',
      hint: 'Puncak belanja akhir tahun: 11.11 dan Harbolnas 12.12. Cek jadwal & nama kampanye resmi sebelum memakai.',
      items: [
        { badge: 'PROMO GUNCANG 11.11', line1: 'Mumpung tanggal kembar lagi jalan...', highlight: 'Cek harga terbaiknya sekarang!' },
        { badge: 'HARBOLNAS 12.12', line1: 'Nunggu 12.12 buat checkout?', highlight: 'Masukin keranjang dari sekarang!' },
        { badge: 'GAJIAN SALE', line1: 'Gajian udah masuk, belanja apa?', highlight: 'Ini yang layak masuk keranjang!' },
        { badge: 'TANGGAL KEMBAR', line1: 'Diskon tanggal kembar jangan dilewat', highlight: 'Bandingkan dulu sebelum checkout!' }
      ]
    },
    {
      id: 'racun',
      label: 'Racun & spill',
      hint: 'Gaya "spill" ala kreator: jujur, personal, terdengar seperti rekomendasi teman.',
      items: [
        { badge: 'SPILL RACUN TIKTOK', line1: 'Racun TikTok yang beneran kepake', highlight: 'Bukan cuma lucu di FYP doang!' },
        { badge: 'WAJIB PUNYA', line1: 'Barang kecil tapi dipakai tiap hari', highlight: 'Ini yang bikin hidup lebih gampang!' },
        { badge: 'UDAH COBA SENDIRI', line1: 'Udah aku pakai sampai habis...', highlight: 'Ini hasil jujurnya!' },
        { badge: 'MASUK KERANJANG', line1: 'Satu-satunya racun yang gak nyesel', highlight: 'Ternyata sebagus ini!' }
      ]
    },
    {
      id: 'penasaran',
      label: 'Penasaran',
      hint: 'Memancing rasa penasaran lewat larangan atau penyesalan.',
      items: [
        { badge: 'JANGAN CHECKOUT DULU', line1: 'Sebelum beli yang lain, tonton ini', highlight: 'Biar gak salah pilih!' },
        { badge: 'NYESEL BARU TAHU', line1: 'Nyesel baru tahu ada yang gini...', highlight: 'Padahal murah dan gampang dicari!' },
        { badge: 'RAHASIA YANG JARANG DIBAGI', line1: 'Ini alasan kenapa punya dia awet', highlight: 'Ternyata caranya segampang ini!' },
        { badge: 'KENAPA GAK DARI DULU', line1: 'Kenapa baru nemu yang ini sekarang?', highlight: 'Masalah kelar dalam sekali pakai!' }
      ]
    },
    {
      id: 'audiens',
      label: 'Sebut audiens',
      hint: 'Menyapa langsung orang yang paling butuh produknya.',
      items: [
        { badge: 'IBU-IBU WAJIB TAU', line1: 'Ibu-ibu, jangan scroll dulu...', highlight: 'Ini yang dicari tiap hari!' },
        { badge: 'ANAK KOS SIMPAN INI', line1: 'Anak kos yang hemat tapi mau praktis', highlight: 'Simpan video ini sekarang!' },
        { badge: 'BUAT KAMU YANG SIBUK', line1: 'Kerja seharian, kulit ikut capek?', highlight: 'Rawatnya gak perlu ribet!' },
        { badge: 'BUMIL & BUSUI', line1: 'Lagi cari vitamin bumil busui?', highlight: 'Cek komposisinya dulu, Bun!' }
      ]
    },
    {
      id: 'masalah',
      label: 'Masalah & solusi',
      hint: 'Mulai dari keluhan yang relatable, lalu tawarkan solusi. Ganti topik sesuai produk.',
      items: [
        { badge: 'MASALAH SEJUTA UMAT', line1: 'Wajah kusam dan gampang berminyak?', highlight: 'Coba rutinitas sederhana ini!' },
        { badge: 'LEMARI BAU APEK', line1: 'Lemari bau apek tiap dibuka?', highlight: 'Ini cara bebas apek seharian!' },
        { badge: 'DAPUR ANTI BERANTAKAN', line1: 'Dapur cepat berantakan lagi?', highlight: 'Rapi tanpa beli rak mahal!' },
        { badge: 'BUKAN CUMA KAMU', line1: 'Capek bersihin yang itu-itu lagi?', highlight: 'Ternyata ada cara lebih cepat!' }
      ]
    },
    {
      id: 'relatable',
      label: 'POV & cerita',
      hint: 'Format POV dan cerita pendek yang terasa natural di FYP.',
      items: [
        { badge: 'POV KAMU NEMU INI', line1: 'POV: akhirnya nemu yang cocok', highlight: 'Gak perlu ganti-ganti lagi!' },
        { badge: 'CERITA SINGKAT', line1: 'Dulu aku skeptis sama yang beginian', highlight: 'Sekarang malah repurchase!' },
        { badge: 'SALAH PILIH SELAMA INI', line1: 'Ternyata selama ini aku salah pilih', highlight: 'Bedanya kerasa banget!' },
        { badge: 'HASIL SEMINGGU', line1: 'Seminggu pakai, ini yang berubah', highlight: 'Lihat sendiri hasilnya!' }
      ]
    },
    {
      id: 'bukti',
      label: 'Bukti & angka',
      hint: 'Berisi placeholder [angka]. Ganti dengan data asli dari halaman produk sebelum render.',
      items: [
        { badge: 'TERJUAL [ANGKA]+ PCS', line1: 'Udah terjual [angka]+ pcs, kenapa?', highlight: 'Ini alasan dia laris!' },
        { badge: 'RATING [X.X] DI TIKTOK SHOP', line1: 'Rating [x.x] bukan kebetulan', highlight: 'Cek review pembelinya!' },
        { badge: 'PALING BANYAK DICARI', line1: 'Paling banyak dicari di kategorinya', highlight: 'Ini bedanya sama yang lain!' },
        { badge: 'HEMAT [PERSEN]%', line1: 'Beli ini lebih hemat dari biasanya', highlight: 'Cek selisih harganya sekarang!' }
      ]
    }
  ];

  const CTA_BANK = [
    {
      id: 'keranjang',
      label: 'Keranjang kuning',
      items: [
        { text: 'Cek Promo di Keranjang Kuning' },
        { text: 'Klik Keranjang Kuning di Kiri Bawah' },
        { text: 'Ambil di Keranjang Kuning Sekarang' },
        { text: 'Linknya Ada di Keranjang Kuning' },
        { text: 'Cek Harga Terbaru di Keranjang' }
      ]
    },
    {
      id: 'voucher',
      label: 'Voucher & ongkir',
      items: [
        { text: 'Cek Voucher Sebelum Checkout', label: 'VOUCHER TERSEDIA' },
        { text: 'Klaim Voucher Ongkir Dulu', label: 'CEK SYARAT VOUCHER' },
        { text: 'Pakai Voucher Biar Makin Hemat' },
        { text: 'Bandingkan Harga Setelah Voucher' }
      ]
    },
    {
      id: 'musiman',
      label: 'Musiman',
      items: [
        { text: 'Cek Promo Guncang 11.11', label: 'PROMO 11.11' },
        { text: 'Siapkan di Keranjang Buat 12.12', label: 'HARBOLNAS 12.12' },
        { text: 'Gajian Sale, Cek Keranjang Kuning', label: 'GAJIAN SALE' },
        { text: 'Masukin Keranjang Sebelum Lupa' }
      ]
    },
    {
      id: 'urgensi',
      label: 'Urgensi (hanya jika benar)',
      items: [
        { text: 'Mumpung Promo Masih Jalan' },
        { text: 'Cek Dulu Sebelum Promo Berakhir' },
        { text: 'Stok Bisa Berubah, Cek Sekarang' },
        { text: 'Harga Bisa Naik, Cek Hari Ini' }
      ]
    },
    {
      id: 'lembut',
      label: 'Ajakan lembut',
      items: [
        { text: 'Simpan Dulu, Checkout Nanti' },
        { text: 'Share ke Teman yang Butuh Ini' },
        { text: 'Komen Kalau Mau Review Lanjutan' },
        { text: 'Cek Review Pembeli di Keranjang' }
      ]
    },
    {
      id: 'loop',
      label: 'Nyambung ke hook',
      items: [
        { text: 'Tonton Lagi dari Awal, Biar Paham' },
        { text: 'Balik ke Awal, Ada yang Terlewat' },
        { text: 'Sekarang Kamu Tahu, Tinggal Cek' }
      ]
    }
  ];

  const CTA_LABELS = [
    'PROMO 11.11', 'HARBOLNAS 12.12', 'GAJIAN SALE', 'VOUCHER TERSEDIA',
    'CEK HARGA TERBARU', 'REVIEW LENGKAP'
  ];

  const bank = { hookGroup: 'musiman', hookMode: 'paket', ctaGroup: 'keranjang' };

  function fillInput(input, value) {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Jika teks memuat placeholder [..], pilih bagian itu agar langsung diganti.
  function selectPlaceholder(input) {
    if (!input) return false;
    const m = /\[[^\]]+\]/.exec(input.value);
    if (!m) return false;
    input.focus();
    input.setSelectionRange(m.index, m.index + m[0].length);
    return true;
  }

  function renderBankTabs(container, groups, activeId, onPick) {
    container.innerHTML = '';
    groups.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = g.label;
      b.dataset.group = g.id;
      b.classList.toggle('active', g.id === activeId);
      b.addEventListener('click', () => onPick(g.id));
      container.appendChild(b);
    });
  }

  function renderHookBank() {
    const tabs = $('hookBankTabs');
    const list = $('hookBankList');
    const hint = $('hookBankHint');
    if (!tabs || !list) return;

    renderBankTabs(tabs, HOOK_BANK, bank.hookGroup, id => { bank.hookGroup = id; renderHookBank(); });
    $('hookBankMode')?.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === bank.hookMode);
    });

    const group = HOOK_BANK.find(g => g.id === bank.hookGroup) || HOOK_BANK[0];
    if (hint) hint.textContent = group.hint || '';
    list.innerHTML = '';
    list.dataset.mode = bank.hookMode;

    group.items.forEach(item => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bank-item';
      const needsData = `${item.badge} ${item.line1} ${item.highlight}`.includes('[');

      const main = document.createElement('span');
      main.className = 'bank-item-main';
      main.textContent = bank.hookMode === 'badge' ? item.badge : item.line1;
      b.appendChild(main);

      if (bank.hookMode !== 'badge') {
        const sub = document.createElement('span');
        sub.className = 'bank-item-sub';
        sub.textContent = item.highlight;
        b.appendChild(sub);
        const tag = document.createElement('span');
        tag.className = 'bank-item-tag';
        tag.textContent = item.badge;
        b.appendChild(tag);
      }
      if (needsData) {
        const warn = document.createElement('span');
        warn.className = 'bank-item-warn';
        warn.textContent = 'isi data asli';
        b.appendChild(warn);
      }

      b.addEventListener('click', () => {
        live.armed = true;
        fillInput(el.inputBadgeText, item.badge);
        if (bank.hookMode !== 'badge') {
          fillInput(el.inputHookLine1, item.line1);
          fillInput(el.inputHookHighlight, item.highlight);
        }
        const focused = [el.inputBadgeText, el.inputHookLine1, el.inputHookHighlight].some(selectPlaceholder);
        showToast({
          type: needsData ? 'info' : 'success',
          title: needsData ? 'Ganti placeholder dulu' : 'Hook diterapkan',
          message: needsData
            ? 'Teks dalam [kurung siku] harus diganti dengan data asli produk sebelum render.'
            : (bank.hookMode === 'badge' ? `Badge: ${item.badge}` : 'Badge, baris 1, dan highlight terisi.'),
          duration: needsData ? 4500 : 2200
        });
        if (!focused) updateCharCounters();
      });
      list.appendChild(b);
    });
  }

  function renderCtaBank() {
    const tabs = $('ctaBankTabs');
    const list = $('ctaBankList');
    if (!tabs || !list) return;

    renderBankTabs(tabs, CTA_BANK, bank.ctaGroup, id => { bank.ctaGroup = id; renderCtaBank(); });
    const group = CTA_BANK.find(g => g.id === bank.ctaGroup) || CTA_BANK[0];
    list.innerHTML = '';
    group.items.forEach(item => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bank-item compact';
      const main = document.createElement('span');
      main.className = 'bank-item-main';
      main.textContent = item.text;
      b.appendChild(main);
      if (item.label) {
        const tag = document.createElement('span');
        tag.className = 'bank-item-tag';
        tag.textContent = item.label;
        b.appendChild(tag);
      }
      b.addEventListener('click', () => {
        live.armed = true;
        fillInput(el.inputCtaText, item.text);
        if (item.label) fillInput(el.inputCtaLabel, item.label);
        if (group.id === 'urgensi') {
          showToast({ type: 'info', title: 'Pastikan klaimnya benar', message: 'Klaim promo atau stok yang palsu bisa melanggar kebijakan iklan TikTok.', duration: 4000 });
        }
      });
      list.appendChild(b);
    });

    const labels = $('ctaLabelChips');
    if (labels && !labels.childElementCount) {
      CTA_LABELS.forEach(text => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bank-chip';
        b.textContent = text;
        b.addEventListener('click', () => { live.armed = true; fillInput(el.inputCtaLabel, text); });
        labels.appendChild(b);
      });
      const none = document.createElement('button');
      none.type = 'button';
      none.className = 'bank-chip muted';
      none.textContent = 'Tanpa label';
      none.addEventListener('click', () => { live.armed = true; fillInput(el.inputCtaLabel, ''); });
      labels.appendChild(none);
    }
  }

  function updateCtaCounter() {
    const c = $('countCtaText');
    if (!c || !el.inputCtaText) return;
    const len = (el.inputCtaText.value || '').length;
    c.textContent = `${len}/34`;
    c.classList.toggle('warning', len > 30 && len <= 34);
    c.classList.toggle('danger', len > 34);
  }

  function initBanks() {
    renderHookBank();
    renderCtaBank();
    $('hookBankMode')?.addEventListener('click', e => {
      const b = e.target.closest('button[data-mode]');
      if (!b) return;
      bank.hookMode = b.dataset.mode;
      renderHookBank();
    });
    el.inputCtaText?.addEventListener('input', updateCtaCounter);
    updateCtaCounter();
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
      el.pillVoiceOverStatus.textContent = `Transkrip tersedia (${count} kata) · Klik untuk edit`;
      el.pillVoiceOverStatus.className = 'pill emerald';
    } else {
      el.pillVoiceOverStatus.textContent = `Transkrip belum dibuat · klik untuk membuat`;
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
    // Field opsional: dihapus dari JSON jika kosong agar tidak muncul di video.
    const setOptional = (key, value) => {
      const val = (value || '').trim();
      if (val) v[key] = val; else delete v[key];
    };
    setOptional('preset', el.selectPreset?.value);
    setOptional('captionStyle', el.selectCaptionStyle?.value);
    setOptional('badgeStyle', el.selectBadgeStyle?.value);
    setOptional('ctaLabel', el.inputCtaLabel?.value);
    setOptional('urgencyTag', el.inputUrgencyTag?.value);
    setOptional('tiktokCaption', el.inputTiktokCaption?.value);
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

  // Debounced Auto-save: Menyimpan perubahan otomatis ke JSON produk agar saat refresh data tidak hilang
  let autoSaveTimeout = null;
  function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      syncFormToVariant();
      if (state.activeProductId && state.currentProduct) {
        fetch(`/api/products/${state.activeProductId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.currentProduct)
        }).catch(err => console.warn('Auto-save error:', err.message));
      }
    }, 400);
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
      title: 'Beralih ke editor subtitle',
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
      title: `Pratinjau babak ${clipIdx + 1}`,
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
        title: `Babak ${clipIdx + 1} ditampilkan`,
        message: `Frame berhasil dimuat di layar HP sebelah kanan.`,
        duration: 4000
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Gagal merender frame', message: err.message, duration: 5000 });
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
        el.btnToggleSafeArea.innerHTML = `${svgIcon('eye')} Safe area <strong>aktif</strong>`;
        showToast({
          type: 'info',
          title: 'Safe area TikTok aktif',
          message: 'Zona aman teks & elemen UI TikTok (Like, Profil, Keranjang Kuning) ditampilkan.',
          duration: 3000
        });
      } else {
        el.btnToggleSafeArea.innerHTML = `${svgIcon('eye')} Safe area TikTok`;
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
        el.btnToggleLoop.innerHTML = `${svgIcon('repeat')} Loop aktif`;
      } else {
        el.btnToggleLoop.innerHTML = `${svgIcon('arrow-right')} Sekali putar`;
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

  const autoSyncInputs = [
    el.inputBadgeText,
    el.inputHookLine1,
    el.inputHookHighlight,
    el.inputDemoLine1,
    el.inputDemoHighlight,
    el.inputSpecLine1,
    el.inputSpecHighlight,
    el.inputCtaText,
    el.inputCtaLabel,
    el.inputUrgencyTag,
  ];

  autoSyncInputs.forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => {
        syncFormToVariant();
        updateThemeVisualPreview();
        triggerAutoSave();
      });
    }
  });

  // Mengubah tema / tata letak manual berarti keluar dari preset (menjadi "Kustom").
  el.selectThemeStyle?.addEventListener('change', () => {
    if (el.selectPreset) el.selectPreset.value = '';
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  el.selectCardStyle?.addEventListener('change', () => {
    if (el.selectPreset) el.selectPreset.value = '';
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  el.selectPreset?.addEventListener('change', () => {
    const preset = DESIGN_PRESETS[el.selectPreset.value];
    if (preset) {
      el.selectThemeStyle.value = preset.themeStyle;
      el.selectCardStyle.value = preset.cardStyle;
      if (el.selectBadgeStyle) el.selectBadgeStyle.value = preset.badgeStyle;
      if (el.selectCaptionStyle) el.selectCaptionStyle.value = preset.captionStyle || '';
    }
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  el.selectCaptionStyle?.addEventListener('change', () => {
    if (el.selectPreset) el.selectPreset.value = '';
    syncFormToVariant();
    updateThemeVisualPreview();
    triggerAutoSave();
  });

  el.selectBadgeStyle?.addEventListener('change', () => {
    syncFormToVariant();
    updateThemeVisualPreview();
  });

  [el.inputCtaLabel, el.inputUrgencyTag].forEach(inp => {
    if (inp) inp.addEventListener('input', updateThemeVisualPreview);
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

  // Refresh Products List
  el.btnRefreshProducts?.addEventListener('click', async () => {
    appendLog('[PRODUK] Memperbarui daftar produk dari folder products/...');
    await loadProductsList();
    showToast({ type: 'success', title: 'Daftar Produk Diperbarui', message: `${state.products?.length || 0} produk ditemukan.` });
  });

  // Delete Product Action
  el.btnDeleteProduct?.addEventListener('click', async () => {
    if (!state.activeProductId || !state.currentProduct) {
      alert('Pilih produk yang ingin dihapus terlebih dahulu.');
      return;
    }
    const pid = state.activeProductId;
    const pname = state.currentProduct.name || pid;
    const confirmed = await showConfirmDialog({
      title: 'Hapus Produk',
      message: `Apakah Anda yakin ingin menghapus produk <strong>"${escapeHtml(pname)}"</strong> (<code>${pid}.json</code>)?`,
      subtext: 'File JSON produk akan dihapus. Aset di folder public/products/' + pid + ' juga dapat dibersihkan.',
      confirmText: 'Ya, Hapus Produk',
      cancelText: 'Batal',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(pid)}?deleteAssets=true`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus produk');

      appendLog(`[PRODUK] Berhasil menghapus produk ${pname} (${pid})`, true);
      showToast({ type: 'success', title: 'Produk Dihapus', message: `Produk "${pname}" berhasil dihapus.` });

      state.activeProductId = null;
      state.currentProduct = null;
      try { localStorage.removeItem('studio_active_product'); } catch (_) {}
      await loadProductsList();
    } catch (err) {
      alert('Gagal menghapus produk: ' + err.message);
    }
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
          badgeStyle: 'sticker',
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
          badgeStyle: 'alert',
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
        el.importFeedback.innerHTML = `<strong>JSON valid.</strong> Produk: <code>${parsed.name}</code> (${Object.keys(parsed.variants || {}).join(', ')}). Klik "Terapkan ke Studio" untuk memuat teks dan klip.`;
        el.btnApplyImportedJson.disabled = false;
      } else {
        el.importFeedback.className = 'feedback-banner error';
        el.importFeedback.innerHTML = `<strong>JSON bermasalah:</strong><ul style="margin: 4px 0 0 16px;">${(data.errors || []).map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
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
    const safePid = (candidate.id || candidate.name || 'imported').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    candidate.id = safePid;
    state.activeProductId = safePid;

    renderProductToForm(candidate);
    el.modalImportGemini.style.display = 'none';

    // Otomatis simpan ke products/<id>.json agar langsung muncul permanen di daftar dropdown
    fetch(`/api/products/${safePid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate)
    }).then(res => res.json()).then(async () => {
      appendLog(`[IMPORT] JSON disimpan permanen ke products/${safePid}.json`, true);
      await loadProductsList();
      el.selectProduct.value = safePid;
      try { localStorage.setItem('studio_active_product', safePid); } catch (_) {}
    }).catch(err => {
      console.warn('Gagal menyimpan otomatis produk baru:', err);
    });

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
      info: svgIcon('info'),
      success: svgIcon('check'),
      warn: svgIcon('alert'),
      error: svgIcon('x'),
      upload: svgIcon('upload')
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
            <div class="toast-progress-fill" style="height: 100%; width: 0%; border-radius: 999px; background: var(--signal); transition: width 150ms ease;"></div>
          </div>
        </div>
      `;
    }

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || svgIcon('info')}</div>
      <div class="toast-content" style="flex: 1;">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
        ${progressHtml}
        ${actionBtnHtml}
      </div>
      <button class="toast-close" title="Tutup">${svgIcon('x')}</button>
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
        el.stillModalStatusPill.textContent = 'Merender Frame';
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
        if (el.btnRefreshStillIcon) el.btnRefreshStillIcon.innerHTML = svgIcon('frame');
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
      title: 'Merender frame video',
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
        el.stillModalStatusPill.textContent = 'Selesai';
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
        title: 'Pratinjau frame siap',
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
        el.stillModalStatusPill.textContent = 'Gagal';
        el.stillModalStatusPill.className = 'pill rose';
      }
      if (el.stillLoadingText) el.stillLoadingText.style.display = 'none';
      if (el.stillEmptyPlaceholder) el.stillEmptyPlaceholder.style.display = 'block';

      if (el.stillFeedbackBanner) {
        el.stillFeedbackBanner.style.display = 'block';
        el.stillFeedbackBanner.className = 'feedback-banner error';
        el.stillFeedbackBanner.innerHTML = `<strong>Gagal merender frame:</strong> ${escapeHtml(err.message)}`;
      }

      if (activeStillToast) removeToast(activeStillToast);
      activeStillToast = showToast({
        type: 'error',
        title: 'Gagal merender frame',
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
          el.pillGDriveStatus.textContent = 'Webhook Aktif';
          el.pillGDriveStatus.className = 'pill emerald';
        } else {
          el.pillGDriveStatus.textContent = 'Webhook Belum Diisi';
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
          title: 'Pengaturan tersimpan',
          message: 'Konfigurasi Google Drive & Webhook berhasil disimpan!'
        });
        if (el.pillGDriveStatus) {
          el.pillGDriveStatus.textContent = currentWebhookUrl ? 'Webhook Aktif' : 'Webhook Belum Diisi';
          el.pillGDriveStatus.className = currentWebhookUrl ? 'pill emerald' : 'pill rose';
        }
        if (el.gdriveSaveFeedback) {
          el.gdriveSaveFeedback.className = 'feedback-banner success';
          el.gdriveSaveFeedback.style.display = 'block';
          el.gdriveSaveFeedback.textContent = 'Pengaturan Google Drive berhasil disimpan.';
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
          title: 'File disorot di laptop',
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
        if (statusEl) statusEl.textContent = 'Video berhasil tersimpan di Google Drive.';
        if (sizeEl) sizeEl.textContent = '100% Selesai';
        if (actionsEl) actionsEl.style.display = 'flex';
        if (viewBtnEl && data.url) viewBtnEl.href = data.url;
      } else if (data.step === 'error') {
        if (pulseEl) pulseEl.style.background = '#f43f5e';
        if (fillEl) fillEl.style.background = '#f43f5e';
        if (statusEl) statusEl.textContent = `Gagal: ${message}`;
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
        title: 'Upload berhasil',
        message: `Video '${filename}' berhasil tersimpan di Google Drive!`,
        duration: 9000,
        actionLabel: 'Buka video',
        onAction: () => {
          if (data.url) window.open(data.url, '_blank');
        }
      });

      rowButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = `${svgIcon('check')} Selesai`;
        btn.style.color = '#10b981';
      });

      if (el.btnUploadToGDrive) {
        el.btnUploadToGDrive.disabled = false;
        el.btnUploadToGDrive.innerHTML = `${svgIcon('upload')} Upload ke Drive`;
      }
    } else if (data.step === 'error') {
      if (activeUploadToast) {
        removeToast(activeUploadToast);
        activeUploadToast = null;
      }
      showToast({
        type: 'error',
        title: 'Gagal upload ke Drive',
        message: message,
        duration: 8000
      });

      rowButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = `${svgIcon('upload')} Upload`;
        btn.style.color = '#34d399';
      });

      if (el.btnUploadToGDrive) {
        el.btnUploadToGDrive.disabled = false;
        el.btnUploadToGDrive.innerHTML = `${svgIcon('upload')} Upload ke Drive`;
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
      title: 'Mengunggah ke Google Drive...',
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
      const uploadToProduct = el.chkUploadToProductFolder ? el.chkUploadToProductFolder.checked : true;
      const pidParam = (uploadToProduct && state.activeProductId) ? `&productId=${encodeURIComponent(state.activeProductId)}` : '';
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}${pidParam}`, {
        method: 'POST',
        body: file
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah');

      el.uploadStatusBox.className = 'feedback-banner success';
      el.uploadStatusBox.innerHTML = `Berhasil mengunggah <strong>public/${data.filename}</strong> (${data.sizeMB} MB).`;
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
              Gabung ke bawah
            </button>
            <button class="btn small btn-split-word" data-index="${idx}" title="Pisahkan menjadi 2 kata">
              Pisah
            </button>
            <button class="btn small danger btn-delete-word" data-index="${idx}" title="Hapus kata ini" aria-label="Hapus kata">
              ${svgIcon('x')}
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
      el.btnSaveSubtitles.textContent = 'Simpan perubahan subtitle';
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
      el.autoCorrectFeedback.innerHTML = `<strong>Auto-correct berhasil:</strong> ${st.correctedCount || 0} kata dikoreksi (${st.mergedCount || 0} kata digabung, ${st.splitCount || 0} dipisah) dengan timing suara tetap presisi!`;

      appendLog(`[AUTO-CORRECT] Berhasil menyelaraskan ${data.words.length} kata pada ${state.activeTranscriptFile} berdasarkan naskah narasi Gemini`, true);
    } catch (err) {
      alert('Error auto-correct: ' + err.message);
    } finally {
      el.btnAutoCorrectSubtitles.disabled = false;
      el.btnAutoCorrectSubtitles.textContent = 'Auto-correct subtitle via naskah';
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
        el.renderStatusPill.textContent = 'Merender';
        el.renderStatusPill.className = 'pill amber';

        if (el.headerProgressStrip) {
          el.headerProgressStrip.style.display = 'block';
          if (el.headerProgressFill) el.headerProgressFill.style.width = '4%';
        }

        const labelTarget = target === 'all'
          ? 'Semua Variasi (v1 & v2)'
          : (target === 'v2' ? 'Hanya Variasi 2 (Bold)' : 'Hanya Variasi 1 (Pastel)');
        const engineLabel = useGpu ? 'GPU AMD Radeon' : 'CPU';
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
        el.renderStatusPill.textContent = 'Gagal';
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
        el.renderStatusPill.textContent = 'Siap';
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
        el.renderStatusPill.textContent = `Merender ${Math.round(pct)}%`;
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
        el.renderStatusPill.textContent = 'Dibatalkan';
        el.renderStatusPill.className = 'pill neutral';
        appendLog('[CANCEL] Render dibatalkan oleh pengguna.');
      } else if (data.code === 0) {
        el.renderStatusPill.textContent = 'Selesai';
        el.renderStatusPill.className = 'pill emerald';
        el.progressBarFill.style.width = '100%';
        appendLog('[FINISH] Render selesai sempurna! Video siap diputar di galeri.', true);
        loadVideos();

        const firstOut = data.outputs?.[0];
        showToast({
          type: 'success',
          title: 'Render selesai',
          message: 'Video siap! Klik tombol untuk langsung upload ke Google Drive.',
          duration: 10000,
          actionLabel: 'Upload ke Drive',
          onAction: () => {
            if (firstOut) uploadVideoToGDrive(firstOut);
            else openGDriveFolderInBrowser();
          }
        });
      } else {
        el.renderStatusPill.textContent = 'Gagal';
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
              <div style="margin-bottom: 8px; color: var(--text-faint);">${svgIcon('frame')}</div>
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
                  <button class="btn small btn-upload-gdrive-row" data-video="${escapeHtml(v.name)}" title="Unggah video ini langsung ke Google Drive">${svgIcon('upload')} Upload</button>
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
                <span style="color: var(--signal); margin-right: 6px;">${svgIcon('volume')}</span>
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
          checkSpan.innerHTML = svgIcon('check');
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
        valueSpan.textContent = match.textContent;
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
          c.innerHTML = svgIcon('check');
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
  // Fitur 3: Auto-Cut Jeda Napas (Silence Remover via FFmpeg)
  // -------------------------------------------------------------
  el.btnTrimSilence?.addEventListener('click', async () => {
    const filename = el.selectVoiceOver?.value;
    if (!filename) {
      alert('Pilih file audio Voice Over terlebih dahulu.');
      return;
    }
    const origText = el.btnTrimSilence.textContent;
    el.btnTrimSilence.disabled = true;
    el.btnTrimSilence.textContent = '⏳ Memotong jeda...';

    try {
      const res = await fetch('/api/trim-silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memotong jeda napas');

      await loadAssets();
      showToast({
        type: 'success',
        title: 'Jeda Napas Dipangkas!',
        message: `Durasi: ${data.oldDuration}s → ${data.newDuration}s (hemat ${data.savedSec}s).`,
      });

      const okRetranscribe = await showConfirmDialog({
        title: 'Sinkronkan Ulang Subtitle Whisper?',
        message: `Durasi audio berubah dari <strong>${data.oldDuration}s</strong> menjadi <strong>${data.newDuration}s</strong>.`,
        subtext: 'Jalankan transkrip ulang otomatis agar timing kata subtitle karaoke pas 100% dengan audio baru?',
        confirmText: 'Ya, Transkrip Ulang',
        cancelText: 'Nanti Saja',
      });
      if (okRetranscribe) {
        await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: data.filename }),
        });
        showToast({ type: 'info', title: 'Transkripsi Berjalan', message: 'Whisper AI sedang menyelaraskan ulang subtitle...' });
      }
    } catch (err) {
      alert('Gagal memotong jeda napas: ' + err.message);
    } finally {
      el.btnTrimSilence.disabled = false;
      el.btnTrimSilence.textContent = origText;
    }
  });

  // -------------------------------------------------------------
  // Fitur 6: Paket Siap Posting — Caption TikTok + Hashtag Otomatis
  // -------------------------------------------------------------
  function buildAutoTiktokCaption(prod, v) {
    const prodName = prod?.name || 'produk ini';
    const hook = [v?.hookLine1, v?.hookHighlight].filter(Boolean).join(' ');
    const benefit = [v?.demoHighlight, v?.specHighlight].filter(Boolean).join(' • ');
    const cta = v?.ctaText || 'Cek promonya di keranjang kuning kiri bawah!';
    const slugTag = (prod?.id || 'racuntiktok').replace(/[^a-z0-9]/gi, '').toLowerCase();
    return `${hook} ✨\n${benefit} (${prodName}).\n👉 ${cta} 🛒👇\n\n#${slugTag} #racuntiktok #spillproduk #rekomendasitiktok #fyp`;
  }

  el.btnAutoGenCaption?.addEventListener('click', () => {
    if (!state.currentProduct) return;
    syncFormToVariant();
    const v = state.currentProduct.variants?.[state.activeVariantKey];
    if (!v) return;
    const generated = buildAutoTiktokCaption(state.currentProduct, v);
    if (el.inputTiktokCaption) {
      el.inputTiktokCaption.value = generated;
    }
    v.tiktokCaption = generated;
    triggerAutoSave();
    showToast({ type: 'success', title: 'Caption TikTok Dibuat', message: 'Caption & hashtag otomatis telah dirangkai.' });
  });

  el.btnCopyTiktokCaption?.addEventListener('click', async () => {
    const v = state.currentProduct?.variants?.[state.activeVariantKey];
    let text = el.inputTiktokCaption?.value.trim();
    if (!text && state.currentProduct && v) {
      text = buildAutoTiktokCaption(state.currentProduct, v);
      if (el.inputTiktokCaption) el.inputTiktokCaption.value = text;
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: 'success', title: 'Caption Tersalin!', message: 'Siap di-paste langsung saat posting di TikTok.' });
    } catch (_) {
      el.inputTiktokCaption?.select();
      document.execCommand('copy');
      showToast({ type: 'success', title: 'Caption Tersalin!', message: 'Siap di-paste ke TikTok.' });
    }
  });

  el.inputTiktokCaption?.addEventListener('input', () => {
    syncFormToVariant();
    triggerAutoSave();
  });

  // -------------------------------------------------------------
  // Fitur 5: Antrean Render Multi-Produk (Batch Render Queue)
  // -------------------------------------------------------------
  function renderBatchProductCheckboxes() {
    if (!el.batchProductList) return;
    el.batchProductList.innerHTML = '';
    const list = state.products || [];
    if (list.length === 0) {
      el.batchProductList.innerHTML = '<div style="font-size: 12px; color: var(--text-faint); padding: 8px;">Belum ada produk di folder products/.</div>';
      return;
    }
    list.forEach(p => {
      const row = document.createElement('label');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 6px; background: rgba(255,255,255,0.03); cursor: pointer; font-size: 12px;';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" class="batch-prod-chk" value="${escapeHtml(p.id)}" checked>
          <strong style="color: #fff;">${escapeHtml(p.name)}</strong>
          <code style="font-size: 11px; color: var(--text-faint);">${escapeHtml(p.id)}</code>
        </div>
        <span class="pill emerald" style="font-size: 10px;">${p.variantsCount || 2} varian</span>
      `;
      el.batchProductList.appendChild(row);
    });
  }

  el.btnOpenBatchModal?.addEventListener('click', async () => {
    await loadProductsList();
    renderBatchProductCheckboxes();
    if (el.batchQueueStatus) el.batchQueueStatus.style.display = 'none';
    if (el.modalBatchRender) el.modalBatchRender.style.display = 'flex';
  });

  const closeBatchModal = () => {
    if (el.modalBatchRender) el.modalBatchRender.style.display = 'none';
  };
  el.btnCloseBatchModal?.addEventListener('click', closeBatchModal);
  el.btnCancelBatchModal?.addEventListener('click', closeBatchModal);

  el.btnBatchSelectAll?.addEventListener('click', () => {
    document.querySelectorAll('.batch-prod-chk').forEach(c => { c.checked = true; });
  });
  el.btnBatchSelectNone?.addEventListener('click', () => {
    document.querySelectorAll('.batch-prod-chk').forEach(c => { c.checked = false; });
  });

  function waitForRenderComplete() {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/status');
          if (!res.ok) return;
          const st = await res.json();
          if (!st.isRendering) {
            clearInterval(checkInterval);
            if (st.step === 'error') {
              reject(new Error(st.error || 'Render gagal'));
            } else {
              resolve(st);
            }
          }
        } catch (_) {}
      }, 1500);
    });
  }

  el.btnStartBatchRender?.addEventListener('click', async () => {
    const selectedIds = Array.from(document.querySelectorAll('.batch-prod-chk:checked')).map(c => c.value);
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 produk untuk dirender.');
      return;
    }

    const variantScope = el.selectBatchVariants?.value || 'both';
    const fps = parseInt(el.selectBatchFps?.value || '60', 10);
    const autoUploadGdrive = Boolean(el.chkBatchUploadGdrive?.checked);

    el.btnStartBatchRender.disabled = true;
    if (el.batchQueueStatus) {
      el.batchQueueStatus.style.display = 'block';
      el.batchQueueStatus.className = 'feedback-banner warn';
    }

    let successCount = 0;
    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const pid = selectedIds[i];
        if (el.batchQueueStatus) {
          el.batchQueueStatus.textContent = `⏳ Memproses (${i + 1}/${selectedIds.length}): Merender produk "${pid}" (${variantScope.toUpperCase()})...`;
        }
        appendLog(`[BATCH QUEUE] (${i + 1}/${selectedIds.length}) Memulai render produk '${pid}'...`, true);

        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: pid,
            target: variantScope === 'both' ? 'all' : variantScope,
            fps,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Gagal memulai render ${pid}`);

        // Tunggu hingga proses render produk ini selesai
        await waitForRenderComplete();
        successCount++;

        // Jika opsi auto-upload GDrive dicentang, unggah video terbaru milik produk ini
        if (autoUploadGdrive) {
          await loadVideos();
          const latestVid = state.videos?.[0];
          if (latestVid) {
            if (el.batchQueueStatus) {
              el.batchQueueStatus.textContent = `☁️ Mengunggah hasil "${latestVid.name}" ke Google Drive...`;
            }
            await fetch('/api/gdrive-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoName: latestVid.name }),
            }).catch(() => {});
          }
        }
      }

      if (el.batchQueueStatus) {
        el.batchQueueStatus.className = 'feedback-banner success';
        el.batchQueueStatus.textContent = `✅ Selesai! ${successCount} dari ${selectedIds.length} produk berhasil dirender.`;
      }
      showToast({
        type: 'success',
        title: 'Antrean Batch Selesai!',
        message: `${successCount} produk telah selesai dirender.`,
      });
      await loadVideos();
    } catch (err) {
      if (el.batchQueueStatus) {
        el.batchQueueStatus.className = 'feedback-banner error';
        el.batchQueueStatus.textContent = `❌ Terhenti pada antrean: ${err.message}`;
      }
    } finally {
      el.btnStartBatchRender.disabled = false;
    }
  });

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    initAllCustomSelects();
    initLivePreview();
    initBanks();
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
