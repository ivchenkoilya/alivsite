/*
 * End-to-end checks of the key user journeys (Playwright, local Chrome).
 * Forms run in demo mode on localhost, so nothing is sent to the live site.
 *   npm run serve   (in another terminal)
 *   node tools/e2e.js
 */
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:5173/';
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); };

(async () => {
  const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // never touch the production form endpoint from tests
  await page.route('**/contact-form-7/**', (r) => { errors.push('CF7 endpoint was called'); r.abort(); });

  /* ---- Catalog ---- */
  await page.goto(BASE + 'catalog.html', { waitUntil: 'networkidle' });
  check('catalog: 12 cards on first page', (await page.locator('[data-grid] .p-card').count()) === 12);
  await page.click('[data-more]');
  check('catalog: load more → 24', (await page.locator('[data-grid] .p-card').count()) === 24);
  await page.fill('[data-q]', 'смитт');
  await page.waitForTimeout(400);
  const smith = await page.locator('[data-grid] .p-card').count();
  check('catalog: search "смитт"', smith === 3, `${smith} results`);
  check('catalog: search synced to URL', page.url().includes('q='));
  await page.fill('[data-q]', '');
  await page.waitForTimeout(400);
  await page.click('[data-type-pill="legs"]');
  const legs = await page.locator('[data-grid] .p-card').count();
  check('catalog: type pill "legs" → 10', legs === 10, `${legs}`);
  await page.selectOption('[data-sort]', 'price-asc');
  const firstPrice = await page.locator('[data-grid] .p-card .price').first().textContent();
  check('catalog: sort price asc puts cheapest first', /35\s?100/.test(firstPrice.replace(/ /g, ' ')), firstPrice);
  await page.check('input[name=priced]');
  const pricedLegs = await page.locator('[data-grid] .p-card').count();
  check('catalog: legs + only priced', pricedLegs === 3, `${pricedLegs}`);
  await page.fill('[data-price-max]', '100000'); await page.press('[data-price-max]', 'Tab');
  check('catalog: price max 100 000', (await page.locator('[data-grid] .p-card').count()) === 1);
  await page.fill('[data-price-max]', ''); await page.fill('[data-price-min]', '999999'); await page.press('[data-price-min]', 'Tab');
  check('catalog: empty state shown', await page.locator('[data-grid] .empty').isVisible());
  await page.click('[data-grid] [data-reset]');
  check('catalog: reset restores 55', (await page.locator('[data-found]').textContent()).includes('55'));
  await page.click('[data-view="list"]');
  check('catalog: list view toggles', await page.locator('[data-grid].is-list').count() === 1);
  await page.reload({ waitUntil: 'networkidle' });
  check('catalog: list view remembered', await page.locator('[data-grid].is-list').count() === 1);
  await page.click('[data-view="grid"]');
  await page.goto(BASE + 'catalog.html?cat=gruzoblochnoe', { waitUntil: 'networkidle' });
  check('catalog: deep link ?cat=', (await page.locator('[data-grid] .p-card').count()) === 5);

  /* ---- Product + cart ---- */
  await page.goto(BASE + 'product.html?slug=zhim-nogami', { waitUntil: 'networkidle' });
  check('product: title', (await page.locator('[data-pp-title]').textContent()) === 'Жим ногами');
  check('product: real price 196 000', /196\s?000/.test((await page.locator('[data-pp-price]').textContent()).replace(/ /g, ' ')));
  check('product: 8 gallery slides', (await page.locator('.gallery__slide').count()) === 8);
  await page.click('[data-gallery-next]'); await page.waitForTimeout(500);
  check('product: gallery next', (await page.locator('[data-gallery-counter]').textContent()).startsWith('2'));
  await page.click('[data-gallery-open]');
  check('product: lightbox opens', await page.locator('[data-lightbox].is-open').count() === 1);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  check('product: lightbox keyboard nav', (await page.locator('[data-lb-counter]').textContent()).includes('3 / 8'));
  await page.keyboard.press('Escape');
  check('product: lightbox closes on Esc', await page.locator('[data-lightbox].is-open').count() === 0);
  await page.click('[data-gallery-open]');
  const lbBox = await page.locator('[data-lb-img]').boundingBox();
  await page.mouse.click(lbBox.x + lbBox.width / 2, lbBox.y + lbBox.height / 2); await page.waitForTimeout(400);
  check('viewer: click zooms to 250%', (await page.textContent('[data-lb-zoom-label]')) === '250%');
  await page.keyboard.press('Escape');
  check('fit check: fits in 6×4 m', (await page.textContent('[data-fit-status]')) === 'Помещается');
  await page.fill('[data-fit-form] [name=W]', '1.5');
  check('fit check: 1.5 m too narrow', (await page.textContent('[data-fit-status]')) === 'Не помещается');
  check('card→product morph target named', (await page.locator('.gallery__slide').first().evaluate((e) => e.style.viewTransitionName)) === 'pimg');
  await page.click('[data-q-inc]');
  await page.click('[data-main-cta]');
  check('cart: badge shows 2', (await page.locator('[data-cart-count]').textContent()) === '2');
  await page.click('.buybox [data-fav]');
  check('favs: badge 1', (await page.locator('[data-fav-count]').textContent()) === '1');
  check('product: JSON-LD present', (await page.locator('script[type="application/ld+json"]').count()) >= 1);

  await page.goto(BASE + 'product.html?slug=pek-dek', { waitUntil: 'networkidle' });
  await page.click('[data-main-cta]');
  check('quote: modal opens for price-on-request product', await page.locator('[data-modal="quote"].is-open').isVisible());
  await page.click('[data-modal="quote"] [type=submit]');
  check('quote: validation blocks empty submit', (await page.locator('[data-modal="quote"] .field.is-invalid').count()) >= 2);
  await page.fill('#q-name', 'Тест'); await page.fill('#q-phone', '9161234567'); await page.check('[data-modal="quote"] input[name=consent]');
  check('quote: phone mask', (await page.inputValue('#q-phone')) === '+7 (916) 123-45-67', await page.inputValue('#q-phone'));
  await page.click('[data-modal="quote"] [type=submit]');
  await page.waitForSelector('[data-modal="quote"] .form-status.is-visible');
  check('quote: demo submit succeeds', /Демо-режим/.test(await page.locator('[data-modal="quote"] .form-status').textContent()));
  await page.keyboard.press('Escape');

  await page.goto(BASE + 'cart.html', { waitUntil: 'networkidle' });
  check('cart page: 1 line', (await page.locator('.cart-item').count()) === 1);
  check('cart page: total 392 000', /392\s?000/.test((await page.locator('.summary__total dd').textContent()).replace(/ /g, ' ')));
  await page.click('.cart-item [data-qty-inc]');
  check('cart page: qty +1 → 588 000', /588\s?000/.test((await page.locator('.summary__total dd').textContent()).replace(/ /g, ' ')));
  await page.click('[data-form="order"] [type=submit]');
  check('checkout: validation', (await page.locator('[data-form="order"] .is-invalid').count()) >= 2);
  await page.fill('#o-name', 'ООО Тест'); await page.fill('#o-phone', '+7 916 123 45 67'); await page.check('[data-form="order"] input[name=consent]');
  await page.click('[data-form="order"] [type=submit]');
  await page.waitForSelector('.done', { timeout: 5000 }).catch(() => {});
  check('checkout: confirmation screen', await page.locator('.done').isVisible());

  await page.goto(BASE + 'favorites.html', { waitUntil: 'networkidle' });
  check('favourites page lists 1', (await page.locator('[data-fav-grid] .p-card').count()) === 1);

  /* ---- Price list ---- */
  await page.goto(BASE + 'price.html', { waitUntil: 'networkidle' });
  await page.fill('[data-pl-q]', 'AL-202'); await page.waitForTimeout(300);
  const r202 = await page.locator('.pl-row').count();
  check('price: search AL-202', r202 === 2, `${r202}`);
  await page.locator('.pl-row [data-select]').first().check();
  check('price: selection bar appears', await page.locator('[data-sel-bar].is-visible').count() === 1);
  await page.click('[data-sel-bar] [data-sel-quote]');
  check('price: quote modal lists selection', (await page.locator('.modal__list li').count()) === 1);
  await page.keyboard.press('Escape');
  await page.fill('[data-pl-q]', ''); await page.waitForTimeout(300);
  await page.click('[data-series="600"]');
  check('price: series 600 → 62 rows', (await page.locator('.pl-row').count()) === 62);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.click('[data-xlsx]')]);
  check('price: export downloads a file', !!dl, dl ? dl.suggestedFilename() : 'no download');

  /* ---- Contacts ---- */
  await page.goto(BASE + 'contacts.html', { waitUntil: 'networkidle' });
  await page.fill('#f-name', 'Тест'); await page.fill('#f-phone', '12345'); await page.fill('#f-msg', 'Вопрос');
  await page.check('[data-form="contacts"] input[name=consent]');
  await page.click('[data-form="contacts"] [type=submit]');
  check('contacts: short phone rejected', await page.locator('#f-phone').evaluate((el) => el.closest('.field').classList.contains('is-invalid')));
  await page.click('[data-map-load]');
  check('contacts: map iframe loads on demand', (await page.locator('[data-map] iframe').count()) === 1);

  /* ---- Header: search + mobile menu ---- */
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  check('home: 4 daily picks', (await page.locator('.daily-tab').count()) === 4);
  check('home: hero title visible', await page.locator('.hero__title').evaluate((e) => getComputedStyle(e).opacity === '1' && e.getBoundingClientRect().height > 50));
  check('home: hero showcase cycles real priced machines', (await page.locator('.hs-card').count()) >= 4);
  check('home: ticker links to products', (await page.locator('.ticker__item[href^="product.html"]').count()) >= 16);
  check('brand: new logo in header', (await page.locator('.site-header .brand__mark').count()) === 1);
  await page.click('[data-search-open]');
  await page.fill('[data-search-input]', 'гакк'); await page.waitForTimeout(300);
  const sr = await page.locator('[data-search-results] .search-item').count();
  check('search overlay: "гакк" results', sr >= 4, `${sr}`);
  await page.keyboard.press('Escape');
  check('search overlay closes', await page.locator('[data-search].is-open').count() === 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-drawer-open="menu"]');
  check('mobile menu opens', await page.locator('#drawer-menu.is-open').count() === 1);
  await page.keyboard.press('Escape');
  check('mobile menu closes on Esc', await page.locator('#drawer-menu.is-open').count() === 0);

  await page.goto(BASE + '404.html', { waitUntil: 'networkidle' });
  check('404: page with search and products', (await page.locator('[data-nf-products] .p-card').count()) === 4);
  /* ---- Compare ---- */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + 'catalog.html', { waitUntil: 'networkidle' });
  await page.locator('[data-grid] [data-compare]').nth(0).click();
  await page.locator('[data-grid] [data-compare]').nth(1).click();
  check('compare: tray shows 2', (await page.locator('.cmp-tray__item').count()) === 2);
  await page.goto(BASE + 'compare.html', { waitUntil: 'networkidle' });
  check('compare: table with 2 models', (await page.locator('.cmp-card').count()) === 2);
  await page.check('[data-cmp-diff]');
  check('compare: "only differences" keeps rows', (await page.locator('.cmp-table tbody tr').count()) >= 1);

  /* ---- Planner ---- */
  await page.goto(BASE + 'planner.html', { waitUntil: 'networkidle' });
  await page.click('[data-add="zhim-nogami"]'); await page.click('[data-add="gravitron"]');
  check('planner: 2 machines placed', (await page.locator('.plan-item').count()) === 2);
  check('planner: fits by default', /Всё помещается/.test(await page.textContent('[data-stats]')));
  await page.fill('[data-room="L"]', '3'); await page.waitForTimeout(200);
  check('planner: small room flags a problem', /выходит|пересека/.test(await page.textContent('[data-stats]')));
  await page.fill('[data-room="L"]', '10');
  await page.click('[data-plan-quote]');
  check('planner: КП lists room + machines', (await page.locator('.modal__list li').count()) === 3);
  await page.keyboard.press('Escape');

  /* ---- Reviews ---- */
  await page.goto(BASE + 'product.html?slug=gravitron', { waitUntil: 'networkidle' });
  check('reviews: honest empty state', /Отзывов пока нет/.test(await page.textContent('[data-reviews]')));
  await page.fill('#rv-name', 'Тест'); await page.fill('#rv-phone', '9161234567'); await page.fill('#rv-text', 'Короткий');
  await page.click('label[for=rv-s5]'); await page.check('[data-rv-form] input[name=consent]');
  await page.click('[data-rv-form] [type=submit]');
  check('reviews: blocks too-fast / too-short submissions', /быстро|коротк/.test(await page.textContent('[data-rv-form] [data-form-status]')));
  check('recently viewed shows earlier product', (await page.locator('[data-recent-grid] .p-card').count()) >= 1);

  /* ---- Price list quick view ---- */
  await page.goto(BASE + 'price.html', { waitUntil: 'networkidle' });
  await page.fill('[data-pl-q]', 'AL-214'); await page.waitForTimeout(300);
  await page.locator('.pl-row .pl-open').first().click();
  check('price: quick view links the catalogue card', /Жим на грудь/.test(await page.textContent('.pl-qv')));
  await page.keyboard.press('Escape');

  check('no JS errors / no live form calls', errors.length === 0, errors.join(' | '));
  await browser.close();

  let failed = 0;
  for (const r of results) { if (!r.ok) failed++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.info ? '  (' + r.info + ')' : ''}`); }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
