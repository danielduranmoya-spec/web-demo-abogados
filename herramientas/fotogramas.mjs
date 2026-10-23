import { chromium } from 'playwright';
import fs from 'fs';
const [,, url, outDir, w, h, fps, t0s, t1s] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction('window.listo === true', null, { timeout: 60000 });
const F = +fps, a = +t0s, b = +t1s;
for (let i = Math.round(a * F); i < Math.round(b * F); i++) {
  await page.evaluate(t => window.renderAt(t), i / F);
  await page.screenshot({ path: `${outDir}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
await browser.close();
