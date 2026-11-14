/*
 * Visual QA: full-page screenshots at control widths + overflow check.
 * Requires the preview server (npm run serve). Uses the locally installed Chrome/Edge.
 *   node tools/screenshots.js [pages=index,catalog] [widths=390,1440] [outDir]
 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const pages = (process.argv[2] || 'index,catalog,product,about,price,contacts,cart,favorites,compare,planner,404').split(',');
const widths = (process.argv[3] || '360,390,430,768,1024,1440,1920').split(',').map(Number);
const out = process.argv[4] || path.join(__dirname, '..', 'qa');
const base = process.env.BASE || 'http://localhost:5173/';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome' });
  const report = [];
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    for (const p of pages) {
      const [file, query] = p.split('?');
      const url = base + (file.endsWith('.html') ? file : file + '.html') + (query ? '?' + query : (file === 'product' ? '?slug=zhim-nogami' : ''));
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push('goto ' + e.message));
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
      // trigger lazy images
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth; const bad = [];
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.rail, .series__tabs, .cats__types, .table-scroll, .drawer, .search-overlay, .modal, .lightbox, .gallery__track, .thumbs, .chips-scroll')) bad.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' →' + Math.round(r.right));
        });
        return { docW: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 6) };
      });
      const name = `${file.replace('.html', '')}${query ? '-' + query.replace(/[^a-z0-9]+/gi, '_') : ''}-${w}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: true });
      if (process.env.SEG) { // viewport-sized chunks for review
        const H = await page.evaluate(() => document.documentElement.scrollHeight); const ch = Number(process.env.SEG) || 1200;
        for (let y = 0, k = 0; y < H; y += ch, k++) await page.screenshot({ path: path.join(out, name.replace('.png', `.${k}.png`)), clip: { x: 0, y, width: w, height: Math.min(ch, H - y) }, fullPage: true });
      }
      report.push({ page: p, w, overflow: overflow.docW > overflow.vw ? overflow : 'ok', errors: errors.splice(0) });
    }
    await ctx.close();
  }
  await browser.close();
  for (const r of report) console.log(`${r.page}@${r.w}: overflow=${typeof r.overflow === 'string' ? r.overflow : JSON.stringify(r.overflow)}${r.errors.length ? ' ERRORS=' + JSON.stringify(r.errors) : ''}`);
})();
