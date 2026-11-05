import { continueRender, delayRender } from 'remotion';

/**
 * theme.ts memakai "Inter" dan "JetBrains Mono", tetapi sebelumnya tidak ada kode
 * yang memuat keduanya. Akibatnya hasil render bergantung pada font yang kebetulan
 * terpasang di komputer (Inter jatuh ke Segoe UI/Roboto, JetBrains Mono jatuh ke
 * monospace bawaan sistem).
 *
 * Helper ini memuat keduanya dari Google Fonts dan menahan render sampai selesai.
 * Jika offline / gagal, render tetap lanjut memakai font cadangan (tidak crash).
 */
const FONT_CSS_URL =
    'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=block';

let started = false;

export const loadThemeFonts = (): void => {
    if (started || typeof document === 'undefined') return;
    started = true;

    const handle = delayRender('Memuat font Inter dan JetBrains Mono', {
        timeoutInMilliseconds: 20000,
    });

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        continueRender(handle);
    };

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_CSS_URL;
    link.crossOrigin = 'anonymous';

    link.onload = () => {
        Promise.all([
            document.fonts.load('500 40px Inter'),
            document.fonts.load('700 40px Inter'),
            document.fonts.load('800 40px Inter'),
            document.fonts.load('900 40px Inter'),
            document.fonts.load('800 24px "JetBrains Mono"'),
        ])
            .then(finish, finish);
    };
    link.onerror = finish;

    document.head.appendChild(link);
};
