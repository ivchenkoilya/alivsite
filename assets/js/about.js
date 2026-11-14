/* ALIV SPORT — about page */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, DATA, icon, plural, productImg, productUrl } = A;
  const PL = window.ALIV_PRICELIST;
  const plTotal = PL.series.reduce((a, s) => a + s.items.length, 0);

  // Only figures that can be verified from the site's own data.
  $('[data-about-facts]').innerHTML = [
    ['factory', 'Собственное', 'производство в Конаково'],
    ['grid', `<span data-count="${DATA.products.length}">${DATA.products.length}</span>`, `${plural(DATA.products.length, 'модель', 'модели', 'моделей')} в каталоге`],
    ['file', `<span data-count="${plTotal}">${plTotal}</span>`, `${plural(plTotal, 'позиция', 'позиции', 'позиций')} в прайс-листе`],
    ['shield', 'Гарантия', 'на качество и внешний вид'],
  ].map(([i, v, l]) => `<div class="about-fact">${icon(i, 'i--lg')}<dt>${v}</dt><dd>${l}</dd></div>`).join('');

  const pp = A.bySlug.get('zhim-nogami');
  const link = $('[data-photo-product]');
  if (pp && link) { link.href = productUrl(pp); link.innerHTML = productImg(pp.images[1] || pp.images[0], { sizes: '420px' }) + `<span class="photo-card__cap">${A.esc(pp.name)} ${icon('arrow-up-right')}</span>`; }

  const rail = $('[data-photo-rail]');
  const step = () => (rail.firstElementChild?.offsetWidth || 320) + 20;
  $('[data-photo-prev]').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('[data-photo-next]').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));

  // Documents — rendered only when listed in config.js (added later)
  const docs = (A.CFG.documents || []).filter((d) => d && d.href);
  const dBox = $('[data-documents]');
  if (dBox && docs.length) {
    dBox.hidden = false;
    $('[data-documents-list]').innerHTML = docs.map((d) => `<a class="doc-card" href="${A.esc(d.href)}" target="_blank" rel="noopener">${icon('file', 'i--lg')}<span><b>${A.esc(d.title)}</b><small>${A.esc([d.kind, d.size].filter(Boolean).join(' · '))}</small></span>${icon('download')}</a>`).join('');
  }

  A.observeReveals(); A.countUp();
})();
