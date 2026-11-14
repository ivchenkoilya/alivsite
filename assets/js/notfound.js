/* ALIV SPORT — 404 */
(function () {
  'use strict';
  const A = window.ALIV;
  const box = A.$('[data-nf-products]');
  box.innerHTML = A.DATA.products.filter((p) => p.price).slice(0, 4).map((p, i) => A.productCard(p, { i })).join('');
  A.observeReveals();
})();
