import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setOverwriteOutput(true);

// ==========================================
// HIGH SPEED & HD CRISP EXPORT CONFIGURATION (TIKTOK OPTIMIZED)
// ==========================================
// 1. High-Quality JPEG frame capture (95% Quality):
//    Mengurangi disk I/O dan konsumsi memori hingga 95% dibanding PNG mentah,
//    mempercepat rendering 1.5x - 2x lipat tanpa penurunan kualitas visual kasat mata.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);

// 2. Concurrency 8x (Optimasi untuk Intel Core i5-12400 6C/12T)
//    Mengekstrak 8 frame secara simultan via browser tab paralel
Config.setConcurrency(8);

// 3. Codec & Pixel Format standar industri TikTok (anti-warna kusam di HP)
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");

// 4. CRF 16 (Ketajaman tinggi & sweet-spot bitrate agar tidak di-compress ulang secara kasar oleh TikTok)
Config.setCrf(16);

// 5. Preset x264 'faster' untuk encoding instan dan efisien
Config.setX264Preset("faster");

// 6. Audio fidelity jernih
Config.setAudioBitrate("320k");

// 7. Akselerasi GPU untuk Chromium Headless (DirectX via ANGLE untuk GPU AMD Radeon RX 6600)
Config.setChromiumOpenGlRenderer("angle");
