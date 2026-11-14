/*
 * ALIV SPORT — price-list item view, shared by the price list and the home "Серии" block.
 *   A.matchPriceItem(row) → { p, how: 'sku' | 'name' } | null
 *       exact article first, then a careful name match; never guessed further.
 *   A.openPriceItem(row, { selected, onSelect }) → quick-view dialog
 *   A.bindPricePreview(container, getRow) → floating photo next to the cursor on hover (desktop)
 * row = { code, name, opt, rozn, isNew, series }
 */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, esc, icon, fmt, norm } = A;
  const PL = window.ALIV_PRICELIST;
  const products = A.DATA.products;
  const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\(\s*/g, '(').replace(/\s+\)/g, ')');

  const normSku = (s) => String(s || '').toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9.-]/g, '');
  const stop = new Set(['для', 'на', 'с', 'и', 'под', 'тренажер', 'тренажёр', 'свободный', 'вес']);
  const words = (s) => norm(s).replace(/ё/g, 'е').split(' ').filter((w) => w.length > 2 && !stop.has(w));
  const cache = new Map();
  function matchPriceItem(r) {
    if (cache.has(r.code)) return cache.get(r.code);
    let res = null;
    const bySku = products.find((p) => p.sku && normSku(p.sku) === normSku(r.code));
    if (bySku) res = { p: bySku, how: 'sku' };
    else {
      const rw = words(r.name); let best = null; let score = 0;
      products.forEach((p) => {
        const pw = words(p.name);
        const common = pw.filter((w) => rw.some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length;
        const s = common / Math.max(pw.length, rw.length);
        if ((common >= 2 || (common === 1 && pw.length === 1 && rw.length <= 2)) && s > score) { score = s; best = p; }
      });
      if (best && score >= 0.5) res = { p: best, how: 'name' };
    }
    cache.set(r.code, res);
    return res;
  }
  const similar = (r, exclude) => {
    if (exclude) return products.filter((p) => p !== exclude && p.type === exclude.type).sort((a, b) => (b.price ? 1 : 0) - (a.price ? 1 : 0)).slice(0, 3);
    const rw = words(r.name).filter((w) => !/^(угл|сид|леж|стоя|верт|гориз|навес|насте)/.test(w));
    return products.filter((p) => words(p.name).some((w) => rw.some((x) => x.slice(0, 5) === w.slice(0, 5)))).slice(0, 3);
  };

  const qv = document.createElement('div');
  qv.className = 'modal'; qv.setAttribute('data-modal', 'pl-view'); qv.setAttribute('aria-hidden', 'true');
  qv.innerHTML = '<div class="modal__backdrop" data-modal-close></div><div class="modal__dialog pl-qv" role="dialog" aria-modal="true" aria-labelledby="plqv-title"></div>';
  document.body.appendChild(qv);

  function openPriceItem(r, { selected = false, onSelect = null } = {}) {
    const s = PL.series.find((x) => x.code === r.series) || { title: '' };
    const m = matchPriceItem(r); const p = m && m.p;
    const sim = similar(r, p);
    const box = $('.pl-qv', qv);
    box.innerHTML = `
      <button class="icon-btn pl-qv__close" type="button" data-modal-close aria-label="Закрыть">${icon('close')}</button>
      <div class="pl-qv__media ${p ? 'stage' : ''}">${p ? A.productImg(p.images[0], { sizes: '480px', eager: true }) : `<div class="pl-qv__noimg">${icon('image')}<span>Фото этой позиции пока нет на сайте — пришлём по запросу</span></div>`}</div>
      <div class="pl-qv__body">
        <p class="kicker">Серия ${esc(r.series)} · ${esc(titleCase(s.title).replace(/\s*\(.*\)/, ''))}</p>
        <h2 class="h3" id="plqv-title">${esc(r.name)}</h2>
        <p class="pl-qv__code">Артикул <b>${esc(r.code)}</b>${r.isNew ? ' <span class="tag tag--new">новинка</span>' : ''}</p>
        <dl class="pl-qv__prices"><div><dt>Опт</dt><dd class="accent">${fmt(r.opt)} ₽</dd></div><div><dt>Розница</dt><dd>${fmt(r.rozn)} ₽</dd></div></dl>
        ${p ? `<div class="pl-qv__match">${icon(m.how === 'sku' ? 'check-circle' : 'info')}<span>${m.how === 'sku' ? 'Эта позиция есть в каталоге' : 'Похожая модель в каталоге — уточните у менеджера, та же ли это позиция'}: <a class="text-link" href="${A.productUrl(p)}">${esc(p.name)}</a>${p.metrics.length ? ` · ${esc(p.metrics.map((x) => x.label + ' ' + x.value).slice(0, 2).join(', '))}` : ''}</span></div>` : ''}
        <div class="pl-qv__actions">
          ${p ? `<a class="btn btn--primary" href="${A.productUrl(p)}">Смотреть в каталоге ${icon('arrow-right', 'i--arrow')}</a>` : ''}
          <button class="btn ${p ? 'btn--outline' : 'btn--primary'}" type="button" data-qv-ask>${icon('message')}${p ? 'Запросить КП' : 'Запросить фото и описание'}</button>
          ${onSelect ? `<label class="checkbox"><input type="checkbox" data-qv-select ${selected ? 'checked' : ''}><span>В список для КП</span></label>` : ''}
        </div>
        ${sim.length ? `<div class="pl-qv__sim"><p class="caps muted">${p ? 'Ещё в этой категории' : 'Похожие модели в каталоге'}</p><div>${sim.map((x) => `<a class="pl-qv__simitem" href="${A.productUrl(x)}"><span class="stage">${A.productImg(x.images[0], { sizes: '64px', eager: true })}</span><span>${esc(x.name)}<small>${x.price ? A.price(x.price) : 'цена по запросу'}</small></span></a>`).join('')}</div></div>` : ''}
      </div>`;
    $('[data-qv-ask]', box).addEventListener('click', () => A.openQuote({ items: [{ label: `${r.code} ${r.name}`, meta: `опт ${fmt(r.opt)} / розн. ${fmt(r.rozn)} ₽` }], title: p ? `КП: ${r.code} ${r.name}` : `Фото и описание: ${r.code} ${r.name}`, kicker: 'Прайс-лист' }));
    if (onSelect) $('[data-qv-select]', box).addEventListener('change', (e) => onSelect(e.target.checked));
    A.openOverlay(qv, { focus: '.pl-qv__close' });
  }

  /* hover preview: a small photo card that follows the cursor (desktop pointers only) */
  const tip = document.createElement('div');
  tip.className = 'pl-tip'; tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  let tipFor = null;
  function bindPricePreview(container, getRow) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    container.addEventListener('pointermove', (e) => {
      const el = e.target.closest('[data-pl-key]');
      if (!el) { tip.classList.remove('is-on'); tipFor = null; return; }
      if (tipFor !== el) {
        tipFor = el;
        const r = getRow(el.dataset.plKey); const m = r && matchPriceItem(r);
        tip.innerHTML = m
          ? `<span class="stage">${A.productImg(m.p.images[0], { sizes: '220px', eager: true })}</span><span class="pl-tip__txt"><b>${esc(m.p.name)}</b><small>${m.how === 'sku' ? 'в каталоге' : 'похожая модель'} · нажмите — подробнее</small></span>`
          : `<span class="pl-tip__none">${icon('image')}</span><span class="pl-tip__txt"><b>${esc(r ? r.name : '')}</b><small>фото по запросу · нажмите — подробнее</small></span>`;
      }
      const x = Math.min(window.innerWidth - 250, e.clientX + 22); const y = Math.min(window.innerHeight - 260, e.clientY + 18);
      tip.style.transform = `translate(${x}px, ${y}px)`;
      tip.classList.add('is-on');
    });
    container.addEventListener('pointerleave', () => { tip.classList.remove('is-on'); tipFor = null; });
  }

  Object.assign(A, { matchPriceItem, openPriceItem, bindPricePreview });
})();
