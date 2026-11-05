import { execSync } from 'child_process';
import path from 'path';

for (const name of ['blackmores.mp4', 'labore moisturizer.mp4']) {
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name -of json "public/${name}"`).toString();
        console.log(`=== ${name} ===`);
        console.log(out);
    } catch (e) {
        console.error(`Error for ${name}:`, e.message);
    }
}

