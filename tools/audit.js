/*
 * Interaction audit: every internal link must resolve, every visible button must do something.
 * A button "does something" if clicking it changes the DOM, the URL, opens a dialog/drawer,
 * starts a download or navigates. Forms are submitted empty (validation must react).
 *   node tools/audit.js [pages]
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:5173/';
const pages = (process.argv[2] || 'index,catalog,product,about,price,contacts,cart,favorites,compare,planner,404').split(',');
const dist = path.join(__dirname, '..', 'dist');

(async () => {
  global.window = {}; require(path.join(dist, 'data', 'products.js'));
  const slugs = new Set(window.ALIV_DATA.products.map((p) => p.slug));
  const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' });
  await ctx.route('**/contact-form-7/**', (r) => r.abort());
  const problems = []; let linkCount = 0; let btnCount = 0;

  for (const name of pages) {
    const url = BASE + name + '.html' + (name === 'product' ? '?slug=zhim-nogami' : '');
    const page = await ctx.newPage();
    // seed cart/favourites so cart & favourites pages have content to click
    await page.addInitScript(() => { try { localStorage.setItem('aliv.cart', JSON.stringify([{ id: 28383, qty: 1 }])); localStorage.setItem('aliv.favs', JSON.stringify([28383])); } catch (e) {} });
    await page.goto(url, { waitUntil: 'networkidle' });

    /* links */
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const href of new Set(links)) {
      linkCount++;
      if (/^(tel:|mailto:|https?:|#)/.test(href)) { if (href === '#') problems.push(`${name}: empty link "#"`); continue; }
      const [file, query] = href.split('#')[0].split('?');
      if (!fs.existsSync(path.join(dist, file))) problems.push(`${name}: broken link ${href}`);
      if (file === 'product.html') { const s = new URLSearchParams(query).get('slug'); if (!slugs.has(s)) problems.push(`${name}: unknown product ${href}`); }
    }

    /* buttons */
    const count = await page.locator('button:visible:not([disabled])').count();
    for (let i = 0; i < count; i++) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      const btns = page.locator('button:visible:not([disabled])');
      if (i >= (await btns.count())) break;
      const btn = btns.nth(i);
      const label = ((await btn.getAttribute('aria-label')) || (await btn.innerText()).trim()).replace(/\s+/g, ' ').slice(0, 50);
      btnCount++;
      await page.evaluate(() => { window.__mut = 0; document.addEventListener('input', () => window.__mut++, true); window.__vals = [...document.querySelectorAll('input')].map((i) => i.value).join('|'); new MutationObserver((m) => (window.__mut += m.length)).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
      const before = page.url();
      const dl = page.waitForEvent('download', { timeout: 1500 }).catch(() => null);
      try { await btn.click({ timeout: 2000 }); } catch (e) { problems.push(`${name}: cannot click "${label}" (${e.message.split('\n')[0]})`); continue; }
      await page.waitForTimeout(400);
      const changed = await page.evaluate(() => (window.__mut || 0) + ([...document.querySelectorAll('input')].map((i) => i.value).join('|') !== window.__vals ? 1 : 0)).catch(() => 1);
      const d = await Promise.race([dl, new Promise((r) => setTimeout(() => r(null), 300))]);
      if (!changed && page.url() === before && !d) problems.push(`${name}: button does nothing → "${label}"`);
    }
    await page.close();
  }
  await browser.close();
  console.log(`checked ${linkCount} links, ${btnCount} buttons on ${pages.length} pages`);
  console.log(problems.length ? problems.join('\n') : 'no problems found');
})();
