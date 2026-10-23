// Graba un clip de la web fotograma a fotograma con reloj falso (JS + animaciones CSS sincronizadas)
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const [,, name, w, h, dpr, secs, ...rest] = process.argv;
const FPS = 30, out = `clips/${name}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const nm = path.resolve('tools/node_modules/three');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, isMobile: +w < 700, hasTouch: +w < 700 });
await ctx.addInitScript(() => { try { localStorage.setItem('vm-consent', 'rejected'); } catch (e) {} });
const page = await ctx.newPage();
await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.186\.1\/(.*)/, r => r.fulfill({ path: path.join(nm, r.request().url().replace(/.*three@0\.186\.1\//, '')), contentType: 'application/javascript' }));
page.on('pageerror', e => console.log('pageerror', e.message));
await ctx.addInitScript(() => {
  // Reloj virtual: performance.now, Date, rAF y temporizadores avanzan solo con __tick
  let vnow = 0; const base = new Date('2026-10-23T10:30:00').getTime();
  const RealDate = Date;
  performance.now = () => vnow;
  class FDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(base + vnow); } static now() { return base + vnow; } }
  window.Date = FDate;
  let raf = [], id = 0, timers = [];
  window.requestAnimationFrame = cb => { raf.push({ id: ++id, cb }); return id; };
  window.cancelAnimationFrame = i => { raf = raf.filter(r => r.id !== i); };
  window.setTimeout = (cb, ms = 0, ...a) => { timers.push({ id: ++id, at: vnow + ms, cb: () => cb(...a) }); return id; };
  window.setInterval = (cb, ms = 0, ...a) => { const t = { id: ++id, at: vnow + ms, every: ms, cb: () => cb(...a) }; timers.push(t); return t.id; };
  window.clearTimeout = window.clearInterval = i => { timers = timers.filter(t => t.id !== i); };
  window.__tick = ms => {
    const end = vnow + ms;
    for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; vnow = t.at; if (t.every) t.at += Math.max(1, t.every); else timers.shift(); try { t.cb(); } catch (e) { console.error(e); } }
    vnow = end; const q = raf; raf = []; q.forEach(r => { try { r.cb(vnow); } catch (e) { console.error(e); } });
  };
});
const pre = rest[0] || '';
await page.goto('http://localhost:8091/' + (rest[1] || ''), { waitUntil: 'networkidle' });
// Sincroniza las animaciones CSS con el reloj falso
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  window.__vt = 0; const seen = new WeakMap();
  window.__sync = () => { document.getAnimations().forEach(a => { if (!seen.has(a)) { seen.set(a, window.__vt); } a.pause(); a.currentTime = Math.max(0, window.__vt - seen.get(a)); }); };
});
const steps = JSON.parse(fs.readFileSync(`tools/clips/${name}.json`, 'utf8'));
let vt = 0;
for (let f = 0; f < Math.round(+secs * FPS); f++) {
  const t = f / FPS;
  for (const s of steps) {
    if (s.at !== undefined && Math.abs(s.at - t) < 0.5 / FPS) {
      if (s.click) await page.evaluate(sel => document.querySelector(sel).click(), s.click);
      if (s.js) await page.evaluate(s.js);
    }
    if (s.scroll && t >= s.from && t <= s.to) {
      await page.evaluate(([s, t]) => {
        const k = Math.min(1, Math.max(0, (t - s.from) / (s.to - s.from))); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const el = s.scroll === 'top' ? 0 : document.querySelector(s.scroll).getBoundingClientRect().top + scrollY + (s.off || 0) - (s.startY ?? 0);
        if (s.startY === undefined) s.startY = 0;
        window.scrollTo(0, (window.__y0 ?? (window.__y0 = scrollY)) + (el - window.__y0) * e);
        if (k >= 1) window.__y0 = undefined;
      }, [s, t]);
    }
    if (s.video && t >= s.from && t <= s.to) {
      await page.evaluate(async (vtime) => { const v = document.querySelector('video'); v.pause(); if (Math.abs(v.currentTime - vtime) > 0.001) { v.currentTime = vtime; await new Promise(r => v.addEventListener('seeked', r, { once: true })); } v.dispatchEvent(new Event('timeupdate')); }, s.v0 + (t - s.from));
    }
  }
  await page.evaluate(ms => window.__tick(ms), 1000 / FPS); vt += 1000 / FPS;
  await page.evaluate(v => { window.__vt = v; window.__sync(); }, vt);
  await page.screenshot({ path: `${out}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
}
await browser.close();
