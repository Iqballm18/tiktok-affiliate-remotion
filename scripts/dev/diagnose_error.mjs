import { execSync } from 'child_process';
import fs from 'fs';

// Let's test props_v1 and props_v2 of render3.sh and render.sh
// We will test rendering frame 300 (during clip 2), frame 800 (clip 3), and frame 1200 (clip 4)

const scripts = [
    { file: 'render.sh', name: 'Blackmores v1' },
    { file: 'render3.sh', name: 'Labore v1' }
];

for (const s of scripts) {
    console.log(`\n=================== Testing ${s.file} ===================`);
    const content = fs.readFileSync(s.file, 'utf8');
    
    // Extract JSON between cat << EOF > temp_props/props_v1.json and EOF
    const m1 = content.match(/cat << EOF > temp_props\/props_v1\.json\s*([\s\S]*?)\s*EOF/);
    const m2 = content.match(/cat << EOF > temp_props\/props_v2\.json\s*([\s\S]*?)\s*EOF/);
    
    // Extract VID1
    const vidMatch = content.match(/VID1="([^"]+)"/);
    const vid1 = vidMatch ? vidMatch[1] : '';

    if (!fs.existsSync('temp_props')) fs.mkdirSync('temp_props');

    if (m1) {
        const jsonStr = m1[1].replace(/\$VID1/g, vid1);
        fs.writeFileSync('temp_props/props_v1.json', jsonStr);
        console.log(`Testing ${s.name} (v1) props parsing & still render at frame 1300...`);
        try {
            const out = execSync(`npx remotion still TikTokAffiliate "out/test_${s.file}_v1.jpg" --frame=1300 --props=temp_props/props_v1.json`, { stdio: 'pipe' });
            console.log(`✓ v1 still OK!`);
        } catch (e) {
            console.error(`❌ v1 error:`, e.stderr?.toString() || e.stdout?.toString() || e.message);
        }
    }

    if (m2) {
        const jsonStr = m2[1].replace(/\$VID1/g, vid1);
        fs.writeFileSync('temp_props/props_v2.json', jsonStr);
        console.log(`Testing ${s.file} (v2) props parsing & still render at frame 1300...`);
        try {
            const out = execSync(`npx remotion still TikTokAffiliate "out/test_${s.file}_v2.jpg" --frame=1300 --props=temp_props/props_v2.json`, { stdio: 'pipe' });
            console.log(`✓ v2 still OK!`);
        } catch (e) {
            console.error(`❌ v2 error:`, e.stderr?.toString() || e.stdout?.toString() || e.message);
        }
    }
}

