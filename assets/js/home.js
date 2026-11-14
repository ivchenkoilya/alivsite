/* ALIV SPORT — home page */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, DATA, esc, icon, price, fmt, plural, productCard, productImg, productUrl, catalogUrl } = A;
  const PL = window.ALIV_PRICELIST;
  const products = DATA.products;
  const priced = products.filter((p) => p.price);
  const plTotal = PL.series.reduce((a, s) => a + s.items.length, 0);

  /* Hero showcase: real machines with a published price, cycling one after another */
  const showcase = $('[data-hero-showcase]');
  const picks = ['zhim-nogami', 'gravitron', 'silovaya-rama', 'mashina-smitta-s-protivovesom', 'zhim-nogami-kombinirovannyj-gakk-prised', 'tyaga-v-yamu-2']
    .map((s) => A.bySlug.get(s)).filter((p) => p && p.price);
  if (showcase && picks.length) {
    showcase.innerHTML = `
      <p class="hero-showcase__label"><span class="hero-showcase__dot"></span>Можно заказать онлайн</p>
      <div class="hero-showcase__deck">${picks.map((p, i) => `
        <a class="hs-card" href="${productUrl(p)}" data-hs="${i}" aria-label="${esc(p.name)} — ${price(p.price)}" ${i ? 'tabindex="-1"' : ''}>
          <span class="stage hs-card__img">${productImg(p.images[0], { sizes: '320px', eager: i === 0 })}</span>
          <span class="hs-card__body">
            <span class="hs-card__type">${esc(DATA.types[p.type] || '')}</span>
            <b class="hs-card__name">${esc(p.name)}</b>
            <span class="hs-card__row"><span class="price">${price(p.price)}</span><span class="hs-card__go">${icon('arrow-up-right')}</span></span>
          </span>
        </a>`).join('')}</div>
      <div class="hero-showcase__nav">
        <button class="icon-btn" type="button" data-hs-prev aria-label="Предыдущий тренажёр">${icon('chevron-left')}</button>
        <span class="hero-showcase__bars">${picks.map((_, i) => `<i data-hs-bar="${i}"><em></em></i>`).join('')}</span>
        <button class="icon-btn" type="button" data-hs-next aria-label="Следующий тренажёр">${icon('chevron-right')}</button>
      </div>`;
    const cards = $$('.hs-card', showcase); const bars = $$('[data-hs-bar]', showcase);
    let cur = 0; let timer = 0; const DUR = 4500;
    const show = (i) => {
      cur = (i + cards.length) % cards.length;
      cards.forEach((c, k) => {
        const d = (k - cur + cards.length) % cards.length; // 0 = front, 1-2 = behind
        c.dataset.pos = d < 3 ? d : 'hidden';
        c.tabIndex = d === 0 ? 0 : -1;
        c.setAttribute('aria-hidden', String(d !== 0));
      });
      bars.forEach((b, k) => { b.classList.toggle('is-done', k < cur); b.classList.remove('is-active'); void b.offsetWidth; b.classList.toggle('is-active', k === cur); });
    };
    const play = () => { clearInterval(timer); if (!A.reduceMotion) timer = setInterval(() => show(cur + 1), DUR); };
    showcase.style.setProperty('--hs-dur', `${DUR}ms`);
    $('[data-hs-prev]', showcase).addEventListener('click', () => { show(cur - 1); play(); });
    $('[data-hs-next]', showcase).addEventListener('click', () => { show(cur + 1); play(); });
    showcase.addEventListener('mouseenter', () => { clearInterval(timer); showcase.classList.add('is-paused'); });
    showcase.addEventListener('mouseleave', () => { showcase.classList.remove('is-paused'); play(); });
    showcase.addEventListener('focusin', () => { clearInterval(timer); showcase.classList.add('is-paused'); });
    let sx = null;
    showcase.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    showcase.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { show(cur + (dx < 0 ? 1 : -1)); play(); } sx = null; });
    document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : play()));
    show(0); play();
  }
  const stats = $('[data-hero-stats]');
  if (stats) stats.innerHTML = [
    [products.length, plural(products.length, 'модель', 'модели', 'моделей') + ' в каталоге'],
    [plTotal, plural(plTotal, 'позиция', 'позиции', 'позиций') + ' в прайс-листе'],
    [PL.series.length, plural(PL.series.length, 'серия', 'серии', 'серий') + ' оборудования'],
  ].map(([n, l]) => `<div><dt class="sr-only">${l}</dt><dd><b data-count="${n}">${n}</b><span>${l}</span></dd></div>`).join('') +
    `<div><dd><b class="hero-stats__icon">${icon('factory')}</b><span>Собственное производство в Конаково</span></dd></div>`;

  /* Ticker — two identical halves so the loop is seamless; the copy is hidden from assistive tech */
  const ticker = $('[data-ticker]');
  if (ticker) {
    const picks = products.filter((p) => p.price).concat(products.filter((p) => !p.price && p.images.length > 2)).slice(0, 16);
    const half = (hidden) => picks.map((p) => `<a class="ticker__item" href="${productUrl(p)}"${hidden ? ' tabindex="-1" aria-hidden="true"' : ''}>${esc(p.name)}</a>`).join('');
    ticker.innerHTML = half(false) + half(true);
  }

  /* Categories bento */
  const bento = $('[data-cats-bento]');
  const coverFor = (slug) => {
    const preferred = { 'svobodnye-vesa': 'silovaya-rama', gruzoblochnoe: 'gravitron', 'dlya-doma': 'skamya-s-peremennym-uglom' }[slug];
    return A.bySlug.get(preferred) || products.find((p) => p.category === slug);
  };
  if (bento) bento.innerHTML = DATA.categories.slice().sort((a, b) => b.count - a.count).map((c, i) => {
    const p = coverFor(c.slug);
    return `<a class="cat-tile cat-tile--${i} reveal" style="--i:${i}" href="${catalogUrl({ cat: c.slug })}">
      <span class="stage cat-tile__img">${productImg(p.images[0], { sizes: i === 0 ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 100vw' })}</span>
      <span class="cat-tile__body"><span class="cat-tile__count">${c.count} ${plural(c.count, 'модель', 'модели', 'моделей')}</span><span class="cat-tile__name">${esc(c.name)}</span><span class="cat-tile__desc">${esc(c.full)}</span><span class="cat-tile__go">${icon('arrow-right')}</span></span>
    </a>`;
  }).join('');
  const typesWrap = $('[data-cats-types]');
  const typeCounts = products.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
  if (typesWrap) typesWrap.innerHTML = Object.entries(DATA.types).filter(([id]) => typeCounts[id])
    .map(([id, label]) => `<a class="chip" href="${catalogUrl({ type: id })}">${esc(label)} <span class="chip__count">${typeCounts[id]}</span></a>`).join('');

  /* Rail of priced products */
  const rail = $('[data-rail]');
  if (rail) {
    rail.innerHTML = priced.map((p, i) => productCard(p, { i })).join('');
    const step = () => (rail.querySelector('.p-card')?.offsetWidth || 300) + 20;
    $('[data-rail-prev]').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: A.reduceMotion ? 'auto' : 'smooth' }));
    $('[data-rail-next]').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: A.reduceMotion ? 'auto' : 'smooth' }));
    const upd = () => {
      $('[data-rail-prev]').disabled = rail.scrollLeft < 8;
      $('[data-rail-next]').disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
    };
    rail.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  }

  /* Series (from the real price list) */
  const tabs = $('[data-series-tabs]'); const panel = $('[data-series-panel]');
  $('[data-series-total]').textContent = plTotal;
  const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\(\s*/g, '(');
  function showSeries(idx) {
    const s = PL.series[idx];
    $$('[role=tab]', tabs).forEach((t, i) => { t.setAttribute('aria-selected', String(i === idx)); t.tabIndex = i === idx ? 0 : -1; });
    const min = Math.min(...s.items.map((x) => x.rozn));
    panel.innerHTML = `
      <div class="series__head">
        <span class="series__code">${s.code}</span>
        <div><h3 class="h3">${esc(titleCase(s.title))}</h3><p class="muted small">${s.items.length} ${plural(s.items.length, 'позиция', 'позиции', 'позиций')} · розница от ${fmt(min)}&nbsp;₽</p></div>
      </div>
      <ul class="series__items">${s.items.slice(0, 6).map((it) => `<li><button class="series__row" type="button" data-pl-key="${esc(it.code)}" aria-label="Подробнее: ${esc(it.code)} ${esc(it.name)}"><span class="series__sku">${esc(it.code)}</span><span class="series__name">${esc(it.name)}${it.isNew ? ' <span class="tag tag--new">новинка</span>' : ''}</span><span class="series__price">${fmt(it.rozn)}&nbsp;₽</span><span class="series__go">${icon('arrow-up-right')}</span></button></li>`).join('')}</ul>
      <a class="link-arrow" href="price.html?series=${s.code}">Все позиции серии ${s.code} <svg class="i"><use href="#i-arrow-right"/></svg></a>`;
    panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap');
  }
  // rows open the price-list item view; hovering shows the machine (shared plview.js)
  const findRow = (code) => { for (const s of PL.series) { const it = s.items.find((x) => x.code === code); if (it) return { ...it, series: s.code }; } return null; };
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-pl-key]'); if (b) { const r = findRow(b.dataset.plKey); if (r) A.openPriceItem(r); } });
  A.bindPricePreview(panel, findRow);
  tabs.innerHTML = PL.series.map((s, i) => `<button class="series__tab" role="tab" type="button" aria-selected="false" data-idx="${i}"><span>${s.code}</span>${esc(titleCase(s.title).replace(/\s*\(.*\)/, ''))}</button>`).join('');
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) showSeries(Number(b.dataset.idx)); });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const cur = $$('[role=tab]', tabs).findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const next = (cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + PL.series.length) % PL.series.length;
    showSeries(next); $$('[role=tab]', tabs)[next].focus();
  });
  showSeries(PL.series.findIndex((s) => s.code === '200') >= 0 ? PL.series.findIndex((s) => s.code === '200') : 0);

  /* Selector */
  const form = $('[data-selector]');
  const typesBox = $('[data-selector-types]');
  typesBox.innerHTML = `<label class="opt"><input type="radio" name="type" value="" checked><span>Любая</span></label>` +
    Object.entries(DATA.types).filter(([id]) => typeCounts[id]).map(([id, label]) => `<label class="opt"><input type="radio" name="type" value="${id}"><span>${esc(label)}</span></label>`).join('');
  function runSelector() {
    const fd = new FormData(form);
    const purpose = fd.get('purpose'); const type = fd.get('type'); const budget = Number(fd.get('budget')) || 0;
    const res = products.filter((p) => (!purpose || p.purpose === purpose) && (!type || p.type === type) && (!budget || (p.price && p.price <= budget)));
    $('[data-selector-count]').textContent = res.length;
    $('[data-selector-word]').textContent = plural(res.length, 'модель', 'модели', 'моделей');
    const params = {}; if (purpose) params.purpose = purpose; if (type) params.type = type; if (budget) { params.max = budget; }
    const link = $('[data-selector-link]'); link.href = catalogUrl(params);
    link.classList.toggle('is-disabled', !res.length);
    const cards = $('[data-selector-cards]');
    const top = res.slice().sort((a, b) => (b.price ? 1 : 0) - (a.price ? 1 : 0)).slice(0, 3);
    cards.innerHTML = top.length ? top.map((p, i) => productCard(p, { i, reveal: false })).join('')
      : `<div class="empty" style="grid-column:1/-1">${icon('target')}<p class="h4">Под эти условия моделей нет</p><p>Попробуйте расширить бюджет или запросите расчёт — подберём решение из полного прайс-листа.</p><button class="btn btn--outline" type="button" data-quote-open data-quote-title="Подбор оборудования">Запросить подбор</button></div>`;
  }
  form.addEventListener('change', runSelector);
  runSelector();

  /* Request form */
  A.bindForm($('[data-form="home"]'));
  A.observeReveals(); A.countUp();
})();
