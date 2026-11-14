/* Captures frames of the home "story" section at several scroll positions → qa/ov/story-*.png */
const { chromium } = require('playwright-core');
const w = Number(process.argv[2]) || 1440; const h = w < 768 ? 844 : 900;
const fr = (process.argv[3] || '0.12,0.27,0.33,0.45,0.62').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 768 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:5173/index.html', { waitUntil: 'networkidle' });
  const t = await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const s = document.querySelector('[data-story]'); return [s.offsetTop, s.offsetHeight]; });
  console.log('story top/height', t);
  for (let k = 0; k < fr.length; k++) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(t[0] + t[1] * fr[k]));
    await p.waitForTimeout(700);
    await p.screenshot({ path: `qa/ov/story-${w}-${k}.png` });
  }
  console.log('errors', errs);
  await b.close();
})();
