import { execSync } from 'child_process';
import fs from 'fs';

const propsV1 = {
  themeStyle: "pastel",
  cardStyle: "creator_aesthetic",
  sfxPreset: "beauty",
  ctaSound: "kaching",
  enableSfx: true,
  sfxVolume: 1.0,
  showProgressBar: true,
  showSafeZoneGuide: false,
  watermarkText: "video milik @inanikma_",
  badgeText: "BLACKMORES PREGNANCY",
  demoBadge: "KAPSUL LUNAK TIDAK AMIS",
  specBadge: "ASAM FOLAT DAN DHA",
  hookLine1: "Bingung cari vitamin bumil busui?",
  hookHighlight: "Penuhi Nutrisi Lengkap Si Kecil!",
  demoLine1: "Minyak Ikan Tidak Berbau Amis",
  demoHighlight: "Kapsul Lembut Nyaman Ditelan",
  specLine1: "Kaya Asam Folat Kalsium DHA",
  specHighlight: "Terdaftar Resmi BPOM Dan Halal",
  ctaText: "Cek Promo di Keranjang Kuning",
  clips: [
    { src: "blackmores.mp4", startSec: 97, endSec: 102 },
    { src: "blackmores.mp4", startSec: 108, endSec: 115 },
    { src: "blackmores.mp4", startSec: 28, endSec: 35 },
    { src: "blackmores.mp4", startSec: 3, endSec: 8 }
  ]
};

if (!fs.existsSync('temp_props')) fs.mkdirSync('temp_props');
fs.writeFileSync('temp_props/test_props.json', JSON.stringify(propsV1, null, 2));

try {
  console.log('Testing render still for Blackmores...');
  const out = execSync('npx remotion still TikTokAffiliate "out/test_blackmores.jpg" --frame=30 --props=temp_props/test_props.json', { stdio: 'pipe' });
  console.log('Success:', out.toString());
} catch (e) {
  console.error('STDOUT:', e.stdout?.toString());
  console.error('STDERR:', e.stderr?.toString());
}

