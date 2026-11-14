/* Visual QA of interactive states (menus, drawers, modals, hover) → qa/ov/ */
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/';
fs.mkdirSync('qa/ov', { recursive: true });

const SHOTS = [
  [390, 844, 'index.html', (p) => p.click('[data-drawer-open=menu]'), 'menu-390'],
  [390, 844, 'product.html?slug=zhim-nogami', async (p) => { await p.click('[data-main-cta]'); await p.waitForTimeout(300); await p.click('[data-drawer-open=cart]'); }, 'cart-drawer-390'],
  [1440, 900, 'product.html?slug=pek-dek', (p) => p.click('[data-main-cta]'), 'quote-1440'],
  [390, 844, 'product.html?slug=pek-dek', (p) => p.click('[data-main-cta]'), 'quote-390'],
  [1440, 900, 'index.html', async (p) => { await p.click('[data-search-open]'); await p.fill('[data-search-input]', 'скамья'); await p.waitForTimeout(300); }, 'search-1440'],
  [1440, 900, 'index.html', (p) => p.hover('.nav__item .nav__link'), 'dropdown-1440'],
];
const only = process.argv[2] ? process.argv[2].split(',') : null;

(async () => {
  const b = await chromium.launch({ channel: process.env.CHANNEL || 'chrome' });
  for (const [w, h, url, act, name] of SHOTS) {
    if (only && !only.includes(name)) continue;
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: 'reduce' });
    await p.goto(BASE + url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    if (act) await act(p);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `qa/ov/${name}.png` });
    await p.close();
  }
  await b.close();
})();
