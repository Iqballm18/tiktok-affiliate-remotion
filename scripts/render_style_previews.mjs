import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const tempDir = path.join(rootDir, 'temp_props');
const outDir = path.join(rootDir, 'out');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const baseProps = {
    themeStyle: 'pastel',
    badgeText: 'SHOULDER BAG WANITA',
    hookLine1: 'Lagi cari tas simpel estetik?',
    hookHighlight: 'Model Hobo Klasik Bikin Elegan!',
    demoBadge: 'DETAIL RITSLETING RAPI',
    demoLine1: 'Resleting Rapi Buka Tutup Mudah',
    demoHighlight: 'Muat Banyak Barang Bawaanmu',
    specBadge: 'KULIT SINTETIS PREMIUM',
    specLine1: 'Bahan Kulit Halus Lembut',
    specHighlight: 'Desain Minimalis Cocok OOTD',
    ctaText: 'Cek Promo di Keranjang Kuning',
    watermarkText: 'video milik @inanikma_',
    clips: [
        { src: 'tas bahu mahogany.mp4', startSec: 0, endSec: 5 },
        { src: 'tas bahu mahogany.mp4', startSec: 8, endSec: 15 },
        { src: 'tas bahu mahogany.mp4', startSec: 15, endSec: 22 },
        { src: 'tas bahu mahogany.mp4', startSec: 19, endSec: 24 },
    ],
};

const styles = [
    { name: 'style_1_unified_glass.jpg', cardStyle: 'unified_glass' },
    { name: 'style_2_editorial_minimal.jpg', cardStyle: 'editorial_minimal' },
    { name: 'style_3_creator_aesthetic.jpg', cardStyle: 'creator_aesthetic' },
    { name: 'style_4_clean_capsule.jpg', cardStyle: 'clean_capsule' },
];

for (const s of styles) {
    const props = { ...baseProps, cardStyle: s.cardStyle };
    const propPath = path.join(tempDir, `prop_${s.cardStyle}.json`);
    const outputPath = path.join(outDir, s.name);
    fs.writeFileSync(propPath, JSON.stringify(props, null, 2));

    console.log(`Rendering ${s.name}...`);
    const cmd = `npx remotion still TikTokAffiliate "${outputPath}" --frame=90 --props="${propPath}"`;
    execSync(cmd, { stdio: 'inherit', cwd: rootDir });
    console.log(`✓ Generated ${s.name}`);
}

// Clean temp_props
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('\nAll 5 card style preview images have been successfully generated in out/ folder!');
